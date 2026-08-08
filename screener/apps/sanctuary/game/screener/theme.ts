import { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';

import { BANK_HUE, HUE, brackenColor, shade } from '../../world/palette';

/**
 * THE HOLLOW IN THREE DIMENSIONS — the tokens every dressing in this directory draws with.
 *
 * `world/palette.ts` already decided what Brackenhollow is made of, and this file does not relitigate
 * it. It translates. Two of that file's rules survive the move into 3D and both are correctness rather
 * than taste:
 *
 *   NO BLACK. `bark` is the darkest value in the world. In 2D that governed outlines; in 3D it governs
 *   SHADOWS, which is harder, because an unlit surface renders toward black by default. So the rig
 *   below carries a hemisphere fill strong enough that no face ever falls to black, and shadow opacity
 *   is capped. A #000 shadow under hand-carved stone is the fastest way to make this look like a
 *   physics demo instead of a hollow.
 *
 *   THE SIX BANK COLOUR NAMES STAY VISIBLY DISTINCT, spread across lightness as well as hue, because
 *   a matrix or carpet item whose active rule is `color` is only answerable while they do. `bankColor`
 *   below is `brackenColor`, unchanged, so 2D and 3D name the same six things the same six ways.
 *
 * WHAT IS NEW HERE, and the one bold move: the SOCKET. Every one of the ten dressings has exactly one
 * missing place — an empty pod, a gap in a path, an unfilled trough, an untied knot — and in every one
 * of them that place is a recessed niche ringed in breathing honey light. It is the only thing in the
 * world that moves on its own. A five-year-old who cannot read a word of this finds "the bit that
 * isn't there" in under a second, in all ten, because it is always the same light. Everything else is
 * deliberately quiet: matte stone, dry moss, one warm sun. One accessory, worn well.
 *
 * MATERIALS ARE MATTE. `metalness: 0` everywhere, `roughness` high. Nothing in a picture-book hollow
 * is chrome, and a specular highlight on an option tile reads as "this one is selected", which would
 * be a lie about a choice the child has not made yet.
 */

export { HUE, BANK_HUE, shade };

/** The bank's six colour names, resolved exactly as the 2D skin resolves them. */
export const bankColor = brackenColor;

/* ============================================================================
   surfaces
   ========================================================================== */

/**
 * The world's materials, as plain props for `<meshStandardMaterial {...MAT.stone} />`.
 *
 * Kept as data rather than as shared material instances on purpose: a dressing occasionally needs one
 * of these with a single field overridden (a stone that is a shade cooler, a moss that is damp), and
 * spreading a frozen object is safer than mutating a singleton that four other meshes are using.
 */
export const MAT = {
  /** Cut stone: every apparatus, every plinth, every slab. */
  stone: { color: HUE.stone, roughness: 0.92, metalness: 0 },
  stoneDeep: { color: HUE.stoneDeep, roughness: 0.95, metalness: 0 },
  /** The inside of a cut: grooves, niches, carved channels. Reads as shadow without being shadow. */
  cut: { color: shade(HUE.stoneDeep, -0.34), roughness: 1, metalness: 0 },
  /** Growing things. */
  moss: { color: HUE.moss, roughness: 0.98, metalness: 0 },
  mossDeep: { color: HUE.mossDeep, roughness: 1, metalness: 0 },
  fern: { color: HUE.fern, roughness: 0.95, metalness: 0 },
  /** Fallen wood: shelves, boughs, the log. */
  bark: { color: HUE.barkSoft, roughness: 0.94, metalness: 0 },
  barkDeep: { color: HUE.bark, roughness: 0.96, metalness: 0 },
  /** Rope, vine, lacing. */
  vine: { color: '#8f7a4a', roughness: 1, metalness: 0 },
  /** Where light pools: the socket ring, a lit arch, caught highlights. */
  glow: { color: HUE.honey, roughness: 0.5, metalness: 0, emissive: HUE.honey, emissiveIntensity: 0.9 },
  /** Paper-pale, for the one or two things that must read as lifted. */
  mist: { color: HUE.mist, roughness: 0.85, metalness: 0 },
} as const;

/** The sky the presentations sit against. Late paper, never a gradient banner. */
export const SKY = HUE.paper;
export const SKY_DEEP = HUE.paperDeep;

/* ============================================================================
   motion
   ========================================================================== */

/**
 * `prefers-reduced-motion`, live.
 *
 * Live rather than read-once because a parent may set it mid-session on a child's behalf, and this app
 * is the kind that gets adjusted while it is open. Everything that animates in this directory is
 * gated on this, and every gate resolves to the animation's own RESTING state rather than to nothing:
 * a socket that stopped breathing still glows, so the affordance survives.
 */
export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return false;
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  });
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const on = () => setReduced(mq.matches);
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);
  return reduced;
}

