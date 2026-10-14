import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SQLiteProvider, type SQLiteDatabase } from 'expo-sqlite';
import { useEffect } from 'react';
import { ActivityIndicator, Platform, StyleSheet, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { NotificationResponder } from '@/components/NotificationResponder';
import { databaseNameFor, setDb } from '@/db/client';
import { initCloudDatabase, initDatabase } from '@/db/init';
import { getPatient } from '@/db/repos/patients';
import { getSetting, setSetting } from '@/db/repos/settings';
import { listUsers, upsertUser } from '@/db/repos/users';
import { DEMO } from '@/db/seed/demo';
import { isLanguageCode } from '@/i18n';
import { ensurePins } from '@/services/auth';
import { configureNotifications, syncReminderNotifications } from '@/services/notifications';
import { useAccount } from '@/store/account';
import { useDevice } from '@/store/device';
import { useSettings } from '@/store/settings';
import { refreshPeople } from '@/sync/refresh';
import { colors } from '@/theme/tokens';

configureNotifications();

/**
 * Phones: always open a fresh native connection. expo-sqlite (Android) caches
 * open connections "for fast refresh" and hands the cached one back on the
 * next open; after a full JS reload in Expo Go that connection is broken and
 * every query throws "NativeDatabase … NullPointerException". A module-level
 * constant, because SQLiteProvider re-opens whenever `options` changes identity.
 */
const DB_OPTIONS = ((globalThis as { __smritiDbOptions?: object }).__smritiDbOptions ??=
  Platform.OS === 'web' ? {} : { useNewConnection: true }) as { useNewConnection?: boolean };

/** Demo (single-phone) database: runs once per launch before any screen renders. */
async function onInitDemo(db: SQLiteDatabase) {
  setDb(db);
  await initDatabase(db);

  const lang = await getSetting(db, 'language');
  if (isLanguageCode(lang)) useSettings.getState().hydrateLanguage(lang);

  const users = await listUsers(db);
  await ensurePins(
    users.map((u) => u.id),
    DEMO.pin,
  );

  // Not awaited: the permission prompt must never block the first screen.
  syncReminderNotifications(db).catch((e) => console.warn('Reminder notifications not scheduled', e));
}

/** Cloud / setup database: no demo story; the signed-in person is kept as a local user row. */
async function onInitCloud(db: SQLiteDatabase) {
  setDb(db);
  await initCloudDatabase(db);
  const profile = useAccount.getState().profile;
  if (profile) await upsertUser(db, profile);
  const { role, patientId } = useDevice.getState();
  if (role === 'patient' && patientId) {
    await setSetting(db, 'device_patient_id', patientId);
    // First start after pairing: wait (briefly) for the patient's profile so the home has a name.
    if (!(await getPatient(db, patientId))) {
      await Promise.race([
        refreshPeople().catch((e) => console.warn('First pull failed (offline?)', e)),
        new Promise((r) => setTimeout(r, 6000)),
      ]);
    }
  }
  syncReminderNotifications(db).catch((e) => console.warn('Reminder notifications not scheduled', e));
}

/**
 * React mounts → unmounts → re-mounts in development, so SQLiteProvider can run
 * onInit twice at once on the same file. On web both share one connection
 * ("cannot start a transaction within a transaction"); on phones the first
 * connection is left behind. Initialise each file once per app session; every
 * mount waits for it, then uses its own connection.
 */
// Kept on globalThis so hot updates (e.g. editing a language pack, which re-runs
// this module) keep the same onInit functions: a new identity would make
// SQLiteProvider close and re-open the database under screens still using it.
type InitRegistry = {
  done: Map<string, Promise<void>>;
  fns: Map<string, (db: SQLiteDatabase) => Promise<void>>;
};
const registry: InitRegistry = ((globalThis as { __smritiDbInit?: InitRegistry }).__smritiDbInit ??= {
  done: new Map(),
  fns: new Map(),
});
const initialised = registry.done;
const initFor = registry.fns;

function initOnce(dbName: string, init: (db: SQLiteDatabase) => Promise<void>) {
  let fn = initFor.get(dbName);
  if (!fn) {
    fn = async (db) => {
      let done = initialised.get(dbName);
      if (!done) {
        done = init(db);
        initialised.set(dbName, done);
        done.catch(() => initialised.delete(dbName));
      }
      await done;
      setDb(db);
    };
    initFor.set(dbName, fn);
  }
  return fn;
}

export default function RootLayout() {
  const mode = useDevice((s) => s.mode);
  const status = useAccount((s) => s.status);
  const uid = useAccount((s) => s.uid);

  useEffect(() => {
    if (mode === 'cloud') useAccount.getState().boot();
  }, [mode]);

  const restoring = mode === 'cloud' && (status === 'idle' || status === 'loading');
  const dbName = databaseNameFor(mode, mode === 'cloud' && status === 'signedIn' ? uid : null);

  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      {restoring ? (
        <View style={styles.splash}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        // A new key = a different file (demo / setup / one per account): remount everything on it.
        <SQLiteProvider
          key={dbName}
          databaseName={dbName}
          options={DB_OPTIONS}
          onInit={initOnce(dbName, mode === 'demo' ? onInitDemo : onInitCloud)}
        >
          <Stack
            screenOptions={{
              headerShown: false,
              contentStyle: { backgroundColor: colors.background },
            }}
          />
          <NotificationResponder />
        </SQLiteProvider>
      )}
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  splash: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background },
});
