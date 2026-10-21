import { useFocusEffect } from 'expo-router';
import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { Icon } from '@/components/Icon';
import { PressableScale } from '@/components/PressableScale';
import { getDb } from '@/db/client';
import { listUnseenSos, markSosSeen } from '@/db/repos/sos';
import { useDbQuery } from '@/db/useDbQuery';
import { formatShortDate, formatTime } from '@/services/datetime';
import { useSettings } from '@/store/settings';
import { useCloudRefresh } from '@/sync/refresh';
import { colors, radius, space } from '@/theme/tokens';

const SHOW_FOR_MS = 24 * 60 * 60 * 1000;

/**
 * Top of the caregiver and ASHA homes (D53): "Kamala pressed SOS · 3:10 pm · calling Priya",
 * one banner per press of the last 24 h, until this phone's "OK, seen".
 */
export function SosBanner({ patientIds }: { patientIds: readonly string[] }) {
  const { t } = useTranslation();
  const language = useSettings((s) => s.language);
  const key = patientIds.join(',');
  const { data, reload } = useDbQuery(
    (db) => listUnseenSos(db, key ? key.split(',') : [], Date.now() - SHOW_FOR_MS),
    [key],
  );
  useFocusEffect(useCallback(() => reload(), [reload]));
  useCloudRefresh(reload);

  if (!data?.length) return null;
  return (
    <View style={styles.list}>
      {data.map((e) => {
        const at = new Date(e.createdAt);
        const when = `${formatShortDate(at, language)} · ${formatTime(at, language)}`;
        return (
          <View
            key={e.id}
            style={styles.banner}
            accessible
            accessibilityRole="alert"
            accessibilityLabel={`${t('sos.bannerTitle', { name: e.patientName })}. ${when}`}
            testID="sos-banner"
          >
            <View style={styles.icon}>
              <Icon name="phone" size={24} weight="fill" color={colors.textOnPrimary} />
            </View>
            <View style={styles.text}>
              <AppText variant="large" weight="bold" style={styles.title}>
                {t('sos.bannerTitle', { name: e.patientName })}
              </AppText>
              <AppText variant="small" weight="semibold" style={styles.title}>
                {e.calledName
                  ? t('sos.bannerCalled', { time: when, called: e.calledName.split(' ')[0] })
                  : t('sos.bannerTime', { time: when })}
              </AppText>
              <PressableScale
                accessibilityRole="button"
                accessibilityLabel={t('sos.seen')}
                onPress={async () => {
                  await markSosSeen(getDb(), [e.id]);
                  reload();
                }}
                style={({ pressed }) => [styles.seen, pressed && styles.pressed]}
              >
                <Icon name="check" size={20} color={colors.danger} />
                <AppText variant="small" weight="semibold" tone="accent">
                  {t('sos.seen')}
                </AppText>
              </PressableScale>
            </View>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  list: { gap: space.sm + 4 },
  banner: {
    flexDirection: 'row',
    gap: space.md,
    padding: space.md,
    borderRadius: radius.md,
    backgroundColor: colors.accentSoft,
  },
  icon: {
    width: 48,
    height: 48,
    borderRadius: radius.pill,
    backgroundColor: colors.danger,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: { flex: 1, gap: space.xs },
  title: { color: colors.danger },
  seen: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.xs + 2,
    minHeight: 48,
    marginTop: space.xs,
    paddingHorizontal: space.md,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
  },
  pressed: { opacity: 0.85 },
});
