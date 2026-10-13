import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { BigButton } from '@/components/BigButton';
import { nowMs } from '@/engine/clock';
import { colors, radius, space } from '@/theme/tokens';

import { hapticGentle, hapticSuccess, randomPraise } from '../feedback';
import type { Item } from '../items';
import { afterSpeech, useAlive } from '../pacing';
import type { GameProps } from '../types';
import { makeRounds } from './rounds';

/** Minimum time the solved round stays on screen (the explanation is always heard in full). */
const NEXT_ROUND_DELAY_MS = 1500;

/**
 * "Odd one out": all pictures but one belong together (fruits, animals…);
 * the patient taps the one that doesn't. Errorless: a wrong tap highlights
 * the odd one; after solving, the app says why ("The cow is an animal. The
 * others are all fruits."). Only the first try counts toward accuracy.
 */
export function OddOneOutGame({ level, totalTrials, onTrial, onComplete, say }: GameProps) {
  const { t } = useTranslation();
  const [rounds] = useState(() => makeRounds(level, totalTrials));
  const [index, setIndex] = useState(0);
  const [missed, setMissed] = useState(false);
  const [wrongId, setWrongId] = useState<string | null>(null);
  const [solved, setSolved] = useState(false);
  const shownAt = useRef(0);
  const alive = useAlive();

  const round = rounds[index];
  const oddName = t(`items.${round.odd.id}`);
  const prompt = t('games.odd_one_out.prompt');
  const explain = t('games.odd_one_out.explain', {
    item: oddName,
    kind: t(`categories.one.${round.odd.category}`),
    group: t(`categories.plural.${round.group}`),
  });

  useEffect(() => {
    shownAt.current = nowMs();
    say(prompt);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- speak once per round
  }, [index]);

  const onPick = async (item: Item) => {
    if (solved) return;
    const reactionMs = nowMs() - shownAt.current;

    if (item.id !== round.odd.id) {
      hapticGentle();
      setWrongId(item.id);
      if (!missed) {
        setMissed(true);
        onTrial({ correct: false, reactionMs });
      }
      say(t('games.odd_one_out.hint', { item: oddName }));
      return;
    }

    if (!missed) onTrial({ correct: true, reactionMs });
    hapticSuccess();
    setSolved(true);
    await afterSpeech(say(`${randomPraise(t)} ${explain}`), NEXT_ROUND_DELAY_MS);
    if (!alive.current) return;
    if (index + 1 >= rounds.length) {
      onComplete();
      return;
    }
    setIndex(index + 1);
    setMissed(false);
    setWrongId(null);
    setSolved(false);
  };

  return (
    <View style={styles.wrap}>
      <View style={styles.prompt}>
        {/* After solving, the card explains why (no extra height: play screens don't scroll). */}
        <AppText variant={solved ? 'large' : 'title'} bold={solved} center accessibilityLiveRegion="polite">
          {solved ? explain : prompt}
        </AppText>
        <BigButton kind="ghost" icon="🔊" label={t('game.hearAgain')} onPress={() => say(solved ? explain : prompt)} />
      </View>

      <View style={styles.grid}>
        {round.options.map((item) => {
          const isOdd = item.id === round.odd.id;
          const highlight = isOdd && (missed || solved);
          const name = t(`items.${item.id}`);
          return (
            <Pressable
              key={`${index}-${item.id}`}
              accessibilityRole="button"
              accessibilityLabel={name}
              onPress={() => onPick(item)}
              style={({ pressed }) => [
                styles.tile,
                pressed && styles.tilePressed,
                highlight && (solved ? styles.tileSolved : styles.tileHint),
                solved && !isOdd && styles.tileGroup,
                wrongId === item.id && !solved && styles.tileWrong,
              ]}
            >
              <AppText style={styles.tileEmoji} importantForAccessibility="no">
                {item.emoji}
              </AppText>
              <AppText variant="body" center bold={solved && isOdd} tone={solved && isOdd ? 'primary' : 'default'}>
                {solved && isOdd ? `✓ ${name}` : name}
              </AppText>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, gap: space.lg },
  prompt: {
    alignItems: 'center',
    gap: space.xs,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: space.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  // Always two columns so names fit at 22sp; an odd last tile stays centred, same width.
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: space.md, justifyContent: 'center' },
  tile: {
    width: '46%',
    minHeight: 112,
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.xs,
    padding: space.sm,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 3,
    borderColor: colors.border,
  },
  tilePressed: { backgroundColor: colors.surfaceMuted },
  tileHint: { borderColor: colors.warning, backgroundColor: colors.warningSoft },
  tileSolved: { borderColor: colors.success, backgroundColor: colors.successSoft },
  tileGroup: { opacity: 0.6 },
  tileWrong: { opacity: 0.45 },
  tileEmoji: { fontSize: 52, lineHeight: 62 },
});
