import { Image } from 'expo-image';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { Icon } from '@/components/Icon';
import { listPhotos } from '@/db/repos/photos';
import { useDbQuery } from '@/db/useDbQuery';
import { nowMs } from '@/engine/clock';
import { colors, radius, shadow, space } from '@/theme/tokens';

import { hapticGentle, hapticSuccess } from '../feedback';
import { afterSpeech, useAlive } from '../pacing';
import type { GameProps } from '../types';
import { makeRounds, type Person, type PhotoCard } from './rounds';

const NEXT_ROUND_DELAY_MS = 1200;

/** Loads the patient's family photos, then plays. */
export function PhotoRecallGame(props: GameProps) {
  const { data: photos } = useDbQuery((db) => listPhotos(db, props.patientId), [props.patientId]);
  if (!photos) return <ActivityIndicator size="large" color={colors.primary} style={styles.fill} />;
  return <PhotoRecallPlay {...props} photos={photos} />;
}

/**
 * "Who is this?": a family photo is shown and the patient taps the person's
 * name (level 5 reverses it: "Where is Priya?" → tap the photo).
 * Choices are only real family members. Errorless, first try counts.
 */
function PhotoRecallPlay({
  level,
  totalTrials,
  onTrial,
  onComplete,
  say,
  photos,
}: GameProps & { photos: PhotoCard[] }) {
  const { t } = useTranslation();
  const { width } = useWindowDimensions();
  const [rounds] = useState(() => makeRounds(level, photos, totalTrials));
  const [index, setIndex] = useState(0);
  const [missed, setMissed] = useState(false);
  const [wrongKey, setWrongKey] = useState<string | null>(null);
  const [solved, setSolved] = useState(false);
  const shownAt = useRef(0);
  const alive = useAlive();

  const round = rounds[index];
  const prompt = round
    ? round.reverse
      ? t('games.photo_recall.findPerson', { name: round.target.name })
      : t('games.photo_recall.whoIsThis')
    : '';

  useEffect(() => {
    if (!round) return;
    shownAt.current = nowMs();
    say(prompt);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- once per round
  }, [index]);

  if (!round) {
    return (
      <AppText variant="large" tone="muted" center>
        {t('photos.empty')}
      </AppText>
    );
  }

  const relationText = (p: Person) =>
    p.relation && p.relation !== 'other' ? t(`relation.${p.relation}`, { defaultValue: p.relation }) : null;

  const confirmText = (p: Person) => {
    const rel = relationText(p);
    return rel
      ? t('games.photo_recall.confirmRelation', { name: p.name, relation: rel.toLowerCase() })
      : t('games.photo_recall.confirm', { name: p.name });
  };

  const onPick = async (person: Person) => {
    if (solved) return;
    const reactionMs = nowMs() - shownAt.current;

    if (person.key !== round.target.key) {
      hapticGentle();
      setWrongKey(person.key);
      if (!missed) {
        setMissed(true);
        onTrial({ correct: false, reactionMs });
      }
      say(t('games.photo_recall.hint', { name: round.target.name }));
      return;
    }

    if (!missed) onTrial({ correct: true, reactionMs });
    hapticSuccess();
    setSolved(true);
    await afterSpeech(say(confirmText(round.target)), NEXT_ROUND_DELAY_MS);
    if (!alive.current) return;
    if (index + 1 >= rounds.length) {
      onComplete();
      return;
    }
    setIndex(index + 1);
    setMissed(false);
    setWrongKey(null);
    setSolved(false);
  };

  const optionState = (p: Person) => {
    const isTarget = p.key === round.target.key;
    return {
      hint: isTarget && missed && !solved,
      done: isTarget && solved,
      wrong: wrongKey === p.key && !isTarget,
    };
  };

  if (round.reverse) {
    const tile = Math.floor((width - 20 * 2 - space.md) / 2);
    return (
      <ScrollView contentContainerStyle={styles.wrap}>
        <AppText variant="title" center>
          {prompt}
        </AppText>
        <View style={styles.photoGrid}>
          {round.options.map((p) => {
            const s = optionState(p);
            return (
              <Pressable
                key={`${index}-${p.key}`}
                accessibilityRole="button"
                accessibilityLabel={solved || missed ? p.name : t('games.photo_recall.whoIsThis')}
                onPress={() => onPick(p)}
                style={[styles.photoTile, s.hint && styles.hint, s.done && styles.done, s.wrong && styles.wrong]}
              >
                <Image
                  source={{ uri: round.optionPhotos[p.key].uri }}
                  style={{ width: tile, height: tile }}
                  contentFit="cover"
                />
                {s.done ? (
                  <View style={styles.caption}>
                    <Icon name="check-circle" size={22} weight="fill" color={colors.primary} />
                    <AppText variant="body" weight="bold" tone="primary" center>
                      {p.name}
                    </AppText>
                  </View>
                ) : null}
              </Pressable>
            );
          })}
        </View>
      </ScrollView>
    );
  }

  const photoSize = Math.min(width - 20 * 2, 300);
  return (
    <ScrollView contentContainerStyle={styles.wrap}>
      <View style={[styles.mainPhoto, solved && styles.done]}>
        <Image source={{ uri: round.photo.uri }} style={{ width: photoSize, height: photoSize }} contentFit="cover" />
      </View>
      <AppText variant="title" center tone={solved ? 'primary' : 'default'} accessibilityLiveRegion="polite">
        {solved ? t('feedback.rightPerson', { name: round.target.name }) : prompt}
      </AppText>
      {round.options.map((p) => {
        const s = optionState(p);
        const rel = round.showRelation ? relationText(p) : null;
        return (
          <Pressable
            key={`${index}-${p.key}`}
            accessibilityRole="button"
            accessibilityLabel={rel ? `${p.name}, ${rel}` : p.name}
            onPress={() => onPick(p)}
            style={({ pressed }) => [
              styles.nameOption,
              pressed && styles.pressed,
              s.hint && styles.hint,
              s.done && styles.done,
              s.wrong && styles.wrong,
            ]}
          >
            <AppText variant="large" bold>
              {p.name}
            </AppText>
            {rel ? (
              <AppText variant="small" tone="muted">
                {rel}
              </AppText>
            ) : null}
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  wrap: { gap: space.md, alignItems: 'stretch', paddingBottom: space.lg },
  mainPhoto: {
    alignSelf: 'center',
    borderRadius: radius.lg,
    overflow: 'hidden',
    borderWidth: 4,
    borderColor: 'transparent',
    boxShadow: shadow.card,
  },
  nameOption: {
    minHeight: 76,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: space.md,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 4,
    borderColor: 'transparent',
    boxShadow: shadow.card,
  },
  pressed: { backgroundColor: colors.primaryWash },
  hint: { borderColor: colors.primary, backgroundColor: colors.primaryWash },
  done: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  wrong: { opacity: 0.4 },
  photoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: space.md, justifyContent: 'center' },
  photoTile: {
    borderRadius: radius.lg,
    overflow: 'hidden',
    borderWidth: 4,
    borderColor: 'transparent',
    backgroundColor: colors.surface,
    boxShadow: shadow.card,
  },
  caption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.xs,
    paddingVertical: space.xs,
  },
});
