import type { Material, Mesh, MeshStandardMaterial } from 'three';

/**
 * WHICH MESHES MAY BE MERGED WITH WHICH, and the one thing the answer deliberately ignores.
 *
 * COLOUR IS ABSENT FROM THE SIGNATURE, and that absence is the whole mechanism. The measurement in
 * `docs/design/bramblebrook-frame-budget.md` found roughly 380 main-pass draw calls issued by ONE
 * shader program, differing only in the colour uniform: 95 at #572904, 86 at #be6c0e, 61 at #231309,
 * and a long tail. Every one of those is a separate material instance, so three has to change a
 * uniform between them and cannot batch them. Baking the colour into a vertex attribute makes them
 * one material and therefore one draw call. `world/pigment.ts` already does this with `setColorAt`
 * for the instanced sets; this is the same trick for meshes that are individually unique.
 *
 * EVERYTHING ELSE THAT AFFECTS THE PIXEL IS PRESENT, because the merge must be invisible. Two
 * materials that differ in roughness shade differently; two that differ in `flatShading` have
 * different normals; two that differ in `side` cull differently. Merging across any of those changes
 * the image, which is the one thing this work is not allowed to do.
 *
 * `null` MEANS NEVER, and there are four reasons for it:
 *
 *   transparent    merging destroys the per-object draw order that transparency sorting depends on,
 *                  so the result is correct geometry drawn in the wrong order.
 *   any map        the merge drops uv attributes, so a textured material would lose its texture.
 *   vertexColors   the merge writes the colour attribute; a material already using one would have
 *                  its own overwritten.
 *   alphaTest / depthWrite:false / polygonOffset
 *                  each is a per-object depth behaviour, and a merged mesh has only one of them.
 */
const MAPS = [
  'map',
  'normalMap',
  'emissiveMap',
  'aoMap',
  'roughnessMap',
  'metalnessMap',
  'alphaMap',
  'bumpMap',
  'displacementMap',
  'lightMap',
] as const;

export function materialSignature(material: Material): string | null {
  if (material.transparent) return null;
  if (material.alphaTest > 0) return null;
  if (material.depthWrite === false) return null;
  if (material.polygonOffset) return null;

  const m = material as MeshStandardMaterial & Record<string, unknown>;
  if (m.vertexColors) return null;
  for (const slot of MAPS) if (m[slot]) return null;

  return [
    material.type,
    material.side,
    material.opacity,
    material.toneMapped,
    m.fog === false ? 'nofog' : 'fog',
    m.flatShading ? 'flat' : 'smooth',
    m.wireframe ? 'wire' : 'solid',
    m.roughness ?? '-',
    m.metalness ?? '-',
    m.emissive ? m.emissive.getHexString() : '-',
    m.emissiveIntensity ?? '-',
  ].join('|');
}

/**
 * Shadow flags belong in the grouping key, not merged by union.
 *
 * A merged mesh has ONE `castShadow` for all of its parts. Taking the union — casting if anything in
 * the group casts — would give a shadow to every prop that had deliberately been denied one, and
 * taking the intersection would silently delete shadows that are in the image today. Both change the
 * picture. Grouping by the pair instead means a merge only ever happens between meshes that already
 * agree, and the flags carry across untouched.
 */
export function castSignature(mesh: Mesh): string {
  return `${mesh.castShadow ? 'cast' : 'nocast'}|${mesh.receiveShadow ? 'recv' : 'norecv'}`;
}
