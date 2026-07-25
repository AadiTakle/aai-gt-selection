#!/usr/bin/env node
/**
 * audit_banks.mjs — one authoritative, repeatable cross-bank audit for every
 * generated question bank in `research/exam-question-types/banks/*.jsonl`.
 *
 * Each question type ships its own per-type checker, and those checkers do not
 * agree with each other (most visibly on what "adequate difficulty coverage"
 * means). This script is the single definition of record. It never writes to
 * the repository: generators are re-run inside a throwaway sandbox copy.
 *
 * Run:   node research/exam-question-types/qa/audit_banks.mjs
 * Docs:  research/exam-question-types/qa/AUDIT_BANKS.md
 *
 * Exit code: 0 when every bank passes, 1 when any bank FAILs (warnings alone
 * do not fail the run), 2 on an auditor-level error.
 */

import { createHash } from 'node:crypto';
import {
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  realpathSync,
  rmSync,
  statSync,
} from 'node:fs';
import { spawnSync } from 'node:child_process';
import { dirname, join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '..');

// --- Governing constants -----------------------------------------------------

/**
 * THE difficulty rule, stated once. "difficulty is a float 1-20, minimum 5
 * questions in any +/-1 pt range": for every point x in [1, 20], the number of
 * items with |difficulty - x| <= 1 must be at least MIN_WINDOW_COUNT.
 *
 * This is a SLIDING window two points wide. It is NOT "5 items per integer
 * bucket" (a one-point-wide bin), which is strictly harder to satisfy. The
 * integer-bin figure is computed too, but only ever as advisory context.
 */
const WINDOW_RADIUS = 1;
const MIN_WINDOW_COUNT = 5;
const WINDOW_GRID_STEP = 0.05;
const DIFFICULTY_MIN = 1;
const DIFFICULTY_MAX = 20;

/** BankItem keys. `demoPath` became required under D-021 — see AUDIT_BANKS.md. */
const REQUIRED_ITEM_KEYS = [
  'itemId',
  'typeCode',
  'domain',
  'difficulty',
  'ageBands',
  'demoPath',
  'content',
  'answer',
  'scoring',
  'provenance',
  'syntheticOnly',
  'validated',
];
const OPTIONAL_ITEM_KEYS = [];

const DOMAINS = ['fluid_reasoning', 'verbal', 'quantitative', 'spatial'];
const AGE_BANDS = ['K-1', '2-3', '4-5', '6-8'];
const SCORING_MODES = ['deterministic_key', 'computed_solver', 'proxy_bank', 'model_judge_deferred'];
const GENERATOR_KINDS = ['grammar', 'llm', 'human'];
// 11 catalog type_ids use a lowercase mnemonic (`WM-bind-01`, `CX-achieve-02`,
// `CX-sjt-01`, ...), so the middle segment must not be [A-Z0-9] only. Requiring
// uppercase rejected every item of those banks and was the single largest source
// of schema FAILs here. Matches the contracts `questionTypeCodeSchema`.
const TYPE_CODE_RE = /^[A-Z]+-[A-Za-z0-9]+-\d+$/;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** Answer-key vocabulary (contracts `lureClassSchema`) — must not reach `content`. */
const LURE_VOCAB = new Set([
  'correct',
  'incorrect',
  'associate',
  'surface_match',
  'reversed_relation',
  'local_fit',
  'global_mismatch',
  'rule_violation',
  'near_order',
  'distractor_other',
]);

/** Content field names that expose answer-key material. */
const LEAKY_KEY_RE =
  /^(answer|answers|answerkey|correct|correctkey|correctindex|correctoption|correctanswer|iscorrect|solution|solutions|solutionpath|solved|lure|lureclass|lures|misconception|misconceptions|distractor|distractors|distractorrationale|distractorrationales|rationale|rationales|explanation|why)$/i;

/**
 * Content field names that look answer-adjacent but are legitimately part of
 * the stimulus. `key` is an option's display label (the child sees "A"/"B"/…);
 * `target` is the goal state the child is asked to reach.
 */
const LEAK_ALLOWED_KEYS = new Set(['key', 'keys', 'target', 'targetarea', 'targetratio', 'targetvalue']);

/** Ceiling-integrity band edges and effect thresholds. */
const CEILING_HIGH_MIN = 16;
const CEILING_LOW_MAX = 8;
const CEILING_MIN_BAND_N = 8;
const CEILING_MIN_EFFECT = 0.5;
const CEILING_MAX_P = 0.05;
const PERMUTATIONS = 4000;

/** Duplicate-rate above which a bank FAILs rather than WARNs. */
const DUP_FAIL_RATE = 0.05;

/** Share of pick-one items with a single distractor lure label that WARNs. */
const UNIFORM_LURE_WARN_RATE = 0.5;

const GENERATOR_TIMEOUT_MS = 180_000;

// --- Tiny helpers ------------------------------------------------------------

const PASS = 'pass';
const WARN = 'warn';
const FAIL = 'fail';
const NA = 'n/a';

const RANK = { [PASS]: 0, [NA]: 0, [WARN]: 1, [FAIL]: 2 };
const worst = (a, b) => (RANK[b] > RANK[a] ? b : a);

function check(status, summary, details = []) {
  return { status, summary, details };
}

function canonical(value) {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === 'object') {
    const out = {};
    for (const k of Object.keys(value).sort()) out[k] = canonical(value[k]);
    return out;
  }
  return value;
}

const fingerprint = (value) =>
  createHash('sha256').update(JSON.stringify(canonical(value))).digest('hex').slice(0, 16);

const pct = (n, d) => (d === 0 ? '0%' : `${((100 * n) / d).toFixed(1)}%`);
const round = (x, n = 2) => Number(x.toFixed(n));

function plural(n, one, many = `${one}s`) {
  return `${n} ${n === 1 ? one : many}`;
}

/** First `limit` entries, with a "+N more" tail so detail blocks stay readable. */
function sample(list, limit = 5) {
  if (list.length <= limit) return list;
  return [...list.slice(0, limit), `… +${list.length - limit} more`];
}

// --- Loading -----------------------------------------------------------------

function loadJsonl(path) {
  const items = [];
  const errors = [];
  const text = readFileSync(path, 'utf8');
  const lines = text.split('\n');
  lines.forEach((line, i) => {
    if (!line.trim()) return;
    try {
      items.push(JSON.parse(line));
    } catch (err) {
      errors.push(`line ${i + 1}: ${err.message}`);
    }
  });
  return { items, errors };
}

function loadCatalog(catalogPath) {
  const byType = new Map();
  const anomalies = [];
  if (!existsSync(catalogPath)) return { byType, anomalies: ['catalog file not found'] };
  const { items, errors } = loadJsonl(catalogPath);
  for (const e of errors) anomalies.push(`master_types.jsonl ${e}`);
  for (const spec of items) {
    const declared = Array.isArray(spec.age_bands) ? spec.age_bands : [];
    const valid = declared.filter((b) => AGE_BANDS.includes(b));
    const invalid = declared.filter((b) => !AGE_BANDS.includes(b));
    if (invalid.length) {
      anomalies.push(
        `${spec.type_id}: catalog declares age band(s) ${invalid.join(', ')} outside the contract enum ` +
          `[${AGE_BANDS.join(', ')}]; ignored when reconciling that type`,
      );
    }
    byType.set(spec.type_id, {
      typeId: spec.type_id,
      name: spec.name,
      areas: Array.isArray(spec.areas) ? spec.areas : [],
      ageBands: valid,
      rawAgeBands: declared,
      demoPath: spec.demo_path,
    });
  }
  return { byType, anomalies };
}

// --- Check 1: difficulty coverage -------------------------------------------

