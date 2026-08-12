/**
 * The bench. Reproduces every number in `docs/design/bramblebrook-frame-budget.md`.
 *
 * Drives the running sanctuary vite on 5230 — nothing is started here, so bring up the API and the
 * app first (see the design doc §5). Run:
 *
 *   node apps/sanctuary/game/perf/bench.mjs
 *
 * ══ THE FLAGS ARE THE MEASUREMENT ═════════════════════════════════════════════════════════════════
 *
 * The first numbers taken for this work were wrong, and the failure is worth writing down because it
 * is invisible and it looks exactly like a catastrophic result. A headed Chrome window that loses
 * focus, or is merely occluded by another window, is throttled by the browser to 30fps. That reports
 * a beautifully consistent 33.3ms median, which reads as "the game can barely hold 30fps" and is in
 * fact a measurement of Chrome's throttle with the game idling underneath it at 4ms.
 *
 * So `--disable-gpu-vsync --disable-frame-rate-limit` uncap the loop — frame time then measures WORK
 * rather than refresh rate — and the three `--disable-*-backgrounding` flags stop the throttle from
 * engaging at all. Without them this script measures the window manager.
 *
 * ══ RUN IT ON A QUIET MACHINE ═════════════════════════════════════════════════════════════════════
 *
 * The timings are wall-clock and they measure the whole machine, not just this tab. A laptop that is
 * also running a browser full of tabs and a dev server reports frame times two to three times the
 * quiet-machine figure, and the tell is unmistakable when you look for it: the 4x throttle reading
 * comes out level with or better than the 6x one, which cannot happen and means the noise is larger
 * than the effect being measured. If you see that, close things and run it again.
 *
 * DRAW CALLS DO NOT HAVE THIS PROBLEM. They are a count, not a duration, and they come back identical
 * run to run under any load. When a result has to be trusted without a quiet machine to hand, that is
 * the number to trust.
 *
 * ══ WHY IT PATCHES WEBGL ══════════════════════════════════════════════════════════════════════════
 *
 * `WebGLRenderer.info.render.calls` counts the shadow pass and the main pass together, and the split
 * is the whole diagnosis: the shadow pass was a third of the frame for a sun that never moves. The
 * only way to separate them from outside the app is to watch `bindFramebuffer` — three renders the
 * shadow map into an offscreen target — and attribute each draw call to whichever target was bound.
 * Doing it from the browser side keeps the app free of instrumentation it would otherwise carry into
 * production.
 *
 * ══ PLAYWRIGHT ════════════════════════════════════════════════════════════════════════════════════
 *
 * Not a dependency of this repo, by the precedent `shoot.mjs` sets: adding a browser to
 * `package.json` for a looking-glass would be a heavy change to a file the game does not import. But
 * `shoot.mjs` hard-codes one developer's home directory, so it runs on exactly one machine. This
 * resolves instead, and says what to do when it cannot.
 */
const BASE = process.env.BENCH_URL ?? 'http://127.0.0.1:5230/';

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
      `Either  npx playwright install chrome  and re-run, or point at an existing copy:\n` +
      `  PLAYWRIGHT_MODULE=/abs/path/to/playwright/index.mjs node ${process.argv[1]}`,
  );
  process.exit(2);
}

/** Patches the GL entrypoints and starts a per-frame sampler. Everything below reads `window.__bench`. */
const INSTRUMENT = `(() => {
  window.__bench = { frames: [], main: [], shadow: [], mainTris: 0, shadowTris: 0 };
  let main = 0, shadow = 0, mainT = 0, shadowT = 0, offscreen = false;
  const patch = (P) => {
    if (!P) return;
    const p = P.prototype;
    const bfb = p.bindFramebuffer;
    p.bindFramebuffer = function (t, fb) { offscreen = !!fb; return bfb.call(this, t, fb); };
    const note = (tris) => { if (offscreen) { shadow++; shadowT += tris; } else { main++; mainT += tris; } };
    const de = p.drawElements, da = p.drawArrays, dei = p.drawElementsInstanced, dai = p.drawArraysInstanced;
    p.drawElements = function (m, c, t, o) { note(c / 3); return de.call(this, m, c, t, o); };
    p.drawArrays = function (m, f, c) { note(c / 3); return da.call(this, m, f, c); };
    if (dei) p.drawElementsInstanced = function (m, c, t, o, n) { note((c / 3) * n); return dei.call(this, m, c, t, o, n); };
    if (dai) p.drawArraysInstanced = function (m, f, c, n) { note((c / 3) * n); return dai.call(this, m, f, c, n); };
  };
  patch(window.WebGL2RenderingContext);
  patch(window.WebGLRenderingContext);
  let last = performance.now();
  const tick = () => {
    const now = performance.now();
    const b = window.__bench;
    b.frames.push(now - last);
    b.main.push(main); b.shadow.push(shadow);
    b.mainTris = mainT; b.shadowTris = shadowT;
    main = 0; shadow = 0; mainT = 0; shadowT = 0; last = now;
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
})()`;

const CLEAR = `(() => { const b = window.__bench; b.frames.length = 0; b.main.length = 0; b.shadow.length = 0; })()`;

