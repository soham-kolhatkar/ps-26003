/** @jest-environment node */
import { databaseNameFor } from '../client';
import { initCloudDatabase } from '../init';
import { getUser, upsertUser } from '../repos/users';
import { createTestDb } from '../testing/nodeDb';

describe('cloud database', () => {
  it('uses one file per mode and account', () => {
    expect(databaseNameFor('demo', 'x')).toBe('smriti.db');
    expect(databaseNameFor('cloud', 'abc')).toBe('smriti-cloud-abc.db');
    expect(databaseNameFor('cloud', null)).toBe('smriti-setup.db');
    expect(databaseNameFor(null, null)).toBe('smriti-setup.db');
  });

  it('starts empty (no demo story) and keeps a local copy of the profile', async () => {
    const db = createTestDb();
    await initCloudDatabase(db);
    expect((await db.getFirstAsync<{ n: number }>('SELECT COUNT(*) AS n FROM patient', []))?.n).toBe(0);
    await upsertUser(db, { id: 'u1', role: 'asha', name: 'Sunita Devi', phone: '+919876543210', organization: null });
    await upsertUser(db, {
      id: 'u1',
      role: 'asha',
      name: 'Sunita D.',
      phone: '+919876543210',
      organization: 'Teok SC',
    });
    expect(await getUser(db, 'u1')).toMatchObject({ name: 'Sunita D.', organization: 'Teok SC', avatar: '🧑‍⚕️' });
    db.close();
  });
});
