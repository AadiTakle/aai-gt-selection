/**
 * THE GUMDROP — one lathed profile curve per family, baked once and shared by every slime.
 *
 * WHY A LATHE. The note the owner gave — "shaped more like gumdrops than spheres and ellipses" — is
 * about the OUTLINE, and an outline is a 2D curve. So the curve is authored directly as a 2D curve and
 * revolved: `LatheGeometry` over an explicit profile. Nothing here is derived from a sphere, and the
 * silhouette is exactly the polyline drawn below rather than a sphere's outline with corrections applied.
 *
 * WHAT MAKES A GUMDROP A GUMDROP, as three properties of the profile:
 *
 *   1. A FLAT BASE, and the widest point at or just above it. A sphere's widest point is halfway up;
 *      a gumdrop's is at the bottom. This is most of the read.
 *   2. FULL, NEARLY VERTICAL SHOULDERS. The wall leaves the base going up, not outward: dr/dh = 0 at
 *      the base. `shoulder` is the exponent that does this, and pushing it above 2 is what separates a
 *      gumdrop from the dome (a hemisphere) that `shoulder = 2` gives exactly.
 *   3. A TIP THAT ROUNDS OVER RATHER THAN MEETING AT A POINT. `peak` stays strictly below 1 so the
 *      surface is horizontal at the crown; at exactly 1 the profile arrives as a straight line and the
 *      top becomes a cone point, which is the one shape the craft bar forbids.
 *
 * The base rim gets a real fillet arc rather than a 90-degree corner, because the rim is on the
 * silhouette from any low camera and a child playing this game is a low camera.
 *
 * ─────────────────────────────────────────────────────────────────────────────────────────────────────
 * WHAT THE RE-THEME ADDED: RELIEF. The gumdrop is the shared silhouette language of the six, and it
 * stays. But a waffle needs squares pressed into it and a rock needs to look quarried, and neither can
 * be a texture — this directory ships no image files. So after the lathe is revolved its vertices are
 * pushed along their own normals by a smooth analytic field, and a vertex COLOUR is baked in the same
 * pass. That buys grooves, facets, moss and rime for the price of one extra attribute on a buffer that
 * is created once per family and shared by every slime of it. Forty waffles share one dimpled lathe.
 *
 * The fields are all smooth by construction — sines and smoothsteps, no quantising, no `floor` — because
 * a quantised height field is exactly how the previous pass grew visible facets on a silhouette. `rock`
 * is the test case: it must look stony and its profile must still be a curve everywhere.
 */
import * as THREE from 'three';

import type { Family, Stage } from '../contract';
import { FAMILY_LOOK, STAGE_LOOK, resolveStage } from './look';

/* ============================================================================
   the profile
   ========================================================================== */

/**
 * A family's outline, as six numbers.
 *
 * Kept this small on purpose: six numbers can be tuned against a screenshot in one pass, and every
 * one of them moves the silhouette in a way you can name out loud.
 */
export interface GumdropProfile {
  /** Half-width of the wall where it leaves the base, in body units. */
  width: number;
  /** Total height, in body units. Height and width are independent, so squat and tall are separable. */
  height: number;
  /**
   * Shoulder fullness. 2 is a plain dome. Above 2 the wall stands up straighter for longer before it
   * turns over, which is the gumdrop read; 4 is nearly a rounded cylinder.
   */
  shoulder: number;
  /**
   * How the crown closes. 0.5 is a soft round dome, 0.85 draws a soft peak. MUST stay below 1: at 1
   * the tip becomes a cone point and the creature grows a spike.
   */
  peak: number;
  /**
   * Base rim. Positive flares a sitting skirt, as if the candy has settled under its own weight;
   * negative tucks a small foot in, so the widest point lifts slightly off the ground.
   */
  skirt: number;
  /** Radius of the fillet where the wall meets the flat base, in body units. */
  fillet: number;
}

