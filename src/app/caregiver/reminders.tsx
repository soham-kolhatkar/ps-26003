import * as Notifications from '@/services/notificationsApi';
import type { TFunction } from 'i18next';
import { router, usePathname, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Switch, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { BigButton } from '@/components/BigButton';
import { Picture } from '@/components/Picture';
import { PressableScale } from '@/components/PressableScale';
import { StatusLine } from '@/components/StatusLine';
import { Meter } from '@/components/charts/Meter';
import { TopBar } from '@/components/TopBar';
import { Screen } from '@/components/Screen';
import { getDb } from '@/db/client';
import type { Reminder } from '@/db/models';
import { displayName, getPatient } from '@/db/repos/patients';
import { ensureEvents, listOccurrences, listReminders, saveReminder } from '@/db/repos/reminders';
import { useDbQuery } from '@/db/useDbQuery';
import { startOfDay } from '@/engine/reminders';
import type { LanguageCode } from '@/i18n';
import { formatClock, formatShortDate, formatTime } from '@/services/datetime';
import { REMINDER_ICON, syncReminderNotifications } from '@/services/notifications';
import { useDevice } from '@/store/device';
import { useSettings } from '@/store/settings';
import { colors, radius, shadow, space } from '@/theme/tokens';

const DAY = 24 * 60 * 60 * 1000;

function scheduleText(t: TFunction, r: Reminder, language: LanguageCode): string {
  if (r.schedule.kind === 'daily') {
    return t('reminders.caregiver.daily', { times: r.schedule.times.map((x) => formatClock(x, language)).join(', ') });
  }
  const at = new Date(r.schedule.at);
  return t('reminders.caregiver.once', { date: formatShortDate(at, language), time: formatTime(at, language) });
}

export default function CaregiverReminders() {
  // Also mounted for the ASHA worker (`/asha/reminders`): stay in the group it was opened from.
  const editPath = usePathname().startsWith('/asha') ? '/asha/reminder-edit' : '/caregiver/reminder-edit';
  // "Test" fires a notification on THIS phone: meaningful only where the patient uses the phone (demo).
  const canTest = useDevice((st) => st.mode) !== 'cloud';
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

  const name = data?.patient ? displayName(data.patient) : '';

  return (
    <Screen>
      <TopBar />
      <View>
        <AppText variant="title">{t('reminders.caregiver.title')}</AppText>
        <AppText tone="muted">{t('reminders.caregiver.subtitle', { name })}</AppText>
      </View>

      {data && data.total > 0 ? (
        <View style={styles.summary}>
          <Meter
            label={t('reminders.caregiver.todayLabel')}
            valueText={t('reminders.caregiver.doneOf', { done: data.done, total: data.total })}
            ratio={data.done / data.total}
          />
        </View>
      ) : null}

      {/* Cloud staff phones never ring: reminders ring on the patient's phone. */}
      {!permissionOk && canTest ? <StatusLine status="soon" text={t('reminders.caregiver.permissionDenied')} /> : null}

      <BigButton
        icon="plus"
        label={t('reminders.caregiver.add')}
        onPress={() => router.push({ pathname: editPath, params: { patientId } })}
      />

      {data && data.reminders.length === 0 ? <AppText tone="muted">{t('reminders.caregiver.empty')}</AppText> : null}

      {data?.reminders.length ? (
        <View style={styles.list}>
          {data.reminders.map((r, i) => (
            <View key={r.id}>
              {i > 0 ? <View style={styles.divider} /> : null}
              <PressableScale
                accessibilityRole="button"
                accessibilityLabel={`${t('reminders.caregiver.editTitle')}: ${r.title}`}
                onPress={() => router.push({ pathname: editPath, params: { patientId, reminderId: r.id } })}
                style={({ pressed }) => [styles.row, pressed && styles.pressed, !r.enabled && styles.off]}
              >
                <View style={styles.picture}>
                  <Picture glyph={REMINDER_ICON[r.type]} size={34} />
                </View>
                <View style={styles.text}>
                  <AppText variant="body" weight="semibold">
                    {r.title}
                  </AppText>
                  <AppText variant="caption" tone="muted">
                    {t(`reminders.type.${r.type}`)} · {scheduleText(t, r, language)}
                  </AppText>
                </View>
                <Switch
                  value={r.enabled}
                  onValueChange={(v) => toggle(r, v)}
                  accessibilityLabel={r.enabled ? t('reminders.caregiver.on') : t('reminders.caregiver.off')}
                  trackColor={{ true: colors.primary, false: colors.border }}
                />
              </PressableScale>
            </View>
          ))}
        </View>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  summary: { backgroundColor: colors.surface, borderRadius: radius.md, padding: space.md, boxShadow: shadow.card },
  list: { backgroundColor: colors.surface, borderRadius: radius.md, boxShadow: shadow.card, overflow: 'hidden' },
  divider: { height: 1, backgroundColor: colors.surfaceMuted, marginLeft: 76 },
  row: {
    minHeight: 80,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm + 4,
    paddingHorizontal: space.md,
    paddingVertical: space.sm + 2,
  },
  pressed: { backgroundColor: colors.primaryWash },
  off: { opacity: 0.55 },
  picture: {
    width: 48,
    height: 48,
    borderRadius: radius.pill,
    backgroundColor: colors.clay,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: { flex: 1, gap: 2 },
});
