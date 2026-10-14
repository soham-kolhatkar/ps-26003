import { defaultRng, pick, sample, shuffle, type Rng } from '@/engine/random';

export const MAX_LEVEL = 5;
/** The game needs at least this many different people to be playable. */
export const MIN_PEOPLE = 2;

export type PhotoCard = { id: string; uri: string; personName: string; relation: string | null };
export type Person = { key: string; name: string; relation: string | null; photos: PhotoCard[] };

export type LevelParams = {
  /** Names (or photos, in reverse mode) to choose from — capped by people available. */
  options: number;
  /** Show the relation ("Daughter") under each name as a cue. */
  showRelation: boolean;
  /** Level 5: "Where is Priya?" — pick the photo instead of the name. */
  reverse: boolean;
};

const LEVELS: Record<number, LevelParams> = {
  1: { options: 2, showRelation: true, reverse: false },
  2: { options: 3, showRelation: true, reverse: false },
  3: { options: 3, showRelation: false, reverse: false },
  4: { options: 4, showRelation: false, reverse: false },
  5: { options: 4, showRelation: false, reverse: true },
};

export function levelParams(level: number): LevelParams {
  return LEVELS[Math.min(MAX_LEVEL, Math.max(1, Math.round(level)))];
}

const personKey = (name: string) => name.trim().toLowerCase().replace(/\s+/g, ' ');

/** Groups photos by person (case/space-insensitive name). The latest relation wins. */
export function groupPeople(photos: readonly PhotoCard[]): Person[] {
  const byKey = new Map<string, Person>();
  for (const p of photos) {
    const key = personKey(p.personName);
    const person = byKey.get(key) ?? { key, name: p.personName.trim(), relation: p.relation, photos: [] };
    person.photos.push(p);
    byKey.set(key, person);
  }
  return [...byKey.values()];
}

export type Round = {
  target: Person;
  /** Photo shown in "who is this" mode. */
  photo: PhotoCard;
  /** People to choose from, shuffled, including the target. */
  options: Person[];
  /** Photo shown for each option in reverse mode (by person key). */
  optionPhotos: Record<string, PhotoCard>;
  reverse: boolean;
  showRelation: boolean;
};

/**
 * Only real family members are ever used as choices — never invented names,
 * which would confuse a person with dementia.
 */
export function makeRounds(level: number, photos: readonly PhotoCard[], count: number, rng: Rng = defaultRng): Round[] {
  const people = groupPeople(photos);
  if (people.length < MIN_PEOPLE) return [];
  const { options, showRelation, reverse } = levelParams(level);
  const optionCount = Math.min(options, people.length);

  const rounds: Round[] = [];
  let lastTarget: string | null = null;
  let lastPhoto: string | null = null;
  for (let i = 0; i < count; i++) {
    // With 3+ people avoid the same person twice in a row; with 2 that would be predictable.
    const candidates = people.length >= 3 ? people.filter((p) => p.key !== lastTarget) : people;
    const target = pick(candidates, rng);
    const freshPhotos = target.photos.filter((p) => p.id !== lastPhoto);
    const photo = pick(freshPhotos.length ? freshPhotos : target.photos, rng);
    const others = sample(
      people.filter((p) => p.key !== target.key),
      optionCount - 1,
      rng,
    );
    const choice = shuffle([target, ...others], rng);
    const optionPhotos = Object.fromEntries(
      choice.map((p) => [p.key, p.key === target.key ? photo : pick(p.photos, rng)]),
    );
    rounds.push({ target, photo, options: choice, optionPhotos, reverse, showRelation });
    lastTarget = target.key;
    lastPhoto = photo.id;
  }
  return rounds;
}
