import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { BigButton } from '@/components/BigButton';
import { Screen } from '@/components/Screen';
import { confirm, notify } from '@/services/confirm';
import { pickDateTime } from '@/services/pickDateTime';
import { TextField } from '@/components/TextField';
import { getDb } from '@/db/client';
import type { Reminder } from '@/db/models';
import { deleteReminder, getReminder, saveReminder } from '@/db/repos/reminders';
import { useDbQuery } from '@/db/useDbQuery';
import { formatTime as hhmm, normalizeTimes, REMINDER_TYPES, type ReminderType } from '@/engine/reminders';
import { formatClock, formatShortDate, formatTime } from '@/services/datetime';
import { REMINDER_ICON, syncReminderNotifications } from '@/services/notifications';
import { useSession } from '@/store/session';
import { useSettings } from '@/store/settings';
import { colors, radius, space } from '@/theme/tokens';

const DEFAULT_TIMES: Record<ReminderType, string[]> = {
  medicine: ['08:00'],
  hydration: ['10:00', '13:00', '16:00'],
  activity: ['17:30'],
  appointment: [],
};

function tomorrowAt(hour: number, minute: number): number {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  d.setHours(hour, minute, 0, 0);
  return d.getTime();
}

/** Loads the reminder being edited (if any), then renders the form with it as initial state. */
export default function ReminderEditor() {
  const { patientId, reminderId } = useLocalSearchParams<{ patientId: string; reminderId?: string }>();
  const { data: existing, loading } = useDbQuery(
    (db) => (reminderId ? getReminder(db, reminderId) : Promise.resolve(null)),
    [reminderId],
  );
  if (loading && reminderId) return <Screen>{null}</Screen>;
  return <ReminderForm key={existing?.id ?? 'new'} patientId={patientId} existing={existing ?? null} />;
}

