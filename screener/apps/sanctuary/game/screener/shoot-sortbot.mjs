/**
 * Screenshots of the sorting gate, from the vantage the child gets.
 *
 * WHAT A SHOT OF THIS TYPE HAS TO PROVE, now that the words are written on the plates: THAT YOU CAN READ
 * THEM, and that a picture appears only where a picture is honest. The old checks still apply and are still
 * visible — one plate size everywhere, the socket the only thing glowing, nothing poking below the sill —
 * but the question a shot has to answer is whether an adult can say what is being asked.
 *
 * `?fit=1` IS THE SHOT THAT ANSWERS IT. It mounts the panel at the station's own `fitScale` and puts the
 * camera at the child's `dock` of 4.6m. A plain shot is about 1.8 times larger in apparent size than the
 * game and will make anything look legible.
 *
 * `?served=1` IS NOT OPTIONAL FOR A SHOT THAT CLAIMS TO BE WHAT SHIPS. 18 of the 100 items are refused on
 * vocabulary — all at 6-8, all Zipf tier 1 — and one of them in a contact sheet is a shot of something no
 * child will see. `?drawn=1` narrows further, to the 27 items that carry pictures beside their words, which
 * is the pool where a shot has two things to judge rather than one.
 *
 * BOTH OPTION COUNTS MATTER: four options are two columns of two, three are one row of three, and the
 * three-option case is the one that sets the panel's width. It lives in K-1 and in three items of 2-3.
 *
 * Run: node apps/sanctuary/game/screener/shoot-sortbot.mjs
 */
import { chromium } from '/tmp/hl-pw/node_modules/playwright/index.mjs';

const OUT = '/Users/alphaintern/gt-dev-view/shots';
const BASE = 'http://127.0.0.1:5230/game/screener/preview.html';

const SHOTS = [
  // Pictures and words together: the 27-item pool where `sortingGateDraws` is true.
  ['sortbot-k1-drawn', 'show=sortbot&band=K-1&i=0&served=1&drawn=1'],
  ['sortbot-k1-drawn-b', 'show=sortbot&band=K-1&i=8&served=1&drawn=1'],
  ['sortbot-23-drawn', 'show=sortbot&band=2-3&i=4&served=1&drawn=1'],
  // Words alone, which is the whole of what re-opened these two bands.
  ['sortbot-23-words', 'show=sortbot&band=2-3&i=1&served=1'],
  ['sortbot-45-words', 'show=sortbot&band=4-5&i=5&served=1'],
  ['sortbot-68-words', 'show=sortbot&band=6-8&i=2&served=1'],
  // The items that CANNOT be asked in pictures and can be asked in words: rhyme, spelling, tense.
  ['sortbot-68-rhyme', 'show=sortbot&band=6-8&i=7&served=1'],
  ['sortbot-68-letters', 'show=sortbot&band=6-8&i=9&served=1'],
  // The child's own scale and distance.
  ['sortbot-fit-k1', 'show=sortbot&band=K-1&i=0&served=1&fit=1'],
  ['sortbot-fit-23', 'show=sortbot&band=2-3&i=1&served=1&fit=1'],
  ['sortbot-fit-45', 'show=sortbot&band=4-5&i=5&served=1&fit=1'],
  ['sortbot-fit-68', 'show=sortbot&band=6-8&i=2&served=1&fit=1'],
  ['sortbot-tight', 'show=sortbot&band=K-1&i=0&served=1&drawn=1&tight=1'],
];

/**
 * WHERE A SHELF PLATE IS ON SCREEN, at the default framing and 1280x800.
 *
 * DERIVED RATHER THAN READ OFF A SHOT: project the plate's panel-space position through the preview's own
 * camera — (0, 3.0, -4.6) looking at (0, 3.6, -13), pitch -0.06, fov 62 — using the component's own layout.
 * `panelH` is `0.95 + 3 * 0.9 + 0.22 + rows * 0.9`, the shelf's first row sits `panelH / 2 - 0.95 - 2.7 -
 * 0.22 - 0.45` above the panel's centre, and rows are 0.9 apart. Four options are two columns at a 3.44
 * pitch, three are three columns at 2.94.
 *
 * AND THE CLICK IS VERIFIED ANYWAY — `Preview.tsx` logs `picked <handed>`, so a miss is reported as a miss
 * rather than coming back as a "picked" shot that looks exactly like an unpicked one.
 */
