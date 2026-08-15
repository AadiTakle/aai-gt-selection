/**
 * WHO IS IN THE WORLD AND WHO IS IN THE TANK — the herd's bookkeeping, and the two invariants that
 * matter more than anything else in the game.
 *
 *   NOTHING A CHILD HAS SEEN CEASES TO EXIST. Not on capture, not on release, not on placement.
 *   NOTHING EVER DUPLICATES. One capture removes exactly one. One release adds exactly one.
 *
 * ── WHY THIS FILE EXISTS AT ALL ────────────────────────────────────────────────────────────────────────
 *
 * All of this used to live inside `Game.tsx` as three `useCallback`s over a `useState` array, and all
 * three of the owner's slime bugs were in those thirty lines. That is not a coincidence: the code was
 * unreachable from a test, so every claim about it was an argument rather than a measurement.
 *
 * Three specific defects came out of that arrangement, and each one is closed by construction here.
 *
 *   1. A CAPTURE IDENTIFIED THE SLIME BY FAMILY + STAGE + NEAREST POSITION rather than by identity:
 *
 *          prev.forEach((sl, i) => {
 *            if (sl.family !== t.family || sl.stage !== t.stage) return;
 *            const d = Math.hypot(sl.position[0] - t.x, sl.position[2] - t.z);
 *            if (d < bestD) { bestD = d; best = i; }
 *          });
 *
 *      `sl.position` is where a slime was PUT DOWN. Wandering happens in the frame loop, so a slime is
 *      routinely metres from it — up to `ROAM` for one plopped outside a pen, which is exactly the
 *      detail the owner noticed ("it was outside the pen"). Worse, `Slime.tsx` renders at
 *      `placeSlime(position)`, so for any slime whose requested spot was illegal the recorded position is
 *      not even where it started. So the match routinely picked the WRONG slime of the same family and
 *      stage: the one the child was pointing at stayed standing there, an innocent one somewhere else on
 *      the ranch blinked out, and the plop produced what looked like a copy. Suck four times and you get
 *      "i managed to get like 4 different copies of it", with four slimes destroyed elsewhere to pay for
 *      them. Both of the owner's other reports — slimes vanishing, slimes duplicating — are the SAME
 *      line of code seen from its two ends.
 *
 *      Here a capture carries the slime's `uid` from `Slime.tsx` through `herd.ts` and `identity.ts`, so
 *      the removal is `findIndex(sl => sl.uid === mark.uid)` and cannot be wrong. The nearest-match is
 *      kept only as a fallback for a slime that reached the herd without a uid, and every time it is
 *      used it is COUNTED, so `audit().byPosition` staying at zero is a measurement rather than a hope.
 *
 *   2. THE BOOKKEEPING RAN INSIDE A `setSlimes` UPDATER. React 19 double-invokes state updaters under
 *      `StrictMode`, which `main.tsx` mounts, so every capture pushed its held record TWICE and every
 *      release shifted twice. It happened to cancel out, which is the worst kind of correct — it means
 *      the FIFO's alignment depended on pushes and shifts always pairing perfectly, and the first
 *      unpaired one desynchronises which creature comes back out. A module store read with
 *      `useSyncExternalStore` — the arrangement `vacpack/tank.ts` next door already uses, for the same
 *      reason — has no updater to double-invoke.
 *
 *   3. IT WAS UNTESTABLE. `Game.tsx` is a `<Canvas>` component; the take/put pair could not be driven in
 *      node, so "one capture removes exactly one" had never been asserted over a session. It is now, in
 *      `keep.test.ts`, over thousands of random operations against the real ranch.
 *
 * ── THE HELD RECORD, AND WHY IT IS NOT REBUILT ─────────────────────────────────────────────────────────
 *
 * `onRelease` reports a family and a landing spot and nothing else, so without a record the released
 * slime has to be invented. That is what made a plopped slime shrink once: it came back as a hardcoded
 * `tuffet`, so a warden returned two stages smaller, with a fresh seed, so it was a different creature
 * wearing the same colour. The queue below holds the whole `Slimelet` — family, stage, size, seed — and
 * hands back exactly what went in. It is keyed by family and drained oldest-first, which matches the
 * tank's own FIFO: a child who caught a rose and then a grass slime will plop and expect the rose.
 */