/**
 * The six bodies.
 *
 * READ THE UNITS BEFORE TUNING THESE. `width` is a HALF-width and `height` is a WHOLE height, because
 * that is what a lathe profile needs. The honest proportion of a real gumdrop is roughly as tall as it
 * is wide, so `height` wants to land near TWICE `width`. Below that the family reads as a pebble; well
 * above it, as a candle. The ratio of height to twice-width is written next to each one so the next
 * person to touch this table can see the spread at a glance and keep it.
 *
 * THE SPREAD IS NARROWER THAN IT USED TO BE, AND THAT IS THE POINT. The previous table did all six
 * identifications with proportion alone and had to stretch from 0.66 to 1.55 to manage it. Now the
 * signature features carry the read, so the bodies only have to support them: a waffle wants to be a
 * flat thing you put butter on, a rock wants to be the lowest and broadest of the set, a fairy wants to
 * be slender enough to look carried by its wings. Where proportion is still doing identification work it
 * is doing it for `rock`, which is the one family whose silhouette read IS its body.
 */
export const GUMDROP: Record<Family, GumdropProfile> = {
  /** A waffle: low, broad and flat-crowned, so the lattice reads and the butter has somewhere to sit. 0.70 */
  waffle: { width: 0.93, height: 1.3, shoulder: 3.5, peak: 0.4, skirt: 0.07, fillet: 0.26 },
  /** A rose: a tall-ish urn for the rosette to sit in, narrowing under the petals. 0.99 */
  rose: { width: 0.76, height: 1.5, shoulder: 2.7, peak: 0.62, skirt: 0.03, fillet: 0.16 },
  /** Grass: a round tussock mound, wide-crowned so a tuft of blades has a bed to grow out of. 0.82 */
  grass: { width: 0.82, height: 1.34, shoulder: 3.0, peak: 0.46, skirt: 0.05, fillet: 0.2 },
  /** Rock: the lowest and broadest of the six by a clear margin, and the whole identification. 0.57 */
  rock: { width: 1.0, height: 1.14, shoulder: 3.9, peak: 0.44, skirt: 0.08, fillet: 0.3 },
  /** A fairy: tallest and narrowest, on a tucked foot, so the wings look like they carry it. 1.55 */
  fairy: { width: 0.6, height: 1.86, shoulder: 2.2, peak: 0.62, skirt: -0.08, fillet: 0.18 },
  /** Frost: an upright ice mound for the spires, wide enough at the base to wear a rime skirt. 1.00 */
  frost: { width: 0.78, height: 1.56, shoulder: 2.6, peak: 0.66, skirt: 0.04, fillet: 0.17 },
};

/** Radius of the wall at a height fraction `t`, 0 at the base and 1 at the crown, before `width`. */
function shapeAt(p: GumdropProfile, t: number): number {
  const u = t < 0 ? 0 : t > 1 ? 1 : t;
  const wall = Math.pow(Math.max(0, 1 - Math.pow(u, p.shoulder)), p.peak);
  // The skirt is a short bump that dies away by a quarter of the way up, so it only ever affects
  // where the body meets the ground and never the crown.
  const skirt = 1 + p.skirt * Math.exp(-((u / 0.26) * (u / 0.26)));
  return wall * skirt;
}

/**
 * The profile as a polyline, ready for `LatheGeometry`.
 *
 * Two details that both show up on the silhouette if you get them wrong. The first point sits at
 * x = 0 so the base closes as a flat disc, which is why a slime rests ON the ground rather than
 * hovering over its own tangent point. And the samples are pushed toward the crown, because that is
 * where the curve bends hardest — an even spacing spends its rows on the straight wall and then
 * turns the top over in four segments, which you can see.
 */
