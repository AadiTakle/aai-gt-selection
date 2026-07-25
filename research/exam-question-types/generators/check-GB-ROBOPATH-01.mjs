// Independent validator for the GB-ROBOPATH-01 structured bank.
//
// This checker does NOT import the generator and does NOT trust any stored optimum. It
// re-derives solvability and the optimal program from the served world with its OWN search,
// deliberately using a different algorithm from the generator:
//
//   pass 1 - plain unit-cost BFS over turtle states (row, col, heading, keyMask) where every
//            edge is ONE primitive action (F / L / R). The first time the goal state (on the
//            door, all keys collected) is dequeued gives the minimum ACTION count. If the goal
//            is never reached the level is unsolvable and the item fails.
//   pass 2 - BFS over the AUGMENTED state (turtle state, actionsUsedSoFar) where every edge is
//            one program TOKEN, i.e. "apply one command k times" for k = 1..maxReps and each
//            edge costs exactly one token. Restricted to actionsUsed <= optimum, the first goal
//            state reached with actionsUsed == optimum gives the minimum TOKEN count among
//            action-optimal programs. The generator computes the same pair with a lexicographic
//            Dijkstra; agreement of two unrelated searches is the check.
//
// Checks (exit nonzero on any failure):
//   1. JSONL parses; every line is a well-formed BankItem (BUILD_PLAN 2 shape, exact key set).
//   2. Born-synthetic + server/renderable split: content carries NO optimum, program or cost,
//      and the token budget is a pure function of the grid (so it cannot leak solution depth).
//   3. Solvability is 100%, the re-derived (actions, tokens) optimum equals the declared key,
//      and the stored canonical program replays legally (no bump, all keys, ends on the door)
//      at exactly that cost with every repeat count inside the declared instruction set.
//   4. Difficulty is a float 1..20 with >=5 items per integer bin AND per +/-1 pt band, and the
//      solution-depth ramp is monotone across the 20 design rungs.
//
// Run:  node research/exam-question-types/generators/check-GB-ROBOPATH-01.mjs

import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const BANK = resolve(__dirname, '../banks/GB-ROBOPATH-01.jsonl');
const ALLOWED_BANDS = ['K-1', '2-3', '4-5', '6-8'];
const MIN_PER_BAND = 5;
const REQUIRED_KEYS = ['itemId', 'typeCode', 'domain', 'difficulty', 'ageBands', 'demoPath', 'content', 'answer', 'scoring', 'provenance', 'syntheticOnly', 'validated'];

const failures = [];
const fail = (id, msg) => failures.push(`[${id}] ${msg}`);
const isNum = (x) => typeof x === 'number' && Number.isFinite(x);
const round2 = (x) => Math.round(x * 100) / 100;

// ---- turtle world (fresh reimplementation) ----
const HEADINGS = ['N', 'E', 'S', 'W'];
const STEP = { N: [-1, 0], E: [0, 1], S: [1, 0], W: [0, -1] };
const CMDS = ['F', 'L', 'R'];
const turnIdx = (hi, cmd) => (cmd === 'R' ? (hi + 1) % 4 : (hi + 3) % 4);

function worldOf(c) {
  const R = c.grid.R, C = c.grid.C;
  const blocked = new Set((c.walls || []).map(w => w[0] + ',' + w[1]));
  const keyAt = new Map();
  (c.keys || []).forEach((k, i) => keyAt.set(k[0] + ',' + k[1], i));
  return { R, C, blocked, keyAt, nKeys: (c.keys || []).length };
}

