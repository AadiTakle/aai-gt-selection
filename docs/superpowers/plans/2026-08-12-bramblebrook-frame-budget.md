# Bramblebrook Frame Budget Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Cut Bramblebrook's per-frame CPU draw-call submission cost so the game holds 60 fps on a device 4–6× slower than a development Mac, without changing the art direction.

**Architecture:** All new mechanism lives in a new `screener/apps/sanctuary/game/perf/` directory that no other branch owns. The static-geometry batcher reaches `Buildings.tsx` and `barnInterior.tsx` by *runtime traversal* from a wrapper mounted in `Game.tsx`, so those conflict-hot files are never edited. Pure logic (frame statistics, static detection, material signatures, geometry merging) is split into `.test.ts`-covered modules; only the thin r3f wrapper is untested-by-unit-test and is covered by the screenshot gate instead.

**Tech Stack:** React 19, @react-three/fiber 9, three 0.185, vitest (node environment), Playwright (dev-only, not a package dependency).

## Global Constraints

- Design doc: `docs/design/bramblebrook-frame-budget.md`. Every number in it is reproducible; do not restate a claim it does not support.
- **Never edit** `screener/apps/sanctuary/game/world/Buildings.tsx` or `world/barnInterior.tsx`. They are under active development by another author (8 and 5 commits on this branch).
- Edits to `Game.tsx` must total ≤ 5 lines. It has 30 commits on this branch and is the highest-conflict file in the app.
- Test files must be named `*.test.ts` (**not** `.tsx`) and live beside their module — vitest's include glob is `apps/**/*.test.ts` with `environment: 'node'`.
- Baseline that must not regress: **24 test files, 421 tests, all passing** (`cd screener && npx vitest run`).
- No change to palette, fog density, sun angle, exposure, or shadow type. Task 5 is the only step permitted to change the rendered image, and only its sharpness.
- The API on 5203 and vite on 5230 must both be running for any Playwright step. See the design doc §5.
- Commit after every task. Conventional-commit subject in the branch's voice (lowercase, states the effect, e.g. `perf(bramblebrook): the barn is one draw call, not ninety-five`).

---

### Task 1: The instrument

Nothing may be claimed before it can be measured. This task changes no rendering behaviour.

**Files:**
- Create: `screener/apps/sanctuary/game/perf/stats.ts`
- Create: `screener/apps/sanctuary/game/perf/stats.test.ts`
- Create: `screener/apps/sanctuary/game/perf/Probe.tsx`
- Create: `screener/apps/sanctuary/game/perf/Hud.tsx`
- Create: `screener/apps/sanctuary/game/perf/index.ts`
- Create: `screener/apps/sanctuary/game/perf/bench.mjs`
- Modify: `screener/apps/sanctuary/game/Game.tsx` (2 lines: import, mount)

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `summarise(samples: readonly number[]): Summary` where `interface Summary { n: number; median: number; p90: number; p99: number; max: number }`. Returns all zeros and `n: 0` for an empty input.
  - `<Probe />` — mounts **inside** `<Canvas>`, samples every frame, publishes to a module store.
  - `<Hud />` — mounts **outside** `<Canvas>`, subscribes, renders the panel. Renders `null` unless `?perf=1`.
  - `perfEnabled(search?: string): boolean`

- [ ] **Step 1: Write the failing test for `summarise`**

Create `screener/apps/sanctuary/game/perf/stats.test.ts`:

```ts
import { describe, expect, it } from 'vitest';

import { summarise } from './stats';

describe('frame summary', () => {
  it('is empty rather than NaN when nothing has been sampled', () => {
    expect(summarise([])).toEqual({ n: 0, median: 0, p90: 0, p99: 0, max: 0 });
  });

  it('reports the middle sample, not the mean, so one stall cannot hide a good frame', () => {
    const s = summarise([10, 10, 10, 10, 1000]);
    expect(s.median).toBe(10);
    expect(s.max).toBe(1000);
    expect(s.n).toBe(5);
  });

  it('places p90 and p99 at the sample that many percent of frames beat', () => {
    const s = summarise(Array.from({ length: 100 }, (_, i) => i + 1));
    expect(s.p90).toBe(91);
    expect(s.p99).toBe(100);
  });

  it('does not mutate the caller array', () => {
    const input = [3, 1, 2];
    summarise(input);
    expect(input).toEqual([3, 1, 2]);
  });
});
```

