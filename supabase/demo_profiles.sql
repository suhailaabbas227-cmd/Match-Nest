-- ============================================================================
-- MatchNest synthetic demo profiles
-- Run after trust_and_discovery.sql, then run client/scripts/seed-demo-profiles.mjs.
--
-- Demo accounts are server-marked. Members cannot grant themselves demo
-- privileges by editing the public profile JSON. Demo connections auto-match
-- and demo chats auto-reply so the full browse -> match -> message flow can be
-- previewed without involving a real member or consuming Premium allowances.
-- ============================================================================

begin;

alter table public.profiles
  add column if not exists is_demo boolean not null default false;

create index if not exists profiles_demo_idx
  on public.profiles(is_demo)
  where is_demo;

-- Only the service role/server may write is_demo. It is intentionally omitted
-- from the authenticated column grants and from update_my_profile().

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
  target_is_demo boolean := false;
begin
  if me is null then raise exception 'Authentication required'; end if;
  if target_user = me then raise exception 'You cannot connect to yourself'; end if;
  if not public.is_active_member(me) then raise exception 'Account is unavailable'; end if;
  if not public.is_active_member(target_user) then
    raise exception 'This member is not available';
  end if;

  select target.is_demo
  into target_is_demo
  from public.profiles mine
  join public.profiles target on target.id = target_user
  where mine.id = me
    and mine.mode = target.mode
    and target.profile_complete
    and target.verified
    and not target.suspended;

  if not found then raise exception 'This member is not available'; end if;
  if not target_is_demo and not public.is_premium_member(me) then
    raise exception 'Premium membership is required to send connection requests';
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
      return jsonb_build_object('status', 'accepted', 'matched', true, 'connection', to_jsonb(existing));
    end if;

    if existing.status = 'pending'
       and (existing.from_user = target_user or target_is_demo) then
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

  insert into public.connections (from_user, to_user, status, accepted_at)
  values (
    me,
    target_user,
    case when target_is_demo then 'accepted' else 'pending' end,
    case when target_is_demo then now() else null end
  )
  returning * into created;

  return jsonb_build_object(
    'status', created.status,
    'matched', created.status = 'accepted',
    'connection', to_jsonb(created)
  );
end;
$$;


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
  demo_conversation boolean := false;
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

  select exists (
    select 1
    from unnest(convo.participants) as participant(participant_id)
    join public.profiles p on p.id = participant.participant_id
    where p.is_demo
  ) into demo_conversation;

  sender_is_chaperone := me = any(convo.chaperones);

  if not demo_conversation
     and not sender_is_chaperone
     and not public.is_premium_member(me) then
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
    )
    or exists (
      select 1
      from public.conversations c
      cross join lateral unnest(c.participants) as participant(participant_id)
      join public.profiles p on p.id = participant.participant_id
      where c.id = target_conversation
        and p.is_demo
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


create or replace function public.demo_profile_auto_reply()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  demo_user uuid;
  demo_name text;
  replies text[] := array[
    'Thanks for testing the MatchNest chat. This is an automatic demo reply.',
    'Salaam! Your message appeared correctly. This response was generated by a demo profile.',
    'Message received in preview mode. No real person is connected to this account.',
    'The chat flow is working. You can continue testing messages here safely.',
    'This synthetic profile replies automatically so you can preview the conversation screen.'
  ];
  reply_text text;
begin
  select p.id, coalesce(
    nullif(p.profile ->> 'displayName', ''),
    nullif(p.profile ->> 'fullLegalName', ''),
    nullif(p.full_name, ''),
    'Demo member'
  )
  into demo_user, demo_name
  from public.conversations c
  cross join lateral unnest(c.participants) as participant(participant_id)
  join public.profiles p on p.id = participant.participant_id
  where c.id = new.conversation_id
    and p.is_demo
    and p.id <> new.from_user
  limit 1;

  if demo_user is null or new.is_chaperone then return new; end if;

  reply_text := replies[
    1 + (abs(hashtextextended(new.id::text, 0)) % array_length(replies, 1))::integer
  ];

  insert into public.messages (
    conversation_id, from_user, from_name, is_chaperone, text, created_at
  ) values (
    new.conversation_id, demo_user, left(demo_name, 100), false,
    reply_text, now() + interval '250 milliseconds'
  );

  return new;
end;
$$;

drop trigger if exists demo_profile_auto_reply_trigger on public.messages;
create trigger demo_profile_auto_reply_trigger
after insert on public.messages
for each row execute function public.demo_profile_auto_reply();


create or replace function public.notify_connection_change()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  from_demo boolean := false;
  to_demo boolean := false;
begin
  select is_demo into from_demo from public.profiles where id = new.from_user;
  select is_demo into to_demo from public.profiles where id = new.to_user;

  if tg_op = 'INSERT' and new.status = 'pending' then
    insert into public.notifications (
      user_id, actor_id, kind, entity_id, title, body, premium_identity, email_status
    ) values (
      new.to_user, new.from_user, 'connection_request', new.id,
      'New connection request', 'This member is interested in your profile.', not from_demo,
      case when from_demo or to_demo then 'disabled' else 'pending' end
    ) on conflict do nothing;
    return new;
  end if;

  if tg_op = 'INSERT' then
    if new.status <> 'accepted' then return new; end if;
  elsif tg_op = 'UPDATE' then
    if old.status is not distinct from new.status or new.status <> 'accepted' then return new; end if;
  else
    return new;
  end if;

  insert into public.notifications (
    user_id, actor_id, kind, entity_id, title, body, premium_identity, email_status
  ) values
    (new.from_user, new.to_user, 'match_accepted', new.id,
     'It is a match', 'Your connection request was accepted. You can now chat.', not to_demo,
     case when from_demo or to_demo then 'disabled' else 'pending' end),
    (new.to_user, new.from_user, 'match_accepted', new.id,
     'It is a match', 'You accepted a connection. You can now chat.', not from_demo,
     case when from_demo or to_demo then 'disabled' else 'pending' end)
  on conflict do nothing;

  return new;
end;
$$;


create or replace function public.notify_new_message()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  recipient uuid;
  actor_is_demo boolean := false;
  recipient_is_demo boolean := false;
begin
  select is_demo into actor_is_demo from public.profiles where id = new.from_user;

  for recipient in
    select unnest(c.participants || c.chaperones)
    from public.conversations c
    where c.id = new.conversation_id
  loop
    if recipient <> new.from_user then
      select is_demo into recipient_is_demo from public.profiles where id = recipient;
      insert into public.notifications (
        user_id, actor_id, kind, entity_id, title, body, premium_identity, email_status
      ) values (
        recipient, new.from_user, 'message', new.id,
        'New message', 'You received a new message in MatchNest.', not actor_is_demo,
        case when actor_is_demo or recipient_is_demo then 'disabled' else 'pending' end
      ) on conflict do nothing;
    end if;
  end loop;
  return new;
end;
$$;

revoke all on function public.demo_profile_auto_reply() from public;
grant execute on function public.send_connection(uuid) to authenticated;
grant execute on function public.send_chat_message(uuid, text) to authenticated;
grant execute on function public.get_conversation_messages(uuid) to authenticated;

commit;
