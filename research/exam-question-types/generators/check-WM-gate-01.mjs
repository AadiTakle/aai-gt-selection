// Independent validator for the WM-gate-01 structured bank.
//
// Checks (exit nonzero on any failure):
//   1. JSONL parses; every line is a well-formed BankItem with EXACTLY the
//      contract's top-level keys (BUILD_PLAN §2).
//   2. The stream is physically playable: monotone onsets, a dwell inside every
//      pace slot, checkpoints that sit on real events and never before enough
//      material has gone past, and unpredictable checkpoint spacing.
//   3. INDEPENDENT RE-DERIVATION: replay the stream event by event and recompute
//      every checkpoint's expected answer from scratch, per shell —
//        creature_lastk  : the last k token keys in order,
//        keep_track      : the most recent token of each asked colour family
//                          (families read off content.palette, not the answer),
//        numeric_running : the running total after every update so far.
//      The result must equal answer.probes[*].expectedKeys, and correctKey must
//      encode the same thing.
//   4. Isolation: responsePhase.probePlan says how many taps and what may be
//      tapped, and nothing about what went past. The answer lives only under
//      `answer`. k varies within an item so M-UPDATECOST is estimable.
//   5. Renderer isolation (static scan) + a RUNTIME SMOKE TEST that drives the
//      demo through the whole stream, answering EVERY checkpoint, and requires a
//      single {type:'result'} carrying one record per checkpoint. Because this
//      type locks and unlocks repeatedly, a lock that fails to clear at any
//      checkpoint hangs the item and emits nothing.
//   6. Reproducibility from provenance + difficulty derived from levers.
//   7. Coverage: 1..20, >=5 items per integer bin 1..19 and per +/-1 pt band.
//
// Run:  node research/exam-question-types/generators/check-WM-gate-01.mjs

import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { genItem, difficultyFromLevers, paceMsFromPressure, probeCountFromPressure } from './WM-gate-01.mjs';
import { lureLabel, normalizeBankItem } from './item-shape.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const BANK = resolve(__dirname, '../banks/WM-gate-01.jsonl');
const DEMO = resolve(__dirname, '../demos/WM-gate-01.html');
// This type's declared bands START at 2-3: there is no K-1 band.
const ALLOWED_BANDS = ['2-3', '4-5', '6-8'];
const MIN_PER_BAND = 5;
const TOP_LEVEL_KEYS = [
  'itemId', 'typeCode', 'domain', 'difficulty', 'ageBands', 'demoPath',
  'content', 'answer', 'scoring', 'provenance', 'syntheticOnly', 'validated',
];

const failures = [];
const fail = (id, msg) => failures.push(`[${id}] ${msg}`);
const isNum = (x) => typeof x === 'number' && Number.isFinite(x);
const deepEq = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const round2 = (x) => Math.round(x * 100) / 100;

// ---- 1. Parse ----
const raw = readFileSync(BANK, 'utf8').trim();
const lines = raw.length ? raw.split('\n') : [];
if (lines.length === 0) fail('parse', 'bank is empty');
const items = [];
lines.forEach((line, i) => {
  try {
    items.push(JSON.parse(line));
  } catch (e) {
    fail('parse', `line ${i + 1} is not valid JSON: ${e.message}`);
  }
});

/* ------------------------------------------------------------------ *
 * INDEPENDENT SOLVER — replay the parade and answer each checkpoint the way a
 * scorer holding only the display would. Reads content.presentation and
 * content.palette; never answer.* and never generator state.
 * ------------------------------------------------------------------ */
function replayStream(content, probeAskedFamilies) {
  const { events, probes } = content.presentation;
  const familyOf = new Map((content.palette || []).map((t) => [t.key, t.family]));
  const ordered = events.slice().sort((a, b) => a.index - b.index);
  const byStop = new Map(probes.map((p) => [p.afterEventIndex, p]));

  const history = [];
  let total = 0;
  const answers = [];
  for (const ev of ordered) {
    history.push(ev);
    if (content.shell === 'numeric_running') total = ev.kind === 'set' ? ev.value : total + ev.value;
    const stop = byStop.get(ev.index);
    if (!stop) continue;
    if (content.shell === 'creature_lastk') {
      answers.push({ probeIndex: stop.probeIndex, keys: history.slice(-stop.k).map((e) => e.tokenKey) });
    } else if (content.shell === 'keep_track') {
      const asked = probeAskedFamilies[stop.probeIndex] || [];
      const keys = asked.map((fam) => {
        for (let i = history.length - 1; i >= 0; i--) if (familyOf.get(history[i].tokenKey) === fam) return history[i].tokenKey;
        return null;
      });
      answers.push({ probeIndex: stop.probeIndex, keys });
    } else {
      answers.push({ probeIndex: stop.probeIndex, keys: [`v${total}`] });
    }
  }
  return answers;
}

