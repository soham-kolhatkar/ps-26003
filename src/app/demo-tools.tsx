import { router } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { BigButton } from '@/components/BigButton';
import { Screen } from '@/components/Screen';
import { DEMO_ACCOUNTS, DEMO_PIN, loadCloudDemo } from '@/cloud/demoSeed';
import { formatPhone } from '@/cloud/phone';
import { confirm } from '@/services/confirm';
import { kv } from '@/services/kv';
import { colors, radius, space } from '@/theme/tokens';

const LOADED_KEY = 'demo.cloudLoadedAt';

/**
 * Hidden presenter tool (F19): loads (or resets) the demo story in the cloud
 * for the 4-phone demo. Reached by holding the title on "Who will use this
 * phone?" or on ⚙️ Settings.
 */
export default function DemoTools() {
  const { t } = useTranslation();
  const [log, setLog] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadedAt, setLoadedAt] = useState(() => kv.get(LOADED_KEY));

  const load = async () => {
    if (
      !(await confirm(t('demoTools.confirmTitle'), t('demoTools.confirmBody'), t('demoTools.load'), t('common.cancel')))
    ) {
      return;
    }
    setBusy(true);
    setError(null);
    setLog([]);
    try {
      await loadCloudDemo((line) => setLog((l) => [...l, line]));
      const at = new Date().toLocaleString();
      kv.set(LOADED_KEY, at);
      setLoadedAt(at);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen>
      <BigButton
        kind="ghost"
        icon="⬅️"
        label={t('common.back')}
        onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}
      />
      <AppText variant="title">🎬 {t('demoTools.title')}</AppText>
      <AppText tone="muted">{t('demoTools.intro')}</AppText>

      <View style={styles.card}>
        {DEMO_ACCOUNTS.map((a) => (
          <AppText key={a.key}>
            <AppText bold>{t(`roles.${a.role}`)}</AppText> · {a.name} · 📱 {formatPhone(a.phone)}
          </AppText>
        ))}
        <AppText bold>🔒 PIN {DEMO_PIN}</AppText>
        <AppText variant="small" tone="muted">
          {t('demoTools.patients')}
        </AppText>
      </View>

      {loadedAt ? (
        <AppText variant="small" tone="muted">
          {t('demoTools.lastLoaded', { at: loadedAt })}
        </AppText>
      ) : null}
      <BigButton
        size="large"
        icon="☁️"
        label={busy ? t('demoTools.loading') : t('demoTools.load')}
        disabled={busy}
        onPress={load}
      />

      {log.length ? (
        <View style={styles.log} testID="demo-log">
          {log.map((line, i) => (
            <AppText key={i} variant="small">
              {line}
            </AppText>
          ))}
        </View>
      ) : null}
      {error ? (
        <View style={styles.error}>
          <AppText bold>⚠️ {error}</AppText>
        </View>
      ) : null}
      {log.at(-1)?.startsWith('✅') ? (
        <View style={styles.card}>
          <AppText bold>{t('demoTools.nextTitle')}</AppText>
          <AppText variant="small">{t('demoTools.next')}</AppText>
        </View>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: space.xs,
    padding: space.md,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  log: { gap: 2, padding: space.md, backgroundColor: colors.surfaceMuted, borderRadius: radius.md },
  error: { padding: space.md, backgroundColor: colors.warningSoft, borderRadius: radius.md },
});
