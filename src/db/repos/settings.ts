import type { DbClient } from '../types';

/** Known device-level settings. */
export type SettingKey =
  | 'language'
  /** The patient who uses this device in patient mode. */
  | 'device_patient_id'
  /** '1' once the demo reminders were added (fresh seed or upgrade backfill). */
  | 'demo_reminders_seeded';

export async function getSetting(db: DbClient, key: SettingKey): Promise<string | null> {
  const row = await db.getFirstAsync<{ value: string }>('SELECT value FROM setting WHERE key = ?', [key]);
  return row?.value ?? null;
}

export async function setSetting(db: DbClient, key: SettingKey, value: string): Promise<void> {
  await db.runAsync(
    'INSERT INTO setting (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value',
    [key, value],
  );
}
