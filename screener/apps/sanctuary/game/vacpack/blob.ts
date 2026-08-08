/**
 * SHARED GEOMETRY AND MATERIALS FOR EVERYTHING THIS DIRECTORY DRAWS.
 *
 * Two jobs, one file, because they share a cache and a caching policy:
 *
 *   1. THE PROXY SLIME. The blob that flies up the nozzle and out of it again. It is not a `<Slime>`.
 *      It cannot be: the instant a slime is caught it is removed from the world, and a component that
 *      integrates its own wander cannot be asked to fly along someone else's arc. So the vacpack owns a
 *      look-alike for exactly the seconds a slime is in the air, and the real one is handed back on landing.
 *
 *      It is a gumdrop-ish lathe with a flat base and doe eyes, which is the same drawing idea as
 *      `slimes/gumdrop.ts` executed in a tenth of the code. When the re-theme in `slimes/` settles,
 *      `proxyBody()` becomes `gumdropGeometry(family)` and `bodyMaterial()` becomes theirs — those are the
 *      two functions in this file with the same shape as the pair over there, on purpose.
 *
 *   2. THE PACK'S OWN PARTS. Rounded boxes, horns, ribs and windows. All chunky, all filleted; there is not
 *      one hard edge or sharp cone in the set, because the brief is a toy and a toy has no corners.
 *
 * CACHING POLICY, which is the reason this is a module and not a hook. Every geometry and every material
 * here is built once per process and shared by every instance. The pack is one object on screen, so this
 * buys little for the pack itself — but a proxy slime is created and destroyed several times a minute for as
 * long as a child is playing, and building a lathe per catch is a stutter exactly when something interesting
 * is happening. Nothing in this directory's frame loops allocates.
 */
import * as THREE from 'three';

import type { Family } from '../contract';
import { paintOf } from './families';

/* ------------------------------------------------------------------ *\
   Small shared primitives
\* ------------------------------------------------------------------ */

const cache = new Map<string, THREE.BufferGeometry>();
function keep(key: string, make: () => THREE.BufferGeometry): THREE.BufferGeometry {
  const had = cache.get(key);
  if (had) return had;
  const made = make();
  cache.set(key, made);
  return made;
}

/** A unit sphere, for pips, eyes, bumpers and motes. 16x12 is round at these sizes and cheap in bulk. */
export function ball(): THREE.BufferGeometry {
  return keep('ball', () => new THREE.SphereGeometry(1, 16, 12));
}

/** A unit sphere at half the segments, for the mote swarm where forty of them are three pixels wide. */
export function speck(): THREE.BufferGeometry {
  return keep('speck', () => new THREE.SphereGeometry(1, 8, 6));
}

/** A rounded rod of unit half-length along +X, radius `r`. Both ends capped round: no cut cylinders. */
export function rod(r: number): THREE.BufferGeometry {
  return keep(`rod:${r}`, () => {
    const g = new THREE.CapsuleGeometry(r, 2, 6, 8);
    // CapsuleGeometry runs along Y. Everything that uses a rod here is horizontal.
    g.rotateZ(Math.PI / 2);
    return g;
  });
}

/** A unit-radius disc facing +Z, with a filleted rim rather than a stamped-out circle. */
export function disc(): THREE.BufferGeometry {
  return keep('disc', () => new THREE.CylinderGeometry(1, 1, 0.1, 24).rotateX(Math.PI / 2));
}

export function ring(radius: number, tube: number): THREE.BufferGeometry {
  return keep(`ring:${radius}:${tube}`, () => new THREE.TorusGeometry(radius, tube, 8, 24));
}

/**
 * A CHUNKY ROUNDED BOX. Not a `BoxGeometry`: a box has eight corners a child could be cut on, and the
 * whole visual brief is that this thing is soft.
 *
 * Built as a rounded rectangle extruded with a bevel, which fillets the silhouette in all three axes at
 * once. Doing it by displacing box vertices — the other common trick — rounds the outline but leaves the
 * corner normals hard, and hard normals on a filleted shape look like a compression artefact.
 */
