-- ============================================================================
-- MatchNest Phase 1 security migration
--
-- Run AFTER schema.sql and moderation.sql.
-- This migration is intentionally additive so existing accounts are preserved.
-- It:
--   * moves contact/DOB/guardian data out of member-readable profiles;
--   * prevents members from changing admin, verification, or suspension flags;
--   * enforces 18+ signup at the database boundary;
--   * makes matches, chat, reports, blocks, and admin actions server-controlled;
--   * makes profile photos private and restricts access with RLS.
-- ============================================================================

begin;


-- ---------- PRIVATE ACCOUNT DATA ----------
create table if not exists public.private_profiles (
  id               uuid primary key references public.profiles(id) on delete cascade,
  email            text not null default '',
  phone            text not null default '',
  date_of_birth    date,
  private_profile  jsonb not null default '{}'::jsonb,
  updated_at       timestamptz not null default now()
);

alter table public.private_profiles enable row level security;

-- Migrate existing private values once. Invalid/empty historical DOB values
-- remain null instead of causing the migration to fail.
insert into public.private_profiles (id, email, phone, date_of_birth, private_profile)
select
  p.id,
  coalesce(p.email, ''),
  coalesce(p.phone, ''),
  case
    when p.date_of_birth ~ '^\d{4}-\d{2}-\d{2}$'
      and to_char(to_date(p.date_of_birth, 'YYYY-MM-DD'), 'YYYY-MM-DD') = p.date_of_birth
      then to_date(p.date_of_birth, 'YYYY-MM-DD')
    else null
  end,
  jsonb_strip_nulls(jsonb_build_object('wali', p.profile -> 'wali'))
from public.profiles p
on conflict (id) do nothing;

-- Guardian contact must never remain inside the public JSON document.
update public.profiles
set profile = profile - 'wali';

-- Keep the old contact columns empty for backwards-compatible table shape.
-- They are also removed from authenticated column grants below.
update public.profiles
set email = '', phone = '', date_of_birth = '';

alter table public.profiles alter column verified set default false;


-- ---------- NORMALIZED BLOCKS ----------
create table if not exists public.blocks (
  blocker     uuid not null references public.profiles(id) on delete cascade,
  blocked     uuid not null references public.profiles(id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (blocker, blocked),
  constraint blocks_not_self check (blocker <> blocked)
);

alter table public.blocks enable row level security;
create index if not exists blocks_blocked_idx on public.blocks(blocked);

-- Existing array blocks were migrated before the old arrays were emptied on
-- earlier migration runs. This statement is harmless on subsequent runs.
insert into public.blocks (blocker, blocked)
select p.id, blocked_id
from public.profiles p
cross join lateral unnest(p.blocked_users) blocked_id
where blocked_id <> p.id
on conflict do nothing;

update public.profiles set blocked_users = '{}';


-- ---------- DATABASE-BOUNDARY HELPERS ----------
create or replace function public.is_admin()
returns boolean
language sql
security definer
stable
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin' and not suspended
  );
$$;

create or replace function public.current_user_mode()
returns text
language sql
security definer
stable
set search_path = public, pg_temp
as $$
  select p.mode
  from public.profiles p
  join public.private_profiles pp on pp.id = p.id
  where p.id = auth.uid()
    and not p.suspended
    and pp.date_of_birth <= current_date - interval '18 years';
$$;

create or replace function public.users_blocked(first_user uuid, second_user uuid)
returns boolean
language sql
security definer
stable
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.blocks
    where (blocker = first_user and blocked = second_user)
       or (blocker = second_user and blocked = first_user)
  );
$$;

create or replace function public.is_active_member(member_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.profiles p
    join public.private_profiles pp on pp.id = p.id
    where p.id = member_id
      and not p.suspended
      and pp.date_of_birth <= current_date - interval '18 years'
  );
$$;

create or replace function public.are_matched(first_user uuid, second_user uuid)
returns boolean
language sql
security definer
stable
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.connections
    where status = 'accepted'
      and (
        (from_user = first_user and to_user = second_user)
        or (from_user = second_user and to_user = first_user)
      )
  );
$$;

