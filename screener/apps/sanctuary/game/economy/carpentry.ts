import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import { CylinderGeometry, MeshStandardMaterial, SphereGeometry, TorusGeometry } from 'three';

/**
 * THE STALL'S MATERIALS, AND THE COIN.
 *
 * PIGMENT, NOT COLOUR. Same discipline `world/Buildings.tsx` and `stations/carpentry.tsx` both state, and
 * for the same reason: these are unlit albedo values chosen so that a low gold sun resolves them to warm
 * timber, rather than values that already look right on a flat page and then clip to white under a
 * 4.6-intensity light. The timber, cream, shingle and stone values are deliberately the SAME numbers the
 * stations use — a shop built out of a different brown would read as belonging to another world.
 *
 * THE COIN IS THE ONE NEW THING IN THE PALETTE, and it is the whole economy's vocabulary. It has to be
 * recognisable at three quite different sizes: 14cm across on the counter, 22cm on a price plaque, and
 * about 30 flat pixels in the corner of the screen. So it is drawn the same way in all three places — a
 * fat disc, a raised rim, and a single star pressed into the face — and it is the only genuinely metallic
 * thing in the hollow. `metalness` on everything else here stays at zero.
 */

const PIG = {
  timber: '#8a6a49',
  timberDeep: '#684d34',
  cream: '#ece5d2',
  shingle: '#6a5340',
  stone: '#b09c81',
  stoneDeep: '#8a7659',
  /** The stall's painted front. Warmer and lighter than the stations' plank sign, so it reads as new. */
  paint: '#e8c98d',
  paintDeep: '#c99a52',
  /**
   * The inside of a cubby, and it is DELIBERATELY THE DARKEST TIMBER ON THE STALL.
   *
   * The first pass painted the cubby backs in the same pale `paint` as the stall front, and everything in
   * them disappeared: a cream slime on a cream board with cream coins under it is one cream rectangle. A
   * cubby is a recess, a recess is in shadow, and that shadow is what every slime and every coin on this
   * shelf is read against.
   */
  cubby: '#7c5b3c',
  /**
   * The awning. Cream and a soft barn red rather than cream and honey, which was the other thing a
   * screenshot settled: against a golden-hour meadow, cream-and-honey stripes are two shades of the same
   * colour and the stall read as one pale mass. The barn thirteen metres away is `#9a4030`, so borrowing a
   * lighter relative of it ties the newest building on the ranch to the oldest and gives the stall the one
   * strong colour it needs to be picked out from the arrival.
   */
  canvasPale: '#f6e9cf',
  canvasWarm: '#c8604a',
  honey: '#e0a63f',
  brass: '#e0ae42',
  brassDeep: '#9e6f24',
  burlap: '#c9ad80',
  /** The gauze over a cubby a child has not saved up for yet. Never grey, never a shutter. */
  gauze: '#fdf6e6',
} as const;

export const HONEY = PIG.honey;

type MatName =
  | 'timber'
  | 'timberDeep'
  | 'cream'
  | 'shingle'
  | 'stone'
  | 'stoneDeep'
  | 'paint'
  | 'paintDeep'
  | 'cubby'
  | 'canvasPale'
  | 'canvasWarm'
  | 'brass'
  | 'brassDeep'
  | 'burlap'
  | 'gauze';

let MATS: Record<MatName, MeshStandardMaterial> | null = null;

