/**
 * TEMPORARY. Renders every audio graph in real Chrome and prints what it measured, because a Web Audio graph
 * that is wrong throws nothing and looks perfect — it is simply silent.
 *
 *     node apps/sanctuary/game/audio/verify.mjs
 *
 * It needs the sanctuary vite server already running on 5230 (`npm run sanctuary`). Two halves:
 *
 *   LIVE CHECKS drive the shipped path with real clicks and real keypresses, and read the engine's own state
 *   back. They are what prove the gesture gate, the mute, the M key and the reduced-motion default — none of
 *   which an offline render can see, because all four are about WHEN a context is allowed to exist.
 *
 *   OFFLINE MEASUREMENTS run `measure.ts` IN THE PAGE — the same code the MEASURE button uses, so there is no
 *   second implementation of the check — and print peak and RMS per sound plus a self-calibrating
 *   discontinuity test on the suction ramps.
 *
 * Exit code 1 if anything is silent, too loud, clipping, has a step at a suction ramp, or if any live check
 * fails.
 *
 * There is no vitest equivalent on purpose: `vite.config.ts` runs the suite in the `node` environment and
 * Node has no OfflineAudioContext, so a test there could only assert against a mock of the thing being
 * tested. Chrome's own audio engine is the only honest judge available.
 *
 * Playwright is not a dependency of this repo; it is imported by absolute path out of the npx cache, exactly
 * as `vacpack/shoot.mjs` and `slimes/shoot.mjs` already do.
 */
import { chromium } from '/Users/alphaintern/.npm/_npx/e41f203b7505f1fb/node_modules/playwright/index.mjs';

const BASE = 'http://127.0.0.1:5230/game/audio/preview.html';

const browser = await chromium.launch({
  channel: 'chrome',
  // `--mute-audio` renders into a null sink, so a run makes no noise and works on a machine with no output
  // device. The autoplay policy is deliberately NOT relaxed: the gesture gate is one of the things under test.
  args: ['--mute-audio'],
});

const failures = [];
const check = (name, ok, detail) => {
  console.log(`  ${ok ? 'ok  ' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`);
  if (!ok) failures.push(name);
};

async function open(query = '', options = {}) {
  // A CONTEXT PER PAGE, not just a page, and that is load-bearing rather than tidy: the mute preference is
  // kept in `localStorage`, deliberately, and pages in one browser context share it. Reusing a context meant
  // the reduced-motion check inherited the choice the earlier checks had left behind and quietly passed for
  // the wrong reason — which is exactly the behaviour `mute.ts` promises, and exactly what makes it untestable
  // from a dirty origin.
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 }, ...options });
  const page = await context.newPage();
  const problems = [];
  page.on('console', (m) => {
    // The sanctuary app declares no favicon, so every page in it logs a 404 for one. Pre-existing, not ours,
    // and matched on the request URL because the console text itself does not name it.
    if (m.type() === 'error' && !(m.location()?.url ?? '').includes('favicon')) problems.push(m.text());
  });
  page.on('pageerror', (e) => problems.push(`pageerror: ${e.message}`));
  await page.goto(`${BASE}${query}`, { waitUntil: 'load' });
  // Wait for the module graph, not for a clock: on a cold Vite cache the entry's imports are still arriving
  // when `load` fires, and a fixed delay would measure an empty page on the first run of every session.
  await page.waitForFunction(() => typeof window.__audio?.measure === 'function', null, { timeout: 45000 });
  return { page, problems };
}

const state = (page) => page.evaluate(() => window.__audio.state());

/* ------------------------------------------------------------------ *\
   Live checks
\* ------------------------------------------------------------------ */

console.log('\nLIVE — the gesture gate, the mute, and the M key\n');

const { page, problems } = await open();

const before = await state(page);
check('no AudioContext before any gesture', before.context === 'none', `state was "${before.context}"`);
check('starts unmuted at a gentle level', (await page.getAttribute('button[aria-pressed]', 'aria-pressed')) === 'false');

// A sound button, which is both a gesture and a real call into the shipped API.
await page.click('[data-role="squish"]');
await page.waitForTimeout(500);
const afterClick = await state(page);
check('one click brings the context up', afterClick.context === 'running', `state was "${afterClick.context}"`);
check('the ambient pad is being scheduled', afterClick.padRunning === true);

