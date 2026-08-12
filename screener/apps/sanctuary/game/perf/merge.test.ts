import { describe, expect, it } from 'vitest';
import {
  BoxGeometry,
  Color,
  Group,
  Mesh,
  MeshStandardMaterial,
  SphereGeometry,
} from 'three';

import { mergeGroup } from './merge';

const boxAt = (x: number, color: string): Mesh => {
  const m = new Mesh(new BoxGeometry(1, 1, 1), new MeshStandardMaterial({ color }));
  m.position.x = x;
  return m;
};

const triangleCount = (mesh: Mesh): number => {
  const g = mesh.geometry;
  return g.index ? g.index.count / 3 : g.attributes.position!.count / 3;
};

describe('merging the static world', () => {
  it('turns many meshes into one, with every triangle preserved', () => {
    const root = new Group();
    const a = boxAt(0, '#572904');
    const b = boxAt(4, '#be6c0e');
    root.add(a, b);
    root.updateMatrixWorld(true);

    const merged = mergeGroup([a, b], root)!;
    expect(merged).not.toBeNull();
    expect(triangleCount(merged)).toBe(24); // two boxes, twelve triangles each
  });

  it('bakes each source colour into the vertices, so one material serves them all', () => {
    const root = new Group();
    const a = boxAt(0, '#ff0000');
    const b = boxAt(4, '#0000ff');
    root.add(a, b);
    root.updateMatrixWorld(true);

    const merged = mergeGroup([a, b], root)!;
    const colors = merged.geometry.attributes.color!;
    const material = merged.material as MeshStandardMaterial;
    expect(colors).toBeDefined();
    expect(material.vertexColors).toBe(true);
    /* White, because three MULTIPLIES the vertex colour by the material colour. Leaving the first
       source's colour on the material would tint every other source by it. */
    expect(material.color.getHex()).toBe(0xffffff);

    const first = new Color(colors.getX(0), colors.getY(0), colors.getZ(0));
    expect(first.getHex()).toBe(new MeshStandardMaterial({ color: '#ff0000' }).color.getHex());

    const last = new Color(
      colors.getX(colors.count - 1),
      colors.getY(colors.count - 1),
      colors.getZ(colors.count - 1),
    );
    expect(last.getHex()).toBe(new MeshStandardMaterial({ color: '#0000ff' }).color.getHex());
  });

  it('bakes world position in, so the merged mesh sits where the originals did', () => {
    const root = new Group();
    const a = boxAt(0, '#ffffff');
    const b = boxAt(10, '#ffffff');
    root.add(a, b);
    root.updateMatrixWorld(true);

    const merged = mergeGroup([a, b], root)!;
    merged.geometry.computeBoundingBox();
    expect(merged.geometry.boundingBox!.max.x).toBeCloseTo(10.5, 5);
    expect(merged.geometry.boundingBox!.min.x).toBeCloseTo(-0.5, 5);
  });

  it('bakes position RELATIVE to the batch root, so a moved root still carries its merge', () => {
    const root = new Group();
    root.position.set(100, 0, 0);
    const a = boxAt(0, '#ffffff');
    const b = boxAt(10, '#ffffff');
    root.add(a, b);
    root.updateMatrixWorld(true);

    const merged = mergeGroup([a, b], root)!;
    merged.geometry.computeBoundingBox();
    // Local to the root, not the world: the merged mesh is added as the root's sibling under the
    // same parent transform, so world coordinates here would place it 100m away.
    expect(merged.geometry.boundingBox!.max.x).toBeCloseTo(10.5, 5);
  });

  it('carries the group\'s shadow flags onto the merged mesh', () => {
    const root = new Group();
    const a = boxAt(0, '#ffffff');
    const b = boxAt(4, '#ffffff');
    a.castShadow = true;
    b.castShadow = true;
    a.receiveShadow = true;
    b.receiveShadow = true;
    root.add(a, b);
    root.updateMatrixWorld(true);

    const merged = mergeGroup([a, b], root)!;
    expect(merged.castShadow).toBe(true);
    expect(merged.receiveShadow).toBe(true);
  });

  it('merges geometries whose indexing disagrees', () => {
    const root = new Group();
    const indexed = new Mesh(new BoxGeometry(1, 1, 1), new MeshStandardMaterial());
    const nonIndexed = new Mesh(
      new SphereGeometry(1, 6, 4).toNonIndexed(),
      new MeshStandardMaterial(),
    );
    nonIndexed.position.x = 5;
    root.add(indexed, nonIndexed);
    root.updateMatrixWorld(true);

    const merged = mergeGroup([indexed, nonIndexed], root);
    expect(merged).not.toBeNull();
    expect(triangleCount(merged!)).toBe(12 + new SphereGeometry(1, 6, 4).toNonIndexed().attributes.position!.count / 3);
  });

  it('flips the winding of a mirrored source, which would otherwise merge in inside-out', () => {
    /* REGRESSION found by `guard.mjs`. `applyMatrix4` moves vertices and normals and leaves the index
       alone, so a prop placed by mirroring another keeps its old winding once the mirror is baked in.
       Drawn on its own it is fine — three flips `frontFace` per object — but a merged mesh has no
       per-object correction left. */
    const root = new Group();
    const normal = boxAt(0, '#ffffff');
    const mirrored = boxAt(4, '#ffffff');
    mirrored.scale.x = -1;
    root.add(normal, mirrored);
    root.updateMatrixWorld(true);

    const merged = mergeGroup([normal, mirrored], root)!;
    const pos = merged.geometry.attributes.position!;
    const idx = merged.geometry.index;
    const at = (i: number) => {
      const v = idx ? idx.getX(i) : i;
      return [pos.getX(v), pos.getY(v), pos.getZ(v)] as const;
    };
    /* Signed volume via the divergence theorem: outward-facing triangles give a positive total.
       An inside-out half would drag the sum toward zero. */
    let volume = 0;
    const count = idx ? idx.count : pos.count;
    for (let i = 0; i < count; i += 3) {
      const [ax, ay, az] = at(i);
      const [bx, by, bz] = at(i + 1);
      const [cx, cy, cz] = at(i + 2);
      volume +=
        (ax * (by * cz - bz * cy) - ay * (bx * cz - bz * cx) + az * (bx * cy - by * cx)) / 6;
    }
    expect(volume).toBeCloseTo(2, 5); // two unit cubes, both facing outward
  });

  it('returns null for a single mesh, which is already one draw call', () => {
    const root = new Group();
    const a = boxAt(0, '#ffffff');
    root.add(a);
    root.updateMatrixWorld(true);
    expect(mergeGroup([a], root)).toBeNull();
  });
});
