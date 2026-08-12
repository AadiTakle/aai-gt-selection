import { useFrame } from '@react-three/fiber';
import { useEffect, useMemo, useRef, type JSX } from 'react';
import {
  CylinderGeometry,
  DoubleSide,
  MeshStandardMaterial,
  SphereGeometry,
  TorusGeometry,
  type Group,
  type Mesh,
} from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';

import type { Family } from '../contract';
import {
  bodyMaterial,
  catchlightMaterial,
  faceGeometry,
  gumdropGeometry,
  irisMaterial,
  scleraMaterial,
  worldScale,
} from '../slimes/gumdrop';
import { HONEY, SHELL_SPECK, mats } from './carpentry';
import { penFor, type StationSite } from './sites';

/**
 * THE REASON TO DO IT AT ALL: an egg on a post, and the slime that comes out of it.
 *
 * The owner's third criticism was the one with no partial credit in it — "no immediate benefit ... maybe
 * it must be a physical thing ... that you can come back to or answer and it gives you a slime or
 * something?" — and this file is the answer, so it is worth being exact about the two rules it obeys.
 *
 * RULE ONE: THE SLIME IS EARNED BY TAKING PART, NEVER BY BEING RIGHT — AND THAT IS NOW THE ONLY REWARD OF
 * WHICH THAT IS TRUE. The pips on the post light one at a time as the child hands something over, and the
 * egg rocks each time. That is the whole of the accounting here: how many times this child chose something.
 * The egg hatches at the end of a round regardless of what was chosen, and a child who picks the same
 * option five times running gets exactly the same slime as one who picks five different ones.
 *
 * It used to be the only implementable policy as well, because `shared/useSortie.ts` deleted correctness
 * before returning and there was no signal here to be tempted by. That is no longer so: the owner has asked
 * for right and wrong to be told, and coins now pay double for a correct answer. The reasoning and the cost
 * are recorded in that hook's header.
 *
 * The egg deliberately did not follow. A slime is the thing a child walks away with and shows someone, and
 * making *that* contingent on accuracy is what would turn a station into a scoreboard. Coins are a currency
 * that already varies with how much you did; a creature is a keepsake. So the pips stay a count of taking
 * part, and a child who got every question wrong still leaves with a slime.
 *
 * RULE TWO: NOTHING CAN BE LOST. Leaving a station mid-question drops the pips and takes nothing away;
 * the egg is still there when the child comes back. There is no state in which a station is spent,
 * failed, or closed.
 *
 * WHICH family arrives depends on the STATION, from `FAMILY_BATTERY` in `contract.ts` — two families per
 * battery, alternating per visit — so a child's collection ends up visibly reflecting where they have
 * been. That is flavour. Nothing about a slime feeds anything.
 */

/**
 * The nest's height above the grass.
 *
 * 1.5m, which is higher than "chest height on a five-year-old" and is that way for one reason found by
 * looking: `world/Buildings.tsx` scatters low scrub across the meadow, its bushes stand up to 1.6m of
 * radius-scaled sphere, and its keep-out predicate lets them grow anywhere outside a building, a pen, a
 * path or the old pod-wall apron. At 1.05m the egg spent its whole hatch behind a bush at one of the three
 * stations. A nest a child looks slightly up at is also, as it happens, the better read: eggs go up high.
 */
const NEST_Y = 1.5;
/**
 * How far to one side of the bay the nest post stands, and how far forward of the panel.
 *
 * FORWARD MATTERS. Level with the panel and half a metre further out, the post sits directly behind the
 * bay's own upright from the standing spot and the egg is invisible at the exact moment it hatches — which
 * is what the first pass did, and a screenshot of the reward with the reward behind a post is a good way
 * to find it out. 1.25m forward puts the sightline from the standing spot clear of the upright by nearly
 * two metres.
 */
const NEST_OUT = 0.5;
const NEST_FWD = 1.25;
/**
 * How many pips the post carries, and therefore how long a round is.
 *
 * These were two facts that disagreed: the post carried five pips while a round was "about four items", so the
 * last pip never lit and the lights counted up towards a number that meant nothing. A round is now exactly
 * `PIPS` questions — the lights fill, the last one lands, the round closes and the egg hatches. `Game.tsx`
 * passes this to `useSortie` as the round length so the two cannot drift apart again.
 *
 * Five rather than four because the session's floor is twelve: at five a child reaches a decision in three
 * visits, and at four it takes three visits plus one question, which is a fourth visit that ends immediately.
 */
export const PIPS = 5;

export type CradlePhase = 'resting' | 'hatching';

