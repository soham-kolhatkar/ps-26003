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

/** Minimum time the completed row stays on screen. */
const NEXT_ROUND_DELAY_MS = 1500;
const SLOT = 68;

/**
 * "Complete the pattern": a row of pictures repeats (banana, cup, banana,
 * cup…); the patient taps the picture that belongs in the empty place.
 * The row is laid out one repeat per line so the rule lines up vertically.
 * Errorless: a wrong tap highlights the answer. Only the first try counts.
 */
export function PatternGame({ level, totalTrials, onTrial, onComplete, say }: GameProps) {
  const { t } = useTranslation();
  const [rounds] = useState(() => makeRounds(level, totalTrials));
  const [index, setIndex] = useState(0);
  const [missed, setMissed] = useState(false);
  const [wrongId, setWrongId] = useState<string | null>(null);
  const [solved, setSolved] = useState(false);
  const shownAt = useRef(0);
  const alive = useAlive();

  const round = rounds[index];
  const answerName = t(`items.${round.answer.id}`);
  const atEnd = round.gap === round.row.length - 1;
  const question = t(atEnd ? 'games.pattern.whatNext' : 'games.pattern.whatMissing');
  // Read the row aloud too: it supports patients who see poorly.
  const spokenRow = round.row
    .map((it, i) => (i === round.gap && !solved ? t('games.pattern.blank') : t(`items.${it.id}`)))
    .join(', ');
  const prompt = `${spokenRow}. ${question}`;

  useEffect(() => {
    shownAt.current = nowMs();
    say(prompt);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- speak once per round
  }, [index]);

  const onPick = async (item: Item) => {
    if (solved) return;
    const reactionMs = nowMs() - shownAt.current;

    if (item.id !== round.answer.id) {
      hapticGentle();
      setWrongId(item.id);
      if (!missed) {
        setMissed(true);
        onTrial({ correct: false, reactionMs });
      }
      say(t('games.pattern.hint', { item: answerName }));
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

  const lines: Item[][] = [];
  for (let i = 0; i < round.row.length; i += round.unit) lines.push(round.row.slice(i, i + round.unit));

  return (
    <View style={styles.wrap}>
      <View style={styles.prompt}>
        <AppText variant="title" center>
          {question}
        </AppText>
        <BigButton kind="ghost" icon="🔊" label={t('game.hearAgain')} onPress={() => say(prompt)} />
      </View>

      <View style={styles.row} accessible accessibilityLabel={spokenRow}>
        {lines.map((line, li) => (
          <View key={li} style={styles.line}>
            {line.map((it, j) => {
              const i = li * round.unit + j;
              const isGap = i === round.gap;
              return (
                <View key={i} style={[styles.slot, isGap && (solved ? styles.slotSolved : styles.slotGap)]}>
                  <AppText style={isGap && !solved ? styles.gapMark : styles.slotEmoji}>
                    {isGap && !solved ? '?' : it.emoji}
                  </AppText>
                </View>
              );
            })}
          </View>
        ))}
      </View>

      <View style={styles.options}>
        {round.options.map((item) => {
          const isAnswer = item.id === round.answer.id;
          return (
            <Pressable
              key={`${index}-${item.id}`}
              accessibilityRole="button"
              accessibilityLabel={t(`items.${item.id}`)}
              onPress={() => onPick(item)}
              style={({ pressed }) => [
                styles.option,
                pressed && styles.optionPressed,
                isAnswer && (missed || solved) && (solved ? styles.optionSolved : styles.optionHint),
                wrongId === item.id && !isAnswer && styles.optionWrong,
              ]}
            >
              <AppText style={styles.optionEmoji} importantForAccessibility="no">
                {item.emoji}
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
  row: { alignItems: 'center', gap: space.sm },
  line: { flexDirection: 'row', gap: space.sm },
  slot: {
    width: SLOT,
    height: SLOT,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.border,
  },
  slotGap: { borderStyle: 'dashed', borderWidth: 3, borderColor: colors.primary, backgroundColor: colors.primarySoft },
  slotSolved: { borderWidth: 3, borderColor: colors.success, backgroundColor: colors.successSoft },
  slotEmoji: { fontSize: 42, lineHeight: 52 },
  gapMark: { fontSize: 40, lineHeight: 50, fontWeight: '700', color: colors.primary },
  options: { flexDirection: 'row', gap: space.md, justifyContent: 'center' },
  option: {
    flex: 1,
    maxWidth: 120,
    minHeight: 96,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 3,
    borderColor: colors.border,
  },
  optionPressed: { backgroundColor: colors.surfaceMuted },
  optionHint: { borderColor: colors.warning, backgroundColor: colors.warningSoft },
  optionSolved: { borderColor: colors.success, backgroundColor: colors.successSoft },
  optionWrong: { opacity: 0.45 },
  optionEmoji: { fontSize: 52, lineHeight: 62 },
});
