/**
 * Screenshots of the three environment jobs: the running spring, a homey window, and the barn you can
 * walk into.
 *
 * Drives the already-running sanctuary vite on 5230; nothing is started here. Playwright is imported by
 * absolute path from the npx cache for the reason `stations/shoot.mjs` gives: adding a browser to
 * `package.json` for a looking-glass would be a heavy change to a file the game imports.
 *
 * ANGLE plus the software rasteriser, because headless Chrome on a laptop has no GPU. Without both flags
 * every shot is a blank sky and the failure looks exactly like a bug in the component.
 *
 * THE SPRING IS SHOT TWICE, ONE SECOND APART, and that pair is the actual deliverable for job one. A
 * single frame of water proves nothing — a static pane and a running river are the same picture. Two
 * frames a second apart put the difference on disk.
 *
 * Run: node apps/sanctuary/game/world/shoot.mjs
 */
import { chromium } from '/Users/alphaintern/.npm/_npx/e41f203b7505f1fb/node_modules/playwright/index.mjs';

const OUT = '/Users/alphaintern/gt-dev-view/shots';
const WORLD = 'http://127.0.0.1:5230/game/world/preview.html';
const STATIONS = 'http://127.0.0.1:5230/game/stations/preview.html';

const browser = await chromium.launch({
  channel: 'chrome',
  args: ['--use-gl=angle', '--enable-unsafe-swiftshader'],
});
const page = await browser.newPage({ viewport: { width: 1600, height: 900 }, deviceScaleFactor: 1 });

const problems = [];
page.on('console', (m) => {
  if (m.type() === 'error') problems.push(m.text());
});
page.on('pageerror', (e) => problems.push(String(e)));

/** A world shot. `ready` waits out shader compilation and the first shadow pass. */
const world = async (name, query, settle = 1400) => {
  await page.goto(`${WORLD}?${query}`, { waitUntil: 'networkidle' });
  await page.waitForFunction(() => window.__ranch?.ready === true, { timeout: 20000 });
  await page.waitForTimeout(settle);
  await page.screenshot({ path: `${OUT}/env-${name}.png` });
  const s = await page.evaluate(() => window.__ranch);
  console.log(
    `env-${name}.png  fps=${s.fps.toFixed(0)} calls=${s.drawCalls} tris=${s.triangles} ` +
      `solids=${s.solids} doorway=${s.doorway ? 'ok' : 'FAIL'}`,
  );
  return s;
};

/* ---------------------------------------------------------------- *\
   1. The spring, running
\* ---------------------------------------------------------------- */

await page.goto(`${STATIONS}?shot=tide&view=near`, { waitUntil: 'networkidle' });
await page.waitForFunction(() => window.__stations?.ready === true, { timeout: 20000 });
await page.waitForTimeout(1600);
await page.screenshot({ path: `${OUT}/env-spring-a.png` });
await page.waitForTimeout(1000);
await page.screenshot({ path: `${OUT}/env-spring-b.png` });
console.log('env-spring-a.png / env-spring-b.png  (one second apart: the water must have moved)');

/* Close in on the basin, where the fall, the churn and the rings are. */
await page.evaluate(() => {
  window.__moveTo?.(13.0, 1.15, 9.2);
  window.__lookAt?.(12.0, 0.6, 5.6);
});
await page.waitForTimeout(900);
await page.screenshot({ path: `${OUT}/env-spring-close-a.png` });
await page.waitForTimeout(1000);
await page.screenshot({ path: `${OUT}/env-spring-close-b.png` });
console.log('env-spring-close-a.png / env-spring-close-b.png');

/* ---------------------------------------------------------------- *\
   2. Windows
\* ---------------------------------------------------------------- */

/* The hut's door wall, from where a child walking up the path would meet it. */
await world('window-hut', 'cam=13.9,1.5,3.0&look=13.2,1.8,-2.2');
/* One window, close enough to count the panes and see the planting under it. */
await world('window-close', 'cam=15.6,1.35,-1.1&look=14.2,1.75,-2.2');
/* And the barn's, which are a different shape on a different wall. */
await world('window-barn', 'cam=-8.6,1.5,7.4&look=-13.0,2.0,4.4');

