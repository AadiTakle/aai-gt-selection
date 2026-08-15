import { CanvasTexture, RepeatWrapping, SRGBColorSpace, type Texture } from 'three';

/**
 * Every texture in the ranch is drawn at load, in a canvas, from noise. No image files.
 *
 * The reason is the brief's "no visible tiling, no hard seams" against the reality that an untextured
 * `MeshStandardMaterial` reads as plastic. The resolution is that surface detail and surface *colour*
 * are separated: colour comes from vertex attributes at metre scale, where a repeat would be obvious,
 * and detail comes from a genuinely seamless grain repeated many times at ~6% contrast, where a repeat
 * is not perceptible because there is no feature large enough to recognise. Both are needed; either
 * alone looks wrong.
 *
 * All of these are module-memoised, so mounting `<Ranch/>` twice does not redraw them.
 */

/**
 * Value noise that tiles exactly, by wrapping the hash lattice at `period`.
 *
 * A non-periodic noise baked into a repeated texture produces a visible grid of hard seams, which is
 * the single most common way procedural ground goes wrong.
 */
function periodicNoise(x: number, y: number, period: number): number {
  const wrap = (n: number) => ((n % period) + period) % period;
  const hash = (ix: number, iy: number): number => {
    let h = Math.imul(wrap(ix), 374761393) ^ Math.imul(wrap(iy), 668265263);
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
  };
  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  const fx = x - x0;
  const fy = y - y0;
  const sx = fx * fx * fx * (fx * (fx * 6 - 15) + 10);
  const sy = fy * fy * fy * (fy * (fy * 6 - 15) + 10);
  const a = hash(x0, y0);
  const b = hash(x0 + 1, y0);
  const c = hash(x0, y0 + 1);
  const d = hash(x0 + 1, y0 + 1);
  const top = a + (b - a) * sx;
  const bottom = c + (d - c) * sx;
  return top + (bottom - top) * sy;
}

function periodicFbm(u: number, v: number, baseCells: number, octaves: number): number {
  let sum = 0;
  let amp = 1;
  let norm = 0;
  let cells = baseCells;
  for (let o = 0; o < octaves; o += 1) {
    sum += periodicNoise(u * cells, v * cells, cells) * amp;
    norm += amp;
    amp *= 0.5;
    cells *= 2;
  }
  return norm > 0 ? sum / norm : 0.5;
}

function makeCanvas(size: number): { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D } | null {
  if (typeof document === 'undefined') return null;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  return { canvas, ctx };
}

let grain: Texture | null = null;

/**
 * Seamless surface grain. Near-white, low contrast, meant to be multiplied by a vertex colour.
 *
 * Doubles as a roughness map: the green channel drives roughness, so light breaks up across a
 * surface instead of sliding over it as one even sheen. That single detail is most of the difference
 * between "3D primitive" and "thing in a world".
 */
export function grainTexture(): Texture | null {
  if (grain) return grain;
  const made = makeCanvas(256);
  if (!made) return null;
  const { canvas, ctx } = made;
  const image = ctx.createImageData(256, 256);
  const data = image.data;
  for (let y = 0; y < 256; y += 1) {
    for (let x = 0; x < 256; x += 1) {
      const u = x / 256;
      const v = y / 256;
      const soft = periodicFbm(u, v, 4, 4);
      const speck = periodicFbm(u, v, 32, 2);
      // 0.88..1.0 of full white. Enough to see, not enough to read as a pattern.
      const value = 0.88 + soft * 0.075 + (speck - 0.5) * 0.05;
      const i = (y * 256 + x) * 4;
      // Warm-sided: the red channel carries a touch more, so grain never greys a colour out.
      data[i] = Math.round(Math.min(1, value * 1.015) * 255);
      data[i + 1] = Math.round(Math.min(1, value) * 255);
      data[i + 2] = Math.round(Math.min(1, value * 0.985) * 255);
      data[i + 3] = 255;
    }
  }
  ctx.putImageData(image, 0, 0);
  const tex = new CanvasTexture(canvas);
  tex.wrapS = RepeatWrapping;
  tex.wrapT = RepeatWrapping;
  tex.colorSpace = SRGBColorSpace;
  tex.anisotropy = 4;
  grain = tex;
  return tex;
}

