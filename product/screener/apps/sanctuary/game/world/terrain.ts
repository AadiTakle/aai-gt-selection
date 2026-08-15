import { BufferGeometry, Color, Float32BufferAttribute, Uint32BufferAttribute } from 'three';

import {
  HILL_END_R,
  HILL_START_R,
  HUT,
  PLATEAU_R,
  POND,
  TERRAIN_R,
  padMask,
  pathMask,
} from './layout';
import { clamp, fbm, lerp, noise2, smoothstep } from './noise';
import type { GroundPigment } from './palette3d';

/**
 * The shape of the valley.
 *
 * `heightAt` is the authority. The visual mesh, the physics collider, where a fern is allowed to grow
 * and the player's own ground check are all derived from this one function, which is why nothing in
 * the ranch ever floats or clips: there is no second opinion about where the ground is.
 */

/** Order matters: rolls, then hills, then the flat things people built, which win. */
export function heightAt(x: number, z: number): number {
  const r = Math.hypot(x, z);

  // Two scales of roll. The long one is the valley breathing, the short one keeps a hillside from
  // reading as a smooth CAD surface.
  const roll = fbm(x * 0.0195, z * 0.0195, 3) * 2.8;
  const bump = fbm(x * 0.072, z * 0.072, 2) * 0.62 + fbm(x * 0.185, z * 0.185, 2) * 0.16;

  // Flat is 1 in the heart of the valley and 0 by the foot of the hills. The plateau is *squashed*,
  // not levelled: a child should feel the ground rise and fall while walking between pens, and the
  // remaining 30% is about 80cm of relief over 50 metres, which you feel in the camera and never trip on.
  const flat = 1 - smoothstep(PLATEAU_R * 0.5, PLATEAU_R * 1.35, r);
  const rollFlat = lerp(roll, roll * 0.3, flat);
  let h = rollFlat + lerp(bump, bump * 0.34, flat);

  // The bowl of hills that holds the ranch. Squared so it leaves the plateau tangentially, with no
  // crease where the flat meets the rise.
  const hill = smoothstep(HILL_START_R, HILL_END_R, r);
  h += hill * hill * 27;
  // Ridge lumpiness, growing with distance so the far rim has a silhouette instead of a level horizon.
  h += hill * fbm(x * 0.0415 + 11.3, z * 0.0415 - 7.1, 3) * (3.4 + hill * 10);

  // The worn path keeps its footing: the short bumps are ironed out, the long rolls are not.
  const path = pathMask(x, z);
  if (path > 0.001) h = lerp(h, rollFlat, path * 0.75);

  // The pond sits in a rounded basin, so the water has a bank instead of a cut edge.
  const dPond = Math.hypot(x - POND.x, z - POND.z);
  const bowlT = 1 - clamp(dPond / (POND.radius + 1.7), 0, 1);
  if (bowlT > 0) {
    const bowl = bowlT * bowlT * (3 - 2 * bowlT);
    h = lerp(h, POND.level - POND.depth * Math.sqrt(bowl), bowl);
  }

  // The hut's footing.
  const dHut = Math.hypot(x - HUT.x, z - HUT.z);
  const hutT = 1 - smoothstep(HUT.radius + 0.4, HUT.radius + 3.6, dHut);
  if (hutT > 0) h = lerp(h, HUT.y, hutT * hutT * (3 - 2 * hutT));

  // Pen pads win outright. A slime placed by another track must never land on a slope.
  const pad = padMask(x, z);
  if (pad.mask > 0) h = lerp(h, pad.pad, pad.mask);

  return h;
}

/** Steepness at a point, 0 flat to 1 vertical. Used to keep trees off cliffs and the player off them. */
export function slopeAt(x: number, z: number, eps = 0.6): number {
  const hx = heightAt(x + eps, z) - heightAt(x - eps, z);
  const hz = heightAt(x, z + eps) - heightAt(x, z - eps);
  const grad = Math.hypot(hx, hz) / (2 * eps);
  return grad / Math.sqrt(1 + grad * grad);
}

/** Uphill direction, normalised in the xz plane. The bounds nudge uses it to push you back inward. */
export function downhillAt(x: number, z: number, eps = 0.8): readonly [number, number] {
  const hx = heightAt(x + eps, z) - heightAt(x - eps, z);
  const hz = heightAt(x, z + eps) - heightAt(x, z - eps);
  const len = Math.hypot(hx, hz);
  if (len < 1e-5) return [0, 0];
  return [-hx / len, -hz / len];
}

export interface TerrainMesh {
  positions: Float32Array;
  indices: Uint32Array;
  /** Vertex count, for sizing the colour attribute. */
  count: number;
}

/**
 * A polar disc rather than a grid.
 *
 * Two reasons, both about spending triangles where they are looked at. A grid dense enough for the
 * plateau wastes most of itself on a rim nobody walks to, and a grid's square corners are visible as a
 * straight edge the moment fog thins. A polar disc with a power-law radial spacing puts ~60% of its
 * rings inside the 25m plateau, thins out toward the hills, and has a circular silhouette that reads
 * as a horizon. Theta indices wrap modulo, and UVs come from world position rather than from the
 * ring index, so there is no seam where the mesh closes and nothing tiles.
 */
