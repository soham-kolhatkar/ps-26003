import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View, type LayoutChangeEvent } from 'react-native';

import { AppText } from '@/components/AppText';
import { Icon } from '@/components/Icon';
import { Picture } from '@/components/Picture';
import { nowMs } from '@/engine/clock';
import { colors, radius, shadow, space } from '@/theme/tokens';

import { hapticGentle, hapticSuccess, randomPraise } from '../feedback';
import { afterSpeech, useAlive } from '../pacing';
import type { GameProps } from '../types';
import { classifyAttempt, levelParams, makeDeck } from './board';

type Phase = 'preview' | 'play' | 'peek' | 'finishing';

const MISMATCH_SHOW_MS = 1200;
const PEEK_MS = 2500;
const FINISH_DELAY_MS = 1400;
/** After this many memory errors in a row, briefly show every card again. */
const PEEK_AFTER_ERRORS = 3;
const GAP = space.sm;

/**
 * Memory pairs. Cards are shown face-up briefly, then turned over; the patient
 * finds matching pairs. Only *memory errors* count against accuracy — a wrong
 * pair while the matching card has never been seen is just exploring.
 */
export function MemoryMatchGame({ level, onTrial, onProgress, onComplete, say }: GameProps) {
  const { t } = useTranslation();
  const [deck] = useState(() => makeDeck(level));
  const { pairs, previewMs, columns } = levelParams(level);
  const rows = Math.ceil(deck.length / columns);

  const [phase, setPhase] = useState<Phase>('preview');
  const [matched, setMatched] = useState<ReadonlySet<number>>(new Set());
  const [open, setOpen] = useState<number[]>([]);
  const [locked, setLocked] = useState(false);
  const [area, setArea] = useState({ width: 0, height: 0 });

  const seen = useRef(new Set<number>());
  const errorsInRow = useRef(0);
  const firstFlipAt = useRef(0);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const later = (fn: () => void, ms: number) => timers.current.push(setTimeout(fn, ms));
  const alive = useAlive();

  useEffect(() => {
    onProgress(0, pairs);
    say(t('games.memory_match.remember'));
    later(() => {
      setPhase('play');
      say(t('games.memory_match.findPairs'));
    }, previewMs);
    const pending = timers.current;
    return () => pending.forEach(clearTimeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run once per game
  }, []);

  const flip = (i: number) => {
    if (phase !== 'play' || locked || matched.has(i) || open.includes(i)) return;

    if (open.length === 0) {
      firstFlipAt.current = nowMs();
      setOpen([i]);
      return;
    }

    const first = open[0];
    const result = classifyAttempt(deck, seen.current, first, i);
    const reactionMs = nowMs() - firstFlipAt.current;
    seen.current.add(first).add(i);
    setOpen([first, i]);

    if (result.kind === 'match') {
      errorsInRow.current = 0;
      onTrial({ correct: true, reactionMs });
      hapticSuccess();
      const next = new Set(matched).add(first).add(i);
      setMatched(next);
      setOpen([]);
      const found = next.size / 2;
      onProgress(found, pairs);
      const praise = say(randomPraise(t));
      if (found === pairs) {
        setPhase('finishing');
        // Let the praise finish before the celebration screen speaks.
        afterSpeech(praise, FINISH_DELAY_MS).then(() => alive.current && onComplete());
      }
      return;
    }

    hapticGentle();
    setLocked(true);
    if (result.kind === 'memory_error') {
      onTrial({ correct: false, reactionMs });
      errorsInRow.current += 1;
    }
    later(() => {
      setOpen([]);
      setLocked(false);
      if (errorsInRow.current >= PEEK_AFTER_ERRORS) {
        errorsInRow.current = 0;
        setPhase('peek');
        say(t('games.memory_match.peek'));
        later(() => setPhase('play'), PEEK_MS);
      }
    }, MISMATCH_SHOW_MS);
  };

  const onLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setArea({ width, height });
  };
  const size = Math.floor(
    Math.min((area.width - GAP * (columns - 1)) / columns, (area.height - GAP * (rows - 1)) / rows),
  );

  const status =
    phase === 'preview'
      ? t('games.memory_match.remember')
      : phase === 'peek'
        ? t('games.memory_match.peek')
        : t('games.memory_match.findPairs');

  return (
    <View style={styles.wrap}>
      <View style={[styles.status, phase !== 'play' && phase !== 'finishing' && styles.statusActive]}>
        <Icon name={phase === 'preview' || phase === 'peek' ? 'eye' : 'grid'} size={24} color={colors.onPrimarySoft} />
        <AppText variant="large" weight="bold" tone="onPrimarySoft" center accessibilityLiveRegion="polite">
          {status}
        </AppText>
      </View>

      <View style={styles.board} onLayout={onLayout}>
        {size > 0 ? (
          <View style={[styles.grid, { width: size * columns + GAP * (columns - 1) }]}>
            {deck.map((card) => {
              const isMatched = matched.has(card.index);
              const faceUp = phase === 'preview' || phase === 'peek' || isMatched || open.includes(card.index);
              return (
                <Pressable
                  key={card.index}
                  accessibilityRole="button"
                  accessibilityLabel={faceUp ? t(`items.${card.item.id}`) : t('games.memory_match.hiddenCard')}
                  onPress={() => flip(card.index)}
                  style={[
                    styles.card,
                    { width: size, height: size },
                    faceUp ? styles.face : styles.back,
                    isMatched && styles.matched,
                  ]}
                >
                  {faceUp ? (
                    <Picture glyph={card.item.emoji} size={Math.round(size * 0.66)} />
                  ) : (
                    <View style={styles.backLeaf}>
                      <Picture glyph="🍃" size={Math.round(size * 0.4)} />
                    </View>
                  )}
                </Pressable>
              );
            })}
          </View>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, gap: space.md },
  status: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.sm,
    minHeight: 64,
    borderRadius: radius.md,
    paddingHorizontal: space.md,
    backgroundColor: colors.primaryWash,
  },
  statusActive: { backgroundColor: colors.primarySoft },
  board: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: GAP },
  card: {
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 4,
    borderColor: 'transparent',
    boxShadow: shadow.card,
  },
  face: { backgroundColor: colors.surface },
  // Neutral back (D50): leaf green with a tea leaf, the same for every card.
  back: { backgroundColor: colors.primarySoft },
  backLeaf: { opacity: 0.55 },
  matched: { backgroundColor: colors.primarySoft, borderColor: colors.primary },
});