// pass 1: minimum primitive actions, plain BFS (every edge = one action).
function minActions(w, start, door) {
  const { R, C, blocked, keyAt, nKeys } = w;
  const nMask = 1 << nKeys, FULL = nMask - 1;
  const id = (r, c, h, m) => (((r * C + c) * 4 + h) * nMask) + m;
  const seen = new Uint8Array(R * C * 4 * nMask);
  const pick = (r, c, m) => { const i = keyAt.get(r + ',' + c); return i === undefined ? m : (m | (1 << i)); };
  const h0 = HEADINGS.indexOf(start.h);
  const s0 = { r: start.r, c: start.c, h: h0, m: pick(start.r, start.c, 0) };
  let frontier = [s0]; seen[id(s0.r, s0.c, s0.h, s0.m)] = 1;
  let depth = 0;
  while (frontier.length) {
    for (const s of frontier) if (s.r === door[0] && s.c === door[1] && s.m === FULL) return depth;
    const next = [];
    for (const s of frontier) {
      for (const cmd of CMDS) {
        let n;
        if (cmd === 'F') {
          const [dr, dc] = STEP[HEADINGS[s.h]];
          const nr = s.r + dr, nc = s.c + dc;
          if (nr < 0 || nr >= R || nc < 0 || nc >= C || blocked.has(nr + ',' + nc)) continue;
          n = { r: nr, c: nc, h: s.h, m: pick(nr, nc, s.m) };
        } else n = { r: s.r, c: s.c, h: turnIdx(s.h, cmd), m: s.m };
        const k = id(n.r, n.c, n.h, n.m);
        if (seen[k]) continue;
        seen[k] = 1; next.push(n);
      }
    }
    frontier = next; depth++;
    if (depth > 4 * R * C * nMask) return null;
  }
  return null;
}

// pass 2: minimum tokens among action-optimal programs; BFS over (state, actionsUsed).
function minTokensAtOptimum(w, start, door, maxReps, optActions) {
  const { R, C, blocked, keyAt, nKeys } = w;
  const nMask = 1 << nKeys, FULL = nMask - 1;
  const A = optActions + 1;
  const id = (r, c, h, m, a) => ((((r * C + c) * 4 + h) * nMask) + m) * A + a;
  const seen = new Uint8Array(R * C * 4 * nMask * A);
  const pick = (r, c, m) => { const i = keyAt.get(r + ',' + c); return i === undefined ? m : (m | (1 << i)); };
  const h0 = HEADINGS.indexOf(start.h);
  const s0 = { r: start.r, c: start.c, h: h0, m: pick(start.r, start.c, 0), a: 0 };
  if (s0.r === door[0] && s0.c === door[1] && s0.m === FULL && optActions === 0) return 0;
  let frontier = [s0]; seen[id(s0.r, s0.c, s0.h, s0.m, 0)] = 1;
  let tokens = 0;
  while (frontier.length) {
    const next = [];
    tokens++;
    for (const s of frontier) {
      for (const cmd of CMDS) {
        let cr = s.r, cc = s.c, ch = s.h, cm = s.m;
        for (let k = 1; k <= maxReps; k++) {
          if (s.a + k > optActions) break;
          if (cmd === 'F') {
            const [dr, dc] = STEP[HEADINGS[ch]];
            const nr = cr + dr, nc = cc + dc;
            if (nr < 0 || nr >= R || nc < 0 || nc >= C || blocked.has(nr + ',' + nc)) break;
            cr = nr; cc = nc; cm = pick(nr, nc, cm);
          } else ch = turnIdx(ch, cmd);
          const a = s.a + k;
          if (cr === door[0] && cc === door[1] && cm === FULL && a === optActions) return tokens;
          const kk = id(cr, cc, ch, cm, a);
          if (seen[kk]) continue;
          seen[kk] = 1; next.push({ r: cr, c: cc, h: ch, m: cm, a });
        }
      }
    }
    frontier = next;
    if (tokens > optActions) return null;
  }
  return null;
}

