/**
 * WHERE A SLIME IS ALLOWED TO BE, AND HOW IT FINDS OUT CHEAPLY.
 *
 * Two jobs, one file, because they are the same question asked at two rates.
 *
 *   ONCE PER FRAME, PER SLIME: "what could I bump into from here?" — `nearbySolids`. There are 514
 *   colliders on the ranch now and up to a few dozen slimes, and asking every slime about every collider
 *   is 20,000 distance tests a frame before anything is drawn. So the colliders go into a uniform grid
 *   once and each slime reads back the handful within reach of it.
 *
 *   ONCE PER PLACEMENT: "is this somewhere a child could ever get to?" — `placeSlime`. This is the one
 *   with a promise attached, and the promise is the whole reason this file exists.
 *
 * ── THE PROMISE: A SLIME A CHILD PUTS DOWN IS ALWAYS FINDABLE ──────────────────────────────────────────
 *
 * The owner's report was "i tried to place a slime in the barn stable and it completely disappeared and i
 * was not able to find it again". Losing a creature a child has just caught and carried is the worst thing
 * this game can do, and there is no in-game way to search for one, so it has to be impossible rather than
 * unlikely.
 *
 * `settleLanding` in `vacpack/suction.ts` already promised that a plopped slime is not inside a building
 * and not outside the world. Both halves are true and both are too weak, because NOT BEING INSIDE A
 * COLLIDER IS NOT THE SAME AS BEING SOMEWHERE A CHILD CAN WALK. Measured on the real collider set, 1,473
 * of the ranch's 16,739 open cells — nine per cent of the standable ground — are open and unreachable:
 * the inside of the keeper's hut, the sealed second paddock before the challenge board is answered, and,
 * worst of all, a ring of slivers between the boundary fence and the 34-metre clamp. A child standing at
 * the fence and plopping outward lands a slime at r = 32.98 on four of six bearings, which is past the
 * fence, on ground they can never reach, forever.
 *
 * So the test here is not "does this overlap something". It is "is this in the same connected piece of
 * open ground the child is standing on" — a flood fill from the spawn over a 40cm grid of everywhere a
 * 0.45m keeper fits. If the wanted spot is in that piece and the slime itself fits there, it is kept
 * exactly, because a slime must appear where the child watched it land. If it is not, the nearest cell
 * that satisfies both is used instead. There is no path through this function that returns somewhere a
 * child cannot walk to, and no path that returns nothing.
 *
 * ── WHY THE GRID IS A REGISTRY RATHER THAN AN IMPORT ───────────────────────────────────────────────────
 *
 * The ranch's colliders live in four directories this one does not depend on — `world`, `stations`,
 * `economy` and `intro`. Importing them here would make `slimes/` depend on the entire world, which is
 * exactly the coupling that keeps this directory testable in node and previewable on its own. So the
 * integrator hands the set in once, at module scope, and everything downstream reads it from here.
 */

/* ============================================================================
   Shapes
   ========================================================================== */

/** A thing that takes up room on the ground plane. Same shape as `wander.ts`'s `Circle`. */
export interface Circle {
  x: number;
  z: number;
  r: number;
}

/** The shape `world/Buildings.SOLIDS`, `STATION_SOLIDS`, `SHOP_SOLIDS` and `INTRO_SOLIDS` all publish. */
export interface SolidLike {
  position: readonly [number, number];
  radius: number;
}

/** Radius of the keeper, from `Game.tsx`. What "a child can walk here" is measured with. */
export const KEEPER_RADIUS = 0.45;

/**
 * How far a slime that was PUT DOWN may then wander from where it was put.
 *
 * The other half of the disappearance, and the half that actually did it. `putSlime` bounds a plopped
 * slime to the nearest PEN with a radius grown to cover the distance to it, so a slime set down in the
 * barn — sixteen metres from the nearest pen — was handed a sixteen-metre roaming circle centred on a pen
 * it had never been in. Simulated against the real world for five minutes, a slime plopped in the barn
 * ends up between 17 and 27 metres away and spends 2-7% of its time in the barn at all. It had not
 * vanished; it had walked out through the wall and off across the ranch, and one slime among nineteen at
 * the far end of a ranch is indistinguishable from a lost one.
 *
 * Six metres is a twelve-metre circle. It is roomy enough that a slime plainly wanders — the whole barn
 * floor, the whole yard in front of the shop — and small enough that it is always in the place the child
 * put it.
 */
