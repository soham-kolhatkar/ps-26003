import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Switch, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { ChipGroup } from '@/components/Chip';
import { StatusLine } from '@/components/StatusLine';
import { PressableScale } from '@/components/PressableScale';
import { Icon } from '@/components/Icon';
import { BigButton } from '@/components/BigButton';
import { TopBar } from '@/components/TopBar';
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
  type Observations,
} from '@/engine/visits';
import { CheckupRunner } from '@/games/CheckupRunner';
import { formatShortDate } from '@/services/datetime';
import { stopSpeaking } from '@/services/tts';
import { useSession } from '@/store/session';
import { useSettings } from '@/store/settings';
import { colors, radius, shadow, space, touch } from '@/theme/tokens';

const DAY = 24 * 60 * 60 * 1000;
/** The chosen answer stays visible this long before the next question. */
const ANSWER_PAUSE_MS = 350;
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
  /** Which question is on screen; one past the last = the finish screen. */
  const [question, setQuestion] = useState(0);

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
        <TopBar />
        <AppText variant="title">{t('visit.title', { name })}</AppText>
        <AppText variant="large">{t('visit.intro', { name })}</AppText>
        <View style={styles.hint}>
          <Icon name="handshake" size={24} color={colors.onPrimarySoft} />
          <AppText style={styles.flex}>{t('visit.handOver', { name })}</AppText>
        </View>
        <View style={styles.fill} />
        <BigButton size="large" icon="play" label={t('visit.startCheckup')} onPress={() => setPhase('checkup')} />
        <BigButton kind="secondary" icon="skip" label={t('visit.skipCheckup')} onPress={() => setPhase('form')} />
      </Screen>
    );
  }

  if (phase === 'saved') {
    const prev = data.previous?.checkupScore ?? null;
    const change = score != null && prev != null && isCompleteCheckup(tasks) ? score - prev : null;
    return (
      <Screen>
        <View style={styles.fill} />
        <View style={styles.savedHead}>
          <Icon name="check-circle" size={72} weight="fill" color={colors.primary} />
          <AppText variant="title" center>
            {t('visit.saved')}
          </AppText>
        </View>
        <View style={styles.card}>
          <AppText variant="large" weight="bold">
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
          {refer ? <StatusLine status="urgent" text={t('visit.referred')} /> : null}
        </View>
        <View style={styles.fill} />
        <BigButton
          size="large"
          icon="arrow-left"
          label={t('visit.backToPatient')}
          onPress={() => {
            stopSpeaking();
            router.back();
          }}
        />
      </Screen>
    );
  }

  // ---- questions, one per screen (CommCare / CHT: one thing at a time, big answers) ----
  if (question < OBSERVATION_KEYS.length) {
    const key = OBSERVATION_KEYS[question];
    const answer = (option: string) => {
      setObs({ ...obs, [key]: option });
      // A short pause so the choice is seen, then the next question (Back to change it).
      setTimeout(() => setQuestion((q) => (q === question ? q + 1 : q)), ANSWER_PAUSE_MS);
    };
    return (
      <Screen>
        <TopBar
          onBack={() => (question > 0 ? setQuestion(question - 1) : setPhase('intro'))}
          title={t('visit.questionOf', { n: question + 1, total: OBSERVATION_KEYS.length })}
        />
        <View style={styles.track}>
          <View style={[styles.bar, { width: `${(question / OBSERVATION_KEYS.length) * 100}%` }]} />
        </View>
        <AppText variant="title">{t(`visit.obs.${key}.q`)}</AppText>
        <View style={styles.answers}>
          {OBSERVATIONS[key].map((option) => (
            <AnswerTile
              key={option}
              label={t(`visit.obs.${key}.${option}`)}
              selected={obs[key] === option}
              concerning={isConcerning(key, option)}
              onPress={() => answer(option)}
            />
          ))}
        </View>
        <BigButton kind="ghost" icon="skip" label={t('visit.skipQuestion')} onPress={() => setQuestion(question + 1)} />
      </Screen>
    );
  }

  // ---- finish: answers at a glance, note, referral, next visit ----
  return (
    <Screen>
      <TopBar onBack={() => setQuestion(OBSERVATION_KEYS.length - 1)} title={t('visit.finishTitle')} />

      <View style={styles.card}>
        <AppText variant="small" weight="bold" tone="muted">
          {t('visit.checkupTitle')}
        </AppText>
        <AppText variant="large" weight="bold">
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

      <View style={styles.list}>
        <AppText variant="small" weight="bold" tone="muted" style={styles.listTitle}>
          {t('visit.answersTitle')}
        </AppText>
        {OBSERVATION_KEYS.map((k, i) => {
          const v = obs[k];
          const worry = v != null && isConcerning(k, v);
          return (
            <PressableScale
              key={k}
              accessibilityRole="button"
              accessibilityLabel={`${t(`visit.obs.${k}.short`)}: ${v ? t(`visit.obs.${k}.${v}`) : t('visit.notAnswered')}`}
              onPress={() => setQuestion(i)}
              style={({ pressed }) => [styles.answerRow, pressed && styles.pressed]}
            >
              <AppText variant="body" style={styles.flex}>
                {t(`visit.obs.${k}.short`)}
              </AppText>
              {worry ? <Icon name="circle" size={14} weight="fill" color={colors.warning} /> : null}
              <AppText
                variant="body"
                weight="semibold"
                style={{ color: worry ? colors.warning : v ? colors.text : colors.textMuted }}
              >
                {v ? t(`visit.obs.${k}.${v}`) : t('visit.notAnswered')}
              </AppText>
              <Icon name="caret-right" size={20} color={colors.textMuted} />
            </PressableScale>
          );
        })}
      </View>

      <TextField
        label={t('visit.note')}
        placeholder={t('visit.notePlaceholder')}
        value={note}
        onChangeText={setNote}
        multiline
        style={styles.note}
      />

      <View style={[styles.referRow, refer && styles.referOn]}>
        <Icon name="stethoscope" size={26} color={refer ? colors.danger : colors.textMuted} />
        <AppText variant="body" weight="semibold" style={styles.flex}>
          {t('visit.refer')}
        </AppText>
        <Switch
          value={refer}
          onValueChange={setRefer}
          accessibilityLabel={t('visit.refer')}
          trackColor={{ true: colors.danger, false: colors.border }}
        />
      </View>

      <ChipGroup
        label={t('visit.nextVisit')}
        options={VISIT_INTERVAL_CHOICES.map(String)}
        value={String(days)}
        onChange={(v) => setNextDays(v == null ? null : Number(v))}
        labelFor={(d) => t('visit.inDays', { n: Number(d) })}
      />
      {nextDays == null ? (
        <AppText variant="caption" tone="muted">
          {t('visit.suggested', { n: suggested })}
        </AppText>
      ) : null}

      <BigButton size="large" icon="save" label={t('visit.save')} disabled={saving} onPress={save} />
    </Screen>
  );
}

