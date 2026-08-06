/**
 * What UI do I need in order to serve these question types?
 *
 *   npm run ui                                  every type, and the minimum to serve all of them
 *   npm run ui -- --types FLU-MATRIX-01,VER-CLOZE-01
 *   npm run ui -- --profile voice-only          which types this app shape can serve, and why not the rest
 *   npm run ui -- --cogat                       the CogAT-aligned set only
 *   npm run ui -- --table                       per-type requirement table
 */
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, isCounted, type UiElement, type UiRequirement } from './capabilities';
import { contextProfileFor, costBreakdown, validateTheme, type ThemePack } from './context';
import { COGAT_ALIGNED_TYPES, COGAT_MAP } from './cogat';
import {
  minimumForEverything,
  planFor,
  satisfies,
  servableBy,
  unlockOrder,
} from './plan';
import { PROFILES, type ProfileName } from './profiles';
import { allTypeCodes, CHANNEL_OVERRIDES, requirementFor } from './requirements';

const HERE = dirname(fileURLToPath(import.meta.url));

function arg(name: string): string | null {
  const flag = `--${name}`;
  const index = process.argv.indexOf(flag);
  if (index >= 0 && index + 1 < process.argv.length) return process.argv[index + 1]!;
  const inline = process.argv.find((a) => a.startsWith(`${flag}=`));
  return inline ? inline.slice(flag.length + 1) : null;
}

function has(name: string): boolean {
  return process.argv.includes(`--${name}`);
}

/**
 * Find a theme file however the user spelled it.
 *
 * `npm run ui` from the repo root runs with `screener/` as its working directory, so a path a user
 * copied out of the repo tree does not resolve and the raw `ENOENT` stack trace is no help at all.
 * Tries, in order: as given, relative to the repo root, and as a bare name inside the bundled themes
 * directory, so `--theme gem-collector.example` is enough.
 */
function resolveThemePath(given: string): string {
  const themesDir = join(HERE, '..', 'themes');
  const candidates = [
    given,
    join(HERE, '..', '..', '..', '..', given),
    join(themesDir, given),
    join(themesDir, `${given}.json`),
  ];
  for (const candidate of candidates) {
    if (existsSync(candidate)) return candidate;
  }

  const available = existsSync(themesDir)
    ? readdirSync(themesDir).filter((f) => f.endsWith('.json'))
    : [];
  console.error(`\nNo theme file found for "${given}". Looked in:`);
  for (const candidate of candidates) console.error(`  ${candidate}`);
  if (available.length > 0) {
    console.error(`\nBundled themes you can pass by name:`);
    for (const file of available) console.error(`  --theme ${file.replace(/\.json$/, '')}`);
  }
  console.error('');
  process.exit(1);
}

const HELP = `
What UI do I need in order to serve these question types?

  npm run ui                          every type, and the minimum UI to serve all of them
  npm run ui -- --cogat               just the CogAT-aligned types
  npm run ui -- --types A,B,C         a specific selection, by type code
  npm run ui -- --table               add a per-type breakdown
  npm run ui -- --unlock              which element unlocks the most types next
  npm run ui -- --profile NAME        REVERSE: what an app of this shape can serve
  npm run ui -- --list                every type code, so --types has something to copy
  npm run ui -- --context             what a NEW CONTEXT has to write, per type
  npm run ui -- --theme FILE          check a theme pack before shipping it

Profiles: ${Object.keys(PROFILES).join(', ')}

The "--" matters. Without it npm keeps the flags for itself and this prints the default report.
Runs from the repo root or from screener/; both work.
`;

if (has('help') || has('h')) {
  console.log(HELP);
  process.exit(0);
}

if (has('list')) {
  for (const code of allTypeCodes()) {
    const mapping = COGAT_MAP[code];
    const tag = mapping ? `  ${mapping.subtest} (${mapping.strength})` : '';
    console.log(`  ${code}${tag}`);
  }
  process.exit(0);
}

