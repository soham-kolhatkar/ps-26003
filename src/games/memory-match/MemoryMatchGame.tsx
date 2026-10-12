import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View, type LayoutChangeEvent } from 'react-native';

import { AppText } from '@/components/AppText';
import { nowMs } from '@/engine/clock';
import { colors, radius, space } from '@/theme/tokens';

import { hapticGentle, hapticSuccess, randomPraise } from '../feedback';
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
      if (found === pairs) {
        setPhase('finishing');
        later(onComplete, FINISH_DELAY_MS);
      }
      say(randomPraise(t));
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
        <AppText variant="large" bold center>
          {phase === 'preview' ? '👀 ' : phase === 'peek' ? '💡 ' : ''}
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
                  <AppText
                    style={[
                      faceUp ? styles.faceEmoji : styles.backMotif,
                      { fontSize: size * (faceUp ? 0.5 : 0.36), lineHeight: size * (faceUp ? 0.62 : 0.46) },
                    ]}
                    importantForAccessibility="no"
                  >
                    {faceUp ? card.item.emoji : '✿'}
                  </AppText>
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
    borderRadius: radius.md,
    padding: space.sm,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  statusActive: { backgroundColor: colors.warningSoft, borderColor: colors.warning },
  board: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: GAP },
  card: { borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', borderWidth: 3 },
  face: { backgroundColor: colors.surface, borderColor: colors.border },
  // Gamosa-inspired back: cream cloth, red border and motif.
  back: { backgroundColor: colors.background, borderColor: colors.accent, borderWidth: 4 },
  matched: { backgroundColor: colors.successSoft, borderColor: colors.success },
  faceEmoji: {},
  backMotif: { color: colors.accent },
});
