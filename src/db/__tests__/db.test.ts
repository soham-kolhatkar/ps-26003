/** @jest-environment node */
import { initDatabase } from '../init';
import { getSchemaVersion, LATEST_VERSION, migrate, MIGRATIONS } from '../migrations';
import { displayName, getPatient, listPatients, listPatientsForUser } from '../repos/patients';
import { getSetting, setSetting } from '../repos/settings';
import { getUser, listUsersByRole } from '../repos/users';
import { DEMO, resetDemo } from '../seed/demo';
import { createTestDb } from '../testing/nodeDb';

describe('migrations', () => {
  it('versions are strictly increasing from 1', () => {
    MIGRATIONS.forEach((m, i) => expect(m.version).toBe(i + 1));
  });

  it('migrates a fresh db to the latest version and is idempotent', async () => {
    const db = createTestDb();
    expect(await getSchemaVersion(db)).toBe(0);
    expect(await migrate(db)).toBe(LATEST_VERSION);
    expect(await migrate(db)).toBe(LATEST_VERSION);
    expect(await getSchemaVersion(db)).toBe(LATEST_VERSION);
    db.close();
  });
});

describe('initDatabase + demo seed', () => {
  it('seeds once on first launch only', async () => {
    const db = createTestDb();
    expect((await initDatabase(db)).seeded).toBe(true);
    expect((await initDatabase(db)).seeded).toBe(false);
    expect(await listPatients(db)).toHaveLength(DEMO.patients.length);
    db.close();
  });

  it('loads Kamala with household location and the device patient setting', async () => {
    const db = createTestDb();
    await initDatabase(db);
    const aita = await getPatient(db, 'p-aita');
    expect(aita).toMatchObject({ name: 'Kamala Sharma', age: 72, district: 'Jorhat', village: 'Cinnamara' });
    expect(displayName(aita!)).toBe('Kamala');
    expect(await getSetting(db, 'device_patient_id')).toBe('p-aita');
    db.close();
  });

  it('links patients to staff with relations', async () => {
    const db = createTestDb();
    await initDatabase(db);
    const caregiverPatients = await listPatientsForUser(db, 'u-rimjhim');
    expect(caregiverPatients.map((p) => [p.id, p.relation])).toEqual([['p-aita', 'daughter']]);
    expect(await listPatientsForUser(db, 'u-pranita')).toHaveLength(3);
    expect(await listPatientsForUser(db, 'u-anjali')).toHaveLength(3);
    expect((await listUsersByRole(db, 'asha')).map((u) => u.name)).toEqual(['Sunita Devi']);
    expect((await getUser(db, 'u-anjali'))?.role).toBe('doctor');
    db.close();
  });

  it('enforces foreign keys', async () => {
    const db = createTestDb();
    await initDatabase(db);
    await expect(
      db.runAsync('INSERT INTO patient_user (patient_id, user_id) VALUES (?, ?)', ['nope', 'u-rimjhim']),
    ).rejects.toThrow(/FOREIGN KEY/);
    db.close();
  });

  it('resetDemo restores the story and keeps the language', async () => {
    const db = createTestDb();
    await initDatabase(db);
    await setSetting(db, 'language', 'hi');
    await db.runAsync('DELETE FROM patient WHERE id = ?', ['p-lakhi']);
    await resetDemo(db);
    expect(await listPatients(db)).toHaveLength(DEMO.patients.length);
    expect(await getSetting(db, 'language')).toBe('hi');
    db.close();
  });
});

describe('displayName', () => {
  it('falls back to first name', () => {
    expect(displayName({ name: 'Lakshmi Iyer', preferredName: null })).toBe('Lakshmi');
    expect(displayName({ name: 'Lakshmi Iyer', preferredName: '  ' })).toBe('Lakshmi');
  });
});
