import { useFrame } from '@react-three/fiber';
import { useMemo, useRef, type JSX } from 'react';
import {
  CylinderGeometry,
  MeshStandardMaterial,
  Shape,
  ShapeGeometry,
  SphereGeometry,
  TorusGeometry,
  type Mesh,
  type PointLight,
} from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';

import { breath } from '../screener/theme';
import {
  churnGeometry,
  churnMaterial,
  fallGeometry,
  fallingStream,
  flowingWater,
  foamRingMaterial,
  splashRing,
  splashRingGeometry,
  useWaterClock,
  waterClock,
} from '../world/water';
import type { StationSite } from './sites';

/**
 * THE CARPENTRY. What makes a station a thing on a ranch instead of a floating panel.
 *
 * The rule the whole directory is built on: a child has to be able to tell, from across the meadow and
 * without being told, that this is somewhere you can go and do something. That is a job for silhouette
 * and for framing, not for a label. So every station is the same piece of joinery — a sill, a bay, a
 * head beam, a little shingled pent roof to keep the rain off, a lantern at each end, and a nest on a
 * post beside it with an egg in it — sat on a base that belongs where it stands. Repeating the joinery
 * is the point: a child who has worked out one station has worked out all three.
 *
 * Everything is chamfered or rounded, per the world's own rule. `RoundedBoxGeometry` rather than
 * `boxGeometry` costs a handful of triangles and is the difference between carpentry and packaging.
 *
 * PIGMENT, NOT COLOUR. Same discipline as `world/Buildings.tsx`: these values are unlit albedo chosen so
 * that a 4.6-intensity gold sun at 20° resolves them to the intended warm timber, rather than values
 * that already look right on a flat page and then clip to white.
 */

const PIG = {
  timber: '#8a6a49',
  timberDeep: '#684d34',
  cream: '#ece5d2',
  shingle: '#6a5340',
  stone: '#b09c81',
  stoneDeep: '#8a7659',
  moss: '#5b8a55',
  mossDeep: '#3d6647',
  water: '#3f7f9a',
  honey: '#e0a63f',
  basket: '#c9ad80',
  rope: '#8f7a4a',
  paint: '#e6cf9e',
  shell: '#f6ead3',
  shellSpeck: '#c98a3c',
} as const;

type MatName =
  | 'timber'
  | 'timberDeep'
  | 'cream'
  | 'shingle'
  | 'stone'
  | 'stoneDeep'
  | 'moss'
  | 'mossDeep'
  | 'water'
  | 'basket'
  | 'rope'
  | 'paint'
  | 'shell';

let MATS: Record<MatName, MeshStandardMaterial> | null = null;

/** Shared instances, module-memoised, so remounting a station rebuilds no materials. */
export function mats(): Record<MatName, MeshStandardMaterial> {
  if (MATS) return MATS;
  const make = (color: string, roughness: number): MeshStandardMaterial =>
    new MeshStandardMaterial({ color, roughness, metalness: 0 });
  MATS = {
    timber: make(PIG.timber, 0.8),
    timberDeep: make(PIG.timberDeep, 0.76),
    cream: make(PIG.cream, 0.82),
    shingle: make(PIG.shingle, 0.74),
    stone: make(PIG.stone, 0.92),
    stoneDeep: make(PIG.stoneDeep, 0.9),
    moss: make(PIG.moss, 0.98),
    mossDeep: make(PIG.mossDeep, 1),
    water: new MeshStandardMaterial({ color: PIG.water, roughness: 0.18, metalness: 0.1 }),
    basket: make(PIG.basket, 0.95),
    rope: make(PIG.rope, 1),
    paint: make(PIG.paint, 0.7),
    shell: make(PIG.shell, 0.62),
  };
  return MATS;
}

export const HONEY = PIG.honey;
export const SHELL_SPECK = PIG.shellSpeck;

/**
 * A 0..1 value that catches up with its target over a few frames, frame-rate independently.
 *
 * `lit` is handed around this directory as a plain 0 or 1 — a station is either on offer or it is not,
 * and that changes rarely enough to be React state. Every consumer eases it here instead of reading it
 * straight, because a lantern that snaps to full brightness the instant a child crosses an invisible line
 * reads as a bug, and one that comes up over a third of a second reads as having noticed them.
 */
export function useEase(target: number, rate = 8): { current: number } {
  const value = useRef(target);
  useFrame((_, dt) => {
    value.current += (target - value.current) * (1 - Math.exp(-rate * dt));
  });
  return value;
}

/**
 * A rounded rectangle in the XY plane, for flat things like a water surface.
 *
 * Lifted in spirit from `world/Buildings.tsx`'s trough, and for the reason that file's version exists: a
 * four-segment cylinder standing in for a rounded pool is a DIAMOND, and once it is scaled unevenly to
 * fit a basin its corners stick out past the kerb as two bright triangles. That is exactly what the first
 * pass of the spring basin looked like from six metres.
 */
