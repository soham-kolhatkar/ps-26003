import { nextLevel, type SessionOutcome } from '@/engine/difficulty';
import { seededRng } from '@/engine/random';
import { computeSessionStats, type Trial } from '@/engine/scoring';
import { CHECKUP_STEPS, checkupScore, checkupTask, type Observations } from '@/engine/visits';
import { occurrencesBetween, startOfDay, type ReminderSchedule, type ReminderType } from '@/engine/reminders';

import { insertSession } from '../repos/games';
import { insertVisit } from '../repos/visits';
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
      takeRate: 0.5,
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
  /**
   * Simulated play for charts/trends. `ability` = first-try success at level 1;
   * `drift` = change in ability across the 30 days (negative = gradual decline).
   */
  gameHistory: [
    { patientId: 'p-aita', gameId: 'memory_match', ability: 0.92, drift: 0.02, playRate: 0.75, targetMs: 3000 },
    { patientId: 'p-aita', gameId: 'routine_sequence', ability: 0.9, drift: 0.03, playRate: 0.6, targetMs: 6000 },
    { patientId: 'p-aita', gameId: 'object_recognition', ability: 0.95, drift: 0, playRate: 0.6, targetMs: 4000 },
    { patientId: 'p-lakhi', gameId: 'object_recognition', ability: 0.86, drift: 0, playRate: 0.3, targetMs: 4000 },
    { patientId: 'p-lakhi', gameId: 'memory_match', ability: 0.82, drift: 0, playRate: 0.3, targetMs: 3000 },
    {
      patientId: 'p-dhaniram',
      gameId: 'object_recognition',
      ability: 0.8,
      drift: -0.16,
      playRate: 0.45,
      targetMs: 4000,
    },
    {
      patientId: 'p-dhaniram',
      gameId: 'routine_sequence',
      ability: 0.76,
      drift: -0.14,
      playRate: 0.45,
      targetMs: 6000,
    },
  ],
  gameHistoryDays: 30,
  /**
   * Pranita's past home visits. Check-up results as [right, asked] per task,
   * tap = [caught, of 6, avg ms]. Dhaniram's check-ups slip and his next visit
   * is overdue; Aita and Lakhi are on schedule.
   */
  visits: [
    {
      patientId: 'p-aita',
      daysAgo: 24,
      orientation: [3, 3],
      recall: [3, 3],
      tap: [6, 6, 1150],
      observations: { sleep: 'good', mood: 'good', appetite: 'good', medicines: 'yes', falls: 'no', confusion: 'none' },
      note: 'Cheerful. Talked about Bihu songs.',
      nextInDays: 14,
    },
    {
      patientId: 'p-aita',
      daysAgo: 10,
      orientation: [3, 3],
      recall: [3, 3],
      tap: [6, 6, 1100],
      observations: { sleep: 'good', mood: 'good', appetite: 'fair', medicines: 'yes', falls: 'no', confusion: 'none' },
      note: 'Plays memory pairs with her granddaughter every evening.',
      nextInDays: 14,
    },
    {
      patientId: 'p-lakhi',
      daysAgo: 5,
      orientation: [3, 3],
      recall: [3, 4],
      tap: [5, 6, 1400],
      observations: {
        sleep: 'fair',
        mood: 'good',
        appetite: 'good',
        medicines: 'none',
        falls: 'no',
        confusion: 'none',
      },
      note: 'Weaving again. Son reminds her to drink water.',
      nextInDays: 14,
    },
    {
      patientId: 'p-dhaniram',
      daysAgo: 44,
      orientation: [3, 3],
      recall: [3, 3],
      tap: [6, 6, 1500],
      observations: { sleep: 'good', mood: 'good', appetite: 'good', medicines: 'yes', falls: 'no', confusion: 'none' },
      note: 'Started the BP tablet reminder.',
      nextInDays: 14,
    },
    {
      patientId: 'p-dhaniram',
      daysAgo: 30,
      orientation: [2, 3],
      recall: [3, 4],
      tap: [5, 6, 1900],
      observations: {
        sleep: 'fair',
        mood: 'fair',
        appetite: 'good',
        medicines: 'sometimes',
        falls: 'no',
        confusion: 'sometimes',
      },
      note: 'Wife says he misses the tablet some mornings.',
      nextInDays: 14,
    },
    {
      patientId: 'p-dhaniram',
      daysAgo: 16,
      orientation: [2, 3],
      recall: [3, 6],
      tap: [4, 6, 2300],
      observations: {
        sleep: 'poor',
        mood: 'low',
        appetite: 'fair',
        medicines: 'sometimes',
        falls: 'no',
        confusion: 'sometimes',
      },
      note: 'Sleeping badly. Son works in Guwahati; wife manages alone.',
      nextInDays: 14,
    },
  ],
  devicePatientId: 'p-aita',
  /** Shown on the PIN screen as a hint in demo builds. */
  pin: '1234',
} as const;

