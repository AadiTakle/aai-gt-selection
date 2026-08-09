import * as THREE from 'three';

/**
 * THE SILHOUETTES THE WEAVE IS MADE OF — and the one attribute that is nearly always drawn away.
 *
 * `FLU-CARPET-01` rules on six attributes: `motif`, `count`, `color`, `rot`, `size` and `fill`. Five of
 * those survive any naive drawing. `fill` does not, because the obvious way to draw a motif is a filled
 * solid, and once every motif is filled the item that says "solid, hollow, solid, ..." has had its rule
 * deleted and is a coin toss with a plausible-looking picture. 63 cells across that bank carry
 * `fill: 0`, every one of them inside an item whose `activeAttrs` names `fill`, which is exactly the set
 * of items that becomes unanswerable.
 *
 * So a motif here has TWO geometries, from ONE path:
 *
 *   `fill: 1` → the closed silhouette, extruded solid.
 *   `fill: 0` → the same silhouette with a scaled copy of itself punched out as a real hole, so the
 *               pale woven bed of the tile is visible THROUGH the middle of the mark.
 *
 * A real hole rather than a pale plate laid on top, which was the first attempt: a plate catches the
 * key light and reads as a lighter mark rather than as a hollow one, and at tile size that is a
 * difference nobody can name. A hole shows the weave and the tile's own shadow through it, which is
 * unmistakable at a glance and survives being small.
 *
 * ONE PATH, TWO USES is also why these are functions of a scale factor rather than point tables: the
 * hole is the same drawing at `HOLE`, so a silhouette can never drift from its own outline version.
 *
 * `size` is handled by the CALLER, not here. Everything in this file draws inside a 1x1 box centred on
 * the origin, so a tile can scale a motif purely by the item's `size` step and nothing else — see the
 * note on `SIZE_STEP` in `Weave.tsx` about why scaling by `count` (which is what a tile normally does)
 * silently destroys the `size` rule.
 */

/** The five motif names the carpet bank actually uses, verified over all 120 items. */
export const MOTIFS = ['petal', 'leaf', 'chevron', 'bolt', 'capsule'] as const;

/**
 * How big the punched hole is, as a fraction of the silhouette.
 *
 * Chosen by looking at shots rather than by taste, and it is a compromise between two failures: too
 * small and a hollow petal reads as a solid petal with a speck in it; too large and the remaining band
 * is thinner than a tile's own shadow and the motif loses its silhouette, taking the `motif` rule down
 * with the `fill` one.
 */
const HOLE = 0.56;

/** Deep enough to catch the key light on its bevel, shallow enough not to read as a size difference. */
const DEPTH = 0.15;

type PathLike = THREE.Shape | THREE.Path;

/**
 * The outlines, each drawn into a path at scale `s` inside a 1x1 box.
 *
 * DISTINCTNESS IS CORRECTNESS HERE. `motif` is an active rule on 74 of the bank's 120 items, so two
 * silhouettes that read alike at tile size make those items unanswerable. The five are pulled apart
 * deliberately: `petal` is round-topped and narrow-based, `leaf` is pointed at the tip and carries a
 * stem, `chevron` is a bar bent in the middle, `bolt` is the only one with an S in it, `capsule` is the
 * only one that is wider than it is tall.
 */