function roundedRectXY(w: number, h: number, r: number): Shape {
  const hw = w / 2 - r;
  const hh = h / 2 - r;
  const shape = new Shape();
  shape.moveTo(-hw - r, -hh);
  shape.lineTo(-hw - r, hh);
  shape.quadraticCurveTo(-hw - r, hh + r, -hw, hh + r);
  shape.lineTo(hw, hh + r);
  shape.quadraticCurveTo(hw + r, hh + r, hw + r, hh);
  shape.lineTo(hw + r, -hh);
  shape.quadraticCurveTo(hw + r, -hh - r, hw, -hh - r);
  shape.lineTo(-hw, -hh - r);
  shape.quadraticCurveTo(-hw - r, -hh - r, -hw - r, -hh);
  shape.closePath();
  return shape;
}

/* ============================================================================
   the bay every station shares
   ========================================================================== */

/**
 * The frame the panel hangs in.
 *
 * Sized once per station rather than per item, deliberately. The panel inside it changes size with the
 * item (see `fitScale`), and a bay that breathed with it would make the station itself look unstable —
 * a child would have to re-read the object every time a new question arrived. A fixed bay with a
 * sometimes-smaller panel in it reads as a noticeboard, which is exactly right.
 *
 * IT IS AN OPEN FRAME AND NOT A BOARD, which was the first pass's mistake and a mistake a screenshot
 * settles in a second: a filled panel behind the bay is a blank brown rectangle five metres wide, and
 * everything mounted on it — a 2.3-metre emblem, a set of pods — reads as a sticker on a billboard. All
 * three presentations build their own backdrop anyway (a frame, a carved bank, a log), so the bay's job
 * is to be the joinery around them. Idle, the frame is empty except the emblem sign hanging in it, which
 * is what a noticeboard with nothing pinned to it actually looks like.
 *
 * `lit` runs 0..1 and is driven from the proximity check. It is the whole of the "this one is live"
 * signal in the woodwork: the head beam and the sill take an emissive honey wash, which at a distance
 * reads as the lantern light having come up.
 */
export function Bay({ site, lit }: { site: StationSite; lit: number }): JSX.Element {
  const m = mats();
  const { halfW, halfH } = site.bay;
  const groundY = -site.at[1];
  const standing = site.build !== 'coatwall';
  const wash = useEase(lit);
  const head = useRef<MeshStandardMaterial>(null);
  const sill = useRef<MeshStandardMaterial>(null);

  useFrame(() => {
    if (head.current) head.current.emissiveIntensity = wash.current * 0.5;
    if (sill.current) sill.current.emissiveIntensity = wash.current * 0.45;
  });

  const g = useMemo(
    () => ({
      head: new RoundedBoxGeometry(halfW * 2 + 0.5, 0.32, 0.62, 2, 0.1),
      sill: new RoundedBoxGeometry(halfW * 2 + 0.34, 0.26, 0.56, 2, 0.09),
      roof: new RoundedBoxGeometry(halfW * 2 + 0.9, 0.17, 1.25, 2, 0.07),
      post: new RoundedBoxGeometry(0.28, 1, 0.28, 2, 0.09),
      brace: new RoundedBoxGeometry(Math.hypot(0.72, 0.72), 0.16, 0.16, 1, 0.06),
      bolt: new SphereGeometry(0.075, 10, 8),
      ledger: new RoundedBoxGeometry(0.2, halfH * 2 + 0.5, 0.34, 2, 0.08),
    }),
    [halfW, halfH],
  );

  const postH = halfH + 0.42 - groundY;

  return (
    <group>
      {/* Head beam, and the pent roof that makes this a thing somebody built to last. A flat top edge
          reads as a screen; an overhanging roof reads as furniture, and it also throws a soft band of
          shade down the panel that keeps the honey light on the socket legible in full sun. */}
      <mesh geometry={g.head} position={[0, halfH + 0.2, -0.06]} castShadow>
        <meshStandardMaterial
          ref={head}
          color={PIG.timberDeep}
          emissive={PIG.honey}
          emissiveIntensity={0}
          roughness={0.76}
          metalness={0}
        />
      </mesh>
      <mesh
        geometry={g.roof}
        material={m.shingle}
        position={[0, halfH + 0.52, 0.24]}
        rotation={[0.34, 0, 0]}
        castShadow
      />

      {/* Sill. Also where a child's eye lands when they walk up, so it carries the same wash. */}
      <mesh geometry={g.sill} position={[0, -halfH - 0.16, 0.04]} castShadow>
        <meshStandardMaterial
          ref={sill}
          color={PIG.timberDeep}
          emissive={PIG.honey}
          emissiveIntensity={0}
          roughness={0.76}
          metalness={0}
        />
      </mesh>

      {/* Uprights, where the station stands on its own. The coat wall has a barn behind it instead. */}
      {standing
        ? ([-1, 1] as const).map((side) => (
            <group key={side} position={[side * halfW, 0, 0]}>
              <mesh
                geometry={g.post}
                material={m.timber}
                position={[0, groundY + postH / 2, -0.1]}
                scale={[1, postH, 1]}
                castShadow
                receiveShadow
              />
              {/* One brace per post, under the head beam. Two diagonals at the top corners is the
                  cheapest shape there is that says "this was framed" rather than "this was placed". */}
              <mesh
                geometry={g.brace}
                material={m.timberDeep}
                position={[-side * 0.42, halfH - 0.24, -0.1]}
                rotation={[0, 0, side * (Math.PI / 4)]}
                castShadow
              />
            </group>
          ))
        : ([-1, 1] as const).map((side) => (
            /* Bolted flat to the barn: a ledger board down each side and four visible bolt heads. A
               panel with no fixings on a wall looks projected onto it. */
            <group key={side} position={[side * (halfW + 0.06), 0, -0.3]}>
              <mesh geometry={g.ledger} material={m.timberDeep} castShadow receiveShadow />
              {[-halfH + 0.35, halfH - 0.35].map((y) => (
                <mesh key={y} geometry={g.bolt} material={m.stoneDeep} position={[0, y, 0.2]} />
              ))}
            </group>
          ))}
    </group>
  );
}

