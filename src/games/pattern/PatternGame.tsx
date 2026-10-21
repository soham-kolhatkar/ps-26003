import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, useWindowDimensions, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { Picture } from '@/components/Picture';
import { nowMs } from '@/engine/clock';
import { colors, radius, shadow, space } from '@/theme/tokens';

import { hapticGentle, hapticSuccess } from '../feedback';
import type { Item } from '../items';
import { afterSpeech, useAlive } from '../pacing';
import type { GameProps } from '../types';
import { Board } from '../ui/Board';
import { PictureTile, type TileState } from '../ui/PictureTile';
import { Feedback, Prompt } from '../ui/Prompt';
import { makeRounds } from './rounds';

/** Minimum time the completed row stays on screen. */
const NEXT_ROUND_DELAY_MS = 1500;

/**
 * "Complete the pattern": a row of pictures repeats (banana, cup, banana,
 * cup…); the patient taps the picture that belongs in the empty place.
 * The row is laid out one repeat per line so the rule lines up vertically.
 * Errorless: a wrong tap highlights the answer. Only the first try counts.
 */
export function PatternGame({ level, totalTrials, onTrial, onComplete, say }: GameProps) {
  const { t } = useTranslation();
  const { width } = useWindowDimensions();
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
    await afterSpeech(say(t('feedback.rightItem', { item: answerName })), NEXT_ROUND_DELAY_MS);
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

  const tileState = (item: Item): TileState => {
    if (item.id === round.answer.id) return solved ? 'solved' : missed ? 'hint' : 'idle';
    return wrongId === item.id ? 'dimmed' : 'idle';
  };
  // One repeat per line, so the rule lines up vertically; slots as big as the width allows.
  const slot = Math.min(96, Math.floor((width - space.lg * 2 - space.sm * (round.unit - 1)) / round.unit));

  return (
    <View style={styles.wrap}>
      <Prompt text={question} onHear={() => say(prompt)} />

      <View style={styles.row} accessible accessibilityLabel={spokenRow}>
        {lines.map((line, li) => (
          <View key={li} style={styles.line}>
            {line.map((it, j) => {
              const i = li * round.unit + j;
              const isGap = i === round.gap;
              return (
                <View
                  key={i}
                  style={[
                    styles.slot,
                    { width: slot, height: slot },
                    isGap && (solved ? styles.slotSolved : styles.slotGap),
                  ]}
                >
                  {isGap && !solved ? (
                    <AppText variant="title" tone="primary">
                      ?
                    </AppText>
                  ) : (
                    <Picture glyph={it.emoji} size={Math.round(slot * 0.66)} />
                  )}
                </View>
              );
            })}
          </View>
        ))}
      </View>

      <Board count={round.options.length} columns={round.options.length} maxSize={150}>
        {(size) =>
          round.options.map((item) => (
            <PictureTile
              key={`${index}-${item.id}`}
              glyph={item.emoji}
              label={t(`items.${item.id}`)}
              size={size}
              state={tileState(item)}
              onPress={() => onPick(item)}
            />
          ))
        }
      </Board>
      <Feedback text={solved ? t('feedback.rightItem', { item: answerName }) : null} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, gap: space.md },
  row: { alignItems: 'center', gap: space.sm },
  line: { flexDirection: 'row', gap: space.sm },
  slot: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 3,
    borderColor: 'transparent',
    boxShadow: shadow.card,
  },
  slotGap: {
    borderStyle: 'dashed',
    borderColor: colors.primary,
    backgroundColor: colors.primaryWash,
    boxShadow: 'none',
  },
  slotSolved: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
});