export function pillow(w: number, h: number, d: number, r: number): THREE.BufferGeometry {
  return keep(`pillow:${w}:${h}:${d}:${r}`, () => {
    const bevel = Math.min(r * 0.75, d * 0.32);
    const hw = w / 2 - bevel;
    const hh = h / 2 - bevel;
    const rr = Math.max(0.001, r - bevel);
    const s = new THREE.Shape();
    s.absarc(hw - rr, hh - rr, rr, 0, Math.PI / 2, false);
    s.absarc(-hw + rr, hh - rr, rr, Math.PI / 2, Math.PI, false);
    s.absarc(-hw + rr, -hh + rr, rr, Math.PI, Math.PI * 1.5, false);
    s.absarc(hw - rr, -hh + rr, rr, Math.PI * 1.5, Math.PI * 2, false);
    const g = new THREE.ExtrudeGeometry(s, {
      depth: Math.max(0.001, d - bevel * 2),
      bevelEnabled: true,
      bevelThickness: bevel,
      bevelSize: bevel,
      bevelSegments: 3,
      curveSegments: 8,
      steps: 1,
    });
    g.translate(0, 0, -(d - bevel * 2) / 2);
    g.computeVertexNormals();
    return g;
  });
}

/**
 * THE NOZZLE HORN. A revolved profile, flaring from `back` to `mouth` over `len`, with the flare on a
 * curve rather than a straight taper — a straight taper is a traffic cone, and a traffic cone is the exact
 * "reads as a weapon" failure the brief warns about. The curve belling out at the last third is what makes
 * it read as a trumpet or a watering can instead.
 *
 * Open at both ends and double-sided, so you can see down the throat.
 */
export function horn(back: number, mouth: number, len: number): THREE.BufferGeometry {
  return keep(`horn:${back}:${mouth}:${len}`, () => {
    const pts: THREE.Vector2[] = [];
    const N = 14;
    // BUILT MOUTH-FIRST, so the profile's y INCREASES. Two things depend on that and both of them bit:
    //
    //   · `LatheGeometry` derives its winding from the order of the profile points. Handed a profile that runs
    //     downward it produces a surface whose normals face INWARD, so a `FrontSide` material on it is
    //     backface-culled from outside and the horn is simply not there. It took a screenshot to notice, because
    //     an invisible mesh raises nothing anywhere.
    //   · It revolves about the Y AXIS. A profile written as `(radius, -len * t)` therefore builds a horn
    //     pointing at the FLOOR, not down the barrel — which is where the first two passes' nozzle actually was.
    //     The `rotateX` below is what aims it along -Z, the direction the whole rest of this directory assumes.
    for (let i = N; i >= 0; i -= 1) {
      const t = i / N;
      // Bell: slow at the back, opening hard at the lip.
      const r = back + (mouth - back) * Math.pow(t, 2.4);
      pts.push(new THREE.Vector2(r, -len * t));
    }
    const g = new THREE.LatheGeometry(pts, 24);
    // +Y -> -Z: the mouth ends up at z = -len and the throat at z = 0.
    g.rotateX(Math.PI / 2);
    return g;
  });
}

/**
 * THE CONE OF INFLUENCE, as a visible thing.
 *
 * A single open cone from the nozzle mouth out to `range`, with a per-vertex alpha that is bright at the lip
 * and gone by the far end. Drawn additively with no depth write, so it lies over the world as light rather
 * than as a solid — a solid cone in front of a first-person camera is a grey sack over the screen.
 *
 * The gradient is baked into a colour attribute rather than done in a shader: one attribute is a few hundred
 * floats written once, a shader is a compile and a hot-reload hazard, and nothing here needs to animate the
 * gradient's SHAPE — only its overall strength, which is material opacity.
 */
export function draught(range: number, halfAngle: number): THREE.BufferGeometry {
  return keep(`draught:${range}:${halfAngle}`, () => {
    const rEnd = Math.tan(halfAngle) * range;
    const g = new THREE.CylinderGeometry(rEnd, 0.02, range, 28, 6, true);
    // Cylinder runs +Y, and the WIDE end has to finish far from the eye. `rotateX(-PI/2)` sends +Y — the
    // `radiusTop` end — to -Z; the opposite sign sends it to +Z and opens the cone toward the camera, which is a
    // wall of light across the lower screen rather than a draught reaching out into the ranch.
    g.rotateX(-Math.PI / 2);
    g.translate(0, 0, -range / 2);
    const pos = g.getAttribute('position');
    const col = new Float32Array(pos.count * 3);
    for (let i = 0; i < pos.count; i += 1) {
      const z = pos.getZ(i);
      const t = THREE.MathUtils.clamp(-z / range, 0, 1);
      // Brightest just off the lip, not AT it — at the lip it is inside the nozzle and invisible anyway,
      // and putting the peak a little way out is what makes the airflow look like it is coming FROM
      // somewhere rather than being painted on the mesh.
      const a = Math.pow(1 - t, 2.2) * (0.35 + 0.65 * Math.min(1, t * 6));
      col[i * 3] = a;
      col[i * 3 + 1] = a * 0.92;
      col[i * 3 + 2] = a * 0.7;
    }
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    return g;
  });
}

