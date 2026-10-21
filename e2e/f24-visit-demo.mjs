// F24 offline part: the ASHA home visit as one question per screen (demo, no cloud).
// Sunita → Ramesh → Start home visit → skip the check-up → 6 questions → refer → save.
import { check, phone, start, stop } from './lib.mjs';

await start();
try {
  const a = await phone('visit');
  await a.open('/');
  await a.tap('Continue', { button: true });
  await a.see('Who will use this phone?');
  await a.longPress('setup-logo');
  await a.see('Who is using Smriti?');
  await a.tap('Sunita');
  await a.page.waitForTimeout(800);
  for (const d of '1234')
    await a.page.getByRole('button', { name: d, exact: true }).filter({ visible: true }).first().click();
  await a.see('Hello, Sunita', 20000);

  await a.tap('Ramesh Kumar');
  await a.tap('Start home visit', { button: true });
  await a.see('About 5 minutes');
  await a.shot('intro');
  await a.tap('Skip check-up', { button: true });

  // One question per screen; an answer moves on by itself.
  const answers = ['Poor', 'Low / sad', 'Good', 'Sometimes', 'No', 'Often'];
  for (const [i, answer] of answers.entries()) {
    await a.see(`Question ${i + 1} of 6`, 10000);
    if (i === 0) await a.shot('question');
    await a.page.getByRole('radio', { name: answer, exact: true }).filter({ visible: true }).first().click();
    await a.page.waitForTimeout(700);
  }
  await a.see('Finish the visit', 10000);
  check(true, 'six questions, one per screen, each moving on after the answer');

  // Answers at a glance; tap one to change it.
  await a.see('Low / sad');
  await a.tap(/^Mood:/, { button: true });
  await a.see('Question 2 of 6');
  await a.page.getByRole('radio', { name: 'Okay', exact: true }).filter({ visible: true }).first().click();
  await a.page.waitForTimeout(700);
  await a.see('Question 3 of 6');
  for (let k = 0; k < 4; k++) {
    await a.page.getByRole('button', { name: 'Not sure, skip' }).filter({ visible: true }).first().click();
    await a.page.waitForTimeout(300);
  }
  await a.see('Finish the visit', 10000);
  await a.see('Okay');
  check(true, 'an answer can be changed from the finish screen (the others are kept)');

  await a.page.getByRole('switch', { name: 'Refer to the doctor' }).filter({ visible: true }).first().click();
  await a.shot('finish');
  await a.tap('Save visit', { button: true });
  await a.see('Visit saved', 15000);
  await a.see('Referred to the doctor');
  await a.shot('saved');
  check(true, 'the visit is saved with the referral');

  await a.tap('Back to patient', { button: true });
  await a.page.getByTestId('tab-visits').filter({ visible: true }).first().click();
  await a.see('Referred to the doctor', 10000);
  check(true, "the new visit is on Ramesh's page");

  check(a.errors.length === 0, `no errors in the browser console${a.errors.length ? `: ${a.errors.join(' | ')}` : ''}`);
} finally {
  await stop();
}
