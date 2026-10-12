import * as Speech from 'expo-speech';

import { LANGUAGES, type LanguageCode } from '@/i18n';

/** Slightly slower than default speech — easier for elderly listeners. */
const ELDER_RATE = 0.85;

/** Upper bound on how long one utterance may take, so callers never hang if the engine stays silent. */
export function maxSpeechMs(text: string): number {
  return Math.min(15_000, 2_000 + text.length * 120);
}

/**
 * Speak text using the device TTS engine (works offline once the
 * language voice is installed on the phone). Stops any speech in progress
 * so taps never queue up overlapping audio.
 *
 * Resolves when the utterance finishes, is interrupted by the next speak()/
 * stopSpeaking(), errors, or the safety timeout passes. Games await this
 * before moving on so the patient always hears the whole sentence.
 */
export function speak(text: string, language: LanguageCode): Promise<void> {
  Speech.stop();
  return new Promise((resolve) => {
    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      clearTimeout(safety);
      resolve();
    };
    const safety = setTimeout(finish, maxSpeechMs(text));
    Speech.speak(text, {
      language: LANGUAGES[language].ttsLocale,
      rate: ELDER_RATE,
      pitch: 1.0,
      onDone: finish,
      onStopped: finish,
      onError: finish,
    });
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
