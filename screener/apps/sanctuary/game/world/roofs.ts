import { BufferGeometry, ExtrudeGeometry, Float32BufferAttribute, Shape } from 'three';

/**
 * Roofs that cannot intersect their walls.
 *
 * THE DEFECT THIS MODULE EXISTS TO KILL. The first pass built a hut as a capsule with a cone dropped
 * on top, positioned by eye. A cone's apex is at `+height/2` and its base at `-height/2` about its own
 * origin, so "put the roof at y = 3.3" silently buried the bottom half of the cone inside the walls and
 * left the rim poking out through them. Eyeballing is what failed, so nothing here is eyeballed.
 *
 * THE INVARIANT, and it is the whole design. Every roof geometry below is authored in a local frame
 * whose **origin sits on the top plane of the walls**, and every vertex it emits satisfies `y >= 0`.
 * The lowest points in a roof are its eave corners, and they are at exactly `y = 0`. So mounting a roof
 * at `position=[0, wallTop, 0]` places its lowest surface exactly flush with the wall head and every
 * other part of it strictly above — there is no value of any parameter for which a roof vertex can
 * enter the wall solid. The overhang is produced by making the roof's *footprint* larger than the
 * walls (`eave`, `rake`), which moves material sideways into open air above the wall head rather than
 * downward into the wall. Sideways can never intersect; downward is the only thing that could, and
 * downward is forbidden by construction.
 *
 * The corollary the barn needs: a gable roof leaves an open triangle between the wall head and the
 * underside of the two slopes. `gableWallShape` fills it, and it is derived from the *same* numbers as
 * the roof and traced from the roof's own soffit line, so the two agree by construction instead of by
 * a matching pair of hand-typed heights.
 *
 * Triangle soup rather than an indexed mesh, on purpose: a roof wants flat shading — hard, clean planes
 * meeting at a ridge — and un-shared vertices give that from `computeVertexNormals()` for free. These
 * are 40-90 triangle objects, so the cost of not sharing is nothing.
 */

type P3 = readonly [number, number, number];

/** Accumulates flat-shaded triangles and planar UVs, then hands back a geometry. */
class Soup {
  private readonly pos: number[] = [];
  private readonly uv: number[] = [];

  /** Wound counter-clockwise as seen from *outside* the solid. */
  tri(a: P3, b: P3, c: P3): void {
    this.pos.push(a[0], a[1], a[2], b[0], b[1], b[2], c[0], c[1], c[2]);
    // Planar UVs: drop the axis the face most faces, keep the other two. Only ever sampled by the
    // low-contrast grain map, so a per-face projection is indistinguishable from a real unwrap and
    // costs no bookkeeping.
    const ux = b[0] - a[0];
    const uy = b[1] - a[1];
    const uz = b[2] - a[2];
    const vx = c[0] - a[0];
    const vy = c[1] - a[1];
    const vz = c[2] - a[2];
    const nx = Math.abs(uy * vz - uz * vy);
    const ny = Math.abs(uz * vx - ux * vz);
    const nz = Math.abs(ux * vy - uy * vx);
    const pick = (p: P3): readonly [number, number] =>
      nx >= ny && nx >= nz ? [p[2], p[1]] : ny >= nz ? [p[0], p[2]] : [p[0], p[1]];
    for (const p of [a, b, c] as const) {
      const [s, t] = pick(p);
      this.uv.push(s, t);
    }
  }

  quad(a: P3, b: P3, c: P3, d: P3): void {
    this.tri(a, b, c);
    this.tri(a, c, d);
  }

  geometry(): BufferGeometry {
    const g = new BufferGeometry();
    g.setAttribute('position', new Float32BufferAttribute(this.pos, 3));
    g.setAttribute('uv', new Float32BufferAttribute(this.uv, 2));
    g.computeVertexNormals();
    g.computeBoundingSphere();
    return g;
  }

  /** The guard that makes the invariant testable rather than merely claimed. */
  minY(): number {
    let m = Infinity;
    for (let i = 1; i < this.pos.length; i += 3) m = Math.min(m, this.pos[i] ?? Infinity);
    return m;
  }
}

export interface GableRoofSpec {
  /** Wall outside width, across the slopes. The roof spans this plus `eave` on each side. */
  width: number;
  /** Wall outside depth, along the ridge. The roof spans this plus `rake` at each gable. */
  depth: number;
  /** Ridge height above the wall head. */
  rise: number;
  /** Slab thickness, measured vertically. What you see as the fascia edge at the eaves. */
  thickness: number;
  /** Horizontal overhang past the wall at the eaves (the long sides). */
  eave: number;
  /** Horizontal overhang past the wall at the gable ends (the rake). */
  rake: number;
}