- [ ] **Step 2: Run it and watch it fail**

Run: `cd screener && npx vitest run apps/sanctuary/game/perf/stats.test.ts`
Expected: FAIL — cannot resolve `./stats`.

- [ ] **Step 3: Implement `stats.ts`**

```ts
/**
 * Frame timings, reduced to the four numbers that decide whether a child sees a stall.
 *
 * The MEDIAN and not the mean, because the mean of sixty good frames and one 200ms stall is a number
 * that describes neither. p99 is the one that matters most: at 60fps it is the worst frame in about
 * every one and a half seconds, which is how often a child would feel it.
 */
export interface Summary {
  n: number;
  median: number;
  p90: number;
  p99: number;
  max: number;
}

const EMPTY: Summary = { n: 0, median: 0, p90: 0, p99: 0, max: 0 };

export function summarise(samples: readonly number[]): Summary {
  if (samples.length === 0) return { ...EMPTY };
  const sorted = [...samples].sort((a, b) => a - b);
  const at = (q: number): number => sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * q))]!;
  return {
    n: sorted.length,
    median: at(0.5),
    p90: at(0.9),
    p99: at(0.99),
    max: sorted[sorted.length - 1]!,
  };
}
```

- [ ] **Step 4: Run the test and watch it pass**

Run: `cd screener && npx vitest run apps/sanctuary/game/perf/stats.test.ts`
Expected: 4 passed.

- [ ] **Step 5: Write `Probe.tsx`, `Hud.tsx`, `index.ts`**

`Probe.tsx` mounts inside the Canvas and samples `useThree().gl.info` once per frame. Note `gl.info.render.calls` is reset at the head of each `render()`, and `useFrame` runs *before* the render, so the value read is the previous frame's — a one-frame lag that is irrelevant at these timescales but should be stated in a comment.

Key content:

```tsx
import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, type JSX } from 'react';

import { publish } from './store';

const WINDOW = 120;

export function Probe(): JSX.Element | null {
  const gl = useThree((s) => s.gl);
  const frames: number[] = [];
  let last = performance.now();
  useFrame(() => {
    const now = performance.now();
    frames.push(now - last);
    last = now;
    if (frames.length > WINDOW) frames.shift();
    publish({
      frames: [...frames],
      calls: gl.info.render.calls,
      triangles: gl.info.render.triangles,
      programs: gl.info.programs?.length ?? 0,
      geometries: gl.info.memory.geometries,
      textures: gl.info.memory.textures,
    });
  });
  useEffect(() => () => publish(null), []);
  return null;
}
```

`store.ts` is a plain module store read with `useSyncExternalStore`, matching the pattern already used by `slimes/keep.ts` and `vacpack/tank.ts` in this app. `Hud.tsx` subscribes and renders a fixed-position panel showing `median / p99 / max` ms, draw calls, triangles and program count. Gate both on `perfEnabled()`, which reads `?perf=1` from `window.location.search`.

- [ ] **Step 6: Wire into `Game.tsx` — two lines only**

Add the import beside the other game imports, then `{perfEnabled() && <Probe />}` immediately inside `<Canvas>` and `{perfEnabled() && <Hud />}` beside the existing `bh-enter` button outside it. Do not reorder or reformat anything else in the file.

- [ ] **Step 7: Write `bench.mjs`**

A node + Playwright script that reproduces the design doc's tables: draw-call split by pass (patch `bindFramebuffer` to detect offscreen, patch the four `draw*` entrypoints), a CPU-throttle sweep at 1×/4×/6× via CDP `Emulation.setCPUThrottlingRate`, and a JS self-time profile via `Profiler`.

