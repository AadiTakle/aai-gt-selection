import { useFrame } from '@react-three/fiber';
import { useMemo, useRef, type JSX } from 'react';
import { MeshStandardMaterial, SphereGeometry, type Group } from 'three';

import type { Family, Stage } from '../contract';
import { featureGeometry, type FeatureBake } from '../slimes/crests';
import {
  bodyMaterial,
  catchlightMaterial,
  faceGeometry,
  glazeMaterial,
  gumdropGeometry,
  irisMaterial,
  scleraMaterial,
  trimMaterial,
  type GumdropBake,
} from '../slimes/gumdrop';
import { STAGE_LOOK } from '../slimes/look';

/**
 * A SLIME, AS A PICTURE. What sits in a cubby on the stall's shelf.
 *
 * ══ WHY THIS IS NOT `<Slime>` ═════════════════════════════════════════════════════════════════════
 *
 * `slimes/Slime.tsx` is the right component for a creature living on the ranch and the wrong one for a
 * thing on a shelf, for two reasons that are both bugs rather than preferences:
 *
 *   - IT JOINS THE HERD. `Slime` calls `joinHerd` on mount, which publishes a live collider. Nineteen
 *     portraits inside a shop would put nineteen invisible obstacles in the middle of the stall for the
 *     player and for every wandering slime on the ranch to walk around.
 *   - IT IS CATCHABLE. The vacuum's `nearestSlime` reads that same registry, so a child standing at the
 *     counter could hoover the stock off the shelves. Which is funny exactly once.
 *
 * ══ WHAT IT SHARES, WHICH IS EVERYTHING THAT MATTERS ══════════════════════════════════════════════
 *
 * The body is the family's own baked lathe, the signature feature is the family's own merged crest buffer,
 * and the materials are the family's own shared instances — all read straight out of `slimes/`. So a
 * waffle in the shop is the same waffle that will be in the pen, and a family added next door appears on
 * the shelf with its real silhouette without a line changing here. No material is cloned and none is
 * mutated: several of them are shared by every slime on the ranch, and dimming one to mark a cubby as not
 * yet affordable would dim the whole herd. That is why "not yet" is a cloth over the cubby (see `Shop.tsx`)
 * and never a change to the creature.
 *
 * `crested` is the stage on the shelf, because `look.ts` calls it "the reference silhouette: the family
 * profile at full strength, feature up". A pip is almost all eye and all six pips look alike, so a shop
 * stocked with babies would be a shop where a child cannot tell what they are buying. What ARRIVES on the
 * ranch is still whatever `Game.tsx` grants — the picture is of the family, not a promise about the age.
 */

const STAGE: Stage = 'crested';

/**
 * A fallback body, for a family that exists in `contract.ts` before it exists in `slimes/`.
 *
 * The families are being expanded from six to about nineteen in a neighbouring directory, and for as long
 * as that is in flight `contract.ts` can name a family whose profile and look tables have not landed yet.
 * `gumdropGeometry` would throw on it. An empty cubby with a price under it is a far better failure than a
 * white screen, so anything unbaked shows as a plain honey gumdrop and the shop keeps working.
 */
let stubGeometry: SphereGeometry | null = null;
let stubMaterial: MeshStandardMaterial | null = null;

function stub(): { geometry: SphereGeometry; material: MeshStandardMaterial } {
  stubGeometry ??= new SphereGeometry(0.62, 18, 13);
  stubMaterial ??= new MeshStandardMaterial({ color: '#e8c98d', roughness: 0.4, metalness: 0 });
  return { geometry: stubGeometry, material: stubMaterial };
}

interface Portrait {
  bake: GumdropBake | null;
  feature: FeatureBake | null;
  /** Eye layout, in body units. Lifted from `Slime.tsx`'s own reasoning; see the note there. */
  eye: { r: number; gap: number; depth: number; y: number; open: number } | null;
}

function portrait(family: Family): Portrait {
  try {
    // `far` rather than `near`: a shelf slime is at most 0.5m tall and four metres away, where 24 radial
    // segments is already sub-pixel, and this way a shop full of families adds no buffers the ranch has
    // not already paid for at distance.
    const bake = gumdropGeometry(family, 'far');
    const feature = featureGeometry(family, STAGE);
    const st = STAGE_LOOK[STAGE];

    // The face, placed off the real surface radius exactly as `Slime.tsx` does it, because a fixed offset
    // floats the eyes in front of a squat rock and buries them in a slender fairy.
    const t = Math.min(0.72, 0.4 + st.eyeRise * 0.5);
    const ring = bake.radiusAt(t);
    const r = Math.min(bake.halfWidth * st.eye * 0.62, ring * 0.48);
    const spread = Math.max(r * 1.04, ring * 1.02 - r);
    const gapWanted = Math.min(spread, Math.max(r * 1.04, ring * st.eyeGap * 0.66));
    const phi = Math.min(0.55, Math.asin(Math.min(0.94, gapWanted / Math.max(ring, 1e-4))));
    const dist = Math.max(r * 0.2, ring - r * 0.78);
    return {
      bake,
      feature,
      eye: {
        r,
        gap: Math.sin(phi) * dist,
        depth: Math.cos(phi) * dist,
        y: t * bake.height,
        open: 1 - st.lid * 0.3,
      },
    };
  } catch {
    return { bake: null, feature: null, eye: null };
  }
}