/**
 * A gable roof as a closed chevron slab. Ridge runs along local Z; gables face local ±X.
 *
 * `y = 0` is the wall head. The soffit (underside) lies on that plane at the eaves and rises to the
 * ridge; the outer skin is the same surface lifted by `thickness`. So the slab's lowest points are the
 * four eave corners at `y = 0`, and `minY()` is asserted to be 0 before the geometry is returned.
 */
export function gableRoofGeometry(spec: GableRoofSpec): BufferGeometry {
  const { width, depth, rise, thickness: t, eave, rake } = spec;
  const hw = width / 2 + eave;
  const hd = depth / 2 + rake;

  // Soffit ring, on the wall-head plane.
  const b0: P3 = [-hw, 0, -hd];
  const b1: P3 = [hw, 0, -hd];
  const b2: P3 = [hw, 0, hd];
  const b3: P3 = [-hw, 0, hd];
  const bR0: P3 = [0, rise, -hd];
  const bR1: P3 = [0, rise, hd];
  // Outer skin, the same ring lifted.
  const t0: P3 = [-hw, t, -hd];
  const t1: P3 = [hw, t, -hd];
  const t2: P3 = [hw, t, hd];
  const t3: P3 = [-hw, t, hd];
  const tR0: P3 = [0, rise + t, -hd];
  const tR1: P3 = [0, rise + t, hd];

  const s = new Soup();
  // Outer skin: the two slopes.
  s.quad(t0, t3, tR1, tR0);
  s.quad(tR0, tR1, t2, t1);
  // Soffit: the same two slopes, facing down and out.
  s.quad(b0, bR0, bR1, b3);
  s.quad(bR0, b1, b2, bR1);
  // Fascia at the eaves. This vertical band is what stops a roof reading as a folded sheet of paper.
  s.quad(b0, b3, t3, t0);
  s.quad(b1, t1, t2, b2);
  // Barge boards: the chevron section closing each gable end.
  s.quad(b0, t0, tR0, bR0);
  s.quad(bR0, tR0, t1, b1);
  s.quad(b3, bR1, tR1, t3);
  s.quad(bR1, b2, t2, tR1);

  assertSitsOnWalls('gable', s.minY());
  return s.geometry();
}

export interface HipRoofSpec {
  width: number;
  depth: number;
  rise: number;
  thickness: number;
  eave: number;
  /** Ridge length as a fraction of `depth`. 0 gives a pyramid, 1 would give a gable. */
  ridgeFraction: number;
}

/**
 * A hip roof: two trapezoid slopes plus a triangular hip at each end. Same slab construction, same
 * `y >= 0` invariant.
 *
 * The hut gets this rather than a gable because a hip closes itself — there is no triangle of wall
 * left over above the wall head, so there is nothing to keep in agreement. It also reads softer and
 * more cottage-like than a gable, which is the right silhouette for the one building a child is meant
 * to read as somebody's home rather than as storage.
 */
export function hipRoofGeometry(spec: HipRoofSpec): BufferGeometry {
  const { width, depth, rise, thickness: t, eave, ridgeFraction } = spec;
  const hw = width / 2 + eave;
  const hd = depth / 2 + eave;
  const hr = Math.max(0, Math.min(hd - 0.2, (depth * ridgeFraction) / 2));

  const b0: P3 = [-hw, 0, -hd];
  const b1: P3 = [hw, 0, -hd];
  const b2: P3 = [hw, 0, hd];
  const b3: P3 = [-hw, 0, hd];
  const bR0: P3 = [0, rise, -hr];
  const bR1: P3 = [0, rise, hr];
  const t0: P3 = [-hw, t, -hd];
  const t1: P3 = [hw, t, -hd];
  const t2: P3 = [hw, t, hd];
  const t3: P3 = [-hw, t, hd];
  const tR0: P3 = [0, rise + t, -hr];
  const tR1: P3 = [0, rise + t, hr];

  const s = new Soup();
  // Outer skin.
  s.quad(t0, t3, tR1, tR0);
  s.quad(tR0, tR1, t2, t1);
  s.tri(t0, tR0, t1);
  s.tri(t3, t2, tR1);
  // Soffit.
  s.quad(b0, bR0, bR1, b3);
  s.quad(bR0, b1, b2, bR1);
  s.tri(b0, b1, bR0);
  s.tri(b3, bR1, b2);
  // Fascia, all four eaves.
  s.quad(b0, b3, t3, t0);
  s.quad(b1, t1, t2, b2);
  s.quad(b0, t0, t1, b1);
  s.quad(b3, b2, t2, t3);

  assertSitsOnWalls('hip', s.minY());
  return s.geometry();
}

