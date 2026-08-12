# Bramblebrook's frame budget

How the game spends a frame, why it will drop frames on the hardware a child actually has, and the
four changes that fix it without touching a line of the art direction.

Everything below was measured against the running app on `feat/sanctuary` at `bfaf73f`, not reasoned
from first principles. The instrument is described in §5 and ships with the change, so every number
here is reproducible and every later claim has to move it.

## 1. The finding

**The game is not slow on a development Mac and will be slow on a school device.** Steady-state frame
cost on an M-series laptop is 3.8 ms — roughly 260 fps of headroom — and that is exactly why the
problem is invisible where the game is built.

The first measurements taken were wrong and are recorded here so nobody repeats them: a headed Chrome
window that loses focus, or is occluded, is throttled to 30 fps by the browser. That produces a clean
33.3 ms median which reads as a catastrophic frame time and is an artifact of the harness. Every
number in this document was taken with `--disable-gpu-vsync --disable-frame-rate-limit
--disable-backgrounding-occluded-windows --disable-renderer-backgrounding`, so frame time measures
work rather than refresh rate.

### It is not fill rate

| render target | median frame |
| --- | --- |
| 2240 × 1400 (dpr 2) | 4.0 ms |
| 800 × 500 (dpr 1) — one eighth the pixels | 2.7 ms |

Eight times fewer pixels buys 1.4 ms. Whatever the frame is spending, it is not spending it per pixel.
This also rules out the obvious first move: **scaling `dpr` down under load would recover almost
nothing**, and would cost image quality to do it.

### It is not a leak, and it does not degrade

Sixty seconds of continuous walking, sampled in ten-second buckets: median 3.8, 3.8, 3.8, 3.8, 3.7,
3.7 ms. JS heap oscillates 74–98 MB with no trend. Draw calls constant to the unit. Nothing here grows
with session length.

### It is CPU submission cost, and that is the whole answer

| CPU throttle | median frame |
| --- | --- |
| 1× (M-series) | 3.8 ms |
| 4× | 14.1 ms |
| 6× | 21.8 ms |

Frame time scales linearly with CPU speed across the whole range. A school Chromebook or an older iPad
is comfortably 4–6× slower single-thread than the machine this was built on, which puts the frame at
14–22 ms **before the browser does anything else**. Vsync rounds that down to a locked 30 fps, and any
hitch on top lands as a visible stall. That is the frame drop, and it cannot be seen on a dev machine.

Where the CPU goes, sampled at 200 µs while walking:

```
21.8%  uniformMatrix4fv          per-draw matrix upload
 5.6%  WebGLRenderer.renderBufferDirect
 5.5%  getParameters
 5.0%  drawElements
 3.9%  (program)
 2.6%  setProgram
 2.6%  bindVertexArray
 2.4%  projectObject
 2.3%  copyArray  /  1.6% arraysEqual     three's uniform cache
```

There is not one frame of game code in the top eighteen. The 92 `useFrame` loops in the app are not
the problem; three.js is spending the frame submitting draw calls. **The draw call count is the
budget, and nothing else is.**

## 2. What the calls are

1139 draw calls per frame, 1.0 M triangles. Captured for a single frame by reading each call's live
shader uniforms — `diffuse` for identity, `modelViewMatrix` for position — which needs no changes to
the app:

| calls | pass | what |
| --- | --- | --- |
| ~330 | shadow | the world re-rendered into the shadow map, **every frame** |
| ~380 | main | one shader program, differing only by colour: 95 at `#572904`, 86 at `#be6c0e`, 61 at `#231309`, 38 at `#412511`, and a long tail |
| ~430 | main | everything else — slimes, stations, shop, sky, terrain |

Two observations decide the design.

**The sun never moves.** `SUN_DIR` in `world/Lighting.tsx` is a module constant with no animation. The
shadow map is being rebuilt sixty times a second for a light that is fixed and a world that is almost
entirely static.

**The shadow pass draws the same objects as the main pass.** So merging static geometry is not two
fixes, it is one fix counted twice: a merged mesh is one main-pass call *and* one shadow call.

`Buildings.tsx` already instances everything that repeats — its header says so and `world/instanced.tsx`
implements it. The ~380 calls are the meshes that are individually unique, mostly barn interior and
building detail, each carrying its own material because each carries its own colour.

## 3. Constraint: do not collide with work in flight