/* ============================================================================
   the lanterns
   ========================================================================== */

/**
 * A lantern at each end of the head beam.
 *
 * The one thing on a station that is visible from anywhere on the ranch, and the reason the stations are
 * findable at all: an emissive sphere survives fog, distance and a low sun, where a painted sign does
 * not. They breathe slowly when the station is idle and come up bright when the keeper is in range, so
 * the change a child sees as they walk up is a light coming on rather than a caption appearing.
 *
 * `reduced` pins the breath to its midpoint rather than to nothing — the same rule `screener/theme.ts`
 * states for its sockets. A child who asked for less movement still gets a lit lantern.
 */
export function Lanterns({
  site,
  lit,
  reduced,
}: {
  site: StationSite;
  lit: number;
  reduced: boolean;
}): JSX.Element {
  const m = mats();
  const { halfW, halfH } = site.bay;
  const glass = useRef<Mesh[]>([]);
  const wash = useEase(lit);

  const g = useMemo(
    () => ({
      hook: new CylinderGeometry(0.035, 0.035, 0.3, 8),
      cap: new CylinderGeometry(0.19, 0.13, 0.12, 10),
      globe: new SphereGeometry(0.17, 16, 12),
      base: new CylinderGeometry(0.13, 0.17, 0.1, 10),
    }),
    [],
  );

  const lamp = useRef<PointLight>(null);

  useFrame(({ clock }) => {
    const b = breath(clock.elapsedTime, 3.4, reduced);
    const k = wash.current;
    for (const mesh of glass.current) {
      if (!mesh) continue;
      const mat = mesh.material as MeshStandardMaterial;
      mat.emissiveIntensity = 1.1 + b * 0.5 + k * 3.2;
    }
    if (lamp.current) lamp.current.intensity = 7 + k * 15;
  });

  return (
    <group>
      {([-1, 1] as const).map((side, i) => (
        <group key={side} position={[side * (halfW + 0.16), halfH + 0.02, 0.3]}>
          <mesh geometry={g.hook} material={m.timberDeep} position={[0, 0.4, 0]} />
          <mesh geometry={g.cap} material={m.timberDeep} position={[0, 0.24, 0]} castShadow />
          <mesh
            ref={(el) => {
              if (el) glass.current[i] = el;
            }}
            geometry={g.globe}
          >
            <meshStandardMaterial
              color="#ffe6b4"
              emissive={PIG.honey}
              emissiveIntensity={1.3}
              roughness={0.35}
              metalness={0}
              toneMapped={false}
            />
          </mesh>
          <mesh geometry={g.base} material={m.timberDeep} position={[0, -0.2, 0]} />
        </group>
      ))}
      {/*
        ONE light for the pair, hung in front of the panel rather than up at the lanterns.
        Two reasons and both are load-bearing. A point light per lantern is a second shadow-free light per
        station, and the frame budget on a school laptop is already the binding constraint. And the light's
        real job is not to look like a lantern — it is to keep the panel legible, because two of the three
        stations face away from a 20° sun and land at about a third of full sun on their front face. A
        lantern-lit noticeboard at golden hour is the honest version of that, and it is also why the
        lanterns exist in the fiction at all.
      */}
      <pointLight
        ref={lamp}
        position={[0, 0.1, 1.7]}
        color="#ffdca6"
        intensity={7}
        distance={8}
        decay={2}
      />
    </group>
  );
}

/* ============================================================================
   the emblem, for when nothing is being asked
   ========================================================================== */

/**
 * What hangs in the bay when the station is idle: a plank sign on two short chains.
 *
 * It has one job and it is the job the HUD buttons never did: say what KIND of thing happens here,
 * without a word, to a child standing eight metres away. So it is a miniature of the station's own
 * presentation — three of the thing in a row with the last place empty and breathing honey light. That
 * is the hollow's single established convention (`screener/theme.ts` argues it at length: the only thing
 * in the world that moves on its own is the place where something is missing), and reusing it here means
 * the emblem and the live item teach each other.
 *
 * A HUNG SIGN rather than a carving on the bay, for two reasons that only became obvious once both had
 * been looked at. A sign has a shadow and an edge, so it reads as an object at eight metres where a
 * carving reads as a stain. And a sign is the thing that is plainly TAKEN DOWN when the real question
 * goes up, which is a small piece of continuity a child gets for free.
 */
