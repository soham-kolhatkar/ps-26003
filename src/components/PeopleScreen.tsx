import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Share, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { AuthErrorText } from '@/components/AuthErrorText';
import { BigButton } from '@/components/BigButton';
import { ChipGroup } from '@/components/Chip';
import { Screen } from '@/components/Screen';
import { CloudError } from '@/cloud/errors';
import {
  createInvite,
  fetchPeople,
  leavePatient,
  removeMember,
  type Invite,
  type MemberRole,
  type PeopleSnapshot,
} from '@/cloud/people';
import { formatPhone } from '@/cloud/phone';
import { FAMILY_RELATIONS } from '@/db/models';
import { nowMs } from '@/engine/clock';
import { confirm } from '@/services/confirm';
import { formatTime } from '@/services/datetime';
import { useAccount } from '@/store/account';
import { useSettings } from '@/store/settings';
import { refreshPeople } from '@/sync/refresh';
import { colors, radius, space } from '@/theme/tokens';

const ROLE_ICON: Record<MemberRole, string> = { caregiver: '👩', asha: '🧑‍⚕️', doctor: '🩺', device: '📱' };
const INVITABLE = ['asha', 'doctor', 'caregiver'] as const;

/**
 * Who is linked to one patient (`?patientId=`), live from the cloud. Managers
 * pair the patient's phone and invite ASHA / doctor / family with 6-digit
 * codes; anyone can leave. Needs internet (it is about the shared record).
 */
export function PeopleScreen() {
  const { t } = useTranslation();
  const { patientId } = useLocalSearchParams<{ patientId: string }>();
  const me = useAccount((s) => s.uid);
  const language = useSettings((s) => s.language);
  const [snap, setSnap] = useState<PeopleSnapshot | null>(null);
  const [error, setError] = useState<CloudError | null>(null);
  const [invite, setInvite] = useState<(Invite & { role: MemberRole }) | null>(null);
  const [familyRelation, setFamilyRelation] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    fetchPeople()
      .then((s) => {
        setSnap(s);
        setError(null);
      })
      .catch((e) => setError(e instanceof CloudError ? e : new CloudError('generic')));
  }, []);
  useFocusEffect(load);

  const patient = snap?.patients.find((p) => p.id === patientId);
  const members = (snap?.members ?? []).filter((m) => m.patient_id === patientId);
  const profile = (uid: string) => snap?.profiles.find((p) => p.id === uid);
  const amManager = members.some((m) => m.user_id === me && m.is_manager);
  const device = members.find((m) => m.role === 'device');
  const name = patient?.preferred_name || patient?.name || '';

  const run = async (work: () => Promise<void>) => {
    setBusy(true);
    setError(null);
    try {
      await work();
    } catch (e) {
      setError(e instanceof CloudError ? e : new CloudError('generic'));
    } finally {
      setBusy(false);
    }
  };

  const makeInvite = (role: MemberRole) =>
    run(async () => {
      const inv = await createInvite(patientId, role, role === 'caregiver' ? (familyRelation ?? undefined) : undefined);
      setInvite({ ...inv, role });
    });

  const remove = async (uid: string, label: string) => {
    if (
      !(await confirm(
        t('people.removeTitle', { name: label }),
        t('people.removeBody'),
        t('people.remove'),
        t('common.cancel'),
      ))
    ) {
      return;
    }
    await run(async () => {
      await removeMember(patientId, uid);
      load();
    });
  };

  const leave = async () => {
    if (
      !(await confirm(t('people.leaveTitle', { name }), t('people.leaveBody'), t('people.leave'), t('common.cancel')))
    ) {
      return;
    }
    await run(async () => {
      await leavePatient(patientId);
      await refreshPeople();
      // The patient's pages are gone from this phone now: back to this role's home.
      if (router.canDismiss()) router.dismissAll();
      router.replace('/');
    });
  };

  if (invite)
    return (
      <InviteCode
        invite={invite}
        patientName={name}
        onDone={() => {
          setInvite(null);
          load();
        }}
      />
    );

  return (
    <Screen>
      <BigButton kind="ghost" icon="⬅️" label={t('common.back')} onPress={() => router.back()} />
      <AppText variant="title">👥 {t('people.title', { name })}</AppText>
      <AuthErrorText error={error} phoneRole="" />
      {!snap && !error ? <AppText tone="muted">{t('common.loading')}</AppText> : null}

      {members
        .filter((m) => m.role !== 'device')
        .map((m) => {
          const p = profile(m.user_id);
          const label = p?.name ?? t(`roles.${m.role}`);
          return (
            <View key={m.user_id} style={styles.member}>
              <AppText variant="large" bold>
                {ROLE_ICON[m.role]} {label}
                {m.user_id === me ? ` (${t('people.you')})` : ''}
              </AppText>
              <AppText variant="small" tone="muted">
                {[
                  m.role === 'caregiver' && m.relation ? t(`relation.${m.relation}`) : t(`roles.${m.role}`),
                  p?.organization,
                  m.is_manager ? `⭐ ${t('people.manager')}` : null,
                  p?.phone ? formatPhone(p.phone) : null,
                ]
                  .filter(Boolean)
                  .join(' · ')}
              </AppText>
              {amManager && m.user_id !== me ? (
                <BigButton kind="ghost" icon="➖" label={t('people.remove')} onPress={() => remove(m.user_id, label)} />
              ) : null}
            </View>
          );
        })}

      {snap ? (
        <View style={[styles.member, device ? styles.paired : styles.unpaired]}>
          <AppText bold>📱 {t(device ? 'people.phonePaired' : 'people.phoneNotPaired', { name })}</AppText>
        </View>
      ) : null}

      {amManager ? (
        <>
          <AppText variant="large" bold>
            {t('people.addTitle')}
          </AppText>
          <BigButton
            icon="📱"
            label={t(device ? 'people.repairPhone' : 'people.pairPhone', { name })}
            disabled={busy}
            onPress={() => makeInvite('device')}
          />
          {INVITABLE.map((role) => (
            <View key={role} style={styles.invite}>
              {role === 'caregiver' ? (
                <ChipGroup
                  label={t('people.familyRelation', { name })}
                  options={FAMILY_RELATIONS}
                  value={familyRelation}
                  onChange={setFamilyRelation}
                  labelFor={(r) => t(`relation.${r}`)}
                />
              ) : null}
              <BigButton
                kind="secondary"
                icon={ROLE_ICON[role]}
                label={t(`people.invite.${role}`)}
                disabled={busy}
                onPress={() => makeInvite(role)}
              />
            </View>
          ))}
        </>
      ) : snap ? (
        <AppText variant="small" tone="muted">
          {t('people.notManager')}
        </AppText>
      ) : null}

      {snap ? <BigButton kind="ghost" icon="🚪" label={t('people.leave')} disabled={busy} onPress={leave} /> : null}
      <AppText variant="caption" tone="muted">
        {t('people.updated', { time: formatTime(new Date(nowMs()), language) })}
      </AppText>
    </Screen>
  );
}

