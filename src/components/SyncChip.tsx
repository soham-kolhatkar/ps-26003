import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet } from 'react-native';

import { AppText } from '@/components/AppText';
import { Icon, type IconName } from '@/components/Icon';
import { nowMs } from '@/engine/clock';
import { useSyncStore } from '@/store/sync';
import { syncNow } from '@/sync/run';
import { colors, radius, space } from '@/theme/tokens';

/** "Synced 2 min ago" · "3 changes waiting" · "Offline: saved on this phone", each with an icon. Tap = sync now. */
export function SyncChip() {
  const { t } = useTranslation();
  const { state, lastSyncedAt, pending } = useSyncStore();
  const [now, setNow] = useState(() => nowMs());
  useEffect(() => {
    const id = setInterval(() => setNow(nowMs()), 30_000);
    return () => clearInterval(id);
  }, []);

  const minutes = lastSyncedAt ? Math.max(0, Math.round((now - lastSyncedAt) / 60_000)) : null;
  const [icon, text]: [IconName, string] =
    state === 'syncing'
      ? ['redo', t('sync.syncing')]
      : state === 'offline'
        ? ['cloud-off', t('sync.offline', { count: pending })]
        : state === 'error'
          ? ['warning', t('sync.error')]
          : pending > 0
            ? ['hourglass', t('sync.waiting', { count: pending })]
            : minutes == null
              ? ['cloud', t('sync.notYet')]
              : ['cloud-check', minutes === 0 ? t('sync.justNow') : t('sync.ago', { n: minutes })];
  const warn = state === 'offline' || state === 'error';
  const ok = icon === 'cloud-check';

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${text}. ${t('sync.tapToSync')}`}
      onPress={() => syncNow().catch(() => {})}
      style={[styles.chip, ok && styles.ok, warn && styles.warn]}
      testID="sync-chip"
      hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
    >
      <Icon name={icon} size={18} color={warn ? colors.warning : ok ? colors.success : colors.textMuted} />
      <AppText variant="caption" bold style={{ color: warn ? colors.warning : ok ? colors.success : colors.textMuted }}>
        {text}
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.xs + 2,
    minHeight: 36,
    paddingHorizontal: space.sm + 4,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceMuted,
  },
  ok: { backgroundColor: colors.successSoft },
  warn: { backgroundColor: colors.warningSoft },
});
