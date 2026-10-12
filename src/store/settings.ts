import { create } from 'zustand';

import { getDb } from '@/db/client';
import { setSetting } from '@/db/repos/settings';
import i18n, { detectDeviceLanguage, type LanguageCode } from '@/i18n';

type SettingsState = {
  language: LanguageCode;
  /** Apply a language loaded from the database at startup (no write back). */
  hydrateLanguage: (language: LanguageCode) => void;
  /** User changed language: apply and persist. */
  setLanguage: (language: LanguageCode) => void;
};

export const useSettings = create<SettingsState>((set) => ({
  language: detectDeviceLanguage(),
  hydrateLanguage: (language) => {
    i18n.changeLanguage(language);
    set({ language });
  },
  setLanguage: (language) => {
    i18n.changeLanguage(language);
    set({ language });
    setSetting(getDb(), 'language', language).catch((e) => console.warn('Failed to save language', e));
  },
}));
