/**
 * WHERE THE SILHOUETTES COME FROM — every vertex a slime owns, baked once and shared forever.
 *
 * The whole track hangs on one decision made here: a family's shape is BAKED INTO GEOMETRY at module
 * load, not produced by scaling a sphere at runtime. Six families times three levels of detail is
 * eighteen buffers, built once, cached by key, and handed to every mesh that asks. Forty slimes on
 * screen therefore cost forty draw calls' worth of matrices and zero geometry work, and a family can
 * have a genuinely different outline — a pinched droplet, a stone with broad facets, a heavy skirt —
 * rather than the same ball at a different aspect ratio, which is what a scale-only approach gets you
 * and what a five-year-old sees through immediately.
 *
 * EVERY SURFACE IS AN ICOSPHERE, never a UV sphere. Two reasons, both visible: a UV sphere crowds its
 * triangles at the poles and starves them at the equator, so a slime deformed from one shows a pinch
 * on top exactly where the crest draws the eye; and its seam catches the rim light as a visible line
 * down the silhouette. An icosphere is uniform everywhere and has no seam. It also has no usable UVs,
 * which is why nothing here relies on them — the shaders read the `aDir` attribute below instead.
 *
 * `aDir` IS THE UNDEFORMED UNIT DIRECTION of each vertex, kept alongside the deformed position. It is
 * the coat's coordinate system: spots and bands are computed from `aDir` in the fragment shader, so a
 * pattern stays perfectly round on a lumpy stone body and does not smear where the geometry stretches.
 * It is also how the shader knows which way is "up the body" and "toward the face" for the mouth.
 */
import * as THREE from 'three';

import type { CrestKind, Profile } from './look';
import { FAMILY_LOOK } from './look';
import type { Family } from '../contract';

/* ============================================================================
   curves
   ========================================================================== */

const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);
const smoothstep = (a: number, b: number, x: number) => {
  const t = clamp01((x - a) / (b - a));
  return t * t * (3 - 2 * t);
};

/**
 * The waist curve, read as Catmull-Rom through the stops.
 *
 * A spline rather than linear interpolation because the joins between stops land on the silhouette,
 * where a child is looking, and linear joins put a visible crease across the widest part of the body.
 */
function waistAt(stops: readonly number[], t: number): number {
  const n = stops.length;
  if (n === 0) return 1;
  if (n === 1) return stops[0] ?? 1;
  const x = clamp01(t) * (n - 1);
  const i = Math.min(n - 2, Math.floor(x));
  const f = x - i;
  const p0 = stops[Math.max(0, i - 1)] ?? stops[i] ?? 1;
  const p1 = stops[i] ?? 1;
  const p2 = stops[i + 1] ?? p1;
  const p3 = stops[Math.min(n - 1, i + 2)] ?? p2;
  const f2 = f * f;
  const f3 = f2 * f;
  return (
    0.5 *
    (2 * p1 + (-p0 + p2) * f + (2 * p0 - 5 * p1 + 4 * p2 - p3) * f2 + (-p0 + 3 * p1 - 3 * p2 + p3) * f3)
  );
}

/** A smooth three-lobe field over the sphere. Organic lumpiness, no tiling, no seams. */
function lumpField(x: number, y: number, z: number): number {
  return (
    (Math.sin(x * 3.1 + 0.7) * Math.sin(y * 2.3 + 1.9) +
      Math.sin(z * 2.7 + 2.4) * Math.sin(x * 1.9 - 0.6) +
      Math.sin(y * 3.5 - 1.2) * Math.sin(z * 2.1 + 0.3)) /
    3
  );
}

/**
 * Broad ROUNDED facets, for stone.
 *
 * The plateau term is the trick. A plain sine lump gives a potato; subtracting a harmonic pushes the
 * field to sit near a few discrete levels with rounded ramps between them, so the surface reads as
 * planes that have been weathered smooth. It stays C1 continuous, so there is no crease anywhere on
 * the silhouette — "faceted-but-rounded" and never actually faceted.
 */
