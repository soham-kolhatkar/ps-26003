import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/AppText';
import type { CloudError } from '@/cloud/errors';
import { colors, radius, space } from '@/theme/tokens';

/** Friendly message for a CloudError (null = nothing to show). */
export function AuthErrorText({ error, phoneRole }: { error: CloudError | null; phoneRole: string }) {
  const { t } = useTranslation();
  if (!error) return null;
  const accountRole = error.detail?.role ? t(`roles.${error.detail.role}`) : '';
  return (
    <View style={styles.box} accessibilityLiveRegion="polite">
      <AppText bold>{t(`cloud.errors.${error.key}`, { accountRole, phoneRole })}</AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  box: { padding: space.md, borderRadius: radius.md, backgroundColor: colors.warningSoft },
});
