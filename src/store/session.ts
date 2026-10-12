import { create } from 'zustand';

import type { Role, StaffRole } from '@/db/models';

type SessionState = {
  role: Role | null;
  /** Staff user id when role is caregiver / asha / doctor. */
  userId: string | null;
  /** Patient being played as (patient role) or currently opened (staff). */
  patientId: string | null;
  signInPatient: (patientId: string) => void;
  signInStaff: (role: StaffRole, userId: string) => void;
  selectPatient: (patientId: string | null) => void;
  signOut: () => void;
};

/** Who is using the app right now. In-memory: every app launch starts at the role picker. */
export const useSession = create<SessionState>((set) => ({
  role: null,
  userId: null,
  patientId: null,
  signInPatient: (patientId) => set({ role: 'patient', userId: null, patientId }),
  signInStaff: (role, userId) => set({ role, userId, patientId: null }),
  selectPatient: (patientId) => set({ patientId }),
  signOut: () => set({ role: null, userId: null, patientId: null }),
}));
