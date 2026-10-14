-- Smriti · 003 · Synced data: reminders, doses, games, levels, visits (F17)
-- Paste into Supabase → SQL Editor → Run (after 001 and 002). Safe to run twice.
--
-- Every phone keeps its own SQLite copy (source of truth for that phone) and
-- pushes / pulls these rows (D42). Ids are the phone-made ids (text). Times the
-- phones record stay epoch milliseconds (bigint); `updated_at` is the server's
-- clock and is what phones pull by.
--
-- Who may write what (D43; rights only from patient_members.role):
--   reminders        managers + ASHA members        (doctor, patient phone: read)
--   reminder_events  patient phone, managers, ASHA  (taken never goes back to pending)
--   game_sessions    patient phone only            (insert; games are played there)
--   game_levels      patient phone only            (newer level wins)
--   visits           ASHA members only
-- Everyone linked to the patient can read all of it.

create or replace function private.member_role(pid uuid) returns text
language sql stable security definer set search_path = '' as $$
  select m.role from public.patient_members m where m.patient_id = pid and m.user_id = (select auth.uid());
$$;
revoke all on function private.member_role(uuid) from public, anon;
grant execute on function private.member_role(uuid) to authenticated;

-- ─── Tables ──────────────────────────────────────────────────────────────
create table if not exists public.reminders (
  id            text primary key,
  patient_id    uuid not null references public.patients (id) on delete cascade,
  type          text not null check (type in ('medicine', 'hydration', 'activity', 'appointment')),
  title         text not null,
  note          text,
  schedule_kind text not null check (schedule_kind in ('daily', 'once')),
  times         text,
  once_at       bigint,
  enabled       boolean not null default true,
  created_by    uuid references auth.users (id) on delete set null,
  created_at    bigint not null,
  client_updated_at bigint not null,
  updated_at    timestamptz not null default now(),
  deleted_at    timestamptz
);
create index if not exists reminders_patient_updated_idx on public.reminders (patient_id, updated_at);

create table if not exists public.reminder_events (
  id          text primary key,
  reminder_id text not null references public.reminders (id) on delete cascade,
  patient_id  uuid not null references public.patients (id) on delete cascade,
  due_at      bigint not null,
  status      text not null check (status in ('pending', 'taken', 'skipped')),
  acted_at    bigint,
  updated_at  timestamptz not null default now(),
  unique (reminder_id, due_at)
);
create index if not exists reminder_events_patient_updated_idx on public.reminder_events (patient_id, updated_at);

create table if not exists public.game_sessions (
  id              text primary key,
  patient_id      uuid not null references public.patients (id) on delete cascade,
  game_id         text not null,
  level           int not null,
  started_at      bigint not null,
  ended_at        bigint,
  trials          int not null,
  correct         int not null,
  accuracy        real,
  avg_reaction_ms real,
  score           real,
  completed       boolean not null,
  source          text not null default 'app',
  updated_at      timestamptz not null default now()
);
create index if not exists game_sessions_patient_updated_idx on public.game_sessions (patient_id, updated_at);

create table if not exists public.game_levels (
  patient_id        uuid not null references public.patients (id) on delete cascade,
  game_id           text not null,
  level             int not null,
  client_updated_at bigint not null,
  updated_at        timestamptz not null default now(),
  primary key (patient_id, game_id)
);
create index if not exists game_levels_patient_updated_idx on public.game_levels (patient_id, updated_at);

create table if not exists public.visits (
  id            text primary key,
  patient_id    uuid not null references public.patients (id) on delete cascade,
  user_id       uuid references auth.users (id) on delete set null,
  started_at    bigint not null,
  ended_at      bigint,
  checkup       jsonb,
  checkup_score int,
  observations  jsonb not null default '{}',
  note          text,
  refer         boolean not null default false,
  next_visit_at bigint,
  source        text not null default 'app',
  updated_at    timestamptz not null default now()
);
create index if not exists visits_patient_updated_idx on public.visits (patient_id, updated_at);

