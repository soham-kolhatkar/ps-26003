import { router } from 'expo-router';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { BigButton } from '@/components/BigButton';
import { Screen } from '@/components/Screen';
import { LANGUAGE_CODES, LANGUAGES } from '@/i18n';
import { speak } from '@/services/tts';
import { useAccount } from '@/store/account';
import { isStaffRole, useDevice } from '@/store/device';
import { useSession } from '@/store/session';
import { useSettings } from '@/store/settings';
import { colors, radius, space } from '@/theme/tokens';

export default function Welcome() {
  const { t } = useTranslation();
  const language = useSettings((s) => s.language);
  const setLanguage = useSettings((s) => s.setLanguage);
  const mode = useDevice((s) => s.mode);
  const role = useDevice((s) => s.role);
  const status = useAccount((s) => s.status);
  const uid = useAccount((s) => s.uid);

  // A signed-in cloud phone opens straight into its role (no welcome, no role picker).
  const openRole = mode === 'cloud' && status === 'signedIn' && uid && isStaffRole(role) ? role : null;
  useEffect(() => {
    if (!openRole || !uid) return;
    useSession.getState().signInStaff(openRole, uid);
    router.replace(`/${openRole}`);
  }, [openRole, uid]);
  if (openRole) return <Screen>{null}</Screen>;

  const next = () => {
    if (mode === 'demo') router.push('/roles');
    else if (mode === 'cloud' && role === 'patient') router.push('/pair');
    else if (mode === 'cloud' && isStaffRole(role)) router.push('/auth/sign-in');
    else router.push('/setup');
  };

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

      <BigButton size="large" label={t('common.continue')} onPress={next} />
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
