import { normalizeTimes, occurrencesBetween, type EventStatus, type ReminderSchedule } from '@/engine/reminders';

import { newId } from '../ids';
import type { Reminder, ReminderOccurrence, ReminderType } from '../models';
import type { DbClient } from '../types';

type ReminderRow = {
  id: string;
  patient_id: string;
  type: ReminderType;
  title: string;
  note: string | null;
  schedule_kind: 'daily' | 'once';
  times: string | null;
  once_at: number | null;
  enabled: number;
  created_by: string | null;
  created_at: number;
  updated_at: number;
};

function toReminder(r: ReminderRow): Reminder {
  const schedule: ReminderSchedule =
    r.schedule_kind === 'once'
      ? { kind: 'once', at: r.once_at ?? 0 }
      : { kind: 'daily', times: (r.times ?? '').split(',').filter(Boolean) };
  return {
    id: r.id,
    patientId: r.patient_id,
    type: r.type,
    title: r.title,
    note: r.note,
    schedule,
    enabled: r.enabled === 1,
    createdBy: r.created_by,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

export async function listReminders(db: DbClient, patientId: string): Promise<Reminder[]> {
  const rows = await db.getAllAsync<ReminderRow>(
    "SELECT * FROM reminder WHERE patient_id = ? ORDER BY CASE type WHEN 'medicine' THEN 0 WHEN 'hydration' THEN 1 WHEN 'activity' THEN 2 ELSE 3 END, created_at",
    [patientId],
  );
  return rows.map(toReminder);
}

/** Every enabled reminder on the device (used to (re)schedule notifications). */
export async function listEnabledReminders(db: DbClient): Promise<Reminder[]> {
  const rows = await db.getAllAsync<ReminderRow>('SELECT * FROM reminder WHERE enabled = 1', []);
  return rows.map(toReminder);
}

export async function getReminder(db: DbClient, id: string): Promise<Reminder | null> {
  const row = await db.getFirstAsync<ReminderRow>('SELECT * FROM reminder WHERE id = ?', [id]);
  return row ? toReminder(row) : null;
}

export type ReminderInput = {
  id?: string;
  patientId: string;
  type: ReminderType;
  title: string;
  note?: string | null;
  schedule: ReminderSchedule;
  enabled?: boolean;
  createdBy?: string | null;
};

/** Insert (no id) or update (id) a reminder. Returns its id. */
export async function saveReminder(db: DbClient, input: ReminderInput, now = Date.now()): Promise<string> {
  const id = input.id ?? newId();
  const times = input.schedule.kind === 'daily' ? normalizeTimes(input.schedule.times).join(',') : null;
  const onceAt = input.schedule.kind === 'once' ? input.schedule.at : null;
  await db.runAsync(
    `INSERT INTO reminder (id, patient_id, type, title, note, schedule_kind, times, once_at, enabled, created_by, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET type = excluded.type, title = excluded.title, note = excluded.note,
       schedule_kind = excluded.schedule_kind, times = excluded.times, once_at = excluded.once_at,
       enabled = excluded.enabled, updated_at = excluded.updated_at`,
    [
      id,
      input.patientId,
      input.type,
      input.title.trim(),
      input.note?.trim() || null,
      input.schedule.kind,
      times,
      onceAt,
      input.enabled === false ? 0 : 1,
      input.createdBy ?? null,
      now,
      now,
    ],
  );
  // Future pending occurrences no longer match the new schedule — drop them; history stays.
  await db.runAsync("DELETE FROM reminder_event WHERE reminder_id = ? AND status = 'pending' AND due_at > ?", [
    id,
    now,
  ]);
  return id;
}

export async function deleteReminder(db: DbClient, id: string): Promise<void> {
  await db.runAsync('DELETE FROM reminder WHERE id = ?', [id]);
}

/**
 * One id per reminder and due time, on every phone (D42): the caregiver's phone,
 * the patient's phone and the cloud all agree on which dose a row is.
 */
export const eventIdFor = (reminderId: string, dueAt: number) => `${reminderId}:${dueAt}`;

/** Creates (idempotently) the occurrence rows for [from, to) for a patient's enabled reminders. */
export async function ensureEvents(db: DbClient, patientId: string, from: number, to: number): Promise<void> {
  const reminders = (await listReminders(db, patientId)).filter((r) => r.enabled);
  for (const r of reminders) {
    for (const dueAt of occurrencesBetween(r.schedule, from, to)) {
      await db.runAsync(
        'INSERT OR IGNORE INTO reminder_event (id, reminder_id, patient_id, due_at, status) VALUES (?, ?, ?, ?, ?)',
        [eventIdFor(r.id, dueAt), r.id, patientId, dueAt, 'pending'],
      );
    }
  }
}

type OccurrenceRow = {
  event_id: string;
  reminder_id: string;
  patient_id: string;
  due_at: number;
  status: EventStatus;
  acted_at: number | null;
  type: ReminderType;
  title: string;
  note: string | null;
};

const SELECT_OCCURRENCE = `
SELECT e.id AS event_id, e.reminder_id, e.patient_id, e.due_at, e.status, e.acted_at, r.type, r.title, r.note
FROM reminder_event e JOIN reminder r ON r.id = e.reminder_id`;

const toOccurrence = (r: OccurrenceRow): ReminderOccurrence => ({
  eventId: r.event_id,
  reminderId: r.reminder_id,
  patientId: r.patient_id,
  dueAt: r.due_at,
  status: r.status,
  actedAt: r.acted_at,
  type: r.type,
  title: r.title,
  note: r.note,
});

export async function listOccurrences(
  db: DbClient,
  patientId: string,
  from: number,
  to: number,
): Promise<ReminderOccurrence[]> {
  const rows = await db.getAllAsync<OccurrenceRow>(
    `${SELECT_OCCURRENCE} WHERE e.patient_id = ? AND e.due_at >= ? AND e.due_at < ? ORDER BY e.due_at`,
    [patientId, from, to],
  );
  return rows.map(toOccurrence);
}

export async function getOccurrence(db: DbClient, eventId: string): Promise<ReminderOccurrence | null> {
  const row = await db.getFirstAsync<OccurrenceRow>(`${SELECT_OCCURRENCE} WHERE e.id = ?`, [eventId]);
  return row ? toOccurrence(row) : null;
}

/** The occurrence for a reminder at a due time, created if missing (e.g. opened from a notification). */
export async function occurrenceFor(
  db: DbClient,
  reminderId: string,
  dueAt: number,
): Promise<ReminderOccurrence | null> {
  const reminder = await getReminder(db, reminderId);
  if (!reminder) return null;
  await db.runAsync(
    'INSERT OR IGNORE INTO reminder_event (id, reminder_id, patient_id, due_at, status) VALUES (?, ?, ?, ?, ?)',
    [eventIdFor(reminderId, dueAt), reminderId, reminder.patientId, dueAt, 'pending'],
  );
  const row = await db.getFirstAsync<OccurrenceRow>(`${SELECT_OCCURRENCE} WHERE e.reminder_id = ? AND e.due_at = ?`, [
    reminderId,
    dueAt,
  ]);
  return row ? toOccurrence(row) : null;
}

export async function markOccurrence(db: DbClient, eventId: string, status: EventStatus, now = Date.now()) {
  await db.runAsync('UPDATE reminder_event SET status = ?, acted_at = ? WHERE id = ?', [
    status,
    status === 'pending' ? null : now,
    eventId,
  ]);
}