/* ---------------------------------------------------------------- *\
   3. The barn: doors shut, doors open, and inside
\* ---------------------------------------------------------------- */

/**
 * Far enough away that the doors are shut, and "far enough" is a measured distance rather than a guess: the
 * doorway's outside face is at world (-7.52, 0.95) and the closing radius is 9.5m, so this stands about 12m
 * off it. The first attempt at this shot was 6.4m away, which is inside the OPENING radius — so the frame
 * captioned "doors shut" had them wide open, and `door` in the printout is what caught it.
 */
const shut = await world('barn-shut', 'cam=3.6,1.5,6.2&look=-9.5,2.6,2.2');
console.log(`  leaf angle when far: ${JSON.stringify(shut.door)}`);

/* Close enough that they have swung. */
const open = await world('barn-open', 'cam=-6.2,1.5,2.2&look=-11.5,2.2,1.6', 2200);
console.log(`  leaf angle when near: ${JSON.stringify(open.door)}`);

/* From just inside the doorway, looking down the barn. */
await world('barn-inside', 'cam=-9.4,1.5,1.6&look=-18.0,1.9,0.9', 2200);
/* Turned around, so the light coming back through the doorway is in shot. */
await world('barn-doorway', 'cam=-15.5,1.5,0.9&look=-8.0,1.9,1.8', 2200);
/* The hayloft and the stalls, from the middle of the floor. */
await world('barn-loft', 'cam=-13.0,1.5,1.2&look=-14.6,3.6,-3.4', 2200);

/* ---------------------------------------------------------------- *\
   The whole ranch, so nothing has been broken in the wide shot
\* ---------------------------------------------------------------- */

const arrival = await world('arrival', 'cam=0,1.5,8&look=0,2.2,-13');
console.log(`\nBUDGET at the arrival shot: ${arrival.drawCalls} draw calls, ${arrival.triangles} triangles`);
console.log(`walk-in: ${JSON.stringify(arrival.walkIn)}`);
console.log(`doors:   ${JSON.stringify(arrival.doorSweep)}`);

/* ---------------------------------------------------------------- *\
   prefers-reduced-motion: doors snap, water still flows, nothing oscillates
\* ---------------------------------------------------------------- */

const still = await browser.newPage({
  viewport: { width: 1600, height: 900 },
  deviceScaleFactor: 1,
  reducedMotion: 'reduce',
});
for (const [name, query] of [
  ['reduced-barn-open', 'cam=-6.2,1.5,2.2&look=-11.5,2.2,1.6'],
  ['reduced-window', 'cam=15.6,1.35,-1.1&look=14.2,1.75,-2.2'],
]) {
  await still.goto(`${WORLD}?${query}`, { waitUntil: 'networkidle' });
  await still.waitForFunction(() => window.__ranch?.ready === true, { timeout: 20000 });
  await still.waitForTimeout(1800);
  await still.screenshot({ path: `${OUT}/env-${name}.png` });
  console.log(`env-${name}.png (reduced motion)`);
}
await still.goto(`${STATIONS}?shot=tide&view=near`, { waitUntil: 'networkidle' });
await still.waitForFunction(() => window.__stations?.ready === true, { timeout: 20000 });
await still.waitForTimeout(1600);
await still.screenshot({ path: `${OUT}/env-reduced-spring-a.png` });
await still.waitForTimeout(1000);
await still.screenshot({ path: `${OUT}/env-reduced-spring-b.png` });
console.log('env-reduced-spring-a.png / -b.png (reduced motion: still flowing, gently)');

if (problems.length) {
  console.log(`\n${problems.length} console problem(s):`);
  for (const p of problems.slice(0, 12)) console.log(`  ${p}`);
} else {
  console.log('\nno console errors');
}

await browser.close();
