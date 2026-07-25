// Independent validator for the GB-TRACK-01 structured bank.
//
// This checker does NOT import the generator and does NOT trust any stored answer. It
// re-derives which slots hold fireflies with its OWN replay of the served motion script,
// written differently from the shared helper: instead of tracking jar -> slot it tracks the
// inverse map slot -> jar and applies each phase as a simultaneous permutation, then reads
// the target jars' positions out of the inverse map. Two independent representations of the
// same permutation must agree.
//
// It also proves the RENDERER animates that same motion. The block between the REPLAY_START /
// REPLAY_END markers in demos/GB-TRACK-01.html is extracted and executed here, and its
// trajectory and digest are compared against this checker's inverse-map replay for every item.
// That is what makes "the seeded motion replays identically in the checker and the renderer"
// a tested claim rather than a comment.
//
// Checks (exit nonzero on any failure):
//   1. JSONL parses; every line is a well-formed BankItem (BUILD_PLAN 2 shape, exact key set).
//   2. Born-synthetic + server/renderable split: content carries no final slots, digest or cost,
//      and the tap budget is a pure function of the jar count.
//   3. Every trial is well posed: each phase's swaps are DISJOINT and in range, the replay is a
//      permutation, every firefly jar is moved at least once, and the firefly slot SET changes
//      (so remembering the start positions cannot pass). The re-derived slot set equals the key.
//   4. The construct guard holds: tracking load (fireflies x phases x simultaneous swaps) ramps
//      monotonically while phase duration never drops below the declared floor, so difficulty
//      comes from load and motion complexity rather than from demanding fast clicking.
//   5. Difficulty is a float 1..20 with >=5 items per integer bin AND per +/-1 pt band.
//
// Run:  node research/exam-question-types/generators/check-GB-TRACK-01.mjs

import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const BANK = resolve(__dirname, '../banks/GB-TRACK-01.jsonl');
const DEMO = resolve(__dirname, '../demos/GB-TRACK-01.html');
const ALLOWED_BANDS = ['2-3', '4-5', '6-8'];   // exactly this type's declared catalog age_bands
const MIN_PER_BAND = 5;
const MIN_PHASE_MS = 550;
const REQUIRED_KEYS = ['itemId', 'typeCode', 'domain', 'difficulty', 'ageBands', 'demoPath', 'content', 'answer', 'scoring', 'provenance', 'syntheticOnly', 'validated'];

const failures = [];
const fail = (id, msg) => failures.push(`[${id}] ${msg}`);
const isNum = (x) => typeof x === 'number' && Number.isFinite(x);
const round2 = (x) => Math.round(x * 100) / 100;

// ---- independent replay: inverse map (slot -> jar), simultaneous phase application ----
function replayInverse(content) {
  const n = content.jarCount;
  const jarInSlot = [];
  for (let s = 0; s < n; s++) jarInSlot.push(s);          // slot s initially holds jar s
  const trace = [jarInSlot.slice()];
  for (const phase of content.motion.phases) {
    const next = jarInSlot.slice();
    for (const [a, b] of phase.swaps) { next[a] = jarInSlot[b]; next[b] = jarInSlot[a]; }
    for (let s = 0; s < n; s++) jarInSlot[s] = next[s];
    trace.push(jarInSlot.slice());
  }
  // convert to jar -> slot so the two representations can be compared
  const slotOfJar = new Array(n).fill(-1);
  for (let s = 0; s < n; s++) slotOfJar[jarInSlot[s]] = s;
  const traceForward = trace.map(row => {
    const f = new Array(n).fill(-1);
    for (let s = 0; s < n; s++) f[row[s]] = s;
    return f.join(',');
  });
  let h = 2166136261 >>> 0;
  const s = traceForward.join(';');
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return { slotOfJar, jarInSlot, trace: traceForward, digest: (h >>> 0).toString(16) };
}

