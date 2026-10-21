import { router } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { AppText } from '@/components/AppText';
import { BigButton } from '@/components/BigButton';
import { Picture } from '@/components/Picture';
import { TopBar, TopBarButton } from '@/components/TopBar';
import { nowMs } from '@/engine/clock';
import { Screen } from '@/components/Screen';
import { getDb } from '@/db/client';
import { useDbQuery } from '@/db/useDbQuery';
import type { Trial } from '@/engine/scoring';
import { speak, stopSpeaking } from '@/services/tts';
import { useSettings } from '@/store/settings';
import { colors, radius, space } from '@/theme/tokens';

import { finishSession, loadLevel } from './session';
import { Bloom } from './ui/Bloom';
import type { GameDefinition } from './types';

type Phase = 'intro' | 'play' | 'saving' | 'done';

type GameShellProps = {
  game: GameDefinition;
  patientId: string;
  patientName: string;
};

/**
 * Shared frame for every game: spoken intro → play → celebration.
 * Owns timing, trial collection, persistence and the adaptive level.
 */
export function GameShell({ game, patientId, patientName }: GameShellProps) {
  const { t } = useTranslation();
  const language = useSettings((s) => s.language);
  const say = useCallback((text: string) => speak(text, language), [language]);

  const [run, setRun] = useState(0);
  const [phase, setPhase] = useState<Phase>('intro');
  const [done, setDone] = useState(0);
  /** Set when the game reports its own progress (e.g. pairs found); else trials vs trialsPerSession. */
  const [custom, setCustom] = useState<{ done: number; total: number } | null>(null);
  const trials = useRef<Trial[]>([]);
  const startedAt = useRef(0);

  const { data: level } = useDbQuery((db) => loadLevel(db, patientId, game.id), [patientId, game.id, run]);

  const title = t(`games.${game.id}.title`);
  const instruction = t(`games.${game.id}.instruction`);

  useEffect(() => {
    if (phase === 'intro') say(instruction);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- speak when (re)entering intro
  }, [phase, run]);

  useEffect(() => () => stopSpeaking(), []);

  const start = () => {
    trials.current = [];
    startedAt.current = nowMs();
    setDone(0);
    setCustom(null);
    setPhase('play');
  };

  const onTrial = useCallback((trial: Trial) => {
    trials.current.push(trial);
    setDone(trials.current.length);
  }, []);

  const onProgress = useCallback((d: number, total: number) => setCustom({ done: d, total }), []);

  const onComplete = useCallback(async () => {
    if (level == null) return;
    setPhase('saving');
    await finishSession(getDb(), {
      game,
      patientId,
      level,
      startedAt: startedAt.current,
      trials: trials.current,
      completed: true,
    });
    setPhase('done');
    say(t('game.doneSpoken', { name: patientName, game: t(`games.${game.id}.title`) }));
  }, [game, level, patientId, patientName, say, t]);

  const stop = () => {
    stopSpeaking();
    if (phase === 'play' && trials.current.length > 0 && level != null) {
      finishSession(getDb(), {
        game,
        patientId,
        level,
        startedAt: startedAt.current,
        trials: trials.current,
        completed: false,
      }).catch((e) => console.warn('Failed to save stopped session', e));
    }
    router.back();
  };

  const playAgain = () => {
    setRun((r) => r + 1);
    setPhase('intro');
  };

  if (level == null) {
    return (
      <Screen scroll={false}>
        <ActivityIndicator size="large" color={colors.primary} style={styles.fill} />
      </Screen>
    );
  }

  if (phase === 'intro') {
    return (
      <Screen>
        <TopBar onBack={stop} backLabel={t('game.home')} backIcon="house" />
        <View style={styles.center}>
          <View style={[styles.iconCircle, { backgroundColor: game.tint }]}>
            <Picture glyph={game.icon} size={104} />
          </View>
          <AppText variant="hero" center>
            {title}
          </AppText>
          <AppText variant="large" tone="muted" center>
            {instruction}
          </AppText>
        </View>
        <View style={styles.fill} />
        <BigButton size="large" icon="play" label={t('game.start')} onPress={start} />
        <BigButton kind="secondary" icon="speaker" label={t('game.hearAgain')} onPress={() => say(instruction)} />
      </Screen>
    );
  }

  if (phase === 'play' || phase === 'saving') {
    const Game = game.Component;
    const progress = custom ?? { done, total: game.trialsPerSession };
    return (
      <Screen scroll={false} gap={space.md}>
        <View style={styles.topBar}>
          <TopBarButton icon="x" label={t('game.stop')} onPress={stop} />
          <AppText variant="body" weight="semibold" tone="muted">
            {t('game.progress', progress)}
          </AppText>
        </View>
        <ProgressBar done={progress.done} total={progress.total} />
        <Game
          key={run}
          patientId={patientId}
          level={level}
          totalTrials={game.trialsPerSession}
          onTrial={onTrial}
          onProgress={onProgress}
          onComplete={onComplete}
          say={say}
        />
      </Screen>
    );
  }

  // Levels are for the family's phone (D50): the patient hears a calm, specific "well done".
  return (
    <Screen>
      <View style={styles.fill} />
      <View style={styles.center}>
        <Bloom />
        <AppText variant="hero" center>
          {t('game.doneTitle', { name: patientName })}
        </AppText>
        <AppText variant="large" tone="muted" center>
          {t('game.doneLine', { game: title })}
        </AppText>
      </View>
      <View style={styles.fill} />
      <BigButton size="large" icon="house" label={t('game.home')} onPress={() => router.back()} />
      <BigButton kind="secondary" icon="redo" label={t('game.playAgain')} onPress={playAgain} />
    </Screen>
  );
}

/** A slim bar instead of a row of dots (dots wrapped onto two lines on long games). */
function ProgressBar({ done, total }: { done: number; total: number }) {
  const ratio = total > 0 ? Math.min(1, done / total) : 0;
  const width = useSharedValue(ratio);
  useEffect(() => {
    width.set(withTiming(ratio, { duration: 400 }));
  }, [ratio, width]);
  const fill = useAnimatedStyle(() => ({ width: `${width.get() * 100}%` }));
  return (
    <View style={styles.track} importantForAccessibility="no-hide-descendants">
      <Animated.View style={[styles.bar, fill]} />
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  center: { alignItems: 'center', gap: space.md },
  iconCircle: {
    width: 140,
    height: 140,
    borderRadius: radius.pill,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.md },
  track: { height: 10, borderRadius: radius.pill, backgroundColor: colors.surfaceMuted, overflow: 'hidden' },
  bar: { height: 10, borderRadius: radius.pill, backgroundColor: colors.primary },
});
