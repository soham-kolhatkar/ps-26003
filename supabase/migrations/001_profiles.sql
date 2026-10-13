-- Smriti · 001 · Accounts (F15)
-- Paste into Supabase → SQL Editor → Run. Safe to run twice.
--
-- Staff (caregiver / ASHA / doctor) sign up with phone + PIN, which the app
-- maps to email/password. A trigger creates their profile from the sign-up
-- metadata. Patient phones sign in anonymously and get no profile.
-- `role` here only says which app a person uses. It comes from user_metadata,
-- which the user can edit, so it must NEVER be used for authorization: access
-- rights come from patient memberships (002), set only by server functions.
-- New tables are not exposed to the Data API automatically (Supabase change
-- 2026-04-28), so every table and function below gets explicit GRANTs.

create table if not exists public.profiles (
  id           uuid primary key references auth.users (id) on delete cascade,
  role         text not null check (role in ('caregiver', 'asha', 'doctor')),
  name         text not null check (length(trim(name)) > 0),
  phone        text not null unique,
  organization text,
  district     text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- Who can read/write: only yourself (002 adds "people you share a patient with").
drop policy if exists "profiles: read own" on public.profiles;
create policy "profiles: read own" on public.profiles
  for select to authenticated using (id = (select auth.uid()));

drop policy if exists "profiles: update own" on public.profiles;
create policy "profiles: update own" on public.profiles
  for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- Supabase grants everything on public tables by default; narrow it so a user can
-- change their name/organisation/district but never their phone or role.
revoke all on public.profiles from anon, authenticated;
grant select on public.profiles to authenticated;
grant update (name, organization, district) on public.profiles to authenticated;

-- Server clock for updated_at (sync cursors rely on it). Shared by later tables.
create or replace function public.set_updated_at() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();

-- New staff account → profile. Anonymous (patient phone) users are skipped.
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.is_anonymous then
    return new;
  end if;
  insert into public.profiles (id, role, name, phone, organization, district)
  values (
    new.id,
    new.raw_user_meta_data ->> 'role',
    coalesce(new.raw_user_meta_data ->> 'name', ''),
    coalesce(new.raw_user_meta_data ->> 'phone', new.email),
    nullif(trim(new.raw_user_meta_data ->> 'organization'), ''),
    nullif(trim(new.raw_user_meta_data ->> 'district'), '')
  );
  return new;
end $$;

-- Trigger-only functions: not callable by app users (functions in public are
-- executable by everyone by default, and this one is SECURITY DEFINER).
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.set_updated_at() from public, anon, authenticated;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- Check (should return 1 row: profiles | true | 2):
select c.relname as table_name, c.relrowsecurity as rls_on,
       (select count(*) from pg_policies p where p.tablename = c.relname) as policies
from pg_class c where c.relname = 'profiles' and c.relnamespace = 'public'::regnamespace;