/**
 * When the world is told to add the slime, and when the theatre is over.
 *
 * The grant lands while the hatchling is still bounding away, so the permanent slime `Game.tsx` puts in
 * the pen appears while the child's eye is following something moving. Handing over at the end instead
 * makes one creature visibly become another.
 */
export function hatchTiming(reduced: boolean): { grantAt: number; endAt: number } {
  return reduced ? { grantAt: 1000, endAt: 1700 } : { grantAt: 3150, endAt: 4000 };
}

/* ============================================================================
   the hatchling
   ========================================================================== */

/**
 * One newly hatched slime, built from the slime track's own shared bakes.
 *
 * NOT the `<Slime>` component, and the reason is worth writing down: that component registers itself in
 * the live herd so the player can collide with it, and it drives its own position from its own wander
 * brain. Both are exactly right for a resident of a pen and exactly wrong for two seconds of theatre —
 * it would leave a phantom collider standing next to the cradle and it could not be moved along a path.
 * So the geometry, the materials and the eyes come from `slimes/gumdrop.ts` (shared, cached, one bake per
 * family for the whole page) and the motion is local to this file.
 */
function Hatchling({ family }: { family: Family }): JSX.Element {
  const bake = useMemo(() => gumdropGeometry(family), [family]);
  const face = useMemo(() => faceGeometry(), []);
  const scale = worldScale('pip');

  /**
   * Where the eyes go, by the same construction `Slime.tsx` argues for: set radially INTO the hide so
   * only the front cap is out, low on the body rather than up the dome, and capped within about thirty
   * degrees of dead ahead so the bulge that does show points forward at the child.
   */
  const eye = useMemo(() => {
    const t = 0.44;
    const ring = bake.radiusAt(t);
    const r = Math.min(bake.halfWidth * 0.6, ring * 0.48);
    const gap = Math.min(Math.max(r * 1.04, ring * 0.5), Math.max(r * 1.04, ring * 1.02 - r));
    const phi = Math.min(0.55, Math.asin(Math.min(0.94, gap / Math.max(ring, 1e-4))));
    const dist = Math.max(r * 0.2, ring - r * 0.78);
    return { r, across: Math.sin(phi) * dist, depth: Math.cos(phi) * dist, y: t * bake.height };
  }, [bake]);

  return (
    <group scale={scale}>
      <mesh geometry={bake.geometry} material={bodyMaterial(family)} castShadow receiveShadow />
      <group position={[0, eye.y, 0]}>
        {([-1, 1] as const).map((side2) => (
          <group key={side2} position={[side2 * eye.across, 0, eye.depth]}>
            <mesh geometry={face.sclera} material={scleraMaterial()} scale={eye.r} />
            <mesh
              geometry={face.iris}
              material={irisMaterial(family)}
              position={[0, 0, eye.r * 0.56]}
              scale={eye.r * 0.66}
            />
            <mesh
              geometry={face.catchlight}
              material={catchlightMaterial()}
              position={[eye.r * 0.24 * side2 * -1, eye.r * 0.34, eye.r * 0.9]}
              scale={eye.r * 0.26}
            />
          </group>
        ))}
      </group>
    </group>
  );
}

/* ============================================================================
   the cradle
   ========================================================================== */

