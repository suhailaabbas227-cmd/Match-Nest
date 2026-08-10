-- ============================================================================
-- MatchNest account lifecycle migration
--
-- Run AFTER phase1_security.sql. This migration adds reversible account
-- deactivation. Permanent deletion is completed by the delete-account Edge
-- Function so Storage and Supabase Auth data can be removed with server-only
-- credentials.
-- ============================================================================

begin;

alter table public.profiles
  add column if not exists deactivated_at timestamptz;

create index if not exists profiles_active_browse_idx
  on public.profiles(mode, profile_complete, verified, created_at desc)
  where not suspended and deactivated_at is null;


-- Deactivated members are unavailable to discovery, matching, messaging,
-- photo access, and administrator actions until they reactivate themselves.
create or replace function public.is_admin()
returns boolean
language sql
security definer
stable
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid()
      and role = 'admin'
      and not suspended
      and deactivated_at is null
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
    and p.deactivated_at is null
    and pp.date_of_birth <= current_date - interval '18 years';
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
      and p.deactivated_at is null
      and pp.date_of_birth <= current_date - interval '18 years'
  );
$$;


-- The member keeps their data, but immediately disappears from active app
-- experiences. Calling this repeatedly is safe.
create or replace function public.deactivate_my_account()
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;

  update public.profiles
  set deactivated_at = coalesce(deactivated_at, now())
  where id = auth.uid() and not suspended;

  if not found then raise exception 'Account is unavailable'; end if;
  return public.get_my_profile();
end;
$$;


-- A deactivated member can return from the dedicated reactivation screen.
-- Moderation suspensions cannot be bypassed through this function.
create or replace function public.reactivate_my_account()
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;

  update public.profiles p
  set deactivated_at = null
  from public.private_profiles pp
  where p.id = auth.uid()
    and pp.id = p.id
    and not p.suspended
    and pp.date_of_birth <= current_date - interval '18 years';

  if not found then raise exception 'Account cannot be reactivated'; end if;
  return public.get_my_profile();
end;
$$;


-- A pending request cannot be accepted or declined while either account is
-- unavailable. This closes the one matching action that did not previously
-- call is_active_member().
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
  if not public.is_active_member(auth.uid()) then
    raise exception 'Account is unavailable';
  end if;

  update public.connections
  set status = case when requested_action = 'accept' then 'accepted' else 'declined' end,
      accepted_at = case when requested_action = 'accept' then now() else null end
  where id = connection_id
    and to_user = auth.uid()
    and status = 'pending'
    and public.is_active_member(from_user)
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


-- Do not allow a deactivated account to be added as a marriage chaperone.
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
  if not public.is_active_member(auth.uid()) then
    raise exception 'Account is unavailable';
  end if;

  select p.id
  into chaperone_id
  from public.private_profiles pp
  join public.profiles p on p.id = pp.id
  where lower(pp.email) = lower(btrim(chaperone_email))
    and not p.suspended
    and p.deactivated_at is null
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


revoke all on function public.deactivate_my_account() from public;
revoke all on function public.reactivate_my_account() from public;
grant execute on function public.deactivate_my_account() to authenticated;
grant execute on function public.reactivate_my_account() to authenticated;

commit;
