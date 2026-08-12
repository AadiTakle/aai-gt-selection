/**
 * THE PROMISE THAT THE BATCHER CHANGES NO PIXELS, KEPT RATHER THAN ASSERTED.
 *
 * Loads the same build twice — once with `?nobatch=1`, once without — poses the camera identically in
 * both, and compares the frames pixel by pixel. A difference is a BUG IN THE BATCHER, not a matter of
 * taste: a dropped attribute, a colour written in the wrong space, a shadow flag lost in a merge. All
 * three are silent, all three look like an art change, and all three would otherwise be argued about
 * instead of measured.
 *
 * Run, with the API and vite up:
 *
 *   node apps/sanctuary/game/perf/guard.mjs
 *
 * WHY IT POSES THE CAMERA DIRECTLY. Walking there with the keys is not repeatable — the distance
 * covered depends on frame timing, so the two runs would end up metres apart and every pixel would
 * differ for reasons that have nothing to do with batching. `Probe` publishes the camera under
 * `?perf=1` precisely so this script can put it in the same place twice.
 *
 * WHY THE TOLERANCE IS NOT ZERO. Two runs of a GPU are not bit-identical: rasterisation order and
 * floating-point accumulation in the shadow blur vary slightly between contexts. The threshold below
 * is set well under what any real regression produces — a lost caster or a mis-spaced colour moves
 * thousands of pixels by a lot, not a handful by one level.
 */
const BASE = process.env.BENCH_URL ?? 'http://127.0.0.1:5230/';
/** A channel difference this small on a pixel is GPU noise, not a change. */
const CHANNEL_EPSILON = 6;
/** Fraction of pixels allowed to exceed it. */
const PIXEL_BUDGET = 0.001;

/** Camera poses chosen to cover what the batcher touched: the ranch, the stall, and a station. */
const POSES = [
  { name: 'spawn', pos: [0, 1.55, 8], look: [0, 1.4, -6] },
  { name: 'stall', pos: [-2.2, 1.55, -14], look: [-2.2, 1.3, -22] },
  { name: 'barn-door', pos: [-9, 1.55, -3], look: [-14, 1.4, -9] },
  { name: 'paddock', pos: [10, 1.55, 6], look: [2, 1.4, 12] },
  { name: 'wide', pos: [14, 3.2, 18], look: [-4, 0.8, -10] },
];

async function playwright() {
  const tried = [];
  for (const spec of [process.env.PLAYWRIGHT_MODULE, 'playwright', 'playwright-core'].filter(Boolean)) {
    try {
      return await import(spec);
    } catch {
      tried.push(spec);
    }
  }
  console.error(
    `Could not load playwright (tried: ${tried.join(', ')}).\n` +
      `  PLAYWRIGHT_MODULE=/abs/path/to/playwright/index.mjs node ${process.argv[1]}`,
  );
  process.exit(2);
}

const pose = (p) => `(() => {
  const c = window.__bhCamera;
  if (!c) return false;
  c.position.set(${p.pos[0]}, ${p.pos[1]}, ${p.pos[2]});
  c.lookAt(${p.look[0]}, ${p.look[1]}, ${p.look[2]});
  c.updateMatrixWorld(true);
  return true;
})()`;

async function shoot(browser, query) {
  /* `reducedMotion` quiets everything that honours it — the drifting clouds, the idle bobs — which is
     most of what would otherwise differ between two loads for reasons unrelated to batching. */
  const page = await browser.newPage({
    viewport: { width: 900, height: 600 },
    deviceScaleFactor: 1,
    reducedMotion: 'reduce',
  });
  await page.goto(`${BASE}?${query}`, { waitUntil: 'networkidle' });
  /* The panel has to be off in the shot. `?perf=1` is only set because the camera is published under
     it, and the panel's own numbers differ between runs — it would diff itself. */
  await page.addStyleTag({ content: '.bh-perf { display: none !important; }' });
  /* Long enough for the batcher's 30-frame observation window plus its merge. Shooting before it has
     run would compare an unbatched frame with an unbatched frame and pass for the wrong reason. */
  await page.waitForTimeout(4500);
  const shots = new Map();
  for (const p of POSES) {
    const ok = await page.evaluate(pose(p));
    if (!ok) throw new Error('no camera on window — is ?perf=1 set?');
    await page.waitForTimeout(450);
    shots.set(p.name, await page.screenshot({ type: 'png' }));
  }
  await page.close();
  return shots;
}

