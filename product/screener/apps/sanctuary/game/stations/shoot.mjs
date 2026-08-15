/**
 * Screenshots of the three stations, from the vantage a child actually gets.
 *
 * Drives the running sanctuary vite on 5230; nothing is started here. Playwright is not a dependency of
 * this repo, so it is imported by absolute path from the npx cache — the same choice `screener/shoot.mjs`
 * made, and for the same reason: adding a browser to `package.json` for a looking-glass would be a heavy
 * change to a file the game imports.
 *
 * ANGLE plus the software rasteriser, because headless Chrome on a laptop has no GPU to give and the
 * default swiftshader path refuses without the unsafe flag. Without both, every shot is a blank sky and
 * the failure looks exactly like a bug in the component.
 *
 * THE REWARD SHOTS ARE NOT STAGED. `answer-1` through `hatch` are produced by clicking at the CENTRE OF
 * THE SCREEN four times, which is the only input this interaction accepts. So the sequence doubles as the
 * end-to-end proof that the crosshair path works: if the compute override were wrong, no click would land
 * on anything, no pip would light, and the egg would never hatch.
 *
 * Run: node apps/sanctuary/game/stations/shoot.mjs
 */
import { chromium } from '/Users/alphaintern/.npm/_npx/e41f203b7505f1fb/node_modules/playwright/index.mjs';

const OUT = '/Users/alphaintern/gt-dev-view/shots';
const BASE = 'http://127.0.0.1:5230/game/stations/preview.html';

const browser = await chromium.launch({
  channel: 'chrome',
  args: ['--use-gl=angle', '--enable-unsafe-swiftshader'],
});
const page = await browser.newPage({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 2 });

const problems = [];
page.on('console', (m) => {
  if (m.type() === 'error') problems.push(m.text());
});
page.on('pageerror', (e) => problems.push(String(e)));

const shot = async (name, query, settle = 1500) => {
  await page.goto(`${BASE}?${query}`, { waitUntil: 'networkidle' });
  await page.waitForFunction(() => window.__stations?.ready === true, { timeout: 15000 });
  await page.waitForTimeout(settle);
  await page.screenshot({ path: `${OUT}/station-${name}.png` });
  const state = await page.evaluate(() => window.__stations);
  console.log(`station-${name}.png  ${JSON.stringify(state)}`);
};

/* Each station from across the meadow: is it obviously a made thing, and obviously somewhere to go? */
await shot('coat-far', 'shot=coat&view=far');
await shot('tide-far', 'shot=tide&view=far');
await shot('log-far', 'shot=log&view=far');

/* In range: the lanterns up, the wisp down, and the press badge in the air. */
await shot('coat-prompt', 'shot=coat&view=near');
await shot('tide-prompt', 'shot=tide&view=near');
await shot('log-prompt', 'shot=log&view=near');

/* Docked with an item up. Easiest and hardest shapes for the coat wall, since the panel is fitted to the
   option count and a six-option matrix is the case that decides the scale for all of them. */
await shot('coat-engaged', 'shot=coat&view=engaged&band=K-1&i=0');
await shot('coat-engaged-six', 'shot=coat&view=engaged&i=90');
await shot('tide-engaged', 'shot=tide&view=engaged&band=K-1&i=0');
await shot('log-engaged', 'shot=log&view=engaged&band=K-1&i=0');

/**
 * Aim the head until the crosshair is genuinely on a choice, the way a child would.
 *
 * Sweeps downward in small steps — the choices hang below the panel on all three — and reads back what
 * the ray actually finds rather than trusting a pixel coordinate. Returns false if it never lands, which
 * is a failure worth failing on: it would mean the shelf is out of the docked view.
 */
let mx = 640;
let my = 400;
const aimAtChoice = async () => {
  for (let step = 0; step < 26; step += 1) {
    const aim = await page.evaluate(() => window.__aim);
    if (aim?.choosable) return true;
    // Down first, then a small sideways wander, which is also what a child's hand does.
    my += 22;
    if (step > 12) {
      my = 400 + (step - 12) * 14;
      mx = 640 + (step % 2 ? -1 : 1) * (step - 12) * 26;
    }
    await page.mouse.move(mx, my);
    await page.waitForTimeout(130);
  }
  return false;
};

/* THE REWARD, driven by real aiming and real clicks at the crosshair. Four choices close the round. */
await page.goto(`${BASE}?shot=tide&view=engaged&band=K-1&i=0`, { waitUntil: 'networkidle' });
await page.waitForFunction(() => window.__stations?.ready === true, { timeout: 15000 });
await page.waitForTimeout(1200);
await page.mouse.move(mx, my);

