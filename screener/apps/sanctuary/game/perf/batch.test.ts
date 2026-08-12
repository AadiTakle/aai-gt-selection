import { describe, expect, it } from 'vitest';
import { BoxGeometry, Group, Mesh, MeshStandardMaterial } from 'three';

import { Batch, ThrashGuard, meshCount } from './batch';

const prop = (x: number, color = '#886644'): Mesh => {
  const m = new Mesh(new BoxGeometry(1, 1, 1), new MeshStandardMaterial({ color }));
  m.position.x = x;
  return m;
};

/** A host with `n` mergeable props, all judged still. */
function world(n: number): { host: Group; sink: Group; still: Set<string>; props: Mesh[] } {
  const host = new Group();
  const sink = new Group();
  const props = Array.from({ length: n }, (_, i) => prop(i * 2, i % 2 ? '#886644' : '#224466'));
  host.add(...props);
  host.updateMatrixWorld(true);
  return { host, sink, still: new Set(props.map((p) => p.uuid)), props };
}

describe('a batch', () => {
  it('folds many meshes into one draw and hides the originals', () => {
    const { host, sink, still, props } = world(6);
    const stats = new Batch().build(host, sink, still);
    expect(stats.merged).toBe(6);
    expect(stats.draws).toBe(1); // same material signature, colour baked per vertex
    expect(sink.children).toHaveLength(1);
    expect(props.every((p) => p.visible === false)).toBe(true);
  });

  it('leaves a mesh that never settled alone', () => {
    const { host, sink, props } = world(4);
    const still = new Set(props.slice(0, 3).map((p) => p.uuid));
    const stats = new Batch().build(host, sink, still);
    expect(stats.merged).toBe(3);
    expect(stats.skipped.moved).toBe(1);
    expect(props[3]!.visible).toBe(true);
  });

  it('refuses a mesh that something raycasts against', () => {
    const { host, sink, still, props } = world(3);
    (props[0] as unknown as { __r3f: { handlers: Record<string, unknown> } }).__r3f = {
      handlers: { onClick: () => {} },
    };
    const stats = new Batch().build(host, sink, still);
    expect(stats.skipped.interactive).toBe(1);
    expect(props[0]!.visible).toBe(true);
  });

  it('is not stale while nothing has changed', () => {
    const { host, sink, still } = world(4);
    const batch = new Batch();
    batch.build(host, sink, still);
    expect(batch.isStale(host)).toBe(false);
  });

  it('goes stale when a mesh is added to the subtree', () => {
    const { host, sink, still } = world(4);
    const batch = new Batch();
    batch.build(host, sink, still);
    host.add(prop(99));
    expect(batch.isStale(host)).toBe(true);
  });

  it('goes stale when a mesh is removed — this is the ghost a station would otherwise leave', () => {
    const { host, sink, still, props } = world(4);
    const batch = new Batch();
    batch.build(host, sink, still);
    host.remove(props[0]!);
    expect(batch.isStale(host)).toBe(true);
  });

  it('goes stale when the owner tries to hide a source it had merged', () => {
    /* The subtle one. The source is already `visible = false`, so React's write would be lost and the
       part would stay baked into the merge, visible, forever. */
    const { host, sink, still, props } = world(4);
    const batch = new Batch();
    batch.build(host, sink, still);
    props[0]!.visible = false; // the owner wants it gone
    expect(batch.isStale(host)).toBe(true);
  });

  it('does not go stale when the owner re-asserts the visibility it already had', () => {
    const { host, sink, still, props } = world(4);
    const batch = new Batch();
    batch.build(host, sink, still);
    props[0]!.visible = true; // React re-rendering with an unchanged prop
    expect(batch.isStale(host)).toBe(false);
  });

  it('reports a merged source as hidden however the owner asks', () => {
    const { host, sink, still, props } = world(4);
    new Batch().build(host, sink, still);
    props[0]!.visible = true;
    expect(props[0]!.visible).toBe(false); // still hidden: the merge is what is drawing it
  });

  it('restores every source and empties the sink when dissolved', () => {
    const { host, sink, still, props } = world(5);
    const batch = new Batch();
    batch.build(host, sink, still);
    batch.dissolve(sink);
    expect(sink.children).toHaveLength(0);
    expect(props.every((p) => p.visible === true)).toBe(true);
    /* The property must be a plain one again, or the next batch's accessor stacks on this one. */
    expect(Object.getOwnPropertyDescriptor(props[0]!, 'visible')?.get).toBeUndefined();
  });

  it('restores the visibility the owner asked for, not the one it had before merging', () => {
    const { host, sink, still, props } = world(4);
    const batch = new Batch();
    batch.build(host, sink, still);
    props[0]!.visible = false;
    batch.dissolve(sink);
    expect(props[0]!.visible).toBe(false);
    expect(props[1]!.visible).toBe(true);
  });

  it('can be rebuilt after dissolving, and hides the right things again', () => {
    const { host, sink, still } = world(4);
    const batch = new Batch();
    batch.build(host, sink, still);
    batch.dissolve(sink);
    const stats = batch.build(host, sink, still);
    expect(stats.merged).toBe(4);
    expect(sink.children).toHaveLength(1);
  });

  it('goes stale when a merged source\'s material changes — the lanterns lighting up', () => {
    /* REGRESSION, found by `guard.mjs`. The merged mesh holds a CLONE of the material, so a lantern
       that is dark during the observation window, gets merged, and lights up later would stay dark
       forever while every unmerged copy came on. */
    const { host, sink, still, props } = world(4);
    const batch = new Batch();
    batch.build(host, sink, still);
    expect(batch.isStale(host)).toBe(false);
    (props[0]!.material as MeshStandardMaterial).emissiveIntensity = 2;
    expect(batch.isStale(host)).toBe(true);
  });

  it('is never stale before it has built anything', () => {
    const { host, sink } = world(3);
    const batch = new Batch();
    batch.build(host, sink, new Set()); // nothing settled, nothing merged
    host.add(prop(50));
    expect(batch.isStale(host)).toBe(false);
  });
});

describe('meshCount', () => {
  it('counts meshes anywhere in the subtree', () => {
    const root = new Group();
    const inner = new Group();
    inner.add(prop(0), prop(1));
    root.add(inner, prop(2));
    expect(meshCount(root)).toBe(3);
  });
});

describe('the thrash guard', () => {
  it('allows unlimited well-spaced rebuilds — a child answering questions', () => {
    const guard = new ThrashGuard(180, 3);
    /* REGRESSION. A flat cap of three total rebuilds un-batched the stations after the third
       question of a visit and gave back most of the win, silently, mid-play. */
    let abandon = false;
    for (let q = 1; q <= 20; q += 1) abandon = guard.rebuilt(q * 600) || abandon;
    expect(abandon).toBe(false);
  });

  it('gives up on a subtree that rebuilds every few frames', () => {
    const guard = new ThrashGuard(180, 3);
    expect(guard.rebuilt(10)).toBe(false);
    expect(guard.rebuilt(20)).toBe(false);
    expect(guard.rebuilt(30)).toBe(false);
    expect(guard.rebuilt(40)).toBe(true);
  });

  it('forgives a burst once the subtree settles again', () => {
    const guard = new ThrashGuard(180, 3);
    guard.rebuilt(10);
    guard.rebuilt(20);
    expect(guard.rebuilt(1000)).toBe(false); // far apart: the run resets
    expect(guard.rebuilt(1010)).toBe(false);
    expect(guard.rebuilt(1020)).toBe(false);
    expect(guard.rebuilt(1030)).toBe(true);
  });
});
