-- ============================================================================
-- MatchNest freemium access controls
-- Run AFTER phase1_security.sql and account_lifecycle.sql.
--
-- Free members:
--   * may browse profiles and accept incoming connection requests;
--   * may not send new connection requests;
--   * may send two messages total;
--   * may read the first incoming message in each conversation. Later incoming
--     messages are returned without their text until membership is premium.
-- ============================================================================

begin;


-- ---------- SUBSCRIPTION STATE ----------
create table if not exists public.subscriptions (
  user_id       uuid primary key references public.profiles(id) on delete cascade,
  plan          text not null check (plan in ('silver', 'gold', 'platinum', 'diamond')),
  status        text not null default 'inactive'
                check (status in ('inactive', 'active', 'expired', 'cancelled')),
  starts_at     timestamptz not null default now(),
  expires_at    timestamptz not null,
  provider      text,
  provider_ref  text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  constraint subscriptions_valid_period check (expires_at > starts_at)
);

create index if not exists subscriptions_active_idx
  on public.subscriptions (status, expires_at);

alter table public.subscriptions enable row level security;

revoke all on public.subscriptions from anon, authenticated;
grant select on public.subscriptions to authenticated;

drop policy if exists subscriptions_own_read on public.subscriptions;
create policy subscriptions_own_read
on public.subscriptions for select to authenticated
using (user_id = auth.uid() or public.is_admin());


-- ---------- MEMBERSHIP HELPERS ----------
create or replace function public.is_premium_member(member_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.subscriptions s
    where s.user_id = member_id
      and s.status = 'active'
      and s.starts_at <= now()
      and s.expires_at > now()
  );
$$;

create or replace function public.get_my_membership()
returns jsonb
language plpgsql
security definer
stable
set search_path = public, pg_temp
as $$
declare
  current_subscription public.subscriptions;
  sent_count integer := 0;
  premium boolean := false;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;

  select *
  into current_subscription
  from public.subscriptions s
  where s.user_id = auth.uid()
    and s.status = 'active'
    and s.starts_at <= now()
    and s.expires_at > now()
  limit 1;

  premium := found;

  select count(*)::integer
  into sent_count
  from public.messages m
  where m.from_user = auth.uid()
    and not m.is_chaperone;

  return jsonb_build_object(
    'is_premium', premium,
    'plan', case when premium then current_subscription.plan else null end,
    'status', case when premium then current_subscription.status else 'free' end,
    'starts_at', case when premium then current_subscription.starts_at else null end,
    'expires_at', case when premium then current_subscription.expires_at else null end,
    'free_messages_sent', sent_count,
    'free_messages_remaining', case when premium then null else greatest(0, 2 - sent_count) end
  );
end;
$$;


-- Add membership state to the authenticated profile payload.
create or replace function public.get_my_profile()
returns jsonb
language sql
security definer
stable
set search_path = public, pg_temp
as $$
  select
    to_jsonb(p)
    || jsonb_build_object(
      'email', coalesce(pp.email, ''),
      'phone', coalesce(pp.phone, ''),
      'date_of_birth', pp.date_of_birth,
      'profile',
        p.profile
        || coalesce(pp.private_profile, '{}'::jsonb)
        || jsonb_build_object('age', public.age_from_dob(pp.date_of_birth)),
      'membership', public.get_my_membership()
    )
  from public.profiles p
  left join public.private_profiles pp on pp.id = p.id
  where p.id = auth.uid();
$$;


