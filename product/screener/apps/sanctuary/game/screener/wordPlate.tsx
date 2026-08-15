import { useMemo } from 'react';
import * as THREE from 'three';

import { EventGlyph } from './EventGlyph';
import type { EventMark } from './eventMeaning';
import { HUE, MAT, shade, useSlab } from './theme';

/**
 * A WORD, DRAWN IN THE WORLD — the one thing this directory did not have and the verbal battery cannot
 * do without.
 *
 * ══ WHY THIS FILE EXISTS AT ALL ═══════════════════════════════════════════════════════════════════
 *
 * The whole screener was built on a rule that a five-year-old cannot read, so every item had to be
 * answerable from pictures alone. That rule is right for figure matrices and number series and it is
 * WRONG FOR THE VERBAL BATTERY, which is about words by definition. Forcing it produced two presentations
 * a grown adult could not decode: `VER-RELPAIR-01` became audio-only (0 of its 100 items are fully
 * picturable, so it was answered by LISTENING, and a muted tab, a school image with no voice packages or
 * a deaf child is handed a stone with eight blank slabs on it), and `VER-SORTBOT-01` threw away 73 of its
 * 100 items because a picture could not carry them.
 *
 * The owner's instruction reverses it: words on screen, in simple vocabulary. So words have to be
 * DRAWABLE, and nothing in the 3D layer could draw one.
 *
 * ══ WHY A CANVAS TEXTURE AND NOT THE TWO ALTERNATIVES ═════════════════════════════════════════════
 *
 * A FLAT DOM OVERLAY was the first idea and it is the wrong one, three times over. It would have to
 * project a 3D point to the screen every frame and follow a camera the child controls; it has no
 * occlusion, so a word would draw ON TOP of the stone that is supposed to be in front of it; and it sits
 * in the same stacking context as the game's own pointer handling, which is exactly the class of bug that
 * eats a click meant for the world. A screener whose options stop responding is worse than one that is
 * hard to read.
 *
 * `drei`'s `<Text>` (troika) is the other obvious answer and it fails on deployment rather than on
 * design: with no `font` prop it FETCHES Roboto from a CDN at first paint. `speak.ts` already documents
 * what this directory's target machines are like — locked-down school images, no voice packages, missing
 * fonts — and a word that arrives over the network is a word that sometimes does not arrive. It is also
 * asynchronous, so a screenshot taken too early shows a blank card, which is precisely the failure this
 * change exists to end.
 *
 * A CANVAS TEXTURE has none of that. It is synchronous, offline, cached, drawn with the system font
 * stack, and it is GEOMETRY IN THE SCENE: it occludes and is occluded correctly, it scales with distance
 * the way everything else does, it is lit by the same two lights, and it cannot intercept a pointer event
 * because a mesh without handlers is not a target — the invisible hit volumes in front of it keep working
 * untouched.
 *
 * ══ WHAT IS BAKED INTO THE CANVAS, AND WHY THE BACKGROUND IS PART OF IT ═══════════════════════════
 *
 * The plate's pale face is painted into the texture rather than left to a transparent PNG over a slab.
 * Transparency would put every word into three's transparent queue, sorted per object, with the depth
 * buffer half-disabled — for ten plates on one panel that is a sorting problem waiting for a camera angle
 * to expose it. An OPAQUE plane whose own background is the same colour as the slab behind it has no
 * queue, no sorting and no alpha edges, and the seam is invisible because the two colours are the same
 * number.
 *
 * ══ CONTRAST, AND THE ONE PLACE THIS FILE BREAKS THE WORLD'S PALETTE RULE ═════════════════════════
 *
 * `world/palette.ts` has one rule above all: there is no black here, the darkest value is `bark`. That
 * survives — the ink IS `bark`. What does not survive is the note in `DayLog`/`SortingGate` that a card
 * face must be warm mid `stone` rather than paper: `bark` on `stone` is about 4.7:1, which is fine for a
 * silhouette and thin for a word a six-year-old is reading at three metres. `bark` on `paper` is about
 * 9.7:1. So a WORD plate is paper-pale and a PICTURE tile stays stone — which is not a compromise, it is
 * the same reasoning applied to two different jobs. The picture tile has to stay stone because half the
 * drawings in `EventGlyph.tsx` have white or cream parts (an egg, a cloud, a hen, a plate) that vanish
 * against paper, which is what that note was actually about.
 *
 * ══ THE SIZE OF THE LETTERS IS A MEASUREMENT ══════════════════════════════════════════════════════
 *
 * The bar is a five-to-seven-year-old reading at the distance they stand, which is `dock` 4.6m from a
 * panel scaled by `fitScale`. At 1280x800 and fov 62 that is about 145 screen pixels per world unit
 * before the panel's own scale, so a plate 0.72 units tall at `fitScale` 0.45 is 47 pixels of screen and
 * carries a letter about 28 pixels tall. That is why both presentations were re-laid-out around this file
 * rather than having words dropped into their existing card grids: eight 1.02-unit cards across a panel
 * is 8 pixels per character, and no font rescues that. The arithmetic is written out in each component's
 * header.
 *
 * `fitPx` below is the other half of it. One plate size everywhere is a hard constraint — a candidate
 * that renders larger than its neighbours is a false signal on a comparison task — so a long word may
 * not grow its plate and must instead shrink its own letters to fit. Words are lowercase as the bank
 * authored them, because lowercase is what an emerging reader learns first and word SHAPE is most of how
 * they read; capitalising would alter the item's own words for no gain.
 */

