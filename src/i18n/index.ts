import { getLocales } from 'expo-localization';
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import en from './packs/en.json';
import hi from './packs/hi.json';

/**
 * Language registry. Adding a language = add a pack JSON + one entry here.
 * `ttsLocale` is the BCP-47 tag passed to the device text-to-speech engine.
 */
export const LANGUAGES = {
  en: { label: 'English', ttsLocale: 'en-IN', pack: en },
  hi: { label: 'हिन्दी', ttsLocale: 'hi-IN', pack: hi },
} as const;

export type LanguageCode = keyof typeof LANGUAGES;
export const LANGUAGE_CODES = Object.keys(LANGUAGES) as LanguageCode[];
export const DEFAULT_LANGUAGE: LanguageCode = 'en';

export function isLanguageCode(value: string | null | undefined): value is LanguageCode {
  return !!value && value in LANGUAGES;
}

/** Best guess from the device locale, falling back to English. */
export function detectDeviceLanguage(): LanguageCode {
  const code = getLocales()[0]?.languageCode;
  return isLanguageCode(code) ? code : DEFAULT_LANGUAGE;
}

const resources = Object.fromEntries(
  LANGUAGE_CODES.map((code) => [code, { translation: LANGUAGES[code].pack }]),
);

// eslint-disable-next-line import/no-named-as-default-member -- i18next's documented init pattern
i18n.use(initReactI18next).init({
  resources,
  lng: detectDeviceLanguage(),
  fallbackLng: DEFAULT_LANGUAGE,
  interpolation: { escapeValue: false },
  returnNull: false,
});

export default i18n;
