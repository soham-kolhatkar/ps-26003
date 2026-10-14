/**
 * One full sync of this phone (cloud mode): people (patients, members,
 * profiles) → push local changes → pull everyone else's. Serialised with
 * `exclusive`. Updates the sync status and bumps its version when local data
 * changed, so screens reload.
 */
import { fetchPeople } from '@/cloud/people';
import { getDb } from '@/db/client';
import { syncReminderNotifications } from '@/services/notifications';
import { useAccount } from '@/store/account';
import { useDevice } from '@/store/device';
import { useSyncStore } from '@/store/sync';

import { errorKeyFor } from '@/cloud/errors';

import { exclusive, pull, push, resetCursors } from './engine';
import { pendingChanges } from './outbox';
import { applyPeople, type ApplyResult } from './people';
import { supabaseRemote } from './remote';

const MAX_PUSH_ROUNDS = 10;

export type SyncResult = { people: ApplyResult; pushed: number; pulled: number };

export function canSync(): boolean {
  return useDevice.getState().mode === 'cloud' && useAccount.getState().status === 'signedIn';
}

export function syncNow(): Promise<SyncResult | null> {
  return exclusive(async () => {
    if (!canSync()) return null;
    const db = getDb();
    const status = useSyncStore.getState();
    status.set({ state: 'syncing' });
    try {
      const people = await applyPeople(db, await fetchPeople());
      // Joined a patient: fetch their whole history, not only what changed since our last pull.
      if (people.added.length) await resetCursors(db);

      let pushed = 0;
      for (let i = 0; i < MAX_PUSH_ROUNDS && (await pendingChanges(db)) > 0; i++) {
        const r = await push(db, supabaseRemote);
        pushed += r.pushed + r.dropped;
        if (!r.pushed && !r.dropped) break;
      }
      const pulled = await pull(db, supabaseRemote);
      if (pulled.remindersChanged && useDevice.getState().role === 'patient') {
        await syncReminderNotifications(db);
      }
      status.set({ state: 'idle', lastSyncedAt: Date.now(), pending: await pendingChanges(db) });
      if (people.added.length || people.removed.length || pulled.changed) status.bump();
      return { people, pushed, pulled: pulled.applied };
    } catch (e) {
      const offline = errorKeyFor(e) === 'offline';
      status.set({ state: offline ? 'offline' : 'error', pending: await pendingChanges(db).catch(() => 0) });
      if (!offline) console.warn('Sync failed', e);
      throw e;
    }
  });
}