/**
 * Sliding-window coverage. Sampling x on a fine grid is exact for this
 * predicate: the window count only changes at x = d +/- 1 for some item
 * difficulty d, so a grid finer than the smallest such gap cannot step over a
 * dip. The grid is also clamped to include every such breakpoint.
 */
function difficultyCoverage(difficulties) {
  const sorted = [...difficulties].sort((a, b) => a - b);
  const xs = new Set();
  for (let x = DIFFICULTY_MIN; x <= DIFFICULTY_MAX + 1e-9; x += WINDOW_GRID_STEP) {
    xs.add(Math.min(DIFFICULTY_MAX, round(x, 4)));
  }
  xs.add(DIFFICULTY_MIN);
  xs.add(DIFFICULTY_MAX);
  // Exact breakpoints: the count can only drop immediately past d + radius and
  // immediately before d - radius.
  for (const d of sorted) {
    for (const edge of [d - WINDOW_RADIUS, d + WINDOW_RADIUS]) {
      for (const eps of [-1e-6, 0, 1e-6]) {
        const x = round(edge + eps, 6);
        if (x >= DIFFICULTY_MIN && x <= DIFFICULTY_MAX) xs.add(x);
      }
    }
  }

  const countAt = (x) => {
    // sorted; small banks, a linear scan is plenty and avoids off-by-one risk.
    let n = 0;
    for (const d of sorted) if (Math.abs(d - x) <= WINDOW_RADIUS + 1e-9) n += 1;
    return n;
  };

  let min = Infinity;
  let minAt = DIFFICULTY_MIN;
  let interiorMin = Infinity;
  let interiorMinAt = null;
  for (const x of [...xs].sort((a, b) => a - b)) {
    const n = countAt(x);
    if (n < min) {
      min = n;
      minAt = x;
    }
    // "Interior" excludes the region where a full-width window would have to
    // reach outside 1..20 for items that cannot exist.
    if (x >= DIFFICULTY_MIN + WINDOW_RADIUS && x <= DIFFICULTY_MAX - WINDOW_RADIUS && n < interiorMin) {
      interiorMin = n;
      interiorMinAt = x;
    }
  }
  return { min, minAt, interiorMin, interiorMinAt };
}

/** Advisory only: the stricter one-point-wide integer bin. 20 folds into bin 19. */
function integerBins(difficulties) {
  const bins = new Array(DIFFICULTY_MAX).fill(0);
  for (const d of difficulties) {
    let b = Math.floor(d);
    if (b >= DIFFICULTY_MAX) b = DIFFICULTY_MAX - 1;
    if (b >= DIFFICULTY_MIN) bins[b] += 1;
  }
  let min = Infinity;
  let minAt = DIFFICULTY_MIN;
  for (let b = DIFFICULTY_MIN; b <= DIFFICULTY_MAX - 1; b += 1) {
    if (bins[b] < min) {
      min = bins[b];
      minAt = b;
    }
  }
  return { bins, min, minAt, label: `[${minAt}, ${minAt + 1})` };
}

function checkDifficulty(items) {
  const difficulties = items.map((it) => it.difficulty).filter((d) => typeof d === 'number' && Number.isFinite(d));
  if (!difficulties.length) return check(FAIL, 'no numeric difficulty values');

  const cov = difficultyCoverage(difficulties);
  const bins = integerBins(difficulties);
  const span = `span ${round(Math.min(...difficulties))}..${round(Math.max(...difficulties))}`;
  const details = [];

  const endpointLimited = cov.min < cov.interiorMin;
  details.push(
    `BINDING RULE (sliding +/-${WINDOW_RADIUS}pt window, need >= ${MIN_WINDOW_COUNT}): ` +
      `worst window = ${cov.min} items, centred at difficulty ~${round(cov.minAt)}`,
  );
  details.push(
    `interior worst (x in [${DIFFICULTY_MIN + WINDOW_RADIUS}, ${DIFFICULTY_MAX - WINDOW_RADIUS}], full-width ` +
      `window): ${cov.interiorMin} items at difficulty ~${round(cov.interiorMinAt)}`,
  );
  if (endpointLimited) {
    details.push(
      `note: the worst window sits in the ${DIFFICULTY_MIN}..${DIFFICULTY_MIN + WINDOW_RADIUS} / ` +
        `${DIFFICULTY_MAX - WINDOW_RADIUS}..${DIFFICULTY_MAX} margin, where the window is half-width because ` +
        `no items can exist outside ${DIFFICULTY_MIN}..${DIFFICULTY_MAX}. That is expected geometry, not a defect.`,
    );
  }
  details.push(
    `ADVISORY ONLY (stricter, NON-BINDING one-point integer bin): worst bin = ${bins.min} items in ` +
      `${bins.label}. Do not read this as the coverage rule.`,
  );
  details.push(`${span}, ${plural(difficulties.length, 'item')}`);

  const status = cov.min >= MIN_WINDOW_COUNT ? PASS : FAIL;
  const summary = `${cov.min}@~${round(cov.minAt)}`;
  return { ...check(status, summary, details), windowMin: cov.min, windowMinAt: cov.minAt, binMin: bins.min };
}

// --- Check 2: schema conformance --------------------------------------------

