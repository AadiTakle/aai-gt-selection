#!/usr/bin/env node
/**
 * Sync the question-type banks + renderer demos into the web app.
 *
 * Adding a new question type should require nothing more than dropping
 * `research/exam-question-types/banks/<CODE>.jsonl` and
 * `research/exam-question-types/demos/<CODE>.html` into the repo and re-running
 * this script. It:
 *
 *   1. enumerates every bank JSONL and pairs it with its renderer demo;
 *   2. gates each pair on the BUILD_PLAN §2 embedding protocol (handles
 *      {type:'init'} / {type:'start'}, emits a source-tagged {type:'result'})
 *      and on bank sanity (parseable, known domain, difficulty 1..20, age bands);
 *   3. refuses to publish a demo that contains an answer key;
 *   4. copies the compliant demos to `apps/web/public/exam-demos/`, pruning any
 *      stale file that is no longer compliant or no longer banked; and
 *   5. generates `apps/web/src/lib/exam/registry.generated.ts` — the single
 *      source of truth for the served type pool, the submit verifier, and the
 *      runner's demo paths.
 *
 * Non-compliant types are reported as BLOCKED with a reason and are NOT wired.
 *
 * Usage:
 *   node scripts/sync-exam-demos.mjs            # write demos + registry
 *   node scripts/sync-exam-demos.mjs --check    # fail if anything is out of date (CI)
 *   node scripts/sync-exam-demos.mjs --json     # machine-readable report
 *
 * Born-synthetic only: every wired bank carries syntheticOnly=true / validated=false.
 */

