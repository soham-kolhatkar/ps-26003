import type { AppUser, StaffRole } from '../models';
import type { DbClient } from '../types';

type UserRow = {
  id: string;
  role: StaffRole;
  name: string;
  phone: string | null;
  organization: string | null;
  avatar: string | null;
  created_at: number;
};

function toUser(row: UserRow): AppUser {
  return {
    id: row.id,
    role: row.role,
    name: row.name,
    phone: row.phone,
    organization: row.organization,
    avatar: row.avatar,
    createdAt: row.created_at,
  };
}

export async function getUser(db: DbClient, id: string): Promise<AppUser | null> {
  const row = await db.getFirstAsync<UserRow>('SELECT * FROM app_user WHERE id = ?', [id]);
  return row ? toUser(row) : null;
}

export async function listUsersByRole(db: DbClient, role: StaffRole): Promise<AppUser[]> {
  const rows = await db.getAllAsync<UserRow>('SELECT * FROM app_user WHERE role = ? ORDER BY name', [role]);
  return rows.map(toUser);
}

export async function listUsers(db: DbClient): Promise<AppUser[]> {
  const rows = await db.getAllAsync<UserRow>('SELECT * FROM app_user ORDER BY role, name', []);
  return rows.map(toUser);
}

export const ROLE_AVATAR: Record<StaffRole, string> = { caregiver: '👩', asha: '🧑‍⚕️', doctor: '🩺' };

/** Cloud mode: keep a local copy of a person's profile (id = their account id). */
export async function upsertUser(
  db: DbClient,
  u: { id: string; role: StaffRole; name: string; phone: string | null; organization: string | null },
  now = Date.now(),
): Promise<void> {
  await db.runAsync(
    `INSERT INTO app_user (id, role, name, phone, organization, avatar, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET role = excluded.role, name = excluded.name, phone = excluded.phone,
       organization = excluded.organization`,
    [u.id, u.role, u.name, u.phone, u.organization, ROLE_AVATAR[u.role], now],
  );
}