import { useSyncExternalStore } from 'react';

import type { Family, Stage } from '../contract';
import { ROAM, placeSlime } from './ground';
import { slimeRadius } from './gumdrop';

/* ============================================================================
   What a slime is, to the world
   ========================================================================== */

export interface Slimelet {
  /**
   * Stable identity, because the array index is not one and neither is family-plus-stage.
   *
   * Slimes were keyed `key={i}`, so catching the seventh renumbered every slime after it: React handed
   * the component that had been drawing slime 7 the family, stage, seed and bounds of slime 8 while it
   * kept slime 7's position, and the LAST slime in the list unmounted instead. A child watching sees a
   * creature change costume and a different one blink out. It is also what a capture is resolved by now.
   */
  uid: number;
  family: Family;
  stage: Stage;
  position: [number, number, number];
  seed: number;
  bounds: { center: [number, number]; radius: number };
}

/** Never reused, never derived from a position in the list. */
let nextUid = 1;

export function nextSlimeUid(): number {
  const id = nextUid;
  nextUid += 1;
  return id;
}

/**
 * What a capture tells the world about what it took. Structurally satisfied by `vacpack/identity.ts`'s
 * `CapturedTrace`, and declared here rather than imported so `slimes/` does not depend on `vacpack/`.
 */
export interface CaptureMark {
  /** The slime's own `uid`, when the herd was carrying one. THE thing a capture is resolved by. */
  uid: number | null;
  family: Family;
  stage: Stage;
  /** Where it was standing at the instant it was grabbed. Only used by the fallback match. */
  x: number;
  z: number;
}

/* ============================================================================
   The store
   ========================================================================== */

let world: Slimelet[] = [];
/**
 * The snapshot handed to React. Replaced on change and never rebuilt on read, because
 * `useSyncExternalStore` loops forever if `getSnapshot` returns a fresh array each call.
 */
let snapshot: readonly Slimelet[] = world;
const listeners = new Set<() => void>();

/** Held records, oldest first, per family. What comes out of the tank is what went into it. */
const held = new Map<Family, Slimelet[]>();

export interface KeepAudit {
  /** Captures that removed a slime by uid. The path that should account for all of them. */
  byUid: number;
  /**
   * Captures that had to fall back on family + stage + nearest recorded position.
   *
   * MUST STAY ZERO. This is the old matcher, kept only so that a slime which somehow reached the herd
   * without a uid is still removed rather than left standing while the tank claims to hold it — which is
   * the precise mechanism that produced four copies of one slime.
   */
  byPosition: number;
  /** Captures that matched nothing at all. Must stay zero; nothing is recorded when it happens. */
  unmatched: number;
  /** Releases restored from a held record. */
  restored: number;
  /**
   * Releases with no record to restore, so a slime had to be invented.
   *
   * Reachable only when a release arrives without a capture behind it — the tank flushing on unmount
   * after a reload. In a session where every release follows a capture this stays zero, and a test
   * asserts it, because every invented slime is a slime that was not conserved.
   */
  invented: number;
  granted: number;
}

const tally: KeepAudit = {
  byUid: 0,
  byPosition: 0,
  unmatched: 0,
  restored: 0,
  invented: 0,
  granted: 0,
};

export function audit(): KeepAudit {
  return { ...tally };
}

function publish(): void {
  snapshot = world.slice();
  for (const l of listeners) l();
}

export function herdSlimes(): readonly Slimelet[] {
  return snapshot;
}

/** How many slimes are recorded as being in the tank. `world.length + keptCount()` is the population. */
export function keptCount(): number {
  let n = 0;
  for (const q of held.values()) n += q.length;
  return n;
}

export function subscribeHerd(fn: () => void): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

