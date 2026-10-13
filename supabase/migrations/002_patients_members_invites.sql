-- Smriti · 002 · Patients, members, invite & pairing codes (F16)
-- Paste into Supabase → SQL Editor → Run (after 001). Safe to run twice.
--
-- Access model (D43): rights come ONLY from patient_members.role, which only
-- the functions below write. Caregivers and ASHA workers can create patients
-- (the creator becomes a manager). Managers invite others with 6-digit codes;
-- the patient's phone (an anonymous user) joins with a 15-minute device code.

-- ─── Tables ──────────────────────────────────────────────────────────────
create table if not exists public.patients (
  id              uuid primary key default gen_random_uuid(),
  name            text not null check (length(trim(name)) > 0),
  preferred_name  text,
  age             int check (age between 30 and 120),
  gender          text check (gender in ('female', 'male', 'other')),
  language        text not null default 'hi',
  condition_stage text check (condition_stage in ('mild', 'moderate', 'severe')),
  notes           text,
  avatar          text,
  village         text,
  district        text,
  created_by      uuid references auth.users (id) on delete set null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  deleted_at      timestamptz
);
create index if not exists patients_created_by_idx on public.patients (created_by);

create table if not exists public.patient_members (
  patient_id uuid not null references public.patients (id) on delete cascade,
  user_id    uuid not null references auth.users (id) on delete cascade,
  role       text not null check (role in ('caregiver', 'asha', 'doctor', 'device')),
  relation   text,
  is_manager boolean not null default false,
  added_by   uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (patient_id, user_id)
);
create index if not exists patient_members_user_idx on public.patient_members (user_id);

