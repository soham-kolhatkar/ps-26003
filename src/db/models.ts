export type Role = 'patient' | 'caregiver' | 'asha' | 'doctor';
export type StaffRole = Exclude<Role, 'patient'>;
export const STAFF_ROLES: readonly StaffRole[] = ['caregiver', 'asha', 'doctor'];

export type Household = {
  id: string;
  name: string;
  village: string | null;
  district: string | null;
  state: string | null;
  createdAt: number;
};

export type ConditionStage = 'mild' | 'moderate' | 'severe';

export type Patient = {
  id: string;
  householdId: string;
  name: string;
  preferredName: string | null;
  age: number | null;
  gender: 'female' | 'male' | 'other' | null;
  language: string;
  conditionStage: ConditionStage | null;
  notes: string | null;
  avatar: string | null;
  village: string | null;
  district: string | null;
  createdAt: number;
  updatedAt: number;
};

export type AppUser = {
  id: string;
  role: StaffRole;
  name: string;
  phone: string | null;
  organization: string | null;
  avatar: string | null;
  createdAt: number;
};

/** A patient as seen from a linked staff user, with the relationship label. */
export type LinkedPatient = Patient & { relation: string | null };
