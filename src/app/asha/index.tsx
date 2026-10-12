import { useTranslation } from 'react-i18next';

import { StaffPatientList } from '@/components/StaffPatientList';

export default function AshaHome() {
  const { t } = useTranslation();
  return <StaffPatientList footer={t('staff.dashboardSoon')} />;
}