create or replace function public.age_from_dob(dob date)
returns integer
language sql
stable
set search_path = public, pg_temp
as $$
  select case
    when dob is null then null
    else extract(year from age(current_date, dob))::integer
  end;
$$;


-- ---------- SAFE PROFILE CREATION ----------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  supplied_dob text;
  parsed_dob date;
begin
  supplied_dob := nullif(new.raw_user_meta_data ->> 'date_of_birth', '');

  if supplied_dob is null or supplied_dob !~ '^\d{4}-\d{2}-\d{2}$' then
    raise exception 'A valid date of birth is required';
  end if;

  begin
    parsed_dob := supplied_dob::date;
  exception when others then
    raise exception 'A valid date of birth is required';
  end;

  if parsed_dob > current_date - interval '18 years' then
    raise exception 'You must be at least 18 years old to use MatchNest';
  end if;

  if parsed_dob < current_date - interval '120 years' then
    raise exception 'Please enter a valid date of birth';
  end if;

  insert into public.profiles (
    id, full_name, gender, country, city, mode, verified
  )
  values (
    new.id,
    left(coalesce(new.raw_user_meta_data ->> 'full_name', ''), 100),
    left(coalesce(new.raw_user_meta_data ->> 'gender', ''), 30),
    left(coalesce(new.raw_user_meta_data ->> 'country', ''), 100),
    left(coalesce(new.raw_user_meta_data ->> 'city', ''), 100),
    case
      when new.raw_user_meta_data ->> 'mode' in ('dating', 'marriage')
        then new.raw_user_meta_data ->> 'mode'
      else null
    end,
    false
  )
  on conflict (id) do nothing;

  insert into public.private_profiles (id, email, phone, date_of_birth)
  values (
    new.id,
    lower(left(coalesce(new.email, ''), 320)),
    left(coalesce(new.phone, ''), 40),
    parsed_dob
  )
  on conflict (id) do update
  set email = excluded.email,
      phone = excluded.phone,
      date_of_birth = excluded.date_of_birth,
      updated_at = now();

  return new;
end;
$$;


-- ---------- VALIDATION CONSTRAINTS ----------
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'profiles_mode_valid'
  ) then
    alter table public.profiles
      add constraint profiles_mode_valid
      check (mode is null or mode in ('dating', 'marriage')) not valid;
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'connections_status_valid'
  ) then
    alter table public.connections
      add constraint connections_status_valid
      check (status in ('pending', 'accepted', 'declined')) not valid;
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'connections_not_self'
  ) then
    alter table public.connections
      add constraint connections_not_self
      check (from_user <> to_user) not valid;
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'reports_not_self'
  ) then
    alter table public.reports
      add constraint reports_not_self
      check (reporter <> reported) not valid;
  end if;
end
$$;

create index if not exists profiles_browse_idx
  on public.profiles(mode, profile_complete, verified, suspended, created_at desc);
create index if not exists profiles_city_idx on public.profiles(lower(city));
create index if not exists connections_status_idx
  on public.connections(status, from_user, to_user);
create index if not exists reports_status_idx
  on public.reports(status, created_at desc);


-- ---------- LOCK DOWN DIRECT TABLE ACCESS ----------
revoke all on table public.profiles from authenticated;
revoke all on table public.private_profiles from authenticated;
revoke all on table public.connections from authenticated;
revoke all on table public.conversations from authenticated;
revoke all on table public.messages from authenticated;
revoke all on table public.reports from authenticated;
revoke all on table public.blocks from authenticated;

-- Only deliberately public member columns can be queried by browser clients.
grant select (
  id, full_name, gender, country, city, mode, profile, profile_photo, photos,
  verified, badge, profile_complete, photo_privacy, created_at
) on public.profiles to authenticated;
grant select on public.connections to authenticated;
grant select on public.conversations to authenticated;
grant select on public.messages to authenticated;
grant select on public.blocks to authenticated;


-- ---------- ROW LEVEL SECURITY ----------
drop policy if exists profiles_read on public.profiles;
drop policy if exists profiles_insert_own on public.profiles;
drop policy if exists profiles_update_own on public.profiles;
drop policy if exists profiles_admin_update on public.profiles;
drop policy if exists profiles_read_safe on public.profiles;

