import { create } from 'zustand';

import i18n, { detectDeviceLanguage, type LanguageCode } from '@/i18n';

type SettingsState = {
  language: LanguageCode;
  setLanguage: (language: LanguageCode) => void;
};

// F00: in-memory only. F01 persists this to SQLite.
export const useSettings = create<SettingsState>((set) => ({
  language: detectDeviceLanguage(),
  setLanguage: (language) => {
    i18n.changeLanguage(language);
    set({ language });
  },
}));
