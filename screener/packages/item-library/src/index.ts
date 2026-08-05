import type { ItemGenerator } from '@gt/contracts';
import { ItemLibrary } from './registry.js';
import { quantitativeGenerators } from './generators/quantitative.js';
import { verbalGenerators } from './generators/verbal.js';
import { spatialGenerators } from './generators/spatial.js';
import { fluidGenerators } from './generators/fluid.js';

export { Rng } from './rng.js';
export { ItemLibrary, compareSemver } from './registry.js';
export type { SnapshotRequest } from './registry.js';
export { validateGenerator } from './validation.js';
export {
  defineGenerator,
  assumed,
  text,
  glyphs,
  grid,
  shape,
  contentKey,
} from './generator-kit.js';
export type { GeneratorSpec } from './generator-kit.js';

/**
 * The generators this repository ships with. Nothing in the engine or the apps imports this
 * list directly. They read a snapshot instead, so a consumer that wants a different bank
 * simply builds a library of its own.
 */
export const seedGenerators: readonly ItemGenerator[] = [
  ...quantitativeGenerators,
  ...verbalGenerators,
  ...spatialGenerators,
  ...fluidGenerators,
];

/** A library loaded with the seed generators and one snapshot cut over all of them. */
export function createSeededLibrary(): { library: ItemLibrary; snapshotId: string } {
  const library = new ItemLibrary();
  for (const gen of seedGenerators) library.publish(gen);
  const snapshot = library.createSnapshot({
    label: 'seed bank, all four domains',
    createdBy: 'library-seed',
  });
  return { library, snapshotId: snapshot.id };
}
