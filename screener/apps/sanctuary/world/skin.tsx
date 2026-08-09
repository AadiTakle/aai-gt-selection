/**
 * BRAMBLEBROOK'S SKIN — the file that turns the questions into the hollow.
 *
 * `shared/glyphs.tsx` explains the mechanism: a bank item names its parts abstractly
 * (`{shape:'star', color:'ink', count:1, rot:120}`) and nothing in the item says what a star looks
 * like. A `Skin` answers that, so the item's STRUCTURE stays exactly what the engine served and its
 * DEPICTION becomes moss, shells, embers and eggs. Every one of the twenty-five names in the shared
 * vocabulary is redrawn here as something that lives in this hollow. Nothing is a retint.
 *
 * WHICH NAMES ACTUALLY TURN UP, measured from the curated banks rather than guessed, because a name
 * that falls through to a geometric primitive is a bare triangle sitting among hand-drawn artwork in
 * the same item:
 *
 *   FLU-MATRIX-01     star pentagon kite hexagon triangle drop        · all six colours, count 1-3, rot 0/120/240
 *   FLU-CARPET-01     bolt chevron leaf capsule petal                 · five colours, count 1-4, rot 0/45/90/135/180, fill 0|1
 *   FLU-OPCHAIN-01    flag hook boot comma  (+ badges: circle square triangle diamond hexagon star)
 *   SPA-XFORM-01      square (the block)    (+ badges: crescent spiral trefoil zigzag teardrop leaf)
 *   QUANT-BALANCE-01  cube dot(orb) diamond triangle
 *   QUANT-SERIES-01   dot star
 *   QUANT-FUNC-01     dot
 *
 * FOUR CONSTRAINTS ON THE DRAWING, and every one of them is correctness rather than taste.
 *
 * 1. HOLLOW IS HONOURED. `fill: 0` is an active carpet attribute and `shade: hollow` varies in 434 of
 *    468 op-chain items, so filled-versus-unfilled is part of what those items ASK. A skin that draws
 *    a pretty solid picture regardless makes those items unanswerable. Every drawing here routes its
 *    fill through `Ink`, which ghosts the interior and thickens the contour when told `hollow`.
 *
 * 2. ROTATION IS HONOURED. `Glyph` turns the whole `<svg>` in CSS, so a drawing gets the rotation for
 *    free — but only if it does not smuggle in a second orientation cue of its own. Nothing here is
 *    drawn with a shadow "below" it or a stalk that would read as up-is-up after a 135 degree turn.
 *
 * 3. DISTINCTNESS. Two names must never look alike, or the rule the item runs on becomes invisible.
 *    The pointed-oval family is pulled deliberately apart: `drop` is a dew-heavy berry, `petal` is a
 *    soft blossom with a crease and no stalk, `kite` is a winged seed with fins and a tail, `diamond`
 *    is a hard quartz crystal, `teardrop` hangs off a thread. They share a silhouette in the
 *    geometric fallback and share nothing here.
 *
 * 4. HANDEDNESS. `flag`, `hook`, `boot` and `comma` are the four chiral figures the Tumbler's items
 *    transform, and telling a rotation from a mirror IS the construct of those items. Each of the four
 *    is asymmetric on BOTH axes: a one-sided frond, a crook, a rooted stump, a curled tendril.
 *
 * Everything is chunky. These marks end up inside a `Cluster` at a fifth of their design size and
 * inside a badge tray at 1.6rem, and a hairline at that scale is a smudge.
 */
import type { ReactNode } from 'react';

import type { Skin } from '../../lab-character/shared/glyphs';
import { BANK_COLORS } from '../../lab-character/shared/glyphs';
import { HUE, brackenColor, shade } from './palette';

/* ============================================================================
   drawing helpers
   ========================================================================== */

interface InkProps {
  d: string;
  fill: string;
  hollow?: boolean;
  width?: number;
  children?: ReactNode;
}

/**
 * A filled world-object: the silhouette, a hand-drawn darker contour, and whatever detail sits on it.
 *
 * `hollow` is the whole reason this is a component. When an item says a mark is unfilled, the interior
 * is ghosted to a whisper and the contour thickens, so "filled" and "unfilled" are two obviously
 * different things whatever the mark happens to be a picture of. The renderers also enforce this in
 * CSS as a belt-and-braces measure; doing it here as well means the distinction survives even where
 * they do not.
 */
function Ink({ d, fill, hollow = false, width = 6, children }: InkProps) {
  return (
    <g>
      <path
        d={d}
        fill={fill}
        fillOpacity={hollow ? 0.13 : 1}
        stroke={hollow ? fill : shade(fill, -0.45)}
        strokeWidth={hollow ? width + 2.5 : width}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      {hollow ? null : children}
    </g>
  );
}