export function Emblem({ site, reduced }: { site: StationSite; reduced: boolean }): JSX.Element {
  const m = mats();
  const socket = useRef<MeshStandardMaterial>(null);
  const halo = useRef<Mesh>(null);

  const g = useMemo(
    () => ({
      plank: new RoundedBoxGeometry(3.5, 1.55, 0.14, 3, 0.16),
      chain: new CylinderGeometry(0.022, 0.022, 1, 6),
      pod: new TorusGeometry(0.5, 0.08, 8, 26),
      disc: new CylinderGeometry(0.44, 0.44, 0.06, 22),
      berry: new SphereGeometry(0.1, 10, 8),
      slab: new RoundedBoxGeometry(0.78, 1.0, 0.12, 2, 0.06),
      trough: new RoundedBoxGeometry(0.92, 0.6, 0.14, 2, 0.07),
      star: new SphereGeometry(0.13, 8, 6),
      ring: new TorusGeometry(0.62, 0.05, 8, 28),
    }),
    [],
  );

  useFrame(({ clock }) => {
    const b = breath(clock.elapsedTime, 2.6, reduced);
    if (socket.current) socket.current.emissiveIntensity = 0.55 + b * 1.1;
    if (halo.current) {
      const s = 1 + b * 0.09;
      halo.current.scale.set(s, s, 1);
    }
  });

  /** Three places in a row, the last one empty. Pitch is generous so it reads at distance. */
  const slots: readonly number[] = [-1.05, 0, 1.05];
  const hang = site.bay.halfH - 0.12;

  return (
    <group position={[0, 0.05, 0.16]}>
      {/* Two chains up to the head beam, and the plank they carry. */}
      {([-1, 1] as const).map((side) => (
        <mesh
          key={side}
          geometry={g.chain}
          material={m.timberDeep}
          position={[side * 1.35, (hang - 0.72) / 2 + 0.72, -0.06]}
          scale={[1, Math.max(0.05, hang - 0.72), 1]}
        />
      ))}
      <mesh geometry={g.plank} material={m.paint} position={[0, 0, -0.1]} castShadow receiveShadow />
      {slots.map((x, i) => {
        const empty = i === slots.length - 1;
        return (
          <group key={x} position={[x, 0, 0]}>
            {site.build === 'coatwall' ? (
              <>
                <mesh geometry={g.pod} material={empty ? m.cream : m.stone} rotation={[0, 0, 0]} />
                {!empty ? (
                  <mesh geometry={g.disc} material={m.stone} rotation={[Math.PI / 2, 0, 0]} />
                ) : null}
                {!empty ? (
                  <mesh geometry={g.star} material={m.moss} position={[0, 0, 0.13]} scale={2.1} />
                ) : null}
              </>
            ) : site.build === 'tideledge' ? (
              <>
                <mesh geometry={g.trough} material={empty ? m.cream : m.stone} />
                {!empty
                  ? [-0.16, 0, 0.16].map((bx) => (
                      <mesh key={bx} geometry={g.berry} material={m.mossDeep} position={[bx, 0.02, 0.11]} />
                    ))
                  : null}
              </>
            ) : (
              <>
                <mesh geometry={g.slab} material={empty ? m.cream : m.stone} />
                {!empty ? (
                  <mesh geometry={g.berry} material={m.mossDeep} position={[0, 0.02, 0.08]} scale={2.4} />
                ) : null}
              </>
            )}
          </group>
        );
      })}

      {/* The empty place, ringed in breathing honey. Same light, in all three. */}
      <group position={[slots[slots.length - 1] ?? 0, 0, 0.06]}>
        <mesh ref={halo} geometry={g.ring}>
          <meshStandardMaterial
            ref={socket}
            color={PIG.honey}
            emissive={PIG.honey}
            emissiveIntensity={0.8}
            roughness={0.45}
            metalness={0}
            toneMapped={false}
          />
        </mesh>
      </group>
    </group>
  );
}

/* ============================================================================
   the three bases
   ========================================================================== */

/**
 * The coat wall's base: a trodden board to stand on, a crate, and a couple of coats on pegs.
 *
 * The pegs are on the LEFT LEDGER and not on a rail under the panel, which is where the first pass put
 * them and where they were underground. The bay's sill lands at 0.44m — the barn's own plinth height,
 * pleasingly — and there is no metre of wall beneath it to hang anything from. Both flanks are used
 * instead: coats on the left, the egg cradle on the right.
 */
