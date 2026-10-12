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
  devicePatientId: 'p-aita',
  /** Shown on the PIN screen as a hint in demo builds. */
  pin: '1234',
} as const;

/** Tables in child → parent order, for clearing. */
const ALL_TABLES = ['game_level', 'game_session', 'patient_user', 'app_user', 'patient', 'household', 'setting'];

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
  });
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
