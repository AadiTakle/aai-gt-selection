// Independent validator for the WM-bind-01 structured bank.
//
// Checks (exit nonzero on any failure):
//   1. JSONL parses; every line is a well-formed BankItem with EXACTLY the
//      contract's top-level keys (BUILD_PLAN §2).
//   2. The encoding schedule is physically playable and uses distinct creatures
//      in distinct houses, with timings that agree with the declared exposure.
//   3. INDEPENDENT RE-DERIVATION: replay the encoding schedule the way the
//      renderer would and rebuild the creature->house map from scratch; it must
//      equal answer.bindings. correctKey, occupiedCells, encodingOrder and every
//      named lure are re-derived the same way.
//   4. Binding-task isolation: content.creatures and content.responsePhase carry
//      identities ONLY — no cell/row/col — so the tray can be drawn without
//      knowing any location. The answer lives only under `answer`.
//   5. Renderer isolation (static scan) + a RUNTIME SMOKE TEST that drives the
//      demo through init -> encoding -> recall -> placements and requires a
//      {type:'result'} postMessage (a stuck input lock emits nothing — the
//      SPA-FOLDNET-01 failure mode).
//   6. Reproducibility from provenance + difficulty derived from levers.
//   7. Coverage: 1..20, >=5 items per integer bin 1..19 and per +/-1 pt band.
//
// Run:  node research/exam-question-types/generators/check-WM-bind-01.mjs

import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { genItem, difficultyFromLevers, encodeMsFromPressure, retentionDelayFromPressure } from './WM-bind-01.mjs';
import { lureLabel, normalizeBankItem } from './item-shape.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const BANK = resolve(__dirname, '../banks/WM-bind-01.jsonl');
const DEMO = resolve(__dirname, '../demos/WM-bind-01.html');
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
// Binding maps are unordered by construction (scoring is order-free), so compare
// them canonically rather than by key-insertion order.
const canon = (m) => JSON.stringify(Object.keys(m || {}).sort().map((k) => [k, m[k]]));
const mapEq = (a, b) => canon(a) === canon(b);

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
 * INDEPENDENT SOLVER — rebuild the binding map from the timed encoding display.
 * Reads only content.presentation.schedule; never answer.* or generator state.
 * ------------------------------------------------------------------ */
function replayEncoding(presentation) {
  const steps = presentation.schedule.slice().sort((a, b) => a.onsetMs - b.onsetMs);
  const bindings = {};
  const order = [];
  for (const s of steps) {
    bindings[s.creatureId] = s.cell; // a later showing would legitimately overwrite
    order.push(s.creatureId);
  }
  return { bindings, order };
}
const cellLabel = (cell, g) => `r${Math.floor(cell / g) + 1}c${(cell % g) + 1}`;

