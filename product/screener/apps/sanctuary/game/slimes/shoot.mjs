/**
 * TEMPORARY. Drives `preview.html` in real Chrome and writes screenshots, because the only way to know
 * whether a creature is charming is to look at it. Pairs of frames seconds apart prove they move.
 *
 *   node apps/sanctuary/game/slimes/shoot.mjs [tag]
 *
 * Playwright is not a dependency of this repo; it is imported by absolute path from the npx cache.
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
  await page.screenshot({ path: `${OUT}/gum-${name}${tag}.png` });
  console.log(`  → gum-${name}${tag}.png`);
};

const open = async (mode) => {
  await page.goto(`${BASE}?mode=${mode}`, { waitUntil: 'load' });
  await page.waitForSelector('canvas');
  await page.waitForTimeout(2500);
};

const fps = async () => (await page.textContent('#fps'))?.trim() ?? '(none)';

for (const mode of ['lineup', 'stages']) {
  console.log(mode);
  await open(mode);
  await shot(mode);
}

console.log('pen (two frames 5s apart)');
await open('pen');
await shot('pen-a');
await page.waitForTimeout(5000);
await shot('pen-b');
await page.waitForTimeout(6000);
await shot('pen-c');

console.log('stress 40');
await open('stress');
await page.waitForTimeout(4000);
console.log(`  perf: ${await fps()}`);
await shot('stress-a');
await page.waitForTimeout(5000);
console.log(`  perf: ${await fps()}`);
await shot('stress-b');

// A low, child's-eye camera on the pen, which is the view that actually ships. Two frames again, both
// because it proves movement at the scale a player sees and because this is the angle at which a badly
// placed eye or a hard crest edge is most obvious.
await page.goto(`${BASE}?mode=pen&eye=low`, { waitUntil: 'load' });
await page.waitForSelector('canvas');
await page.waitForTimeout(3000);
await shot('eye-a');
await page.waitForTimeout(7000);
await shot('eye-b');

if (problems.length) {
  console.log('\nCONSOLE PROBLEMS:');
  for (const p of problems.slice(0, 12)) console.log('  ' + p);
} else {
  console.log('\nno console errors');
}

await browser.close();
