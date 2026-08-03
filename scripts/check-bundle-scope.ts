import { readdir, readFile, stat } from 'node:fs/promises';
import path from 'node:path';

/**
 * What the deployed container is allowed to contain.
 *
 * The standalone bundle used to be ~91 MB holding `docs/`, `infra/`, `brainlifting/` and
 * `supabase/` — the project's governance records, research notes, BrainLift strategy documents,
 * Terraform configuration and database migrations — none of which a web container reads. Of those,
 * `infra/` never reached a built image: `.dockerignore` keeps it out of the build context, so the
 * Terraform config was only ever in a local `next build`. The rest did ship. Nothing was
 * misconfigured:
 * `bank-loader.ts` and `verifiers/quantitative.ts` built their file paths in a way Next's build
 * tracer could not resolve, and an unresolvable `fs` argument makes the tracer fall back to
 * globbing the nearest directory it did resolve. With `../../` in the path that directory was the
 * repository root, so the whole repository was swept in. That is also, by accident, how the item
 * banks arrived, which is why nothing ever failed.
 *
 * Both halves of that are now explicit: the paths are statically resolvable, and the two files
 * genuinely read at runtime are declared in `outputFileTracingIncludes`. This guard exists because
 * that state is easy to lose silently — the next module that walks the tree with a computed path
 * re-sweeps, and the only visible symptom is a bigger image.
 *
 * The bundle on disk is checked against an allowlist, because that is what actually ships. The one
 * thing that could defeat such a check is `outputFileTracingExcludes`, which was measured on this
 * build to remove swept files from the bundle AND from the `*.nft.json` manifests — leaving a
 * clean artefact, a tracer still globbing the repository, and nothing to observe. So the config is
 * checked too.
 */

const root = process.cwd();
const bundle = path.join(root, 'apps', 'web', '.next', 'standalone');

/**
 * Bundle-relative paths that may exist, as exact entries or as `dir/**` prefixes.
 *
 * Deliberately an allowlist. A denylist of `docs/`, `infra/` and `brainlifting/` would pass the
 * next sweep that happens to pull in something nobody thought to name.
 */
const ALLOWED_TREES = [
  // Next's own standalone server output, plus the node_modules it traced for it.
  'apps/web/.next/',
  'apps/web/node_modules/',
  'node_modules/',
  // The runtime data the app reads off disk, declared in apps/web/next.config.ts. Everything
  // else under research/ is notes and generators that no route opens.
  'research/exam-question-types/banks/',
  'research/exam-question-types/generators/lexicon-child-en.mjs',
  // The Stage 2 template bank, read by `lib/exam/materialised-session.ts` when serve-time
  // materialisation is on (D-210). Data, like the banks: the materialiser itself is a static import
  // and is bundled into `.next` rather than copied here, which is the tell that this entry is one
  // declared file and not a research sweep — if the tracer ever loses the fs path in that module,
  // this grows into the whole directory and the check fails rather than the bundle quietly bloating.
  'research/exam-question-types/templates/',
];
const ALLOWED_FILES = ['apps/web/package.json', 'apps/web/server.js'];

/** Named for the failure message: these are the four that were actually shipping. */
const NEVER_SHIP = ['docs', 'infra', 'brainlifting', 'supabase'];

const violations: string[] = [];

function isAllowed(relative: string): boolean {
  if (ALLOWED_FILES.includes(relative)) return true;
  return ALLOWED_TREES.some((allowed) =>
    allowed.endsWith('/') ? relative.startsWith(allowed) : relative === allowed,
  );
}

/**
 * Stray paths as `docs/ (214), supabase/ (7)`.
 *
 * Grouped by top-level entry because a sweep produces thousands of paths, and a guard that prints
 * all of them is a guard people learn to scroll past.
 */
function summarise(stray: readonly string[]): string {
  const counts = new Map<string, number>();
  for (const relative of stray) {
    const top = relative.includes('/') ? `${relative.split('/')[0]!}/` : relative;
    counts.set(top, (counts.get(top) ?? 0) + 1);
  }
  return [...counts]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([top, count]) => `${top} (${String(count)})`)
    .join(', ');
}

async function walk(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(
    entries.map(async (entry) => {
      const target = path.join(directory, entry.name);
      return entry.isDirectory() ? walk(target) : [target];
    }),
  );
  return nested.flat();
}

try {
  await stat(bundle);
} catch {
  throw new Error(
    `No standalone bundle at ${path.relative(root, bundle)}. Run \`pnpm build\` first — this ` +
      'check reads the real build output rather than asserting about it.',
  );
}

