/**
 * THE SIGNATURE FEATURES — the one thing per family that makes it a WAFFLE and not a yellow blob.
 *
 * THE RULE THIS FILE EXISTS TO SERVE. The owner's note was that the families needed "a clear element,
 * theme, object" each, and the failure mode of that note is a texture: paint a lattice on a gumdrop, call
 * it a waffle, ship six identical silhouettes in six wallpapers. A child sees these from across a ranch,
 * where a texture is four pixels of mush. So every feature in this file is GEOMETRY THAT CHANGES THE
 * OUTLINE, and the test for each one is whether you could name it as a black shape at thirty pixels:
 *
 *   waffle · a wavy syrup drip line round the crown, with a square pat of butter sitting on top. The
 *            block on the skyline is the read; nothing else in the set has a straight-sided anything.
 *   rose   · three rings of overlapping petals, pale at the heart and full pink at the rim, so the crown
 *            becomes a rosette wider than the body under it, plus green sepals splaying at the base.
 *   grass  · a tuft of ten to thirteen thin blades arcing out of the crown, and a daisy on a stem.
 *   rock   · the lowest, broadest body of the six, deliberately with NOTHING tall on it: its shoulder
 *            line is broken by small boulders and low moss mounds and that absence is the identifier.
 *   fairy  · two pairs of ribbed wings, the single strongest silhouette here, on the slenderest body, plus
 *            bulb-tipped antennae and three drifting sparkles.
 *   frost  · a crown of upright ice spires over a wavy rime skirt flared at the ground. Two features,
 *            because spires alone could be read as grass at distance and the skirt could not.
 *
 * A CREST IS A HAT, NOT A LIMB — kept from the previous pass, and it is why the numbers here are smaller
 * than they feel while you are typing them. The face is the charm; a feature exists so the family is
 * identifiable from behind at thirty pixels and that job is done well below the size that looks right in
 * a close-up. Fairy's wings are the deliberate exception, because a wing that does not read as a wing is
 * a fin.
 *
 * NOTHING JAGGED, ANYWHERE. No feature silhouette contains a straight line meeting another straight
 * line. Everything is a swept outline whose thickness falls to zero at the rim, or a solid of revolution
 * whose tip ROUNDS OVER — the ice spires are where that rule is closest to breaking and their profile
 * exponent is chosen so the tip closes like a hemisphere rather than a needle.
 *
 * ─────────────────────────────────────────────────────────────────────────────────────────────────────
 * WHY IT ALL ENDS UP IN ONE BUFFER. A warden rose has sixteen petals and four sepals; a warden grass has
 * thirteen blades and two daisies, each of those a stem, a pollen dome and six petals. As separate meshes
 * that is forty draw calls for one creature, times forty creatures on screen. So the parts are BAKED AND MERGED, once per family per
 * stage, into at most two buffers — one opaque, one translucent — with every part's colour written into a
 * vertex attribute. Twenty-four bakes exist for the life of the page; a slime is two extra draw calls,
 * which is fewer than the five the old crest instancing used.
 */
import * as THREE from 'three';

import type { Family, Stage } from '../contract';
// `GUMDROP` for one reason only: `buildMango` needs the body's `lean` to place a crest on a leaning crown.
import { GUMDROP, bodyOutline } from './gumdrop';
import { FAMILY_LOOK, MIST, POLLEN, STAGE_LOOK } from './look';

/** A one-line description of each family's read, for previews and for anyone grepping. */
export const FAMILY_FEATURE: Record<Family, string> = {
  waffle: 'syrup drip line + butter pat',
  rose: 'petal rosette + sepals',
  grass: 'blade tuft + daisy',
  rock: 'lowest body, boulders + moss',
  fairy: 'two pairs of wings + antennae',
  frost: 'soft rime skirt + round spires',
  air: 'open spiral above, turning',
  bunny: 'two long ears, one flopped',
  lion: 'broad mane ring at the face',
  cat: 'pointed ears + curled tail',
  radioactive: 'trefoil on a post + glowing drips',
  wood: 'one forking branch + two leaves',
  fire: 'licking flame crown, all curling one way',
  ice: 'leaning faceted shard cluster, no skirt',
  gold: 'mirror finish + a five-point crown',
  sleepy: 'flopped nightcap + closed eyes + Z',
  strawberry: 'inverted berry body + green star calyx',
  mango: 'leaning body + one leaf',
  bomb: 'round bauble + brass collar + fuse spark',
};

/**
 * How many sparkles drift near a family.
 *
 * Six families have them now rather than one, and the counts are deliberately small: a mote is unlit
 * additive geometry, so it reads as light and therefore competes with the face for attention. Anything
 * above about four turns a pet into a special effect.
 *
 * `bomb`'s single mote is the odd one out and does not orbit — `Build.sparkAt` pins it to the fuse tip.
 */
export const FAMILY_SPARKS: Record<Family, number> = {
  waffle: 0,
  rose: 0,
  grass: 0,
  rock: 0,
  fairy: 3,
  frost: 0,
  air: 3,
  bunny: 0,
  lion: 0,
  cat: 0,
  radioactive: 4,
  wood: 0,
  fire: 4,
  ice: 2,
  gold: 2,
  sleepy: 0,
  strawberry: 0,
  mango: 0,
  // One, on the end of the fuse, and it is the only anchored spark in the game.
  bomb: 1,
};

/* ============================================================================
   primitives — every one of them smooth on the outline
   ========================================================================== */

/**
 * A closed shell swept from an outline, with a thickness that falls to zero at the rim.
 *
 * `outline(v)` is the half-width at height v along the part, 0 at the root and 1 at the tip. Both faces
 * are generated with opposite winding so the shell is genuinely closed and lights from either side;
 * `curl` bends the tip out of plane, which is what stops a petal or a blade reading as a cardboard cutout
 * stuck into a jelly, and `cup` bows it across its width, which is the difference between a petal and a
 * leaf.
 *
 * At `thickness: 1` the cross-section is a circle rather than a lens, which is how the antennae and the
 * daisy stem are made — one builder, two very different-looking parts.
 */