function checkSchema(items, typeCode) {
  const problems = [];
  const missingKeyCounts = new Map();
  const extraKeyCounts = new Map();
  const seenIds = new Map();
  let withDemoPath = 0;

  items.forEach((item, i) => {
    const where = `item ${i + 1}`;
    if (!item || typeof item !== 'object' || Array.isArray(item)) {
      problems.push(`${where}: not a JSON object`);
      return;
    }
    const keys = Object.keys(item);
    for (const k of REQUIRED_ITEM_KEYS) {
      if (!(k in item)) missingKeyCounts.set(k, (missingKeyCounts.get(k) || 0) + 1);
    }
    for (const k of keys) {
      if (!REQUIRED_ITEM_KEYS.includes(k) && !OPTIONAL_ITEM_KEYS.includes(k)) {
        extraKeyCounts.set(k, (extraKeyCounts.get(k) || 0) + 1);
      }
    }
    if ('demoPath' in item) {
      withDemoPath += 1;
      if (typeof item.demoPath !== 'string' || !item.demoPath.trim()) {
        problems.push(`${where}: demoPath present but not a non-empty string`);
      }
    }

    if (typeof item.itemId !== 'string' || !UUID_RE.test(item.itemId)) {
      problems.push(`${where}: itemId ${JSON.stringify(item.itemId)} is not a valid uuid`);
    } else if (seenIds.has(item.itemId)) {
      problems.push(`${where}: itemId ${item.itemId} duplicates item ${seenIds.get(item.itemId) + 1}`);
    } else {
      seenIds.set(item.itemId, i);
    }

    if (typeof item.typeCode !== 'string' || !TYPE_CODE_RE.test(item.typeCode)) {
      problems.push(`${where}: typeCode ${JSON.stringify(item.typeCode)} is malformed`);
    } else if (item.typeCode !== typeCode) {
      problems.push(`${where}: typeCode ${item.typeCode} does not match the bank file (${typeCode})`);
    }

    if (!DOMAINS.includes(item.domain)) {
      problems.push(`${where}: domain ${JSON.stringify(item.domain)} not in [${DOMAINS.join(', ')}]`);
    }

    if (typeof item.difficulty !== 'number' || !Number.isFinite(item.difficulty)) {
      problems.push(`${where}: difficulty ${JSON.stringify(item.difficulty)} is not a finite number`);
    } else if (item.difficulty < DIFFICULTY_MIN || item.difficulty > DIFFICULTY_MAX) {
      problems.push(`${where}: difficulty ${item.difficulty} outside ${DIFFICULTY_MIN}..${DIFFICULTY_MAX}`);
    }

    if (!Array.isArray(item.ageBands) || item.ageBands.length === 0) {
      problems.push(`${where}: ageBands must be a non-empty array`);
    } else {
      const bad = item.ageBands.filter((b) => !AGE_BANDS.includes(b));
      if (bad.length) problems.push(`${where}: ageBands has unknown value(s) ${bad.join(', ')}`);
      if (new Set(item.ageBands).size !== item.ageBands.length) {
        problems.push(`${where}: ageBands contains duplicates`);
      }
    }

    if (!item.content || typeof item.content !== 'object' || Array.isArray(item.content)) {
      problems.push(`${where}: content must be an object`);
    } else if (Object.keys(item.content).length === 0) {
      problems.push(`${where}: content is empty`);
    }

    if (!item.answer || typeof item.answer !== 'object' || Array.isArray(item.answer)) {
      problems.push(`${where}: answer must be an object`);
    } else if (!('correctKey' in item.answer)) {
      problems.push(`${where}: answer.correctKey is missing`);
    }

    if (!item.scoring || typeof item.scoring !== 'object') {
      problems.push(`${where}: scoring must be an object`);
    } else if (!SCORING_MODES.includes(item.scoring.mode)) {
      problems.push(`${where}: scoring.mode ${JSON.stringify(item.scoring.mode)} not in [${SCORING_MODES.join(', ')}]`);
    }

    if (!item.provenance || typeof item.provenance !== 'object') {
      problems.push(`${where}: provenance must be an object`);
    } else if (!GENERATOR_KINDS.includes(item.provenance.generator)) {
      problems.push(
        `${where}: provenance.generator ${JSON.stringify(item.provenance.generator)} not in ` +
          `[${GENERATOR_KINDS.join(', ')}]`,
      );
    }

    if (item.syntheticOnly !== true) problems.push(`${where}: syntheticOnly must be exactly true`);
    if (item.validated !== false) problems.push(`${where}: validated must be exactly false`);
  });

  const details = [];
  for (const [k, n] of missingKeyCounts) details.push(`MISSING required key "${k}" on ${plural(n, 'item')}`);
  for (const [k, n] of extraKeyCounts) details.push(`EXTRA unrecognised key "${k}" on ${plural(n, 'item')}`);
  details.push(...sample(problems, 8));

  const hardFail = missingKeyCounts.size > 0 || extraKeyCounts.size > 0 || problems.length > 0;

  // demoPath is genuinely contested: the strict zod `bankItemSchema` in
  // packages/contracts omits it entirely, while EXAM_ITEM_SCHEMA_SPEC requires
  // it. Report the split; do not fail either camp.
  let demoStatus = PASS;
  let demoNote = null;
  if (withDemoPath === 0) {
    demoStatus = WARN;
    demoNote = 'no item carries demoPath (see AUDIT_BANKS.md "Known conflict: demoPath")';
  } else if (withDemoPath !== items.length) {
    demoStatus = WARN;
    demoNote = `demoPath present on only ${withDemoPath}/${items.length} items (inconsistent within the bank)`;
  }
  if (demoNote) details.push(demoNote);

  const status = hardFail ? FAIL : demoStatus;
  const summary = hardFail
    ? `${plural(missingKeyCounts.size, 'missing key')}, ${plural(extraKeyCounts.size, 'extra key')}, ` +
      `${plural(problems.length, 'value problem')}`
    : demoNote
      ? 'ok (no demoPath)'
      : 'ok';
  return { ...check(status, summary, details), problemCount: problems.length };
}

// --- Check 3: answer-key leakage (security-critical) -------------------------

function walkContent(node, path, visit) {
  if (node === null || node === undefined) return;
  if (Array.isArray(node)) {
    node.forEach((v, i) => walkContent(v, `${path}[${i}]`, visit));
    return;
  }
  if (typeof node === 'object') {
    for (const [k, v] of Object.entries(node)) {
      visit({ kind: 'key', name: k, value: v, path: path ? `${path}.${k}` : k });
      walkContent(v, path ? `${path}.${k}` : k, visit);
    }
    return;
  }
  visit({ kind: 'leaf', value: node, path });
}

function checkLeakage(items) {
  const hits = new Map(); // generalised path -> { n, reason, example, severity }

  const record = (path, reason, example, severity) => {
    const gp = path.replace(/\[\d+\]/g, '[]');
    const k = `${gp}||${reason}`;
    if (!hits.has(k)) hits.set(k, { path: gp, reason, example, severity, n: 0 });
    hits.get(k).n += 1;
  };

  for (const item of items) {
    const content = item?.content;
    if (!content || typeof content !== 'object') continue;

    walkContent(content, '', (node) => {
      if (node.kind === 'key') {
        const lower = node.name.toLowerCase();
        if (LEAK_ALLOWED_KEYS.has(lower)) return;
        if (LEAKY_KEY_RE.test(lower)) {
          record(
            node.path,
            `field name "${node.name}" is answer-key material`,
            JSON.stringify(node.value).slice(0, 60),
            FAIL,
          );
        }
        return;
      }
      if (typeof node.value !== 'string') return;
      const v = node.value.trim().toLowerCase();
      if (v === 'correct' || v === 'incorrect') {
        record(node.path, `the literal verdict "${node.value}" appears in content`, node.value, FAIL);
        return;
      }
      if (!LURE_VOCAB.has(v)) return;
      // A taxonomy label repeated per array element labels the options one by
      // one, which is how the key is given away. The same word on a scalar
      // field is item-level metadata and cannot single out an option, so it is
      // reported as a possible name collision instead.
      const perElement = node.path.includes('[');
      record(
        node.path,
        perElement
          ? 'per-option lure-taxonomy label (labels each option individually)'
          : 'item-level field whose value collides with the lure taxonomy (possible name collision, not necessarily a leak)',
        node.value,
        perElement ? FAIL : WARN,
      );
    });

    // The whole answer object embedded verbatim inside content.
    if (item.answer && typeof item.answer === 'object') {
      const answerFp = fingerprint(item.answer);
      walkContent(content, '', (node) => {
        if (node.kind !== 'key') return;
        if (node.value && typeof node.value === 'object' && fingerprint(node.value) === answerFp) {
          record(node.path, 'the full answer object is embedded in content', '<answer>', FAIL);
        }
      });
    }
  }

  if (!hits.size) return check(PASS, 'no answer material in content');
  const rows = [...hits.values()].sort(
    (a, b) => RANK[b.severity] - RANK[a.severity] || b.n - a.n,
  );
  const fails = rows.filter((h) => h.severity === FAIL);
  const details = rows.map(
    (h) => `${MARK[h.severity]} content.${h.path} — ${h.reason} (${plural(h.n, 'occurrence')}; e.g. ${h.example})`,
  );
  if (fails.length) {
    details.push(
      'Everything under `content` ships to the browser as part of servedItem, so this is directly readable ' +
        'by anyone inspecting the page.',
    );
  }
  const status = fails.length ? FAIL : WARN;
  const summary = fails.length
    ? `${plural(fails.length, 'leaking path')}`
    : `${plural(rows.length, 'suspicious path')} (collision only)`;
  return check(status, summary, sample(details, 10));
}

// --- Check 4: key sanity -----------------------------------------------------

/**
 * Banks disagree on where options live and how the key names one. Resolve the
 * three shapes actually in use:
 *   keyed   — content.options (or another array of `{key, …}`), answer.correctKey = "B"
 *   indexed — content.options without `key`, answer.correctKey = 1
 *   none    — constructed / interactive response, no enumerable option set
 */