function ReminderForm({ patientId, existing }: { patientId: string; existing: Reminder | null }) {
  const { t } = useTranslation();
  const userId = useSession((s) => s.userId);
  const language = useSettings((s) => s.language);

  const [type, setType] = useState<ReminderType>(existing?.type ?? 'medicine');
  const [title, setTitle] = useState(existing?.title ?? '');
  const [note, setNote] = useState(existing?.note ?? '');
  const [times, setTimes] = useState<string[]>(
    existing?.schedule.kind === 'daily' ? [...existing.schedule.times] : DEFAULT_TIMES.medicine,
  );
  const [onceAt, setOnceAt] = useState(() =>
    existing?.schedule.kind === 'once' ? existing.schedule.at : tomorrowAt(10, 30),
  );
  const [saving, setSaving] = useState(false);

  const defaultTitle = (k: ReminderType) =>
    k === 'hydration' || k === 'activity' ? t(`reminders.caregiver.defaultTitle.${k}`) : '';

  const chooseType = (next: ReminderType) => {
    if (!title.trim() || title === defaultTitle(type)) setTitle(defaultTitle(next));
    if (!existing) setTimes(DEFAULT_TIMES[next]);
    setType(next);
  };

  const addTime = () => {
    const base = new Date();
    base.setHours(9, 0, 0, 0);
    pickDateTime(base, 'time', (date) =>
      setTimes((prev) => normalizeTimes([...prev, hhmm({ hour: date.getHours(), minute: date.getMinutes() })])),
    );
  };

  const pickOnce = (mode: 'date' | 'time') => {
    pickDateTime(
      new Date(onceAt),
      mode,
      (date) => {
        const d = new Date(onceAt);
        if (mode === 'date') d.setFullYear(date.getFullYear(), date.getMonth(), date.getDate());
        else d.setHours(date.getHours(), date.getMinutes(), 0, 0);
        setOnceAt(d.getTime());
      },
      mode === 'date' ? new Date() : undefined,
    );
  };

  const isOnce = type === 'appointment';
  const canSave = !!title.trim() && (isOnce || times.length > 0) && !saving;

  const save = async () => {
    if (!isOnce && times.length === 0) {
      notify(t('reminders.caregiver.needTime'));
      return;
    }
    setSaving(true);
    await saveReminder(getDb(), {
      id: existing?.id,
      patientId,
      type,
      title,
      note,
      schedule: isOnce ? { kind: 'once', at: onceAt } : { kind: 'daily', times },
      enabled: existing?.enabled ?? true,
      createdBy: userId,
    });
    await syncReminderNotifications(getDb());
    router.back();
  };

  const remove = () => {
    if (!existing) return;
    confirm(
      t('reminders.caregiver.deleteConfirm'),
      existing.title,
      t('reminders.caregiver.delete'),
      t('common.cancel'),
    ).then(async (ok) => {
      if (!ok) return;
      await deleteReminder(getDb(), existing.id);
      await syncReminderNotifications(getDb());
      router.back();
    });
  };

  return (
    <Screen>
      <BigButton kind="ghost" icon="x" label={t('common.cancel')} onPress={() => router.back()} />
      <AppText variant="title">
        {existing ? t('reminders.caregiver.editTitle') : t('reminders.caregiver.newTitle')}
      </AppText>

      <AppText variant="small" bold>
        {t('reminders.caregiver.typeLabel')}
      </AppText>
      <View style={styles.chips}>
        {REMINDER_TYPES.map((k) => (
          <Chip
            key={k}
            label={`${REMINDER_ICON[k]} ${t(`reminders.type.${k}`)}`}
            on={type === k}
            onPress={() => chooseType(k)}
          />
        ))}
      </View>

      <TextField
        label={t('reminders.caregiver.titleLabel')}
        testID="reminder-title"
        placeholder={t('reminders.caregiver.titlePlaceholder')}
        value={title}
        onChangeText={setTitle}
      />
      <TextField
        label={t('reminders.caregiver.noteLabel')}
        placeholder={t('reminders.caregiver.notePlaceholder')}
        value={note}
        onChangeText={setNote}
      />

      {isOnce ? (
        <View style={styles.row}>
          <View style={styles.flex}>
            <AppText variant="small" bold>
              {t('reminders.caregiver.dateLabel')}
            </AppText>
            <BigButton
              kind="secondary"
              icon="calendar"
              label={formatShortDate(new Date(onceAt), language)}
              onPress={() => pickOnce('date')}
            />
          </View>
          <View style={styles.flex}>
            <AppText variant="small" bold>
              {t('reminders.caregiver.timeLabel')}
            </AppText>
            <BigButton
              kind="secondary"
              icon="clock"
              label={formatTime(new Date(onceAt), language)}
              onPress={() => pickOnce('time')}
            />
          </View>
        </View>
      ) : (
        <>
          <AppText variant="small" bold>
            {t('reminders.caregiver.timesLabel')}
          </AppText>
          <View style={styles.chips}>
            {times.map((x) => (
              <Chip
                key={x}
                label={`${formatClock(x, language)}  ✕`}
                on
                onPress={() => setTimes((prev) => prev.filter((p) => p !== x))}
              />
            ))}
            <Chip label={`➕ ${t('reminders.caregiver.addTime')}`} on={false} onPress={addTime} />
          </View>
        </>
      )}

      <BigButton size="large" icon="save" label={t('reminders.caregiver.save')} onPress={save} disabled={!canSave} />
      {existing ? (
        <BigButton kind="ghost" icon="trash" label={t('reminders.caregiver.delete')} onPress={remove} />
      ) : null}
    </Screen>
  );
}

function Chip({ label, on, onPress }: { label: string; on: boolean; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: on }}
      onPress={onPress}
      style={[styles.chip, on && styles.chipOn]}
    >
      <AppText variant="small" bold tone={on ? 'onPrimary' : 'primary'}>
        {label}
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  chip: {
    minHeight: 48,
    justifyContent: 'center',
    paddingHorizontal: space.md,
    borderRadius: radius.pill,
    borderWidth: 2,
    borderColor: colors.primary,
    backgroundColor: colors.surface,
  },
  chipOn: { backgroundColor: colors.primary },
  row: { flexDirection: 'row', gap: space.md },
  flex: { flex: 1, gap: space.xs },
});
