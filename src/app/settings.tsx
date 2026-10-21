import { Redirect, router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { BigButton } from '@/components/BigButton';
import { TopBar } from '@/components/TopBar';
import { Screen } from '@/components/Screen';
import { formatPhone } from '@/cloud/phone';
import { LANGUAGE_CODES, LANGUAGES } from '@/i18n';
import { confirm } from '@/services/confirm';
import { useAccount } from '@/store/account';
import { useDevice } from '@/store/device';
import { useSession } from '@/store/session';
import { useSettings } from '@/store/settings';
import { colors, radius, shadow, space } from '@/theme/tokens';

/** Cloud-mode settings for a staff phone: account, language, sign out, change the phone's role. */
export default function Settings() {
  const { t } = useTranslation();
  const mode = useDevice((s) => s.mode);
  const profile = useAccount((s) => s.profile);
  const language = useSettings((s) => s.language);
  const setLanguage = useSettings((s) => s.setLanguage);

  if (mode !== 'cloud' || !profile) return <Redirect href="/" />;

  const leave = async (alsoReset: boolean) => {
    const ok = await confirm(
      t(alsoReset ? 'settings.changeRoleTitle' : 'settings.signOutTitle'),
      t('settings.signOutBody'),
      t(alsoReset ? 'settings.changeRole' : 'common.signOut'),
      t('common.cancel'),
    );
    if (!ok) return;
    router.replace('/');
    useSession.getState().signOut();
    await useAccount.getState().signOut();
    if (alsoReset) useDevice.getState().reset();
  };

  return (
    <Screen>
      <TopBar />
      <Pressable onLongPress={() => router.push('/demo-tools')} delayLongPress={1500}>
        <AppText variant="title">{t('settings.title')}</AppText>
      </Pressable>

      <View style={styles.card}>
        <AppText variant="large" bold>
          {profile.name}
        </AppText>
        <AppText tone="muted">
          {[t(`roles.${profile.role}`), profile.organization, profile.district].filter(Boolean).join(' · ')}
        </AppText>
        <AppText>{formatPhone(profile.phone)}</AppText>
      </View>

      <AppText variant="large" bold>
        {t('language.title')}
      </AppText>
      <View style={styles.row}>
        {LANGUAGE_CODES.map((code) => (
          <View key={code} style={styles.flex}>
            <BigButton
              kind="secondary"
              label={LANGUAGES[code].label}
              selected={language === code}
              onPress={() => setLanguage(code)}
            />
          </View>
        ))}
      </View>

      <View style={styles.card}>
        <AppText variant="small" tone="muted">
          {t('settings.cloudNote')}
        </AppText>
      </View>

      <BigButton kind="secondary" icon="sign-out" label={t('common.signOut')} onPress={() => leave(false)} />
      <BigButton kind="ghost" icon="redo" label={t('settings.changeRole')} onPress={() => leave(true)} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: space.xs,
    padding: space.md,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    boxShadow: shadow.card,
  },
  row: { flexDirection: 'row', gap: space.md },
  flex: { flex: 1 },
});
