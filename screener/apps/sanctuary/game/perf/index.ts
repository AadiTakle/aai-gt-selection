/**
 * The frame budget's instruments and its two optimisations.
 *
 * WHY THIS DIRECTORY EXISTS SEPARATELY. `docs/design/bramblebrook-frame-budget.md` has the
 * measurement; the short version is that the frame is CPU draw-call submission and nothing else, so
 * the fix is to submit fewer calls. Everything that does that lives here rather than in the files
 * that build the world, because those files are under active development by another author and a
 * restructuring of them would conflict on every merge. `Batched` therefore works by traversing the
 * scene at runtime, which is more machinery than editing the geometry at its source and is the right
 * trade only while the branch is busy.
 */
export { Batched } from './Batched';
export { Hud } from './Hud';
export { Probe } from './Probe';
export { batchingEnabled, perfEnabled } from './enabled';
export { useShadowCadence } from './cadence';