function renderRequirement(requirement: UiRequirement, indent = '  '): void {
  const response = requirement.elements.filter(
    (e) =>
      !['nominalChannel', 'orderedChannel', 'cyclicChannel', 'gridLayout', 'coPresent',
        'timedReveal', 'motion', 'depthCue', 'richText', 'audioOut'].includes(e),
  );
  const presentation = requirement.elements.filter((e) => !response.includes(e));

  console.log(`${indent}how the child answers`);
  for (const element of response) console.log(`${indent}  ${element}  ${describe(element)}`);
  console.log(`${indent}what the app must show`);
  for (const element of presentation) {
    const count = isCounted(element) ? requirement.counts[element] : undefined;
    const qty = count === undefined ? '' : ` (at least ${String(count)})`;
    console.log(`${indent}  ${element}${qty}  ${describe(element)}`);
  }
  if (requirement.readingBand) {
    console.log(`${indent}  reading band: ${requirement.readingBand}`);
  }
}

const profileName = arg('profile');
const typesArg = arg('types');

// --- what does it cost a new context to adopt these types? ------------------
if (has('context')) {
  const codes = typesArg
    ? typesArg.split(',').map((s) => s.trim()).filter(Boolean)
    : has('cogat')
      ? [...COGAT_ALIGNED_TYPES]
      : allTypeCodes();
  const breakdown = costBreakdown(codes);

  console.log(`\n# What a new context has to do for ${String(codes.length)} type(s)\n`);
  const labels: Record<string, string> = {
    'legend-only': 'A LEGEND IS ENOUGH. No words. Map the variables and you are done',
    revoice: 'RE-VOICE. One instruction rewrite per type. No per-item work',
    reauthor: 'RE-AUTHOR. New material per item, which changes the instrument',
  };
  for (const cost of ['legend-only', 'revoice', 'reauthor'] as const) {
    const list = breakdown[cost];
    console.log(`## ${cost}  (${String(list.length)} types)\n`);
    console.log(`  ${labels[cost]}\n`);
    for (const typeCode of list) {
      const profile = contextProfileFor(typeCode);
      console.log(`  ${typeCode.padEnd(20)} ${profile.why}`);
      if (profile.authorSupplies) {
        console.log(`  ${' '.repeat(20)} supply: ${profile.authorSupplies.join('; ')}`);
      }
    }
    console.log('');
  }

  const free = breakdown['legend-only'].length + breakdown.revoice.length;
  console.log(
    `  ${String(free)} of ${String(codes.length)} types need NO new questions written. ` +
      `${String(breakdown.reauthor.length)} do.\n`,
  );
  process.exit(0);
}

// --- validate a theme pack --------------------------------------------------
const themePath = arg('theme');
if (themePath) {
  const pack = JSON.parse(readFileSync(resolveThemePath(themePath), 'utf8')) as ThemePack;
  const codes = typesArg
    ? typesArg.split(',').map((s) => s.trim()).filter(Boolean)
    : has('cogat')
      ? [...COGAT_ALIGNED_TYPES]
      : allTypeCodes();

  const issues = validateTheme(pack, codes);
  const errors = issues.filter((i) => i.severity === 'error');
  const warnings = issues.filter((i) => i.severity === 'warning');

  console.log(`\n# Theme "${pack.theme}" against ${String(codes.length)} type(s)\n`);
  const ready = codes.filter((c) => !errors.some((e) => e.typeCode === c));
  console.log(`  ready to serve: ${String(ready.length)} of ${String(codes.length)}\n`);

  if (errors.length > 0) {
    console.log('## Must fix\n');
    for (const issue of errors) {
      console.log(`  ${(issue.typeCode ?? 'theme').padEnd(20)} ${issue.message}`);
    }
    console.log('');
  }
  if (warnings.length > 0) {
    console.log('## Worth a look\n');
    for (const issue of warnings) {
      console.log(`  ${(issue.typeCode ?? 'theme').padEnd(20)} ${issue.message}`);
    }
    console.log('');
  }
  if (errors.length === 0) console.log(`  No blocking problems.\n`);
  process.exit(errors.length === 0 ? 0 : 1);
}

