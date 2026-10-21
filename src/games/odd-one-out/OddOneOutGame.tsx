import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { nowMs } from '@/engine/clock';
import { space } from '@/theme/tokens';

import { hapticGentle, hapticSuccess, randomPraise } from '../feedback';
import type { Item } from '../items';
import { afterSpeech, useAlive } from '../pacing';
import type { GameProps } from '../types';
import { Board } from '../ui/Board';
import { PictureTile, type TileState } from '../ui/PictureTile';
import { Feedback, Prompt } from '../ui/Prompt';
import { makeRounds } from './rounds';

/** Minimum time the solved round stays on screen (the explanation is always heard in full). */
const NEXT_ROUND_DELAY_MS = 1500;

/**
 * "Odd one out": all pictures but one belong together (fruits, animals…);
 * the patient taps the one that doesn't. Errorless: a wrong tap highlights
 * the odd one; after solving, the app says why ("The cow is an animal. The
 * others are all fruits."). Only the first try counts toward accuracy.
 */
export function OddOneOutGame({ level, totalTrials, onTrial, onComplete, say }: GameProps) {
  const { t } = useTranslation();
  const [rounds] = useState(() => makeRounds(level, totalTrials));
  const [index, setIndex] = useState(0);
  const [missed, setMissed] = useState(false);
  const [wrongId, setWrongId] = useState<string | null>(null);
  const [solved, setSolved] = useState(false);
  const shownAt = useRef(0);
  const alive = useAlive();

  const round = rounds[index];
  const oddName = t(`items.${round.odd.id}`);
  const prompt = t('games.odd_one_out.prompt');
  const explain = t('games.odd_one_out.explain', {
    item: oddName,
    kind: t(`categories.one.${round.odd.category}`),
    group: t(`categories.plural.${round.group}`),
  });

  useEffect(() => {
    shownAt.current = nowMs();
    say(prompt);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- speak once per round
  }, [index]);

  const onPick = async (item: Item) => {
    if (solved) return;
    const reactionMs = nowMs() - shownAt.current;

    if (item.id !== round.odd.id) {
      hapticGentle();
      setWrongId(item.id);
      if (!missed) {
        setMissed(true);
        onTrial({ correct: false, reactionMs });
      }
      say(t('games.odd_one_out.hint', { item: oddName }));
      return;
    }

    if (!missed) onTrial({ correct: true, reactionMs });
    hapticSuccess();
    setSolved(true);
    await afterSpeech(say(`${randomPraise(t)} ${explain}`), NEXT_ROUND_DELAY_MS);
    if (!alive.current) return;
    if (index + 1 >= rounds.length) {
      onComplete();
      return;
    }
    setIndex(index + 1);
    setMissed(false);
    setWrongId(null);
    setSolved(false);
  };

  const tileState = (item: Item): TileState => {
    if (item.id === round.odd.id) return solved ? 'solved' : missed ? 'hint' : 'idle';
    return wrongId === item.id && !solved ? 'dimmed' : 'idle';
  };

  return (
    <View style={styles.wrap}>
      <Prompt text={prompt} onHear={() => say(solved ? explain : prompt)} />
      <Board count={round.options.length} columns={2}>
        {(size) =>
          round.options.map((item) => (
            <PictureTile
              key={`${index}-${item.id}`}
              glyph={item.emoji}
              label={t(`items.${item.id}`)}
              showLabel
              size={size}
              state={tileState(item)}
              onPress={() => onPick(item)}
            />
          ))
        }
      </Board>
      <Feedback text={solved ? explain : null} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, gap: space.md },
});