/** Shared instances, module-memoised, so remounting the stall rebuilds no materials. */
export function mats(): Record<MatName, MeshStandardMaterial> {
  if (MATS) return MATS;
  const make = (color: string, roughness: number): MeshStandardMaterial =>
    new MeshStandardMaterial({ color, roughness, metalness: 0 });
  MATS = {
    timber: make(PIG.timber, 0.8),
    timberDeep: make(PIG.timberDeep, 0.76),
    cream: make(PIG.cream, 0.82),
    shingle: make(PIG.shingle, 0.74),
    stone: make(PIG.stone, 0.92),
    stoneDeep: make(PIG.stoneDeep, 0.9),
    paint: make(PIG.paint, 0.66),
    paintDeep: make(PIG.paintDeep, 0.68),
    cubby: make(PIG.cubby, 0.86),
    canvasPale: make(PIG.canvasPale, 0.9),
    canvasWarm: make(PIG.canvasWarm, 0.9),
    /**
     * The coin, and the ONE MATERIAL HERE THAT HAD TO BE RETUNED AFTER LOOKING AT A SCREENSHOT.
     *
     * The first pass ran brass at `metalness: 0.72`, which is roughly what brass physically is, and half the
     * coins on the shelf came out WHITE. The reason is specific and worth writing down so nobody puts it
     * back: a metal has no diffuse colour, so everything you see on it is reflected environment — and this
     * scene has no environment map. There is a sun, a hemisphere light and one warm lamp on the stall, so a
     * metallic disc shows a blown highlight where it happens to catch one of them and almost nothing where
     * it does not. Whether a given coin read as gold or as a white blob came down to which way its cubby
     * faced, and a PRICE may not depend on that.
     *
     * So the coin is mostly dielectric with a hint of metal. Its colour now comes from its albedo, which is
     * reliable under any light, and a little metalness keeps a warm sheen travelling across the face as a
     * child moves their head.
     *
     * THE ROUGHNESS IS THE SECOND HALF OF THE SAME FIX. At 0.36 the residual specular was still tight enough
     * that the cubbies nearest the stall's lamp — which hangs 1.85m in front of the middle of the shelf —
     * blew their coins to white while cubbies at the ends stayed gold. A price is the one thing on this shelf
     * that must look identical everywhere, so the lobe is broadened until no cubby can catch a hot spot.
     * 0.55 is matte enough to be lamp-proof and glossy enough to still be metal.
     */
    brass: new MeshStandardMaterial({ color: PIG.brass, roughness: 0.55, metalness: 0.15 }),
    brassDeep: new MeshStandardMaterial({ color: PIG.brassDeep, roughness: 0.62, metalness: 0.12 }),
    burlap: make(PIG.burlap, 0.95),
    /**
     * The gauze. Transparent and NOT depth-writing, so the slime behind it stays plainly visible through
     * it and the price plaque in front of it is never occluded. A cloth over a shelf, which is a thing a
     * child has seen; not a shutter, not a padlock, not a cross.
     */
    gauze: new MeshStandardMaterial({
      color: PIG.gauze,
      roughness: 0.94,
      metalness: 0,
      transparent: true,
      opacity: 0.74,
      depthWrite: false,
    }),
  };
  return MATS;
}

/* ------------------------------------------------------------------ *\
   The coin
\* ------------------------------------------------------------------ */

interface CoinParts {
  disc: CylinderGeometry;
  rim: TorusGeometry;
  pip: SphereGeometry;
}

let coinParts: CoinParts | null = null;

/**
 * One coin, as three unit pieces shared by every coin on the page.
 *
 * Authored at radius 1 and scaled by the mesh, so the counter's coins, a price plaque's coins and the
 * flourish's coins are all the same three buffers. A price of fourteen is fourteen instances of this and
 * costs nothing.
 */
export function coinGeometry(): CoinParts {
  if (coinParts) return coinParts;
  coinParts = {
    // Sixteen sides. At the largest a coin is ever drawn — 22cm, two metres from the eye — sixteen is
    // under a pixel of flat on the rim, and a coin is seen face-on almost always.
    disc: new CylinderGeometry(1, 1, 0.22, 16),
    rim: new TorusGeometry(0.86, 0.11, 6, 18),
    pip: new SphereGeometry(0.3, 8, 6),
  };
  return coinParts;
}

/**
 * How a price is laid out as a pile of coins, and WHY A PRICE IS NOT A NUMERAL.
 *
 * The rule for this app is that nothing requires reading, and a numeral is reading — a five-year-old who
 * can recognise "9" is a fluent five-year-old. A pile of nine coins beside a pile of three is a comparison
 * a two-year-old makes. So the price of a slime is drawn as literally that many coins, and "dearer" is
 * something the child SEES rather than something they have to be told.
 *
 * It also settles the affordability question for free. The purse indicator counts real coins with the same
 * picture on them, so "have I got enough" is a matching game rather than an arithmetic one.
 *
 * Rows of at most five, because a row of five is the largest group a person takes in without counting and
 * because five is what fits across a cubby at the smallest pitch the shelf ever uses.
 */
export const COINS_PER_ROW = 5;