Playwright is deliberately not a package dependency (`shoot.mjs` sets this precedent). Resolve it in this order and fail with an instruction rather than a stack trace: `process.env.PLAYWRIGHT_MODULE`, then a bare `import('playwright')`, then the npx cache. Do **not** hard-code a home directory — `shoot.mjs` hard-codes `/Users/alphaintern/...` and that is exactly why it only runs on one machine.

Launch flags are load-bearing and must carry a comment saying so: `--disable-gpu-vsync --disable-frame-rate-limit --disable-backgrounding-occluded-windows --disable-renderer-backgrounding --disable-background-timer-throttling`. Without them an unfocused window reports a flat 33.3 ms and the measurement is of Chrome's throttle, not the game.

- [ ] **Step 8: Record the baseline**

Run: `node apps/sanctuary/game/perf/bench.mjs` with the API and vite up.
Expected: ~1139 draw calls, ~3.8 ms at 1×, ~14 ms at 4×, ~22 ms at 6×. Save the output into the commit message.

- [ ] **Step 9: Full suite, then commit**

```bash
cd screener && npx vitest run          # must stay at 24 files / 421+ tests, all green
git add screener/apps/sanctuary/game/perf screener/apps/sanctuary/game/Game.tsx
git commit -m "perf(bramblebrook): a probe and a bench, so the frame budget is measured and not argued"
```

---

### Task 2: Batch the static world

The primary lever. A merged mesh is one main-pass call *and* one shadow call, so this cuts both passes at once.

**Files:**
- Create: `screener/apps/sanctuary/game/perf/signature.ts`
- Create: `screener/apps/sanctuary/game/perf/signature.test.ts`
- Create: `screener/apps/sanctuary/game/perf/still.ts`
- Create: `screener/apps/sanctuary/game/perf/still.test.ts`
- Create: `screener/apps/sanctuary/game/perf/merge.ts`
- Create: `screener/apps/sanctuary/game/perf/merge.test.ts`
- Create: `screener/apps/sanctuary/game/perf/Batched.tsx`
- Modify: `screener/apps/sanctuary/game/Game.tsx` (wrap `<Buildings />`, 2 lines)

**Interfaces:**
- Consumes: nothing from Task 1.
- Produces:
  - `materialSignature(m: Material): string | null` — `null` means "never batch this one".
  - `class StillWatch { observe(root: Object3D): void; settled(): boolean; stillUuids(): Set<string> }`
  - `mergeGroup(meshes: readonly Mesh[], root: Object3D): Mesh | null`
  - `<Batched>{children}</Batched>`

- [ ] **Step 1: Write the failing test for `materialSignature`**

```ts
import { describe, expect, it } from 'vitest';
import { MeshBasicMaterial, MeshStandardMaterial, Texture } from 'three';

import { materialSignature } from './signature';

describe('material signature', () => {
  it('ignores colour, because colour is what we bake into the vertices', () => {
    const a = new MeshStandardMaterial({ color: '#572904', roughness: 0.8 });
    const b = new MeshStandardMaterial({ color: '#be6c0e', roughness: 0.8 });
    expect(materialSignature(a)).toBe(materialSignature(b));
  });

  it('separates materials that shade differently', () => {
    const smooth = new MeshStandardMaterial({ roughness: 0.8 });
    const rough = new MeshStandardMaterial({ roughness: 0.2 });
    const flat = new MeshStandardMaterial({ roughness: 0.8, flatShading: true });
    expect(materialSignature(smooth)).not.toBe(materialSignature(rough));
    expect(materialSignature(smooth)).not.toBe(materialSignature(flat));
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
});
```

- [ ] **Step 2: Run it, watch it fail.** `cd screener && npx vitest run apps/sanctuary/game/perf/signature.test.ts`

- [ ] **Step 3: Implement `signature.ts`**

