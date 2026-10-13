/**
 * Pure reminder scheduling + adherence logic (no DB, no notifications).
 * Times are local wall-clock "HH:MM"; due moments are epoch ms.
 */
export type ReminderType = 'medicine' | 'hydration' | 'activity' | 'appointment';
export const REMINDER_TYPES: readonly ReminderType[] = ['medicine', 'hydration', 'activity', 'appointment'];

export type ReminderSchedule =
  /** Repeats every day at each time. */
  | { kind: 'daily'; times: readonly string[] }
  /** One moment (appointments). */
  | { kind: 'once'; at: number };

export type ClockTime = { hour: number; minute: number };

/** After this long without an answer, a due reminder counts as missed. */
export const MISSED_AFTER_MS = 2 * 60 * 60 * 1000;
/** A reminder shows as "due now" from this long before its time. */
export const DUE_SOON_MS = 30 * 60 * 1000;

export function parseTime(hhmm: string): ClockTime | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(hhmm.trim());
  if (!m) return null;
  const hour = Number(m[1]);
  const minute = Number(m[2]);
  return hour < 24 && minute < 60 ? { hour, minute } : null;
}

export function formatTime({ hour, minute }: ClockTime): string {
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

/** Valid, de-duplicated, sorted "HH:MM" list. */
export function normalizeTimes(times: readonly string[]): string[] {
  const valid = times.map(parseTime).filter((t): t is ClockTime => t !== null);
  return [...new Set(valid.map(formatTime))].sort();
}

export function startOfDay(ms: number): number {
  const d = new Date(ms);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

export function atTimeOnDay(dayStart: number, t: ClockTime): number {
  const d = new Date(dayStart);
  d.setHours(t.hour, t.minute, 0, 0);
  return d.getTime();
}

/** Due moments in [from, to). Daily schedules are expanded per local day. */
export function occurrencesBetween(schedule: ReminderSchedule, from: number, to: number): number[] {
  if (schedule.kind === 'once') return schedule.at >= from && schedule.at < to ? [schedule.at] : [];
  const times = normalizeTimes(schedule.times).map((s) => parseTime(s)!);
  const out: number[] = [];
  for (let day = startOfDay(from); day < to; day = startOfDay(day + 36 * 60 * 60 * 1000)) {
    for (const t of times) {
      const at = atTimeOnDay(day, t);
      if (at >= from && at < to) out.push(at);
    }
  }
  return out;
}

export type EventStatus = 'pending' | 'taken' | 'skipped';
export type EventState = 'upcoming' | 'due' | 'taken' | 'skipped' | 'missed';

/** What a reminder occurrence means right now. */
export function eventState(status: EventStatus, dueAt: number, now: number): EventState {
  if (status === 'taken') return 'taken';
  if (status === 'skipped') return 'skipped';
  if (now < dueAt - DUE_SOON_MS) return 'upcoming';
  if (now - dueAt > MISSED_AFTER_MS) return 'missed';
  return 'due';
}

export type Adherence = { taken: number; missed: number; skipped: number; total: number; rate: number | null };

/**
 * Adherence over occurrences that are already decided (taken / skipped /
 * missed). Upcoming and still-due ones are excluded; rate is null if none.
 */
export function adherence(events: readonly { status: EventStatus; dueAt: number }[], now: number): Adherence {
  let taken = 0;
  let missed = 0;
  let skipped = 0;
  for (const e of events) {
    const s = eventState(e.status, e.dueAt, now);
    if (s === 'taken') taken++;
    else if (s === 'missed') missed++;
    else if (s === 'skipped') skipped++;
  }
  const total = taken + missed + skipped;
  return { taken, missed, skipped, total, rate: total ? taken / total : null };
}
