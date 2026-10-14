// F17: data moves between phones. Caregiver adds a reminder → it reaches the patient's phone →
// the dose taken there and a game played there reach the caregiver. Needs SQL 001–003.
import { check, phone, signUp, start, stop, testPhone } from './lib.mjs';

const pad = (n) => String(n).padStart(2, '0');

/** Wait until `fn` (re-opening the screen each time) sees the text: sync runs on focus. */
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

await start();
try {
  const run = Date.now().toString().slice(-4);
  const c = await phone('caregiver');
  await signUp(c, 'Family caregiver', `E2E Priya ${run}`, testPhone());
  await c.tap('Add your family member', { button: true });
  await c.fill('patient-name', `E2E Kamala ${run}`);
  await c.fill('patient-preferred', 'Kamala');
  await c.fill('patient-age', '72');
  await c.tap('Female');
  await c.tap('Daughter');
  await c.tap('Save', { button: true, exact: true });
  await c.see(`E2E Kamala ${run}`, 30000);

  // Pair the patient's phone.
  await c.tap('People', { button: true, exact: true });
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
  await p.see('Choose a game', 40000);
  check(true, "patient's phone paired");

  // 1. Caregiver adds a water reminder due now.
  await c.tap('Done', { button: true, exact: true });
  await c.open('/');
  await c.see(`E2E Kamala ${run}`, 30000);
  await c.tap('Reminders', { button: true });
  await c.tap('Add reminder', { button: true });
  await c.tap('Water');
  const now = new Date();
  c.answerNextPrompt(`${pad(now.getHours())}:${pad(now.getMinutes())}`);
  await c.tap('Add time', { button: true });
  await c.shot('reminder-form');
  await c.tap('Save reminder', { button: true });
  await c.see('Every day', 15000);
  await c.page.waitForTimeout(6000); // outbox → push (2 s after the write)
  await c.shot('reminders');
  check(true, 'caregiver saves a reminder (queued, then pushed)');

  // 2. It appears on the patient's phone; the patient drinks the water.
  const arrived = await eventually(p, '/', 'Drink a glass of water');
  await p.shot('patient-reminder-arrived');
  check(arrived, "the reminder reaches the patient's phone");
  await p.tap('Drink a glass of water');
  await p.tap('I drank it', { button: true });
  await p.see('Thank you', 15000);
  await p.page.waitForTimeout(6000);
  check(true, 'the patient marks it done on her phone');

  // 3. The patient plays "Find the object" (6 rounds).
  await p.open('/');
  await p.see('Choose a game', 30000);
  await p.tap('Find the object');
  await p.tap('Start', { button: true, exact: true });
  for (let round = 0; round < 6; round++) {
    const prompt = await p.page
      .getByText(/^Find the /)
      .filter({ visible: true })
      .first()
      .innerText({ timeout: 20000 });
    const item = prompt.replace(/^Find the /, '').trim();
    await p.page.getByRole('button', { name: item, exact: true }).filter({ visible: true }).first().click();
    await p.page.waitForTimeout(2500);
  }
  await p.see('Well done', 30000);
  await p.shot('game-done');
  await p.page.waitForTimeout(6000);
  check(true, 'the patient plays a game on her phone');

  // 4. Both reach the caregiver.
  const dose = await eventually(c, '/', 'Reminders · 1/1 today');
  check(dose, "the caregiver sees today's dose as done (1/1)");
  const game = await eventually(c, '/', 'Progress · 1 games this week');
  await c.shot('caregiver-after-sync');
  check(game, "the caregiver sees the patient's game");
  await c.see('Synced');
  check(true, 'the sync chip says "Synced"');

  for (const ph of [c, p]) {
    const real = ph.errors.filter((e) => !/Cloud request failed|400|422|404|Invalid login|already/i.test(e));
    check(real.length === 0, `${ph.name}: no unexpected browser errors${real.length ? `: ${real.join(' | ')}` : ''}`);
  }
} finally {
  await stop();
}
