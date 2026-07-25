// Independent validator for the WM-corsi-01 structured bank.
//
// Checks (exit nonzero on any failure):
//   1. JSONL parses; every line is a well-formed BankItem (BUILD_PLAN §2 shape,
//      with EXACTLY the contract's top-level keys).
//   2. Presentation schedule is physically playable (monotone, non-overlapping,
//      distinct cells, timings agree with the declared pace).
//   3. INDEPENDENT RE-DERIVATION: replay the timed schedule the way the renderer
//      would (sort by onset -> cell order), apply the declared mode, and require
//      the result to equal answer.expectedSequence. The declared correctKey and
//      every named lure are re-derived the same way.
//   4. Response-phase isolation: content.responsePhase carries no cell identity
//      and no ordering; the expected response appears ONLY under `answer`.
//   5. Renderer isolation (static scan of demos/WM-corsi-01.html): the marked
//      response-phase region references no presentation identifier, the
//      presentation is sealed before recall, and the input lock is RELEASED at
//      the recall prompt (the SPA-FOLDNET-01 stuck-`locked` bug).
//   5b. Renderer SMOKE TEST: the demo script is executed against a minimal DOM
//      shim, driven through init -> presentation -> recall -> taps, and must
//      actually emit a {type:'result'} postMessage. This is the runtime proof
//      that the presentation lock clears (a stuck lock silently emits nothing).
//   6. Reproducibility from provenance + difficulty derived from levers.
//   7. Coverage: 1..20, >=5 items per integer bin 1..19 and per +/-1 pt band.
//
// Run:  node research/exam-question-types/generators/check-WM-corsi-01.mjs

import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { genItem, difficultyFromLevers, paceMsFromPressure } from './WM-corsi-01.mjs';
import { lureLabel, normalizeBankItem } from './item-shape.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const BANK = resolve(__dirname, '../banks/WM-corsi-01.jsonl');
const DEMO = resolve(__dirname, '../demos/WM-corsi-01.html');
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
 * INDEPENDENT SOLVER — reconstruct what a child actually saw, then what the
 * instruction asks for. This deliberately does NOT read answer.presentedSequence
 * or any generator internal: it replays content.presentation.schedule in wall
 * time, exactly as the renderer must.
 * ------------------------------------------------------------------ */
function replayPresentation(presentation) {
  return presentation.schedule
    .slice()
    .sort((a, b) => a.onsetMs - b.onsetMs)
    .map((s) => s.cell);
}
function expectedFromInstruction(seenOrder, mode) {
  return mode === 'backward' ? seenOrder.slice().reverse() : seenOrder.slice();
}
const cellLabel = (cell, g) => `r${Math.floor(cell / g) + 1}c${(cell % g) + 1}`;