function resolveOptions(item) {
  const content = item?.content;
  if (!content || typeof content !== 'object') return { kind: 'none', reason: 'content is not an object' };

  // Banks name the option's key field `key` or `id` interchangeably. Treating an
  // `{id, text}` option list as positional made every string key ("a1") look
  // like it matched no option, and made the lure lookup miss, which in turn
  // produced a false "every distractor carries the same lure label" verdict on
  // banks that do carry distinct lure classes.
  //
  // `id` only counts inside `content.options`. Elsewhere it is far too loose:
  // many types carry unrelated `{id, ...}` arrays of pieces, nodes or jars, and
  // accepting those as an option list makes a legitimate `correctKey` look like
  // it matches no option.
  const keyFieldOf = (e, allowId) => (e && typeof e === 'object' && !Array.isArray(e)
    ? ('key' in e ? 'key' : allowId && 'id' in e ? 'id' : null)
    : null);
  const isKeyedArray = (v, allowId = false) =>
    Array.isArray(v) && v.length >= 2 && v.every((e) => keyFieldOf(e, allowId) !== null);
  const isObjectArray = (v) =>
    Array.isArray(v) && v.length >= 2 && v.every((e) => e && typeof e === 'object' && !Array.isArray(e));

  if (isKeyedArray(content.options, true)) {
    return { kind: 'keyed', field: 'options', options: content.options, keys: content.options.map((o) => o[keyFieldOf(o, true)]) };
  }
  if (isObjectArray(content.options)) {
    return {
      kind: 'indexed',
      field: 'options',
      options: content.options,
      keys: content.options.map((_, i) => i),
    };
  }
  for (const [name, value] of Object.entries(content)) {
    if (name === 'options') continue;
    if (isKeyedArray(value)) {
      return { kind: 'keyed', field: name, options: value, keys: value.map((o) => o[keyFieldOf(o, false)]) };
    }
  }
  const reason = content.response
    ? `constructed response (content.response.kind = ${JSON.stringify(content.response.kind ?? 'unknown')})`
    : content.optionKind
      ? `interactive response (content.optionKind = ${JSON.stringify(content.optionKind)})`
      : 'no enumerable option set in content';
  return { kind: 'none', reason };
}

/**
 * Pull the most specific lure label for the option at `index`/`key`.
 *
 * Canonically that is `lureDetail` falling back to `lureClass` (D-020). The
 * pre-D-020 `lure`/`kind`/bare-string forms are still read so this auditor can
 * be pointed at an unmigrated bank without crashing.
 */
function lureLabelFor(item, resolved, index) {
  const key = resolved.keys[index];
  const dr = item?.answer?.distractorRationales;
  const labelOf = (entry) => entry.lureDetail ?? entry.lureClass ?? entry.lure ?? entry.kind ?? null;
  if (Array.isArray(dr)) {
    const entry = dr[index];
    if (typeof entry === 'string') return entry;
    if (entry && typeof entry === 'object') return labelOf(entry);
  } else if (dr && typeof dr === 'object') {
    const entry = dr[String(key)];
    if (typeof entry === 'string') return entry;
    if (entry && typeof entry === 'object') return labelOf(entry);
  }
  const opt = resolved.options[index];
  if (opt && typeof opt === 'object') {
    const own = opt.lure ?? opt.lureClass ?? opt.fit ?? null;
    if (typeof own === 'string') return own;
  }
  return null;
}

function checkKeySanity(items) {
  let pickOne = 0;
  let constructed = 0;
  const constructedReasons = new Map();
  const noMatch = [];
  const multiMatch = [];
  const missingLure = [];
  const uniformLure = [];
  const lureVocabulary = new Set();

  items.forEach((item, i) => {
    const resolved = resolveOptions(item);
    if (resolved.kind === 'none') {
      constructed += 1;
      constructedReasons.set(resolved.reason, (constructedReasons.get(resolved.reason) || 0) + 1);
      return;
    }
    pickOne += 1;
    const id = item.itemId ?? `item ${i + 1}`;
    const correctKey = item?.answer?.correctKey;

    let matches = [];
    if (resolved.kind === 'indexed') {
      if (Number.isInteger(correctKey) && correctKey >= 0 && correctKey < resolved.options.length) {
        matches = [correctKey];
      }
    } else {
      matches = resolved.keys.map((k, idx) => (String(k) === String(correctKey) ? idx : -1)).filter((x) => x >= 0);
    }

    if (matches.length === 0) {
      noMatch.push(
        `${id}: answer.correctKey ${JSON.stringify(correctKey)} matches no option in content.${resolved.field} ` +
          `(keys: ${resolved.keys.map((k) => JSON.stringify(k)).join(', ')})`,
      );
      return;
    }
    if (matches.length > 1) {
      multiMatch.push(
        `${id}: answer.correctKey ${JSON.stringify(correctKey)} matches ${matches.length} options in ` +
          `content.${resolved.field}`,
      );
      return;
    }

    const correctIndex = matches[0];
    const labels = [];
    const unlabelled = [];
    resolved.options.forEach((_, idx) => {
      if (idx === correctIndex) return;
      const label = lureLabelFor(item, resolved, idx);
      if (!label) unlabelled.push(resolved.keys[idx]);
      else {
        labels.push(label);
        lureVocabulary.add(label);
      }
    });
    if (unlabelled.length) {
      missingLure.push(
        `${id}: no distractor rationale / lure label for option(s) ` +
          `${unlabelled.map((k) => JSON.stringify(k)).join(', ')}`,
      );
    }
    if (labels.length >= 2 && new Set(labels).size === 1) {
      uniformLure.push(`${id}: every distractor is labelled "${labels[0]}" (not diagnostic)`);
    }
  });

  if (pickOne === 0) {
    const reasons = [...constructedReasons.entries()].map(([r, n]) => `${r} x${n}`);
    return check(NA, `no pick-one items (${constructed} constructed)`, reasons);
  }

  const details = [];
  if (constructed) {
    details.push(
      `${plural(constructed, 'item')} are not pick-one and are exempt from key/lure checks: ` +
        [...constructedReasons.keys()].join('; '),
    );
  }
  if (noMatch.length) details.push(`KEY NAMES NO OPTION on ${plural(noMatch.length, 'item')}:`, ...sample(noMatch));
  if (multiMatch.length) details.push(`KEY IS AMBIGUOUS on ${plural(multiMatch.length, 'item')}:`, ...sample(multiMatch));
  if (missingLure.length) {
    details.push(`MISSING LURE LABEL on ${plural(missingLure.length, 'item')}:`, ...sample(missingLure));
  }

  let status = PASS;
  if (noMatch.length || multiMatch.length || missingLure.length) status = FAIL;

  const uniformRate = uniformLure.length / pickOne;
  if (lureVocabulary.size <= 1 && pickOne > 0) {
    status = FAIL;
    details.push(
      `BANK IS NOT DIAGNOSTIC: every distractor in the entire bank carries the same lure label ` +
        `(${[...lureVocabulary].join(', ') || 'none'}); M-ERRTYPE / M-LURETYPE cannot distinguish anything.`,
    );
  } else if (uniformLure.length) {
    const line =
      `${plural(uniformLure.length, 'item')} (${pct(uniformLure.length, pickOne)}) have a single lure label ` +
      `across all their distractors; bank-wide lure vocabulary is ${lureVocabulary.size} ` +
      `label(s): ${[...lureVocabulary].sort().join(', ')}`;
    if (uniformRate > UNIFORM_LURE_WARN_RATE) {
      status = worst(status, WARN);
      details.push(`ADVISORY — ${line}`, ...sample(uniformLure, 3));
    } else {
      details.push(`note — ${line}`);
    }
  }

  const summary =
    status === PASS
      ? `${pickOne} pick-one ok`
      : `${noMatch.length} bad key, ${multiMatch.length} ambiguous, ${missingLure.length} unlabelled, ` +
        `${uniformLure.length} uniform-lure`;
  return check(status, summary, details);
}