Return `null` for: `transparent`, any of `map/normalMap/emissiveMap/aoMap/roughnessMap/metalnessMap/alphaMap` set, `alphaTest > 0`, `depthWrite === false`, `polygonOffset`. Otherwise return a joined string of: `material.type`, `side`, `flatShading`, `roughness`, `metalness`, `emissive.getHexString()`, `emissiveIntensity`, `opacity`, `wireframe`, `vertexColors`, `toneMapped`, `fog`. **Colour is deliberately absent.**

Also export `castSignature(mesh: Mesh): string` returning `` `${mesh.castShadow}|${mesh.receiveShadow}` `` — grouped alongside the material signature, because a merged mesh has one pair of shadow flags for all of its parts and taking the union would change the image.

- [ ] **Step 4: Run it, watch it pass.**

- [ ] **Step 5: Write the failing test for `still.ts`**

```ts
import { describe, expect, it } from 'vitest';
import { Group, Mesh } from 'three';

import { StillWatch } from './still';

const frame = (w: StillWatch, root: Group): void => {
  root.updateMatrixWorld(true);
  w.observe(root);
};

describe('which meshes never move', () => {
  it('reports a mesh that has not moved once it has settled', () => {
    const root = new Group();
    const still = new Mesh();
    root.add(still);
    const w = new StillWatch(3);
    for (let i = 0; i < 3; i += 1) frame(w, root);
    expect(w.settled()).toBe(true);
    expect(w.stillUuids().has(still.uuid)).toBe(true);
  });

  it('excludes anything that moved during the window — this is what spares the windmill vane', () => {
    const root = new Group();
    const vane = new Mesh();
    root.add(vane);
    const w = new StillWatch(3);
    frame(w, root);
    vane.rotation.z += 0.1;
    frame(w, root);
    frame(w, root);
    expect(w.stillUuids().has(vane.uuid)).toBe(false);
  });

  it('is not settled before its window has elapsed', () => {
    const w = new StillWatch(3);
    frame(w, new Group());
    expect(w.settled()).toBe(false);
  });

  it('excludes a mesh that appeared partway through, having never been watched from the start', () => {
    const root = new Group();
    const w = new StillWatch(3);
    frame(w, root);
    const late = new Mesh();
    root.add(late);
    frame(w, root);
    frame(w, root);
    expect(w.stillUuids().has(late.uuid)).toBe(false);
  });
});
```

- [ ] **Step 6: Run it, watch it fail. Then implement `still.ts`.**

`observe(root)` traverses meshes and records `matrixWorld.elements` joined as a string on the first frame; on later frames it compares and removes any uuid whose string differs, and ignores uuids not seen on the first frame. `settled()` is `frames >= window`.

- [ ] **Step 7: Run it, watch it pass.**

- [ ] **Step 8: Write the failing test for `merge.ts`**

```ts
import { describe, expect, it } from 'vitest';
import { BoxGeometry, Color, Group, Mesh, MeshStandardMaterial } from 'three';

import { mergeGroup } from './merge';

const boxAt = (x: number, color: string): Mesh => {
  const m = new Mesh(new BoxGeometry(1, 1, 1), new MeshStandardMaterial({ color }));
  m.position.x = x;
  return m;
};

describe('merging the static world', () => {
  it('turns many meshes into one, with every triangle preserved', () => {
    const root = new Group();
    const a = boxAt(0, '#572904');
    const b = boxAt(4, '#be6c0e');
    root.add(a, b);
    root.updateMatrixWorld(true);

    const merged = mergeGroup([a, b], root)!;
    const tris = merged.geometry.index
      ? merged.geometry.index.count / 3
      : merged.geometry.attributes.position!.count / 3;
    expect(tris).toBe(24); // two boxes, twelve triangles each
  });

  it('bakes each source colour into the vertices, so one material serves them all', () => {
    const root = new Group();
    const a = boxAt(0, '#ff0000');
    const b = boxAt(4, '#0000ff');
    root.add(a, b);
    root.updateMatrixWorld(true);

    const merged = mergeGroup([a, b], root)!;
    const colors = merged.geometry.attributes.color!;
    expect(colors).toBeDefined();
    expect((merged.material as MeshStandardMaterial).vertexColors).toBe(true);
    expect((merged.material as MeshStandardMaterial).color.getHex()).toBe(0xffffff);
    const first = new Color(colors.getX(0), colors.getY(0), colors.getZ(0));
    expect(first.getHexString()).toBe(new Color('#ff0000').getHexString());
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

  it('returns null for a single mesh, which is already one draw call', () => {
    const root = new Group();
    const a = boxAt(0, '#ffffff');
    root.add(a);
    root.updateMatrixWorld(true);
    expect(mergeGroup([a], root)).toBeNull();
  });
});
```

