import type { Group, Mesh, Object3D } from 'three';

import { mergeGroup } from './merge';
import { castSignature, materialSignature } from './signature';
import { materialState } from './still';

/**
 * ONE BATCH OF A SUBTREE, AND THE SIX WAYS IT CAN GO STALE.
 *
 * ══ WHY STALENESS IS THE HARD PART ════════════════════════════════════════════════════════════════
 *
 * Merging is easy. Knowing when the merge has stopped being true is the whole problem, and getting it
 * wrong is worse than not batching at all, because the failure is a GHOST: geometry that was baked
 * into a merged mesh keeps drawing after the thing it was copied from is gone. On a station that
 * swaps its meshes when the question changes, that is the previous question still hanging in the air
 * behind the new one.
 *
 * The measurement forced this. The two subtrees worth batching are the shop (294 mergeable meshes)
 * and the stations (197) — and both change what they contain while a child plays. A one-shot merge is
 * only safe for a subtree that never changes, and the only such subtree here, `Buildings`, has almost
 * nothing left to merge because it already instances everything that repeats.
 *
 * So a batch watches for its own invalidation. Every one of these was a shipped bug before it was a
 * check, which is the honest way to read the list:
 *
 *   1. A MESH APPEARS OR DISAPPEARS. Caught by counting the meshes in the subtree.
 *
 *   2. A MERGED SOURCE IS DETACHED. Caught by `parent === null`, and necessary because a count cannot
 *      see a SWAP: a station replacing four meshes with four others leaves the count identical.
 *
 *   3. SOMETHING TRIES TO HIDE OR SHOW A SOURCE. A source is hidden by setting `visible = false`, but
 *      React may later want to hide or show that same mesh itself — and its write would be lost,
 *      because the mesh is already hidden. So `visible` is replaced with an accessor that keeps
 *      reporting false while recording what was actually wanted.
 *
 *   4. AN ANCESTOR IS HIDDEN OR SHOWN. `visible` is not inherited, so this is a different question
 *      from 3 and the accessor cannot see it. See `ancestorVisibility`.
 *
 *   5. A MERGED SOURCE MOVES. The merge baked one transform; most of this game's motion is triggered
 *      rather than continuous, and is written to a parent GROUP. See `HiddenSource.matrix`.
 *
 *   6. A MERGED SOURCE'S MATERIAL CHANGES. The merged mesh holds a clone, so the change reaches
 *      nothing. See `HiddenSource.material`.
 *
 * The subtree being unmounted is handled separately: the owner dissolves on unmount.
 *
 * ══ THE THRASH GUARD, AND WHY IT COUNTS RATE RATHER THAN TOTAL ════════════════════════════════════
 *
 * A subtree that changes constantly would dissolve and rebuild constantly, and rebuilding costs more
 * than the batch saves. The first version simply gave up after three rebuilds ever — which was wrong
 * for a reason that only showed up when the staleness path was driven against the running game: a
 * station legitimately changes its meshes EVERY TIME THE QUESTION CHANGES. A child answers a dozen
 * items in a visit, so a total cap of three meant the stations un-batched themselves after the third
 * question and handed back most of the win, silently, in the middle of play.
 *
 * What actually needs bounding is rebuilds arriving faster than they can pay for themselves. So
 * rebuilds spaced further apart than `patience` frames are free and unlimited — that is a child
 * answering questions — and only a run of rebuilds closer together than that counts as thrash.
 */
export interface BatchStats {
  /** Meshes folded away. */
  merged: number;
  /** Draw calls they were replaced by. */
  draws: number;
  skipped: {
    moved: number;
    instanced: number;
    multiMaterial: number;
    interactive: number;
    material: number;
    hiddenAncestor: number;
  };
  candidates: number;
}

