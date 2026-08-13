import { describe, expect, it } from 'vitest';
import { Group, Mesh, MeshStandardMaterial } from 'three';

import { StillWatch } from './still';

const frame = (w: StillWatch, root: Group): void => {
  root.updateMatrixWorld(true);
  w.observe(root);
};

/** Window of 4 observations, still after 3 consecutive unchanged ones. */
const watching = (): StillWatch => new StillWatch(4, 3);

describe('which meshes never move', () => {
  it('reports a mesh that has not moved once it has settled', () => {
    const root = new Group();
    const still = new Mesh();
    root.add(still);
    const w = watching();
    for (let i = 0; i < 4; i += 1) frame(w, root);
    expect(w.settled()).toBe(true);
    expect(w.stillUuids().has(still.uuid)).toBe(true);
  });

  it('forgives the transform settling that happens right after mount', () => {
    /* REGRESSION. Comparing every frame against the first judged 75 of 78 static meshes in
       `Buildings` to be moving, because r3f composes transforms over the first frames after a
       subtree appears. The batcher then silently did nothing, which looks identical to success. */
    const root = new Group();
    const wall = new Mesh();
    root.add(wall);
    const w = watching();
    frame(w, root);
    wall.position.set(3, 0, 0); // r3f applying the prop it was given
    for (let i = 0; i < 3; i += 1) frame(w, root);
    expect(w.stillUuids().has(wall.uuid)).toBe(true);
  });

  it('excludes anything animating — this is what spares the windmill vane', () => {
    const root = new Group();
    const vane = new Mesh();
    root.add(vane);
    const w = watching();
    for (let i = 0; i < 4; i += 1) {
      vane.rotation.z += 0.1; // every frame, which is what an animation does
      frame(w, root);
    }
    expect(w.settled()).toBe(true);
    expect(w.stillUuids().has(vane.uuid)).toBe(false);
  });

  it('excludes a mesh still moving at the end of the window, however briefly', () => {
    const root = new Group();
    const bob = new Mesh();
    root.add(bob);
    const w = watching();
    frame(w, root);
    frame(w, root);
    frame(w, root);
    bob.position.y = 1; // moved on the last observation: its run resets to one
    frame(w, root);
    expect(w.stillUuids().has(bob.uuid)).toBe(false);
  });

  it('excludes a mesh whose material animates while it stands still — the pulsing lamp', () => {
    /* REGRESSION, found by `guard.mjs`. Watching only the world matrix merged the lamp bulbs, and a
       merged mesh carries a CLONE of the material — so the clone stopped receiving the glow's
       mutations and four lamps froze mid-breath, 244 pixels of silent wrongness. */
    const root = new Group();
    const lamp = new Mesh(undefined, new MeshStandardMaterial({ emissive: '#ffcc88' }));
    root.add(lamp);
    const w = watching();
    for (let i = 0; i < 4; i += 1) {
      (lamp.material as MeshStandardMaterial).emissiveIntensity = 1 + i * 0.1;
      frame(w, root);
    }
    expect(w.stillUuids().has(lamp.uuid)).toBe(false);
  });

  it('keeps a mesh whose material is merely set once and left alone', () => {
    const root = new Group();
    const wall = new Mesh(undefined, new MeshStandardMaterial({ color: '#886644' }));
    root.add(wall);
    const w = watching();
    for (let i = 0; i < 4; i += 1) frame(w, root);
    expect(w.stillUuids().has(wall.uuid)).toBe(true);
  });

  it('is not settled before its window has elapsed', () => {
    const w = watching();
    frame(w, new Group());
    expect(w.settled()).toBe(false);
  });

  it('excludes a mesh that appeared after watching began', () => {
    const root = new Group();
    const w = watching();
    frame(w, root);
    const late = new Mesh();
    root.add(late);
    for (let i = 0; i < 3; i += 1) frame(w, root);
    expect(w.stillUuids().has(late.uuid)).toBe(false);
  });

  it('excludes a mesh that disappeared, so nothing merges geometry that has been unmounted', () => {
    const root = new Group();
    const leaver = new Mesh();
    root.add(leaver);
    const w = watching();
    for (let i = 0; i < 3; i += 1) frame(w, root);
    root.remove(leaver);
    frame(w, root);
    expect(w.stillUuids().has(leaver.uuid)).toBe(false);
  });
});
