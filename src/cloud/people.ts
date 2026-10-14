/**
 * Patients, members, invites and pairing (F16): thin wrappers over the 002 RPCs
 * and reads. Every write goes through a server function that checks rights.
 */
import type { ConditionStage } from '@/db/models';

import { supabase } from './client';
import { CloudError, errorKeyFor, type CloudErrorKey } from './errors';

export type MemberRole = 'caregiver' | 'asha' | 'doctor' | 'device';

export type CloudPatient = {
  id: string;
  name: string;
  preferred_name: string | null;
  age: number | null;
  gender: 'female' | 'male' | 'other' | null;
  language: string;
  condition_stage: ConditionStage | null;
  notes: string | null;
  avatar: string | null;
  village: string | null;
  district: string | null;
  created_by: string | null;
  deleted_at: string | null;
};

export type CloudMember = {
  patient_id: string;
  user_id: string;
  role: MemberRole;
  relation: string | null;
  is_manager: boolean;
};

export type CloudProfile = {
  id: string;
  role: 'caregiver' | 'asha' | 'doctor';
  name: string;
  phone: string;
  organization: string | null;
  district: string | null;
};

/** Everything this account can see about people: its patients, their members, co-members' profiles. */
export type PeopleSnapshot = { patients: CloudPatient[]; members: CloudMember[]; profiles: CloudProfile[] };

const SERVER_ERRORS: Record<string, CloudErrorKey> = {
  not_allowed: 'notAllowed',
  last_manager: 'lastManager',
  invalid_code: 'invalidCode',
  wrong_role: 'codeWrongRole',
  too_many: 'tooMany',
  not_signed_in: 'notAllowed',
};

async function call<T>(work: () => Promise<T>): Promise<T> {
  try {
    return await work();
  } catch (e) {
    if (e instanceof CloudError) throw e;
    const msg = (e as { message?: string })?.message ?? '';
    const known = Object.keys(SERVER_ERRORS).find((k) => msg.includes(k));
    if (known) throw new CloudError(SERVER_ERRORS[known]);
    console.warn('Cloud request failed', e);
    throw new CloudError(errorKeyFor(e));
  }
}

export async function fetchPeople(): Promise<PeopleSnapshot> {
  return call(async () => {
    const sb = supabase();
    const [p, m, pr] = await Promise.all([
      sb.from('patients').select('*').is('deleted_at', null),
      sb.from('patient_members').select('patient_id, user_id, role, relation, is_manager'),
      sb.from('profiles').select('id, role, name, phone, organization, district'),
    ]);
    for (const r of [p, m, pr]) if (r.error) throw r.error;
    return {
      patients: (p.data ?? []) as CloudPatient[],
      members: (m.data ?? []) as CloudMember[],
      profiles: (pr.data ?? []) as CloudProfile[],
    };
  });
}

export type NewPatient = {
  id: string;
  name: string;
  preferred_name?: string;
  age?: number | null;
  gender?: 'female' | 'male' | 'other' | null;
  language: string;
  condition_stage?: ConditionStage | null;
  notes?: string;
  avatar?: string;
  village?: string;
  district?: string;
  /** The caregiver's relation to the patient (daughter, son…). Ignored for ASHA creators. */
  relation?: string;
};

export function createPatient(p: NewPatient): Promise<string> {
  return call(async () => {
    const { data, error } = await supabase().rpc('create_patient', { p });
    if (error) throw error;
    return data as string;
  });
}

export type Invite = { code: string; expiresAt: number };

export function createInvite(patientId: string, role: MemberRole, relation?: string): Promise<Invite> {
  return call(async () => {
    const { data, error } = await supabase().rpc('create_invite', {
      pid: patientId,
      invite_role: role,
      invite_relation: relation ?? null,
    });
    if (error) throw error;
    const row = (Array.isArray(data) ? data[0] : data) as { code: string; expires_at: string };
    return { code: row.code, expiresAt: new Date(row.expires_at).getTime() };
  });
}

export type Redeemed = { patientId: string; role: MemberRole };

export function redeemInvite(code: string): Promise<Redeemed> {
  return call(async () => {
    const clean = code.replace(/\D/g, '');
    if (clean.length !== 6) throw new CloudError('invalidCode');
    const { data, error } = await supabase().rpc('redeem_invite', { invite_code: clean });
    if (error) throw error;
    const r = data as { ok: boolean; error?: string; patient_id?: string; role?: MemberRole };
    if (!r.ok) throw new CloudError(SERVER_ERRORS[r.error ?? ''] ?? 'generic');
    return { patientId: r.patient_id!, role: r.role! };
  });
}

export function removeMember(patientId: string, userId: string): Promise<void> {
  return call(async () => {
    const { error } = await supabase().rpc('remove_member', { pid: patientId, member: userId });
    if (error) throw error;
  });
}

export function leavePatient(patientId: string): Promise<void> {
  return call(async () => {
    const { error } = await supabase().rpc('leave_patient', { pid: patientId });
    if (error) throw error;
  });
}

/** The patient's phone: an anonymous account, created once. */
export function signInDevice(): Promise<string> {
  return call(async () => {
    const sb = supabase();
    const { data: current } = await sb.auth.getSession();
    if (current.session?.user.is_anonymous) return current.session.user.id;
    const { data, error } = await sb.auth.signInAnonymously();
    if (error) throw error;
    return data.user!.id;
  });
}
