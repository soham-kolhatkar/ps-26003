import { useTranslation } from 'react-i18next';

import { StaffPatientList } from '@/components/StaffPatientList';

export default function AshaHome() {
  const { t } = useTranslation();
  return (
    <StaffPatientList
      footer={t('visit.listHint')}
      patientPath="/asha/patient"
      withVisits
      registerPath="/asha/patient-new"
      joinPath="/asha/join"
    />
  );
}
