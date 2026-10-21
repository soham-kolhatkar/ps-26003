import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { Picture } from '@/components/Picture';
import { nowMs } from '@/engine/clock';
import { colors, radius, space } from '@/theme/tokens';

import { hapticGentle, hapticSuccess, randomPraise } from '../feedback';
import { afterSpeech, useAlive, wait } from '../pacing';
import type { GameProps } from '../types';
import type { RoutineStep } from './content';
import { Board } from '../ui/Board';
import { PictureTile } from '../ui/PictureTile';
import { Feedback } from '../ui/Prompt';
import { decisionsIn, makeRounds } from './rounds';

/** Pause after a step is spoken before the last card drops in. */
const BEFORE_LAST_CARD_MS = 400;
/** Minimum time the finished routine stays on screen. */
const SHOW_COMPLETE_MS = 1500;

/**
 * Daily routine sequencing: tap the steps of a familiar task in order.
 * Tap-to-place (no dragging) for elderly hands. Errorless: a wrong tap
 * highlights the correct next step. The final card is placed automatically.
 */
export function RoutineSequenceGame({ level, onTrial, onProgress, onComplete, say }: GameProps) {
  const { t } = useTranslation();
  const [rounds] = useState(() => makeRounds(level));
  const totalDecisions = rounds.reduce((n, r) => n + decisionsIn(r), 0);

  const [roundIdx, setRoundIdx] = useState(0);
  const round = rounds[roundIdx];
  const [placed, setPlaced] = useState<RoutineStep[]>(() => (round.anchored ? [round.steps[0]] : []));
  const [missed, setMissed] = useState(false);
  const [hintId, setHintId] = useState<string | null>(null);
  const [wrongId, setWrongId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const decisionsDone = useRef(0);
  const shownAt = useRef(0);
  const alive = useAlive();

  const stepText = (s: RoutineStep) => t(`routines.${round.routine.id}.steps.${s.id}`);
  const title = t(`routines.${round.routine.id}.title`);

  useEffect(() => {
    onProgress(decisionsDone.current, totalDecisions);
    shownAt.current = nowMs();
    say(`${title}. ${t(round.anchored ? 'games.routine_sequence.whatNext' : 'games.routine_sequence.whatFirst')}`);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- once per round
  }, [roundIdx]);

  const recordDecision = (correct: boolean) => {
    onTrial({ correct, reactionMs: nowMs() - shownAt.current });
    decisionsDone.current += 1;
    onProgress(decisionsDone.current, totalDecisions);
  };

  /**
   * Runs after the second-to-last card is placed. Each sentence finishes
   * before the next starts: step just placed → last card drops in and is
   * spoken → "…is complete!" → next routine.
   */
  const finishRound = async (justPlaced: RoutineStep) => {
    setBusy(true);
    await say(stepText(justPlaced));
    await wait(BEFORE_LAST_CARD_MS);
    if (!alive.current) return;

    const last = round.steps[round.steps.length - 1];
    setPlaced(round.steps);
    await say(stepText(last));
    if (!alive.current) return;

    hapticSuccess();
    await afterSpeech(
      say(`${t('games.routine_sequence.done', { routine: title })} ${randomPraise(t)}`),
      SHOW_COMPLETE_MS,
    );
    if (!alive.current) return;

    if (roundIdx + 1 >= rounds.length) {
      onComplete();
      return;
    }
    const next = rounds[roundIdx + 1];
    setPlaced(next.anchored ? [next.steps[0]] : []);
    setMissed(false);
    setHintId(null);
    setWrongId(null);
    setBusy(false);
    setRoundIdx(roundIdx + 1);
  };

  const onPick = (step: RoutineStep) => {
    if (busy || placed.some((p) => p.id === step.id)) return;
    const expected = round.steps[placed.length];

    if (step.id !== expected.id) {
      hapticGentle();
      setWrongId(step.id);
      setHintId(expected.id);
      if (!missed) {
        setMissed(true);
        recordDecision(false);
      }
      say(t('games.routine_sequence.hint', { step: stepText(expected) }));
      return;
    }

    if (!missed) recordDecision(true);
    const nextPlaced = [...placed, step];
    setPlaced(nextPlaced);
    setMissed(false);
    setHintId(null);
    setWrongId(null);
    shownAt.current = nowMs();

    if (round.steps.length - nextPlaced.length === 1) {
      // Only one card left: place it for the patient, after this step is heard.
      finishRound(step);
    } else {
      say(`${stepText(step)}. ${t('games.routine_sequence.whatNext')}`);
    }
  };

  const remaining = round.options.filter((o) => !placed.some((p) => p.id === o.id));
  const complete = placed.length === round.steps.length;

  return (
    <View style={styles.wrap}>
      <View style={styles.header}>
        <Picture glyph={round.routine.emoji} size={56} />
        <View style={styles.headerText}>
          <AppText variant="title">{title}</AppText>
          <AppText variant="body" tone="muted" accessibilityLiveRegion="polite">
            {complete
              ? t('games.routine_sequence.done', { routine: title })
              : t(placed.length === 0 ? 'games.routine_sequence.whatFirst' : 'games.routine_sequence.whatNext')}
          </AppText>
        </View>
      </View>

      <View style={styles.slots} accessibilityLabel={t('games.routine_sequence.yourOrder')}>
        {round.steps.map((_, i) => {
          const step = placed[i];
          const isNext = i === placed.length;
          return (
            <View
              key={i}
              style={[styles.slot, step && styles.slotFilled, isNext && !complete && styles.slotNext]}
              accessibilityLabel={step ? `${i + 1}. ${stepText(step)}` : `${i + 1}`}
            >
              <AppText variant="caption" tone="muted" weight="bold">
                {i + 1}
              </AppText>
              {step ? <Picture glyph={step.emoji} size={34} /> : <View style={styles.slotEmpty} />}
            </View>
          );
        })}
      </View>

      <Feedback text={placed.length > 0 ? stepText(placed[placed.length - 1]) : null} />

      <Board count={Math.max(1, remaining.length)} columns={2} maxSize={190}>
        {(size) =>
          remaining.map((step) => (
            <PictureTile
              key={`${roundIdx}-${step.id}`}
              glyph={step.emoji}
              label={stepText(step)}
              showLabel
              size={size}
              state={hintId === step.id ? 'hint' : wrongId === step.id ? 'dimmed' : 'idle'}
              onPress={() => onPick(step)}
            />
          ))
        }
      </Board>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, gap: space.md },
  header: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  headerText: { flex: 1 },
  slots: { flexDirection: 'row', gap: space.sm },
  slot: {
    flex: 1,
    height: 72,
    gap: 2,
    borderRadius: radius.md,
    borderWidth: 3,
    borderColor: 'transparent',
    backgroundColor: colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  slotFilled: { backgroundColor: colors.primarySoft },
  slotNext: { borderColor: colors.primary, borderStyle: 'dashed', backgroundColor: colors.surface },
  slotEmpty: { height: 34 },
});
