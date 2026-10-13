import { router, useFocusEffect } from 'expo-router';
import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, StyleSheet, View } from 'react-native';

import { AlertsButton } from '@/components/AlertsButton';
import { BigButton } from '@/components/BigButton';
import { PatientCard } from '@/components/PatientCard';
import { Screen } from '@/components/Screen';
import { StaffHeader } from '@/components/StaffHeader';
import { getDb } from '@/db/client';
import { alertCounts, type AlertCounts } from '@/db/repos/alerts';
import { listPatientsForUser } from '@/db/repos/patients';
import { listSessions } from '@/db/repos/games';
import { listPhotos } from '@/db/repos/photos';
import { ensureEvents, listOccurrences } from '@/db/repos/reminders';
import { getUser } from '@/db/repos/users';
import { resetDemo } from '@/db/seed/demo';
import { useDbQuery } from '@/db/useDbQuery';
import { startOfDay } from '@/engine/reminders';
import { refreshAlerts } from '@/services/alerts';
import { syncReminderNotifications } from '@/services/notifications';
import { clearAllPhotoFiles } from '@/services/photos';
import { useSession } from '@/store/session';
import { space } from '@/theme/tokens';

export default function CaregiverHome() {
  const { t } = useTranslation();
  const userId = useSession((s) => s.userId) ?? '';
  const { data, reload } = useDbQuery(
    async (db) => {
      const patients = await listPatientsForUser(db, userId);
      const photoCounts = Object.fromEntries(
        await Promise.all(patients.map(async (p) => [p.id, (await listPhotos(db, p.id)).length] as const)),
      );
      const from = startOfDay(Date.now());
      const reminderToday: Record<string, { done: number; total: number }> = {};
      const gamesThisWeek: Record<string, number> = {};
      const alerts: Record<string, AlertCounts> = {};
      for (const p of patients) {
        await refreshAlerts(db, p.id);
        alerts[p.id] = await alertCounts(db, p.id);
        const week = await listSessions(db, p.id, { since: from - 6 * 24 * 60 * 60 * 1000 });
        gamesThisWeek[p.id] = week.filter((x) => x.completed).length;
        await ensureEvents(db, p.id, from, from + 24 * 60 * 60 * 1000);
        const occ = await listOccurrences(db, p.id, from, from + 24 * 60 * 60 * 1000);
        reminderToday[p.id] = { done: occ.filter((o) => o.status === 'taken').length, total: occ.length };
      }
      return { user: await getUser(db, userId), patients, photoCounts, reminderToday, gamesThisWeek, alerts };
    },
    [userId],
  );
  useFocusEffect(useCallback(() => reload(), [reload]));

  const confirmReset = () => {
    Alert.alert(t('staff.resetConfirmTitle'), t('staff.resetConfirmBody'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('staff.resetDemo'),
        style: 'destructive',
        onPress: async () => {
          await resetDemo(getDb());
          clearAllPhotoFiles();
          await syncReminderNotifications(getDb());
          reload();
          Alert.alert(t('staff.resetDone'));
        },
      },
    ]);
  };

  if (!data?.user) return <Screen>{null}</Screen>;

  return (
    <Screen>
      <StaffHeader user={data.user} />
      {data.patients.map((p) => (
        <View key={p.id} style={styles.patient}>
          <PatientCard patient={p} showNotes />
          <AlertsButton counts={data.alerts[p.id]} patientId={p.id} pathname="/caregiver/alerts" />
          <BigButton
            icon="📊"
            label={t('progress.button', { count: data.gamesThisWeek[p.id] ?? 0 })}
            onPress={() => router.push({ pathname: '/caregiver/progress', params: { patientId: p.id } })}
          />
          <BigButton
            kind="secondary"
            icon="📷"
            label={t('photos.button', { count: data.photoCounts[p.id] ?? 0 })}
            onPress={() => router.push({ pathname: '/caregiver/photos', params: { patientId: p.id } })}
          />
          <BigButton
            kind="secondary"
            icon="🔔"
            label={t('reminders.caregiver.button', data.reminderToday[p.id] ?? { done: 0, total: 0 })}
            onPress={() => router.push({ pathname: '/caregiver/reminders', params: { patientId: p.id } })}
          />
        </View>
      ))}
      <BigButton kind="secondary" icon="♻️" label={t('staff.resetDemo')} onPress={confirmReset} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  patient: { gap: space.sm },
});
