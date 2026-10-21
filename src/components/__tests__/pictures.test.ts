import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { PICTURE_ASSETS } from '@/components/pictureAssets';
import { DEMO } from '@/db/seed/demo';
import { ITEMS } from '@/games/items';
import { DISTRACTORS, TARGET } from '@/games/reaction-tap/rounds';
import { ROUTINES } from '@/games/routine-sequence/content';

const has = (glyph: string) => glyph in PICTURE_ASSETS || glyph.replace(/️/g, '') in PICTURE_ASSETS;

/** Glyphs quoted after `key:` in a source file that can't be imported in Jest (it pulls in screens). */
function glyphsIn(file: string, key: RegExp): string[] {
  const src = readFileSync(join(__dirname, '..', '..', file), 'utf8');
  return [...src.matchAll(key)].map((m) => m[1]);
}

describe('every picture in the data is bundled (Fluent 3D, D50)', () => {
  it('game items', () => {
    expect(ITEMS.filter((i) => !has(i.emoji)).map((i) => i.id)).toEqual([]);
  });

  it('daily routine titles and steps', () => {
    const glyphs = ROUTINES.flatMap((r) => [r.emoji, ...r.steps.map((s) => s.emoji)]);
    expect(glyphs.filter((g) => !has(g))).toEqual([]);
  });

  it('catch the fish', () => {
    expect([TARGET, ...DISTRACTORS].filter((s) => !has(s.emoji)).map((s) => s.id)).toEqual([]);
  });

  it('game pictures, reminder types and check-up tasks', () => {
    const glyphs = [
      ...glyphsIn('games/registry.ts', /icon: '([^'\x00-\x7F]+)'/g),
      ...glyphsIn('services/notifications.ts', /^\s+\w+: '([^'\x00-\x7F]+)',$/gm),
      ...glyphsIn('games/CheckupRunner.tsx', /\w+: '([^'\x00-\x7F]+)'/g),
    ];
    expect(glyphs.length).toBeGreaterThan(10);
    expect(glyphs.filter((g) => !has(g))).toEqual([]);
  });

  it('demo avatars', () => {
    const avatars: string[] = [...DEMO.patients, ...DEMO.users].map((p) => p.avatar);
    expect(avatars.filter((a) => !has(a))).toEqual([]);
  });

  it('no religious objects among the game items (D50)', () => {
    expect(ITEMS.map((i) => i.emoji)).not.toContain('🪔');
  });
});
