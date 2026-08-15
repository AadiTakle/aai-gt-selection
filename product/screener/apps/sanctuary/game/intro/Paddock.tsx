import { useFrame } from '@react-three/fiber';
import { useMemo, useRef, type JSX } from 'react';
import { CylinderGeometry, type Group, type Mesh, type MeshStandardMaterial, SphereGeometry } from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';

import { Instanced, type Placement } from '../world/instanced';
import { materials } from '../world/pigment';
import { breath } from '../screener/theme';
import { HONEY } from '../stations/carpentry';
import { BOARD_HEIGHT, FENCE, GATE, POST_H, POST_W, GATE_POST_EXTRA } from './site';

/**
 * THE BACK PADDOCK, AND THE BOARDS NAILED OVER ITS GATE.
 *
 * ══ IT IS THE SAME FENCE THE RANCH ALREADY HAS ════════════════════════════════════════════════════
 *
 * Same post, same spacing, same two rail heights, same pigments — read off `world/Buildings.tsx`'s own
 * `Pens` rather than invented, because a fourth enclosure built to different dimensions would read as a
 * different property. A child should not be able to tell that this one was added later; they should only
 * be able to tell that it is SHUT.
 *
 * ══ WHAT "SHUT" IS MADE OF, AND WHY IT IS TWO THINGS ══════════════════════════════════════════════
 *
 * A closed gate on its own does not read as closed. The world's own pens all stand open at 0.62 radians
 * and that file says why — an open gate is an invitation to walk in — so a child arriving at a gate that
 * is merely shut has no comparison to make and no reason to think it means anything. What says "boarded
 * up" is timber nailed ACROSS the opening at an angle nobody would build on purpose: two planks in an X
 * over the leaf, obviously hammered on afterwards.
 *
 * So unlocking is two movements rather than one, and in the order a person would actually do it. The
 * boards let go and fall away first; then the leaf swings. Reversing them would have the gate opening
 * through its own barricade.
 *
 * ══ NOTHING HERE IS EVER PUT BACK ═════════════════════════════════════════════════════════════════
 *
 * `open` only ever travels from 0 to 1. There is no state in this game that takes something away from a
 * child, and a paddock that could re-board itself would be the first.
 */

/** The fence, in world space, exactly as `world/Buildings.tsx` draws the ranch's own three. */
export function PaddockFence(): JSX.Element {
  const m = materials();

  const g = useMemo(
    () => ({
      post: new RoundedBoxGeometry(POST_W, POST_H, POST_W, 2, 0.055),
      gatePost: new RoundedBoxGeometry(POST_W * 1.35, POST_H + GATE_POST_EXTRA, POST_W * 1.35, 2, 0.06),
      cap: new RoundedBoxGeometry(POST_W + 0.11, 0.09, POST_W + 0.11, 2, 0.035),
      /** Unit length in X, scaled per instance, so every rail in the paddock is one draw call. */
      rail: new RoundedBoxGeometry(1, 0.14, 0.08, 1, 0.035),
    }),
    [],
  );

  const posts = useMemo<Placement[]>(
    () =>
      FENCE.posts
        .filter((p) => !p.gatePost)
        .map((p) => ({ position: [p.x, POST_H / 2, p.z] as const, rot: [0, p.angle, 0] as const })),
    [],
  );
  const gatePosts = useMemo<Placement[]>(
    () =>
      FENCE.posts
        .filter((p) => p.gatePost)
        .map((p) => ({
          position: [p.x, (POST_H + GATE_POST_EXTRA) / 2, p.z] as const,
          rot: [0, p.angle, 0] as const,
        })),
    [],
  );
  const caps = useMemo<Placement[]>(
    () =>
      FENCE.posts.map((p) => ({
        position: [p.x, (p.gatePost ? POST_H + GATE_POST_EXTRA : POST_H) + 0.03, p.z] as const,
        rot: [0, p.angle, 0] as const,
      })),
    [],
  );
  const rails = useMemo<Placement[]>(() => {
    const out: Placement[] = [];
    for (const r of FENCE.rails) {
      for (const h of [0.52, 1.02] as const) {
        out.push({
          position: [r.x, h, r.z] as const,
          rot: [0, r.angle, 0] as const,
          scale: [r.length, 1, 1] as const,
        });
      }
    }
    return out;
  }, []);

  return (
    <group>
      <Instanced geometry={g.post} material={m.timber} items={posts} />
      <Instanced geometry={g.gatePost} material={m.timberDeep} items={gatePosts} />
      <Instanced geometry={g.cap} material={m.timberDeep} items={caps} />
      <Instanced geometry={g.rail} material={m.timber} items={rails} />
    </group>
  );
}