- [ ] **Step 9: Run it, watch it fail. Then implement `merge.ts`.**

For each source mesh: `geometry.clone()`, keep only `position`/`normal` (delete every other attribute — the signature has already excluded anything that needs uvs), apply `root.matrixWorld⁻¹ · mesh.matrixWorld`, then add a `color` attribute filled with the source material's `color.r/g/b` (linear working space; do **not** convert — three multiplies vertex colour into the material colour in linear space, and the material colour is set to white).

Then normalise indexing: if the group is mixed, call `toNonIndexed()` on the indexed ones. Merge with `mergeGeometries` from `three/examples/jsm/utils/BufferGeometryUtils.js`. Return a `Mesh` with a clone of the first source's material, `color` set to white and `vertexColors: true`, carrying the group's shared `castShadow`/`receiveShadow`. Return `null` when given fewer than two meshes, or when `mergeGeometries` returns null.

- [ ] **Step 10: Run it, watch it pass.**

- [ ] **Step 11: Write `Batched.tsx`**

```tsx
export function Batched({ children }: { children: ReactNode }): JSX.Element
```

Renders `<group ref={host}>{children}</group>` plus a sibling `<group ref={sink} />`. On each frame until settled it runs the `StillWatch`. Once settled, exactly once: collect every descendant `Mesh` of `host` whose uuid is still, whose material yields a non-null `materialSignature`, and which carries no r3f pointer handler (`(mesh as any).__r3f?.handlers` empty); group by `` `${materialSignature}|${castSignature}` ``; for each group of ≥ 2, call `mergeGroup`, add the result to `sink`, and set `visible = false` on every source.

Guard with a `done` ref so a React re-render cannot merge twice, and dispose merged geometries on unmount.

- [ ] **Step 12: Wire into `Game.tsx` — two lines**

Wrap the existing `<Buildings />` as `<Batched><Buildings /></Batched>`. Nothing else in the file changes.

- [ ] **Step 13: Measure**

Run `node apps/sanctuary/game/perf/bench.mjs`. Expected: draw calls well below 1139 — the target is ≤ 450 — with a proportional fall in the 4× and 6× throttle medians.

- [ ] **Step 14: Prove the image did not change**

Capture the fixed camera poses before and after and diff them. This gate is absolute: **any** pixel difference here is a batcher bug — a dropped attribute, a wrong colour space, a lost shadow flag — not a matter of taste. Investigate rather than accept.

- [ ] **Step 15: Full suite, then commit**

```bash
cd screener && npx vitest run
git add screener/apps/sanctuary/game/perf screener/apps/sanctuary/game/Game.tsx
git commit -m "perf(bramblebrook): the static world is a handful of draw calls, not four hundred"
```

---

### Task 3: Shadow cadence

**Files:**
- Create: `screener/apps/sanctuary/game/perf/cadence.ts`
- Modify: `screener/apps/sanctuary/game/world/Lighting.tsx` (1 line — lowest-churn file in `world/`, 1 commit on this branch)

**Interfaces:**
- Consumes: nothing.
- Produces: `useShadowCadence(light: RefObject<DirectionalLight | null>, every: number): void`

