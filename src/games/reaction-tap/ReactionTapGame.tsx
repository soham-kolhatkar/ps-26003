import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { nowMs } from '@/engine/clock';
import { colors, radius, space } from '@/theme/tokens';

import { hapticGentle, hapticSuccess } from '../feedback';
import { afterSpeech, useAlive, wait } from '../pacing';
import type { GameProps } from '../types';
import { gridShape, levelParams, makeTrials } from './rounds';

/** How long the "caught it" tick stays before the next wait. */
const HIT_PAUSE_MS = 700;
const WAITED_PAUSE_MS = 1200;

type Phase = 'ready' | 'waiting' | 'shown' | 'feedback';
type Feedback = 'hit' | 'waited' | 'missed' | 'tappedNoGo';

/**
 * "Catch the fish" (attention / reaction time): after a random wait a fish
 * pops up somewhere in the pond; the patient taps it as quickly as possible.
 * From level 3 a frog, duck or leaf sometimes appears instead and should be
 * left alone (go / no-go). Errorless: a missed fish just "swims away"; a
 * wrong tap gets a gentle reminder. Reaction time = appearance → tap.
 */
export function ReactionTapGame({ level, totalTrials, onTrial, onComplete, say }: GameProps) {
  const { t } = useTranslation();
  const [plans] = useState(() => makeTrials(level, totalTrials));
  const { cells, windowMs, noGoRate } = levelParams(level);
  const { rows, cols } = gridShape(cells);
  const [index, setIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>('ready');
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const shownAt = useRef(0);
  /** True once the current trial has an outcome (guards tap vs. timeout races). */
  const settled = useRef(false);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const alive = useAlive();

  const plan = plans[index];

  const clearTimers = () => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
  };

  const begin = (i: number) => {
    if (!alive.current) return;
    settled.current = false;
    setIndex(i);
    setFeedback(null);
    setPhase('waiting');
    timers.current.push(
      setTimeout(() => {
        if (!alive.current) return;
        shownAt.current = nowMs();
        setPhase('shown');
        timers.current.push(setTimeout(() => settle(i, null), windowMs));
      }, plans[i].delayMs),
    );
  };

  const next = (i: number) => {
    if (!alive.current) return;
    if (i + 1 >= plans.length) onComplete();
    else begin(i + 1);
  };

  /** One outcome per trial: `reactionMs` is set for a tap, null when time ran out. */
  const settle = async (i: number, reactionMs: number | null) => {
    if (settled.current) return;
    settled.current = true;
    clearTimers();
    const { go } = plans[i];
    const tapped = reactionMs != null;
    setPhase('feedback');
    if (go && tapped) {
      hapticSuccess();
      setFeedback('hit');
      onTrial({ correct: true, reactionMs });
      await wait(HIT_PAUSE_MS);
    } else if (!go && !tapped) {
      setFeedback('waited');
      onTrial({ correct: true, reactionMs: null });
      await wait(WAITED_PAUSE_MS);
    } else if (go) {
      setFeedback('missed');
      onTrial({ correct: false, reactionMs: null });
      await afterSpeech(say(t('games.reaction_tap.missed')), HIT_PAUSE_MS);
    } else {
      hapticGentle();
      setFeedback('tappedNoGo');
      onTrial({ correct: false, reactionMs: null });
      await afterSpeech(say(t('games.reaction_tap.tappedNoGo')), HIT_PAUSE_MS);
    }
    next(i);
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      await say(t(noGoRate > 0 ? 'games.reaction_tap.readyNoGo' : 'games.reaction_tap.ready'));
      if (!cancelled) begin(0);
    })();
    return () => {
      cancelled = true;
      timers.current.forEach(clearTimeout);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run once per game
  }, []);

  const onCellPress = (cell: number) => {
    // Taps before anything shows, or on an empty spot, are simply ignored.
    if (phase !== 'shown' || cell !== plan.cell) return;
    settle(index, nowMs() - shownAt.current);
  };

  const status =
    phase === 'ready'
      ? t(noGoRate > 0 ? 'games.reaction_tap.readyNoGo' : 'games.reaction_tap.ready')
      : feedback
        ? t(`games.reaction_tap.${feedback}`)
        : t('games.reaction_tap.watch');

  const showing = phase === 'shown' || (phase === 'feedback' && (feedback === 'hit' || feedback === 'tappedNoGo'));
  const emojiSize = cells === 1 ? 120 : cells <= 4 ? 84 : 64;

  return (
    <View style={styles.wrap}>
      <View style={[styles.status, feedback === 'hit' || feedback === 'waited' ? styles.statusGood : null]}>
        <AppText variant="large" bold center accessibilityLiveRegion="polite">
          {feedback === 'hit' || feedback === 'waited' ? '✓ ' : ''}
          {status}
        </AppText>
      </View>

      <View style={styles.pond}>
        {Array.from({ length: rows }, (_, r) => (
          <View key={r} style={styles.pondRow}>
            {Array.from({ length: cols }, (_, c) => {
              const cell = r * cols + c;
              const here = showing && cell === plan.cell;
              return (
                <Pressable
                  key={cell}
                  accessibilityRole="button"
                  accessibilityLabel={here ? t(`items.${plan.shown.id}`) : t('games.reaction_tap.water')}
                  onPressIn={() => onCellPress(cell)}
                  style={[styles.cell, here && feedback === 'hit' && styles.cellHit]}
                >
                  {here ? (
                    <AppText
                      style={{ fontSize: emojiSize, lineHeight: emojiSize * 1.2 }}
                      importantForAccessibility="no"
                    >
                      {plan.shown.emoji}
                    </AppText>
                  ) : null}
                </Pressable>
              );
            })}
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, gap: space.md },
  status: {
    minHeight: 88,
    justifyContent: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: space.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  statusGood: { borderColor: colors.success, backgroundColor: colors.successSoft },
  pond: {
    flex: 1,
    gap: space.sm,
    padding: space.sm,
    backgroundColor: colors.water,
    borderRadius: radius.lg,
    borderWidth: 3,
    borderColor: colors.waterEdge,
  },
  pondRow: { flex: 1, flexDirection: 'row', gap: space.sm },
  cell: {
    flex: 1,
    minHeight: 96,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
    backgroundColor: colors.waterLight,
  },
  cellHit: { backgroundColor: colors.successSoft },
});