const bundled = await walk(bundle);
const relativeBundled = bundled.map((file) =>
  path.relative(bundle, file).split(path.sep).join('/'),
);

// 1. Nothing outside the allowlist ships.
const strayBundled = relativeBundled.filter((relative) => !isAllowed(relative));
if (strayBundled.length > 0) {
  violations.push(
    `${String(strayBundled.length)} file(s) ship in the standalone bundle that nothing reads at ` +
      `runtime: ${summarise(strayBundled)}. Either a module now builds an fs path the build ` +
      'tracer cannot resolve — look for the "whole project was traced unintentionally" build ' +
      'warning, which names the module — or this really is needed, in which case add it to ' +
      'ALLOWED_TREES with a reason.',
  );
}

// 2. The four that were shipping, named explicitly so the regression is unmistakable.
for (const forbidden of NEVER_SHIP) {
  if (relativeBundled.some((relative) => relative.startsWith(`${forbidden}/`))) {
    violations.push(
      `${forbidden}/ is in the standalone bundle. A web container must not ship the project's ` +
        'internal governance, research and infrastructure files.',
    );
  }
}

// 3. What was fixed in PR #21 has to stay fixed: the banks must still be there. A bundle that
//    dropped them fails its Docker HEALTHCHECK at deploy, but catching it at build time is
//    cheaper than catching it at rollout.
const registry = await readFile(
  path.join(root, 'apps', 'web', 'src', 'lib', 'exam', 'registry.generated.ts'),
  'utf8',
);
const wiredTypes = [...registry.matchAll(/^\s*typeCode: '([^']+)',$/gm)].map((match) => match[1]!);
if (wiredTypes.length === 0) {
  violations.push(
    'Could not read any wired typeCode out of registry.generated.ts, so the bank check below ' +
      'would have passed vacuously.',
  );
}
const missingBanks = wiredTypes.filter(
  (code) => !relativeBundled.includes(`research/exam-question-types/banks/${code}.jsonl`),
);
if (missingBanks.length > 0) {
  violations.push(
    `${String(missingBanks.length)} of ${String(wiredTypes.length)} wired banks are missing from ` +
      `the bundle: ${missingBanks.join(', ')}. Check outputFileTracingIncludes in ` +
      'apps/web/next.config.ts.',
  );
}
if (!relativeBundled.includes('research/exam-question-types/generators/lexicon-child-en.mjs')) {
  violations.push(
    'The child lexicon is missing from the bundle. GB-WORDLADDER-01 then fails every submission ' +
      'closed and GB-WORDFORGE-01 stops telling a made-up word from a real one.',
  );
}

// 4. The answer-key firewall, at the artefact level. The banks carry every answer.correctKey, so
//    a bundle that published them under public/ would put the keys one URL from the child.
const published = relativeBundled.filter(
  (relative) => /(^|\/)public\//.test(relative) && relative.endsWith('.jsonl'),
);
if (published.length > 0) {
  violations.push(
    `Bank data published under public/: ${published.join(', ')}. The banks carry every ` +
      'answer.correctKey and must stay server-side.',
  );
}

// 5. Nothing may silence check 1 by suppressing the output instead of fixing the path. An exclude
//    would make every assertion above pass over a build whose tracer is still globbing the whole
//    repository, so the checks would go quiet at exactly the moment they were needed.
const config = await readFile(path.join(root, 'apps', 'web', 'next.config.ts'), 'utf8');
if (config.includes('outputFileTracingExcludes')) {
  violations.push(
    'apps/web/next.config.ts sets outputFileTracingExcludes. That subtracts files from the ' +
      'bundle and from the *.nft.json manifests, which hides a repository sweep from every check ' +
      'above without making the tracer any less blind — so the next module that reads a computed ' +
      'path re-sweeps unobserved. Make the fs path statically resolvable instead ' +
      '(see bank-loader.ts). If an exclude is genuinely the only option, delete this check and ' +
      'record why.',
  );
}

if (violations.length > 0) {
  throw new Error(`Standalone bundle scope violations:\n- ${violations.join('\n- ')}`);
}

const bytes = (await Promise.all(bundled.map(async (file) => (await stat(file)).size))).reduce(
  (total, size) => total + size,
  0,
);
console.log(
  `Standalone bundle scope verified: ${String(relativeBundled.length)} files, ` +
    `${(bytes / 1024 / 1024).toFixed(1)} MiB, ${String(wiredTypes.length)} wired banks present, ` +
    'no repository sweep.',
);
