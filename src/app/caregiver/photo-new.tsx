import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { BigButton } from '@/components/BigButton';
import { Screen } from '@/components/Screen';
import { TextField } from '@/components/TextField';
import { getDb } from '@/db/client';
import { FAMILY_RELATIONS } from '@/db/models';
import { displayName, getPatient } from '@/db/repos/patients';
import { addPhoto } from '@/db/repos/photos';
import { useDbQuery } from '@/db/useDbQuery';
import { storePhoto } from '@/services/photos';
import { useSession } from '@/store/session';
import { colors, radius, space } from '@/theme/tokens';

export default function NewPhoto() {
  const { t } = useTranslation();
  const { patientId, uri } = useLocalSearchParams<{ patientId: string; uri: string }>();
  const userId = useSession((s) => s.userId);
  const { data: patient } = useDbQuery((db) => getPatient(db, patientId), [patientId]);
  const [personName, setPersonName] = useState('');
  const [relation, setRelation] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      const stored = await storePhoto(uri);
      await addPhoto(getDb(), { patientId, uri: stored, personName, relation, addedBy: userId });
      router.back();
    } catch (e) {
      console.warn('Saving photo failed', e);
      Alert.alert(t('photos.saveFailed'));
      setSaving(false);
    }
  };

  return (
    <Screen>
      <BigButton kind="ghost" icon="✖️" label={t('common.cancel')} onPress={() => router.back()} />
      <AppText variant="title">{t('photos.addTitle')}</AppText>
      <View style={styles.preview}>
        <Image source={{ uri }} style={styles.image} contentFit="cover" />
      </View>

      <TextField
        label={t('photos.nameLabel')}
        placeholder={t('photos.namePlaceholder')}
        value={personName}
        onChangeText={setPersonName}
        autoCapitalize="words"
        returnKeyType="done"
      />

      <AppText variant="small" bold>
        {t('photos.relationLabel', { name: patient ? displayName(patient) : '' })}
      </AppText>
      <View style={styles.chips}>
        {FAMILY_RELATIONS.map((r) => (
          <Pressable
            key={r}
            accessibilityRole="button"
            accessibilityState={{ selected: relation === r }}
            onPress={() => setRelation(relation === r ? null : r)}
            style={[styles.chip, relation === r && styles.chipOn]}
          >
            <AppText variant="small" bold tone={relation === r ? 'onPrimary' : 'primary'}>
              {t(`relation.${r}`)}
            </AppText>
          </Pressable>
        ))}
      </View>

      <BigButton
        size="large"
        icon="💾"
        label={t('photos.save')}
        disabled={!personName.trim() || saving}
        onPress={save}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  preview: {
    alignSelf: 'center',
    borderRadius: radius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
  },
  image: { width: 220, height: 220 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  chip: {
    minHeight: 48,
    justifyContent: 'center',
    paddingHorizontal: space.md,
    borderRadius: radius.pill,
    borderWidth: 2,
    borderColor: colors.primary,
    backgroundColor: colors.surface,
  },
  chipOn: { backgroundColor: colors.primary },
});
