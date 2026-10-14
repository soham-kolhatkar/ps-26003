import { create } from 'zustand';

/** What the sync loop is doing (cloud mode). `version` bumps when a sync changed local data. */
export type SyncState = 'idle' | 'syncing' | 'offline' | 'error';

type SyncStore = {
  state: SyncState;
  lastSyncedAt: number | null;
  pending: number;
  version: number;
  set: (patch: Partial<Omit<SyncStore, 'set' | 'bump'>>) => void;
  bump: () => void;
};

export const useSyncStore = create<SyncStore>((set) => ({
  state: 'idle',
  lastSyncedAt: null,
  pending: 0,
  version: 0,
  set: (patch) => set(patch),
  bump: () => set((s) => ({ version: s.version + 1 })),
}));
