import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { BigButton } from '@/components/BigButton';
import { Screen } from '@/components/Screen';
import { useDevice } from '@/store/device';
import { space } from '@/theme/tokens';

/** Patient's phone: pairing with a 6-digit code arrives in F16. */
export default function Pair() {
  const { t } = useTranslation();
  const reset = useDevice((s) => s.reset);
  return (
    <Screen>
      <View style={styles.center}>
        <AppText variant="hero" center importantForAccessibility="no">
          👵
        </AppText>
        <AppText variant="title" center>
          {t('pair.title')}
        </AppText>
        <AppText variant="large" center tone="muted">
          {t('pair.soon')}
        </AppText>
      </View>
      <BigButton
        kind="secondary"
        icon="🔁"
        label={t('auth.changeRole')}
        onPress={() => {
          reset();
          router.replace('/setup');
        }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', gap: space.md },
});
