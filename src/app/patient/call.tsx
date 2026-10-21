import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { Card } from '@/components/Card';
import { Icon } from '@/components/Icon';
import { Picture } from '@/components/Picture';
import { Screen } from '@/components/Screen';
import { TopBar, TopBarButton } from '@/components/TopBar';
import { listFamilyContacts } from '@/db/repos/sos';
import { useDbQuery } from '@/db/useDbQuery';
import { callForHelp } from '@/services/sos';
import { speak, stopSpeaking } from '@/services/tts';
import { useSession } from '@/store/session';
import { useSettings } from '@/store/settings';
import { colors, radius, space } from '@/theme/tokens';

/** SOS with two or more family members: their pictures and names, one tap each (D53). */
export default function CallFamily() {
  const { t } = useTranslation();
  const patientId = useSession((s) => s.patientId) ?? '';
  const language = useSettings((s) => s.language);
  const { data: contacts } = useDbQuery((db) => listFamilyContacts(db, patientId), [patientId]);

  useEffect(() => {
    speak(t('sos.chooseSpoken'), language);
    return () => stopSpeaking();
  }, [t, language]);

  return (
    <Screen>
      <TopBar
        right={
          <TopBarButton
            icon="speaker"
            tonal
            label={t('common.speak')}
            onPress={() => speak(t('sos.chooseSpoken'), language)}
          />
        }
      />
      <AppText variant="title">{t('sos.chooseTitle')}</AppText>
      {(contacts ?? []).map((c) => (
        <Card
          key={c.userId}
          onPress={() => callForHelp(patientId, c)}
          accessibilityLabel={t('sos.call', { name: c.name })}
        >
          <View style={styles.row}>
            <View style={styles.avatar}>
              <Picture glyph={c.avatar ?? '🙂'} size={60} />
            </View>
            <View style={styles.text}>
              <AppText variant="large" weight="bold">
                {c.name}
              </AppText>
              {c.relation ? (
                <AppText variant="body" tone="muted">
                  {t(`relation.${c.relation}`, { defaultValue: c.relation })}
                </AppText>
              ) : null}
            </View>
            <View style={styles.call}>
              <Icon name="phone" size={30} weight="fill" color={colors.textOnPrimary} />
            </View>
          </View>
        </Card>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md, minHeight: 88 },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: radius.pill,
    backgroundColor: colors.tint.clay,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: { flex: 1, gap: 2 },
  call: {
    width: 60,
    height: 60,
    borderRadius: radius.pill,
    backgroundColor: colors.danger,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