export function Cradle({
  site,
  pips,
  phase,
  family,
  startedAt,
  reduced,
}: {
  site: StationSite;
  /** How many things the child has handed over this round. Participation, never accuracy. */
  pips: number;
  phase: CradlePhase;
  /** Which family is hatching. Null while resting. */
  family: Family | null;
  /** `performance.now()` at the moment the round finished. */
  startedAt: number;
  reduced: boolean;
}): JSX.Element {
  const m = mats();
  const groundY = -site.at[1];
  const nestY = NEST_Y - site.at[1];

  const egg = useRef<Group>(null);
  const shellL = useRef<Group>(null);
  const shellR = useRef<Group>(null);
  const baby = useRef<Group>(null);
  const babyInner = useRef<Group>(null);
  const eggMat = useRef<MeshStandardMaterial>(null);
  const glowRing = useRef<Mesh>(null);
  const pipMats = useRef<MeshStandardMaterial[]>([]);
  /** Set when a pip lights, so the egg gives one rock per thing handed over. */
  const nudged = useRef(-1e9);
  const openRef = useRef(0);

  const g = useMemo(
    () => ({
      post: new CylinderGeometry(0.075, 0.11, 1, 10),
      nest: new CylinderGeometry(0.34, 0.24, 0.24, 16, 1, true),
      nestFloor: new CylinderGeometry(0.24, 0.24, 0.05, 16),
      weave: new TorusGeometry(0.31, 0.028, 6, 22),
      egg: new SphereGeometry(0.19, 20, 16),
      // A cracked half. `phiLength` a hair over π so the two halves overlap and no seam shows while shut.
      half: new SphereGeometry(0.19, 20, 12, 0, Math.PI * 1.06),
      speck: new SphereGeometry(0.022, 8, 6),
      board: new RoundedBoxGeometry(0.92, 0.2, 0.09, 2, 0.04),
      pip: new CylinderGeometry(0.045, 0.045, 0.04, 12),
      ring: new TorusGeometry(0.3, 0.022, 8, 26),
    }),
    [],
  );

  useEffect(() => {
    if (pips > 0) nudged.current = performance.now();
  }, [pips]);

  const hop = useMemo(() => {
    // Which way the hatchling leaves: toward the nearest fenced pen, in the station's own local frame.
    const pen = penFor(site);
    const world = Math.atan2(pen[0] - site.at[0], pen[1] - site.at[2]);
    const local = world - site.yaw;
    return { angle: local, dx: Math.sin(local), dz: Math.cos(local) };
  }, [site]);

  useFrame(() => {
    const now = performance.now();
    const t = phase === 'hatching' ? (now - startedAt) / 1000 : -1;

    /* --- the pips ---------------------------------------------------------- */
    pipMats.current.forEach((mat, i) => {
      if (!mat) return;
      const on = i < pips;
      // Eased rather than switched, so lighting one is a small event rather than a state change.
      const want = on ? 3.4 : 0;
      mat.emissiveIntensity += (want - mat.emissiveIntensity) * 0.12;
    });

    /* --- the ring under the nest ------------------------------------------ */
    if (glowRing.current) {
      const mat = glowRing.current.material as MeshStandardMaterial;
      const filling = pips > 0 ? 0.5 + pips * 0.35 : 0.25;
      mat.emissiveIntensity += (filling - mat.emissiveIntensity) * 0.08;
    }

    /* --- resting: one rock per thing handed over -------------------------- */
    if (phase !== 'hatching') {
      const since = (now - nudged.current) / 1000;
      const rock = since < 0.9 && !reduced ? Math.sin(since * 22) * 0.28 * Math.exp(-since * 3.4) : 0;
      if (egg.current) {
        egg.current.visible = true;
        egg.current.rotation.z = rock;
        egg.current.position.y = Math.abs(rock) * 0.03;
        egg.current.scale.setScalar(1);
      }
      if (shellL.current) shellL.current.visible = false;
      if (shellR.current) shellR.current.visible = false;
      if (baby.current) baby.current.visible = false;
      if (eggMat.current) eggMat.current.emissiveIntensity = pips > 0 ? 0.1 + pips * 0.12 : 0;
      openRef.current = 0;
      return;
    }

    /* --- hatching --------------------------------------------------------- */
    const wobbleEnd = reduced ? 0 : 0.75;
    const openEnd = wobbleEnd + (reduced ? 0.25 : 0.5);
    const greetEnd = openEnd + (reduced ? 0.35 : 0.45);
    const hopEnd = greetEnd + (reduced ? 0 : 1.6);
    const fadeEnd = hopEnd + (reduced ? 0.6 : 0.7);

    const whole = egg.current;
    const left = shellL.current;
    const right = shellR.current;
    const kid = baby.current;

    if (t < wobbleEnd) {
      // Building rocking. The one moment in the sequence with suspense in it.
      const k = t / Math.max(wobbleEnd, 1e-3);
      const rock = Math.sin(t * 26) * 0.1 * (0.3 + k * 1.6);
      if (whole) {
        whole.visible = true;
        whole.rotation.z = rock;
        whole.position.y = Math.abs(rock) * 0.05;
        whole.scale.setScalar(1 + Math.abs(rock) * 0.12);
      }
      if (left) left.visible = false;
      if (right) right.visible = false;
      if (kid) kid.visible = false;
      if (eggMat.current) eggMat.current.emissiveIntensity = 0.4 + k * 1.2;
      return;
    }

    if (whole) whole.visible = false;
    if (eggMat.current) eggMat.current.emissiveIntensity = 0;

    // The shell, parting. Each half tips outward and down, and stays in the nest afterwards — a hatched
    // egg leaves its shell behind, and the shell is the evidence that this happened.
    const part = Math.min(1, (t - wobbleEnd) / Math.max(openEnd - wobbleEnd, 1e-3));
    const ease = 1 - Math.pow(1 - part, 3);
    for (const [ref, sign] of [
      [left, -1],
      [right, 1],
    ] as const) {
      if (!ref) continue;
      ref.visible = true;
      ref.rotation.z = sign * ease * 1.15;
      ref.position.x = sign * ease * 0.11;
      ref.position.y = -ease * 0.05;
    }

    if (!kid) return;
    kid.visible = t >= wobbleEnd;

    // Inflating, with a small overshoot so the arrival has a bounce in it.
    const grow = Math.min(1, (t - wobbleEnd) / Math.max(openEnd - wobbleEnd, 1e-3));
    openRef.current = reduced ? grow : grow * (1 + Math.sin(grow * Math.PI) * 0.22);

    if (t < greetEnd) {
      // In the nest, facing the child, with two small bounces of hello.
      const s = Math.max(0, t - openEnd);
      kid.position.set(0, nestY + 0.02 + (reduced ? 0 : Math.abs(Math.sin(s * 7.5)) * 0.06), 0);
      if (babyInner.current) babyInner.current.rotation.y = 0;
      return;
    }

    if (t < hopEnd) {
      // Three hops toward the pen. Leaves the nest on the first one, so the arc reads as getting down.
      const s = (t - greetEnd) / Math.max(hopEnd - greetEnd, 1e-3);
      const hops = 3;
      const which = Math.min(hops - 1, Math.floor(s * hops));
      const inHop = s * hops - which;
      const dist = (which + inHop) * 0.72;
      const arc = Math.sin(inHop * Math.PI) * 0.2;
      const fromNest = Math.max(0, 1 - (which + inHop) * 1.4);
      const y = groundY + arc + fromNest * (nestY - groundY + 0.12);
      kid.position.set(hop.dx * dist, y, hop.dz * dist);
      if (babyInner.current) {
        babyInner.current.rotation.y = hop.angle;
        // Squash on landing, stretch at the top: the whole of what makes a hop feel like weight.
        const sq = reduced ? 1 : 1 + Math.sin(inHop * Math.PI) * 0.14 - (inHop < 0.1 ? 0.12 : 0);
        babyInner.current.scale.set(1 / Math.sqrt(sq), sq, 1 / Math.sqrt(sq));
      }
      return;
    }

    // Away over the grass. The permanent slime is already in the pen by now.
    const s = Math.min(1, (t - hopEnd) / Math.max(fadeEnd - hopEnd, 1e-3));
    const dist = 3 * 0.72 + s * 0.5;
    kid.position.set(hop.dx * dist, groundY, hop.dz * dist);
    kid.scale.setScalar(Math.max(0.001, 1 - s));
    if (s >= 1) kid.visible = false;
  });

  return (
    <group position={[site.bay.halfW + NEST_OUT, 0, NEST_FWD]}>
      {/* The post. */}
      <mesh
        geometry={g.post}
        material={m.timber}
        position={[0, groundY + (nestY - groundY) / 2, 0]}
        scale={[1, nestY - groundY, 1]}
        castShadow
        receiveShadow
      />

      {/* The nest, woven. */}
      <group position={[0, nestY, 0]}>
        <mesh geometry={g.nestFloor} material={m.basket} position={[0, -0.09, 0]} receiveShadow />
        <mesh geometry={g.nest} material={m.basket} castShadow receiveShadow />
        {[-0.06, 0.03, 0.1].map((y) => (
          <mesh key={y} geometry={g.weave} material={m.rope} position={[0, y, 0]} rotation={[Math.PI / 2, 0, 0]} scale={[1 - y * 0.4, 1 - y * 0.4, 1]} />
        ))}
        {/* A ring of honey under the rim that fills as the pips do. From a distance this is the only part
            of the cradle that is legible, and it is the part that says "something is happening here". */}
        <mesh ref={glowRing} geometry={g.ring} position={[0, -0.1, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <meshStandardMaterial
            color={HONEY}
            emissive={HONEY}
            emissiveIntensity={0.25}
            roughness={0.5}
            metalness={0}
            toneMapped={false}
          />
        </mesh>

        {/* The egg, whole. */}
        <group ref={egg} position={[0, 0.12, 0]}>
          <mesh geometry={g.egg} scale={[1, 1.28, 1]} castShadow>
            <meshStandardMaterial
              ref={eggMat}
              color="#f6ead3"
              emissive={HONEY}
              emissiveIntensity={0}
              roughness={0.55}
              metalness={0}
            />
          </mesh>
          {/* On the SHELL, not inside it. The first pass placed these at 0.13 from the centre of a
              0.19-radius egg, which is comfortably interior, and the egg shipped unspeckled. */}
          {[
            [0.12, 0.09, 0.145],
            [-0.15, -0.07, 0.115],
            [0.03, 0.23, -0.05],
            [-0.07, -0.19, -0.145],
          ].map((p, i) => (
            <mesh
              key={i}
              geometry={g.speck}
              position={[p[0] ?? 0, p[1] ?? 0, p[2] ?? 0]}
              scale={0.8 + (i % 3) * 0.3}
            >
              <meshStandardMaterial color={SHELL_SPECK} roughness={0.7} />
            </mesh>
          ))}
        </group>

        {/* The two halves it becomes. Left and right, mirrored. */}
        {([-1, 1] as const).map((side) => (
          <group
            key={side}
            ref={side < 0 ? shellL : shellR}
            position={[0, 0.12, 0]}
            visible={false}
          >
            <mesh
              geometry={g.half}
              rotation={[0, side < 0 ? Math.PI * 0.47 : -Math.PI * 0.53, 0]}
              scale={[1, 1.28, 1]}
              castShadow
            >
              <meshStandardMaterial color="#f6ead3" roughness={0.55} metalness={0} side={DoubleSide} />
            </mesh>
          </group>
        ))}
      </group>

      {/* The hatchling. Parked outside the nest group so it can walk away from it. */}
      <group ref={baby} name={`hatchling-${site.verbId}`} visible={false}>
        <group ref={babyInner}>{family ? <HatchlingBody family={family} openRef={openRef} /> : null}</group>
      </group>

      {/*
        THE PIPS, on the bay's right-hand upright at about a child's eye height, turned in toward them.

        Which is a placement decision with a real reason behind it, arrived at by putting them in two wrong
        places first. They are the immediate, visible answer to "what did that do?" — one lights for each
        thing the child hands over — so they have to be ON SCREEN AT THE MOMENT of handing it over.

        On the nest post they sat 42° off the view axis, which is outside the frame on a 4:3 window. On the
        bay's sill they were dead centre and perfect at two stations and completely submerged at the third,
        because the tide ledge's sill is a third of a metre off the ground and its spring basin stands in
        front of it. The upright is the one surface that is in frame, at eye height, and not competing with
        anything at all three.

        Reached back through the cradle's own group offset, so the pips and the egg stay one object in the
        code even though they are half a metre apart in the world.
      */}
      <group
        position={[-NEST_OUT - 0.03, -0.25, 0.34 - NEST_FWD]}
        rotation={[0, -0.3, 0]}
      >
        <mesh geometry={g.board} material={m.timberDeep} castShadow />
        {Array.from({ length: PIPS }, (_, i) => (
          <mesh
            key={i}
            geometry={g.pip}
            position={[(i - (PIPS - 1) / 2) * 0.155, 0, 0.06]}
            rotation={[Math.PI / 2, 0, 0]}
          >
            {/* Dark when unlit, and that is the whole legibility of the row. Pale carved dots on a pale
                board differ from lit ones only in emissive intensity, and under a 4.6-intensity sun that
                difference is invisible — the first pass shipped five white dots that looked identical
                whether the child had answered nothing or four things. A deep socket that fills with honey
                reads at a glance. */}
            <meshStandardMaterial
              ref={(el) => {
                if (el) pipMats.current[i] = el;
              }}
              color="#5f4a30"
              emissive={HONEY}
              emissiveIntensity={0}
              roughness={0.55}
              metalness={0}
              toneMapped={false}
            />
          </mesh>
        ))}
      </group>
    </group>
  );
}

/**
 * The hatchling's body, re-rendered only when the family changes.
 *
 * `openRef` rather than a prop, because the inflation runs at frame rate and a prop would re-render React
 * sixty times a second to animate one scale. Volume-preserving on the overshoot — taller means narrower
 * by the square root — which is the one line that separates jelly from a balloon.
 */
function HatchlingBody({
  family,
  openRef,
}: {
  family: Family;
  openRef: { current: number };
}): JSX.Element {
  const shell = useRef<Group>(null);
  useFrame(() => {
    const g = shell.current;
    if (!g) return;
    const k = openRef.current;
    const size = Math.max(0.001, Math.min(1, k));
    const stretch = 1 + Math.max(0, k - 1);
    const side = size / Math.sqrt(stretch);
    g.scale.set(side, size * stretch, side);
  });
  return (
    <group ref={shell}>
      <Hatchling family={family} />
    </group>
  );
}
