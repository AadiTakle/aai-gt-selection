import { describe, expect, it } from 'vitest';
import {
  BoxGeometry,
  Group,
  InstancedMesh,
  Mesh,
  MeshStandardMaterial,
  Raycaster,
  Vector3,
} from 'three';

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
    /* Taken out of rendering by their layer mask, NOT by lying about `visible` — the shop reads
       `visible === false` as its own sentinel for a hit volume. */
    expect(props.every((p) => p.layers.mask === 0)).toBe(true);
    expect(props.every((p) => p.visible === true)).toBe(true);
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

  it('refuses an InstancedMesh, whose copies a merge would delete', () => {
    /* The most severe misrender this file could produce: an InstancedMesh IS an `isMesh`, and merging
       one bakes only its base geometry — every instance but the first would vanish. `Buildings.tsx`
       instances everything that repeats, so that is most of the ranch. */
    const host = new Group();
    const sink = new Group();
    const many = new InstancedMesh(new BoxGeometry(1, 1, 1), new MeshStandardMaterial(), 8);
    const other = prop(4);
    host.add(many, other);
    host.updateMatrixWorld(true);

    const stats = new Batch().build(host, sink, new Set([many.uuid, other.uuid]));
    expect(stats.skipped.instanced).toBe(1);
    expect(sink.children).toHaveLength(0); // one lone prop is not worth a merge
  });

  it('disposes what it made when it dissolves, or a session leaks a batch per question', () => {
    const { host, sink, still } = world(6);
    const batch = new Batch();
    batch.build(host, sink, still);
    const merged = sink.children[0] as Mesh;
    let disposed = false;
    merged.geometry.addEventListener('dispose', () => {
      disposed = true;
    });
    batch.dissolve(sink);
    expect(disposed).toBe(true);
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

  it('tells the truth about `visible`, because the shop uses it as a sentinel', () => {
    /* REGRESSION. `economy/Shop.tsx` picks the aimed cubby with
         hits.find((h) => h.object.visible === false)
       — invisibility is how it recognises its deliberately-invisible hit volume. A batcher that made
       294 shelf meshes answer `false` killed the highlight that tells a child what they are pointing
       at. The merged source is removed from rendering by its layer mask instead. */
    const { host, sink, still, props } = world(4);
    new Batch().build(host, sink, still);
    expect(props[0]!.visible).toBe(true);
    expect(props[0]!.layers.mask).toBe(0);
    props[0]!.visible = false;
    expect(props[0]!.visible).toBe(false);
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

describe('a batch and the scene graph around it', () => {
  it('refuses a mesh whose ANCESTOR group is hidden, however visible the mesh itself is', () => {
    /* REGRESSION. `Object3D.visible` is not inherited: a mesh inside <group visible={false}> still
       has mesh.visible === true, and `traverse` visits it. Merging it drew geometry the owner had
       deliberately taken out of the world — `Cradle.tsx`'s egg-shell halves, permanently inside the
       whole egg, DoubleSide so nothing culled them. */
    const host = new Group();
    const sink = new Group();
    const shown = prop(0);
    const shown2 = prop(2);
    const hiddenGroup = new Group();
    hiddenGroup.visible = false;
    const shell = prop(4);
    const shell2 = prop(6);
    hiddenGroup.add(shell, shell2);
    host.add(shown, shown2, hiddenGroup);
    host.updateMatrixWorld(true);
    const still = new Set([shown, shown2, shell, shell2].map((m) => m.uuid));

    const stats = new Batch().build(host, sink, still);
    expect(stats.skipped.hiddenAncestor).toBe(2);
    expect(stats.merged).toBe(2); // only the two genuinely visible props
  });

  it('goes stale when an ancestor group is hidden after the merge', () => {
    const host = new Group();
    const sink = new Group();
    const inner = new Group();
    const a = prop(0);
    const b = prop(2);
    inner.add(a, b);
    host.add(inner);
    host.updateMatrixWorld(true);
    const batch = new Batch();
    batch.build(host, sink, new Set([a.uuid, b.uuid]));
    expect(batch.isStale(host)).toBe(false);
    inner.visible = false; // the owner takes the whole assembly out of the world
    expect(batch.isStale(host)).toBe(true);
  });

  it('goes stale when a merged source is moved by its parent group', () => {
    /* REGRESSION. The shop's coin pile bobs when a child presses a cubby they cannot afford, and the
       cradle's egg rocks once per thing handed over — both are transforms written to a parent GROUP,
       which no accessor on the mesh can see. Frozen merges made both acknowledgements dead. */
    const host = new Group();
    const sink = new Group();
    const pile = new Group();
    const a = prop(0);
    const b = prop(2);
    pile.add(a, b);
    host.add(pile);
    host.updateMatrixWorld(true);
    const batch = new Batch();
    batch.build(host, sink, new Set([a.uuid, b.uuid]));
    expect(batch.isStale(host)).toBe(false);

    pile.position.y = 0.08; // the nudge
    host.updateMatrixWorld(true);
    expect(batch.isStale(host)).toBe(true);
  });

  it('goes stale when a merged source is detached even though the mesh count is unchanged', () => {
    /* A station swapping one question's meshes for another's leaves `meshCount` identical. */
    const { host, sink, still, props } = world(4);
    const batch = new Batch();
    batch.build(host, sink, still);
    host.remove(props[0]!);
    host.add(prop(80)); // count restored
    expect(batch.isStale(host)).toBe(true);
  });

  it('takes a merged source out of raycasting too, so pickers see only what is drawn', () => {
    /* Three's Raycaster gates on `object.layers.test(raycaster.layers)`, so zeroing the mask removes
       the source from picking as well as from rendering. That is the correct meaning of "the merged
       mesh draws this now", and it is what restores the shop's `visible === false` sentinel to
       finding its hit volume rather than a shelf plank. Safe only because `interactiveChain` refuses
       to merge anything inside a subtree r3f raycasts for events. */
    const { host, sink, still, props } = world(4);
    new Batch().build(host, sink, still);

    host.updateMatrixWorld(true);
    const ray = new Raycaster(new Vector3(0, 0, 10), new Vector3(0, 0, -1));
    expect(ray.intersectObject(host, true).some((h) => h.object === props[0])).toBe(false);
  });

  it('refuses a mesh whose ANCESTOR carries a pointer handler, because r3f bubbles', () => {
    /* r3f raycasts from each interaction root and walks UP from the hit object looking for handlers.
       A handler-less mesh under an interactive group is how the click reaches that group, so taking
       it out of raycasting would make the group unclickable. */
    const host = new Group();
    const sink = new Group();
    const clickable = new Group();
    (clickable as unknown as { __r3f: { handlers: Record<string, unknown> } }).__r3f = {
      handlers: { onClick: () => {} },
    };
    const a = prop(0);
    const b = prop(2);
    clickable.add(a, b);
    host.add(clickable);
    host.updateMatrixWorld(true);

    const stats = new Batch().build(host, sink, new Set([a.uuid, b.uuid]));
    expect(stats.skipped.interactive).toBe(2);
    expect(stats.merged).toBe(0);
  });

  it('restores the layer mask when dissolved', () => {
    const { host, sink, still, props } = world(4);
    const before = props[0]!.layers.mask;
    const batch = new Batch();
    batch.build(host, sink, still);
    batch.dissolve(sink);
    expect(props[0]!.layers.mask).toBe(before);
  });
});
