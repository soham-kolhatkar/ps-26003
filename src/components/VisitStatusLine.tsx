import { useTranslation } from 'react-i18next';

import { StatusLine, type Status } from '@/components/StatusLine';
import type { VisitStatus } from '@/engine/visits';
import { formatShortDate } from '@/services/datetime';
import { useSettings } from '@/store/settings';

const LEVEL: Record<VisitStatus['state'], Status> = { overdue: 'urgent', due: 'soon', never: 'soon', ok: 'info' };

/** "▲ Visit overdue by 2 days" / "● Visit due today" / "Next visit in 4 days · Fri, 23 Oct". */
export function VisitStatusLine({ status }: { status: VisitStatus }) {
  const { t } = useTranslation();
  const language = useSettings((s) => s.language);
  const date = status.nextAt ? formatShortDate(new Date(status.nextAt), language) : '';
  const text =
    status.state === 'never'
      ? t('visit.status.never')
      : status.state === 'due'
        ? t('visit.status.due')
        : status.state === 'overdue'
          ? t('visit.status.overdue', { n: status.days })
          : t('visit.status.ok', { n: status.days, date });
  return <StatusLine status={LEVEL[status.state]} text={text} />;
}
