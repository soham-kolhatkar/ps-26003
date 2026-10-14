import { useFocusEffect } from 'expo-router';
import { useCallback } from 'react';

import type { ApplyResult } from './people';
import { syncNow } from './run';

/** Bring this account's patients and data up to date now (cloud mode; no-op otherwise). */
export async function refreshPeople(): Promise<ApplyResult | null> {
  return (await syncNow())?.people ?? null;
}

/** On screen focus: sync, then reload the screen (offline: keep local data). */
export function useCloudRefresh(reload: () => void) {
  useFocusEffect(
    useCallback(() => {
      let alive = true;
      syncNow()
        .then((r) => {
          if (alive && r) reload();
        })
        .catch(() => {
          // offline or refused: the sync chip says so; local data stays on screen
        });
      return () => {
        alive = false;
      };
    }, [reload]),
  );
}