// --- reverse: what can this app shape serve? --------------------------------
if (profileName) {
  const profile = PROFILES[profileName as ProfileName];
  if (!profile) {
    console.error(`Unknown profile "${profileName}". Try: ${Object.keys(PROFILES).join(', ')}`);
    process.exit(1);
  }

  const { servable, blocked } = servableBy(profile);
  const total = servable.length + blocked.length;
  console.log(`\n# ${profile.name} can serve ${String(servable.length)} of ${String(total)} types\n`);
  console.log('## Servable\n');
  for (const code of servable) console.log(`  ${code}`);

  // Group the blocked types by what is missing, since one missing element usually explains many.
  const byMissing = new Map<string, string[]>();
  for (const { typeCode, shortfalls } of blocked) {
    const key = shortfalls.map((s) => s.element).sort().join(' + ');
    byMissing.set(key, [...(byMissing.get(key) ?? []), typeCode]);
  }
  console.log(`\n## Blocked, grouped by what is missing\n`);
  for (const [missing, codes] of [...byMissing].sort((a, b) => b[1].length - a[1].length)) {
    console.log(`  missing ${missing}  (${String(codes.length)} types)`);
    console.log(`    ${codes.join(', ')}`);
  }
  console.log('');
  process.exit(0);
}

// --- forward: what do these types cost? ------------------------------------
const selected = typesArg
  ? typesArg.split(',').map((s) => s.trim()).filter(Boolean)
  : has('cogat')
    ? [...COGAT_ALIGNED_TYPES]
    : allTypeCodes();

const unknown = selected.filter((code) => !allTypeCodes().includes(code));
if (unknown.length > 0) {
  console.error(`Unknown type code(s): ${unknown.join(', ')}`);
  process.exit(1);
}

const plan = planFor(selected);

console.log(`\n# UI needed for ${String(selected.length)} question type(s)\n`);
if (selected.length <= 12) console.log(`  ${selected.join(', ')}\n`);

console.log('## The union: what one app must be able to do\n');
renderRequirement(plan.union);

if (plan.soleReasons.size > 0) {
  console.log('\n## Paid for by a single type\n');
  console.log('  Dropping that one type removes the whole element from the build.\n');
  for (const [element, typeCode] of [...plan.soleReasons].sort()) {
    console.log(`  ${element}  needed only by ${typeCode}`);
  }
}

if (has('table')) {
  console.log('\n## Per type\n');
  for (const { typeCode, requirement } of plan.perType) {
    const channels = CHANNEL_OVERRIDES[typeCode];
    console.log(`  ${typeCode}`);
    console.log(`    ${requirement.elements.join(', ')}`);
    const counts = Object.entries(requirement.counts);
    if (counts.length > 0) {
      console.log(`    counts: ${counts.map(([k, v]) => `${k}=${String(v)}`).join(' ')}`);
    }
    if (channels) console.log(`    channels declared because: ${channels.why}`);
  }
}

// The full-library minimum is the headline number, so print it even for a subset.
if (selected.length !== allTypeCodes().length) {
  const everything = minimumForEverything();
  console.log(
    `\n## For comparison, serving all ${String(allTypeCodes().length)} types needs ` +
      `${String(everything.elements.length)} elements\n`,
  );
  console.log(`  ${everything.elements.join(', ')}`);
}

if (has('unlock')) {
  console.log('\n## Build order: which element unlocks the most types next\n');
  for (const step of unlockOrder()) {
    const adds = step.adds > 0 ? `+${String(step.adds)}` : '+0';
    console.log(
      `  ${step.element.padEnd(18)} ${adds.padStart(4)} types  ` +
        `(${String(step.cumulativeTypes)} servable cumulatively)`,
    );
  }
}

// Sanity: confirm the union really does serve everything asked for.
const asCapability = {
  name: 'computed-union',
  elements: plan.union.elements,
  counts: plan.union.counts,
  readingBand: plan.union.readingBand,
};
const unmet = plan.perType.filter(({ requirement }) => !satisfies(asCapability, requirement).ok);
console.log(
  unmet.length === 0
    ? `\nThe union above satisfies all ${String(selected.length)} selected types.\n`
    : `\nBUG: the union does not satisfy ${unmet.map((u) => u.typeCode).join(', ')}\n`,
);
process.exit(unmet.length === 0 ? 0 : 1);
