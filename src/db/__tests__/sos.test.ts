/** @jest-environment node */
import { initDatabase } from '@/db/init';
import { listFamilyContacts, listUnseenSos, markSosSeen, recordSos } from '@/db/repos/sos';
import { backfillDemoContacts, DEMO } from '@/db/seed/demo';
import { createTestDb } from '@/db/testing/nodeDb';

const KAMALA = DEMO.devicePatientId;

describe('SOS (F21)', () => {
  it("Kamala's SOS button calls her family only (Priya), not the ASHA worker or the doctor", async () => {
    const db = createTestDb();
    await initDatabase(db);
    const contacts = await listFamilyContacts(db, KAMALA);
    expect(contacts.map((c) => [c.name, c.phone, c.relation])).toEqual([['Priya Sharma', '+919000010001', 'daughter']]);
  });

  it('phones seeded before F21 get the demo numbers', async () => {
    const db = createTestDb();
    await initDatabase(db);
    await db.runAsync('UPDATE app_user SET phone = NULL', []);
    expect(await listFamilyContacts(db, KAMALA)).toEqual([]);
    await backfillDemoContacts(db);
    expect(await listFamilyContacts(db, KAMALA)).toHaveLength(1);
  });

  it('a press shows until it is dismissed on this phone, and only for a day', async () => {
    const db = createTestDb();
    await initDatabase(db);
    const now = Date.UTC(2026, 9, 21, 9, 40);
    const old = await recordSos(db, { patientId: KAMALA, calledUserId: 'u-rimjhim' }, now - 30 * 3600e3);
    const id = await recordSos(db, { patientId: KAMALA, calledUserId: 'u-rimjhim' }, now);
    const day = now - 24 * 3600e3;
    expect((await listUnseenSos(db, [KAMALA], day)).map((e) => e.id)).toEqual([id]);
    expect(old).not.toBe(id);
    await markSosSeen(db, [id], now);
    expect(await listUnseenSos(db, [KAMALA], day)).toEqual([]);
  });
});