// Replay a primitive action sequence in the served world.
function replay(w, start, door, seq) {
  const { R, C, blocked } = w;
  let r = start.r, c = start.c, hi = HEADINGS.indexOf(start.h);
  const left = new Set((w.keyList || []).map(k => k[0] + ',' + k[1]));
  left.delete(r + ',' + c);
  for (let i = 0; i < seq.length; i++) {
    const cmd = seq[i];
    if (cmd === 'F') {
      const [dr, dc] = STEP[HEADINGS[hi]];
      const nr = r + dr, nc = c + dc;
      if (nr < 0 || nr >= R || nc < 0 || nc >= C || blocked.has(nr + ',' + nc)) return { ok: false, why: `bump at action ${i + 1}` };
      r = nr; c = nc; left.delete(r + ',' + c);
    } else if (cmd === 'L' || cmd === 'R') hi = turnIdx(hi, cmd);
    else return { ok: false, why: `unknown command "${cmd}"` };
  }
  if (left.size) return { ok: false, why: `${left.size} key(s) never collected` };
  if (r !== door[0] || c !== door[1]) return { ok: false, why: 'does not end on the door' };
  return { ok: true };
}

// ---- 1. Parse ----
const raw = readFileSync(BANK, 'utf8').trim();
const lines = raw.length ? raw.split('\n') : [];
if (lines.length === 0) fail('parse', 'bank is empty');
const items = [];
lines.forEach((line, i) => { try { items.push(JSON.parse(line)); } catch (e) { fail('parse', `line ${i + 1} not valid JSON: ${e.message}`); } });

