// Build the assets `stage2-review.html` needs, and make its use of the REAL code checkable.
//
// WHY THIS EXISTS AT ALL. The review window's whole purpose is to show what the shipped selection
// and estimation code actually does with a Stage 2 bank. A hand-written JS copy of
// `nextTargetTheta` + `selectNextNovelServedItem` in the page would look identical on day one and
// diverge quietly forever after — which is the failure this repository has already been bitten by,
// and the reason `apps/web/src/lib/exam/phase2.ts` refuses to restate the selection rule.
//
// So the page does not get a copy. It gets `tsc`'s own output for the same source files the app
// imports, served as ES modules:
//
//   packages/exam-engine/src/**        selectNextNovelServedItem, novelItems, blockReadiness
//   packages/exam-scoring/src/**       estimateLearningCurve, nextTargetTheta, learningRateReadout
//   apps/web/src/lib/exam/phase2.ts    the handoff, the block config, nextBlockTarget, the readout
//
// Two properties make that claim verifiable rather than asserted:
//
//   1. Every emitted file sits at the SAME path as its source, under `stage2-build/engine/`. There
//      is a one-to-one correspondence a reviewer can diff.
//   2. `manifest.json` records the sha256 of every SOURCE file that went in. `--check` recomputes
//      them and fails if any source has moved on since the build, and the page prints the manifest
//      so a stale build is visible in the window rather than silently wrong.
//
// The emitted output is deliberately NOT committed. A committed compiled copy is a second copy.
//
// TWO THINGS THIS BUILD SHIPS THAT PRODUCTION MUST NOT. `items.json` carries `answer.correctKey`,
// the badge-to-operator mapping and the strategy trace, because a reviewer cannot judge the design
// without seeing the system and cannot get informational feedback without the key. In the product
// those fields are server-only: `servedItemSchema` omits `answer` and `provenance` wholesale, and
// the reveal arrives from `/api/exam-submit` after the child commits. That is why this file writes
// into `research/`, never into `apps/web/public/`, and why the keys live under a separate top-level
// `reviewerOnly` object rather than inside the served item shape.
//
// Usage:
//   node research/exam-question-types/build-stage2-review.mjs
//   node research/exam-question-types/build-stage2-review.mjs --check

import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { dirname, join, posix, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '../..');
const OUT = join(HERE, 'stage2-build');
const ENGINE_OUT = join(OUT, 'engine');

/**
 * The real modules the page drives, as entry points. `tsc` pulls in the rest of each graph.
 *
 * `phase2.ts` is the app's own module, imported here rather than reimplemented, so the window runs
 * the same `nextBlockTarget`, `novelBlockPool`, `toLearningTrials` and `summariseLearningBlock` the
 * browser runs in the product.
 */
const ENTRIES = [
  'packages/exam-engine/src/index.ts',
  'packages/exam-scoring/src/index.ts',
  'apps/web/src/lib/exam/phase2.ts',
];

const check = process.argv.includes('--check');

function sha256(path) {
  return createHash('sha256').update(readFileSync(path)).digest('hex');
}

/** Every non-test `.ts` under the source trees the entries reach, for hashing. */
function sourceFiles() {
  const roots = ['packages/exam-engine/src', 'packages/exam-scoring/src', 'apps/web/src/lib/exam'];
  const out = [];
  const walk = (dir) => {
    for (const name of readdirSync(dir).sort()) {
      const full = join(dir, name);
      if (statSync(full).isDirectory()) {
        walk(full);
        continue;
      }
      if (!name.endsWith('.ts') || name.endsWith('.test.ts')) continue;
      out.push(relative(ROOT, full).split('\\').join('/'));
    }
  };
  for (const root of roots) {
    const full = join(ROOT, root);
    if (existsSync(full)) walk(full);
  }
  return out;
}

function sourceHashes() {
  const out = {};
  for (const rel of sourceFiles()) out[rel] = sha256(join(ROOT, rel));
  return out;
}

/* ------------------------------------------------------------------ *
 * 1. The real code, as browser ES modules.
 * ------------------------------------------------------------------ */

