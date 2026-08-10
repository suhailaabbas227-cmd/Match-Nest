-- ============================================================================
-- MatchNest - Trust, notifications and private discovery
-- Run after freemium_access.sql.
--
-- Adds database-enforced photo approval, privacy-safe notifications, premium-
-- gated incoming-request identity, and one-time strong-match suggestions.
-- ============================================================================

begin;


-- ---------- PHOTO MODERATION ----------
create table if not exists public.photo_reviews (
  path          text primary key,
  user_id       uuid not null references public.profiles(id) on delete cascade,
  is_main       boolean not null default false,
  status        text not null default 'pending'
                check (status in ('pending', 'approved', 'rejected', 'review')),
  reason        text,
  provider      text not null default 'manual',
  scores        jsonb not null default '{}'::jsonb,
  created_at    timestamptz not null default now(),
  reviewed_at   timestamptz,
  reviewed_by   uuid references public.profiles(id) on delete set null
);

alter table public.photo_reviews
  add column if not exists is_main boolean not null default false;

create index if not exists photo_reviews_user_status_idx
  on public.photo_reviews(user_id, status, created_at desc);

alter table public.photo_reviews enable row level security;
revoke all on table public.photo_reviews from anon, authenticated;
grant select on table public.photo_reviews to authenticated;

drop policy if exists photo_reviews_owner_or_admin_read on public.photo_reviews;
create policy photo_reviews_owner_or_admin_read
on public.photo_reviews for select to authenticated
using (user_id = auth.uid() or public.is_admin());

-- Grandfather photos already published before moderation was introduced.
insert into public.photo_reviews (path, user_id, status, provider, reviewed_at)
select p.profile_photo, p.id, 'approved', 'legacy', now()
from public.profiles p
where nullif(p.profile_photo, '') is not null
on conflict (path) do nothing;

insert into public.photo_reviews (path, user_id, status, provider, reviewed_at)
select gallery.path, p.id, 'approved', 'legacy', now()
from public.profiles p
cross join lateral jsonb_array_elements_text(coalesce(p.photos, '[]'::jsonb)) gallery(path)
where nullif(gallery.path, '') is not null
on conflict (path) do nothing;

-- A client cannot publish a storage object unless the server moderation record
-- says it is approved. Ownership/path checks are retained as defence in depth.
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
  if auth.uid() is null then raise exception 'Authentication required'; end if;

  if main_photo is not null then
    if main_photo not like uid_prefix || '%' then
      raise exception 'Invalid photo path';
    end if;
    if not exists (
      select 1 from public.photo_reviews r
      where r.path = main_photo and r.user_id = auth.uid() and r.status = 'approved'
    ) then
      raise exception 'This photo has not passed the safety review';
    end if;
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
    if not exists (
      select 1 from public.photo_reviews r
      where r.path = photo_value and r.user_id = auth.uid() and r.status = 'approved'
    ) then
      raise exception 'A gallery photo has not passed the safety review';
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

-- Storage reads for anyone except the owner/admin require photo approval.
create or replace function public.can_view_profile_photo(object_path text)
returns boolean
language plpgsql
security definer
stable
set search_path = public, storage, pg_temp
as $$
declare
  owner_folder text;
  owner_id uuid;
  owner_profile public.profiles;
begin
  owner_folder := split_part(coalesce(object_path, ''), '/', 1);
  if owner_folder !~ '^[0-9a-fA-F-]{36}$' then return false; end if;
  owner_id := owner_folder::uuid;

  if owner_id = auth.uid() or public.is_admin() then return true; end if;

  if not exists (
    select 1 from public.photo_reviews r
    where r.path = object_path and r.user_id = owner_id and r.status = 'approved'
  ) then
    return false;
  end if;

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

