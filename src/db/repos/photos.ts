import { newId } from '../ids';
import type { Photo } from '../models';
import type { DbClient } from '../types';

type PhotoRow = {
  id: string;
  patient_id: string;
  uri: string;
  person_name: string;
  relation: string | null;
  added_by: string | null;
  created_at: number;
};

const toPhoto = (r: PhotoRow): Photo => ({
  id: r.id,
  patientId: r.patient_id,
  uri: r.uri,
  personName: r.person_name,
  relation: r.relation,
  addedBy: r.added_by,
  createdAt: r.created_at,
});

export async function listPhotos(db: DbClient, patientId: string): Promise<Photo[]> {
  const rows = await db.getAllAsync<PhotoRow>('SELECT * FROM photo WHERE patient_id = ? ORDER BY created_at DESC', [
    patientId,
  ]);
  return rows.map(toPhoto);
}

export async function getPhoto(db: DbClient, id: string): Promise<Photo | null> {
  const row = await db.getFirstAsync<PhotoRow>('SELECT * FROM photo WHERE id = ?', [id]);
  return row ? toPhoto(row) : null;
}

export async function addPhoto(
  db: DbClient,
  p: { patientId: string; uri: string; personName: string; relation: string | null; addedBy: string | null },
  now = Date.now(),
): Promise<string> {
  const id = newId();
  await db.runAsync(
    'INSERT INTO photo (id, patient_id, uri, person_name, relation, added_by, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [id, p.patientId, p.uri, p.personName.trim(), p.relation, p.addedBy, now],
  );
  return id;
}

export async function deletePhoto(db: DbClient, id: string): Promise<void> {
  await db.runAsync('DELETE FROM photo WHERE id = ?', [id]);
}

/** Distinct people (case/space-insensitive names) with at least one photo. */
export async function countPeople(db: DbClient, patientId: string): Promise<number> {
  const row = await db.getFirstAsync<{ n: number }>(
    'SELECT COUNT(DISTINCT LOWER(TRIM(person_name))) AS n FROM photo WHERE patient_id = ?',
    [patientId],
  );
  return row?.n ?? 0;
}
