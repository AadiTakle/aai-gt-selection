import type { Group, Mesh, Object3D } from 'three';

import { mergeGroup } from './merge';
import { castSignature, materialSignature } from './signature';

/**
 * ONE BATCH OF A SUBTREE, AND THE THREE WAYS IT CAN GO STALE.
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
 * So a batch watches for its own invalidation, and there are exactly three ways it happens:
 *
 *   1. A MESH APPEARS OR DISAPPEARS. Caught by counting the meshes in the subtree and comparing with
 *      the count at merge time.
 *
 *   2. SOMETHING TRIES TO HIDE OR SHOW A SOURCE. A source is hidden by setting `visible = false`, but
 *      React may later want to hide or show that same mesh itself — and its write would be lost,
 *      because the mesh is already hidden. That is a silent wrong picture: a part that should have
 *      disappeared stays baked into the merge. So `visible` is replaced with an accessor that keeps
 *      reporting false while recording what was actually wanted, and any change to the wanted value
 *      invalidates the batch.
 *
 *   3. THE SUBTREE IS UNMOUNTED. The owner dissolves on unmount.
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
  skipped: { moved: number; instanced: number; multiMaterial: number; interactive: number; material: number };
  candidates: number;
}

interface HiddenSource {
  mesh: Mesh;
  /** What the owner last asked `visible` to be. Starts true — it was visible when it was merged. */
  wanted: boolean;
}

const EMPTY_STATS: BatchStats = {
  merged: 0,
  draws: 0,
  skipped: { moved: 0, instanced: 0, multiMaterial: 0, interactive: 0, material: 0 },
  candidates: 0,
};

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
      /* r3f hangs pointer handlers off the object; anything carrying one is raycast against, and a
         merged mesh is a different object that the raycast would never find. */
      const handlers = (mesh as unknown as { __r3f?: { handlers?: Record<string, unknown> } }).__r3f
        ?.handlers;
      if (handlers && Object.keys(handlers).length > 0) {
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
      for (const mesh of bucket) this.hide(mesh);
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
  private hide(mesh: Mesh): void {
    const record: HiddenSource = { mesh, wanted: true };
    this.hidden.push(record);
    Object.defineProperty(mesh, 'visible', {
      configurable: true,
      enumerable: true,
      get: () => false,
      set: (next: boolean) => {
        if (next === record.wanted) return;
        record.wanted = next;
        /* Somebody wants this mesh's visibility to be something the merge cannot represent. */
        this.invalidated = true;
      },
    });
  }

  isStale(host: Object3D): boolean {
    if (!this.built) return false;
    return this.invalidated || meshCount(host) !== this.countAtMerge;
  }

  /** Un-hide every source, dispose everything this batch created, and empty the sink. */
  dissolve(sink: Group): void {
    for (const { mesh, wanted } of this.hidden) {
      delete (mesh as unknown as Record<string, unknown>).visible;
      mesh.visible = wanted;
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