export function CoatWallBase({ site }: { site: StationSite }): JSX.Element {
  const m = mats();
  const { halfW } = site.bay;
  const groundY = -site.at[1];

  const g = useMemo(
    () => ({
      peg: new CylinderGeometry(0.045, 0.055, 0.26, 8),
      cloth: new RoundedBoxGeometry(0.34, 0.66, 0.11, 2, 0.13),
      crate: new RoundedBoxGeometry(0.78, 0.5, 0.56, 2, 0.06),
      pail: new CylinderGeometry(0.19, 0.15, 0.3, 12),
      stoop: new RoundedBoxGeometry(halfW * 1.5, 0.12, 0.8, 2, 0.05),
      footing: new RoundedBoxGeometry(halfW * 2 + 0.5, 0.3, 0.7, 2, 0.08),
    }),
    [halfW],
  );

  return (
    <group>
      {/* A stone footing under the sill, so the frame meets the ground on something. Same move
          `Buildings.tsx` makes under both its buildings and for the same reason: a thing that meets the
          grass on a stone course looks planted, one that does not looks dropped. */}
      <mesh
        geometry={g.footing}
        material={m.stone}
        position={[0, groundY + 0.15, 0.06]}
        castShadow
        receiveShadow
      />
      {/* A trodden board in front of it, so the ground reads as a place people stand. */}
      <mesh geometry={g.stoop} material={m.stoneDeep} position={[0, groundY + 0.06, 0.82]} receiveShadow />

      {/* Coats, on pegs down the left-hand ledger. This is the coaxing-a-coat station; the cloth is what
          says so, and it is the one thing here at a five-year-old's own height. */}
      {[0.35, -0.45].map((y, i) => (
        <group key={y} position={[-halfW - 0.24, y, 0.2]}>
          <mesh geometry={g.peg} material={m.timber} rotation={[Math.PI / 2, 0, 0]} position={[0, 0, 0.11]} />
          <mesh geometry={g.cloth} position={[0, -0.4, 0.16]} rotation={[0, 0, i ? -0.07 : 0.06]} castShadow>
            <meshStandardMaterial color={i ? '#7f9fc4' : '#c9756a'} roughness={0.95} metalness={0} />
          </mesh>
        </group>
      ))}

      {/* A crate and a pail by the wall. Two objects nobody put there on purpose is what makes a corner
          of a yard look worked in rather than dressed. */}
      <mesh
        geometry={g.crate}
        material={m.timber}
        position={[-halfW - 0.55, groundY + 0.25, 0.75]}
        rotation={[0, 0.34, 0]}
        castShadow
        receiveShadow
      />
      <mesh
        geometry={g.pail}
        material={m.stoneDeep}
        position={[-halfW - 0.15, groundY + 0.15, 1.35]}
        castShadow
        receiveShadow
      />
    </group>
  );
}

/**
 * The tide ledge's base: a spring basin, a flume feeding it, and mossy stones round the rim.
 *
 * Built rather than borrowed. `Buildings.tsx` does have a trough, but it stands INSIDE pen 1 — a
 * nine-by-seven-metre enclosure — and a station needs four and a half metres of clear standing room on
 * its own axis, which that pen does not have without putting a child's back against a fence.
 *
 * THE WATERLINE IS THE ONE NUMBER THAT MATTERS and it is set in world height rather than relative to the
 * bay, because it has to agree with two things at once: the ground, and the presentation's own shelf of
 * portions. `TideLine` hangs that shelf 2.35 units below its origin, which at the scale this station
 * mounts it lands at about 1.05m — so the water goes at 0.78m and the chosen portions sit a hand's width
 * above it, which is what stones at a tide-line look like. Deriving it from the bay instead, as the first
 * pass did, put the water a metre underground.
 */