create or replace function public.admin_review_photo(
  review_path text,
  requested_status text
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  owner_id uuid;
  main_photo boolean;
begin
  if not public.is_admin() then raise exception 'Administrator access required'; end if;
  if requested_status not in ('approved', 'rejected') then
    raise exception 'Invalid photo review decision';
  end if;

  update public.photo_reviews
  set status = requested_status,
      reason = case
        when requested_status = 'approved' then 'Photo approved by MatchNest safety review.'
        else 'Photo rejected by MatchNest safety review. Please upload a different photo.'
      end,
      reviewed_at = now(),
      reviewed_by = auth.uid()
  where path = review_path
  returning user_id, is_main into owner_id, main_photo;

  if not found then raise exception 'Photo review not found'; end if;

  if requested_status = 'approved' then
    if main_photo then
      update public.profiles set profile_photo = review_path where id = owner_id;
    else
      update public.profiles p
      set photos = case
        when coalesce(p.photos, '[]'::jsonb) ? review_path then p.photos
        else (
          select coalesce(jsonb_agg(item), '[]'::jsonb)
          from (
            select item
            from jsonb_array_elements(coalesce(p.photos, '[]'::jsonb)) item
            union all select to_jsonb(review_path)
            limit 5
          ) approved_gallery
        )
      end
      where p.id = owner_id;
    end if;
  else
    update public.profiles p
    set profile_photo = case when p.profile_photo = review_path then null else p.profile_photo end,
        photos = coalesce((
          select jsonb_agg(item.value)
          from jsonb_array_elements_text(coalesce(p.photos, '[]'::jsonb)) item(value)
          where item.value <> review_path
        ), '[]'::jsonb)
    where p.id = owner_id;
  end if;
end;
$$;

drop policy if exists photos_secure_read on storage.objects;
create policy photos_secure_read
on storage.objects for select to authenticated
using (
  bucket_id = 'photos'
  and public.can_view_profile_photo(name)
);


-- ---------- PRIVACY-SAFE CONNECTION LISTS ----------
create or replace function public.get_my_connections(requested_kind text)
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
  if requested_kind not in ('accepted', 'incoming', 'outgoing') then
    raise exception 'Invalid connection list';
  end if;
  premium := public.is_premium_member(me);

  if requested_kind = 'accepted' then
    return query
    select jsonb_build_object(
      'connection_id', c.id,
      'other_user', case when c.from_user = me then c.to_user else c.from_user end,
      'status', c.status,
      'locked', false
    )
    from public.connections c
    where c.status = 'accepted' and (c.from_user = me or c.to_user = me)
    order by coalesce(c.accepted_at, c.created_at) desc;
  elsif requested_kind = 'incoming' then
    return query
    select jsonb_build_object(
      'connection_id', case when premium then c.id else null end,
      'other_user', case when premium then c.from_user else null end,
      'status', c.status,
      'locked', not premium
    )
    from public.connections c
    where c.to_user = me and c.status = 'pending'
    order by c.created_at desc;
  else
    return query
    select jsonb_build_object(
      'connection_id', c.id,
      'other_user', c.to_user,
      'status', c.status,
      'locked', false
    )
    from public.connections c
    where c.from_user = me and c.status = 'pending'
    order by c.created_at desc;
  end if;
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
  me uuid := auth.uid();
  updated public.connections;
begin
  if requested_action not in ('accept', 'decline') then raise exception 'Invalid action'; end if;
  if requested_action = 'accept' and not public.is_premium_member(me) then
    raise exception 'Premium membership is required to view and accept connection requests';
  end if;

  update public.connections
  set status = case when requested_action = 'accept' then 'accepted' else 'declined' end,
      accepted_at = case when requested_action = 'accept' then now() else null end
  where id = connection_id
    and to_user = me
    and status = 'pending'
    and not public.users_blocked(from_user, to_user)
  returning * into updated;

  if not found then raise exception 'Connection request not found'; end if;
  return jsonb_build_object('status', updated.status, 'connection', to_jsonb(updated));
end;
$$;

-- Direct connection rows reveal who liked a free member. All reads now go
-- through get_my_connections, which masks that identity until Premium.
revoke select on public.connections from authenticated;


-- ---------- IN-APP NOTIFICATIONS + EMAIL-READY QUEUE ----------
create table if not exists public.notifications (
  id                 uuid primary key default gen_random_uuid(),
  user_id            uuid not null references public.profiles(id) on delete cascade,
  actor_id           uuid references public.profiles(id) on delete set null,
  kind               text not null check (kind in (
                       'connection_request', 'match_accepted', 'message', 'strong_match'
                     )),
  entity_id          uuid,
  title              text not null,
  body               text not null,
  premium_identity   boolean not null default true,
  email_status       text not null default 'pending'
                     check (email_status in ('pending', 'sent', 'failed', 'disabled')),
  read_at            timestamptz,
  created_at         timestamptz not null default now()
);

create unique index if not exists notifications_unique_event_idx
  on public.notifications(user_id, kind, entity_id)
  where entity_id is not null;
create index if not exists notifications_user_created_idx
  on public.notifications(user_id, created_at desc);

alter table public.notifications enable row level security;
revoke all on table public.notifications from anon, authenticated;

create or replace function public.get_my_notifications()
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
  premium := public.is_premium_member(me);

  return query
  select jsonb_build_object(
    'id', n.id,
    'kind', n.kind,
    'entity_id', n.entity_id,
    'actor_id', case when premium or not n.premium_identity then n.actor_id else null end,
    'actor_name', case
      when premium or not n.premium_identity then coalesce(
        nullif(a.profile ->> 'displayName', ''),
        nullif(a.profile ->> 'fullLegalName', ''),
        nullif(a.full_name, ''),
        'Member'
      )
      else null
    end,
    'title', case when premium or not n.premium_identity then n.title else 'Someone is interested in you' end,
    'body', case when premium or not n.premium_identity then n.body else 'Upgrade to reveal who sent this activity.' end,
    'identity_locked', not premium and n.premium_identity,
    'read_at', n.read_at,
    'created_at', n.created_at
  )
  from public.notifications n
  left join public.profiles a on a.id = n.actor_id
  where n.user_id = me
  order by n.created_at desc
  limit 100;
end;
$$;

create or replace function public.mark_notifications_read(notification_ids uuid[] default null)
returns integer
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare changed integer;
begin
  update public.notifications
  set read_at = coalesce(read_at, now())
  where user_id = auth.uid()
    and (notification_ids is null or id = any(notification_ids));
  get diagnostics changed = row_count;
  return changed;
end;
$$;

create or replace function public.notify_strong_match(
  candidate_id uuid,
  compatibility_score integer
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if compatibility_score < 70 or compatibility_score > 100 then return; end if;
  if not exists (
    select 1
    from public.profiles me
    join public.profiles candidate on candidate.id = candidate_id
    where me.id = auth.uid()
      and candidate.id <> me.id
      and candidate.mode = me.mode
      and candidate.profile_complete
      and candidate.verified
      and not candidate.suspended
      and public.is_active_member(candidate.id)
      and not public.users_blocked(me.id, candidate.id)
  ) then return; end if;

  insert into public.notifications (
    user_id, actor_id, kind, entity_id, title, body, premium_identity
  ) values (
    auth.uid(), candidate_id, 'strong_match', candidate_id,
    'A strong match is waiting',
    'This profile matches several of your preferences (' || compatibility_score || '% compatibility).',
    false
  ) on conflict do nothing;
end;
$$;

create or replace function public.notify_connection_change()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if tg_op = 'INSERT' and new.status = 'pending' then
    insert into public.notifications (
      user_id, actor_id, kind, entity_id, title, body, premium_identity
    ) values (
      new.to_user, new.from_user, 'connection_request', new.id,
      'New connection request', 'This member is interested in your profile.', true
    ) on conflict do nothing;
  elsif tg_op = 'UPDATE' and old.status is distinct from new.status and new.status = 'accepted' then
    insert into public.notifications (
      user_id, actor_id, kind, entity_id, title, body, premium_identity
    ) values
      (new.from_user, new.to_user, 'match_accepted', new.id,
       'It is a match', 'Your connection request was accepted. You can now chat.', false),
      (new.to_user, new.from_user, 'match_accepted', new.id,
       'It is a match', 'You accepted a connection. You can now chat.', false)
    on conflict do nothing;
  end if;
  return new;
end;
$$;

drop trigger if exists notify_connection_change_trigger on public.connections;
create trigger notify_connection_change_trigger
after insert or update of status on public.connections
for each row execute function public.notify_connection_change();

insert into public.notifications (
  user_id, actor_id, kind, entity_id, title, body, premium_identity
)
select
  c.to_user, c.from_user, 'connection_request', c.id,
  'New connection request', 'This member is interested in your profile.', true
from public.connections c
where c.status = 'pending'
on conflict do nothing;

create or replace function public.notify_new_message()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare recipient uuid;
begin
  for recipient in
    select unnest(c.participants || c.chaperones)
    from public.conversations c
    where c.id = new.conversation_id
  loop
    if recipient <> new.from_user then
      insert into public.notifications (
        user_id, actor_id, kind, entity_id, title, body, premium_identity
      ) values (
        recipient, new.from_user, 'message', new.id,
        'New message', 'You received a new message in MatchNest.', true
      ) on conflict do nothing;
    end if;
  end loop;
  return new;
end;
$$;

drop trigger if exists notify_new_message_trigger on public.messages;
create trigger notify_new_message_trigger
after insert on public.messages
for each row execute function public.notify_new_message();


-- ---------- FUNCTION PERMISSIONS ----------
revoke all on function public.can_view_profile_photo(text) from public;
revoke all on function public.admin_review_photo(text, text) from public;
revoke all on function public.get_my_connections(text) from public;
revoke all on function public.get_my_notifications() from public;
revoke all on function public.mark_notifications_read(uuid[]) from public;
revoke all on function public.notify_strong_match(uuid, integer) from public;

grant execute on function public.can_view_profile_photo(text) to authenticated;
grant execute on function public.admin_review_photo(text, text) to authenticated;
grant execute on function public.get_my_connections(text) to authenticated;
grant execute on function public.get_my_notifications() to authenticated;
grant execute on function public.mark_notifications_read(uuid[]) to authenticated;
grant execute on function public.notify_strong_match(uuid, integer) to authenticated;

commit;
