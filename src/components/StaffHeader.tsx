import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { Picture } from '@/components/Picture';
import { SyncChip } from '@/components/SyncChip';
import { TopBarButton } from '@/components/TopBar';
import type { AppUser } from '@/db/models';
import { useDevice } from '@/store/device';
import { useSession } from '@/store/session';
import { colors, radius, space } from '@/theme/tokens';

/**
 * Staff home header: sync status and Settings (cloud) or Sign out (demo) on top,
 * then the greeting with role and organisation. Sign out lives in Settings on cloud phones.
 */
export function StaffHeader({ user }: { user: AppUser }) {
  const { t } = useTranslation();
  const signOut = useSession((s) => s.signOut);
  const cloud = useDevice((s) => s.mode) === 'cloud';

  return (
    <View style={styles.wrap}>
      <View style={styles.top}>
        {cloud ? <SyncChip /> : <View />}
        {cloud ? (
          <TopBarButton icon="gear" label={t('settings.title')} onPress={() => router.push('/settings')} />
        ) : (
          <TopBarButton
            icon="sign-out"
            label={t('common.signOut')}
            onPress={() => {
              signOut();
              router.replace('/roles');
            }}
          />
        )}
      </View>
      <View style={styles.row}>
        <View style={styles.avatar}>
          <Picture glyph={user.avatar ?? '🙂'} size={44} />
        </View>
        <View style={styles.text}>
          <AppText variant="title">{t('staff.hello', { name: user.name.split(' ')[0] })}</AppText>
          <AppText variant="small" tone="muted">
            {[t(`roles.${user.role}`), user.organization].filter(Boolean).join(' · ')}
          </AppText>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: space.md },
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.sm },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: { flex: 1 },
});
