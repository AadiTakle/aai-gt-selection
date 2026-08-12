import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useRef, type RefObject } from 'react';
import type { DirectionalLight } from 'three';

/**
 * THE SUN DOES NOT MOVE, SO ITS SHADOW MAP NEED NOT BE REDRAWN SIXTY TIMES A SECOND.
 *
 * `SUN_DIR` in `world/Lighting.tsx` is a module constant with no animation on it — the whole game is
 * one fixed moment of golden hour. Yet the shadow pass was 414 of the frame's 1139 draw calls before
 * the batcher and 287 of 654 after it, which is 44% of everything submitted, spent re-deriving a
 * picture that changes only where a slime happens to be walking.
 *
 * Halving the rate halves that. At `every = 2` the shadow map is rebuilt at 30Hz while the frame
 * still runs at 60, so a walking slime's shadow trails its feet by at most one frame — 16ms, over a
 * creature that crosses a pen at strolling pace. Static shadows, which is nearly all of them, are
 * bit-identical either way.
 *
 * ══ THE WHITE SCREEN THIS SHIPPED, AND WHY SKIPPING A FRAME IS NOT FREE ═══════════════════════════
 *
 * The first version set `autoUpdate = false` once in a mount effect and then raised `needsUpdate` on
 * every second frame. It made the game render, intermittently and about half the time, as a flat
 * white field with only the unlit props and the sun visible. The owner caught it; it had passed
 * forty-two automated reloads without appearing once.
 *
 * The mechanism is in `WebGLShadowMap.render` and it is worth stating exactly, because nothing about
 * it is guessable from the API:
 *
 *   const typeChanged = _previousType !== this.type;          // ~L129
 *   if ( typeChanged ) scene.traverse( m => m.needsUpdate = true );   // EVERY material recompiled
 *   ...
 *   if ( shadow.autoUpdate === false && shadow.needsUpdate === false ) continue;   // ~L170
 *   ...
 *   if ( shadow.map === null || typeChanged === true ) { dispose; recreate; }      // ~L202
 *   ...
 *   _previousType = this.type;                                // ~L367, unconditional
 *
 * `Lighting.tsx` switches the renderer to `VSMShadowMap` after mount. On that frame three recompiles
 * every material in the scene for the VSM sampler — but if that same frame is one the cadence chose
 * to skip, the light is dropped at L170 and its map is never recreated for the new type. L367 then
 * consumes `typeChanged` for good, so nothing ever retries. The result is VSM shaders sampling a map
 * that was never built for VSM: the depth moments are garbage, the Chebyshev bound comes out above 1,
 * and instead of attenuating the light it MULTIPLIES it. Every lit surface blows to white while
 * `MeshBasicMaterial`, which ignores lighting, renders correctly — which is exactly what the screen
 * showed, and is the detail that identified the failure.
 *
 * Whether it happened depended on which side of the counter the type change landed on. Hence "about
 * half the time", and hence a bug that a mount-time effect can create and no amount of reloading in
 * a fresh browser context reliably reproduces.
 *
 * ══ SO THE DECISION IS REMADE EVERY FRAME, NOT ONCE AT MOUNT ══════════════════════════════════════
 *
 * `shadowCadence` below is the whole rule and it is pure, so the frame that must not be skipped is a
 * test rather than an argument. Two conditions force a real update no matter what the counter says:
 * the map not existing yet, and the renderer's shadow type having changed since the last frame. Both
 * are re-checked every frame, so any state that goes wrong — through StrictMode's double mount, a
 * hot reload, a lost context, a resize — is corrected on the next frame instead of persisting for
 * the session.
 *
 * ══ THE OTHER REASON A TWO-LIGHT SPLIT WAS NOT BUILT ══════════════════════════════════════════════
 *
 * `renderObject` in the same file filters casters with `object.layers.test( camera.layers )` where
 * `camera` is the MAIN camera, not the light. There is no per-light caster mask in three, so hiding
 * an object from one light's shadow also deletes it from the visible frame. See the design doc.
 */

export interface CadenceInput {
  /** Frames elapsed since this hook started. */
  frame: number;
  /** Update the map every `every` frames. 1 disables the cadence. */
  every: number;
  /** Has three allocated the shadow map yet? */
  hasMap: boolean;
  /** Has `renderer.shadowMap.type` changed since the previous frame? */
  typeChanged: boolean;
}

/**
 * Should the shadow map be rebuilt on this frame?
 *
 * Pure, because the two conditions that force `true` are the entire safety of this file and both were
 * learned from a bug rather than from the documentation.
 */
export function shadowCadence({ frame, every, hasMap, typeChanged }: CadenceInput): boolean {
  /* No map means the frame after this one would sample nothing. Never skip. */
  if (!hasMap) return true;
  /* A type change is applied to the map only on a frame the light is not skipped on, and three
     forgets that the change ever happened at the end of the same render. Never skip. */
  if (typeChanged) return true;
  if (every <= 1) return true;
  return frame % every === 0;
}

export function useShadowCadence(light: RefObject<DirectionalLight | null>, every = 2): void {
  const gl = useThree((s) => s.gl);
  const frame = useRef(0);
  const lastType = useRef<number | null>(null);

  useFrame(() => {
    const current = light.current;
    if (!current) return;
    frame.current += 1;

    const type = gl.shadowMap.type;
    const typeChanged = lastType.current !== null && lastType.current !== type;
    lastType.current = type;

    /* Re-asserted every frame rather than set once at mount, so nothing that resets it — StrictMode's
       double mount, a hot reload, a restored context — can leave the light in a state this hook
       believes it is not in. */
    current.shadow.autoUpdate = false;
    current.shadow.needsUpdate = shadowCadence({
      frame: frame.current,
      every,
      hasMap: current.shadow.map !== null,
      typeChanged,
    });
  });

  useEffect(() => {
    const current = light.current;
    return () => {
      if (!current) return;
      current.shadow.autoUpdate = true;
      current.shadow.needsUpdate = true;
    };
  }, [light]);
}
