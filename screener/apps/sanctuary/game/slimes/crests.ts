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
import { bodyOutline } from './gumdrop';
import { FAMILY_LOOK, MIST, POLLEN, STAGE_LOOK } from './look';

/** A one-line description of each family's read, for previews and for anyone grepping. */
export const FAMILY_FEATURE: Record<Family, string> = {
  waffle: 'syrup drip line + butter pat',
  rose: 'petal rosette + sepals',
  grass: 'blade tuft + daisy',
  rock: 'lowest body, boulders + moss',
  fairy: 'two pairs of wings + antennae',
  frost: 'ice spires + rime skirt',
};

/** How many sparkles drift near a family. Only fairy has any, and three is already generous. */
export const FAMILY_SPARKS: Record<Family, number> = {
  waffle: 0,
  rose: 0,
  grass: 0,
  rock: 0,
  fairy: 3,
  frost: 0,
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
    lens((v) => 0.3 * Math.pow(1 - Math.pow(v, 3.4), 0.4) * (0.52 + 0.48 * Math.sqrt(v)), 0.3, 0.16, 6, 13, 0.5, 1.6),
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
    lens((v) => 0.36 * Math.pow(1 - Math.pow(v, 2.2), 0.45) * (0.68 + 0.32 * Math.sqrt(v)), 0.45, 0.3, 5, 8, 0.12, 1.4),
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
          0.38 * Math.pow(Math.max(0, 1 - Math.pow(v, 2.6)), 0.45) * (1 + 0.44 * Math.sin(v * Math.PI * 2.1 - 0.42)),
        ),
      0.62,
      0.58,
      7,
      13,
      0.1,
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
  shape('shard', () => spindle((t) => 0.2 * Math.pow(Math.max(0, 1 - Math.pow(t, 2.0)), 0.44), 9, 6));

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
      (t) => 0.06 * (1 - 0.22 * t) * Math.pow(Math.max(0, 1 - Math.pow(t, 12)), 0.34),
      14,
      7,
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

const BUILD: Record<Family, (b: Build) => void> = {
  waffle: buildWaffle,
  rose: buildRose,
  grass: buildGrass,
  rock: buildRock,
  fairy: buildFairy,
  frost: buildFrost,
};

/* ============================================================================
   what the component asks for
   ========================================================================== */

export interface FeatureBake {
  /** The opaque parts, or null if a family has none. One draw call. */
  trim: THREE.BufferGeometry | null;
  /** The translucent parts — syrup, wings, ice — or null. One draw call. */
  glaze: THREE.BufferGeometry | null;
  /** How many sparkles drift near this family. */
  sparks: number;
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
  };
  BUILD[family](b);

  const out: FeatureBake = {
    trim: bake(b.parts.filter((p) => p.layer === 'trim')),
    glaze: bake(b.parts.filter((p) => p.layer === 'glaze')),
    sparks: FAMILY_SPARKS[family],
  };
  featureCache.set(key, out);
  return out;
}
