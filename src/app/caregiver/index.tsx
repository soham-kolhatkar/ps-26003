import { useTranslation } from 'react-i18next';
import { Alert } from 'react-native';

import { AppText } from '@/components/AppText';
import { BigButton } from '@/components/BigButton';
import { PatientCard } from '@/components/PatientCard';
import { Screen } from '@/components/Screen';
import { StaffHeader } from '@/components/StaffHeader';
import { getDb } from '@/db/client';
import { listPatientsForUser } from '@/db/repos/patients';
import { getUser } from '@/db/repos/users';
import { resetDemo } from '@/db/seed/demo';
import { useDbQuery } from '@/db/useDbQuery';
import { useSession } from '@/store/session';

export default function CaregiverHome() {
  const { t } = useTranslation();
  const userId = useSession((s) => s.userId) ?? '';
  const { data, reload } = useDbQuery(
    async (db) => ({ user: await getUser(db, userId), patients: await listPatientsForUser(db, userId) }),
    [userId],
  );

  const confirmReset = () => {
    Alert.alert(t('staff.resetConfirmTitle'), t('staff.resetConfirmBody'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('staff.resetDemo'),
        style: 'destructive',
        onPress: async () => {
          await resetDemo(getDb());
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
        <PatientCard key={p.id} patient={p} showNotes />
      ))}
      <AppText tone="muted">{t('staff.dashboardSoon')}</AppText>
      <BigButton kind="secondary" icon="♻️" label={t('staff.resetDemo')} onPress={confirmReset} />
    </Screen>
  );
}
