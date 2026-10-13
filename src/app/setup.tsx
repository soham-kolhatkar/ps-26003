import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { BigButton } from '@/components/BigButton';
import { ChoiceCard } from '@/components/ChoiceCard';
import { Screen } from '@/components/Screen';
import { confirm } from '@/services/confirm';
import { useDevice, type DeviceRole } from '@/store/device';
import { colors, radius, space } from '@/theme/tokens';

const CHOICES: readonly { role: DeviceRole; icon: string }[] = [
  { role: 'patient', icon: '👵' },
  { role: 'caregiver', icon: '👩' },
  { role: 'asha', icon: '🧑‍⚕️' },
  { role: 'doctor', icon: '🩺' },
];

/**
 * First launch: what this phone is for. Each phone has one role from now on
 * (no role picker). A long press on the flower opens the hidden single-phone
 * demo (today's offline app) for venues without internet.
 */
export default function Setup() {
  const { t } = useTranslation();
  const chooseCloud = useDevice((s) => s.chooseCloud);
  const chooseDemo = useDevice((s) => s.chooseDemo);

  const pick = (role: DeviceRole) => {
    chooseCloud(role);
    router.replace(role === 'patient' ? '/pair' : '/auth/sign-in');
  };

  const openDemo = async () => {
    if (await confirm(t('setup.demoTitle'), t('setup.demoBody'), t('setup.demoYes'), t('common.cancel'))) {
      chooseDemo();
      router.replace('/roles');
    }
  };

  return (
    <Screen>
      <BigButton
        kind="ghost"
        icon="⬅️"
        label={t('common.back')}
        onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}
      />
      <View style={styles.header}>
        <Pressable
          onLongPress={openDemo}
          delayLongPress={1500}
          accessibilityLabel={t('app.name')}
          style={styles.logo}
          testID="setup-logo"
        >
          <AppText variant="hero" importantForAccessibility="no">
            🌼
          </AppText>
        </Pressable>
        <AppText variant="title" center>
          {t('setup.title')}
        </AppText>
        <AppText tone="muted" center>
          {t('setup.subtitle')}
        </AppText>
      </View>
      {CHOICES.map((c) => (
        <ChoiceCard
          key={c.role}
          icon={c.icon}
          title={t(`setup.${c.role}`)}
          hint={t(`setup.${c.role}Hint`)}
          onPress={() => pick(c.role)}
        />
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { alignItems: 'center', gap: space.sm },
  logo: {
    width: 96,
    height: 96,
    borderRadius: radius.pill,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
