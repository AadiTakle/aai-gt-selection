#!/usr/bin/env node
/**
 * Audit governance ID citations against their canonical registers.
 *
 * `AGENTS.md` requires every substantive change to cite the requirement IDs it
 * serves, the evidence IDs it rests on, and the decisions it follows. Nothing
 * checked that those IDs exist. This script checks both directions for all four
 * ID families:
 *
 *   ORPHAN    — an ID is cited somewhere in the repo but is not defined in its
 *               canonical register (the citation points at nothing).
 *   DUPLICATE — an ID is defined twice in its register, so two different facts
 *               share one number. This is the collision the per-lineage ID bands
 *               in `AGENTS.md` exist to prevent, caught here when they fail.
 *   UNCITED   — an ID is defined in its register but nothing outside that
 *               register ever cites it (dead requirement, or work that forgot to
 *               trace).
 *
 * Orphans and duplicates are blocking under `--strict`. Uncited IDs are reported
 * but never blocking: an evidence register legitimately holds background facts
 * and open assumptions that no current work item leans on.
 *
 * Registers (canonical, per `PROJECT_CHARTER.md` precedence):
 *   R / H  docs/product/project-requirements.md
 *   E      docs/research/ASSUMPTIONS_AND_EVIDENCE.md
 *   D      docs/governance/DECISION_LOG.md
 *
 * Range citations are expanded, so `E-071–E-077` counts as a citation of each of
 * E-071 through E-077. Without this, an ID cited only inside a span reads as
 * uncited.
 *
 * Usage:
 *   node scripts/audit-requirement-ids.mjs           # human-readable report
 *   node scripts/audit-requirement-ids.mjs --json    # machine-readable
 *   node scripts/audit-requirement-ids.mjs --strict  # exit 1 on orphans/duplicates
 *
 * `--strict` runs as a blocking CI check in `.github/workflows/ci.yml` under
 * D-032, which is possible because that reconciliation cleared the three orphans
 * `dev` used to carry. See `docs/governance/REQUIREMENT_ID_AUDIT.md`.
 */

import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');

const JSON_OUT = process.argv.includes('--json');
const STRICT = process.argv.includes('--strict');

/**
 * Citation shapes are deliberately strict, because each loosening re-admits a
 * known class of false positive:
 *
 *  - `R`/`H` take a bare number (`R7`, `H10`) and must start at 1. `H0` is the
 *    statistical null hypothesis in the psychometrics research, never an ID.
 *  - `D`/`E` take exactly three digits (`D-016`, `E-074`). Two-digit `D-NN` is
 *    the document-local duplication-finding namespace in
 *    `docs/audit/DUPLICATION_AND_REDUNDANCY.md`, and `E-0xx` is a wildcard used
 *    in prose. Neither is a register citation.
 */
const REGISTERS = {
  R: {
    file: 'docs/product/project-requirements.md',
    define: /^###\s+(R\d+)\./gm,
    cite: /(?<![\w-])(R[1-9]\d*)(?![\w-])/g,
  },
  H: {
    file: 'docs/product/project-requirements.md',
    define: /^###\s+(H\d+)\./gm,
    cite: /(?<![\w-])(H[1-9]\d*)(?![\w-])/g,
  },
  E: {
    file: 'docs/research/ASSUMPTIONS_AND_EVIDENCE.md',
    define: /^\|\s*(E-\d{3})\s*\|/gm,
    cite: /(?<![\w-])(E-\d{3})(?![\w\d-])/g,
  },
  D: {
    file: 'docs/governance/DECISION_LOG.md',
    define: /^###\s+(D-\d{3})\b/gm,
    cite: /(?<![\w-])(D-\d{3})(?![\w\d-])/g,
  },
};

/**
 * Files excluded from the citation scan, each because it produces IDs that are
 * provably not governance citations. Kept explicit and small so an exclusion
 * cannot quietly hide a real orphan.
 */
const EXCLUDED_FILES = [
  // sha512 integrity hashes contain runs like `...kifR11g...`; base64 puts
  // non-word characters next to them, so they survive the boundary guards.
  'pnpm-lock.yaml',
  // `H1`/`H2`/`H3` here are imported React heading components from the canvas
  // runtime, not high-leverage requirement IDs.
  'docs/critic-ready-product-roadmap.canvas.tsx',
];

const EXCLUDED_EXTENSIONS = ['.png', '.pdf', '.jsonl'];

