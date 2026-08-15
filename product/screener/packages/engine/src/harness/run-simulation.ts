/**
 * Runs a synthetic cohort through the prototype screener and prints what the engine did.
 *
 * This is the only way to check the decision logic before real candidates exist, and it is
 * also the honest limit on everything it prints: these are simulated children whose true
 * ability the code generated, so the numbers test an algorithm and say nothing about people.
 *
 *   npm run sim
 */
import { createSeededLibrary } from '@gt/item-library';
import { defaultScreenerConfig, prototypeSurfaces } from '../configs.js';
import { simulateCohort } from './simulate.js';

const { library, snapshotId } = createSeededLibrary();
const config = defaultScreenerConfig(snapshotId, '3-5');
const surface = prototypeSurfaces[0]!;

const available = library.resolveForConsumer(snapshotId, {
  ageBand: config.ageBand,
  maxReadingLoad: config.maxReadingLoad,
  requireCalibrated: config.requireCalibratedItems, usage: 'assessment',
});

const pct = (x: number) => (Number.isNaN(x) ? '  n/a' : `${(x * 100).toFixed(1)}%`);

console.log('Prototype screener simulation');
console.log('='.repeat(64));
console.log(`snapshot            ${snapshotId}`);
console.log(`generators servable ${available.length} of ${library.all().length} in the library`);
console.log(`  by domain         ${Object.entries(library.byDomain(available)).map(([d, g]) => `${d}:${g.length}`).join('  ')}`);
console.log(`ability threshold   ${config.stopRule.abilityThreshold} logits`);
console.log(`confidence to pass  ${config.stopRule.confidenceAbove}`);
console.log(`confidence to rule out ${config.stopRule.confidenceBelow}  (higher on purpose: a missed child costs more)`);
console.log(`item budget         ${config.stopRule.minItems} to ${config.stopRule.maxItems}`);
console.log(`surface             ${surface.label} (recommend at p >= ${surface.recommendProbability})`);
console.log('');

// A general population, which is who a public marketing screener actually reaches.
const general = simulateCohort({ config, surface, available, n: 600, firstSeed: 9000 });
// A self-selected pool, which is who reaches GT today. Shifted up and narrower, and the
// admission-cutoff work argues this shape is the hardest case for any threshold.
const selected = simulateCohort({
  config,
  surface,
  available,
  n: 600,
  firstSeed: 40000,
  abilityMean: 1.0,
  abilitySd: 0.6,
});

for (const [label, c] of [
  ['General population (mean 0, sd 1)', general],
  ['Self-selected pool (mean 1.0, sd 0.6)', selected],
] as const) {
  console.log(label);
  console.log('-'.repeat(64));
  console.log(`  n                 ${c.n}`);
  console.log(`  base rate above   ${pct(c.baseRate)}`);
  console.log(`  items, median     ${c.medianItems}`);
  console.log(`  items, mean       ${c.meanItems.toFixed(1)}`);
  console.log(`  sensitivity       ${pct(c.sensitivity)}   (of those truly above, the share recommended)`);
  console.log(`  specificity       ${pct(c.specificity)}   (of those truly below, the share not recommended)`);
  console.log(`  precision         ${pct(c.precision)}   (of those recommended, the share truly above)`);
  console.log(`  stop reasons      ${Object.entries(c.stopReasons).map(([k, v]) => `${k}:${v}`).join('  ')}`);
  console.log('');
}

console.log('Read the precision figures against the base rate beside them. A screener aimed at a');
console.log('self-selected pool looks more precise for reasons that have nothing to do with the');
console.log('engine, which is why both cohorts are reported rather than one.');
console.log('');
console.log('Every generator here has an assumed difficulty, not a calibrated one, so the posterior');
console.log('is only as good as numbers we chose. Nothing above is evidence about children.');
