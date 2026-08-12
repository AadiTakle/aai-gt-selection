import type { Mesh, Object3D } from 'three';

/**
 * WHICH MESHES NEVER MOVE — measured over the first few frames rather than declared.
 *
 * ══ WHY THIS IS NOT A LIST ════════════════════════════════════════════════════════════════════════
 *
 * The batcher must not merge anything that animates: a merged mesh has one baked transform, so a
 * windmill vane folded into the barn wall would stop turning and take the wall with it if anything
 * ever moved the group. The obvious way to prevent that is a list of things to leave alone, or a
 * `userData.dynamic` flag on each animated part.
 *
 * Both are wrong here for the same reason. `world/Buildings.tsx` belongs to another author and is
 * under active development on this branch — eight commits and counting. A list maintained over here
 * goes stale the first time someone over there adds a moving part, and it goes stale SILENTLY: the
 * new thing simply stops moving, in a build nobody is looking at closely because the change was to a
 * different file. Marking the parts at their source means editing exactly the file this design
 * promised not to edit.
 *
 * So stillness is observed: a mesh is still once its world matrix has been UNCHANGED FOR `hold`
 * CONSECUTIVE FRAMES. The windmill vane excludes itself, and so will anything added later, with no
 * coordination between the two branches at all.
 *
 * ══ CONSECUTIVE, NOT "UNCHANGED SINCE THE FIRST FRAME" ════════════════════════════════════════════
 *
 * The first version of this compared every frame against the first one, and it judged 75 of the 78
 * eligible meshes in `Buildings` to be moving — which is to say it batched nothing at all and looked
 * exactly like a batcher that had worked. The cause is mount: r3f composes transforms over the first
 * frames after a subtree appears, so a perfectly static wall legitimately has two different world
 * matrices before it settles. Comparing against the first frame counts that as motion, forever.
 *
 * A run of consecutive unchanged frames absorbs the settling and still catches animation, because
 * anything animating breaks its run every frame and never accumulates one.
 *
 * ══ WHAT THIS COSTS ═══════════════════════════════════════════════════════════════════════════════
 *
 * A part that is animated but happens to be STATIONARY throughout the window — a door that only opens
 * when a child opens it, an animation paused under `prefers-reduced-motion` — is wrongly judged
 * still, and would be frozen once merged. The window cannot see the future and no observational
 * scheme can. The mitigation is that such a thing is visible immediately in play, and the failure is
 * a prop that does not move rather than a prop that vanishes.
 *
 * A mesh that appears after watching began is EXCLUDED, because it has not been watched long enough
 * to have earned the judgement.
 */
interface Track {
  key: string;
  /** Consecutive observations, including this one, in which the matrix has not changed. */
  stableFor: number;
  gone: boolean;
}

export class StillWatch {
  private readonly tracks = new Map<string, Track>();
  private frames = 0;

  constructor(
    private readonly window: number = 30,
    private readonly hold: number = 20,
  ) {}

  observe(root: Object3D): void {
    const seen = new Set<string>();
    root.traverse((o) => {
      const mesh = o as Mesh;
      if (!mesh.isMesh) return;
      seen.add(mesh.uuid);
      const key = mesh.matrixWorld.elements.join(',');
      const track = this.tracks.get(mesh.uuid);
      if (!track) {
        /* Only what is present when watching begins may enrol. */
        if (this.frames === 0) this.tracks.set(mesh.uuid, { key, stableFor: 1, gone: false });
        return;
      }
      if (track.key === key) track.stableFor += 1;
      else {
        track.key = key;
        track.stableFor = 1;
      }
    });
    /* Gone is disqualifying: merging geometry that has been unmounted would resurrect it. */
    for (const [uuid, track] of this.tracks) if (!seen.has(uuid)) track.gone = true;
    this.frames += 1;
  }

  settled(): boolean {
    return this.frames >= this.window;
  }

  stillUuids(): Set<string> {
    const out = new Set<string>();
    for (const [uuid, track] of this.tracks) {
      if (!track.gone && track.stableFor >= this.hold) out.add(uuid);
    }
    return out;
  }
}
