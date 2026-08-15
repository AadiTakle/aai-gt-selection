import { useLayoutEffect, useRef, type JSX } from 'react';
import {
  type BufferGeometry,
  Color,
  Euler,
  type InstancedMesh,
  type Material,
  Matrix4,
  Quaternion,
  Vector3,
} from 'three';

/**
 * One `InstancedMesh`, filled once.
 *
 * MOVED OUT OF `Buildings.tsx` so the windows and the barn's interior can use it without importing the
 * component that renders them. That is the whole reason for the file, and the reason it matters is the
 * draw-call budget: there are now about ninety repeated parts across the two buildings — shutter leaves,
 * mullions, planter blooms, stall dividers, loft joists, ladder rungs — and drawn as meshes they would
 * cost more than the entire rest of the ranch put together. Drawn through here they cost one call each.
 *
 * Written out rather than using drei's `<Instances>` because every placement is static: solved at module
 * scope, never animated, never picked. A component per instance would buy reactivity nothing uses and
 * cost a React node per shutter.
 */

export interface Placement {
  position: readonly [number, number, number];
  /**
   * Euler angles in radians, composed in `ZYX` order — about X first, then Y, then Z. That order is what
   * lets a windmill vane be given a pitch about its own long axis and THEN be swung into place around the
   * hub, and what lets a shutter be tilted open on its hinge after being turned to face its wall; the
   * default XYZ would tilt the whole assembly instead.
   */
  rot?: readonly [number, number, number];
  scale?: readonly [number, number, number];
  color?: Color;
}

export function Instanced({
  geometry,
  material,
  items,
  castShadow = true,
  receiveShadow = true,
  /**
   * Frustum culling is off by default because the ranch's instance sets span the whole world, so their
   * bounding sphere never culls anyway and the test is a per-frame sphere transform for nothing. The
   * barn's interior sets are the exception — they are small and often entirely off screen — so they turn
   * it back on.
   */
  frustumCulled = false,
}: {
  geometry: BufferGeometry;
  /**
   * `Material` rather than `MeshStandardMaterial`, because the windows' lit rooms are drawn on a
   * `MeshBasicMaterial`. That is not a loophole: an instance colour multiplies the DIFFUSE term, and on a
   * standard material a lit window's brightness lives in its EMISSIVE — so nine windows glowing at nine
   * different warmths would need nine materials and nine draw calls. On an unlit material the colour is
   * the output, so they cost one. See the note in `windows.tsx`.
   */
  material: Material;
  items: readonly Placement[];
  castShadow?: boolean;
  receiveShadow?: boolean;
  frustumCulled?: boolean;
}): JSX.Element {
  const ref = useRef<InstancedMesh>(null);

  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    const matrix = new Matrix4();
    const q = new Quaternion();
    const euler = new Euler(0, 0, 0, 'ZYX');
    const scale = new Vector3();
    const pos = new Vector3();
    let anyColor = false;
    items.forEach((item, i) => {
      pos.set(item.position[0], item.position[1], item.position[2]);
      scale.set(item.scale?.[0] ?? 1, item.scale?.[1] ?? 1, item.scale?.[2] ?? 1);
      euler.set(item.rot?.[0] ?? 0, item.rot?.[1] ?? 0, item.rot?.[2] ?? 0, 'ZYX');
      q.setFromEuler(euler);
      matrix.compose(pos, q, scale);
      mesh.setMatrixAt(i, matrix);
      if (item.color) {
        mesh.setColorAt(i, item.color);
        anyColor = true;
      }
    });
    mesh.instanceMatrix.needsUpdate = true;
    if (anyColor && mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    mesh.computeBoundingSphere();
  }, [items, geometry]);

  return (
    <instancedMesh
      ref={ref}
      args={[geometry, material, Math.max(1, items.length)]}
      count={items.length}
      castShadow={castShadow}
      receiveShadow={receiveShadow}
      frustumCulled={frustumCulled}
    />
  );
}