`feat/sanctuary` is under active daily development by another author. Churn since the branch opened:
`Game.tsx` 30 commits, `world/Buildings.tsx` 8, `slimes/Slime.tsx` 7, `world/barn.ts` 6,
`stations/sites.ts` 6, `economy/Shop.tsx` 6, `world/barnInterior.tsx` 5. `world/Lighting.tsx` has been
touched once.

So the mechanism goes in a new `game/perf/` directory that nothing else owns, and the hot files take
insertions of one to three lines. Specifically: **`Buildings.tsx` and `barnInterior.tsx` are not
edited at all** — the batcher reaches them by runtime traversal from a wrapper in `Game.tsx`.

This costs something real and it should be stated: a runtime batcher is more machinery than editing
the geometry at its source, and the source edit would read better. It is the wrong trade only if the
branch were quiet, and it is not.

## 4. The changes

### 4.1 Batch the static world — `perf/batch.tsx`

`<Batched>` wraps a subtree and merges its static meshes into one geometry per material group.

*Which meshes are static is measured, not annotated.* On mount the wrapper watches every descendant's
`matrixWorld` for ~30 frames; anything that never changed is a merge candidate. This auto-excludes the
windmill vane and every other animated part **without a single edit inside `Buildings.tsx`**, and it
cannot go stale the way a hand-maintained exclusion list would.

Candidates are grouped by a material signature that ignores colour, their colours baked into a
per-vertex colour attribute, and merged with `vertexColors: true`. This is the same mechanism
`world/pigment.ts` already uses via `setColorAt`, applied to meshes that are unique rather than
repeated.

Excluded: transparent materials (merging breaks sort order), and anything carrying an r3f pointer
handler. Neither `Buildings.tsx` nor `barnInterior.tsx` has a pointer handler — verified — so all
picking (shop, stations, screener items) is untouched.

Expected: ~380 main-pass calls to single digits, and a large share of the 330 shadow calls with them.

### 4.2 Caster budget — `perf/casters.ts`

The same traversal clears `castShadow` on props below a world-size threshold, where at this sun
elevation the shadow contributes nothing legible. One caster removed is one shadow call removed, with
no edits across the 148 `castShadow` sites in the app.

### 4.3 Shadow cadence — `perf/cadence.ts`

`sun.shadow.autoUpdate = false`, with `needsUpdate` raised on alternate frames. Verified against the
installed three 0.185 source: `WebGLShadowMap` skips a light entirely when `autoUpdate === false &&
needsUpdate === false`, so this is a per-light control and does not disturb anything else.

Halves what remains of the shadow pass. The artifact is a 30 Hz shadow update on slow-wandering
slimes, which is to be checked by eye before it is kept, and reverts to one constant.

### 4.4 Sharper shadows — last, and separate

The only fidelity change, and it changes shadow *sharpness* only: raise the shadow map above 2048 with
the budget freed by 4.1–4.3. At 2048 the map is 5.1 cm per texel; the headroom buys roughly half that.

It ships as the final commit, alone, so it can be dropped without unpicking anything.

### Rejected: a two-light static/dynamic caster split

The obvious architecture — freeze a high-resolution map for the static world, give movers their own
small light — was designed and then abandoned after checking the source. `WebGLShadowMap.renderObject`
filters casters with `object.layers.test( camera.layers )`, where `camera` is the **main** camera, not
the light. There is therefore no per-light caster mask to build the split on: hiding an object from one
light's shadow also deletes it from the visible frame. Doing it properly means a custom shadow pass,
which is far more than this budget needs.

## 5. The instrument

`perf/probe.tsx` mounts behind `?perf=1` and shows frame median and p99, draw calls split main versus
shadow, triangles, and program count. `perf/bench.mjs` reproduces the throttle sweep headlessly,
following the convention of the existing `shoot.mjs` and `prove-marking.mjs`.

This lands **before** any fix. Without it every later claim is an argument.

## 6. Verification

| metric | now | target |
| --- | --- | --- |
| draw calls / frame | 1139 | ≤ 450 |
| median @ 4× CPU throttle | 14.1 ms | ≤ 8 ms |
| median @ 6× CPU throttle | 21.8 ms | ≤ 12 ms |
| pixel diff, §4.1 | — | zero |
| `npm test` | green | green |

