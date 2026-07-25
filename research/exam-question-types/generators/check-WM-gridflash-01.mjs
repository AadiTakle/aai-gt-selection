// Independent validator for the WM-gridflash-01 structured bank.
//
// Checks (exit nonzero on any failure):
//   1. JSONL parses; every line is a well-formed BankItem with EXACTLY the
//      contract's top-level keys (BUILD_PLAN §2).
//   2. The flash schedule is physically playable, simultaneous, and its timings
//      agree with the declared exposure and retention delay.
//   3. INDEPENDENT RE-DERIVATION:
//      - change_detection: rebuild the array from content.presentation, look up
//        the ORIGINAL colour of the probed cell, compare it with the probe colour
//        shown at test, and derive SAME/CHANGED from scratch. That derived key
//        must equal answer.correctKey, and the lure labels must follow signal
//        detection (miss on change trials, false alarm on same trials).
//      - recognition: rebuild the lit-cell set from the array and require it to
//        equal answer.expectedCells.
//   4. Isolation: content.responsePhase shows only what the test legitimately
//      shows. In particular the ORIGINAL colour of the probed cell must NOT be
//      reachable from responsePhase, or the judgement stops being a memory
//      judgement. The answer lives only under `answer`.
//   5. Renderer isolation (static scan) + a RUNTIME SMOKE TEST driving the demo
//      through init -> flash -> test -> response, requiring a {type:'result'}
//      postMessage (a stuck input lock emits nothing).
//   6. Reproducibility from provenance + difficulty derived from levers.
//   7. Coverage: 1..20, >=5 per integer bin 1..19 and per +/-1 pt band, plus a
//      change/no-change balance good enough to estimate d-prime.
//
// Run:  node research/exam-question-types/generators/check-WM-gridflash-01.mjs

import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { genItem, difficultyFromLevers, exposureMsFromPressure, retentionDelayFromPressure, gridSizeForSet } from './WM-gridflash-01.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const BANK = resolve(__dirname, '../banks/WM-gridflash-01.jsonl');
const DEMO = resolve(__dirname, '../demos/WM-gridflash-01.html');
const ALLOWED_BANDS = ['K-1', '2-3', '4-5', '6-8'];
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
 * INDEPENDENT SOLVER — rebuild what was on screen, then decide the answer the
 * way a scorer with the display (and nothing else) would.
 * ------------------------------------------------------------------ */
function rebuildArray(presentation) {
  const hueAt = new Map();
  const lit = [];
  for (const a of presentation.array) {
    hueAt.set(a.cell, a.hue);
    lit.push(a.cell);
  }
  return { hueAt, lit: lit.slice().sort((x, y) => x - y) };
}
const cellLabel = (cell, g) => `r${Math.floor(cell / g) + 1}c${(cell % g) + 1}`;

