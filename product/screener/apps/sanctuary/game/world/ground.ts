import {
  BARN,
  BARN_FLOOR_Y,
  BARN_IN_HALF_D,
  BARN_IN_HALF_W,
  BARN_WALL_T,
  DOOR,
  LOFT_TOP,
} from './barn';
import { overLoft } from './ladder';
import { toLocal } from './plan';

/**
 * HOW HIGH THE GROUND IS AT A POINT ON THE RANCH — one function, for everything that stands on it.
 *
 * THE OWNER'S WORDS: "when i drop slimes in the barn, they lowkey sink through the floor. so i think we
 * need to make the ground level a little higher."
 *
 * The diagnosis is exact and so is the number. `BARN_FLOOR_Y` is 0.07, because a threshing floor laid at
 * exactly zero z-fights with the meadow that is also at exactly zero — see the note on that constant. Every
 * slime, meanwhile, is handed `position: [x, 0, z]` by `slimes/keep.ts` and drawn there, so inside the barn
 * the bottom 7cm of a creature is under the boards. "Lowkey sink" is 7cm, measured.
 *
 * THE FIX IS NOT A HIGHER GROUND LEVEL, IT IS A GROUND LEVEL THAT VARIES. Raising the constant the owner
 * was pointing at would fix the fifteen slimes in the barn by floating the other fifteen 7cm over the
 * meadow — the same defect, mirrored, and on nine times as much of the ranch. So the height becomes a
 * function of position, which is what a building with a floor in it actually requires.
 *
 * ── WHAT THIS IS AND IS NOT ────────────────────────────────────────────────────────────────────────────
 *
 * It is a FLOOR height in world y, not an eye height, and it is the surface a body's feet rest on. That is
 * deliberately not what `ladder.ts`'s `supportEye` returns, which is the same question asked for the camera
 * and therefore answered in eye heights.
 *
 * THE TWO AGREE EXACTLY ABOUT THE LOFT AND DELIBERATELY DISAGREE ABOUT THE BARN'S FLOOR, and both halves
 * of that are worth stating because the first is a requirement and the second looks like a bug.
 *
 *     supportEye(x, z, fromEye)  ==  groundY(x, z, fromEye - KEEPER_EYE) + KEEPER_EYE     on the loft
 *
 * is asserted in `ground.test.ts`, because the loft is where a disagreement of a few centimetres puts a
 * child's feet inside their own floor — the hazard the `LOFT_TOP` note was written for. On the threshing
 * floor `supportEye` keeps the keeper's eye at `EYE` regardless, which is `barn.ts`'s own decision: this
 * controller has no steps, the floor was held to 7cm precisely so that it would not need one, and lifting
 * the camera 7cm on the way through a doorway would be a visible bob bought for nothing. A CREATURE is the
 * opposite case — it is a solid object resting on a surface a child can see it resting on, and 7cm of a
 * gumdrop under the boards is exactly what was reported. So the keeper tolerates the step and the herd does
 * not, and that is a difference between a camera and a body rather than an inconsistency.
 *
 * What this is NOT is `terrain.ts`'s `heightAt`: that
 * module describes a rolling valley and NOTHING IN THE GAME IMPORTS IT — the live meadow is
 * `Buildings.tsx`'s `groundHeight`, which is exactly zero inside r = 42, "the contract with the player
 * controller". Wiring a slime to `heightAt` would stand the herd on a landscape that is not being drawn.
 *
 * ── THE THREE SURFACES, AND WHY ONLY TWO OF THEM ARE A SLIME'S ─────────────────────────────────────────
 *
 * THE MEADOW, at zero. Everywhere outside the barn's own floor, which is all of the ranch bar 130m².
 *
 * THE THRESHING FLOOR, at `BARN_FLOOR_Y`. The interior rectangle, plus the stone threshold that carries
 * that height out through the doorway — see `BARN_THRESHOLD`. Both are read off the same constants the
 * floor slab and the sill are drawn from in `barnInterior.tsx`, so the walking height cannot drift from the
 * boards.
 *
 * THE LOFT DECK, at `LOFT_TOP`, and it is ONE-WAY, exactly as `supportEye` is. The deck holds you only if
 * you were already up there. This is not a detail that can be dropped for a simpler rule, and the reason is
 * the loft's placement: it covers the FRONT of the barn, from `LOFT.from` to the +Z gable, which is the half
 * a child walks into and the half they plop a slime in. A two-sided rule would teleport a slime that
 * wandered under the loft 3.4m into the air and stand it on the deck, and the barn's whole interior is under
 * that deck. So the height a body is coming FROM decides whether the deck is a floor or a ceiling.
 *
 * WHAT A SLIME PASSES, AND WHY IT IS NOTHING. `fromY` defaults to `-Infinity`: "I am on the ground and I
 * have no way up". A slime cannot climb — `ladder.ts` is the keeper's — so for the herd this is a pure
 * function of x and z, which is what `wander.ts` needs and what a test can sweep. `supportEye`'s one-way
 * resolution is the right shape for a FALLING keeper, where the question is which surfaces the fall crossed;
 * a creature that never leaves the floor needs none of that machinery, and giving it the machinery anyway
 * would mean carrying a vertical velocity for forty slimes that is always zero.
 *
 * ── THE ONE THING THIS HAS TO GET RIGHT THAT A CONSTANT DOES NOT ───────────────────────────────────────
 *
 * A HARD EDGE FLICKERS. A slime resting on the threshold, nudged a tenth of a millimetre by a neighbour's
 * push-out, would cross a step discontinuity every frame and shudder between two heights 7cm apart — which
 * is a worse bug than the one being fixed, because a sinking slime is merely wrong and a vibrating one looks
 * broken. The barn's own doors have the same hazard and answer it with two radii (`doorTarget`); hysteresis
 * is the wrong instrument here, because it makes the height depend on history and the whole value of this
 * function is that it does not.
 *
 * So the edge is BLENDED instead: `GROUND_BLEND` metres of smoothstep straddling the lip of the raised
 * floor. That makes the height continuous and its slope bounded, so a jitter of ε in x moves y by at most
 * 0.38ε and nothing can oscillate. It is centred ON the lip rather than run inboard or outboard of it,
 * which halves the worst error to 3.5cm and puts it exactly where the sill's own rounded arris is. And what
 * it buys is not only the absence of a bug: crossing the threshold now reads as a slime rolling up over a
 * stone sill, which is the owner's "step up and down as it crosses".
 *
 * The blend band lies inside the 34cm walls everywhere except at the doorway, so it is unreachable ground
 * on every side but the one it is for. `ground.test.ts` measures that rather than asserting it.
 */