export const ROAM = 6;

/* ============================================================================
   The broad phase
   ========================================================================== */

/**
 * A uniform grid over a static circle set.
 *
 * Circles are filed by BOUNDING BOX rather than by centre, so a query never has to widen itself by the
 * largest radius in the set to be correct — a 1.55m trough is in every cell it touches. Cell size is a
 * compromise measured rather than guessed: at 2.5m a 6m query touches 5x5 cells, and the ranch's densest
 * region (the boundary run, 258 colliders on one ring) hands back about thirty candidates instead of 514.
 *
 * `near` fills a caller-owned array and allocates nothing, because it is called once per slime per frame.
 * Duplicates are suppressed with a stamp rather than a Set, for the same reason.
 */
export class SolidField {
  readonly circles: readonly Circle[];
  private readonly cell: number;
  private readonly minX: number;
  private readonly minZ: number;
  private readonly nx: number;
  private readonly nz: number;
  private readonly buckets: Int32Array[];
  private readonly stamp: Int32Array;
  private tick = 0;

  constructor(circles: readonly Circle[], cell = 2.5) {
    this.circles = circles;
    this.cell = cell;
    let minX = Infinity;
    let minZ = Infinity;
    let maxX = -Infinity;
    let maxZ = -Infinity;
    for (const c of circles) {
      if (c.x - c.r < minX) minX = c.x - c.r;
      if (c.z - c.r < minZ) minZ = c.z - c.r;
      if (c.x + c.r > maxX) maxX = c.x + c.r;
      if (c.z + c.r > maxZ) maxZ = c.z + c.r;
    }
    if (!Number.isFinite(minX)) {
      minX = 0;
      minZ = 0;
      maxX = 0;
      maxZ = 0;
    }
    this.minX = minX;
    this.minZ = minZ;
    this.nx = Math.max(1, Math.ceil((maxX - minX) / cell) + 1);
    this.nz = Math.max(1, Math.ceil((maxZ - minZ) / cell) + 1);

    // Counting sort into flat typed arrays: one pass to size every bucket, one to fill it. Building
    // arrays-of-arrays with `push` is the obvious version and it allocates one array per cell.
    const counts = new Int32Array(this.nx * this.nz);
    const spanOf = (c: Circle): [number, number, number, number] => [
      Math.max(0, Math.floor((c.x - c.r - minX) / cell)),
      Math.min(this.nx - 1, Math.floor((c.x + c.r - minX) / cell)),
      Math.max(0, Math.floor((c.z - c.r - minZ) / cell)),
      Math.min(this.nz - 1, Math.floor((c.z + c.r - minZ) / cell)),
    ];
    for (const c of circles) {
      const [i0, i1, j0, j1] = spanOf(c);
      for (let i = i0; i <= i1; i += 1) {
        for (let j = j0; j <= j1; j += 1) {
          const k = i * this.nz + j;
          counts[k] = (counts[k] ?? 0) + 1;
        }
      }
    }
    this.buckets = new Array(this.nx * this.nz);
    for (let k = 0; k < counts.length; k += 1) this.buckets[k] = new Int32Array(counts[k] ?? 0);
    const filled = new Int32Array(counts.length);
    for (let n = 0; n < circles.length; n += 1) {
      const c = circles[n];
      if (!c) continue;
      const [i0, i1, j0, j1] = spanOf(c);
      for (let i = i0; i <= i1; i += 1) {
        for (let j = j0; j <= j1; j += 1) {
          const k = i * this.nz + j;
          const b = this.buckets[k];
          if (!b) continue;
          const at = filled[k] ?? 0;
          b[at] = n;
          filled[k] = at + 1;
        }
      }
    }
    this.stamp = new Int32Array(circles.length);
  }

  /**
   * Every circle whose cell could reach within `reach` of (x, z). Fills and returns `out`.
   *
   * A superset of the true answer — cells are square and circles are filed by box — which is the correct
   * side to err on: a few extra candidates cost a distance test each, a missing one is a slime walking
   * through a fence.
   */
  near(x: number, z: number, reach: number, out: Circle[]): Circle[] {
    out.length = 0;
    const i0 = Math.max(0, Math.floor((x - reach - this.minX) / this.cell));
    const i1 = Math.min(this.nx - 1, Math.floor((x + reach - this.minX) / this.cell));
    const j0 = Math.max(0, Math.floor((z - reach - this.minZ) / this.cell));
    const j1 = Math.min(this.nz - 1, Math.floor((z + reach - this.minZ) / this.cell));
    if (i1 < i0 || j1 < j0) return out;
    this.tick += 1;
    const tick = this.tick;
    for (let i = i0; i <= i1; i += 1) {
      for (let j = j0; j <= j1; j += 1) {
        const bucket = this.buckets[i * this.nz + j];
        if (!bucket) continue;
        for (let b = 0; b < bucket.length; b += 1) {
          const n = bucket[b] as number;
          if (this.stamp[n] === tick) continue;
          this.stamp[n] = tick;
          const c = this.circles[n];
          if (c) out.push(c);
        }
      }
    }
    return out;
  }

