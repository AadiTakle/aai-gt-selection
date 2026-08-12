import { useFrame } from '@react-three/fiber';
import { useEffect, useRef, type RefObject } from 'react';
import type { DirectionalLight } from 'three';

/**
 * THE SUN DOES NOT MOVE, SO ITS SHADOW MAP NEED NOT BE REDRAWN SIXTY TIMES A SECOND.
 *
 * `SUN_DIR` in `world/Lighting.tsx` is a module constant with no animation on it — the whole game is
 * one fixed moment of golden hour. Yet the shadow pass was 414 of the frame's 1139 draw calls before
 * the batcher and is 287 of 654 after it, which is 44% of everything submitted, spent re-deriving a
 * picture that changes only where a slime happens to be walking.
 *
 * Halving the rate halves that. At `every = 2` the shadow map is rebuilt at 30Hz while the frame
 * still runs at 60, so a walking slime's shadow trails its feet by at most one frame — 16ms, over a
 * creature that crosses a pen at strolling pace. Static shadows, which is nearly all of them, are
 * bit-identical either way.
 *
 * ══ VERIFIED AGAINST THE INSTALLED THREE, NOT REMEMBERED ══════════════════════════════════════════
 *
 * `node_modules/three/src/renderers/webgl/WebGLShadowMap.js` skips a light entirely when
 * `shadow.autoUpdate === false && shadow.needsUpdate === false` (the per-light check is at the top of
 * its light loop; there is a renderer-wide one above it). So this is a per-light control that leaves
 * every other light and the main pass alone.
 *
 * The same file is also why a two-light static/dynamic split was NOT built. Its `renderObject` filters
 * casters with `object.layers.test( camera.layers )` where `camera` is the MAIN camera, not the light,
 * so there is no per-light caster mask in three to build such a split on: hiding an object from one
 * light's shadow also deletes it from the visible frame. See the design doc.
 *
 * ══ THE ONE THING THAT WOULD BREAK IT ═════════════════════════════════════════════════════════════
 *
 * If the sun is ever animated — a day cycle, a sunset at the end of a session — every shadow in the
 * world would then lag it by a frame, which on a moving light is a visible shimmer across the whole
 * ranch rather than a small delay on one creature. Set `every` to 1 at that point, or drive
 * `needsUpdate` from whether the sun moved.
 */
export function useShadowCadence(
  light: RefObject<DirectionalLight | null>,
  every = 2,
): void {
  const frame = useRef(0);

  useEffect(() => {
    const current = light.current;
    if (!current || every <= 1) return undefined;
    current.shadow.autoUpdate = false;
    /* One full update immediately, or the first frames render with an empty shadow map. */
    current.shadow.needsUpdate = true;
    return () => {
      current.shadow.autoUpdate = true;
      current.shadow.needsUpdate = true;
    };
  }, [light, every]);

  useFrame(() => {
    const current = light.current;
    if (!current || every <= 1) return;
    frame.current += 1;
    /* three clears `needsUpdate` itself once it has rendered the map, so this only ever sets it. */
    if (frame.current % every === 0) current.shadow.needsUpdate = true;
  });
}
