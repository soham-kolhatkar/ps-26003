import { Image } from 'expo-image';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { BigButton } from '@/components/BigButton';
import { Screen } from '@/components/Screen';
import { getDb } from '@/db/client';
import type { Photo } from '@/db/models';
import { displayName, getPatient } from '@/db/repos/patients';
import { countPeople, deletePhoto, listPhotos } from '@/db/repos/photos';
import { useDbQuery } from '@/db/useDbQuery';
import { MIN_PEOPLE } from '@/games/photo-recall/rounds';
import { deletePhotoFile, pickPhoto } from '@/services/photos';
import { colors, radius, space } from '@/theme/tokens';

export default function FamilyPhotos() {
  const { t } = useTranslation();
  const { width } = useWindowDimensions();
  const { patientId } = useLocalSearchParams<{ patientId: string }>();
  const { data, reload } = useDbQuery(
    async (db) => ({
      patient: await getPatient(db, patientId),
      photos: await listPhotos(db, patientId),
      people: await countPeople(db, patientId),
    }),
    [patientId],
  );
  useFocusEffect(useCallback(() => reload(), [reload]));

  const name = data?.patient ? displayName(data.patient) : '';

  const add = async (source: 'camera' | 'library') => {
    const result = await pickPhoto(source);
    if (result.status === 'denied') Alert.alert(t('photos.cameraDenied'));
    if (result.status !== 'ok') return;
    router.push({ pathname: '/caregiver/photo-new', params: { patientId, uri: result.uri } });
  };

  const confirmDelete = (photo: Photo) => {
    Alert.alert(t('photos.deleteTitle'), t('photos.deleteBody', { name: photo.personName }), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('photos.delete'),
        style: 'destructive',
        onPress: async () => {
          await deletePhoto(getDb(), photo.id);
          deletePhotoFile(photo.uri);
          reload();
        },
      },
    ]);
  };

  const tile = Math.floor((width - space.lg * 2 - space.md) / 2);

  return (
    <Screen>
      <BigButton kind="ghost" icon="⬅️" label={t('common.back')} onPress={() => router.back()} />
      <View>
        <AppText variant="title">{t('photos.title')}</AppText>
        <AppText tone="muted">{t('photos.subtitle', { name })}</AppText>
      </View>

      <View style={[styles.banner, (data?.people ?? 0) >= MIN_PEOPLE && styles.bannerOk]}>
        <AppText variant="small">
          {(data?.people ?? 0) >= MIN_PEOPLE
            ? t('photos.unlocked', { name, count: data?.people })
            : t('photos.unlockHint', { name })}
        </AppText>
      </View>

      <BigButton icon="📷" label={t('photos.takePhoto')} onPress={() => add('camera')} />
      <BigButton kind="secondary" icon="🖼️" label={t('photos.choose')} onPress={() => add('library')} />
      <AppText variant="caption" tone="muted">
        {t('photos.privacy')}
      </AppText>

      {data && data.photos.length === 0 ? <AppText tone="muted">{t('photos.empty')}</AppText> : null}
      <View style={styles.grid}>
        {data?.photos.map((photo) => (
          <Pressable
            key={photo.id}
            accessibilityRole="button"
            accessibilityLabel={`${photo.personName}. ${t('photos.delete')}`}
            onLongPress={() => confirmDelete(photo)}
            onPress={() => confirmDelete(photo)}
            style={[styles.tile, { width: tile }]}
          >
            <Image source={{ uri: photo.uri }} style={{ width: tile, height: tile }} contentFit="cover" />
            <View style={styles.caption}>
              <AppText variant="body" bold numberOfLines={1}>
                {photo.personName}
              </AppText>
              {photo.relation ? (
                <AppText variant="caption" tone="muted" numberOfLines={1}>
                  {t(`relation.${photo.relation}`, { defaultValue: photo.relation })}
                </AppText>
              ) : null}
            </View>
          </Pressable>
        ))}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  banner: {
    backgroundColor: colors.warningSoft,
    borderColor: colors.warning,
    borderWidth: 1,
    borderRadius: radius.md,
    padding: space.md,
  },
  bannerOk: { backgroundColor: colors.successSoft, borderColor: colors.success },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: space.md },
  tile: {
    borderRadius: radius.md,
    overflow: 'hidden',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  caption: { padding: space.sm },
});