// --- Check 5: ceiling integrity (structural proxies only) --------------------

/** Numeric structural features: numeric leaves and array lengths, by stable path. */
function structuralFeatures(item) {
  const feats = new Map();
  const push = (name, value) => {
    if (!Number.isFinite(value)) return;
    if (!feats.has(name)) feats.set(name, []);
    feats.get(name).push(value);
  };
  const walk = (node, path) => {
    if (node === null || node === undefined) return;
    if (Array.isArray(node)) {
      push(`${path}.length`, node.length);
      node.forEach((v) => walk(v, `${path}[]`));
      return;
    }
    if (typeof node === 'object') {
      for (const [k, v] of Object.entries(node)) walk(v, path ? `${path}.${k}` : k);
      return;
    }
    if (typeof node === 'number') push(path, node);
    if (typeof node === 'boolean') push(path, node ? 1 : 0);
  };
  walk(item?.content, '');
  const resolved = resolveOptions(item);
  if (resolved.kind !== 'none') push('optionCount', resolved.options.length);

  // Repeated paths (inside arrays) collapse to their mean so every item
  // contributes exactly one value per feature.
  const out = new Map();
  for (const [k, vals] of feats) out.set(k, vals.reduce((a, b) => a + b, 0) / vals.length);
  return out;
}

const mean = (xs) => xs.reduce((a, b) => a + b, 0) / xs.length;
function sd(xs) {
  if (xs.length < 2) return 0;
  const m = mean(xs);
  return Math.sqrt(xs.reduce((a, b) => a + (b - m) ** 2, 0) / (xs.length - 1));
}