interface HiddenSource {
  mesh: Mesh;
  /** What the owner last asked `visible` to be. Starts true — it was visible when it was merged. */
  wanted: boolean;
  /**
   * The source's world matrix as it was when its geometry was baked.
   *
   * A merged mesh has ONE baked transform, so a source that starts moving after the merge is frozen.
   * `still.ts` refuses to merge anything moving during its window, but a great deal of this game's
   * motion is triggered rather than continuous: the shop's coin pile bobs when a child presses a
   * cubby they cannot afford, the cradle's egg rocks once per thing handed over. Both are transforms
   * written to a PARENT GROUP, which is why the `visible` accessor never sees them and why watching
   * the material was not enough. Without this the acknowledgement a child gets for acting is simply
   * dead, and `Shop.tsx` says that bob is the entire affordance — "nothing is refused, nothing is
   * said".
   */
  matrix: number[];
  /** The layer mask the source had before it was taken out of rendering. */
  layers: number;
  /**
   * Whether every ancestor up to the batch root was visible when this was merged.
   *
   * See `ancestorVisibility`. A group hidden AFTER the merge must dissolve it, or the merged copy
   * keeps drawing what the owner has just taken out of the world.
   */
  ancestors: string;
  /**
   * The source material's animatable channels as they were when it was merged.
   *
   * A merged mesh carries a CLONE of the material, so a mutation of the original after the merge
   * reaches nothing. `still.ts` already refuses to merge a material that animates DURING its window,
   * but the ranch's lanterns are not animated continuously — they are dark, and then at some point
   * they light. Constant through the window, merged, and then 65 lamps stayed dark while every
   * unmerged copy came on. Caught by `guard.mjs` as four bright specks that would never have been
   * noticed in play.
   */
  material: string;
}

const EMPTY_STATS: BatchStats = {
  merged: 0,
  draws: 0,
  skipped: { moved: 0, instanced: 0, multiMaterial: 0, interactive: 0, material: 0, hiddenAncestor: 0 },
  candidates: 0,
};

/**
 * WHETHER EVERY ANCESTOR UP TO THE BATCH ROOT IS VISIBLE, as a string that changes when any of them
 * does.
 *
 * `Object3D.visible` IS NOT INHERITED — it is consulted per object as the renderer walks down, so a
 * mesh inside `<group visible={false}>` still has `mesh.visible === true`. `Object3D.traverse` visits
 * it too; only `traverseVisible` short-circuits. The first version of this file tested the mesh's own
 * flag and nothing else, which meant it happily merged geometry the owner had deliberately taken out
 * of the world — and the merged copy went into a group that IS visible.
 *
 * `stations/Cradle.tsx` is the case that makes it concrete: the two egg-shell halves live under
 * `<group visible={false}>` until a hatch, so they passed every other gate — opaque, single material,
 * no handler, never moving — and merging them drew two cracked shell halves permanently inside the
 * whole egg, `side: DoubleSide` so nothing culled them. The same shape of bug sits on the hatchling
 * body and on `screener/DayLog.tsx`'s dormant rings.
 */
function ancestorVisibility(mesh: Object3D, host: Object3D): string {
  let out = '';
  let node: Object3D | null = mesh.parent;
  while (node) {
    out += node.visible ? '1' : '0';
    if (node === host) break;
    node = node.parent;
  }
  return out;
}

const allVisible = (chain: string): boolean => !chain.includes('0');

/** Does this object, or anything between it and the batch root, carry an r3f pointer handler? */
function interactiveChain(mesh: Object3D, host: Object3D): boolean {
  let node: Object3D | null = mesh;
  while (node) {
    const handlers = (node as unknown as { __r3f?: { handlers?: Record<string, unknown> } }).__r3f
      ?.handlers;
    if (handlers && Object.keys(handlers).length > 0) return true;
    if (node === host) return false;
    node = node.parent;
  }
  return false;
}

/** Count of meshes in a subtree — the cheap fingerprint that catches an add or a remove. */
export function meshCount(root: Object3D): number {
  let n = 0;
  root.traverse((o) => {
    if ((o as Mesh).isMesh) n += 1;
  });
  return n;
}