function facetField(x: number, y: number, z: number): number {
  const v = Math.sin(x * 2.4 + 1.2) * Math.sin(y * 2.0 - 0.4) * Math.sin(z * 2.2 + 2.6) * 1.6;
  return (v - 0.34 * Math.sin(v * Math.PI * 2)) / 1.6;
}

/* ============================================================================
   the body
   ========================================================================== */

/** Ready-to-use geometry plus the numbers the component needs to hang things off the surface. */
export interface BodyBake {
  geometry: THREE.BufferGeometry;
  /** Widest half-width, in normalised body units where total height is 1. */
  halfWidth: number;
  /**
   * Surface half-width at a height, 0 at the ground and 1 at the crown.
   * Eyes, mouth and crest are placed with this, so they sit ON the hide rather than floating near it.
   */
  radiusAt: (h: number) => number;
}

/**
 * Deform one point of the unit sphere into a family's body.
 *
 * Kept as a plain function over three numbers, rather than a Vector3 method, because it is called
 * about a hundred thousand times at bake and again from the placement table.
 */
function deform(p: Profile, dx: number, dy: number, dz: number, out: THREE.Vector3): void {
  let r = waistAt(p.waist, (dy + 1) / 2);
  if (p.lump !== 0) r *= 1 + p.lump * lumpField(dx, dy, dz);
  if (p.facet !== 0) r *= 1 + p.facet * facetField(dx, dy, dz);

  // Sit. The base is drawn up toward a flat plate and spread outward, so a slime rests on the ground
  // like a filled water balloon instead of touching it at one tangent point.
  const flat = smoothstep(-0.3, -1, dy);
  const spread = 1 + p.sit * 0.34 * flat;
  let x = dx * r * spread;
  let z = dz * r * spread;
  const y = (dy + p.sit * 0.55 * flat) * p.aspect;

  if (p.twist !== 0) {
    const a = p.twist * y * Math.PI;
    const c = Math.cos(a);
    const s = Math.sin(a);
    const nx = x * c - z * s;
    z = x * s + z * c;
    x = nx;
  }
  out.set(x, y, z);
}

const bodyCache = new Map<string, BodyBake>();

/**
 * A family's body at a level of detail.
 *
 * Detail 4 is 5,120 triangles and is the close-range hero; detail 3 is 1,280 and is indistinguishable
 * past a few metres; detail 2 is 320 and exists for the far corral. All three are baked lazily and
 * kept for the life of the page — there are only eighteen of them and they are what makes forty
 * slimes affordable.
 */