export interface EffigyProps {
  family: Family;
  /** How tall the picture should be, in world metres. The body is scaled to fit it. */
  height: number;
  reduced: boolean;
  /** Phase offset so a shelf of slimes does not breathe in unison. */
  seed: number;
  /** 0 resting, 1 leaning forward and up — the cubby the crosshair is on. */
  lift?: number;
  /**
   * Whether to build the face, and it is the whole of this component's level of detail.
   *
   * THE STOCK HAS TO BE VISIBLE FROM THE ARRIVAL. That was the most useful thing a screenshot from the spawn
   * point produced: the stall at 21.6m with empty shelves reads as a shop that is SHUT, which is the exact
   * opposite of what it is for, and the first attempt at a frame budget gated the whole of the stock on being
   * within sixteen metres — so the shop looked closed from the one place every child stands on their first
   * frame.
   *
   * The eyes are the honest thing to drop instead. Two spheres, two irises and two catchlights per slime is
   * six of the nine meshes a portrait costs, and at twenty metres a half-metre slime's eye is under a pixel.
   * Dropping them past eleven metres takes a full shelf from about 170 draw calls to about 57 and removes
   * nothing anybody could have seen. What survives at distance is silhouette and colour, which `look.ts`
   * argues at length is the entire identification anyway.
   */
  eyes?: boolean;
}

export function Effigy({
  family,
  height,
  reduced,
  seed,
  lift = 0,
  eyes = true,
}: EffigyProps): JSX.Element {
  const p = useMemo(() => portrait(family), [family]);
  const face = useMemo(() => faceGeometry(), []);
  const shell = useRef<Group>(null);
  const root = useRef<Group>(null);

  /** Body units to world metres, for this cubby. */
  const fit = height / (p.bake ? p.bake.height : 1.24);
  const phase = (seed % 977) * 0.0643;

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    const body = shell.current;
    if (body) {
      // Volume-preserving squash, the same one line `Slime.tsx` argues for: taller means narrower by the
      // square root, so the slime keeps its mass and reads as jelly rather than as a pulsing balloon.
      const sq = reduced ? 1 : 1 + Math.sin(t * 1.5 + phase) * 0.035;
      const side = fit / Math.sqrt(sq);
      body.scale.set(side, fit * sq, side);
    }
    const g = root.current;
    if (g) {
      // A slow turn, held well short of a half turn either way so the face never leaves the child. A shop
      // display that revolves is how the silhouette — which is the whole identification — gets seen.
      g.rotation.y = reduced ? 0 : Math.sin(t * 0.34 + phase) * 0.42;
      g.position.y = (reduced ? 0 : Math.sin(t * 1.5 + phase) * 0.008) + lift * 0.045;
      g.position.z = lift * 0.06;
    }
  });

  const eye = eyes ? p.eye : null;

  return (
    <group ref={root}>
      <group ref={shell}>
        {p.bake ? (
          <mesh geometry={p.bake.geometry} material={bodyMaterial(family)} castShadow receiveShadow />
        ) : (
          <mesh geometry={stub().geometry} material={stub().material} castShadow receiveShadow />
        )}

        {/* The opaque half of the signature feature — petals, blades, butter, boulders, rime — already
            merged into one buffer by `crests.ts`, so a rose's sixteen petals are one draw call. */}
        {p.feature?.trim ? (
          <mesh geometry={p.feature.trim} material={trimMaterial(family)} castShadow receiveShadow />
        ) : null}
        {/* The translucent half: syrup, wings, ice spires. No `castShadow`, for the reason `Slime.tsx`
            gives — a depth-only pass draws a see-through wing as an opaque black one. */}
        {p.feature?.glaze ? <mesh geometry={p.feature.glaze} material={glazeMaterial(family)} /> : null}

        {/* The doe eyes. Not negotiable per `look.ts`, and they are most of why a child wants one. */}
        {eye ? (
          <group position={[0, eye.y, 0]} scale={[1, eye.open, 1]}>
            {([-1, 1] as const).map((side) => (
              <group key={side} position={[side * eye.gap, 0, eye.depth]}>
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
                  position={[eye.r * 0.24 * side * -1, eye.r * 0.34, eye.r * 0.9]}
                  scale={eye.r * 0.26}
                />
              </group>
            ))}
          </group>
        ) : null}
      </group>
    </group>
  );
}
