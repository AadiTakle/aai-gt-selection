import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import {
  CylinderGeometry,
  MeshBasicMaterial,
  MeshStandardMaterial,
  SphereGeometry,
  TorusGeometry,
} from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';

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
  /** The awning. Cream and honey stripes, which is the universal picture of a market stall. */
  canvasPale: '#f6e9cf',
  canvasWarm: '#e2a34c',
  honey: '#e0a63f',
  brass: '#dcae4d',
  brassDeep: '#a97c2c',
  burlap: '#c9ad80',
  /** The gauze over a cubby a child has not saved up for yet. Never grey, never a shutter. */
  gauze: '#fbf1dc',
} as const;

export const HONEY = PIG.honey;
export const BRASS = PIG.brass;

type MatName =
  | 'timber'
  | 'timberDeep'
  | 'cream'
  | 'shingle'
  | 'stone'
  | 'stoneDeep'
  | 'paint'
  | 'paintDeep'
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
    canvasPale: make(PIG.canvasPale, 0.9),
    canvasWarm: make(PIG.canvasWarm, 0.9),
    /**
     * The only metal in the hollow. Roughness is kept high for a metal — 0.34 rather than the 0.1 that
     * would give a mirror — because at this sun elevation a smooth metal disc catches one tiny hard
     * highlight and reads as plastic everywhere else on its face. A slightly worn brass reads as brass.
     */
    brass: new MeshStandardMaterial({ color: PIG.brass, roughness: 0.34, metalness: 0.72 }),
    brassDeep: new MeshStandardMaterial({ color: PIG.brassDeep, roughness: 0.42, metalness: 0.66 }),
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
      opacity: 0.62,
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

export function coinPile(
  price: number,
  radius: number,
): { at: [number, number][]; width: number; height: number } {
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
  return {
    at,
    width: Math.min(n, COINS_PER_ROW) * pitch,
    height: rows * pitch * 0.92,
  };
}

/* ------------------------------------------------------------------ *\
   Shared shapes
\* ------------------------------------------------------------------ */

interface ShopShapes {
  plaque: RoundedBoxGeometry;
  slat: RoundedBoxGeometry;
  bolt: SphereGeometry;
  ring: TorusGeometry;
}

let shapes: ShopShapes | null = null;

/** Unit boxes and a unit ring, scaled per instance. Everything rounded, per the world's own rule. */
export function shopShapes(): ShopShapes {
  shapes ??= {
    plaque: new RoundedBoxGeometry(1, 1, 0.08, 3, 0.12),
    slat: new RoundedBoxGeometry(1, 1, 1, 2, 0.06),
    bolt: new SphereGeometry(0.06, 10, 8),
    ring: new TorusGeometry(1, 0.055, 8, 26),
  };
  return shapes;
}

/** An unlit honey wash, for anything that should look emitted rather than lit. */
let glowMat: MeshBasicMaterial | null = null;
export function glow(): MeshBasicMaterial {
  glowMat ??= new MeshBasicMaterial({
    color: PIG.honey,
    transparent: true,
    opacity: 0.55,
    toneMapped: false,
    fog: false,
    depthWrite: false,
  });
  return glowMat;
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