-- ─── Server rules (triggers) ────────────────────────────────────────────
-- Every change stamps the server clock (pull cursors use it).
do $$
declare t text;
begin
  foreach t in array array['reminders', 'reminder_events', 'game_sessions', 'game_levels', 'visits'] loop
    execute format('drop trigger if exists %I on public.%I', t || '_set_updated_at', t);
    execute format('create trigger %I before insert or update on public.%I
                    for each row execute function public.set_updated_at()', t || '_set_updated_at', t);
  end loop;
end $$;

-- A dose marked taken/skipped never goes back to pending (a late push from another phone).
create or replace function private.keep_decided_dose() returns trigger
language plpgsql set search_path = '' as $$
begin
  if old.status in ('taken', 'skipped') and new.status = 'pending' then
    new.status := old.status;
    new.acted_at := old.acted_at;
  end if;
  return new;
end $$;
drop trigger if exists reminder_events_keep_decided on public.reminder_events;
create trigger reminder_events_keep_decided before update on public.reminder_events
  for each row execute function private.keep_decided_dose();

-- An older level never overwrites a newer one.
create or replace function private.keep_newer_level() returns trigger
language plpgsql set search_path = '' as $$
begin
  if new.client_updated_at < old.client_updated_at then
    return old;
  end if;
  return new;
end $$;
drop trigger if exists game_levels_keep_newer on public.game_levels;
create trigger game_levels_keep_newer before update on public.game_levels
  for each row execute function private.keep_newer_level();

-- Trigger-only helpers: not callable by app users.
revoke all on function private.keep_decided_dose() from public, anon, authenticated;
revoke all on function private.keep_newer_level() from public, anon, authenticated;

-- ─── Row-level security ─────────────────────────────────────────────────
alter table public.reminders enable row level security;
alter table public.reminder_events enable row level security;
alter table public.game_sessions enable row level security;
alter table public.game_levels enable row level security;
alter table public.visits enable row level security;

do $$
declare t text;
begin
  foreach t in array array['reminders', 'reminder_events', 'game_sessions', 'game_levels', 'visits'] loop
    execute format('drop policy if exists %I on public.%I', t || ': members read', t);
    execute format('create policy %I on public.%I for select to authenticated using (private.is_member(patient_id))',
                   t || ': members read', t);
  end loop;
end $$;

-- reminders: managers (caregivers / registering ASHA) and ASHA members write (incl. soft delete).
drop policy if exists "reminders: carers insert" on public.reminders;
create policy "reminders: carers insert" on public.reminders for insert to authenticated
  with check (not private.is_anonymous() and (private.is_manager(patient_id) or private.member_role(patient_id) = 'asha'));
drop policy if exists "reminders: carers update" on public.reminders;
create policy "reminders: carers update" on public.reminders for update to authenticated
  using (not private.is_anonymous() and (private.is_manager(patient_id) or private.member_role(patient_id) = 'asha'))
  with check (not private.is_anonymous() and (private.is_manager(patient_id) or private.member_role(patient_id) = 'asha'));

-- reminder_events: the patient's phone (and carers) record doses.
drop policy if exists "doses: phone and carers insert" on public.reminder_events;
create policy "doses: phone and carers insert" on public.reminder_events for insert to authenticated
  with check (private.member_role(patient_id) in ('device', 'caregiver', 'asha'));
drop policy if exists "doses: phone and carers update" on public.reminder_events;
create policy "doses: phone and carers update" on public.reminder_events for update to authenticated
  using (private.member_role(patient_id) in ('device', 'caregiver', 'asha'))
  with check (private.member_role(patient_id) in ('device', 'caregiver', 'asha'));

-- game_sessions: only the patient's phone, insert only.
drop policy if exists "games: phone inserts" on public.game_sessions;
create policy "games: phone inserts" on public.game_sessions for insert to authenticated
  with check (private.member_role(patient_id) = 'device');

-- game_levels: only the patient's phone.
drop policy if exists "levels: phone insert" on public.game_levels;
create policy "levels: phone insert" on public.game_levels for insert to authenticated
  with check (private.member_role(patient_id) = 'device');
drop policy if exists "levels: phone update" on public.game_levels;
create policy "levels: phone update" on public.game_levels for update to authenticated
  using (private.member_role(patient_id) = 'device')
  with check (private.member_role(patient_id) = 'device');

-- visits: ASHA members, as themselves.
drop policy if exists "visits: asha insert" on public.visits;
create policy "visits: asha insert" on public.visits for insert to authenticated
  with check (private.member_role(patient_id) = 'asha' and user_id = (select auth.uid()));
drop policy if exists "visits: asha update" on public.visits;
create policy "visits: asha update" on public.visits for update to authenticated
  using (private.member_role(patient_id) = 'asha' and user_id = (select auth.uid()))
  with check (private.member_role(patient_id) = 'asha' and user_id = (select auth.uid()));

-- ─── Grants (tables are not exposed to the API automatically) ───────────
revoke all on public.reminders, public.reminder_events, public.game_sessions, public.game_levels, public.visits
  from anon, authenticated;
grant select, insert, update on public.reminders, public.reminder_events, public.game_levels, public.visits
  to authenticated;
grant select, insert on public.game_sessions to authenticated;

-- Check (should list 5 tables, all with rls_on = true):
select c.relname as table_name, c.relrowsecurity as rls_on
from pg_class c
where c.relnamespace = 'public'::regnamespace
  and c.relname in ('reminders', 'reminder_events', 'game_sessions', 'game_levels', 'visits')
order by 1;