export function TideLedgeBase({ site, reduced }: { site: StationSite; reduced: boolean }): JSX.Element {
  const m = mats();
  const groundY = -site.at[1];
  const surface = useRef<Mesh>(null);

  /**
   * The waterline, in world metres, converted into the station's local frame.
   *
   * 0.60 rather than the 0.78 of the first pass, and the basin pulled back under the panel rather than
   * standing out in front of it. Both come from the same observation: the child stands 4.6m from the panel
   * and anything 0.85m tall two and a half metres in front of them eats the bottom third of the screen. A
   * lower rim, further back, leaves the basin plainly a basin and gives the shelf of portions the frame.
   */
  const waterY = 0.6 - site.at[1];

  /**
   * The basin, as four walls and a bed rather than one block.
   *
   * THIS IS THE WHOLE FILE'S MOST INSTRUCTIVE MISTAKE, so it is written down. The first pass built the
   * kerb as a single `RoundedBoxGeometry` and put the water plane inside it at the waterline. A rounded
   * box is SOLID: its top face is closed, so the water was sealed inside an opaque stone block and the
   * station's defining feature — that it stands at water — was invisible from every angle. From the
   * standing spot it read as a five-metre stone table. A basin has to be a RIM.
   */
  const basin = {
    w: 4.6,
    d: 1.45,
    /** Under the shelf of portions, which `TideLine` hangs 1.08m forward of the panel at this scale. */
    z: 0.95,
    wall: 0.26,
    height: 0.72,
  };
  /** The rim stands 9cm above the surface: enough to read as a kerb, little enough to see over. */
  const rimTop = waterY + 0.09;

  const g = useMemo(
    () => ({
      wallLong: new RoundedBoxGeometry(basin.w, basin.height, basin.wall, 3, 0.1),
      wallShort: new RoundedBoxGeometry(basin.wall, basin.height, basin.d - basin.wall * 2, 3, 0.1),
      bed: new RoundedBoxGeometry(basin.w - basin.wall * 2, 0.22, basin.d - basin.wall * 2, 2, 0.06),
      water: new ShapeGeometry(
        roundedRectXY(basin.w - basin.wall * 2 + 0.06, basin.d - basin.wall * 2 + 0.06, 0.2),
      ),
      flume: new RoundedBoxGeometry(1.15, 0.16, 0.38, 2, 0.06),
      flumePost: new CylinderGeometry(0.09, 0.12, 1, 8),
      nozzle: new CylinderGeometry(0.06, 0.075, 0.22, 10),
      fall: fallGeometry(),
      /** The inner thread, narrower and scrolling faster. See `spring` below. */
      thread: fallGeometry(0.022, 0.014),
      splash: splashRingGeometry(),
      churn: churnGeometry(),
      stone: new SphereGeometry(0.26, 10, 8),
      reed: new CylinderGeometry(0.018, 0.032, 0.8, 5),
    }),
    [basin.w, basin.d, basin.wall, basin.height],
  );

  /** Where the flume's nozzle sits, and therefore how far the water falls. */
  const nozzleY = waterY + 0.92;

  /**
   * THE NOZZLE, AND THE ONE PLACE WATER MAY LEAVE IT.
   *
   * The fall used to hang at a hand-typed `x = 0.63` while the nozzle stood at `0.56` and was TILTED, and
   * a tilted cylinder's outlet is not where its origin is: turning it by `tilt` about Z swings the lower
   * end sideways by `sin(tilt) * length / 2`, which puts the outlet at 0.5925. So the stream was leaving
   * the air 3.7cm to the right of the spout it was supposed to be leaving — the owner's "coming out
   * outside of the spout, needs to move a hair to the left", seen from in front where local +X is screen
   * right.
   *
   * Derived from the nozzle's own numbers rather than re-typed as a corrected constant, for exactly the
   * reason the impact point below is derived: a hand-matched pair drifts apart the moment the spout is
   * nudged, and a stream beside its spout is invisible in the code and obvious on screen.
   */
  const NOZZLE = { x: 0.56, lift: 0.02, tilt: 0.3, length: 0.22, z: -0.02 } as const;
  const spoutX = NOZZLE.x + Math.sin(NOZZLE.tilt) * (NOZZLE.length / 2);

  /**
   * THE SPRING, WHICH NOW RUNS. Everything about how it moves lives in `world/water.ts`; what belongs
   * here is only the arithmetic that connects the water to this particular basin.
   *
   * The one number that has to be got right is the impact point, and it has to be expressed in the pool
   * mesh's own frame rather than the station's. The pool is a `ShapeGeometry` laid flat by a -90° turn
   * about X, so its UVs are metres in its local X/Y, and that turn maps local `+Y` to world `-Z`. The
   * flume group stands at station-local x = `-basin.w/2 - 0.25` and the fall hangs at `+0.63` inside it,
   * while the pool mesh's origin sits at z = `basin.z`. Hence `u` is the station-local x of the fall and
   * `v` is `basin.z` minus its station-local z — a subtraction, not an addition, and getting that sign
   * wrong puts the ripple rings 26cm downstream of the splash they are supposed to be caused by.
   *
   * Derived from the same expressions that place the meshes below rather than typed as constants, so the
   * rings cannot drift away from the fall if the flume is ever nudged.
   */
  const fallAt = { x: -basin.w / 2 - 0.25 + spoutX, z: basin.z + 0.15 + NOZZLE.z };
  const spring = useMemo(() => {
    const inner = { w: basin.w - basin.wall * 2 + 0.06, d: basin.d - basin.wall * 2 + 0.06 };
    return {
      surface: flowingWater({
        impact: [fallAt.x, basin.z - fallAt.z],
        half: [inner.w / 2, inner.d / 2],
        impactRadius: 0.3,
        // Downstream is away from the flume, which stands at the basin's -X end, and a touch across.
        flow: [1, 0.2],
      }),
      fall: fallingStream(),
      churn: churnMaterial(),
      // One material per ring, not one shared between them: they carry different opacities at any
      // instant, and sharing would make the second ring overwrite the first every frame so both pulsed
      // as one. Two `MeshBasicMaterial`s is a rounding error against being able to see the effect.
      foam: [foamRingMaterial(), foamRingMaterial()],
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [basin.w, basin.d, basin.wall, basin.z, fallAt.x, fallAt.z]);

  /** One tick for every piece of water in the world. */
  useWaterClock(reduced);
  const rings = useRef<(Mesh | null)[]>([null, null]);

  useFrame(() => {
    const t = waterClock().value;
    // The swell stays, at eight millimetres, because a fed basin does rise and fall — but it is the one
    // thing here that OSCILLATES, so `prefers-reduced-motion` takes it and leaves the flow running.
    if (surface.current) {
      surface.current.position.y = reduced ? waterY : waterY + Math.sin(t * 0.9) * 0.008;
    }
    // Two foam rings leaving the impact, half a period apart, driven from the same clock as the shader's
    // rings so the physical ring and the shaded one are the same piece of water.
    rings.current.forEach((ring, i) => {
      if (!ring) return;
      const { radius, opacity } = splashRing(t, i, reduced);
      ring.scale.set(radius, radius, 1);
      const mat = spring.foam[i];
      if (mat) mat.opacity = opacity;
    });
  });

  return (
    <group>
      {/* The four rim walls. */}
      {([-1, 1] as const).map((side) => (
        <mesh
          key={`long${side}`}
          geometry={g.wallLong}
          material={m.stone}
          position={[0, rimTop - basin.height / 2, basin.z + (side * (basin.d - basin.wall)) / 2]}
          castShadow
          receiveShadow
        />
      ))}
      {([-1, 1] as const).map((side) => (
        <mesh
          key={`short${side}`}
          geometry={g.wallShort}
          material={m.stone}
          position={[(side * (basin.w - basin.wall)) / 2, rimTop - basin.height / 2, basin.z]}
          castShadow
          receiveShadow
        />
      ))}
      {/* The bed, dark and submerged, so the water has a depth to sit on. */}
      <mesh
        geometry={g.bed}
        material={m.stoneDeep}
        position={[0, waterY - 0.24, basin.z]}
        receiveShadow
      />
      {/* The surface. One draw call, and everything that makes it read as running is in its material. */}
      <mesh
        ref={surface}
        geometry={g.water}
        material={spring.surface.material}
        position={[0, waterY, basin.z]}
        rotation={[-Math.PI / 2, 0, 0]}
      />

      {/* Mossy stones along the wet rim, which is what says this basin has been here a while. */}
      {[-1.85, -0.5, 0.7, 1.95].map((x, i) => (
        <mesh
          key={x}
          geometry={g.stone}
          material={m.moss}
          position={[x, rimTop, basin.z + (i % 2 ? (basin.d - basin.wall) / 2 : -(basin.d - basin.wall) / 2)]}
          scale={[1.3, 0.45, 0.8]}
          castShadow
        />
      ))}

      {/*
        The spring that feeds it: a post, a hollowed flume, a nozzle, and a visible fall of water reaching
        all the way to the surface. The fall is the part that matters. A basin with no visible source is a
        puddle, and a flume with no water coming out of it is a plank.
      */}
      <group position={[-basin.w / 2 - 0.25, 0, basin.z + 0.15]}>
        <mesh
          geometry={g.flumePost}
          material={m.timber}
          position={[-0.42, groundY + (nozzleY + 0.1 - groundY) / 2, 0]}
          scale={[1, nozzleY + 0.1 - groundY, 1]}
          castShadow
          receiveShadow
        />
        <mesh
          geometry={g.flume}
          material={m.timber}
          position={[0.05, nozzleY + 0.14, -0.02]}
          rotation={[0, 0, -0.16]}
          castShadow
        />
        <mesh
          geometry={g.nozzle}
          material={m.timberDeep}
          position={[NOZZLE.x, nozzleY + NOZZLE.lift, NOZZLE.z]}
          rotation={[0, 0, NOZZLE.tilt]}
        />

        {/*
          THE FALL, as two nested tubes rather than one.
          The outer one is the body of the water and the inner thread runs 1.6x faster and is offset a
          centimetre forward, so the two slide past each other. That parallax is the whole reason there
          are two: a single tube, however well shaded, moves as one rigid object, and one rigid object
          moving downward reads as a lift rather than as a liquid. It costs one extra draw call.
        */}
        <mesh
          geometry={g.fall}
          material={spring.fall.material}
          position={[spoutX, (nozzleY + waterY) / 2, NOZZLE.z]}
          scale={[1, Math.max(0.1, nozzleY - waterY), 1]}
        />
        <mesh
          geometry={g.thread}
          material={spring.fall.material}
          position={[spoutX + 0.025, (nozzleY + waterY) / 2 + 0.03, NOZZLE.z + 0.025]}
          scale={[1, Math.max(0.1, nozzleY - waterY) * 0.94, 1]}
        />

        {/*
          Where it lands: a churning patch, and two foam rings leaving it.
          The travelling ripples and the specular arcs that race away from here are drawn by the surface's
          own shader, from the same impact point and the same clock — so these meshes add the bright
          physical churn the shader cannot show and nothing is drawn twice.
        */}
        <mesh
          geometry={g.churn}
          material={spring.churn.material}
          position={[spoutX, waterY + 0.008, NOZZLE.z]}
          rotation={[-Math.PI / 2, 0, 0]}
          scale={[0.27, 0.27, 1]}
        />
        {[0, 1].map((i) => (
          <mesh
            key={i}
            ref={(mesh) => {
              rings.current[i] = mesh;
            }}
            geometry={g.splash}
            material={spring.foam[i]}
            position={[spoutX, waterY + 0.014, NOZZLE.z]}
            rotation={[-Math.PI / 2, 0, 0]}
          />
        ))}
      </group>

      {/* Reeds at the far corners. Nothing structural: they are how the eye reads "water" from a distance
          when the surface itself is edge-on. */}
      {[
        [-basin.w / 2 - 0.1, basin.d / 2 + basin.z + 0.2],
        [-basin.w / 2 + 0.2, basin.d / 2 + basin.z + 0.42],
        [basin.w / 2 - 0.1, basin.d / 2 + basin.z + 0.24],
        [basin.w / 2 + 0.18, basin.d / 2 + basin.z + 0.45],
      ].map((pt, i) => (
        <mesh
          key={i}
          geometry={g.reed}
          material={m.mossDeep}
          position={[pt[0] ?? 0, groundY + 0.4, pt[1] ?? 0]}
          rotation={[0.13 * (i % 2 ? 1 : -1), 0, 0.11 * (i % 2 ? -1 : 1)]}
          castShadow
        />
      ))}
    </group>
  );
}

/**
 * The day log's base: the felled trunk the station is named for, with its sawn stumps beside it.
 *
 * The trunk lies BEHIND the panel and the stumps are ground-height stumps rather than the posts carrying
 * the bay. Both were wrong the other way round on the first pass and the screenshot said so: a trunk laid
 * in front covers the presentation's bottom row of happenings, which is the one thing this station may
 * not do, and a "stump" tall enough to carry a 3.4-metre bay is not a stump, it is a pillar. So the bay
 * stands on its own two posts like the other two stations and the felled tree is the reason it is here.
 */
export function DayLogBase({ site }: { site: StationSite }): JSX.Element {
  const m = mats();
  const { halfW } = site.bay;
  const groundY = -site.at[1];

  const g = useMemo(
    () => ({
      trunk: new CylinderGeometry(0.6, 0.68, halfW * 2 + 0.6, 14),
      rings: new TorusGeometry(0.4, 0.055, 6, 20),
      stump: new CylinderGeometry(0.46, 0.6, 1, 12),
      stumpTop: new CylinderGeometry(0.46, 0.46, 0.08, 12),
      bough: new CylinderGeometry(0.13, 0.19, 1.6, 8),
      moss: new SphereGeometry(0.3, 10, 8),
      mushroom: new CylinderGeometry(0.022, 0.032, 0.13, 6),
      cap: new SphereGeometry(0.08, 10, 8),
      footing: new RoundedBoxGeometry(halfW * 2 + 0.5, 0.28, 0.7, 2, 0.08),
    }),
    [halfW],
  );

  /** Knee height on an adult, which is what a sawn stump is. */
  const stumpH = 0.72;

  return (
    <group>
      {/* A stone footing under the sill. */}
      <mesh
        geometry={g.footing}
        material={m.stone}
        position={[0, groundY + 0.14, 0.04]}
        castShadow
        receiveShadow
      />

      {/* The trunk, lying behind the face. */}
      <mesh
        geometry={g.trunk}
        material={m.timberDeep}
        position={[0, groundY + 0.64, -1.3]}
        rotation={[0, 0, Math.PI / 2]}
        castShadow
        receiveShadow
      />
      {/* Growth rings at both sawn ends. This is what makes it a felled tree rather than a beam. */}
      {([-1, 1] as const).map((side) => (
        <group
          key={side}
          position={[side * (halfW + 0.32), groundY + 0.64, -1.3]}
          rotation={[0, Math.PI / 2, 0]}
        >
          {[0.42, 0.28, 0.15].map((r) => (
            <mesh key={r} geometry={g.rings} material={m.stoneDeep} scale={[r / 0.4, r / 0.4, 1]} />
          ))}
        </group>
      ))}
      {/* Moss along the trunk's shaded top, on the side away from the sun. */}
      {[-1.5, -0.2, 1.4].map((x) => (
        <mesh
          key={x}
          geometry={g.moss}
          material={m.moss}
          position={[x, groundY + 1.06, -1.5]}
          scale={[1.6, 0.4, 0.9]}
        />
      ))}

      {/* The stumps the tree was cut from, low and flat-topped, one either end. */}
      {([-1, 1] as const).map((side) => (
        <group key={side} position={[side * (halfW + 0.85), 0, -0.9 + side * 0.5]}>
          <mesh
            geometry={g.stump}
            material={m.timberDeep}
            position={[0, groundY + stumpH / 2, 0]}
            scale={[1, stumpH, 1]}
            castShadow
            receiveShadow
          />
          <mesh geometry={g.stumpTop} material={m.timber} position={[0, groundY + stumpH, 0]} castShadow />
          <mesh
            geometry={g.moss}
            material={m.moss}
            position={[side * 0.32, groundY + stumpH * 0.6, -0.3]}
            scale={[1.1, 0.7, 0.5]}
          />
        </group>
      ))}

      {/* A broken bough leaning off one end, and toadstools at the foot of the other. Asymmetry for its
          own sake: a straight trunk with a matched stump at each end reads as a trestle. */}
      <mesh
        geometry={g.bough}
        material={m.timberDeep}
        position={[-halfW - 1.2, groundY + 0.72, -1.5]}
        rotation={[0.42, 0.2, 0.95]}
        castShadow
      />
      {[
        [halfW + 0.4, 0.1],
        [halfW + 0.66, 0.3],
        [halfW + 0.25, 0.45],
      ].map((pt, i) => (
        <group key={i} position={[pt[0] ?? 0, groundY, pt[1] ?? 0]} scale={0.9 + i * 0.22}>
          <mesh geometry={g.mushroom} material={m.cream} position={[0, 0.065, 0]} />
          <mesh geometry={g.cap} material={m.stone} position={[0, 0.14, 0]} scale={[1.2, 0.7, 1.2]} castShadow />
        </group>
      ))}
    </group>
  );
}