/** The meadow, and the only height anything outside the barn ever stands at. See `groundHeight`. */
export const MEADOW_Y = 0;

/**
 * How wide the step at the edge of a raised floor is smeared, in metres.
 *
 * 0.28, and it is set from three sides. It has to be wider than any jitter a resting slime can suffer,
 * which is micrometres, so almost anything would do for the anti-flicker job alone. It has to be no wider
 * than the wall it hides behind — `BARN_WALL_T` is 0.34 — or the ramp would reach into the barn past the
 * inner face and a slime standing against a stall front would be leaning downhill. And the narrower it is
 * the better the sill reads, because a 7cm rise spread over a metre is not a step at all, it is a hill.
 *
 * At a slime's 0.34-0.64 m/s it takes about half a second to walk, and the steepest the ground ever gets is
 * `1.5 * BARN_FLOOR_Y / GROUND_BLEND`, a 37% grade — a kerb, not a cliff, and nothing else on the ranch is
 * anything but flat.
 */
export const GROUND_BLEND = 0.28;

/** Smoothstep, C1 at both ends, so the ground has no crease where the ramp meets the flat. */
function smoothstep(t: number): number {
  const u = t < 0 ? 0 : t > 1 ? 1 : t;
  return u * u * (3 - 2 * u);
}