export function gumdropPoints(p: GumdropProfile, rows = 30): THREE.Vector2[] {
  const H = p.height;
  const rf = Math.min(p.fillet, H * 0.35);
  const t0 = rf / H;
  // Radius where the fillet hands over to the wall. Taken from the wall itself so the two meet
  // exactly, with the fillet arriving vertical and the wall leaving vertical: no crease.
  const rWall = p.width * shapeAt(p, t0);

  const pts: THREE.Vector2[] = [new THREE.Vector2(0, 0)];

  const arc = 6;
  for (let i = 0; i <= arc; i += 1) {
    const a = (i / arc) * (Math.PI / 2);
    pts.push(new THREE.Vector2(rWall - rf + rf * Math.sin(a), rf * (1 - Math.cos(a))));
  }

  for (let i = 1; i <= rows; i += 1) {
    const u = i / rows;
    const bias = 1 - Math.pow(1 - u, 1.75);
    const t = t0 + (1 - t0) * bias;
    // Never exactly zero: a zero-radius ring collapses to a point and its normals go undefined,
    // which shows up as a dark speck on the top of every slime's head.
    pts.push(new THREE.Vector2(Math.max(0.0006, p.width * shapeAt(p, t)), t * H));
  }

  return pts;
}

/**
 * A family's outline as pure numbers, with no geometry built.
 *
 * `crests.ts` hangs every petal, blade and spire off the real surface radius rather than off a guessed
 * offset, and it should not have to revolve a lathe to ask where the surface is. Same curve the body is
 * baked from, so a part placed at `radiusAt(0.86)` sits ON the hide of whichever family it is.
 */
export function bodyOutline(family: Family): {
  height: number;
  width: number;
  radiusAt: (t: number) => number;
} {
  const p = GUMDROP[family];
  return { height: p.height, width: p.width, radiusAt: (t: number) => p.width * shapeAt(p, t) };
}

/* ============================================================================
   relief — what is pressed into the hide, and what colour it is
   ========================================================================== */

const smoothstep = (a: number, b: number, x: number): number => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

/** Distance to the nearest gridline as a smooth 0..1, 0 ON the line. Periodic for integer frequency. */
const cell = (x: number): number => Math.abs(Math.sin(Math.PI * x));

/**
 * The lattice a waffle is made of, as one number: 0 deep in a groove, 1 in the middle of a square.
 *
 * Eight squares around and four up the body, which at 48 radial segments is six segments per square —
 * enough that a groove is a smooth valley rather than a crease. Six squares around read as horizontal
 * banding, because at that spacing the vertical grooves are further apart than the horizontal ones and
 * the eye joins the horizontals into rings. The groove is kept NARROW (the
 * smoothstep tops out at 0.34) because a waffle is mostly square and a little bit groove; equal parts of
 * each reads as a golf ball.
 */
function latticePad(u: number, v: number): number {
  return smoothstep(0, 0.36, Math.min(cell(u * 8), cell(v * 4 - 0.15)));
}

/** Broad smooth stone planes. Two crossed low-frequency lobes, no quantising anywhere. */
function boulderField(x: number, y: number, z: number): number {
  return (
    Math.sin(x * 3.1 + 0.4) * Math.sin(y * 2.6 + 1.1) * 0.6 +
    Math.sin(z * 2.3 + 2.0) * Math.sin(x * 1.9 - 0.7) * 0.55 +
    Math.sin(y * 1.7 + z * 2.1) * 0.3
  );
}

/**
 * Where moss grows on a rock: on UPWARD faces, in patches, biased to the back.
 *
 * The upward test is what makes this read as moss rather than as a green paint job — moss on the front
 * of a vertical wall is a stain, moss on a horizontal shelf is moss. Biasing to the back keeps the face
 * clear, which matters more than it sounds: green blotches around two big eyes read as illness.
 */
function mossField(nx: number, ny: number, nz: number, x: number, y: number, z: number): number {
  const up = smoothstep(0.1, 0.6, ny);
  const back = 0.68 + 0.32 * smoothstep(-0.6, 0.6, -nz);
  const blob = Math.sin(x * 3.4 + 1.2) * Math.sin(z * 3.9 - 0.6) + Math.sin(y * 4.4 + x * 2.2) * 0.7;
  // Threshold widened after the first render, where the patches were so small and so far back that rock
  // shipped as a plain grey stone. Moss is the only warm colour this family has and it has to be seen.
  return up * back * smoothstep(-0.35, 0.8, blob);
}

