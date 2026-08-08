/**
 * THE GUMDROP — one lathed profile curve per family, baked once and shared by every slime.
 *
 * WHY THIS SUPERSEDES `bodyGeometry` IN `geometry.ts`. That bake starts from a unit icosphere and
 * pushes its vertices around with a waist curve, so however hard it is pushed the result is still a
 * ball with a bias: mass in the middle, tangent to the ground at one point, no base. The note the
 * owner actually gave — "shaped more like gumdrops than spheres and ellipses" — is about the outline,
 * and an outline is a 2D curve. So the curve is authored directly as a 2D curve and revolved:
 * `LatheGeometry` over an explicit profile. Nothing here is derived from a sphere, and the silhouette
 * is exactly the polyline drawn below rather than a sphere's outline with corrections applied.
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
 * The six, pulled apart so that a family survives being a black shape at thirty pixels. No two share
 * both a height class and a mass placement, so no two share a silhouette.
 *
 * READ THE UNITS BEFORE TUNING THESE. `width` is a HALF-width and `height` is a WHOLE height, because
 * that is what a lathe profile needs, and the first two passes of this table were authored as though
 * they were the same kind of number. The result was six creatures around two units wide and one unit
 * tall — pancakes with eyes, which is precisely the "sphere and ellipse" complaint in a new costume.
 *
 * The honest proportion of a real gumdrop is roughly as tall as it is wide, so `height` wants to land
 * near TWICE `width`. Below that the family reads as a pebble; well above it, as a candle. The ratio of
 * height to twice-width is written next to each one, so the next person to touch this table can see the
 * spread at a glance and keep it.
 */
export const GUMDROP: Record<Family, GumdropProfile> = {
  /** Low and very broad, spreading under its own weight like a beanbag. Broadest of the six. 0.66 */
  bellow: { width: 0.95, height: 1.25, shoulder: 3.2, peak: 0.5, skirt: 0.13, fillet: 0.22 },
  /** Taller and narrower, closing to a soft peak. The classic sweet-shop gumdrop. 1.13 */
  rill: { width: 0.72, height: 1.62, shoulder: 2.6, peak: 0.68, skirt: 0.02, fillet: 0.14 },
  /** Squat and chunky. Straightest walls of the six, so it reads as a lump of stone at rest. 0.74 */
  cobble: { width: 0.85, height: 1.25, shoulder: 3.8, peak: 0.55, skirt: 0.07, fillet: 0.26 },
  /**
   * Tall, tapering like a held flame. 1.25
   *
   * Retuned twice: `shoulder: 1.8` tapers in a nearly straight line from the ground up, which renders
   * as a traffic cone. Above about 2.3 the wall leaves the base upright and the taper happens in the
   * top half, which is a flame-shaped GUMDROP rather than a cone.
   */
  ember: { width: 0.72, height: 1.8, shoulder: 2.5, peak: 0.74, skirt: 0.04, fillet: 0.15 },
  /** A round dome, a touch wider than tall. The plainest body: its leaf sprig does the talking. 0.9 */
  fern: { width: 0.8, height: 1.44, shoulder: 2.8, peak: 0.52, skirt: 0.04, fillet: 0.18 },
  /** Tall and slender on a tucked foot, so it looks ready to lift. Narrowest of the six. 1.55 */
  kite: { width: 0.62, height: 1.92, shoulder: 2.2, peak: 0.62, skirt: -0.1, fillet: 0.2 },
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

/* ============================================================================
   the bake
   ========================================================================== */

export interface GumdropBake {
  geometry: THREE.BufferGeometry;
  /** Widest half-width, body units. What a collider needs. */
  halfWidth: number;
  /** Total height, body units. */
  height: number;
  /** Surface half-width at a world-ish height fraction 0..1. Eyes and crests are hung off this. */
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
 */
export function gumdropGeometry(family: Family, detail: 'near' | 'far' = 'near'): GumdropBake {
  const key = `${family}:${detail}`;
  const hit = bodyCache.get(key);
  if (hit) return hit;

  const p = GUMDROP[family];
  const rows = detail === 'near' ? 30 : 14;
  const segments = detail === 'near' ? 48 : 22;
  const pts = gumdropPoints(p, rows);

  const geometry = new THREE.LatheGeometry(pts, segments);
  // Lathe derives its own normals from the profile tangent, which leaves the base disc and the wall
  // disagreeing across the rim. Recomputing averages them, so the fillet reads as one soft turn.
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
 * The jelly, one material per family and shared by every slime of it.
 *
 * `transmission` on a physical material is what makes this read as a sweet rather than as painted
 * plastic, and `sheen` is what puts the soft bloom around the rim. Both are kept off the wildest
 * settings: full transmission turns a saturated body into clear glass and loses the colour, which is
 * the opposite of what a five-year-old needs to sort them by.
 */
export function bodyMaterial(family: Family): THREE.MeshPhysicalMaterial {
  const hit = bodyMaterials.get(family);
  if (hit) return hit;
  const look = FAMILY_LOOK[family];
  const m = new THREE.MeshPhysicalMaterial({
    color: look.skin,
    roughness: 0.26,
    metalness: 0,
    clearcoat: 1,
    // Broadened after the first render: a tight clearcoat put one small hard hotspot on every body,
    // which is the signature of moulded plastic. A softer, larger gleam is what a sweet does.
    clearcoatRoughness: 0.24,
    transmission: 0.26 + look.translucency * 0.22,
    thickness: 1.7,
    // Light that has travelled through the body comes out as the family's INNER colour rather than
    // washing to white, which is what stops a transmissive body from going pale and losing the hue a
    // child sorts by.
    attenuationColor: new THREE.Color(look.inner),
    attenuationDistance: 1.6,
    ior: 1.34,
    sheen: 0.7,
    sheenRoughness: 0.5,
    sheenColor: new THREE.Color(look.rim),
    emissive: new THREE.Color(look.inner),
    // Only ember is genuinely lit from inside; the rest take a whisper of it so the shadow side of a
    // body never falls to a dead flat colour.
    emissiveIntensity: 0.05 + look.glow * 0.3,
  });
  bodyMaterials.set(family, m);
  return m;
}

const crestMaterials = new Map<Family, THREE.MeshStandardMaterial>();

export function crestMaterial(family: Family): THREE.MeshStandardMaterial {
  const hit = crestMaterials.get(family);
  if (hit) return hit;
  const look = FAMILY_LOOK[family];
  const m = new THREE.MeshStandardMaterial({
    color: look.crest,
    roughness: 0.52,
    metalness: 0,
    emissive: new THREE.Color(look.crest),
    emissiveIntensity: look.glow * 0.4,
  });
  crestMaterials.set(family, m);
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
 * where a family is 1.25 to 1.92 high. Dividing by the middle of that range keeps BOTH true: a crested
 * slime is about one unit tall as the stage table says, and the families still differ in height by the
 * ratios the profile table sets — a kite is genuinely half again the height of a bellow.
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
