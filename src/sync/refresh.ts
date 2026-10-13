import { useFocusEffect } from 'expo-router';
import { useCallback } from 'react';

import { fetchPeople } from '@/cloud/people';
import { getDb } from '@/db/client';
import { useAccount } from '@/store/account';
import { useDevice } from '@/store/device';

import { applyPeople, type ApplyResult } from './people';

/** One refresh at a time (screens can ask together; local writes use a transaction). */
let queue: Promise<unknown> = Promise.resolve();

/** Pull this account's patients and people into the local DB (cloud mode only). */
export function refreshPeople(): Promise<ApplyResult | null> {
  const run = queue.then(async () => {
    if (useDevice.getState().mode !== 'cloud' || useAccount.getState().status !== 'signedIn') return null;
    return applyPeople(getDb(), await fetchPeople());
  });
  queue = run.catch(() => undefined);
  return run;
}

/** On screen focus: refresh from the cloud, then reload the screen (offline: keep local data). */
export function useCloudRefresh(reload: () => void) {
  useFocusEffect(
    useCallback(() => {
      let alive = true;
      refreshPeople()
        .then((r) => {
          if (alive && r) reload();
        })
        .catch((e) => console.warn('Cloud refresh failed (offline?)', e));
      return () => {
        alive = false;
      };
    }, [reload]),
  );
}