/**
 * The gate leaf, the boards nailed over it, and the hoarding the questions are pinned to. All authored in
 * the BOARD's local frame, and all driven by two numbers, so there is no sequencing state that can get out
 * of step with what is on screen.
 *
 * ══ THE HOARDING IS SOLID, WHICH IS THE ONE PLACE THIS DEPARTS FROM THE STATIONS ══════════════════
 *
 * `stations/carpentry.tsx` makes its bay an OPEN FRAME and argues it well: a filled panel behind a bay is
 * a blank brown rectangle five metres wide, and anything mounted on it reads as a sticker on a billboard.
 * That argument is about a noticeboard with nothing pinned to it. This is a BOARDED-UP GATEWAY, and a
 * boarded-up gateway is a wall of planks — so the shape the argument warns against is the shape this
 * object honestly has.
 *
 * It also earns its place twice over, and both reasons were found by looking rather than by reasoning:
 *
 *   IT STOPS THE SCENERY READING AS PART OF THE QUESTION. With the frame open, the crossed planks, the
 *   gate rails and the paddock fence beyond all fell across the option shelf: a photograph of the first
 *   item had a dark X straight through four candidate tiles. An item a child is being asked to compare
 *   may not have furniture drawn between its options.
 *
 *   IT MAKES THE UNLOCK MEAN SOMETHING. Because the boarding is opaque, what is behind it has never been
 *   seen. When the planks shed there is somewhere there that was not there before, which is a far stronger
 *   event than a gate swinging in front of a field the child has been looking through all along.
 *
 * ══ TWO STAGES, EACH EARNED, NEITHER REVERSIBLE ═══════════════════════════════════════════════════
 *
 *   `unboarded` reaches 1 the first time a child presses E: the crossed battens come off, which is Nan
 *   taking them down so the board can be read. Immediate feedback for having turned up, and it clears the
 *   question area before the first item lands.
 *
 *   `open` reaches 1 once the board has been worked through. The hoarding sheds plank by plank, the leaf
 *   swings, and the lamp on the far post comes on.
 *
 * Neither ever travels back.
 */
