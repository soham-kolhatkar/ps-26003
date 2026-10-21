import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { Picture } from '@/components/Picture';
import { colors, radius, shadow, space } from '@/theme/tokens';

import { hapticGentle, hapticSuccess } from '../feedback';
import type { Item } from '../items';
import { afterSpeech, useAlive } from '../pacing';
import type { GameProps } from '../types';
import { Board } from '../ui/Board';
import { PictureTile } from '../ui/PictureTile';
import { Prompt } from '../ui/Prompt';
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
        <AppText variant="title" center accessibilityLiveRegion="polite">
          {phase === 'study'
            ? t('games.word_recall.rememberCount', { done: studyIndex + 1, total: round.words.length })
            : t('games.word_recall.recapTitle')}
        </AppText>
        {phase === 'study' ? (
          <View style={styles.studyCard} accessible accessibilityLabel={name(it)}>
            <Picture glyph={it.emoji} size={180} />
            <AppText variant="hero" center>
              {name(it)}
            </AppText>
          </View>
        ) : (
          <View style={styles.recapRow} accessible accessibilityLabel={listSpoken}>
            {round.words.map((w) => (
              <View key={w.id} style={styles.recapItem}>
                <Picture glyph={w.emoji} size={72} />
                <AppText variant="body" weight="semibold" center>
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
    // A short, easy pause between seeing and finding: tap the flowers.
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
                {lit ? <Picture glyph="🌼" size={76} /> : null}
              </Pressable>
            );
          })}
        </View>
      </View>
    );
  }

  return (
    <View style={styles.wrap}>
      <Prompt
        text={phase === 'roundDone' ? t('games.word_recall.allFound') : findPrompt}
        sub={t('games.word_recall.foundCount', { found: found.size, total: round.words.length })}
        onHear={
          phase === 'recall' ? () => say(t('games.word_recall.findSpoken', { count: round.words.length })) : undefined
        }
      />
      <Board count={round.grid.length}>
        {(size) =>
          round.grid.map((it) => (
            <PictureTile
              key={`${roundIndex}-${it.id}`}
              glyph={it.emoji}
              label={name(it)}
              showLabel={found.has(it.id)}
              size={size}
              state={found.has(it.id) ? 'solved' : hinted === it.id ? 'hint' : faded.has(it.id) ? 'dimmed' : 'idle'}
              onPress={() => onPick(it)}
            />
          ))
        }
      </Board>
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
    boxShadow: shadow.card,
  },
  recapRow: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: space.md },
  recapItem: {
    width: '30%',
    alignItems: 'center',
    gap: space.xs,
    padding: space.sm,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    boxShadow: shadow.card,
  },
  starGrid: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignContent: 'center',
    gap: space.sm,
    justifyContent: 'center',
  },
  starCell: { width: '30%', aspectRatio: 1, alignItems: 'center', justifyContent: 'center' },
});
