import { create } from 'zustand';

import { fetchProfile, signOutCloud, type Profile } from '@/cloud/account';
import { supabase } from '@/cloud/client';
import { exclusive } from '@/sync/engine';
import { kv } from '@/services/kv';

/**
 * Who is signed in on this phone (cloud mode only). The Supabase session is
 * persisted by the client; the profile is cached here so the phone opens
 * straight into its role even with no internet.
 */
type Status = 'idle' | 'loading' | 'signedOut' | 'signedIn';

type AccountState = {
  status: Status;
  uid: string | null;
  profile: Profile | null;
  /** Restore the session once per launch and follow later sign-in/out events. */
  boot: () => Promise<void>;
  /** After a successful sign-in / sign-up screen. */
  signedIn: (profile: Profile) => void;
  /** Patient's phone after pairing (anonymous account, no profile). */
  signedInDevice: (uid: string) => void;
  signOut: () => Promise<void>;
};

const PROFILE_KEY = 'account.profile';

function cachedProfile(uid: string): Profile | null {
  try {
    const p = JSON.parse(kv.get(PROFILE_KEY) ?? 'null') as Profile | null;
    return p?.id === uid ? p : null;
  } catch {
    return null;
  }
}

let subscribed = false;

export const useAccount = create<AccountState>((set, get) => ({
  status: 'idle',
  uid: null,
  profile: null,

  boot: async () => {
    if (get().status !== 'idle') return;
    set({ status: 'loading' });
    if (!subscribed) {
      subscribed = true;
      supabase().auth.onAuthStateChange((event) => {
        if (event === 'SIGNED_OUT') set({ status: 'signedOut', uid: null, profile: null });
      });
    }
    try {
      const { data } = await supabase().auth.getSession();
      const user = data.session?.user;
      if (!user) {
        set({ status: 'signedOut', uid: null, profile: null });
        return;
      }
      // Patient phones (anonymous) have no profile; staff use the cache when offline.
      let profile = cachedProfile(user.id);
      if (!user.is_anonymous) {
        try {
          profile = (await fetchProfile(user.id)) ?? profile;
          if (profile) kv.set(PROFILE_KEY, JSON.stringify(profile));
        } catch {
          // offline: keep the cached profile
        }
      }
      set({ status: 'signedIn', uid: user.id, profile });
    } catch (e) {
      console.warn('Could not restore the session', e);
      set({ status: 'signedOut', uid: null, profile: null });
    }
  },

  signedIn: (profile) => {
    kv.set(PROFILE_KEY, JSON.stringify(profile));
    set({ status: 'signedIn', uid: profile.id, profile });
  },

  signedInDevice: (uid) => {
    kv.remove(PROFILE_KEY);
    set({ status: 'signedIn', uid, profile: null });
  },

  signOut: async () => {
    // Let a running sync finish first: signing out switches the database file.
    await exclusive(async () => {}).catch(() => {});
    await signOutCloud();
    kv.remove(PROFILE_KEY);
    set({ status: 'signedOut', uid: null, profile: null });
  },
}));
