import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { BigButton } from '@/components/BigButton';
import { SyncChip } from '@/components/SyncChip';
import type { AppUser } from '@/db/models';
import { useDevice } from '@/store/device';
import { useSession } from '@/store/session';
import { space } from '@/theme/tokens';

/** Greeting + role/organisation + sign-out (demo) or settings (cloud), shared by all staff home screens. */
export function StaffHeader({ user }: { user: AppUser }) {
  const { t } = useTranslation();
  const signOut = useSession((s) => s.signOut);
  const cloud = useDevice((s) => s.mode) === 'cloud';

  return (
    <View style={styles.wrap}>
      <View style={styles.row}>
        <AppText variant="hero" importantForAccessibility="no">
          {user.avatar ?? '🙂'}
        </AppText>
        <View style={styles.text}>
          <AppText variant="title">{t('staff.hello', { name: user.name.split(' ')[0] })}</AppText>
          <AppText variant="small" tone="muted">
            {[t(`roles.${user.role}`), user.organization].filter(Boolean).join(' · ')}
          </AppText>
        </View>
      </View>
      {cloud ? <SyncChip /> : null}
      {cloud ? (
        <BigButton kind="ghost" icon="⚙️" label={t('settings.title')} onPress={() => router.push('/settings')} />
      ) : (
        <BigButton
          kind="ghost"
          icon="↩️"
          label={t('common.signOut')}
          onPress={() => {
            signOut();
            router.replace('/roles');
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: space.sm },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  text: { flex: 1 },
});