/**
 * A 0..1 triangle wave for the socket's breath and for hover lifts.
 *
 * Not a hook on the render loop: callers read it inside `useFrame` so nothing re-renders React at
 * 60fps. `reduced` pins it to its midpoint, which is why a reduced-motion socket sits at a steady
 * medium glow instead of snapping to full or to dark.
 */
export function breath(t: number, periodS: number, reduced: boolean): number {
  if (reduced) return 0.5;
  return 0.5 - 0.5 * Math.cos((t / periodS) * Math.PI * 2);
}

/** Frame-rate independent approach, so a lift feels the same on 60Hz and 120Hz. */
export function approach(current: number, target: number, dt: number, rateHz = 14): number {
  return current + (target - current) * (1 - Math.exp(-rateHz * dt));
}

/* ============================================================================
   geometry helpers shared across dressings
   ========================================================================== */

/**
 * How `count` marks sit inside one tile, for the matrix and carpet types.
 *
 * `count` is an ACTIVE RULE in both banks (1-3 for matrices, 1-4 for carpets), so the arrangement has
 * to make "how many" legible at a glance without ever letting two counts share a silhouette. Fixed
 * per-count layouts do that; a generic ring does not, because 2-in-a-ring and 3-in-a-ring look alike
 * from the front at this scale.
 */
export function tileLayout(count: number): readonly [number, number][] {
  switch (Math.max(1, Math.min(4, Math.round(count)))) {
    case 1:
      return [[0, 0]];
    case 2:
      return [
        [-0.26, 0],
        [0.26, 0],
      ];
    case 3:
      return [
        [0, 0.28],
        [-0.28, -0.2],
        [0.28, -0.2],
      ];
    default:
      return [
        [-0.26, 0.26],
        [0.26, 0.26],
        [-0.26, -0.26],
        [0.26, -0.26],
      ];
  }
}

/**
 * Where the nth object in a counted cluster sits, for the quantitative types.
 *
 * FIVES, DELIBERATELY. The brief forbids numerals, which means a child has to be able to COUNT these,
 * and a 12-object blob is not countable. Rows of five with a visible gap after each row make a heap
 * of eleven read as two rows and one, which is how a five-year-old actually counts. The series bank
 * reaches 84 and the sprouter 77 at its hardest, so the layout must not fall apart at scale either;
 * it grows in depth as well as width so a large heap stays a heap rather than a wall.
 */
export function clusterSlot(i: number, gap = 0.3): readonly [number, number, number] {
  const col = i % 5;
  const row = Math.floor(i / 5) % 4;
  const layer = Math.floor(i / 20);
  return [
    (col - 2) * gap + layer * gap * 0.34,
    layer * gap * 0.72,
    // The gap after each row of five is the whole point: it is what makes the heap countable.
    row * gap * 1.24,
  ];
}

/** A stable pseudo-random in 0..1 from a string, for scattering that must not jitter per frame. */
export function jitter(seed: string, salt = 0): number {
  let h = 2166136261 ^ salt;
  for (let i = 0; i < seed.length; i += 1) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return ((h >>> 0) % 10000) / 10000;
}

/* ============================================================================
   the light
   ========================================================================== */

/**
 * The rig, as data so every presentation and the preview light the world identically.
 *
 * A hemisphere doing over half the work is the "no black" rule expressed as lighting: it means the
 * side of a stone facing away from the sun is still a warm stone rather than a silhouette. The key is
 * warm and comes from high left, the fill is a cool bounce from low right, and there is no third
 * light, because two lights and a strong ambient is what a late afternoon actually looks like.
 */