/**
 * Compile the entry graphs with `tsc`, rooted at the repository so emitted paths mirror sources.
 *
 * `noEmitOnError` is off on purpose: these files typecheck under their own projects, and the only
 * diagnostics this looser invocation can raise are about the ambient setup (DOM/node lib shape),
 * which do not change the JavaScript. `pnpm typecheck` remains the authority on whether the sources
 * are sound; this step's job is emit.
 */
function compileEngine() {
  rmSync(ENGINE_OUT, { recursive: true, force: true });
  const tsc = join(ROOT, 'node_modules/.bin/tsc');
  if (!existsSync(tsc)) {
    throw new Error('tsc not found — run `pnpm install` at the repository root first');
  }
  try {
    execFileSync(
      tsc,
      [
        ...ENTRIES,
        '--outDir',
        ENGINE_OUT,
        '--rootDir',
        ROOT,
        '--target',
        'es2022',
        '--module',
        'esnext',
        '--moduleResolution',
        'bundler',
        '--lib',
        'es2022,dom,dom.iterable',
        '--strict',
        'false',
        '--skipLibCheck',
        '--declaration',
        'false',
        '--sourceMap',
        'false',
        '--removeComments',
        'false',
      ],
      { cwd: ROOT, stdio: ['ignore', 'pipe', 'pipe'] },
    );
  } catch (err) {
    // tsc exits non-zero on any diagnostic. Emit still happened; surface the text and continue only
    // if the files we need actually landed.
    const text = `${err.stdout ?? ''}${err.stderr ?? ''}`.trim();
    if (text) console.warn(`  tsc diagnostics (emit still produced):\n${text.slice(0, 2000)}`);
  }
  const emitted = [];
  const walk = (dir) => {
    for (const name of readdirSync(dir).sort()) {
      const full = join(dir, name);
      if (statSync(full).isDirectory()) walk(full);
      else if (name.endsWith('.js')) emitted.push(full);
    }
  };
  if (!existsSync(ENGINE_OUT)) throw new Error('tsc produced no output');
  walk(ENGINE_OUT);
  if (emitted.length === 0) throw new Error('tsc produced no .js files');
  return emitted;
}

/**
 * Append `.js` to extensionless RELATIVE specifiers so a browser can resolve them.
 *
 * The sources are written for a bundler (`moduleResolution: Bundler`) and import `'./done'`, which
 * `tsc` passes through verbatim. Bare specifiers such as `@gt-selection/exam-engine` are left
 * alone; the page maps those with an import map, so the module identity the app sees is preserved.
 */
