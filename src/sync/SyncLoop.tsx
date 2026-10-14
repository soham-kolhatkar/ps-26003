import { addNetworkStateListener } from 'expo-network';
import { useEffect } from 'react';
import { AppState } from 'react-native';

import { getDb } from '@/db/client';
import { useAccount } from '@/store/account';
import { useDevice } from '@/store/device';
import { useSyncStore } from '@/store/sync';

import { lastOutboxSeq, pendingChanges } from './outbox';
import { syncNow } from './run';

const EVERY_MS = 30_000;
const OUTBOX_POLL_MS = 3_000;
const AFTER_WRITE_MS = 2_000;

/**
 * Keeps a cloud phone in sync while the app is open: at start, every 30 s in
 * the foreground, when the app comes back to the foreground, when the network
 * returns, and 2 s after any local change (outbox). Renders nothing. Mounted
 * inside SQLiteProvider, so the database is ready.
 */
export function SyncLoop() {
  const cloud = useDevice((s) => s.mode) === 'cloud';
  const signedIn = useAccount((s) => s.status) === 'signedIn';

  useEffect(() => {
    if (!cloud || !signedIn) return;
    let active = AppState.currentState === 'active';
    let lastSeq = -1;
    let debounce: ReturnType<typeof setTimeout> | null = null;
    const run = () => {
      syncNow().catch(() => {
        // status store has it; retried on the next trigger
      });
    };

    run();
    const tick = setInterval(() => active && run(), EVERY_MS);
    const poll = setInterval(async () => {
      try {
        const db = getDb();
        const seq = await lastOutboxSeq(db);
        const pending = await pendingChanges(db);
        if (pending !== useSyncStore.getState().pending) useSyncStore.getState().set({ pending });
        if (lastSeq >= 0 && seq > lastSeq) {
          if (debounce) clearTimeout(debounce);
          debounce = setTimeout(run, AFTER_WRITE_MS);
        }
        lastSeq = seq;
      } catch {
        // database switching: next poll
      }
    }, OUTBOX_POLL_MS);
    const appState = AppState.addEventListener('change', (s) => {
      active = s === 'active';
      if (active) run();
    });
    let net: { remove: () => void } | null = null;
    try {
      net = addNetworkStateListener((s) => {
        if (s.isConnected) run();
      });
    } catch {
      // not available on this platform
    }
    return () => {
      clearInterval(tick);
      clearInterval(poll);
      if (debounce) clearTimeout(debounce);
      appState.remove();
      net?.remove();
    };
  }, [cloud, signedIn]);

  return null;
}
