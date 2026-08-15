import { describe, expect, it } from 'vitest';
import { DoubleSide, Mesh, MeshBasicMaterial, MeshStandardMaterial, Texture } from 'three';

import { castSignature, materialSignature } from './signature';

describe('material signature', () => {
  it('ignores colour, because colour is what we bake into the vertices', () => {
    const a = new MeshStandardMaterial({ color: '#572904', roughness: 0.8 });
    const b = new MeshStandardMaterial({ color: '#be6c0e', roughness: 0.8 });
    expect(materialSignature(a)).toBe(materialSignature(b));
    expect(materialSignature(a)).not.toBeNull();
  });

  it('separates materials that shade differently', () => {
    const smooth = new MeshStandardMaterial({ roughness: 0.8 });
    const rough = new MeshStandardMaterial({ roughness: 0.2 });
    const flat = new MeshStandardMaterial({ roughness: 0.8, flatShading: true });
    const twoSided = new MeshStandardMaterial({ roughness: 0.8, side: DoubleSide });
    expect(materialSignature(smooth)).not.toBe(materialSignature(rough));
    expect(materialSignature(smooth)).not.toBe(materialSignature(flat));
    expect(materialSignature(smooth)).not.toBe(materialSignature(twoSided));
  });

  it('separates materials of different type', () => {
    expect(materialSignature(new MeshStandardMaterial())).not.toBe(
      materialSignature(new MeshBasicMaterial()),
    );
  });

  it('refuses transparency, because merging destroys the draw order it depends on', () => {
    expect(materialSignature(new MeshStandardMaterial({ transparent: true }))).toBeNull();
  });

  it('refuses a textured material, because the merge drops uvs', () => {
    const m = new MeshStandardMaterial();
    m.map = new Texture();
    expect(materialSignature(m)).toBeNull();
  });

  it('refuses a material that already carries vertex colours, which the merge would overwrite', () => {
    expect(materialSignature(new MeshStandardMaterial({ vertexColors: true }))).toBeNull();
  });
});

describe('shadow-flag signature', () => {
  it('keeps casters apart from non-casters, because a merged mesh has one pair of flags', () => {
    const caster = new Mesh();
    caster.castShadow = true;
    const plain = new Mesh();
    expect(castSignature(caster)).not.toBe(castSignature(plain));
  });

  it('matches two meshes that agree', () => {
    const a = new Mesh();
    a.castShadow = true;
    a.receiveShadow = true;
    const b = new Mesh();
    b.castShadow = true;
    b.receiveShadow = true;
    expect(castSignature(a)).toBe(castSignature(b));
  });
});