export function buildTerrainMesh(thetaSegments: number, radialSegments: number): TerrainMesh {
  const vertCount = 1 + thetaSegments * radialSegments;
  const positions = new Float32Array(vertCount * 3);
  const indices = new Uint32Array(thetaSegments * radialSegments * 2 * 3);

  // Centre pole.
  positions[0] = 0;
  positions[1] = heightAt(0, 0);
  positions[2] = 0;

  const vertexAt = (ring: number, theta: number): number =>
    1 + ring * thetaSegments + (((theta % thetaSegments) + thetaSegments) % thetaSegments);

  for (let ring = 0; ring < radialSegments; ring += 1) {
    const t = (ring + 1) / radialSegments;
    const radius = TERRAIN_R * Math.pow(t, 1.9);
    for (let theta = 0; theta < thetaSegments; theta += 1) {
      const a = (theta / thetaSegments) * Math.PI * 2;
      const x = Math.cos(a) * radius;
      const z = Math.sin(a) * radius;
      const i = vertexAt(ring, theta) * 3;
      positions[i] = x;
      positions[i + 1] = heightAt(x, z);
      positions[i + 2] = z;
    }
  }

  let w = 0;
  // Inner fan from the pole.
  for (let theta = 0; theta < thetaSegments; theta += 1) {
    indices[w++] = 0;
    indices[w++] = vertexAt(0, theta + 1);
    indices[w++] = vertexAt(0, theta);
  }
  // Quads outward.
  for (let ring = 0; ring < radialSegments - 1; ring += 1) {
    for (let theta = 0; theta < thetaSegments; theta += 1) {
      const a = vertexAt(ring, theta);
      const b = vertexAt(ring, theta + 1);
      const c = vertexAt(ring + 1, theta + 1);
      const d = vertexAt(ring + 1, theta);
      indices[w++] = a;
      indices[w++] = b;
      indices[w++] = c;
      indices[w++] = a;
      indices[w++] = c;
      indices[w++] = d;
    }
  }

  return { positions, indices, count: vertCount };
}

/** Geometry for the visible ground: normals computed, UVs stretched once across the whole disc. */
export function buildTerrainGeometry(thetaSegments = 176, radialSegments = 104): BufferGeometry {
  const mesh = buildTerrainMesh(thetaSegments, radialSegments);
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new Float32BufferAttribute(mesh.positions, 3));
  geometry.setIndex(new Uint32BufferAttribute(mesh.indices, 1));

  const uv = new Float32Array(mesh.count * 2);
  for (let i = 0; i < mesh.count; i += 1) {
    uv[i * 2] = (mesh.positions[i * 3] ?? 0) / (TERRAIN_R * 2) + 0.5;
    uv[i * 2 + 1] = (mesh.positions[i * 3 + 2] ?? 0) / (TERRAIN_R * 2) + 0.5;
  }
  geometry.setAttribute('uv', new Float32BufferAttribute(uv, 2));
  geometry.setAttribute('color', new Float32BufferAttribute(new Float32Array(mesh.count * 3), 3));
  geometry.computeVertexNormals();
  geometry.computeBoundingSphere();
  return geometry;
}

/**
 * Write the season's pigment into the ground's vertex colours.
 *
 * This is where the terrain stops being a shape and becomes a place. Five things are layered: patchy
 * meadow variation so the green is never one green, pale sun-bleached tops, bare warm earth on the
 * steep hillsides, the trodden path and pen floors, and mud under the waterline. Vertex colours
 * rather than a splat shader because there are only ~18k vertices, it costs one attribute upload
 * per season change, and it keeps the ground on plain `MeshStandardMaterial` — one draw call, no
 * custom shader to maintain, and it still lights and shadows correctly.
 */
export function paintTerrain(geometry: BufferGeometry, pigment: GroundPigment): void {
  const pos = geometry.getAttribute('position');
  const nrm = geometry.getAttribute('normal');
  const col = geometry.getAttribute('color');
  if (!pos || !nrm || !col) return;

  const c = new Color();
  const scratch = new Color();

  for (let i = 0; i < pos.count; i += 1) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);
    const steep = 1 - clamp(nrm.getY(i), 0, 1);

    // Patchy meadow: two noise fields at different scales, so clumps read as ground rather than static.
    const patch = noise2(x * 0.038 + 4.1, z * 0.038 - 2.7);
    const patchFine = noise2(x * 0.15 - 8.3, z * 0.15 + 5.9);
    c.copy(pigment.grassDeep).lerp(pigment.grass, smoothstep(0.28, 0.78, patch * 0.75 + patchFine * 0.25));

    // Sun-bleached crests. Keyed off height above the plateau so the hills read as catching more light.
    c.lerp(pigment.grassPale, smoothstep(0.7, 6.5, y) * 0.45 + patchFine * 0.1);

    // Bare earth where it is too steep for grass to hold.
    c.lerp(pigment.earth, smoothstep(0.34, 0.68, steep) * 0.85);
    c.lerp(pigment.stone, smoothstep(0.6, 0.86, steep) * 0.6);

    // What people wore in. Pen floors are the same earth, a touch warmer.
    const path = pathMask(x, z);
    if (path > 0.002) c.lerp(pigment.earth, path * 0.82);
    const pad = padMask(x, z);
    if (pad.mask > 0.002) {
      scratch.copy(pigment.earth).lerp(pigment.soil, 0.3);
      c.lerp(scratch, pad.mask * 0.7);
    }

    // Mud under the waterline, darkening with depth so the pond reads deep rather than painted on.
    if (y < POND.level + 0.35) {
      const wet = smoothstep(POND.level + 0.35, POND.level - 1.1, y);
      scratch.copy(pigment.soil).lerp(pigment.water, 0.35);
      c.lerp(scratch, wet * 0.9);
    }

    col.setXYZ(i, c.r, c.g, c.b);
  }
  col.needsUpdate = true;
}
