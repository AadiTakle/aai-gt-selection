// Independent validator for the VER-EVIDENCE-01 structured bank.
//
// Checks (exit nonzero on any failure):
//   1. JSONL parses; every line is a BankItem with EXACTLY the contract key set (§2).
//   2. Served-subset safety: nothing in `content` exposes the key, the proposition
//      tags, the schema, or the lure taxonomy.
//   3. SINGLE-SATISFIABILITY, re-derived here rather than trusted:
//        evidence = the unique sentence asserting the schema's premise tag
//        answer   = the unique option claiming the schema's conclusion tag
//      Both must be unique, and both must match the recorded composite correctKey.
//      No distractor may claim something the passage actually asserts (which would
//      make a second option defensible).
//   4. Lure labels: every selectable key (option or sentence) carries exactly one
//      label from the taxonomy, exactly one 'correct' and one 'evidence-correct',
//      and a 'surface-text-match' option really does echo the passage wording.
//   5. Band density: >=5 items per integer difficulty bucket 1..19, span 1..20.
//   6. D-017: no audio, no K-1 age band, printed passage only.
//
// Run:  node research/exam-question-types/generators/check-VER-EVIDENCE-01.mjs

import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildItem, SCHEMAS, DEPTH_RANK, OPTION_LURES, EVIDENCE_LURES } from './VER-EVIDENCE-01.mjs';
import { lureLabel, normalizeBankItem } from './item-shape.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const BANK = resolve(__dirname, '../banks/VER-EVIDENCE-01.jsonl');
// D-017 raised the floor to grade 2: K-1 is deliberately absent from this list.
const ALLOWED_BANDS = ['2-3', '4-5', '6-8'];
const MIN_PER_BUCKET = 5;
const CONTRACT_KEYS = ['itemId', 'typeCode', 'domain', 'difficulty', 'ageBands', 'demoPath',
  'content', 'answer', 'scoring', 'provenance', 'syntheticOnly', 'validated'];
// NOTE: `key` is NOT a leak here — option/sentence keys are the selection identifiers
// the renderer and the ItemResult are built on (BUILD_PLAN §2). `correctKey` is.
const LEAK_NAMES = /^(answer|answers|correct|correctkey|iscorrect|lure|lures|rationale|rationales|solution|premise|conclusion|schema|facts|claim|claims|sentencefacts|optionclaims|evidencekey|derivation)$/i;
// Field NAMES that would betray an audio feature, and the feature PHRASES a value
// would use. The value pattern is deliberately phrase-level so ordinary passage
// prose (a character who speaks, a quiet room) is not mistaken for a speaker control.
const AUDIO_NAMES = /(\baudio|\bspeech|\bspeak|\butterance|\btts\b|\bsound\b|\bchime|\btones?\b|\bnarrat|\bvoice|\blisten)/i;
const AUDIO_VALUES = /(text[- ]to[- ]speech|speech ?synthesis|speechSynthesis|\btts\b|read[- ]aloud|listen mode|audio (mode|clip|track|narration|button)|play (the )?sound|speaker (button|icon)|narration)/i;

const failures = [];
const fail = (id, msg) => failures.push(`[${id}] ${msg}`);
const isNum = (x) => typeof x === 'number' && Number.isFinite(x);
const deepEq = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const round2 = (x) => Math.round(x * 100) / 100;
// Light stemming so "packed"/"packing" and "cup"/"cups" count as the same echo.
const stem = (w) => w.replace(/(ing|ed|es|s)$/, '');
const words = (s) => s.toLowerCase().replace(/[^a-z\s]/g, ' ').split(/\s+/)
  .filter((w) => w.length > 3).map(stem).filter((w) => w.length > 2);

function walk(node, path, visit) {
  if (node === null || node === undefined) return;
  if (Array.isArray(node)) { node.forEach((v, i) => walk(v, `${path}[${i}]`, visit)); return; }
  if (typeof node === 'object') {
    for (const [k, v] of Object.entries(node)) { visit(k, v, `${path}.${k}`); walk(v, `${path}.${k}`, visit); }
  }
}

// ---- 1. Parse ----
const raw = readFileSync(BANK, 'utf8').trim();
const lines = raw.length ? raw.split('\n') : [];
if (!lines.length) fail('parse', 'bank is empty');
const items = [];
lines.forEach((line, i) => {
  try { items.push(JSON.parse(line)); } catch (e) { fail('parse', `line ${i + 1}: ${e.message}`); }
});

