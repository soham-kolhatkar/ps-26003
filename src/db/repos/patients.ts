import type { ConditionStage, LinkedPatient, Patient } from '../models';
import type { DbClient } from '../types';

type PatientRow = {
  id: string;
  household_id: string;
  name: string;
  preferred_name: string | null;
  age: number | null;
  gender: Patient['gender'];
  language: string;
  condition_stage: ConditionStage | null;
  notes: string | null;
  avatar: string | null;
  village: string | null;
  district: string | null;
  created_at: number;
  updated_at: number;
};

const SELECT_PATIENT = `
SELECT p.*, h.village AS village, h.district AS district
FROM patient p
JOIN household h ON h.id = p.household_id`;

function toPatient(row: PatientRow): Patient {
  return {
    id: row.id,
    householdId: row.household_id,
    name: row.name,
    preferredName: row.preferred_name,
    age: row.age,
    gender: row.gender,
    language: row.language,
    conditionStage: row.condition_stage,
    notes: row.notes,
    avatar: row.avatar,
    village: row.village,
    district: row.district,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function getPatient(db: DbClient, id: string): Promise<Patient | null> {
  const row = await db.getFirstAsync<PatientRow>(`${SELECT_PATIENT} WHERE p.id = ?`, [id]);
  return row ? toPatient(row) : null;
}

export async function listPatients(db: DbClient): Promise<Patient[]> {
  const rows = await db.getAllAsync<PatientRow>(`${SELECT_PATIENT} ORDER BY p.name`, []);
  return rows.map(toPatient);
}

/** Patients a staff user (caregiver / ASHA / doctor) is linked to. */
export async function listPatientsForUser(db: DbClient, userId: string): Promise<LinkedPatient[]> {
  const rows = await db.getAllAsync<PatientRow & { relation: string | null }>(
    `SELECT p.*, h.village AS village, h.district AS district, pu.relation AS relation
     FROM patient p
     JOIN household h ON h.id = p.household_id
     JOIN patient_user pu ON pu.patient_id = p.id
     WHERE pu.user_id = ?
     ORDER BY p.name`,
    [userId],
  );
  return rows.map((r) => ({ ...toPatient(r), relation: r.relation }));
}

/** Name to greet the patient with: preferred name (e.g. "Kamala") or first name. */
export function displayName(p: Pick<Patient, 'name' | 'preferredName'>): string {
  return p.preferredName?.trim() || p.name.split(' ')[0];
}
