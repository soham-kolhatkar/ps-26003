import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { Card } from '@/components/Card';
import { colors, radius, space } from '@/theme/tokens';

/** Big tappable card: emoji avatar, title, one-line hint. */
export function ChoiceCard({
  icon,
  title,
  hint,
  onPress,
}: {
  icon: string;
  title: string;
  hint: string;
  onPress: () => void;
}) {
  return (
    <Card onPress={onPress} accessibilityLabel={`${title}. ${hint}`}>
      <View style={styles.row}>
        <View style={styles.avatar}>
          <AppText variant="hero" importantForAccessibility="no">
            {icon}
          </AppText>
        </View>
        <View style={styles.body}>
          <AppText variant="large" bold>
            {title}
          </AppText>
          <AppText variant="small" tone="muted">
            {hint}
          </AppText>
        </View>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: radius.pill,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: { flex: 1, gap: 2 },
});