/* id-audit:ignore-start — names an SVG path command that looks like an H-family ID */
/**
 * SVG path data uses `H`/`V` as horizontal/vertical lineto commands, so
 * `<path d="M9 3 H15 V6 H9 Z"/>` in the question-type demos otherwise reads as a
 * citation of a high-leverage requirement `H15`. Strip the attribute value
 * rather than skipping whole files, so real citations in the same file survive.
 */
/* id-audit:ignore-end */
function stripSvgPathData(line) {
  return line.replace(/\bd\s*=\s*(["'])(?:(?!\1).)*\1/g, 'd=""');
}

/**
 * Escape markers for prose that *discusses* IDs instead of citing them.
 *
 * Documentation about the ID scheme itself has to name IDs that do not exist:
 * the permanent hole in the evidence register, the unallocated start of a
 * per-lineage band in `AGENTS.md`, or a false positive being catalogued. Those
 * are not citations and must not fail the gate — but blanket-excluding whole
 * files would also hide real citations in them, so the opt-out is explicit and
 * local. Append `id-audit:ignore-line` to a single line, or bracket a region
 * with `id-audit:ignore-start` and `id-audit:ignore-end`, in whatever comment
 * syntax the file uses.
 *
 * Grep for `id-audit:ignore` to review every exemption in the repo.
 */
const IGNORE_LINE = 'id-audit:ignore-line';
const IGNORE_START = 'id-audit:ignore-start';
const IGNORE_END = 'id-audit:ignore-end';

/** Dash-ish separators used for ID spans, plus `..` and `...`/`…`. */
const RANGE_SEPARATOR = String.raw`\s*(?:\.{2,3}|…|[-–—])\s*`;

const RANGE_PATTERNS = {
  R: new RegExp(String.raw`(?<![\w-])R([1-9]\d*)${RANGE_SEPARATOR}R?([1-9]\d*)(?![\w-])`, 'g'),
  H: new RegExp(String.raw`(?<![\w-])H([1-9]\d*)${RANGE_SEPARATOR}H?([1-9]\d*)(?![\w-])`, 'g'),
  E: new RegExp(String.raw`(?<![\w-])E-(\d{3})${RANGE_SEPARATOR}E-(\d{3})(?![\w\d-])`, 'g'),
  D: new RegExp(String.raw`(?<![\w-])D-(\d{3})${RANGE_SEPARATOR}D-(\d{3})(?![\w\d-])`, 'g'),
};

/** Widest span we expand; anything larger is a formatting accident, not a citation. */
const MAX_RANGE_SPAN = 40;

function trackedFiles() {
  const out = execFileSync('git', ['ls-files', '-z'], { cwd: ROOT, encoding: 'utf8' });
  return out
    .split('\0')
    .filter(Boolean)
    .filter((f) => !EXCLUDED_FILES.includes(f))
    .filter((f) => !EXCLUDED_EXTENSIONS.includes(path.extname(f)));
}

function formatId(family, n) {
  if (family === 'R' || family === 'H') return `${family}${n}`;
  return `${family}-${String(n).padStart(3, '0')}`;
}

/**
 * Definitions in a register, plus any ID defined more than once.
 *
 * Duplicates are the failure mode the per-lineage ID bands in `AGENTS.md` exist
 * to prevent: two branches allocating from a shared counter can register
 * different facts under one ID, and once merged the register silently holds
 * both. Counting occurrences rather than collecting into a set is what makes
 * that visible.
 */
function definedIds(family) {
  const { file, define } = REGISTERS[family];
  const text = readFileSync(path.join(ROOT, file), 'utf8');
  const counts = new Map();
  for (const m of text.matchAll(define)) {
    counts.set(m[1], (counts.get(m[1]) ?? 0) + 1);
  }
  const duplicates = [...counts.entries()]
    .filter(([, n]) => n > 1)
    .map(([id, count]) => ({ id, count }));
  return { ids: new Set(counts.keys()), duplicates };
}

/**
 * Collect every citation of every family, keyed by ID, with the file/line sites
 * that produced it. Range citations are expanded into their members and the
 * expansion is marked so the report can show why an ID counted as cited.
 */
function collectCitations(files) {
  const sites = new Map();

  const record = (id, file, line, viaRange) => {
    if (!sites.has(id)) sites.set(id, []);
    sites.get(id).push({ file, line, viaRange });
  };

  for (const file of files) {
    let text;
    try {
      text = readFileSync(path.join(ROOT, file), 'utf8');
    } catch {
      continue; // unreadable / binary-ish, nothing to cite
    }
    if (text.includes('\u0000')) continue;

    const lines = text.split('\n');
    let inIgnoredRegion = false;
    for (let i = 0; i < lines.length; i += 1) {
      const raw = lines[i];
      if (raw.includes(IGNORE_START)) inIgnoredRegion = true;
      if (raw.includes(IGNORE_END)) {
        inIgnoredRegion = false;
        continue;
      }
      if (inIgnoredRegion || raw.includes(IGNORE_LINE)) continue;

      const line = stripSvgPathData(raw);
      const lineNo = i + 1;

      for (const family of Object.keys(REGISTERS)) {
        for (const m of line.matchAll(REGISTERS[family].cite)) {
          record(m[1], file, lineNo, false);
        }
        for (const m of line.matchAll(RANGE_PATTERNS[family])) {
          const from = Number(m[1]);
          const to = Number(m[2]);
          if (to <= from || to - from > MAX_RANGE_SPAN) continue;
          for (let n = from + 1; n < to; n += 1) {
            record(formatId(family, n), file, lineNo, true);
          }
        }
      }
    }
  }

  return sites;
}

function familyOf(id) {
  if (/^R[1-9]\d*$/.test(id)) return 'R';
  if (/^H[1-9]\d*$/.test(id)) return 'H';
  if (/^E-\d{3}$/.test(id)) return 'E';
  if (/^D-\d{3}$/.test(id)) return 'D';
  return null;
}

function numberOf(id) {
  return Number(id.replace(/^[A-Z]-?/, ''));
}

function main() {
  const files = trackedFiles();
  const sites = collectCitations(files);

  const report = {};

  for (const family of Object.keys(REGISTERS)) {
    const { ids: defined, duplicates } = definedIds(family);
    const registerFile = REGISTERS[family].file;

    const cited = new Map();
    for (const [id, where] of sites) {
      if (familyOf(id) === family) cited.set(id, where);
    }

    const orphans = [];
    for (const [id, where] of cited) {
      if (defined.has(id)) continue;
      // A range expansion alone is too weak to call an orphan citation: it can
      // be an artifact of a span whose endpoints are real.
      const direct = where.filter((w) => !w.viaRange);
      if (direct.length === 0) continue;
      orphans.push({ id, count: direct.length, sites: direct });
    }

    const uncited = [];
    for (const id of defined) {
      const where = cited.get(id) ?? [];
      const outside = where.filter((w) => w.file !== registerFile);
      if (outside.length === 0) {
        uncited.push({ id, citationsInsideRegisterOnly: where.length });
      }
    }

    const bySeq = (a, b) => numberOf(a.id) - numberOf(b.id);
    orphans.sort(bySeq);
    uncited.sort(bySeq);
    duplicates.sort(bySeq);

    report[family] = {
      registerFile,
      definedCount: defined.size,
      defined: [...defined].sort((a, b) => numberOf(a) - numberOf(b)),
      duplicates,
      orphans,
      uncited,
    };
  }

  if (JSON_OUT) {
    console.log(JSON.stringify({ filesScanned: files.length, families: report }, null, 2));
  } else {
    console.log(`Governance ID audit — ${files.length} tracked files scanned\n`);
    for (const family of Object.keys(REGISTERS)) {
      const r = report[family];
      console.log(`## ${family}-family  (register: ${r.registerFile})`);
      console.log(`   defined: ${r.definedCount}`);
      console.log(`   duplicate definitions: ${r.duplicates.length}`);
      for (const d of r.duplicates) {
        console.log(`     ! ${d.id}  defined ${d.count} times in ${r.registerFile}`);
      }
      console.log(`   orphaned citations: ${r.orphans.length}`);
      for (const o of r.orphans) {
        console.log(`     ! ${o.id}  ${o.count} citation(s)`);
        for (const s of o.sites) console.log(`         ${s.file}:${s.line}`);
      }
      console.log(`   defined but never cited outside the register: ${r.uncited.length}`);
      for (const u of r.uncited) {
        console.log(
          `     - ${u.id}` +
            (u.citationsInsideRegisterOnly
              ? `  (${u.citationsInsideRegisterOnly} mention(s) inside the register only)`
              : ''),
        );
      }
      console.log('');
    }
  }

  const blocking = Object.values(report).reduce(
    (n, r) => n + r.orphans.length + r.duplicates.length,
    0,
  );
  if (STRICT && blocking > 0) process.exitCode = 1;
}

main();