/**
 * The triangle of wall a gable roof leaves open, traced from that roof's own soffit.
 *
 * Height at the wall face is `rise * (1 - halfWall / halfRoof)`, which is the soffit's height where it
 * crosses the wall plane — not a guessed number. The whole outline is then pulled in by `inset` so the
 * wall stops just short of the roof and you read a shadow line at the join, the way you would on a
 * building. Because the soffit rises *outward* more slowly than a straight line to the apex would, the
 * pentagon is everywhere at or below the soffit, so this cannot poke through the roof either.
 *
 * Returned as a `Shape` so the caller can extrude it with a bevel and get the same soft edge as the
 * rounded boxes the rest of the building is made of.
 */
export function gableWallShape(spec: {
  /** Outside width of the wall this sits on. */
  width: number;
  /** Ridge height above the wall head — the same `rise` handed to `gableRoofGeometry`. */
  rise: number;
  /** The same `eave` handed to `gableRoofGeometry`. */
  eave: number;
  /** Reveal held back from the roof, and from the wall face below. */
  inset: number;
}): Shape {
  const { width, rise, eave, inset } = spec;
  const halfRoof = width / 2 + eave;
  const halfWall = width / 2 - inset;
  const shoulder = rise * (1 - halfWall / halfRoof) - inset;
  const apex = rise - inset;

  const shape = new Shape();
  shape.moveTo(-halfWall, 0);
  shape.lineTo(halfWall, 0);
  shape.lineTo(halfWall, shoulder);
  shape.lineTo(0, apex);
  shape.lineTo(-halfWall, shoulder);
  shape.closePath();
  return shape;
}

/**
 * The gable wall as a bevelled plate, with the bevel's own growth compensated for.
 *
 * `ExtrudeGeometry` grows a bevelled shape by `bevelSize` in the plane and by `bevelThickness` through
 * it, so a plate asked for at the wall's exact width comes back wider than the wall and stands proud of
 * it. Every dimension below is therefore pre-shrunk by exactly what the bevel will add, so what arrives
 * is the size that was asked for. This is the same class of bug as the cone in the walls, one level down.
 */
export function gableWallGeometry(spec: {
  width: number;
  rise: number;
  eave: number;
  /** Through-thickness of the plate, before the bevel. */
  depth: number;
  bevel: number;
  inset: number;
}): BufferGeometry {
  const { width, rise, eave, depth, bevel, inset } = spec;
  const shape = gableWallShape({
    width: width - 2 * bevel,
    rise: rise - bevel,
    eave,
    inset: inset + bevel,
  });
  const g = new ExtrudeGeometry(shape, {
    depth: Math.max(0.02, depth - 2 * bevel),
    bevelEnabled: true,
    bevelThickness: bevel,
    bevelSize: bevel,
    bevelSegments: 2,
    steps: 1,
    curveSegments: 2,
  });
  // Extruded along +Z from z=0; centre it so the caller positions by the wall's mid-plane.
  g.translate(0, 0, -(depth - 2 * bevel) / 2);
  g.computeVertexNormals();
  return g;
}

/** Fails loudly in development rather than shipping a roof that eats its walls. */
function assertSitsOnWalls(kind: string, minY: number): void {
  if (Math.abs(minY) > 1e-6) {
    throw new Error(
      `${kind} roof would ${minY < 0 ? 'sink into' : 'float above'} its walls: lowest vertex at y=${minY}`,
    );
  }
}

/**
 * A one-shot self-check, exported so a preview page or a test can prove the invariant instead of
 * trusting the comment above it. Returns the lowest vertex of each roof kind across a sweep of
 * parameters; every entry must be exactly 0.
 */
export function roofInvariantReport(): { spec: string; minY: number }[] {
  const out: { spec: string; minY: number }[] = [];
  for (const rise of [0.8, 2.4, 4.5]) {
    for (const eave of [0, 0.35, 1.2]) {
      for (const thickness of [0.1, 0.45]) {
        const gable = gableRoofGeometry({ width: 8, depth: 12, rise, thickness, eave, rake: eave });
        const hip = hipRoofGeometry({ width: 7, depth: 5, rise, thickness, eave, ridgeFraction: 0.4 });
        for (const [name, g] of [
          [`gable rise=${rise} eave=${eave} t=${thickness}`, gable],
          [`hip rise=${rise} eave=${eave} t=${thickness}`, hip],
        ] as const) {
          const pos = g.getAttribute('position');
          let m = Infinity;
          for (let i = 0; i < pos.count; i += 1) m = Math.min(m, pos.getY(i));
          out.push({ spec: name, minY: m });
          g.dispose();
        }
      }
    }
  }
  return out;
}
