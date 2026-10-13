import type { CheckupTask, Observations } from '@/engine/visits';

import { newId } from '../ids';
import type { DbClient } from '../types';

type VisitRow = {
  id: string;
  patient_id: string;
  user_id: string | null;
  started_at: number;
  ended_at: number | null;
  checkup: string | null;
  checkup_score: number | null;
  observations: string;
  note: string | null;
  refer: number;
  next_visit_at: number | null;
  source: string;
};

export type Visit = {
  id: string;
  patientId: string;
  userId: string | null;
  startedAt: number;
  endedAt: number | null;
  /** null when the check-up was skipped. */
  checkup: CheckupTask[] | null;
  checkupScore: number | null;
  observations: Observations;
  note: string | null;
  refer: boolean;
  nextVisitAt: number | null;
};

function toVisit(r: VisitRow): Visit {
  return {
    id: r.id,
    patientId: r.patient_id,
    userId: r.user_id,
    startedAt: r.started_at,
    endedAt: r.ended_at,
    checkup: r.checkup ? JSON.parse(r.checkup) : null,
    checkupScore: r.checkup_score,
    observations: JSON.parse(r.observations || '{}'),
    note: r.note,
    refer: r.refer === 1,
    nextVisitAt: r.next_visit_at,
  };
}

export type NewVisit = Omit<Visit, 'id'> & { source?: 'app' | 'seed' };

export async function insertVisit(db: DbClient, v: NewVisit): Promise<string> {
  const id = newId();
  await db.runAsync(
    `INSERT INTO visit (id, patient_id, user_id, started_at, ended_at, checkup, checkup_score, observations, note,
       refer, next_visit_at, source)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      v.patientId,
      v.userId,
      v.startedAt,
      v.endedAt,
      v.checkup ? JSON.stringify(v.checkup) : null,
      v.checkupScore,
      JSON.stringify(v.observations),
      v.note?.trim() || null,
      v.refer ? 1 : 0,
      v.nextVisitAt,
      v.source ?? 'app',
    ],
  );
  return id;
}

/** Newest first. */
export async function listVisits(db: DbClient, patientId: string, limit = 50): Promise<Visit[]> {
  const rows = await db.getAllAsync<VisitRow>(
    'SELECT * FROM visit WHERE patient_id = ? ORDER BY started_at DESC LIMIT ?',
    [patientId, limit],
  );
  return rows.map(toVisit);
}

export async function lastVisit(db: DbClient, patientId: string): Promise<Visit | null> {
  return (await listVisits(db, patientId, 1))[0] ?? null;
}