function plateScreen(index, options) {
  const cols = options <= 3 ? options : 2;
  const pitchX = options <= 3 ? 2.94 : 3.44;
  const rows = Math.ceil(options / cols);
  const panelH = 0.95 + 3 * 0.9 + 0.22 + rows * 0.9;
  const row = Math.floor(index / cols);
  const col = index % cols;
  const py = panelH / 2 - 0.95 - 2.7 - 0.22 - (row + 0.5) * 0.9;
  const px = (col - (cols - 1) / 2) * pitchX;
  const dy = 0.6 + py;
  const dz = 8.385 - dy * 0.05996;
  const ndcY = (dy * 0.9982 + 0.5037) / dz / 0.6009;
  const ndcX = px / dz / (0.6009 * 1.6);
  return [Math.round(640 * (1 + ndcX)), Math.round(400 * (1 - ndcY))];
}

const browser = await chromium.launch({
  channel: 'chrome',
  args: ['--use-gl=angle', '--enable-unsafe-swiftshader'],
});
const page = await browser.newPage({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 2 });

const problems = [];
const picks = [];
page.on('console', (m) => {
  if (m.type() === 'error') problems.push(m.text());
  if (m.text().startsWith('picked ')) picks.push(m.text());
});
page.on('pageerror', (e) => problems.push(String(e)));

for (const [name, query] of SHOTS) {
  await page.goto(`${BASE}?${query}`, { waitUntil: 'networkidle' });
  // Long enough for shader compilation on the software rasteriser; below ~2s the first shot is bare sky.
  await page.waitForTimeout(2600);
  await page.screenshot({ path: `${OUT}/${name}.png` });
  console.log(`${name}.png  ${await page.locator('p').first().innerText()}`);
}

/**
 * Hover and pick, on the FOURTH plate of a four-option item — bottom row, right column.
 *
 * The last plate rather than the first because it is the one that exercises both halves of the shelf
 * arithmetic at once: a component that ignored the row would put it in the top row, and one that ignored the
 * column would put it on the left. Three claims: the hover ledge is unmissable, the plate visibly leaves the
 * shelf and rides through the head into the socket, and NOTHING about the picture says whether it was right —
 * the plate goes into the IN crate whichever one was chosen.
 */
const PICK = 'show=sortbot&band=2-3&i=4&served=1&drawn=1';
await page.goto(`${BASE}?${PICK}`, { waitUntil: 'networkidle' });
await page.waitForTimeout(2600);
const [px, py] = plateScreen(3, 4);
await page.mouse.move(px, py);
await page.waitForTimeout(500);
await page.screenshot({ path: `${OUT}/sortbot-pick-hover.png` });
await page.mouse.click(px, py);
await page.waitForTimeout(400);
await page.screenshot({ path: `${OUT}/sortbot-pick-riding.png` });
await page.waitForTimeout(1200);
await page.screenshot({ path: `${OUT}/sortbot-pick-picked.png` });
console.log(`sortbot-pick-{hover,riding,picked}.png  (clicked plate 4 of 4 at ${px},${py})`);
console.log(picks.length ? `  onPick fired: ${picks.join(', ')}` : '  NOTHING WAS PICKED — the click missed');

/** Reduced motion: the socket must still plainly glow and the posted plate must still be seated. */
await page.emulateMedia({ reducedMotion: 'reduce' });
await page.goto(`${BASE}?${PICK}`, { waitUntil: 'networkidle' });
await page.waitForTimeout(2600);
await page.screenshot({ path: `${OUT}/sortbot-reduced-motion.png` });
console.log('sortbot-reduced-motion.png');

if (problems.length) console.log(`\nconsole/page errors:\n  ${problems.join('\n  ')}`);
await browser.close();