/**
 * Applies a family's relief to a freshly revolved body, in one pass, and bakes its vertex colours.
 *
 * Displacement is along the vertex NORMAL rather than radially, which is what keeps the crown working:
 * radial displacement does nothing at all on a horizontal surface, so a radially-dimpled waffle has a
 * perfectly smooth top — the one part of it a child looking down at a pet actually sees.
 *
 * Everything is damped to nothing at the base ring. The first profile point sits on the axis at y = 0
 * and its normal points straight down, so an undamped field pushes the base disc through the ground and
 * the slime floats on a lip of its own displaced footprint.
 */
function applyRelief(geometry: THREE.BufferGeometry, family: Family, height: number): void {
  const look = FAMILY_LOOK[family];
  const pos = geometry.getAttribute('position') as THREE.BufferAttribute;
  const nrm = geometry.getAttribute('normal') as THREE.BufferAttribute;
  const count = pos.count;
  const colours = new Float32Array(count * 3);

  const skin = new THREE.Color(look.skin);
  const accent = new THREE.Color(look.accent);
  const trim = new THREE.Color(look.trim);
  const tint = new THREE.Color();
  const TAU = Math.PI * 2;

  for (let i = 0; i < count; i += 1) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);
    const nx = nrm.getX(i);
    const ny = nrm.getY(i);
    const nz = nrm.getZ(i);

    const v = Math.min(1, Math.max(0, y / height));
    // Angle measured from +z, matching how `LatheGeometry` lays out its rings. Every field below is
    // periodic with an INTEGER frequency in `u`, so the duplicated seam ring lands on the same value
    // from either side and there is no visible join.
    const u = Math.atan2(x, z) / TAU;
    const foot = smoothstep(0, 0.14, v);

    let push = 0;
    // Vertex colours multiply the material colour, so the neutral value is white and `skin` is baked
    // in explicitly. That costs one attribute and buys per-vertex tinting on a shared buffer.
    tint.copy(skin);

    switch (look.relief) {
      case 'lattice': {
        const pad = latticePad(u, v);
        push = -look.reliefDepth * (1 - pad);
        // Grooves go toward `accent`, and the middle of each square lifts a little toward the light,
        // which is what makes a flat lattice read as PRESSED rather than drawn on.
        tint.lerp(accent, (1 - pad) * 0.72);
        tint.multiplyScalar(0.94 + pad * 0.1);
        break;
      }
      case 'boulder': {
        push = look.reliefDepth * boulderField(x * 2.2, y * 2.2, z * 2.2) * 0.5;
        const moss = mossField(nx, ny, nz, x * 2.4, y * 2.4, z * 2.4);
        tint.lerp(trim, moss * 0.95);
        // Crevices are where the field is lowest, and darkening them is most of what makes the facet
        // planes visible at all on a body this desaturated.
        tint.lerp(accent, smoothstep(0.4, -0.9, boulderField(x * 2.2, y * 2.2, z * 2.2)) * 0.3);
        break;
      }
      case 'crystal': {
        push = look.reliefDepth * boulderField(x * 3.6, y * 3.0, z * 3.6) * 0.5;
        // The rime line is WAVY, not a ring. A level band of white around a body reads as a painted
        // stripe; a wavy one reads as frost that has crept up from the ground.
        const line = 0.3 + 0.1 * Math.sin(u * TAU * 7) + 0.04 * Math.sin(u * TAU * 13 + 1.1);
        tint.lerp(trim, smoothstep(line, line - 0.22, v) * 0.85);
        break;
      }
      case 'blade': {
        // A fine vertical grain, so the hide looks fibrous close up. Amplitude is deliberately tiny:
        // this one is a texture, not a silhouette feature, and grass's silhouette is its tuft.
        const grain = Math.sin(u * TAU * 19);
        push = look.reliefDepth * grain * 0.5;
        tint.lerp(accent, (0.5 - grain * 0.5) * 0.16);
        // Sun-bleached toward the crown, dark at the roots, which is how a clump of grass reads.
        tint.lerp(new THREE.Color(look.inner), smoothstep(0.45, 1, v) * 0.16);
        break;
      }
      case 'none':
      default:
        break;
    }

    if (push !== 0) {
      const d = push * foot;
      pos.setXYZ(i, x + nx * d, y + ny * d, z + nz * d);
    }
    colours[i * 3] = tint.r;
    colours[i * 3 + 1] = tint.g;
    colours[i * 3 + 2] = tint.b;
  }

  geometry.setAttribute('color', new THREE.BufferAttribute(colours, 3));
  pos.needsUpdate = true;
}