create table if not exists public.invites (
  code       text primary key check (code ~ '^\d{6}$'),
  patient_id uuid not null references public.patients (id) on delete cascade,
  role       text not null check (role in ('caregiver', 'asha', 'doctor', 'device')),
  relation   text,
  created_by uuid not null references auth.users (id) on delete cascade,
  expires_at timestamptz not null,
  used_by    uuid references auth.users (id) on delete set null,
  used_at    timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists invites_patient_idx on public.invites (patient_id);

-- Failed code attempts (brute-force limit: 5 per user per hour).
create table if not exists public.invite_attempts (
  user_id      uuid not null references auth.users (id) on delete cascade,
  attempted_at timestamptz not null default now()
);
create index if not exists invite_attempts_user_time_idx on public.invite_attempts (user_id, attempted_at);

drop trigger if exists patients_set_updated_at on public.patients;
create trigger patients_set_updated_at before update on public.patients
  for each row execute function public.set_updated_at();
drop trigger if exists patient_members_set_updated_at on public.patient_members;
create trigger patient_members_set_updated_at before update on public.patient_members
  for each row execute function public.set_updated_at();

-- ─── Helpers used by policies (private schema: not reachable through the API) ──
create schema if not exists private;
grant usage on schema private to authenticated;

create or replace function private.is_member(pid uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.patient_members m where m.patient_id = pid and m.user_id = (select auth.uid())
  );
$$;

create or replace function private.is_manager(pid uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.patient_members m
    where m.patient_id = pid and m.user_id = (select auth.uid()) and m.is_manager
  );
$$;

create or replace function private.shares_patient(other uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.patient_members a
    join public.patient_members b on b.patient_id = a.patient_id
    where a.user_id = (select auth.uid()) and b.user_id = other
  );
$$;

create or replace function private.is_anonymous() returns boolean
language sql stable set search_path = '' as $$
  select coalesce(((select auth.jwt()) ->> 'is_anonymous')::boolean, false);
$$;

revoke all on all functions in schema private from public, anon;
grant execute on all functions in schema private to authenticated;

-- ─── Row-level security ─────────────────────────────────────────────────
alter table public.patients enable row level security;
alter table public.patient_members enable row level security;
alter table public.invites enable row level security;
alter table public.invite_attempts enable row level security;

drop policy if exists "patients: members read" on public.patients;
create policy "patients: members read" on public.patients
  for select to authenticated using (private.is_member(id));

drop policy if exists "patients: managers update" on public.patients;
create policy "patients: managers update" on public.patients
  for update to authenticated
  using (private.is_manager(id) and not private.is_anonymous())
  with check (private.is_manager(id) and not private.is_anonymous());

drop policy if exists "members: members read" on public.patient_members;
create policy "members: members read" on public.patient_members
  for select to authenticated using (private.is_member(patient_id));

-- People you share a patient with can see your name, role and organisation.
drop policy if exists "profiles: co-members read" on public.profiles;
create policy "profiles: co-members read" on public.profiles
  for select to authenticated using (private.shares_patient(id));

-- invites / invite_attempts: no policies → no direct access; only the functions below.

revoke all on public.patients, public.patient_members, public.invites, public.invite_attempts from anon, authenticated;
grant select on public.patients, public.patient_members to authenticated;
grant update (name, preferred_name, age, gender, language, condition_stage, notes, avatar, village, district)
  on public.patients to authenticated;

-- ─── Functions the app calls (RPC) ──────────────────────────────────────
-- SECURITY DEFINER so they can write tables users can't touch directly; each one
-- checks the caller itself. search_path is pinned; only signed-in users may call.

-- New patient + the creator as manager, in one step (avoids the "can't read what I just
-- inserted" RLS trap). Caregivers and ASHA workers only.
create or replace function public.create_patient(p jsonb) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  me uuid := (select auth.uid());
  my_role text;
  new_id uuid := coalesce(nullif(p ->> 'id', '')::uuid, gen_random_uuid());
begin
  if me is null or private.is_anonymous() then raise exception 'not_allowed'; end if;
  select role into my_role from public.profiles where id = me;
  if my_role not in ('caregiver', 'asha') then raise exception 'not_allowed'; end if;

  insert into public.patients (id, name, preferred_name, age, gender, language, condition_stage, notes, avatar,
                               village, district, created_by)
  values (new_id, trim(p ->> 'name'), nullif(trim(p ->> 'preferred_name'), ''), nullif(p ->> 'age', '')::int,
          nullif(p ->> 'gender', ''), coalesce(nullif(p ->> 'language', ''), 'hi'),
          nullif(p ->> 'condition_stage', ''), nullif(trim(p ->> 'notes'), ''), nullif(p ->> 'avatar', ''),
          nullif(trim(p ->> 'village'), ''), nullif(trim(p ->> 'district'), ''), me);

  insert into public.patient_members (patient_id, user_id, role, relation, is_manager, added_by)
  values (new_id, me, my_role,
          case when my_role = 'asha' then 'asha' else nullif(p ->> 'relation', '') end, true, me);
  return new_id;
end $$;

-- A 6-digit code for one role. Managers only. Device codes last 15 minutes, others 7 days.
create or replace function public.create_invite(pid uuid, invite_role text, invite_relation text default null)
returns table (code text, expires_at timestamptz)
language plpgsql security definer set search_path = '' as $$
declare
  me uuid := (select auth.uid());
  c text;
  exp timestamptz;
begin
  if me is null or private.is_anonymous() or not private.is_manager(pid) then raise exception 'not_allowed'; end if;
  if invite_role not in ('caregiver', 'asha', 'doctor', 'device') then raise exception 'bad_role'; end if;
  exp := now() + case when invite_role = 'device' then interval '15 minutes' else interval '7 days' end;
  -- Free codes that are long gone, then pick an unused one.
  delete from public.invites i where i.expires_at < now() - interval '1 day';
  loop
    c := lpad(floor(random() * 1000000)::int::text, 6, '0');
    begin
      insert into public.invites (code, patient_id, role, relation, created_by, expires_at)
      values (c, pid, invite_role, nullif(invite_relation, ''), me, exp);
      exit;
    exception when unique_violation then
      -- try another code
    end;
  end loop;
  return query select c, exp;
end $$;

-- Use a code. Returns {ok, patient_id, role} or {ok:false, error}. Failed tries are
-- recorded (no exception, so the record is kept) and limited to 5 per hour.
create or replace function public.redeem_invite(invite_code text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  me uuid := (select auth.uid());
  anon boolean := private.is_anonymous();
  my_role text;
  inv public.invites;
begin
  if me is null then return jsonb_build_object('ok', false, 'error', 'not_signed_in'); end if;
  if (select count(*) from public.invite_attempts a
      where a.user_id = me and a.attempted_at > now() - interval '1 hour') >= 5 then
    return jsonb_build_object('ok', false, 'error', 'too_many');
  end if;

  select role into my_role from public.profiles where id = me;

  -- Atomic: only one device/person can take a code.
  update public.invites i set used_by = me, used_at = now()
  where i.code = trim(invite_code) and i.used_by is null and i.expires_at > now()
    and ((i.role = 'device' and anon) or (i.role <> 'device' and not anon and i.role = my_role))
  returning * into inv;

  if inv.code is null then
    insert into public.invite_attempts (user_id) values (me);
    -- Tell a real user why a valid-looking code did not fit (wrong kind of account).
    if exists (select 1 from public.invites i where i.code = trim(invite_code) and i.used_by is null
               and i.expires_at > now()) then
      return jsonb_build_object('ok', false, 'error', 'wrong_role');
    end if;
    return jsonb_build_object('ok', false, 'error', 'invalid_code');
  end if;

  if inv.role = 'device' then
    -- One patient phone per patient: a new pairing replaces the old phone.
    delete from public.patient_members m where m.patient_id = inv.patient_id and m.role = 'device';
  end if;

  insert into public.patient_members (patient_id, user_id, role, relation, is_manager, added_by)
  values (inv.patient_id, me, inv.role,
          case when inv.role in ('asha', 'doctor') then inv.role else inv.relation end,
          inv.role = 'caregiver', inv.created_by)
  on conflict (patient_id, user_id) do nothing;

  return jsonb_build_object('ok', true, 'patient_id', inv.patient_id, 'role', inv.role);
end $$;

-- Managers remove someone (never the last manager).
create or replace function public.remove_member(pid uuid, member uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not private.is_manager(pid) or private.is_anonymous() then raise exception 'not_allowed'; end if;
  if (select is_manager from public.patient_members where patient_id = pid and user_id = member)
     and (select count(*) from public.patient_members where patient_id = pid and is_manager) <= 1 then
    raise exception 'last_manager';
  end if;
  delete from public.patient_members where patient_id = pid and user_id = member;
end $$;

-- Leave a patient yourself (the last manager can't leave while others remain).
create or replace function public.leave_patient(pid uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare
  me uuid := (select auth.uid());
begin
  if me is null then raise exception 'not_allowed'; end if;
  if (select is_manager from public.patient_members where patient_id = pid and user_id = me)
     and (select count(*) from public.patient_members where patient_id = pid and is_manager) <= 1
     and (select count(*) from public.patient_members where patient_id = pid) > 1 then
    raise exception 'last_manager';
  end if;
  delete from public.patient_members where patient_id = pid and user_id = me;
end $$;

revoke all on function public.create_patient(jsonb) from public, anon;
revoke all on function public.create_invite(uuid, text, text) from public, anon;
revoke all on function public.redeem_invite(text) from public, anon;
revoke all on function public.remove_member(uuid, uuid) from public, anon;
revoke all on function public.leave_patient(uuid) from public, anon;
grant execute on function public.create_patient(jsonb) to authenticated;
grant execute on function public.create_invite(uuid, text, text) to authenticated;
grant execute on function public.redeem_invite(text) to authenticated;
grant execute on function public.remove_member(uuid, uuid) to authenticated;
grant execute on function public.leave_patient(uuid) to authenticated;

-- Check (should list 4 tables, all with rls_on = true):
select c.relname as table_name, c.relrowsecurity as rls_on
from pg_class c
where c.relnamespace = 'public'::regnamespace
  and c.relname in ('patients', 'patient_members', 'invites', 'invite_attempts')
order by 1;
