import { seededRng } from '@/engine/random';
import { occurrencesBetween, startOfDay, type ReminderSchedule, type ReminderType } from '@/engine/reminders';

import type { DbClient } from '../types';

/**
 * Demo story for the SIH pitch. Stable ids so docs, tests and the demo script
 * can reference them. Fictional people; places are real districts of Assam.
 */
export const DEMO = {
  households: [
    { id: 'h-bora', name: 'Bora family', village: 'Cinnamara', district: 'Jorhat', state: 'Assam' },
    { id: 'h-gogoi', name: 'Gogoi family', village: 'Titabar', district: 'Jorhat', state: 'Assam' },
    { id: 'h-saikia', name: 'Saikia family', village: 'Teok', district: 'Jorhat', state: 'Assam' },
  ],
  patients: [
    {
      id: 'p-aita',
      householdId: 'h-bora',
      name: 'Hemoprova Bora',
      preferredName: 'Aita',
      age: 72,
      gender: 'female',
      language: 'hi',
      conditionStage: 'mild',
      notes: 'Retired tea-garden school teacher. Loves Bihu songs and her kitchen garden.',
      avatar: '👵',
    },
    {
      id: 'p-lakhi',
      householdId: 'h-gogoi',
      name: 'Lakhi Gogoi',
      preferredName: null,
      age: 68,
      gender: 'female',
      language: 'hi',
      conditionStage: 'mild',
      notes: 'Lives with son and grandchildren. Weaves gamosas.',
      avatar: '👵🏽',
    },
    {
      id: 'p-dhaniram',
      householdId: 'h-saikia',
      name: 'Dhaniram Saikia',
      preferredName: null,
      age: 75,
      gender: 'male',
      language: 'hi',
      conditionStage: 'moderate',
      notes: 'Former paddy farmer. Hypertension; needs medicine reminders.',
      avatar: '👴',
    },
  ],
  users: [
    { id: 'u-rimjhim', role: 'caregiver', name: 'Rimjhim Bora', phone: null, organization: null, avatar: '👩' },
    {
      id: 'u-pranita',
      role: 'asha',
      name: 'Pranita Das',
      phone: null,
      organization: 'ASHA, Cinnamara sub-centre',
      avatar: '🧑‍⚕️',
    },
    {
      id: 'u-anjali',
      role: 'doctor',
      name: 'Dr. Anjali Sharma',
      phone: null,
      organization: 'Geriatric OPD, District Hospital Jorhat',
      avatar: '🩺',
    },
  ],
  links: [
    { patientId: 'p-aita', userId: 'u-rimjhim', relation: 'daughter' },
    { patientId: 'p-aita', userId: 'u-pranita', relation: 'asha' },
    { patientId: 'p-lakhi', userId: 'u-pranita', relation: 'asha' },
    { patientId: 'p-dhaniram', userId: 'u-pranita', relation: 'asha' },
    { patientId: 'p-aita', userId: 'u-anjali', relation: 'doctor' },
    { patientId: 'p-lakhi', userId: 'u-anjali', relation: 'doctor' },
    { patientId: 'p-dhaniram', userId: 'u-anjali', relation: 'doctor' },
  ],
  /** Daily reminders; `takeRate` drives the seeded 14-day history. Appointment `inDays` from seed time. */
  reminders: [
    {
      id: 'r-aita-metformin',
      patientId: 'p-aita',
      type: 'medicine',
      title: 'Metformin 500 mg',
      note: 'After food',
      times: ['08:30', '20:30'],
      takeRate: 0.88,
    },
    {
      id: 'r-aita-water',
      patientId: 'p-aita',
      type: 'hydration',
      title: 'Drink a glass of water',
      note: null,
      times: ['10:00', '13:00', '16:00'],
      takeRate: 0.75,
    },
    {
      id: 'r-aita-walk',
      patientId: 'p-aita',
      type: 'activity',
      title: 'Evening walk in the garden',
      note: null,
      times: ['17:30'],
      takeRate: 0.8,
    },
    {
      id: 'r-lakhi-water',
      patientId: 'p-lakhi',
      type: 'hydration',
      title: 'Drink a glass of water',
      note: null,
      times: ['11:00', '15:00'],
      takeRate: 0.8,
    },
    {
      id: 'r-dhaniram-bp',
      patientId: 'p-dhaniram',
      type: 'medicine',
      title: 'Amlodipine 5 mg',
      note: 'For blood pressure',
      times: ['09:00'],
      takeRate: 0.6,
    },
  ],
  appointments: [
    {
      id: 'r-aita-checkup',
      patientId: 'p-aita',
      title: 'Check-up with Dr. Anjali Sharma',
      note: 'District Hospital Jorhat',
      inDays: 3,
      time: '10:30',
    },
  ],
  historyDays: 14,
  devicePatientId: 'p-aita',
  /** Shown on the PIN screen as a hint in demo builds. */
  pin: '1234',
} as const;

/** Tables in child → parent order, for clearing. */
const ALL_TABLES = [
  'reminder_event',
  'reminder',
  'photo',
  'game_level',
  'game_session',
  'patient_user',
  'app_user',
  'patient',
  'household',
  'setting',
];