// ---- 2 + 3. Per-item structure + independent optimum recompute ----
const seenIds = new Set();
let solvable = 0, checked = 0;
const depthByLevel = new Map();
for (const it of items) {
  checked++;
  const id = (it.itemId || '(no id)').slice(0, 8);
  const keys = Object.keys(it);
  for (const k of REQUIRED_KEYS) if (!keys.includes(k)) fail(id, `missing required key "${k}"`);
  for (const k of keys) if (!REQUIRED_KEYS.includes(k)) fail(id, `unexpected top-level key "${k}"`);
  if (typeof it.itemId !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(it.itemId)) fail(id, 'itemId is not a v4-shaped uuid');
  if (seenIds.has(it.itemId)) fail(id, 'duplicate itemId'); seenIds.add(it.itemId);
  if (it.typeCode !== 'GB-ROBOPATH-01') fail(id, `typeCode != GB-ROBOPATH-01 (${it.typeCode})`);
  if (it.domain !== 'spatial') fail(id, `domain != spatial (${it.domain})`);
  if (!isNum(it.difficulty) || it.difficulty < 1 || it.difficulty > 20) fail(id, `difficulty not float 1..20 (${it.difficulty})`);
  if (!Array.isArray(it.ageBands) || it.ageBands.length === 0) fail(id, 'ageBands empty');
  else if (!it.ageBands.every(b => ALLOWED_BANDS.includes(b))) fail(id, `bad ageBand (${it.ageBands})`);
  if (it.demoPath !== 'demos/GB-ROBOPATH-01.html') fail(id, `demoPath wrong (${it.demoPath})`);
  if (it.syntheticOnly !== true) fail(id, 'syntheticOnly must be true');
  if (it.validated !== false) fail(id, 'validated must be false');
  if (!it.scoring || it.scoring.mode !== 'computed_solver') fail(id, 'scoring.mode != computed_solver');
  else if (typeof it.scoring.solverId !== 'string' || !it.scoring.solverId) fail(id, 'scoring.solverId missing');
  if (!it.provenance || it.provenance.generator !== 'grammar') fail(id, 'provenance.generator != grammar');
  if (!it.provenance || typeof it.provenance.seed !== 'string') fail(id, 'provenance.seed missing');

  const c = it.content || {}, a = it.answer || {};
  // no solution data may be reachable from content: scan every nested KEY name.
  const banned = /^(optimal|optimalActions|optimalTokens|canonicalSolution|actionSeq|program|cost|answer|solution|tokenCount|actionCount|correctKey)$/i;
  (function scanKeys(node, path) {
    if (!node || typeof node !== 'object') return;
    if (Array.isArray(node)) { node.forEach((v, i) => scanKeys(v, `${path}[${i}]`)); return; }
    for (const [k, v] of Object.entries(node)) {
      if (banned.test(k)) fail(id, `content leaks a solution field at ${path}.${k}`);
      scanKeys(v, `${path}.${k}`);
    }
  })(c, 'content');
  if (!c.grid || !isNum(c.grid.R) || !isNum(c.grid.C)) { fail(id, 'grid missing'); continue; }
  const R = c.grid.R, C = c.grid.C;
  if (!c.start || !isNum(c.start.r) || !isNum(c.start.c) || !HEADINGS.includes(c.start.h)) { fail(id, 'start missing/invalid'); continue; }
  if (!Array.isArray(c.door) || c.door.length !== 2) { fail(id, 'door missing'); continue; }
  if (!Array.isArray(c.walls) || !Array.isArray(c.keys)) { fail(id, 'walls/keys missing'); continue; }
  const inb = (p) => p[0] >= 0 && p[0] < R && p[1] >= 0 && p[1] < C;
  if (!inb([c.start.r, c.start.c]) || !inb(c.door)) fail(id, 'start/door out of bounds');
  const wallKeys = new Set(c.walls.map(w => w.join(',')));
  if (wallKeys.size !== c.walls.length) fail(id, 'duplicate walls');
  for (const w of c.walls) { if (!inb(w)) fail(id, `wall ${w} out of bounds`); }
  if (wallKeys.has(c.start.r + ',' + c.start.c)) fail(id, 'start sits on a wall');
  if (wallKeys.has(c.door.join(','))) fail(id, 'door sits on a wall');
  for (const k of c.keys) {
    if (!inb(k)) fail(id, `key ${k} out of bounds`);
    if (wallKeys.has(k.join(','))) fail(id, `key ${k} sits on a wall`);
  }
  const iset = c.instructionSet || {};
  if (!Array.isArray(iset.commands) || iset.commands.join(',') !== 'F,L,R') fail(id, 'instructionSet.commands != F,L,R');
  const maxReps = iset.repeat ? iset.repeat.maxReps : 1;
  if (!isNum(maxReps) || maxReps < 1 || maxReps > 4) fail(id, `instructionSet.repeat.maxReps out of range (${maxReps})`);
  if (iset.repeat && iset.repeat.enabled !== (maxReps > 1)) fail(id, 'repeat.enabled inconsistent with maxReps');
  // the token budget must be a pure function of the grid (cannot leak solution depth)
  if (!c.limits || c.limits.maxProgramTokens !== 4 * R * C) fail(id, `limits.maxProgramTokens != 4*R*C (${c.limits && c.limits.maxProgramTokens})`);

  // --- independent optimum ---
  const w = worldOf(c); w.keyList = c.keys;
  const optA = minActions(w, c.start, c.door);
  if (optA === null) { fail(id, 'UNSOLVABLE: no legal program reaches the door with all keys'); continue; }
  solvable++;
  const optT = minTokensAtOptimum(w, c.start, c.door, maxReps, optA);
  if (optT === null) { fail(id, 'token search found no action-optimal program (internal inconsistency)'); continue; }
  if (String(optA) !== a.correctKey) fail(id, `re-derived optimal actions ${optA} != correctKey ${a.correctKey}`);
  if (!a.cost || a.cost.actions !== optA) fail(id, `re-derived optimal actions ${optA} != answer.cost.actions ${a.cost && a.cost.actions}`);
  if (!a.cost || a.cost.tokens !== optT) fail(id, `re-derived optimal tokens ${optT} != answer.cost.tokens ${a.cost && a.cost.tokens}`);
  if (optT > c.limits.maxProgramTokens) fail(id, 'optimal program exceeds the declared token budget');

  // --- stored canonical program must be a legal, cost-exact solution ---
  const cs = a.canonicalSolution || {};
  if (!Array.isArray(cs.program) || !Array.isArray(cs.actionSeq)) fail(id, 'canonicalSolution.program/actionSeq missing');
  else {
    const expanded = [];
    let repsBad = null;
    for (const t of cs.program) {
      if (!CMDS.includes(t.cmd)) repsBad = `bad command "${t.cmd}"`;
      if (!isNum(t.reps) || t.reps < 1 || t.reps > maxReps) repsBad = `reps ${t.reps} outside 1..${maxReps}`;
      for (let i = 0; i < t.reps; i++) expanded.push(t.cmd);
    }
    if (repsBad) fail(id, `canonical program ${repsBad}`);
    if (expanded.join('') !== cs.actionSeq.join('')) fail(id, 'canonical program does not expand to actionSeq');
    if (cs.actionSeq.length !== optA) fail(id, `canonical actionSeq length ${cs.actionSeq.length} != optimum ${optA}`);
    if (cs.program.length !== optT) fail(id, `canonical token count ${cs.program.length} != optimum ${optT}`);
    if (cs.actionCount !== optA || cs.tokenCount !== optT) fail(id, 'canonicalSolution action/token counts disagree with the optimum');
    const rep = replay(w, c.start, c.door, cs.actionSeq);
    if (!rep.ok) fail(id, `canonical program does not solve the world: ${rep.why}`);
  }
  if (!a.acceptedEquivalence || typeof a.acceptedEquivalence.rule !== 'string') fail(id, 'answer.acceptedEquivalence.rule missing');
  if (!Array.isArray(a.distractorRationales) || a.distractorRationales.length === 0) fail(id, 'distractorRationales (response taxonomy) missing');

  const lvl = it.provenance.levers && it.provenance.levers.level;
  if (lvl) { if (!depthByLevel.has(lvl)) depthByLevel.set(lvl, []); depthByLevel.get(lvl).push(optA); }
}

