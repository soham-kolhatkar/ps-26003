import { LANGUAGE_CODES, LANGUAGES } from '@/i18n';

type Json = { [key: string]: Json | string };

function flattenKeys(obj: Json, prefix = ''): string[] {
  return Object.entries(obj).flatMap(([key, value]) => {
    const path = prefix ? `${prefix}.${key}` : key;
    return typeof value === 'string' ? [path] : flattenKeys(value, path);
  });
}

describe('language packs', () => {
  const reference = flattenKeys(LANGUAGES.en.pack as Json).sort();

  it.each(LANGUAGE_CODES.filter((c) => c !== 'en'))('%s has exactly the same keys as en', (code) => {
    const keys = flattenKeys(LANGUAGES[code].pack as Json).sort();
    expect(keys).toEqual(reference);
  });

  it.each(LANGUAGE_CODES)('%s has no empty strings', (code) => {
    const pack = LANGUAGES[code].pack as Json;
    const empty = flattenKeys(pack).filter((path) => {
      const value = path.split('.').reduce<Json | string>((node, k) => (node as Json)[k], pack);
      return typeof value === 'string' && value.trim() === '';
    });
    expect(empty).toEqual([]);
  });
});
