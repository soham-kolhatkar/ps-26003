// F26: the single-phone demo can be left again. Demo → "Leave the demo" → back to
// "Who will use this phone?"; opening the demo again finds the same story.
import { check, phone, start, stop } from './lib.mjs';

await start();
try {
  const a = await phone('leave-demo');
  await a.open('/');
  await a.tap('Continue', { button: true });
  await a.see('Who will use this phone?');
  await a.longPress('setup-logo');
  await a.see('Who is using Smriti?');
  await a.see('Leave the demo');
  await a.shot('roles');

  await a.page.getByTestId('leave-demo').filter({ visible: true }).first().click();
  await a.tap('Continue', { button: true, timeout: 20000 });
  await a.see('Who will use this phone?', 20000);
  check(true, 'Leave the demo goes back to "Who will use this phone?"');

  // Opening the app again: still not in demo mode (the role picker would open otherwise).
  await a.open('/');
  await a.tap('Continue', { button: true, timeout: 20000 });
  await a.see('Who will use this phone?', 20000);
  check(true, 'the choice is remembered after a restart');

  await a.longPress('setup-logo');
  await a.see('Who is using Smriti?', 20000);
  await a.see('Kamala');
  check(true, 'opening the demo again finds the same story');

  check(a.errors.length === 0, `no errors in the browser console${a.errors.length ? `: ${a.errors.join(' | ')}` : ''}`);
} finally {
  await stop();
}
