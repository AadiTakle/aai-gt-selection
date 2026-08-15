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

/**
 * WHAT THE PIXEL DIFF CANNOT SEE, AND WHY THIS LIST EXISTS.
 *
 * The white frame that shipped was a GL state error: an RG16F shadow target bound to a
 * `sampler2DShadow`, which ANGLE rejects with `Mismatch between texture format and sampler type`,
 * dropping every lit draw. The console said so, hundreds of times a second. This script was watching
 * pixels from five fixed poses and never looked, so it passed the whole time.
 *
 * A renderer that is shouting is a failure whatever the pixels say.
 */
const FATAL_CONSOLE = [
  'GL_INVALID_OPERATION',
  'GL_INVALID_ENUM',
  'GL_INVALID_VALUE',
  'Mismatch between texture format and sampler type',
  'program not valid',
  'Context Lost',
  /* Specifically this one, not deprecations in general: it is what r3f's `configure()` prints when it
     writes PCFSoftShadowMap over the Canvas's shadow type, which is the trigger for the mismatch
     above. `THREE.Clock has been deprecated` comes from drei on every load and is not ours. */
  'PCFSoftShadowMap has been deprecated',
];

const complaints = [];

function watchConsole(page, label) {
  const note = (text) => {
    if (!FATAL_CONSOLE.some((needle) => text.includes(needle))) return;
    /* One line per distinct complaint: a GL error repeats every frame and would bury everything. */
    const key = `${label}: ${text.slice(0, 140)}`;
    if (!complaints.includes(key)) complaints.push(key);
  };
  page.on('console', (m) => note(m.text()));
  page.on('pageerror', (e) => complaints.push(`${label}: pageerror ${String(e).slice(0, 140)}`));
}

async function shoot(browser, query) {
  /* `reducedMotion` quiets everything that honours it — the drifting clouds, the idle bobs — which is
     most of what would otherwise differ between two loads for reasons unrelated to batching. */
  const page = await browser.newPage({
    viewport: { width: 900, height: 600 },
    deviceScaleFactor: 1,
    reducedMotion: 'reduce',
  });
  watchConsole(page, query.includes('nobatch') ? 'unbatched' : 'batched');
  await page.goto(`${BASE}?${query}`, { waitUntil: 'networkidle' });
  /* The panel has to be off in the shot. `?perf=1` is only set because the camera is published under
     it, and the panel's own numbers differ between runs — it would diff itself. */
  await page.addStyleTag({ content: '.bh-perf { display: none !important; }' });
  /* Long enough for the batcher's 30-frame observation window plus its merge. Shooting before it has
     run would compare an unbatched frame with an unbatched frame and pass for the wrong reason. */
  await page.waitForTimeout(4500);
  await page.evaluate(RECORD);
  await page.waitForTimeout(1200);
  await page.evaluate(FREEZE);
  await page.waitForTimeout(200);
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

/**
 * HIDE EVERYTHING THAT MOVES, identically in every run, before shooting anything.
 *
 * The statistical version of this — mask the pixels two identical runs disagree about — was not good
 * enough and failed intermittently on the pose that looks into a pen. With three runs there are three
 * different sets of slime positions, and a mask built from two of them cannot cover the third; the
 * uncovered fringe then reads as a batcher regression, at random, on some runs and not others. A
 * measurement that flickers is worse than no measurement, because it teaches you to ignore it.
 *
 * So motion is removed rather than masked, by the same observation `still.ts` uses: record every
 * mesh's world matrix, wait, and hide whatever changed. Applied identically in all three runs, what
 * is left is the static world — which is the only thing the batcher touches, and therefore the only
 * thing worth comparing. Merged sources are unaffected: they are static by construction, so this
 * never writes to one and cannot invalidate a batch.
 */
const RECORD = `(() => {
  window.__frozen = new Map();
  window.__bhScene.traverse((o) => {
    if (o.isMesh && o.visible) window.__frozen.set(o, o.matrixWorld.elements.join(','));
  });
  return window.__frozen.size;
})()`;

const FREEZE = `(() => {
  let hidden = 0;
  for (const [mesh, before] of window.__frozen) {
    if (mesh.matrixWorld.elements.join(',') !== before) { mesh.visible = false; hidden += 1; }
  }
  return hidden;
})()`;

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

const off = await shoot(browser, 'perf=1&nobatch=1');
const on = await shoot(browser, 'perf=1');

const decoder = await browser.newPage();
await decoder.goto('about:blank');

const W = 900;
const H = 600;

const delta = (a, b, i) =>
  Math.max(Math.abs(a[i] - b[i]), Math.abs(a[i + 1] - b[i + 1]), Math.abs(a[i + 2] - b[i + 2]));

function compare(a, b) {
  let differing = 0;
  let worst = 0;
  for (let p = 0; p < W * H; p += 1) {
    const d = delta(a, b, p * 4);
    if (d > worst) worst = d;
    if (d > CHANNEL_EPSILON) differing += 1;
  }
  return { share: differing / (W * H), differing, worst };
}

let failed = false;
console.log(`  ${'pose'.padEnd(12)} ${'differing'.padStart(13)}   verdict`);
for (const p of POSES) {
  const b = await pixels(decoder, off.get(p.name));
  const c = await pixels(decoder, on.get(p.name));
  if (b.length !== c.length) {
    console.log(`  ${p.name.padEnd(12)} FAIL  different frame sizes`);
    failed = true;
    continue;
  }
  const test = compare(b, c);
  const ok = test.share <= PIXEL_BUDGET;
  if (!ok) failed = true;
  console.log(
    `  ${p.name.padEnd(12)} ${(test.share * 100).toFixed(4).padStart(12)}%   ${ok ? 'pass' : 'FAIL'}` +
      `  (${test.differing} of ${W * H} pixels, worst channel ${test.worst})`,
  );
}

await browser.close();

if (complaints.length > 0) {
  failed = true;
  console.log('\nThe renderer complained. A frame that looks right with GL errors under it is not right:');
  for (const c of complaints) console.log(`  ${c}`);
}

console.log(
  failed
    ? '\nFAIL — see above. A pixel difference is a bug in the merge; a GL error is a bug in the state.\n'
    : '\nThe picture is unchanged and the renderer is quiet.\n',
);
process.exit(failed ? 1 : 0);
