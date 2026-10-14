/** @jest-environment node */
import { initDatabase } from '../init';
import { getSchemaVersion, LATEST_VERSION } from '../migrations';
import { addPhoto, countPeople, deletePhoto, getPhoto, listPhotos } from '../repos/photos';
import { resetDemo } from '../seed/demo';
import { createTestDb } from '../testing/nodeDb';

const base = { patientId: 'p-aita', relation: 'daughter', addedBy: 'u-rimjhim' };

describe('photos repo', () => {
  it('is created by migration v2', async () => {
    const db = createTestDb();
    await initDatabase(db);
    expect(await getSchemaVersion(db)).toBe(LATEST_VERSION);
    expect(LATEST_VERSION).toBeGreaterThanOrEqual(2);
    db.close();
  });

  it('adds, lists newest first, counts distinct people, deletes', async () => {
    const db = createTestDb();
    await initDatabase(db);
    const a = await addPhoto(db, { ...base, uri: 'file:///a.jpg', personName: ' Priya ' }, 1);
    await addPhoto(db, { ...base, uri: 'file:///b.jpg', personName: 'priya' }, 2);
    await addPhoto(db, { ...base, uri: 'file:///c.jpg', personName: 'Bhaskar', relation: 'son' }, 3);

    const photos = await listPhotos(db, 'p-aita');
    expect(photos.map((p) => p.uri)).toEqual(['file:///c.jpg', 'file:///b.jpg', 'file:///a.jpg']);
    expect((await getPhoto(db, a))?.personName).toBe('Priya');
    expect(await countPeople(db, 'p-aita')).toBe(2);
    expect(await countPeople(db, 'p-lakhi')).toBe(0);

    await deletePhoto(db, a);
    expect(await listPhotos(db, 'p-aita')).toHaveLength(2);
    db.close();
  });

  it('resetDemo clears photos', async () => {
    const db = createTestDb();
    await initDatabase(db);
    await addPhoto(db, { ...base, uri: 'file:///a.jpg', personName: 'Priya' });
    await resetDemo(db);
    expect(await listPhotos(db, 'p-aita')).toHaveLength(0);
    db.close();
  });
});
