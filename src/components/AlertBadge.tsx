import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { STATUS } from '@/components/StatusLine';
import type { AlertCounts } from '@/db/repos/alerts';
import { colors, radius, space } from '@/theme/tokens';

/**
 * A count badge on the corner of a patient's picture (red = something serious, amber =
 * worth a look). The alerts themselves are one tap away, on the patient's page.
 */
export function AlertBadge({ counts }: { counts: AlertCounts | undefined }) {
  const { t } = useTranslation();
  if (!counts?.open) return null;
  const s = STATUS[counts.serious ? 'urgent' : 'soon'];
  const label = counts.unseen
    ? t('alerts.badgeNew', { count: counts.open, unseen: counts.unseen })
    : t('alerts.badge', { count: counts.open });
  return (
    <View style={[styles.badge, { backgroundColor: s.color }]} accessible accessibilityLabel={label} testID="alert-badge">
      <AppText variant="caption" weight="bold" tone="onPrimary" style={styles.count}>
        {counts.open}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    minWidth: 28,
    height: 28,
    paddingHorizontal: space.xs + 2,
    borderRadius: radius.pill,
    borderWidth: 2,
    borderColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  count: { lineHeight: 20 },
});
