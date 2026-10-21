import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { BigButton } from '@/components/BigButton';
import { colors, radius, space } from '@/theme/tokens';

import { hapticGentle, hapticSuccess } from '../feedback';
import type { Item } from '../items';
import { afterSpeech, useAlive } from '../pacing';
import type { GameProps } from '../types';
import { HINT_AFTER_WRONG, hintWord, makeRounds, STAR_CELLS } from './rounds';

/** Each picture stays at least this long while being learnt. */
const STUDY_MS = 1800;
const RECAP_MS = 2000;
const ROUND_DONE_MS = 1500;

type Phase = 'study' | 'recap' | 'break' | 'recall' | 'roundDone';

/**
 * "Remember and find" (delayed recall): pictures are shown and named one by
 * one; after a short break (tap the stars) the patient finds them among
 * others. Recognition, not free recall, so no typing or speech input is
 * needed. Errorless: a wrong picture fades with a gentle word; after
 * HINT_AFTER_WRONG wrong taps a remaining picture glows. Each tap is one trial.
 */
export function WordRecallGame({ level, totalTrials, onTrial, onProgress, onComplete, say }: GameProps) {
  const { t } = useTranslation();
  // totalTrials = lists to play (the check-up plays 1); everyday play passes 0 → the default.
  const [rounds] = useState(() => makeRounds(level, totalTrials || undefined));
  const [roundIndex, setRoundIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>('study');
  const [studyIndex, setStudyIndex] = useState(0);
  const [starsLeft, setStarsLeft] = useState<number[]>(() => rounds[0].stars);
  const [found, setFound] = useState<ReadonlySet<string>>(new Set());
  const [faded, setFaded] = useState<ReadonlySet<string>>(new Set());
  const [hinted, setHinted] = useState<string | null>(null);
  const wrongSinceHint = useRef(0);
  const foundTotal = useRef(0);
  const alive = useAlive();

  const round = rounds[roundIndex];
  const total = rounds.reduce((n, r) => n + r.words.length, 0);
  const name = (it: Item) => t(`items.${it.id}`);
  const listSpoken = round.words.map(name).join(', ');
  const findPrompt = t('games.word_recall.find', { count: round.words.length });

  /** Show and name each picture, recap the list, then start the break. */
  const study = async (r: number) => {
    const words = rounds[r].words;
    for (let i = 0; i < words.length; i++) {
      if (!alive.current) return;
      setStudyIndex(i);
      await afterSpeech(say(name(words[i])), STUDY_MS);
    }
    if (!alive.current) return;
    setPhase('recap');
    await afterSpeech(say(t('games.word_recall.recap', { list: words.map(name).join(', ') })), RECAP_MS);
    if (!alive.current) return;
    setStarsLeft(rounds[r].stars);
    setPhase('break');
    say(t('games.word_recall.break'));
  };

  useEffect(() => {
    onProgress(0, total);
    (async () => {
      await say(t('games.word_recall.remember'));
      if (alive.current) study(0);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run once per game
  }, []);

  const onStar = (cell: number) => {
    if (phase !== 'break' || !starsLeft.includes(cell)) return;
    hapticSuccess();
    const left = starsLeft.filter((c) => c !== cell);
    setStarsLeft(left);
    if (left.length === 0) {
      setPhase('recall');
      say(t('games.word_recall.findSpoken', { count: round.words.length }));
    }
  };

  const onPick = async (it: Item) => {
    if (phase !== 'recall' || found.has(it.id) || faded.has(it.id)) return;
    const isWord = round.words.some((w) => w.id === it.id);

    if (!isWord) {
      hapticGentle();
      onTrial({ correct: false, reactionMs: null });
      setFaded(new Set([...faded, it.id]));
      wrongSinceHint.current += 1;
      if (wrongSinceHint.current >= HINT_AFTER_WRONG && !hinted) {
        wrongSinceHint.current = 0;
        const h = hintWord(round, found);
        if (h) {
          setHinted(h.id);
          say(t('games.word_recall.hint', { item: name(h) }));
          return;
        }
      }
      say(t('games.word_recall.notInList'));
      return;
    }

    // A hinted picture completes the list but doesn't count as remembered.
    if (it.id !== hinted) onTrial({ correct: true, reactionMs: null });
    hapticSuccess();
    const nextFound = new Set([...found, it.id]);
    setFound(nextFound);
    if (it.id === hinted) setHinted(null);
    foundTotal.current += 1;
    onProgress(foundTotal.current, total);

    if (nextFound.size < round.words.length) {
      say(t('games.word_recall.hit', { item: name(it) }));
      return;
    }
    setPhase('roundDone');
    await afterSpeech(say(t('games.word_recall.allFound')), ROUND_DONE_MS);
    if (!alive.current) return;
    if (roundIndex + 1 >= rounds.length) {
      onComplete();
      return;
    }
    setRoundIndex(roundIndex + 1);
    setFound(new Set());
    setFaded(new Set());
    setHinted(null);
    wrongSinceHint.current = 0;
    setStudyIndex(0);
    setPhase('study');
    await say(t('games.word_recall.remember'));
    if (alive.current) study(roundIndex + 1);
  };

  if (phase === 'study' || phase === 'recap') {
    const it = round.words[studyIndex];
    return (
      <View style={styles.wrap}>
        <AppText variant="title" center>
          {phase === 'study'
            ? t('games.word_recall.rememberCount', { done: studyIndex + 1, total: round.words.length })
            : t('games.word_recall.recapTitle')}
        </AppText>
        {phase === 'study' ? (
          <View style={styles.studyCard} accessible accessibilityLabel={name(it)}>
            <AppText style={styles.studyEmoji} importantForAccessibility="no">
              {it.emoji}
            </AppText>
            <AppText variant="hero" center>
              {name(it)}
            </AppText>
          </View>
        ) : (
          <View style={styles.recapRow} accessible accessibilityLabel={listSpoken}>
            {round.words.map((w) => (
              <View key={w.id} style={styles.recapItem}>
                <AppText style={styles.recapEmoji} importantForAccessibility="no">
                  {w.emoji}
                </AppText>
                <AppText variant="body" center>
                  {name(w)}
                </AppText>
              </View>
            ))}
          </View>
        )}
      </View>
    );
  }

  if (phase === 'break') {
    return (
      <View style={styles.wrap}>
        <AppText variant="title" center>
          {t('games.word_recall.breakTitle')}
        </AppText>
        <View style={styles.starGrid}>
          {Array.from({ length: STAR_CELLS }, (_, cell) => {
            const lit = starsLeft.includes(cell);
            return (
              <Pressable
                key={cell}
                accessibilityRole={lit ? 'button' : undefined}
                accessibilityLabel={lit ? t('games.word_recall.star') : undefined}
                disabled={!lit}
                onPress={() => onStar(cell)}
                style={styles.starCell}
              >
                {lit ? <AppText style={styles.starEmoji}>⭐</AppText> : null}
              </Pressable>
            );
          })}
        </View>
      </View>
    );
  }

  const columns = round.grid.length <= 4 ? 2 : 3;
  return (
    <View style={styles.wrap}>
      <View style={styles.prompt}>
        <AppText variant="title" center accessibilityLiveRegion="polite">
          {phase === 'roundDone' ? t('games.word_recall.allFound') : findPrompt}
        </AppText>
        <View style={styles.promptRow}>
          <AppText variant="large" tone="muted">
            {t('games.word_recall.foundCount', { found: found.size, total: round.words.length })}
          </AppText>
          {phase === 'recall' ? (
            <BigButton
              kind="ghost"
              icon="speaker"
              label={t('game.hearAgain')}
              onPress={() => say(t('games.word_recall.findSpoken', { count: round.words.length }))}
            />
          ) : null}
        </View>
      </View>
      <View style={styles.grid}>
        {round.grid.map((it) => {
          const isFound = found.has(it.id);
          return (
            <Pressable
              key={`${roundIndex}-${it.id}`}
              accessibilityRole="button"
              accessibilityLabel={name(it)}
              onPress={() => onPick(it)}
              style={({ pressed }) => [
                styles.tile,
                { width: columns === 3 ? '30%' : '46%' },
                pressed && styles.tilePressed,
                isFound && styles.tileFound,
                hinted === it.id && styles.tileHint,
                faded.has(it.id) && styles.tileFaded,
              ]}
            >
              <AppText style={styles.tileEmoji} importantForAccessibility="no">
                {it.emoji}
              </AppText>
              {isFound ? (
                <AppText variant="small" bold tone="primary" center numberOfLines={1} adjustsFontSizeToFit>
                  ✓ {name(it)}
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
  studyCard: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.md,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  studyEmoji: { fontSize: 140, lineHeight: 168 },
  recapRow: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: space.md },
  recapItem: {
    width: '30%',
    alignItems: 'center',
    padding: space.sm,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  recapEmoji: { fontSize: 56, lineHeight: 68 },
  starGrid: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignContent: 'center',
    gap: space.sm,
    justifyContent: 'center',
  },
  starCell: { width: '30%', aspectRatio: 1, alignItems: 'center', justifyContent: 'center' },
  starEmoji: { fontSize: 64, lineHeight: 76 },
  prompt: {
    alignItems: 'center',
    gap: space.xs,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: space.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  promptRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'center', gap: space.md },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: space.md, justifyContent: 'center' },
  tile: {
    minHeight: 100,
    alignItems: 'center',
    justifyContent: 'center',
    padding: space.xs,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 3,
    borderColor: colors.border,
  },
  tilePressed: { backgroundColor: colors.surfaceMuted },
  tileFound: { borderColor: colors.success, backgroundColor: colors.successSoft },
  tileHint: { borderColor: colors.warning, backgroundColor: colors.warningSoft },
  tileFaded: { opacity: 0.3 },
  tileEmoji: { fontSize: 52, lineHeight: 62 },
});
