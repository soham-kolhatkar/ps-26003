import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { Icon } from '@/components/Icon';
import { TopBarButton } from '@/components/TopBar';
import { BigButton } from '@/components/BigButton';
import { TextField } from '@/components/TextField';
import { getDb } from '@/db/client';
import { addDoctorNote, deleteDoctorNote, listDoctorNotes } from '@/db/repos/notes';
import { useDbQuery } from '@/db/useDbQuery';
import { confirm } from '@/services/confirm';
import { formatShortDate } from '@/services/datetime';
import { useSession } from '@/store/session';
import { useSettings } from '@/store/settings';
import { colors, radius, shadow, space } from '@/theme/tokens';

/**
 * Doctor's notes for one patient (F18). The doctor writes them on the report
 * (`canWrite`); the family and the ASHA worker read the latest ones.
 */
export function DoctorNotes({
  patientId,
  canWrite,
  limit = 3,
}: {
  patientId: string;
  canWrite?: boolean;
  limit?: number;
}) {
  const { t } = useTranslation();
  const userId = useSession((s) => s.userId);
  const language = useSettings((s) => s.language);
  const [draft, setDraft] = useState('');
  const [saving, setSaving] = useState(false);
  const { data: notes, reload } = useDbQuery((db) => listDoctorNotes(db, patientId, limit), [patientId, limit]);

  if (!canWrite && !notes?.length) return null;

  const save = async () => {
    if (!draft.trim()) return;
    setSaving(true);
    await addDoctorNote(getDb(), { patientId, authorId: userId ?? null, body: draft });
    setDraft('');
    setSaving(false);
    reload();
  };

  const remove = async (id: string) => {
    if (!(await confirm(t('notes.deleteTitle'), '', t('notes.delete'), t('common.cancel')))) return;
    await deleteDoctorNote(getDb(), id);
    reload();
  };

  return (
    <View style={styles.card}>
      <View style={styles.head}>
        <Icon name="stethoscope" size={22} color={colors.onPrimarySoft} />
        <AppText weight="bold" style={styles.flex}>
          {t(canWrite ? 'notes.titleDoctor' : 'notes.title')}
        </AppText>
      </View>
      {notes?.map((n) => (
        <View key={n.id} style={styles.note}>
          <AppText variant="body">{n.body}</AppText>
          <View style={styles.meta}>
            <AppText variant="caption" tone="muted" style={styles.flex}>
              {[n.authorName, formatShortDate(new Date(n.createdAt), language)].filter(Boolean).join(' · ')}
            </AppText>
            {canWrite && n.authorId === userId ? (
              <TopBarButton icon="trash" danger label={t('notes.delete')} onPress={() => remove(n.id)} />
            ) : null}
          </View>
        </View>
      ))}
      {canWrite ? (
        <>
          <TextField
            label={t('notes.add')}
            placeholder={t('notes.placeholder')}
            value={draft}
            onChangeText={setDraft}
            multiline
            maxLength={2000}
            testID="doctor-note"
          />
          <BigButton icon="save" label={t('notes.save')} disabled={saving || !draft.trim()} onPress={save} />
        </>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: space.sm,
    padding: space.md,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    boxShadow: shadow.card,
  },
  head: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  flex: { flex: 1 },
  note: { gap: space.xs, padding: space.sm + 4, borderRadius: radius.sm, backgroundColor: colors.primaryWash },
  meta: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
});
