import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { Picture } from '@/components/Picture';
import { TopBarButton } from '@/components/TopBar';
import { space } from '@/theme/tokens';

/** The question of a round: large text (no card), an optional picture, "Hear again". */
export function Prompt({
  text,
  onHear,
  glyph,
  sub,
}: {
  text: string;
  onHear?: () => void;
  /** A picture next to the question (e.g. the object to find, at easy levels). */
  glyph?: string;
  /** One quieter line under the question. */
  sub?: string;
}) {
  const { t } = useTranslation();
  return (
    <View style={styles.wrap}>
      <View style={styles.row}>
        {glyph ? <Picture glyph={glyph} size={56} /> : null}
        <AppText variant="title" center style={styles.text} accessibilityLiveRegion="polite">
          {text}
        </AppText>
      </View>
      {sub ? (
        <AppText variant="body" tone="muted" center>
          {sub}
        </AppText>
      ) : null}
      {onHear ? <TopBarButton icon="speaker" tonal label={t('game.hearAgain')} onPress={onHear} /> : null}
    </View>
  );
}

/** One line under the board after a round: "Yes, that's the dog." */
export function Feedback({ text }: { text: string | null }) {
  return (
    <View style={styles.feedback}>
      {text ? (
        <AppText variant="large" weight="bold" tone="primary" center accessibilityLiveRegion="polite">
          {text}
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', gap: space.sm },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: space.md },
  text: { flexShrink: 1 },
  // Keeps its height when empty, so the board does not jump when the line appears.
  feedback: { minHeight: 40, justifyContent: 'center' },
});
