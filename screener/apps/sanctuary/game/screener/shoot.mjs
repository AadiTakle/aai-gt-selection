/**
 * Screenshots of both presentations, from the vantage the child actually gets.
 *
 * Drives the running sanctuary vite on 5230 — nothing is started here. Playwright is not a dependency
 * of this repo, so it is imported by absolute path from the npx cache; that is deliberate rather than
 * lazy, because adding a browser to `package.json` for a looking-glass would be a heavy change to a
 * file the game does not import.
 *
 * ANGLE plus the software rasteriser, because a headless Chrome on a laptop has no GPU to give and the
 * default swiftshader path refuses without the unsafe flag. Without both, every shot is a blank sky
 * and the failure looks exactly like a bug in the component.
 *
 * Run: node apps/sanctuary/game/screener/shoot.mjs
 */
import { chromium } from '/Users/alphaintern/.npm/_npx/e41f203b7505f1fb/node_modules/playwright/index.mjs';

const OUT = '/Users/alphaintern/gt-dev-view/shots';
const BASE = 'http://127.0.0.1:5230/game/screener/preview.html';

/** Chosen to span the range the bank actually holds, easiest first. */
const SHOTS = [
  ['tide-k1-easy', 'show=tide&band=K-1&i=0'],
  ['tide-k1-later', 'show=tide&band=K-1&i=6'],
  ['tide-tight', 'show=tide&band=K-1&i=0&tight=1'],
  ['tide-mid', 'show=tide&band=2-3&i=2'],
  ['tide-hard', 'show=tide&band=6-8&i=0'],
  // The only items where `shape` is an active attribute alongside `count`: dot alternating with star.
  ['tide-shape', 'show=tide&band=6-8&i=30'],
  ['tide-shape-tight', 'show=tide&band=6-8&i=30&tight=1'],
  // The only items where  is an active attribute alongside : dot alternating with star.
  ['tide-shape', 'show=tide&band=6-8&i=30'],
  ['tide-shape-tight', 'show=tide&band=6-8&i=30&tight=1'],
  ['log-k1-easy', 'show=log&band=K-1&i=0'],
  ['log-k1-later', 'show=log&band=K-1&i=4'],
  ['log-tight', 'show=log&band=K-1&i=0&tight=1'],
  ['log-mid', 'show=log&band=2-3&i=1'],
  ['log-four', 'show=log&band=4-5&i=0'],
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
  // Two frames of breathing light, so the socket is caught mid-glow rather than at its darkest.
  await page.waitForTimeout(1400);
  await page.screenshot({ path: `${OUT}/${name}.png` });
  console.log(`${name}.png  ${await page.locator('p').first().innerText()}`);
}

/** A hover shot: this is the only way to see whether the row highlight actually reads. */
await page.goto(`${BASE}?show=log&band=K-1&i=0`, { waitUntil: 'networkidle' });
await page.waitForTimeout(900);
await page.mouse.move(640, 470);
await page.waitForTimeout(700);
await page.screenshot({ path: `${OUT}/log-hover.png` });
console.log('log-hover.png');

await page.goto(`${BASE}?show=tide&band=K-1&i=0`, { waitUntil: 'networkidle' });
await page.waitForTimeout(900);
await page.mouse.move(560, 640);
await page.waitForTimeout(700);
await page.screenshot({ path: `${OUT}/tide-hover.png` });
console.log('tide-hover.png');

/** And the settle: the chosen thing has to visibly go where the missing thing was, or the pick reads
 *  as nothing happening. Neither shot can show correctness, because neither component knows it. */
await page.mouse.click(560, 640);
await page.waitForTimeout(900);
await page.screenshot({ path: `${OUT}/tide-picked.png` });
console.log('tide-picked.png');

await page.goto(`${BASE}?show=log&band=K-1&i=0`, { waitUntil: 'networkidle' });
await page.waitForTimeout(900);
await page.mouse.click(640, 470);
await page.waitForTimeout(900);
await page.screenshot({ path: `${OUT}/log-picked.png` });
console.log('log-picked.png');

/**
 * Reduced motion. The claim being checked is that the socket's breath resolves to its MIDPOINT rather
 * than to nothing: a child whose parent set this must still be able to find the missing place, so the
 * empty trough and the empty groove have to stay lit while they stop pulsing.
 */
const still = await browser.newPage({
  viewport: { width: 1280, height: 800 },
  deviceScaleFactor: 2,
  reducedMotion: 'reduce',
});
await still.goto(`${BASE}?show=tide&band=K-1&i=0`, { waitUntil: 'networkidle' });
await still.waitForTimeout(1200);
await still.screenshot({ path: `${OUT}/tide-reduced-motion.png` });
await still.goto(`${BASE}?show=log&band=K-1&i=0`, { waitUntil: 'networkidle' });
await still.waitForTimeout(1200);
await still.screenshot({ path: `${OUT}/log-reduced-motion.png` });
console.log('tide-reduced-motion.png, log-reduced-motion.png');

await browser.close();
if (problems.length) {
  console.log('\nconsole/page errors:');
  for (const p of problems.slice(0, 12)) console.log(`  ${p}`);
  process.exitCode = 1;
}