/**
 * WHAT `Game.tsx` RENDERS FROM. Re-renders only when a slime is actually added or removed, which over a
 * whole session is a few dozen times — wandering is a frame-loop concern and never touches this.
 */
export function useHerd(): readonly Slimelet[] {
  return useSyncExternalStore(subscribeHerd, herdSlimes, herdSlimes);
}

/* ============================================================================
   Seeding
   ========================================================================== */

/**
 * The slimes the ranch starts with: five to a pen, each bounded to its own pen so wandering never leaks
 * across the ranch.
 *
 * Idempotent, because `StrictMode` mounts every component twice and a seed that ran on each of them would
 * double the herd. Seeding is by definition a once-per-page act, so it is expressed as one.
 */
export function seedHerd(
  pens: readonly (readonly [number, number])[],
  penRadius: number,
  families: readonly Family[],
): void {
  if (world.length > 0 || keptCount() > 0) return;
  const stages: readonly Stage[] = ['pip', 'tuffet', 'crested', 'warden'];
  const out: Slimelet[] = [];
  pens.forEach((pen, p) => {
    for (let k = 0; k < 5; k += 1) {
      const a = (k / 5) * Math.PI * 2 + p * 1.1;
      const r = 1.1 + (k % 3) * 0.85;
      out.push({
        uid: nextSlimeUid(),
        family: families[(p * 5 + k) % families.length]!,
        stage: stages[k % 4]!,
        position: [pen[0] + Math.cos(a) * r, 0, pen[1] + Math.sin(a) * r],
        seed: p * 977 + k * 131 + 7,
        bounds: { center: [pen[0], pen[1]], radius: penRadius },
      });
    }
  });
  world = out;
  publish();
}

/* ============================================================================
   Capture
   ========================================================================== */

/**
 * A slime went into the tank, so it leaves the world — and the world hands its whole record over so the
 * same creature comes back out.
 *
 * Returns the slime that was taken, or null if nothing matched. NOTHING IS RECORDED WHEN NOTHING IS
 * TAKEN, and that is the invariant: a capture that removes nothing while the tank believes it is holding
 * something is what makes one slime look like four.
 */
export function takeSlime(mark: CaptureMark): Slimelet | null {
  let at = -1;
  if (mark.uid != null) at = world.findIndex((sl) => sl.uid === mark.uid);
  if (at >= 0) tally.byUid += 1;
  else {
    /* THE OLD MATCHER, kept only as a floor. See the note at the top of this file for why it is wrong;
       it is here so that a slime which reached the herd without a uid is still removed rather than left
       standing, and every use of it is counted so its use can be asserted to be zero. */
    let bestD = Infinity;
    world.forEach((sl, i) => {
      if (sl.family !== mark.family || sl.stage !== mark.stage) return;
      const d = Math.hypot(sl.position[0] - mark.x, sl.position[2] - mark.z);
      if (d < bestD) {
        bestD = d;
        at = i;
      }
    });
    if (at >= 0) tally.byPosition += 1;
  }
  if (at < 0) {
    tally.unmatched += 1;
    return null;
  }
  const taken = world[at]!;
  const queue = held.get(taken.family) ?? [];
  queue.push(taken);
  held.set(taken.family, queue);
  world = world.filter((_, i) => i !== at);
  publish();
  return taken;
}

/* ============================================================================
   Release
   ========================================================================== */

/**
 * And back out again, at the spot the child watched it land.
 *
 * BOUNDED TO WHERE IT WAS PUT DOWN, which is the other half of the vanishing slime. It used to be bounded
 * to the NEAREST PEN with the radius stretched to reach it — `max(PEN_RADIUS, distanceToPen + 1.5)` — so a
 * slime set down in the barn, sixteen metres from the nearest pen, was handed a 16.4m roaming circle
 * centred on a pen it had never been in, and walked out of the barn and off across the ranch. `ROAM` is
 * both the cutoff and the leash length; see `ground.ts`.
 */
