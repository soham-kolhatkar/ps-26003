import { router } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { AuthErrorText } from '@/components/AuthErrorText';
import { BigButton } from '@/components/BigButton';
import { TopBar } from '@/components/TopBar';
import { Screen } from '@/components/Screen';
import { TextField } from '@/components/TextField';
import { CloudError } from '@/cloud/errors';
import { redeemInvite } from '@/cloud/people';
import { useAccount } from '@/store/account';
import { refreshPeople } from '@/sync/refresh';
import { colors, radius, space } from '@/theme/tokens';

/** ASHA / doctor / another family member: join a patient with the code the family shared. */
export function JoinWithCode() {
  const { t } = useTranslation();
  const role = useAccount((s) => s.profile?.role);
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<CloudError | null>(null);

  const join = async () => {
    setBusy(true);
    setError(null);
    try {
      await redeemInvite(code);
      await refreshPeople();
      router.back();
    } catch (e) {
      setError(e instanceof CloudError ? e : new CloudError('generic'));
      setBusy(false);
    }
  };

  return (
    <Screen>
      <TopBar />
      <AppText variant="title">{t('people.joinTitle')}</AppText>
      <View style={styles.how}>
        <AppText>{t('people.joinHow')}</AppText>
      </View>
      <TextField
        label={t('pair.code')}
        placeholder="123456"
        value={code}
        onChangeText={(v) => setCode(v.replace(/\D/g, '').slice(0, 6))}
        keyboardType="number-pad"
        maxLength={6}
        style={styles.code}
        testID="join-code"
      />
      <AuthErrorText error={error} phoneRole={role ? t(`roles.${role}`) : ''} />
      <BigButton
        size="large"
        icon="link"
        label={busy ? t('common.loading') : t('people.join')}
        disabled={busy || code.length !== 6}
        onPress={join}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  how: { padding: space.md, borderRadius: radius.md, backgroundColor: colors.primarySoft },
  code: { fontSize: 36, letterSpacing: 8, textAlign: 'center' },
});
