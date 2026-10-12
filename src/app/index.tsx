import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { BigButton } from '@/components/BigButton';
import { Screen } from '@/components/Screen';
import { LANGUAGE_CODES, LANGUAGES } from '@/i18n';
import { speak } from '@/services/tts';
import { useSettings } from '@/store/settings';
import { colors, radius, space } from '@/theme/tokens';

export default function Welcome() {
  const { t } = useTranslation();
  const language = useSettings((s) => s.language);
  const setLanguage = useSettings((s) => s.setLanguage);

  return (
    <Screen>
      <View style={styles.header}>
        <View style={styles.logo}>
          <AppText variant="hero" importantForAccessibility="no">
            🌼
          </AppText>
        </View>
        <AppText variant="hero" tone="primary" center>
          {t('app.name')}
        </AppText>
        <AppText variant="large" tone="muted" center>
          {t('app.tagline')}
        </AppText>
      </View>

      <AppText variant="large" center>
        {t('welcome.greeting')}
      </AppText>

      <BigButton
        kind="secondary"
        icon="🔊"
        label={t('common.speak')}
        onPress={() => speak(t('welcome.speakSample'), language)}
      />

      <View style={styles.section}>
        <AppText variant="large" bold>
          {t('language.title')}
        </AppText>
        <View style={styles.langRow}>
          {LANGUAGE_CODES.map((code) => (
            <View key={code} style={styles.langItem}>
              <BigButton
                kind="secondary"
                label={LANGUAGES[code].label}
                selected={language === code}
                onPress={() => setLanguage(code)}
              />
            </View>
          ))}
        </View>
      </View>

      <View style={styles.spacer} />

      <BigButton size="large" label={`${t('common.continue')} · ${t('common.comingSoon')}`} disabled />
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { alignItems: 'center', gap: space.sm, marginTop: space.xl },
  logo: {
    width: 112,
    height: 112,
    borderRadius: radius.pill,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: space.sm,
  },
  section: { gap: space.md },
  langRow: { flexDirection: 'row', gap: space.md },
  langItem: { flex: 1 },
  spacer: { flex: 1 },
});