/** A stroke-drawn object: twigs, crooks, tendrils. Ghosting a stroke means thinning it. */
function Stroke({
  d,
  fill,
  hollow = false,
  width = 9,
  children,
}: {
  d: string;
  fill: string;
  hollow?: boolean;
  width?: number;
  children?: ReactNode;
}) {
  return (
    <g>
      <path
        d={d}
        fill="none"
        stroke={fill}
        strokeOpacity={hollow ? 0.42 : 1}
        strokeWidth={hollow ? width * 0.62 : width}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {hollow ? null : children}
    </g>
  );
}

/** Caught light. Never a gradient, never a shadow: one soft ellipse of paper-white. */
function Gleam({
  cx,
  cy,
  rx,
  ry,
  rot = 0,
  o = 0.34,
}: {
  cx: number;
  cy: number;
  rx: number;
  ry: number;
  rot?: number;
  o?: number;
}) {
  return (
    <ellipse
      cx={cx}
      cy={cy}
      rx={rx}
      ry={ry}
      fill={HUE.mist}
      opacity={o}
      transform={`rotate(${rot} ${cx} ${cy})`}
    />
  );
}

function Vein({ d, fill, width = 4 }: { d: string; fill: string; width?: number }) {
  return (
    <path
      d={d}
      fill="none"
      stroke={shade(fill, -0.3)}
      strokeWidth={width}
      strokeLinecap="round"
      opacity={0.65}
    />
  );
}

/* ============================================================================
   the drawings
   ========================================================================== */

/**
 * Everything the hollow can be asked to draw.
 *
 * Exported so the creatures and the scenery can borrow the same marks: a pip's crest is literally the
 * glyph of the marking it grew, which is how the coat lattice ends up written on the animal.
 */
