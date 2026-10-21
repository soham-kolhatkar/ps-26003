// Tiny Playwright harness for the web build (Tier 3 testing in Chromium).
// Each "phone" is its own browser context = its own storage (SQLite, session, mode).
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';

export const BASE = process.env.SMRITI_URL ?? 'http://localhost:8081';
const SHOTS = process.env.SHOTS_DIR ?? 'e2e/shots';
mkdirSync(SHOTS, { recursive: true });

let browser;
export async function start() {
  browser = await chromium.launch();
  return browser;
}
export async function stop() {
  await browser?.close();
}

/** A simulated phone (412×915, like the user's Samsung). */
export async function phone(name) {
  const context = await browser.newContext({ viewport: { width: 412, height: 915 }, locale: 'en-IN' });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
  const warnings = [];
  page.on('console', (m) => {
    if (m.type() === 'warning' || m.type() === 'error') warnings.push(`${m.type()}: ${m.text()}`);
    if (m.type() === 'error' || (m.type() === 'warning' && /DB query failed|failed/i.test(m.text()))) {
      errors.push(`${m.type()}: ${m.text()}`);
    }
  });
  // window.confirm / alert → accept (our confirm() helper uses them on web).
  // confirm/alert → accept; prompt → the value queued with answerNextPrompt() (else its default).
  const prompts = [];
  page.on('dialog', (d) => (d.type() === 'prompt' ? d.accept(prompts.shift() ?? d.defaultValue()) : d.accept()));
  let n = 0;
  const p = {
    name,
    page,
    errors,
    warnings,
    async open(path = '/') {
      await page.goto(BASE + path, { waitUntil: 'networkidle', timeout: 180000 });
    },
    async shot(label) {
      const file = join(SHOTS, `${name}-${String(++n).padStart(2, '0')}-${label}.png`);
      await page.waitForTimeout(400);
      await page.screenshot({ path: file });
      return file;
    },
    async tap(text, opts = {}) {
      // Earlier stack screens stay in the DOM on web: only act on what is visible.
      const loc = opts.button
        ? page.getByRole('button', { name: text, exact: opts.exact ?? false })
        : page.getByText(text, { exact: opts.exact ?? false });
      await loc
        .filter({ visible: true })
        .first()
        .click({ timeout: opts.timeout ?? 15000 });
    },
    async fill(testId, value) {
      await page.getByTestId(testId).filter({ visible: true }).first().fill(value);
    },
    async see(text, timeout = 15000) {
      await page.getByText(text, { exact: false }).filter({ visible: true }).first().waitFor({ timeout });
    },
    async longPress(testId, ms = 1800) {
      const el = page.getByTestId(testId).filter({ visible: true }).first();
      await el.scrollIntoViewIfNeeded();
      const box = await el.boundingBox();
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
      await page.mouse.down();
      await page.waitForTimeout(ms);
      await page.mouse.up();
    },
    /** Press and hold something found by its text (HoldButton, long-press). */
    async holdText(text, ms = 2600) {
      const el = page.getByText(text, { exact: false }).filter({ visible: true }).first();
      await el.scrollIntoViewIfNeeded();
      const box = await el.boundingBox();
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
      await page.mouse.down();
      await page.waitForTimeout(ms);
      await page.mouse.up();
    },
    async text(testId) {
      return (await page.getByTestId(testId).filter({ visible: true }).first().innerText()).trim();
    },
    answerNextPrompt(value) {
      prompts.push(value);
    },
    async reload() {
      await page.reload({ waitUntil: 'networkidle' });
    },
  };
  return p;
}

/** A fresh, valid Indian mobile number for test accounts. */
export function testPhone() {
  return `9${String(Math.floor(Math.random() * 1e9)).padStart(9, '0')}`;
}

/** Sign up a staff account on a fresh phone (role: 'Family caregiver' | 'ASHA worker' | 'Doctor'). */
export async function signUp(p, role, name, number, pin = '246810', extra = {}) {
  await p.open('/');
  await p.tap('Continue', { button: true });
  await p.tap(role);
  await p.see('Sign in');
  await p.tap('Create a new account', { button: true });
  await p.see('New account');
  await p.fill('name', name);
  await p.fill('phone', number);
  if (extra.organization) await p.fill('organization', extra.organization);
  await p.fill('district', extra.district ?? 'Jorhat');
  await p.fill('pin', pin);
  await p.fill('pin-again', pin);
  await p.tap('Create account', { button: true });
  await p.see(`Hello, ${name.split(' ')[0]}`, 30000);
}

export function check(cond, msg) {
  if (!cond) throw new Error(`CHECK FAILED: ${msg}`);
  console.log(`  ✓ ${msg}`);
}
