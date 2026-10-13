import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/AppText';
import type { StoredAlert } from '@/db/repos/alerts';
import type { AlertSeverity } from '@/engine/trends';
import { formatShortDate } from '@/services/datetime';
import { useSettings } from '@/store/settings';
import { colors, radius, space } from '@/theme/tokens';

/** Status colour + icon + label together: severity is never shown by colour alone. */
const SEVERITY: Record<AlertSeverity, { icon: string; color: string; soft: string }> = {
  serious: { icon: '🔴', color: colors.danger, soft: colors.accentSoft },
  warning: { icon: '🟠', color: colors.warning, soft: colors.warningSoft },
  info: { icon: 'ℹ️', color: colors.primary, soft: colors.primarySoft },
};

/** Title + explanation (with the numbers behind it) for one stored alert. */
export function useAlertText(alert: StoredAlert, patientName: string) {
  const { t } = useTranslation();
  const language = useSettings((s) => s.language);
  const d = alert.detail;
  switch (alert.kind) {
    case 'game_decline': {
      const game = t(`games.${d.gameId}.title`);
      return {
        title: t('alerts.game_decline.title', { game }),
        body: t('alerts.game_decline.body', {
          pct: d.dropPct,
          recent: d.recentSessions,
          baseline: d.baselineSessions,
          fromLevel: d.baselineLevel,
          toLevel: d.recentLevel,
        }),
        tip: t('alerts.game_decline.tip'),
      };
    }
    case 'adherence_low':
      return {
        title: t('alerts.adherence_low.title'),
        body: t('alerts.adherence_low.body', { taken: d.taken, decided: d.decided, days: d.days, pct: d.ratePct }),
        tip: t('alerts.adherence_low.tip'),
      };
    case 'inactive':
      return {
        title: t('alerts.inactive.title', { days: d.days }),
        body: t('alerts.inactive.body', {
          name: patientName,
          count: d.baselineSessions,
          date: formatShortDate(new Date(Number(d.lastPlayedAt)), language),
        }),
        tip: t('alerts.inactive.tip'),
      };
  }
}

export function AlertCard({
  alert,
  patientName,
  compact,
}: {
  alert: StoredAlert;
  patientName: string;
  compact?: boolean;
}) {
  const { t } = useTranslation();
  const language = useSettings((s) => s.language);
  const text = useAlertText(alert, patientName);
  const sev = SEVERITY[alert.severity];
  const resolved = alert.resolvedAt != null;

  return (
    <View
      style={[styles.card, { borderLeftColor: resolved ? colors.border : sev.color }, resolved && styles.resolved]}
      accessible
      accessibilityLabel={`${t(`alerts.severity.${alert.severity}`)}. ${text.title}. ${text.body}`}
    >
      <View style={[styles.chip, { backgroundColor: resolved ? colors.surfaceMuted : sev.soft }]}>
        <AppText variant="caption" bold>
          {resolved ? '✓' : sev.icon} {resolved ? t('alerts.resolvedChip') : t(`alerts.severity.${alert.severity}`)}
        </AppText>
        {!resolved && alert.seenAt == null ? (
          <AppText variant="caption" bold tone="accent">
            · {t('alerts.new')}
          </AppText>
        ) : null}
      </View>
      <AppText variant="large" bold>
        {text.title}
      </AppText>
      <AppText variant={compact ? 'small' : 'body'}>{text.body}</AppText>
      {!compact && !resolved ? (
        <AppText variant="small" tone="muted">
          💡 {text.tip}
        </AppText>
      ) : null}
      <AppText variant="caption" tone="muted">
        {resolved
          ? t('alerts.resolved', { date: formatShortDate(new Date(alert.resolvedAt!), language) })
          : t('alerts.since', { date: formatShortDate(new Date(alert.firstSeenAt), language) })}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: space.xs,
    padding: space.md,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderLeftWidth: 6,
  },
  resolved: { opacity: 0.75 },
  chip: {
    flexDirection: 'row',
    gap: space.xs,
    alignSelf: 'flex-start',
    paddingHorizontal: space.sm,
    paddingVertical: 2,
    borderRadius: radius.pill,
  },
});