export const RIG = {
  hemisphere: { skyColor: HUE.mist, groundColor: HUE.moss, intensity: 1.15 },
  key: { position: [5.5, 8, 4.5] as const, color: '#ffeecb', intensity: 1.5 },
  fill: { position: [-5, 2.5, -3] as const, color: '#bcd4de', intensity: 0.42 },
  /** Capped well short of opaque, because a black shadow has no place in this world. */
  shadowOpacity: 0.22,
} as const;

/* ============================================================================
   extrusion
   ========================================================================== */

/**
 * Turn an SVG-ish outline (points on a 100x100 box, y down) into a centred, extruded 3D geometry.
 *
 * WHY EXTRUSION AND NOT MODELS. Every mark these items are made of is named abstractly by the bank —
 * `star`, `bolt`, `flag`, `crescent` — and the whole vocabulary has to exist or an item silently
 * becomes unanswerable when it draws a name nothing has a picture for. Extruding outlines gives all
 * twenty-odd names real thickness, real shading and real shadows for a few hundred bytes each, and
 * they stay consistent with the 2D skin because they are the same silhouettes.
 *
 * Cached, because a 3x3 matrix with 6 options builds fifteen tiles per item and rebuilding a bevelled
 * extrusion fifteen times per serve is visible as a hitch on a school laptop.
 */
const geomCache = new Map<string, THREE.ExtrudeGeometry>();

export function extrudeOutline(
  cacheKey: string,
  points: readonly (readonly [number, number])[],
  opts: { depth?: number; bevel?: number } = {},
): THREE.ExtrudeGeometry {
  const depth = opts.depth ?? 14;
  const bevel = opts.bevel ?? 3;
  const key = `${cacheKey}|${depth}|${bevel}`;
  const hit = geomCache.get(key);
  if (hit) return hit;

  const shape = new THREE.Shape();
  points.forEach(([x, y], i) => {
    // y is negated: outlines are authored y-down like SVG, three is y-up.
    const px = (x - 50) / 100;
    const py = -(y - 50) / 100;
    if (i === 0) shape.moveTo(px, py);
    else shape.lineTo(px, py);
  });
  shape.closePath();

  const geom = new THREE.ExtrudeGeometry(shape, {
    depth: depth / 100,
    bevelEnabled: bevel > 0,
    bevelThickness: bevel / 100,
    bevelSize: bevel / 100,
    bevelSegments: 2,
    curveSegments: 6,
  });
  geom.center();
  geomCache.set(key, geom);
  return geom;
}

/** A rounded slab, used for every tile, plinth and option pedestal so the world has one radius. */
export function useSlab(w: number, h: number, d: number, r = 0.06): THREE.ExtrudeGeometry {
  return useMemo(() => {
    const key = `slab|${w}|${h}|${r}`;
    const cached = geomCache.get(`${key}|${d * 100}|0`);
    if (cached) return cached;
    const shape = new THREE.Shape();
    const hw = w / 2;
    const hh = h / 2;
    shape.moveTo(-hw + r, -hh);
    shape.lineTo(hw - r, -hh);
    shape.quadraticCurveTo(hw, -hh, hw, -hh + r);
    shape.lineTo(hw, hh - r);
    shape.quadraticCurveTo(hw, hh, hw - r, hh);
    shape.lineTo(-hw + r, hh);
    shape.quadraticCurveTo(-hw, hh, -hw, hh - r);
    shape.lineTo(-hw, -hh + r);
    shape.quadraticCurveTo(-hw, -hh, -hw + r, -hh);
    const geom = new THREE.ExtrudeGeometry(shape, {
      depth: d,
      bevelEnabled: true,
      bevelThickness: 0.012,
      bevelSize: 0.012,
      bevelSegments: 1,
      curveSegments: 4,
    });
    geom.center();
    geomCache.set(`${key}|${d * 100}|0`, geom);
    return geom;
  }, [w, h, d, r]);
}

/** Cheap stable id for cache keys and jitter seeds inside a render. */
export function useStableId(prefix: string): string {
  const ref = useRef<string>('');
  if (!ref.current) ref.current = `${prefix}-${Math.random().toString(36).slice(2, 8)}`;
  return ref.current;
}
