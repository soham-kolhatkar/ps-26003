import { Redirect, router } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { AuthErrorText } from '@/components/AuthErrorText';
import { BigButton } from '@/components/BigButton';
import { Screen } from '@/components/Screen';
import { TextField } from '@/components/TextField';
import { signUp } from '@/cloud/account';
import { CloudError } from '@/cloud/errors';
import { PIN_DIGITS } from '@/cloud/phone';
import { useAccount } from '@/store/account';
import { isStaffRole, useDevice } from '@/store/device';
import { colors, radius, space } from '@/theme/tokens';

/** New staff account: name, phone, (organisation), district, PIN twice. */
export default function SignUp() {
  const { t } = useTranslation();
  const role = useDevice((s) => s.role);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [organization, setOrganization] = useState('');
  const [district, setDistrict] = useState('');
  const [pin, setPin] = useState('');
  const [pinAgain, setPinAgain] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<CloudError | null>(null);

  if (!isStaffRole(role)) return <Redirect href="/" />;
  const roleName = t(`roles.${role}`);
  const digits = (v: string) => v.replace(/\D/g, '');

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      const profile = await signUp({ role, name, phone, pin, pinAgain, organization, district });
      router.replace('/');
      useAccount.getState().signedIn(profile);
    } catch (e) {
      setError(e instanceof CloudError ? e : new CloudError('generic'));
      setBusy(false);
    }
  };

  return (
    <Screen>
      <BigButton kind="ghost" icon="⬅️" label={t('common.back')} onPress={() => router.back()} />
      <AppText variant="title">{t('auth.signUpTitle', { role: roleName })}</AppText>
      <TextField label={t('auth.name')} value={name} onChangeText={setName} autoComplete="name" testID="name" />
      <TextField
        label={t('auth.phone')}
        placeholder="98765 43210"
        value={phone}
        onChangeText={setPhone}
        keyboardType="phone-pad"
        autoComplete="tel"
        testID="phone"
      />
      {role !== 'caregiver' ? (
        <TextField
          label={t(`auth.organization.${role}`)}
          value={organization}
          onChangeText={setOrganization}
          testID="organization"
        />
      ) : null}
      <TextField
        label={t('auth.district')}
        placeholder="Jorhat"
        value={district}
        onChangeText={setDistrict}
        testID="district"
      />
      <TextField
        label={t('auth.newPin', { n: PIN_DIGITS })}
        value={pin}
        onChangeText={(v) => setPin(digits(v))}
        keyboardType="number-pad"
        secureTextEntry
        maxLength={PIN_DIGITS}
        testID="pin"
      />
      <TextField
        label={t('auth.pinAgain')}
        value={pinAgain}
        onChangeText={(v) => setPinAgain(digits(v))}
        keyboardType="number-pad"
        secureTextEntry
        maxLength={PIN_DIGITS}
        testID="pin-again"
      />
      <View style={styles.note}>
        <AppText variant="small">🔒 {t('auth.privacy')}</AppText>
      </View>
      <AuthErrorText error={error} phoneRole={roleName} />
      <BigButton
        size="large"
        icon="✨"
        label={busy ? t('common.loading') : t('auth.create')}
        disabled={busy}
        onPress={submit}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  note: { padding: space.md, borderRadius: radius.md, backgroundColor: colors.primarySoft },
});
