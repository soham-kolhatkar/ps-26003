import { Redirect, router } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { AppText } from '@/components/AppText';
import { AuthErrorText } from '@/components/AuthErrorText';
import { BigButton } from '@/components/BigButton';
import { Screen } from '@/components/Screen';
import { TextField } from '@/components/TextField';
import { signIn } from '@/cloud/account';
import { CloudError } from '@/cloud/errors';
import { PIN_DIGITS } from '@/cloud/phone';
import { useAccount } from '@/store/account';
import { isStaffRole, useDevice } from '@/store/device';

/** Staff sign-in with phone number + 6-digit PIN (cloud mode). */
export default function SignIn() {
  const { t } = useTranslation();
  const role = useDevice((s) => s.role);
  const reset = useDevice((s) => s.reset);
  const [phone, setPhone] = useState('');
  const [pin, setPin] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<CloudError | null>(null);

  if (!isStaffRole(role)) return <Redirect href="/" />;
  const roleName = t(`roles.${role}`);

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      const profile = await signIn(role, phone, pin);
      router.replace('/');
      useAccount.getState().signedIn(profile);
    } catch (e) {
      setError(e instanceof CloudError ? e : new CloudError('generic'));
      setPin('');
      setBusy(false);
    }
  };

  return (
    <Screen>
      <AppText variant="title">{t('auth.signInTitle')}</AppText>
      <AppText tone="muted">{t('auth.phoneIsFor', { role: roleName })}</AppText>
      <TextField
        label={t('auth.phone')}
        placeholder="98765 43210"
        value={phone}
        onChangeText={setPhone}
        keyboardType="phone-pad"
        autoComplete="tel"
        testID="phone"
      />
      <TextField
        label={t('auth.pin', { n: PIN_DIGITS })}
        value={pin}
        onChangeText={(v) => setPin(v.replace(/\D/g, ''))}
        keyboardType="number-pad"
        secureTextEntry
        maxLength={PIN_DIGITS}
        testID="pin"
      />
      <AuthErrorText error={error} phoneRole={roleName} />
      <BigButton
        size="large"
        icon="🔓"
        label={busy ? t('common.loading') : t('auth.signIn')}
        disabled={busy}
        onPress={submit}
      />
      <BigButton
        kind="secondary"
        icon="✨"
        label={t('auth.createAccount')}
        onPress={() => router.push('/auth/sign-up')}
      />
      <BigButton kind="ghost" icon="🔑" label={t('resetPin.forgot')} onPress={() => router.push('/auth/reset-pin')} />
      <BigButton
        kind="ghost"
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
