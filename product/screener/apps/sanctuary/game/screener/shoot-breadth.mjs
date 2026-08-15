/**
 * Screenshots of the four presentations added to widen what a child can actually be shown, from the
 * vantage the child gets.
 *
 * WHY A SECOND SHOOTER NEXT TO `shoot.mjs`. That one walks the tide-line and the day's log and takes
 * eighteen shots doing it; iterating on a silhouette means running the shooter a dozen times, and waiting
 * on shots you are not looking at is how you stop looking. Same browser flags, same vantage, same
 * looking-glass — a different list.
 *
 * ANGLE plus the software rasteriser, because a headless Chrome on a laptop has no GPU to give and the
 * default swiftshader path refuses without the unsafe flag. Without both, every shot is a blank sky and
 * the failure looks exactly like a bug in the component.
 *
 * Run: node apps/sanctuary/game/screener/shoot-breadth.mjs
 */
import { chromium } from '/Users/alphaintern/.npm/_npx/e41f203b7505f1fb/node_modules/playwright/index.mjs';

const OUT = '/Users/alphaintern/gt-dev-view/shots';
const BASE = 'http://127.0.0.1:5230/game/screener/preview.html';

/**
 * Chosen off the banks rather than by taste, to span what each type actually holds at its ends:
 *
 *   stones  — one badge and two stones, up to three badges and seven stones.
 *   sprout  — two examples of single digits, three examples running into the twenties and beyond.
 *   weave   — a four-pad row where only the motif moves; the ONLY items where `fill` progresses (band
 *             4-5, `["count","rot","fill"]`); and a three-by-three where five attributes move at once,
 *             `size` among them. Those last two are the pair this file exists to check.
 *   balance — one shape and no swaps, up to four shapes and three swaps with seven-weight loads.
 */
const SHOTS = [
  ['breadth-stones-k1', 'show=stones&band=K-1&i=0'],
  ['breadth-stones-mid', 'show=stones&band=4-5&i=3'],
  ['breadth-stones-hard', 'show=stones&band=6-8&i=3'],
  ['breadth-stones-tight', 'show=stones&band=6-8&i=3&tight=1'],

  ['breadth-sprout-k1', 'show=sprout&band=K-1&i=0'],
  ['breadth-sprout-mid', 'show=sprout&band=4-5&i=0'],
  ['breadth-sprout-hard', 'show=sprout&band=6-8&i=2'],
  ['breadth-sprout-tight', 'show=sprout&band=K-1&i=0&tight=1'],

  ['breadth-weave-row', 'show=weave&band=K-1&i=0'],
  ['breadth-weave-fill', 'show=weave&band=4-5&i=2'],
  ['breadth-weave-fill-tight', 'show=weave&band=4-5&i=2&tight=1'],
  ['breadth-weave-grid', 'show=weave&band=6-8&i=0'],
  ['breadth-weave-grid-tight', 'show=weave&band=6-8&i=0&tight=1'],

  ['breadth-balance-k1', 'show=balance&band=K-1&i=0'],
  ['breadth-balance-mid', 'show=balance&band=4-5&i=0'],
  ['breadth-balance-hard', 'show=balance&band=6-8&i=2'],
  ['breadth-balance-tight', 'show=balance&band=6-8&i=2&tight=1'],
];

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

for (const [name, query] of SHOTS) {
  await page.goto(`${BASE}?${query}`, { waitUntil: 'networkidle' });
  // Two seconds of breathing light, so the empty place is caught mid-glow rather than at its darkest.
  await page.waitForTimeout(1400);
  await page.screenshot({ path: `${OUT}/${name}.png` });
  console.log(`${name}.png  ${await page.locator('p').first().innerText()}`);
}

/**
 * The pick, on each of the four.
 *
 * Two claims per shot, and the second one is the load-bearing one. First: the chosen thing has to
 * VISIBLY go where the missing thing was, or the pick reads as nothing happening. Second: nothing about
 * the picture says whether it was the right thing, because none of these components knows — and on the
 * balance specifically, THE BEAM IS STILL LEVEL after answering, which is the whole reason that file
 * refuses to model a tilt.
 */
const PICKS = [
  ['breadth-stones', 'show=stones&band=4-5&i=3', 445, 640],
  ['breadth-sprout', 'show=sprout&band=K-1&i=0', 500, 650],
  ['breadth-weave', 'show=weave&band=4-5&i=2', 470, 655],
  ['breadth-balance', 'show=balance&band=6-8&i=2', 470, 640],
];

for (const [name, query, x, y] of PICKS) {
  await page.goto(`${BASE}?${query}`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);
  await page.mouse.move(x, y);
  await page.waitForTimeout(700);
  await page.screenshot({ path: `${OUT}/${name}-hover.png` });
  await page.mouse.click(x, y);
  await page.waitForTimeout(900);
  await page.screenshot({ path: `${OUT}/${name}-picked.png` });
  console.log(`${name}-hover.png, ${name}-picked.png`);
}

/**
 * Reduced motion. The claim being checked is that every empty place resolves to its breath's MIDPOINT
 * rather than to nothing: a child whose parent set this must still be able to find the pan, the pad, the
 * dish and the bed that are waiting, so all four have to stay lit while they stop pulsing.
 */
const still = await browser.newPage({
  viewport: { width: 1280, height: 800 },
  deviceScaleFactor: 2,
  reducedMotion: 'reduce',
});
for (const [name, query] of [
  ['breadth-stones-reduced-motion', 'show=stones&band=K-1&i=0'],
  ['breadth-sprout-reduced-motion', 'show=sprout&band=K-1&i=0'],
  ['breadth-weave-reduced-motion', 'show=weave&band=6-8&i=0'],
  ['breadth-balance-reduced-motion', 'show=balance&band=K-1&i=0'],
]) {
  await still.goto(`${BASE}?${query}`, { waitUntil: 'networkidle' });
  await still.waitForTimeout(1200);
  await still.screenshot({ path: `${OUT}/${name}.png` });
  console.log(`${name}.png`);
}

await browser.close();
if (problems.length) {
  console.log('\nconsole/page errors:');
  for (const p of problems.slice(0, 12)) console.log(`  ${p}`);
  process.exitCode = 1;
}
