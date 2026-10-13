import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { BigButton } from '@/components/BigButton';
import { nowMs } from '@/engine/clock';
import { LANGUAGES } from '@/i18n';
import { useSettings } from '@/store/settings';
import { colors, radius, space } from '@/theme/tokens';

import { hapticGentle, hapticSuccess, randomPraise } from '../feedback';
import { afterSpeech, useAlive } from '../pacing';
import type { GameProps } from '../types';
import { makeQuestions, optionLabel } from './rounds';

const NEXT_DELAY_MS = 1200;

/**
 * Orientation to time (check-up task): "Which day is it today?", month, year.
 * Big answer buttons; a wrong answer gently shows the right one (it is a
 * check-up, but still never a fail screen). One trial per question.
 */
export function OrientationGame({ onTrial, onComplete, say }: GameProps) {
  const { t } = useTranslation();
  const language = useSettings((s) => s.language);
  const locale = LANGUAGES[language].locale;
  const [questions] = useState(() => makeQuestions(nowMs()));
  const [index, setIndex] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const shownAt = useRef(0);
  const alive = useAlive();

  const q = questions[index];
  const prompt = t(`games.orientation.${q.kind}`);
  const answerLabel = optionLabel(q.kind, q.answer, locale);

  useEffect(() => {
    shownAt.current = nowMs();
    say(prompt);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- speak once per question
  }, [index]);

  const onPick = async (value: number) => {
    if (picked != null) return;
    const correct = value === q.answer;
    onTrial({ correct, reactionMs: nowMs() - shownAt.current });
    setPicked(value);
    if (correct) hapticSuccess();
    else hapticGentle();
    const line = correct ? randomPraise(t) : t('games.orientation.reveal', { answer: answerLabel });
    await afterSpeech(say(line), NEXT_DELAY_MS);
    if (!alive.current) return;
    if (index + 1 >= questions.length) {
      onComplete();
      return;
    }
    setIndex(index + 1);
    setPicked(null);
  };

  return (
    <View style={styles.wrap}>
      <View style={styles.prompt}>
        <AppText variant="title" center>
          {prompt}
        </AppText>
        <BigButton kind="ghost" icon="🔊" label={t('game.hearAgain')} onPress={() => say(prompt)} />
      </View>
      {q.options.map((value) => {
        const isAnswer = value === q.answer;
        const show = picked != null && (isAnswer || value === picked);
        return (
          <View
            key={`${index}-${value}`}
            style={[styles.option, show && (isAnswer ? styles.optionRight : styles.optionPicked)]}
          >
            <BigButton
              size="large"
              kind="secondary"
              icon={show && isAnswer ? '✓' : undefined}
              label={optionLabel(q.kind, value, locale)}
              onPress={() => onPick(value)}
            />
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, gap: space.md },
  prompt: {
    alignItems: 'center',
    gap: space.xs,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: space.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  option: { borderRadius: radius.lg, borderWidth: 3, borderColor: 'transparent' },
  optionRight: { borderColor: colors.success, backgroundColor: colors.successSoft },
  optionPicked: { opacity: 0.5 },
});
