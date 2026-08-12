import { describe, expect, it } from 'vitest';

import { shadowCadence } from './cadence';

const base = { frame: 1, every: 2, hasMap: true, typeChanged: false };

describe('shadow cadence', () => {
  it('rebuilds on every nth frame and skips the rest', () => {
    expect(shadowCadence({ ...base, frame: 2 })).toBe(true);
    expect(shadowCadence({ ...base, frame: 3 })).toBe(false);
    expect(shadowCadence({ ...base, frame: 4 })).toBe(true);
  });

  it('never skips while the map does not exist yet', () => {
    /* REGRESSION. A skipped frame is a frame three does not create the map on, and the frame after it
       samples nothing. */
    expect(shadowCadence({ ...base, frame: 3, hasMap: false })).toBe(true);
    expect(shadowCadence({ ...base, frame: 5, hasMap: false })).toBe(true);
  });

  it('never skips the frame the shadow type changed on', () => {
    /* REGRESSION — this is the white screen. `WebGLShadowMap.render` recreates the map for a new
       shadow type only on a frame the light is NOT skipped on (~L202), and clears `_previousType`
       unconditionally at the end of the same render (~L367). Skip that one frame and the map stays
       built for the old type forever, while every material has been recompiled for the new one. VSM
       then samples garbage moments, its Chebyshev bound exceeds 1, and it multiplies the light
       instead of attenuating it: every lit surface goes white, unlit ones look fine. */
    expect(shadowCadence({ ...base, frame: 3, typeChanged: true })).toBe(true);
    expect(shadowCadence({ ...base, frame: 7, typeChanged: true })).toBe(true);
  });

  it('rebuilds every frame when the cadence is turned off', () => {
    expect(shadowCadence({ ...base, frame: 3, every: 1 })).toBe(true);
    expect(shadowCadence({ ...base, frame: 7, every: 1 })).toBe(true);
  });

  it('still honours the forcing conditions when the cadence is off', () => {
    expect(shadowCadence({ ...base, frame: 3, every: 1, hasMap: false })).toBe(true);
  });
});