The pixel-diff gate is the one that enforces "no art changes", and it applies in full force to §4.1:
batching alters *what is submitted*, never what is drawn, so screenshots from fixed camera poses must
come back byte-comparable within a small epsilon. A diff there is a bug in the batcher — a dropped
attribute, a wrong colour space, a lost shadow flag — not a matter of taste.

The other three cannot honestly claim it, and should not pretend to:

- **§4.2 removes shadows on purpose.** A pebble stops casting. That is a visible change, however small,
  so it is gated by a screenshot put in front of the owner rather than by a diff — and it is
  conditional in the first place, because most small props share a material and will already have been
  merged by §4.1, which removes their shadow calls as a side effect. If the win is small after
  measuring, it should be skipped.
- **§4.3 changes only moving shadows**, at 30 Hz instead of 60. Static frames are identical; the check
  is by eye, against a wandering slime.
- **§4.4 is expected to change the image**, in sharpness only, which is why it is sequenced alone and
  last and can be dropped with one revert.

## 7. Order of work

1. `perf/probe.tsx` + `perf/bench.mjs` — no behaviour change
2. `perf/batch.tsx` — the primary lever, cuts both passes
3. `perf/casters.ts` — caster budget
4. `perf/cadence.ts` — shadow cadence
5. shadow map resolution — separate, droppable

Each step is independently mergeable and independently measurable.

## 8. What actually happened

Recorded after the fact, because a design document that only says what was intended is worth less on
the second reading than on the first.

| | draw calls | main | shadow |
| --- | --- | --- | --- |
| baseline (`bfaf73f`) | 1139 | 725 | 414 |
| after batching (§4.1) | 654 | 367 | 287 |
| after cadence (§4.3) | **514** | 370 | 144 |

**A 55% cut, and it stops 64 short of the 450 target.** That number was an estimate made before
anything had been taken apart, and the honest reason it was missed is in §2's third row: roughly 430
of the frame's calls were never in scope. They are the slimes, the vacpack in camera space, and the
intro — all of them animated, none of them mergeable by any scheme that does not change the picture.

Three things the measurement corrected about the design:

- **`Buildings` was the wrong target.** §4.1 named it as the obvious one. It turned out to hold 165
  meshes of which 87 are already `InstancedMesh` and 77 carry a texture or transparency, so a batcher
  folds nothing there — that file had already done this work. The real load was the shop stall (270
  meshes) and the stations (187), neither of which the design had looked at.
- **Both real targets change while a child plays**, which a one-shot merge cannot survive: a station
  swaps meshes every question and a stale merge leaves the previous question hanging in the air. That
  forced the staleness machinery in `perf/batch.ts`, which is most of its complexity and none of its
  original plan.
- **§4.2, the caster budget, was not built.** After §4.1 and §4.3 the shadow pass is 144 calls, so the
  remaining win is small — and it is the one change here that would visibly alter the image. Skipped
  on both counts, as §4.2 said to.

§4.4 is also unbuilt: the owner asked for no art changes for now, and shadow resolution is an art
change however small. The budget for it exists and the one-line change is described above.

### What the pixel guard caught

It earned its cost several times over, and every one of these was silent — none would have been
noticed in play, and all three would have been called an art change if anyone had spotted them later.

- **Mirrored props merged in inside-out.** `applyMatrix4` moves vertices and normals and leaves the
  index alone, so a prop placed by mirroring another kept its winding once the mirror was baked into
  its vertices. Three flips `frontFace` per object, which is why it looks right unmerged and wrong
  merged.
- **A material can animate while its mesh stands still.** Stillness was judged on the world matrix
  alone, and a merged mesh carries a *clone* of the material, so anything animated by mutating its
  material froze on merge.
- **A lantern that lights up later.** The same problem in its slower form: 65 lanterns are dark and
  constant through the observation window, get merged, and then light. No observation window can
  catch that, so `Batch` watches its merged sources' material state and dissolves when it changes.

**And one it only cornered.** 249 pixels of 540,000 still differ at the spawn pose — four distant
lantern highlights, 0.046%, inside the 0.1% budget. `?nobatch=<label>` bisects it to the stations
wrapper rather than the shop (265 pixels against 39, where two identical runs differ by about 45).
The leading explanation is shadow-frustum culling granularity: a merged mesh has one bounding sphere
spanning every station, so geometry that used to fall outside the shadow camera is no longer culled
out of it. That is unconfirmed, and it is written down rather than rounded to zero.
