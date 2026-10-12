import { LANGUAGES, type LanguageCode } from '@/i18n';

/** "Monday, 12 October" — used for reality orientation on the patient home. */
export function formatLongDate(date: Date, language: LanguageCode): string {
  try {
    return new Intl.DateTimeFormat(LANGUAGES[language].locale, {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    }).format(date);
  } catch {
    return date.toDateString();
  }
}

export function formatTime(date: Date, language: LanguageCode): string {
  try {
    return new Intl.DateTimeFormat(LANGUAGES[language].locale, { hour: 'numeric', minute: '2-digit' }).format(date);
  } catch {
    return `${date.getHours()}:${String(date.getMinutes()).padStart(2, '0')}`;
  }
}

export type DayPart = 'morning' | 'afternoon' | 'evening';

export function dayPart(date: Date): DayPart {
  const h = date.getHours();
  if (h < 12) return 'morning';
  if (h < 17) return 'afternoon';
  return 'evening';
}

export const GREETING_KEY: Record<DayPart, 'patient.greetMorning' | 'patient.greetAfternoon' | 'patient.greetEvening'> =
  {
    morning: 'patient.greetMorning',
    afternoon: 'patient.greetAfternoon',
    evening: 'patient.greetEvening',
  };