/* ============================================================================
   the bake
   ========================================================================== */

export interface GumdropBake {
  geometry: THREE.BufferGeometry;
  /** Widest half-width, body units. What a collider needs. */
  halfWidth: number;
  /** Total height, body units. */
  height: number;
  /** Surface half-width at a world-ish height fraction 0..1. Eyes and features are hung off this. */
  radiusAt: (t: number) => number;
}

const bodyCache = new Map<string, GumdropBake>();

/**
 * A family's body.
 *
 * 48 radial segments puts the outline within 0.2% of a true circle, which is under a pixel at any
 * size a child will see, so the silhouette is smooth without paying for 64. Six families times two
 * levels of detail is at most twelve buffers for the life of the page, and forty slimes therefore do
 * zero geometry work: they are forty matrices against a handful of shared buffers.
 *
 * The relief rows matter here in a way they did not before: a waffle's lattice is four squares up the
 * body, so the far bake keeps enough rows to still show the grooves rather than smearing them into a
 * ripple. 14 rows over 4 squares is three rows per square, which is the floor.
 */
export function gumdropGeometry(family: Family, detail: 'near' | 'far' = 'near'): GumdropBake {
  const key = `${family}:${detail}`;
  const hit = bodyCache.get(key);
  if (hit) return hit;

  const p = GUMDROP[family];
  const rows = detail === 'near' ? 30 : 16;
  const segments = detail === 'near' ? 48 : 24;
  const pts = gumdropPoints(p, rows);

  const geometry = new THREE.LatheGeometry(pts, segments);
  // Lathe derives its own normals from the profile tangent, which leaves the base disc and the wall
  // disagreeing across the rim. Recomputing averages them, so the fillet reads as one soft turn — and
  // the relief pass below needs a trustworthy normal to displace along.
  geometry.computeVertexNormals();
  applyRelief(geometry, family, p.height);
  // Again, because the displacement moved the surface: the shading has to follow the dimples or the
  // lattice is invisible.
  geometry.computeVertexNormals();
  geometry.computeBoundingSphere();

  let halfWidth = 0;
  for (const v of pts) if (v.x > halfWidth) halfWidth = v.x;

  const radiusAt = (t: number): number => p.width * shapeAt(p, t);

  const bake: GumdropBake = { geometry, halfWidth, height: p.height, radiusAt };
  bodyCache.set(key, bake);
  return bake;
}

/* ============================================================================
   the face, and everything else shared
   ========================================================================== */

interface EyeParts {
  sclera: THREE.SphereGeometry;
  iris: THREE.SphereGeometry;
  catchlight: THREE.SphereGeometry;
}

let eyeParts: EyeParts | null = null;

/**
 * Unit spheres for the three face pieces, at three different tessellations.
 *
 * Sized by mesh scale rather than by radius so all forty slimes at all four stages share these three
 * buffers. The counts fall off hard with size on purpose: the sclera is on the silhouette of the face
 * and gets 20x14, the catchlight is four pixels across and gets 8x6. Spending equal detail on all of
 * them costs more triangles than the whole body does.
 *
 * There is deliberately no eyelid or brow mesh here. The first pass had one, and a body-coloured ridge
 * above the eye reads — instantly and unmistakably — as an ANGRY EYEBROW. Two of the six looked
 * genuinely cross. Blinking is done by scaling the eye group instead, which cannot be misread and costs
 * nothing; heavy-liddedness at the older stages is the resting value of that same scale.
 */