// ---- 2 + 3 + 4. Per-item checks ----
const seenIds = new Set();
for (const it of items) {
  const id = it.itemId || '(no id)';

  const keys = Object.keys(it).sort();
  if (!deepEq(keys, TOP_LEVEL_KEYS.slice().sort()))
    fail(id, `top-level keys != contract set (got ${keys.join(',')})`);

  if (typeof it.itemId !== 'string' || !/^[0-9a-f-]{36}$/.test(it.itemId)) fail(id, 'itemId is not a uuid');
  if (seenIds.has(it.itemId)) fail(id, 'duplicate itemId');
  seenIds.add(it.itemId);

  if (it.typeCode !== 'WM-corsi-01') fail(id, `typeCode != WM-corsi-01 (${it.typeCode})`);
  if (it.domain !== 'spatial') fail(id, `domain != spatial (${it.domain})`);
  if (it.demoPath !== 'demos/WM-corsi-01.html') fail(id, `demoPath wrong (${it.demoPath})`);
  if (!isNum(it.difficulty) || it.difficulty < 1 || it.difficulty > 20)
    fail(id, `difficulty not a float in 1..20 (${it.difficulty})`);
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
  if (!['forward', 'backward'].includes(c.mode)) fail(id, `bad mode (${c.mode})`);
  if (!isNum(c.span) || c.span < 2 || c.span > 9) fail(id, `span out of 2..9 (${c.span})`);

  const p = c.presentation || {};
  const sched = p.schedule;
  if (!Array.isArray(sched) || sched.length !== c.span) {
    fail(id, `schedule length ${sched ? sched.length : 'n/a'} != span ${c.span}`);
    continue;
  }

  // --- 2. The schedule must be physically playable.
  let prevOffset = -1;
  const seenCells = new Set();
  sched.forEach((s, i) => {
    if (!isNum(s.cell) || s.cell < 0 || s.cell >= g * g) fail(id, `step ${i + 1} cell out of grid (${s.cell})`);
    if (s.row !== Math.floor(s.cell / g) || s.col !== s.cell % g) fail(id, `step ${i + 1} row/col disagree with cell`);
    if (s.step !== i + 1) fail(id, `step ${i + 1} mislabelled (${s.step})`);
    if (!isNum(s.onsetMs) || !isNum(s.offsetMs)) fail(id, `step ${i + 1} timings missing`);
    if (s.offsetMs - s.onsetMs !== p.flashDurationMs) fail(id, `step ${i + 1} flash duration != declared`);
    if (s.onsetMs <= prevOffset) fail(id, `step ${i + 1} overlaps the previous flash (no blank gap)`);
    if (i > 0 && s.onsetMs - sched[i - 1].onsetMs !== p.flashDurationMs + p.gapMs)
      fail(id, `step ${i + 1} pace drifts from the declared flash+gap`);
    prevOffset = s.offsetMs;
    if (seenCells.has(s.cell)) fail(id, `cell ${s.cell} flashes twice (Corsi trails use distinct blocks)`);
    seenCells.add(s.cell);
  });
  if (sched[0].onsetMs !== p.leadInMs) fail(id, 'first flash does not start at leadInMs');
  if (p.presentationEndMs !== sched[sched.length - 1].offsetMs) fail(id, 'presentationEndMs != last offset');
  if (!(p.recallOpensAtMs > p.presentationEndMs)) fail(id, 'recall must open strictly after the last flash');
  const lev = (it.provenance && it.provenance.levers) || {};
  const paceExpected = Math.round(paceMsFromPressure(lev.pacePressure));
  if (p.paceMs !== paceExpected) fail(id, `paceMs ${p.paceMs} != pace derived from pacePressure ${paceExpected}`);
  if (p.flashDurationMs + p.gapMs !== paceExpected) fail(id, 'flash + gap != paceMs');

  // --- 3. INDEPENDENT re-derivation of the expected response.
  const seenOrder = replayPresentation(p);
  const expected = expectedFromInstruction(seenOrder, c.mode);
  const ans = it.answer || {};
  if (!deepEq(ans.expectedSequence, expected))
    fail(id, `answer.expectedSequence != independently replayed target (${JSON.stringify(ans.expectedSequence)} vs ${JSON.stringify(expected)})`);
  if (!deepEq(ans.presentedSequence, seenOrder)) fail(id, 'answer.presentedSequence != replayed flash order');
  if (ans.correctKey !== expected.map((x) => cellLabel(x, g)).join('-'))
    fail(id, `correctKey does not encode the re-derived sequence (${ans.correctKey})`);
  if (ans.mode !== c.mode) fail(id, 'answer.mode != content.mode');
  if (c.mode === 'forward' && !deepEq(expected, seenOrder)) fail(id, 'forward target must equal the seen order');
  if (c.mode === 'backward' && !deepEq(expected, seenOrder.slice().reverse()))
    fail(id, 'backward target must equal the reversed seen order');

  // Named lures: each must be a real, distinct, WRONG response; the taxonomy must
  // reconstruct from the re-derived target (not from generator internals).
  const rats = ans.distractorRationales || {};
  if (!rats.correct || !deepEq(rats.correct.sequence, expected)) fail(id, 'distractorRationales.correct != expected sequence');
  if (rats.correct && lureLabel(rats.correct) !== 'correct') fail(id, 'the "correct" entry is not labelled lure:"correct"');
  const lureSigs = new Set();
  for (const [k, r] of Object.entries(rats)) {
    if (!r || typeof lureLabel(r) !== 'string' || !Array.isArray(r.sequence) || typeof r.note !== 'string')
      fail(id, `lure "${k}" malformed`);
    const sig = JSON.stringify(r.sequence);
    if (lureSigs.has(sig)) fail(id, `lure "${k}" duplicates another lure's sequence`);
    lureSigs.add(sig);
    if (k !== 'correct' && deepEq(r.sequence, expected)) fail(id, `lure "${k}" is actually the correct sequence`);
  }
  if (rats.direction_error && !deepEq(rats.direction_error.sequence, expected.slice().reverse()))
    fail(id, 'direction_error lure is not the reversal of the target');
  if (rats.truncated_span && rats.truncated_span.sequence.length !== c.span - 1)
    fail(id, 'truncated_span lure is not one element short');
  if (Object.keys(rats).length < 2) fail(id, 'expected at least one named lure besides "correct"');

  // --- 4. Response-phase isolation inside the ITEM.
  const rp = c.responsePhase || {};
  if (rp.expectedTapCount !== c.span) fail(id, 'responsePhase.expectedTapCount != span');
  if (rp.untimed !== true) fail(id, 'recall must be untimed (motor speed is construct-irrelevant here)');
  if (rp.latencyAnchor !== 'recall_open') fail(id, 'responsePhase.latencyAnchor must be "recall_open"');
  const rpText = JSON.stringify(rp);
  for (const banned of ['cell', 'schedule', 'sequence', 'order', 'row', 'col'])
    if (new RegExp(`"[^"]*${banned}[^"]*"\\s*:`, 'i').test(rpText))
      fail(id, `responsePhase leaks a stimulus field matching "${banned}"`);
  // The expected response must live ONLY under `answer`.
  const contentText = JSON.stringify(c);
  for (const banned of ['expectedSequence', 'correctKey', 'distractorRationales', 'answer'])
    if (contentText.includes(`"${banned}"`)) fail(id, `content leaks answer field "${banned}"`);

  // --- 6. Reproducibility + difficulty derivation.
  try {
    const regen = normalizeBankItem(genItem({
      span: lev.span,
      mode: lev.mode,
      gridSize: lev.gridSize,
      pacePressure: lev.pacePressure,
      seed: it.provenance.seed,
    }));
    if (!deepEq(regen, it)) fail(id, 'item is NOT reproducible from its provenance (grammar drift)');
  } catch (e) {
    fail(id, `regeneration threw: ${e.message}`);
  }
  const derived = round2(difficultyFromLevers(lev.span, lev.mode, lev.gridSize, lev.pacePressure));
  if (Math.abs(derived - it.difficulty) > 0.01) fail(id, `difficulty ${it.difficulty} != derived-from-levers ${derived}`);
  if (lev.span !== c.span || lev.mode !== c.mode || lev.gridSize !== g)
    fail(id, 'provenance.levers disagree with content (difficulty is not explainable from the item)');
}