for (let i = 1; i <= 4; i += 1) {
  const found = await aimAtChoice();
  console.log(`choice ${i}: crosshair on a choice = ${found} ${JSON.stringify(await page.evaluate(() => window.__aim))}`);
  if (!found) break;
  if (i === 1) await page.screenshot({ path: `${OUT}/station-crosshair-hot.png` });
  await page.mouse.click(mx, my);
  await page.waitForTimeout(420);
  if (i <= 2) await page.screenshot({ path: `${OUT}/station-answer-${i}.png` });
  await page.waitForTimeout(760);
  // The next item remounts the shelf, so re-aim from the top each time.
  my = 400;
  mx = 640;
  await page.mouse.move(mx, my);
  await page.waitForTimeout(160);
}

console.log(`after four choices: ${JSON.stringify(await page.evaluate(() => window.__stations))}`);

/**
 * Point the head at the cradle for the hatch shots.
 *
 * Aiming at four choices in a row sweeps the head a long way off centre — up to 33° of yaw — which is fine
 * for a child and useless for a screenshot: the first run of this script photographed the sky beside the
 * station. `__lookAt` is the preview's own deterministic aim, so the reward is framed on the egg rather
 * than on wherever the last choice happened to be.
 */
const framing = await page.evaluate(() => ({
  cradle: window.__stations?.cradle,
  eye: window.__stations?.rewardEye,
}));
await page.evaluate((f) => {
  if (f.eye) window.__moveTo?.(f.eye[0], f.eye[1], f.eye[2]);
  if (f.cradle) window.__lookAt?.(f.cradle[0], 0.85, f.cradle[2]);
}, framing);
console.log(`framed on the cradle ${JSON.stringify(framing)}`);

/**
 * The egg, mid-hatch and then mid-bound.
 *
 * Timed off `hatchTiming` in `Cradle.tsx`: the shell parts at 0.75s, the hatchling is out and greeting by
 * 1.25s, hopping from 1.7s to 3.3s, and gone by 4.0s. The round closed about 0.7s before this point — the
 * loop above waits that long after the fourth choice — so these three waits land at roughly 1.3s, 2.6s and
 * 4.4s into the sequence.
 */
await page.waitForTimeout(700);
await page.screenshot({ path: `${OUT}/station-hatch-open.png` });
await page.waitForTimeout(1300);
await page.screenshot({ path: `${OUT}/station-hatch-away.png` });
await page.waitForTimeout(1800);
await page.screenshot({ path: `${OUT}/station-after.png` });
console.log(`granted: ${JSON.stringify(await page.evaluate(() => window.__stations))}`);

/**
 * And the slime where it ended up: pen 1, which is the one the tide ledge's hatchlings run for.
 *
 * The camera has to MOVE, not just turn. Left at the reward vantage it is inside the spring basin's kerb
 * and the near plane clips through stone, which produces a flat grey frame that looks like a broken
 * renderer rather than a mis-aimed camera.
 */
await page.evaluate(() => {
  window.__moveTo?.(13.2, 1.5, 8.4);
  window.__lookAt?.(13.0, 0.35, 4.2);
});
await page.waitForTimeout(900);
await page.screenshot({ path: `${OUT}/station-reward-pen.png` });

/**
 * `prefers-reduced-motion`, which is a rule rather than a nicety.
 *
 * Every animation in this directory is gated on it and every gate resolves to its own RESTING state
 * rather than to nothing — the wisp hovers still, the ground rings sit at their mid radius, the press
 * badge shows one ring out and one in, the socket still glows, and the egg hatches without the wobble.
 * The point of shooting it is that "resolves to nothing" and "resolves to its resting state" are
 * indistinguishable in code review and obvious in a picture.
 */
const still = await browser.newPage({
  viewport: { width: 1280, height: 800 },
  deviceScaleFactor: 2,
  reducedMotion: 'reduce',
});
for (const [name, query] of [
  ['reduced-prompt', 'shot=log&view=near'],
  ['reduced-engaged', 'shot=log&view=engaged&band=K-1&i=0'],
]) {
  await still.goto(`${BASE}?${query}`, { waitUntil: 'networkidle' });
  await still.waitForFunction(() => window.__stations?.ready === true, { timeout: 15000 });
  await still.waitForTimeout(1600);
  await still.screenshot({ path: `${OUT}/station-${name}.png` });
  console.log(`station-${name}.png (reduced motion)`);
}

if (problems.length) {
  console.log(`\n${problems.length} console problem(s):`);
  for (const p of problems.slice(0, 12)) console.log(`  ${p}`);
} else {
  console.log('\nno console errors');
}

await browser.close();