/* ------------------------------------------------------------------ *\
   The proxy slime
\* ------------------------------------------------------------------ */

/**
 * THE BLOB. A gumdrop: flat base, wide shoulder, rounded peak, no waist.
 *
 * Authored so that y runs 0..1 and the widest radius is exactly 1, because everything that mounts it scales
 * by the collider's own `r` from `herd.ts` and expects that to be the half-width. Getting that convention
 * wrong is how a caught slime is a different size from the one that was standing there a moment ago, which
 * is the single most noticeable thing that can go wrong in this mechanic.
 */
export function proxyBody(): THREE.BufferGeometry {
  return keep('proxyBody', () => {
    const spline = new THREE.SplineCurve([
      new THREE.Vector2(0, 0),
      new THREE.Vector2(0.58, 0),
      new THREE.Vector2(0.88, 0.03),
      new THREE.Vector2(1.0, 0.18),
      new THREE.Vector2(1.0, 0.44),
      new THREE.Vector2(0.92, 0.64),
      new THREE.Vector2(0.72, 0.82),
      new THREE.Vector2(0.42, 0.94),
      new THREE.Vector2(0.14, 0.995),
      new THREE.Vector2(0, 1),
    ]);
    const pts = spline.getPoints(28).map((p) => new THREE.Vector2(Math.max(0, p.x), p.y));
    return new THREE.LatheGeometry(pts, 28);
  });
}

/** The eye set. One sphere reused at three sizes; a whole face is three draws and no new geometry. */
export function proxyFace(): { sclera: THREE.BufferGeometry; iris: THREE.BufferGeometry } {
  return { sclera: ball(), iris: ball() };
}

/* ------------------------------------------------------------------ *\
   Materials
\* ------------------------------------------------------------------ */

const mats = new Map<string, THREE.Material>();
function held<T extends THREE.Material>(key: string, make: () => T): T {
  const had = mats.get(key);
  if (had) return had as T;
  const made = make();
  mats.set(key, made);
  return made;
}

/** The jelly. Physical rather than standard, because the sheen is most of what says "not plastic". */
export function bodyMaterial(family: Family): THREE.MeshPhysicalMaterial {
  return held(`body:${family}`, () => {
    const p = paintOf(family);
    return new THREE.MeshPhysicalMaterial({
      color: p.skin,
      roughness: 0.28,
      metalness: 0,
      clearcoat: 0.55,
      clearcoatRoughness: 0.35,
      sheen: 0.6,
      sheenColor: new THREE.Color(p.rim),
      emissive: new THREE.Color(p.inner),
      // The inner glow stands in for subsurface scattering. Cheap, and at this size indistinguishable.
      emissiveIntensity: 0.1 + p.through * 0.14,
    });
  });
}

export function scleraMaterial(): THREE.MeshStandardMaterial {
  // Never #fff. A pure white eye next to a saturated warm body is the one thing that reads as clip art.
  return held('sclera', () => new THREE.MeshStandardMaterial({ color: '#fdf6e6', roughness: 0.22 }));
}

export function irisMaterial(family: Family): THREE.MeshStandardMaterial {
  return held(`iris:${family}`, () => new THREE.MeshStandardMaterial({ color: paintOf(family).iris, roughness: 0.18 }));
}

export function catchlightMaterial(): THREE.MeshBasicMaterial {
  return held('catchlight', () => new THREE.MeshBasicMaterial({ color: '#fffdf4' }));
}

/**
 * The pack's shell: warm cream, softly glossy. The colour of a well-loved enamel kettle.
 *
 * Pulled DOWN and warmer from the first pass's near-white. Under this light — a permanent golden hour with a
 * strong low sun — a #fbeacb shell held half a metre from the eye was the brightest thing in the frame by a
 * wide margin, so the toy stopped being something you were carrying through the ranch and became the subject
 * of every screenshot. A held object should sit UNDER the ambient it is held in.
 */
