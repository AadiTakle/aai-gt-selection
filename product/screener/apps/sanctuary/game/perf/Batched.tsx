import { useFrame } from '@react-three/fiber';
import { useEffect, useRef, type JSX, type ReactNode } from 'react';
import type { Group } from 'three';

import { Batch, ThrashGuard } from './batch';
import { batchingEnabled, perfEnabled } from './enabled';
import { StillWatch } from './still';

/**
 * COLLAPSE A SUBTREE'S STATIC MESHES INTO ONE DRAW CALL PER MATERIAL, at runtime, without editing the
 * files that built them.
 *
 * ══ WHY IT WORKS BY TRAVERSAL ═════════════════════════════════════════════════════════════════════
 *
 * The geometry this targets is built in `world/Buildings.tsx`, `economy/Shop.tsx` and `stations/`,
 * which belong to another author and are under active development on this branch — thirty commits
 * across them. Editing them at the source would read better and would conflict on every merge. So the
 * wrapper reaches them from outside: it renders its children unchanged, watches what they built, and
 * rebuilds the static part of it as merged geometry. None of those files learns that this exists.
 *
 * The cost is honest and worth naming: this is more machinery than an authoring-time fix, it runs at
 * load rather than at build, and it can only ever be as clever as what it can observe. It is the right
 * trade while the branch is busy and the wrong one once it is quiet.
 *
 * ══ WHAT IT MERGES, AND WHAT KEEPS IT HONEST ══════════════════════════════════════════════════════
 *
 * `still.ts` decides what is static, by watching rather than by a list — which is what spares the
 * windmill vane and anything animated added later. `signature.ts` decides what may share a draw call
 * without changing a pixel. `batch.ts` owns the merge and, more importantly, owns knowing when the
 * merge has stopped being true: the shop and the stations both swap meshes while a child plays, and a
 * merge that did not notice would leave the previous question hanging in the air.
 *
 * This component is only the loop that drives those three.
 */
const WINDOW = 30;
const HOLD = 20;
/** How often to ask whether the merge is still true. Every frame would spend the win on checking. */
const CHECK_EVERY = 15;
/**
 * How far apart two rebuilds must be to count as unrelated rather than as thrash. Three seconds at
 * 60fps — comfortably longer than a station takes to swap a question, comfortably shorter than a
 * child takes to answer one. See `ThrashGuard`.
 */
const PATIENCE_FRAMES = 180;

interface Props {
  children: ReactNode;
  /** Named only so the report says which subtree it is talking about. */
  label?: string;
  /** Off switch. Defaults to `?nobatch=1`, which is how `guard.mjs` A/Bs one build. */
  enabled?: boolean;
}

export function Batched({ children, label = 'subtree', enabled }: Props): JSX.Element {
  const on = enabled ?? batchingEnabled(label);
  const host = useRef<Group>(null);
  const sink = useRef<Group>(null);
  const watch = useRef(new StillWatch(WINDOW, HOLD));
  const batch = useRef(new Batch());
  const merged = useRef(false);
  const thrash = useRef(new ThrashGuard(PATIENCE_FRAMES));
  const abandoned = useRef(false);
  const ticks = useRef(0);

  /**
   * EVERY FRAME'S WORK IS WRAPPED, and this is the most important line in the file.
   *
   * react-three-fiber runs `useFrame` subscribers in a bare loop and calls `gl.render` only AFTER
   * them, so an exception thrown here does not merely skip the batcher: it skips every subscriber
   * registered after it — the keeper's camera among them — and skips the render itself. The canvas
   * freezes on its last good image, and it repeats every frame because nothing clears the condition.
   * r3f's own ErrorBoundary cannot catch it; an uncaught rAF error is not a React render error.
   *
   * This code merges geometry built by files another author is actively editing. It WILL meet
   * something it did not expect. When it does, the correct outcome is the behaviour the game had
   * before any of this existed, so a failure dissolves the batch and stands down for good.
   */
  const runFrame = (): void => {
    if (!on || abandoned.current) return;
    const root = host.current;
    const target = sink.current;
    if (!root || !target) return;

    /* Advanced on EVERY frame, not only merged ones. `ThrashGuard` reads it as a wall clock, and a
       counter that stops during each 30-frame re-observation reported gaps about half their true
       length — which would abandon the stations after four questions, the same silent regression the
       rate-based guard was written to remove. */
    ticks.current += 1;

    if (!merged.current) {
      watch.current.observe(root);
      if (!watch.current.settled()) return;
      const stats = batch.current.build(root, target, watch.current.stillUuids());
      merged.current = true;
      if (perfEnabled()) {
        console.info(
          `[batch:${label}] ${stats.candidates} meshes · ${stats.merged} folded into ${stats.draws} draws · ` +
            `skipped ${JSON.stringify(stats.skipped)}`,
        );
      }
      return;
    }

    if (ticks.current % CHECK_EVERY !== 0) return;
    if (!batch.current.isStale(root)) return;

    batch.current.dissolve(target);
    merged.current = false;
    if (thrash.current.rebuilt(ticks.current)) {
      abandoned.current = true;
      if (perfEnabled()) {
        console.info(`[batch:${label}] changes too often to be worth batching — left alone`);
      }
      return;
    }
    /* A fresh watch: the subtree is different now, so what is still in it is an open question. */
    watch.current = new StillWatch(WINDOW, HOLD);
  };

  useFrame(() => {
    try {
      runFrame();
    } catch (error) {
      abandoned.current = true;
      try {
        if (sink.current) batch.current.dissolve(sink.current);
      } catch {
        /* Dissolving is best-effort: if it also throws there is nothing further to try, and standing
           down still beats taking the render loop with us. */
      }
      console.error(`[batch:${label}] stood down after an error; the subtree is unbatched`, error);
    }
  });

  useEffect(() => {
    const target = sink.current;
    const owned = batch.current;
    return () => {
      if (target) owned.dissolve(target);
      /* Refs survive an unmount/remount but the batch does not, and `isStale` answers false once
         dissolved — so without resetting these the subtree would come back permanently unbatched,
         silently, with only the draw-call count to show for it. React 19 destroys effects for a
         Suspense-hidden tree and r3f wraps every Canvas child in its own Suspense, so this is
         reachable in play and not only under Fast Refresh. */
      merged.current = false;
      watch.current = new StillWatch(WINDOW, HOLD);
    };
  }, []);

  return (
    <>
      <group ref={host}>{children}</group>
      {/* A sibling, not a child: merged geometry is baked relative to `host`, and nesting it inside
          would apply that transform to it a second time. */}
      <group ref={sink} />
    </>
  );
}
