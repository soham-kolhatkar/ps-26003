import { Directory, File, Paths } from 'expo-file-system';
import * as ImagePicker from 'expo-image-picker';

import { newId } from '@/db/ids';

/**
 * Family photos are copied into the app's private document directory, so
 * they survive the original being deleted from the gallery and never leave
 * the phone (no cloud upload).
 */
const photosDir = () => new Directory(Paths.document, 'photos');

export type PickResult = { status: 'ok'; uri: string } | { status: 'canceled' } | { status: 'denied' };

const PICK_OPTIONS: ImagePicker.ImagePickerOptions = {
  mediaTypes: ['images'],
  allowsEditing: true,
  aspect: [1, 1],
  quality: 0.7,
};

/** Opens the camera or gallery with a square crop. Returns a temporary uri. */
export async function pickPhoto(source: 'camera' | 'library'): Promise<PickResult> {
  if (source === 'camera') {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) return { status: 'denied' };
  }
  const result =
    source === 'camera'
      ? await ImagePicker.launchCameraAsync(PICK_OPTIONS)
      : await ImagePicker.launchImageLibraryAsync(PICK_OPTIONS);
  if (result.canceled || !result.assets?.[0]) return { status: 'canceled' };
  return { status: 'ok', uri: result.assets[0].uri };
}

/** Copies a picked image into permanent app storage and returns its uri. */
export async function storePhoto(tempUri: string): Promise<string> {
  const dir = photosDir();
  if (!dir.exists) dir.create({ intermediates: true, idempotent: true });
  const ext = /\.(jpe?g|png|heic|webp)$/i.exec(tempUri)?.[0] ?? '.jpg';
  const dest = new File(dir, `${newId()}${ext.toLowerCase()}`);
  await new File(tempUri).copy(dest);
  return dest.uri;
}

/** Best-effort file removal; a missing file is not an error. */
export function deletePhotoFile(uri: string): void {
  try {
    const file = new File(uri);
    if (file.exists) file.delete();
  } catch (e) {
    console.warn('Could not delete photo file', e);
  }
}

/** Removes every stored family photo (used by "Reset demo data"). */
export function clearAllPhotoFiles(): void {
  try {
    const dir = photosDir();
    if (dir.exists) dir.delete();
  } catch (e) {
    console.warn('Could not clear photos', e);
  }
}