- [ ] **Step 1: Read the measurement from Task 2 first**

If the shadow pass is already below ~60 calls after batching, **stop and skip this task**, and record why. Machinery that buys nothing is worse than no machinery. This is a real decision point, not a formality.

- [ ] **Step 2: Implement `cadence.ts`**

Verified against `node_modules/three/src/renderers/webgl/WebGLShadowMap.js`: a light is skipped entirely when `shadow.autoUpdate === false && shadow.needsUpdate === false`. So set `light.shadow.autoUpdate = false` once, then in a `useFrame` set `light.shadow.needsUpdate = (frame % every) === 0`. Restore `autoUpdate = true` on unmount.

- [ ] **Step 3: Mount it in `Lighting.tsx`** — one call beside the existing `sun` ref, no other change.

- [ ] **Step 4: Check it by eye**

Walk up to a wandering slime and watch its shadow. At `every = 2` the shadow updates at 30 Hz. If it visibly lags the slime, drop back to `every = 1` and abandon the task — the constant is the whole control.

- [ ] **Step 5: Measure, run the suite, commit**

```bash
node apps/sanctuary/game/perf/bench.mjs
cd screener && npx vitest run
git commit -am "perf(bramblebrook): the sun is fixed, so its shadows need not be redrawn every frame"
```

---

### Task 4: Caster budget — conditional

**Files:**
- Create: `screener/apps/sanctuary/game/perf/casters.ts`
- Create: `screener/apps/sanctuary/game/perf/casters.test.ts`

- [ ] **Step 1: Decide whether this is still worth doing**

Only proceed if the shadow pass is still a meaningful share of the frame after Tasks 2 and 3. Most small props share materials and will already have been merged, which removes their shadow calls as a side effect. **Unlike Tasks 2 and 3, this one deliberately changes the image** — a pebble's shadow disappears — so it needs a screenshot put in front of Felipe rather than a pixel-diff gate. If the win is small, skip it and say so.

- [ ] **Step 2: If proceeding — test, implement, review**

`clearTinyCasters(root: Object3D, minRadius: number): number` clears `castShadow` on meshes whose world-space bounding-sphere radius is below `minRadius`, returning the count. Test with three boxes of known size against a known threshold. Then capture before/after screenshots at ground level next to the scatter and put both in front of Felipe before committing.

---

### Task 5: Sharper shadows — last, separate, droppable

**Files:**
- Modify: `screener/apps/sanctuary/game/world/Lighting.tsx` (one constant)

- [ ] **Step 1: Check the budget actually exists**

Read the bench output from Tasks 2–3. Raising `mapSize` from 2048 to 4096 quadruples shadow-map fill and blur cost. We measured the app is not fill-bound, so this is expected to be affordable — but confirm it against the 4× and 6× throttle numbers rather than assuming. If either regresses past its target, try 3072, and if that also regresses, leave it at 2048 and bank the perf.

- [ ] **Step 2: Raise `SHADOW.mapSize`, update the comment**

The existing comment states "At 2048 this comes out near 3.5cm per texel". Recompute and correct it for whatever value is chosen — a stale measurement in a comment is worse than none.

- [ ] **Step 3: Screenshot before/after and commit alone**

This is the one commit that changes the image. It must contain nothing else, so it can be dropped with a single revert.

```bash
git commit -am "feat(bramblebrook): the freed budget buys shadows at twice the resolution"
```

---

## Final verification

- [ ] `cd screener && npx vitest run` — 24+ files, 421+ tests, all green
- [ ] `cd screener && npm run typecheck` — clean
- [ ] `node apps/sanctuary/game/perf/bench.mjs` — draw calls ≤ 450, 4× median ≤ 8 ms, 6× median ≤ 12 ms
- [ ] Play it: walk the ranch, buy a slime, engage a station, finish the board. Nothing looks different and nothing stutters.
- [ ] `git log --oneline feat/sanctuary..HEAD` — every commit independently revertable
