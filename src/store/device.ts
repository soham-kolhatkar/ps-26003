import { create } from 'zustand';

import type { Role } from '@/db/models';
import { kv } from '@/services/kv';

/**
 * What this phone is for (Tier 3, D41). Persisted outside the database
 * because the database file depends on it.
 * - 'demo': today's single-phone app (role picker, seeded story, offline).
 * - 'cloud': one role per phone, signed in, synced through Supabase.
 * null = not chosen yet (first launch) → "Who will use this phone?".
 */
export type DeviceMode = 'demo' | 'cloud';
export type DeviceRole = Role;

const MODE_KEY = 'device.mode';
const ROLE_KEY = 'device.role';
const ROLES: readonly DeviceRole[] = ['patient', 'caregiver', 'asha', 'doctor'];

function readMode(): DeviceMode | null {
  const v = kv.get(MODE_KEY);
  return v === 'demo' || v === 'cloud' ? v : null;
}
function readRole(): DeviceRole | null {
  const v = kv.get(ROLE_KEY);
  return ROLES.includes(v as DeviceRole) ? (v as DeviceRole) : null;
}

type DeviceState = {
  mode: DeviceMode | null;
  role: DeviceRole | null;
  chooseDemo: () => void;
  chooseCloud: (role: DeviceRole) => void;
  /** Back to "Who will use this phone?" (after signing out). */
  reset: () => void;
};

export const useDevice = create<DeviceState>((set) => ({
  mode: readMode(),
  role: readRole(),
  chooseDemo: () => {
    kv.set(MODE_KEY, 'demo');
    kv.remove(ROLE_KEY);
    set({ mode: 'demo', role: null });
  },
  chooseCloud: (role) => {
    kv.set(MODE_KEY, 'cloud');
    kv.set(ROLE_KEY, role);
    set({ mode: 'cloud', role });
  },
  reset: () => {
    kv.remove(MODE_KEY);
    kv.remove(ROLE_KEY);
    set({ mode: null, role: null });
  },
}));

export const isStaffRole = (r: DeviceRole | null): r is Exclude<DeviceRole, 'patient'> =>
  r === 'caregiver' || r === 'asha' || r === 'doctor';
