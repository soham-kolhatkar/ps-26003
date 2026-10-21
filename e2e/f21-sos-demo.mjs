// F21 offline part: the single-phone demo. Kamala presses "Call Priya" → the press is saved →
// Priya's home (same phone) shows the SOS banner until "OK, seen". No cloud needed.
import { check, phone, start, stop } from './lib.mjs';

await start();
try {
  const a = await phone('sos-demo');
  await a.open('/');
  await a.tap('Continue', { button: true });
  await a.see('Who will use this phone?');
  await a.longPress('setup-logo');
  await a.see('Who is using Smriti?');
  await a.tap('Kamala');
  await a.see("Today's games", 20000);
  await a.see('Call Priya', 15000);
  check(true, 'Kamala\'s home shows "Call Priya"');
  await a.shot('patient-home');

  await a.page.getByTestId('sos-button').filter({ visible: true }).first().click();
  await a.page.waitForTimeout(1500);

  // Hold to exit (demo) → Priya.
  await a.open('/');
  await a.tap('Continue', { button: true });
  await a.see('Who is using Smriti?', 20000);
  await a.tap('Priya');
  await a.page.waitForTimeout(800);
  for (const d of '1234')
    await a.page.getByRole('button', { name: d, exact: true }).filter({ visible: true }).first().click();
  await a.see('Kamala pressed SOS', 20000);
  await a.see('calling Priya');
  await a.shot('caregiver-banner');
  check(true, "Priya's home shows the SOS banner (who and when)");

  await a.tap('OK, seen', { button: true });
  await a.page.waitForTimeout(800);
  check(!(await a.page.getByText('Kamala pressed SOS').filter({ visible: true }).count()), '"OK, seen" dismisses it');

  check(a.errors.length === 0, `no errors in the browser console${a.errors.length ? `: ${a.errors.join(' | ')}` : ''}`);
} finally {
  await stop();
}
