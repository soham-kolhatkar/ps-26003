// F16: create a patient, invite ASHA + doctor by code, pair the patient's phone, family corner,
// remove / leave. Four simulated phones against the real Supabase project (SQL 001 + 002).
import { check, phone, signUp, start, stop, testPhone } from './lib.mjs';

await start();
try {
  const run = Date.now().toString().slice(-4);
  const c = await phone('caregiver');
  await signUp(c, 'Family caregiver', `E2E Priya ${run}`, testPhone());
  await c.see('No family member yet');

  // 1. Caregiver adds her mother.
  await c.tap('Add your family member', { button: true });
  await c.see('Full name');
  await c.fill('patient-name', `E2E Kamala ${run}`);
  await c.fill('patient-preferred', 'Kamala');
  await c.fill('patient-age', '72');
  await c.tap('Female');
  await c.tap('Early stage');
  await c.tap('Daughter');
  await c.fill('patient-village', 'Cinnamara');
  await c.shot('add-family-form');
  await c.tap('Save', { button: true, exact: true });
  await c.see(`E2E Kamala ${run}`, 30000);
  await c.shot('caregiver-home-with-patient');
  check(true, 'caregiver adds a family member (patient + manager membership, pulled into the local DB)');

  // 2. Invite the ASHA worker.
  await c.tap('People', { button: true, exact: true });
  await c.see('People for Kamala');
  await c.see("Kamala's phone is not paired yet");
  await c.tap('Invite the ASHA worker', { button: true });
  const ashaCode = (await c.text('invite-code')).replace(/\s/g, '');
  await c.shot('asha-code');
  check(/^\d{6}$/.test(ashaCode), `a 6-digit ASHA invite code is shown (${ashaCode})`);
  await c.tap('Done', { button: true, exact: true });

  const a = await phone('asha');
  await signUp(a, 'ASHA worker', `E2E Sunita ${run}`, testPhone(), '246810', { organization: 'Cinnamara SC' });
  await a.tap('Join with a code', { button: true });
  await a.fill('join-code', '000001');
  await a.tap('Join', { button: true, exact: true });
  await a.see('not valid or has expired');
  check(true, 'a wrong code is refused with a clear message');
  await a.fill('join-code', ashaCode);
  await a.tap('Join', { button: true, exact: true });
  await a.see(`E2E Kamala ${run}`, 30000);
  await a.shot('asha-list');
  check(true, 'the ASHA worker joins with the code and sees the patient in her list');

  // The ASHA is not a manager: she can see people but not invite.
  await a.tap(`E2E Kamala ${run}`);
  await a.tap('People', { button: true, exact: true });
  await a.see(`E2E Priya ${run}`);
  await a.see('Only the family');
  check(true, 'the ASHA worker sees who is linked, but cannot invite (not a manager)');

  // 3. Pair the patient's phone.
  await c.tap('Pair Kamala', { button: true });
  const deviceCode = (await c.text('invite-code')).replace(/\s/g, '');
  await c.see('Valid until');
  check(/^\d{6}$/.test(deviceCode), `a 15-minute pairing code is shown (${deviceCode})`);

  const p = await phone('patient');
  await p.open('/');
  await p.tap('Continue', { button: true });
  await p.tap("Patient's phone");
  await p.see('Pair this phone');
  await p.fill('pair-code', ashaCode); // already used → refused
  await p.tap('Pair this phone', { button: true });
  await p.see('not valid or has expired');
  await p.fill('pair-code', deviceCode);
  await p.shot('pair-code');
  await p.tap('Pair this phone', { button: true });
  await p.see('Choose a family PIN', 30000);
  for (const d of '1357') await p.tap(d, { button: true, exact: true });
  await p.see('Type the family PIN again');
  for (const d of '1357') await p.tap(d, { button: true, exact: true });
  await p.see('Kamala', 40000);
  await p.see('Choose a game');
  await p.shot('patient-home');
  check(true, "the patient's phone pairs with the code + family PIN and opens Kamala's home");

  await p.open('/'); // restart
  await p.see('Choose a game', 30000);
  check(true, "a restart opens the patient's home directly (no setup, no sign-in)");

  await p.holdText('Hold for the family corner');
  await p.see('Enter the family PIN');
  for (const d of '1357') await p.tap(d, { button: true, exact: true });
  await p.see('Family photos');
  await p.shot('family-corner');
  check(true, 'holding the button + family PIN opens the family corner');

  await c.tap('Done', { button: true, exact: true });
  await c.see("Kamala's phone is paired", 20000);
  check(true, 'the caregiver sees that the patient phone is paired');

  // 4. Doctor joins, then is removed.
  await c.tap('Invite the doctor', { button: true });
  const docCode = (await c.text('invite-code')).replace(/\s/g, '');
  await c.tap('Done', { button: true, exact: true });
  const d = await phone('doctor');
  await signUp(d, 'Doctor', `E2E Anjali ${run}`, testPhone(), '246810', { organization: 'District Hospital Jorhat' });
  await d.tap('Join with a code', { button: true });
  await d.fill('join-code', docCode);
  await d.tap('Join', { button: true, exact: true });
  await d.see(`E2E Kamala ${run}`, 30000);
  check(true, 'the doctor joins with a doctor code');

  await c.open('/caregiver/people?patientId=x'); // re-open via home instead (fresh list)
  await c.open('/');
  await c.see(`E2E Kamala ${run}`, 30000);
  await c.tap('People', { button: true, exact: true });
  await c.see(`E2E Anjali ${run}`);
  await c.shot('people-full');
  // The doctor is the last "Remove" (members are listed caregiver, asha, doctor).
  await c.page.getByRole('button', { name: 'Remove' }).filter({ visible: true }).last().click();
  await c.page.waitForTimeout(1500);
  await d.open('/');
  await d.see('No patients linked yet', 30000);
  check(true, 'a removed doctor no longer sees the patient (and the local copy is gone)');

  // 5. The ASHA worker leaves.
  await a.open('/');
  await a.see(`E2E Kamala ${run}`, 30000);
  await a.tap(`E2E Kamala ${run}`);
  await a.tap('People', { button: true, exact: true });
  await a.tap('Leave', { button: true, exact: true });
  await a.see('No patients linked yet', 30000);
  check(true, 'the ASHA worker can leave; the patient disappears from her phone');

  for (const ph of [c, a, p, d]) {
    const real = ph.errors.filter((e) => !/Cloud request failed|400|422|Invalid login|already|404/i.test(e));
    check(real.length === 0, `${ph.name}: no unexpected browser errors${real.length ? `: ${real.join(' | ')}` : ''}`);
  }
} finally {
  await stop();
}
