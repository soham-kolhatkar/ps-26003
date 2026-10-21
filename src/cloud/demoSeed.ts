/**
 * Demo tools (F19): load the demo story into the cloud for the 4-phone demo.
 *
 * The story is built by the existing single-phone seed (src/db/seed/demo.ts,
 * the same 30 days of games, doses and visits) into a temporary SQLite file,
 * then uploaded through the normal access rules, each part by the account that
 * may write it: Priya (caregiver) creates Kamala, Sunita (ASHA) registers
 * Lakshmi and Ramesh and records the visits, Dr. Anjali joins and writes a
 * note, and a temporary "patient's phone" account per patient uploads its game
 * history (the real patient phone replaces it when it pairs). Runs on its own
 * Supabase client, so this phone's sign-in is untouched. Re-running deletes
 * the demo accounts' patients first (SQL 005), so it doubles as a reset.
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import { deleteDatabaseAsync, openDatabaseAsync, type SQLiteDatabase } from 'expo-sqlite';
import { Platform } from 'react-native';

import { newId } from '@/db/ids';
import { initDatabase } from '@/db/init';
import type { DbClient } from '@/db/types';
import { SPECS } from '@/sync/tables';

import { isolatedClient } from './client';
import { phoneToEmail, pinToPassword } from './phone';

export const DEMO_PIN = '123456';
export const DEMO_ACCOUNTS = [
  {
    key: 'caregiver',
    role: 'caregiver',
    name: 'Priya Sharma',
    phone: '+919000010001',
    organization: '',
    district: 'Jorhat',
  },
  {
    key: 'asha',
    role: 'asha',
    name: 'Sunita Devi',
    phone: '+919000010002',
    organization: 'ASHA, Cinnamara sub-centre',
    district: 'Jorhat',
  },
  {
    key: 'doctor',
    role: 'doctor',
    name: 'Dr. Anjali Mehta',
    phone: '+919000010003',
    organization: 'Geriatric OPD, District Hospital Jorhat',
    district: 'Jorhat',
  },
] as const;
type Account = (typeof DEMO_ACCOUNTS)[number];

/** Local seed ids → who manages them in the cloud story. */
const PATIENTS = [
  { local: 'p-aita', manager: 'caregiver', relation: 'daughter' },
  { local: 'p-lakhi', manager: 'asha', relation: null },
  { local: 'p-dhaniram', manager: 'asha', relation: null },
] as const;

const NOTE_FOR_RAMESH =
  'Referred by Sunita (ASHA): poor sleep, low mood and slipping check-ups. Please check his blood pressure every week and keep the Amlodipine reminder. Review with me in 2 weeks.';

export type DemoLog = (line: string) => void;
type Row = Record<string, unknown>;

const CHUNK = 500;
async function upload(sb: SupabaseClient, table: string, rows: Row[], onConflict: string, ignoreDuplicates = false) {
  for (let i = 0; i < rows.length; i += CHUNK) {
    const { error } = await sb.from(table).upsert(rows.slice(i, i + CHUNK), { onConflict, ignoreDuplicates });
    if (error) throw new Error(`${table}: ${error.message}`);
  }
}

async function rpc<T>(sb: SupabaseClient, fn: string, args: Row): Promise<T> {
  const { data, error } = await sb.rpc(fn, args);
  if (error) throw new Error(`${fn}: ${error.message}`);
  return data as T;
}

async function signInAs(sb: SupabaseClient, a: Account): Promise<string> {
  await sb.auth.signOut({ scope: 'local' });
  const email = phoneToEmail(a.phone);
  const password = pinToPassword(DEMO_PIN);
  const first = await sb.auth.signInWithPassword({ email, password });
  if (!first.error && first.data.user) return first.data.user.id;
  const up = await sb.auth.signUp({
    email,
    password,
    options: {
      data: { role: a.role, name: a.name, phone: a.phone, organization: a.organization, district: a.district },
    },
  });
  if (up.error || !up.data.user) {
    throw new Error(
      `${a.name}: ${up.error?.message ?? 'sign-up failed'} (if this number already has an account with another PIN, reset it first)`,
    );
  }
  return up.data.user.id;
}

