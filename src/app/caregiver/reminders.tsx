import * as Notifications from 'expo-notifications';
import type { TFunction } from 'i18next';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, Pressable, StyleSheet, Switch, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { BigButton } from '@/components/BigButton';
import { Screen } from '@/components/Screen';
import { getDb } from '@/db/client';
import type { Reminder } from '@/db/models';
import { displayName, getPatient } from '@/db/repos/patients';
import { ensureEvents, listOccurrences, listReminders, saveReminder } from '@/db/repos/reminders';
import { useDbQuery } from '@/db/useDbQuery';
import { startOfDay } from '@/engine/reminders';
import type { LanguageCode } from '@/i18n';
import { formatClock, formatShortDate, formatTime } from '@/services/datetime';
import { REMINDER_ICON, sendTestReminder, syncReminderNotifications } from '@/services/notifications';
import { useSettings } from '@/store/settings';
import { colors, radius, space } from '@/theme/tokens';

const DAY = 24 * 60 * 60 * 1000;

function scheduleText(t: TFunction, r: Reminder, language: LanguageCode): string {
  if (r.schedule.kind === 'daily') {
    return t('reminders.caregiver.daily', { times: r.schedule.times.map((x) => formatClock(x, language)).join(', ') });
  }
  const at = new Date(r.schedule.at);
  return t('reminders.caregiver.once', { date: formatShortDate(at, language), time: formatTime(at, language) });
}

export default function CaregiverReminders() {
  const { t } = useTranslation();
  const { patientId } = useLocalSearchParams<{ patientId: string }>();
  const language = useSettings((s) => s.language);
  const [permissionOk, setPermissionOk] = useState(true);

  const { data, reload } = useDbQuery(
    async (db) => {
      const from = startOfDay(Date.now());
      await ensureEvents(db, patientId, from, from + DAY);
      const today = await listOccurrences(db, patientId, from, from + DAY);
      return {
        patient: await getPatient(db, patientId),
        reminders: await listReminders(db, patientId),
        done: today.filter((o) => o.status === 'taken').length,
        total: today.length,
      };
    },
    [patientId],
  );
  useFocusEffect(
    useCallback(() => {
      reload();
      Notifications.getPermissionsAsync().then((p) => setPermissionOk(p.granted || p.canAskAgain));
    }, [reload]),
  );

  const toggle = async (r: Reminder, enabled: boolean) => {
    await saveReminder(getDb(), { ...r, enabled });
    await syncReminderNotifications(getDb());
    reload();
  };

  const test = async (r: Reminder) => {
    const ok = await sendTestReminder(getDb(), r);
    Alert.alert(ok ? t('reminders.caregiver.testSent') : t('reminders.caregiver.permissionDenied'));
  };

  const name = data?.patient ? displayName(data.patient) : '';

  return (
    <Screen>
      <BigButton kind="ghost" icon="⬅️" label={t('common.back')} onPress={() => router.back()} />
      <View>
        <AppText variant="title">{t('reminders.caregiver.title')}</AppText>
        <AppText tone="muted">{t('reminders.caregiver.subtitle', { name })}</AppText>
      </View>

      {data ? (
        <View style={styles.summary}>
          <AppText variant="large" bold tone="onPrimary">
            ✅ {t('reminders.caregiver.todaySummary', { done: data.done, total: data.total })}
          </AppText>
        </View>
      ) : null}

      {!permissionOk ? (
        <View style={styles.warn}>
          <AppText variant="small">{t('reminders.caregiver.permissionDenied')}</AppText>
        </View>
      ) : null}

      <BigButton
        icon="➕"
        label={t('reminders.caregiver.add')}
        onPress={() => router.push({ pathname: '/caregiver/reminder-edit', params: { patientId } })}
      />

      {data && data.reminders.length === 0 ? <AppText tone="muted">{t('reminders.caregiver.empty')}</AppText> : null}

      {data?.reminders.map((r) => (
        <View key={r.id} style={[styles.card, !r.enabled && styles.cardOff]}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`${t('reminders.caregiver.editTitle')}: ${r.title}`}
            onPress={() =>
              router.push({ pathname: '/caregiver/reminder-edit', params: { patientId, reminderId: r.id } })
            }
            style={styles.cardMain}
          >
            <AppText style={styles.emoji} importantForAccessibility="no">
              {REMINDER_ICON[r.type]}
            </AppText>
            <View style={styles.cardText}>
              <AppText variant="caption" tone="primary" bold>
                {t(`reminders.type.${r.type}`)}
              </AppText>
              <AppText variant="large" bold>
                {r.title}
              </AppText>
              <AppText variant="small" tone="muted">
                {scheduleText(t, r, language)}
              </AppText>
            </View>
            <Switch
              value={r.enabled}
              onValueChange={(v) => toggle(r, v)}
              accessibilityLabel={r.enabled ? t('reminders.caregiver.on') : t('reminders.caregiver.off')}
              trackColor={{ true: colors.primary, false: colors.border }}
            />
          </Pressable>
          {r.enabled ? (
            <BigButton kind="ghost" icon="🔔" label={t('reminders.caregiver.test')} onPress={() => test(r)} />
          ) : null}
        </View>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  summary: { backgroundColor: colors.primary, borderRadius: radius.md, padding: space.md },
  warn: {
    backgroundColor: colors.warningSoft,
    borderColor: colors.warning,
    borderWidth: 1,
    borderRadius: radius.md,
    padding: space.md,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: space.sm,
  },
  cardOff: { opacity: 0.55 },
  cardMain: { flexDirection: 'row', alignItems: 'center', gap: space.md, padding: space.sm },
  emoji: { fontSize: 36, lineHeight: 44 },
  cardText: { flex: 1, gap: 2 },
});
