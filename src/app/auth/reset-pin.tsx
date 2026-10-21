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
import { resetPinWithCode } from '@/cloud/account';
import { CloudError } from '@/cloud/errors';
import { PIN_DIGITS } from '@/cloud/phone';
import { colors, radius, space } from '@/theme/tokens';

/**
 * Forgot PIN (no SMS yet): a family manager makes a 6-digit reset code on
 * their phone (People → Reset PIN) and tells it to you; you choose a new PIN here.
 */
export default function ResetPin() {
  const { t } = useTranslation();
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [pin, setPin] = useState('');
  const [pinAgain, setPinAgain] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<CloudError | null>(null);
  const digits = (v: string, n: number) => v.replace(/\D/g, '').slice(0, n);

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      await resetPinWithCode(phone, code, pin, pinAgain);
      setDone(true);
    } catch (e) {
      setError(e instanceof CloudError ? e : new CloudError('generic'));
    } finally {
      setBusy(false);
    }
  };

  if (done) {
    return (
      <Screen>
        <AppText variant="title">{t('resetPin.done')}</AppText>
        <AppText>{t('resetPin.doneHint')}</AppText>
        <BigButton size="large" icon="lock-open" label={t('auth.signIn')} onPress={() => router.back()} />
      </Screen>
    );
  }

  return (
    <Screen>
      <TopBar />
      <AppText variant="title">{t('resetPin.title')}</AppText>
      <View style={styles.how}>
        <AppText>{t('resetPin.how')}</AppText>
      </View>
      <TextField
        label={t('auth.phone')}
        placeholder="98765 43210"
        value={phone}
        onChangeText={setPhone}
        keyboardType="phone-pad"
        testID="phone"
      />
      <TextField
        label={t('resetPin.code')}
        placeholder="123456"
        value={code}
        onChangeText={(v) => setCode(digits(v, 6))}
        keyboardType="number-pad"
        testID="reset-code"
      />
      <TextField
        label={t('auth.newPin', { n: PIN_DIGITS })}
        value={pin}
        onChangeText={(v) => setPin(digits(v, PIN_DIGITS))}
        keyboardType="number-pad"
        secureTextEntry
        testID="pin"
      />
      <TextField
        label={t('auth.pinAgain')}
        value={pinAgain}
        onChangeText={(v) => setPinAgain(digits(v, PIN_DIGITS))}
        keyboardType="number-pad"
        secureTextEntry
        testID="pin-again"
      />
      <AuthErrorText error={error} phoneRole="" />
      <BigButton
        size="large"
        icon="save"
        label={busy ? t('common.loading') : t('resetPin.save')}
        disabled={busy}
        onPress={submit}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  how: { padding: space.md, borderRadius: radius.md, backgroundColor: colors.primarySoft },
});
