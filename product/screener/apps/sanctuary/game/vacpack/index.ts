/**
 * THE VACPACK, AS THE INTEGRATOR SEES IT.
 *
 *     import { Vacpack, useVacpackTank } from './vacpack';
 *
 *     // inside the existing <Canvas>, anywhere, mount order does not matter:
 *     <Vacpack
 *       enabled={locked && !beat}
 *       onCapture={(slimeId) => removeFromWorld(slimeId)}
 *       onRelease={(family, position) => addToWorld(family, position)}
 *     />
 *
 *     // and in the flat HUD, outside the Canvas:
 *     const { held } = useVacpackTank();
 *
 * CONTROLS. Hold the LEFT mouse button to draw a slime in. RIGHT mouse button or Q plops the front-most one
 * back out. Walking, jumping and looking are untouched and work while carrying.
 *
 * THE TWO OPTIONAL PROPS beyond the agreed three are `worldRadius` (default 34, the keeper's own bound) and
 * `groundY` (default 0). They exist because "must land inside the world bounds" is a promise this directory
 * makes and it cannot keep it against numbers it cannot see. Passing neither is correct for the ranch as it
 * stands today.
 *
 * ON IDENTITY, briefly, because it is the one thing that needs a decision from the integrator: `onCapture`
 * hands back the `herd.ts` registry id as a string, which is NOT the world's `Slime.id`. `capturedTrace(id)`
 * gives family, stage and the exact spot it was standing on so the world slime can be matched by position.
 * `identity.ts` sets out the two-line change to `slimes/` that would make this exact instead.
 */
export { Vacpack } from './Vacpack';
export { useVacpackTank, TANK_CAPACITY, tankReset, type Held } from './tank';
export { capturedTrace, type CapturedTrace } from './identity';
export { PAINT, paintOf, type Paint } from './families';