// ---- 2 + 3 + 4. Per-item checks ----
const seenIds = new Set();
const shellCounts = {};
let itemsWithVaryingK = 0;
let totalProbes = 0;
for (const it of items) {
  const id = it.itemId || '(no id)';

  const keys = Object.keys(it).sort();
  if (!deepEq(keys, TOP_LEVEL_KEYS.slice().sort()))
    fail(id, `top-level keys != contract set (got ${keys.join(',')})`);

  if (typeof it.itemId !== 'string' || !/^[0-9a-f-]{36}$/.test(it.itemId)) fail(id, 'itemId is not a uuid');
  if (seenIds.has(it.itemId)) fail(id, 'duplicate itemId');
  seenIds.add(it.itemId);

  if (it.typeCode !== 'WM-gate-01') fail(id, `typeCode != WM-gate-01 (${it.typeCode})`);
  if (it.domain !== 'spatial') fail(id, `domain != spatial (${it.domain})`);
  if (it.demoPath !== 'demos/WM-gate-01.html') fail(id, `demoPath wrong (${it.demoPath})`);
  if (!isNum(it.difficulty) || it.difficulty < 1 || it.difficulty > 20) fail(id, `difficulty not in 1..20 (${it.difficulty})`);
  if (!Array.isArray(it.ageBands) || it.ageBands.length === 0) fail(id, 'ageBands empty');
  else if (!it.ageBands.every((b) => ALLOWED_BANDS.includes(b))) fail(id, `bad ageBand (${it.ageBands}) — this type has no K-1 band`);
  if (it.syntheticOnly !== true) fail(id, 'syntheticOnly must be true');
  if (it.validated !== false) fail(id, 'validated must be false');
  if (!it.scoring || it.scoring.mode !== 'computed_solver') fail(id, 'scoring.mode != computed_solver');
  if (!it.provenance || it.provenance.generator !== 'grammar') fail(id, 'provenance.generator != grammar');
  if (!it.provenance || typeof it.provenance.seed !== 'string') fail(id, 'provenance.seed missing');

  const c = it.content || {};
  const ans = it.answer || {};
  const rp = c.responsePhase || {};
  shellCounts[c.shell] = (shellCounts[c.shell] || 0) + 1;

  if (!['creature_lastk', 'keep_track', 'numeric_running'].includes(c.shell)) fail(id, `bad shell (${c.shell})`);
  if (![4, 6, 8].includes(c.paletteSize)) fail(id, `paletteSize not 4/6/8 (${c.paletteSize})`);
  if (!isNum(c.kMax) || c.kMax < 2 || c.kMax > 5) fail(id, `kMax out of 2..5 (${c.kMax})`);
  // The numeric shell is age-gated: never offered to the 2-3 band.
  if (c.shell === 'numeric_running' && it.ageBands.includes('2-3'))
    fail(id, 'the numeric shell must not be targeted at the 2-3 band (it assumes addition)');

  const p = c.presentation || {};
  const events = p.events;
  const probes = p.probes;
  if (!Array.isArray(events) || !events.length || !Array.isArray(probes) || !probes.length) {
    fail(id, 'presentation is missing events or probes');
    continue;
  }
  if (events.length !== c.streamLength) fail(id, `streamLength ${c.streamLength} != actual events ${events.length}`);
  if (probes.length !== c.probeCount) fail(id, `probeCount ${c.probeCount} != actual probes ${probes.length}`);
  totalProbes += probes.length;

  // --- 2. Playability.
  const lev = (it.provenance && it.provenance.levers) || {};
  if (p.paceMs !== paceMsFromPressure(lev.pressure)) fail(id, 'paceMs != value derived from pressure');
  if (probes.length !== probeCountFromPressure(lev.pressure)) fail(id, 'probeCount != value derived from pressure');
  if (!(p.dwellMs > 0 && p.dwellMs < p.paceMs)) fail(id, 'dwellMs must fit strictly inside one pace slot');
  let prev = -1;
  events.forEach((e, i) => {
    if (e.index !== i) fail(id, `event ${i} is mis-indexed (${e.index})`);
    if (!isNum(e.atMs) || e.atMs <= prev) fail(id, `event ${i} does not advance in time`);
    prev = e.atMs;
    if (e.dwellMs !== p.dwellMs) fail(id, `event ${i} dwell != declared dwellMs`);
    if (c.shell === 'numeric_running') {
      if (!['set', 'add'].includes(e.kind)) fail(id, `event ${i} has no numeric operation`);
      if (!isNum(e.value) || e.value <= 0) fail(id, `event ${i} numeric value must be positive`);
      if (typeof e.display !== 'string') fail(id, `event ${i} has no on-screen text (D-017: text only)`);
    } else if (typeof e.tokenKey !== 'string') fail(id, `event ${i} has no tokenKey`);
  });
  if (events[0].atMs !== p.leadInMs) fail(id, 'the parade does not start at leadInMs');

  const paletteKeys = (c.palette || []).map((t) => t.key);
  if (c.shell === 'numeric_running') {
    if ((c.palette || []).length !== 0) fail(id, 'the numeric shell must not ship a creature palette');
    if (events[0].kind !== 'set') fail(id, 'the numeric stream must open with a START value');
  } else {
    if (paletteKeys.length !== c.paletteSize) fail(id, `palette has ${paletteKeys.length} tokens, expected ${c.paletteSize}`);
    if (new Set(paletteKeys).size !== paletteKeys.length) fail(id, 'palette token keys are not unique');
    for (const t of c.palette) {
      if (typeof t.shape !== 'string' || typeof t.hue !== 'string' || typeof t.label !== 'string')
        fail(id, 'palette token is not drawable/readable');
      for (const leak of ['index', 'atMs', 'position']) if (Object.prototype.hasOwnProperty.call(t, leak)) fail(id, `palette token leaks stream field "${leak}"`);
    }
    // Two shapes per colour family, or "the most recent RED creature" would be
    // a restatement of the colour rather than a keep-track question.
    const byFam = {};
    for (const t of c.palette) byFam[t.family] = (byFam[t.family] || 0) + 1;
    if (Object.values(byFam).some((n) => n < 2)) fail(id, 'every colour family needs at least two members');
    for (const e of events) if (!paletteKeys.includes(e.tokenKey)) fail(id, `stream shows a token outside the palette (${e.tokenKey})`);
  }

  // Checkpoints sit on real events, in order, with enough material behind them,
  // and with unpredictable spacing (a fixed rhythm would let the child count).
  let lastAfter = -1;
  const spacings = [];
  probes.forEach((pr, i) => {
    if (pr.probeIndex !== i + 1) fail(id, `probe ${i + 1} is mis-indexed (${pr.probeIndex})`);
    if (!isNum(pr.afterEventIndex) || pr.afterEventIndex < 0 || pr.afterEventIndex >= events.length)
      fail(id, `probe ${pr.probeIndex} points outside the stream`);
    if (pr.afterEventIndex <= lastAfter) fail(id, `probe ${pr.probeIndex} does not come after the previous one`);
    if (pr.afterEventIndex + 1 < pr.k) fail(id, `probe ${pr.probeIndex} asks for ${pr.k} items but only ${pr.afterEventIndex + 1} have gone past`);
    if (!(pr.opensAtMs > pr.gateClosesAtMs)) fail(id, `probe ${pr.probeIndex} opens before the gate finishes closing`);
    spacings.push(pr.afterEventIndex - lastAfter);
    lastAfter = pr.afterEventIndex;
  });
  if (probes.length >= 3 && new Set(spacings).size === 1)
    fail(id, 'checkpoint spacing is perfectly regular — the surprise element is gone');

  // --- 3. INDEPENDENT re-derivation of every checkpoint answer.
  const askedByProbe = {};
  for (const a of ans.probes || []) if (a.askedFamilies) askedByProbe[a.probeIndex] = a.askedFamilies;
  const derived = replayStream(c, askedByProbe);
  if (derived.length !== (ans.probes || []).length) fail(id, 'answer.probes count != checkpoints in the stream');
  else
    derived.forEach((d, i) => {
      const a = ans.probes[i];
      if (a.probeIndex !== d.probeIndex) fail(id, `answer probe ${i + 1} is mis-indexed`);
      if (d.keys.some((k) => k == null)) fail(id, `probe ${d.probeIndex}: an asked colour never appeared before the checkpoint`);
      if (!deepEq(a.expectedKeys, d.keys))
        fail(id, `probe ${d.probeIndex} expectedKeys ${JSON.stringify(a.expectedKeys)} != independently replayed ${JSON.stringify(d.keys)}`);
      if (c.shell === 'creature_lastk' && new Set(d.keys).size !== d.keys.length)
        fail(id, `probe ${d.probeIndex}: the last-k window repeats a creature (ambiguous ordered answer)`);
    });
  const reKey = derived.map((d) => `p${d.probeIndex}:${d.keys.join('-')}`).join('|');
  if (ans.correctKey !== reKey) fail(id, `correctKey does not encode the re-derived checkpoint answers (${ans.correctKey})`);
  const reUnits = derived.reduce((s, d) => s + d.keys.length, 0);
  if (ans.unitsTotal !== reUnits) fail(id, `answer.unitsTotal ${ans.unitsTotal} != re-derived ${reUnits}`);
  if (!it.scoring.spec || it.scoring.spec.unitsTotal !== reUnits) fail(id, 'scoring.spec.unitsTotal disagrees with the re-derived unit count');
  if (!it.scoring.spec.updateCostSlope) fail(id, 'the multi-probe solver must define the accuracy-by-k slope (M-UPDATECOST)');
  if (!it.scoring.spec.longestCorrectRun) fail(id, 'the solver must define longestCorrectRun');

  // k must VARY inside an item wherever the ladder allows it, or the within-item
  // updating-cost slope is not estimable.
  const ks = probes.map((x) => x.k);
  if (new Set(ks).size > 1) itemsWithVaryingK++;
  else if (c.kMax > 2 && c.shell !== 'keep_track') fail(id, `every checkpoint uses k=${ks[0]} although kMax is ${c.kMax} — no within-item slope`);

  // --- 4. Response-phase isolation.
  const plan = rp.probePlan || [];
  if (plan.length !== probes.length) fail(id, 'probePlan does not cover every checkpoint');
  plan.forEach((pl, i) => {
    const a = (ans.probes || [])[i];
    if (!a) return;
    if (pl.probeIndex !== a.probeIndex) fail(id, `probePlan ${i + 1} is mis-indexed`);
    if (pl.expectedCount !== a.expectedKeys.length) fail(id, `probePlan ${pl.probeIndex} expectedCount != the number of answers wanted`);
    if (!Array.isArray(pl.options) || pl.options.length < 2) fail(id, `probePlan ${pl.probeIndex} has no palette to tap`);
    const optKeys = pl.options.map((o) => o.key);
    if (new Set(optKeys).size !== optKeys.length) fail(id, `probePlan ${pl.probeIndex} repeats an option key`);
    for (const k of a.expectedKeys) if (!optKeys.includes(k)) fail(id, `probePlan ${pl.probeIndex} cannot express the expected answer (${k} not offered)`);
    if (c.shell !== 'numeric_running' && !deepEq(optKeys.slice().sort(), paletteKeys.slice().sort()))
      fail(id, `probePlan ${pl.probeIndex} options are not the full creature palette (option set narrows the answer)`);
    if (a.askedFamilies && !deepEq(pl.askedFamilies, a.askedFamilies))
      fail(id, `probePlan ${pl.probeIndex} asks for different colours than the answer expects`);
    for (const leak of ['expectedKeys', 'keys', 'correct', 'window', 'runningTotal'])
      if (Object.prototype.hasOwnProperty.call(pl, leak)) fail(id, `probePlan ${pl.probeIndex} leaks answer field "${leak}"`);
  });
  if (rp.untimed !== true) fail(id, 'checkpoints must be untimed');
  if (rp.latencyAnchor !== 'probe_open') fail(id, 'responsePhase.latencyAnchor must be "probe_open"');
  const planText = JSON.stringify(plan);
  for (const k of (ans.probes || [])[0] ? ans.probes[0].expectedKeys : [])
    if (c.shell === 'numeric_running' && !planText.includes(`"${k}"`)) fail(id, 'the numeric option list must contain the true total');
  const contentText = JSON.stringify(c);
  for (const banned of ['expectedKeys', 'correctKey', 'distractorRationales', 'unitsTotal', 'runningTotal'])
    if (contentText.includes(`"${banned}"`)) fail(id, `content leaks answer field "${banned}"`);

  // Named lures: one "correct" per probe plus at least one real, distinct lure.
  const rats = ans.distractorRationales || {};
  for (const d of derived) {
    const key = `p${d.probeIndex}.correct`;
    if (!rats[key] || !deepEq(rats[key].keys, d.keys)) fail(id, `${key} != the re-derived answer for that checkpoint`);
    if (rats[key] && lureLabel(rats[key]) !== 'correct') fail(id, `${key} is not labelled lure:"correct"`);
    const others = Object.entries(rats).filter(([k]) => k.startsWith(`p${d.probeIndex}.`) && k !== key);
    if (!others.length) fail(id, `probe ${d.probeIndex} has no named lure besides "correct"`);
    for (const [k, r] of others) {
      if (!r || typeof lureLabel(r) !== 'string' || !Array.isArray(r.keys) || typeof r.note !== 'string') fail(id, `lure "${k}" malformed`);
      if (deepEq(r.keys, d.keys)) fail(id, `lure "${k}" is actually the correct answer`);
      if (r.probeIndex !== d.probeIndex) fail(id, `lure "${k}" is filed under the wrong checkpoint`);
    }
  }

  // --- 6. Reproducibility + difficulty derivation.
  try {
    const regen = normalizeBankItem(genItem({ kMax: lev.kMax, shell: lev.shell, paletteSize: lev.paletteSize, pressure: lev.pressure, seed: it.provenance.seed }));
    if (!deepEq(regen, it)) fail(id, 'item is NOT reproducible from its provenance (grammar drift)');
  } catch (e) {
    fail(id, `regeneration threw: ${e.message}`);
  }
  const dv = round2(difficultyFromLevers(lev.kMax, lev.shell, lev.paletteSize, lev.pressure));
  if (Math.abs(dv - it.difficulty) > 0.01) fail(id, `difficulty ${it.difficulty} != derived-from-levers ${dv}`);
  if (lev.kMax !== c.kMax || lev.shell !== c.shell || lev.paletteSize !== c.paletteSize)
    fail(id, 'provenance.levers disagree with content (difficulty is not explainable from the item)');
}

