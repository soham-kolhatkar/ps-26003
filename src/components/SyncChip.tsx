import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet } from 'react-native';

import { AppText } from '@/components/AppText';
import { nowMs } from '@/engine/clock';
import { useSyncStore } from '@/store/sync';
import { syncNow } from '@/sync/run';
import { colors, radius, space } from '@/theme/tokens';

/** "✓ Synced 2 min ago" · "⏳ 3 changes waiting" · "📴 Offline: saved on this phone". Tap = sync now. */
export function SyncChip() {
  const { t } = useTranslation();
  const { state, lastSyncedAt, pending } = useSyncStore();
  const [now, setNow] = useState(() => nowMs());
  useEffect(() => {
    const id = setInterval(() => setNow(nowMs()), 30_000);
    return () => clearInterval(id);
  }, []);

  const minutes = lastSyncedAt ? Math.max(0, Math.round((now - lastSyncedAt) / 60_000)) : null;
  const text =
    state === 'syncing'
      ? `🔄 ${t('sync.syncing')}`
      : state === 'offline'
        ? `📴 ${t('sync.offline', { count: pending })}`
        : state === 'error'
          ? `⚠️ ${t('sync.error')}`
          : pending > 0
            ? `⏳ ${t('sync.waiting', { count: pending })}`
            : minutes == null
              ? `☁️ ${t('sync.notYet')}`
              : `✓ ${minutes === 0 ? t('sync.justNow') : t('sync.ago', { n: minutes })}`;
  const warn = state === 'offline' || state === 'error';

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${text}. ${t('sync.tapToSync')}`}
      onPress={() => syncNow().catch(() => {})}
      style={[styles.chip, warn && styles.warn]}
      testID="sync-chip"
    >
      <AppText variant="caption" bold>
        {text}
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    alignSelf: 'flex-start',
    paddingVertical: space.xs,
    paddingHorizontal: space.sm,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceMuted,
  },
  warn: { backgroundColor: colors.warningSoft },
});
