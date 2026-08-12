import { useFrame } from '@react-three/fiber';
import { useEffect, useRef, type JSX, type ReactNode } from 'react';
import type { Group } from 'three';

import { Batch } from './batch';
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
 * Give up after this many rebuilds.
 *
 * A subtree that changes constantly costs more to re-merge than the merge saves, and the right
 * behaviour then is the behaviour it had before any of this existed. Three is enough to absorb a
 * station changing its question a couple of times and few enough that nothing can thrash.
 */
const MAX_REBUILDS = 3;

interface Props {
  children: ReactNode;
  /** Named only so the report says which subtree it is talking about. */
  label?: string;
  /** Off switch. Defaults to `?nobatch=1`, which is how `guard.mjs` A/Bs one build. */
  enabled?: boolean;
}

export function Batched({ children, label = 'subtree', enabled = batchingEnabled() }: Props): JSX.Element {
  const host = useRef<Group>(null);
  const sink = useRef<Group>(null);
  const watch = useRef(new StillWatch(WINDOW, HOLD));
  const batch = useRef(new Batch());
  const merged = useRef(false);
  const rebuilds = useRef(0);
  const abandoned = useRef(false);
  const ticks = useRef(0);

  useFrame(() => {
    if (!enabled || abandoned.current) return;
    const root = host.current;
    const target = sink.current;
    if (!root || !target) return;

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

    ticks.current += 1;
    if (ticks.current % CHECK_EVERY !== 0) return;
    if (!batch.current.isStale(root)) return;

    batch.current.dissolve(target);
    merged.current = false;
    rebuilds.current += 1;
    if (rebuilds.current > MAX_REBUILDS) {
      abandoned.current = true;
      if (perfEnabled()) {
        console.info(`[batch:${label}] changes too often to be worth batching — left alone`);
      }
      return;
    }
    /* A fresh watch: the subtree is different now, so what is still in it is an open question. */
    watch.current = new StillWatch(WINDOW, HOLD);
  });

  useEffect(() => {
    const target = sink.current;
    const owned = batch.current;
    return () => {
      if (target) owned.dissolve(target);
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
