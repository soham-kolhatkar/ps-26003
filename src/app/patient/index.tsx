import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { BigButton } from '@/components/BigButton';
import { GameTile } from '@/components/GameTile';
import { HoldButton } from '@/components/HoldButton';
import { Picture } from '@/components/Picture';
import { Screen } from '@/components/Screen';
import { TodayReminders } from '@/components/TodayReminders';
import { TopBarButton } from '@/components/TopBar';
import { lastPlayedByGame } from '@/db/repos/games';
import { displayName, getPatient } from '@/db/repos/patients';
import { listFamilyContacts } from '@/db/repos/sos';
import { useDbQuery } from '@/db/useDbQuery';
import { startOfDay } from '@/engine/reminders';
import { pickTodaysGames } from '@/engine/todaysGames';
import { GAMES } from '@/games/registry';
import { dayPart, formatLongDate, formatTime, GREETING_KEY } from '@/services/datetime';
import { callForHelp } from '@/services/sos';
import { speak } from '@/services/tts';
import { useDevice } from '@/store/device';
import { useSession } from '@/store/session';
import { useSettings } from '@/store/settings';
import { space } from '@/theme/tokens';

/** Re-renders every minute so the clock and greeting stay current. */
function useNow(): Date {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);
  return now;
}

/** A picture for the part of the day: sunrise, sun, sunset, moon (orientation without reading). */
function timeOfDayGlyph(now: Date): string {
  const h = now.getHours();
  if (h >= 5 && h < 11) return '🌅';
  if (h >= 11 && h < 16) return '☀️';
  if (h >= 16 && h < 19) return '🌇';
  return '🌙';
}

/**
 * The patient's home (D50): help on top (call family, read aloud), who and when, what is
 * due, today's three games and the rest one tap away. Fits one screen.
 */
export default function PatientHome() {
  const { t } = useTranslation();
  const patientId = useSession((s) => s.patientId) ?? '';
  const signOut = useSession((s) => s.signOut);
  const cloud = useDevice((s) => s.mode) === 'cloud';
  const language = useSettings((s) => s.language);
  const now = useNow();
  const today = startOfDay(now.getTime());
  const { data } = useDbQuery(
    async (db) => {
      const available: string[] = [];
      for (const g of GAMES) if (!g.isAvailable || (await g.isAvailable(db, patientId))) available.push(g.id);
      return {
        patient: await getPatient(db, patientId),
        contacts: await listFamilyContacts(db, patientId),
        available,
        todays: pickTodaysGames(available, await lastPlayedByGame(db, patientId, today), today),
      };
    },
    [patientId, today],
  );

  const name = data?.patient ? displayName(data.patient) : '';
  const greeting = t(GREETING_KEY[dayPart(now)], { name });
  const date = formatLongDate(now, language);
  const time = formatTime(now, language);
  const contacts = data?.contacts ?? [];
  const todays = (data?.todays ?? []).map((id) => GAMES.find((g) => g.id === id)!).filter(Boolean);

  const sos = () => {
    if (contacts.length === 1) callForHelp(patientId, contacts[0]);
    else router.push('/patient/call');
  };

  return (
    <Screen gap={space.md}>
      <View style={styles.top}>
        {contacts.length ? (
          <TopBarButton
            icon="phone"
            danger
            label={
              contacts.length === 1 ? t('sos.call', { name: contacts[0].name.split(' ')[0] }) : t('sos.callFamily')
            }
            onPress={sos}
            testID="sos-button"
          />
        ) : (
          <View />
        )}
        <TopBarButton
          icon="speaker"
          tonal
          label={t('common.speak')}
          onPress={() => speak(t('patient.greetingSpoken', { greeting, date }), language)}
        />
      </View>

      <View
        style={styles.header}
        accessible
        accessibilityLabel={`${greeting} ${t('patient.todayIs', { date })}, ${time}`}
      >
        <Picture glyph={timeOfDayGlyph(now)} size={64} />
        <View style={styles.headerText}>
          <AppText variant="title">{greeting}</AppText>
          <AppText variant="body" tone="muted">
            {date} · {time}
          </AppText>
        </View>
      </View>

      {patientId ? <TodayReminders patientId={patientId} now={now} language={language} /> : null}

      <AppText variant="large" weight="bold">
        {t('patient.todaysGames')}
      </AppText>
      <View style={styles.games}>
        {todays.map((game) => (
          <GameTile
            key={game.id}
            icon={game.icon}
            tint={game.tint}
            title={t(`games.${game.id}.title`)}
            description={t(`games.${game.id}.description`)}
            onPress={() => router.push({ pathname: '/patient/game/[id]', params: { id: game.id } })}
          />
        ))}
      </View>
      {(data?.available.length ?? 0) > todays.length ? (
        <BigButton
          kind="secondary"
          icon="grid"
          label={t('patient.allGames', { count: data!.available.length })}
          onPress={() => router.push('/patient/games')}
        />
      ) : null}

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
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.sm },
  header: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  headerText: { flex: 1, gap: 2 },
  games: { gap: space.sm + 4 },
  spacer: { flex: 1 },
});