create policy profiles_read_safe
on public.profiles for select to authenticated
using (
  id = auth.uid()
  or public.is_admin()
  or (
    public.is_active_member(auth.uid())
    and public.is_active_member(id)
    and profile_complete
    and verified
    and not suspended
    and mode = public.current_user_mode()
    and not public.users_blocked(auth.uid(), id)
  )
);

drop policy if exists private_profiles_own_read on public.private_profiles;
create policy private_profiles_own_read
on public.private_profiles for select to authenticated
using (id = auth.uid() or public.is_admin());

drop policy if exists blocks_read on public.blocks;
create policy blocks_read
on public.blocks for select to authenticated
using (blocker = auth.uid() or blocked = auth.uid() or public.is_admin());

drop policy if exists connections_read on public.connections;
drop policy if exists connections_insert on public.connections;
drop policy if exists connections_update on public.connections;
create policy connections_read
on public.connections for select to authenticated
using (auth.uid() = from_user or auth.uid() = to_user or public.is_admin());

drop policy if exists conversations_read on public.conversations;
drop policy if exists conversations_insert on public.conversations;
drop policy if exists conversations_update on public.conversations;
create policy conversations_read
on public.conversations for select to authenticated
using (
  public.is_admin()
  or (
    (auth.uid() = any(participants) or auth.uid() = any(chaperones))
    and public.is_active_member(auth.uid())
  )
);

drop policy if exists messages_read on public.messages;
drop policy if exists messages_insert on public.messages;
create policy messages_read
on public.messages for select to authenticated
using (
  public.is_admin()
  or exists (
    select 1
    from public.conversations c
    where c.id = conversation_id
      and (auth.uid() = any(c.participants) or auth.uid() = any(c.chaperones))
      and public.is_active_member(auth.uid())
      and (
        cardinality(c.participants) < 2
        or not public.users_blocked(c.participants[1], c.participants[2])
      )
  )
);

drop policy if exists reports_insert on public.reports;
drop policy if exists reports_admin_read on public.reports;
drop policy if exists reports_admin_update on public.reports;
create policy reports_admin_read
on public.reports for select to authenticated
using (public.is_admin());


-- ---------- SAFE PROFILE FUNCTIONS ----------
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
        || jsonb_build_object('age', public.age_from_dob(pp.date_of_birth))
    )
  from public.profiles p
  left join public.private_profiles pp on pp.id = p.id
  where p.id = auth.uid();
$$;

create or replace function public.set_profile_mode(requested_mode text)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if requested_mode is null or requested_mode not in ('dating', 'marriage') then
    raise exception 'Invalid MatchNest path';
  end if;

  update public.profiles
  set mode = requested_mode
  where id = auth.uid() and public.is_active_member(auth.uid());

  if not found then raise exception 'Account is unavailable'; end if;
  return public.get_my_profile();
end;
$$;

create or replace function public.switch_profile_mode()
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  update public.profiles
  set mode = case when mode = 'marriage' then 'dating' else 'marriage' end
  where id = auth.uid() and public.is_active_member(auth.uid());

  if not found then raise exception 'Account is unavailable'; end if;
  return public.get_my_profile();
end;
$$;

create or replace function public.confirm_my_date_of_birth(requested_dob date)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  current_dob date;
begin
  if requested_dob is null
     or requested_dob > current_date - interval '18 years'
     or requested_dob < current_date - interval '120 years' then
    raise exception 'You must be at least 18 years old to use MatchNest';
  end if;

  select date_of_birth into current_dob
  from public.private_profiles
  where id = auth.uid();

  if current_dob is not null then
    raise exception 'Date of birth is already confirmed';
  end if;

  insert into public.private_profiles (id, email, date_of_birth)
  select p.id, '', requested_dob
  from public.profiles p
  where p.id = auth.uid()
  on conflict (id) do update
  set date_of_birth = excluded.date_of_birth,
      updated_at = now();

  return public.get_my_profile();
end;
$$;