/* ------------------------------------------------------------------ *
 * 5. RENDERER ISOLATION — static scan of the pure renderer.
 * The response phase must not be able to read the trail, and the input lock the
 * presentation sets MUST be released when recall opens.
 * ------------------------------------------------------------------ */
function checkRenderer() {
  let html;
  try {
    html = readFileSync(DEMO, 'utf8');
  } catch (e) {
    fail('renderer', `cannot read ${DEMO}: ${e.message}`);
    return;
  }
  const region = (name) => {
    const m = html.match(new RegExp(`/\\* @${name}:begin \\*/([\\s\\S]*?)/\\* @${name}:end \\*/`));
    return m ? m[1] : null;
  };
  const respond = region('response-phase');
  if (!respond) {
    fail('renderer', 'demo has no /* @response-phase:begin|end */ region to audit');
  } else {
    // Identifiers that would let the recall UI read the target.
    for (const banned of ['presentation', 'schedule', 'trail', 'presentedSequence', 'expectedSequence', 'correctKey', '.answer'])
      if (respond.includes(banned)) fail('renderer', `response-phase region references "${banned}" (stimulus leak into recall UI)`);
    if (!/@lock-release/.test(respond))
      fail('renderer', 'response-phase region has no /* @lock-release */ marker — the presentation lock may never clear');
    // Anchored so a commented-out release does not satisfy the check.
    if (!/^[ \t]*locked\s*=\s*false\s*;/m.test(respond))
      fail('renderer', 'response-phase region never sets locked=false (SPA-FOLDNET-01 stuck-lock bug)');
  }
  if (!/sealPresentation\s*\(/.test(html)) fail('renderer', 'demo never calls sealPresentation()');
  if (!/locked\s*=\s*true/.test(html)) fail('renderer', 'demo never locks input during presentation');
  for (const needed of ['gt-exam-host', 'gt-exam-demo', "type:'ready'", "type:'result'", "type:'telemetry'"])
    if (!html.includes(needed)) fail('renderer', `demo missing postMessage contract token ${needed}`);
  if (/AudioContext|speechSynthesis|new Audio\(|createOscillator/.test(html))
    fail('renderer', 'demo uses audio — D-017 requires on-screen text only');
  // Emoji/pictograph ban. Check marks, crosses, arrows and the replay glyph are
  // explicitly permitted by DEMO_REBUILD_GUIDE §3b, so the dingbat range stays open.
  if (/[\u{1F000}-\u{1FAFF}\u{2600}-\u{26FF}\u{2B00}-\u{2BFF}\u{FE0F}]/u.test(html))
    fail('renderer', 'demo contains an emoji/pictograph (house rule: words + common symbols only)');
  if (!/id="status"/.test(html)) fail('renderer', 'demo missing the worded #status line');
  if (!/id="howto"/.test(html)) fail('renderer', 'demo missing the #howto panel');
}
checkRenderer();

/* ------------------------------------------------------------------ *
 * 5b. RENDERER SMOKE TEST — run the demo script against a minimal DOM shim.
 * A stuck input lock produces NO result message, which is exactly the
 * SPA-FOLDNET-01 failure mode; this drives the whole item and requires one.
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
  const mk = (id) => { const e = new ShimEl('div'); e.id = id; byId.set(id, e); return e; };
  for (const m of html.matchAll(/id="([^"]+)"/g)) mk(m[1]);
  const all = () => { const out = []; const walk = (e) => { out.push(e); e.children.forEach(walk); }; byId.forEach(walk); return out; };
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
  const document = {
    querySelector: (s) => query(s, true),
    querySelectorAll: (s) => query(s, false),
    createElement: (t) => new ShimEl(t),
    addEventListener: () => {},
    _byId: byId,
  };
  return document;
}
async function smokeTestRenderer() {
  let html;
  try { html = readFileSync(DEMO, 'utf8'); } catch { return; }
  const src = html.split('<script>')[1];
  if (!src) { fail('smoke', 'no inline <script> in the demo'); return; }
  const js = src.split('</scr' + 'ipt>')[0];
  const document = makeShimDom(html);
  const posted = [];
  const winListeners = {};
  const realTimeout = setTimeout;
  const win = {
    parent: { postMessage: (m) => posted.push(m) },
    addEventListener: (t, f) => ((winListeners[t] = winListeners[t] || []).push(f)),
  };
  const fastTimeout = (fn) => realTimeout(fn, 0); // collapse the timed presentation
  const drain = async (n = 120) => { for (let i = 0; i < n; i++) await new Promise((r) => realTimeout(r, 1)); };
  try {
    // eslint-disable-next-line no-new-func
    new Function('window', 'document', 'fetch', 'setTimeout', 'clearTimeout', js)(
      win, document, () => Promise.reject(new Error('no network in the checker')), fastTimeout, () => {},
    );
  } catch (e) {
    fail('smoke', `demo script threw on load: ${e.message}`);
    return;
  }
  if (!posted.some((m) => m.type === 'ready')) fail('smoke', 'demo never posted {type:"ready"}');

  // Drive a real bank item through the host protocol.
  const item = JSON.parse(JSON.stringify(items[0]));
  delete item.answer; delete item.scoring; delete item.provenance; // ServedItem
  const send = (msg) => (winListeners.message || []).forEach((f) => f({ data: Object.assign({ source: 'gt-exam-host' }, msg) }));
  send({ type: 'init', item });
  send({ type: 'start' });
  await drain();

  const tele = posted.filter((m) => m.type === 'telemetry').map((m) => m.event);
  if (!tele.some((e) => e.kind === 'presentation_start')) fail('smoke', 'presentation never started');
  const sealed = tele.find((e) => e.kind === 'presentation_sealed');
  if (!sealed) fail('smoke', 'presentation was never sealed before recall');
  else if (sealed.reachable !== false) fail('smoke', 'content.presentation is still reachable after sealing');
  if (!tele.some((e) => e.kind === 'recall_open')) fail('smoke', 'recall prompt never opened (input lock likely stuck)');

  // Tap the required number of distinct tiles through the real click handler.
  const grid = document.querySelector('#grid');
  const span = item.content.responsePhase.expectedTapCount;
  for (let i = 0; i < span; i++) grid.fire('click', { target: grid.children[i] });
  await drain();

  const results = posted.filter((m) => m.type === 'result');
  if (results.length !== 1) {
    fail('smoke', `expected exactly 1 result message after a complete response, got ${results.length} (stuck lock?)`);
    return;
  }
  const r = results[0].result;
  if (r.itemId !== item.itemId) fail('smoke', 'result.itemId does not match the served item');
  if (!Array.isArray(r.response.tappedCells) || r.response.tappedCells.length !== span)
    fail('smoke', 'result.response.tappedCells does not carry the raw ordered taps');
  for (const leak of ['correct', 'isCorrect', 'score', 'expectedSequence'])
    if (JSON.stringify(r).includes(`"${leak}"`)) fail('smoke', `result leaks a correctness field "${leak}"`);
  const needed = ['M-RT', 'M-RTFIRST', 'M-RTVAR', 'M-REV', 'M-SPAN', 'M-DIFFREACH', 'M-ENGAGE', 'M-RAPIDGUESS'];
  for (const k of needed) if (!(k in r.metrics)) fail('smoke', `result.metrics missing ${k}`);
  for (const [k, v] of Object.entries(r.metrics))
    if (typeof v !== 'number' || !Number.isFinite(v)) fail('smoke', `metric ${k} is not a finite number (${v})`);
  smokeSummary = `smoke test: recall opened, ${span} taps accepted, 1 result emitted with ${Object.keys(r.metrics).length} numeric metrics`;
}
let smokeSummary = 'smoke test: not run';
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
// The ladder must be gradual: no empty integer bin anywhere in 1..20.
for (let k = 1; k <= 20; k++) if (binCounts[k - 1] === 0) fail('coverage', `integer bin k=${k} is EMPTY (ramp has a hole)`);

// Span ladder sanity: difficulty must be monotone in span at matched levers.
{
  const bySpan = new Map();
  for (const it of items) {
    if (it.content.mode !== 'forward' || it.content.grid.rows !== 3) continue;
    const arr = bySpan.get(it.content.span) || [];
    arr.push(it.difficulty);
    bySpan.set(it.content.span, arr);
  }
  const spans = [...bySpan.keys()].sort((a, b) => a - b);
  for (let i = 1; i < spans.length; i++) {
    const lo = Math.min(...bySpan.get(spans[i]));
    const prevLo = Math.min(...bySpan.get(spans[i - 1]));
    if (lo <= prevLo) fail('ladder', `span ${spans[i]} does not sit above span ${spans[i - 1]} at matched levers`);
  }
}

// ---- Report ----
console.log(`WM-corsi-01 bank check: ${items.length} items`);
console.log(`difficulty span: ${round2(min)} .. ${round2(max)}`);
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
  '\nPASS — schedule playable, target independently re-derived from the timed presentation, ' +
    'answer confined to `answer`, renderer seals the trail and releases the lock at recall, coverage 1..20 with >=5 per bin/band.',
);
