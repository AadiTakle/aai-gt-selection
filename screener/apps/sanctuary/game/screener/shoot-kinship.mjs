/**
 * Screenshots of the kinship stone, from the vantage the child gets.
 *
 * WHY A FOURTH SHOOTER. The same reason there is a third: iterating on a silhouette means running the
 * shooter a dozen times, and waiting on shots you are not looking at is how you stop looking. Same browser
 * flags, same vantage, same looking-glass — a different list.
 *
 * AND ONE REASON PECULIAR TO THIS TYPE. `VER-RELPAIR-01` is SPOKEN, and a screenshot is silent, so a shot
 * of it can only ever prove half the claim. What it can prove is the half that has burnt this directory
 * before: that the ten places are the same size, on the same plane, joined the same way, that the empty
 * place is the only thing glowing, that the candidate hues do not compete with it, and that nothing pokes
 * below the sill. The other half — that the voice says the right thing and never says the relation —
 * lives in `analogyLines`, which is pure and can be printed. Both halves are needed and neither substitutes
 * for the other.
 *
 * NO `?served=1` ON ANY OF THESE, unlike the sorting gate's shooter, and that is not an omission. Nothing
 * is gated out of this type's pool; the flag on this entry narrows to the items that additionally carry
 * PICTURES, which is the empty set, so a shot taken with it would come back as bare sky. A plain shot is
 * already a shot of exactly what ships, because the component decides per item whether to draw and today
 * always decides not to.
 *
 * Run: node apps/sanctuary/game/screener/shoot-kinship.mjs
 */
import { chromium } from '/tmp/hl-pw/node_modules/playwright/index.mjs';

const OUT = '/Users/alphaintern/gt-dev-view/shots';
const BASE = 'http://127.0.0.1:5230/game/screener/preview.html';

/**
 * Chosen to span both option counts and all four bands.
 *
 * BOTH COUNTS MATTER MORE HERE THAN ANYWHERE ELSE in this directory, because this is the only presentation
 * whose width is set by the candidates rather than by its apparatus, so three options and four options are
 * genuinely different pictures — 3.90 against 5.20 of half-width, and a `fitScale` that clamps at 0.52
 * against one of 0.452. The three-option case lives only in K-1, in its first fifteen items; every other
 * band is four options throughout.
 */
const SHOTS = [
  ['kinship-k1-3opt', 'show=kinship&band=K-1&i=0'],
  ['kinship-k1-3opt-b', 'show=kinship&band=K-1&i=9'],
  ['kinship-k1-4opt', 'show=kinship&band=K-1&i=16'],
  ['kinship-23', 'show=kinship&band=2-3&i=6'],
  ['kinship-45', 'show=kinship&band=4-5&i=3'],
  ['kinship-68', 'show=kinship&band=6-8&i=11'],
  ['kinship-tight', 'show=kinship&band=2-3&i=6&tight=1'],
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
  // Long enough for shader compilation on the software rasteriser. At 1400 the FIRST shot of a run comes
  // back as bare sky, which looks exactly like a component that draws nothing.
  await page.waitForTimeout(2600);
  await page.screenshot({ path: `${OUT}/${name}.png` });
  console.log(`${name}.png  ${await page.locator('p').first().innerText()}`);
}

/**
 * Hover and pick.
 *
 * Three claims. The hover tell has to be unmissable, because on a spoken item with no pictures the lit
 * plinth is the ONLY confirmation a child gets that the pair they just heard is the pair they are pointing
 * at. The chosen pair has to VISIBLY rise into the empty place, or the pick reads as nothing having
 * happened. And NOTHING about the picture may say whether it was right — the pair rises because that is
 * what the child said about it, and this component has no idea whether that is true.
 *
 * Viewport coordinates, over a candidate. These have to be re-read off a shot every time the layout moves:
 * a stale pair of numbers lands the click on grass and the "picked" shot comes back looking exactly like
 * the unpicked one, which is a much better impression of a broken pick handler than of a stale constant.
 */
const PICKS = [['kinship-pick', 'show=kinship&band=2-3&i=6', 538, 442]];

for (const [name, query, x, y] of PICKS) {
  await page.goto(`${BASE}?${query}`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(2600);
  await page.mouse.move(x, y);
  await page.waitForTimeout(700);
  await page.screenshot({ path: `${OUT}/${name}-hover.png` });
  await page.mouse.click(x, y);
  await page.waitForTimeout(1400);
  await page.screenshot({ path: `${OUT}/${name}-picked.png` });
  console.log(`${name}-hover.png, ${name}-picked.png`);
}

/**
 * Reduced motion. The claim: the empty place resolves to its breath's MIDPOINT rather than to nothing, so a
 * child whose parent set this can still find the place that is waiting — and the horn, which pulses while
 * the stone is talking, stays plainly lit rather than going dark.
 */
const still = await browser.newPage({
  viewport: { width: 1280, height: 800 },
  deviceScaleFactor: 2,
  reducedMotion: 'reduce',
});
await still.goto(`${BASE}?show=kinship&band=2-3&i=6`, { waitUntil: 'networkidle' });
await still.waitForTimeout(2600);
await still.screenshot({ path: `${OUT}/kinship-reduced-motion.png` });
console.log('kinship-reduced-motion.png');

await browser.close();
if (problems.length) {
  console.log('\nconsole/page errors:');
  for (const p of problems.slice(0, 12)) console.log(`  ${p}`);
  process.exitCode = 1;
}
