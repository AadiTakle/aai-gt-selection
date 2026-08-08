/**
 * WHERE EVERY SLIME CURRENTLY IS — one live registry, and the collision the player controller calls.
 *
 * The note this answers: "they should have physics in the game mechanics, aka you bump into stuff and
 * are unable to walk through them."
 *
 * WHY A REGISTRY AND NOT RAPIER. `@react-three/rapier` is installed, and a rigid body per slime would
 * be the textbook answer. It is the wrong answer here, and not because of the dependency:
 *
 *   · The player is already a hand-rolled kinematic integrator over a flat plane in `Game.tsx`. Adding
 *     a physics world makes the CHARACTER the odd one out, and mixing a kinematic camera with dynamic
 *     bodies means a character controller, a collider for the camera, and a decision about who wins —
 *     which is strictly more code than the fifteen lines below, not less.
 *   · What is being modelled is forty upright blobs that never stack, never tip and never fall. That
 *     is circle-versus-circle on one plane. A solver that can do friction cones and joints is being
 *     asked to do `if (d < r1 + r2)`, and it costs a wasm module, a fixed timestep, and an interpolation
 *     mismatch between the physics tick and the render tick that shows up as jitter on slow movement —
 *     which is all this game has.
 *   · A slime must be able to be *gently pushed aside* by a child walking into it while never being
 *     knocked over or shoved out of the ranch. That is a designed behaviour, not an emergent one, and
 *     dynamic bodies fight you the whole way there.
 *
 * So: every mounted slime writes its live centre and radius here each frame, and anything that needs to
 * collide reads it. If the integrator later wants Rapier for the terrain, this registry keeps working —
 * it is just a list of circles, and nothing in it assumes who is reading.
 *
 * The registry is a module singleton, which is safe here because the entries are keyed by object
 * identity and removed on unmount. Two Canvases on one page would share it; that is a preview-page
 * concern only, and it is why `slimeColliders` never assumes what scene an entry belongs to.
 */
import type { Family, Stage } from '../contract';

export interface SlimeCollider {
  /** Stable identity for the lifetime of the mounted slime. */
  readonly id: number;
  family: Family;
  stage: Stage;
  /** Live world centre on the ground plane. Written every frame by the slime itself. */
  x: number;
  z: number;
  /** Live world top, for anything that wants to hang a heart or a name over its head. */
  top: number;
  /** Collision radius in world units. Constant for the life of the slime. */
  r: number;
}

const herd = new Map<number, SlimeCollider>();
let nextId = 1;

/** Called by a slime on mount. The returned object is written in place; keep the handle to remove it. */
export function joinHerd(entry: Omit<SlimeCollider, 'id'>): SlimeCollider {
  const id = nextId;
  nextId += 1;
  const live: SlimeCollider = { id, ...entry };
  herd.set(id, live);
  return live;
}

/** Called on unmount. Forgetting this leaves a ghost the player collides with forever. */
export function leaveHerd(entry: SlimeCollider): void {
  herd.delete(entry.id);
}

/**
 * Every slime alive right now.
 *
 * Rebuilt into a reused array rather than returned as `[...herd.values()]`, because this is read once
 * per slime per frame — forty reads a frame of a fresh forty-element array is 2,400 arrays a second
 * for no reason. The array is shared and overwritten, so callers must not hold onto it across frames.
 */
const scratch: SlimeCollider[] = [];
export function slimeColliders(): readonly SlimeCollider[] {
  scratch.length = 0;
  for (const v of herd.values()) scratch.push(v);
  return scratch;
}

/**
 * PUSH A MOVING THING OUT OF EVERY SLIME IT IS INSIDE. This is the one function the player controller
 * needs, and the whole of what "you cannot walk through them" requires.
 *
 * Called with the camera's position after it has been integrated for the frame:
 *
 *     import { pushOutOfSlimes } from './slimes/Slime';
 *     ...
 *     camera.position.addScaledVector(dir, WALK * step);
 *     pushOutOfSlimes(camera.position, 0.42);     // <- after moving, before the bounds clamp
 *
 * It slides rather than stops: the correction is along the horizontal normal only, so walking into a
 * slime at an angle carries you smoothly around it instead of sticking you to it. Y is never touched,
 * so jumping over one still works and gravity is left entirely to the caller.
 *
 * Returns true if anything was corrected, in case the caller wants to zero its velocity or play a
 * squelch. Two iterations, so being wedged between two slimes resolves out of both rather than
 * ping-ponging between them for as long as the key is held.
 */
export function pushOutOfSlimes(
  p: { x: number; y: number; z: number },
  radius: number,
  /** Slimes shorter than this are stepped over rather than bumped into: a pip should not be a wall. */
  minHeight = 0,
): boolean {
  let hit = false;
  for (let pass = 0; pass < 2; pass += 1) {
    let moved = false;
    for (const s of herd.values()) {
      if (minHeight > 0 && s.top < minHeight) continue;
      const dx = p.x - s.x;
      const dz = p.z - s.z;
      const d = Math.hypot(dx, dz);
      const want = s.r + radius;
      if (d >= want) continue;
      // Dead centre: pick an axis rather than divide by zero and teleport the player to NaN.
      const nx = d > 1e-4 ? dx / d : 1;
      const nz = d > 1e-4 ? dz / d : 0;
      p.x = s.x + nx * want;
      p.z = s.z + nz * want;
      moved = true;
      hit = true;
    }
    if (!moved) break;
  }
  return hit;
}

/** The nearest slime to a point, for "pet the one you are looking at". Null if the herd is empty. */
export function nearestSlime(x: number, z: number, within = Infinity): SlimeCollider | null {
  let best: SlimeCollider | null = null;
  let bestD = within;
  for (const s of herd.values()) {
    const d = Math.hypot(x - s.x, z - s.z) - s.r;
    if (d < bestD) {
      bestD = d;
      best = s;
    }
  }
  return best;
}

/** Test only. The registry is a singleton and a test that leaves entries in it poisons the next one. */
export function clearHerd(): void {
  herd.clear();
}
