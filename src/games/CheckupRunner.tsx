import { useCallback, useEffect, useRef, useState, type ComponentType } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { BigButton } from '@/components/BigButton';
import { Picture } from '@/components/Picture';
import { TopBarButton } from '@/components/TopBar';
import type { Trial } from '@/engine/scoring';
import { CHECKUP_STEPS, checkupTask, type CheckupGameId, type CheckupTask } from '@/engine/visits';
import { speak, stopSpeaking } from '@/services/tts';
import { useSettings } from '@/store/settings';
import { space } from '@/theme/tokens';

import { OrientationGame } from './orientation/OrientationGame';
import { ReactionTapGame } from './reaction-tap/ReactionTapGame';
import type { GameProps } from './types';
import { WordRecallGame } from './word-recall/WordRecallGame';

const TASK_COMPONENT: Record<CheckupGameId, ComponentType<GameProps>> = {
  orientation: OrientationGame,
  word_recall: WordRecallGame,
  reaction_tap: ReactionTapGame,
};

const TASK_ICON: Record<CheckupGameId, string> = { orientation: '📅', word_recall: '💡', reaction_tap: '🐟' };

/**
 * The ASHA visit check-up: CHECKUP_STEPS one after another, each with a short
 * spoken intro, at fixed difficulty. Results go to `onDone` (stored with the
 * visit), never to game_session, so everyday levels and trends are untouched.
 * Any task can be skipped (tired, can't see well…); it is then left out of the score.
 */
export function CheckupRunner({ patientId, onDone }: { patientId: string; onDone: (tasks: CheckupTask[]) => void }) {
  const { t } = useTranslation();
  const language = useSettings((s) => s.language);
  const say = useCallback((text: string) => speak(text, language), [language]);
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const trials = useRef<Trial[]>([]);
  const results = useRef<CheckupTask[]>([]);

  const step = CHECKUP_STEPS[index];
  const title = t(`games.${step.gameId}.title`);
  const instruction = t(`games.${step.gameId}.instruction`);

  useEffect(() => {
    if (!playing) say(instruction);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- speak when a task's intro shows
  }, [index, playing]);
  useEffect(() => () => stopSpeaking(), []);

  const finish = (done: Trial[] | null) => {
    stopSpeaking();
    results.current = [...results.current, checkupTask(step, done)];
    trials.current = [];
    if (index + 1 >= CHECKUP_STEPS.length) {
      onDone(results.current);
      return;
    }
    setIndex(index + 1);
    setPlaying(false);
  };

  const stepLabel = t('checkup.step', { n: index + 1, total: CHECKUP_STEPS.length });

  if (!playing) {
    return (
      <View style={styles.wrap}>
        <AppText variant="small" tone="muted" bold>
          {stepLabel}
        </AppText>
        <View style={styles.icon}>
          <Picture glyph={TASK_ICON[step.gameId]} size={96} />
        </View>
        <AppText variant="title" center>
          {title}
        </AppText>
        <AppText variant="large" center>
          {instruction}
        </AppText>
        <View style={styles.fill} />
        <BigButton size="large" icon="play" label={t('game.start')} onPress={() => setPlaying(true)} />
        <BigButton kind="secondary" icon="speaker" label={t('game.hearAgain')} onPress={() => say(instruction)} />
        <BigButton kind="ghost" icon="skip" label={t('checkup.skipTask')} onPress={() => finish(null)} />
      </View>
    );
  }

  const Task = TASK_COMPONENT[step.gameId];
  return (
    <View style={styles.wrap}>
      <View style={styles.topBar}>
        <AppText variant="small" tone="muted" bold style={styles.topLabel}>
          {stepLabel} · {title}
        </AppText>
        <TopBarButton icon="skip" label={t('checkup.skip')} onPress={() => finish(null)} />
      </View>
      <Task
        key={index}
        patientId={patientId}
        level={step.level}
        totalTrials={step.trials}
        onTrial={(trial) => {
          trials.current.push(trial);
        }}
        onProgress={() => {}}
        onComplete={() => finish(trials.current)}
        say={say}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, gap: space.md },
  fill: { flex: 1 },
  icon: { alignSelf: 'center' },
  topBar: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  topLabel: { flex: 1 },
});