import { readFileSync, writeFileSync, readdirSync, existsSync, mkdirSync, rmSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
const BANKS_DIR = path.join(ROOT, 'research/exam-question-types/banks');
const DEMOS_DIR = path.join(ROOT, 'research/exam-question-types/demos');
const CATALOG = path.join(ROOT, 'research/exam-question-types/catalog/master_types.jsonl');
const PUBLIC_DIR = path.join(ROOT, 'apps/web/public/exam-demos');
const REGISTRY_FILE = path.join(ROOT, 'apps/web/src/lib/exam/registry.generated.ts');

const CHECK = process.argv.includes('--check');
const JSON_OUT = process.argv.includes('--json');

const VALID_DOMAINS = new Set(['fluid_reasoning', 'verbal', 'quantitative', 'spatial']);
const VALID_AGE_BANDS = new Set(['K-1', '2-3', '4-5', '6-8', 'above-level']);

/**
 * Upstream demo defects patched at copy time.
 *
 * `research/exam-question-types/**` is owned by the bank-generation agents, so we
 * do not edit it here; instead each patch is declared with the exact source text
 * it expects. If the anchor stops matching, the sync FAILS loudly rather than
 * silently shipping an unpatched demo — that is the signal to delete the entry
 * because upstream fixed it.
 */
// Per-type source patches applied at copy time, for demos this workstream must
// not edit at the source. Empty by design: a patch here is a latent divergence
// between what ships and what the demo author sees, so fix the demo instead
// wherever ownership allows. (SPA-FOLDNET-01's `locked` bug was patched here
// first and is now fixed at the source.)
const COMPAT_PATCHES = {};

/** Short, child-facing blurbs for the types that have a curated one. */
const CURATED_BLURBS = {
  'FLU-MATRIX-01': 'Tap the tile that completes the pattern.',
  'FLU-ANALOGY-01': 'Make the third shape change the same way as the first pair.',
  'VER-CLOZE-01': 'Choose the word that best completes the sentence.',
  'VER-RELPAIR-01': 'Find the pair of words that relate the same way.',
  'QUANT-SERIES-01': 'Pick what continues the stepping pattern.',
  'QUANT-FUNC-01': 'Work out the rule and choose what the machine makes next.',
  'SPA-FOLDNET-01': 'Fold the flat net into a box and find the opposite face.',
  'SPA-ROLL-01': 'Track a cube as it tips along a path.',
};

// ---------------------------------------------------------------------------
// demo inspection
// ---------------------------------------------------------------------------

/** Slice out a brace-balanced object literal starting at the `{` at `openIdx`. */
function balancedObject(src, openIdx) {
  let depth = 0;
  for (let i = openIdx; i < src.length; i++) {
    if (src[i] === '{') depth++;
    else if (src[i] === '}') {
      depth--;
      if (depth === 0) return src.slice(openIdx, i + 1);
    }
  }
  return '';
}

/**
 * Metric ids a demo puts on its ItemResult. Handles the two shapes the demos
 * use: an inline `metrics:{...}` / `metrics={...}` literal, and
 * `metrics: someFn()` where `someFn` returns the literal.
 *
 * This drives the engine's metric-COVERAGE bias only (which type to prefer
 * next). The stop rule never depends on it — see `enforcedCoreMetrics` in
 * `apps/web/src/lib/exam/adaptive.ts` — so an imprecise read here can bias
 * selection but can never make the battery unsatisfiable.
 */
function extractMetrics(src) {
  const found = new Set();

  for (const m of src.matchAll(/metrics\s*[:=]\s*\{/g)) {
    const body = balancedObject(src, m.index + m[0].length - 1);
    for (const k of body.matchAll(/['"](M-[A-Z0-9]+)['"]\s*:/g)) found.add(k[1]);
  }

  // metrics: metricsNow()  ->  function metricsNow(){ ... return {...} }
  for (const m of src.matchAll(/metrics\s*[:=]\s*([A-Za-z_$][\w$]*)\s*\(/g)) {
    const fn = new RegExp(
      `(?:function\\s+${m[1]}\\s*\\([^)]*\\)\\s*\\{|(?:const|let|var)\\s+${m[1]}\\s*=\\s*(?:function)?\\s*\\([^)]*\\)\\s*(?:=>)?\\s*\\{)`,
    ).exec(src);
    if (!fn) continue;
    const body = balancedObject(src, fn.index + fn[0].length - 1);
    for (const k of body.matchAll(/['"](M-[A-Z0-9]+)['"]\s*:/g)) found.add(k[1]);
  }

  return [...found].sort();
}

/**
 * Response field names a demo puts on its ItemResult, read from the
 * `response:{...}` / `response={...}` literal in its submit path. Used to decide
 * whether `/api/exam-submit` can grade the type with the option-key verifier.
 */
function extractResponseFields(src) {
  const found = new Set();
  for (const m of src.matchAll(/response\s*[:=]\s*\{/g)) {
    const body = balancedObject(src, m.index + m[0].length - 1);
    for (const k of body.matchAll(/(?:^|[{,\s])([A-Za-z_$][\w$]*)\s*[:,}]/g)) found.add(k[1]);
  }
  return found;
}

/**
 * Which server-side verifier grades this type, or `null` when none exists.
 *
 * A type is only servable if `/api/exam-submit` can decide correctness from the
 * child's raw response plus the server-only answer. Serving a type we cannot
 * grade would score every child 0 on it, dragging the adaptive difficulty down
 * and corrupting the profile — worse than not serving it at all.
 *
 * Keep in sync with the verifier switch in
 * `apps/web/src/app/api/exam-submit/route.ts`.
 */
function classifyVerifier(bank, responseFields) {
  switch (bank.scoringRule) {
    // |placedRatio - answer.targetRatio| <= answer.tolerance
    case 'placement_tolerance':
      return responseFields.has('placedRatio') ? 'placement_tolerance' : null;
    // Number(response.value) === answer.optimalValue
    case 'constructed_value_equals_optimum':
      return responseFields.has('value') ? 'constructed_value' : null;
    default:
      break;
  }
  if (responseFields.has('selectedKey') || responseFields.has('selectedIndex')) return 'keyed';
  return null;
}

/** BUILD_PLAN §2 embedding-protocol conformance for one demo's source. */
function protocolReport(src) {
  return {
    sourceTag: src.includes('gt-exam-demo'),
    hostTag: src.includes('gt-exam-host'),
    listens: /addEventListener\(\s*['"]message['"]/.test(src),
    handlesInit: /type\s*===\s*['"]init['"]/.test(src),
    handlesStart: /type\s*===\s*['"]start['"]/.test(src),
    emitsReady: /(post\(\s*['"]ready['"]|type\s*:\s*['"]ready['"])/.test(src),
    emitsResult: /(post\(\s*['"]result['"]|type\s*:\s*['"]result['"])/.test(src),
  };
}

/** A published demo must never carry a key. ServedItem is content-only. */
function keyLeakReport(src) {
  const leaks = [];
  // Only an object-key occurrence (`"correctKey":`) is data. A bare mention is
  // not: several demos name these fields inside a defensive regex that strips
  // correctness signals out of a host-supplied item, so matching the bare token
  // flags the safeguard as the very thing it prevents.
  if (/["']?correctKey["']?\s*:/.test(src)) leaks.push('correctKey');
  if (/["']?distractorRationales["']?\s*:/.test(src)) leaks.push('distractorRationales');
  // `answer`/`scoring`/`provenance` appear legitimately in the demos' own
  // strip-to-ServedItem destructuring and in CSS class names, so only a
  // structured key literal counts as a leak.
  if (/["']answer["']\s*:\s*\{/.test(src)) leaks.push('answer object literal');
  return leaks;
}

function applyPatches(code, src) {
  const patches = COMPAT_PATCHES[code];
  if (!patches) return { src, applied: [] };
  let out = src;
  const applied = [];
  for (const p of patches) {
    if (!out.includes(p.find)) {
      throw new Error(
        `${code}: compat patch anchor no longer matches ("${p.reason}").\n` +
          `  If upstream fixed this, delete the entry from COMPAT_PATCHES in scripts/sync-exam-demos.mjs.`,
      );
    }
    out = out.replace(p.find, p.replace);
    applied.push(p.reason);
  }
  return { src: out, applied };
}

// ---------------------------------------------------------------------------
// bank inspection
// ---------------------------------------------------------------------------

function inspectBank(file) {
  const lines = readFileSync(file, 'utf8').split('\n');
  const items = [];
  let malformed = 0;
  for (const line of lines) {
    const t = line.trim();
    if (!t) continue;
    try {
      items.push(JSON.parse(t));
    } catch {
      malformed++;
    }
  }
  if (items.length === 0) return { error: 'bank has no parseable items' };

  const domains = [...new Set(items.map((i) => i.domain))];
  if (domains.length !== 1) return { error: `bank mixes domains: ${domains.join(', ')}` };
  const domain = domains[0];
  if (!VALID_DOMAINS.has(domain)) return { error: `unknown domain "${domain}"` };

  const difficulties = items.map((i) => i.difficulty);
  if (difficulties.some((d) => typeof d !== 'number' || !Number.isFinite(d) || d < 1 || d > 20)) {
    return { error: 'bank has a difficulty outside the 1..20 float scale' };
  }

  const ageBands = [...new Set(items.flatMap((i) => i.ageBands ?? []))];
  const badBand = ageBands.find((b) => !VALID_AGE_BANDS.has(b));
  if (badBand) return { error: `unknown age band "${badBand}"` };
  if (ageBands.length === 0) return { error: 'bank has no age bands (unreachable by selection)' };

  if (items.some((i) => i.answer?.correctKey === undefined)) {
    return { error: 'bank has an item with no answer.correctKey (unverifiable server-side)' };
  }
  if (items.some((i) => i.syntheticOnly !== true)) {
    return { error: 'bank has a non born-synthetic item (syntheticOnly must be true)' };
  }

  const scoringRules = [...new Set(items.map((i) => i.scoring?.rule ?? null))];
  if (scoringRules.length !== 1) {
    return { error: `bank mixes scoring rules: ${scoringRules.join(', ')}` };
  }

  return {
    domain,
    itemCount: items.length,
    malformed,
    ageBands: ageBands.sort(),
    difficultyMin: Math.min(...difficulties),
    difficultyMax: Math.max(...difficulties),
    keyKinds: [...new Set(items.map((i) => typeof i.answer.correctKey))].sort(),
    scoringRule: scoringRules[0],
  };
}

// ---------------------------------------------------------------------------
// catalog metadata
// ---------------------------------------------------------------------------

function loadCatalog() {
  const byCode = new Map();
  if (!existsSync(CATALOG)) return byCode;
  for (const line of readFileSync(CATALOG, 'utf8').split('\n')) {
    const t = line.trim();
    if (!t) continue;
    try {
      const row = JSON.parse(t);
      if (row.type_id) byCode.set(row.type_id, row);
    } catch {
      /* skip a malformed catalog row */
    }
  }
  return byCode;
}

function titleFor(code, catalogRow, src) {
  if (catalogRow?.name) return catalogRow.name;
  const m = /<title>\s*[^·<]*·\s*([^<]+?)\s*<\/title>/.exec(src ?? '');
  if (m) return m[1].replace(/\s*\(renderer\)\s*$/i, '').trim();
  return code;
}

function blurbFor(code, catalogRow) {
  if (CURATED_BLURBS[code]) return CURATED_BLURBS[code];
  const line = catalogRow?.one_liner;
  if (!line) return 'Work through the activity, then confirm your answer.';
  const first = line.split(/(?<=\.)\s/)[0] ?? line;
  return first.length > 160 ? `${first.slice(0, 157).trimEnd()}…` : first;
}

// ---------------------------------------------------------------------------
// main
// ---------------------------------------------------------------------------

function collect() {
  if (!existsSync(BANKS_DIR)) throw new Error(`no banks directory at ${BANKS_DIR}`);
  const catalog = loadCatalog();
  const codes = readdirSync(BANKS_DIR)
    .filter((f) => f.endsWith('.jsonl'))
    .map((f) => f.replace(/\.jsonl$/, ''))
    .sort();

  const wired = [];
  const blocked = [];

  for (const code of codes) {
    const demoFile = path.join(DEMOS_DIR, `${code}.html`);
    if (!existsSync(demoFile)) {
      blocked.push({ code, reason: 'bank-only: no renderer demo at demos/' + code + '.html' });
      continue;
    }

    const bank = inspectBank(path.join(BANKS_DIR, `${code}.jsonl`));
    if (bank.error) {
      blocked.push({ code, reason: `bank: ${bank.error}` });
      continue;
    }

    const rawSrc = readFileSync(demoFile, 'utf8');
    const proto = protocolReport(rawSrc);
    const missing = [];
    if (!proto.sourceTag) missing.push("not source-tagged 'gt-exam-demo'");
    if (!proto.hostTag) missing.push("does not recognise 'gt-exam-host'");
    if (!proto.listens) missing.push('no postMessage listener');
    if (!proto.handlesInit) missing.push("no {type:'init'} handler");
    if (!proto.handlesStart) missing.push("no {type:'start'} handler");
    if (!proto.emitsResult) missing.push("never emits {type:'result'}");
    if (missing.length) {
      blocked.push({ code, reason: `protocol: ${missing.join('; ')}` });
      continue;
    }

    const leaks = keyLeakReport(rawSrc);
    if (leaks.length) {
      blocked.push({ code, reason: `security: demo embeds ${leaks.join(', ')}` });
      continue;
    }

    const responseFields = extractResponseFields(rawSrc);
    const verifier = classifyVerifier(bank, responseFields);
    if (!verifier) {
      blocked.push({
        code,
        reason:
          `no server verifier: constructed response {${[...responseFields].sort().join(', ')}} ` +
          `with scoring.rule=${bank.scoringRule ?? 'none'} carries no option key, so ` +
          `/api/exam-submit cannot decide correctness. Needs a bespoke scorer that re-derives ` +
          `the solution from response + content (the bank already ships the reference solution ` +
          `to validate it against).`,
      });
      continue;
    }

    let patched;
    try {
      patched = applyPatches(code, rawSrc);
    } catch (err) {
      blocked.push({ code, reason: err.message });
      continue;
    }

    const row = catalog.get(code);
    wired.push({
      code,
      domain: bank.domain,
      title: titleFor(code, row, rawSrc),
      blurb: blurbFor(code, row),
      ageBands: bank.ageBands,
      itemCount: bank.itemCount,
      difficultyMin: bank.difficultyMin,
      difficultyMax: bank.difficultyMax,
      keyKinds: bank.keyKinds,
      verifier,
      metrics: extractMetrics(rawSrc),
      patches: patched.applied,
      html: patched.src,
    });
  }

  return { wired, blocked };
}

function renderRegistry(wired, blocked) {
  const esc = (s) => String(s).replace(/\\/g, '\\\\').replace(/'/g, "\\'");
  const arr = (xs) => `[${xs.map((x) => `'${esc(x)}'`).join(', ')}]`;

  const entries = wired
    .map(
      (t) => `  {
    typeCode: '${esc(t.code)}',
    domain: '${t.domain}',
    title: '${esc(t.title)}',
    blurb: '${esc(t.blurb)}',
    ageBands: ${arr(t.ageBands)},
    itemCount: ${t.itemCount},
    difficultyMin: ${t.difficultyMin},
    difficultyMax: ${t.difficultyMax},
    verifier: '${t.verifier}',
    metrics: ${arr(t.metrics)},
  },`,
    )
    .join('\n');

  const blockedEntries = blocked
    .map((b) => `  { typeCode: '${esc(b.code)}', reason: '${esc(b.reason)}' },`)
    .join('\n');

  const byDomain = {};
  for (const t of wired) byDomain[t.domain] = (byDomain[t.domain] ?? 0) + 1;
  const summary = Object.entries(byDomain)
    .sort()
    .map(([d, n]) => `${d} ${n}`)
    .join(' · ');

  return `// GENERATED FILE — DO NOT EDIT BY HAND.
// Regenerate with: node scripts/sync-exam-demos.mjs
//
// Every question type that has BOTH a structured bank
// (research/exam-question-types/banks/<CODE>.jsonl) AND a renderer demo that
// speaks the BUILD_PLAN §2 postMessage protocol. The sync script copies each
// wired demo to apps/web/public/exam-demos/ and emits this registry, which is
// the single source of truth for:
//
//   - the served-item pool (/api/exam-items)
//   - the server-side answer verifier (/api/exam-submit)
//   - the runner's type metadata + demo paths
//
// Wired: ${wired.length} types (${summary}).
// Adding a bank + compliant demo and re-running the sync is all it takes.

export type ExamRegistryDomain = 'fluid_reasoning' | 'verbal' | 'quantitative' | 'spatial';

/**
 * Which server-side verifier in \`/api/exam-submit\` grades this type. A type with
 * no verifier is never wired — it would score every child 0.
 */
export type ExamVerifier = 'keyed' | 'placement_tolerance' | 'constructed_value';

export interface ExamRegistryEntry {
  typeCode: string;
  domain: ExamRegistryDomain;
  /** Human-facing type name (catalog \`name\`). */
  title: string;
  /** Short child-facing instruction shown under the activity frame. */
  blurb: string;
  /** Age bands the bank targets — a selection hint, not a hard filter. */
  ageBands: string[];
  itemCount: number;
  difficultyMin: number;
  difficultyMax: number;
  verifier: ExamVerifier;
  /**
   * Metric ids this demo puts on its ItemResult. Biases the engine's
   * metric-coverage type selection; the stop rule never depends on it.
   */
  metrics: string[];
}

export const EXAM_TYPE_REGISTRY: readonly ExamRegistryEntry[] = [
${entries}
] as const;

/** Types with a bank but no servable demo, and why. */
export const EXAM_BLOCKED_TYPES: readonly { typeCode: string; reason: string }[] = [
${blockedEntries || ''}
] as const;

/** Every wired type code, in registry (alphabetical) order. */
export const EXAM_TYPE_CODES: readonly string[] = EXAM_TYPE_REGISTRY.map((t) => t.typeCode);
`;
}

function main() {
  const { wired, blocked } = collect();

  if (wired.length === 0) throw new Error('no compliant question types found — refusing to wire an empty pool');

  const registry = renderRegistry(wired, blocked);
  const expectedFiles = new Map(wired.map((t) => [`${t.code}.html`, t.html]));

  const drift = [];

  if (!existsSync(PUBLIC_DIR)) {
    drift.push(`missing directory ${path.relative(ROOT, PUBLIC_DIR)}`);
  } else {
    for (const file of readdirSync(PUBLIC_DIR)) {
      if (!expectedFiles.has(file)) drift.push(`stale demo: ${file}`);
    }
  }
  for (const [file, html] of expectedFiles) {
    const target = path.join(PUBLIC_DIR, file);
    if (!existsSync(target) || readFileSync(target, 'utf8') !== html) drift.push(`out of date: ${file}`);
  }
  if (!existsSync(REGISTRY_FILE) || readFileSync(REGISTRY_FILE, 'utf8') !== registry) {
    drift.push('out of date: apps/web/src/lib/exam/registry.generated.ts');
  }

  if (CHECK) {
    report(wired, blocked, drift);
    if (drift.length) {
      console.error(`\nFAIL: ${drift.length} item(s) out of date. Run: node scripts/sync-exam-demos.mjs`);
      process.exit(1);
    }
    console.log('\nOK: public/exam-demos and registry.generated.ts are up to date.');
    return;
  }

  mkdirSync(PUBLIC_DIR, { recursive: true });
  for (const file of readdirSync(PUBLIC_DIR)) {
    if (!expectedFiles.has(file)) rmSync(path.join(PUBLIC_DIR, file));
  }
  for (const [file, html] of expectedFiles) writeFileSync(path.join(PUBLIC_DIR, file), html);
  writeFileSync(REGISTRY_FILE, registry);

  report(wired, blocked, drift);
  if (!JSON_OUT) {
    console.log(
      `\nWrote ${expectedFiles.size} demo(s) to apps/web/public/exam-demos/ and regenerated the registry.`,
    );
  }
}

function report(wired, blocked, drift) {
  if (JSON_OUT) {
    console.log(
      JSON.stringify(
        {
          wired: wired.map(({ html, ...rest }) => rest),
          blocked,
          drift,
        },
        null,
        2,
      ),
    );
    return;
  }

  console.log(`WIRED (${wired.length})`);
  for (const t of wired) {
    console.log(
      `  ${t.code.padEnd(18)} ${t.domain.padEnd(16)} ${String(t.itemCount).padStart(4)} items  ` +
        `d${t.difficultyMin}–${t.difficultyMax}`.padEnd(14) +
        `${t.verifier.padEnd(20)} ${t.metrics.join(',')}` +
        (t.patches.length ? `  [patched: ${t.patches.join('; ')}]` : ''),
    );
  }

  console.log(`\nBLOCKED (${blocked.length})`);
  for (const b of blocked) console.log(`  ${b.typeCode ?? b.code} — ${b.reason}`);

  const byDomain = {};
  for (const t of wired) (byDomain[t.domain] ??= []).push(t.code);
  console.log('\nPER-DOMAIN COVERAGE');
  for (const d of VALID_DOMAINS) {
    const n = byDomain[d]?.length ?? 0;
    console.log(`  ${d.padEnd(16)} ${n} type(s)${n === 0 ? '   <-- NO WIRED TYPE: the even-spread stop rule can never be met' : ''}`);
  }
}

try {
  main();
} catch (err) {
  console.error(`sync-exam-demos: ${err.message}`);
  process.exit(1);
}