export function coinPile(price: number, radius: number): { at: [number, number][] } {
  const n = Math.max(1, Math.round(price));
  const rows = Math.ceil(n / COINS_PER_ROW);
  const pitch = radius * 2.24;
  const at: [number, number][] = [];
  for (let i = 0; i < n; i += 1) {
    const r = Math.floor(i / COINS_PER_ROW);
    const inRow = Math.min(COINS_PER_ROW, n - r * COINS_PER_ROW);
    const c = i % COINS_PER_ROW;
    at.push([
      (c - (inRow - 1) / 2) * pitch,
      // Bottom row first, so a pile grows UPWARD as a price rises. A pile that grew downward would move
      // the cheapest prices around as the dearest ones got taller.
      ((rows - 1) / 2 - r) * pitch * 0.92,
    ]);
  }
  return { at };
}

/* ------------------------------------------------------------------ *\
   The far face
\* ------------------------------------------------------------------ */

interface FarEye {
  sclera: SphereGeometry;
  iris: SphereGeometry;
  catchlight: SphereGeometry;
}

let farEye: FarEye | null = null;

/**
 * THE SAME THREE BALLS A SLIME'S EYE IS MADE OF, AT THE TESSELLATION A DISTANT ONE NEEDS.
 *
 * `slimes/gumdrop.ts`'s `faceGeometry` builds the eye at 20x14, which is right for a creature you are
 * standing next to and is 520 triangles spent on something four pixels across at the arrival point. These
 * are the same unit spheres at a quarter of the triangles, used only by the shelf's instanced eye pool —
 * so a shop full of faces at 21m costs about 9k triangles rather than 35k.
 *
 * THIS IS NOT A SECOND LOOK, IT IS A LEVEL OF DETAIL, and it is the same one `Effigy.tsx` already takes for
 * the body: that file asks `gumdropGeometry` for its `'far'` bake for exactly this reason and says so. The
 * radii, the layout and the materials are unchanged — only the number of sides is, and at the distances the
 * pool is used a ten-sided sphere and a twenty-sided one differ nowhere a pixel could show it.
 */
export function farEyeGeometry(): FarEye {
  farEye ??= {
    sclera: new SphereGeometry(1, 10, 7),
    iris: new SphereGeometry(1, 8, 6),
    catchlight: new SphereGeometry(1, 5, 4),
  };
  return farEye;
}

let farIris: MeshStandardMaterial | null = null;

/**
 * The iris, for the pool, and the one material in the shop that is a copy of a slime material rather than
 * the slime material itself.
 *
 * IT HAS TO BE, AND IT IS STILL NOT A FORK. `slimes/gumdrop.ts` keeps ONE iris material PER FAMILY because
 * the colour lives on the material — which is exactly what an instanced draw cannot have, since nineteen
 * materials is nineteen draw calls and the whole point of the pool is one. So the colour moves to the
 * instance colour attribute instead, and this material carries only the numbers, which are copied from
 * `irisMaterial` and are the only two it has: roughness 0.08, metalness 0. An instance colour multiplies
 * the diffuse term, and white multiplied by the family's own iris colour is the family's own iris colour.
 *
 * The colour itself is READ OFF `irisMaterial(family).color` at fill time rather than out of the look
 * table, so it cannot drift from the herd's even if the table moves.
 */
export function farIrisMaterial(): MeshStandardMaterial {
  farIris ??= new MeshStandardMaterial({ color: '#ffffff', roughness: 0.08, metalness: 0 });
  return farIris;
}

/* ------------------------------------------------------------------ *\
   Shared shapes
\* ------------------------------------------------------------------ */

interface ShopShapes {
  /** A unit ring, scaled per use. The one shape the shop needs that is not a coin. */
  ring: TorusGeometry;
}

let shapes: ShopShapes | null = null;

export function shopShapes(): ShopShapes {
  shapes ??= { ring: new TorusGeometry(1, 0.055, 8, 26) };
  return shapes;
}

/**
 * A 0..1 value that catches up with its target over a few frames, frame-rate independently.
 *
 * Lifted in shape from `stations/carpentry.tsx`'s `useEase` and kept here rather than imported so this
 * directory does not depend on a file it may not edit for something four lines long. Same reason that file
 * gives for having it: a light that snaps on the instant a child crosses an invisible line reads as a bug,
 * and one that comes up over a third of a second reads as having noticed them.
 */
export function useEase(target: number, rate = 8): { current: number } {
  const value = useRef(target);
  useFrame((_, dt) => {
    value.current += (target - value.current) * (1 - Math.exp(-rate * dt));
  });
  return value;
}