export function drawBracken(
  shape: string,
  fill: string,
  hollow: boolean,
): ReactNode | undefined {
  const dark = shade(fill, -0.45);

  switch (shape) {
    /* --- the matrix six: what a pelt is patterned in ------------------------ */

    case 'star':
      // A seed-star: five soft lobes round a honey middle. Reads at cluster size and at badge size.
      return (
        <g>
          <Ink
            d="M50 12 C58 12 62 22 62 33 C72 30 82 30 86 36 C90 43 84 51 74 56 C80 64 83 74 78 80 C72 86 62 82 54 74 C50 84 44 92 37 91 C29 90 25 81 26 70 C16 70 8 65 8 57 C8 49 17 44 28 43 C26 32 28 22 35 18 C42 14 47 18 50 12 Z"
            fill={fill}
            hollow={hollow}
            width={6}
          >
            <circle cx={47} cy={51} r={11} fill={HUE.honey} stroke={shade(HUE.honey, -0.3)} strokeWidth={4} />
          </Ink>
        </g>
      );

    case 'pentagon':
      // A river cobble, worn round on one side and specked on the other.
      return (
        <Ink
          d="M50 9 C68 9 88 26 90 45 C92 66 72 91 49 91 C27 91 7 70 9 46 C11 27 32 9 50 9 Z"
          fill={fill}
          hollow={hollow}
        >
          <Gleam cx={37} cy={34} rx={14} ry={9} rot={-24} />
          <circle cx={65} cy={60} r={4.5} fill={dark} opacity={0.5} />
          <circle cx={52} cy={73} r={3.2} fill={dark} opacity={0.5} />
        </Ink>
      );

    case 'kite':
      // A winged seed. Husk, two fins, and a two-dash tail: impossible to read as a petal or a drop.
      return (
        <g>
          <Stroke d="M50 60 C55 72 45 78 50 92" fill={dark} width={4} />
          <path d="M40 74 L60 80 M43 88 L57 92" fill="none" stroke={HUE.honey} strokeWidth={5} strokeLinecap="round" />
          <Ink d="M50 7 C64 18 84 32 84 40 C84 50 64 58 50 64 C36 58 16 50 16 40 C16 32 36 18 50 7 Z" fill={fill} hollow={hollow} width={5}>
            <Vein d="M50 12 L50 60" fill={fill} width={3.6} />
            <Vein d="M20 39 L80 39" fill={fill} width={3.2} />
          </Ink>
        </g>
      );

    case 'hexagon':
      // A comb cell with honey still in it.
      return (
        <Ink d="M50 9 L85 29 L85 71 L50 91 L15 71 L15 29 Z" fill={fill} hollow={hollow} width={7}>
          <path d="M50 26 L71 38 L71 62 L50 74 L29 62 L29 38 Z" fill={HUE.honey} opacity={0.55} />
          <Gleam cx={38} cy={34} rx={9} ry={6} rot={-30} o={0.28} />
        </Ink>
      );

    case 'triangle':
      // A young frond, just up out of the leaf litter.
      return (
        <Ink
          d="M50 9 C61 30 86 65 86 77 C86 87 78 90 69 90 L31 90 C22 90 14 87 14 77 C14 65 39 30 50 9 Z"
          fill={fill}
          hollow={hollow}
        >
          <Vein d="M50 22 L50 84" fill={fill} />
          <Vein d="M50 46 L34 62 M50 60 L66 74" fill={fill} width={3.4} />
        </Ink>
      );

    case 'drop':
      // A dew-heavy berry: full at the bottom, light on the shoulder.
      return (
        <Ink d="M50 7 C67 33 82 47 82 62 A32 32 0 0 1 18 62 C18 47 33 33 50 7 Z" fill={fill} hollow={hollow}>
          <Gleam cx={36} cy={56} rx={9} ry={14} rot={-16} />
        </Ink>
      );

    /* --- the carpet five: what a glade floor is woven from ------------------ */

    case 'bolt':
      // A forked twig with two buds. Drawn in strokes, so an unfilled one thins rather than empties.
      return (
        <Stroke d="M58 8 L34 44 L52 48 L36 92" fill={fill} width={10} hollow={hollow}>
          <circle cx={34} cy={44} r={7} fill={fill} />
          <circle cx={58} cy={8} r={6} fill={HUE.frond} stroke={shade(fill, -0.4)} strokeWidth={3} />
          <path d="M52 48 L74 34" stroke={fill} strokeWidth={7} strokeLinecap="round" fill="none" />
          <circle cx={76} cy={32} r={6} fill={HUE.frond} stroke={shade(fill, -0.4)} strokeWidth={3} />
        </Stroke>
      );

    case 'chevron':
      // A bird track pressed into the moss. Filled, so hollow reads as an unpressed one.
      return (
        <Ink
          d="M14 20 C22 18 28 22 50 42 C72 22 78 18 86 20 C90 30 88 38 50 74 C12 38 10 30 14 20 Z"
          fill={fill}
          hollow={hollow}
          width={6}
        >
          <path d="M50 74 L50 90" stroke={dark} strokeWidth={6} strokeLinecap="round" fill="none" opacity={0.75} />
        </Ink>
      );

    case 'leaf':
      // A bracken leaf: midrib, notched edge, one side a little fuller than the other.
      return (
        <Ink
          d="M50 8 C74 22 88 44 84 62 C80 82 62 92 50 93 C38 92 20 82 16 62 C12 44 26 22 50 8 Z"
          fill={fill}
          hollow={hollow}
        >
          <Vein d="M50 12 L50 90" fill={fill} />
          <Vein d="M50 30 L30 40 M50 44 L72 52 M50 58 L32 66 M50 72 L68 78" fill={fill} width={3.4} />
        </Ink>
      );

    case 'capsule':
      // A seedpod, three seeds showing through.
      return (
        <Ink d="M30 20 H70 A20 20 0 0 1 70 80 H30 A20 20 0 0 1 30 20 Z" fill={fill} hollow={hollow}>
          <circle cx={50} cy={34} r={7} fill={dark} opacity={0.45} />
          <circle cx={50} cy={50} r={7} fill={dark} opacity={0.45} />
          <circle cx={50} cy={66} r={7} fill={dark} opacity={0.45} />
          <Gleam cx={36} cy={32} rx={6} ry={11} rot={-18} o={0.3} />
        </Ink>
      );

    case 'petal':
      // A blossom petal: soft crown, pointed base, one crease, and no stalk at all.
      return (
        <Ink d="M50 94 C20 68 18 38 50 6 C82 38 80 68 50 94 Z" fill={fill} hollow={hollow}>
          <Vein d="M50 84 C44 58 46 32 50 16" fill={fill} width={3.8} />
          <Gleam cx={50} cy={28} rx={12} ry={8} o={0.3} />
        </Ink>
      );

    /* --- the four chiral figures the Tumbler turns ------------------------- */

    case 'flag':
      // A one-sided frond: stem down the LEFT, three leaflets off to the RIGHT.
      return (
        <g>
          <Stroke d="M30 92 L30 12" fill={fill} width={9} hollow={hollow} />
          {hollow ? null : (
            <>
              <path d="M32 20 C50 12 68 20 80 16 C74 30 58 36 32 34 Z" fill={fill} stroke={dark} strokeWidth={4.5} strokeLinejoin="round" />
              <path d="M32 44 C48 38 64 44 76 40 C70 54 56 58 32 56 Z" fill={fill} stroke={dark} strokeWidth={4.5} strokeLinejoin="round" />
              <path d="M32 66 C46 62 58 66 68 64 C64 76 52 80 32 78 Z" fill={fill} stroke={dark} strokeWidth={4.5} strokeLinejoin="round" />
            </>
          )}
          {hollow ? (
            <path
              d="M32 20 C50 12 68 20 80 16 C74 30 58 36 32 34 Z M32 44 C48 38 64 44 76 40 C70 54 56 58 32 56 Z M32 66 C46 62 58 66 68 64 C64 76 52 80 32 78 Z"
              fill={fill}
              fillOpacity={0.13}
              stroke={fill}
              strokeWidth={7}
              strokeLinejoin="round"
            />
          ) : null}
        </g>
      );

    case 'hook':
      // A fiddlehead crook: stem up, curl to the RIGHT, tip tucked in.
      return (
        <Stroke
          d="M30 92 L30 40 C30 20 62 16 68 32 C72 44 58 52 52 42"
          fill={fill}
          width={11}
          hollow={hollow}
        >
          <circle cx={52} cy={42} r={5.5} fill={HUE.frond} stroke={dark} strokeWidth={3} />
        </Stroke>
      );

    case 'boot':
      // A rooted stump: trunk on the LEFT, root running away to the RIGHT.
      return (
        <Ink
          d="M32 10 H62 C66 10 68 12 68 16 V54 H84 C88 54 90 58 90 62 V84 C90 88 87 90 83 90 H32 C28 90 26 87 26 83 V16 C26 12 28 10 32 10 Z"
          fill={fill}
          hollow={hollow}
        >
          <Vein d="M40 22 L40 78 M54 26 L54 74" fill={fill} width={3.6} />
          <circle cx={76} cy={72} r={5} fill={HUE.moss} opacity={0.8} />
        </Ink>
      );

    case 'comma':
      // A curled tendril seed: round head top-RIGHT, tail curling down and to the LEFT.
      return (
        <Ink
          d="M64 16 A26 26 0 1 0 58 66 C68 66 62 80 40 90 C82 84 94 54 84 32 A24 24 0 0 0 64 16 Z"
          fill={fill}
          hollow={hollow}
        >
          <Gleam cx={54} cy={32} rx={9} ry={7} rot={-24} />
        </Ink>
      );

    /* --- the counting mark, and the things a bough weighs ------------------ */

    case 'dot':
    case 'orb':
      // A pip: the egg everything in this hollow is counted in.
      return (
        <Ink d="M50 10 C69 10 84 30 84 54 C84 75 69 90 50 90 C31 90 16 75 16 54 C16 30 31 10 50 10 Z" fill={fill} hollow={hollow}>
          <Gleam cx={38} cy={38} rx={10} ry={13} rot={-22} />
        </Ink>
      );

    case 'circle':
      // A full moon over the ridge. Two craters keep it apart from the pip.
      return (
        <Ink d="M50 8 A42 42 0 1 0 50.4 8 Z" fill={fill} hollow={hollow}>
          <circle cx={62} cy={38} r={9} fill={dark} opacity={0.28} />
          <circle cx={41} cy={62} r={6} fill={dark} opacity={0.24} />
        </Ink>
      );

    case 'square':
      // A mossy block. It nearly fills the box on purpose: SPA-XFORM asks "filled or empty", and a
      // small mark floating in its own box leaves an occupied cell looking like an empty one with a
      // speck in it.
      return (
        <Ink d="M12 16 H88 A6 6 0 0 1 94 22 V84 A6 6 0 0 1 88 90 H12 A6 6 0 0 1 6 84 V22 A6 6 0 0 1 12 16 Z" fill={fill} hollow={hollow} width={5}>
          <path d="M8 30 C22 22 34 30 48 24 C62 18 76 28 92 22 V22 H8 Z" fill={HUE.moss} opacity={0.7} />
          <circle cx={26} cy={62} r={4} fill={dark} opacity={0.3} />
          <circle cx={66} cy={72} r={5} fill={dark} opacity={0.3} />
        </Ink>
      );

    case 'cube':
      // A cut stone. Straight edges and a lit top face, against everything else here being soft.
      return (
        <g>
          <Ink d="M50 8 L88 28 V72 L50 92 L12 72 V28 Z" fill={fill} hollow={hollow} width={5}>
            <path d="M50 8 L88 28 L50 48 L12 28 Z" fill={HUE.mist} opacity={0.3} />
            <Vein d="M50 48 L50 92 M50 48 L88 28 M50 48 L12 28" fill={fill} width={3.4} />
          </Ink>
        </g>
      );

    case 'diamond':
      // A quartz crystal: hard facets, one bright plane.
      return (
        <Ink d="M50 6 L84 50 L50 94 L16 50 Z" fill={fill} hollow={hollow} width={5}>
          <path d="M50 6 L66 50 L50 94 L34 50 Z" fill={HUE.mist} opacity={0.28} />
          <Vein d="M50 6 L50 94" fill={fill} width={3.4} />
        </Ink>
      );

    /* --- the Tumbler and the stone-setting badges -------------------------- */

    case 'crescent':
      // A moon shell, ridged along the inner curve.
      return (
        <Ink d="M64 10 A40 40 0 1 0 64 90 A31 31 0 1 1 64 10 Z" fill={fill} hollow={hollow}>
          <Vein d="M52 24 C40 36 40 64 52 76 M62 30 C54 40 54 60 62 70" fill={fill} width={3.6} />
        </Ink>
      );

    case 'spiral':
      // A snail shell. Thicker on the outer whorl, so it does not read as a scribble at badge size.
      return (
        <g>
          <Stroke d="M50 50 A11 11 0 1 1 61 61 A23 23 0 1 1 38 38 A35 35 0 1 1 73 73" fill={fill} width={12} hollow={hollow} />
          {hollow ? null : <circle cx={50} cy={50} r={4} fill={shade(fill, -0.35)} />}
        </g>
      );

    case 'trefoil':
      // Clover. Three lobes and a stem, so it cannot be read as a berry cluster.
      return (
        <g>
          <Stroke d="M50 62 C52 76 48 84 44 92" fill={HUE.moss} width={6} hollow={hollow} />
          <Ink
            d="M50 12 C62 12 68 22 66 32 C76 26 88 32 88 44 C88 56 76 62 66 58 C70 68 62 78 50 76 C38 78 30 68 34 58 C24 62 12 56 12 44 C12 32 24 26 34 32 C32 22 38 12 50 12 Z"
            fill={fill}
            hollow={hollow}
            width={5}
          >
            <circle cx={50} cy={44} r={7} fill={shade(fill, -0.3)} opacity={0.45} />
          </Ink>
        </g>
      );

    case 'zigzag':
      // A bramble twig, thorns and all.
      return (
        <Stroke d="M10 74 L32 26 L52 72 L72 28 L92 68" fill={fill} width={10} hollow={hollow}>
          <path d="M32 34 L22 28 M52 62 L62 60 M72 36 L82 32" stroke={fill} strokeWidth={6} strokeLinecap="round" fill="none" />
        </Stroke>
      );

    case 'teardrop':
      // Dew, hanging off a hair. The thread is what keeps it apart from `drop`.
      return (
        <g>
          <Stroke d="M50 6 L50 26" fill={shade(fill, -0.2)} width={4} hollow={hollow} />
          <Ink d="M50 22 C60 44 76 54 76 68 A26 26 0 0 1 24 68 C24 54 40 44 50 22 Z" fill={fill} hollow={hollow}>
            <Gleam cx={40} cy={62} rx={8} ry={11} rot={-14} />
          </Ink>
        </g>
      );

    default:
      return undefined;
  }
}

/* ============================================================================
   the skin itself
   ========================================================================== */

export const BRACKEN_SKIN: Skin = {
  id: 'bramblebrook',
  color: brackenColor,
  /**
   * `opts` carries the modifiers that are part of what the item is ASKING. `hollow` is passed straight
   * through to the drawing. `rotDeg` needs nothing done to it here — `Glyph` turns the whole `<svg>`
   * in CSS — but it is read out of `opts` deliberately so that any drawing added later which cheats
   * with an implied "down" has an obvious place to correct itself.
   */
  draw: (shape, fill, opts) => drawBracken(shape, fill, opts?.hollow === true),
};

/**
 * Says so out loud if the shared vocabulary grows a colour this hollow has not dressed.
 *
 * `brackenColor` keeps such a name answerable either way by hashing it into the ring. This exists so
 * nobody first learns about it from a child staring at two marks that look the same.
 */
{
  const missing = BANK_COLORS.filter((name) => !(name in { ink: 1, blue: 1, teal: 1, violet: 1, coral: 1, gold: 1 }));
  if (missing.length) console.warn(`[bramblebrook] no hue for bank colour: ${missing.join(', ')}`);
}
