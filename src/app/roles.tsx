import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { TopBar } from '@/components/TopBar';
import { Card } from '@/components/Card';
import { Picture } from '@/components/Picture';
import { Screen } from '@/components/Screen';
import type { AppUser, Patient } from '@/db/models';
import { displayName, getPatient } from '@/db/repos/patients';
import { getSetting } from '@/db/repos/settings';
import { listUsers } from '@/db/repos/users';
import { useDbQuery } from '@/db/useDbQuery';
import { useSession } from '@/store/session';
import { colors, radius, space } from '@/theme/tokens';

export default function RolePicker() {
  const { t } = useTranslation();
  const signInPatient = useSession((s) => s.signInPatient);

  const { data, error } = useDbQuery(async (db) => {
    const patientId = await getSetting(db, 'device_patient_id');
    const patient = patientId ? await getPatient(db, patientId) : null;
    const staff = await listUsers(db);
    return { patient, staff };
  }, []);

  const openPatient = (patient: Patient) => {
    signInPatient(patient.id);
    if (router.canDismiss()) router.dismissAll();
    router.replace('/patient');
  };

  const openStaff = (user: AppUser) => {
    router.push({ pathname: '/pin/[userId]', params: { userId: user.id } });
  };

  return (
    <Screen>
      <TopBar />
      <AppText variant="title">{t('roles.title')}</AppText>

      {error ? <AppText tone="accent">{t('common.error')}</AppText> : null}

      {data?.patient ? (
        <RoleCard
          avatar={data.patient.avatar ?? '🙂'}
          role={t('roles.patient')}
          name={`${displayName(data.patient)} · ${data.patient.name}`}
          hint={t('roles.patientHint')}
          highlight
          onPress={() => openPatient(data.patient!)}
        />
      ) : null}

      {data?.staff.map((user) => (
        <RoleCard
          key={user.id}
          avatar={user.avatar ?? '🙂'}
          role={t(`roles.${user.role}`)}
          name={user.name}
          hint={t('roles.staffHint')}
          onPress={() => openStaff(user)}
        />
      ))}
    </Screen>
  );
}

type RoleCardProps = {
  avatar: string;
  role: string;
  name: string;
  hint: string;
  highlight?: boolean;
  onPress: () => void;
};

function RoleCard({ avatar, role, name, hint, highlight, onPress }: RoleCardProps) {
  return (
    <Card onPress={onPress} accessibilityLabel={`${role}, ${name}`} style={highlight ? styles.highlight : undefined}>
      <View style={styles.row}>
        <View style={[styles.avatar, highlight && styles.avatarHighlight]}>
          <Picture glyph={avatar} size={56} />
        </View>
        <View style={styles.body}>
          <AppText variant="small" tone="primary" bold>
            {role}
          </AppText>
          <AppText variant="large" bold>
            {name}
          </AppText>
          <AppText variant="caption" tone="muted">
            {hint}
          </AppText>
        </View>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarHighlight: { backgroundColor: colors.primarySoft },
  body: { flex: 1, gap: 2 },
  highlight: { borderColor: colors.primary, borderWidth: 2 },
});
