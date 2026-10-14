-- Smriti · 005 · Delete a patient (F19: resetting the cloud demo)
-- Paste into Supabase → SQL Editor → Run (after 001–004). Safe to run twice.
--
-- A manager of a patient can delete that patient's record completely: members,
-- invites, reminders, doses, games, levels, visits and notes go with it (ON DELETE
-- CASCADE). Used by Demo tools → "Reset the cloud demo". Photos are never in the
-- cloud, so nothing else is left behind.

create or replace function public.delete_patient(pid uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if (select auth.uid()) is null or private.is_anonymous() or not private.is_manager(pid) then
    raise exception 'not_allowed';
  end if;
  delete from public.patients where id = pid;
end $$;

revoke all on function public.delete_patient(uuid) from public, anon;
grant execute on function public.delete_patient(uuid) to authenticated;

-- Check (should return 1 row: delete_patient | true):
select p.proname as function_name, p.prosecdef as security_definer
from pg_proc p where p.proname = 'delete_patient' and p.pronamespace = 'public'::regnamespace;