/** The code, big, with its expiry and a ready-to-send message. */
function InviteCode({
  invite,
  patientName,
  onDone,
}: {
  invite: Invite & { role: MemberRole };
  patientName: string;
  onDone: () => void;
}) {
  const { t } = useTranslation();
  const language = useSettings((s) => s.language);
  const [now, setNow] = useState(() => nowMs());
  useEffect(() => {
    const id = setInterval(() => setNow(nowMs()), 15000);
    return () => clearInterval(id);
  }, []);
  const expired = now > invite.expiresAt;
  const until =
    invite.role === 'device'
      ? t('people.code.until', { time: formatTime(new Date(invite.expiresAt), language) })
      : t('people.code.days');
  const spaced = `${invite.code.slice(0, 3)} ${invite.code.slice(3)}`;
  const message = t(invite.role === 'device' ? 'people.code.messageDevice' : 'people.code.message', {
    name: patientName,
    code: spaced,
    until,
  });

  return (
    <Screen>
      <AppText variant="title">{t(`people.code.title.${invite.role}`, { name: patientName })}</AppText>
      <View style={styles.codeBox} accessible accessibilityLabel={invite.code.split('').join(' ')}>
        <AppText style={styles.code} testID="invite-code">
          {expired ? '— — —' : spaced}
        </AppText>
        <AppText tone="muted" center>
          {expired ? t('people.code.expired') : until}
        </AppText>
      </View>
      <View style={styles.member}>
        <AppText>
          {t(invite.role === 'device' ? 'people.code.howDevice' : 'people.code.how', { name: patientName })}
        </AppText>
      </View>
      {!expired && invite.role !== 'device' ? (
        <BigButton icon="📤" label={t('people.code.share')} onPress={() => Share.share({ message }).catch(() => {})} />
      ) : null}
      <BigButton kind="secondary" icon="✅" label={t('people.code.done')} onPress={onDone} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  member: {
    gap: space.xs,
    padding: space.md,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  paired: { backgroundColor: colors.successSoft, borderColor: colors.success },
  unpaired: { backgroundColor: colors.warningSoft, borderColor: colors.warning },
  invite: { gap: space.sm },
  codeBox: {
    alignItems: 'center',
    gap: space.sm,
    padding: space.lg,
    borderRadius: radius.lg,
    backgroundColor: colors.primarySoft,
  },
  code: { fontSize: 56, lineHeight: 68, fontWeight: '700', letterSpacing: 6, color: colors.primary },
});
