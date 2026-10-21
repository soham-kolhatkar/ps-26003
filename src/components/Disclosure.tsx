import { useState, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { Icon } from '@/components/Icon';
import { PressableScale } from '@/components/PressableScale';
import { colors, radius, space, touch } from '@/theme/tokens';

/** "How to read this report ⌄": the explanation stays folded until asked for (progressive disclosure). */
export function Disclosure({ label, children }: { label: string; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <View style={styles.box}>
      <PressableScale
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        accessibilityLabel={label}
        onPress={() => setOpen(!open)}
        style={styles.row}
      >
        <Icon name="info" size={22} color={colors.primary} />
        <AppText variant="body" weight="semibold" tone="primary" style={styles.label}>
          {label}
        </AppText>
        <Icon name={open ? 'caret-up' : 'caret-down'} size={20} color={colors.primary} />
      </PressableScale>
      {open ? <View style={styles.body}>{children}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  box: { borderRadius: radius.md, backgroundColor: colors.surfaceMuted },
  row: {
    minHeight: touch.min,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm + 4,
    paddingHorizontal: space.md,
  },
  label: { flex: 1 },
  body: { gap: space.xs, paddingHorizontal: space.md, paddingBottom: space.md },
});