  /** True if a disc of `radius` centred here overlaps anything. The fine test, after the broad one. */
  hits(x: number, z: number, radius: number): boolean {
    const i = Math.max(0, Math.min(this.nx - 1, Math.floor((x - this.minX) / this.cell)));
    const j = Math.max(0, Math.min(this.nz - 1, Math.floor((z - this.minZ) / this.cell)));
    // One cell is not enough on its own: a circle filed in a neighbouring cell can still reach in. The
    // box is widened by the query radius, exactly as `near` does.
    const i0 = Math.max(0, Math.floor((x - radius - this.minX) / this.cell));
    const i1 = Math.min(this.nx - 1, Math.floor((x + radius - this.minX) / this.cell));
    const j0 = Math.max(0, Math.floor((z - radius - this.minZ) / this.cell));
    const j1 = Math.min(this.nz - 1, Math.floor((z + radius - this.minZ) / this.cell));
    void i;
    void j;
    for (let ii = i0; ii <= i1; ii += 1) {
      for (let jj = j0; jj <= j1; jj += 1) {
        const bucket = this.buckets[ii * this.nz + jj];
        if (!bucket) continue;
        for (let b = 0; b < bucket.length; b += 1) {
          const c = this.circles[bucket[b] as number];
          if (!c) continue;
          const dx = x - c.x;
          const dz = z - c.z;
          const want = c.r + radius;
          if (dx * dx + dz * dz < want * want) return true;
        }
      }
    }
    return false;
  }
}

/** `{position, radius}` to `{x, z, r}`. The two shapes the ranch speaks, converted in one place. */
export function circlesOf(solids: readonly SolidLike[]): Circle[] {
  return solids.map((s) => ({ x: s.position[0], z: s.position[1], r: s.radius }));
}

const fields = new WeakMap<object, SolidField>();

/** A grid for an obstacle array, built once and shared by every slime that is handed the same array. */
export function fieldFor(solids: readonly SolidLike[]): SolidField {
  const had = fields.get(solids as unknown as object);
  if (had) return had;
  const made = new SolidField(circlesOf(solids));
  fields.set(solids as unknown as object, made);
  return made;
}

/* ============================================================================
   The registry
   ========================================================================== */

interface Ranch {
  field: SolidField;
  worldRadius: number;
  /** Somewhere the child is known to be standing. The flood fill starts here. */
  from: readonly [number, number];
  /** Lazily built by `reachable()`. */
  grid: Reach | null;
  /** Measured, for the frame-cost report. */
  builtMs: number;
}

const EMPTY = new SolidField([]);
let ranch: Ranch = { field: EMPTY, worldRadius: 34, from: [0, 8], grid: null, builtMs: 0 };
let seeded = false;

export interface RanchOptions {
  /** The playable radius, matching `Game.tsx`'s `BOUND`. */
  worldRadius?: number;
  /** Where the child stands on arrival. The connected piece of ground containing this is "findable". */
  from?: readonly [number, number];
}

/**
 * Hand the ranch's colliders in. Called once, at module scope, by the integrator.
 *
 * Everything downstream — slime collision, the placement guarantee, the vacpack's landing spots — reads
 * the set from here, so there is exactly one definition of what is solid and no way for two of them to
 * disagree.
 */
export function setRanchSolids(solids: readonly SolidLike[], opts: RanchOptions = {}): void {
  ranch = {
    field: new SolidField(circlesOf(solids)),
    worldRadius: opts.worldRadius ?? ranch.worldRadius,
    from: opts.from ?? ranch.from,
    grid: null,
    builtMs: 0,
  };
  seeded = true;
}