/**
 * How far inside the raised part of the barn's floor a point is, in metres. Negative outside it.
 *
 * THE RAISED PART IS TWO RECTANGLES, and the second one is the reason a child does not walk into a 7cm
 * kerb. `barnInterior.tsx` lays the floor slab over the interior rectangle — `BARN_IN_HALF_W` by
 * `BARN_IN_HALF_D`, the inner wall faces — and `BARN_THRESHOLD` fills the notch in the footing with a
 * slab of the same height that runs from inside the doorway out to the footing's outer edge. So the boards
 * are at `BARN_FLOOR_Y` for 25cm beyond the wall's own outer face, and the true lip of the raised ground is
 * out there on the stone rather than in the plane of the doorway.
 *
 * Reported as an inset rather than a boolean because the answer feeds a ramp, and a ramp needs to know how
 * far it has got. Both rectangles are measured with a Chebyshev inset — the smallest distance to any of
 * their four sides — which is exact on the flat faces and slightly conservative at the corners. Conservative
 * means the corner ramps a centimetre or two early, in ground that is inside a wall.
 *
 * THE SILL BOX IS DELIBERATELY EXTENDED INBOARD, past the wall's inner face, by more than `GROUND_BLEND`.
 * Taking the union of two boxes as the larger of their two insets is only right where they do not meet; at
 * a seam it under-reports, and a seam that under-reports by less than the blend width would have put a 6cm
 * GROOVE across the middle of the doorway, at the one point in the barn every child walks over. Overlapping
 * the boxes by half a metre means the seam is never within the ramp's reach.
 */
export function barnFloorInset(x: number, z: number): number {
  const [lx, lz] = toLocal(BARN, x, z);
  const ax = Math.abs(lx);

  // The threshing floor: the interior rectangle, to the inner faces of the four walls.
  const inside = Math.min(BARN_IN_HALF_W - ax, BARN_IN_HALF_D - Math.abs(lz));

  /**
   * The stone sill in the doorway, from `BARN_THRESHOLD`: as wide as the notch in the footing, and running
   * from the footing's outer edge back into the room far enough that the join cannot be seen.
   */
  const sillHalfW = DOOR.halfW + 0.28;
  const sillTo = BARN_IN_HALF_D + BARN_WALL_T + 0.25;
  const sillFrom = BARN_IN_HALF_D - 0.5;
  const sill = Math.min(sillHalfW - ax, lz - sillFrom, sillTo - lz);

  return Math.max(inside, sill);
}

/**
 * THE HEIGHT OF THE SURFACE A BODY STANDS ON AT (x, z). Total, pure, and the only opinion in the game.
 *
 * `fromY` is the FLOOR height the body is coming from — the height it was standing at when the frame began,
 * not its eye or its centre. It exists solely to make the loft's deck one-way; see the note at the top of
 * this file, and `supportEye` in `ladder.ts`, which is the same rule stated in eye heights for the camera.
 * Leaving it out says "I am a ground creature", which is what every slime is.
 */
export function groundY(x: number, z: number, fromY = -Infinity): number {
  /**
   * The loft first, and unblended. Its edge is a fall, not a kerb: a body up there is held by the deck only
   * because it was already at deck height, and smearing that boundary would hold a keeper's feet up in the
   * air over the drop. It cannot flicker for the reason a threshold can, because the 2cm of slack is
   * measured against a height that only the deck itself can put you at — and the loft's guard rail is what
   * keeps a keeper off the edge in the first place. `LOFT_TOP` rather than `LOFT.y`: the deck's mesh is
   * CENTRED on `LOFT.y` and its walking surface is half a deck above that.
   */
  if (fromY >= LOFT_TOP - 0.02 && overLoft(x, z)) return LOFT_TOP;

  const inset = barnFloorInset(x, z);
  // Outside the ramp's reach on either side, this is exactly the meadow or exactly the boards. The blend
  // straddles the lip, so half of it is over the sill and half is on the grass in front of it.
  const t = smoothstep(inset / GROUND_BLEND + 0.5);
  return MEADOW_Y + (BARN_FLOOR_Y - MEADOW_Y) * t;
}
