import { router, useFocusEffect } from 'expo-router';
import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { Icon } from '@/components/Icon';
import { Picture } from '@/components/Picture';
import { PressableScale } from '@/components/PressableScale';
import { ensureEvents, listOccurrences } from '@/db/repos/reminders';
import { useDbQuery } from '@/db/useDbQuery';
import { eventState, startOfDay } from '@/engine/reminders';
import type { LanguageCode } from '@/i18n';
import { formatTime } from '@/services/datetime';
import { REMINDER_ICON } from '@/services/notifications';
import { colors, radius, space, touch } from '@/theme/tokens';

const DAY = 24 * 60 * 60 * 1000;

type Props = { patientId: string; now: Date; language: LanguageCode };

/**
 * Patient home: reminders due now as big cards (tap → confirm screen), plus a
 * single "next" line. Deliberately not a full list — less to read.
 */
export function TodayReminders({ patientId, now, language }: Props) {
  const { t } = useTranslation();
  const nowMs = now.getTime();
  const { data, reload } = useDbQuery(
    async (db) => {
      const from = startOfDay(nowMs);
      await ensureEvents(db, patientId, from, from + DAY);
      return listOccurrences(db, patientId, from, from + DAY);
    },
    [patientId, startOfDay(nowMs)],
  );
  useFocusEffect(useCallback(() => reload(), [reload]));

  if (!data || data.length === 0) return null;
  const withState = data.map((o) => ({ ...o, state: eventState(o.status, o.dueAt, nowMs) }));
  const due = withState.filter((o) => o.state === 'due');
  const next = withState.find((o) => o.state === 'upcoming');

  return (
    <View style={styles.wrap}>
      {due.map((o) => (
        <PressableScale
          key={o.eventId}
          accessibilityRole="button"
          accessibilityLabel={`${t(`reminders.prompt.${o.type}.title`)}: ${o.title}`}
          onPress={() => router.push({ pathname: '/patient/reminder/[eventId]', params: { eventId: o.eventId } })}
          style={({ pressed }) => [styles.dueCard, pressed && styles.pressed]}
        >
          <Picture glyph={REMINDER_ICON[o.type]} size={60} />
          <View style={styles.text}>
            <AppText variant="small" tone="onClay" bold>
              {t('reminders.state.due')} · {formatTime(new Date(o.dueAt), language)}
            </AppText>
            <AppText variant="large" weight="bold" tone="onClay">
              {o.title}
            </AppText>
          </View>
          <Icon name="caret-right" size={28} color={colors.onClay} />
        </PressableScale>
      ))}

      {next ? (
        <View style={styles.nextRow}>
          <Picture glyph={REMINDER_ICON[next.type]} size={44} />
          <AppText variant="body" tone="onClay" style={styles.text}>
            {t('reminders.state.upcoming')} · {formatTime(new Date(next.dueAt), language)} · {next.title}
          </AppText>
        </View>
      ) : due.length === 0 ? (
        <AppText variant="body" tone="muted">
          {t('reminders.nothingToday')}
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: space.sm },
  dueCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    minHeight: touch.large,
    padding: space.md,
    borderRadius: radius.lg,
    backgroundColor: colors.clay,
  },
  pressed: { opacity: 0.85 },
  text: { flex: 1, gap: 2 },
  nextRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm + 4,
    paddingVertical: space.sm + 4,
    paddingHorizontal: space.md,
    borderRadius: radius.md,
    backgroundColor: colors.clay,
  },
});