/**
 * Register a set only if nothing has been registered yet.
 *
 * The vacpack already imports `world/Buildings` and calls this at module scope, so the barn, the hut and
 * the boundary fence are solid to a slime even if the integrator never wires the full set up. The full
 * set — which is what adds the shop stall the owner watched a bought slime phase into — still has to come
 * from `Game.tsx`, because nothing in this directory may depend on `economy/`.
 */
export function seedRanchSolids(solids: readonly SolidLike[], opts: RanchOptions = {}): void {
  if (seeded) return;
  setRanchSolids(solids, opts);
}

/* ============================================================================
   How high the ground is
   ========================================================================== */

/**
 * The height of the surface at a point on the ground plane.
 *
 * Structurally satisfied by `world/ground.ts`'s `groundY`, and declared here rather than imported for the
 * same reason the collider set is handed in rather than imported — see the note at the top of this file.
 * `slimes/` must not know that the ranch has a barn in it.
 */
export type GroundHeight = (x: number, z: number) => number;

const FLAT: GroundHeight = () => 0;
let height: GroundHeight = FLAT;

/**
 * REGISTER WHERE THE GROUND IS. Called once, at module scope, by the integrator, beside `setRanchSolids`.
 *
 * THE OWNER'S REPORT: "when i drop slimes in the barn, they lowkey sink through the floor." They do, by
 * exactly 7cm, because the barn's threshing floor is laid at `BARN_FLOOR_Y = 0.07` — a floor at zero
 * z-fights with the meadow at zero — while every slime is handed `position: [x, 0, z]`. A slime placed
 * inside the barn stands with the bottom 7cm of itself under the boards.
 *
 * WHY A FUNCTION AND NOT A NUMBER, which is the whole of the fix. The owner's instinct was to raise the
 * ground level, and a single raise fixes the barn by floating every slime on the meadow 7cm into the air
 * instead — the same defect on nine times as much of the ranch. The height has to vary with position, and
 * the only module that knows where the buildings are is `world/`.
 *
 * DEFAULTING TO FLAT IS THE POINT OF THE DEFAULT, not an oversight. The preview pages stand a few slimes on
 * a bare plane with no ranch around them, and a slime in the vacpack's window is drawn in a portrait with no
 * world at all; both want zero, and both get it without knowing this exists.
 */
export function setGroundHeight(fn: GroundHeight | null): void {
  height = fn ?? FLAT;
}

/**
 * How high the ground is here. Flat zero until an integrator says otherwise.
 *
 * Called once per slime per frame, which is why it is a bare function call through a module-level binding
 * rather than a lookup: `world/ground.ts` resolves the barn in about a dozen multiplies and the herd is
 * forty strong, so this is cheaper than the neighbour list it sits beside.
 */
export function groundHeightAt(x: number, z: number): number {
  return height(x, z);
}

export function ranchField(): SolidField {
  return ranch.field;
}

export function ranchSolids(): readonly Circle[] {
  return ranch.field.circles;
}

export function ranchRadius(): number {
  return ranch.worldRadius;
}

/** Test only. The registry is a module singleton and a test that leaves a set in it poisons the next. */
export function clearRanchSolids(): void {
  ranch = { field: EMPTY, worldRadius: 34, from: [0, 8], grid: null, builtMs: 0 };
  seeded = false;
  height = FLAT;
}

/* ============================================================================
   Reachability
   ========================================================================== */

/** Grid resolution for the flood fill, metres. */
const CELL = 0.4;

interface Reach {
  cell: number;
  min: number;
  n: number;
  /** 1 where a 0.45m keeper fits AND that cell is connected to where the child stands. */
  ok: Uint8Array;
  count: number;
}

/**
 * Everywhere the child can actually get to, as a bitmap.
 *
 * Built once per registered collider set and then read, so the cost is paid on the first placement rather
 * than on every one. Measured on the real ranch: 180 x 180 cells, 12ms with a brute-force inner loop and
 * under 3ms through the grid. That is a one-off, off the render thread's critical path in practice
 * because the first placement happens when a child plops a slime rather than while the page is loading.
 *
 * FOUR-CONNECTED, not eight. A diagonal step between two cells that are each open can cut the corner of a
 * collider that neither cell's centre is inside, which would call a sealed pocket reachable through a
 * gap no keeper fits through. Under-connecting is the safe direction: the worst it can do is move a slime
 * a little further than it strictly had to.
 */