export class Batch {
  private hidden: HiddenSource[] = [];
  private countAtMerge = 0;
  private invalidated = false;
  private built = false;

  build(host: Object3D, sink: Group, still: ReadonlySet<string>): BatchStats {
    const stats: BatchStats = { ...EMPTY_STATS, skipped: { ...EMPTY_STATS.skipped } };
    const groups = new Map<string, Mesh[]>();

    host.traverse((o) => {
      const mesh = o as Mesh;
      if (!mesh.isMesh || !mesh.visible) return;
      stats.candidates += 1;
      /* Not `mesh.visible` — that is only this object's own flag. See `ancestorVisibility`. */
      if (!allVisible(ancestorVisibility(mesh, host))) {
        stats.skipped.hiddenAncestor += 1;
        return;
      }
      /* An `InstancedMesh` is already one draw call for all of its copies, and it IS an `isMesh`.
         Merging one would bake only its base geometry and delete every instance but the first. */
      if ((mesh as unknown as { isInstancedMesh?: boolean }).isInstancedMesh) {
        stats.skipped.instanced += 1;
        return;
      }
      if (!still.has(mesh.uuid)) {
        stats.skipped.moved += 1;
        return;
      }
      if (Array.isArray(mesh.material)) {
        stats.skipped.multiMaterial += 1;
        return;
      }
      /**
       * ANYTHING INSIDE AN INTERACTIVE SUBTREE, not just anything carrying a handler.
       *
       * react-three-fiber BUBBLES: it raycasts from each interaction root and then walks UP from the
       * object it hit looking for ancestors with handlers. So a handler-less mesh under an
       * interactive group is a legitimate hit target — it is how the click reaches the group. Taking
       * it out of raycasting would make that group unclickable, so the whole subtree is left alone.
       *
       * `handlers` is r3f 9's own store: `instance.eventCount = Object.keys(instance.handlers).length`
       * in its reconciler, so this is the same test r3f applies to decide what is interactive.
       */
      if (interactiveChain(mesh, host)) {
        stats.skipped.interactive += 1;
        return;
      }
      const signature = materialSignature(mesh.material);
      if (signature === null) {
        stats.skipped.material += 1;
        return;
      }
      const key = `${signature}||${castSignature(mesh)}`;
      const bucket = groups.get(key);
      if (bucket) bucket.push(mesh);
      else groups.set(key, [mesh]);
    });

    for (const bucket of groups.values()) {
      const merged = mergeGroup(bucket, host);
      if (!merged) continue;
      sink.add(merged);
      stats.merged += bucket.length;
      stats.draws += 1;
      for (const mesh of bucket) this.hide(mesh, host);
    }

    this.countAtMerge = meshCount(host);
    this.invalidated = false;
    this.built = stats.draws > 0;
    return stats;
  }