export function faceGeometry(): EyeParts {
  if (eyeParts) return eyeParts;
  eyeParts = {
    sclera: new THREE.SphereGeometry(1, 20, 14),
    iris: new THREE.SphereGeometry(1, 16, 11),
    catchlight: new THREE.SphereGeometry(1, 8, 6),
  };
  return eyeParts;
}

const bodyMaterials = new Map<Family, THREE.MeshPhysicalMaterial>();

/**
 * The body, one material per family and shared by every slime of it.
 *
 * WHY THERE IS NO `transmission` HERE ANY MORE, WHICH IS THE ONE MATERIAL DECISION IN THIS FILE WORTH
 * ARGUING. The previous pass ran every family at 0.26 to 0.48 transmission to get the boiled-sweet read,
 * and rendering the re-themed set exposed two problems with it that a screenshot settles instantly.
 *
 *   IT WENT BLACK. `transmission` makes three render a separate transmission pass and sample it for what
 *   is behind the body; where nothing opaque is behind, that sample is the cleared target, and the
 *   material mixes toward it. On the saturated old palette this read as "moody". On a violet-grey rock
 *   and a mid-green grass it read as SOOT: both families rendered near-black on their unlit side, which
 *   is how this was found. A children's game cannot ship a black rock.
 *
 *   IT WAS THE SINGLE MOST EXPENSIVE THING ON THE PAGE. The transmission pass is a whole extra render of
 *   every opaque object, every frame, however few transmissive objects there are. Measured on the eight
 *   slime `grow` scene it was 140 draw calls with it and 82 without — a 40% saving on the entire frame
 *   for a material property, which is not a trade a 40-slime budget can justify.
 *
 * What replaces it is what was doing most of the work anyway: `clearcoat` for the wet gleam, `sheen` for
 * the soft bloom around the rim, and a low `emissive` in the family's INNER colour so light appears to
 * sit inside the body and the shadow side never falls to a dead flat value. `translucency` still drives
 * both of those, so the table still spans dry stone to lit fairy — it just does it with lighting rather
 * than with a render target. The genuinely see-through parts of this game are the ones that should be:
 * fairy's wings and frost's spires, in `glazeMaterial`, which are honestly transparent and cost nothing
 * like a transmission pass.
 *
 * `vertexColors` is on for all six because every body carries a baked colour attribute — white where a
 * family has no relief, so the multiply is a no-op and one code path serves all of them.
 */
export function bodyMaterial(family: Family): THREE.MeshPhysicalMaterial {
  const hit = bodyMaterials.get(family);
  if (hit) return hit;
  const look = FAMILY_LOOK[family];
  const m = new THREE.MeshPhysicalMaterial({
    // White, because the family colour is baked into the vertex attribute along with its relief tint.
    color: '#ffffff',
    vertexColors: true,
    roughness: look.roughness,
    metalness: 0,
    clearcoat: look.coat,
    // Broad rather than tight: a tight clearcoat put one small hard hotspot on every body, which is the
    // signature of moulded plastic. A softer, larger gleam is what a sweet does.
    clearcoatRoughness: 0.24,
    sheen: 0.35 + look.translucency * 0.55,
    sheenRoughness: 0.5,
    sheenColor: new THREE.Color(look.rim),
    // The stand-in for subsurface: a body that lets light through glows faintly in its own inner colour.
    // Fairy is genuinely lit; the rest take a whisper of it so no shadow side goes dead.
    emissive: new THREE.Color(look.inner),
    emissiveIntensity: 0.04 + look.translucency * 0.1 + look.glow * 0.3,
  });
  bodyMaterials.set(family, m);
  return m;
}

const trimMaterials = new Map<Family, THREE.MeshStandardMaterial>();