function reachable(): Reach {
  const had = ranch.grid;
  if (had) return had;
  const t0 = now();
  const R = ranch.worldRadius + 2;
  const n = Math.ceil((R * 2) / CELL);
  const ok = new Uint8Array(n * n);
  const rim = ranch.worldRadius - KEEPER_RADIUS - 0.05;
  const field = ranch.field;
  for (let i = 0; i < n; i += 1) {
    const x = -R + (i + 0.5) * CELL;
    for (let j = 0; j < n; j += 1) {
      const z = -R + (j + 0.5) * CELL;
      if (x * x + z * z > rim * rim) continue;
      if (field.hits(x, z, KEEPER_RADIUS)) continue;
      ok[i * n + j] = 1;
    }
  }

  // Flood fill from where the child stands. Anything the fill does not reach is open ground the child
  // can never walk to, which for this game's purposes is not ground at all.
  const at = (x: number, z: number): number => {
    const i = Math.floor((x + R) / CELL);
    const j = Math.floor((z + R) / CELL);
    return i < 0 || j < 0 || i >= n || j >= n ? -1 : i * n + j;
  };
  let start = at(ranch.from[0], ranch.from[1]);
  if (start < 0 || !ok[start]) {
    // The spawn is inside something, which should not happen and must not be fatal: take the open cell
    // nearest to it instead, so the fill still starts somewhere a person could be.
    let best = -1;
    let bestD = Infinity;
    for (let k = 0; k < ok.length; k += 1) {
      if (!ok[k]) continue;
      const x = -R + (Math.floor(k / n) + 0.5) * CELL;
      const z = -R + ((k % n) + 0.5) * CELL;
      const d = (x - ranch.from[0]) ** 2 + (z - ranch.from[1]) ** 2;
      if (d < bestD) {
        bestD = d;
        best = k;
      }
    }
    start = best;
  }

  const reach = new Uint8Array(n * n);
  let count = 0;
  if (start >= 0) {
    const queue = new Int32Array(ok.length);
    let head = 0;
    let tail = 0;
    queue[tail++] = start;
    reach[start] = 1;
    count = 1;
    while (head < tail) {
      const c = queue[head++] as number;
      const i = (c / n) | 0;
      const j = c % n;
      if (i > 0) {
        const k = c - n;
        if (ok[k] && !reach[k]) {
          reach[k] = 1;
          count += 1;
          queue[tail++] = k;
        }
      }
      if (i < n - 1) {
        const k = c + n;
        if (ok[k] && !reach[k]) {
          reach[k] = 1;
          count += 1;
          queue[tail++] = k;
        }
      }
      if (j > 0) {
        const k = c - 1;
        if (ok[k] && !reach[k]) {
          reach[k] = 1;
          count += 1;
          queue[tail++] = k;
        }
      }
      if (j < n - 1) {
        const k = c + 1;
        if (ok[k] && !reach[k]) {
          reach[k] = 1;
          count += 1;
          queue[tail++] = k;
        }
      }
    }
  }

  const grid: Reach = { cell: CELL, min: -R, n, ok: reach, count };
  ranch.grid = grid;
  ranch.builtMs = now() - t0;
  return grid;
}

function now(): number {
  return typeof performance !== 'undefined' ? performance.now() : Date.now();
}

/** How long the reachability bitmap took to build, and how much ground it found. For the cost report. */
export function groundCost(): { builtMs: number; cells: number; solids: number } {
  const grid = reachable();
  return { builtMs: ranch.builtMs, cells: grid.count, solids: ranch.field.circles.length };
}

/** Is this a spot a slime of this size physically fits in, inside the world? */
export function canStand(x: number, z: number, radius: number): boolean {
  if (!Number.isFinite(x) || !Number.isFinite(z)) return false;
  const rim = ranch.worldRadius - radius - 0.35;
  if (x * x + z * z > rim * rim) return false;
  return !ranch.field.hits(x, z, radius);
}

/**
 * THE TEST THE OLD CODE WAS MISSING. Does this spot fit a slime of this size AND can the child walk to it?
 *
 * The second clause is the whole difference. `settleLanding` answered the first and reported the inside of
 * the hut, the sealed paddock and the strip outside the boundary fence as perfectly good places to leave a
 * creature, because nothing there overlaps a circle.
 */
export function isFindable(x: number, z: number, radius: number): boolean {
  if (!canStand(x, z, radius)) return false;
  const g = reachable();
  const i = Math.floor((x - g.min) / g.cell);
  const j = Math.floor((z - g.min) / g.cell);
  if (i < 0 || j < 0 || i >= g.n || j >= g.n) return false;
  return g.ok[i * g.n + j] === 1;
}