  /**
   * Hide a source and intercept anything that later tries to change its visibility.
   *
   * The accessor is `configurable` so `dissolve` can delete it and hand the plain property back.
   */
  private hide(mesh: Mesh, host: Object3D): void {
    const record: HiddenSource = {
      mesh,
      wanted: mesh.visible,
      layers: mesh.layers.mask,
      material: materialState(mesh),
      /* A plain copy, NOT a Float32Array: `Matrix4.elements` holds doubles, and rounding them to
         float32 made every later comparison mismatch — which read as the subtree changing every
         frame, tripped the thrash guard, and silently abandoned both batches. */
      matrix: mesh.matrixWorld.elements.slice(),
      ancestors: ancestorVisibility(mesh, host),
    };
    this.hidden.push(record);
    /**
     * TAKEN OUT OF RENDERING BY ITS LAYER MASK, NOT BY LYING ABOUT `visible`.
     *
     * The first version replaced `visible` with an accessor that always answered false. That broke
     * the shop. `economy/Shop.tsx` picks the cubby a child is aiming at with
     *
     *     const pick = hits.find((h) => h.object.visible === false);
     *
     * — invisibility is its SENTINEL for the deliberately-invisible hit volume. Hiding 294 shelf
     * meshes behind an accessor meant the first "invisible" hit was a shelf plank, `userData.family`
     * came back undefined, and the highlight that tells a child which slime they are pointing at died
     * for the rest of the session. An optimisation must not tell the game things that are not true.
     *
     * A zero layer mask is the honest way to say the same thing. `WebGLRenderer.projectObject`,
     * `WebGLShadowMap.renderObject` and `Raycaster.intersect` all gate on
     * `object.layers.test(camera.layers)`, so the source stops rendering, stops casting and stops
     * being picked — which is correct, because the merged mesh is what draws it now — while `visible`
     * keeps answering what the owner set.
     *
     * The accessor stays, purely as an OBSERVER: it reports the true value and notices writes, which
     * is how case 3 in this file's header is detected.
     */
    mesh.layers.mask = 0;
    Object.defineProperty(mesh, 'visible', {
      configurable: true,
      enumerable: true,
      get: () => record.wanted,
      set: (next: boolean) => {
        if (next === record.wanted) return;
        record.wanted = next;
        this.invalidated = true;
      },
    });
  }

  isStale(host: Object3D): boolean {
    if (!this.built) return false;
    if (this.invalidated || meshCount(host) !== this.countAtMerge) return true;
    for (const source of this.hidden) {
      /* Detached. Catches the swap a count cannot: a station replacing four meshes with four others
         leaves `meshCount` identical, writes no `visible`, and changes no material — and the old
         geometry would keep drawing behind the new question, which is the ghost this file exists to
         prevent. */
      if (source.mesh.parent === null) return true;
      if (materialState(source.mesh) !== source.material) return true;
      if (ancestorVisibility(source.mesh, host) !== source.ancestors) return true;
      /* Element-wise rather than joining to a string: this runs over every merged source and a
         string per matrix would allocate several hundred times a second for nothing. */
      const now = source.mesh.matrixWorld.elements;
      const then = source.matrix;
      for (let i = 0; i < 16; i += 1) if (now[i] !== then[i]) return true;
    }
    return false;
  }

  /** Un-hide every source, dispose everything this batch created, and empty the sink. */
  dissolve(sink: Group): void {
    for (const { mesh, wanted, layers } of this.hidden) {
      delete (mesh as unknown as Record<string, unknown>).visible;
      mesh.visible = wanted;
      mesh.layers.mask = layers;
    }
    this.hidden = [];
    for (const child of [...sink.children]) {
      const mesh = child as Mesh;
      mesh.geometry?.dispose();
      if (mesh.material && !Array.isArray(mesh.material)) mesh.material.dispose();
    }
    sink.clear();
    this.built = false;
    this.invalidated = false;
  }
}

/**
 * Is this subtree rebuilding faster than the batch can pay for itself?
 *
 * Rebuilds spaced further apart than `patience` frames cost nothing worth counting — that is a child
 * answering a question every few seconds, and re-merging the station's structures afterwards is a
 * few milliseconds once. A RUN of rebuilds closer together than that is a subtree changing every
 * frame, where merging will never come out ahead and the honest answer is to stop trying.
 */
export class ThrashGuard {
  private lastRebuildFrame = -Infinity;
  private consecutive = 0;

  constructor(
    private readonly patience = 180,
    private readonly limit = 3,
  ) {}

  /** Call on every rebuild. Returns true when the subtree should be left alone from now on. */
  rebuilt(frame: number): boolean {
    if (frame - this.lastRebuildFrame < this.patience) this.consecutive += 1;
    else this.consecutive = 1;
    this.lastRebuildFrame = frame;
    return this.consecutive > this.limit;
  }
}
