-- ============================================================================
-- MatchNest - Supabase schema (Dating & Marriage)
-- Run this once in your Supabase project:  Dashboard → SQL Editor → paste → Run.
-- Mirrors the original JSON data model (profiles, connections, conversations,
-- messages, reports) with Row Level Security so it is safe to call directly
-- from the browser with the public (anon) key.
-- ============================================================================


-- ---------- PROFILES ----------
-- One row per account. id == the Supabase Auth user id.
create table if not exists public.profiles (
  id               uuid primary key references auth.users(id) on delete cascade,
  role             text        not null default 'user',
  full_name        text        not null default '',
  email            text        not null default '',
  phone            text        not null default '',
  date_of_birth    text        not null default '',
  gender           text        not null default '',
  country          text        not null default '',
  city             text        not null default '',
  mode             text,                                  -- 'dating' | 'marriage' | null
  profile          jsonb       not null default '{}'::jsonb,
  profile_photo    text,
  photos           jsonb       not null default '[]'::jsonb,
  verified         boolean     not null default false,    -- granted only after moderation
  badge            boolean     not null default false,
  profile_complete boolean     not null default false,
  photo_privacy    boolean     not null default false,
  blocked_users    uuid[]      not null default '{}',
  suspended        boolean     not null default false,
  created_at       timestamptz not null default now()
);


-- ---------- CONNECTIONS (requests + matches) ----------
create table if not exists public.connections (
  id          uuid primary key default gen_random_uuid(),
  from_user   uuid not null references public.profiles(id) on delete cascade,
  to_user     uuid not null references public.profiles(id) on delete cascade,
  status      text not null default 'pending',            -- pending | accepted | declined
  created_at  timestamptz not null default now(),
  accepted_at timestamptz
);
create index if not exists connections_from_idx on public.connections(from_user);
create index if not exists connections_to_idx   on public.connections(to_user);


-- ---------- CONVERSATIONS ----------
create table if not exists public.conversations (
  id           uuid primary key default gen_random_uuid(),
  participants uuid[] not null,
  chaperones   uuid[] not null default '{}',
  created_at   timestamptz not null default now()
);


-- ---------- MESSAGES ----------
create table if not exists public.messages (
  id              uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  from_user       uuid not null,
  from_name       text not null default 'User',
  is_chaperone    boolean not null default false,
  text            text not null,
  created_at      timestamptz not null default now()
);
create index if not exists messages_convo_idx on public.messages(conversation_id);


-- ---------- REPORTS ----------
create table if not exists public.reports (
  id         uuid primary key default gen_random_uuid(),
  reporter   uuid not null,
  reported   uuid not null,
  reason     text not null default '',
  created_at timestamptz not null default now()
);


-- ============================================================================
-- Auto-create a profile row whenever a new auth user signs up.
-- full_name / mode etc. come from the signup metadata.
-- ============================================================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, phone, date_of_birth, gender, country, city, mode)
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    coalesce(new.raw_user_meta_data->>'phone', ''),
    coalesce(new.raw_user_meta_data->>'date_of_birth', ''),
    coalesce(new.raw_user_meta_data->>'gender', ''),
    coalesce(new.raw_user_meta_data->>'country', ''),
    coalesce(new.raw_user_meta_data->>'city', ''),
    nullif(new.raw_user_meta_data->>'mode', '')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;


drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();


-- ============================================================================
-- Row Level Security
-- ============================================================================
alter table public.profiles      enable row level security;
alter table public.connections   enable row level security;
alter table public.conversations enable row level security;
alter table public.messages      enable row level security;
alter table public.reports       enable row level security;


-- Explicit Data API grants. These are required when the Supabase project
-- setting "Automatically expose new tables" is disabled. RLS policies below
-- still decide which individual rows each signed-in user may access.
grant usage on schema public to authenticated;
grant select, insert, update on public.profiles to authenticated;
grant select, insert, update on public.connections to authenticated;
grant select, insert, update on public.conversations to authenticated;
grant select, insert on public.messages to authenticated;
grant select, insert, update on public.reports to authenticated;


-- ---- profiles ----
-- Any signed-in user can read profiles (needed for Browse). Each user can only
-- insert/update their own row.
drop policy if exists profiles_read      on public.profiles;
drop policy if exists profiles_insert_own on public.profiles;
drop policy if exists profiles_update_own on public.profiles;
create policy profiles_read       on public.profiles for select to authenticated using (true);
create policy profiles_insert_own on public.profiles for insert to authenticated with check (auth.uid() = id);
create policy profiles_update_own on public.profiles for update to authenticated using (auth.uid() = id);


-- ---- connections ----
-- You can see connections you are part of, create ones you send, and update
-- ones sent to you (accept/decline) or that you sent.
drop policy if exists connections_read   on public.connections;
drop policy if exists connections_insert on public.connections;
drop policy if exists connections_update on public.connections;
create policy connections_read   on public.connections for select to authenticated
  using (auth.uid() = from_user or auth.uid() = to_user);
create policy connections_insert on public.connections for insert to authenticated
  with check (auth.uid() = from_user);
create policy connections_update on public.connections for update to authenticated
  using (auth.uid() = from_user or auth.uid() = to_user);


-- ---- conversations ----
-- Visible to participants and chaperones; a participant can create one.
drop policy if exists conversations_read   on public.conversations;
drop policy if exists conversations_insert on public.conversations;
drop policy if exists conversations_update on public.conversations;
create policy conversations_read   on public.conversations for select to authenticated
  using (auth.uid() = any(participants) or auth.uid() = any(chaperones));
create policy conversations_insert on public.conversations for insert to authenticated
  with check (auth.uid() = any(participants));
create policy conversations_update on public.conversations for update to authenticated
  using (auth.uid() = any(participants));


-- ---- messages ----
-- Readable/writable by members of the conversation (participants or chaperones).
drop policy if exists messages_read   on public.messages;
drop policy if exists messages_insert on public.messages;
create policy messages_read on public.messages for select to authenticated
  using (exists (
    select 1 from public.conversations c
    where c.id = conversation_id
      and (auth.uid() = any(c.participants) or auth.uid() = any(c.chaperones))
  ));
create policy messages_insert on public.messages for insert to authenticated
  with check (
    auth.uid() = from_user and exists (
      select 1 from public.conversations c
      where c.id = conversation_id
        and (auth.uid() = any(c.participants) or auth.uid() = any(c.chaperones))
    )
  );


-- ---- reports ----
drop policy if exists reports_insert on public.reports;
create policy reports_insert on public.reports for insert to authenticated
  with check (auth.uid() = reporter);


-- ============================================================================
-- Realtime — let the browser subscribe to new chat messages.
-- ============================================================================
do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'messages'
  ) then
    alter publication supabase_realtime add table public.messages;
  end if;
end
$$;


-- ============================================================================
-- Storage — a public bucket for profile photos.
-- ============================================================================
insert into storage.buckets (id, name, public)
values ('photos', 'photos', true)
on conflict (id) do nothing;


drop policy if exists photos_public_read on storage.objects;
drop policy if exists photos_auth_write  on storage.objects;
create policy photos_public_read on storage.objects for select using (bucket_id = 'photos');
create policy photos_auth_write  on storage.objects for insert to authenticated
  with check (bucket_id = 'photos');