const seenIds = new Set();
let provedUnique = 0;
const depthTally = {};

for (const it of items) {
  const id = it.itemId || '(no id)';

  // ---- contract shape ----
  if (!deepEq(Object.keys(it).sort(), CONTRACT_KEYS.slice().sort())) fail(id, `BankItem keys != contract set (${Object.keys(it).join(',')})`);
  if (typeof it.itemId !== 'string' || !/^[0-9a-f-]{36}$/.test(it.itemId)) fail(id, 'itemId is not a uuid');
  if (seenIds.has(it.itemId)) fail(id, 'duplicate itemId');
  seenIds.add(it.itemId);
  if (it.typeCode !== 'VER-EVIDENCE-01') fail(id, `typeCode != VER-EVIDENCE-01 (${it.typeCode})`);
  if (it.domain !== 'verbal') fail(id, `domain != verbal (${it.domain})`);
  if (!isNum(it.difficulty) || it.difficulty < 1 || it.difficulty > 20) fail(id, `difficulty not a float 1..20 (${it.difficulty})`);
  if (!Array.isArray(it.ageBands) || !it.ageBands.length) fail(id, 'ageBands empty');
  else if (!it.ageBands.every((b) => ALLOWED_BANDS.includes(b))) fail(id, `ageBand outside catalog spec (${it.ageBands}) — D-017 removed K-1 from this type`);
  if (it.demoPath !== 'demos/VER-EVIDENCE-01.html') fail(id, `demoPath wrong (${it.demoPath})`);
  if (it.syntheticOnly !== true) fail(id, 'syntheticOnly must be true');
  if (it.validated !== false) fail(id, 'validated must be false');
  if (!it.scoring || it.scoring.mode !== 'deterministic_key') fail(id, 'scoring.mode != deterministic_key');
  if (!it.provenance || it.provenance.generator !== 'llm') fail(id, 'provenance.generator != llm');
  if (typeof (it.provenance || {}).seed !== 'string') fail(id, 'provenance.seed missing');

  const c = it.content || {};
  const der = (it.provenance || {}).derivation || {};

  // ---- 2. served-subset safety ----
  walk(c, 'content', (k, v, path) => {
    if (LEAK_NAMES.test(k)) fail(id, `content leaks an answer/derivation field at ${path}`);
  });
  const contentJson = JSON.stringify(c);
  if (contentJson.includes(String(it.answer.correctKey))) fail(id, 'content embeds the literal correctKey');
  for (const tag of [der.premise, der.conclusion, der.schema]) {
    if (tag && contentJson.includes(tag)) fail(id, `content embeds the derivation tag "${tag}"`);
  }
  for (const claim of Object.values(der.optionClaims || {})) {
    if (contentJson.includes(claim)) fail(id, `content embeds the option claim tag "${claim}"`);
  }

  // ---- 6. D-017 ----
  walk(it, 'item', (k, v, path) => {
    if (AUDIO_NAMES.test(k)) fail(id, `audio-shaped field at ${path} (D-017 prohibits audio)`);
    if (typeof v === 'string' && AUDIO_VALUES.test(v) && !/no_audio|no narration|never audio|prohibit|printed/i.test(v)) {
      fail(id, `audio-feature value at ${path}: "${v}"`);
    }
  });
  if (c.presentation !== 'text') fail(id, `content.presentation must be 'text' (${c.presentation})`);
  if (c.evidenceMode !== 'single_sentence') fail(id, `evidenceMode must be single_sentence (no picture-panel mode) — got ${c.evidenceMode}`);
  if (!isNum(c.vocabularyLevel) || c.vocabularyLevel < 1 || c.vocabularyLevel > 7) fail(id, 'content.vocabularyLevel missing (M-VOCABLVL not derivable)');

  // ---- structural sanity of the served item ----
  const sents = (c.passage && c.passage.sentences) || [];
  const opts = c.options || [];
  if (sents.length < 3) fail(id, `passage has only ${sents.length} sentences`);
  if (opts.length < 3 || opts.length > 5) fail(id, `option count ${opts.length} outside 3..5`);
  if (new Set(sents.map((s) => s.key)).size !== sents.length) fail(id, 'sentence keys not unique');
  if (new Set(opts.map((o) => o.key)).size !== opts.length) fail(id, 'option keys not unique');
  if (new Set(opts.map((o) => o.text)).size !== opts.length) fail(id, 'two options have identical text');
  for (const o of opts) if (Object.keys(o).sort().join() !== 'key,text') fail(id, `option ${o.key} carries extra fields`);
  if (!c.question || typeof c.question.text !== 'string') fail(id, 'question text missing');

  // ---- 3. SINGLE-SATISFIABILITY, re-derived ----
  const schema = SCHEMAS[der.schema];
  if (!schema) { fail(id, `unknown schema "${der.schema}"`); continue; }
  if (schema.depth !== it.provenance.levers.depth) fail(id, `schema depth ${schema.depth} != recorded depth ${it.provenance.levers.depth}`);
  if (DEPTH_RANK[schema.depth] !== it.provenance.levers.depthRank) fail(id, 'depthRank does not match the schema depth (M-INFDEPTH)');
  depthTally[schema.depth] = (depthTally[schema.depth] || 0) + 1;
  const expectedConclusion = schema.identity ? der.premise : der.conclusion;
  if (der.conclusion !== expectedConclusion) fail(id, `identity schema ${der.schema} must conclude its own premise`);

  const facts = der.sentenceFacts || {};
  if (!deepEq(Object.keys(facts).sort(), sents.map((s) => s.key).sort())) fail(id, 'sentenceFacts do not cover exactly the served sentences');
  const bearing = Object.entries(facts).filter(([, f]) => f.includes(der.premise)).map(([k]) => k);
  const claims = der.optionClaims || {};
  if (!deepEq(Object.keys(claims).sort(), opts.map((o) => o.key).sort())) fail(id, 'optionClaims do not cover exactly the served options');
  const claiming = Object.entries(claims).filter(([, v]) => v === der.conclusion).map(([k]) => k);

  const [ansKey, evKey] = String(it.answer.correctKey).split('+');
  if (!ansKey || !evKey) { fail(id, `correctKey "${it.answer.correctKey}" is not "<option>+<sentence>"`); continue; }

  if (bearing.length !== 1) {
    fail(id, `${bearing.length} sentences assert the premise "${der.premise}" — the evidence is not uniquely justifiable`);
  } else if (bearing[0] !== evKey) {
    fail(id, `evidence re-derives to ${bearing[0]} but the key says ${evKey}`);
  }
  if (claiming.length !== 1) {
    fail(id, `${claiming.length} options claim the conclusion "${der.conclusion}" — more than one answer would be defensible`);
  } else if (claiming[0] !== ansKey) {
    fail(id, `answer re-derives to ${claiming[0]} but the key says ${ansKey}`);
  }
  if (bearing.length === 1 && claiming.length === 1 && bearing[0] === evKey && claiming[0] === ansKey) provedUnique++;

  // A distractor must not be independently supported by the passage.
  const allFacts = new Set(Object.values(facts).flat());
  for (const [k, claim] of Object.entries(claims)) {
    if (k === ansKey) continue;
    if (allFacts.has(claim)) fail(id, `distractor ${k} claims "${claim}", which the passage actually asserts`);
  }
  if (!allFacts.has(der.premise)) fail(id, 'the premise is not asserted anywhere in the passage');

  // ---- 4. lure labels ----
  const rats = it.answer.distractorRationales || {};
  const selectable = [...opts.map((o) => o.key), ...sents.map((s) => s.key)];
  if (!deepEq(Object.keys(rats).sort(), selectable.slice().sort())) {
    fail(id, 'distractorRationales do not cover exactly the selectable keys (M-LURETYPE incomplete)');
  }
  let nCorrect = 0, nEvidence = 0;
  for (const [k, r] of Object.entries(rats)) {
    const isOption = opts.some((o) => o.key === k);
    if (isOption) {
      if (!OPTION_LURES.has(lureLabel(r))) fail(id, `option ${k}: unknown lure "${lureLabel(r)}"`);
      if (r.part !== 'answer') fail(id, `option ${k}: rationale part should be 'answer'`);
      if (lureLabel(r) === 'correct') { nCorrect++; if (k !== ansKey) fail(id, `option ${k} labelled correct but the key is ${ansKey}`); }
      if (lureLabel(r) === 'surface-text-match') {
        const passageWords = new Set(sents.flatMap((s) => words(s.text)));
        const optWords = words((opts.find((o) => o.key === k) || {}).text || '');
        if (!optWords.some((w) => passageWords.has(w))) fail(id, `option ${k} labelled surface-text-match but shares no wording with the passage`);
      }
    } else {
      if (!EVIDENCE_LURES.has(lureLabel(r))) fail(id, `sentence ${k}: unknown lure "${lureLabel(r)}"`);
      if (r.part !== 'evidence') fail(id, `sentence ${k}: rationale part should be 'evidence'`);
      if (lureLabel(r) === 'evidence-correct') { nEvidence++; if (k !== evKey) fail(id, `sentence ${k} labelled evidence-correct but the key is ${evKey}`); }
    }
    if (typeof r.why !== 'string' || r.why.length < 8) fail(id, `rationale ${k} has no usable diagnostic text`);
  }
  if (nCorrect !== 1) fail(id, `${nCorrect} options labelled correct (need exactly 1)`);
  if (nEvidence !== 1) fail(id, `${nEvidence} sentences labelled evidence-correct (need exactly 1)`);
  if (!Object.entries(rats).some(([, r]) => lureLabel(r) === 'plausible-but-unsupported-evidence')) {
    fail(id, 'no strong evidence lure recorded — the evidence step has no near-miss');
  }
  if (!it.scoring.creditWeights || it.scoring.creditWeights.answer + it.scoring.creditWeights.evidence !== 1) {
    fail(id, 'scoring.creditWeights must split full credit between answer and evidence (M-POLY)');
  }

  // ---- reproducibility ----
  try {
    const regen = normalizeBankItem(buildItem(Number(it.provenance.seed)));
    if (!deepEq(regen, it)) fail(id, 'item is NOT reproducible from provenance.seed (generator drift)');
  } catch (e) { fail(id, `regeneration threw: ${e.message}`); }
  if (Math.round(it.difficulty) !== it.provenance.levers.band) fail(id, 'round(difficulty) != recorded band');
}