export function Gate({
  open,
  unboarded,
  bay,
  reduced,
}: {
  open: number;
  unboarded: number;
  bay: { halfW: number; halfH: number };
  reduced: boolean;
}): JSX.Element {
  const m = materials();
  const leaf = useRef<Group>(null);
  const boards = useRef<Group>(null);
  const planks = useRef<Group[]>([]);
  const lamp = useRef<MeshStandardMaterial>(null);
  const glow = useRef<Mesh>(null);
  const eased = useRef(0);
  const bare = useRef(0);
  /** Whether this is the very first frame. See the note at the top of the frame loop. */
  const first = useRef(true);

  const groundY = -BOARD_HEIGHT;
  const span = GATE.span;

  /**
   * The hoarding's planks: vertical boards filling the bay from sill to head.
   *
   * Vertical rather than horizontal so they read as boarding rather than as more gate, and an ODD count
   * so no joint runs down the middle of the panel — which is exactly where an item's own centre column
   * sits on a matrix or a carpet.
   */
  const board = useMemo(() => {
    const n = 11;
    const pitch = (bay.halfW * 2 - 0.1) / n;
    return {
      n,
      pitch,
      width: pitch - 0.035,
      height: bay.halfH * 2 - 0.06,
      xs: Array.from({ length: n }, (_, i) => (i - (n - 1) / 2) * pitch),
    };
  }, [bay.halfW, bay.halfH]);

  const g = useMemo(
    () => ({
      rail: new RoundedBoxGeometry(1, 0.13, 0.07, 1, 0.03),
      plank: new RoundedBoxGeometry(1, 0.2, 0.06, 1, 0.025),
      nail: new SphereGeometry(0.045, 8, 6),
      lampPost: new CylinderGeometry(0.05, 0.06, 1.1, 8),
      lampGlass: new SphereGeometry(0.17, 14, 10),
      board: new RoundedBoxGeometry(board.width, board.height, 0.09, 2, 0.03),
    }),
    [board.width, board.height],
  );

  useFrame(({ clock }, dt) => {
    /**
     * A child who unlocked this paddock last week arrives to find it OPEN, not opening.
     *
     * The eases below run from wherever they are toward wherever they should be, which is right for the
     * moment it happens and wrong for a page that loads with it already done: the boards would fall and
     * the gate would swing again on every visit, and a returning keeper would watch their reward being
     * given to them a second time. Photographed, a batten was still tumbling past a gate that had been
     * open since the previous session. So the first frame snaps; every frame after it animates.
     */
    if (first.current) {
      first.current = false;
      eased.current = open;
      bare.current = unboarded;
    }

    /**
     * Frame-rate independent, and it had to be.
     *
     * The first pass eased by a fixed fraction PER FRAME. On a fast machine that is about half a second;
     * photographed in headless Chrome, which renders this scene at four or five frames a second, the same
     * constant made the boards take twelve seconds to fall — so the shot of the first question had a
     * batten still lying across the option shelf. A child on a school laptop would have seen the same
     * thing. `1 - exp(-rate * dt)` is the form `stations/carpentry.tsx`'s `useEase` uses, for this reason.
     */
    const step = Math.min(dt, 0.1);
    eased.current += (open - eased.current) * (reduced ? 1 : 1 - Math.exp(-1.5 * step));
    bare.current += (unboarded - bare.current) * (reduced ? 1 : 1 - Math.exp(-3.2 * step));
    const k = eased.current;

    /** The crossed battens, taken off the moment the child engages rather than at the end. */
    const shed = bare.current;
    if (boards.current) {
      boards.current.visible = shed < 0.995;
      boards.current.position.y = -shed * shed * 3.2;
      boards.current.rotation.z = shed * 0.9;
      boards.current.rotation.x = shed * 0.4;
      boards.current.scale.setScalar(Math.max(0.001, 1 - shed * 0.15));
    }

    /**
     * The hoarding itself, plank by plank from the middle outward, over the first 55% of the opening.
     * Staggered rather than as one slab: eleven boards letting go in sequence is a thing coming apart,
     * where one board dropping is a lift door.
     */
    planks.current.forEach((p, i) => {
      if (!p) return;
      const rank = Math.abs(i - (board.n - 1) / 2) / ((board.n - 1) / 2);
      const t = Math.max(0, Math.min(1, (k / 0.55 - rank * 0.35) / 0.65));
      p.visible = t < 0.995;
      p.position.y = -t * t * 4.4;
      p.rotation.z = t * (i % 2 === 0 ? 0.8 : -0.8);
      p.scale.setScalar(Math.max(0.001, 1 - t * 0.2));
    });

    /** And the leaf swings over the back of it, with an overlap so the whole thing is one gesture. */
    const swung = Math.max(0, (k - 0.4) / 0.6);
    if (leaf.current) leaf.current.rotation.y = -swung * GATE.swing;

    // The lamp on the gate post, which is the part of the unlock visible from across the meadow.
    const b = breath(clock.elapsedTime, 3.2, reduced);
    if (lamp.current) lamp.current.emissiveIntensity = k * (1.6 + b * 0.9);
    if (glow.current) glow.current.visible = k > 0.05;
  });

  return (
    <group position={[0, 0, 0]}>
      {/* The hoarding. Set back behind the panel plane so an item is plainly pinned TO it, and behind the
          bay's own posts so the frame still reads as the thing holding it up. */}
      <group position={[0, 0, -0.24]}>
        {board.xs.map((x, i) => (
          <group
            key={x}
            ref={(el) => {
              if (el) planks.current[i] = el;
            }}
            position={[x, 0, 0]}
          >
            <mesh geometry={g.board} material={i % 3 === 1 ? m.trim : m.timber} castShadow receiveShadow />
          </group>
        ))}
      </group>
      {/*
        The leaf. Hinged at the local -X gate post so it swings out across the approach, and built out of
        the same three rails and one brace the world's own gates are — see `Pens` in `world/Buildings.tsx`.
      */}
      <group ref={leaf} position={[-GATE.half + 0.1, 0, 0]}>
        {[0.5, 1.0].map((h) => (
          <mesh
            key={h}
            geometry={g.rail}
            material={m.trim}
            position={[span / 2, groundY + h, 0]}
            scale={[span - 0.2, 1, 1]}
            castShadow
          />
        ))}
        <mesh
          geometry={g.rail}
          material={m.trim}
          position={[span / 2, groundY + 0.75, 0]}
          rotation={[0, 0, Math.atan2(0.5, span)]}
          scale={[Math.hypot(span - 0.2, 0.5), 1, 1]}
          castShadow
        />
        <mesh
          geometry={g.rail}
          material={m.trim}
          position={[span - 0.14, groundY + 0.75, 0]}
          rotation={[0, 0, Math.PI / 2]}
          scale={[0.66, 1, 1]}
          castShadow
        />
      </group>

      {/*
        And the two planks hammered across it, with their nail heads showing. An X rather than a ladder of
        horizontals: horizontals read as more gate, where a diagonal reads as something done in a hurry to
        stop people getting in — which is what Nan did when she gave up on the back paddock.
      */}
      <group ref={boards} position={[0, groundY + 0.9, 0.14]}>
        {[1, -1].map((dir) => (
          <group key={dir} rotation={[0, 0, dir * 0.42]}>
            <mesh geometry={g.plank} material={m.timberDeep} scale={[span + 0.5, 1, 1]} castShadow />
            {[-1, 1].map((end) => (
              <mesh
                key={end}
                geometry={g.nail}
                material={m.stoneDeep}
                position={[(end * (span + 0.5)) / 2 - end * 0.18, 0, 0.05]}
              />
            ))}
          </group>
        ))}
      </group>

      {/*
        A lantern on the far gate post, dark while the paddock is shut and lit once it is not.
        The one part of the unlock that is visible from anywhere on the ranch: `stations/carpentry.tsx`
        makes the same argument for the lanterns on its bays — an emissive sphere survives fog, distance
        and a low sun, where a swung gate at forty metres is three pixels of timber.
      */}
      <group position={[GATE.half + 0.05, 0, 0]}>
        <mesh geometry={g.lampPost} material={m.timberDeep} position={[0, groundY + POST_H + GATE_POST_EXTRA + 0.5, 0]} />
        <mesh geometry={g.lampGlass} position={[0, groundY + POST_H + GATE_POST_EXTRA + 1.02, 0]}>
          <meshStandardMaterial
            ref={lamp}
            color="#fff0cc"
            emissive={HONEY}
            emissiveIntensity={0}
            roughness={0.4}
            metalness={0}
            toneMapped={false}
          />
        </mesh>
        <mesh ref={glow} visible={false} position={[0, groundY + POST_H + GATE_POST_EXTRA + 1.02, 0]}>
          <sphereGeometry args={[0.42, 12, 9]} />
          <meshBasicMaterial color={HONEY} transparent opacity={0.16} depthWrite={false} toneMapped={false} fog={false} />
        </mesh>
      </group>
    </group>
  );
}