// ---- 4. Coverage + ramp ----
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

const meanDepth = [];
for (let L = 1; L <= 20; L++) {
  const arr = depthByLevel.get(L) || [];
  meanDepth.push(arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0);
}
for (let L = 2; L <= 20; L++) if (meanDepth[L - 1] <= meanDepth[L - 2]) fail('ramp', `mean solution depth did not increase from rung ${L - 1} (${round2(meanDepth[L - 2])}) to ${L} (${round2(meanDepth[L - 1])})`);

// ---- Report ----
console.log(`GB-ROBOPATH-01 bank check: ${items.length} items`);
console.log(`solvability (independently re-searched): ${solvable}/${checked}  ${checked ? Math.round(1000 * solvable / checked) / 10 : 0}%`);
console.log(`difficulty span: ${round2(min)} .. ${round2(max)}`);
console.log('per integer bin (k:n):  ' + binCounts.map((n, i) => `${String(i + 1).padStart(2)}:${n}`).join(' '));
console.log('per +/-1pt band (k:n):  ' + bandCounts.map((n, i) => `${String(i + 1).padStart(2)}:${n}`).join(' '));
console.log('mean optimal actions per rung: ' + meanDepth.map((v, i) => `${i + 1}:${round2(v)}`).join(' '));
if (failures.length) {
  console.error(`\nFAIL - ${failures.length} problem(s):`);
  for (const f of failures.slice(0, 40)) console.error('  - ' + f);
  if (failures.length > 40) console.error(`  ... and ${failures.length - 40} more`);
  process.exit(1);
}
console.log('\nPASS - parses, structure valid, 100% of levels independently re-solved, optimal (actions, tokens) re-derived by two unrelated searches and matched to the declared key, canonical program replays legally at exactly the optimum, no solution data in content, coverage 1..20 with >=5 per bin and per +/-1pt band, monotone depth ramp.');
