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

/** Relations a caregiver can pick for a family photo (labels: `relation.<key>`). */
export const FAMILY_RELATIONS = [
  'daughter',
  'son',
  'husband',
  'wife',
  'granddaughter',
  'grandson',
  'sister',
  'brother',
  'daughter_in_law',
  'son_in_law',
  'friend',
  'neighbour',
  'other',
] as const;
export type FamilyRelation = (typeof FAMILY_RELATIONS)[number];

export type Photo = {
  id: string;
  patientId: string;
  /** file:// uri inside the app's document directory. */
  uri: string;
  personName: string;
  relation: string | null;
  addedBy: string | null;
  createdAt: number;
};
