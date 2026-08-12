import {
  BufferAttribute,
  Matrix4,
  Mesh,
  type BufferGeometry,
  type Material,
  type MeshStandardMaterial,
  type Object3D,
} from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

/**
 * MANY STATIC MESHES INTO ONE, with the image unchanged.
 *
 * Each source contributes its triangles, transformed into the batch root's space, plus a colour
 * attribute filled with its own material colour. The merged mesh carries one white material with
 * `vertexColors: true`, and three multiplies the two together — so every source keeps the colour it
 * had while the whole group costs one draw call instead of N.
 *
 * ══ THE FOUR THINGS THAT MAKE IT INVISIBLE ════════════════════════════════════════════════════════
 *
 * WHITE, NOT THE FIRST SOURCE'S COLOUR. Vertex colour is MULTIPLIED by the material colour. Cloning
 * the first source's material and leaving its colour in place would tint all the others by it — the
 * kind of bug that looks like a lighting change and gets argued about rather than measured.
 *
 * NO COLOUR-SPACE CONVERSION. `Material.color` is already in the linear working space (three's
 * `ColorManagement` converts on assignment from a hex string), and vertex colour attributes are read
 * in that same space. Converting here would double-apply the transfer function and every merged prop
 * would come out visibly pale.
 *
 * RELATIVE TO THE ROOT, NOT THE WORLD. The merged mesh is added under the same parent as the sources,
 * so baking world coordinates would apply that parent's transform twice.
 *
 * INDEXING IS NORMALISED. `mergeGeometries` refuses a mix of indexed and non-indexed geometry — it
 * returns null and logs — so any indexed geometry in a mixed group is expanded first. Expansion is
 * only done when the group is actually mixed, because it triples the vertex count of whatever it
 * touches.
 *
 * ══ WHAT IS DELIBERATELY DROPPED ══════════════════════════════════════════════════════════════════
 *
 * Every attribute except position and normal. `signature.ts` has already refused any material with a
 * texture, so uvs cannot matter to anything that reaches this function, and keeping them would force
 * every geometry in a group to agree on having them.
 */
const KEPT = new Set(['position', 'normal']);

/** Reverse every triangle so a mirrored geometry faces outward again. */
function flipWinding(geometry: BufferGeometry): void {
  const index = geometry.index;
  if (index) {
    const a = index.array as unknown as { [i: number]: number; length: number };
    for (let i = 0; i < a.length; i += 3) {
      const t = a[i]!;
      a[i] = a[i + 2]!;
      a[i + 2] = t;
    }
    index.needsUpdate = true;
    return;
  }
  /* Non-indexed: swap the first and third vertex of every triangle, in every attribute. */
  for (const name of Object.keys(geometry.attributes)) {
    const attr = geometry.attributes[name]!;
    const size = attr.itemSize;
    const a = attr.array as unknown as { [i: number]: number };
    for (let tri = 0; tri < attr.count; tri += 3) {
      for (let c = 0; c < size; c += 1) {
        const i0 = tri * size + c;
        const i2 = (tri + 2) * size + c;
        const t = a[i0]!;
        a[i0] = a[i2]!;
        a[i2] = t;
      }
    }
    attr.needsUpdate = true;
  }
}

function prepared(mesh: Mesh, toRoot: Matrix4): BufferGeometry | null {
  const source = mesh.geometry;
  if (!source?.attributes?.position) return null;

  const geometry = source.clone();
  for (const name of Object.keys(geometry.attributes)) {
    if (!KEPT.has(name)) geometry.deleteAttribute(name);
  }
  geometry.morphAttributes = {};
  if (!geometry.attributes.normal) geometry.computeVertexNormals();

  /* `applyMatrix4` transforms positions AND normals (by the inverse transpose), so a non-uniformly
     scaled prop keeps its shading. */
  const local = new Matrix4().copy(toRoot).multiply(mesh.matrixWorld);
  geometry.applyMatrix4(local);

  /**
   * A MIRRORED PROP COMES OUT INSIDE-OUT UNLESS ITS WINDING IS FLIPPED.
   *
   * `applyMatrix4` moves vertices and normals and does not touch the index, so a transform with a
   * negative determinant — any prop placed by mirroring another, which is how you build a pair of
   * lanterns or a symmetrical stall — keeps its original triangle winding while its geometry has been
   * turned through itself. three then culls the faces that should be visible and draws the ones that
   * should not, and the prop renders inside-out.
   *
   * It survived a mirrored mesh drawn on its own because the source mesh's own `matrixWorld` carried
   * the mirror and three's renderer flips `frontFace` per object for exactly this reason. Merging
   * bakes the mirror into the vertices, so that per-object correction is gone and the winding has to
   * be fixed here instead.
   *
   * Found by `guard.mjs`: four small props around the stall lanterns, 248 pixels out of 540,000.
   */
  if (local.determinant() < 0) flipWinding(geometry);

  const material = (Array.isArray(mesh.material) ? mesh.material[0] : mesh.material) as
    | MeshStandardMaterial
    | undefined;
  const color = material?.color;
  const count = geometry.attributes.position!.count;
  const colors = new Float32Array(count * 3);
  for (let i = 0; i < count; i += 1) {
    colors[i * 3] = color?.r ?? 1;
    colors[i * 3 + 1] = color?.g ?? 1;
    colors[i * 3 + 2] = color?.b ?? 1;
  }
  geometry.setAttribute('color', new BufferAttribute(colors, 3));

  return geometry;
}

export function mergeGroup(meshes: readonly Mesh[], root: Object3D): Mesh | null {
  /* One mesh is already one draw call. Merging it would spend a geometry clone to save nothing. */
  if (meshes.length < 2) return null;

  const toRoot = new Matrix4().copy(root.matrixWorld).invert();
  const geometries: BufferGeometry[] = [];
  for (const mesh of meshes) {
    const g = prepared(mesh, toRoot);
    if (g) geometries.push(g);
  }
  if (geometries.length < 2) {
    for (const g of geometries) g.dispose();
    return null;
  }

  const indexed = geometries.filter((g) => g.index !== null).length;
  if (indexed !== 0 && indexed !== geometries.length) {
    for (let i = 0; i < geometries.length; i += 1) {
      const g = geometries[i]!;
      if (g.index === null) continue;
      const expanded = g.toNonIndexed();
      g.dispose();
      geometries[i] = expanded;
    }
  }

  const merged = mergeGeometries(geometries);
  for (const g of geometries) g.dispose();
  if (!merged) return null;

  const first = (Array.isArray(meshes[0]!.material) ? meshes[0]!.material[0] : meshes[0]!.material) as Material;
  const material = first.clone() as MeshStandardMaterial;
  material.vertexColors = true;
  material.color?.setRGB(1, 1, 1);

  const mesh = new Mesh(merged, material);
  /* Grouped by `castSignature`, so every source agrees and reading the first is reading all of them. */
  mesh.castShadow = meshes[0]!.castShadow;
  mesh.receiveShadow = meshes[0]!.receiveShadow;
  mesh.matrixAutoUpdate = false;
  mesh.name = 'batched';
  return mesh;
}