// ---- pull the renderer's own replay implementation out of the demo and run it here ----
function loadRendererReplay() {
  const html = readFileSync(DEMO, 'utf8');
  const a = html.indexOf('/* REPLAY_START');
  const b = html.indexOf('/* REPLAY_END');
  if (a < 0 || b < 0) return { error: 'REPLAY markers not found in demos/GB-TRACK-01.html' };
  const block = html.slice(html.indexOf('*/', a) + 2, b);
  if (!/function\s+replayMotion\s*\(/.test(block)) return { error: 'no replayMotion() between the REPLAY markers' };
  try {
    // eslint-disable-next-line no-new-func
    const fn = new Function(`${block}; return replayMotion;`)();
    return { fn, source: block };
  } catch (e) { return { error: `renderer replay block does not evaluate: ${e.message}` }; }
}

// ---- 1. Parse ----
const raw = readFileSync(BANK, 'utf8').trim();
const lines = raw.length ? raw.split('\n') : [];
if (lines.length === 0) fail('parse', 'bank is empty');
const items = [];
lines.forEach((line, i) => { try { items.push(JSON.parse(line)); } catch (e) { fail('parse', `line ${i + 1} not valid JSON: ${e.message}`); } });

const renderer = loadRendererReplay();
if (renderer.error) fail('renderer', renderer.error);

// ---- 2 + 3 + 4. Per-item ----
const seenIds = new Set();
let wellPosed = 0, checked = 0, rendererAgree = 0;
const leversByLevel = new Map();
for (const it of items) {
  checked++;
  const id = (it.itemId || '(no id)').slice(0, 8);
  const keys = Object.keys(it);
  for (const k of REQUIRED_KEYS) if (!keys.includes(k)) fail(id, `missing required key "${k}"`);
  for (const k of keys) if (!REQUIRED_KEYS.includes(k)) fail(id, `unexpected top-level key "${k}"`);
  if (typeof it.itemId !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(it.itemId)) fail(id, 'itemId is not a v4-shaped uuid');
  if (seenIds.has(it.itemId)) fail(id, 'duplicate itemId'); seenIds.add(it.itemId);
  if (it.typeCode !== 'GB-TRACK-01') fail(id, `typeCode != GB-TRACK-01 (${it.typeCode})`);
  if (it.domain !== 'spatial') fail(id, `domain != spatial (${it.domain})`);
  if (!isNum(it.difficulty) || it.difficulty < 1 || it.difficulty > 20) fail(id, `difficulty not float 1..20 (${it.difficulty})`);
  if (!Array.isArray(it.ageBands) || !it.ageBands.length || !it.ageBands.every(b => ALLOWED_BANDS.includes(b))) fail(id, `ageBands invalid (${it.ageBands})`);
  if (it.demoPath !== 'demos/GB-TRACK-01.html') fail(id, `demoPath wrong (${it.demoPath})`);
  if (it.syntheticOnly !== true) fail(id, 'syntheticOnly must be true');
  if (it.validated !== false) fail(id, 'validated must be false');
  if (!it.scoring || it.scoring.mode !== 'computed_solver') fail(id, 'scoring.mode != computed_solver');
  else if (typeof it.scoring.solverId !== 'string' || !it.scoring.solverId) fail(id, 'scoring.solverId missing');
  if (!it.provenance || it.provenance.generator !== 'grammar' || typeof it.provenance.seed !== 'string') fail(id, 'provenance invalid');

  const c = it.content || {}, a = it.answer || {};
  const banned = /^(targetSlots|finalSlotOfJar|motionDigest|canonicalSolution|cost|answer|solution|correctKey|finalSlots)$/i;
  (function scanKeys(node, path) {
    if (!node || typeof node !== 'object') return;
    if (Array.isArray(node)) { node.forEach((v, i) => scanKeys(v, `${path}[${i}]`)); return; }
    for (const [k, v] of Object.entries(node)) {
      if (banned.test(k)) fail(id, `content leaks a solution field at ${path}.${k}`);
      scanKeys(v, `${path}.${k}`);
    }
  })(c, 'content');

  const n = c.jarCount;
  if (!isNum(n) || n < 2) { fail(id, 'jarCount missing/too small'); continue; }
  if (!Array.isArray(c.slots) || c.slots.length !== n) fail(id, `slots length != jarCount (${c.slots && c.slots.length})`);
  else if (!c.slots.every(s => isNum(s.x) && isNum(s.y))) fail(id, 'slot coordinates invalid');
  if (!Array.isArray(c.initialTargets) || !c.initialTargets.length) { fail(id, 'initialTargets missing'); continue; }
  if (new Set(c.initialTargets).size !== c.initialTargets.length) fail(id, 'duplicate initialTargets');
  if (c.initialTargets.some(j => j < 0 || j >= n)) fail(id, 'initialTargets out of range');
  if (c.initialTargets.length !== c.question.targetCount) fail(id, 'question.targetCount != number of firefly jars');
  if (c.responseUntimed !== true) fail(id, 'content.responseUntimed must be true (no response deadline)');
  if (!c.limits || c.limits.maxTaps !== 4 * n) fail(id, `limits.maxTaps != 4*jarCount (${c.limits && c.limits.maxTaps})`);

  const m = c.motion || {};
  if (typeof m.seed !== 'string' || !m.seed) fail(id, 'motion.seed missing (motion must be reproducible from a seed)');
  if (!isNum(m.phaseMs) || m.phaseMs < MIN_PHASE_MS) fail(id, `motion.phaseMs ${m.phaseMs} below the ${MIN_PHASE_MS}ms floor (speed must not become the discriminator)`);
  if (!Array.isArray(m.phases) || !m.phases.length) { fail(id, 'motion.phases missing'); continue; }
  if (m.phaseCount !== m.phases.length) fail(id, 'motion.phaseCount disagrees with the script length');
  let swapErr = null;
  for (let p = 0; p < m.phases.length; p++) {
    const swaps = m.phases[p].swaps;
    if (!Array.isArray(swaps) || !swaps.length) { swapErr = `phase ${p} has no swaps`; break; }
    if (swaps.length > m.swapsPerPhase) { swapErr = `phase ${p} has ${swaps.length} swaps > declared ${m.swapsPerPhase}`; break; }
    const seenSlots = new Set();
    for (const pair of swaps) {
      if (!Array.isArray(pair) || pair.length !== 2) { swapErr = `phase ${p} malformed swap`; break; }
      for (const s of pair) {
        if (!Number.isInteger(s) || s < 0 || s >= n) { swapErr = `phase ${p} slot ${s} out of range`; break; }
        if (seenSlots.has(s)) { swapErr = `phase ${p} swaps are not disjoint (slot ${s} twice)`; break; }
        seenSlots.add(s);
      }
      if (pair[0] === pair[1]) { swapErr = `phase ${p} swaps a slot with itself`; break; }
      if (swapErr) break;
    }
    if (swapErr) break;
  }
  if (swapErr) { fail(id, swapErr); continue; }

  // --- independent replay (inverse map) ---
  const re = replayInverse(c);
  if (new Set(re.slotOfJar).size !== n || re.slotOfJar.some(s => s < 0)) { fail(id, 'replay did not produce a permutation'); continue; }
  const finalSlots = c.initialTargets.map(j => re.slotOfJar[j]).sort((x, y) => x - y);
  const startSlots = c.initialTargets.slice().sort((x, y) => x - y);
  if (finalSlots.join(',') !== a.correctKey) fail(id, `re-derived slots ${finalSlots} != correctKey ${a.correctKey}`);
  if (!a.canonicalSolution || a.canonicalSolution.targetSlots.join(',') !== finalSlots.join(',')) fail(id, 'canonicalSolution.targetSlots disagrees with the replay');
  if (a.canonicalSolution && a.canonicalSolution.motionDigest !== re.digest) fail(id, `stored motionDigest ${a.canonicalSolution.motionDigest} != re-derived ${re.digest}`);
  if (finalSlots.join(',') === startSlots.join(',')) fail(id, 'fireflies end in the slots they started in: memorising positions would pass without tracking');
  // every firefly jar must actually be moved by the script
  const movedTargets = c.initialTargets.filter(j => {
    for (let p = 0; p < m.phases.length; p++) {
      const before = re.trace[p].split(',').map(Number);
      const after = re.trace[p + 1].split(',').map(Number);
      if (before[j] !== after[j]) return true;
    }
    return false;
  });
  if (movedTargets.length !== c.initialTargets.length) fail(id, `${c.initialTargets.length - movedTargets.length} firefly jar(s) never move during the trial`);
  if (!a.cost || a.cost.taps !== c.initialTargets.length) fail(id, 'answer.cost.taps != the number of fireflies (optimal tap economy)');
  if (!a.acceptedEquivalence || typeof a.acceptedEquivalence.rule !== 'string') fail(id, 'answer.acceptedEquivalence.rule missing');
  if (!Array.isArray(a.distractorRationales) || !a.distractorRationales.length) fail(id, 'distractorRationales (response taxonomy) missing');
  wellPosed++;

  // --- the renderer must animate exactly this motion ---
  if (renderer.fn) {
    let rr = null;
    try { rr = renderer.fn(c); } catch (e) { fail(id, `renderer replay threw: ${e.message}`); }
    if (rr) {
      if (rr.digest !== re.digest) fail(id, `renderer replay digest ${rr.digest} != checker digest ${re.digest}`);
      else if (rr.trace.join(';') !== re.trace.join(';')) fail(id, 'renderer replay trajectory differs from the checker trajectory');
      else if (rr.slotOfJar.join(',') !== re.slotOfJar.join(',')) fail(id, 'renderer final positions differ from the checker');
      else rendererAgree++;
    }
  }

  const lv = it.provenance.levers || {};
  if (lv.level) {
    if (!leversByLevel.has(lv.level)) leversByLevel.set(lv.level, []);
    leversByLevel.get(lv.level).push({ jars: n, targets: c.initialTargets.length, phases: m.phases.length, swaps: m.swapsPerPhase, phaseMs: m.phaseMs });
  }
}

// ---- 5. Coverage + construct-guard ramp ----
const diffs = items.map(it => it.difficulty).filter(isNum);
const min = Math.min(...diffs), max = Math.max(...diffs);
if (!(min <= 1.5)) fail('coverage', `min difficulty ${round2(min)} > 1.5 (floor not reached)`);
if (!(max >= 19.5)) fail('coverage', `max difficulty ${round2(max)} < 19.5 (ceiling not reached)`);
const binCounts = Array.from({ length: 20 }, () => 0);
const bandCounts = Array.from({ length: 20 }, () => 0);
for (const d of diffs) {
  const k = Math.round(d); if (k >= 1 && k <= 20) binCounts[k - 1]++;
  for (let kk = 1; kk <= 20; kk++) if (Math.abs(d - kk) <= 1.0) bandCounts[kk - 1]++;
}
binCounts.forEach((n, i) => { if (n < MIN_PER_BAND) fail('coverage', `integer bin k=${i + 1} has ${n} items (<${MIN_PER_BAND})`); });
bandCounts.forEach((n, i) => { if (n < MIN_PER_BAND) fail('coverage', `+/-1pt band around k=${i + 1} has ${n} items (<${MIN_PER_BAND})`); });

const ramp = [];
for (let L = 1; L <= 20; L++) {
  const rows = leversByLevel.get(L) || [];
  const avg = (f) => rows.length ? rows.reduce((a, r) => a + f(r), 0) / rows.length : 0;
  const r = { L, jars: avg(x => x.jars), targets: avg(x => x.targets), phases: avg(x => x.phases), swaps: avg(x => x.swaps), phaseMs: avg(x => x.phaseMs) };
  r.load = r.targets * r.phases * r.swaps;
  ramp.push(r);
}
for (let i = 1; i < 20; i++) {
  if (ramp[i].load <= ramp[i - 1].load) fail('ramp', `tracking load did not increase from rung ${i} (${round2(ramp[i - 1].load)}) to ${i + 1} (${round2(ramp[i].load)})`);
  if (ramp[i].jars < ramp[i - 1].jars) fail('ramp', `jar count decreased from rung ${i} to ${i + 1}`);
  if (ramp[i].targets < ramp[i - 1].targets) fail('ramp', `firefly count decreased from rung ${i} to ${i + 1}`);
}
// Construct guard: the speed lever must stay small next to the load lever.
const loadGrowth = ramp[19].load / Math.max(1e-9, ramp[0].load);
const speedGrowth = ramp[0].phaseMs / Math.max(1e-9, ramp[19].phaseMs);
if (!(loadGrowth > 10 * speedGrowth)) fail('construct', `speed lever too strong: load grows ${round2(loadGrowth)}x while phase duration shortens only ${round2(speedGrowth)}x - required load growth > 10x the speed growth`);
if (ramp.some(r => r.phaseMs < MIN_PHASE_MS)) fail('construct', 'a rung drops below the phase-duration floor');

// ---- Report ----
console.log(`GB-TRACK-01 bank check: ${items.length} items`);
console.log(`well-posed trials (independently replayed, tracking genuinely required): ${wellPosed}/${checked}  ${checked ? Math.round(1000 * wellPosed / checked) / 10 : 0}%`);
console.log(`renderer/checker motion agreement (demo replay block executed here): ${rendererAgree}/${checked}`);
console.log(`difficulty span: ${round2(min)} .. ${round2(max)}`);
console.log('per integer bin (k:n):  ' + binCounts.map((n, i) => `${String(i + 1).padStart(2)}:${n}`).join(' '));
console.log('per +/-1pt band (k:n):  ' + bandCounts.map((n, i) => `${String(i + 1).padStart(2)}:${n}`).join(' '));
console.log('load ramp (rung: fireflies x phases x swaps = load @ phaseMs):');
console.log('  ' + ramp.map(r => `${r.L}:${round2(r.targets)}x${round2(r.phases)}x${round2(r.swaps)}=${round2(r.load)}@${round2(r.phaseMs)}`).join('  '));
console.log(`construct guard: load grows ${round2(loadGrowth)}x across the ladder while phase duration shortens only ${round2(speedGrowth)}x`);
if (failures.length) {
  console.error(`\nFAIL - ${failures.length} problem(s):`);
  for (const f of failures.slice(0, 40)) console.error('  - ' + f);
  if (failures.length > 40) console.error(`  ... and ${failures.length - 40} more`);
  process.exit(1);
}
console.log('\nPASS - parses, structure valid, 100% of trials independently replayed by an inverse-map permutation and matched to the declared key, the renderer\'s own replay block reproduces the identical trajectory and digest for every item, fireflies always move and never end where they started, no solution data in content, coverage 1..20 with >=5 per bin and per +/-1pt band, load-driven (not speed-driven) ramp.');