/** The darkest ink in the world, as `world/palette.ts` requires. Never `#000`. */
export const INK = HUE.bark;

/** A word plate's face. Paper-pale for contrast — see the header on why this and not `stone`. */
export const PLATE_FACE = HUE.paper;

/** A picture tile's face. Warm mid stone, because cream-coloured drawings vanish on paper. */
export const TILE_FACE = HUE.stone;

/**
 * Canvas pixels per world unit.
 *
 * Generous rather than exact: 200 puts a 3.4-unit plate at 680 canvas pixels against roughly 250 screen
 * pixels in play, so the texture is being minified and mipmaps do the work. The failure mode of the other
 * direction is a fuzzy word, which is the one thing this file exists to prevent.
 */
const PX_PER_UNIT = 200;

/**
 * The system stack, with no web font anywhere in it — see the header on `drei`'s `<Text>`.
 *
 * A geometric sans in bold, which is what an early-reader typeface is: even stroke weight, open
 * counters, no serifs to resolve. `Avenir Next` and `Helvetica Neue` are on the macOS image this is
 * developed and shot on; `Segoe UI` and `Roboto` cover Windows and the Linux school images; `sans-serif`
 * catches whatever is left. Every one of them is legible at 24 pixels, which is the actual requirement.
 */
const STACK = '"Avenir Next", "Helvetica Neue", "Segoe UI", Roboto, Arial, sans-serif';

/** Textures live as long as the tab: one per word per plate size, and there are a few dozen. */
const cache = new Map<string, THREE.CanvasTexture | null>();

/**
 * The largest font size at which `word` fits `innerPx`, starting from what the plate's height allows.
 *
 * Height first, because a word that is tall enough to read and too wide to fit is the common case and
 * shrinking it is the only honest fix available — the plate may not grow (one plate size everywhere) and
 * the word may not be abbreviated or wrapped. A single word broken across two lines is a different word
 * to someone learning to read.
 */
function fitPx(ctx: CanvasRenderingContext2D, word: string, hPx: number, innerPx: number): number {
  /* 0.58 of the plate's height leaves room above and below for ascenders and descenders plus a margin
     that keeps the word off the moulding. Measured on `heartbroken` and `dog`, the extremes of the two
     banks. */
  const fromHeight = hPx * 0.58;
  ctx.font = `700 ${fromHeight}px ${STACK}`;
  const wide = ctx.measureText(word).width;
  if (wide <= innerPx) return fromHeight;
  // Proportional rather than a search: canvas advance width is linear in size for a given string.
  return Math.max(8, (fromHeight * innerPx) / wide);
}

/**
 * One word, on its plate's pale face, as a texture. `null` when there is no `document` at all.
 *
 * The null is not a hypothetical: `prove-drawn-types.ts` imports both components under `tsx` in node to
 * drive the real `handedFor` against the live API, so every module in this directory has to be importable
 * without a DOM. Callers fall back to a plain paper face, which is a blank plate — visibly wrong in a
 * screenshot and harmless in a proof.
 */