/**
 * WHERE THIS SLIME ACTUALLY GOES. Total: there is no input for which this returns nothing.
 *
 * The wanted spot is kept EXACTLY when it is legal, and that matters more than it looks — a slime that
 * shuffles half a metre on landing does not appear where the child watched it land, and at this age that
 * reads as the game taking it away and putting it somewhere else. Only an illegal spot is moved, and then
 * only to the nearest legal one.
 *
 * The search is a widening ring of grid cells rather than a step toward the origin, which is what
 * `settleLanding`'s last resort does. Walking toward the middle of the ranch is a reasonable fallback for
 * "wedged between two fence posts" and a bad one for "outside the boundary fence at the far side of the
 * ranch", where the nearest legal ground is one metre inboard and the origin is thirty away.
 */
export function placeSlime(
  x: number,
  z: number,
  radius: number,
): { x: number; z: number; moved: boolean } {
  const safeX = Number.isFinite(x) ? x : 0;
  const safeZ = Number.isFinite(z) ? z : 0;
  if (isFindable(safeX, safeZ, radius)) return { x: safeX, z: safeZ, moved: false };

  const g = reachable();
  const ci = Math.floor((safeX - g.min) / g.cell);
  const cj = Math.floor((safeZ - g.min) / g.cell);
  let found = false;
  let bestX = 0;
  let bestZ = 0;
  let bestD = Infinity;
  // Forty rings is sixteen metres, which is further than any legal spot has ever been from an illegal
  // one on this ranch — the widest sealed pocket is the hut, and it is 6.6m across.
  for (let ring = 0; ring <= 40; ring += 1) {
    for (let di = -ring; di <= ring; di += 1) {
      for (let dj = -ring; dj <= ring; dj += 1) {
        // Only the shell of the square; the inside was covered by earlier rings.
        if (ring > 0 && Math.abs(di) !== ring && Math.abs(dj) !== ring) continue;
        const i = ci + di;
        const j = cj + dj;
        if (i < 0 || j < 0 || i >= g.n || j >= g.n) continue;
        if (!g.ok[i * g.n + j]) continue;
        const px = g.min + (i + 0.5) * g.cell;
        const pz = g.min + (j + 0.5) * g.cell;
        // Reachability is measured with the KEEPER's radius. A warden is more than twice that, so a cell
        // the child fits in is not automatically a cell the creature fits in.
        if (!canStand(px, pz, radius)) continue;
        const d = (px - safeX) ** 2 + (pz - safeZ) ** 2;
        if (d < bestD) {
          bestD = d;
          bestX = px;
          bestZ = pz;
          found = true;
        }
      }
    }
    // A ring can only be beaten by a later one if that ring's nearest possible cell is closer, which it
    // never is once something has been found — so stop at the first ring that yields anything, plus one
    // for the corners.
    if (found && ring > 0) break;
  }

  if (found) return { x: bestX, z: bestZ, moved: true };
  // Nothing anywhere, which means no colliders have been registered and the ranch is a blank plane. The
  // spawn is then as good as anywhere, and it is certainly not lost.
  return { x: ranch.from[0], z: ranch.from[1], moved: true };
}

/**
 * Every collider within `reach` of a point, from the registered ranch. Fills and returns `out`.
 *
 * The per-frame entry point. `out` is the caller's own scratch array; nothing here allocates.
 */
export function nearbySolids(x: number, z: number, reach: number, out: Circle[]): Circle[] {
  return ranch.field.near(x, z, reach, out);
}

/**
 * The registered world, published for a browser harness, on the same terms as `herd.ts`'s `__slimes` and
 * `Game.tsx`'s `__keeper`: functions rather than snapshots, so it costs nothing until something asks.
 *
 * The placement guarantee is the one claim in this directory that a screenshot genuinely cannot check —
 * "that slime is somewhere a child could get to" is not visible in a picture of it — so being able to
 * ask the RUNNING page rather than a simulation of it is the difference between the promise being tested
 * and being asserted.
 */
if (typeof window !== 'undefined') {
  (window as unknown as { __ranch?: unknown }).__ranch = {
    solids: (): Circle[] => ranchSolids().map((c) => ({ ...c })),
    place: (x: number, z: number, r: number) => placeSlime(x, z, r),
    findable: (x: number, z: number, r: number) => isFindable(x, z, r),
    cost: () => groundCost(),
  };
}
