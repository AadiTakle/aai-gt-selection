/**
 * Screenshots of the kinship stone, from the vantage the child gets.
 *
 * WHAT A SHOT OF THIS TYPE HAS TO PROVE, now that it has words on it: THAT YOU CAN READ THEM. Everything
 * else this shooter used to check — ten places the same size, on the same plane, the empty place the only
 * thing glowing, nothing poking below the sill — still matters and is still visible here, but it is no
 * longer the point. The point is that an adult looking at the shot can say what the item is asking, because
 * when this type was answered by LISTENING nobody could, including the owner.
 *
 * `?fit=1` IS THE SHOT THAT ANSWERS THAT and the others are for iterating. It mounts the panel at the
 * station's own `fitScale` and puts the camera at the child's own `dock` of 4.6m, so the letters are the
 * size the child gets. A plain shot is 1.8 times closer in apparent size than the game and will make
 * anything look legible.
 *
 * BOTH OPTION COUNTS MATTER because the stone's HEIGHT follows the candidate count — five lines at three
 * options, six at four — and `sites.ts` gives the type a different `fitScale` for each (0.517 and 0.452).
 * Three options live only in K-1's first fifteen items; every other band is four throughout.
 *
 * Run: node apps/sanctuary/game/screener/shoot-kinship.mjs
 */
import { chromium } from '/tmp/hl-pw/node_modules/playwright/index.mjs';

const OUT = '/Users/alphaintern/gt-dev-view/shots';
const BASE = 'http://127.0.0.1:5230/game/screener/preview.html';

const SHOTS = [
  ['kinship-k1-3opt', 'show=kinship&band=K-1&i=0'],
  ['kinship-k1-3opt-b', 'show=kinship&band=K-1&i=9'],
  ['kinship-k1-4opt', 'show=kinship&band=K-1&i=16'],
  ['kinship-23', 'show=kinship&band=2-3&i=6'],
  ['kinship-45', 'show=kinship&band=4-5&i=3'],
  ['kinship-68', 'show=kinship&band=6-8&i=11'],
  ['kinship-68-long', 'show=kinship&band=6-8&i=30'],
  // The four that answer the actual question: the child's own scale and distance.
  ['kinship-fit-k1', 'show=kinship&band=K-1&i=0&fit=1'],
  ['kinship-fit-23', 'show=kinship&band=2-3&i=6&fit=1'],
  ['kinship-fit-45', 'show=kinship&band=4-5&i=3&fit=1'],
  ['kinship-fit-68', 'show=kinship&band=6-8&i=11&fit=1'],
  ['kinship-tight', 'show=kinship&band=2-3&i=6&tight=1'],
];

/**
 * WHERE A CANDIDATE LINE IS ON SCREEN, at the default framing and 1280x800.
 *
 * DERIVED RATHER THAN READ OFF A SHOT, which is the difference between a number that stays true and one
 * that silently stops being: project the panel-space height of line `i` through the preview's own camera —
 * (0, 3.0, -4.6) looking at (0, 3.6, -13), pitch -0.06, fov 62 — and the stone's `lineY`, which is
 * `((lines - 1) / 2 - i) * 0.98` with `lines` = 2 + the option count.
 *
 *   dy = 0.6 + lineY,  dz = -8.4
 *   y  = 400 * (1 - (dy * 0.9982 + 0.5037) / (8.385 - dy * 0.05996) / 0.6009)
 *
 * AND THE CLICK IS VERIFIED ANYWAY. `Preview.tsx` logs `picked <handed>` on every pick, so a miss is
 * reported as a miss instead of coming back as a "picked" shot that looks exactly like an unpicked one —
 * which is a far better impression of a broken pick handler than of a stale constant.
 */
function lineScreenY(i, options) {
  const lines = 2 + options;
  const dy = 0.6 + ((lines - 1) / 2 - i) * 0.98;
  const ndc = (dy * 0.9982 + 0.5037) / (8.385 - dy * 0.05996) / 0.6009;
  return Math.round(400 * (1 - ndc));
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
  // Long enough for shader compilation on the software rasteriser. At 1400 the FIRST shot of a run comes
  // back as bare sky, which looks exactly like a component that draws nothing.
  await page.waitForTimeout(2600);
  await page.screenshot({ path: `${OUT}/${name}.png` });
  console.log(`${name}.png  ${await page.locator('p').first().innerText()}`);
}

/**
 * Hover and pick, on the SECOND candidate line of a four-option item.
 *
 * Second rather than first because a first-line hit proves less: the hover tell and the rise into the empty
 * place both work for a component that ignores which line was pointed at, and the second line is the one
 * where getting the row arithmetic wrong shows up. Three claims: the hover ledge is unmissable, the chosen
 * pair VISIBLY leaves its line and rises into the empty place, and NOTHING about the picture says whether it
 * was right — the pair rises whichever one was chosen.
 */
const PICK = 'show=kinship&band=2-3&i=6';
await page.goto(`${BASE}?${PICK}`, { waitUntil: 'networkidle' });
await page.waitForTimeout(2600);
const y = lineScreenY(3, 4);
await page.mouse.move(640, y);
await page.waitForTimeout(500);
await page.screenshot({ path: `${OUT}/kinship-pick-hover.png` });
await page.mouse.click(640, y);
await page.waitForTimeout(1200);
await page.screenshot({ path: `${OUT}/kinship-pick-picked.png` });
console.log(`kinship-pick-hover.png, kinship-pick-picked.png  (clicked line 2 of 4 at y=${y})`);
console.log(picks.length ? `  onPick fired: ${picks.join(', ')}` : '  NOTHING WAS PICKED — the click missed');

/** Reduced motion: the sockets must still plainly glow, and the chosen pair must still be seated. */
await page.emulateMedia({ reducedMotion: 'reduce' });
await page.goto(`${BASE}?${PICK}`, { waitUntil: 'networkidle' });
await page.waitForTimeout(2600);
await page.screenshot({ path: `${OUT}/kinship-reduced-motion.png` });
console.log('kinship-reduced-motion.png');

if (problems.length) console.log(`\nconsole/page errors:\n  ${problems.join('\n  ')}`);
await browser.close();