function lens(
  outline: (v: number) => number,
  thickness: number,
  curl: number,
  cols = 9,
  rows = 14,
  cup = 0,
  /**
   * Row bias toward the TIP. 1 is even spacing; above 1 the rows crowd the last quarter of the part.
   *
   * Needed for anything with a rounded tip, which is most of this file. A petal outline that is still half
   * its width at 86% of its length and zero at 100% is turned by even spacing into one wide triangular
   * chop — the petals looked torn off. Crowding the rows where the outline turns hardest is the same trick
   * `gumdropPoints` uses on the crown of a body, for the same reason.
   */
  bias = 1,
): THREE.BufferGeometry {
  const verts: number[] = [];
  const idx: number[] = [];
  const face = (side: number) => {
    const base = verts.length / 3;
    for (let r = 0; r <= rows; r += 1) {
      const v = bias === 1 ? r / rows : 1 - Math.pow(1 - r / rows, bias);
      const w = outline(v);
      for (let c = 0; c <= cols; c += 1) {
        const u = (c / cols) * 2 - 1;
        const t = thickness * w * Math.sqrt(Math.max(0, 1 - u * u));
        verts.push(u * w, v, side * t + curl * v * v + cup * u * u);
      }
    }
    for (let r = 0; r < rows; r += 1) {
      for (let c = 0; c < cols; c += 1) {
        const a = base + r * (cols + 1) + c;
        const b = a + 1;
        const d = a + cols + 1;
        const e = d + 1;
        if (side > 0) idx.push(a, d, b, b, d, e);
        else idx.push(a, b, d, b, e, d);
      }
    }
  };
  face(1);
  face(-1);
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

/**
 * A solid of revolution with a rounded tip, rising from y = 0 to y = 1.
 *
 * The tip exponent is the whole craft question for the ice spires. A profile of (1 - t^p)^q closes like
 * a hemisphere at q = 0.5 and like a needle as q rises past 1; everything in this file stays at or below
 * 0.5, which is how frost gets crystals without getting spikes.
 */
function spindle(profile: (t: number) => number, rows = 12, segments = 14): THREE.BufferGeometry {
  const pts: THREE.Vector2[] = [new THREE.Vector2(0, 0)];
  for (let i = 1; i <= rows; i += 1) {
    // Samples pushed toward the tip, where the curve turns hardest.
    const t = 1 - Math.pow(1 - i / rows, 1.6);
    pts.push(new THREE.Vector2(Math.max(0.0008, profile(t)), t));
  }
  const g = new THREE.LatheGeometry(pts, segments);
  g.computeVertexNormals();
  return g;
}

/**
 * A ROUND TUBE SWEPT ALONG AN ARBITRARY CURVE, with a taper — the one primitive the thirteen could not
 * be built without.
 *
 * `lens` at thickness 1 already gives a bent tube, but it bends along a fixed parabola (`curl · v²`) and
 * a lot of the new features are defined by the SHAPE OF THEIR CENTRELINE rather than by their outline:
 * air's spiral is a helix, sleepy's nightcap flops over sideways and then hangs, bomb's fuse curls up and
 * over, a cat's tail stands up and hooks. None of those is a parabola, and faking them by rotating a
 * parabola is how you get a fuse that looks like a bent stick.
 *
 * The frame is rebuilt at every row from the local tangent rather than parallel-transported, which is the
 * cheap version and is correct here because none of these curves doubles back on itself. The up-vector
 * fallback is the part that matters: when the tangent is near-vertical — which it is for most of a
 * nightcap and all of a fuse's root — crossing with world up gives a zero-length normal and the whole
 * ring collapses, so it switches reference axis before that happens rather than after.
 *
 * `radius(1)` SHOULD RETURN ZERO through a blunt profile (a `sqrt`-ish falloff, never a linear one), the
 * same rule `spindle` follows: that closes the tip as a dome instead of a needle, and it is the only way
 * this builder stays inside "nothing jagged on a silhouette".
 */
function tube(
  path: (t: number) => [number, number, number],
  radius: (t: number) => number,
  rows = 16,
  segments = 9,
): THREE.BufferGeometry {
  const verts: number[] = [];
  const idx: number[] = [];
  const TAU = Math.PI * 2;
  const P = new THREE.Vector3();
  const A = new THREE.Vector3();
  const B = new THREE.Vector3();
  const Tn = new THREE.Vector3();
  const Nn = new THREE.Vector3();
  const Bn = new THREE.Vector3();
  const up = new THREE.Vector3();

  for (let r = 0; r <= rows; r += 1) {
    const t = r / rows;
    const e = 0.5 / rows;
    P.set(...path(t));
    A.set(...path(Math.max(0, t - e)));
    B.set(...path(Math.min(1, t + e)));
    Tn.subVectors(B, A);
    if (Tn.lengthSq() < 1e-12) Tn.set(0, 1, 0);
    Tn.normalize();
    // The fallback described above: pick whichever reference axis is least parallel to the tangent.
    up.set(0, 1, 0);
    if (Math.abs(Tn.dot(up)) > 0.9) up.set(0, 0, 1);
    Nn.crossVectors(up, Tn).normalize();
    Bn.crossVectors(Tn, Nn).normalize();
    const rad = radius(t);
    for (let c = 0; c <= segments; c += 1) {
      const a = (c / segments) * TAU;
      const cs = Math.cos(a) * rad;
      const sn = Math.sin(a) * rad;
      verts.push(P.x + Nn.x * cs + Bn.x * sn, P.y + Nn.y * cs + Bn.y * sn, P.z + Nn.z * cs + Bn.z * sn);
    }
  }
  for (let r = 0; r < rows; r += 1) {
    for (let c = 0; c < segments; c += 1) {
      const a = r * (segments + 1) + c;
      const b = a + 1;
      const d = a + segments + 1;
      const e2 = d + 1;
      idx.push(a, d, b, b, d, e2);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

/**
 * A weathered stone that is round everywhere: a lumpy potato with no flat spots.
 *
 * Detail 2 rather than 3 — these are props a fifth the size of the body and 320 triangles of smooth
 * normals is indistinguishable from 1280 at that scale, times seven props times forty slimes. The
 * deformation is a single smooth three-lobe field with NO quantising term, which is the mistake the
 * first pass made: a quantised lump field is visibly faceted on the outline, which is the one thing this
 * game may not be.
 */
function stone(squash: number, seed: number): THREE.BufferGeometry {
  const g = new THREE.IcosahedronGeometry(1, 2);
  const p = g.getAttribute('position') as THREE.BufferAttribute;
  const v = new THREE.Vector3();
  for (let i = 0; i < p.count; i += 1) {
    v.fromBufferAttribute(p, i);
    const lump =
      Math.sin(v.x * 2.2 + seed) * Math.sin(v.y * 1.9 + 1.9 + seed) +
      Math.sin(v.z * 2.4 + 2.4) * Math.sin(v.x * 1.6 - 0.6 + seed);
    const r = 1 + 0.1 * lump;
    p.setXYZ(i, v.x * r * 1.08, v.y * r * squash, v.z * r);
  }
  g.computeVertexNormals();
  return g;
}

/**
 * A rounded cube: the pat of butter, and the only straight-sided thing in the whole directory.
 *
 * Built by pushing a SPHERE out toward the cube that contains it rather than by rounding a box, and the
 * reason is normals. A `BoxGeometry` duplicates its vertices along every edge so its faces can have hard
 * normals; round it off and those duplicates stay split, so the "rounded" edge still shades as a crease.
 * A sphere is welded, so blending it toward a cube gives genuinely smooth corners — a pat of butter that
 * has been sitting in warm syrup, which is what this is meant to be.
 */
function roundCube(blend: number): THREE.BufferGeometry {
  const g = new THREE.SphereGeometry(1, 20, 14);
  const p = g.getAttribute('position') as THREE.BufferAttribute;
  const v = new THREE.Vector3();
  for (let i = 0; i < p.count; i += 1) {
    v.fromBufferAttribute(p, i);
    const m = Math.max(Math.abs(v.x), Math.abs(v.y), Math.abs(v.z)) || 1;
    p.setXYZ(
      i,
      v.x * (1 - blend) + (v.x / m) * blend,
      v.y * (1 - blend) + (v.y / m) * blend,
      v.z * (1 - blend) + (v.z / m) * blend,
    );
  }
  g.computeVertexNormals();
  return g;
}

/**
 * A skin that lies ON the body between two heights, with a WAVY lower edge. Syrup, and rime.
 *
 * This is the builder that earns the most, because a wavy edge running around a body is a silhouette
 * feature that costs almost nothing and cannot be mistaken for anything else: the syrup drip line and the
 * frost rime are the same forty-by-six grid with different edge functions.
 *
 * Two things it must get right. The offset is along the PROFILE NORMAL, not radial — radial offset does
 * nothing at all where the surface is horizontal, so a radially-offset syrup cap sinks into the crown it
 * is supposed to be sitting on. And the lower edge is a NARROW TONGUE function rather than a sine: real
 * drips hang in a few places and the line stays high between them, whereas a sine gives an even scallop
 * that reads as a machined edge.
 *
 * It is a single-sided surface, which is why both materials that use it are `DoubleSide`. A closed
 * double-walled shell would double the triangles to hide a seam nobody can see on a 3 mm-thick coating.
 */
function skin(
  radiusAt: (t: number) => number,
  height: number,
  opts: {
    tHigh: number;
    tLow: number;
    tEnd: number;
    lobes: number;
    phase: number;
    offset: number;
    flare: number;
    /**
     * Which end the flare is at. A syrup drip lifts off the body at its own free edge (the default); a
     * rime skirt hugs the body at its wavy top and flares where it reaches the ground, which is the far
     * end of the sweep.
     */
    flareEnd?: boolean;
    segments?: number;
    rows?: number;
  },
): THREE.BufferGeometry {
  const segs = opts.segments ?? 40;
  const rows = opts.rows ?? 6;
  const verts: number[] = [];
  const idx: number[] = [];
  const TAU = Math.PI * 2;

  // Surface point at (angle, t), pushed out along the 2D profile normal by `off`.
  const point = (a: number, t: number, off: number): [number, number, number] => {
    const e = 0.004;
    const r0 = radiusAt(Math.max(0, t - e));
    const r1 = radiusAt(Math.min(1, t + e));
    const dr = r1 - r0;
    const dy = (Math.min(1, t + e) - Math.max(0, t - e)) * height;
    const len = Math.hypot(dr, dy) || 1;
    // Never exactly zero. A sweep that runs to `t = 1` lands every one of its forty segments on the
    // same point at the crown, and a zero-area ring has no normal — which renders as a dark speck on
    // top of the syrup.
    const r = Math.max(0.004, radiusAt(t) + (dy / len) * off);
    const y = t * height + (-dr / len) * off;
    return [Math.sin(a) * r, y, Math.cos(a) * r];
  };

  for (let i = 0; i <= segs; i += 1) {
    const f = i / segs;
    const a = f * TAU;
    // Narrow tongues: cos raised to a power is 1 in a few small windows and ~0 between them.
    const tongue = Math.pow(Math.max(0, Math.cos(f * TAU * opts.lobes + opts.phase)), 2.6);
    const tEdge = opts.tHigh - (opts.tHigh - opts.tLow) * tongue;
    for (let r = 0; r <= rows; r += 1) {
      const v = r / rows;
      const t = tEdge + (opts.tEnd - tEdge) * v;
      const off = opts.offset + opts.flare * Math.pow(opts.flareEnd ? v : 1 - v, 1.6);
      const [x, y, z] = point(a, t, off);
      verts.push(x, y, z);
    }
  }
  for (let i = 0; i < segs; i += 1) {
    for (let r = 0; r < rows; r += 1) {
      const a = i * (rows + 1) + r;
      const b = a + 1;
      const c = a + rows + 1;
      const d = c + 1;
      idx.push(a, c, b, b, c, d);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

/* ============================================================================
   the bake — parts in, two buffers out
   ========================================================================== */

/**
 * Where a part goes: the opaque `trim` mesh, the translucent `glaze` mesh, or `aura`.
 *
 * `aura` IS THE ONE STRUCTURAL ADDITION THE THIRTEEN NEEDED, and it is worth being explicit about the
 * cost because the performance budget is the tightest constraint on this directory.
 *
 * Four families have a part that must move independently of the body: fire's flame crown licks, the
 * radioactive trefoil throbs, air's spiral turns, sleepy's Z drifts upward. A merged buffer cannot do
 * that — the whole point of merging is that everything shares one transform — so those parts go into a
 * THIRD buffer with its own origin, which `Slime.tsx` animates as a single group.
 *
 * That makes those four families three draw calls instead of two. FIFTEEN OF NINETEEN ARE UNAFFECTED and
 * still bake to at most two, because `bake` returns null for an empty layer and the component skips the
 * mesh entirely. So the extra call is paid only by the families that actually animate, and only when one
 * of them is on screen.
 *
 * The aura parts are baked RELATIVE TO `auraOrigin` rather than to the body, so a scale applied to the
 * group happens about the base of the flame instead of about the slime's feet — which is the difference
 * between a flame that licks and a flame that grows out of the floor.
 */
type Layer = 'trim' | 'glaze' | 'aura';

interface Part {
  geo: THREE.BufferGeometry;
  at: THREE.Matrix4;
  layer: Layer;
  /** Flat colour, baked per vertex. */
  color: string;
  /**
   * Optional gradient along the part's own +Y, root to tip, which is what makes a wing look like a
   * membrane and a blade look sun-bleached. Evaluated before the transform, so it does not care how the
   * part is posed.
   */
  to?: string;
  /**
   * Height in local units the gradient spans. Defaults to 1, which is every swept builder's tip; the
   * blobs (`stone`, `roundCube`, spheres) run -1 to 1, so 1 puts the gradient across their top half.
   *
   * MUST NOT BE ZERO. It was, briefly, in three places where a flat colour was wanted — and dividing by
   * it sent every vertex to `Infinity`, which clamps to 1, which silently painted those parts entirely in
   * the DESTINATION colour. That is why the first butter pat rendered white instead of yellow. Omit `to`
   * for a flat colour instead; the guard below makes the mistake harmless either way.
   */
  span?: number;
}

/**
 * Merges a family's parts into one buffer, baking each part's colour into a vertex attribute.
 *
 * Written by hand rather than pulled from `BufferGeometryUtils` because this repo does not ship the
 * three.js examples types, and the whole job is three typed arrays and an index offset.
 */
function bake(parts: Part[]): THREE.BufferGeometry | null {
  if (parts.length === 0) return null;

  let nv = 0;
  let ni = 0;
  const prepared = parts.map((part) => {
    const g = part.geo.clone().applyMatrix4(part.at);
    if (!g.getIndex()) {
      const n = g.getAttribute('position').count;
      g.setIndex(Array.from({ length: n }, (_, i) => i));
    }
    nv += g.getAttribute('position').count;
    ni += g.getIndex()!.count;
    return g;
  });

  const position = new Float32Array(nv * 3);
  const normal = new Float32Array(nv * 3);
  const color = new Float32Array(nv * 3);
  const index = nv > 65535 ? new Uint32Array(ni) : new Uint16Array(ni);

  const from = new THREE.Color();
  const to = new THREE.Color();
  const mix = new THREE.Color();
  let vo = 0;
  let io = 0;

  prepared.forEach((g, k) => {
    const part = parts[k]!;
    const pos = g.getAttribute('position');
    const nrm = g.getAttribute('normal');
    const local = part.geo.getAttribute('position');
    const count = pos.count;
    from.set(part.color);
    to.set(part.to ?? part.color);
    const span = part.span && part.span > 0 ? part.span : 1;

    for (let i = 0; i < count; i += 1) {
      position[(vo + i) * 3] = pos.getX(i);
      position[(vo + i) * 3 + 1] = pos.getY(i);
      position[(vo + i) * 3 + 2] = pos.getZ(i);
      normal[(vo + i) * 3] = nrm.getX(i);
      normal[(vo + i) * 3 + 1] = nrm.getY(i);
      normal[(vo + i) * 3 + 2] = nrm.getZ(i);
      // The gradient reads the UNTRANSFORMED y, so "root to tip" means the part's own root and tip.
      const f = part.to ? Math.min(1, Math.max(0, local.getY(i) / span)) : 0;
      mix.copy(from).lerp(to, f);
      color[(vo + i) * 3] = mix.r;
      color[(vo + i) * 3 + 1] = mix.g;
      color[(vo + i) * 3 + 2] = mix.b;
    }

    const src = g.getIndex()!;
    for (let i = 0; i < src.count; i += 1) index[io + i] = src.getX(i) + vo;
    vo += count;
    io += src.count;
    g.dispose();
  });

  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.BufferAttribute(position, 3));
  out.setAttribute('normal', new THREE.BufferAttribute(normal, 3));
  out.setAttribute('color', new THREE.BufferAttribute(color, 3));
  out.setIndex(new THREE.BufferAttribute(index, 1));
  out.computeBoundingSphere();
  return out;
}

/* ============================================================================
   placement helpers
   ========================================================================== */

/**
 * Matrices are composed explicitly rather than through an Euler, because every part here is placed by an
 * argument of the form "stand it up, lean it out, swing it round the body" and that argument only holds
 * if the order is the one written down. `THREE.Euler`'s own order would work too, and would have to be
 * looked up every time anyone read this file.
 */
function pose(steps: THREE.Matrix4[]): THREE.Matrix4 {
  const m = new THREE.Matrix4();
  for (const s of steps) m.multiply(s);
  return m;
}
const T = (x: number, y: number, z: number) => new THREE.Matrix4().makeTranslation(x, y, z);
const RX = (a: number) => new THREE.Matrix4().makeRotationX(a);
const RY = (a: number) => new THREE.Matrix4().makeRotationY(a);
const RZ = (a: number) => new THREE.Matrix4().makeRotationZ(a);
const S = (x: number, y: number, z: number) => new THREE.Matrix4().makeScale(x, y, z);

/** Deterministic jitter, so a family's parts are irregular but identical every reload. */
function wobble(seed: number): () => number {
  let s = (seed * 2654435761) >>> 0;
  return () => {
    s = (s ^ (s << 13)) >>> 0;
    s = (s ^ (s >>> 17)) >>> 0;
    s = (s ^ (s << 5)) >>> 0;
    return s / 4294967296;
  };
}

/* ============================================================================
   shared part geometry, cached across families and stages
   ========================================================================== */

const shapes = new Map<string, THREE.BufferGeometry>();
function shape(key: string, make: () => THREE.BufferGeometry): THREE.BufferGeometry {
  let hit = shapes.get(key);
  if (!hit) {
    hit = make();
    shapes.set(key, hit);
  }
  return hit;
}

/**
 * A rose petal: broad, round-tipped, and CUPPED across its width so it holds light like a real one.
 *
 * The cup is what makes it a petal rather than a leaf, and it has to be strong — at 0.22 the petals read
 * as flat cards from the front. It also does the overlapping for free: a cupped petal wraps the petal
 * inside it, so a ring of six touches without any of them intersecting.
 */
const petalShape = () =>
  shape('petal', () =>
    lens(
      // A ROUND TIP, which is the difference between a rose and a thistle and took two attempts. Any
      // outline built on `sin(πv)` arrives at the tip as a straight line from both sides — a point — and
      // seven points around a crown is an artichoke. `(1 - v⁴)^0.35` still reaches zero at the tip but
      // reaches it BLUNTLY: at 99% of the length the petal is a third of its widest, so the last of it
      // turns over as a curve. The second factor narrows the root, because a petal is attached, not glued.
      (v) => 0.64 * Math.pow(1 - Math.pow(v, 4), 0.35) * (0.58 + 0.42 * Math.sqrt(v)),
      0.15,
      -0.22,
      // Nine across rather than seven. A petal this wide shows its own polygon at seven, and a straight
      // chord on the rim of a flower is read as a crystal facet — which is the family next door's job.
      9,
      8,
      0.34,
      1.7,
    ),
  );

/** A sepal, and a rose leaf: narrower, drawn to a soft point, curling away from the body. */
const sepalShape = () =>
  shape('sepal', () => lens((v) => 0.34 * Math.pow(Math.sin(Math.PI * Math.min(1, v * 0.9 + 0.1)), 0.55), 0.18, -0.34, 6, 7, 0, 1.4));

/** A blade of grass: widest at the root, tapering, and strongly arched by its curl. */
const bladeShape = () => shape('blade', () => lens((v) => 0.5 * Math.pow(1 - Math.pow(v, 1.6), 0.62), 0.5, 0.42, 3, 7, 0, 1.5));

/** A daisy petal, small and rounded. */
const daisyPetalShape = () =>
  shape('daisyPetal', () => lens((v) => 0.44 * Math.pow(Math.sin(Math.PI * Math.pow(v, 0.7)), 0.8), 0.3, 0.06, 4, 4));

/** A round stalk: `lens` at thickness 1 has a circular cross-section, so this is a bent tube. */
const stalkShape = () => shape('stalk', () => lens((v) => 0.055 * (1 - v * 0.35), 1, 0.16, 6, 5));

/** An antenna: thinner, longer, curled harder, with the bulb added separately. */
const antennaShape = () => shape('antenna', () => lens((v) => 0.032 * (1 - v * 0.5), 1, 0.3, 5, 6));

/** A wing rib: a hair-thin round tube, tapering, with the same curl as the membrane it lies on. */
const ribShape = () => shape('rib', () => lens((v) => 0.5 * (1 - v * 0.72), 1, 0.13, 4, 5));

/** A wing: a broad rounded membrane, very thin, with a blunt tip and a slight lift out of plane. */
const wingShape = () =>
  shape('wing', () =>
    lens((v) => 0.54 * Math.pow(1 - Math.pow(v, 3.4), 0.4) * (0.62 + 0.38 * Math.pow(v, 0.4)), 0.05, 0.12, 8, 9, 0, 1.6),
  );

/** An ice spire. Exponent 0.46 on the outside is what rounds the tip instead of pointing it. */
const spireShape = () => shape('spire', () => spindle((t) => 0.17 * Math.pow(Math.max(0, 1 - Math.pow(t, 2.4)), 0.46), 10, 14));

/** The pollen dome at the middle of a daisy. */
const pollenShape = () => shape('pollen', () => spindle((t) => 0.5 * Math.sqrt(Math.max(0, 1 - t * t)), 5, 10));

const boulderShape = () => shape('boulder', () => stone(0.84, 0.7));
const mossShape = () => shape('moss', () => stone(0.66, 2.3));
const butterShape = () => shape('butter', () => roundCube(0.82));
const bulbShape = () => shape('bulb', () => new THREE.SphereGeometry(1, 8, 6));

/* ----------------------------------------------------------------------------------------------------
   SHAPES FOR THE THIRTEEN.

   All cached in the same `shapes` map as the six's, so a shape shared by two families — the round tuft
   that is a bunny's tail AND a lion's tail tip AND a nightcap's pom-pom, the broad leaf that is wood's
   and mango's — is built once for the page no matter how many families or stages want it.
   -------------------------------------------------------------------------------------------------- */

/**
 * AIR's spiral: a tapered tube swept along a helix of one and a half turns.
 *
 * The radius goes to zero at BOTH ends, which is what makes it a wisp of moving air rather than a spring.
 * One and a half turns is the count that reads as a spiral from every angle — at one turn it looks like a
 * bent hoop from the side, and past two it closes up into a solid cylinder of coil at any distance.
 */
const helixShape = () =>
  shape('helix', () =>
    tube(
      (t) => {
        const a = t * Math.PI * 3.1;
        const rr = 0.52 * (1 - t * 0.36);
        return [Math.sin(a) * rr, t, Math.cos(a) * rr];
      },
      (t) => 0.115 * Math.pow(Math.sin(Math.PI * Math.pow(t, 0.72)), 0.55),
      34,
      7,
    ),
  );

/**
 * A BUNNY EAR. Long, narrow, cupped, and blunt at the tip.
 *
 * The proportion is the whole thing: at anything under about three times as long as it is wide an "ear"
 * is a leaf. The `cup` is high (0.5) because a real ear is a channel, and the cup is also what catches a
 * different amount of light on each ear and stops the pair reading as one flat shape.
 */
const earLongShape = () =>
  shape('earLong', () =>
    // `cup` came down from 0.5 to 0.28 with the lighting fix in `buildBunny`: a deeply cupped ear presents
    // mostly its inner channel, which is self-shadowed, and a flatter one presents its broad face to the
    // sky. It is still visibly a channel rather than a card.
    lens((v) => 0.3 * Math.pow(1 - Math.pow(v, 3.4), 0.4) * (0.52 + 0.48 * Math.sqrt(v)), 0.3, 0.16, 6, 13, 0.28, 1.6),
  );

/** A CAT EAR: wide at the base, short, drawn to a tip that still rounds over. Nothing jagged. */
const earTriShape = () =>
  shape('earTri', () => lens((v) => 0.52 * Math.pow(1 - Math.pow(v, 1.5), 0.42), 0.34, 0.06, 6, 8, 0.24, 1.5));

/** A LION EAR: a small round tab, mostly buried in the mane. */
const earRoundShape = () =>
  shape('earRound', () => lens((v) => 0.44 * Math.pow(Math.sin(Math.PI * (v * 0.82 + 0.18)), 0.5), 0.5, 0.1, 5, 6, 0.2));

/** A MANE LOCK: a tapered, slightly curled tuft with a blunt end. Many of these make the halo. */
const maneLockShape = () =>
  shape('maneLock', () =>
    /**
     * WIDENED FROM 0.36 TO 0.54 AFTER THE FIRST RENDER, where the lion came back as a dead spider: a ring
     * of thin dark spikes radiating off a body, with grass visible between every one of them.
     *
     * It is exactly the failure rose's petals had, and it has the same cause and the same fix — A MANE IS A
     * MASS, NOT A FRINGE, and a mass requires that neighbouring pieces OVERLAP. At 0.36 wide, fourteen
     * locks around a body of this radius left gaps between them, and the outline the eye then reads is the
     * gaps rather than the halo. Half again as wide and they touch, and the silhouette closes into one
     * broad soft shape.
     */
    lens((v) => 0.54 * Math.pow(1 - Math.pow(v, 2.2), 0.45) * (0.72 + 0.28 * Math.sqrt(v)), 0.6, 0.3, 6, 8, 0.12, 1.4),
  );

/**
 * A TAIL that stands up and hooks forward — the question-mark curl, and half of cat's identification.
 *
 * `y` eases off toward the top and `z` accelerates, so the curl happens in the last third instead of the
 * whole tail being one bland arc. That is what makes it read as a cat's tail rather than as a handle.
 */
const tailShape = () =>
  shape('tail', () =>
    tube(
      (t) => [0, Math.sin(t * 1.36) / Math.sin(1.36), 0.46 * ((1 - Math.cos(t * 2.3)) / (1 - Math.cos(2.3)))],
      (t) => 0.115 * (1 - 0.42 * t) * Math.pow(Math.max(0, 1 - Math.pow(t, 7)), 0.4),
      18,
      8,
    ),
  );

/** A soft round tuft: a bunny's tail, a lion's tail tip, a nightcap's pom-pom. Lumpy, so it reads fluffy. */
const tuftShape = () => shape('tuft', () => stone(0.92, 5.1));

/**
 * ONE LOBE OF THE TREFOIL. Zero width at the hub, fanning out, blunt at the rim: a fat rounded sector.
 *
 * Three of these at 120° on a short post is the radiation trefoil, and it is the only SYMBOL in the game.
 * It survives being a 3D object — rather than a flat badge that would vanish edge-on — because the lobes
 * are thick (`thickness: 0.5`) and splayed slightly upward, so from any angle you see two or three of
 * them and the three-lobed arrangement is unmistakable.
 */
const trefoilLobeShape = () =>
  shape('trefoilLobe', () => lens((v) => 0.6 * Math.pow(v, 0.42) * Math.pow(1 - Math.pow(v, 7), 0.38), 0.5, 0, 7, 8));

/** A short stub of a post, for the trefoil to sit on and the crown band to stand off. */
const postShape = () => shape('post', () => tube((t) => [0, t, 0], (t) => 0.095 * (1 - 0.22 * t), 5, 8));

/** A WOODY TWIG: a gently curving taper. Used three times — one trunk, two forks — to make the branch. */
const twigShape = () =>
  shape('twig', () =>
    tube(
      (t) => [0.13 * t * t, t, 0.05 * t],
      (t) => 0.1 * Math.pow(Math.max(0, 1 - Math.pow(t, 3.4)), 0.34) * (1 - 0.32 * t),
      10,
      7,
    ),
  );

/** A BROAD LEAF, blunt at both ends and bowed across its width. wood's pair, and mango's single one. */
const leafShape = () =>
  shape('leaf', () =>
    lens((v) => 0.42 * Math.pow(Math.sin(Math.PI * Math.pow(v, 0.82)), 0.7), 0.15, -0.2, 7, 9, 0.22, 1.4),
  );

/**
 * A FLAME, AND THIS IS THE ONE SHAPE IN THE FILE THAT HAD A BRIEF OF ITS OWN: "reads as flame, not a cone".
 *
 * A cone's outline is a straight line. A flame's outline is an S, and it is an S for a physical reason —
 * the burning gas necks in above the fuel and swells again as it expands. So the outline is a taper
 * MULTIPLIED BY A SINE: wide at the root, pinched at about 40% of the height, swelling again at 65%, then
 * drawn off to a blunt tip. That, plus a hard `curl` so the whole thing leans over, is the difference
 * between fire and a party hat, and it is entirely in these two lines.
 *
 * The tip is blunt (`0.45` exponent) like every other tip here, which sounds wrong for fire and is not:
 * a needle-sharp flame tip is one pixel wide at any distance a child sees it, so it contributes nothing to
 * the silhouette and only risks the "nothing jagged" rule. The CURL is what reads as licking, not the point.
 */
const flameShape = () =>
  shape('flame', () =>
    lens(
      (v) =>
        Math.max(
          0.001,
          0.23 * Math.pow(Math.max(0, 1 - Math.pow(v, 2.6)), 0.45) * (1 + 0.5 * Math.sin(v * Math.PI * 2.1 - 0.42)),
        ),
      /**
       * NARROWED HARD AND CURLED HARDER AFTER THE FIRST RENDER, and this is the correction worth recording
       * because the first attempt failed in a specific, predictable way: at 0.38 wide with a 0.58 curl,
       * fire rendered as a TULIP. Broad, flat, pale petals standing in a ring — a flower, unmistakably.
       *
       * Three things were wrong and all three were about width. A flame is much narrower than it is tall,
       * so the outline came down from 0.38 to 0.23. A flame is nearly round in cross-section rather than
       * leaf-flat, so `thickness` went the other way, from 0.62 up to 0.72 — a wide THIN thing is a petal
       * and a narrow THICK thing is a tongue of gas. And the curl went from 0.58 to 0.95, because the
       * single most flame-like property available is that the tip bends away hard, and at 0.58 it barely
       * leaned. Same shape function, three numbers, completely different object.
       */
      0.72,
      0.95,
      7,
      14,
      0.06,
      1.5,
    ),
  );

/**
 * AN ICE SHARD. A prism, not a spindle: SIX radial segments instead of fourteen.
 *
 * This is how ice looks faceted while staying smooth-shaded, which is the constraint the brief set. Six
 * segments with averaged vertex normals gives a form whose SILHOUETTE has flat sides and whose SHADING is
 * continuous — no hard normal breaks anywhere, nothing to catch a highlight on an edge. The tip still
 * rounds over at exponent 0.44, exactly as frost's spires do, so a child cannot be poked by it.
 *
 * Against `spireShape`, which is frost's: that one is round (fourteen segments), fatter, and symmetric.
 * This one is angular, narrower and always used in an unmatched cluster.
 */
const shardShape = () =>
  // Fattened from 0.2 after the second render, where the cluster read as two thin BLADES — close enough to
  // a bunny ear and a frost spire to be a problem. A crystal is chunky; a blade is not. At 0.3 the six flat
  // sides are wide enough to catch distinct highlights, which is what actually sells "faceted".
  shape('shard', () => spindle((t) => 0.3 * Math.pow(Math.max(0, 1 - Math.pow(t, 2.0)), 0.44), 9, 6));

/** GOLD's crown: the band it stands on, a rounded point, and a bead for the top of each point. */
const crownBandShape = () => shape('crownBand', () => new THREE.TorusGeometry(1, 0.14, 7, 26));
const crownPointShape = () =>
  shape('crownPoint', () => spindle((t) => 0.3 * Math.pow(Math.max(0, 1 - Math.pow(t, 1.8)), 0.5), 7, 9));

/**
 * SLEEPY's NIGHTCAP: a wide soft cone whose centreline FLOPS SIDEWAYS AND THEN DROPS.
 *
 * The only feature in the game that hangs out past the body's own silhouette on one side, which is
 * precisely why it was chosen — it makes sleepy the only asymmetric outline apart from mango's lean, and
 * unlike a lean it is unmistakable even head-on. `y` rises, peaks and comes back down while `x` runs away
 * from the head, so the cap has a real bend in it rather than being a straight cone pointed sideways.
 */
const nightcapShape = () =>
  shape('nightcap', () =>
    tube(
      (t) => [0.92 * Math.pow(t, 1.55), 0.6 * (Math.sin(t * 1.5) / Math.sin(1.5)) - 0.34 * Math.pow(t, 3.2), 0.1 * t * t],
      (t) => 0.4 * (1 - t * 0.9) * Math.pow(Math.max(0, 1 - Math.pow(t, 9)), 0.34),
      18,
      10,
    ),
  );

/** BOMB's fuse: a rope that leaves the collar, leans over and straightens. */
const fuseShape = () =>
  shape('fuse', () =>
    tube(
      (t) => [0.36 * Math.sin(t * 2.1), t, 0.06 * Math.sin(t * 3.4)],
      // Thickened from 0.06 after the first render, where the fuse was a hairline at any distance and bomb
      // read as a plain dark ball. A cartoon fuse is a ROPE, and rope is thick.
      (t) => 0.085 * (1 - 0.22 * t) * Math.pow(Math.max(0, 1 - Math.pow(t, 12)), 0.34),
      14,
      8,
    ),
  );

/** BOMB's brass collar: a chunky ring at the top, which is most of what makes it a cartoon bauble. */
const collarShape = () => shape('collar', () => new THREE.TorusGeometry(1, 0.3, 7, 18));

/**
 * A CHEEK. A flattened ellipsoid of blush, and the only one in the game.
 *
 * It exists for `bomb` alone and it is the single most effective thing in this file per triangle spent:
 * two soft rosy patches under big eyes is the whole visual grammar of "this is a friendly cartoon", and it
 * is what took bomb from reading as a prop to reading as a pet.
 */
const cheekShape = () => shape('cheek', () => new THREE.SphereGeometry(1, 10, 7));

/** STRAWBERRY's calyx leaf: narrow, pointed-but-blunt, splaying out and slightly down. */
const calyxLeafShape = () =>
  shape('calyxLeaf', () =>
    lens((v) => 0.3 * Math.pow(1 - Math.pow(v, 1.7), 0.42) * (0.66 + 0.34 * Math.sqrt(v)), 0.13, -0.16, 5, 8, 0.16, 1.4),
  );

/** One stroke of SLEEPY's floating Z. A rounded bar, so the letter has no sharp corners anywhere. */
const zBarShape = () => shape('zBar', () => roundCube(0.55));

/* ============================================================================
   the six
   ========================================================================== */

interface Build {
  family: Family;
  /** Feature scale from the stage table, already clamped. */
  k: number;
  /** Feature count from the stage table. */
  n: number;
  height: number;
  radiusAt: (t: number) => number;
  parts: Part[];
  /**
   * Where the `aura` layer's own origin sits, in body units. Whatever a builder puts in the aura layer is
   * re-based to this point, so `Slime.tsx` can scale or spin the group about something meaningful — the
   * root of the flames, the hub of the trefoil, the bottom of the spiral.
   */
  auraOrigin: [number, number, number];
  /**
   * Where a family's sparkles should hang, in body units, if they are anchored to a POINT rather than
   * orbiting the whole body.
   *
   * Added for `bomb`, whose one spark belongs on the tip of its fuse and nowhere else. Everything else
   * that sparkles — fairy, air, fire, radioactive, ice, gold — leaves this undefined and gets the
   * original orbit, which is what those families want.
   */
  sparkAt?: [number, number, number];
}

function push(b: Build, layer: Layer, geo: THREE.BufferGeometry, at: THREE.Matrix4, color: string, to?: string, span?: number) {
  b.parts.push({ geo, at, layer, color, to, span });
}

/**
 * WAFFLE. A wavy line of syrup poured over the crown, and a pat of butter sitting in it.
 *
 * The syrup is the silhouette feature and the butter is the identifier: a square-cornered block on a
 * skyline of round creatures is unmistakable at any size, and it is the one straight-sided form in the
 * whole game. The lattice itself lives in `gumdrop.ts`, pressed into the shared body buffer, because a
 * pattern that wraps a body belongs to the body.
 */
function buildWaffle(b: Build) {
  const look = FAMILY_LOOK.waffle;
  // Syrup. `tEnd: 1` runs it right over the crown; the drip tongues hang to just above the eyes.
  //
  // THE HEIGHT OF THIS BAND WAS THE FIRST THING THE SCREENSHOTS CORRECTED. Set at 0.84 the syrup covered
  // only the very top of a squat body, and a squat body seen from a child's eye height shows almost none
  // of its top — the waffle rendered as a waffle with a brown smudge somewhere behind its head. It has to
  // start low enough to be on the part of the body you can actually SEE from the ground, which is the
  // shoulder. `tLow` is then bounded from below by THE FACE: the eyes sit at t = 0.5 and stand proud of
  // the hide, so a tongue reaching that far runs through one and the slime appears to weep syrup.
  push(
    b,
    'glaze',
    skin(b.radiusAt, b.height, {
      tHigh: 0.7,
      tLow: 0.56,
      tEnd: 1,
      lobes: 8,
      phase: 0.6,
      offset: 0.026,
      flare: 0.01,
      rows: 6,
    }),
    new THREE.Matrix4(),
    look.glaze,
    '#c9761f',
    b.height,
  );

  // Butter, sitting slightly off-centre and slightly askew, because a pat placed dead centre and square
  // to the world reads as a machine part rather than as something dropped on a warm waffle. The gradient
  // runs up its own height, so the top face catches more light — a pat that has begun to soften.
  const size = 0.4 * (0.72 + 0.28 * b.k);
  push(
    b,
    'trim',
    butterShape(),
    pose([T(size * 0.2, b.height + size * 0.3, -size * 0.08), RY(0.42), RX(0.08), RZ(0.05), S(size, size * 0.44, size)]),
    look.crest,
    // A pale CREAM, not white. The first pass ran the gradient to `#fffbe2`, which on the top face — the
    // only face a low camera sees — is white, and a white block on a waffle is a sugar cube.
    '#fdefac',
    1,
  );
}

/**
 * ROSE. Three rings of petals wrapping the crown, and sepals splaying at the base.
 *
 * THE READ IS THE RING COUNT, and the tuning that matters is that the OUTER ring leans furthest and is
 * darkest while the inner ring stands nearly upright and is lightest. That single gradient is what turns
 * a ring of petals into a flower with a middle; petals all one colour and all one angle read as a collar.
 */
function buildRose(b: Build) {
  const look = FAMILY_LOOK.rose;
  /**
   * Three rings, and every column of this table was moved by the first render.
   *
   * WHAT WENT WRONG AND WHY IT IS INSTRUCTIVE. The first pass had small petals, the outer ring in the
   * body's own dark `skin`, and leans up to 1.05. What came back was a dark spiky thing — an artichoke,
   * or a thistle. Three separate causes, all of them about a rose being a MASS rather than a fringe:
   *
   *   SIZE. Petals must overlap. Petals that do not touch read as separate spikes however round each one
   *   is, and the outline they make is the gaps, not the flower. Every ring got half again as big.
   *   VALUE. A rose is LIGHTEST IN THE MIDDLE. Painting the outer ring in the body colour did the exact
   *   opposite and buried the centre. The rings now run pale-cream at the heart out to full pink at the
   *   rim, which is also what makes the layering legible at distance.
   *   LEAN. Past about 1.1 radians a petal is horizontal, and a ring of horizontal petals is a collar, a
   *   ruff, a shuttlecock. Capped at 0.95 the outer ring still cups upward and the rosette reads as one
   *   bowl with a middle.
   */
  const rings: { count: number; t: number; inset: number; lean: number; size: number; from: string; to: string }[] = [
    { count: 3, t: 1.02, inset: 0.14, lean: 0.1, size: 0.5, from: MIST, to: '#ffe0ec' },
    { count: 5, t: 0.96, inset: 0.42, lean: 0.42, size: 0.66, from: '#ffe0ec', to: '#ffb6d2' },
    {
      count: Math.max(6, Math.min(8, b.n + 3)),
      t: 0.86,
      inset: 0.66,
      lean: 0.7,
      size: 0.82,
      from: '#ffb6d2',
      to: '#fb87ae',
    },
  ];

  for (const [ri, ring] of rings.entries()) {
    const r = b.radiusAt(ring.t) * ring.inset;
    for (let i = 0; i < ring.count; i += 1) {
      // Each ring is rotated off the one below it so petals cover the gaps rather than stacking into
      // spokes, which is the difference between a rosette and a cog.
      const a = (i / ring.count) * Math.PI * 2 + ri * 0.7;
      const size = ring.size * b.k;
      push(
        b,
        'trim',
        petalShape(),
        pose([T(Math.sin(a) * r, b.height * ring.t, Math.cos(a) * r), RY(a), RX(ring.lean), S(size, size * 1.1, size)]),
        ring.from,
        ring.to,
        1,
      );
    }
  }

  /**
   * Sepals: four, low, swept down and out so they break the base outline into soft points.
   *
   * FOUR AT FORTY-FIVE DEGREES, never five, and the reason is worth the line. Five sepals at an arbitrary
   * offset put one of them pointing straight at the camera on a body whose eyes are directly above it,
   * and a dark leaf-shaped wedge centred under two big eyes is read as an OPEN MOUTH. The rose looked
   * appalled. Four on the diagonals leaves the centre line clear from the front and from the side.
   */
  const st = 0.13;
  const sr = b.radiusAt(st) * 0.86;
  for (let i = 0; i < 4; i += 1) {
    const a = Math.PI / 4 + (i * Math.PI) / 2;
    const size = 0.46 * b.k;
    push(
      b,
      'trim',
      sepalShape(),
      pose([T(Math.sin(a) * sr, b.height * st, Math.cos(a) * sr), RY(a), RX(1.72), S(size, size * 1.25, size)]),
      look.trim,
      '#8fc46b',
      1,
    );
  }
}

/**
 * GRASS. A tuft of thin blades out of the crown, and a daisy on a stem among them.
 *
 * The blades must be MANY and THIN. Six fat ones read as a pineapple top; twelve thin ones read as
 * grass, and the cost of that is trivial because a blade is sixty triangles. Every blade gets its own
 * length, lean and twist from the deterministic wobble, because a tuft where all blades are the same
 * length is a crown, and a crown is the wrong object.
 */
function buildGrass(b: Build) {
  const look = FAMILY_LOOK.grass;
  const rng = wobble(11);
  const blades = Math.min(13, 6 + Math.round(b.n * 1.4));

  for (let i = 0; i < blades; i += 1) {
    // Golden-angle spacing, so however many blades there are they never line up into rows.
    const a = i * 2.399963 + 0.4;
    const t = 0.86 + rng() * 0.12;
    const r = b.radiusAt(t) * (0.15 + rng() * 0.62);
    const len = (0.52 + rng() * 0.52) * b.k;
    const lean = 0.12 + rng() * 0.5 + r * 0.5;
    const wide = 0.16 + rng() * 0.07;
    push(
      b,
      'trim',
      bladeShape(),
      pose([
        T(Math.sin(a) * r, b.height * t, Math.cos(a) * r),
        RY(a),
        RX(lean),
        RZ((rng() - 0.5) * 0.5),
        S(wide, len, wide),
      ]),
      // Two greens, mixed at random, and both of them LIGHTER than the body. The first pass used the
      // dark `accent` for four blades in ten and the tuft went to a dark mass against the sky; a blade
      // needs to be brighter than the mound it grows out of or the silhouette closes up.
      rng() < 0.4 ? look.crest : '#9ad95c',
      look.inner,
      1,
    );
  }

  // The daisy. One at every stage — a pip with a daisy is the single most charming thing in the set —
  // and a second one once the slime is big enough to carry it.
  const daisies = b.n >= 5 ? 2 : 1;
  for (let d = 0; d < daisies; d += 1) {
    const a = 1.1 + d * 2.6;
    const t = 0.84;
    const r = b.radiusAt(t) * 0.55;
    const lean = 0.5 + d * 0.15;
    const len = 0.46 * b.k;
    const root = pose([T(Math.sin(a) * r, b.height * t, Math.cos(a) * r), RY(a), RX(lean)]);
    push(b, 'trim', stalkShape(), pose([root.clone(), S(len, len, len)]), look.accent, look.crest, 1);

    // The head sits at the top of the stalk, tipped back so it faces the sky rather than the horizon.
    // The z offset is the stalk's own curl: `lens` bends its tip by `curl * v²`, so the tip of a stalk
    // scaled by `len` is at (0, len, 0.16 · len) and a head placed at (0, len, 0) floats off the end.
    const head = pose([root.clone(), T(0, len * 0.98, len * 0.16), RX(-lean * 0.7)]);
    // Bigger than it feels while typing: at 0.3 the daisy was four pixels of white in the tuft and might
    // as well not have been modelled. It is the up-close reward and it has to be findable.
    const hs = 0.42 * b.k;
    push(b, 'trim', pollenShape(), pose([head.clone(), S(hs * 0.42, hs * 0.3, hs * 0.42)]), POLLEN, look.crest, 1);
    for (let i = 0; i < 6; i += 1) {
      const pa = (i / 6) * Math.PI * 2;
      push(
        b,
        'trim',
        daisyPetalShape(),
        pose([head.clone(), RY(pa), RX(-Math.PI / 2 + 0.34), T(0, hs * 0.16, 0), S(hs * 0.5, hs, hs * 0.5)]),
        MIST,
        look.trim,
        1,
      );
    }
  }
}

/**
 * ROCK. Boulders on the shoulder and low moss mounds on the upward faces.
 *
 * The only family whose identification is mostly its BODY — lowest and broadest of the six, with nothing
 * tall on it — so everything here is deliberately low and wide. A tall prop on a rock would make it read
 * as some other family wearing grey. The moss on the hide is baked into the body's vertex colours in
 * `gumdrop.ts`; these mounds are the parts of it thick enough to break the outline.
 */
function buildRock(b: Build) {
  const look = FAMILY_LOOK.rock;
  const rng = wobble(29);
  const rocks = Math.min(4, 2 + Math.round(b.n * 0.4));

  for (let i = 0; i < rocks; i += 1) {
    // Swept from one flank round the back to the other, so at least one is in view from any angle, and
    // asymmetrically, because a matched pair either side of a head reads as EARS whatever it is made of.
    const a = Math.PI + 0.5 + ((i - (rocks - 1) / 2) / Math.max(1, rocks)) * 2.6 + rng() * 0.3;
    const t = 0.6 + rng() * 0.28;
    const r = b.radiusAt(t) * (0.82 + rng() * 0.18);
    const size = (0.28 + rng() * 0.16) * b.k;
    push(
      b,
      'trim',
      boulderShape(),
      pose([T(Math.sin(a) * r, b.height * t, Math.cos(a) * r), RY(a * 1.7), RZ(rng() * 0.5 - 0.25), S(size, size, size)]),
      // Dark at the bottom, lighter on top, which is how a stone sitting in daylight reads — and the
      // right way round only because `span` is now 1 rather than 0. At 0 the whole boulder took the
      // destination colour and rock wore a set of near-black lumps.
      look.accent,
      look.crest,
      1,
    );
  }

  /**
   * Moss mounds on the crown — and the placement rule here is the one real bug this file had.
   *
   * A PROP THAT SITS ON A SURFACE MUST TAKE THAT SURFACE'S FULL RADIUS. The first pass placed each mound
   * at `radiusAt(t) * (0.1 … 0.72)`, i.e. at the height of one point on the profile but pulled in toward
   * the axis — and on a body as broad-crowned as rock's, the surface directly above that inner point is
   * two tenths HIGHER. Every mound was therefore sunk inside the body and rock shipped with no moss at
   * all, which took a probe of the baked vertex colours to believe: the moss was there, it was green, and
   * it was underground. So the radius is now the surface radius, the SPREAD comes from varying `t` toward
   * the crown instead, and each mound is lifted by a fraction of its own size to be sure it breaks the
   * hide. Rock's boulders never had the bug because they were always placed at 0.82–1.0 of the radius.
   */
  // Several small clumps rather than a few big ones. At `stone(0.42)` and 0.42 across, a mound was a flat
  // green disc lying on the crown — a lily pad, not moss. Moss is LUMPY and it is many.
  const mounds = Math.min(7, 4 + Math.round(b.n * 0.7));
  for (let i = 0; i < mounds; i += 1) {
    const a = i * 2.399963 + 1.7;
    // Scattered across the whole crown rather than banded round it. At a narrow radius band the mounds
    // came out in a neat spiral line, which read as a row of something rather than as moss.
    const t = 0.78 + rng() * 0.2;
    const r = b.radiusAt(t) * (0.42 + rng() * 0.54);
    const size = (0.17 + rng() * 0.11) * b.k;
    push(
      b,
      'trim',
      mossShape(),
      pose([T(Math.sin(a) * r, b.height * t + size * 0.22, Math.cos(a) * r), RY(a), S(size, size * 0.85, size)]),
      look.trim,
      '#a8d16c',
      1,
    );
  }
}

/**
 * FAIRY. Two pairs of wings, and bulb-tipped antennae.
 *
 * WINGS ARE THE ONE PLACE THE "A CREST IS A HAT" RULE IS SUSPENDED. A wing shorter than about half the
 * body reads as a fin or a flipper; it has to be big enough to look like it does the work of carrying the
 * creature, which is why the upper pair is nearly as long as the body is tall. What keeps it from
 * dominating the face is that a wing is EDGE-ON from the front — it is a membrane five hundredths thick,
 * so the front view is two hairlines and the face has the frame to itself, while the three-quarter and
 * side views (which is most of a wandering slime) are unmistakably winged.
 *
 * The pose composition is worth reading once: swing the wing's plane round to face sideways, lean its
 * span backward, then splay it outward. Done in that order the four wings sweep up and back like a
 * dragonfly at rest rather than sticking out like aeroplane wings.
 */
function buildFairy(b: Build) {
  const look = FAMILY_LOOK.fairy;
  /**
   * ROOTED LOW, AND LONG. The first pass rooted the upper pair at t = 0.62 with a length just under the
   * body height and the fairy came back wearing two small leaves near the top of its head — rabbit ears,
   * the exact failure the old `fin` crest had. Two fixes, both geometric rather than a matter of taste:
   *
   *   ROOT AT THE SHOULDER, not the crown. A wing hinges where a back is, which on a body this shape is
   *   just above its widest point. Rooted high, a wing has nothing under it and reads as an ear.
   *   OVERSIZE THEM. A wing shorter than the body reads as a flipper. The upper pair is now 1.3 body
   *   units against a body of 1.86 — big enough that the outline is a winged creature and not a slime
   *   with growths, and affordable because a wing is edge-on from the front and costs 288 triangles.
   */
  const pairs = [
    { t: 0.44, len: 1.32, lean: 0.42, splay: 0.3, back: 0.26 },
    { t: 0.32, len: 0.92, lean: 1.02, splay: 0.46, back: 0.2 },
  ];

  for (const p of pairs) {
    const r = b.radiusAt(p.t);
    for (const side of [-1, 1] as const) {
      const len = p.len * (0.72 + 0.28 * b.k);
      push(
        b,
        'glaze',
        wingShape(),
        pose([
          T(side * r * 0.82, b.height * p.t, -r * p.back),
          RZ(side * -p.splay),
          RX(-p.lean),
          // SIXTY-SIX DEGREES, NOT NINETY, and this is the line that turned four blades into two wings.
          // At a right angle the wing plane faces dead sideways, which is anatomically what an insect
          // does and visually a disaster: from in front — where a child stands, and where every portrait
          // of a slime is taken — a wing is then one pixel of edge and reads as a spike growing out of a
          // shoulder. Rolled back to 66° it still sweeps back along the body, but a third of its area
          // faces the viewer, so the front view is winged and the side view is unchanged.
          RY(side * 0.98),
          S(len * 0.78, len, len * 0.78),
        ]),
        // Brighter than the body and running to near-white at the tip, because a membrane at half opacity
        // over grass takes the grass's green with it and a wing the colour of the body reads as a fin.
        '#e2caff',
        '#fdf6ff',
        1,
      );

      /**
       * TWO RIBS PER WING, and they are what stops a wing looking like a freezer bag.
       *
       * A membrane at two-thirds opacity with nothing inside it is a flat translucent smear — there is no
       * feature anywhere on it for the eye to fix on, so it reads as plastic sheet rather than as a wing.
       * Two thin opaque ribs sweeping down the span cost eighty triangles each and give it a structure a
       * child recognises from every butterfly they have seen. They go in the OPAQUE layer on purpose: a
       * translucent rib inside a translucent membrane is invisible, which is the whole problem again.
       */
      for (const rib of [0.16, -0.3]) {
        push(
          b,
          'trim',
          ribShape(),
          pose([
            T(side * r * 0.82, b.height * p.t, -r * p.back),
            RZ(side * -p.splay),
            RX(-p.lean),
            RY(side * 0.98),
            RZ(rib),
            S(len * 0.06, len * 0.94, len * 0.06),
          ]),
          look.crest,
          look.trim,
          1,
        );
      }
    }
  }

  // Antennae, leaning back off the crown, with a glowing bead on each tip. Small, and the reason they
  // are here at all is the front view: with the wings edge-on, these are what says "fairy" head-on.
  const at = 0.94;
  const ar = b.radiusAt(at);
  for (const side of [-1, 1] as const) {
    const len = 0.52 * b.k;
    const root = pose([T(side * ar * 0.42, b.height * at, ar * 0.1), RY(side * 0.5), RX(-0.42)]);
    push(b, 'trim', antennaShape(), pose([root.clone(), S(len, len, len)]), look.crest, look.trim, 1);
    // On the tip, which the antenna's own curl has carried forward by `0.3 · len`.
    push(
      b,
      'glaze',
      bulbShape(),
      pose([root.clone(), T(0, len * 0.99, len * 0.3), S(len * 0.13, len * 0.13, len * 0.13)]),
      look.trim,
    );
  }
}

/**
 * FROST. A crown of ice spires over a rime skirt flared at the ground.
 *
 * TWO features rather than one, and that is a considered decision rather than indulgence: a cluster of
 * upright things on a crown is the one silhouette in this set that could be confused with grass at
 * distance, and the flared wavy skirt at the ground is a shape nothing else has. Frost is identified by
 * the skirt from far away and by the spires up close, and colour separates it long before either.
 *
 * The spires are in the translucent layer, so they read as ice rather than as painted horns, and their
 * tips round over — see `spireShape`.
 */
function buildFrost(b: Build) {
  const look = FAMILY_LOOK.frost;
  const rng = wobble(53);
  const spires = Math.min(6, 3 + b.n);

  /**
   * One tall central spire, then a shorter ring leaning out around it. A ring with no centre reads as a
   * coronet; a centre with no ring reads as a horn.
   *
   * THE PROPORTION IS THE WHOLE THING, and the first pass had it backwards. A crystal is TALL AND THIN.
   * At 0.9 wide and 0.9 high the central spire was as broad as it was tall and rendered as a fat leaf,
   * which put frost and grass in the same bucket at distance — the one confusion this family had to
   * avoid. Halving the width and raising the height fixes it with no new geometry, and the tips still
   * round over because that is a property of `spireShape` and not of the scale it is drawn at.
   */
  push(
    b,
    'glaze',
    spireShape(),
    pose([T(0, b.height * 0.9, 0), S(0.62 * b.k, (1.02 + 0.2 * b.k) * b.k, 0.62 * b.k)]),
    look.trim,
    MIST,
    1,
  );
  for (let i = 0; i < spires; i += 1) {
    const a = (i / spires) * Math.PI * 2 + 0.5;
    const t = 0.8 + rng() * 0.08;
    const r = b.radiusAt(t) * (0.4 + rng() * 0.34);
    const len = (0.52 + rng() * 0.42) * b.k;
    push(
      b,
      'glaze',
      spireShape(),
      pose([
        T(Math.sin(a) * r, b.height * t, Math.cos(a) * r),
        RY(a),
        RX(0.2 + rng() * 0.26),
        S(len * 0.5, len * 1.5, len * 0.5),
      ]),
      look.crest,
      MIST,
      1,
    );
  }

  // The rime. Flared out at the ground and tucked back against the body as it rises, with a wavy top
  // edge — a level band would read as a painted stripe rather than as frost creeping up.
  push(
    b,
    'trim',
    skin(b.radiusAt, b.height, {
      // Taller and further out than the first pass, which flared it by 0.11 body units — about four
      // centimetres at play scale, i.e. invisible. A skirt is only an identifier if it reads as a
      // separate shape from the body it is on.
      tHigh: 0.4,
      tLow: 0.19,
      // Stops just above the ground rather than on it: a rim sitting exactly at y = 0 fights the ground
      // plane for the same pixels and flickers as the camera moves.
      tEnd: 0.025,
      lobes: 9,
      phase: 0.2,
      offset: 0.02,
      flare: 0.21 * (0.7 + 0.3 * b.k),
      flareEnd: true,
      segments: 48,
      rows: 5,
    }),
    new THREE.Matrix4(),
    look.trim,
    look.glaze,
    b.height * 0.3,
  );
}

/* ============================================================================
   the thirteen
   ========================================================================== */

/**
 * BUNNY. Two long ears with pink linings, and a powder-puff tail.
 *
 * THE STRONGEST SILHOUETTE AVAILABLE TO ANYONE, which is why it is spent on the plainest body in the set:
 * two long ears need no help at all. Three numbers make them ears rather than leaves:
 *
 *   LENGTH AGAINST WIDTH, about five to one. Under about three to one an "ear" is a leaf, and there is
 *   already a family with leaves. At 1.05 body units on a body 1.44 tall the pair is roughly three
 *   quarters the height of the creature, which is the proportion a child draws.
 *   THE PAIR IS ASYMMETRIC. This is the important one. A matched pair of uprights is a PLANT — that is
 *   exactly how fairy's first wings failed, and how frost's spires nearly did. So one ear stands and the
 *   other leans over at 0.62 radians and is a little shorter, and the outline becomes an animal.
 *   THEY ARE CUPPED, from `earLongShape`, so each catches a different amount of light and the two never
 *   merge into one flat shape when the slime turns.
 */
function buildBunny(b: Build) {
  const look = FAMILY_LOOK.bunny;
  const t = 0.92;
  const r = b.radiusAt(t);

  // side, lean, length. The asymmetry is the whole point — see the note above. The flop came down from
  // 0.62 to 0.4 after the second render: at 0.62 the second ear was so far over that it read as a
  // separate wilted object rather than as the same creature's other ear.
  const ears: { side: number; lean: number; len: number }[] = [
    { side: -1, lean: 0.12, len: 1.06 },
    { side: 1, lean: 0.4, len: 0.95 },
  ];

  for (const ear of ears) {
    const len = ear.len * (0.68 + 0.32 * b.k) * b.k;
    /**
     * WIDENED FROM 0.44 TO 0.62 after the first render, where the ears came back as two thin grey FINS.
     *
     * The five-to-one length-to-width ratio the note above argues for is right in principle and was too
     * literal in practice: at that ratio, seen from anywhere but dead ahead, a cupped ear presents its
     * edge and becomes a line. Widening it to about three and a half to one keeps it unmistakably an ear —
     * it is still far longer than cat's — while giving it enough face to catch light from the side.
     */
    const wide = 0.62 * (0.82 + 0.18 * b.k);
    /**
     * TIPPED FORWARD, NOT BACK, AND THIS WAS A REAL BUG RATHER THAN A PREFERENCE.
     *
     * The first pass used `RX(-0.1)`, leaning the ears slightly away from the camera — and bunny came back
     * with two DARK GREY-BROWN ears that read as wilted leaves on a cream body. The cause is written down
     * one file over, in `trimMaterial`: the scene is lit by a `hemisphereLight` whose lower half is GREEN
     * GRASS, so any surface tipped away from the sky takes the ground colour. Rose's rosette hit this
     * exact wall and the note there says so.
     *
     * A cream ear has almost no colour of its own to defend itself with, so it went green-grey. Tipping the
     * pair FORWARD by the same small angle turns both broad faces up toward the sky and the camera, and the
     * ears are cream. Nothing else changed.
     */
    const root = pose([T(ear.side * r * 0.46, b.height * t, r * 0.06), RY(ear.side * 0.24), RX(0.14), RZ(ear.side * ear.lean)]);
    // Cream, running paler toward the tip. The gradient is what gives a long flat part some form — and the
    // pale end is a WARM cream rather than a near-white, for the reason set out in bunny's `look.ts` entry.
    push(b, 'trim', earLongShape(), pose([root.clone(), S(wide, len, wide)]), look.crest, '#fff0d8', 1);
    /**
     * The pink lining, sitting on the FRONT face of the ear and a little way up it.
     *
     * Inset to 0.58 of the width so a rim of the outer ear shows all the way round — a lining that runs
     * to the edge reads as an ear painted pink, which loses the two-tone entirely at any distance. Pushed
     * out along the ear's own +z by a fraction of its thickness so it sits ON the surface rather than
     * inside it, which is the same rule rock's moss mounds had to learn.
     */
    push(
      b,
      'trim',
      earLongShape(),
      pose([root.clone(), T(0, len * 0.06, wide * 0.09), S(wide * 0.58, len * 0.84, wide * 0.58)]),
      look.trim,
      '#ffd8e2',
      1,
    );
  }

  /**
   * The tail: one round tuft at the back, low down.
   *
   * Small, and deliberately not on the silhouette from the front — it is the up-close confirmation, the
   * way grass's daisy is. What it does earn is the view from BEHIND, which is most of what a child sees
   * of a wandering slime, and from behind a bunny is two ears and a puff.
   */
  const tt = 0.3;
  const tr = b.radiusAt(tt);
  const ts = 0.3 * b.k;
  push(
    b,
    'trim',
    tuftShape(),
    pose([T(0, b.height * tt, -tr * 0.94), S(ts, ts, ts * 0.8)]),
    // Near-white but not white, per the palette rule at the top of `look.ts`.
    '#fffaf5',
    MIST,
    1,
  );
}

/**
 * CAT. Two pointed ears and a tail curled up beside it. The stripes are in the body's relief.
 *
 * TWO FEATURES BECAUSE ONE IS NOT ENOUGH HERE, and this is the same argument frost made for pairing its
 * spires with a skirt. Pointed ears alone sit uncomfortably close to bunny's at distance, where length is
 * hard to judge; a raised tail alone is easy to lose behind the body from the front. Together they cannot
 * be confused with anything — two short triangles on top AND a question-mark tail off one flank.
 *
 * The ears are a THIRD the length of bunny's and nearly twice as wide at the root, which is the ratio that
 * separates the two families. `earTriShape`'s tip still rounds over, so "pointed" is a proportion here
 * rather than an actual point: nothing in this game is allowed a spike.
 */
function buildCat(b: Build) {
  const look = FAMILY_LOOK.cat;
  const t = 0.94;
  const r = b.radiusAt(t);

  for (const side of [-1, 1] as const) {
    const len = 0.42 * (0.7 + 0.3 * b.k) * b.k;
    const wide = 0.62 * (0.8 + 0.2 * b.k);
    const root = pose([T(side * r * 0.52, b.height * t, r * 0.04), RY(side * 0.3), RX(-0.06), RZ(side * 0.28)]);
    push(b, 'trim', earTriShape(), pose([root.clone(), S(wide, len, wide)]), look.crest, look.inner, 1);
    // The pink inner ear, inset as bunny's is and for the same reason.
    push(
      b,
      'trim',
      earTriShape(),
      pose([root.clone(), T(0, len * 0.04, wide * 0.1), S(wide * 0.56, len * 0.8, wide * 0.56)]),
      look.trim,
      '#ffd8e2',
      1,
    );
  }

  /**
   * The tail, standing up off the back flank and hooking forward.
   *
   * PLACED AT THE BACK-RIGHT rather than dead behind, at about 2.3 radians. Dead behind it is invisible
   * from the front and merges with the body from the side; out on the quarter it breaks the outline in
   * BOTH the front and side views, which is where a silhouette feature has to work.
   *
   * Two bands of colour up it, because a plain tail is a handle. The tip goes to the pale `inner`, which
   * is what every ginger cat actually has and reads at distance as a white-tipped tail.
   */
  const a = 2.3;
  const tt = 0.34;
  const tr = b.radiusAt(tt) * 0.92;
  const len = 1.02 * (0.66 + 0.34 * b.k) * b.k;
  push(
    b,
    'trim',
    tailShape(),
    pose([T(Math.sin(a) * tr, b.height * tt, Math.cos(a) * tr), RY(a + 0.4), RX(-0.16), S(len * 0.72, len, len * 0.72)]),
    look.skin,
    look.inner,
    1,
  );
}

/**
 * LION. A broad mane ring around the face, small round ears, and a tuft-tipped tail.
 *
 * THE MANE IS A HALO AND IT IS THE WHOLE READ: an outline about forty per cent wider than the body, with a
 * soft fringe on it, centred at FACE height rather than on the crown. That last part is what keeps it off
 * rose, whose rosette sits on top of the head and cups upward. A ring at the face that lies flat is a
 * mane; the same ring moved up and tipped up is a flower.
 *
 * TWO RINGS, because one ring of locks is a fringe and two is a mass — the same lesson rose's petals
 * taught. The outer ring is longer, lies flatter and is darker; the inner is shorter, stands up more and
 * is lighter, so the mane has depth and reads as hair rather than as a collar.
 *
 * THE FACE-CLEARING RULE IS THE ONE PIECE OF REAL CRAFT HERE. A full ring of horizontal locks at eye
 * height puts two of them straight through the eyes, which stand proud of the hide. Rather than deleting
 * the front locks — which leaves a bald gap a child reads as damage — every lock is leaned UP and rooted
 * HIGHER in proportion to how close to dead-ahead it is. The mane stays continuous all the way round, and
 * at the front it sweeps up over the brow the way a real lion's does.
 */
function buildLion(b: Build) {
  const look = FAMILY_LOOK.lion;
  const rng = wobble(71);
  const locks = Math.min(18, Math.round(7 + b.n * 2.4));

  /**
   * THE VALUE DIRECTION WAS BACKWARDS IN THE FIRST PASS and it is the other half of why the lion read as a
   * dead spider. The outer ring ran from `crest` to `trim`, i.e. from mid rust to the DARKEST value the
   * family owns — so every lock got darker toward its tip and the mane's outer edge, which is the bit on
   * the silhouette, was the darkest thing on the creature. Dark spikes against grass.
   *
   * It now runs the other way, dark at the root and GOLD at the tips, which is both what fur lit from above
   * actually does and what makes the halo read as a halo. Same lesson rose learned about being lightest in
   * the middle, applied to a shape that is lightest at the rim instead.
   */
  /**
   * THE LEAN CAME BACK UP OFF HORIZONTAL AFTER THE SECOND RENDER, where widening the locks fixed the dead
   * spider and immediately created the opposite failure: A PIE. Fourteen wide locks at 1.5 radians is a
   * flat horizontal plate of overlapping fur lying on top of a body, and that is exactly what it looked
   * like — a pastry with eyes.
   *
   * A mane is a HALO, which means it has to have height as well as width — and it took two attempts to get
   * far enough off horizontal, because a raised camera makes a near-horizontal ring look flatter than it
   * measures. 1.15 radians still read as a pie. At 0.85 the locks sweep up and out at about fifty degrees,
   * the ring becomes a SPHERE of fur around the face rather than a plate on top of one, and the body is
   * visible inside it — which is the thing that makes it an animal instead of a pastry.
   */
  const rings: { t: number; lean: number; len: number; from: string; to: string; turn: number }[] = [
    // The outer ring: longest, and the one that sets the silhouette. Rust root, gold tip.
    { t: 0.64, lean: 0.85, len: 0.6, from: '#a8541a', to: '#e8a44e', turn: 0 },
    // The inner ring: shorter, more upright, lighter still, rotated off the outer so locks cover its gaps.
    { t: 0.76, lean: 0.5, len: 0.44, from: look.crest, to: '#f2bc72', turn: 0.4 },
  ];

  for (const ring of rings) {
    for (let i = 0; i < locks; i += 1) {
      const a = (i / locks) * Math.PI * 2 + ring.turn;
      // 1 at dead ahead, 0 at the sides and behind. Drives both of the face-clearing corrections.
      const front = Math.max(0, Math.cos(a));
      const t = ring.t + front * 0.12;
      const r = b.radiusAt(t) * 0.95;
      const lean = ring.lean - front * 0.66;
      const len = ring.len * (0.7 + 0.3 * b.k) * b.k * (0.86 + rng() * 0.28);
      // Wide enough that neighbours overlap, narrow enough that the ring is not a solid plate. Landed
      // between the 0.40 that gave a spider and the 0.66 that gave a pie.
      const wide = 0.54 + rng() * 0.14;
      push(
        b,
        'trim',
        maneLockShape(),
        pose([
          T(Math.sin(a) * r, b.height * t, Math.cos(a) * r),
          RY(a),
          RX(lean),
          RZ((rng() - 0.5) * 0.4),
          S(wide, len, wide),
        ]),
        ring.from,
        ring.to,
        1,
      );
    }
  }

  // Ears: small round tabs on the crown, mostly buried in the mane. They are not a silhouette feature
  // here — the mane is — and a lion with big ears reads as a cat wearing a wig.
  const et = 0.9;
  const er = b.radiusAt(et);
  for (const side of [-1, 1] as const) {
    const es = 0.3 * b.k;
    push(
      b,
      'trim',
      earRoundShape(),
      pose([T(side * er * 0.54, b.height * et, er * 0.1), RY(side * 0.4), RX(-0.24), S(es, es, es)]),
      look.crest,
      look.inner,
      1,
    );
  }

  // The tail, out the back with a dark tuft on the end. The tuft is the identifier, not the tail.
  const a = Math.PI;
  const tt = 0.36;
  const tr = b.radiusAt(tt) * 0.9;
  const len = 0.86 * (0.66 + 0.34 * b.k) * b.k;
  const root = pose([T(Math.sin(a) * tr, b.height * tt, Math.cos(a) * tr), RY(a), RX(-0.5)]);
  push(b, 'trim', tailShape(), pose([root.clone(), S(len * 0.5, len, len * 0.5)]), look.skin, look.crest, 1);
  // On the tip, which `tailShape`'s own curl has carried forward by 0.46 of its length.
  const ts = 0.2 * b.k;
  push(b, 'trim', tuftShape(), pose([root.clone(), T(0, len * 0.98, len * 0.46), S(ts, ts * 1.2, ts)]), look.trim, look.crest, 1);
}

/**
 * STRAWBERRY. A green star of a calyx over the shoulder, and a stub of stem.
 *
 * MOST OF THIS FAMILY'S IDENTIFICATION IS ITS BODY, not this crest — see `GUMDROP.strawberry`, which is
 * the only inverted profile in the game: widest at the shoulder, tucked in at the base. That is a berry in
 * outline before a leaf is drawn, and it is why strawberry survives the 25 m test.
 *
 * What the calyx has to do is confirm it, and the shape that does that is a FLAT STAR rather than a tuft.
 * The leaves splay outward past horizontal — `lean` runs to 1.78 radians, which is drooping — so they lie
 * ON the shoulder of the berry and point slightly down. Every other crown in this game cups UPWARD, so
 * the one that lies flat and points down is unambiguous, and it is also what a real calyx does.
 *
 * AGAINST ROSE, one more time, because it is the collision: rose's rosette is pink, cupped up, and on the
 * crown. This is green, flat, drooping, and sits on a body of a completely different profile.
 */
function buildStrawberry(b: Build) {
  const look = FAMILY_LOOK.strawberry;
  const rng = wobble(97);
  const leaves = Math.min(9, 5 + b.n);
  const t = 0.94;
  const r = b.radiusAt(t);

  for (let i = 0; i < leaves; i += 1) {
    const a = (i / leaves) * Math.PI * 2 + 0.3;
    const len = 0.54 * (0.7 + 0.3 * b.k) * b.k * (0.88 + rng() * 0.24);
    const wide = 0.5 + rng() * 0.12;
    push(
      b,
      'trim',
      calyxLeafShape(),
      pose([
        T(Math.sin(a) * r * 0.72, b.height * t, Math.cos(a) * r * 0.72),
        RY(a),
        // Past horizontal, so the star lies on the shoulder and droops. THE distinguishing angle.
        RX(1.52 + rng() * 0.26),
        RZ((rng() - 0.5) * 0.3),
        S(wide, len, wide),
      ]),
      look.crest,
      '#8fd063',
      1,
    );
  }

  // The stem: a short green stub straight up out of the middle of the star, which is what closes the
  // silhouette into a recognisable berry rather than a red thing wearing leaves.
  const ss = 0.3 * b.k;
  push(
    b,
    'trim',
    postShape(),
    pose([T(0, b.height * 0.97, 0), S(ss * 0.62, ss, ss * 0.62)]),
    '#4f8f34',
    look.crest,
    1,
  );
}

/**
 * FIRE. A crown of licking flames, all of them curling the same way round.
 *
 * THE SHAPE OF ONE FLAME IS IN `flameShape` and is the answer to "reads as flame, not a cone". What is in
 * THIS function is the other half of it, which is the ARRANGEMENT, and it comes down to two rules that are
 * both about breaking symmetry:
 *
 *   EVERY FLAME CURLS THE SAME ROTATIONAL WAY. `RY(a + 1.45)` turns each flame so its bend points
 *   TANGENTIALLY — around the crown — rather than radially outward. Radial curl gives a fountain, or a
 *   crown of horns; a shared rotational sense gives fire, because that is what convection actually does
 *   and the eye knows it. This one line is the difference and it is worth protecting.
 *   NO TWO ARE THE SAME HEIGHT. A ring of equal uprights is a hat, and this family's nearest neighbours
 *   in silhouette — frost's spires and ice's shards — are both rings of uprights. The heights here run
 *   from 0.55 to 1.3 of the base length, which is a spread wide enough to read as flicker even standing
 *   still.
 *
 * THE WHOLE CROWN GOES IN THE `aura` LAYER so it can lick independently of the body. Its origin is the
 * ROOT of the flames, not the slime's feet, so `Slime.tsx`'s vertical stretch makes the flames grow and
 * shrink in place instead of sliding up out of the head. Under `prefers-reduced-motion` the group is never
 * touched and the crown simply stands still — see `Motion` in `look.ts`.
 */
function buildFire(b: Build) {
  const look = FAMILY_LOOK.fire;
  const rng = wobble(131);
  // MORE AND NARROWER, from the same render that narrowed `flameShape`. Four fat flames read as petals
  // however they are shaped; nine thin ones read as a fire, and they cost nothing because a flame is
  // about two hundred triangles.
  // Back down from nine to seven, and each one wider. Nine narrow flames read as a PINEAPPLE TOP: too many
  // thin spikes of similar height, which is the same failure mode as a ring of equal uprights and cannot be
  // fixed by colour. Seven chunkier ones with a wide height spread read as fire.
  const flames = Math.min(7, 5 + b.n);
  const base = 0.86;
  b.auraOrigin = [0, b.height * base, 0];

  // One tall central flame, so the crown has a peak. A ring with no centre reads as a coronet, which is
  // the same trap frost's spires had.
  const tall = (1.3 + 0.22 * b.k) * b.k;
  push(
    b,
    'aura',
    flameShape(),
    pose([T(0, b.height * 0.92, 0), RY(0.6), RX(0.1), S(tall * 0.44, tall, tall * 0.44)]),
    look.glaze,
    look.crest,
    1,
  );

  for (let i = 0; i < flames; i += 1) {
    const a = (i / flames) * Math.PI * 2 + 0.35;
    const t = base + rng() * 0.07;
    const r = b.radiusAt(t) * (0.42 + rng() * 0.4);
    // A wide spread of heights, per the second rule above.
    const len = (0.55 + rng() * 0.75) * b.k;
    push(
      b,
      'aura',
      flameShape(),
      pose([
        T(Math.sin(a) * r, b.height * t, Math.cos(a) * r),
        /**
         * 0.95 RADIANS, NOT 1.45, and the correction is the whole reason fire took three passes.
         *
         * A pure tangential turn (π/2) is geometrically the right way to make every flame curl the same way
         * round the crown — and it hides the curl completely, because a bend that runs tangentially is seen
         * EDGE-ON from outside the ring. Fire's second render came back as a pineapple top: thin orange
         * blades, all apparently straight, because the one property that says "flame" was pointing away from
         * the camera on every single one of them.
         *
         * Backed off to 0.95 the flames still share a rotational sense — they still lean around the crown
         * rather than splaying outward like a fountain — but a good half of each bend now faces the viewer,
         * so the licking reads. Same fix, and the same number for the same reason, as fairy's wings being
         * rolled back from 90° to 66°.
         */
        RY(a + 0.7),
        RX(0.12 + rng() * 0.3),
        // A consistent sideways lean on top of the curl, which is what makes a still frame look like it is
        // moving. All one direction: fire that leans both ways is a shrub.
        RZ(0.3 + rng() * 0.18),
        S(len * 0.58, len, len * 0.58),
      ]),
      /**
       * DEEP RED-ORANGE AT THE ROOT TO GOLD AT THE TIP, and this was the third fix from the tulip render.
       *
       * The first pass ran every flame from a mid gold (`crest`) to a pale cream (`trim`), which is a
       * perfectly good description of the hottest part of a real flame and completely wrong here: against
       * a pale blue sky, pale yellow has almost no contrast, so the crown dissolved into the background
       * and what remained readable was the flat petal shape. Saturated orange reads against sky at any
       * distance. Fire is identified by VALUE CONTRAST first and shape second, which is the opposite of
       * every other family in this file.
       */
      rng() < 0.45 ? '#e8451c' : look.glaze,
      '#ffc63d',
      1,
    );
  }
}

/**
 * ICE. An asymmetric cluster of hard faceted shards, one of them clearly dominant, and NOTHING at the
 * ground.
 *
 * THIS FUNCTION IS WHERE THE ICE-VERSUS-FROST DECISION IS ACTUALLY CASHED, so it is worth restating what
 * it is buying. `buildFrost` puts a symmetric ring of round spires around one central spire and then flares
 * a wavy rime skirt at the floor. This one does the opposite in every respect:
 *
 *   ONE DOMINANT SHARD, LEANING, AND OFF THE AXIS. Frost's centre is upright and central. Ice's is tilted
 *   about a fifth of a radian and set off to one side, so the cluster has a direction. A leaning spike is a
 *   crystal; an upright one is a horn or a spire.
 *   THE SECONDARIES ARE UNMATCHED. Heights run 0.4 to 1.05, i.e. some are a third of others. Frost's ring
 *   is near-even by design.
 *   NO SKIRT, AND THAT IS THE ONE THAT DECIDES IT AT 25 M. Frost is identified far away by the flared white
 *   ring at its foot. Ice deliberately has nothing there, so the two silhouettes differ at the BOTTOM as
 *   well as the top and cannot converge at any distance.
 *   TWO LOW SHARDS ON THE FLANK, growing sideways out of the hide near the base. Nothing else in the game
 *   has a feature low on its side, and it reads as a crystal formation rather than a hat.
 *
 * Every shard is `shardShape` — six radial segments, smooth-shaded, blunt tip — so ice looks cut without
 * breaking "nothing jagged on a silhouette".
 */
function buildIce(b: Build) {
  const look = FAMILY_LOOK.ice;
  const rng = wobble(167);
  const shards = Math.min(5, 3 + Math.round(b.n * 0.7));

  // The dominant shard: tall, leaning, off-centre. The whole cluster reads from this one.
  const tall = (1.22 + 0.22 * b.k) * b.k;
  push(
    b,
    'glaze',
    shardShape(),
    pose([
      T(b.radiusAt(0.9) * 0.24, b.height * 0.88, -b.radiusAt(0.9) * 0.1),
      RY(0.7),
      RX(0.2),
      RZ(0.16),
      // Widened from 0.46 after the third render: at that ratio the dominant shard was nine times taller
      // than it was wide, which is a BLADE, and a pale blue blade beside a pale blue body is a frost spire
      // or a bunny ear. A crystal has bulk.
      S(tall * 0.7, tall, tall * 0.7),
    ]),
    look.crest,
    look.trim,
    1,
  );

  for (let i = 0; i < shards; i += 1) {
    const a = (i / shards) * Math.PI * 2 + 0.9;
    const t = 0.78 + rng() * 0.1;
    const r = b.radiusAt(t) * (0.4 + rng() * 0.42);
    // A deliberately wide spread. See the second rule above.
    const len = (0.4 + rng() * 0.65) * b.k;
    push(
      b,
      'glaze',
      shardShape(),
      pose([
        T(Math.sin(a) * r, b.height * t, Math.cos(a) * r),
        RY(a * 1.6),
        RX(0.22 + rng() * 0.34),
        RZ((rng() - 0.5) * 0.4),
        S(len * 0.58, len * 1.4, len * 0.58),
      ]),
      rng() < 0.45 ? look.glaze : look.crest,
      look.trim,
      1,
    );
  }

  /**
   * Two shards low on the flank, growing out sideways.
   *
   * The cheapest thing in this function and one of the most effective: it puts geometry on ice's outline
   * BELOW the halfway line, where no other family has anything except frost's skirt and rock's boulders.
   * Leaned out past horizontal so they clearly emerge from the body rather than sitting on it.
   */
  for (const side of [-1, 1] as const) {
    const t = 0.3 + rng() * 0.12;
    const r = b.radiusAt(t) * 0.96;
    const len = (0.34 + rng() * 0.16) * b.k;
    const a = side * (1.9 + rng() * 0.5);
    push(
      b,
      'glaze',
      shardShape(),
      pose([
        T(Math.sin(a) * r, b.height * t, Math.cos(a) * r),
        RY(a),
        RX(1.24 + rng() * 0.3),
        S(len * 0.5, len * 1.3, len * 0.5),
      ]),
      look.crest,
      look.trim,
      1,
    );
  }
}

/**
 * GOLD. A little crown: a band, five rounded points, a bead on each.
 *
 * The crown is a shape a child knows before they can read, and it is the only closed RING standing above a
 * body in the game — frost's and ice's clusters are solid, rose's rosette is a bowl. A ring reads as a
 * crown even at a dozen pixels because you can see sky through it.
 *
 * FIVE POINTS, NOT SIX OR SEVEN, and not for taste: with an odd count there is always one point dead
 * centre from any given side, so the crown never presents as a symmetrical pair of horns. Even counts
 * viewed head-on give exactly that, which is how a crown turns into antlers.
 *
 * Everything here goes in the OPAQUE `trim` layer, which for this family is the metal material — see
 * `trimMaterial`, which takes the same procedural environment the body does, so the crown is gold rather
 * than a yellow plastic ring on a gold slime.
 */
function buildGold(b: Build) {
  const look = FAMILY_LOOK.gold;
  const t = 0.9;
  const br = b.radiusAt(t) * 0.82 * (0.86 + 0.14 * b.k);

  // The band. Rotated flat, so the torus's major circle lies in the ground plane.
  push(
    b,
    'trim',
    crownBandShape(),
    pose([T(0, b.height * t, 0), RX(Math.PI / 2), S(br, br, br)]),
    look.crest,
    look.trim,
    1,
  );

  const points = 5;
  for (let i = 0; i < points; i += 1) {
    const a = (i / points) * Math.PI * 2;
    const len = 0.4 * (0.7 + 0.3 * b.k) * b.k;
    const root = pose([T(Math.sin(a) * br, b.height * t, Math.cos(a) * br), RY(a), RX(-0.12)]);
    push(b, 'trim', crownPointShape(), pose([root.clone(), S(len * 0.5, len, len * 0.5)]), look.crest, look.trim, 1);
    // A bead on each tip, which is what stops the points reading as spikes. It also catches the
    // procedural sun, so the crown twinkles as the slime turns.
    const bs = len * 0.19;
    push(b, 'trim', bulbShape(), pose([root.clone(), T(0, len * 1.0, 0), S(bs, bs, bs)]), look.trim, look.inner, 1);
  }
}

/**
 * WOOD. One branch, forking once, with two broad leaves — and knots on the trunk.
 *
 * THE READ IS "ONE THICK THING THAT FORKS", which is the entire difference from grass. Grass is twelve thin
 * blades of random length; this is a single woody stem with a Y in it. At 25 m grass is a fuzzy tuft and
 * wood is a distinct branching line, and no amount of tinting would have separated those two — it had to be
 * the count and the thickness.
 *
 * The knots are the up-close reward, the way grass's daisy is: two dark burls on the trunk that catch a
 * shadow and confirm the body is timber rather than brown jelly.
 */
function buildWood(b: Build) {
  const look = FAMILY_LOOK.wood;
  const rng = wobble(211);
  const t = 0.95;

  // The trunk, leaning slightly off vertical so the branch has a direction.
  const len = 0.66 * (0.68 + 0.32 * b.k) * b.k;
  const w = 0.78;
  const trunk = pose([T(0, b.height * t, 0), RZ(-0.14), RX(0.06)]);
  push(b, 'trim', twigShape(), pose([trunk.clone(), S(w, len, w)]), look.crest, look.accent, 1);

  /**
   * The fork. Rooted at the trunk's TIP, which `twigShape`'s own curve has carried to
   * (0.13·w, 1, 0.05·w) in trunk-local units — so the offset has to be computed from the shape rather
   * than guessed, or the branches float off the end of the trunk. Same class of bug as grass's daisy head.
   */
  const tip = pose([trunk.clone(), T(0.13 * w, len, 0.05 * w)]);
  for (const side of [-1, 1] as const) {
    const flen = len * (0.62 + rng() * 0.16);
    const fw = w * 0.66;
    const fork = pose([tip.clone(), RY(side * 0.7), RZ(side * 0.66), RX(-0.1)]);
    push(b, 'trim', twigShape(), pose([fork.clone(), S(fw, flen, fw)]), look.crest, look.accent, 1);

    // A leaf on each fork tip, tilted up toward the sky so its broad face is visible from a child's eye
    // height rather than edge-on. Same correction rose's petals needed.
    const ls = flen * 0.92;
    push(
      b,
      'trim',
      leafShape(),
      pose([
        fork.clone(),
        T(0.13 * fw, flen, 0.05 * fw),
        RY(side * 0.5),
        RX(0.5),
        S(ls * 0.8, ls, ls * 0.8),
      ]),
      look.trim,
      '#9ad95c',
      1,
    );
  }

  // Two knots on the body, low and to the sides, in the darkest bark value.
  for (let i = 0; i < 2; i += 1) {
    const a = 1.1 + i * 2.7;
    const kt = 0.42 + rng() * 0.26;
    const kr = b.radiusAt(kt) * 0.95;
    const ks = (0.14 + rng() * 0.06) * b.k;
    push(
      b,
      'trim',
      mossShape(),
      pose([T(Math.sin(a) * kr, b.height * kt, Math.cos(a) * kr), RY(a), S(ks, ks * 0.86, ks * 0.6)]),
      look.accent,
      look.crest,
      1,
    );
  }
}

/**
 * MANGO. One broad leaf and a stub of stem, on a body that leans.
 *
 * THE SMALLEST CREST IN THE GAME, ON PURPOSE. Mango's identification is its BODY — the only asymmetric
 * profile in the set, sheared over by `GUMDROP.mango.lean` — plus the `ripen` two-tone. A big crest would
 * compete with the lean for the outline and blunt the one thing that makes this family instantly readable
 * from any angle at any distance. So the crest's whole job is to say "fruit, not blob", and one leaf does
 * that.
 *
 * THE LEAN OFFSET IS WHY THIS FUNCTION EXISTS AT ALL RATHER THAN BEING THREE LINES. `radiusAt` describes
 * the body's cross-section, but mango's AXIS has moved sideways by nearly a quarter of a body unit at the
 * crown, so anything placed against the axis alone hangs in the air next to the fruit. The offset is
 * recomputed here with the same formula the shear uses, and the leaf leans the OTHER way to the body so
 * the whole silhouette balances instead of toppling.
 */
function buildMango(b: Build) {
  const look = FAMILY_LOOK.mango;
  const p = GUMDROP.mango;
  const t = 0.93;
  // The same expression as the shear in `gumdropGeometry`. If one changes, both must.
  const shift = (p.lean ?? 0) * p.width * Math.pow(t, 1.3);
  const r = b.radiusAt(t);

  // The stem, at the leaning crown, tipped further over in the direction of the lean.
  const ss = 0.3 * b.k;
  push(
    b,
    'trim',
    postShape(),
    pose([T(shift, b.height * t, 0), RZ(-0.4), S(ss * 0.7, ss, ss * 0.7)]),
    '#8a5a24',
    look.accent,
    1,
  );

  // One leaf, thrown out AGAINST the lean. A leaf on the downhill side makes the fruit look like it is
  // falling over; on the uphill side it reads as a mango still on the tree.
  const ls = 0.72 * (0.7 + 0.3 * b.k) * b.k;
  push(
    b,
    'trim',
    leafShape(),
    pose([T(shift - r * 0.2, b.height * t, r * 0.06), RY(-0.9), RX(0.66), RZ(-0.5), S(ls * 0.78, ls, ls * 0.78)]),
    look.trim,
    '#9ad95c',
    1,
  );
}

/**
 * AIR. A spiral of wind turning above the body, with two wisps trailing round with it.
 *
 * THE ONLY OPEN, MOVING FORM IN THE GAME. Every other crest is a solid mass — a crown, a cluster, a tuft.
 * This one is a coil you can see sky through, and it ROTATES, which no other feature does. Between the
 * openness and the motion, air is identifiable at 25 m even though its body is nearly colourless, and
 * that was the whole gamble of this family: spend the identification on the crest and let the body be
 * almost invisible, because against eighteen saturated slimes the pale one stands out anyway.
 *
 * The spiral goes in `aura` and is spun about the body axis by `Slime.tsx`, which is where `Motion: 'turn'`
 * lands. Under `prefers-reduced-motion` it holds at its rest angle and is simply a static spiral, which
 * still reads correctly — the rotation is confirmation, not the identification.
 */
function buildAir(b: Build) {
  const look = FAMILY_LOOK.air;
  const top = b.height * 0.94;
  b.auraOrigin = [0, top, 0];

  const hs = 0.66 * (0.72 + 0.28 * b.k) * b.k;
  push(b, 'aura', helixShape(), pose([T(0, top, 0), S(hs, hs * 1.5, hs)]), look.crest, look.trim, 1);

  /**
   * Two wisps, laid nearly flat and set at different heights and phases.
   *
   * `fuseShape` reused as a wisp, which sounds like a bodge and is the opposite: it is a tapered rope that
   * curves gently and fades to nothing at its far end, which is exactly a streak of moving air. Reusing it
   * means air adds no new geometry to the page at all beyond its helix.
   */
  for (let i = 0; i < 2; i += 1) {
    const a = i * 2.4 + 0.6;
    const rr = b.radiusAt(0.7) * (1.15 + i * 0.3);
    const ws = (0.5 + i * 0.12) * b.k;
    push(
      b,
      'aura',
      fuseShape(),
      pose([
        T(Math.sin(a) * rr, b.height * (0.6 + i * 0.22), Math.cos(a) * rr),
        RY(a + 1.5),
        // Laid over past horizontal, so it streams around the body rather than sticking out of it.
        RX(1.5),
        S(ws, ws * 1.6, ws),
      ]),
      look.trim,
      look.crest,
      1,
    );
  }
}

/**
 * RADIOACTIVE. A trefoil on a post, throbbing, over glowing drips.
 *
 * THE ONLY SYMBOL IN THE GAME, and the reason it works as a silhouette is that it was built as a solid
 * rather than as a badge. A flat trefoil disc would be a line edge-on, which is useless on a creature that
 * wanders; three FAT lobes splayed slightly upward on a short post present two or three lobes from every
 * angle, so "three-lobed thing on a stalk" is legible all the way round.
 *
 * The drips are the second feature, and they are `skin()` — the same builder as waffle's syrup and frost's
 * rime, with a green glowing gradient and tongues that hang lower. Two features again, for the same reason
 * frost has two: the trefoil alone is small, and the drips give the family a read on the BODY as well as
 * above it.
 *
 * Post in `trim` so it stays welded to the head; trefoil in `aura` so it can breathe. The `auraOrigin` is
 * the top of the post, so the throb happens about the hub rather than about the slime's feet.
 */
function buildRadioactive(b: Build) {
  const look = FAMILY_LOOK.radioactive;
  const t = 0.95;
  // Post and trefoil both enlarged substantially after the second render, where the trefoil was a green
  // speck on a green body — present, correct, and completely invisible past about three metres. A SYMBOL has
  // to be big: it has no silhouette of its own to fall back on the way an ear or a crown does.
  const plen = 0.42 * (0.72 + 0.28 * b.k) * b.k;
  const hub = b.height * t + plen;
  b.auraOrigin = [0, hub, 0];

  push(
    b,
    'trim',
    postShape(),
    pose([T(0, b.height * t, 0), S(plen * 0.9, plen, plen * 0.9)]),
    look.accent,
    look.skin,
    1,
  );

  // The hub, so the three lobes meet in something instead of in mid-air.
  const hs = 0.22 * b.k;
  push(b, 'aura', bulbShape(), pose([T(0, hub, 0), S(hs, hs * 0.8, hs)]), look.crest, look.trim, 1);

  const size = 0.88 * (0.7 + 0.3 * b.k) * b.k;
  for (let i = 0; i < 3; i += 1) {
    const a = (i / 3) * Math.PI * 2 + 0.4;
    push(
      b,
      'aura',
      trefoilLobeShape(),
      pose([
        T(0, hub, 0),
        RY(a),
        // Nearly horizontal, tilted up a fifth of a radian so the trefoil reads as a shallow bowl and
        // catches light on its upper faces instead of presenting three edges.
        RX(Math.PI / 2 - 0.34),
        S(size * 0.8, size, size * 0.8),
      ]),
      look.crest,
      look.trim,
      1,
    );
  }

  // The drips. Tongues hang lower than waffle's syrup and the gradient runs to the brightest acid value,
  // so the body looks wet with something luminous.
  push(
    b,
    'glaze',
    skin(b.radiusAt, b.height, {
      tHigh: 0.74,
      tLow: 0.56,
      tEnd: 1,
      lobes: 7,
      phase: 0.9,
      offset: 0.028,
      flare: 0.012,
      rows: 6,
    }),
    new THREE.Matrix4(),
    look.glaze,
    look.trim,
    b.height,
  );
}

/**
 * SLEEPY. A long nightcap that flops over with a pom-pom on the end, a folded brim, and a Z drifting up.
 *
 * THE CAP IS THE ONLY FEATURE IN THE GAME THAT HANGS OUT PAST THE BODY ON ONE SIDE, which makes sleepy the
 * second of the two asymmetric silhouettes here (mango's lean is the other) and by far the more obvious of
 * them — a lean is subtle at distance and a cap flopping sideways with a ball on the end is not. It is also
 * why the cap is oversized: at anything less than about 1.2 body units of reach it stops breaking the
 * outline and becomes a hat, and a hat is not a silhouette feature.
 *
 * The brim matters more than it sounds. Without it the cap is a cone stuck into a head; with it there is a
 * clear line where cloth meets creature, and the whole thing reads as WORN. It is one torus.
 *
 * The eyes are handled in `Slime.tsx` — see `eyesClosed` in `look.ts` — and the Z is in `aura` so it can
 * drift upward on its own. Under `prefers-reduced-motion` the Z sits still at the bottom of its travel,
 * which is the readable end of it.
 */
function buildSleepy(b: Build) {
  const look = FAMILY_LOOK.sleepy;
  const t = 0.84;
  const r = b.radiusAt(t);

  /**
   * The cap. Scaled so its base radius — `nightcapShape` starts at 0.4 in local units — lands at about
   * four fifths of the body's radius at the brim line, which is what makes it look pulled ON rather than
   * balanced on top.
   */
  const cs = ((r * 0.82) / 0.4) * (0.82 + 0.18 * b.k);
  const cap = pose([T(0, b.height * t, 0), RY(-0.5), RZ(0.12)]);
  push(b, 'trim', nightcapShape(), pose([cap.clone(), S(cs, cs, cs)]), look.crest, look.skin, 1);

  // The folded brim, at the cap's root.
  const brimR = r * 0.9;
  push(
    b,
    'trim',
    collarShape(),
    pose([T(0, b.height * t, 0), RX(Math.PI / 2), S(brimR, brimR, brimR * 0.7)]),
    look.trim,
    MIST,
    1,
  );

  /**
   * The pom-pom, on the cap's tip.
   *
   * The tip is where `nightcapShape`'s own path ends, at (0.92, 0.26, 0.1) in cap-local units, so it is
   * read off the shape rather than guessed — the third time in this file that a prop on the end of a curve
   * has had to do that, and the third time it would otherwise have floated.
   */
  const ps = 0.3 * b.k;
  push(
    b,
    'trim',
    tuftShape(),
    pose([cap.clone(), T(0.92 * cs, 0.26 * cs, 0.1 * cs), S(ps, ps, ps)]),
    look.trim,
    MIST,
    1,
  );

  /**
   * The Z, off to the side the cap is NOT on, so the two features do not overlap in the outline.
   *
   * Three rounded bars — two horizontals and a diagonal — which is a letter Z with no sharp corner
   * anywhere on it. Small, because it is confirmation rather than identification: a child reads the cap
   * and the closed eyes first, and the Z is the joke.
   */
  const zo: [number, number, number] = [-r * 1.3, b.height * 1.06, 0];
  b.auraOrigin = zo;
  const zs = 0.3 * b.k;
  const bar = 0.42 * zs;
  const thick = 0.09 * zs;
  const strokes: THREE.Matrix4[] = [
    pose([T(0, bar * 1.1, 0), S(bar, thick, thick)]),
    pose([T(0, -bar * 1.1, 0), S(bar, thick, thick)]),
    pose([RZ(-0.72), S(thick, bar * 1.5, thick)]),
  ];
  for (const s of strokes) {
    push(b, 'aura', zBarShape(), pose([T(zo[0], zo[1], zo[2]), s]), look.trim, MIST, 1);
  }
}

/**
 * BOMB. A brass collar, a rope fuse, a spark on the end of it, and two rosy cheeks.
 *
 * THE BRIEF'S HARD CONSTRAINT WAS "must not read as threatening to a five-year-old", and the geometry side
 * of meeting it is here (the colour side is in `look.ts`, and the body being the roundest in the game is in
 * `gumdrop.ts`). Three decisions:
 *
 *   THE CHEEKS. Two soft blush patches under the doe eyes, and the only ones in the game. This is the
 *   single highest-value thing in this function per triangle: a dark round body with big eyes is a bowling
 *   ball, and the same thing with cheeks is a pet. Nothing else moved bomb as far.
 *   THE COLLAR IS A FAT BRASS RING, not a metal cap. A ring reads as the neck of a Christmas bauble; a flat
 *   plate reads as hardware.
 *   THE FUSE IS ROPE-COLOURED AND CURLS. A straight fuse is a wick on a device. A curled one on a shiny
 *   round body is a cartoon, and it is the same curl language as the cat's tail and the nightcap.
 *
 * NOTHING EXPLODES AND NOTHING IS LOST. The spark is one instanced mote pinned to the fuse tip by
 * `sparkAt`, it twinkles by SIZE forever, and it holds perfectly still under `prefers-reduced-motion`.
 * There is no timer in this directory and no code path anywhere that removes a slime.
 */
function buildBomb(b: Build) {
  const look = FAMILY_LOOK.bomb;
  const t = 0.93;
  const r = b.radiusAt(t);

  // The collar.
  const cr = r * 0.94;
  push(
    b,
    'trim',
    collarShape(),
    pose([T(0, b.height * t, 0), RX(Math.PI / 2), S(cr, cr, cr * 0.8)]),
    look.crest,
    '#fff0b0',
    1,
  );

  // The fuse, out of the collar.
  const len = 0.86 * (0.68 + 0.32 * b.k) * b.k;
  push(
    b,
    'trim',
    fuseShape(),
    pose([T(0, b.height * 0.96, 0), S(len, len, len)]),
    look.trim,
    '#e8cfa4',
    1,
  );

  /**
   * The spark, pinned to the fuse TIP — read off `fuseShape`'s own path at t = 1, which is
   * (0.36·sin 2.1, 1, 0.06·sin 3.4), rather than guessed. `Slime.tsx` hangs bomb's single mote here
   * instead of putting it in orbit, because a spark that circles the slime is a firefly.
   */
  b.sparkAt = [0.36 * Math.sin(2.1) * len, b.height * 0.96 + len, 0.06 * Math.sin(3.4) * len];

  /**
   * The cheeks. Flattened against the hide, below the eye line and out to the sides.
   *
   * `t = 0.36` is chosen against the FACE: `Slime.tsx` puts the eyes between t = 0.45 and t = 0.52
   * depending on stage, so this sits just under the lower lid at every stage without ever colliding
   * with one. Squashed hard on the outward axis so it lies on the surface as a patch rather than
   * bulging off it as a lump.
   */
  const ct = 0.36;
  const crr = b.radiusAt(ct);
  for (const side of [-1, 1] as const) {
    const a = side * 0.66;
    const cs = 0.19 * b.k;
    push(
      b,
      'trim',
      cheekShape(),
      pose([
        T(Math.sin(a) * crr * 0.97, b.height * ct, Math.cos(a) * crr * 0.97),
        RY(a),
        S(cs, cs * 0.72, cs * 0.4),
      ]),
      // A warm dusty rose. Deliberately not a saturated pink: on a body this dark a bright blush reads as
      // a sticker, and a muted one reads as a blush.
      '#e08a92',
      '#f2b0b6',
      1,
    );
  }
}

const BUILD: Record<Family, (b: Build) => void> = {
  waffle: buildWaffle,
  rose: buildRose,
  grass: buildGrass,
  rock: buildRock,
  fairy: buildFairy,
  frost: buildFrost,
  bunny: buildBunny,
  cat: buildCat,
  lion: buildLion,
  strawberry: buildStrawberry,
  fire: buildFire,
  ice: buildIce,
  gold: buildGold,
  wood: buildWood,
  mango: buildMango,
  air: buildAir,
  radioactive: buildRadioactive,
  sleepy: buildSleepy,
  bomb: buildBomb,
};

/* ============================================================================
   what the component asks for
   ========================================================================== */

export interface FeatureBake {
  /** The opaque parts, or null if a family has none. One draw call. */
  trim: THREE.BufferGeometry | null;
  /** The translucent parts — syrup, wings, ice — or null. One draw call. */
  glaze: THREE.BufferGeometry | null;
  /**
   * The parts that MOVE on their own — fire's flames, radioactive's trefoil, air's spiral, sleepy's Z — or
   * null, which is fifteen of nineteen families. One extra draw call for the four that have it.
   *
   * Baked relative to `auraOrigin`, so `Slime.tsx` can scale, spin or lift the whole group about a point
   * that means something on the creature.
   */
  aura: THREE.BufferGeometry | null;
  /** Where the aura group sits, in body units. Meaningless when `aura` is null. */
  auraOrigin: [number, number, number];
  /** How many sparkles drift near this family. */
  sparks: number;
  /**
   * Where the sparkles hang, in body units, if they are pinned to a point rather than orbiting. Only
   * `bomb` sets this — its one spark belongs on the fuse tip.
   */
  sparkAt?: [number, number, number];
}

const featureCache = new Map<string, FeatureBake>();

/**
 * A family's signature feature at a stage, baked and merged.
 *
 * Twenty-four of these exist at most, they are built on first sight and never rebuilt, and a slime holds
 * two references into them. `crestScale` is clamped at 1.12 rather than the table's 1.34: at full
 * strength a warden's petals and blades were large enough to compete with its own body for the outline,
 * and a grown slime should have a BIGGER feature, not a costume.
 */
export function featureGeometry(family: Family, stage: Stage): FeatureBake {
  const key = `${family}:${stage}`;
  const hit = featureCache.get(key);
  if (hit) return hit;

  const st = STAGE_LOOK[stage];
  const outline = bodyOutline(family);
  const b: Build = {
    family,
    k: Math.min(st.crestScale, 1.12),
    n: st.crestCount,
    height: outline.height,
    radiusAt: outline.radiusAt,
    parts: [],
    // Overwritten by the four builders that use the aura layer. Harmless for the other fifteen, whose
    // aura buffer comes back null and whose mesh is never mounted.
    auraOrigin: [0, 0, 0],
  };
  BUILD[family](b);

  /**
   * The aura parts are RE-BASED to `auraOrigin` here rather than in each builder.
   *
   * Builders place every part in body coordinates — one consistent frame, which is the only way this file
   * stays readable — and the subtraction happens once, at the bake, by pre-multiplying a translation.
   * Making the builders author in aura-local coordinates instead would have meant every flame and every
   * Z stroke carrying the offset by hand, which is the kind of duplicated arithmetic that goes wrong the
   * first time someone retunes a crown height.
   */
  const auraParts = b.parts.filter((p) => p.layer === 'aura');
  const rebase = T(-b.auraOrigin[0], -b.auraOrigin[1], -b.auraOrigin[2]);
  for (const p of auraParts) p.at = pose([rebase.clone(), p.at]);

  const out: FeatureBake = {
    trim: bake(b.parts.filter((p) => p.layer === 'trim')),
    glaze: bake(b.parts.filter((p) => p.layer === 'glaze')),
    aura: bake(auraParts),
    auraOrigin: b.auraOrigin,
    sparks: FAMILY_SPARKS[family],
    sparkAt: b.sparkAt,
  };
  featureCache.set(key, out);
  return out;
}