// ---- 5. Coverage ----
const diffs = items.map((i) => i.difficulty).filter(isNum);
const min = Math.min(...diffs), max = Math.max(...diffs);
if (!(min <= 1.5)) fail('coverage', `min difficulty ${round2(min)} > 1.5`);
if (!(max >= 19.5)) fail('coverage', `max difficulty ${round2(max)} < 19.5`);
const bins = Array.from({ length: 20 }, () => 0);
for (const d of diffs) { const k = Math.round(d); if (k >= 1 && k <= 20) bins[k - 1]++; }
bins.slice(0, 19).forEach((n, i) => { if (n < MIN_PER_BUCKET) fail('coverage', `integer bucket k=${i + 1} has ${n} items (<${MIN_PER_BUCKET})`); });

// Inference depth must actually rise with difficulty, or M-INFDEPTH is noise.
const meanDiffByDepth = {};
for (const it of items) {
  const d = it.provenance.levers.depth;
  (meanDiffByDepth[d] = meanDiffByDepth[d] || []).push(it.difficulty);
}
const depthOrder = ['literal', 'bridging', 'global', 'purpose'];
const means = depthOrder.map((d) => (meanDiffByDepth[d] || []).reduce((a, b) => a + b, 0) / ((meanDiffByDepth[d] || []).length || 1));
for (let i = 1; i < means.length; i++) {
  if (!(means[i] > means[i - 1])) fail('ramp', `mean difficulty for ${depthOrder[i]} (${round2(means[i])}) is not above ${depthOrder[i - 1]} (${round2(means[i - 1])})`);
}