/** Deterministic PRNG so repeated audits of the same bank give the same verdict. */
function lcg(seed) {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function permutationP(low, high, rng, iterations = PERMUTATIONS) {
  const observed = Math.abs(mean(high) - mean(low));
  const pool = [...low, ...high];
  const nHigh = high.length;
  let atLeast = 0;
  for (let it = 0; it < iterations; it += 1) {
    for (let i = pool.length - 1; i > 0; i -= 1) {
      const j = Math.floor(rng() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    const a = pool.slice(0, nHigh);
    const b = pool.slice(nHigh);
    if (Math.abs(mean(a) - mean(b)) >= observed - 1e-12) atLeast += 1;
  }
  return (atLeast + 1) / (iterations + 1);
}

function checkCeiling(items) {
  const high = items.filter((it) => typeof it.difficulty === 'number' && it.difficulty >= CEILING_HIGH_MIN);
  const low = items.filter((it) => typeof it.difficulty === 'number' && it.difficulty <= CEILING_LOW_MAX);
  const preamble =
    `Structural proxy only — difficulty cannot be judged semantically here. Compares the top band ` +
    `(difficulty >= ${CEILING_HIGH_MIN}, n=${high.length}) against the low band ` +
    `(difficulty <= ${CEILING_LOW_MAX}, n=${low.length}) on every numeric structural field the items record ` +
    `(option count, rule/step counts, element counts, sequence lengths, exposure times).`;

  if (high.length < CEILING_MIN_BAND_N || low.length < CEILING_MIN_BAND_N) {
    return check(NA, `too few items per band (${low.length}/${high.length})`, [preamble]);
  }

  const highFeats = high.map(structuralFeatures);
  const lowFeats = low.map(structuralFeatures);
  const names = new Set();
  for (const f of [...highFeats, ...lowFeats]) for (const k of f.keys()) names.add(k);

  const results = [];
  const rng = lcg(0x51ec7ed);
  for (const name of names) {
    const h = highFeats.map((f) => f.get(name)).filter(Number.isFinite);
    const l = lowFeats.map((f) => f.get(name)).filter(Number.isFinite);
    if (h.length < CEILING_MIN_BAND_N || l.length < CEILING_MIN_BAND_N) continue;
    if (h.length < 0.9 * high.length || l.length < 0.9 * low.length) continue;
    const pooled = Math.sqrt((sd(h) ** 2 + sd(l) ** 2) / 2);
    if (pooled === 0) continue; // constant field, carries no information
    const d = (mean(h) - mean(l)) / pooled;
    if (!Number.isFinite(d)) continue;
    results.push({ name, d, meanHigh: mean(h), meanLow: mean(l) });
  }

  if (!results.length) {
    return check(WARN, 'no varying structural field to compare', [
      preamble,
      'The items record no numeric structural field that varies between the bands, so there is no structural ' +
        'evidence either way that the ceiling is genuinely harder.',
    ]);
  }

  results.sort((a, b) => Math.abs(b.d) - Math.abs(a.d));
  const candidates = results.filter((r) => Math.abs(r.d) >= CEILING_MIN_EFFECT).slice(0, 6);
  for (const r of candidates) {
    const h = highFeats.map((f) => f.get(r.name)).filter(Number.isFinite);
    const l = lowFeats.map((f) => f.get(r.name)).filter(Number.isFinite);
    r.p = permutationP(l, h, rng);
  }
  const separating = candidates.filter((r) => r.p !== undefined && r.p < CEILING_MAX_P);

  const fmt = (r) =>
    `${r.name}: low mean ${round(r.meanLow, 3)} vs high mean ${round(r.meanHigh, 3)}, d=${round(r.d)}` +
    (r.p === undefined ? '' : `, permutation p=${round(r.p, 4)}`);

  const details = [preamble];
  if (separating.length) {
    details.push(
      `Top band separates on ${plural(separating.length, 'structural field')} (|d| >= ${CEILING_MIN_EFFECT}, ` +
        `p < ${CEILING_MAX_P}, ${PERMUTATIONS}-shuffle permutation test):`,
      ...separating.slice(0, 4).map(fmt),
    );
    return check(PASS, `separates on ${separating.length} field(s), top |d|=${round(Math.abs(separating[0].d))}`, details);
  }

  details.push(
    'No structural field separates the bands at the stated thresholds. The strongest candidates were:',
    ...results.slice(0, 4).map(fmt),
    'This means the top band is structurally indistinguishable from the low band on the fields the items ' +
      'record. It may still be semantically harder (a subtler rule, a rarer word, a longer inference chain) — ' +
      'this proxy cannot see that. Treat it as a prompt to inspect the ceiling by hand, not as proof of padding.',
  );
  return check(WARN, `no structural separation (best |d|=${round(Math.abs(results[0].d))})`, details);
}

// --- Check 6: duplicates -----------------------------------------------------

/** Near-duplicate view: drop prose, sort option arrays, so reshuffles collapse. */
function nearCanonical(content) {
  const PROSE = new Set(['prompt', 'question', 'ruletext', 'directions', 'story', 'note']);
  const strip = (node) => {
    if (Array.isArray(node)) {
      const mapped = node.map(strip);
      const allKeyed = node.every((e) => e && typeof e === 'object' && !Array.isArray(e) && 'key' in e);
      if (allKeyed) {
        return mapped
          .map((e) => {
            const { key, ...rest } = e;
            return rest;
          })
          .map((e) => JSON.stringify(canonical(e)))
          .sort();
      }
      return mapped;
    }
    if (node && typeof node === 'object') {
      const out = {};
      for (const [k, v] of Object.entries(node)) {
        if (PROSE.has(k.toLowerCase()) && typeof v === 'string') continue;
        out[k] = strip(v);
      }
      return out;
    }
    return node;
  };
  return strip(content);
}

function checkDuplicates(items) {
  const exact = new Map();
  const near = new Map();
  items.forEach((item, i) => {
    const id = item.itemId ?? `item ${i + 1}`;
    const fp = fingerprint(item.content ?? null);
    if (!exact.has(fp)) exact.set(fp, []);
    exact.get(fp).push({ id, difficulty: item.difficulty });

    const nfp = fingerprint(nearCanonical(item.content ?? null));
    if (!near.has(nfp)) near.set(nfp, []);
    near.get(nfp).push({ id, difficulty: item.difficulty });
  });

  const exactGroups = [...exact.values()].filter((g) => g.length > 1);
  const exactExtra = exactGroups.reduce((a, g) => a + g.length - 1, 0);
  const nearGroups = [...near.values()].filter((g) => g.length > 1);
  const nearExtra = nearGroups.reduce((a, g) => a + g.length - 1, 0);
  const distinct = exact.size;
  const rate = exactExtra / items.length;

  const details = [
    `${distinct} distinct content fingerprints out of ${plural(items.length, 'item')} ` +
      `(${pct(distinct, items.length)} genuinely distinct)`,
  ];
  if (exactGroups.length) {
    details.push(
      `${plural(exactGroups.length, 'exact-duplicate group')} accounting for ${plural(exactExtra, 'redundant item')} ` +
        `(${pct(exactExtra, items.length)}):`,
      ...sample(
        exactGroups
          .sort((a, b) => b.length - a.length)
          .map(
            (g) =>
              `x${g.length} at difficulty ${g.map((e) => round(e.difficulty)).join(', ')} — ${g
                .map((e) => e.id)
                .slice(0, 3)
                .join(', ')}`,
          ),
        5,
      ),
    );
  }
  const nearOnly = nearExtra - exactExtra;
  if (nearOnly > 0) {
    details.push(
      `ADVISORY — a further ${plural(nearOnly, 'item')} are near-identical (same content once prose and ` +
        `option ordering are normalised).`,
    );
  }

  let status = PASS;
  if (rate > DUP_FAIL_RATE) status = FAIL;
  else if (exactExtra > 0 || nearOnly > 0) status = WARN;

  const summary =
    exactExtra === 0 && nearOnly === 0
      ? `${distinct} distinct`
      : `${distinct}/${items.length} distinct (${exactExtra} exact${nearOnly > 0 ? `, +${nearOnly} near` : ''})`;
  return { ...check(status, summary, details), distinct };
}

// --- Check 7: determinism ----------------------------------------------------

/**
 * Never regenerate in place — 13 agents have live working trees. Each generator
 * resolves its output as `<generatorDir>/../banks/<TYPE>.jsonl`, so copying the
 * generators into `<sandbox>/generators/` and creating an empty
 * `<sandbox>/banks/` redirects the write without the generator knowing.
 *
 * The whole directory is copied, not just `<TYPE>.mjs`: generators import
 * shared modules from it (`item-shape.mjs`, `lexicon-child-en.mjs`), and a lone
 * file cannot resolve them. Only `<TYPE>.mjs` is ever executed.
 *
 * The sandbox root must be a realpath: several generators gate `main()` on
 * `resolve(process.argv[1]) === fileURLToPath(import.meta.url)`, which fails
 * silently through the macOS /var -> /private/var symlink.
 */
function checkDeterminism(typeCode, bankPath, generatorsDir, sandboxRoot) {
  const generatorPath = join(generatorsDir, `${typeCode}.mjs`);
  if (!existsSync(generatorPath)) {
    return check(NA, 'no generator', [`No generators/${typeCode}.mjs, so reproducibility is not verifiable.`]);
  }

  const sandbox = join(sandboxRoot, typeCode);
  mkdirSync(join(sandbox, 'banks'), { recursive: true });
  cpSync(generatorsDir, join(sandbox, 'generators'), { recursive: true });

  const run = spawnSync(process.execPath, [join(sandbox, 'generators', `${typeCode}.mjs`)], {
    encoding: 'utf8',
    timeout: GENERATOR_TIMEOUT_MS,
    cwd: sandbox,
  });

  const outPath = join(sandbox, 'banks', `${typeCode}.jsonl`);
  const note = 'Regenerated into a throwaway sandbox; the working tree was not touched.';

  if (!existsSync(outPath)) {
    const why =
      run.error?.message ??
      (run.status !== 0
        ? `generator exited ${run.status}`
        : 'generator ran but wrote no bank to the sandbox (it may need a flag or env var this audit does not know)');
    return check(WARN, 'not verifiable', [
      `Determinism NOT verifiable for ${typeCode}: ${why}.`,
      note,
      ...(run.stderr ? [`stderr: ${run.stderr.trim().split('\n').slice(-3).join(' | ')}`] : []),
    ]);
  }

  const onDisk = readFileSync(bankPath, 'utf8');
  const regenerated = readFileSync(outPath, 'utf8');
  if (onDisk === regenerated) return check(PASS, 'byte-identical', [`Regenerating ${typeCode} reproduces the committed bank byte for byte.`, note]);

  const stripIds = (text) =>
    text
      .trim()
      .split('\n')
      .filter(Boolean)
      .map((l) => {
        try {
          const { itemId, ...rest } = JSON.parse(l);
          return JSON.stringify(canonical(rest));
        } catch {
          return l;
        }
      })
      .join('\n');

  if (stripIds(onDisk) === stripIds(regenerated)) {
    return check(WARN, 'identical except itemIds', [
      `Regenerating ${typeCode} reproduces identical content but different itemIds, so the uuids are not ` +
        `seeded. The bank is reproducible in substance but not byte-stable.`,
      note,
    ]);
  }

  const a = onDisk.trim().split('\n').filter(Boolean).length;
  const b = regenerated.trim().split('\n').filter(Boolean).length;
  return check(WARN, 'differs from generator output', [
    `Regenerating ${typeCode} does NOT reproduce the committed bank (${a} committed items vs ${b} regenerated). ` +
      `Either the generator changed after the bank was written, or generation is not deterministic.`,
    note,
  ]);
}

// --- Check 8: roster reconciliation -----------------------------------------

function checkRoster(items, typeCode, spec) {
  if (!spec) {
    return check(FAIL, 'not in catalog', [
      `${typeCode} has a bank but no entry in catalog/master_types.jsonl, so its domain and age bands cannot be ` +
        `reconciled against any spec.`,
    ]);
  }

  const details = [];
  let status = PASS;

  const domains = [...new Set(items.map((it) => it.domain))];
  const badDomains = domains.filter((d) => !spec.areas.includes(d));
  if (badDomains.length) {
    status = FAIL;
    details.push(
      `DOMAIN CONTRADICTION: bank uses domain ${badDomains.join(', ')} but the catalog declares ` +
        `areas [${spec.areas.join(', ')}]`,
    );
  }

  const bandCounts = new Map();
  for (const item of items) {
    for (const b of item.ageBands ?? []) bandCounts.set(b, (bandCounts.get(b) || 0) + 1);
  }
  const used = [...bandCounts.keys()];
  const undeclared = used.filter((b) => !spec.ageBands.includes(b));
  const unused = spec.ageBands.filter((b) => !bandCounts.has(b));

  if (undeclared.length) {
    status = FAIL;
    details.push(
      `AGE BAND CONTRADICTION: bank tags ${undeclared
        .map((b) => `${b} (${bandCounts.get(b)} items)`)
        .join(', ')} but the catalog declares only [${spec.ageBands.join(', ')}] for this type.`,
    );
  }
  if (unused.length) {
    status = worst(status, WARN);
    details.push(
      `ADVISORY — the catalog declares [${unused.join(', ')}] for this type but the bank has no items tagged ` +
        `to that band. Incomplete band coverage, not a contradiction.`,
    );
  }
  if (spec.rawAgeBands.length !== spec.ageBands.length) {
    details.push(
      `note — the catalog entry also lists non-enum band value(s) ` +
        `${spec.rawAgeBands.filter((b) => !AGE_BANDS.includes(b)).join(', ')}; ignored here (catalog defect).`,
    );
  }
  details.push(
    `band coverage: ${[...bandCounts.entries()]
      .sort()
      .map(([b, n]) => `${b}=${n}`)
      .join(', ')} (spec: ${spec.ageBands.join(', ') || 'none'})`,
  );

  const parts = [];
  if (badDomains.length) parts.push(`domain ${badDomains.join('/')}`);
  if (undeclared.length) parts.push(`undeclared ${undeclared.join('/')}`);
  if (unused.length) parts.push(`unused ${unused.join('/')}`);
  return check(status, parts.length ? parts.join(', ') : 'matches spec', details);
}

// --- Reporting ---------------------------------------------------------------

const MARK = { [PASS]: 'PASS', [WARN]: 'WARN', [FAIL]: 'FAIL', [NA]: ' -- ' };

function padEnd(s, n) {
  s = String(s);
  return s.length >= n ? s.slice(0, n) : s + ' '.repeat(n - s.length);
}
function padStart(s, n) {
  s = String(s);
  return s.length >= n ? s : ' '.repeat(n - s.length) + s;
}

function printTable(results) {
  const W = 6;
  const header = [
    padEnd('TYPE', 18),
    padStart('N', 4),
    padStart('WINDOW', 10),
    padStart('BIN*', 5),
    padEnd('SCHEMA', W),
    padEnd('LEAK', W),
    padEnd('KEY', W),
    padEnd('CEIL', W),
    padEnd('DUP', W),
    padEnd('DETERM', W),
    padEnd('ROSTER', W),
    'VERDICT',
  ].join(' ');
  console.log(header);
  console.log('-'.repeat(header.length));
  for (const r of results) {
    console.log(
      [
        padEnd(r.typeCode, 18),
        padStart(r.items.length, 4),
        padStart(r.checks.difficulty.summary, 10),
        padStart(r.checks.difficulty.binMin ?? '-', 5),
        padEnd(MARK[r.checks.schema.status], W),
        padEnd(MARK[r.checks.leakage.status], W),
        padEnd(MARK[r.checks.keySanity.status], W),
        padEnd(MARK[r.checks.ceiling.status], W),
        padEnd(MARK[r.checks.duplicates.status], W),
        padEnd(MARK[r.checks.determinism.status], W),
        padEnd(MARK[r.checks.roster.status], W),
        MARK[r.status],
      ].join(' '),
    );
  }
  console.log('');
  console.log(
    `  WINDOW = worst sliding +/-1pt window count @ the difficulty where it occurs. PASS needs >= ${MIN_WINDOW_COUNT}.`,
  );
  console.log(
    '  BIN*   = ADVISORY ONLY. Worst one-point integer-bin count: a stricter, NON-BINDING measure that no',
  );
  console.log('           bank is required to satisfy. It is printed so nobody mistakes it for the rule again.');
}

const CHECK_TITLES = {
  difficulty: '1. Difficulty coverage',
  schema: '2. Schema conformance',
  leakage: '3. Answer-key leakage',
  keySanity: '4. Key sanity',
  ceiling: '5. Ceiling integrity',
  duplicates: '6. Duplicate detection',
  determinism: '7. Determinism',
  roster: '8. Roster reconciliation',
};

function printDetails(results, { verbose }) {
  for (const r of results) {
    const interesting = Object.entries(r.checks).filter(
      ([, c]) => verbose || c.status === FAIL || c.status === WARN,
    );
    if (!interesting.length) continue;
    console.log('');
    console.log(`### ${r.typeCode}  [${MARK[r.status]}]  ${r.items.length} items`);
    for (const [name, c] of interesting) {
      console.log(`  ${MARK[c.status]}  ${CHECK_TITLES[name]} — ${c.summary}`);
      for (const d of c.details) console.log(`        ${d}`);
    }
  }
}

/**
 * Where the per-type checkers have quietly diverged. None of these are item
 * defects on their own; they are the reason a single cross-bank definition was
 * needed, and they are what a consumer of every bank has to code around.
 */
function printConsistency(results) {
  const groups = {
    'demoPath on every item': [],
    'demoPath on no item': [],
    'demoPath on some items': [],
    'answer.correctKey names an option key ("A"/"B"/…)': [],
    'answer.correctKey is a positional index (0/1/2)': [],
    'answer.correctKey is a computed solution value (constructed response)': [],
    'answer.distractorRationales is an object keyed by option key': [],
    'answer.distractorRationales is an array aligned to option order': [],
    'answer.distractorRationales is absent': [],
  };
  const offVocab = new Map();
  const detailVocab = new Set();

  for (const r of results) {
    const items = r.items;
    if (!items.length) continue;
    const withDemo = items.filter((it) => 'demoPath' in it).length;
    if (withDemo === items.length) groups['demoPath on every item'].push(r.typeCode);
    else if (withDemo === 0) groups['demoPath on no item'].push(r.typeCode);
    else groups['demoPath on some items'].push(r.typeCode);

    const resolved = resolveOptions(items[0]);
    if (resolved.kind === 'keyed') groups['answer.correctKey names an option key ("A"/"B"/…)'].push(r.typeCode);
    else if (resolved.kind === 'indexed') {
      groups['answer.correctKey is a positional index (0/1/2)'].push(r.typeCode);
    } else groups['answer.correctKey is a computed solution value (constructed response)'].push(r.typeCode);

    const dr = items[0]?.answer?.distractorRationales;
    if (Array.isArray(dr)) groups['answer.distractorRationales is an array aligned to option order'].push(r.typeCode);
    else if (dr && typeof dr === 'object') {
      groups['answer.distractorRationales is an object keyed by option key'].push(r.typeCode);
    } else groups['answer.distractorRationales is absent'].push(r.typeCode);

    // `lureClass` must stay inside the contracts enum or M-ERRTYPE cannot
    // bucket it. `lureDetail` is deliberately open (D-020) and is only counted.
    const off = new Set();
    for (const item of items) {
      for (const entry of Object.values(item?.answer?.distractorRationales ?? {})) {
        if (!entry || typeof entry !== 'object') continue;
        const coarse = entry.lureClass;
        if (typeof coarse !== 'string' || !LURE_VOCAB.has(coarse.toLowerCase())) {
          off.add(String(coarse));
        }
        if (typeof entry.lureDetail === 'string') detailVocab.add(entry.lureDetail);
      }
    }
    if (off.size) offVocab.set(r.typeCode, [...off].sort());
  }

  console.log('');
  console.log('== Cross-bank consistency (where the per-type conventions stand) ==');
  for (const [label, types] of Object.entries(groups)) {
    if (!types.length) continue;
    console.log(`  ${label} — ${types.length}: ${types.join(', ')}`);
  }
  console.log(
    `  answer.distractorRationales[*].lureDetail vocabulary — ${detailVocab.size} label(s) across all banks. ` +
      'Open by design (D-020): the coarse lureClass keeps M-ERRTYPE computable, lureDetail keeps the diagnosis.',
  );
  if (offVocab.size) {
    console.log(
      `  lureClass values outside the contracts lureClassSchema enum — ${offVocab.size} type(s). Server-side ` +
        'M-ERRTYPE / M-LURETYPE cannot bucket these:',
    );
    for (const [type, labels] of offVocab) console.log(`      ${type}: ${sample(labels, 6).join(', ')}`);
  }
}

function printRoster(catalog, presentTypes, extraBanks) {
  const missing = [...catalog.values()].filter((s) => !presentTypes.has(s.typeId));
  const byArea = new Map();
  for (const s of missing) {
    const area = s.areas[0] ?? 'unclassified';
    if (!byArea.has(area)) byArea.set(area, []);
    byArea.get(area).push(s.typeId);
  }
  console.log('');
  console.log('== Roster reconciliation vs catalog/master_types.jsonl ==');
  console.log(
    `  ${catalog.size} catalogued types | ${presentTypes.size} with banks | ${missing.length} still missing`,
  );
  for (const [area, ids] of [...byArea.entries()].sort()) {
    console.log(`  missing (${area}, ${ids.length}): ${ids.sort().join(', ')}`);
  }
  if (extraBanks.length) {
    console.log(`  banks with NO catalog entry (${extraBanks.length}): ${extraBanks.join(', ')}`);
  }
}

// --- Main --------------------------------------------------------------------

function parseArgs(argv) {
  const args = {
    banksDir: join(ROOT, 'banks'),
    generatorsDir: join(ROOT, 'generators'),
    catalog: join(ROOT, 'catalog', 'master_types.jsonl'),
    determinism: true,
    verbose: false,
    json: false,
    only: null,
  };
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === '--banks') args.banksDir = resolve(argv[++i]);
    else if (a === '--generators') args.generatorsDir = resolve(argv[++i]);
    else if (a === '--catalog') args.catalog = resolve(argv[++i]);
    else if (a === '--no-determinism') args.determinism = false;
    else if (a === '--verbose' || a === '-v') args.verbose = true;
    else if (a === '--json') args.json = true;
    else if (a === '--type') args.only = argv[++i];
    else if (a === '--help' || a === '-h') {
      console.log(
        [
          'audit_banks.mjs — cross-bank quality audit',
          '',
          'Usage: node research/exam-question-types/qa/audit_banks.mjs [options]',
          '',
          '  --banks DIR        bank directory (default research/exam-question-types/banks)',
          '  --generators DIR   generator directory (default …/generators)',
          '  --catalog FILE     master_types.jsonl (default …/catalog/master_types.jsonl)',
          '  --type TYPE        audit one type only',
          '  --no-determinism   skip check 7 (does not re-run any generator)',
          '  --verbose, -v      print every check, not just WARN/FAIL',
          '  --json             machine-readable output',
          '',
          'Exit 0 = all pass (warnings allowed), 1 = at least one FAIL, 2 = auditor error.',
        ].join('\n'),
      );
      process.exit(0);
    } else {
      console.error(`unknown argument: ${a} (try --help)`);
      process.exit(2);
    }
  }
  return args;
}

function main() {
  const args = parseArgs(process.argv.slice(2));

  if (!existsSync(args.banksDir) || !statSync(args.banksDir).isDirectory()) {
    console.error(`bank directory not found: ${args.banksDir}`);
    process.exit(2);
  }

  const { byType: catalog, anomalies } = loadCatalog(args.catalog);

  let bankFiles = readdirSync(args.banksDir)
    .filter((f) => f.endsWith('.jsonl'))
    .sort();
  if (args.only) bankFiles = bankFiles.filter((f) => f === `${args.only}.jsonl`);
  if (!bankFiles.length) {
    console.error(`no bank files found in ${args.banksDir}${args.only ? ` for --type ${args.only}` : ''}`);
    process.exit(2);
  }

  const sandboxRoot = args.determinism ? realpathSync(mkdtempSync(join(tmpdir(), 'bank-audit-'))) : null;
  const results = [];

  try {
    for (const file of bankFiles) {
      const typeCode = file.replace(/\.jsonl$/, '');
      const bankPath = join(args.banksDir, file);
      const { items, errors } = loadJsonl(bankPath);

      if (errors.length || !items.length) {
        results.push({
          typeCode,
          items,
          status: FAIL,
          checks: {
            difficulty: check(FAIL, 'unparseable bank'),
            schema: check(FAIL, `${plural(errors.length, 'malformed line')}`, sample(errors)),
            leakage: check(NA, 'skipped'),
            keySanity: check(NA, 'skipped'),
            ceiling: check(NA, 'skipped'),
            duplicates: check(NA, 'skipped'),
            determinism: check(NA, 'skipped'),
            roster: check(NA, 'skipped'),
          },
        });
        continue;
      }

      const checks = {
        difficulty: checkDifficulty(items),
        schema: checkSchema(items, typeCode),
        leakage: checkLeakage(items),
        keySanity: checkKeySanity(items),
        ceiling: checkCeiling(items),
        duplicates: checkDuplicates(items),
        determinism: args.determinism
          ? checkDeterminism(typeCode, bankPath, args.generatorsDir, sandboxRoot)
          : check(NA, 'skipped (--no-determinism)'),
        roster: checkRoster(items, typeCode, catalog.get(typeCode)),
      };
      const status = Object.values(checks).reduce((acc, c) => worst(acc, c.status), PASS);
      results.push({ typeCode, items, status, checks });
    }
  } finally {
    if (sandboxRoot) rmSync(sandboxRoot, { recursive: true, force: true });
  }

  const failed = results.filter((r) => r.status === FAIL);
  const warned = results.filter((r) => r.status === WARN);

  if (args.json) {
    console.log(
      JSON.stringify(
        {
          rule: {
            difficulty: `sliding +/-${WINDOW_RADIUS}pt window over ${DIFFICULTY_MIN}..${DIFFICULTY_MAX}, ` +
              `min ${MIN_WINDOW_COUNT} items`,
          },
          catalogAnomalies: anomalies,
          banks: results.map((r) => ({
            typeCode: r.typeCode,
            items: r.items.length,
            status: r.status,
            checks: Object.fromEntries(
              Object.entries(r.checks).map(([k, c]) => [k, { status: c.status, summary: c.summary, details: c.details }]),
            ),
          })),
          summary: { total: results.length, failed: failed.length, warned: warned.length },
        },
        null,
        2,
      ),
    );
    process.exit(failed.length ? 1 : 0);
  }

  console.log('== Bank audit ==');
  console.log(`banks:      ${args.banksDir}`);
  console.log(`catalog:    ${args.catalog}`);
  console.log(
    `difficulty: BINDING rule is the sliding +/-${WINDOW_RADIUS}pt window (>= ${MIN_WINDOW_COUNT} items for every ` +
      `x in ${DIFFICULTY_MIN}..${DIFFICULTY_MAX}, sampled every ${WINDOW_GRID_STEP}pt plus exact breakpoints).`,
  );
  console.log(
    `            The one-point integer bin is reported per bank as ADVISORY ONLY — it is a strictly harder, ` +
      `non-binding measure.`,
  );
  console.log('');
  printTable(results);
  printDetails(results, { verbose: args.verbose });

  printConsistency(results);
  printRoster(catalog, new Set(results.map((r) => r.typeCode)), results.filter((r) => !catalog.has(r.typeCode)).map((r) => r.typeCode));

  if (anomalies.length) {
    console.log('');
    console.log('== Catalog anomalies (defects in master_types.jsonl, not in any bank) ==');
    for (const a of sample(anomalies, 10)) console.log(`  ${a}`);
  }

  console.log('');
  console.log('== Overall ==');
  console.log(`  ${results.length} banks audited: ${results.length - failed.length - warned.length} clean, ${warned.length} with warnings, ${failed.length} failing`);
  if (failed.length) {
    console.log(`  FAILING: ${failed.map((r) => r.typeCode).join(', ')}`);
    for (const r of failed) {
      const reasons = Object.entries(r.checks)
        .filter(([, c]) => c.status === FAIL)
        .map(([n]) => CHECK_TITLES[n]);
      console.log(`    - ${r.typeCode}: ${reasons.join('; ')}`);
    }
  }
  if (warned.length) console.log(`  WARNING: ${warned.map((r) => r.typeCode).join(', ')}`);
  console.log('');
  console.log(failed.length ? 'OVERALL: FAIL' : 'OVERALL: PASS');
  process.exit(failed.length ? 1 : 0);
}

main();
