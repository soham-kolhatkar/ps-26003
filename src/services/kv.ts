/**
 * Tiny synchronous key-value store for device-level state that must live
 * OUTSIDE the SQLite database (which file to open depends on it): the phone's
 * mode and role, the language, the cached profile, the Supabase session.
 * Native: expo-sqlite's localStorage (its own small SQLite file). Web: the
 * browser's localStorage.
 */
// Jest has no native SQLite module: use the in-memory fallback below instead.
if (!process.env.JEST_WORKER_ID) {
  // eslint-disable-next-line @typescript-eslint/no-require-imports -- side-effect install (no-op on web)
  require('expo-sqlite/localStorage/install');
}

const memory = new Map<string, string>();

function store(): Pick<Storage, 'getItem' | 'setItem' | 'removeItem'> {
  const ls = (globalThis as { localStorage?: Storage }).localStorage;
  if (ls && !process.env.JEST_WORKER_ID) return ls;
  return {
    getItem: (k) => memory.get(k) ?? null,
    setItem: (k, v) => void memory.set(k, v),
    removeItem: (k) => void memory.delete(k),
  };
}

export const kv = {
  get(key: string): string | null {
    try {
      return store().getItem(key);
    } catch {
      return null;
    }
  },
  set(key: string, value: string): void {
    try {
      store().setItem(key, value);
    } catch (e) {
      console.warn(`kv: could not save ${key}`, e);
    }
  },
  remove(key: string): void {
    try {
      store().removeItem(key);
    } catch {
      // ignore
    }
  },
  /** The storage object itself, for libraries that want one (Supabase auth). */
  storage: () => store(),
};
