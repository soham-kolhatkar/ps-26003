import { seededRng } from '@/engine/random';

import { groupPeople, levelParams, makeRounds, MAX_LEVEL, type PhotoCard } from '../photo-recall/rounds';

const photo = (id: string, personName: string, relation: string | null = null): PhotoCard => ({
  id,
  uri: `file:///${id}.jpg`,
  personName,
  relation,
});

const family = [
  photo('1', 'Priya', 'daughter'),
  photo('2', '  priya ', 'daughter'),
  photo('3', 'Bhaskar', 'son'),
  photo('4', 'Mitali', 'granddaughter'),
  photo('5', 'Dipen', 'husband'),
  photo('6', 'Anu', 'friend'),
];

describe('photo recall rounds', () => {
  it('groups photos by person, ignoring case and spaces', () => {
    const people = groupPeople(family);
    expect(people).toHaveLength(5);
    expect(people.find((p) => p.key === 'priya')?.photos).toHaveLength(2);
  });

  it('needs at least two people', () => {
    expect(makeRounds(1, [photo('1', 'Priya'), photo('2', 'PRIYA')], 5)).toEqual([]);
    expect(makeRounds(1, [], 5)).toEqual([]);
  });

  it('caps options by the number of people and always includes the target', () => {
    for (let l = 1; l <= MAX_LEVEL; l++) {
      const rounds = makeRounds(l, family.slice(0, 3), 10, seededRng(l)); // 2 people
      rounds.forEach((r) => {
        expect(r.options).toHaveLength(2);
        expect(r.options.map((o) => o.key)).toContain(r.target.key);
        expect(r.target.photos.map((p) => p.id)).toContain(r.photo.id);
      });
      const big = makeRounds(l, family, 10, seededRng(l));
      big.forEach((r) => {
        expect(r.options).toHaveLength(Math.min(levelParams(l).options, 5));
        expect(new Set(r.options.map((o) => o.key)).size).toBe(r.options.length);
        r.options.forEach((o) => expect(o.photos).toContainEqual(r.optionPhotos[o.key]));
      });
    }
  });

  it('avoids the same person twice in a row when there are 3+ people', () => {
    const rounds = makeRounds(2, family, 30, seededRng(9));
    rounds.slice(1).forEach((r, i) => expect(r.target.key).not.toBe(rounds[i].target.key));
  });

  it('uses relation cues early and reverse mode at the top level', () => {
    expect(levelParams(1)).toMatchObject({ showRelation: true, reverse: false });
    expect(levelParams(3)).toMatchObject({ showRelation: false, reverse: false });
    expect(levelParams(MAX_LEVEL)).toMatchObject({ reverse: true });
  });
});
