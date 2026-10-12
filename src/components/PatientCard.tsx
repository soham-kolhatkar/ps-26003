import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { Card } from '@/components/Card';
import type { LinkedPatient, Patient } from '@/db/models';
import { colors, radius, space } from '@/theme/tokens';

type PatientCardProps = {
  patient: Patient | LinkedPatient;
  onPress?: () => void;
  /** Show the free-text notes (caregiver view). */
  showNotes?: boolean;
};

export function PatientCard({ patient, onPress, showNotes }: PatientCardProps) {
  const { t } = useTranslation();
  const relation = 'relation' in patient ? patient.relation : null;
  const meta = [
    patient.age != null ? t('staff.years', { count: patient.age }) : null,
    [patient.village, patient.district].filter(Boolean).join(', ') || null,
  ].filter(Boolean);

  return (
    <Card onPress={onPress} accessibilityLabel={patient.name}>
      <View style={styles.row}>
        <View style={styles.avatar}>
          <AppText variant="title" importantForAccessibility="no">
            {patient.avatar ?? '🙂'}
          </AppText>
        </View>
        <View style={styles.body}>
          <AppText variant="large" bold>
            {patient.name}
          </AppText>
          <AppText variant="small" tone="muted">
            {meta.join(' · ')}
          </AppText>
          <View style={styles.tags}>
            {patient.conditionStage ? <Tag label={t(`stage.${patient.conditionStage}`)} /> : null}
            {relation ? <Tag label={t(`relation.${relation}`, { defaultValue: relation })} tone="muted" /> : null}
          </View>
        </View>
      </View>
      {showNotes && patient.notes ? (
        <AppText variant="small" tone="muted">
          {patient.notes}
        </AppText>
      ) : null}
    </Card>
  );
}

function Tag({ label, tone = 'primary' }: { label: string; tone?: 'primary' | 'muted' }) {
  return (
    <View style={[styles.tag, tone === 'muted' && styles.tagMuted]}>
      <AppText variant="caption" tone={tone === 'primary' ? 'primary' : 'muted'} bold>
        {label}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: space.md, alignItems: 'center' },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: { flex: 1, gap: space.xs },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  tag: {
    backgroundColor: colors.primarySoft,
    borderRadius: radius.pill,
    paddingHorizontal: space.sm + 2,
    paddingVertical: 2,
  },
  tagMuted: { backgroundColor: colors.surfaceMuted },
});
