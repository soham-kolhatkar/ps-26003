import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { BigButton } from '@/components/BigButton';
import { PinPad } from '@/components/PinPad';
import { Screen } from '@/components/Screen';
import { getUser } from '@/db/repos/users';
import { DEMO } from '@/db/seed/demo';
import { useDbQuery } from '@/db/useDbQuery';
import { PIN_LENGTH, verifyPin } from '@/services/auth';
import { useSession } from '@/store/session';
import { space } from '@/theme/tokens';

export default function PinScreen() {
  const { t } = useTranslation();
  const { userId } = useLocalSearchParams<{ userId: string }>();
  const signInStaff = useSession((s) => s.signInStaff);
  const { data: user } = useDbQuery((db) => getUser(db, userId), [userId]);

  const [pin, setPin] = useState('');
  const [wrong, setWrong] = useState(false);
  const [checking, setChecking] = useState(false);

  const onChange = async (next: string) => {
    setWrong(false);
    setPin(next);
    if (next.length < PIN_LENGTH || !user) return;

    setChecking(true);
    const ok = await verifyPin(user.id, next);
    setChecking(false);
    if (ok) {
      signInStaff(user.role, user.id);
      if (router.canDismiss()) router.dismissAll();
      router.replace(`/${user.role}`);
    } else {
      setWrong(true);
      setPin('');
    }
  };

  return (
    <Screen>
      <BigButton kind="ghost" icon="⬅️" label={t('common.back')} onPress={() => router.back()} />
      <View style={styles.header}>
        <AppText variant="hero" importantForAccessibility="no">
          {user?.avatar ?? '🔒'}
        </AppText>
        <AppText variant="title" center>
          {t('pin.title')}
        </AppText>
        <AppText tone="muted" center>
          {user ? t('pin.subtitle', { name: user.name }) : t('common.loading')}
        </AppText>
      </View>

      <PinPad length={PIN_LENGTH} value={pin} onChange={onChange} deleteLabel={t('pin.delete')} disabled={checking} />

      <View style={styles.feedback}>
        {wrong ? (
          <AppText tone="accent" center accessibilityLiveRegion="polite">
            {t('pin.wrong')}
          </AppText>
        ) : null}
        <AppText variant="caption" tone="muted" center>
          {t('pin.demoHint', { pin: DEMO.pin })}
        </AppText>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { alignItems: 'center', gap: space.sm },
  feedback: { gap: space.sm, minHeight: 80 },
});