// ---- 2 + 3 + 4. Per-item checks ----
const seenIds = new Set();
let orderLocationDecoupled = 0;
for (const it of items) {
  const id = it.itemId || '(no id)';

  const keys = Object.keys(it).sort();
  if (!deepEq(keys, TOP_LEVEL_KEYS.slice().sort()))
    fail(id, `top-level keys != contract set (got ${keys.join(',')})`);

  if (typeof it.itemId !== 'string' || !/^[0-9a-f-]{36}$/.test(it.itemId)) fail(id, 'itemId is not a uuid');
  if (seenIds.has(it.itemId)) fail(id, 'duplicate itemId');
  seenIds.add(it.itemId);

  if (it.typeCode !== 'WM-bind-01') fail(id, `typeCode != WM-bind-01 (${it.typeCode})`);
  if (it.domain !== 'spatial') fail(id, `domain != spatial (${it.domain})`);
  if (it.demoPath !== 'demos/WM-bind-01.html') fail(id, `demoPath wrong (${it.demoPath})`);
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
  if (!['distinct', 'confusable'].includes(c.identitySet)) fail(id, `bad identitySet (${c.identitySet})`);

  // Creature tokens: distinct ids, drawable, and NEVER carrying a location.
  const creatures = c.creatures || [];
  if (creatures.length !== c.setSize) fail(id, `creatures ${creatures.length} != setSize ${c.setSize}`);
  const cids = creatures.map((x) => x && x.id);
  if (new Set(cids).size !== cids.length) fail(id, 'creature ids are not unique');
  for (const cr of creatures) {
    if (!cr || typeof cr.shape !== 'string' || typeof cr.hue !== 'string' || typeof cr.mark !== 'string')
      fail(id, 'creature token malformed');
    for (const leak of ['cell', 'row', 'col', 'house'])
      if (cr && Object.prototype.hasOwnProperty.call(cr, leak)) fail(id, `creature token leaks location field "${leak}"`);
  }
  // Confusable sets must actually be confusable (one silhouette, no word label).
  if (c.identitySet === 'confusable') {
    if (new Set(creatures.map((x) => x.shape)).size !== 1) fail(id, 'confusable set does not share one silhouette');
    if (creatures.some((x) => x.label)) fail(id, 'confusable set carries word labels (verbal rehearsal is not blocked)');
  } else if (creatures.some((x) => !x.label)) fail(id, 'distinct set is missing a word label');

  const p = c.presentation || {};
  const sched = p.schedule;
  if (!Array.isArray(sched) || sched.length !== c.setSize) {
    fail(id, `schedule length ${sched ? sched.length : 'n/a'} != setSize ${c.setSize}`);
    continue;
  }

  // --- 2. Playability.
  let prevOffset = -1;
  const usedCells = new Set();
  const shownCreatures = new Set();
  sched.forEach((s, i) => {
    if (!isNum(s.cell) || s.cell < 0 || s.cell >= g * g) fail(id, `step ${i + 1} cell out of grid (${s.cell})`);
    if (s.row !== Math.floor(s.cell / g) || s.col !== s.cell % g) fail(id, `step ${i + 1} row/col disagree with cell`);
    if (s.step !== i + 1) fail(id, `step ${i + 1} mislabelled (${s.step})`);
    if (!cids.includes(s.creatureId)) fail(id, `step ${i + 1} shows an unknown creature (${s.creatureId})`);
    if (s.offsetMs - s.onsetMs !== p.encodeMsPerItem) fail(id, `step ${i + 1} exposure != declared encodeMsPerItem`);
    if (s.onsetMs <= prevOffset) fail(id, `step ${i + 1} overlaps the previous exposure`);
    if (i > 0 && s.onsetMs - sched[i - 1].onsetMs !== p.encodeMsPerItem + p.gapMs)
      fail(id, `step ${i + 1} pace drifts from the declared exposure+gap`);
    prevOffset = s.offsetMs;
    if (usedCells.has(s.cell)) fail(id, `house ${s.cell} is used twice (bindings must be one-to-one)`);
    if (shownCreatures.has(s.creatureId)) fail(id, `creature ${s.creatureId} is shown twice`);
    usedCells.add(s.cell);
    shownCreatures.add(s.creatureId);
  });
  if (shownCreatures.size !== c.setSize) fail(id, 'not every creature was given a house during encoding');
  if (sched[0].onsetMs !== p.leadInMs) fail(id, 'first exposure does not start at leadInMs');
  if (p.presentationEndMs !== sched[sched.length - 1].offsetMs) fail(id, 'presentationEndMs != last offset');
  if (p.recallOpensAtMs !== p.presentationEndMs + p.retentionDelayMs + 450)
    fail(id, 'recallOpensAtMs does not equal presentationEnd + retentionDelay + the recall cue');
  const lev = (it.provenance && it.provenance.levers) || {};
  if (p.encodeMsPerItem !== encodeMsFromPressure(lev.pressure)) fail(id, 'encodeMsPerItem != value derived from pressure');
  if (p.retentionDelayMs !== retentionDelayFromPressure(lev.pressure)) fail(id, 'retentionDelayMs != value derived from pressure');

  // --- 3. INDEPENDENT re-derivation.
  const { bindings: reBindings, order: reOrder } = replayEncoding(p);
  const ans = it.answer || {};
  if (!mapEq(ans.bindings, reBindings))
    fail(id, `answer.bindings != independently replayed encoding (${JSON.stringify(ans.bindings)} vs ${JSON.stringify(reBindings)})`);
  if (!deepEq(ans.encodingOrder, reOrder)) fail(id, 'answer.encodingOrder != replayed exposure order');
  const reOccupied = Object.values(reBindings).sort((a, b) => a - b);
  if (!deepEq(ans.occupiedCells, reOccupied)) fail(id, 'answer.occupiedCells != the houses actually used');
  const reKey = creatures.map((cr) => `${cr.id}@${cellLabel(reBindings[cr.id], g)}`).join('|');
  if (ans.correctKey !== reKey) fail(id, `correctKey does not encode the re-derived bindings (${ans.correctKey})`);

  // Serial position and location must not be confounded: scoring is order-free,
  // so at least some items must present houses out of spatial order.
  const cellsInOrder = reOrder.map((cid) => reBindings[cid]);
  const monotone = cellsInOrder.every((v, i) => i === 0 || v > cellsInOrder[i - 1]) ||
    cellsInOrder.every((v, i) => i === 0 || v < cellsInOrder[i - 1]);
  if (!monotone) orderLocationDecoupled++;

  // Named lures: real, distinct, wrong binding maps, re-derived from the replay.
  const rats = ans.distractorRationales || {};
  if (!rats.correct || !mapEq(rats.correct.bindings, reBindings)) fail(id, 'distractorRationales.correct != re-derived bindings');
  if (rats.correct && lureLabel(rats.correct) !== 'correct') fail(id, 'the "correct" entry is not labelled lure:"correct"');
  const sigs = new Set();
  for (const [k, r] of Object.entries(rats)) {
    if (!r || typeof lureLabel(r) !== 'string' || !r.bindings || typeof r.note !== 'string') fail(id, `lure "${k}" malformed`);
    const sig = canon(r.bindings);
    if (sigs.has(sig)) fail(id, `lure "${k}" duplicates another lure's binding map`);
    sigs.add(sig);
    if (k !== 'correct' && mapEq(r.bindings, reBindings)) fail(id, `lure "${k}" is actually the correct map`);
    for (const cid of Object.keys(r.bindings || {}))
      if (!cids.includes(cid)) fail(id, `lure "${k}" references an unknown creature (${cid})`);
  }
  if (rats.swap_confusable_pair) {
    // A swap must preserve the occupied-house multiset and flip exactly one pair.
    const m = rats.swap_confusable_pair.bindings;
    const wrong = cids.filter((cid) => m[cid] !== reBindings[cid]);
    if (wrong.length !== 2) fail(id, `swap lure changes ${wrong.length} placements (want exactly 2)`);
    else if (!(m[wrong[0]] === reBindings[wrong[1]] && m[wrong[1]] === reBindings[wrong[0]]))
      fail(id, 'swap lure is not a true exchange of two houses');
  }
  if (rats.lost_location) {
    const m = rats.lost_location.bindings;
    const off = cids.filter((cid) => !reOccupied.includes(m[cid]));
    if (off.length !== 1) fail(id, `lost_location lure puts ${off.length} creatures in never-used houses (want exactly 1)`);
  }
  if (rats.rotated_identities) {
    const m = rats.rotated_identities.bindings;
    const used = Object.values(m).sort((a, b) => a - b);
    if (!deepEq(used, reOccupied)) fail(id, 'rotated_identities lure does not reuse exactly the occupied houses');
    if (cids.some((cid) => m[cid] === reBindings[cid])) fail(id, 'rotated_identities lure leaves a creature correctly bound');
  }
  if (Object.keys(rats).length < 3) fail(id, 'expected at least two named lures besides "correct"');

  // --- 4. Response-phase isolation inside the ITEM.
  const rp = c.responsePhase || {};
  if (rp.placementsRequired !== c.setSize) fail(id, 'responsePhase.placementsRequired != setSize');
  if (rp.untimed !== true) fail(id, 'recall must be untimed');
  if (rp.latencyAnchor !== 'recall_open') fail(id, 'responsePhase.latencyAnchor must be "recall_open"');
  if (!Array.isArray(rp.trayOrder) || rp.trayOrder.length !== c.setSize) fail(id, 'trayOrder does not list every creature');
  else if (!deepEq(rp.trayOrder.slice().sort(), cids.slice().sort())) fail(id, 'trayOrder is not the creature set');
  // The tray order must not simply re-expose the encoding order.
  if (deepEq(rp.trayOrder, reOrder) && c.setSize >= 4) fail(id, 'trayOrder replays the encoding order (serial-position leak)');
  const rpText = JSON.stringify(rp);
  for (const banned of ['cell', 'row', 'col', 'house', 'schedule', 'binding'])
    if (new RegExp(`"[^"]*${banned}[^"]*"\\s*:`, 'i').test(rpText)) fail(id, `responsePhase leaks a location field matching "${banned}"`);
  const contentText = JSON.stringify(c);
  for (const banned of ['bindings', 'correctKey', 'distractorRationales', 'occupiedCells', 'encodingOrder'])
    if (contentText.includes(`"${banned}"`)) fail(id, `content leaks answer field "${banned}"`);

  // --- 6. Reproducibility + difficulty derivation.
  try {
    const regen = normalizeBankItem(genItem({
      setSize: lev.setSize, gridSize: lev.gridSize, confusable: lev.confusable, pressure: lev.pressure, seed: it.provenance.seed,
    }));
    if (!deepEq(regen, it)) fail(id, 'item is NOT reproducible from its provenance (grammar drift)');
  } catch (e) {
    fail(id, `regeneration threw: ${e.message}`);
  }
  const derived = round2(difficultyFromLevers(lev.setSize, lev.gridSize, lev.confusable, lev.pressure));
  if (Math.abs(derived - it.difficulty) > 0.01) fail(id, `difficulty ${it.difficulty} != derived-from-levers ${derived}`);
  if (lev.setSize !== c.setSize || lev.gridSize !== g || lev.confusable !== (c.identitySet === 'confusable'))
    fail(id, 'provenance.levers disagree with content (difficulty is not explainable from the item)');
}
if (items.length && orderLocationDecoupled / items.length < 0.5)
  fail('design', `only ${orderLocationDecoupled}/${items.length} items present houses out of spatial order — serial position and location are confounded`);

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
    for (const banned of ['presentation', 'schedule', 'bindings', 'encodingOrder', 'occupiedCells', 'correctKey', '.answer'])
      if (respond.includes(banned)) fail('renderer', `response-phase region references "${banned}" (stimulus leak into the recall UI)`);
    if (!/@lock-release/.test(respond)) fail('renderer', 'response-phase region has no /* @lock-release */ marker');
    if (!/^[ \t]*locked\s*=\s*false\s*;/m.test(respond))
      fail('renderer', 'response-phase region never sets locked=false (SPA-FOLDNET-01 stuck-lock bug)');
  }
  if (!/sealPresentation\s*\(/.test(html)) fail('renderer', 'demo never calls sealPresentation()');
  if (!/locked\s*=\s*true/.test(html)) fail('renderer', 'demo never locks input during encoding');
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
 * 5b. RENDERER SMOKE TEST — execute the demo against a minimal DOM shim and
 * drive a whole item. A stuck input lock emits no result, which is exactly the
 * bug this guards against.
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
  return {
    querySelector: (s) => query(s, true),
    querySelectorAll: (s) => query(s, false),
    createElement: (t) => new ShimEl(t),
    addEventListener: () => {},
  };
}
let smokeSummary = 'smoke test: not run';
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
    parent: { postMessage: (msg) => posted.push(msg) },
    addEventListener: (t, f) => ((winListeners[t] = winListeners[t] || []).push(f)),
  };
  const drain = async (n = 140) => { for (let i = 0; i < n; i++) await new Promise((r) => realTimeout(r, 1)); };
  try {
    // eslint-disable-next-line no-new-func
    new Function('window', 'document', 'fetch', 'setTimeout', 'clearTimeout', js)(
      win, document, () => Promise.reject(new Error('no network in the checker')), (fn) => realTimeout(fn, 0), () => {},
    );
  } catch (e) {
    fail('smoke', `demo script threw on load: ${e.message}`);
    return;
  }
  if (!posted.some((m) => m.type === 'ready')) fail('smoke', 'demo never posted {type:"ready"}');

  const item = JSON.parse(JSON.stringify(items[0]));
  delete item.answer; delete item.scoring; delete item.provenance; // ServedItem
  const send = (msg) => (winListeners.message || []).forEach((f) => f({ data: Object.assign({ source: 'gt-exam-host' }, msg) }));
  send({ type: 'init', item });
  send({ type: 'start' });
  await drain();

  const tele = posted.filter((m) => m.type === 'telemetry').map((m) => m.event);
  if (!tele.some((e) => e.kind === 'presentation_start')) fail('smoke', 'encoding never started');
  const sealed = tele.find((e) => e.kind === 'presentation_sealed');
  if (!sealed) fail('smoke', 'encoding display was never sealed before recall');
  else if (sealed.reachable !== false) fail('smoke', 'content.presentation is still reachable after sealing');
  if (!tele.some((e) => e.kind === 'recall_open')) fail('smoke', 'recall prompt never opened (input lock likely stuck)');

  // Place every creature: tap the tray token, then tap a free house.
  const tray = document.querySelector('#tray');
  const grid = document.querySelector('#grid');
  const n = item.content.responsePhase.placementsRequired;
  for (let i = 0; i < n; i++) {
    const token = tray.children[i];
    if (!token) { fail('smoke', `tray did not render creature ${i + 1} at the recall prompt`); return; }
    tray.fire('click', { target: token });
    grid.fire('click', { target: grid.children[i] });
  }
  await drain();

  const results = posted.filter((m) => m.type === 'result');
  if (results.length !== 1) {
    fail('smoke', `expected exactly 1 result message after a complete response, got ${results.length} (stuck lock?)`);
    return;
  }
  const r = results[0].result;
  if (r.itemId !== item.itemId) fail('smoke', 'result.itemId does not match the served item');
  if (!r.response || Object.keys(r.response.placements || {}).length !== n)
    fail('smoke', 'result.response.placements does not carry every raw placement');
  for (const leak of ['correct', 'isCorrect', 'score', 'bindings'])
    if (JSON.stringify(r).includes(`"${leak}"`)) fail('smoke', `result leaks a correctness field "${leak}"`);
  const needed = ['M-SPAN', 'M-DIFFREACH', 'M-RT', 'M-RTFIRST', 'M-RTVAR', 'M-REV', 'M-PATH', 'M-ENGAGE', 'M-RAPIDGUESS'];
  for (const k of needed) if (!(k in r.metrics)) fail('smoke', `result.metrics missing ${k}`);
  for (const [k, v] of Object.entries(r.metrics))
    if (typeof v !== 'number' || !Number.isFinite(v)) fail('smoke', `metric ${k} is not a finite number (${v})`);
  smokeSummary = `smoke test: recall opened, ${n} placements accepted, 1 result emitted with ${Object.keys(r.metrics).length} numeric metrics`;
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