/* ------------------------------------------------------------------ *
 * 5. RENDERER ISOLATION — static scan of the pure renderer.
 * ------------------------------------------------------------------ */
function checkRenderer() {
  let html;
  try {
    html = readFileSync(DEMO, 'utf8');
  } catch (e) {
    fail('renderer', `cannot read ${DEMO}: ${e.message}`);
    return;
  }
  const m = html.match(/\/\* @response-phase:begin \*\/([\s\S]*?)\/\* @response-phase:end \*\//);
  if (!m) {
    fail('renderer', 'demo has no /* @response-phase:begin|end */ region to audit');
  } else {
    const respond = m[1];
    for (const banned of ['presentation', '.events', 'expectedKeys', 'correctKey', 'tokenKey', 'makeStreamPlayer'])
      if (respond.includes(banned)) fail('renderer', `response-phase region references "${banned}" (parade leak into the checkpoint UI)`);
    if (!/@lock-release/.test(respond)) fail('renderer', 'response-phase region has no /* @lock-release */ marker');
    if (!/^[ \t]*locked\s*=\s*false\s*;/m.test(respond))
      fail('renderer', 'response-phase region never sets locked=false (SPA-FOLDNET-01 stuck-lock bug)');
    // This type unlocks per checkpoint, so it must also RE-lock when the parade resumes.
    if (!/^[ \t]*locked\s*=\s*true\s*;/m.test(respond))
      fail('renderer', 'response-phase region never re-locks after a checkpoint (taps would leak into the moving parade)');
  }
  if (!/sealPresentation\s*\(/.test(html)) fail('renderer', 'demo never calls sealPresentation()');
  for (const needed of ['gt-exam-host', 'gt-exam-demo', "type:'ready'", "type:'result'", "type:'telemetry'"])
    if (!html.includes(needed)) fail('renderer', `demo missing postMessage contract token ${needed}`);
  if (/AudioContext|speechSynthesis|new Audio\(|createOscillator/.test(html))
    fail('renderer', 'demo uses audio — D-017 requires on-screen text only');
  if (/[\u{1F000}-\u{1FAFF}\u{2600}-\u{26FF}\u{2B00}-\u{2BFF}\u{FE0F}]/u.test(html))
    fail('renderer', 'demo contains an emoji/pictograph (house rule: words + common symbols only)');
  if (!/id="status"/.test(html)) fail('renderer', 'demo missing the worded #status line');
  if (!/id="howto"/.test(html)) fail('renderer', 'demo missing the #howto panel');
}
checkRenderer();

/* ------------------------------------------------------------------ *
 * 5b. RENDERER SMOKE TEST — every shell driven through every checkpoint.
 * ------------------------------------------------------------------ */
class ShimEl {
  constructor(tag) {
    this.tag = tag; this.children = []; this.parent = null; this.dataset = {}; this.style = {};
    this.id = ''; this._cls = new Set(); this._html = ''; this._text = ''; this._on = {};
    this.classList = {
      add: (...c) => c.forEach((x) => this._cls.add(x)),
      remove: (...c) => c.forEach((x) => this._cls.delete(x)),
      toggle: (c, v) => (v === undefined ? (this._cls.has(c) ? this._cls.delete(c) : this._cls.add(c)) : v ? this._cls.add(c) : this._cls.delete(c)),
      contains: (c) => this._cls.has(c),
    };
  }
  get className() { return [...this._cls].join(' '); }
  set className(v) { this._cls = new Set(String(v).split(/\s+/).filter(Boolean)); }
  get innerHTML() { return this._html; }
  set innerHTML(v) { this._html = String(v); this.children = []; }
  get textContent() { return this._text; }
  set textContent(v) { this._text = String(v); }
  get offsetWidth() { return 10; }
  appendChild(c) { c.parent = this; this.children.push(c); return c; }
  addEventListener(t, f) { (this._on[t] = this._on[t] || []).push(f); }
  removeEventListener() {}
  setAttribute(k, v) { if (k === 'id') this.id = v; }
  getBoundingClientRect() { return { left: 0, top: 0, width: 20, height: 20 }; }
  closest(sel) { const c = sel.replace('.', ''); let n = this; while (n) { if (n._cls.has(c)) return n; n = n.parent; } return null; }
  fire(t, ev) { (this._on[t] || []).forEach((f) => f(ev)); }
}
function makeShimDom(html) {
  const byId = new Map();
  for (const m of html.matchAll(/id="([^"]+)"/g)) { const e = new ShimEl('div'); e.id = m[1]; byId.set(m[1], e); }
  const all = () => { const out = []; const seen = new Set(); const walk = (e) => { if (seen.has(e)) return; seen.add(e); out.push(e); e.children.forEach(walk); }; byId.forEach(walk); return out; };
  const match = (e, sel) => (sel.startsWith('#') ? e.id === sel.slice(1) : sel.startsWith('.') ? e._cls.has(sel.slice(1)) : e.tag === sel);
  const isDescendant = (node, root) => { let n = node.parent; while (n) { if (n === root) return true; n = n.parent; } return false; };
  const query = (sel, oneOnly) => {
    const parts = sel.trim().split(/\s+/);
    let pool;
    if (parts.length === 1) pool = all().filter((e) => match(e, parts[0]));
    else {
      const root = all().find((e) => match(e, parts[0]));
      pool = root ? all().filter((e) => match(e, parts[1]) && isDescendant(e, root)) : [];
    }
    return oneOnly ? pool[0] || null : pool;
  };
  return {
    querySelector: (s) => query(s, true),
    querySelectorAll: (s) => query(s, false),
    createElement: (t) => new ShimEl(t),
    addEventListener: () => {},
  };
}
let smokeSummary = 'smoke test: not run';
async function driveItem(html, item, label) {
  const js = html.split('<script>')[1].split('</scr' + 'ipt>')[0];
  const document = makeShimDom(html);
  const posted = [];
  const winListeners = {};
  const realTimeout = setTimeout;
  const win = {
    parent: { postMessage: (msg) => posted.push(msg) },
    addEventListener: (t, f) => ((winListeners[t] = winListeners[t] || []).push(f)),
  };
  const drain = async (n = 40) => { for (let i = 0; i < n; i++) await new Promise((r) => realTimeout(r, 1)); };
  try {
    // eslint-disable-next-line no-new-func
    new Function('window', 'document', 'fetch', 'setTimeout', 'clearTimeout', js)(
      win, document, () => Promise.reject(new Error('no network in the checker')),
      (fn) => realTimeout(fn, 0), (t) => clearTimeout(t),
    );
  } catch (e) {
    fail('smoke', `[${label}] demo script threw on load: ${e.message}`);
    return null;
  }
  if (!posted.some((m) => m.type === 'ready')) fail('smoke', `[${label}] demo never posted {type:"ready"}`);
  const send = (msg) => (winListeners.message || []).forEach((f) => f({ data: Object.assign({ source: 'gt-exam-host' }, msg) }));
  send({ type: 'init', item });
  send({ type: 'start' });

  const cp = document.querySelector('#checkpoint');
  const palette = document.querySelector('#palette');
  const slots = document.querySelector('#slots');
  let answered = 0;
  for (let guard = 0; guard < 200 && !posted.some((m) => m.type === 'result'); guard++) {
    await drain(20);
    if (!cp._cls.has('open')) continue;
    const want = slots.children.length;
    if (!want || !palette.children.length) { fail('smoke', `[${label}] checkpoint opened with no slots or palette`); return null; }
    for (let i = 0; i < want; i++) palette.fire('click', { target: palette.children[i % palette.children.length] });
    answered++;
    await drain(20);
  }
  const tele = posted.filter((m) => m.type === 'telemetry').map((m) => m.event);
  const sealed = tele.find((e) => e.kind === 'presentation_sealed');
  if (!sealed) fail('smoke', `[${label}] the parade was never sealed`);
  else if (sealed.reachable !== false) fail('smoke', `[${label}] content.presentation is still reachable after sealing`);
  const opens = tele.filter((e) => e.kind === 'checkpoint_open').length;
  if (opens !== item.content.probeCount) fail('smoke', `[${label}] ${opens} of ${item.content.probeCount} checkpoints opened (a lock probably stuck mid-item)`);
  const results = posted.filter((m) => m.type === 'result');
  if (results.length !== 1) { fail('smoke', `[${label}] expected exactly 1 result, got ${results.length} (stuck lock?)`); return null; }
  const r = results[0].result;
  if (r.response.probeCount !== item.content.probeCount) fail('smoke', `[${label}] result covers ${r.response.probeCount} of ${item.content.probeCount} checkpoints`);
  for (const k of ['M-SPAN', 'M-DIFFREACH', 'M-RT', 'M-RTFIRST', 'M-RTVAR', 'M-DRIFT', 'M-REV', 'M-ENGAGE', 'M-RAPIDGUESS'])
    if (!(k in r.metrics)) fail('smoke', `[${label}] result.metrics missing ${k}`);
  for (const [k, v] of Object.entries(r.metrics))
    if (typeof v !== 'number' || !Number.isFinite(v)) fail('smoke', `[${label}] metric ${k} is not a finite number (${v})`);
  for (const leak of ['correct', 'isCorrect', 'score', 'expectedKeys'])
    if (JSON.stringify(r).includes(`"${leak}"`)) fail('smoke', `[${label}] result leaks a correctness field "${leak}"`);
  return `${label}: ${answered} checkpoints answered, ${Object.keys(r.metrics).length} numeric metrics`;
}
async function smokeTestRenderer() {
  let html;
  try { html = readFileSync(DEMO, 'utf8'); } catch { return; }
  const served = (b) => { const s = JSON.parse(JSON.stringify(b)); delete s.answer; delete s.scoring; delete s.provenance; return s; };
  const notes = [];
  for (const shell of ['creature_lastk', 'keep_track', 'numeric_running']) {
    const pickItem = items.filter((x) => x.content.shell === shell).sort((a, b) => a.difficulty - b.difficulty)[0];
    if (!pickItem) { fail('smoke', `bank contains no ${shell} item to smoke test`); continue; }
    const note = await driveItem(html, served(pickItem), shell);
    if (note) notes.push(note);
  }
  smokeSummary = 'smoke test: ' + (notes.length ? notes.join(' | ') : 'no shell completed');
}
await smokeTestRenderer();

// ---- 7. Coverage ----
const diffs = items.map((it) => it.difficulty).filter(isNum);
const min = Math.min(...diffs);
const max = Math.max(...diffs);
if (!(min <= 1.5)) fail('coverage', `min difficulty ${round2(min)} > 1.5 (does not reach the floor)`);
if (!(max >= 19.5)) fail('coverage', `max difficulty ${round2(max)} < 19.5 (does not reach the ceiling)`);

const binCounts = Array.from({ length: 20 }, () => 0);
const bandCounts = Array.from({ length: 20 }, () => 0);
for (const d of diffs) {
  const k = Math.round(d);
  if (k >= 1 && k <= 20) binCounts[k - 1]++;
  for (let kk = 1; kk <= 20; kk++) if (Math.abs(d - kk) <= 1.0) bandCounts[kk - 1]++;
}
for (let k = 1; k <= 19; k++) {
  if (binCounts[k - 1] < MIN_PER_BAND) fail('coverage', `integer bin k=${k} has ${binCounts[k - 1]} items (<${MIN_PER_BAND})`);
  if (bandCounts[k - 1] < MIN_PER_BAND) fail('coverage', `+/-1pt band around k=${k} has ${bandCounts[k - 1]} items (<${MIN_PER_BAND})`);
}
for (let k = 1; k <= 20; k++) if (binCounts[k - 1] === 0) fail('coverage', `integer bin k=${k} is EMPTY (ramp has a hole)`);

// k ladder at matched levers.
{
  const byK = new Map();
  for (const it of items) {
    if (it.content.shell !== 'creature_lastk' || it.content.paletteSize !== 8) continue;
    const arr = byK.get(it.content.kMax) || [];
    arr.push(it.difficulty);
    byK.set(it.content.kMax, arr);
  }
  const ks = [...byK.keys()].sort((a, b) => a - b);
  for (let i = 1; i < ks.length; i++)
    if (Math.min(...byK.get(ks[i])) <= Math.min(...byK.get(ks[i - 1])))
      fail('ladder', `k=${ks[i]} does not sit above k=${ks[i - 1]} at matched levers`);
}

// ---- Report ----
console.log(`WM-gate-01 bank check: ${items.length} items`);
console.log(`difficulty span: ${round2(min)} .. ${round2(max)}`);
console.log(`shells: ${Object.entries(shellCounts).map(([s, n]) => `${s} ${n}`).join(', ')}`);
console.log(`checkpoints re-derived: ${totalProbes}; items with varying k: ${itemsWithVaryingK}/${items.length}`);
console.log('per integer bin (k:n):  ' + binCounts.map((n, i) => `${String(i + 1).padStart(2)}:${n}`).join(' '));
console.log('per +/-1pt band (k:n):  ' + bandCounts.map((n, i) => `${String(i + 1).padStart(2)}:${n}`).join(' '));
console.log(`min per-bin density (k=1..19): ${Math.min(...binCounts.slice(0, 19))}`);
console.log(smokeSummary);

if (failures.length) {
  console.error(`\nFAIL — ${failures.length} problem(s):`);
  for (const f of failures.slice(0, 40)) console.error('  - ' + f);
  if (failures.length > 40) console.error(`  ... and ${failures.length - 40} more`);
  process.exit(1);
}
console.log(
  '\nPASS — stream playable with unpredictable checkpoints, every checkpoint answer independently re-derived from the replayed parade, ' +
    'checkpoint UI sees only tap counts and palettes, renderer seals the parade and unlocks/re-locks at every gate, coverage 1..20 with >=5 per bin/band.',
);