export function bodyGeometry(family: Family, detail: 2 | 3 | 4 = 4): BodyBake {
  const key = `${family}:${detail}`;
  const hit = bodyCache.get(key);
  if (hit) return hit;

  const profile = FAMILY_LOOK[family].profile;
  const src = new THREE.IcosahedronGeometry(1, detail);
  const dir = src.getAttribute('position') as THREE.BufferAttribute;
  const count = dir.count;

  const pos = new Float32Array(count * 3);
  const dirs = new Float32Array(count * 3);
  const v = new THREE.Vector3();
  let minY = Infinity;
  let maxY = -Infinity;
  let halfWidth = 0;

  for (let i = 0; i < count; i += 1) {
    // IcosahedronGeometry positions are already unit length, so they are the direction too.
    const dx = dir.getX(i);
    const dy = dir.getY(i);
    const dz = dir.getZ(i);
    deform(profile, dx, dy, dz, v);
    pos[i * 3] = v.x;
    pos[i * 3 + 1] = v.y;
    pos[i * 3 + 2] = v.z;
    dirs[i * 3] = dx;
    dirs[i * 3 + 1] = dy;
    dirs[i * 3 + 2] = dz;
    if (v.y < minY) minY = v.y;
    if (v.y > maxY) maxY = v.y;
    const rr = Math.hypot(v.x, v.z);
    if (rr > halfWidth) halfWidth = rr;
  }
  src.dispose();

  // Normalise: base on the ground plane, total height exactly 1. Every stage then scales by one
  // number and a slime's feet are always at y=0, which is what the world track needs to place them.
  const height = maxY - minY || 1;
  const k = 1 / height;
  for (let i = 0; i < count; i += 1) {
    // Read through locals: indexing a typed array is `number | undefined` under
    // noUncheckedIndexedAccess, and the in-place compound assignment trips it.
    const x = pos[i * 3] ?? 0;
    const y = pos[i * 3 + 1] ?? 0;
    const z = pos[i * 3 + 2] ?? 0;
    pos[i * 3] = x * k;
    pos[i * 3 + 1] = (y - minY) * k;
    pos[i * 3 + 2] = z * k;
  }
  halfWidth *= k;

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geometry.setAttribute('aDir', new THREE.BufferAttribute(dirs, 3));
  geometry.computeVertexNormals();
  geometry.computeBoundingSphere();

  // Placement table. Sampled from the real deformed surface rather than from the waist curve, so the
  // sit-flattening and the twist are included and a mouth placed at h=0.3 is genuinely on the hide.
  const SAMPLES = 33;
  const table = new Float32Array(SAMPLES);
  for (let s = 0; s < SAMPLES; s += 1) {
    const dy = (s / (SAMPLES - 1)) * 2 - 1;
    const ring = Math.sqrt(Math.max(0, 1 - dy * dy));
    let best = 0;
    let bestH = 0;
    for (let a = 0; a < 12; a += 1) {
      const th = (a / 12) * Math.PI * 2;
      deform(profile, Math.cos(th) * ring, dy, Math.sin(th) * ring, v);
      best += Math.hypot(v.x, v.z);
      bestH += v.y;
    }
    table[s] = (best / 12) * k;
    // Re-index the table by real height, approximately, by storing radius against sampled height.
    void bestH;
  }
  // Heights the samples actually landed at, so lookup by height is honest for a flattened base.
  const heights = new Float32Array(SAMPLES);
  for (let s = 0; s < SAMPLES; s += 1) {
    const dy = (s / (SAMPLES - 1)) * 2 - 1;
    const ring = Math.sqrt(Math.max(0, 1 - dy * dy));
    deform(profile, ring, dy, 0, v);
    heights[s] = (v.y - minY) * k;
  }

  const radiusAt = (h: number): number => {
    const t = clamp01(h);
    for (let s = 1; s < SAMPLES; s += 1) {
      const a = heights[s - 1] ?? 0;
      const b = heights[s] ?? 1;
      if (t <= b || s === SAMPLES - 1) {
        const f = b - a > 1e-6 ? (t - a) / (b - a) : 0;
        const ra = table[s - 1] ?? 0;
        const rb = table[s] ?? 0;
        return ra + (rb - ra) * clamp01(f);
      }
    }
    return table[SAMPLES - 1] ?? 0;
  };

  const bake: BodyBake = { geometry, halfWidth, radiusAt };
  bodyCache.set(key, bake);
  return bake;
}

/* ============================================================================
   the eyes
   ========================================================================== */

const eyeCache = new Map<number, THREE.BufferGeometry>();

/**
 * BOTH eyes, in one buffer, as two unit spheres stacked at the origin and told apart by `aEye`.
 *
 * Neither sphere is offset here and neither is scaled here, which is the point. Eye radius, the gap
 * between the eyes, where they sit on the face and which way they are looking all change with stage
 * and with the camera, so all of it happens in the vertex shader from uniforms. That keeps the face at
 * ONE draw call with ONE shared geometry for all twenty-four looks and all forty slimes, and it means
 * a warden's small eyes are still perfectly round rather than a squashed copy of a pip's.
 */