// Set-size ladder: at matched levers, more bindings must sit higher.
{
  const bySet = new Map();
  for (const it of items) {
    if (it.content.identitySet !== 'distinct' || it.content.grid.rows !== 3) continue;
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
console.log(`WM-bind-01 bank check: ${items.length} items`);
console.log(`difficulty span: ${round2(min)} .. ${round2(max)}`);
console.log('per integer bin (k:n):  ' + binCounts.map((n, i) => `${String(i + 1).padStart(2)}:${n}`).join(' '));
console.log('per +/-1pt band (k:n):  ' + bandCounts.map((n, i) => `${String(i + 1).padStart(2)}:${n}`).join(' '));
console.log(`min per-bin density (k=1..19): ${Math.min(...binCounts.slice(0, 19))}`);
console.log(`order/location decoupled in ${orderLocationDecoupled}/${items.length} items`);
console.log(smokeSummary);

if (failures.length) {
  console.error(`\nFAIL — ${failures.length} problem(s):`);
  for (const f of failures.slice(0, 40)) console.error('  - ' + f);
  if (failures.length > 40) console.error(`  ... and ${failures.length - 40} more`);
  process.exit(1);
}
console.log(
  '\nPASS — encoding schedule playable, bindings independently re-derived from the timed display, ' +
    'tray carries identities only, renderer seals the display and releases the lock at recall, coverage 1..20 with >=5 per bin/band.',
);
