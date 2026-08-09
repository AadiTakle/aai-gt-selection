/**
 * Screenshots of the sorting gate, from the vantage the child gets.
 *
 * WHY A THIRD SHOOTER. Same reason `shoot-breadth.mjs` exists beside `shoot.mjs`: iterating on a
 * silhouette means running the shooter a dozen times, and waiting on shots you are not looking at is how
 * you stop looking. Same browser flags, same vantage, same looking-glass — a different list.
 *
 * AND ONE REASON THAT IS NEW. This is the first thing in the repo that renders BARE TOKENS. About forty of
 * the drawings in `EventGlyph.tsx` — the whole menagerie, the kitchen, the tools, the fruit — were added
 * for `VER-SORTBOT-01`, are typechecked, are exhaustively keyed off `GlyphName`, and have never been
 * photographed, because until now nothing drew a token on its own. Every one of them could be a rounded
 * brown lump and the build would be just as green. So the `TOKENS` pass below is not decoration: it is the
 * first look anybody has had at them.
 *
 * `?served=1` on every shot of a real item, because that is the pool that ships.
 *
 * Run: node apps/sanctuary/game/screener/shoot-sortbot.mjs
 */
import { chromium } from '/tmp/hl-pw/node_modules/playwright/index.mjs';

const OUT = '/Users/alphaintern/gt-dev-view/shots';
const BASE = 'http://127.0.0.1:5230/game/screener/preview.html';

/**
 * Chosen to span what the served pool actually holds: both option counts, both small bands, and the
 * categories whose drawings carry the most weight — the animals, which are most of this bank's subject.
 */
const SHOTS = [
  ['sortbot-k1-a', 'show=sortbot&band=K-1&served=1&i=0'],
  ['sortbot-k1-b', 'show=sortbot&band=K-1&served=1&i=4'],
  ['sortbot-k1-c', 'show=sortbot&band=K-1&served=1&i=9'],
  ['sortbot-23-a', 'show=sortbot&band=2-3&served=1&i=0'],
  ['sortbot-23-b', 'show=sortbot&band=2-3&served=1&i=6'],
  ['sortbot-23-c', 'show=sortbot&band=2-3&served=1&i=12'],
  ['sortbot-23-tight', 'show=sortbot&band=2-3&served=1&i=6&tight=1'],
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
  // Long enough for shader compilation on the software rasteriser. At 1400 the FIRST shot of a run came
  // back as bare sky — the canvas had its clear colour and nothing else — which looks exactly like a
  // component that draws nothing and cost a round of debugging to tell apart from one.
  await page.waitForTimeout(2600);
  await page.screenshot({ path: `${OUT}/${name}.png` });
  console.log(`${name}.png  ${await page.locator('p').first().innerText()}`);
}

/**
 * Hover and pick.
 *
 * Two claims, and the second is the load-bearing one. First: the chosen card has to VISIBLY leave the
 * shelf and arrive in the empty place, or the pick reads as nothing having happened. Second: NOTHING about
 * the picture says whether it was right — the card goes into the IN bin because that is what the child
 * said about it, and this component has no idea whether that is true.
 */
const PICKS = [
  // Viewport coordinates, over the FIRST card on the shelf. These have to be re-read off a shot every
  // time the layout moves: the previous pair pointed at where the shelf used to be, the click landed on
  // grass, and the "picked" shot came back looking exactly like the unpicked one — which is a much better
  // impression of a broken pick handler than of a stale constant.
  ['sortbot-pick', 'show=sortbot&band=2-3&served=1&i=6', 419, 448],
];

for (const [name, query, x, y] of PICKS) {
  await page.goto(`${BASE}?${query}`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(2600);
  await page.mouse.move(x, y);
  await page.waitForTimeout(700);
  await page.screenshot({ path: `${OUT}/${name}-hover.png` });
  await page.mouse.click(x, y);
  await page.waitForTimeout(1200);
  await page.screenshot({ path: `${OUT}/${name}-picked.png` });
  console.log(`${name}-hover.png, ${name}-picked.png`);
}

/**
 * THE CONTACT SHEETS — the pass this file's header is about.
 *
 * `?tight=1` and a scale that fills the frame, because the first sheet went out at forty pixels an animal
 * and a shot you cannot judge is not a look. Words are printed in the corner in reading order.
 */
for (const [name, query] of [
  ['tokens-animals', 'set=animals&cols=8&tight=1'],
  ['tokens-things', 'set=things&cols=8&tight=1&scale=0.72'],
  ['tokens-suspect', 'set=suspect&cols=6&tight=1&scale=0.95'],
]) {
  await page.goto(`${BASE}?show=tokens&${query}`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(2600);
  await page.screenshot({ path: `${OUT}/${name}.png` });
  console.log(`${name}.png`);
}

/**
 * Reduced motion. The claim: the empty place resolves to its breath's MIDPOINT rather than to nothing, so
 * a child whose parent set this can still find the slot that is waiting.
 */
const still = await browser.newPage({
  viewport: { width: 1280, height: 800 },
  deviceScaleFactor: 2,
  reducedMotion: 'reduce',
});
await still.goto(`${BASE}?show=sortbot&band=K-1&served=1&i=0`, { waitUntil: 'networkidle' });
await still.waitForTimeout(2600);
await still.screenshot({ path: `${OUT}/sortbot-reduced-motion.png` });
console.log('sortbot-reduced-motion.png');

await browser.close();
if (problems.length) {
  console.log('\nconsole/page errors:');
  for (const p of problems.slice(0, 12)) console.log(`  ${p}`);
  process.exitCode = 1;
}
