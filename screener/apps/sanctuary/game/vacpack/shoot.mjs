/**
 * TEMPORARY. Drives `preview.html` in real Chrome and writes screenshots, because the only way to know whether
 * suction reads as suction is to look at it.
 *
 *     node apps/sanctuary/game/vacpack/shoot.mjs [tag]
 *
 * It drives the SHIPPED input path — `page.mouse.down()`, `page.keyboard.press('q')` — rather than poking at
 * internals, so a shot of a slime in flight is a shot of the real mechanic responding to a real button.
 *
 * Playwright is not a dependency of this repo; it is imported by absolute path out of the npx cache.
 */
import { chromium } from '/Users/alphaintern/.npm/_npx/e41f203b7505f1fb/node_modules/playwright/index.mjs';

const tag = process.argv[2] ?? '';
const OUT = '/Users/alphaintern/gt-dev-view/shots';
const BASE = 'http://127.0.0.1:5230/game/vacpack/preview.html';

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
  await page.screenshot({ path: `${OUT}/vac-${name}${tag}.png` });
  console.log(`  → vac-${name}${tag}.png`);
};

const open = async (queryString = '') => {
  await page.goto(`${BASE}${queryString}`, { waitUntil: 'load' });
  await page.waitForSelector('canvas');
  // WAIT FOR THE SCENE, NOT FOR A CLOCK. `load` fires when the entry module has been fetched, and on a cold Vite
  // cache the several hundred modules behind it — three.js, the buildings, the slimes — are still arriving. A
  // fixed delay here photographed an empty canvas on the first visit of every run and nothing on any later one,
  // which is the most misleading kind of green.
  await page.waitForFunction(() => window.__vac !== undefined, null, { timeout: 45000 });
  await page.waitForFunction(() => document.getElementById('fps')?.textContent !== '—', null, { timeout: 45000 });
  await page.waitForTimeout(1600);
  // Park the cursor in the middle so mouse buttons land on the canvas and looking around is relative to it.
  await page.mouse.move(640, 400);
};

const state = async () => await page.evaluate(() => window.__vac ?? null);
const perf = async () => (await page.textContent('#fps'))?.trim() ?? '(none)';

/* Look a little left and down so the arc of slimes is across the middle of the view rather than off to one
   side, and so the ground under them is visible for the target ring. Movement is relative, as a real mouse is. */
const look = async (dx, dy) => {
  await page.mouse.move(640 + dx, 400 + dy);
  await page.waitForTimeout(120);
  await page.mouse.move(640, 400);
  await page.waitForTimeout(120);
};

console.log('idle');
await open();
await shot('idle');
console.log(`  perf: ${await perf()}`);

console.log('aim at the herd');
await look(0, 40);
await shot('aim');

console.log('mid-suck: hold, and catch the moment a slime is in the air');
await page.mouse.down({ button: 'left' });
// Wind-up is 0.26s and the draw itself 0.3-0.85s, so a slime is airborne somewhere around 400-700ms in.
await page.waitForTimeout(430);
await shot('suck');
await page.waitForTimeout(180);
await shot('suck-late');
// Keep holding: a second slime follows about a third of a second behind the first.
await page.waitForTimeout(700);
await shot('suck-second');
await page.mouse.up({ button: 'left' });
await page.waitForTimeout(700);
console.log(`  ${JSON.stringify(await state())}`);
await shot('tank2');

console.log('plop with the keyboard fallback: Q');
await page.keyboard.press('KeyQ');
await page.waitForTimeout(220);
await shot('arc');
await page.waitForTimeout(190);
await shot('arc-late');
await page.waitForTimeout(300);
await shot('land');
await page.waitForTimeout(900);
console.log(`  ${JSON.stringify(await state())}`);

console.log('plop with the right button');
await page.mouse.down({ button: 'right' });
await page.mouse.up({ button: 'right' });
await page.waitForTimeout(260);
await shot('arc-rmb');
await page.waitForTimeout(1400);
console.log(`  ${JSON.stringify(await state())}`);

console.log('a full tank, shot straight');
await open('?fill=4');
await shot('full');

console.log('stowed, which is how it looks while a station is engaged');
await open('?stow=1');
await shot('stowed');

console.log('reduced motion');
await open('?slow=1');
await look(0, 40);
await page.mouse.down({ button: 'left' });
await page.waitForTimeout(300);
await shot('slow-suck');
await page.mouse.up({ button: 'left' });
await page.waitForTimeout(900);
await page.keyboard.press('KeyQ');
await page.waitForTimeout(140);
await shot('slow-arc');
await page.waitForTimeout(1200);
console.log(`  ${JSON.stringify(await state())}`);

/* --- frame cost -------------------------------------------------------------
   The same scene twice, once with the pack and once without, four seconds of settled frames each. The gap
   between the two ms/frame figures is what the mechanic costs. */
console.log('\nframe cost');
await open('?vac=0');
await page.waitForTimeout(4200);
console.log(`  no pack : ${await perf()}`);
await open();
await page.waitForTimeout(4200);
console.log(`  pack    : ${await perf()}`);
await page.mouse.move(640, 440);
await page.mouse.down({ button: 'left' });
await page.waitForTimeout(4200);
console.log(`  sucking : ${await perf()}`);
await page.mouse.up({ button: 'left' });

/* --- the landing guarantee, hammered ----------------------------------------
   Walk into the barn yard and plop repeatedly while turning, which is the case that matters: aiming at a wall
   from touching distance. Every landing is checked by the harness against the real SOLIDS chain. */
console.log('\nlanding legality, aimed at buildings from close up');
await open();
await page.keyboard.down('KeyW');
await page.waitForTimeout(2500);
await page.keyboard.up('KeyW');
for (let i = 0; i < 14; i += 1) {
  await page.mouse.move(640 + 90, 400);
  await page.mouse.down({ button: 'left' });
  await page.waitForTimeout(760);
  await page.mouse.up({ button: 'left' });
  await page.keyboard.press('KeyQ');
  await page.waitForTimeout(1150);
  await page.mouse.move(640, 400);
}
const final = await state();
console.log(`  ${JSON.stringify(final)}`);
await shot('legality');

if (problems.length) {
  console.log('\nCONSOLE PROBLEMS:');
  for (const p of problems.slice(0, 12)) console.log('  ' + p);
} else {
  console.log('\nno console errors');
}

await browser.close();
