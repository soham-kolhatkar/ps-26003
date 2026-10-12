import { useTranslation } from 'react-i18next';

import { AppText } from '@/components/AppText';
import { PatientCard } from '@/components/PatientCard';
import { Screen } from '@/components/Screen';
import { StaffHeader } from '@/components/StaffHeader';
import { listPatientsForUser } from '@/db/repos/patients';
import { getUser } from '@/db/repos/users';
import { useDbQuery } from '@/db/useDbQuery';
import { useSession } from '@/store/session';

/** Home for multi-patient staff roles (ASHA, doctor): header + linked patients. */
export function StaffPatientList({ footer }: { footer?: string }) {
  const { t } = useTranslation();
  const userId = useSession((s) => s.userId) ?? '';
  const { data } = useDbQuery(
    async (db) => ({ user: await getUser(db, userId), patients: await listPatientsForUser(db, userId) }),
    [userId],
  );

  if (!data?.user) return <Screen>{null}</Screen>;

  return (
    <Screen>
      <StaffHeader user={data.user} />
      <AppText variant="large" bold>
        {t('staff.yourPatients', { count: data.patients.length })}
      </AppText>
      {data.patients.length === 0 ? <AppText tone="muted">{t('staff.noPatients')}</AppText> : null}
      {data.patients.map((p) => (
        <PatientCard key={p.id} patient={p} />
      ))}
      {footer ? <AppText tone="muted">{footer}</AppText> : null}
    </Screen>
  );
}
