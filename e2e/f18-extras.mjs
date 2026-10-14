// F18: the ASHA worker edits reminders, the doctor's note reaches the family, PIN reset via a manager.
// Needs SQL 001–004 and the Edge Function `reset-pin`.
import { check, phone, signUp, start, stop, testPhone } from './lib.mjs';

async function eventually(p, path, text, tries = 8) {
  for (let i = 0; i < tries; i++) {
    await p.open(path);
    try {
      await p.see(text, 8000);
      return true;
    } catch {
      await p.page.waitForTimeout(3000);
    }
  }
  return false;
}

async function invite(c, button) {
  await c.tap(button, { button: true });
  const code = (await c.text('invite-code')).replace(/\s/g, '');
  await c.tap('Done', { button: true, exact: true });
  return code;
}

async function join(p, code, patient) {
  await p.tap('Join with a code', { button: true });
  await p.fill('join-code', code);
  await p.tap('Join', { button: true, exact: true });
  await p.see(patient, 30000);
}

await start();
try {
  const run = Date.now().toString().slice(-4);
  const patient = `E2E Kamala ${run}`;
  const c = await phone('caregiver');
  await signUp(c, 'Family caregiver', `E2E Priya ${run}`, testPhone());
  await c.tap('Add your family member', { button: true });
  await c.fill('patient-name', patient);
  await c.fill('patient-age', '72');
  await c.tap('Save', { button: true, exact: true });
  await c.see(patient, 30000);
  await c.tap('People', { button: true, exact: true });
  const ashaCode = await invite(c, 'Invite the ASHA worker');
  const docCode = await invite(c, 'Invite the doctor');

  const ashaPhone = testPhone();
  const a = await phone('asha');
  await signUp(a, 'ASHA worker', `E2E Sunita ${run}`, ashaPhone, '246810', { organization: 'Cinnamara SC' });
  await join(a, ashaCode, patient);
  const d = await phone('doctor');
  await signUp(d, 'Doctor', `E2E Anjali ${run}`, testPhone(), '246810', { organization: 'District Hospital Jorhat' });
  await join(d, docCode, patient);

  // 1. The ASHA worker adds a medicine reminder; it reaches the caregiver.
  await a.tap(patient);
  await a.tap('Reminders', { button: true, exact: true });
  await a.tap('Add reminder', { button: true });
  await a.fill('reminder-title', 'Amlodipine 5 mg');
  a.answerNextPrompt('09:00');
  await a.tap('Add time', { button: true });
  await a.tap('Save reminder', { button: true });
  await a.see('Amlodipine 5 mg', 15000);
  await a.page.waitForTimeout(6000);
  await a.shot('asha-reminders');
  check(true, 'the ASHA worker adds a reminder');
  await c.open('/');
  await c.tap('Reminders', { button: true });
  const seen = await eventually(c, c.page.url().replace(/^https?:\/\/[^/]+/, ''), 'Amlodipine 5 mg');
  check(seen, "the ASHA worker's reminder reaches the caregiver");

  // 2. The doctor writes a note; the family and the ASHA worker read it.
  await d.tap(patient);
  await d.fill('doctor-note', 'Check blood pressure every week. Next review in 1 month.');
  await d.tap('Save note', { button: true });
  await d.see('Check blood pressure every week');
  await d.page.waitForTimeout(6000);
  await d.shot('doctor-note');
  check(true, 'the doctor saves a note on the report');
  await c.open('/');
  await c.see(patient, 30000);
  await c.tap('Progress', { button: true });
  const note = await eventually(c, c.page.url().replace(/^https?:\/\/[^/]+/, ''), 'Check blood pressure every week');
  await c.shot('caregiver-note');
  check(note, "the doctor's note shows on the caregiver's Progress screen");

  // 3. PIN reset: the caregiver (manager) gives the ASHA worker a reset code.
  await c.open('/');
  await c.see(patient, 30000);
  await c.tap('People', { button: true, exact: true });
  await c.see(`E2E Sunita ${run}`);
  await c.page.getByRole('button', { name: 'Reset PIN' }).filter({ visible: true }).first().click();
  const resetCode = (await c.text('pin-reset-code')).replace(/\s/g, '');
  await c.shot('reset-code');
  check(/^\d{6}$/.test(resetCode), `the caregiver gets a 6-digit PIN reset code (${resetCode})`);

  const a2 = await phone('asha-new-phone');
  await a2.open('/');
  await a2.tap('Continue', { button: true });
  await a2.tap('ASHA worker');
  await a2.tap('Forgot your PIN?', { button: true });
  await a2.fill('phone', ashaPhone);
  await a2.fill('reset-code', '000000');
  await a2.fill('pin', '135790');
  await a2.fill('pin-again', '135790');
  await a2.tap('Save new PIN', { button: true });
  await a2.see('not valid or has expired', 30000);
  check(true, 'a wrong reset code is refused');
  await a2.fill('reset-code', resetCode);
  await a2.tap('Save new PIN', { button: true });
  await a2.see('Your PIN was changed', 30000);
  await a2.tap('Sign in', { button: true, exact: true });
  await a2.fill('phone', ashaPhone);
  await a2.fill('pin', '135790');
  await a2.tap('Sign in', { button: true, exact: true });
  await a2.see(`Hello, E2E`, 30000);
  await a2.see(patient, 30000);
  check(true, 'the ASHA worker signs in with the new PIN (and sees her patient)');

  for (const ph of [c, a, d, a2]) {
    const real = ph.errors.filter((e) => !/Cloud request failed|400|422|404|Invalid login|already|reset-pin/i.test(e));
    check(real.length === 0, `${ph.name}: no unexpected browser errors${real.length ? `: ${real.join(' | ')}` : ''}`);
  }
} finally {
  await stop();
}