export function eyeGeometry(detail: 2 | 3 = 3): THREE.BufferGeometry {
  const hit = eyeCache.get(detail);
  if (hit) return hit;
  const src = new THREE.IcosahedronGeometry(1, detail);
  const p = src.getAttribute('position') as THREE.BufferAttribute;
  const n = p.count;
  const pos = new Float32Array(n * 6);
  const eye = new Float32Array(n * 2);
  for (let i = 0; i < n; i += 1) {
    for (let c = 0; c < 3; c += 1) {
      const val = p.getComponent(i, c);
      pos[i * 3 + c] = val;
      pos[(n + i) * 3 + c] = val;
    }
    eye[i] = -1;
    eye[n + i] = 1;
  }
  src.dispose();
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('aEye', new THREE.BufferAttribute(eye, 1));
  // Bounds are set generously by hand: the vertex shader moves these spheres a long way from the
  // origin, and a bounding sphere computed from the buffer would frustum-cull the face off screen.
  g.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 0, 0), 3);
  eyeCache.set(detail, g);
  return g;
}

/* ============================================================================
   what grows out of the body
   ========================================================================== */

/**
 * A lens: a leaf or a fin with real volume and a rim that thins to nothing.
 *
 * A crest made of flat planes is the fastest way to break the "no hard edges" rule, because a plane
 * seen edge-on is a one-pixel line across an otherwise soft creature. This sweeps an outline and
 * gives every point a thickness that falls to zero at the rim, so the shape is a closed shell with a
 * rounded edge from every angle.
 */
