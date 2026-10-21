import { router, useFocusEffect } from 'expo-router';
import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { BigButton } from '@/components/BigButton';
import { ListGroup, ListRow } from '@/components/List';
import { PatientCard } from '@/components/PatientCard';
import { Screen } from '@/components/Screen';
import { StaffHeader } from '@/components/StaffHeader';
import { getDb } from '@/db/client';
import { alertCounts, type AlertCounts } from '@/db/repos/alerts';
import { displayName, listPatientsForUser } from '@/db/repos/patients';
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
import { useDevice } from '@/store/device';
import { useCloudRefresh } from '@/sync/refresh';
import { useSession } from '@/store/session';
import { colors, space } from '@/theme/tokens';

export default function CaregiverHome() {
  const { t } = useTranslation();
  const userId = useSession((s) => s.userId) ?? '';
  const cloud = useDevice((s) => s.mode) === 'cloud';
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
  useCloudRefresh(reload);

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
      {data.patients.map((p) => {
        const counts = data.alerts[p.id];
        const today = data.reminderToday[p.id] ?? { done: 0, total: 0 };
        const photos = data.photoCounts[p.id] ?? 0;
        return (
          <View key={p.id} style={styles.patient}>
            <PatientCard patient={p} showNotes showRelation footer={t('progress.weekGames', { count: data.gamesThisWeek[p.id] ?? 0 })} />
            <ListGroup>
              {counts?.open ? (
                <ListRow
                  icon={counts.serious ? 'triangle' : 'circle'}
                  tone={counts.serious ? 'danger' : 'warning'}
                  titleColor={counts.serious ? colors.danger : colors.warning}
                  title={t('alerts.tab')}
                  subtitle={
                    counts.unseen
                      ? t('alerts.badgeNew', { count: counts.open, unseen: counts.unseen })
                      : t('alerts.badge', { count: counts.open })
                  }
                  onPress={() => router.push({ pathname: '/caregiver/alerts', params: { patientId: p.id } })}
                />
              ) : null}
              <ListRow
                icon="chart"
                title={t('progress.button')}
                subtitle={t('progress.rowHint')}
                onPress={() => router.push({ pathname: '/caregiver/progress', params: { patientId: p.id } })}
              />
              <ListRow
                icon="bell"
                tone="clay"
                title={t('reminders.caregiver.title')}
                subtitle={today.total ? t('reminders.caregiver.today', today) : t('reminders.caregiver.noneToday')}
                onPress={() => router.push({ pathname: '/caregiver/reminders', params: { patientId: p.id } })}
              />
              {cloud ? (
                // Photos never leave the patient's phone: they are added there (family corner).
                <ListRow
                  icon="image"
                  tone="lilac"
                  title={t('photos.title')}
                  subtitle={t('people.photosOnPatientPhone', { name: displayName(p) })}
                />
              ) : (
                <ListRow
                  icon="image"
                  tone="lilac"
                  title={t('photos.title')}
                  subtitle={photos ? t('photos.count', { count: photos }) : t('photos.none')}
                  onPress={() => router.push({ pathname: '/caregiver/photos', params: { patientId: p.id } })}
                />
              )}
              {cloud ? (
                <ListRow
                  icon="users"
                  tone="pond"
                  title={t('people.button')}
                  subtitle={t('people.rowHint', { name: displayName(p) })}
                  onPress={() => router.push({ pathname: '/caregiver/people', params: { patientId: p.id } })}
                />
              ) : null}
            </ListGroup>
          </View>
        );
      })}
      {cloud && data.patients.length === 0 ? <AppText tone="muted">{t('people.noFamilyYet')}</AppText> : null}
      {cloud ? (
        <>
          <BigButton icon="plus" label={t('people.addFamily')} onPress={() => router.push('/caregiver/patient-new')} />
          <BigButton
            kind="secondary"
            icon="key"
            label={t('people.joinButton')}
            onPress={() => router.push('/caregiver/join')}
          />
        </>
      ) : null}
      {/* The demo story lives only in the single-phone demo database. */}
      {cloud ? null : <BigButton kind="danger" icon="reset" label={t('staff.resetDemo')} onPress={confirmReset} />}
    </Screen>
  );
}

const styles = StyleSheet.create({
  patient: { gap: space.md },
});
