import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { BigButton } from '@/components/BigButton';
import { nowMs } from '@/engine/clock';
import { colors, radius, space } from '@/theme/tokens';

import { hapticGentle, hapticSuccess, randomPraise } from '../feedback';
import { afterSpeech, useAlive } from '../pacing';
import type { GameProps } from '../types';
import type { Item } from '../items';
import { levelParams, makeRounds } from './rounds';

/** Minimum time the solved round stays on screen (praise is always heard in full). */
const NEXT_ROUND_DELAY_MS = 1200;

/**
 * "Find the object": the app names an everyday object; the patient taps it.
 * Errorless: a wrong tap gently highlights the right picture and the patient
 * taps it to continue. Only the first try counts toward accuracy.
 */
export function ObjectRecognitionGame({ level, totalTrials, onTrial, onComplete, say }: GameProps) {
  const { t } = useTranslation();
  const [rounds] = useState(() => makeRounds(level, totalTrials));
  const [index, setIndex] = useState(0);
  const [missed, setMissed] = useState(false);
  const [wrongId, setWrongId] = useState<string | null>(null);
  const [solved, setSolved] = useState(false);
  const shownAt = useRef(0);
  const alive = useAlive();

  const round = rounds[index];
  const { showTargetPicture } = levelParams(level);
  const targetName = t(`items.${round.target.id}`);
  const prompt = t('games.object_recognition.prompt', { item: targetName });

  useEffect(() => {
    shownAt.current = nowMs();
    say(prompt);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- speak once per round
  }, [index]);

  const onPick = async (item: Item) => {
    if (solved) return;
    const reactionMs = nowMs() - shownAt.current;

    if (item.id !== round.target.id) {
      hapticGentle();
      setWrongId(item.id);
      if (!missed) {
        setMissed(true);
        onTrial({ correct: false, reactionMs });
      }
      say(t('games.object_recognition.hint', { item: targetName }));
      return;
    }

    if (!missed) onTrial({ correct: true, reactionMs });
    hapticSuccess();
    setSolved(true);
    await afterSpeech(say(randomPraise(t)), NEXT_ROUND_DELAY_MS);
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

  const columns = round.options.length > 4 ? 3 : 2;

  return (
    <View style={styles.wrap}>
      <View style={styles.prompt}>
        {showTargetPicture ? (
          <AppText style={styles.promptEmoji} importantForAccessibility="no">
            {round.target.emoji}
          </AppText>
        ) : null}
        <AppText variant="title" center>
          {prompt}
        </AppText>
        <BigButton kind="ghost" icon="🔊" label={t('game.hearAgain')} onPress={() => say(prompt)} />
      </View>

      <View style={styles.grid}>
        {round.options.map((item) => {
          const isTarget = item.id === round.target.id;
          const highlight = isTarget && (missed || solved);
          return (
            <Pressable
              key={`${index}-${item.id}`}
              accessibilityRole="button"
              accessibilityLabel={t(`items.${item.id}`)}
              onPress={() => onPick(item)}
              style={({ pressed }) => [
                styles.tile,
                { flexBasis: columns === 3 ? '30%' : '46%' },
                pressed && styles.tilePressed,
                highlight && (solved ? styles.tileSolved : styles.tileHint),
                wrongId === item.id && !isTarget && styles.tileWrong,
              ]}
            >
              <AppText style={styles.tileEmoji} importantForAccessibility="no">
                {item.emoji}
              </AppText>
              {solved && isTarget ? (
                <AppText variant="large" bold tone="primary">
                  ✓ {t(`items.${item.id}`)}
                </AppText>
              ) : null}
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
  promptEmoji: { fontSize: 56, lineHeight: 68 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: space.md, justifyContent: 'center' },
  tile: {
    flexGrow: 1,
    minHeight: 132,
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.xs,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 3,
    borderColor: colors.border,
  },
  tilePressed: { backgroundColor: colors.surfaceMuted },
  tileHint: { borderColor: colors.warning, backgroundColor: colors.warningSoft },
  tileSolved: { borderColor: colors.success, backgroundColor: colors.successSoft },
  tileWrong: { opacity: 0.45 },
  tileEmoji: { fontSize: 64, lineHeight: 76 },
});
