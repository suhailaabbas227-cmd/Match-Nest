-- ============================================================================
-- MatchNest - moderation add-on. Run once in Supabase SQL Editor (after schema.sql).
-- Lets an admin review reports and suspend / verify members, and adds a
-- status to reports so they can be marked resolved.
-- ============================================================================


-- Report status (open | resolved)
alter table public.reports add column if not exists status text not null default 'open';


-- SECURITY DEFINER helper: is the current user an admin?
-- Defined this way so admin policies don't recurse on the profiles table.
create or replace function public.is_admin()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin');
$$;


-- Admin can read every report and mark them resolved.
drop policy if exists reports_admin_read   on public.reports;
drop policy if exists reports_admin_update on public.reports;
create policy reports_admin_read   on public.reports for select to authenticated using (public.is_admin());
create policy reports_admin_update on public.reports for update to authenticated using (public.is_admin());


-- Admin can update any profile (grant/revoke badge, suspend).
drop policy if exists profiles_admin_update on public.profiles;
create policy profiles_admin_update on public.profiles for update to authenticated using (public.is_admin());
