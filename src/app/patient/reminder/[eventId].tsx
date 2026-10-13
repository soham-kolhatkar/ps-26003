import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { BigButton } from '@/components/BigButton';
import { Screen } from '@/components/Screen';
import { getDb } from '@/db/client';
import { displayName, getPatient } from '@/db/repos/patients';
import { getOccurrence, getReminder, markOccurrence } from '@/db/repos/reminders';
import { useDbQuery } from '@/db/useDbQuery';
import { afterSpeech, useAlive } from '@/games/pacing';
import { formatLongDate, formatTime } from '@/services/datetime';
import { REMINDER_ICON, snoozeReminder } from '@/services/notifications';
import { speak, stopSpeaking } from '@/services/tts';
import { useSettings } from '@/store/settings';
import { colors, radius, space } from '@/theme/tokens';

const THANKS_MIN_MS = 1500;

/** Full-screen "time for…" prompt: read aloud, one big confirm, one "later". */
export default function ReminderPrompt() {
  const { t } = useTranslation();
  const { eventId } = useLocalSearchParams<{ eventId: string }>();
  const language = useSettings((s) => s.language);
  const alive = useAlive();
  const [busy, setBusy] = useState(false);

  const { data } = useDbQuery(
    async (db) => {
      const occurrence = await getOccurrence(db, eventId);
      if (!occurrence) return null;
      const patient = await getPatient(db, occurrence.patientId);
      return { occurrence, name: patient ? displayName(patient) : '' };
    },
    [eventId],
  );

  const occ = data?.occurrence;
  const time = occ ? formatTime(new Date(occ.dueAt), language) : '';
  const spoken = occ ? t(`reminders.prompt.${occ.type}.spoken`, { name: data.name, title: occ.title, time }) : '';

  useEffect(() => {
    if (occ && occ.status === 'pending') speak(spoken, language);
    return () => stopSpeaking();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- speak once when loaded
  }, [occ?.eventId]);

  const goHome = () => router.dismissTo('/patient');

  const done = async () => {
    if (!occ) return;
    setBusy(true);
    await markOccurrence(getDb(), occ.eventId, 'taken');
    await afterSpeech(speak(t('reminders.thanks', { name: data?.name }), language), THANKS_MIN_MS);
    if (alive.current) goHome();
  };

  const later = async () => {
    if (!occ) return;
    setBusy(true);
    const reminder = await getReminder(getDb(), occ.reminderId);
    if (reminder) await snoozeReminder(getDb(), reminder, occ.dueAt);
    await afterSpeech(speak(t('reminders.laterSpoken'), language), THANKS_MIN_MS);
    if (alive.current) goHome();
  };

  if (!occ) return <Screen>{null}</Screen>;
  const finished = occ.status !== 'pending';

  return (
    <Screen>
      <View style={styles.center}>
        <View style={styles.icon}>
          <AppText style={styles.emoji} importantForAccessibility="no">
            {REMINDER_ICON[occ.type]}
          </AppText>
        </View>
        <AppText variant="hero" center>
          {t(`reminders.prompt.${occ.type}.title`)}
        </AppText>
        <View style={styles.card}>
          <AppText variant="title" center>
            {occ.title}
          </AppText>
          {occ.note ? (
            <AppText variant="large" tone="muted" center>
              {occ.note}
            </AppText>
          ) : null}
          <AppText variant="large" tone="primary" bold center>
            🕰️ {occ.type === 'appointment' ? `${formatLongDate(new Date(occ.dueAt), language)} · ${time}` : time}
          </AppText>
        </View>
      </View>

      <View style={styles.fill} />

      {finished ? (
        <>
          <AppText variant="large" tone="primary" bold center>
            {t('reminders.alreadyDone')}
          </AppText>
          <BigButton size="large" icon="🏠" label={t('game.home')} onPress={goHome} />
        </>
      ) : (
        <>
          <BigButton
            size="large"
            icon="✅"
            label={t(`reminders.prompt.${occ.type}.done`)}
            onPress={done}
            disabled={busy}
          />
          {occ.type !== 'appointment' ? (
            <BigButton kind="secondary" icon="⏰" label={t('reminders.later')} onPress={later} disabled={busy} />
          ) : null}
          <BigButton kind="ghost" icon="🔊" label={t('common.speak')} onPress={() => speak(spoken, language)} />
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', gap: space.md, marginTop: space.lg },
  icon: {
    width: 140,
    height: 140,
    borderRadius: radius.pill,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emoji: { fontSize: 76, lineHeight: 90 },
  card: {
    alignSelf: 'stretch',
    gap: space.xs,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: space.lg,
  },
  fill: { flex: 1 },
});