/** Decode a PNG without a dependency: Chrome already has one. */
async function pixels(page, png) {
  return page.evaluate(
    async (b64) => {
      const img = new Image();
      img.src = `data:image/png;base64,${b64}`;
      await img.decode();
      const c = document.createElement('canvas');
      c.width = img.width;
      c.height = img.height;
      const ctx = c.getContext('2d');
      ctx.drawImage(img, 0, 0);
      return Array.from(ctx.getImageData(0, 0, c.width, c.height).data);
    },
    png.toString('base64'),
  );
}

const { chromium } = await playwright();
const browser = await chromium.launch({ channel: 'chrome', args: ['--use-angle=metal', '--enable-gpu'] });

console.log(`\nBatcher pixel guard — ${BASE}`);
console.log('='.repeat(78));

/**
 * THREE RUNS, NOT TWO, AND THE THIRD IS THE POINT.
 *
 * The slimes wander and they do not wander identically in two page loads, so a frame containing a pen
 * differs between ANY two runs whether or not anything was batched. Comparing batched against
 * unbatched alone therefore cannot distinguish a broken merge from a slime that took a different
 * step, and the first version of this script duly failed on a pose full of slimes and blamed the
 * batcher.
 *
 * So the control is two UNBATCHED runs. Whatever they differ by is the floor that moving creatures
 * put under this measurement. The batcher is only guilty of what it adds on top of that floor.
 */
const control = await shoot(browser, 'perf=1&nobatch=1');
const off = await shoot(browser, 'perf=1&nobatch=1');
const on = await shoot(browser, 'perf=1');

const decoder = await browser.newPage();
await decoder.goto('about:blank');

const W = 900;
const H = 600;

const delta = (a, b, i) =>
  Math.max(Math.abs(a[i] - b[i]), Math.abs(a[i + 1] - b[i + 1]), Math.abs(a[i + 2] - b[i + 2]));

/**
 * WHERE THE MOVING THINGS ARE, so the comparison can ignore them.
 *
 * Built from two runs that were configured identically: anything differing between those two is a
 * creature that took a different step, not a consequence of batching. Dilated by a few pixels because
 * a slime one frame further into its walk covers slightly different ground in the third run than it
 * did in the second, and an undilated mask would leave a fringe of its silhouette uncovered — which
 * is exactly the fringe that showed up as a failure the first time this ran.
 */
function movingMask(a, b, radius = 4) {
  const raw = new Uint8Array(W * H);
  for (let p = 0; p < W * H; p += 1) if (delta(a, b, p * 4) > CHANNEL_EPSILON) raw[p] = 1;
  const out = new Uint8Array(W * H);
  for (let y = 0; y < H; y += 1) {
    for (let x = 0; x < W; x += 1) {
      if (!raw[y * W + x]) continue;
      for (let dy = -radius; dy <= radius; dy += 1) {
        const yy = y + dy;
        if (yy < 0 || yy >= H) continue;
        for (let dx = -radius; dx <= radius; dx += 1) {
          const xx = x + dx;
          if (xx < 0 || xx >= W) continue;
          out[yy * W + xx] = 1;
        }
      }
    }
  }
  return out;
}

function compare(a, b, mask) {
  let differing = 0;
  let worst = 0;
  let counted = 0;
  for (let p = 0; p < W * H; p += 1) {
    if (mask && mask[p]) continue;
    counted += 1;
    const d = delta(a, b, p * 4);
    if (d > worst) worst = d;
    if (d > CHANNEL_EPSILON) differing += 1;
  }
  return { share: counted ? differing / counted : 0, differing, worst, counted };
}

let failed = false;
console.log(`  ${'pose'.padEnd(12)} ${'masked'.padStart(11)} ${'static diff'.padStart(13)}   verdict`);
for (const p of POSES) {
  const a = await pixels(decoder, control.get(p.name));
  const b = await pixels(decoder, off.get(p.name));
  const c = await pixels(decoder, on.get(p.name));
  if (a.length !== b.length || a.length !== c.length) {
    console.log(`  ${p.name.padEnd(12)} FAIL  different frame sizes`);
    failed = true;
    continue;
  }
  const mask = movingMask(a, b);
  const masked = mask.reduce((n, v) => n + v, 0);
  const test = compare(b, c, mask);
  const ok = test.share <= PIXEL_BUDGET;
  if (!ok) failed = true;
  console.log(
    `  ${p.name.padEnd(12)} ${((masked / (W * H)) * 100).toFixed(1).padStart(10)}% ` +
      `${(test.share * 100).toFixed(4).padStart(13)}%   ${ok ? 'pass' : 'FAIL'}` +
      `  (${test.differing} of ${test.counted} static pixels, worst channel ${test.worst})`,
  );
}

await browser.close();
console.log(
  failed
    ? '\nThe batcher changed the picture. That is a bug in the merge, not a tuning question.\n'
    : '\nThe picture is unchanged.\n',
);
process.exit(failed ? 1 : 0);
