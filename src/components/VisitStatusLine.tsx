import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/AppText';
import type { VisitStatus } from '@/engine/visits';
import { formatShortDate } from '@/services/datetime';
import { useSettings } from '@/store/settings';
import { colors, radius, space } from '@/theme/tokens';

/** "🏠 Visit overdue by 2 days" (amber) / "🏠 Next visit in 4 days · Fri, 23 Oct". */
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
  const urgent = status.state === 'due' || status.state === 'overdue';
  return (
    <View style={[styles.line, urgent && styles.urgent]}>
      <AppText variant="small" bold={urgent}>
        🏠 {text}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  line: { paddingVertical: space.xs, paddingHorizontal: space.sm, borderRadius: radius.sm, alignSelf: 'flex-start' },
  urgent: { backgroundColor: colors.warningSoft },
});