export function shellMaterial(): THREE.MeshStandardMaterial {
  return held('shell', () => new THREE.MeshStandardMaterial({ color: '#f3dcb0', roughness: 0.5, metalness: 0.03 }));
}

/** The accent: apricot. Every part a hand would touch is this colour, so the affordances group. */
export function trimMaterial(): THREE.MeshStandardMaterial {
  return held('trim', () => new THREE.MeshStandardMaterial({ color: '#ef9a4a', roughness: 0.38, metalness: 0.05 }));
}

/**
 * Soft rubber, for the hose and the grip. Matte, so it reads as grippable next to the glossy shell.
 *
 * Lightened from #8a5a3b: at that value the hose read as a gap in the model rather than a part of it. Nothing on
 * this toy is allowed to be dark enough to look like a hole.
 */
export function rubberMaterial(): THREE.MeshStandardMaterial {
  return held('rubber', () => new THREE.MeshStandardMaterial({ color: '#b0764c', roughness: 0.82, metalness: 0 }));
}

/**
 * Down the throat of the nozzle. Dark, but warm-dark, and never near black.
 *
 * `DoubleSide`, not `BackSide`. As the liner of a lathe whose normals point outward, `BackSide` draws the inner
 * wall correctly — right up until the mouth is viewed close to head-on, where the visible surface is the far
 * wall's near face and the bell reads as CAPPED. Which is exactly how it looked: a cream lid on a spout.
 */
export function throatMaterial(): THREE.MeshStandardMaterial {
  return held(
    'throat',
    () => new THREE.MeshStandardMaterial({ color: '#6b4029', roughness: 0.75, side: THREE.DoubleSide }),
  );
}

/** Tank window glass. Thin, bright, and NOT transmissive: transmission is a render target per window. */
export function glassMaterial(): THREE.MeshPhysicalMaterial {
  return held(
    'glass',
    () =>
      new THREE.MeshPhysicalMaterial({
        color: '#ffffff',
        roughness: 0.06,
        metalness: 0,
        transparent: true,
        opacity: 0.26,
        clearcoat: 1,
        depthWrite: false,
      }),
  );
}

/** What a held slime is drawn as inside its window: the family skin, lit from within so it glows. */
export function pennantMaterial(family: Family): THREE.MeshStandardMaterial {
  return held(`pennant:${family}`, () => {
    const p = paintOf(family);
    return new THREE.MeshStandardMaterial({
      color: p.skin,
      roughness: 0.3,
      emissive: new THREE.Color(p.inner),
      emissiveIntensity: 0.42,
    });
  });
}

export function glyphMaterial(family: Family): THREE.MeshStandardMaterial {
  return held(`glyph:${family}`, () => new THREE.MeshStandardMaterial({ color: paintOf(family).glyph, roughness: 0.5 }));
}

/** An empty window: the pale wadding you can see when there is nothing in the slot. */
export function emptyMaterial(): THREE.MeshStandardMaterial {
  return held('empty', () => new THREE.MeshStandardMaterial({ color: '#e6d3ae', roughness: 0.9 }));
}

/**
 * The suction light: additive, unlit, no depth write. Used for the intake swirl, the motes and the cone.
 * `vertexColors` is on so `draught()`'s baked gradient is honoured; a flat colour multiplies by white for
 * everything else, so one material serves all three.
 */
export function airMaterial(): THREE.MeshBasicMaterial {
  return held(
    'air',
    () =>
      new THREE.MeshBasicMaterial({
        color: '#ffe6b4',
        transparent: true,
        opacity: 0,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        vertexColors: true,
        side: THREE.DoubleSide,
      }),
  );
}

/**
 * A SECOND air material, because the cone and the motes need different opacities in the same frame and a
 * material is shared state. Two materials is the whole fix; parameterising one and setting it twice a frame
 * is a bug that only shows up when both are visible at once.
 */
export function moteMaterial(): THREE.MeshBasicMaterial {
  return held(
    'mote',
    () =>
      new THREE.MeshBasicMaterial({
        color: '#fff0cc',
        transparent: true,
        opacity: 0,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
  );
}

/** The ring on the ground under whatever the nozzle is about to draw in. */
export function markMaterial(): THREE.MeshBasicMaterial {
  return held(
    'mark',
    () =>
      new THREE.MeshBasicMaterial({
        color: '#ffd489',
        transparent: true,
        opacity: 0,
        depthWrite: false,
        side: THREE.DoubleSide,
      }),
  );
}
