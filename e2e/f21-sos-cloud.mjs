// F21 cloud part: Kamala's paired phone presses SOS → the family's and the ASHA worker's phones
// show the banner (via sync). Needs SQL 001–006.
import { check, phone, signUp, start, stop, testPhone } from './lib.mjs';

/** Re-open the home until the banner shows (sync runs on focus and every few seconds). */
async function eventually(p, text, tries = 8) {
  for (let i = 0; i < tries; i++) {
    await p.open('/');
    try {
      await p.see(text, 8000);
      return true;
    } catch {
      await p.page.waitForTimeout(3000);
    }
  }
  return false;
}

await start();
try {
  const run = Date.now().toString().slice(-4);
  const patient = `E2E Kamala ${run}`;
  const c = await phone('caregiver');
  await signUp(c, 'Family caregiver', `E2E Priya ${run}`, testPhone());
  await c.tap('Add your family member', { button: true });
  await c.fill('patient-name', patient);
  await c.fill('patient-preferred', 'Kamala');
  await c.fill('patient-age', '72');
  await c.tap('Female');
  await c.tap('Daughter');
  await c.tap('Save', { button: true, exact: true });
  await c.see(patient, 30000);

  // The ASHA worker joins; the patient's phone is paired.
  await c.tap('People', { button: true, exact: true });
  await c.tap('Invite the ASHA worker', { button: true });
  const ashaCode = (await c.text('invite-code')).replace(/\s/g, '');
  await c.tap('Done', { button: true, exact: true });
  const a = await phone('asha');
  await signUp(a, 'ASHA worker', `E2E Sunita ${run}`, testPhone(), '246810', { organization: 'Cinnamara SC' });
  await a.tap('Join with a code', { button: true });
  await a.fill('join-code', ashaCode);
  await a.tap('Join', { button: true, exact: true });
  await a.see(patient, 30000);

  await c.tap('Pair Kamala', { button: true });
  const code = (await c.text('invite-code')).replace(/\s/g, '');
  const p = await phone('patient');
  await p.open('/');
  await p.tap('Continue', { button: true });
  await p.tap("Patient's phone");
  await p.fill('pair-code', code);
  await p.tap('Pair this phone', { button: true });
  await p.see('Choose a family PIN', 30000);
  for (let k = 0; k < 2; k++) for (const d of '2468') await p.tap(d, { button: true, exact: true });
  await p.see("Today's games", 40000);
  // The family's number reaches the patient's phone with the people pull.
  await p.see('Call E2E', 30000);
  await p.shot('patient-home');
  check(true, 'the paired phone shows a "Call …" button for the family');

  await p.page.getByTestId('sos-button').filter({ visible: true }).first().click();
  await p.page.waitForTimeout(6000); // saved, then pushed
  check(true, 'the patient presses SOS');

  const family = await eventually(c, 'Kamala pressed SOS');
  await c.shot('caregiver-banner');
  check(family, "the family's phone shows the SOS banner");
  const asha = await eventually(a, 'Kamala pressed SOS');
  await a.shot('asha-banner');
  check(asha, "the ASHA worker's phone shows it too");

  for (const x of [c, a, p]) {
    check(
      x.errors.length === 0,
      `${x.name}: no unexpected browser errors${x.errors.length ? `: ${x.errors.join(' | ')}` : ''}`,
    );
  }
} finally {
  await stop();
}
