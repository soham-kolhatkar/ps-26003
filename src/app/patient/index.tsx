import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { BigButton } from '@/components/BigButton';
import { GameTile } from '@/components/GameTile';
import { HoldButton } from '@/components/HoldButton';
import { Screen } from '@/components/Screen';
import { TodayReminders } from '@/components/TodayReminders';
import { displayName, getPatient } from '@/db/repos/patients';
import { useDbQuery } from '@/db/useDbQuery';
import { GAMES } from '@/games/registry';
import { dayPart, formatLongDate, formatTime, GREETING_KEY } from '@/services/datetime';
import { speak } from '@/services/tts';
import { useDevice } from '@/store/device';
import { useSession } from '@/store/session';
import { useSettings } from '@/store/settings';
import { colors, radius, space } from '@/theme/tokens';

/** Re-renders every minute so the clock and greeting stay current. */
function useNow(): Date {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);
  return now;
}

export default function PatientHome() {
  const { t } = useTranslation();
  const patientId = useSession((s) => s.patientId);
  const signOut = useSession((s) => s.signOut);
  const cloud = useDevice((s) => s.mode) === 'cloud';
  const language = useSettings((s) => s.language);
  const { data: patient } = useDbQuery((db) => getPatient(db, patientId ?? ''), [patientId]);
  const now = useNow();
  const { data: availableIds } = useDbQuery(
    async (db) => {
      const ids: string[] = [];
      for (const g of GAMES) if (!g.isAvailable || (await g.isAvailable(db, patientId ?? ''))) ids.push(g.id);
      return ids;
    },
    [patientId],
  );
  const games = GAMES.filter((g) => (availableIds ? availableIds.includes(g.id) : !g.isAvailable));

  const name = patient ? displayName(patient) : '';
  const greeting = t(GREETING_KEY[dayPart(now)], { name });
  const date = formatLongDate(now, language);

  return (
    <Screen>
      <View style={styles.header}>
        <View style={styles.avatar}>
          <AppText style={styles.avatarEmoji} importantForAccessibility="no">
            {patient?.avatar ?? '🙂'}
          </AppText>
        </View>
        <View style={styles.headerText}>
          <AppText variant="title">{greeting}</AppText>
        </View>
      </View>

      <View
        style={styles.dateCard}
        accessible
        accessibilityLabel={`${t('patient.todayIs', { date })}, ${formatTime(now, language)}`}
      >
        <AppText variant="large" tone="onPrimary" bold>
          📅 {date}
        </AppText>
        <AppText variant="title" tone="onPrimary">
          🕰️ {formatTime(now, language)}
        </AppText>
      </View>

      {patientId ? <TodayReminders patientId={patientId} now={now} language={language} /> : null}

      <BigButton
        kind="secondary"
        icon="🔊"
        label={t('common.speak')}
        onPress={() => speak(t('patient.greetingSpoken', { greeting, date }), language)}
      />

      <AppText variant="large" bold>
        {t('patient.chooseGame')}
      </AppText>
      {games.map((game) => (
        <GameTile
          key={game.id}
          icon={game.icon}
          title={t(`games.${game.id}.title`)}
          description={t(`games.${game.id}.description`)}
          onPress={() => router.push({ pathname: '/patient/game/[id]', params: { id: game.id } })}
        />
      ))}

      <View style={styles.spacer} />

      {cloud ? (
        // A paired patient's phone has no exit: holding opens the family corner (PIN).
        <HoldButton
          label={t('family.hold')}
          hint={t('family.holdHint')}
          onHold={() => router.push('/patient/family')}
        />
      ) : (
        <HoldButton
          label={t('patient.holdToExit')}
          hint={t('patient.holdToExitHint')}
          onHold={() => {
            signOut();
            router.replace('/roles');
          }}
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: space.md, marginTop: space.sm },
  headerText: { flex: 1 },
  avatar: {
    width: 88,
    height: 88,
    borderRadius: radius.pill,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarEmoji: { fontSize: 52, lineHeight: 62 },
  dateCard: {
    backgroundColor: colors.primary,
    borderRadius: radius.lg,
    padding: space.lg,
    gap: space.xs,
  },
  spacer: { flex: 1 },
});
