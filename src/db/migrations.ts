import type { DbClient } from './types';

/**
 * Ordered, append-only migrations. Never edit a shipped migration — add a new
 * one. `PRAGMA user_version` records the last applied version.
 * Conventions: TEXT ids (UUID or stable demo ids), INTEGER epoch-ms timestamps.
 */
export const MIGRATIONS: readonly { version: number; name: string; sql: string }[] = [
  {
    version: 1,
    name: 'core: settings, households, patients, users, games',
    sql: `
CREATE TABLE setting (
  key   TEXT PRIMARY KEY NOT NULL,
  value TEXT NOT NULL
);

CREATE TABLE household (
  id         TEXT PRIMARY KEY NOT NULL,
  name       TEXT NOT NULL,
  village    TEXT,
  district   TEXT,
  state      TEXT,
  created_at INTEGER NOT NULL
);

CREATE TABLE patient (
  id              TEXT PRIMARY KEY NOT NULL,
  household_id    TEXT NOT NULL REFERENCES household(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  preferred_name  TEXT,
  age             INTEGER,
  gender          TEXT CHECK (gender IN ('female', 'male', 'other')),
  language        TEXT NOT NULL,
  condition_stage TEXT CHECK (condition_stage IN ('mild', 'moderate', 'severe')),
  notes           TEXT,
  avatar          TEXT,
  created_at      INTEGER NOT NULL,
  updated_at      INTEGER NOT NULL
);

CREATE TABLE app_user (
  id           TEXT PRIMARY KEY NOT NULL,
  role         TEXT NOT NULL CHECK (role IN ('caregiver', 'asha', 'doctor')),
  name         TEXT NOT NULL,
  phone        TEXT,
  organization TEXT,
  avatar       TEXT,
  created_at   INTEGER NOT NULL
);

CREATE TABLE patient_user (
  patient_id TEXT NOT NULL REFERENCES patient(id) ON DELETE CASCADE,
  user_id    TEXT NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
  relation   TEXT,
  PRIMARY KEY (patient_id, user_id)
);

CREATE TABLE game_session (
  id              TEXT PRIMARY KEY NOT NULL,
  patient_id      TEXT NOT NULL REFERENCES patient(id) ON DELETE CASCADE,
  game_id         TEXT NOT NULL,
  level           INTEGER NOT NULL,
  started_at      INTEGER NOT NULL,
  ended_at        INTEGER,
  trials          INTEGER NOT NULL DEFAULT 0,
  correct         INTEGER NOT NULL DEFAULT 0,
  accuracy        REAL,
  avg_reaction_ms REAL,
  score           REAL,
  completed       INTEGER NOT NULL DEFAULT 0,
  source          TEXT NOT NULL DEFAULT 'app'
);
CREATE INDEX idx_game_session_patient_game ON game_session (patient_id, game_id, started_at);

CREATE TABLE game_level (
  patient_id TEXT NOT NULL REFERENCES patient(id) ON DELETE CASCADE,
  game_id    TEXT NOT NULL,
  level      INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  PRIMARY KEY (patient_id, game_id)
);
`,
  },
  {
    version: 2,
    name: 'family photos',
    sql: `
CREATE TABLE photo (
  id          TEXT PRIMARY KEY NOT NULL,
  patient_id  TEXT NOT NULL REFERENCES patient(id) ON DELETE CASCADE,
  uri         TEXT NOT NULL,
  person_name TEXT NOT NULL,
  relation    TEXT,
  added_by    TEXT REFERENCES app_user(id) ON DELETE SET NULL,
  created_at  INTEGER NOT NULL
);
CREATE INDEX idx_photo_patient ON photo (patient_id, created_at);
`,
  },
  {
    version: 3,
    name: 'reminders + reminder events',
    sql: `
CREATE TABLE reminder (
  id            TEXT PRIMARY KEY NOT NULL,
  patient_id    TEXT NOT NULL REFERENCES patient(id) ON DELETE CASCADE,
  type          TEXT NOT NULL CHECK (type IN ('medicine', 'hydration', 'activity', 'appointment')),
  title         TEXT NOT NULL,
  note          TEXT,
  schedule_kind TEXT NOT NULL CHECK (schedule_kind IN ('daily', 'once')),
  times         TEXT,
  once_at       INTEGER,
  enabled       INTEGER NOT NULL DEFAULT 1,
  created_by    TEXT REFERENCES app_user(id) ON DELETE SET NULL,
  created_at    INTEGER NOT NULL,
  updated_at    INTEGER NOT NULL
);
CREATE INDEX idx_reminder_patient ON reminder (patient_id);

CREATE TABLE reminder_event (
  id          TEXT PRIMARY KEY NOT NULL,
  reminder_id TEXT NOT NULL REFERENCES reminder(id) ON DELETE CASCADE,
  patient_id  TEXT NOT NULL REFERENCES patient(id) ON DELETE CASCADE,
  due_at      INTEGER NOT NULL,
  status      TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'taken', 'skipped')),
  acted_at    INTEGER,
  UNIQUE (reminder_id, due_at)
);
CREATE INDEX idx_reminder_event_patient_due ON reminder_event (patient_id, due_at);
`,
  },
];

export const LATEST_VERSION = MIGRATIONS[MIGRATIONS.length - 1].version;

export async function getSchemaVersion(db: DbClient): Promise<number> {
  const row = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version', []);
  return row?.user_version ?? 0;
}

/** Applies pending migrations, each in its own transaction. Returns the final version. */
export async function migrate(db: DbClient): Promise<number> {
  let version = await getSchemaVersion(db);
  for (const m of MIGRATIONS) {
    if (m.version <= version) continue;
    await db.withTransactionAsync(async () => {
      await db.execAsync(m.sql);
      await db.execAsync(`PRAGMA user_version = ${m.version}`);
    });
    version = m.version;
  }
  return version;
}