-- ---------- PREMIUM-ONLY CONNECTION REQUESTS ----------
create or replace function public.send_connection(target_user uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  me uuid := auth.uid();
  existing public.connections;
  created public.connections;
begin
  if me is null then raise exception 'Authentication required'; end if;
  if not public.is_premium_member(me) then
    raise exception 'Premium membership is required to send connection requests';
  end if;
  if target_user = me then raise exception 'You cannot connect to yourself'; end if;
  if not public.is_active_member(me) then raise exception 'Account is unavailable'; end if;
  if not public.is_active_member(target_user) then
    raise exception 'This member is not available';
  end if;

  if not exists (
    select 1
    from public.profiles mine
    join public.profiles target on target.id = target_user
    where mine.id = me
      and mine.mode = target.mode
      and target.profile_complete
      and target.verified
      and not target.suspended
  ) then
    raise exception 'This member is not available';
  end if;

  if public.users_blocked(me, target_user) then
    raise exception 'This member is not available';
  end if;

  perform pg_advisory_xact_lock(
    hashtextextended(
      least(me::text, target_user::text) || ':' ||
      greatest(me::text, target_user::text),
      0
    )
  );

  select *
  into existing
  from public.connections
  where (from_user = me and to_user = target_user)
     or (from_user = target_user and to_user = me)
  order by
    case status when 'accepted' then 0 when 'pending' then 1 else 2 end,
    created_at desc
  limit 1;

  if found then
    if existing.status = 'accepted' then
      return jsonb_build_object('status', 'accepted', 'connection', to_jsonb(existing));
    end if;

    if existing.status = 'pending' and existing.from_user = target_user then
      update public.connections
      set status = 'accepted', accepted_at = now()
      where id = existing.id
      returning * into existing;

      return jsonb_build_object(
        'status', 'accepted',
        'matched', true,
        'connection', to_jsonb(existing)
      );
    end if;

    return jsonb_build_object('status', existing.status, 'connection', to_jsonb(existing));
  end if;

  insert into public.connections (from_user, to_user, status)
  values (me, target_user, 'pending')
  returning * into created;

  return jsonb_build_object('status', 'pending', 'connection', to_jsonb(created));
end;
$$;


-- ---------- FREE MESSAGE SEND LIMIT ----------
create or replace function public.send_chat_message(
  target_conversation uuid,
  message_text text
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  me uuid := auth.uid();
  convo public.conversations;
  sender_name text;
  sender_is_chaperone boolean;
  created public.messages;
  sent_count integer;
begin
  message_text := btrim(coalesce(message_text, ''));
  if length(message_text) < 1 then raise exception 'Message cannot be empty'; end if;
  if length(message_text) > 2000 then raise exception 'Message is too long'; end if;
  if not public.is_active_member(me) then raise exception 'Account is unavailable'; end if;

  select *
  into convo
  from public.conversations
  where id = target_conversation
    and (me = any(participants) or me = any(chaperones));

  if not found then raise exception 'Conversation not found'; end if;
  if cardinality(convo.participants) >= 2
     and public.users_blocked(convo.participants[1], convo.participants[2]) then
    raise exception 'Messaging is unavailable';
  end if;

  sender_is_chaperone := me = any(convo.chaperones);

  if not sender_is_chaperone and not public.is_premium_member(me) then
    select count(*)::integer
    into sent_count
    from public.messages
    where from_user = me
      and not is_chaperone;

    if sent_count >= 2 then
      raise exception 'Your two free messages have been used. Upgrade to continue messaging';
    end if;
  end if;

  if (
    select count(*)
    from public.messages
    where from_user = me
      and created_at > now() - interval '1 minute'
  ) >= 30 then
    raise exception 'Please wait before sending more messages';
  end if;

  select coalesce(
    nullif(profile ->> 'displayName', ''),
    nullif(profile ->> 'fullLegalName', ''),
    nullif(full_name, ''),
    'Member'
  )
  into sender_name
  from public.profiles
  where id = me;

  insert into public.messages (
    conversation_id, from_user, from_name, is_chaperone, text
  )
  values (
    target_conversation, me, left(sender_name, 100),
    sender_is_chaperone, message_text
  )
  returning * into created;

  return to_jsonb(created);
end;
$$;


-- ---------- MASKED MESSAGE READING ----------
create or replace function public.get_conversation_messages(target_conversation uuid)
returns setof jsonb
language plpgsql
security definer
stable
set search_path = public, pg_temp
as $$
declare
  me uuid := auth.uid();
  premium boolean;
begin
  if me is null then raise exception 'Authentication required'; end if;
  if not public.is_active_member(me) then raise exception 'Account is unavailable'; end if;

  if not exists (
    select 1
    from public.conversations c
    where c.id = target_conversation
      and (me = any(c.participants) or me = any(c.chaperones))
      and (
        cardinality(c.participants) < 2
        or not public.users_blocked(c.participants[1], c.participants[2])
      )
  ) then
    raise exception 'Conversation not found';
  end if;

  premium := public.is_premium_member(me)
    or public.is_admin()
    or exists (
      select 1
      from public.conversations c
      where c.id = target_conversation
        and me = any(c.chaperones)
    );

  return query
  with ranked as (
    select
      m.*,
      sum(case when m.from_user <> me then 1 else 0 end)
        over (order by m.created_at, m.id) as incoming_position
    from public.messages m
    where m.conversation_id = target_conversation
  )
  select
    (to_jsonb(r) - 'text' - 'incoming_position')
    || jsonb_build_object(
      'text', case
        when premium or r.from_user = me or r.incoming_position <= 1 then r.text
        else null
      end,
      'locked', not premium and r.from_user <> me and r.incoming_position > 1
    )
  from ranked r
  order by r.created_at, r.id;
end;
$$;


-- Message content may only be read through the masking RPC above. Direct
-- table SELECT would expose locked text and is therefore removed.
revoke select on public.messages from authenticated;


-- ---------- FUNCTION PERMISSIONS ----------
revoke all on function public.is_premium_member(uuid) from public;
revoke all on function public.get_my_membership() from public;
revoke all on function public.get_conversation_messages(uuid) from public;

grant execute on function public.get_my_membership() to authenticated;
grant execute on function public.get_conversation_messages(uuid) to authenticated;

commit;
