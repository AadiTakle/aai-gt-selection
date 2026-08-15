/**
 * The hollow's randomness. Deterministic, hand-rolled, no dependency.
 *
 * Everything in the world that looks scattered is actually a pure function of a seed, for two
 * reasons. The obvious one is that the ranch must be the same place every time a child comes back:
 * a tree that moves overnight is not a home. The less obvious one is that a pure height function
 * lets the player controller ask "how high is the ground here" analytically, which is how ground
 * detection stays honest on a slope without leaning on a raycast every frame.
 *
 * Value noise rather than simplex on purpose. Simplex's virtue is isotropy at high frequency and
 * nothing here runs above ~0.2 cycles/metre, where the two are indistinguishable, while value noise
 * is a third of the arithmetic per sample and we take ~40k samples to build the terrain.
 */

/** 32-bit integer hash. `Math.imul` because plain `*` loses the low bits we are about to shift. */
function hash2(ix: number, iy: number): number {
  let h = Math.imul(ix, 374761393) ^ Math.imul(iy, 668265263);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

/** Quintic smoothstep. C2-continuous, so terrain normals have no faceted ridges along cell edges. */
function fade(t: number): number {
  return t * t * t * (t * (t * 6 - 15) + 10);
}

/** Value noise in 0..1. */
export function noise2(x: number, y: number): number {
  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  const fx = fade(x - x0);
  const fy = fade(y - y0);
  const a = hash2(x0, y0);
  const b = hash2(x0 + 1, y0);
  const c = hash2(x0, y0 + 1);
  const d = hash2(x0 + 1, y0 + 1);
  const top = a + (b - a) * fx;
  const bottom = c + (d - c) * fx;
  return top + (bottom - top) * fy;
}

/** Value noise in -1..1. */
export function snoise2(x: number, y: number): number {
  return noise2(x, y) * 2 - 1;
}

/**
 * Fractal sum, signed, normalised to roughly -1..1.
 *
 * The offset on each octave is prime-ish and irrational-looking so octaves do not share their grid
 * alignment; without it every octave's cell corners land on top of each other and the terrain grows
 * a faint square lattice that reads as tiling.
 */
export function fbm(x: number, y: number, octaves = 3, lacunarity = 2.03, gain = 0.5): number {
  let sum = 0;
  let amp = 1;
  let norm = 0;
  let fx = x;
  let fy = y;
  for (let i = 0; i < octaves; i += 1) {
    sum += snoise2(fx, fy) * amp;
    norm += amp;
    amp *= gain;
    fx = fx * lacunarity + 31.416;
    fy = fy * lacunarity - 17.234;
  }
  return norm > 0 ? sum / norm : 0;
}

/** Deterministic stream. One seed per scatter layer, so adding ferns never moves the trees. */
export function rng(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** 0 below `edge0`, 1 above `edge1`, smooth between. The workhorse for blending terrain features. */
export function smoothstep(edge0: number, edge1: number, x: number): number {
  if (edge1 === edge0) return x < edge0 ? 0 : 1;
  const t = Math.min(1, Math.max(0, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

export function clamp(x: number, lo: number, hi: number): number {
  return x < lo ? lo : x > hi ? hi : x;
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/** Frame-rate independent exponential approach. `rate` is roughly "how fast", in 1/seconds. */
export function damp(current: number, target: number, rate: number, dt: number): number {
  return current + (target - current) * (1 - Math.exp(-rate * dt));
}