let puff: Texture | null = null;

/**
 * A single cloud puff: soft alpha, no hard edge anywhere, brighter toward the top.
 *
 * Billboards rather than sphere clusters. A cloud made of spheres costs hundreds of triangles and a
 * shadow-map entry each, and still has a silhouette that pops as the camera turns; six of these are
 * one draw call and read softer.
 */
export function puffTexture(): Texture | null {
  if (puff) return puff;
  const made = makeCanvas(256);
  if (!made) return null;
  const { canvas, ctx } = made;
  ctx.clearRect(0, 0, 256, 256);
  const blobs: readonly [number, number, number][] = [
    [128, 150, 62],
    [86, 158, 46],
    [172, 158, 48],
    [110, 118, 44],
    [156, 124, 40],
    [128, 104, 32],
  ];
  ctx.globalCompositeOperation = 'lighter';
  for (const [cx, cy, r] of blobs) {
    const g = ctx.createRadialGradient(cx, cy - r * 0.25, r * 0.1, cx, cy, r);
    g.addColorStop(0, 'rgba(255,253,246,0.72)');
    g.addColorStop(0.45, 'rgba(253,246,232,0.4)');
    g.addColorStop(1, 'rgba(250,240,226,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();
  }
  const tex = new CanvasTexture(canvas);
  tex.colorSpace = SRGBColorSpace;
  puff = tex;
  return tex;
}

let glow: Texture | null = null;

/** A round soft dot. Pollen, chimney smoke, the sun's bloom. */
export function glowTexture(): Texture | null {
  if (glow) return glow;
  const made = makeCanvas(64);
  if (!made) return null;
  const { canvas, ctx } = made;
  ctx.clearRect(0, 0, 64, 64);
  const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, 'rgba(255,252,240,1)');
  g.addColorStop(0.3, 'rgba(255,246,214,0.55)');
  g.addColorStop(1, 'rgba(255,240,206,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 64, 64);
  const tex = new CanvasTexture(canvas);
  tex.colorSpace = SRGBColorSpace;
  glow = tex;
  return tex;
}

let ripple: Texture | null = null;

/**
 * A seamless, wrapping ripple field used as the pond's normal map.
 *
 * Cheaper and calmer than a displacement shader, and because it is a normal map the pond can stay on
 * `MeshStandardMaterial` and pick up the same sun and sky as everything else, which is what makes the
 * water look like it belongs to the scene rather than sitting on top of it.
 */
export function rippleTexture(): Texture | null {
  if (ripple) return ripple;
  const made = makeCanvas(256);
  if (!made) return null;
  const { canvas, ctx } = made;
  const image = ctx.createImageData(256, 256);
  const data = image.data;
  const height = (u: number, v: number): number =>
    periodicFbm(u, v, 6, 3) * 0.7 + periodicFbm(v * 1.0 + 0.31, u * 1.0 - 0.17, 12, 2) * 0.3;
  const step = 1 / 256;
  for (let y = 0; y < 256; y += 1) {
    for (let x = 0; x < 256; x += 1) {
      const u = x / 256;
      const v = y / 256;
      // Central differences on the wrapped field give a tangent-space normal with no seam.
      const dx = (height(u + step, v) - height(u - step, v)) * 5.5;
      const dy = (height(u, v + step) - height(u, v - step)) * 5.5;
      const len = Math.hypot(dx, dy, 1);
      const i = (y * 256 + x) * 4;
      data[i] = Math.round((-dx / len * 0.5 + 0.5) * 255);
      data[i + 1] = Math.round((-dy / len * 0.5 + 0.5) * 255);
      data[i + 2] = Math.round((1 / len * 0.5 + 0.5) * 255);
      data[i + 3] = 255;
    }
  }
  ctx.putImageData(image, 0, 0);
  const tex = new CanvasTexture(canvas);
  tex.wrapS = RepeatWrapping;
  tex.wrapT = RepeatWrapping;
  ripple = tex;
  return tex;
}
