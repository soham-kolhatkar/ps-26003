import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { nowMs } from '@/engine/clock';
import { colors, radius, space } from '@/theme/tokens';

import { hapticGentle, hapticSuccess, randomPraise } from '../feedback';
import { afterSpeech, useAlive, wait } from '../pacing';
import type { GameProps } from '../types';
import type { RoutineStep } from './content';
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
        <AppText style={styles.headerEmoji} importantForAccessibility="no">
          {round.routine.emoji}
        </AppText>
        <View style={styles.headerText}>
          <AppText variant="title">{title}</AppText>
          <AppText variant="body" tone="muted">
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
              <AppText variant="caption" tone="muted" bold>
                {i + 1}
              </AppText>
              <AppText style={styles.slotEmoji} importantForAccessibility="no">
                {step ? step.emoji : ' '}
              </AppText>
            </View>
          );
        })}
      </View>

      {placed.length > 0 ? (
        <AppText variant="body" tone="primary" bold center>
          ✓ {stepText(placed[placed.length - 1])}
        </AppText>
      ) : null}

      <ScrollView contentContainerStyle={styles.options}>
        {remaining.map((step) => (
          <Pressable
            key={`${roundIdx}-${step.id}`}
            accessibilityRole="button"
            accessibilityLabel={stepText(step)}
            onPress={() => onPick(step)}
            style={({ pressed }) => [
              styles.option,
              pressed && styles.optionPressed,
              hintId === step.id && styles.optionHint,
              wrongId === step.id && styles.optionWrong,
            ]}
          >
            <AppText style={styles.optionEmoji} importantForAccessibility="no">
              {step.emoji}
            </AppText>
            <AppText variant="body" bold center>
              {stepText(step)}
            </AppText>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, gap: space.md },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: space.md,
  },
  headerEmoji: { fontSize: 48, lineHeight: 58 },
  headerText: { flex: 1 },
  slots: { flexDirection: 'row', gap: space.sm },
  slot: {
    flex: 1,
    aspectRatio: 0.8,
    maxHeight: 88,
    borderRadius: radius.md,
    borderWidth: 2,
    borderColor: colors.border,
    backgroundColor: colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  slotFilled: { backgroundColor: colors.successSoft, borderColor: colors.success },
  slotNext: { borderColor: colors.primary, borderStyle: 'dashed', borderWidth: 3, backgroundColor: colors.surface },
  slotEmoji: { fontSize: 30, lineHeight: 38 },
  options: { flexDirection: 'row', flexWrap: 'wrap', gap: space.md, paddingBottom: space.lg },
  option: {
    flexBasis: '46%',
    flexGrow: 1,
    minHeight: 120,
    padding: space.sm,
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.xs,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 3,
    borderColor: colors.border,
  },
  optionPressed: { backgroundColor: colors.surfaceMuted },
  optionHint: { borderColor: colors.warning, backgroundColor: colors.warningSoft },
  optionWrong: { opacity: 0.45 },
  optionEmoji: { fontSize: 44, lineHeight: 54 },
});
