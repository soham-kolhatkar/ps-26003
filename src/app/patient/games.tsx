import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { Picture } from '@/components/Picture';
import { PressableScale } from '@/components/PressableScale';
import { Screen } from '@/components/Screen';
import { TopBar } from '@/components/TopBar';
import { useDbQuery } from '@/db/useDbQuery';
import { GAMES } from '@/games/registry';
import { useSession } from '@/store/session';
import { colors, radius, shadow, space } from '@/theme/tokens';

/** Every game the patient can play now, as big picture tiles two by two. */
export default function AllGames() {
  const { t } = useTranslation();
  const patientId = useSession((s) => s.patientId) ?? '';
  const { data: available } = useDbQuery(
    async (db) => {
      const ids: string[] = [];
      for (const g of GAMES) if (!g.isAvailable || (await g.isAvailable(db, patientId))) ids.push(g.id);
      return ids;
    },
    [patientId],
  );
  const games = GAMES.filter((g) => available?.includes(g.id));

  return (
    <Screen>
      <TopBar />
      <AppText variant="title">{t('patient.allGamesTitle')}</AppText>
      <View style={styles.grid}>
        {games.map((g) => (
          <PressableScale
            key={g.id}
            accessibilityRole="button"
            accessibilityLabel={t(`games.${g.id}.title`)}
            accessibilityHint={t(`games.${g.id}.description`)}
            onPress={() => router.push({ pathname: '/patient/game/[id]', params: { id: g.id } })}
            style={({ pressed }) => [styles.tile, pressed && styles.pressed]}
          >
            <View style={[styles.picture, { backgroundColor: g.tint }]}>
              <Picture glyph={g.icon} size={64} />
            </View>
            <AppText variant="body" weight="semibold" center>
              {t(`games.${g.id}.title`)}
            </AppText>
          </PressableScale>
        ))}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm + 4 },
  tile: {
    // Two per row: half the row minus half the gap.
    width: '47.5%',
    flexGrow: 1,
    minHeight: 172,
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.sm,
    padding: space.sm + 4,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    boxShadow: shadow.card,
  },
  pressed: { backgroundColor: colors.primaryWash },
  picture: { width: 96, height: 96, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },
});