export async function isSeeded(db: DbClient): Promise<boolean> {
  const row = await db.getFirstAsync<{ n: number }>('SELECT COUNT(*) AS n FROM household', []);
  return (row?.n ?? 0) > 0;
}

/** Inserts the demo story. Caller decides whether to run (see initDatabase). */
export async function seedDemo(db: DbClient, now: number = Date.now()): Promise<void> {
  await db.withTransactionAsync(async () => {
    for (const h of DEMO.households) {
      await db.runAsync(
        'INSERT INTO household (id, name, village, district, state, created_at) VALUES (?, ?, ?, ?, ?, ?)',
        [h.id, h.name, h.village, h.district, h.state, now],
      );
    }
    for (const p of DEMO.patients) {
      await db.runAsync(
        `INSERT INTO patient (id, household_id, name, preferred_name, age, gender, language,
           condition_stage, notes, avatar, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          p.id,
          p.householdId,
          p.name,
          p.preferredName,
          p.age,
          p.gender,
          p.language,
          p.conditionStage,
          p.notes,
          p.avatar,
          now,
          now,
        ],
      );
    }
    for (const u of DEMO.users) {
      await db.runAsync(
        'INSERT INTO app_user (id, role, name, phone, organization, avatar, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [u.id, u.role, u.name, u.phone, u.organization, u.avatar, now],
      );
    }
    for (const l of DEMO.links) {
      await db.runAsync('INSERT INTO patient_user (patient_id, user_id, relation) VALUES (?, ?, ?)', [
        l.patientId,
        l.userId,
        l.relation,
      ]);
    }
    await db.runAsync(
      "INSERT INTO setting (key, value) VALUES ('device_patient_id', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value",
      [DEMO.devicePatientId],
    );
    await seedReminders(db, now);
  });
}

/** Demo reminders plus a deterministic 14-day taken/missed history (for adherence charts). */
export async function seedReminders(db: DbClient, now: number): Promise<void> {
  const rng = seededRng(26003);
  const today = startOfDay(now);
  const insertReminder = (
    id: string,
    patientId: string,
    type: ReminderType,
    title: string,
    note: string | null,
    schedule: ReminderSchedule,
  ) =>
    db.runAsync(
      `INSERT INTO reminder (id, patient_id, type, title, note, schedule_kind, times, once_at, enabled, created_by, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, NULL, ?, ?)`,
      [
        id,
        patientId,
        type,
        title,
        note,
        schedule.kind,
        schedule.kind === 'daily' ? schedule.times.join(',') : null,
        schedule.kind === 'once' ? schedule.at : null,
        now,
        now,
      ],
    );

  const existing = new Set((await db.getAllAsync<{ id: string }>('SELECT id FROM patient', [])).map((p) => p.id));
  for (const r of DEMO.reminders) {
    if (!existing.has(r.patientId)) continue;
    const schedule: ReminderSchedule = { kind: 'daily', times: r.times };
    await insertReminder(r.id, r.patientId, r.type, r.title, r.note, schedule);
    const history = occurrencesBetween(schedule, today - DEMO.historyDays * 24 * 3600e3, today);
    for (const dueAt of history) {
      const taken = rng() < r.takeRate;
      const actedAt = taken ? dueAt + Math.round(rng() * 40) * 60e3 : null;
      await db.runAsync(
        'INSERT INTO reminder_event (id, reminder_id, patient_id, due_at, status, acted_at) VALUES (?, ?, ?, ?, ?, ?)',
        [`e-${r.id}-${dueAt}`, r.id, r.patientId, dueAt, taken ? 'taken' : 'pending', actedAt],
      );
    }
  }
  for (const a of DEMO.appointments) {
    if (!existing.has(a.patientId)) continue;
    const [h, m] = a.time.split(':').map(Number);
    const at = new Date(today + a.inDays * 24 * 3600e3);
    at.setHours(h, m, 0, 0);
    await insertReminder(a.id, a.patientId, 'appointment', a.title, a.note, { kind: 'once', at: at.getTime() });
  }
}

/** Wipes all data rows (keeps schema and language setting) and re-seeds. */
export async function resetDemo(db: DbClient, now: number = Date.now()): Promise<void> {
  const lang = await db.getFirstAsync<{ value: string }>("SELECT value FROM setting WHERE key = 'language'", []);
  await db.withTransactionAsync(async () => {
    for (const table of ALL_TABLES) await db.execAsync(`DELETE FROM ${table}`);
    if (lang) await db.runAsync("INSERT INTO setting (key, value) VALUES ('language', ?)", [lang.value]);
  });
  await seedDemo(db, now);
}

/**
 * Installs seeded before reminders existed (schema < v3) get the demo
 * reminders once, without a full reset (which would also wipe photos).
 */
export async function backfillDemoReminders(db: DbClient, now: number = Date.now()): Promise<boolean> {
  const count = await db.getFirstAsync<{ n: number }>('SELECT COUNT(*) AS n FROM reminder', []);
  const aita = await db.getFirstAsync<{ id: string }>("SELECT id FROM patient WHERE id = 'p-aita'", []);
  if ((count?.n ?? 0) > 0 || !aita) return false;
  await db.withTransactionAsync(() => seedReminders(db, now));
  return true;
}