/**
 * The opaque signature parts: petals, sepals, blades, the daisy, moss, boulders, butter, the rime.
 *
 * ONE material and ONE mesh per slime for all of them, which is the whole reason the parts are merged
 * in `crests.ts` with their colours baked per vertex. The alternative — a mesh per petal — is twenty
 * draw calls per rose, and a rose at warden has sixteen petals.
 */
export function trimMaterial(family: Family): THREE.MeshStandardMaterial {
  const hit = trimMaterials.get(family);
  if (hit) return hit;
  const look = FAMILY_LOOK[family];
  const m = new THREE.MeshStandardMaterial({
    color: '#ffffff',
    vertexColors: true,
    roughness: look.partRoughness,
    metalness: 0,
    /**
     * DOUBLE-SIDED, and this was a real bug rather than a preference.
     *
     * `skin()` builds the rime skirt as a SINGLE surface — one layer of triangles, on the argument that a
     * closed double-walled shell doubles the triangles to hide a seam nobody can see on a 3 mm coating.
     * That argument is sound and the file said so, but the material it relies on was left at the default
     * `FrontSide`, so every triangle of the skirt whose winding faced away was culled. Frost rendered with
     * two pale flaps sticking out of its flanks instead of a skirt round its base, which is exactly what a
     * half-culled ring looks like. It also matters for the petals and blades: those shells ARE closed, but
     * a closed shell one hundredth of a unit thick still shows its far wall through the near one at a
     * grazing angle, and culling that wall turns the tip of a petal into a hole.
     */
    side: THREE.DoubleSide,
    // A DELIBERATE AMBIENT LIFT, and the reason is the camera height. A child's eye is 1.5 m off the
    // grass, so a petal leaning outward is seen from BELOW: its lit face is turned to the sky and the
    // face the player sees takes only the hemisphere light's ground colour, which is green. Rose's
    // rosette rendered as dark maroon spikes until this went in. Six hundredths is enough to keep the
    // underside in the family's own hue without making anything look self-lit.
    emissive: new THREE.Color(look.crest),
    emissiveIntensity: 0.06 + look.glow * 0.22,
  });
  trimMaterials.set(family, m);
  return m;
}

const glazeMaterials = new Map<Family, THREE.MeshPhysicalMaterial>();

/**
 * The wet or see-through layer: waffle's syrup, fairy's wings, frost's spires.
 *
 * Opacity is DERIVED from `translucency` rather than being a seventh column in the look table, which
 * lands syrup at nearly opaque, ice at three quarters and a wing at seven tenths — the ordering the
 * objects themselves have. The coefficient came down from 0.5 after the first render: at half opacity a
 * wing had so little of its own colour left that it took the grass's green through it and read as a sheet
 * of frosted plastic. Transparency sells gossamer only while the thing is still visibly its own colour. `depthWrite` follows from the same number: a nearly-opaque syrup should occlude what
 * is behind it, and a wing should not occlude the wing behind it.
 */
export function glazeMaterial(family: Family): THREE.MeshPhysicalMaterial {
  const hit = glazeMaterials.get(family);
  if (hit) return hit;
  const look = FAMILY_LOOK[family];
  const opacity = 1 - look.translucency * 0.34;
  const m = new THREE.MeshPhysicalMaterial({
    color: '#ffffff',
    vertexColors: true,
    roughness: Math.min(0.3, look.partRoughness),
    metalness: 0,
    clearcoat: 1,
    clearcoatRoughness: 0.12,
    transparent: opacity < 0.99,
    opacity,
    depthWrite: opacity > 0.75,
    side: THREE.DoubleSide,
    emissive: new THREE.Color(look.glaze),
    emissiveIntensity: 0.08 + look.glow * 0.34,
  });
  glazeMaterials.set(family, m);
  return m;
}

let sparkGeo: THREE.SphereGeometry | null = null;
/** One shared ball for every sparkle on the page. Four pixels across; six segments is plenty. */
export function sparkGeometry(): THREE.SphereGeometry {
  sparkGeo ??= new THREE.SphereGeometry(1, 7, 5);
  return sparkGeo;
}

