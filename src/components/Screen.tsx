import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors, space } from '@/theme/tokens';

type ScreenProps = {
  children: ReactNode;
  /** Wrap content in a ScrollView (default true). Games pass false. */
  scroll?: boolean;
};

export function Screen({ children, scroll = true }: ScreenProps) {
  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom', 'left', 'right']}>
      {scroll ? (
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          {children}
        </ScrollView>
      ) : (
        <View style={[styles.content, styles.fill]}>{children}</View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  content: { padding: space.lg, gap: space.lg, flexGrow: 1 },
  fill: { flex: 1 },
});
