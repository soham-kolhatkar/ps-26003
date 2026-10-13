import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { BigButton } from '@/components/BigButton';
import { Screen } from '@/components/Screen';
import { TextField } from '@/components/TextField';
import { getDb } from '@/db/client';
import { alertCounts } from '@/db/repos/alerts';
import { displayName, getPatient } from '@/db/repos/patients';
import { insertVisit, listVisits } from '@/db/repos/visits';
import { useDbQuery } from '@/db/useDbQuery';
import { nowMs } from '@/engine/clock';
import {
  checkupScore,
  comparableCheckups,
  concerns,
  isCompleteCheckup,
  isConcerning,
  OBSERVATION_KEYS,
  OBSERVATIONS,
  suggestNextVisitDays,
  VISIT_INTERVAL_CHOICES,
  type CheckupTask,
  type ObservationKey,
  type Observations,
} from '@/engine/visits';
import { CheckupRunner } from '@/games/CheckupRunner';
import { formatShortDate } from '@/services/datetime';
import { stopSpeaking } from '@/services/tts';
import { useSession } from '@/store/session';
import { useSettings } from '@/store/settings';
import { colors, radius, space, touch } from '@/theme/tokens';

const DAY = 24 * 60 * 60 * 1000;
type Phase = 'intro' | 'checkup' | 'form' | 'saved';

/**
 * ASHA home visit (about 5 minutes): optional check-up with the patient →
 * observations, note, referral and next visit date → saved summary.
 */
export default function HomeVisit() {
  const { t } = useTranslation();
  const { patientId } = useLocalSearchParams<{ patientId: string }>();
  const userId = useSession((s) => s.userId);
  const language = useSettings((s) => s.language);
  const [phase, setPhase] = useState<Phase>('intro');
  const [startedAt] = useState(() => nowMs());
  const [tasks, setTasks] = useState<CheckupTask[] | null>(null);
  const [obs, setObs] = useState<Observations>({});
  const [note, setNote] = useState('');
  const [refer, setRefer] = useState(false);
  const [nextDays, setNextDays] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  const { data } = useDbQuery(
    async (db) => ({
      patient: await getPatient(db, patientId),
      // Last complete check-up: the only fair comparison for today's (if today's is complete too).
      previous: comparableCheckups(await listVisits(db, patientId))[0] ?? null,
      alerts: await alertCounts(db, patientId),
    }),
    [patientId],
  );
  if (!data?.patient) return <Screen>{null}</Screen>;
  const name = displayName(data.patient);
  const score = tasks ? checkupScore(tasks) : null;
  const suggested = suggestNextVisitDays({
    seriousAlerts: data.alerts.serious,
    refer,
    concernCount: concerns(obs).length,
  });
  const days = nextDays ?? suggested;

  const save = async () => {
    setSaving(true);
    const now = nowMs();
    await insertVisit(getDb(), {
      patientId,
      userId: userId ?? null,
      startedAt,
      endedAt: now,
      checkup: tasks,
      checkupScore: score,
      observations: obs,
      note,
      refer,
      nextVisitAt: now + days * DAY,
    });
    setSaving(false);
    setPhase('saved');
  };

  if (phase === 'checkup') {
    return (
      <Screen scroll={false}>
        <CheckupRunner
          patientId={patientId}
          onDone={(done) => {
            setTasks(done);
            setPhase('form');
          }}
        />
      </Screen>
    );
  }

  if (phase === 'intro') {
    return (
      <Screen>
        <BigButton kind="ghost" icon="⬅️" label={t('common.back')} onPress={() => router.back()} />
        <AppText variant="title">{t('visit.title', { name })}</AppText>
        <AppText variant="large">{t('visit.intro', { name })}</AppText>
        <View style={styles.hint}>
          <AppText>🤝 {t('visit.handOver', { name })}</AppText>
        </View>
        <BigButton size="large" icon="▶️" label={t('visit.startCheckup')} onPress={() => setPhase('checkup')} />
        <BigButton kind="secondary" icon="⏭️" label={t('visit.skipCheckup')} onPress={() => setPhase('form')} />
      </Screen>
    );
  }

  if (phase === 'saved') {
    const prev = data.previous?.checkupScore ?? null;
    const change = score != null && prev != null && isCompleteCheckup(tasks) ? score - prev : null;
    return (
      <Screen>
        <AppText variant="title">✅ {t('visit.saved')}</AppText>
        <View style={styles.card}>
          <AppText variant="large" bold>
            {score != null ? t('visit.scoreLine', { score }) : t('visit.noCheckup')}
            {score != null && !isCompleteCheckup(tasks) ? ` ${t('visit.partial')}` : ''}
          </AppText>
          {change != null ? (
            <AppText tone="muted">
              {change > 0
                ? t('visit.changeUp', { n: change })
                : change < 0
                  ? t('visit.changeDown', { n: -change })
                  : t('visit.changeSame')}
            </AppText>
          ) : null}
          <AppText>{t('visit.nextOn', { date: formatShortDate(new Date(nowMs() + days * DAY), language) })}</AppText>
          {refer ? <AppText bold>🩺 {t('visit.referred')}</AppText> : null}
        </View>
        <BigButton
          icon="⬅️"
          label={t('visit.backToPatient')}
          onPress={() => {
            stopSpeaking();
            router.back();
          }}
        />
      </Screen>
    );
  }

  // ---- form: observations, note, referral, next visit ----
  return (
    <Screen>
      <AppText variant="title">{t('visit.formTitle', { name })}</AppText>
      <View style={styles.card}>
        <AppText variant="large" bold>
          {score != null ? t('visit.scoreLine', { score }) : t('visit.noCheckup')}
          {score != null && !isCompleteCheckup(tasks) ? ` ${t('visit.partial')}` : ''}
        </AppText>
        {tasks?.map((task) => (
          <AppText key={task.gameId} variant="small" tone="muted">
            {t(`games.${task.gameId}.title`)}:{' '}
            {task.score == null
              ? t('checkup.skipped')
              : t('checkup.taskResult', { correct: task.correct, total: task.trials })}
          </AppText>
        ))}
      </View>

      <AppText variant="large" bold>
        {t('visit.questionsTitle')}
      </AppText>
      {OBSERVATION_KEYS.map((key) => (
        <ObservationRow key={key} k={key} value={obs[key]} onChange={(v) => setObs({ ...obs, [key]: v })} />
      ))}

      <TextField
        label={t('visit.note')}
        placeholder={t('visit.notePlaceholder')}
        value={note}
        onChangeText={setNote}
        multiline
        style={styles.note}
      />

      <BigButton
        kind="secondary"
        icon={refer ? '☑️' : '⬜'}
        selected={refer}
        label={t('visit.refer')}
        onPress={() => setRefer(!refer)}
      />

      <AppText variant="small" bold>
        {t('visit.nextVisit')}
      </AppText>
      <View style={styles.chips}>
        {VISIT_INTERVAL_CHOICES.map((d) => (
          <Chip key={d} label={t('visit.inDays', { n: d })} selected={days === d} onPress={() => setNextDays(d)} />
        ))}
      </View>
      {nextDays == null ? (
        <AppText variant="caption" tone="muted">
          {t('visit.suggested', { n: suggested })}
        </AppText>
      ) : null}

      <BigButton size="large" icon="💾" label={t('visit.save')} disabled={saving} onPress={save} />
    </Screen>
  );
}