async function invite(sb: SupabaseClient, pid: string, role: string, relation?: string): Promise<string> {
  const rows = await rpc<{ code: string }[]>(sb, 'create_invite', {
    pid,
    invite_role: role,
    invite_relation: relation ?? null,
  });
  return rows[0].code;
}

async function redeem(sb: SupabaseClient, code: string) {
  const r = await rpc<{ ok: boolean; error?: string }>(sb, 'redeem_invite', { invite_code: code });
  if (!r.ok) throw new Error(`redeem_invite: ${r.error}`);
}

/** Delete every patient this account manages (the demo accounts are demo-only). */
async function clearManaged(sb: SupabaseClient, uid: string, log: DemoLog) {
  const { data, error } = await sb
    .from('patient_members')
    .select('patient_id')
    .eq('user_id', uid)
    .eq('is_manager', true);
  if (error) throw new Error(`patient_members: ${error.message}`);
  for (const m of data ?? []) await rpc(sb, 'delete_patient', { pid: m.patient_id });
  if (data?.length) log(`🗑️  removed ${data.length} earlier demo patient(s)`);
}

async function buildStory(): Promise<{ db: SQLiteDatabase; name: string }> {
  const name = `smriti-demo-build-${Date.now()}.db`;
  const db = await openDatabaseAsync(name, Platform.OS === 'web' ? undefined : { useNewConnection: true });
  await initDatabase(db);
  return { db, name };
}

