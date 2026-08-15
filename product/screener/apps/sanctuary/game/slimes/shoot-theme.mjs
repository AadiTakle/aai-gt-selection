/**
 * TEMPORARY. Drives `preview.html` in real Chrome for the OBJECT RE-THEME review, because the only way
 * to know whether a creature reads as a waffle is to look at it.
 *
 *   node apps/sanctuary/game/slimes/shoot-theme.mjs [tag]
 *
 * Shoots, in order: the six close up, the six at silhouette distance (the view that decides whether the
 * re-theme worked), two families through all four stages, and forty wandering with the frame cost read
 * off the HUD. Playwright is not a dependency of this repo; it is imported by absolute path from the
 * npx cache.
 */
import { chromium } from '/Users/alphaintern/.npm/_npx/e41f203b7505f1fb/node_modules/playwright/index.mjs';

const tag = process.argv[2] ?? '';
const OUT = '/Users/alphaintern/gt-dev-view/shots';
const BASE = 'http://127.0.0.1:5230/game/slimes/preview.html';

const browser = await chromium.launch({
  channel: 'chrome',
  args: ['--use-gl=angle', '--enable-unsafe-swiftshader'],
});
const page = await browser.newPage({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 2 });

const problems = [];
page.on('console', (m) => {
  if (m.type() === 'error') problems.push(m.text());
});
page.on('pageerror', (e) => problems.push(`pageerror: ${e.message}`));

const shot = async (name) => {
  await page.screenshot({ path: `${OUT}/theme-${name}${tag}.png` });
  console.log(`  → theme-${name}${tag}.png`);
};

const open = async (query) => {
  await page.goto(`${BASE}?${query}`, { waitUntil: 'load' });
  await page.waitForSelector('canvas');
  await page.waitForTimeout(2600);
};

const fps = async () => (await page.textContent('#fps'))?.trim() ?? '(none)';

for (const [name, query] of [
  ['lineup', 'mode=lineup'],
  ['far', 'mode=far'],
  ['grow-waffle-fairy', 'mode=grow&fams=waffle,fairy'],
  ['grow-rose-frost', 'mode=grow&fams=rose,frost'],
  ['grow-grass-rock', 'mode=grow&fams=grass,rock'],
  ['stages', 'mode=stages'],
]) {
  console.log(name);
  await open(query);
  await shot(name);
}

// A low, child's-eye camera on the pen, which is the view that actually ships.
console.log('eye level');
await open('mode=pen&eye=low');
await shot('eye-a');
await page.waitForTimeout(6000);
await shot('eye-b');

// Forty, with `burn` saturating the pipe so the reported render cost is a measurement of the scene
// rather than of the display's vsync interval.
console.log('stress 40');
await open('mode=stress&burn=7');
await page.waitForTimeout(4500);
console.log(`  perf: ${await fps()}`);
await shot('stress');
await page.waitForTimeout(4000);
console.log(`  perf: ${await fps()}`);

if (problems.length) {
  console.log('\nCONSOLE PROBLEMS:');
  for (const p of problems.slice(0, 12)) console.log('  ' + p);
} else {
  console.log('\nno console errors');
}

await browser.close();
