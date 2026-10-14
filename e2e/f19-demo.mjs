// F19: Demo tools load the cloud story; each demo account then sees its part. Needs SQL 001–005.
import { check, phone, start, stop } from './lib.mjs';

async function signIn(p, role, number) {
  await p.open('/');
  await p.tap('Continue', { button: true });
  await p.tap(role);
  await p.fill('phone', number);
  await p.fill('pin', '123456');
  await p.tap('Sign in', { button: true, exact: true });
  await p.see('Hello', 30000);
}

await start();
try {
  const tools = await phone('demo-tools');
  await tools.open('/demo-tools');
  await tools.see('Demo tools');
  await tools.tap('Load / reset the cloud demo', { button: true });
  await tools.see('✅ done', 240000);
  await tools.shot('loaded');
  check(true, 'Demo tools load the story into the cloud');

  const priya = await phone('priya');
  await signIn(priya, 'Family caregiver', '9000010001');
  await priya.see('Kamala Sharma', 30000);
  await priya.see('games this week');
  await priya.shot('home');
  check(!(await priya.page.getByText('Progress · 0 games').count()), 'Priya sees Kamala with her game history');

  const sunita = await phone('sunita');
  await signIn(sunita, 'ASHA worker', '9000010002');
  await sunita.see('Ramesh Kumar', 30000);
  await sunita.see('Lakshmi Iyer');
  await sunita.see('Kamala Sharma');
  await sunita.see('Visit overdue');
  // Two games slipping + blood-pressure medicine often missed (missed doses are computed on her phone).
  await sunita.see('Things to look at: 3', 30000);
  await sunita.shot('asha-list');
  check(true, "Sunita sees her three patients; Ramesh: visit overdue, 3 things to look at (incl. missed medicine)");

  const anjali = await phone('anjali');
  await signIn(anjali, 'Doctor', '9000010003');
  await anjali.see('Ramesh Kumar', 30000);
  await anjali.see('Referred by the ASHA worker');
  await anjali.tap('Ramesh Kumar');
  await anjali.see('Cognitive trend report');
  await anjali.see('Planning & reasoning', 20000);
  await anjali.shot('ramesh-report');
  check(true, "Dr. Anjali sees the referral and Ramesh's trend report");

  // Reset works: a second load replaces the story (no duplicates).
  await tools.tap('Load / reset the cloud demo', { button: true });
  await tools.see('removed', 240000);
  await tools.see('✅ done', 240000);
  await priya.open('/');
  await priya.see('Kamala Sharma', 30000);
  check(
    (await priya.page.getByText('Kamala Sharma', { exact: true }).count()) === 1,
    'reset leaves one Kamala, not two',
  );

  for (const ph of [tools, priya, sunita, anjali]) {
    const real = ph.errors.filter((e) => !/Cloud request failed|400|422|404|Invalid login|already/i.test(e));
    check(real.length === 0, `${ph.name}: no unexpected browser errors${real.length ? `: ${real.join(' | ')}` : ''}`);
  }
} finally {
  await stop();
}
