import { Image } from 'expo-image';
import { StyleSheet, Text, View, type ViewStyle } from 'react-native';

import { PICTURE_ASSETS } from '@/components/pictureAssets';

/** The bundled picture for a glyph, if there is one. */
export function pictureFor(glyph: string | null | undefined): number | undefined {
  if (!glyph) return undefined;
  return PICTURE_ASSETS[glyph] ?? PICTURE_ASSETS[glyph.replace(/️/g, '')];
}

type PictureProps = {
  /** The glyph stored in the data (items, routine steps, avatars). */
  glyph: string | null | undefined;
  size: number;
  /** Spoken name; omit for decorative pictures next to a text label. */
  label?: string;
  style?: ViewStyle;
};

/**
 * One consistent picture set (Microsoft Fluent Emoji 3D, bundled, offline) instead
 * of the phone's own emoji, which look different on every brand (D50).
 * Unknown glyphs fall back to the platform emoji so nothing ever disappears.
 */
export function Picture({ glyph, size, label, style }: PictureProps) {
  const source = pictureFor(glyph);
  const a11y = label
    ? { accessible: true, accessibilityRole: 'image' as const, accessibilityLabel: label }
    : { accessible: false, importantForAccessibility: 'no-hide-descendants' as const };
  if (!source) {
    return (
      <View style={[styles.box, { width: size, height: size }, style]} {...a11y}>
        <Text style={{ fontSize: size * 0.78, lineHeight: size }}>{glyph ?? ''}</Text>
      </View>
    );
  }
  return (
    <View style={[{ width: size, height: size }, style]} {...a11y}>
      <Image source={source} style={styles.fill} contentFit="contain" transition={0} />
    </View>
  );
}

const styles = StyleSheet.create({
  box: { alignItems: 'center', justifyContent: 'center' },
  fill: { width: '100%', height: '100%' },
});