// Hold the suction pad, then let go, and confirm the engine agrees it has stopped.
const pad = page.locator('[data-role="suck"]');
await pad.hover();
await page.mouse.down();
await page.waitForTimeout(700);
const holding = await state(page);
check('holding draws', holding.sucking === true && holding.hasVacuum === true);
await page.mouse.up();
await page.waitForTimeout(300);
check('letting go stops drawing', (await state(page)).sucking === false);

// The keyboard mute, which is the only one available under pointer lock.
await page.keyboard.press('KeyM');
await page.waitForTimeout(600);
const afterM = await state(page);
check('M mutes and suspends the context', afterM.context === 'suspended', `state was "${afterM.context}"`);
check('the button shows muted', (await page.getAttribute('button[aria-pressed]', 'aria-pressed')) === 'true');
await page.keyboard.press('KeyM');
await page.waitForTimeout(600);
check('M again brings it back', (await state(page)).context === 'running');

// And the visible control, which is what an adult reaches for. Left MUTED, for the next check.
await page.click('button[aria-pressed]');
await page.waitForTimeout(600);
check('the button mutes too', (await state(page)).context === 'suspended');

// A muted draw must schedule nothing at all, not merely be inaudible.
await pad.hover();
await page.mouse.down();
await page.waitForTimeout(300);
check('a muted draw does not start', (await state(page)).sucking === false);
await page.mouse.up();
await page.click('button[aria-pressed]');
await page.waitForTimeout(400);
check('unmuting brings it back up', (await state(page)).context === 'running');

/* prefers-reduced-motion, in a context of its own so it has a clean `localStorage` — and set through
   Chrome's REAL media feature rather than by patching `matchMedia`, so what is under test is the query the
   browser answers rather than a stub of it. (`?quiet=1` exists for a human doing the same thing by hand.) */
const quiet = await open('', { reducedMotion: 'reduce' });
check('reduced motion starts muted', (await quiet.page.getAttribute('button[aria-pressed]', 'aria-pressed')) === 'true');
await quiet.page.click('[data-role="squish"]');
await quiet.page.waitForTimeout(400);
const quietState = await state(quiet.page);
check(
  'and builds no context at all until unmuted',
  quietState.context === 'none',
  `state was "${quietState.context}"`,
);
// Unmuting from that state must still work, since it is the adult's way back in.
await quiet.page.click('button[aria-pressed]');
await quiet.page.waitForTimeout(500);
check('unmuting from muted-by-default works', (await state(quiet.page)).context === 'running');
if (quiet.problems.length > 0) {
  for (const p of quiet.problems) console.log(`  · reduced-motion page: ${p}`);
  failures.push('console errors on the reduced-motion page');
}
await quiet.page.close();

/* ------------------------------------------------------------------ *\
   Offline measurements
\* ------------------------------------------------------------------ */

console.log('\nOFFLINE — every graph rendered in Chrome and measured\n');

await page.evaluate(() => window.__audio.measure());
await page.waitForFunction(() => typeof window.__audioText === 'string', null, { timeout: 120000 });

const text = await page.evaluate(() => window.__audioText);
const report = await page.evaluate(() => window.__audioReport ?? null);
console.log(text);

/* ------------------------------------------------------------------ *\
   Teardown
\* ------------------------------------------------------------------ */

console.log('\nTEARDOWN — unmounting the provider\n');

await page.click('button[data-role="mount"]');
await page.waitForTimeout(500);
const gone = await state(page);
check('the context is closed, not just dropped', gone.disposed === 'closed', `disposed state "${gone.disposed}"`);
check('nothing is left running', gone.context === 'none' && gone.refs === 0);
// And it can come back, which is the case React 19 StrictMode produces on every mount in development.
await page.click('button[data-role="mount"]');
await page.waitForTimeout(300);
await page.click('[data-role="squish"]');
await page.waitForTimeout(400);
check('remounting gives a working engine again', (await state(page)).context === 'running');

if (problems.length > 0) {
  console.log('\nconsole problems:');
  for (const p of problems) console.log(`  · ${p}`);
  failures.push('console errors');
}

await browser.close();

if (!report?.ok) failures.push('offline measurements');
if (failures.length > 0) {
  console.log(`\nFAILED — ${failures.join(', ')}`);
  process.exit(1);
}
console.log('\nPASSED');
