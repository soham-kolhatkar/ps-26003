-- Smriti · 004 · Doctor's notes + PIN reset codes (F18)
-- Paste into Supabase → SQL Editor → Run (after 001–003). Safe to run twice.
-- Then create the Edge Function `reset-pin` (supabase/functions/reset-pin/index.ts).

-- ─── Doctor's notes (synced like the 003 tables) ────────────────────────
create table if not exists public.doctor_notes (
  id         text primary key,
  patient_id uuid not null references public.patients (id) on delete cascade,
  author_id  uuid references auth.users (id) on delete set null,
  body       text not null check (length(trim(body)) > 0 and length(body) <= 2000),
  created_at bigint not null,
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
create index if not exists doctor_notes_patient_updated_idx on public.doctor_notes (patient_id, updated_at);

drop trigger if exists doctor_notes_set_updated_at on public.doctor_notes;
create trigger doctor_notes_set_updated_at before insert or update on public.doctor_notes
  for each row execute function public.set_updated_at();

alter table public.doctor_notes enable row level security;

drop policy if exists "doctor_notes: members read" on public.doctor_notes;
create policy "doctor_notes: members read" on public.doctor_notes
  for select to authenticated using (private.is_member(patient_id));

-- Only the patient's doctors write, and only as themselves.
drop policy if exists "doctor_notes: doctor inserts" on public.doctor_notes;
create policy "doctor_notes: doctor inserts" on public.doctor_notes for insert to authenticated
  with check (private.member_role(patient_id) = 'doctor' and author_id = (select auth.uid()));
drop policy if exists "doctor_notes: doctor updates own" on public.doctor_notes;
create policy "doctor_notes: doctor updates own" on public.doctor_notes for update to authenticated
  using (private.member_role(patient_id) = 'doctor' and author_id = (select auth.uid()))
  with check (private.member_role(patient_id) = 'doctor' and author_id = (select auth.uid()));

revoke all on public.doctor_notes from anon, authenticated;
grant select, insert, update on public.doctor_notes to authenticated;

-- ─── PIN reset codes ────────────────────────────────────────────────────
-- A manager of a patient issues a one-time 6-digit code for someone linked to that
-- patient who forgot their PIN. Only a hash is stored. The Edge Function `reset-pin`
-- (service key, server side) checks it and sets the new PIN.
create extension if not exists pgcrypto with schema extensions;

create table if not exists public.pin_resets (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users (id) on delete cascade,
  code_hash  text not null,
  created_by uuid references auth.users (id) on delete set null,
  expires_at timestamptz not null,
  used_at    timestamptz,
  attempts   int not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists pin_resets_user_idx on public.pin_resets (user_id, created_at);
alter table public.pin_resets enable row level security; -- no policies: functions only
revoke all on public.pin_resets from anon, authenticated;

create or replace function public.create_pin_reset(member uuid) returns table (code text, expires_at timestamptz)
language plpgsql security definer set search_path = '' as $$
declare
  me uuid := (select auth.uid());
  c text := lpad(floor(random() * 1000000)::int::text, 6, '0');
  exp timestamptz := now() + interval '30 minutes';
begin
  if me is null or private.is_anonymous() or member = me then raise exception 'not_allowed'; end if;
  -- The caller manages a patient that the member (a staff account) is linked to.
  if not exists (
    select 1 from public.patient_members mine
    join public.patient_members theirs on theirs.patient_id = mine.patient_id
    where mine.user_id = me and mine.is_manager and theirs.user_id = member and theirs.role <> 'device'
  ) then
    raise exception 'not_allowed';
  end if;
  -- One live code per person.
  update public.pin_resets r set used_at = now() where r.user_id = member and r.used_at is null;
  insert into public.pin_resets (user_id, code_hash, created_by, expires_at)
  values (member, encode(extensions.digest(c, 'sha256'), 'hex'), me, exp);
  return query select c, exp;
end $$;

-- Called only by the Edge Function (service key). 5 wrong tries end the code.
create or replace function public.consume_pin_reset(member uuid, reset_code text) returns boolean
language plpgsql security definer set search_path = '' as $$
declare
  r public.pin_resets;
begin
  select * into r from public.pin_resets
  where user_id = member and used_at is null and expires_at > now()
  order by created_at desc limit 1;
  if r.id is null or r.attempts >= 5 then return false; end if;
  if r.code_hash <> encode(extensions.digest(trim(reset_code), 'sha256'), 'hex') then
    update public.pin_resets set attempts = attempts + 1 where id = r.id;
    return false;
  end if;
  update public.pin_resets set used_at = now() where id = r.id;
  return true;
end $$;

revoke all on function public.create_pin_reset(uuid) from public, anon;
grant execute on function public.create_pin_reset(uuid) to authenticated;
revoke all on function public.consume_pin_reset(uuid, text) from public, anon, authenticated;
grant execute on function public.consume_pin_reset(uuid, text) to service_role;

-- Check (should list 2 tables, both with rls_on = true):
select c.relname as table_name, c.relrowsecurity as rls_on
from pg_class c
where c.relnamespace = 'public'::regnamespace and c.relname in ('doctor_notes', 'pin_resets')
order by 1;
