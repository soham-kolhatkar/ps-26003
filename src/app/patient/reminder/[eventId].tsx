import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { BigButton } from '@/components/BigButton';
import { Icon } from '@/components/Icon';
import { Picture } from '@/components/Picture';
import { TopBar, TopBarButton } from '@/components/TopBar';
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
      <TopBar
        onBack={goHome}
        backLabel={t('game.home')}
        backIcon="house"
        right={<TopBarButton icon="speaker" tonal label={t('common.speak')} onPress={() => speak(spoken, language)} />}
      />
      <View style={styles.center}>
        <View style={styles.icon}>
          <Picture glyph={REMINDER_ICON[occ.type]} size={136} />
        </View>
        <AppText variant="hero" center>
          {t(`reminders.prompt.${occ.type}.title`)}
        </AppText>
        <AppText variant="title" weight="semibold" center>
          {occ.title}
        </AppText>
        {occ.note ? (
          <AppText variant="large" tone="muted" center>
            {occ.note}
          </AppText>
        ) : null}
        <View style={styles.when}>
          <Icon name="clock" size={24} color={colors.onClay} />
          <AppText variant="large" weight="semibold" tone="onClay">
            {occ.type === 'appointment' ? `${formatLongDate(new Date(occ.dueAt), language)} · ${time}` : time}
          </AppText>
        </View>
      </View>

      <View style={styles.fill} />

      {finished ? (
        <>
          <AppText variant="large" tone="primary" bold center>
            {t('reminders.alreadyDone')}
          </AppText>
          <BigButton size="large" icon="house" label={t('game.home')} onPress={goHome} />
        </>
      ) : (
        <>
          <BigButton
            size="large"
            icon="check"
            label={t(`reminders.prompt.${occ.type}.done`)}
            onPress={done}
            disabled={busy}
          />
          {occ.type !== 'appointment' ? (
            <BigButton kind="secondary" icon="alarm" label={t('reminders.later')} onPress={later} disabled={busy} />
          ) : null}
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', gap: space.md, marginTop: space.lg },
  icon: {
    width: 200,
    height: 200,
    borderRadius: radius.pill,
    backgroundColor: colors.clay,
    alignItems: 'center',
    justifyContent: 'center',
  },
  when: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
    borderRadius: radius.pill,
    backgroundColor: colors.clay,
  },
  fill: { flex: 1 },
});
