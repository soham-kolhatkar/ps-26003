import { router } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { BigButton } from '@/components/BigButton';
import { TopBar } from '@/components/TopBar';
import { PinPad } from '@/components/PinPad';
import { Screen } from '@/components/Screen';
import { FAMILY_PIN_ID, PIN_LENGTH, verifyPin } from '@/services/auth';
import { confirm } from '@/services/confirm';
import { useAccount } from '@/store/account';
import { useDevice } from '@/store/device';
import { useSession } from '@/store/session';
import { space } from '@/theme/tokens';

/**
 * Patient's phone: the family corner, behind the 4-digit family PIN set when
 * the phone was paired. Family photos are managed here (they never leave this
 * phone), and the phone can be unpaired.
 */
export default function FamilyCorner() {
  const { t } = useTranslation();
  const patientId = useSession((s) => s.patientId);
  const [pin, setPin] = useState('');
  const [open, setOpen] = useState(false);
  const [wrong, setWrong] = useState(false);

  const onPin = async (next: string) => {
    setPin(next);
    setWrong(false);
    if (next.length < PIN_LENGTH) return;
    if (await verifyPin(FAMILY_PIN_ID, next)) setOpen(true);
    else {
      setWrong(true);
      setPin('');
    }
  };

  const unpair = async () => {
    if (!(await confirm(t('family.unpairTitle'), t('family.unpairBody'), t('family.unpair'), t('common.cancel')))) {
      return;
    }
    router.replace('/');
    useSession.getState().signOut();
    await useAccount.getState().signOut(); // waits for a running sync, then signs out
    useDevice.getState().reset();
  };

  if (!open) {
    return (
      <Screen>
        <TopBar />
        <AppText variant="title" center>
          {t('family.title')}
        </AppText>
        <AppText center tone="muted">
          {t('family.enterPin')}
        </AppText>
        {wrong ? (
          <AppText center tone="accent" bold>
            {t('pin.wrong')}
          </AppText>
        ) : null}
        <PinPad length={PIN_LENGTH} value={pin} onChange={onPin} deleteLabel={t('pin.delete')} />
      </Screen>
    );
  }

  return (
    <Screen>
      <TopBar />
      <AppText variant="title">{t('family.title')}</AppText>
      <BigButton
        icon="camera"
        label={t('family.photos')}
        onPress={() => router.push({ pathname: '/patient/photos', params: { patientId: patientId ?? '' } })}
      />
      <View style={styles.spacer} />
      <BigButton kind="ghost" icon="plug" label={t('family.unpair')} onPress={unpair} />
    </Screen>
  );
}

const styles = StyleSheet.create({ spacer: { flex: 1, minHeight: space.xl } });