const MOTIF_PATH: Record<string, (p: PathLike, s: number) => void> = {
  /** A flower petal: broad round crown, pinched where it joins the stem. */
  petal: (p, s) => {
    p.moveTo(0, -0.46 * s);
    p.bezierCurveTo(-0.3 * s, -0.2 * s, -0.46 * s, 0.16 * s, -0.21 * s, 0.4 * s);
    p.bezierCurveTo(-0.07 * s, 0.53 * s, 0.07 * s, 0.53 * s, 0.21 * s, 0.4 * s);
    p.bezierCurveTo(0.46 * s, 0.16 * s, 0.3 * s, -0.2 * s, 0, -0.46 * s);
  },
  /** A leaf: one sharp tip, a rounded base, and a stem — the stem is what keeps it off `petal`. */
  leaf: (p, s) => {
    p.moveTo(0, 0.5 * s);
    p.bezierCurveTo(0.27 * s, 0.22 * s, 0.36 * s, -0.1 * s, 0.11 * s, -0.33 * s);
    p.lineTo(0.075 * s, -0.5 * s);
    p.lineTo(-0.075 * s, -0.5 * s);
    p.lineTo(-0.11 * s, -0.33 * s);
    p.bezierCurveTo(-0.36 * s, -0.1 * s, -0.27 * s, 0.22 * s, 0, 0.5 * s);
  },
  /** A bar bent to a V. Already band-like, so its hollow version reads as a double line. */
  chevron: (p, s) => {
    p.moveTo(-0.48 * s, 0.34 * s);
    p.lineTo(0, -0.1 * s);
    p.lineTo(0.48 * s, 0.34 * s);
    p.lineTo(0.48 * s, 0.02 * s);
    p.lineTo(0, -0.46 * s);
    p.lineTo(-0.48 * s, 0.02 * s);
    p.lineTo(-0.48 * s, 0.34 * s);
  },
  /** A lightning bolt: the only motif with a reversal in its outline. */
  bolt: (p, s) => {
    p.moveTo(0.1 * s, 0.5 * s);
    p.lineTo(-0.31 * s, 0.06 * s);
    p.lineTo(-0.03 * s, 0.06 * s);
    p.lineTo(-0.22 * s, -0.5 * s);
    p.lineTo(0.31 * s, -0.04 * s);
    p.lineTo(0.03 * s, -0.04 * s);
    p.lineTo(0.1 * s, 0.5 * s);
  },
  /** A stadium lying down: the only motif broader than it is tall, at every rotation step. */
  capsule: (p, s) => {
    const w = 0.94 * s;
    const h = 0.46 * s;
    const r = h / 2;
    p.moveTo(-w / 2 + r, -h / 2);
    p.lineTo(w / 2 - r, -h / 2);
    p.absarc(w / 2 - r, 0, r, -Math.PI / 2, Math.PI / 2, false);
    p.lineTo(-w / 2 + r, h / 2);
    p.absarc(-w / 2 + r, 0, r, Math.PI / 2, (Math.PI * 3) / 2, false);
  },
};

/**
 * Cached, because a 3x3 carpet with five candidates draws up to fourteen tiles of up to four marks —
 * fifty-six bevelled extrusions per item, rebuilt on every serve, which is visible as a hitch on a
 * school laptop.
 */
const cache = new Map<string, THREE.ExtrudeGeometry>();

export function motifGeometry(motif: string, hollow: boolean): THREE.ExtrudeGeometry {
  const name = MOTIF_PATH[motif] ? motif : 'petal';
  const key = `${name}|${hollow ? 'ring' : 'solid'}`;
  const hit = cache.get(key);
  if (hit) return hit;

  const draw = MOTIF_PATH[name]!;
  const shape = new THREE.Shape();
  draw(shape, 1);
  if (hollow) {
    const hole = new THREE.Path();
    draw(hole, HOLE);
    shape.holes.push(hole);
  }
  const geom = new THREE.ExtrudeGeometry(shape, {
    depth: DEPTH,
    bevelEnabled: true,
    bevelThickness: 0.02,
    bevelSize: 0.02,
    bevelSegments: 1,
    curveSegments: 8,
  });
  // Centred on its own bounding box, which is the SOLID's box in both cases because the hole is
  // strictly inside it — so a hollow mark sits exactly where its solid twin would, and `fill` cannot
  // leak as a position difference.
  geom.center();
  cache.set(key, geom);
  return geom;
}

/**
 * One mark, inside a 1x1 box, facing +Z.
 *
 * NEARLY MATTE, and the shine was turned down for a reason a screenshot found. With a strong clearcoat the
 * mark in the tile directly in front of the station's lamp mirrored it and rendered near-WHITE — while the
 * same motif in the same colour two cells away rendered violet. `color` is an active rule on 61 of the
 * carpet bank's items, so a highlight that can turn one cell's colour into another is not a gloss problem,
 * it is a wrong answer. Enough sheen remains to shape the bevel and show which marks are hollow.
 */
export function Motif({ motif, color, fill = 1 }: { motif: string; color: string; fill?: number }) {
  return (
    <mesh geometry={motifGeometry(motif, fill === 0)}>
      <meshPhysicalMaterial color={color} roughness={0.5} clearcoat={0.25} clearcoatRoughness={0.55} />
    </mesh>
  );
}
