// F15 offline part: first launch → "Who will use this phone?" → hidden demo mode still works.
import { check, phone, start, stop } from './lib.mjs';

await start();
try {
  const a = await phone('demo');
  await a.open('/');
  await a.see('Welcome to Smriti');
  await a.shot('welcome');
  await a.tap('Continue', { button: true });
  await a.see('Who will use this phone?');
  await a.shot('setup');
  check(true, 'first launch shows "Who will use this phone?" (no role picker)');

  await a.longPress('setup-logo');
  await a.see('Who is using Smriti?');
  await a.shot('demo-roles');
  check(true, 'long-press on the flower opens the single-phone demo');

  await a.tap('Kamala');
  await a.see('Choose a game', 20000);
  await a.shot('demo-patient-home');
  check(true, 'demo patient home works on web (seeded SQLite)');

  await a.open('/'); // an app restart starts at the root
  await a.see('Welcome to Smriti');
  await a.tap('Continue', { button: true });
  await a.see('Who is using Smriti?');
  check(true, 'demo mode is remembered after a restart');

  check(a.errors.length === 0, `no errors in the browser console${a.errors.length ? `: ${a.errors.join(' | ')}` : ''}`);
} finally {
  await stop();
}