export function wordTexture(word: string, w: number, h: number): THREE.CanvasTexture | null {
  const key = `${word}|${w.toFixed(3)}|${h.toFixed(3)}`;
  const hit = cache.get(key);
  if (hit !== undefined) return hit;
  const made = drawWord(word, w, h);
  cache.set(key, made);
  return made;
}

function drawWord(word: string, w: number, h: number): THREE.CanvasTexture | null {
  if (typeof document === 'undefined') return null;
  const wPx = Math.max(16, Math.round(w * PX_PER_UNIT));
  const hPx = Math.max(16, Math.round(h * PX_PER_UNIT));
  let canvas: HTMLCanvasElement;
  try {
    canvas = document.createElement('canvas');
  } catch {
    return null;
  }
  canvas.width = wPx;
  canvas.height = hPx;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  ctx.fillStyle = PLATE_FACE;
  ctx.fillRect(0, 0, wPx, hPx);

  /* A hair of tracking, because letters that touch are the single biggest obstacle for a reader who is
     still decoding one letter at a time. Guarded: `letterSpacing` is a recent 2D-context property and
     assigning to it on an older engine is a silent no-op rather than a throw, but the guard says out loud
     that this is a nicety and not a requirement. */
  if ('letterSpacing' in ctx) (ctx as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing = '0.01em';

  const size = fitPx(ctx, word, hPx, wPx * 0.88);
  ctx.font = `700 ${size}px ${STACK}`;
  ctx.fillStyle = INK;
  ctx.textAlign = 'center';
  /* `middle` centres the em box, which sits optically high for lowercase words; 0.54 drops it onto the
     x-height's own centre so `dog` and `animal` look equally seated. */
  ctx.textBaseline = 'middle';
  ctx.fillText(word, wPx / 2, hPx * 0.54);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

/**
 * The lit face of a word plate: an opaque plane carrying the baked word.
 *
 * `meshStandardMaterial` rather than `basic`, so a word is lit by the hollow's own two lights and reads
 * as painted on stone rather than as a sticker from a different program. `color` is white under a map so
 * the texture's own values come through unmultiplied, and the plate colour when there is no map.
 */
function WordFace({ word, w, h }: { word: string; w: number; h: number }) {
  const tex = useMemo(() => wordTexture(word, w, h), [word, w, h]);
  return (
    <mesh>
      <planeGeometry args={[w, h]} />
      <meshStandardMaterial
        map={tex ?? undefined}
        color={tex ? '#ffffff' : PLATE_FACE}
        roughness={0.9}
        metalness={0}
      />
    </mesh>
  );
}

/**
 * ONE PLACE A WORD LIVES, and both verbal presentations draw exactly this.
 *
 * Shared rather than copied because the two types are compared by the same child in one sitting: a word
 * has to be the same size, the same ink and the same distance from its picture at the sorting gate as at
 * the kinship stone, or the second station teaches the first one's lesson again.
 *
 * `mark` is the picture, and it is OPTIONAL BY ITEM AND NEVER BY WORD. Both gates decide per item whether
 * every word has a good distinct drawing, and hand `mark` for all of them or for none — see the headers
 * of `kinshipGate.ts` and `sortbotGate.ts` for why per-word pictures would systematically mark the
 * correct option: picture coverage tracks concreteness, and in an `is a kind of` analogy or a `noble
 * gases` category it is precisely the answer's own words that have no picture.
 *
 * When there is a picture the plate is split — a square stone tile on the left, the word on the right —
 * and the SPLIT IS THE SAME on every plate of that item, so no plate is a different shape from its
 * neighbours. When there is not, the word has the whole face.
 */
export function WordCard({
  word,
  w,
  h,
  mark = null,
}: {
  word: string;
  /** The plate, outer. One size per item, everywhere in that item. */
  w: number;
  h: number;
  mark?: EventMark | null;
}) {
  const rim = useSlab(w + 0.12, h + 0.12, 0.11, 0.06);
  const face = useSlab(w, h, 0.16, 0.05);
  const pad = 0.07;
  const tile = mark ? h - pad * 2 : 0;
  const fieldW = w - pad * 2 - (mark ? tile + pad : 0);
  const fieldX = w / 2 - pad - fieldW / 2;
  const tileX = -w / 2 + pad + tile / 2;
  const tileSlab = useSlab(Math.max(0.1, tile), Math.max(0.1, tile), 0.1, 0.05);

  return (
    <group>
      <mesh geometry={rim} position={[0, 0, -0.05]}>
        <meshStandardMaterial color={shade(HUE.stoneDeep, 0.1)} roughness={0.9} metalness={0} />
      </mesh>
      <mesh geometry={face}>
        <meshStandardMaterial color={PLATE_FACE} roughness={0.9} metalness={0} />
      </mesh>
      {/*
        * The word, clear of the slab's own front face.
        *
        * 0.13 AND NOT 0.086, WHICH COST A SCREENSHOT. `useSlab` is an `ExtrudeGeometry` of depth `d` with a
        * 0.012 bevel on each side, then centred, so a 0.16-deep slab's front is at 0.092 and not at 0.080 —
        * the arithmetic the older files in this directory quote is the depth without its bevel. A word laid
        * at 0.086 is INSIDE the stone, and what came back was ten blank plates: exactly the failure this
        * whole change exists to end, and indistinguishable in a shot from a texture that never drew.
        * Anything placed in front of a slab here wants the bevel counted.
        */}
      <group position={[fieldX, 0, 0.13]}>
        <WordFace word={word} w={fieldW} h={h - pad * 2} />
      </group>
      {mark ? (
        <group position={[tileX, 0, 0.12]}>
          <mesh geometry={tileSlab}>
            <meshStandardMaterial color={TILE_FACE} roughness={0.9} metalness={0} />
          </mesh>
          <group position={[0, 0.01, 0.08]} scale={tile * 0.84}>
            <EventGlyph glyph={mark.glyph} state={mark.state} bg={TILE_FACE} />
          </group>
        </group>
      ) : null}
    </group>
  );
}

/**
 * THE MISSING PLACE, at word-plate proportions.
 *
 * The hollow's one convention, unchanged: a recessed dark bed ringed in breathing honey light, the only
 * thing in the world that moves on its own. Shared with `WordCard` for the same reason — the empty place
 * has to be exactly the shape of the thing that goes in it, or it stops reading as a place for one.
 *
 * `EmptySlot` draws the ring and the bed and BREATHES NOTHING BY ITSELF. It hands its ring's material out
 * through `onMaterial` and the caller drives the glow from inside its own `useFrame`, for two reasons.
 *
 * ONE CLOCK. The kinship stone has two of these in one place, and two sockets pulsing out of phase read as
 * two separate places rather than as one place for two things.
 *
 * AND NO REACT IN THE FRAME LOOP. Passing the glow as a PROP was the first version and it re-rendered a
 * subtree several times a second for a value nobody can see change — against `theme.ts`'s own rule that
 * "callers read it inside `useFrame` so nothing re-renders React at 60fps". Mutating one material field is
 * what the rest of this directory does and it is free.
 */
export function EmptySlot({
  w,
  h,
  onMaterial,
}: {
  w: number;
  h: number;
  /** The ring's material, for the caller to drive. Called with `null` on unmount. */
  onMaterial?: (mat: THREE.MeshStandardMaterial | null) => void;
}) {
  /* A RIM, NOT A FIELD — the correction a screenshot forced on the old square sockets and the reason the
     numbers are 0.07 of honey rather than 0.12: two rings on one row must not touch, or the honey stops
     being a line and becomes a yellow sign with holes in it. */
  const ring = useSlab(w + 0.14, h + 0.14, 0.14, 0.06);
  const bed = useSlab(w - 0.02, h - 0.02, 0.16, 0.05);
  return (
    <group>
      <mesh geometry={ring} position={[0, 0, -0.12]}>
        <meshStandardMaterial
          ref={(m) => onMaterial?.(m)}
          color={HUE.honey}
          emissive={HUE.honey}
          emissiveIntensity={0.85}
          roughness={0.5}
          metalness={0}
        />
      </mesh>
      <mesh geometry={bed} position={[0, 0, -0.04]}>
        <meshStandardMaterial {...MAT.cut} />
      </mesh>
    </group>
  );
}