function ObservationRow({
  k,
  value,
  onChange,
}: {
  k: ObservationKey;
  value: string | undefined;
  onChange: (v: never) => void;
}) {
  const { t } = useTranslation();
  return (
    <View style={styles.obs}>
      <AppText bold>{t(`visit.obs.${k}.q`)}</AppText>
      <View style={styles.chips}>
        {OBSERVATIONS[k].map((option) => (
          <Chip
            key={option}
            label={t(`visit.obs.${k}.${option}`)}
            selected={value === option}
            warn={isConcerning(k, option)}
            onPress={() => onChange(option as never)}
          />
        ))}
      </View>
    </View>
  );
}

function Chip({
  label,
  selected,
  warn,
  onPress,
}: {
  label: string;
  selected: boolean;
  warn?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={[styles.chip, selected && (warn ? styles.chipWarn : styles.chipOn)]}
    >
      <AppText variant="small" bold tone={selected && !warn ? 'onPrimary' : 'primary'}>
        {selected ? '✓ ' : ''}
        {label}
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  hint: { padding: space.md, backgroundColor: colors.primarySoft, borderRadius: radius.md },
  card: {
    gap: space.xs,
    padding: space.md,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  obs: { gap: space.xs },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  chip: {
    minHeight: touch.min,
    justifyContent: 'center',
    paddingHorizontal: space.md,
    borderRadius: radius.pill,
    borderWidth: 2,
    borderColor: colors.primary,
    backgroundColor: colors.surface,
  },
  chipOn: { backgroundColor: colors.primary },
  chipWarn: { backgroundColor: colors.warningSoft, borderColor: colors.warning },
  note: { minHeight: 96, textAlignVertical: 'top', paddingTop: space.sm },
});
