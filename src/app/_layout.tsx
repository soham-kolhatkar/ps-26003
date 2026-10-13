import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SQLiteProvider, type SQLiteDatabase } from 'expo-sqlite';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { NotificationResponder } from '@/components/NotificationResponder';
import { DATABASE_NAME, setDb } from '@/db/client';
import { initDatabase } from '@/db/init';
import { listUsers } from '@/db/repos/users';
import { getSetting } from '@/db/repos/settings';
import { DEMO } from '@/db/seed/demo';
import { isLanguageCode } from '@/i18n';
import { ensurePins } from '@/services/auth';
import { configureNotifications, syncReminderNotifications } from '@/services/notifications';
import { useSettings } from '@/store/settings';
import { colors } from '@/theme/tokens';

configureNotifications();

/** Runs once per launch before any screen renders. */
async function onInit(db: SQLiteDatabase) {
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

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <SQLiteProvider databaseName={DATABASE_NAME} onInit={onInit}>
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: colors.background },
          }}
        />
        <NotificationResponder />
      </SQLiteProvider>
    </SafeAreaProvider>
  );
}
