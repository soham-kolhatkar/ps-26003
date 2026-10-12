import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { BigButton } from '@/components/BigButton';
import { HoldButton } from '@/components/HoldButton';
import { Screen } from '@/components/Screen';
import { displayName, getPatient } from '@/db/repos/patients';
import { useDbQuery } from '@/db/useDbQuery';
import { speak } from '@/services/tts';
import { useSession } from '@/store/session';
import { useSettings } from '@/store/settings';
import { colors, radius, space } from '@/theme/tokens';

export default function PatientHome() {
  const { t } = useTranslation();
  const patientId = useSession((s) => s.patientId);
  const signOut = useSession((s) => s.signOut);
  const language = useSettings((s) => s.language);
  const { data: patient } = useDbQuery((db) => getPatient(db, patientId ?? ''), [patientId]);

  const name = patient ? displayName(patient) : '';

  return (
    <Screen>
      <View style={styles.header}>
        <View style={styles.avatar}>
          <AppText variant="hero" importantForAccessibility="no">
            {patient?.avatar ?? '🙂'}
          </AppText>
        </View>
        <AppText variant="hero" center>
          {t('patient.greeting', { name })}
        </AppText>
      </View>

      <BigButton
        kind="secondary"
        size="large"
        icon="🔊"
        label={t('common.speak')}
        onPress={() => speak(t('patient.greetingSpoken', { name }), language)}
      />

      <View style={styles.placeholder}>
        <AppText variant="hero" importantForAccessibility="no">
          🎲
        </AppText>
        <AppText variant="large" tone="muted" center>
          {t('patient.gamesSoon')}
        </AppText>
      </View>

      <View style={styles.spacer} />

      <HoldButton
        label={t('patient.holdToExit')}
        hint={t('patient.holdToExitHint')}
        onHold={() => {
          signOut();
          router.replace('/roles');
        }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { alignItems: 'center', gap: space.md, marginTop: space.lg },
  avatar: {
    width: 128,
    height: 128,
    borderRadius: radius.pill,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholder: {
    alignItems: 'center',
    gap: space.sm,
    padding: space.xl,
    borderRadius: radius.lg,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: colors.border,
  },
  spacer: { flex: 1 },
});