create or replace function public.update_my_profile(
  profile_data jsonb,
  requested_photo_privacy boolean default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  dob date;
  public_data jsonb;
  private_data jsonb;
begin
  if profile_data is null or jsonb_typeof(profile_data) <> 'object' then
    raise exception 'Invalid profile data';
  end if;

  if pg_column_size(profile_data) > 65536 then
    raise exception 'Profile data is too large';
  end if;

  select date_of_birth into dob
  from public.private_profiles
  where id = auth.uid();

  if dob is null or public.age_from_dob(dob) < 18 then
    raise exception 'You must be at least 18 years old to use MatchNest';
  end if;

  private_data := jsonb_strip_nulls(
    jsonb_build_object('wali', profile_data -> 'wali')
  );
  public_data :=
    (profile_data - 'wali' - 'age')
    || jsonb_build_object('age', public.age_from_dob(dob));

  update public.private_profiles
  set private_profile = private_data,
      updated_at = now()
  where id = auth.uid();

  update public.profiles
  set profile = public_data,
      city = left(coalesce(public_data ->> 'city', city), 100),
      gender = left(coalesce(public_data ->> 'gender', gender), 30),
      photo_privacy = coalesce(requested_photo_privacy, photo_privacy),
      profile_complete = true
  where id = auth.uid() and public.is_active_member(auth.uid());

  if not found then raise exception 'Account is unavailable'; end if;
  return public.get_my_profile();
end;
$$;

create or replace function public.update_my_photos(
  main_photo text,
  gallery_photos jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  uid_prefix text := auth.uid()::text || '/';
  photo_value text;
begin
  if main_photo is not null and main_photo not like uid_prefix || '%' then
    raise exception 'Invalid photo path';
  end if;

  if gallery_photos is null or jsonb_typeof(gallery_photos) <> 'array'
     or jsonb_array_length(gallery_photos) > 5 then
    raise exception 'A maximum of 5 gallery photos is allowed';
  end if;

  for photo_value in select jsonb_array_elements_text(gallery_photos)
  loop
    if photo_value not like uid_prefix || '%' then
      raise exception 'Invalid photo path';
    end if;
  end loop;

  update public.profiles
  set profile_photo = main_photo,
      photos = gallery_photos
  where id = auth.uid() and public.is_active_member(auth.uid());

  if not found then raise exception 'Account is unavailable'; end if;
  return public.get_my_profile();
end;
$$;


-- ---------- SERVER-CONTROLLED MATCHING ----------
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

  -- Serialize requests for the same pair to prevent duplicate rows.
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

create or replace function public.respond_connection(
  connection_id uuid,
  requested_action text
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  updated public.connections;
begin
  if requested_action not in ('accept', 'decline') then
    raise exception 'Invalid response';
  end if;

  update public.connections
  set status = case when requested_action = 'accept' then 'accepted' else 'declined' end,
      accepted_at = case when requested_action = 'accept' then now() else null end
  where id = connection_id
    and to_user = auth.uid()
    and status = 'pending'
    and not public.users_blocked(from_user, to_user)
  returning * into updated;

  if not found then raise exception 'Request is no longer available'; end if;

  return jsonb_build_object(
    'status', updated.status,
    'matched', updated.status = 'accepted',
    'connection', to_jsonb(updated)
  );
end;
$$;


-- ---------- SERVER-CONTROLLED CHAT ----------
create or replace function public.get_or_create_conversation(other_user uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  me uuid := auth.uid();
  convo public.conversations;
begin
  if me is null then raise exception 'Authentication required'; end if;
  if not public.are_matched(me, other_user)
     or public.users_blocked(me, other_user)
     or not public.is_active_member(me)
     or not public.is_active_member(other_user) then
    raise exception 'You can only chat with an active match';
  end if;

  perform pg_advisory_xact_lock(
    hashtextextended(
      least(me::text, other_user::text) || ':' ||
      greatest(me::text, other_user::text),
      1
    )
  );

  select *
  into convo
  from public.conversations
  where participants @> array[me, other_user]::uuid[]
    and cardinality(participants) = 2
  order by created_at
  limit 1;

  if not found then
    insert into public.conversations (participants, chaperones)
    values (array[me, other_user]::uuid[], '{}'::uuid[])
    returning * into convo;
  end if;

  return to_jsonb(convo);
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
  created public.messages;
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

  sender_is_chaperone := me = any(convo.chaperones);

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

create or replace function public.add_chaperone_by_email(
  target_conversation uuid,
  chaperone_email text
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  chaperone_id uuid;
  convo public.conversations;
begin
  select p.id
  into chaperone_id
  from public.private_profiles pp
  join public.profiles p on p.id = pp.id
  where lower(pp.email) = lower(btrim(chaperone_email))
    and not p.suspended
  limit 1;

  if chaperone_id is null then
    raise exception 'No active MatchNest account uses that email';
  end if;

  select *
  into convo
  from public.conversations
  where id = target_conversation
    and auth.uid() = any(participants);

  if not found then raise exception 'Conversation not found'; end if;
  if chaperone_id = any(convo.participants) then
    raise exception 'A participant cannot be added as a chaperone';
  end if;

  update public.conversations
  set chaperones = array(
    select distinct item
    from unnest(chaperones || array[chaperone_id]) as item
  )
  where id = target_conversation
  returning * into convo;

  return to_jsonb(convo);
end;
$$;


-- ---------- SAFETY FUNCTIONS ----------
create or replace function public.block_member(target_user uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  if target_user = auth.uid() then raise exception 'You cannot block yourself'; end if;

  insert into public.blocks (blocker, blocked)
  values (auth.uid(), target_user)
  on conflict do nothing;

  update public.connections
  set status = 'declined', accepted_at = null
  where status = 'pending'
    and (
      (from_user = auth.uid() and to_user = target_user)
      or (from_user = target_user and to_user = auth.uid())
    );
end;
$$;

create or replace function public.create_member_report(
  target_user uuid,
  report_reason text
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  report_reason := btrim(coalesce(report_reason, ''));

  if target_user = auth.uid() then raise exception 'You cannot report yourself'; end if;
  if length(report_reason) < 5 then raise exception 'Please provide more detail'; end if;
  if length(report_reason) > 1000 then raise exception 'Report is too long'; end if;
  if not exists (select 1 from public.profiles where id = target_user) then
    raise exception 'Member not found';
  end if;

  if (
    select count(*)
    from public.reports
    where reporter = auth.uid()
      and created_at > now() - interval '1 hour'
  ) >= 5 then
    raise exception 'Report limit reached. Please try again later.';
  end if;

  insert into public.reports (reporter, reported, reason)
  values (auth.uid(), target_user, report_reason);
end;
$$;


-- ---------- ADMIN FUNCTIONS ----------
create or replace function public.admin_list_users()
returns setof jsonb
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
      'date_of_birth', pp.date_of_birth
    )
  from public.profiles p
  left join public.private_profiles pp on pp.id = p.id
  where public.is_admin()
  order by p.created_at desc;
$$;

create or replace function public.admin_list_reports()
returns setof jsonb
language sql
security definer
stable
set search_path = public, pg_temp
as $$
  select to_jsonb(r)
  from public.reports r
  where public.is_admin()
  order by r.created_at desc;
$$;

create or replace function public.admin_set_badge(
  target_user uuid,
  requested_value boolean
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if not public.is_admin() then raise exception 'Administrator access required'; end if;
  update public.profiles
  set badge = requested_value,
      verified = requested_value
  where id = target_user;
end;
$$;

create or replace function public.admin_set_suspension(
  target_user uuid,
  requested_value boolean
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if not public.is_admin() then raise exception 'Administrator access required'; end if;
  if target_user = auth.uid() then raise exception 'You cannot suspend your own account'; end if;
  update public.profiles set suspended = requested_value where id = target_user;
end;
$$;

create or replace function public.admin_resolve_report(target_report uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if not public.is_admin() then raise exception 'Administrator access required'; end if;
  update public.reports set status = 'resolved' where id = target_report;
end;
$$;


-- ---------- PRIVATE PROFILE PHOTOS ----------
create or replace function public.can_view_profile_photos(owner_folder text)
returns boolean
language plpgsql
security definer
stable
set search_path = public, storage, pg_temp
as $$
declare
  owner_id uuid;
  owner_profile public.profiles;
begin
  if owner_folder is null
     or owner_folder !~ '^[0-9a-fA-F-]{36}$' then
    return false;
  end if;

  owner_id := owner_folder::uuid;
  if owner_id = auth.uid() or public.is_admin() then return true; end if;

  select * into owner_profile
  from public.profiles
  where id = owner_id
    and profile_complete
    and verified
    and not suspended
    and public.is_active_member(owner_id)
    and mode = public.current_user_mode();

  if not found or public.users_blocked(auth.uid(), owner_id) then return false; end if;
  if not owner_profile.photo_privacy then return true; end if;

  return public.are_matched(auth.uid(), owner_id);
end;
$$;

update storage.buckets
set public = false,
    file_size_limit = 10485760,
    allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp']
where id = 'photos';

drop policy if exists photos_public_read on storage.objects;
drop policy if exists photos_auth_write on storage.objects;
drop policy if exists photos_secure_read on storage.objects;
drop policy if exists photos_own_insert on storage.objects;
drop policy if exists photos_own_update on storage.objects;
drop policy if exists photos_own_delete on storage.objects;

create policy photos_secure_read
on storage.objects for select to authenticated
using (
  bucket_id = 'photos'
  and public.can_view_profile_photos((storage.foldername(name))[1])
);

create policy photos_own_insert
on storage.objects for insert to authenticated
with check (
  bucket_id = 'photos'
  and (storage.foldername(name))[1] = auth.uid()::text
  and lower(storage.extension(name)) in ('jpg', 'jpeg', 'png', 'webp')
);

create policy photos_own_update
on storage.objects for update to authenticated
using (
  bucket_id = 'photos'
  and (storage.foldername(name))[1] = auth.uid()::text
)
with check (
  bucket_id = 'photos'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy photos_own_delete
on storage.objects for delete to authenticated
using (
  bucket_id = 'photos'
  and (storage.foldername(name))[1] = auth.uid()::text
);


-- ---------- FUNCTION PERMISSIONS ----------
revoke all on function public.get_my_profile() from public;
revoke all on function public.set_profile_mode(text) from public;
revoke all on function public.switch_profile_mode() from public;
revoke all on function public.confirm_my_date_of_birth(date) from public;
revoke all on function public.update_my_profile(jsonb, boolean) from public;
revoke all on function public.update_my_photos(text, jsonb) from public;
revoke all on function public.send_connection(uuid) from public;
revoke all on function public.respond_connection(uuid, text) from public;
revoke all on function public.get_or_create_conversation(uuid) from public;
revoke all on function public.send_chat_message(uuid, text) from public;
revoke all on function public.add_chaperone_by_email(uuid, text) from public;
revoke all on function public.block_member(uuid) from public;
revoke all on function public.create_member_report(uuid, text) from public;
revoke all on function public.admin_list_users() from public;
revoke all on function public.admin_list_reports() from public;
revoke all on function public.admin_set_badge(uuid, boolean) from public;
revoke all on function public.admin_set_suspension(uuid, boolean) from public;
revoke all on function public.admin_resolve_report(uuid) from public;

grant execute on function public.get_my_profile() to authenticated;
grant execute on function public.set_profile_mode(text) to authenticated;
grant execute on function public.switch_profile_mode() to authenticated;
grant execute on function public.confirm_my_date_of_birth(date) to authenticated;
grant execute on function public.update_my_profile(jsonb, boolean) to authenticated;
grant execute on function public.update_my_photos(text, jsonb) to authenticated;
grant execute on function public.send_connection(uuid) to authenticated;
grant execute on function public.respond_connection(uuid, text) to authenticated;
grant execute on function public.get_or_create_conversation(uuid) to authenticated;
grant execute on function public.send_chat_message(uuid, text) to authenticated;
grant execute on function public.add_chaperone_by_email(uuid, text) to authenticated;
grant execute on function public.block_member(uuid) to authenticated;
grant execute on function public.create_member_report(uuid, text) to authenticated;
grant execute on function public.admin_list_users() to authenticated;
grant execute on function public.admin_list_reports() to authenticated;
grant execute on function public.admin_set_badge(uuid, boolean) to authenticated;
grant execute on function public.admin_set_suspension(uuid, boolean) to authenticated;
grant execute on function public.admin_resolve_report(uuid) to authenticated;

commit;
