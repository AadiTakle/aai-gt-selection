/**
 * WHAT GROWS OUT OF THE TOP — six small toppers, one per family, all smooth, all shared.
 *
 * WHY THIS SUPERSEDES `crestGeometry` IN `geometry.ts`. That version is close to right and its `lens`
 * idea is kept below, but two things in it break the craft bar the moment you look at a screenshot:
 * its pebble is an icosahedron at detail 2 pushed around by a quantising "facet" field, which is
 * *visibly faceted on the silhouette* — the one thing this game is not allowed to be — and its flame is
 * a tall spike, which on a creature reads as a candle, or a weapon, and not as a warm tuft.
 *
 * THE RULE FOR EVERYTHING IN THIS FILE, learned by rendering the first pass and looking at it: a crest
 * is a HAT, not a limb. The first pass sized kite's fins from a "reads as lift" argument and got
 * two-foot rabbit ears that dominated the body and pulled every eye away from the face. The face is the
 * charm. A crest exists so that a family is still identifiable from behind, at thirty pixels, and that
 * job is done at a fraction of the size that feels right while you are typing the numbers.
 *
 * No crest silhouette contains a straight line meeting another straight line. Everything is a swept
 * outline with a thickness that falls to zero at the rim, or a lathe with a rounded tip, so from any
 * angle — including edge-on, which is where flat planes betray themselves as one-pixel razors — the
 * outline is a curve.
 */
import * as THREE from 'three';

import type { Family } from '../contract';

export type CrestKind = 'leaf' | 'fin' | 'flame' | 'bead' | 'stone' | 'bun';

/** Which topper a family wears. Kept here rather than in `look.ts` so this file is self-contained. */
export const FAMILY_CREST: Record<Family, CrestKind> = {
  bellow: 'bun',
  rill: 'bead',
  cobble: 'stone',
  ember: 'flame',
  fern: 'leaf',
  kite: 'fin',
};

/**
 * A closed shell swept from an outline, with a thickness that falls to zero at the rim.
 *
 * `outline(v)` is the half-width at height v along the crest, 0 at the root and 1 at the tip. Both
 * faces are generated with opposite winding so the shell is genuinely closed and lights correctly from
 * either side; `curl` bends the tip out of plane, which is what stops a leaf reading as a cardboard
 * cutout stuck into a jelly.
 */
function lens(
  outline: (v: number) => number,
  thickness: number,
  curl: number,
  cols = 9,
  rows = 14,
): THREE.BufferGeometry {
  const verts: number[] = [];
  const idx: number[] = [];
  const face = (side: number) => {
    const base = verts.length / 3;
    for (let r = 0; r <= rows; r += 1) {
      const v = r / rows;
      const w = outline(v);
      for (let c = 0; c <= cols; c += 1) {
        const u = (c / cols) * 2 - 1;
        const t = thickness * w * Math.sqrt(Math.max(0, 1 - u * u));
        verts.push(u * w, v, side * t + curl * v * v);
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
  g.computeBoundingSphere();
  return g;
}

/** A solid of revolution with a rounded tip. Same trick as the body: the profile IS the silhouette. */
function lathe(profile: (t: number) => number, rows = 16, segments = 24): THREE.BufferGeometry {
  const pts: THREE.Vector2[] = [new THREE.Vector2(0, 0)];
  for (let i = 1; i <= rows; i += 1) {
    // Samples pushed toward the tip, where the curve turns hardest.
    const t = 1 - Math.pow(1 - i / rows, 1.6);
    pts.push(new THREE.Vector2(Math.max(0.0006, profile(t)), t));
  }
  const g = new THREE.LatheGeometry(pts, segments);
  g.computeVertexNormals();
  g.computeBoundingSphere();
  return g;
}

/**
 * A weathered stone that is round everywhere.
 *
 * Detail 3 rather than 2, and the deformation is a single smooth three-lobe field with no quantising
 * term, so the result is a lumpy potato with no flat spots. "Stone" is then carried by the material and
 * by there being several of them, which is where it belonged all along.
 */
function stone(): THREE.BufferGeometry {
  const g = new THREE.IcosahedronGeometry(1, 3);
  const p = g.getAttribute('position') as THREE.BufferAttribute;
  const v = new THREE.Vector3();
  for (let i = 0; i < p.count; i += 1) {
    v.fromBufferAttribute(p, i);
    const lump =
      Math.sin(v.x * 2.2 + 0.7) * Math.sin(v.y * 1.9 + 1.9) + Math.sin(v.z * 2.4 + 2.4) * Math.sin(v.x * 1.6 - 0.6);
    const r = 1 + 0.075 * lump;
    p.setXYZ(i, v.x * r * 1.1, v.y * r * 0.82, v.z * r);
  }
  g.computeVertexNormals();
  g.computeBoundingSphere();
  return g;
}

const cache = new Map<CrestKind, THREE.BufferGeometry>();

export function crestGeometry(kind: CrestKind): THREE.BufferGeometry {
  const hit = cache.get(kind);
  if (hit) return hit;
  let g: THREE.BufferGeometry;
  switch (kind) {
    case 'leaf':
      // Broad at the base, drawn to a soft tip, curling back over the head.
      g = lens((v) => 0.4 * Math.pow(Math.sin(Math.PI * Math.min(1, v * 0.92 + 0.08)), 0.58), 0.2, -0.3, 9, 13);
      break;
    case 'fin':
      // A short rounded paddle. Deliberately stubby: the tall version was rabbit ears. Thick, too — at
      // 0.22 a warden's fin was large enough to read as a folded plate of card stuck into its side.
      g = lens((v) => 0.26 + 0.34 * Math.sin(Math.PI * Math.pow(v, 0.75)) * (1 - v * 0.5), 0.42, 0.16, 9, 12);
      break;
    case 'flame':
      // A warm tuft: wide at the root, rounding over rather than tapering to a point.
      g = lathe((t) => 0.42 * Math.pow(Math.max(0, 1 - Math.pow(t, 2.1)), 0.58), 14, 24);
      break;
    case 'bead':
      // A dew drop: fat and round. The first pass was narrow and pointed, which on top of a peaked
      // body did not read as a drop of water at all — it read as a spike, or worse.
      g = lathe((t) => 0.62 * Math.sin(Math.PI * Math.pow(t, 0.52)) * (1 - 0.12 * t), 14, 22);
      break;
    case 'stone':
      g = stone();
      break;
    case 'bun': {
      // A soft low blob on the crown, like a bun of dough. A CLOSED sphere, not a dome.
      //
      // Two dead ends behind this one. It began as a torus pleat around the waist: any ring around a
      // body puts a closed curve across the silhouette on both sides at once, and a closed curve across a
      // silhouette is a hard line however soft the tube is — bellow rendered as a flying saucer with a
      // brim. It then became a lathed dome, which has a FLAT BASE, and a flat base sunk a little into a
      // curved crown shows its rim as a hard-edged plate, like a lid dropped on top. A closed blob has no
      // base to show: however it intersects the body, the join is hidden inside.
      g = new THREE.SphereGeometry(1, 26, 14);
      break;
    }
  }
  cache.set(kind, g);
  return g;
}
