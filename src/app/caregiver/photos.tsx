import { Image } from 'expo-image';
import { router, useFocusEffect, useLocalSearchParams, usePathname } from 'expo-router';
import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { Icon } from '@/components/Icon';
import { StatusLine } from '@/components/StatusLine';
import { BigButton } from '@/components/BigButton';
import { TopBar } from '@/components/TopBar';
import { Screen } from '@/components/Screen';
import { getDb } from '@/db/client';
import type { Photo } from '@/db/models';
import { displayName, getPatient } from '@/db/repos/patients';
import { countPeople, deletePhoto, listPhotos } from '@/db/repos/photos';
import { useDbQuery } from '@/db/useDbQuery';
import { MIN_PEOPLE } from '@/games/photo-recall/rounds';
import { deletePhotoFile, pickPhoto } from '@/services/photos';
import { usePendingPhoto } from '@/store/pendingPhoto';
import { colors, radius, shadow, space } from '@/theme/tokens';

/** Also mounted on the patient's phone (family corner, `/patient/photos`): photos stay on that phone. */
export default function FamilyPhotos() {
  const onPatientPhone = usePathname().startsWith('/patient');
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
    usePendingPhoto.getState().setUri(result.uri);
    router.push({ pathname: onPatientPhone ? '/patient/photo-new' : '/caregiver/photo-new', params: { patientId } });
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

  // Two per row inside the screen's 20 dp side padding.
  const tile = Math.floor((width - 20 * 2 - space.md) / 2);

  return (
    <Screen>
      <TopBar />
      <View>
        <AppText variant="title">{t('photos.title')}</AppText>
        <AppText tone="muted">{t('photos.subtitle', { name })}</AppText>
      </View>

      <StatusLine
        status={(data?.people ?? 0) >= MIN_PEOPLE ? 'well' : 'info'}
        text={
          (data?.people ?? 0) >= MIN_PEOPLE
            ? t('photos.unlocked', { name, count: data?.people })
            : t('photos.unlockHint', { name })
        }
      />

      <BigButton icon="camera" label={t('photos.takePhoto')} onPress={() => add('camera')} />
      <BigButton kind="secondary" icon="image" label={t('photos.choose')} onPress={() => add('library')} />
      <View style={styles.privacy}>
        <Icon name="lock" size={18} color={colors.textMuted} />
        <AppText variant="caption" tone="muted" style={styles.flex}>
          {t('photos.privacy')}
        </AppText>
      </View>

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
            <Image
              source={{ uri: photo.uri }}
              style={{ width: tile, height: tile }}
              contentFit="cover"
              onError={(e) => console.warn('Photo failed to load', photo.uri, e.error)}
            />
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
  privacy: { flexDirection: 'row', gap: space.sm, alignItems: 'flex-start' },
  flex: { flex: 1 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: space.md },
  tile: {
    borderRadius: radius.md,
    overflow: 'hidden',
    backgroundColor: colors.surface,
    boxShadow: shadow.card,
  },
  caption: { padding: space.sm },
});
