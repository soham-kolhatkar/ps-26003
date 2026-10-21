import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { BigButton } from '@/components/BigButton';
import { ChipGroup } from '@/components/Chip';
import { TopBar } from '@/components/TopBar';
import { Screen } from '@/components/Screen';
import { TextField } from '@/components/TextField';
import { getDb } from '@/db/client';
import { FAMILY_RELATIONS } from '@/db/models';
import { displayName, getPatient } from '@/db/repos/patients';
import { addPhoto } from '@/db/repos/photos';
import { useDbQuery } from '@/db/useDbQuery';
import { storePhoto } from '@/services/photos';
import { usePendingPhoto } from '@/store/pendingPhoto';
import { useSession } from '@/store/session';
import { radius, shadow } from '@/theme/tokens';

export default function NewPhoto() {
  const { t } = useTranslation();
  const { patientId } = useLocalSearchParams<{ patientId: string }>();
  const uri = usePendingPhoto((s) => s.uri);
  const setUri = usePendingPhoto((s) => s.setUri);
  const userId = useSession((s) => s.userId);
  const { data: patient } = useDbQuery((db) => getPatient(db, patientId), [patientId]);
  const [personName, setPersonName] = useState('');
  const [relation, setRelation] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const close = () => {
    setUri(null);
    router.back();
  };

  const save = async () => {
    if (!uri) return;
    setSaving(true);
    try {
      const stored = await storePhoto(uri);
      await addPhoto(getDb(), { patientId, uri: stored, personName, relation, addedBy: userId });
      close();
    } catch (e) {
      console.warn('Saving photo failed', e);
      Alert.alert(t('photos.saveFailed'));
      setSaving(false);
    }
  };

  return (
    <Screen>
      <TopBar onBack={close} backLabel={t('common.cancel')} backIcon="x" />
      <AppText variant="title">{t('photos.addTitle')}</AppText>
      <View style={styles.preview}>
        {uri ? (
          <Image
            source={{ uri }}
            style={styles.image}
            contentFit="cover"
            onError={(e) => console.warn('Photo preview failed to load', uri, e.error)}
          />
        ) : (
          <View style={styles.image} />
        )}
      </View>

      <TextField
        label={t('photos.nameLabel')}
        placeholder={t('photos.namePlaceholder')}
        value={personName}
        onChangeText={setPersonName}
        autoCapitalize="words"
        returnKeyType="done"
      />

      <ChipGroup
        label={t('photos.relationLabel', { name: patient ? displayName(patient) : '' })}
        options={FAMILY_RELATIONS}
        value={relation}
        onChange={setRelation}
        labelFor={(r) => t(`relation.${r}`)}
      />

      <BigButton
        size="large"
        icon="save"
        label={t('photos.save')}
        disabled={!uri || !personName.trim() || saving}
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
    boxShadow: shadow.card,
  },
  image: { width: 220, height: 220 },
});
