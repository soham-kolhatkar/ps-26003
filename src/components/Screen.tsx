import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors, space } from '@/theme/tokens';

type ScreenProps = {
  children: ReactNode;
  /** Wrap content in a ScrollView (default true). Games pass false. */
  scroll?: boolean;
  /** Space between children (default 20; the patient home uses less to fit one screen). */
  gap?: number;
};

export function Screen({ children, scroll = true, gap }: ScreenProps) {
  const spacing = gap != null ? { gap } : null;
  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom', 'left', 'right']}>
      {scroll ? (
        <ScrollView contentContainerStyle={[styles.content, spacing]} keyboardShouldPersistTaps="handled">
          {children}
        </ScrollView>
      ) : (
        <View style={[styles.content, styles.fill, spacing]}>{children}</View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  content: { paddingHorizontal: 20, paddingTop: space.md, paddingBottom: space.lg, gap: 20, flexGrow: 1 },
  fill: { flex: 1 },
});