const sparkMaterials = new Map<Family, THREE.MeshBasicMaterial>();

/** A mote of light. Unlit and additive, so it looks emitted rather than lit. */
export function sparkMaterial(family: Family): THREE.MeshBasicMaterial {
  const hit = sparkMaterials.get(family);
  if (hit) return hit;
  const m = new THREE.MeshBasicMaterial({
    color: FAMILY_LOOK[family].glaze,
    toneMapped: false,
    transparent: true,
    opacity: 0.9,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  sparkMaterials.set(family, m);
  return m;
}

const irisMaterials = new Map<Family, THREE.MeshStandardMaterial>();

export function irisMaterial(family: Family): THREE.MeshStandardMaterial {
  const hit = irisMaterials.get(family);
  if (hit) return hit;
  // From `look.ts`, and the reason it is worth reusing that file: the darkest value allowed anywhere
  // is a warm brown. A #000 pupil on a saturated toy is what makes a friendly creature look like a
  // plastic doll, and it is the single most common way a cute character misses.
  const m = new THREE.MeshStandardMaterial({
    color: FAMILY_LOOK[family].iris,
    roughness: 0.08,
    metalness: 0,
  });
  irisMaterials.set(family, m);
  return m;
}

let scleraMat: THREE.MeshStandardMaterial | null = null;
export function scleraMaterial(): THREE.MeshStandardMaterial {
  scleraMat ??= new THREE.MeshStandardMaterial({ color: '#fdf8ee', roughness: 0.07, metalness: 0 });
  return scleraMat;
}

let catchMat: THREE.MeshBasicMaterial | null = null;
export function catchlightMaterial(): THREE.MeshBasicMaterial {
  // Unlit on purpose. A catchlight is a reflection of the sky, so it must not go dim when the slime
  // turns away from the sun — that is the whole reason the eyes look wet.
  catchMat ??= new THREE.MeshBasicMaterial({ color: '#ffffff', toneMapped: false });
  return catchMat;
}

/* ============================================================================
   how big one is, in world units
   ========================================================================== */

/**
 * The body height the profile table is authored around.
 *
 * `STAGE_LOOK.size` promises to be "world-units tall", and the profiles are authored in their own units
 * where a family is 1.14 to 1.86 high. Dividing by the middle of that range keeps BOTH true: a crested
 * slime is about one unit tall as the stage table says, and the families still differ in height by the
 * ratios the profile table sets — a fairy is genuinely half again the height of a rock.
 */
const NOMINAL = 1.5;

/** The intended world height at a stage, before the family's own proportion. */
export function stageScale(stage: Stage): number {
  return STAGE_LOOK[stage].size;
}

/** What to scale a baked body by. The one number that turns body units into world units. */
export function worldScale(stage: Stage): number {
  return STAGE_LOOK[stage].size / NOMINAL;
}

/** Exact collision radius for one slime. What the slime itself registers. */
export function slimeRadius(family: Family, stage: Stage = 'crested'): number {
  return GUMDROP[family].width * (1 + Math.max(0, GUMDROP[family].skirt)) * worldScale(stage);
}

/**
 * Collision radius by stage alone, for callers that do not know or care which family they are about
 * to walk into — the player controller, mainly.
 *
 * Returns the WIDEST family at that stage, deliberately. A player who is stopped a hand's width short
 * of a narrow slime has had a good experience; a player who clips into a wide one has not.
 */
export const SLIME_RADIUS: (stage?: Stage) => number = (stage = 'crested') => {
  let widest = 0;
  for (const f of Object.keys(GUMDROP) as Family[]) {
    const r = slimeRadius(f, stage);
    if (r > widest) widest = r;
  }
  return widest;
};

/** World height of a slime, for anything that wants to place a label or a heart over its head. */
export function slimeHeight(family: Family, stage: Stage = 'crested'): number {
  return GUMDROP[family].height * worldScale(stage);
}

export { resolveStage };