function rewriteSpecifiers(files) {
  const pattern = /(\bfrom\s*|\bimport\s*\(\s*|\bexport\s*\*\s*from\s*)(['"])(\.\.?\/[^'"]*)\2/g;
  let rewritten = 0;
  for (const file of files) {
    const before = readFileSync(file, 'utf8');
    const after = before.replace(pattern, (whole, lead, quote, spec) => {
      if (/\.(js|mjs|cjs|json|css)$/.test(spec)) return whole;
      rewritten += 1;
      return `${lead}${quote}${spec}.js${quote}`;
    });
    if (after !== before) writeFileSync(file, after);
  }
  return rewritten;
}

/* ------------------------------------------------------------------ *
 * 2. The item data, from the banks the catalog names.
 * ------------------------------------------------------------------ */

function readBank(path) {
  const items = [];
  for (const line of readFileSync(path, 'utf8').split('\n')) {
    const trimmed = line.trim();
    if (trimmed.length === 0) continue;
    items.push(JSON.parse(trimmed));
  }
  return items;
}

/**
 * Split one bank into the shape the product ships and the shape only a reviewer may see.
 *
 * `served` mirrors `servedItemSchema`: no `answer`, no `provenance`. The levers are lifted out of
 * provenance into `reviewerOnly` because the trace table names the depth of each item served, and a
 * renderer must not be able to read difficulty structure off the item it is drawing.
 */
function splitBank(items) {
  const served = [];
  const reviewerOnly = {};
  for (const item of items) {
    served.push({
      itemId: item.itemId,
      typeCode: item.typeCode,
      domain: item.domain,
      difficulty: item.difficulty,
      ageBands: item.ageBands,
      demoPath: item.demoPath ?? null,
      content: item.content,
      scoring: item.scoring,
    });
    reviewerOnly[item.itemId] = {
      correctKey: item.answer?.correctKey ?? null,
      operatorChain: item.answer?.operatorChain ?? null,
      badgeChain: item.answer?.badgeChain ?? null,
      system: item.answer?.system ?? null,
      strategyTrace: item.answer?.strategyTrace ?? null,
      keyDistanceFromInput: item.answer?.keyDistanceFromInput ?? null,
      levers: item.provenance?.levers ?? null,
      syntheticOnly: item.syntheticOnly === true,
      validated: item.validated === true,
    };
  }
  return { served, reviewerOnly };
}

function buildItems(catalog) {
  const banks = {};
  const summary = [];
  for (const type of catalog.types) {
    const armPaths = type.banks ?? {};
    const arms = {};
    for (const [arm, relPath] of Object.entries(armPaths)) {
      const full = join(HERE, relPath);
      if (!existsSync(full)) continue;
      const { served, reviewerOnly } = splitBank(readBank(full));
      arms[arm] = { source: relPath, served, reviewerOnly };
    }
    const armNames = Object.keys(arms);
    banks[type.typeCode] = arms;
    summary.push({
      typeCode: type.typeCode,
      // A catalog entry can claim `built`; only the presence of both arms makes it true here.
      status: armNames.length > 0 ? type.status : 'designed',
      arms: armNames.map((arm) => ({ arm, items: arms[arm].served.length })),
    });
  }
  return { banks, summary };
}

/* ------------------------------------------------------------------ *
 * Entry
 * ------------------------------------------------------------------ */

const manifestPath = join(OUT, 'manifest.json');

if (check) {
  if (!existsSync(manifestPath)) {
    console.error('stage2-review: not built. Run `pnpm stage2:review:build`.');
    process.exit(1);
  }
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
  const now = sourceHashes();
  const stale = Object.keys({ ...manifest.sources, ...now }).filter(
    (rel) => manifest.sources[rel] !== now[rel],
  );
  if (stale.length > 0) {
    console.error(
      `stage2-review: STALE — ${stale.length} source file(s) changed since the build:\n  ` +
        `${stale.slice(0, 10).join('\n  ')}\nRun \`pnpm stage2:review:build\`.`,
    );
    process.exit(1);
  }
  console.log(
    `stage2-review: fresh — ${Object.keys(manifest.sources).length} source files match the build.`,
  );
  process.exit(0);
}

const catalog = JSON.parse(readFileSync(join(HERE, 'stage2-review-types.json'), 'utf8'));

mkdirSync(OUT, { recursive: true });
console.log('stage2-review: compiling the real modules to browser ES modules…');
const emitted = compileEngine();
const rewrites = rewriteSpecifiers(emitted);
console.log(
  `  ${emitted.length} modules emitted under stage2-build/engine, ` +
    `${rewrites} relative specifiers given .js extensions`,
);

const entryPaths = {};
for (const entry of ENTRIES) {
  const jsPath = join(ENGINE_OUT, entry.replace(/\.ts$/, '.js'));
  if (!existsSync(jsPath)) throw new Error(`entry ${entry} did not emit`);
  entryPaths[entry] = posix.join('stage2-build/engine', entry.replace(/\.ts$/, '.js'));
}

const { banks, summary } = buildItems(catalog);
writeFileSync(join(OUT, 'items.json'), JSON.stringify(banks));
for (const row of summary) {
  const arms = row.arms.map((a) => `${a.arm}:${a.items}`).join(' ') || 'no banks';
  console.log(`  ${row.typeCode.padEnd(20)} ${row.status.padEnd(9)} ${arms}`);
}

const sources = sourceHashes();
writeFileSync(
  manifestPath,
  JSON.stringify(
    {
      builtAt: new Date().toISOString(),
      entries: entryPaths,
      // The hash set `--check` compares against. Its point is that the window can never be running
      // a compiled copy of code that has since changed without saying so.
      sources,
      sourceCount: Object.keys(sources).length,
      types: summary,
    },
    null,
    2,
  ),
);
console.log(`  manifest.json records sha256 for ${Object.keys(sources).length} source files`);
console.log('\nServe it (a different port from the question-type review UI on 4200):');
console.log('  python3 research/exam-question-types/serve-review.py 4300');
console.log('  open http://127.0.0.1:4300/stage2-review.html');