/** Tables in child → parent order, for clearing. */
const ALL_TABLES = [
  'visit',
  'alert',
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
    await seedGameHistory(db, now);
    await seedVisits(db, now);
    await db.runAsync(
      "INSERT INTO setting (key, value) VALUES ('demo_reminders_seeded', '1'), ('demo_games_seeded', '1'), ('demo_visits_seeded', '1') ON CONFLICT(key) DO UPDATE SET value = excluded.value",
      [],
    );
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
 * Installs seeded before reminders existed get the demo reminders exactly
 * once, without a full reset (which would also wipe photos). Tracked by the
 * `demo_reminders_seeded` flag, so a caregiver deleting all reminders later
 * doesn't bring them back.
 */
export async function backfillDemoReminders(db: DbClient, now: number = Date.now()): Promise<boolean> {
  const flag = await db.getFirstAsync<{ value: string }>(
    "SELECT value FROM setting WHERE key = 'demo_reminders_seeded'",
    [],
  );
  if (flag) return false;
  const count = await db.getFirstAsync<{ n: number }>('SELECT COUNT(*) AS n FROM reminder', []);
  await db.withTransactionAsync(async () => {
    if ((count?.n ?? 0) === 0) await seedReminders(db, now);
    await db.runAsync("INSERT INTO setting (key, value) VALUES ('demo_reminders_seeded', '1')", []);
  });
  return (count?.n ?? 0) === 0;
}

const GAME_MAX_LEVEL = 5;
const TRIALS = 6;
const DAY_MS = 24 * 3600e3;

/**
 * 30 days of simulated sessions, run through the real scoring and adaptive
 * difficulty engines so levels evolve as they would in use. Deterministic.
 * Leaves a patient's current level alone if they already played that game.
 */
export async function seedGameHistory(db: DbClient, now: number): Promise<void> {
  const rng = seededRng(5303);
  const today = startOfDay(now);
  const existing = new Set((await db.getAllAsync<{ id: string }>('SELECT id FROM patient', [])).map((p) => p.id));

  for (const g of DEMO.gameHistory) {
    if (!existing.has(g.patientId)) continue;
    let level = 1;
    const outcomes: SessionOutcome[] = [];
    for (let d = DEMO.gameHistoryDays; d >= 1; d--) {
      if (rng() >= g.playRate) continue;
      const progress = 1 - d / DEMO.gameHistoryDays;
      const sessionsToday = rng() < 0.2 ? 2 : 1;
      for (let k = 0; k < sessionsToday; k++) {
        const p = Math.min(
          0.99,
          Math.max(0.2, g.ability + g.drift * progress - 0.06 * (level - 1) + (rng() - 0.5) * 0.12),
        );
        const trials = Array.from({ length: TRIALS }, () => ({
          correct: rng() < p,
          reactionMs: Math.round(
            g.targetMs * (0.6 + rng() * 0.8) * (1 + 0.05 * (level - 1)) * (1 - g.drift * progress),
          ),
        }));
        const stats = computeSessionStats(trials, g.targetMs);
        const startedAt = startOfDay(today - d * DAY_MS + DAY_MS / 2) + Math.round((9.5 + rng() * 8 + k) * 3600e3);
        await insertSession(db, {
          patientId: g.patientId,
          gameId: g.gameId,
          level,
          startedAt,
          endedAt: startedAt + Math.round((60 + rng() * 120) * 1000),
          stats,
          completed: true,
          source: 'seed',
        });
        outcomes.unshift({ level, accuracy: stats.accuracy, avgReactionMs: stats.avgReactionMs });
        level = nextLevel(level, outcomes, { maxLevel: GAME_MAX_LEVEL }).level;
      }
    }
    await db.runAsync('INSERT OR IGNORE INTO game_level (patient_id, game_id, level, updated_at) VALUES (?, ?, ?, ?)', [
      g.patientId,
      g.gameId,
      level,
      now,
    ]);
  }
}

/** Existing installs get the demo game history once (flag `demo_games_seeded`). */
export async function backfillDemoGames(db: DbClient, now: number = Date.now()): Promise<boolean> {
  const flag = await db.getFirstAsync<{ value: string }>(
    "SELECT value FROM setting WHERE key = 'demo_games_seeded'",
    [],
  );
  if (flag) return false;
  await db.withTransactionAsync(async () => {
    await seedGameHistory(db, now);
    await db.runAsync("INSERT INTO setting (key, value) VALUES ('demo_games_seeded', '1')", []);
  });
  return true;
}

/** Pranita's past home visits with check-up results (see DEMO.visits). */
export async function seedVisits(db: DbClient, now: number): Promise<void> {
  const today = startOfDay(now);
  const existing = new Set((await db.getAllAsync<{ id: string }>('SELECT id FROM patient', [])).map((p) => p.id));
  const asha = await db.getFirstAsync<{ id: string }>("SELECT id FROM app_user WHERE id = 'u-pranita'", []);
  const answers = ([right, asked]: readonly number[], ms: number | null): Trial[] =>
    Array.from({ length: asked }, (_, i) => ({ correct: i < right, reactionMs: ms }));
  for (const v of DEMO.visits) {
    if (!existing.has(v.patientId)) continue;
    const startedAt = startOfDay(today - v.daysAgo * DAY_MS + DAY_MS / 2) + 11 * 3600e3;
    const [orient, recall, tap] = CHECKUP_STEPS;
    const [caught, shown, ms] = v.tap;
    const tasks = [
      checkupTask(orient, answers(v.orientation, 4000)),
      checkupTask(recall, answers(v.recall, null)),
      checkupTask(tap, [...answers([caught, caught], ms), ...answers([0, shown - caught], null)]),
    ];
    await insertVisit(db, {
      patientId: v.patientId,
      userId: asha?.id ?? null,
      startedAt,
      endedAt: startedAt + 22 * 60e3,
      checkup: tasks,
      checkupScore: checkupScore(tasks),
      observations: v.observations as Observations,
      note: v.note,
      refer: false,
      nextVisitAt: startedAt + v.nextInDays * DAY_MS,
      source: 'seed',
    });
  }
}

/** Existing installs get the demo visits once (flag `demo_visits_seeded`). */
export async function backfillDemoVisits(db: DbClient, now: number = Date.now()): Promise<boolean> {
  const flag = await db.getFirstAsync<{ value: string }>(
    "SELECT value FROM setting WHERE key = 'demo_visits_seeded'",
    [],
  );
  if (flag) return false;
  await db.withTransactionAsync(async () => {
    await seedVisits(db, now);
    await db.runAsync("INSERT INTO setting (key, value) VALUES ('demo_visits_seeded', '1')", []);
  });
  return true;
}
