import { router } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { Picture } from '@/components/Picture';
import { AuthErrorText } from '@/components/AuthErrorText';
import { BigButton } from '@/components/BigButton';
import { PinPad } from '@/components/PinPad';
import { Screen } from '@/components/Screen';
import { TextField } from '@/components/TextField';
import { CloudError } from '@/cloud/errors';
import { redeemInvite, signInDevice } from '@/cloud/people';
import { FAMILY_PIN_ID, PIN_LENGTH, setPin } from '@/services/auth';
import { useAccount } from '@/store/account';
import { useDevice } from '@/store/device';
import { colors, radius, space } from '@/theme/tokens';

type Step = 'code' | 'pin' | 'pinAgain';

/**
 * Patient's phone, set up once by the family: type the 6-digit code from
 * People → "Pair the patient's phone" on the caregiver's (or ASHA's) phone,
 * then choose a 4-digit family PIN that guards the family corner here.
 * Behind the scenes the phone gets an anonymous account linked to the patient.
 */
export default function Pair() {
  const { t } = useTranslation();
  const reset = useDevice((s) => s.reset);
  const [step, setStep] = useState<Step>('code');
  const [code, setCode] = useState('');
  const [uid, setUid] = useState<string | null>(null);
  const [pin, setPinValue] = useState('');
  const [firstPin, setFirstPin] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<CloudError | null>(null);
  const [mismatch, setMismatch] = useState(false);

  const pair = async () => {
    setBusy(true);
    setError(null);
    try {
      const deviceUid = await signInDevice();
      const r = await redeemInvite(code);
      if (r.role !== 'device') throw new CloudError('codeWrongRole');
      useDevice.getState().setPatientId(r.patientId);
      setUid(deviceUid);
      setStep('pin');
    } catch (e) {
      setError(e instanceof CloudError ? e : new CloudError('generic'));
    } finally {
      setBusy(false);
    }
  };

  const onPin = async (next: string) => {
    setPinValue(next);
    setMismatch(false);
    if (next.length < PIN_LENGTH) return;
    if (step === 'pin') {
      setFirstPin(next);
      setPinValue('');
      setStep('pinAgain');
      return;
    }
    if (next !== firstPin) {
      setMismatch(true);
      setPinValue('');
      setStep('pin');
      return;
    }
    await setPin(FAMILY_PIN_ID, next);
    router.replace('/');
    useAccount.getState().signedInDevice(uid!);
  };

  if (step !== 'code') {
    return (
      <Screen>
        <AppText variant="title" center>
          {t(step === 'pin' ? 'pair.pinTitle' : 'pair.pinAgain')}
        </AppText>
        <AppText center tone="muted">
          {t('pair.pinHint')}
        </AppText>
        {mismatch ? (
          <AppText center tone="accent" bold>
            {t('pair.pinMismatch')}
          </AppText>
        ) : null}
        <PinPad length={PIN_LENGTH} value={pin} onChange={onPin} deleteLabel={t('pin.delete')} />
      </Screen>
    );
  }

  return (
    <Screen>
      <Picture glyph="👵" size={88} style={styles.picture} />
      <AppText variant="title" center>
        {t('pair.title')}
      </AppText>
      <View style={styles.how}>
        <AppText>{t('pair.how')}</AppText>
      </View>
      <TextField
        label={t('pair.code')}
        placeholder="123456"
        value={code}
        onChangeText={(v) => setCode(v.replace(/\D/g, '').slice(0, 6))}
        keyboardType="number-pad"
        maxLength={6}
        style={styles.code}
        testID="pair-code"
      />
      <AuthErrorText error={error} phoneRole={t('setup.patient')} />
      <BigButton
        size="large"
        icon="link"
        label={busy ? t('common.loading') : t('pair.pair')}
        disabled={busy || code.length !== 6}
        onPress={pair}
      />
      <BigButton
        kind="danger"
        icon="redo"
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
  picture: { alignSelf: 'center' },
  how: { padding: space.md, borderRadius: radius.md, backgroundColor: colors.primarySoft },
  code: { fontSize: 36, letterSpacing: 8, textAlign: 'center' },
});
