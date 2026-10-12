import { router, useFocusEffect } from 'expo-router';
import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { BigButton } from '@/components/BigButton';
import { PatientCard } from '@/components/PatientCard';
import { Screen } from '@/components/Screen';
import { StaffHeader } from '@/components/StaffHeader';
import { getDb } from '@/db/client';
import { listPatientsForUser } from '@/db/repos/patients';
import { listPhotos } from '@/db/repos/photos';
import { getUser } from '@/db/repos/users';
import { resetDemo } from '@/db/seed/demo';
import { useDbQuery } from '@/db/useDbQuery';
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
      return { user: await getUser(db, userId), patients, photoCounts };
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
          <BigButton
            kind="secondary"
            icon="📷"
            label={t('photos.button', { count: data.photoCounts[p.id] ?? 0 })}
            onPress={() => router.push({ pathname: '/caregiver/photos', params: { patientId: p.id } })}
          />
        </View>
      ))}
      <AppText tone="muted">{t('staff.dashboardSoon')}</AppText>
      <BigButton kind="secondary" icon="♻️" label={t('staff.resetDemo')} onPress={confirmReset} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  patient: { gap: space.sm },
});
