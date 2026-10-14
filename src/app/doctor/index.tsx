import { useTranslation } from 'react-i18next';

import { StaffPatientList } from '@/components/StaffPatientList';

export default function DoctorHome() {
  const { t } = useTranslation();
  return (
    <StaffPatientList
      footer={t('doctor.listHint')}
      alertsPath="/doctor/alerts"
      patientPath="/doctor/patient"
      withReferrals
      joinPath="/doctor/join"
    />
  );
}