export function putSlime(family: Family, position: [number, number, number]): Slimelet {
  const queue = held.get(family) ?? [];
  const back = queue.shift();
  held.set(family, queue);
  const bounds = { center: [position[0], position[2]] as [number, number], radius: ROAM };
  const out: Slimelet = back
    ? { ...back, position, bounds }
    : {
        /* Only reachable if a release arrives with nothing recorded behind it, e.g. the tank flushing on
           unmount after a reload. Keep the creature whole rather than dropping it. */
        uid: nextSlimeUid(),
        family,
        stage: 'tuffet',
        position,
        seed: 9001 + world.length * 211,
        bounds,
      };
  if (back) tally.restored += 1;
  else tally.invented += 1;
  world = [...world, out];
  publish();
  return out;
}

/* ============================================================================
   Grant, and a purchase
   ========================================================================== */

/**
 * A round finished, so a slime joins the ranch — IN FRONT OF THE CHILD, not at a place on the map.
 *
 * THIS IS THE WHOLE OF THE OWNER'S FIRST REPORT: "sometimes when you dispense the slimes, such as for
 * tow-line, the slimes are technically popped out but i swear they disappear immediately after and you
 * can't find them again."
 *
 * Nothing was disappearing. The station's cradle hatches a HATCHLING, and `stations/Cradle.tsx` says in
 * as many words that it is deliberately not a `<Slime>` — it is two seconds of theatre with no collider
 * and no brain, and it unmounts when the animation ends. The real slime was added by `grant`, which put
 * it in `PENS[prev.length % PENS.length]` — a pen up to twenty-five metres away and usually not even in
 * view. So the child watched a creature hatch out of an egg and then stop existing, while their actual
 * reward stood in a pen across the ranch, indistinguishable from the fourteen already in it.
 *
 * It is the same defect the shop had, and it has the same fix: put it 1.8m along the keeper's own facing
 * vector, clear of their 0.45m radius and inside the near clip, so it lands in view wherever they are
 * standing. `placeSlime` still has the last word, so a spot inside the cradle or off the walkable ranch
 * resolves to the nearest reachable ground rather than vanishing.
 */
export function grantSlime(family: Family, at: { x: number; z: number }): Slimelet {
  const stage: Stage = 'pip';
  const spot = placeSlime(at.x, at.z, slimeRadius(family, stage));
  const out: Slimelet = {
    uid: nextSlimeUid(),
    family,
    stage,
    position: [spot.x, 0, spot.z],
    seed: 4001 + world.length * 173,
    bounds: { center: [spot.x, spot.z], radius: ROAM },
  };
  tally.granted += 1;
  world = [...world, out];
  publish();
  return out;
}

/* ============================================================================
   Test and preview only
   ========================================================================== */

/**
 * Put a specific herd into the store, records and uids intact.
 *
 * Test and preview only, and it does NOT touch the audit counters: a hand-built herd was not captured,
 * released or granted, so counting it as any of those would make the counters lie about the session.
 */
export function setHerd(slimes: readonly Slimelet[]): void {
  world = slimes.map((s) => ({ ...s }));
  publish();
}

export function resetHerd(): void {
  world = [];
  snapshot = world;
  held.clear();
  nextUid = 1;
  tally.byUid = 0;
  tally.byPosition = 0;
  tally.unmatched = 0;
  tally.restored = 0;
  tally.invented = 0;
  tally.granted = 0;
  for (const l of listeners) l();
}

/**
 * The population, published for a browser harness on the same terms as `herd.ts`'s `__slimes`: a
 * function rather than a snapshot, so it costs one property assignment at load and nothing after.
 *
 * It is here because "no slime was lost" and "no slime was duplicated" are claims about the RUNNING page
 * and neither is visible in a screenshot of it.
 */
if (typeof window !== 'undefined') {
  (window as unknown as { __keep?: unknown }).__keep = {
    world: (): Slimelet[] => herdSlimes().map((s) => ({ ...s })),
    tank: (): number => keptCount(),
    total: (): number => herdSlimes().length + keptCount(),
    audit,
  };
}
