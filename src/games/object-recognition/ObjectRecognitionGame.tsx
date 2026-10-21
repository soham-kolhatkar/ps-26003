import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { nowMs } from '@/engine/clock';
import { space } from '@/theme/tokens';

import { hapticGentle, hapticSuccess } from '../feedback';
import { afterSpeech, useAlive } from '../pacing';
import type { GameProps } from '../types';
import type { Item } from '../items';
import { Board } from '../ui/Board';
import { PictureTile, type TileState } from '../ui/PictureTile';
import { Feedback, Prompt } from '../ui/Prompt';
import { levelParams, makeRounds } from './rounds';

/** Minimum time the solved round stays on screen (praise is always heard in full). */
const NEXT_ROUND_DELAY_MS = 1200;

/**
 * "Find the object": the app names an everyday object; the patient taps it.
 * Errorless: a wrong tap gently highlights the right picture and the patient
 * taps it to continue. Only the first try counts toward accuracy.
 */
export function ObjectRecognitionGame({ level, totalTrials, onTrial, onComplete, say }: GameProps) {
  const { t } = useTranslation();
  const [rounds] = useState(() => makeRounds(level, totalTrials));
  const [index, setIndex] = useState(0);
  const [missed, setMissed] = useState(false);
  const [wrongId, setWrongId] = useState<string | null>(null);
  const [solved, setSolved] = useState(false);
  const shownAt = useRef(0);
  const alive = useAlive();

  const round = rounds[index];
  const { showTargetPicture } = levelParams(level);
  const targetName = t(`items.${round.target.id}`);
  const prompt = t('games.object_recognition.prompt', { item: targetName });

  useEffect(() => {
    shownAt.current = nowMs();
    say(prompt);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- speak once per round
  }, [index]);

  const onPick = async (item: Item) => {
    if (solved) return;
    const reactionMs = nowMs() - shownAt.current;

    if (item.id !== round.target.id) {
      hapticGentle();
      setWrongId(item.id);
      if (!missed) {
        setMissed(true);
        onTrial({ correct: false, reactionMs });
      }
      say(t('games.object_recognition.hint', { item: targetName }));
      return;
    }

    if (!missed) onTrial({ correct: true, reactionMs });
    hapticSuccess();
    setSolved(true);
    await afterSpeech(say(t('feedback.rightItem', { item: targetName })), NEXT_ROUND_DELAY_MS);
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
    if (item.id === round.target.id) return solved ? 'solved' : missed ? 'hint' : 'idle';
    return wrongId === item.id ? 'dimmed' : 'idle';
  };

  return (
    <View style={styles.wrap}>
      <Prompt text={prompt} glyph={showTargetPicture ? round.target.emoji : undefined} onHear={() => say(prompt)} />
      <Board count={round.options.length}>
        {(size) =>
          round.options.map((item) => (
            <PictureTile
              key={`${index}-${item.id}`}
              glyph={item.emoji}
              label={t(`items.${item.id}`)}
              showLabel={solved && item.id === round.target.id}
              size={size}
              state={tileState(item)}
              onPress={() => onPick(item)}
            />
          ))
        }
      </Board>
      <Feedback text={solved ? t('feedback.rightItem', { item: targetName }) : null} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, gap: space.md },
});
