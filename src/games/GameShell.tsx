import { router } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { BigButton } from '@/components/BigButton';
import { nowMs } from '@/engine/clock';
import { Screen } from '@/components/Screen';
import { getDb } from '@/db/client';
import { useDbQuery } from '@/db/useDbQuery';
import type { Trial } from '@/engine/scoring';
import { speak, stopSpeaking } from '@/services/tts';
import { useSettings } from '@/store/settings';
import { colors, radius, space } from '@/theme/tokens';

import { starsFor } from './feedback';
import { finishSession, loadLevel, type FinishedSession } from './session';
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
  const [result, setResult] = useState<FinishedSession | null>(null);
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
    setResult(null);
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
    const finished = await finishSession(getDb(), {
      game,
      patientId,
      level,
      startedAt: startedAt.current,
      trials: trials.current,
      completed: true,
    });
    setResult(finished);
    setPhase('done');
    say(t('game.doneSpoken', { name: patientName }));
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
        <BigButton kind="ghost" icon="🏠" label={t('game.home')} onPress={stop} />
        <View style={styles.center}>
          <View style={styles.iconCircle}>
            <AppText style={styles.bigIcon} importantForAccessibility="no">
              {game.icon}
            </AppText>
          </View>
          <AppText variant="hero" center>
            {title}
          </AppText>
          <AppText variant="large" tone="muted" center>
            {instruction}
          </AppText>
          <View style={styles.chip}>
            <AppText variant="small" tone="primary" bold>
              {'⭐'.repeat(Math.min(level, game.maxLevel))} {t('game.level', { level })}
            </AppText>
          </View>
        </View>
        <View style={styles.fill} />
        <BigButton size="large" icon="▶️" label={t('game.start')} onPress={start} />
        <BigButton kind="secondary" icon="🔊" label={t('game.hearAgain')} onPress={() => say(instruction)} />
      </Screen>
    );
  }

  if (phase === 'play' || phase === 'saving') {
    const Game = game.Component;
    const progress = custom ?? { done, total: game.trialsPerSession };
    return (
      <Screen scroll={false}>
        <View style={styles.topBar}>
          <View style={styles.stop}>
            <BigButton kind="secondary" icon="✖️" label={t('game.stop')} onPress={stop} />
          </View>
          <Progress done={progress.done} total={progress.total} label={t('game.progress', progress)} />
        </View>
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

  const stars = starsFor(result?.stats.accuracy ?? 0);
  return (
    <Screen>
      <View style={[styles.center, styles.celebrate]}>
        <AppText style={styles.bigIcon} importantForAccessibility="no">
          🎉
        </AppText>
        <AppText variant="hero" center>
          {t('game.doneTitle', { name: patientName })}
        </AppText>
        <AppText style={styles.stars} accessibilityLabel={`${stars} / 3`}>
          {'⭐'.repeat(stars)}
          <AppText style={[styles.stars, styles.starOff]}>{'⭐'.repeat(3 - stars)}</AppText>
        </AppText>
        {result?.decision?.change === 'up' ? (
          <View style={[styles.chip, styles.chipAccent]}>
            <AppText variant="large" tone="primary" bold>
              🌟 {t('game.levelUp')}
            </AppText>
          </View>
        ) : null}
      </View>
      <View style={styles.fill} />
      <BigButton size="large" icon="🔁" label={t('game.playAgain')} onPress={playAgain} />
      <BigButton kind="secondary" icon="🏠" label={t('game.home')} onPress={() => router.back()} />
    </Screen>
  );
}

function Progress({ done, total, label }: { done: number; total: number; label: string }) {
  return (
    <View style={styles.progress} accessibilityLabel={label}>
      {Array.from({ length: total }, (_, i) => (
        <View key={i} style={[styles.dot, i < done && styles.dotDone]} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  center: { alignItems: 'center', gap: space.md },
  celebrate: { marginTop: space.xl },
  iconCircle: {
    width: 140,
    height: 140,
    borderRadius: radius.pill,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bigIcon: { fontSize: 72, lineHeight: 86 },
  stars: { fontSize: 48, lineHeight: 60 },
  starOff: { opacity: 0.2 },
  chip: {
    backgroundColor: colors.primarySoft,
    borderRadius: radius.pill,
    paddingHorizontal: space.md,
    paddingVertical: space.xs,
  },
  chipAccent: { backgroundColor: colors.warningSoft },
  topBar: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  stop: { flexShrink: 0 },
  progress: { flex: 1, flexDirection: 'row', flexWrap: 'wrap', gap: space.sm, justifyContent: 'flex-end' },
  dot: { width: 18, height: 18, borderRadius: radius.pill, borderWidth: 2, borderColor: colors.primary },
  dotDone: { backgroundColor: colors.primary },
});