const grab = (page) =>
  page.evaluate(
    `(() => ({ f: window.__bench.frames.slice(2), m: window.__bench.main.slice(2),
               s: window.__bench.shadow.slice(2), mt: window.__bench.mainTris, st: window.__bench.shadowTris }))()`,
  );

/** Two frames are dropped from every window: the first is unbounded and the second carries its warm-up. */
function summarise(d) {
  const f = [...d.f].sort((a, b) => a - b);
  if (f.length === 0) return null;
  const at = (q) => f[Math.min(f.length - 1, Math.floor(f.length * q))];
  const mean = (xs) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);
  return {
    n: f.length,
    median: at(0.5),
    p90: at(0.9),
    p99: at(0.99),
    max: f[f.length - 1],
    main: mean(d.m),
    shadow: mean(d.s),
  };
}

function line(label, s) {
  if (!s) return console.log(`${label.padEnd(30)}  no frames`);
  console.log(
    `${label.padEnd(30)}  med ${s.median.toFixed(1).padStart(6)}ms   p99 ${s.p99.toFixed(1).padStart(6)}   ` +
      `max ${s.max.toFixed(1).padStart(6)}   calls ${(s.main + s.shadow).toFixed(0).padStart(5)}` +
      ` (main ${s.main.toFixed(0)} + shadow ${s.shadow.toFixed(0)})`,
  );
}

/** Walk forward while sweeping the view, which is the worst case for culling and the common case for a child. */
async function walk(page, ticks) {
  await page.keyboard.down('w');
  for (let i = 0; i < ticks; i += 1) {
    await page.mouse.move(640 + ((i * 11) % 500), 400);
    await page.waitForTimeout(80);
  }
  await page.keyboard.up('w');
}

const { chromium } = await playwright();

const browser = await chromium.launch({
  channel: 'chrome',
  args: [
    '--use-angle=metal',
    '--enable-gpu',
    // See the header: without these four the script measures Chrome's throttle, not the game.
    '--disable-gpu-vsync',
    '--disable-frame-rate-limit',
    '--disable-backgrounding-occluded-windows',
    '--disable-renderer-backgrounding',
    '--disable-background-timer-throttling',
  ],
});

const page = await browser.newPage({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 2 });
const problems = [];
page.on('pageerror', (e) => problems.push(String(e)));
page.on('console', (m) => {
  if (m.type() === 'error') problems.push(m.text());
});

await page.goto(BASE, { waitUntil: 'networkidle' });
// The world builds its geometry on mount and the batcher needs its observation window; measuring
// before that has settled reports the cost of starting up rather than the cost of playing.
await page.waitForTimeout(4000);
await page.evaluate(INSTRUMENT);
await page.waitForTimeout(4000);

console.log(`\nBramblebrook frame bench — ${BASE}`);
console.log('='.repeat(104));
const first = await grab(page);
line('idle, spawn view', summarise(first));
console.log(
  `${''.padEnd(30)}  triangles: main ${(first.mt / 1000).toFixed(0)}k + shadow ` +
    `${(first.st / 1000).toFixed(0)}k per frame`,
);

const cdp = await page.context().newCDPSession(page);

for (const rate of [1, 4, 6]) {
  await cdp.send('Emulation.setCPUThrottlingRate', { rate });
  await page.waitForTimeout(1000);
  await page.evaluate(CLEAR);
  await walk(page, 25);
  line(`walking, CPU throttle ${rate}x`, summarise(await grab(page)));
}
await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 });

// Where the CPU actually goes. The diagnosis rests on this being three's submission path rather than
// any game code, so it is printed every run instead of being taken on trust.
await cdp.send('Profiler.enable');
await cdp.send('Profiler.setSamplingInterval', { interval: 200 });
await cdp.send('Profiler.start');
await walk(page, 30);
const { profile } = await cdp.send('Profiler.stop');
const nodes = new Map(profile.nodes.map((n) => [n.id, n]));
const self = new Map();
for (const id of profile.samples ?? []) {
  const n = nodes.get(id);
  if (!n) continue;
  const key = `${n.callFrame.functionName || '(anonymous)'} @${(n.callFrame.url || '').split('/').pop()}`;
  self.set(key, (self.get(key) ?? 0) + 1);
}
const samples = [...self.values()].reduce((a, b) => a + b, 0) || 1;
console.log('\nJS self-time while walking');
console.log('-'.repeat(104));
for (const [k, v] of [...self.entries()].sort((a, b) => b[1] - a[1]).slice(0, 12)) {
  console.log(`  ${((100 * v) / samples).toFixed(1).padStart(5)}%  ${k.slice(0, 88)}`);
}

if (problems.length > 0) {
  console.log('\nconsole errors:');
  for (const p of problems.slice(0, 8)) console.log(`  ${p.slice(0, 160)}`);
}

console.log(
  '\nTargets: draw calls <= 450, median <= 8ms at 4x throttle, <= 12ms at 6x.' +
    '  Baseline at bfaf73f: 1139 calls, 3.8 / 14.1 / 21.8 ms.\n',
);

await browser.close();