console.log(`VER-EVIDENCE-01 bank check: ${items.length} items`);
console.log(`difficulty span: ${round2(min)} .. ${round2(max)}`);
console.log('per integer bucket (k:n):  ' + bins.map((n, i) => `${String(i + 1).padStart(2)}:${n}`).join(' '));
console.log(`min per-bucket density (1..19): ${Math.min(...bins.slice(0, 19))}`);
console.log('inference depth mix: ' + depthOrder.map((d, i) => `${d} ${(meanDiffByDepth[d] || []).length} (mean diff ${round2(means[i])})`).join(' · '));
console.log(`single-satisfiability: ${provedUnique}/${items.length} items re-derived to exactly one answer and one evidence sentence`);

if (failures.length) {
  console.error(`\nFAIL — ${failures.length} problem(s):`);
  for (const f of failures.slice(0, 40)) console.error('  - ' + f);
  if (failures.length > 40) console.error(`  ... and ${failures.length - 40} more`);
  process.exit(1);
}
console.log('\nPASS — contract keys exact, no answer/derivation data in content, answer and');
console.log('       evidence both re-derived and uniquely satisfiable, distractors never');
console.log('       independently supported, labels checked, no audio and no K-1 (D-017),');
console.log('       coverage 1..20 with >=5 per bucket, depth rises with difficulty.');
