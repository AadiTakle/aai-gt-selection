import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useRef, type JSX } from 'react';

import { publish } from './store';

/**
 * The sampler. Mounts inside `<Canvas>`, renders nothing, and reports what the last frame cost.
 *
 * ONE FRAME OF LAG, STATED RATHER THAN HIDDEN. `useFrame` callbacks run BEFORE r3f calls
 * `gl.render()`, and `WebGLRenderer.info.render.calls` is reset at the head of every render. So the
 * counters read here are the previous frame's. At sixty frames a second that is 16ms of staleness in
 * a number being averaged over two seconds, which is why it is acceptable — but it matters if anyone
 * ever tries to correlate a single spike with a single action, so it is written down.
 *
 * DRAW CALLS ARE NOT SPLIT BY PASS HERE. `info.render.calls` counts the shadow pass and the main pass
 * together, and separating them needs the WebGL entrypoints patched, which is a thing to do to a
 * browser from outside rather than to the app from inside. `bench.mjs` does exactly that. The panel
 * gives the total, which is the number that has to come down.
 */
const WINDOW = 120;

export function Probe(): JSX.Element | null {
  const gl = useThree((s) => s.gl);
  const scene = useThree((s) => s.scene);
  const camera = useThree((s) => s.camera);
  const frames = useRef<number[]>([]);
  const last = useRef(performance.now());

  /**
   * The scene, on the window, so a script outside the page can walk it.
   *
   * r3f keeps no handle on the canvas element and three exposes none, so without this there is no way
   * to ask "which subtree issues these 725 draw calls" from a Playwright run — and that question is
   * how the batcher's targets were chosen. It exists only under `?perf=1`, alongside everything else
   * in this directory.
   */
  useEffect(() => {
    const w = window as unknown as { __bhScene?: unknown; __bhCamera?: unknown };
    w.__bhScene = scene;
    /* The camera too, and for a sharper reason: `guard.mjs` has to put the view in exactly the same
       place in two separate page loads to diff them, and a camera driven by pointer lock and key
       state cannot be posed repeatably from outside. */
    w.__bhCamera = camera;
    return () => {
      delete w.__bhScene;
      delete w.__bhCamera;
    };
  }, [scene, camera]);

  useFrame(() => {
    const now = performance.now();
    const ring = frames.current;
    ring.push(now - last.current);
    last.current = now;
    if (ring.length > WINDOW) ring.shift();
    publish({
      frames: ring.slice(),
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
