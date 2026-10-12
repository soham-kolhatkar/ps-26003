import * as Speech from 'expo-speech';

import { LANGUAGES, type LanguageCode } from '@/i18n';

/** Slightly slower than default speech — easier for elderly listeners. */
const ELDER_RATE = 0.85;

/**
 * Speak text using the device TTS engine (works offline once the
 * language voice is installed on the phone). Stops any speech in progress
 * so taps never queue up overlapping audio.
 */
export function speak(text: string, language: LanguageCode): void {
  Speech.stop();
  Speech.speak(text, {
    language: LANGUAGES[language].ttsLocale,
    rate: ELDER_RATE,
    pitch: 1.0,
  });
}

export function stopSpeaking(): void {
  Speech.stop();
}

/** Whether the device has at least one voice for the language. */
export async function hasVoiceFor(language: LanguageCode): Promise<boolean> {
  const locale = LANGUAGES[language].ttsLocale.toLowerCase();
  const prefix = locale.split('-')[0];
  const voices = await Speech.getAvailableVoicesAsync();
  return voices.some((v) => {
    const l = v.language.toLowerCase().replace('_', '-');
    return l === locale || l.startsWith(`${prefix}-`) || l === prefix;
  });
}