// ---- 2 + 3 + 4. Per-item checks ----
const seenIds = new Set();
let nChange = 0;
let nSame = 0;
let nRecognition = 0;
for (const it of items) {
  const id = it.itemId || '(no id)';

  const keys = Object.keys(it).sort();
  if (!deepEq(keys, TOP_LEVEL_KEYS.slice().sort()))
    fail(id, `top-level keys != contract set (got ${keys.join(',')})`);

  if (typeof it.itemId !== 'string' || !/^[0-9a-f-]{36}$/.test(it.itemId)) fail(id, 'itemId is not a uuid');
  if (seenIds.has(it.itemId)) fail(id, 'duplicate itemId');
  seenIds.add(it.itemId);

  if (it.typeCode !== 'WM-gridflash-01') fail(id, `typeCode != WM-gridflash-01 (${it.typeCode})`);
  if (it.domain !== 'spatial') fail(id, `domain != spatial (${it.domain})`);
  if (it.demoPath !== 'demos/WM-gridflash-01.html') fail(id, `demoPath wrong (${it.demoPath})`);
  if (!isNum(it.difficulty) || it.difficulty < 1 || it.difficulty > 20) fail(id, `difficulty not in 1..20 (${it.difficulty})`);
  if (!Array.isArray(it.ageBands) || it.ageBands.length === 0) fail(id, 'ageBands empty');
  else if (!it.ageBands.every((b) => ALLOWED_BANDS.includes(b))) fail(id, `bad ageBand (${it.ageBands})`);
  if (it.syntheticOnly !== true) fail(id, 'syntheticOnly must be true');
  if (it.validated !== false) fail(id, 'validated must be false');
  if (!it.scoring || it.scoring.mode !== 'computed_solver') fail(id, 'scoring.mode != computed_solver');
  if (!it.scoring || !it.scoring.spec || !isNum(it.scoring.spec.unitsTotal)) fail(id, 'scoring.spec.unitsTotal missing');
  if (!it.provenance || it.provenance.generator !== 'grammar') fail(id, 'provenance.generator != grammar');
  if (!it.provenance || typeof it.provenance.seed !== 'string') fail(id, 'provenance.seed missing');

  const c = it.content || {};
  const g = c.grid && c.grid.rows;
  if (![3, 4].includes(g) || c.grid.cols !== g) fail(id, `grid not 3x3 or 4x4 (${JSON.stringify(c.grid)})`);
  if (!isNum(c.setSize) || c.setSize < 2 || c.setSize > 8) fail(id, `setSize out of 2..8 (${c.setSize})`);
  if (g !== gridSizeForSet(c.setSize)) fail(id, `grid ${g}x${g} does not match the field size for setSize ${c.setSize}`);
  if (!['change_detection', 'recognition'].includes(c.shell)) fail(id, `bad shell (${c.shell})`);
  if (!['distinct', 'confusable'].includes(c.identitySet)) fail(id, `bad identitySet (${c.identitySet})`);

  const p = c.presentation || {};
  if (p.simultaneous !== true) fail(id, 'presentation.simultaneous must be true for this type');
  const arr = p.array;
  if (!Array.isArray(arr) || arr.length !== c.setSize) {
    fail(id, `array length ${arr ? arr.length : 'n/a'} != setSize ${c.setSize}`);
    continue;
  }

  // --- 2. Playability + one star per cell + hues distinct within the array.
  const cellsSeen = new Set();
  const huesSeen = new Set();
  for (const a of arr) {
    if (!isNum(a.cell) || a.cell < 0 || a.cell >= g * g) fail(id, `array cell out of grid (${a.cell})`);
    if (a.row !== Math.floor(a.cell / g) || a.col !== a.cell % g) fail(id, 'array row/col disagree with cell');
    if (typeof a.hue !== 'string') fail(id, 'array item has no hue token');
    if (cellsSeen.has(a.cell)) fail(id, `cell ${a.cell} carries two stars`);
    if (huesSeen.has(a.hue)) fail(id, `hue ${a.hue} is reused inside one array (ambiguous change probe)`);
    cellsSeen.add(a.cell);
    huesSeen.add(a.hue);
  }
  const lev = (it.provenance && it.provenance.levers) || {};
  if (p.arrayOnsetMs !== p.leadInMs) fail(id, 'array does not appear at leadInMs');
  if (p.arrayOffsetMs - p.arrayOnsetMs !== p.exposureMs) fail(id, 'array exposure != declared exposureMs');
  if (p.testOpensAtMs !== p.arrayOffsetMs + p.retentionDelayMs) fail(id, 'testOpensAtMs != arrayOffset + retentionDelay');
  if (p.exposureMs !== exposureMsFromPressure(lev.pressure)) fail(id, 'exposureMs != value derived from pressure');
  if (p.retentionDelayMs !== retentionDelayFromPressure(lev.pressure)) fail(id, 'retentionDelayMs != value derived from pressure');
  if (!(p.retentionDelayMs > 0)) fail(id, 'a change-detection array needs a real blank retention interval');

  // --- 3. INDEPENDENT re-derivation.
  const { hueAt, lit } = rebuildArray(p);
  const ans = it.answer || {};
  const rp = c.responsePhase || {};

  if (c.shell === 'change_detection') {
    if (rp.mode !== 'two_choice') fail(id, 'change_detection shell must use a two_choice responsePhase');
    const probe = rp.probe || {};
    if (!cellsSeen.has(probe.cell)) fail(id, `probe cell ${probe.cell} was never lit`);
    const original = hueAt.get(probe.cell);
    const derivedKey = probe.hue === original ? 'SAME' : 'CHANGED';
    if (ans.correctKey !== derivedKey)
      fail(id, `correctKey ${ans.correctKey} != independently derived ${derivedKey} (original ${original}, probe ${probe.hue})`);
    if (ans.trialType !== (derivedKey === 'CHANGED' ? 'change' : 'same')) fail(id, 'answer.trialType disagrees with the derived key');
    if (ans.originalHue !== original) fail(id, 'answer.originalHue != the colour actually flashed at the probed cell');
    if (ans.probeHue !== probe.hue) fail(id, 'answer.probeHue != the colour shown at test');
    if (ans.probedCell !== probe.cell) fail(id, 'answer.probedCell != responsePhase.probe.cell');
    // A "changed" probe must not accidentally reuse another star's colour, which
    // would make the trial ambiguous for a child who bound colour to the wrong cell.
    if (derivedKey === 'CHANGED' && huesSeen.has(probe.hue)) fail(id, 'the changed probe colour is already present elsewhere in the array');
    if (derivedKey === 'CHANGED') nChange++;
    else nSame++;

    const optKeys = (rp.options || []).map((o) => o.key);
    if (!deepEq(optKeys.slice().sort(), ['CHANGED', 'SAME'])) fail(id, `options must be exactly SAME and CHANGED (${optKeys})`);
    const rats = ans.distractorRationales || {};
    if (!rats.SAME || !rats.CHANGED) fail(id, 'distractorRationales must cover both option keys');
    else {
      const correctSide = derivedKey;
      const wrongSide = derivedKey === 'SAME' ? 'CHANGED' : 'SAME';
      if (rats[correctSide].lure !== 'correct') fail(id, `option ${correctSide} should be labelled lure:"correct"`);
      const wantedLure = derivedKey === 'CHANGED' ? 'miss' : 'false_alarm';
      if (rats[wrongSide].lure !== wantedLure)
        fail(id, `option ${wrongSide} should be labelled "${wantedLure}" on a ${ans.trialType} trial (got ${rats[wrongSide].lure})`);
    }
    if (!it.scoring.spec.sdtCategory) fail(id, 'change_detection solver must define the signal-detection category');
    // The ORIGINAL colour must not be reachable from the response phase.
    const rpText = JSON.stringify(rp);
    if (rpText.includes(`"${original}"`) && original !== probe.hue)
      fail(id, 'responsePhase exposes the original colour of the probed cell (the memory judgement is bypassable)');
    for (const banned of ['array', 'original', 'trialType', 'correct'])
      if (new RegExp(`"[^"]*${banned}[^"]*"\\s*:`, 'i').test(rpText)) fail(id, `responsePhase leaks a field matching "${banned}"`);
  } else {
    nRecognition++;
    if (rp.mode !== 'select_set') fail(id, 'recognition shell must use a select_set responsePhase');
    if (!deepEq(ans.expectedCells, lit)) fail(id, 'answer.expectedCells != the independently rebuilt lit set');
    if (ans.correctKey !== lit.map((x) => cellLabel(x, g)).join('-')) fail(id, `correctKey does not encode the lit set (${ans.correctKey})`);
    if (rp.selectionsRequired !== c.setSize) fail(id, 'selectionsRequired != setSize');
    const rats = ans.distractorRationales || {};
    if (!rats.correct || !deepEq(rats.correct.cells, lit)) fail(id, 'distractorRationales.correct != the lit set');
    const sigs = new Set();
    for (const [k, r] of Object.entries(rats)) {
      if (!r || typeof r.lure !== 'string' || !Array.isArray(r.cells) || typeof r.note !== 'string') fail(id, `lure "${k}" malformed`);
      const sig = JSON.stringify(r.cells);
      if (sigs.has(sig)) fail(id, `lure "${k}" duplicates another lure's cell set`);
      sigs.add(sig);
      if (k !== 'correct' && deepEq(r.cells, lit)) fail(id, `lure "${k}" is actually the correct set`);
      for (const cc of r.cells) if (!isNum(cc) || cc < 0 || cc >= g * g) fail(id, `lure "${k}" references a cell off the grid`);
    }
    if (Object.keys(rats).length < 3) fail(id, 'expected at least two named lures besides "correct"');
    const rpText = JSON.stringify(rp);
    for (const banned of ['cell', 'array', 'expected', 'hue', 'row', 'col'])
      if (new RegExp(`"[^"]*${banned}[^"]*"\\s*:`, 'i').test(rpText)) fail(id, `responsePhase leaks a stimulus field matching "${banned}"`);
  }

  if (rp.untimed !== true) fail(id, 'the test must be untimed (RT is process, never credited)');
  if (rp.latencyAnchor !== 'test_open') fail(id, 'responsePhase.latencyAnchor must be "test_open"');
  const contentText = JSON.stringify(c);
  for (const banned of ['correctKey', 'expectedCells', 'distractorRationales', 'originalHue', 'trialType'])
    if (contentText.includes(`"${banned}"`)) fail(id, `content leaks answer field "${banned}"`);

  // --- 6. Reproducibility + difficulty derivation.
  try {
    const regen = genItem({
      setSize: lev.setSize, shell: lev.shell, confusable: lev.confusable,
      pressure: lev.pressure, changeTrial: lev.changeTrial, seed: it.provenance.seed,
    });
    if (!deepEq(regen, it)) fail(id, 'item is NOT reproducible from its provenance (grammar drift)');
  } catch (e) {
    fail(id, `regeneration threw: ${e.message}`);
  }
  const derived = round2(difficultyFromLevers(lev.setSize, lev.shell, lev.confusable, lev.pressure));
  if (Math.abs(derived - it.difficulty) > 0.01) fail(id, `difficulty ${it.difficulty} != derived-from-levers ${derived}`);
  if (lev.setSize !== c.setSize || lev.shell !== c.shell || lev.confusable !== (c.identitySet === 'confusable'))
    fail(id, 'provenance.levers disagree with content (difficulty is not explainable from the item)');
}

