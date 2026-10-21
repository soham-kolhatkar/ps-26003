// F15 cloud part (needs SQL 001): sign up, settings, sign out / in, restart, wrong PIN,
// wrong role, number already registered. Creates real test accounts named "E2E …".
import { check, phone, start, stop, testPhone } from './lib.mjs';

const PIN = '246810';

async function signUpCaregiver(p, number, name) {
  await p.open('/');
  await p.tap('Continue', { button: true });
  await p.tap('Family caregiver');
  await p.see('Sign in');
  await p.tap('Create a new account', { button: true });
  await p.see('New account');
  await p.fill('name', name);
  await p.fill('phone', number);
  await p.fill('district', 'Jorhat');
  await p.fill('pin', PIN);
  await p.fill('pin-again', PIN);
  await p.shot('signup-form');
  await p.tap('Create account', { button: true });
}

await start();
try {
  const number = testPhone();
  const c = await phone('caregiver');
  await signUpCaregiver(c, number, 'E2E Priya');
  await c.see('Hello, E2E', 30000);
  await c.shot('caregiver-home');
  check(true, `sign-up works and opens the caregiver home (${number})`);
  await c.see('No family member yet');
  check(true, 'empty cloud home shows the "no family member yet" note (no demo data)');

  await c.open('/'); // app restart
  await c.see('Hello, E2E', 30000);
  check(true, 'a restart opens the caregiver home directly (session kept)');

  await c.tap('Settings', { button: true });
  await c.see('E2E Priya');
  await c.shot('settings');
  await c.tap('Sign out', { button: true, exact: true });
  await c.see('Welcome to Smriti', 20000);
  check(true, 'sign out returns to the start screen');

  await c.tap('Continue', { button: true });
  await c.see('Sign in');
  await c.fill('phone', number);
  await c.fill('pin', '111111');
  await c.tap('Sign in', { button: true, exact: true });
  await c.see('Wrong mobile number or PIN');
  await c.shot('wrong-pin');
  check(true, 'a wrong PIN shows a friendly error');

  await c.fill('phone', `+91 ${number.slice(0, 5)} ${number.slice(5)}`);
  await c.fill('pin', PIN);
  await c.tap('Sign in', { button: true, exact: true });
  await c.see('Hello, E2E', 30000);
  check(true, 'sign in with phone + PIN (typed with +91 and a space) works');

  // Another phone set up for an ASHA worker cannot use the caregiver's account.
  const a = await phone('asha');
  await a.open('/');
  await a.tap('Continue', { button: true });
  await a.tap('ASHA worker');
  await a.see('Sign in');
  await a.fill('phone', number);
  await a.fill('pin', PIN);
  await a.tap('Sign in', { button: true, exact: true });
  await a.see('registered as Family caregiver');
  await a.shot('wrong-role');
  check(true, 'a caregiver account is refused on a phone set up for an ASHA worker');

  // Same number again → "already has an account".
  const d = await phone('dup');
  await signUpCaregiver(d, number, 'E2E Duplicate');
  await d.see('already has an account');
  check(true, 'signing up twice with one number is refused');

  for (const p of [c, a, d]) {
    const real = p.errors.filter((e) => !/Cloud request failed|400|422|Invalid login|already/i.test(e));
    check(real.length === 0, `${p.name}: no unexpected browser errors${real.length ? `: ${real.join(' | ')}` : ''}`);
  }
} finally {
  await stop();
}