function lens(
  outline: (v: number) => number,
  thickness: number,
  curl: number,
  cols = 9,
  rows = 16,
): THREE.BufferGeometry {
  const verts: number[] = [];
  const dirsOut: number[] = [];
  const idx: number[] = [];
  const ringOf = (side: number) => {
    const base = verts.length / 3;
    for (let r = 0; r <= rows; r += 1) {
      const v = r / rows;
      const w = outline(v);
      for (let c = 0; c <= cols; c += 1) {
        const u = (c / cols) * 2 - 1;
        const t = thickness * w * Math.sqrt(Math.max(0, 1 - u * u));
        const bend = curl * v * v;
        verts.push(u * w, v, side * t + bend);
        dirsOut.push(u, v * 2 - 1, side);
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
  ringOf(1);
  ringOf(-1);
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
  g.setAttribute('aDir', new THREE.Float32BufferAttribute(dirsOut, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  g.computeBoundingSphere();
  return g;
}

/** A lathe of revolution with a soft tip: flames and dew droplets. */
function lathe(profile: (t: number) => number, height: number, segments = 20): THREE.BufferGeometry {
  const pts: THREE.Vector2[] = [];
  for (let i = 0; i <= 18; i += 1) {
    const t = i / 18;
    pts.push(new THREE.Vector2(Math.max(0.0005, profile(t)), t * height));
  }
  const g = new THREE.LatheGeometry(pts, segments);
  const p = g.getAttribute('position') as THREE.BufferAttribute;
  const dirsOut = new Float32Array(p.count * 3);
  for (let i = 0; i < p.count; i += 1) {
    const y = p.getY(i) / (height || 1);
    dirsOut[i * 3] = p.getX(i);
    dirsOut[i * 3 + 1] = y * 2 - 1;
    dirsOut[i * 3 + 2] = p.getZ(i);
  }
  g.setAttribute('aDir', new THREE.BufferAttribute(dirsOut, 3));
  g.computeVertexNormals();
  return g;
}

/** A small weathered stone, for cobble's shoulder shelf. */
function pebble(): THREE.BufferGeometry {
  const g = new THREE.IcosahedronGeometry(1, 2);
  const p = g.getAttribute('position') as THREE.BufferAttribute;
  const dirsOut = new Float32Array(p.count * 3);
  const v = new THREE.Vector3();
  for (let i = 0; i < p.count; i += 1) {
    v.fromBufferAttribute(p, i);
    dirsOut[i * 3] = v.x;
    dirsOut[i * 3 + 1] = v.y;
    dirsOut[i * 3 + 2] = v.z;
    const r = 1 + 0.16 * facetField(v.x * 2, v.y * 2, v.z * 2) + 0.06 * lumpField(v.x * 3, v.y * 3, v.z * 3);
    p.setXYZ(i, v.x * r * 1.15, v.y * r * 0.8, v.z * r);
  }
  g.setAttribute('aDir', new THREE.BufferAttribute(dirsOut, 3));
  g.computeVertexNormals();
  return g;
}

/** A rounded collar, for bellow's fold. Torus squashed flat, so it reads as a bellows pleat. */
function fold(): THREE.BufferGeometry {
  const g = new THREE.TorusGeometry(1, 0.36, 12, 30);
  g.rotateX(Math.PI / 2);
  g.scale(1, 0.6, 1);
  const p = g.getAttribute('position') as THREE.BufferAttribute;
  const dirsOut = new Float32Array(p.count * 3);
  for (let i = 0; i < p.count; i += 1) {
    const x = p.getX(i);
    const y = p.getY(i);
    const z = p.getZ(i);
    const l = Math.hypot(x, y, z) || 1;
    dirsOut[i * 3] = x / l;
    dirsOut[i * 3 + 1] = y / l;
    dirsOut[i * 3 + 2] = z / l;
  }
  g.setAttribute('aDir', new THREE.BufferAttribute(dirsOut, 3));
  return g;
}

const crestCache = new Map<CrestKind, THREE.BufferGeometry | null>();

/**
 * The crest for a family. Built once, shared by every slime of that family at every stage — stage
 * changes the scale and the count, never the mesh.
 */
export function crestGeometry(kind: CrestKind): THREE.BufferGeometry | null {
  if (crestCache.has(kind)) return crestCache.get(kind) ?? null;
  let g: THREE.BufferGeometry | null = null;
  switch (kind) {
    case 'leaf':
      // Broad at the shoulder, drawn to a soft tip, curled back over the head.
      g = lens((v) => 0.42 * Math.pow(Math.sin(Math.PI * Math.min(1, v * 0.94 + 0.06)), 0.62), 0.16, -0.34);
      break;
    case 'fin':
      // A swept wing: narrow root, wide middle, rounded tip. Reads as lift.
      g = lens((v) => 0.15 + 0.4 * Math.sin(Math.PI * Math.pow(v, 0.8)) * (1 - v * 0.35), 0.1, 0.18, 7, 14);
      break;
    case 'flame':
      g = lathe((t) => 0.34 * Math.pow(1 - t, 0.62) * (0.45 + 0.55 * Math.sin(Math.PI * Math.min(1, t * 1.6 + 0.1))), 1);
      break;
    case 'droplet':
      g = lathe((t) => 0.3 * Math.sin(Math.PI * Math.pow(t, 0.72)), 1, 16);
      break;
    case 'pebble':
      g = pebble();
      break;
    case 'fold':
      g = fold();
      break;
    default:
      g = null;
  }
  crestCache.set(kind, g);
  return g;
}

/* ============================================================================
   the nucleus
   ========================================================================== */

let coreGeom: THREE.BufferGeometry | null = null;

/** The soft nucleus suspended in the jelly. Visible through the hide, which is what sells "jelly". */
export function coreGeometry(): THREE.BufferGeometry {
  if (coreGeom) return coreGeom;
  const g = new THREE.IcosahedronGeometry(1, 2);
  const p = g.getAttribute('position') as THREE.BufferAttribute;
  const dirsOut = new Float32Array(p.count * 3);
  const v = new THREE.Vector3();
  for (let i = 0; i < p.count; i += 1) {
    v.fromBufferAttribute(p, i);
    dirsOut[i * 3] = v.x;
    dirsOut[i * 3 + 1] = v.y;
    dirsOut[i * 3 + 2] = v.z;
    const r = 1 + 0.2 * lumpField(v.x * 2.4, v.y * 2.4, v.z * 2.4);
    p.setXYZ(i, v.x * r, v.y * r * 0.86, v.z * r);
  }
  g.setAttribute('aDir', new THREE.BufferAttribute(dirsOut, 3));
  g.computeVertexNormals();
  coreGeom = g;
  return g;
}