// d-prime needs both trial types at a usable ratio.
if (nChange + nSame > 0) {
  const ratio = Math.min(nChange, nSame) / Math.max(nChange, nSame);
  if (ratio < 0.8) fail('design', `change/no-change balance is ${nChange}/${nSame} — too skewed to separate sensitivity from bias`);
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
    for (const banned of ['presentation', '.array', 'expectedCells', 'originalHue', 'correctKey', '.answer', 'trialType'])
      if (respond.includes(banned)) fail('renderer', `response-phase region references "${banned}" (stimulus leak into the test UI)`);
    if (!/@lock-release/.test(respond)) fail('renderer', 'response-phase region has no /* @lock-release */ marker');
    if (!/^[ \t]*locked\s*=\s*false\s*;/m.test(respond))
      fail('renderer', 'response-phase region never sets locked=false (SPA-FOLDNET-01 stuck-lock bug)');
  }
  if (!/sealPresentation\s*\(/.test(html)) fail('renderer', 'demo never calls sealPresentation()');
  if (!/locked\s*=\s*true/.test(html)) fail('renderer', 'demo never locks input during the flash');
  for (const needed of ['gt-exam-host', 'gt-exam-demo', "type:'ready'", "type:'result'", "type:'telemetry'"])
    if (!html.includes(needed)) fail('renderer', `demo missing postMessage contract token ${needed}`);
  if (/AudioContext|speechSynthesis|new Audio\(|createOscillator/.test(html))
    fail('renderer', 'demo uses audio — D-017 requires on-screen text only');
  if (/[\u{1F000}-\u{1FAFF}\u{2600}-\u{26FF}\u{2B00}-\u{2BFF}\u{FE0F}]/u.test(html))
    fail('renderer', 'demo contains an emoji/pictograph (house rule: words + common symbols only)');
  if (!/id="status"/.test(html)) fail('renderer', 'demo missing the worded #status line');
  if (!/id="howto"/.test(html)) fail('renderer', 'demo missing the #howto panel');
  if (!/ArrowLeft/.test(html) || !/ArrowRight/.test(html))
    fail('renderer', 'two-choice shell must offer the on-screen keyboard hotkeys (DEMO_REBUILD_GUIDE §7)');
}
checkRenderer();

/* ------------------------------------------------------------------ *
 * 5b. RENDERER SMOKE TEST — both shells driven end to end.
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
  // Buttons declared in markup carry class + data-key; recreate what the demo reads.
  for (const m of html.matchAll(/<button class="([^"]*)" id="([^"]+)" data-key="([^"]+)"/g)) {
    const e = byId.get(m[2]);
    if (e) { e.className = m[1]; e.dataset.key = m[3]; }
  }
  const answers = byId.get('answers');
  if (answers) for (const bid of ['btnSame', 'btnDiff']) { const b = byId.get(bid); if (b && !answers.children.includes(b)) { b.parent = answers; answers.children.push(b); } }
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
async function runShell(html, item, drive, labelHint) {
  const js = html.split('<script>')[1].split('</scr' + 'ipt>')[0];
  const document = makeShimDom(html);
  const posted = [];
  const winListeners = {};
  const realTimeout = setTimeout;
  const win = {
    parent: { postMessage: (msg) => posted.push(msg) },
    addEventListener: (t, f) => ((winListeners[t] = winListeners[t] || []).push(f)),
  };
  const drain = async (n = 140) => { for (let i = 0; i < n; i++) await new Promise((r) => realTimeout(r, 1)); };
  try {
    // eslint-disable-next-line no-new-func
    new Function('window', 'document', 'fetch', 'setTimeout', 'clearTimeout', js)(
      win, document, () => Promise.reject(new Error('no network in the checker')),
      (fn) => realTimeout(fn, 0), (t) => clearTimeout(t),
    );
  } catch (e) {
    fail('smoke', `demo script threw on load: ${e.message}`);
    return null;
  }
  if (!posted.some((m) => m.type === 'ready')) fail('smoke', 'demo never posted {type:"ready"}');
  const send = (msg) => (winListeners.message || []).forEach((f) => f({ data: Object.assign({ source: 'gt-exam-host' }, msg) }));
  send({ type: 'init', item });
  send({ type: 'start' });
  await drain();

  const tele = posted.filter((m) => m.type === 'telemetry').map((m) => m.event);
  if (!tele.some((e) => e.kind === 'array_on')) fail('smoke', `[${labelHint}] the array never flashed`);
  const sealed = tele.find((e) => e.kind === 'presentation_sealed');
  if (!sealed) fail('smoke', `[${labelHint}] the array was never sealed before the test`);
  else if (sealed.reachable !== false) fail('smoke', `[${labelHint}] content.presentation is still reachable after sealing`);
  if (!tele.some((e) => e.kind === 'test_open')) fail('smoke', `[${labelHint}] the test display never opened (input lock likely stuck)`);

  drive(document);
  await drain();
  const results = posted.filter((m) => m.type === 'result');
  if (results.length !== 1) {
    fail('smoke', `[${labelHint}] expected exactly 1 result, got ${results.length} (stuck lock?)`);
    return null;
  }
  return results[0].result;
}
async function smokeTestRenderer() {
  let html;
  try { html = readFileSync(DEMO, 'utf8'); } catch { return; }
  const served = (b) => { const s = JSON.parse(JSON.stringify(b)); delete s.answer; delete s.scoring; delete s.provenance; return s; };
  const cd = items.find((x) => x.content.shell === 'change_detection');
  const rec = items.find((x) => x.content.shell === 'recognition');
  const notes = [];

  if (cd) {
    const r = await runShell(html, served(cd), (doc) => {
      doc.querySelector('#answers').fire('click', { target: doc.querySelector('#btnDiff') });
    }, 'change_detection');
    if (r) {
      if (r.response.selectedKey !== 'CHANGED') fail('smoke', 'two-choice response did not carry the raw selected key');
      if (JSON.stringify(r).includes('"correct"')) fail('smoke', 'result leaks a correctness field');
      for (const k of cd.scoring.clientMetrics) if (!(k in r.metrics)) fail('smoke', `change_detection result.metrics missing declared ${k}`);
      for (const [k, v] of Object.entries(r.metrics))
        if (typeof v !== 'number' || !Number.isFinite(v)) fail('smoke', `metric ${k} is not a finite number (${v})`);
      notes.push(`change_detection: SAME/CHANGED accepted, ${Object.keys(r.metrics).length} numeric metrics`);
    }
  } else fail('smoke', 'bank contains no change_detection item to smoke test');

  if (rec) {
    const n = rec.content.responsePhase.selectionsRequired;
    const r = await runShell(html, served(rec), (doc) => {
      const grid = doc.querySelector('#grid');
      for (let i = 0; i < n; i++) grid.fire('click', { target: grid.children[i] });
    }, 'recognition');
    if (r) {
      if (!Array.isArray(r.response.selectedCells) || r.response.selectedCells.length !== n)
        fail('smoke', 'recognition response did not carry the raw selected set');
      for (const k of rec.scoring.clientMetrics) if (!(k in r.metrics)) fail('smoke', `recognition result.metrics missing declared ${k}`);
      notes.push(`recognition: ${n} cells accepted, ${Object.keys(r.metrics).length} numeric metrics`);
    }
  } else fail('smoke', 'bank contains no recognition item to smoke test');

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

// Set-size ladder at matched levers.
{
  const bySet = new Map();
  for (const it of items) {
    if (it.content.shell !== 'change_detection' || it.content.identitySet !== 'distinct') continue;
    const arr = bySet.get(it.content.setSize) || [];
    arr.push(it.difficulty);
    bySet.set(it.content.setSize, arr);
  }
  const sizes = [...bySet.keys()].sort((a, b) => a - b);
  for (let i = 1; i < sizes.length; i++)
    if (Math.min(...bySet.get(sizes[i])) <= Math.min(...bySet.get(sizes[i - 1])))
      fail('ladder', `set size ${sizes[i]} does not sit above ${sizes[i - 1]} at matched levers`);
}

// ---- Report ----
console.log(`WM-gridflash-01 bank check: ${items.length} items`);
console.log(`difficulty span: ${round2(min)} .. ${round2(max)}`);
console.log(`shells: change_detection ${nChange + nSame} (change ${nChange} / same ${nSame}), recognition ${nRecognition}`);
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
  '\nPASS — array playable and simultaneous, SAME/CHANGED and the lit set independently re-derived from the flash, ' +
    'the original probe colour unreachable from the test UI, renderer seals the array and releases the lock, coverage 1..20 with >=5 per bin/band.',
);
