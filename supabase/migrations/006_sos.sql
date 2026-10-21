-- Smriti · 006 · SOS presses (F21)
-- Paste into Supabase → SQL Editor → Run (after 001–005). Safe to run twice.
-- The patient's phone records each press of "Call family"; the family, ASHA and doctor
-- phones pull it and show an urgent banner (D53). Insert-only: nobody edits or deletes
-- a press (dismissing the banner stays on each phone).

create table if not exists public.sos_events (
  id             text primary key,
  patient_id     uuid not null references public.patients (id) on delete cascade,
  called_user_id uuid references auth.users (id) on delete set null,
  created_at     bigint not null,
  updated_at     timestamptz not null default now()
);
create index if not exists sos_events_patient_updated_idx on public.sos_events (patient_id, updated_at);

drop trigger if exists sos_events_set_updated_at on public.sos_events;
create trigger sos_events_set_updated_at before insert or update on public.sos_events
  for each row execute function public.set_updated_at();

alter table public.sos_events enable row level security;

drop policy if exists "sos: members read" on public.sos_events;
create policy "sos: members read" on public.sos_events
  for select to authenticated using (private.is_member(patient_id));

-- Only the patient's own (paired) phone records a press.
drop policy if exists "sos: phone inserts" on public.sos_events;
create policy "sos: phone inserts" on public.sos_events for insert to authenticated
  with check (private.member_role(patient_id) = 'device');

revoke all on public.sos_events from anon, authenticated;
grant select, insert on public.sos_events to authenticated;

-- Check (should show one row, rls_on = true):
select relname as table_name, relrowsecurity as rls_on
from pg_class where relname = 'sos_events';