/** One answer: a full-width tile with a radio mark; worrying answers carry an amber dot and a word. */
function AnswerTile({
  label,
  selected,
  concerning,
  onPress,
}: {
  label: string;
  selected: boolean;
  concerning: boolean;
  onPress: () => void;
}) {
  const { t } = useTranslation();
  return (
    <PressableScale
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [styles.answer, selected && styles.answerOn, pressed && !selected && styles.pressed]}
    >
      <Icon
        name={selected ? 'check-circle' : 'circle'}
        size={28}
        weight={selected ? 'fill' : 'regular'}
        color={selected ? colors.primary : colors.textMuted}
      />
      <AppText variant="large" weight="semibold" style={styles.flex}>
        {label}
      </AppText>
      {concerning ? (
        <View style={styles.worry}>
          <Icon name="circle" size={12} weight="fill" color={colors.warning} />
          <AppText variant="caption" weight="semibold" style={{ color: colors.warning }}>
            {t('visit.worthNoting')}
          </AppText>
        </View>
      ) : null}
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  flex: { flex: 1 },
  hint: {
    flexDirection: 'row',
    gap: space.sm + 4,
    alignItems: 'flex-start',
    padding: space.md,
    backgroundColor: colors.primaryWash,
    borderRadius: radius.md,
  },
  savedHead: { alignItems: 'center', gap: space.sm },
  card: {
    gap: space.xs,
    padding: space.md,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    boxShadow: shadow.card,
  },
  track: { height: 8, borderRadius: radius.pill, backgroundColor: colors.surfaceMuted, overflow: 'hidden' },
  bar: { height: 8, borderRadius: radius.pill, backgroundColor: colors.primary },
  answers: { gap: space.sm + 4 },
  answer: {
    minHeight: touch.medium,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingHorizontal: space.md,
    borderRadius: radius.md,
    borderWidth: 3,
    borderColor: 'transparent',
    backgroundColor: colors.surface,
    boxShadow: shadow.card,
  },
  answerOn: { borderColor: colors.primary, backgroundColor: colors.primaryWash },
  pressed: { backgroundColor: colors.primaryWash },
  worry: { flexDirection: 'row', alignItems: 'center', gap: space.xs },
  list: { backgroundColor: colors.surface, borderRadius: radius.md, boxShadow: shadow.card, paddingVertical: space.sm },
  listTitle: { paddingHorizontal: space.md, paddingBottom: space.xs },
  answerRow: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    paddingHorizontal: space.md,
  },
  note: { minHeight: 96, textAlignVertical: 'top', paddingTop: space.sm },
  referRow: {
    minHeight: touch.min + 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm + 4,
    paddingHorizontal: space.md,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    boxShadow: shadow.card,
  },
  referOn: { backgroundColor: colors.accentSoft },
});