export async function loadCloudDemo(log: DemoLog): Promise<{ patients: number; sessions: number }> {
  const sb = isolatedClient();
  log('🧱 building the demo story (30 days)…');
  const { db, name } = await buildStory();
  const local: DbClient = db;
  try {
    const all = (sql: string, args: (string | number)[] = []) => local.getAllAsync<Row>(sql, args);
    const ids = new Map<string, string>(PATIENTS.map((p) => [p.local, newId()]));
    const uid: Record<string, string> = {};
    const codes: Record<string, { device?: string; asha?: string; doctor?: string }> = {};
    let sessions = 0;

    const reminderIds = new Map<string, string>();
    const uploadReminders = async (localPid: string, managerUid: string) => {
      const pid = ids.get(localPid)!;
      const reminders = (await all('SELECT * FROM reminder WHERE patient_id = ?', [localPid])).map((r) => {
        const rid = newId();
        reminderIds.set(String(r.id), rid);
        return { ...SPECS.reminder.toCloud(r), id: rid, patient_id: pid, created_by: managerUid };
      });
      await upload(sb, 'reminders', reminders, 'id');
      const doses = (
        await all("SELECT * FROM reminder_event WHERE patient_id = ? AND status <> 'pending'", [localPid])
      ).map((e) => {
        const rid = reminderIds.get(String(e.reminder_id))!;
        return { ...SPECS.reminder_event.toCloud(e), id: `${rid}:${e.due_at}`, reminder_id: rid, patient_id: pid };
      });
      await upload(sb, 'reminder_events', doses, 'id');
      log(`   ${reminders.length} reminder(s), ${doses.length} past dose(s)`);
    };

    const createPatient = async (localPid: string, relation: string | null) => {
      const [p] = await all(
        `SELECT p.*, h.village, h.district FROM patient p JOIN household h ON h.id = p.household_id WHERE p.id = ?`,
        [localPid],
      );
      await rpc(sb, 'create_patient', {
        p: {
          id: ids.get(localPid),
          name: p.name,
          preferred_name: p.preferred_name,
          age: p.age,
          gender: p.gender,
          language: p.language,
          condition_stage: p.condition_stage,
          notes: p.notes,
          avatar: p.avatar,
          village: p.village,
          district: p.district,
          relation,
        },
      });
      log(`👤 ${p.name}`);
    };

    // 1. Priya: Kamala, her reminders, invites for Sunita, Dr. Anjali and the patient phone.
    const [carer, asha, doctor] = DEMO_ACCOUNTS;
    uid.caregiver = await signInAs(sb, carer);
    log(`🔑 ${carer.name} signed in`);
    await clearManaged(sb, uid.caregiver, log);
    for (const p of PATIENTS.filter((x) => x.manager === 'caregiver')) {
      await createPatient(p.local, p.relation);
      await uploadReminders(p.local, uid.caregiver);
      const pid = ids.get(p.local)!;
      codes[pid] = {
        asha: await invite(sb, pid, 'asha'),
        doctor: await invite(sb, pid, 'doctor'),
        device: await invite(sb, pid, 'device'),
      };
    }

    // 2. Sunita: joins Kamala, registers Lakshmi and Ramesh, records the home visits.
    uid.asha = await signInAs(sb, asha);
    log(`🔑 ${asha.name} signed in`);
    await clearManaged(sb, uid.asha, log);
    for (const c of Object.values(codes)) if (c.asha) await redeem(sb, c.asha);
    for (const p of PATIENTS.filter((x) => x.manager === 'asha')) {
      await createPatient(p.local, null);
      await uploadReminders(p.local, uid.asha);
      const pid = ids.get(p.local)!;
      codes[pid] = { doctor: await invite(sb, pid, 'doctor'), device: await invite(sb, pid, 'device') };
    }
    const visits: Row[] = [];
    for (const p of PATIENTS) {
      for (const v of await all('SELECT * FROM visit WHERE patient_id = ?', [p.local])) {
        visits.push({ ...SPECS.visit.toCloud(v), id: newId(), patient_id: ids.get(p.local), user_id: uid.asha });
      }
    }
    await upload(sb, 'visits', visits, 'id');
    log(`🏠 ${visits.length} home visit(s)`);

    // 3. Dr. Anjali: follows all three, writes a note for Ramesh (referred by the ASHA).
    uid.doctor = await signInAs(sb, doctor);
    log(`🔑 ${doctor.name} signed in`);
    for (const c of Object.values(codes)) if (c.doctor) await redeem(sb, c.doctor);
    const ramesh = ids.get('p-dhaniram')!;
    await upload(
      sb,
      'doctor_notes',
      [{ id: newId(), patient_id: ramesh, author_id: uid.doctor, body: NOTE_FOR_RAMESH, created_at: Date.now() }],
      'id',
    );
    log('🩺 note for Ramesh');

    // 4. Game history, uploaded as each patient's phone (a temporary anonymous account).
    for (const p of PATIENTS) {
      const pid = ids.get(p.local)!;
      await sb.auth.signOut({ scope: 'local' });
      const anon = await sb.auth.signInAnonymously();
      if (anon.error) throw new Error(`anonymous sign-in: ${anon.error.message}`);
      await redeem(sb, codes[pid].device!);
      const games = (await all('SELECT * FROM game_session WHERE patient_id = ?', [p.local])).map((g) => ({
        ...SPECS.game_session.toCloud(g),
        id: newId(),
        patient_id: pid,
      }));
      await upload(sb, 'game_sessions', games, 'id', true);
      const levels = (await all('SELECT * FROM game_level WHERE patient_id = ?', [p.local])).map((l) => ({
        ...SPECS.game_level.toCloud(l),
        patient_id: pid,
      }));
      await upload(sb, 'game_levels', levels, 'patient_id,game_id');
      sessions += games.length;
      log(
        `🎲 ${games.length} game(s) for ${p.local === 'p-aita' ? 'Kamala' : p.local === 'p-lakhi' ? 'Lakshmi' : 'Ramesh'}`,
      );
    }
    await sb.auth.signOut({ scope: 'local' });
    log('✅ done');
    return { patients: PATIENTS.length, sessions };
  } finally {
    await db.closeAsync().catch(() => {});
    await deleteDatabaseAsync(name).catch(() => {});
  }
}
