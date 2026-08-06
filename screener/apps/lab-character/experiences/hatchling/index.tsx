import { useCallback, useEffect, useRef, useState } from 'react';
import type { CSSProperties, ReactNode } from 'react';

import type { ExperienceProps } from '../../shared/experience';
import type { Skin } from '../../shared/glyphs';
import { BANK_COLORS } from '../../shared/glyphs';
import { ItemStage } from '../../shared/ItemStage';
import { useScreenerSession } from '../../shared/useScreenerSession';
import './styles.css';

/**
 * HATCHLING — the K-1 world.
 *
 * An egg in a nest at first light. The child taps it, something small comes out, and from then on
 * every question is that creature trying to decide something and looking to the child first. It
 * reacts warmly to every tap without exception, it grows a little at the end, and it is happy.
 *
 * THE THREE RULES THIS FILE IS BUILT AROUND, all of them from the age band rather than from taste.
 *
 * 1. NOTHING IS READ. A five-year-old cannot be instructed in prose, so every instruction here is
 *    carried by behaviour: the egg rocks and breathes rings until it is tapped; the creature looks
 *    up at the child and then turns its gaze down onto the question, which is the whole of "your
 *    turn"; a tap is answered by the creature within a frame. `speechSynthesis` says a few short
 *    warm things on top of that, and the world is complete without it — the voice is never the
 *    carrier of anything. The only prose on screen is sized and coloured for the adult holding the
 *    tablet and says nothing the child needs.
 *
 * 2. NOTHING IS SCORED, SHOWN OR IMPLIED. A Taster session is four items wide and comes back with
 *    an ability interval over two logits across, which is a number with no business being anywhere
 *    near a child. So there is no counter, no meter, no verdict and no gate. The only thing that
 *    advances is the sprig in the nest, and it advances for turning up: one leaf per turn taken,
 *    whatever was tapped. Every child reaches the same ending.
 *
 * 3. ONE THING AT A TIME. The bay holds the creature and the stage holds the question, and only one
 *    of them is ever loud. Before hatching the bay is full size and the stage is empty. During a
 *    question the bay shrinks to a watching face and the question owns the screen. When a tap
 *    lands the reaction takes the focus back for a beat. Nothing overlaps, nothing competes.
 *
 * MOTION POLICY. Transform and opacity only, one easing curve, related things staggered rather than
 * animated together, and the bay changes size by transform rather than by grid row so a question
 * never reflows under a child's finger. Everything collapses under prefers-reduced-motion, and this
 * file overrides the global reduce block for its looping animations, because an infinite animation
 * squeezed to 1ms flickers instead of stopping.
 */

/* ============================================================================
   PALETTE + the skin, which is where the art direction reaches into the items
   ========================================================================== */

/** Mix a hex toward black (negative) or white (positive). Cheap, and enough for outlines. */
function shade(hex: string, amt: number): string {
  const raw = hex.replace('#', '');
  const full =
    raw.length === 3
      ? raw
          .split('')
          .map((c) => c + c)
          .join('')
      : raw;
  const n = Number.parseInt(full, 16);
  const parts = [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  return `#${parts
    .map((c) => Math.round(amt < 0 ? c * (1 + amt) : c + (255 - c) * amt))
    .map((c) => Math.max(0, Math.min(255, c)).toString(16).padStart(2, '0'))
    .join('')}`;
}

/**
 * The bank's colour names, retold in dawn.
 *
 * The engine only needs the names to stay distinguishable from each other — a matrix item whose
 * rule is "colour" is satisfied by any consistent mapping. So they are all pulled toward warm, and
 * the two that actually turn up in this band (violet and coral) got the most attention: plum
 * blossom and terracotta, which sit together on a peach ground without either one shouting.
 */
const DAWN: Record<string, string> = {
  // The six the banks use, and all six are mapped, because a colour rule the child cannot see is a
  // question they cannot answer. They are pulled toward warm but kept apart in LIGHTNESS as well as
  // hue, so the rule survives a colour-vision deficiency: ink, teal, blue, violet, coral, gold runs
  // dark to light in that order.
  ink: '#4a3529',
  teal: '#3d7068',
  blue: '#5b83a8',
  violet: '#9c74ad',
  coral: '#e07a5f',
  gold: '#e0a44e',
};

const DAWN_ORDER = Object.values(DAWN);

/**
 * A name nobody planned for still has to come back DIFFERENT from the next one.
 *
 * This matters more than it looks. A matrix item whose rule is "colour" is only answerable while
 * distinct names stay distinct, so the usual `?? oneDefault` would quietly turn a reasoning item
 * into a coin flip the moment the bank grew a colour. Hashing the name into the palette keeps every
 * name stable across renders and, near enough, distinct from its neighbours.
 */
function dawnColor(name: string): string {
  const known = DAWN[name];
  if (known) return known;
  let h = 0;
  for (let i = 0; i < name.length; i += 1) h = (h * 31 + name.charCodeAt(i)) % 100_003;
  return DAWN_ORDER[h % DAWN_ORDER.length] ?? '#9c74ad';
}

// Says so out loud if the shared vocabulary grows a colour this world has not dressed. The hash
// above keeps such a name answerable either way; this exists so that nobody first finds out about it
// from a child looking at two identical shapes.
{
  const missing = BANK_COLORS.filter((name) => !DAWN[name]);
  if (missing.length) console.warn(`[hatchling] no dawn colour for: ${missing.join(', ')}`);
}

const SUN = '#f4d58d';
const HONEY = '#e8b25c';

/** A filled world-object: the shape, a darker hand-drawn outline, one soft highlight. */
function Ink({
  d,
  fill,
  width = 6,
  children,
}: {
  d: string;
  fill: string;
  width?: number;
  children?: ReactNode;
}) {
  return (
    <g>
      <path
        d={d}
        fill={fill}
        stroke={shade(fill, -0.42)}
        strokeWidth={width}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      {children}
    </g>
  );
}

function Gleam({ cx, cy, rx, ry, rot = 0 }: { cx: number; cy: number; rx: number; ry: number; rot?: number }) {
  return (
    <ellipse
      cx={cx}
      cy={cy}
      rx={rx}
      ry={ry}
      fill="#fffdf7"
      opacity={0.34}
      transform={`rotate(${rot} ${cx} ${cy})`}
    />
  );
}

/**
 * THE SKIN. This is the part of the exercise that matters most, so it is not a retint.
 *
 * Every one of the twenty names in the shared vocabulary is redrawn as a thing that lives in this
 * world, and the five this band actually serves — drop, star, triangle, hexagon, pentagon — were
 * hand-fitted rather than rounded off. A star is a flower with a honey middle. A pentagon is a river
 * pebble. A hexagon is a comb cell with honey in it. A cube, which is what the balance items put on
 * a scale, is an egg, because in this world the thing you weigh is an egg.
 *
 * TWO RULES CONSTRAIN THE DRAWING, and both of them are correctness rather than taste.
 *
 * DISTINCTNESS. Two different names must never look the same, or the rule the item is built on
 * becomes invisible and the question stops being answerable. So the pointed-oval family is pulled
 * deliberately apart: `drop` is a seed, `petal` is a soft blossom petal with no stalk, `kite` is an
 * actual kite with a tail, and `diamond` is a hard-edged dew crystal. They share a silhouette in the
 * geometric fallback and share nothing here.
 *
 * HANDEDNESS. `flag`, `hook`, `boot` and `comma` are the four chiral figures the op-chain items
 * transform, and the whole construct of those items is telling a rotation from a mirror. A symmetric
 * stand-in would destroy them, so each of those four is asymmetric on BOTH axes: a frond with its
 * stem down one side, a crook, a snail, a fiddlehead.
 *
 * Everything is chunky on purpose. These end up inside a `Cluster` at a fifth of their design size,
 * and a hairline at that scale is a smudge.
 */
const HATCHLING_SKIN: Skin = {
  id: 'hatchling',

  color: dawnColor,

  draw: (shape, fill) => {
    switch (shape) {
      /* --- the five this band actually serves ----------------------------- */

      case 'drop':
        // A seed, with the light caught on its shoulder.
        return (
          <Ink d="M50 8 C 68 34 82 48 82 62 A 32 32 0 0 1 18 62 C 18 48 32 34 50 8 Z" fill={fill}>
            <Gleam cx={37} cy={56} rx={8} ry={13} rot={-16} />
          </Ink>
        );

      case 'star':
        // A flower. Five petals, honey middle.
        return (
          <g>
            {[0, 1, 2, 3, 4].map((i) => (
              <ellipse
                key={i}
                cx={50}
                cy={24}
                rx={15}
                ry={21}
                fill={fill}
                stroke={shade(fill, -0.42)}
                strokeWidth={5}
                transform={`rotate(${i * 72} 50 52)`}
              />
            ))}
            <circle cx={50} cy={52} r={13} fill={HONEY} stroke={shade(HONEY, -0.35)} strokeWidth={5} />
          </g>
        );

      case 'triangle':
        // A shoot, just up out of the soil.
        return (
          <Ink d="M50 10 C 62 32 86 66 86 78 C 86 87 79 90 70 90 L 30 90 C 21 90 14 87 14 78 C 14 66 38 32 50 10 Z" fill={fill}>
            <path
              d="M50 24 L 50 84"
              fill="none"
              stroke={shade(fill, -0.3)}
              strokeWidth={4}
              strokeLinecap="round"
              opacity={0.7}
            />
          </Ink>
        );

      case 'hexagon':
        // A comb cell, with honey still in it.
        return (
          <Ink d="M50 10 L 84 30 L 84 70 L 50 90 L 16 70 L 16 30 Z" fill={fill} width={8}>
            <path d="M50 26 L 71 38 L 71 62 L 50 74 L 29 62 L 29 38 Z" fill={HONEY} opacity={0.5} />
          </Ink>
        );

      case 'pentagon':
        // A river pebble, worn round on one side.
        return (
          <Ink d="M50 10 C 67 11 87 27 89 46 C 91 67 71 90 49 90 C 28 90 8 69 10 47 C 12 28 33 9 50 10 Z" fill={fill}>
            <Gleam cx={38} cy={36} rx={13} ry={8} rot={-24} />
            <circle cx={64} cy={62} r={4} fill={shade(fill, -0.24)} />
            <circle cx={52} cy={73} r={3} fill={shade(fill, -0.24)} />
          </Ink>
        );

      /* --- the rest of the measured sixteen ------------------------------- */

      case 'dot':
        // A berry, on a snipped stem.
        return (
          <g>
            <path
              d="M50 26 C 54 16 62 11 69 11"
              fill="none"
              stroke="#6f8f45"
              strokeWidth={6}
              strokeLinecap="round"
            />
            <Ink d="M50 24 C 71 24 87 39 87 57 C 87 76 70 90 50 90 C 30 90 13 76 13 57 C 13 39 29 24 50 24 Z" fill={fill}>
              <Gleam cx={37} cy={46} rx={10} ry={7} rot={-28} />
            </Ink>
          </g>
        );

      case 'petal':
        // A blossom petal. Soft top, pointed base, one crease, and no stalk — which is what keeps it
        // apart from `kite` and `drop`.
        return (
          <Ink d="M50 94 C 20 68 18 38 50 6 C 82 38 80 68 50 94 Z" fill={fill}>
            <path
              d="M50 84 C 44 60 46 34 50 18"
              fill="none"
              stroke={shade(fill, -0.24)}
              strokeWidth={4}
              strokeLinecap="round"
              opacity={0.6}
            />
            <ellipse cx={50} cy={26} rx={13} ry={9} fill="#fffdf7" opacity={0.3} />
          </Ink>
        );

      case 'kite':
        // A kite, tail and all. The most literal thing in the set, and deliberately so: it has to be
        // impossible to mistake for the petal or the crystal.
        return (
          <g>
            <path
              d="M50 62 C 56 74 44 82 50 96"
              fill="none"
              stroke={shade(fill, -0.3)}
              strokeWidth={4}
              strokeLinecap="round"
            />
            <path
              d="M40 76 L 60 82 M42 90 L 58 94"
              fill="none"
              stroke={HONEY}
              strokeWidth={5}
              strokeLinecap="round"
            />
            <Ink d="M50 6 L 84 40 L 50 66 L 16 40 Z" fill={fill} width={5}>
              <path
                d="M50 8 L 50 64 M18 40 L 82 40"
                fill="none"
                stroke={shade(fill, -0.32)}
                strokeWidth={3.5}
                opacity={0.7}
              />
            </Ink>
          </g>
        );

      case 'diamond':
        // A crystal of dew. Straight edges and a flat facet, against everything else here being soft.
        return (
          <Ink d="M50 6 L 84 50 L 50 94 L 16 50 Z" fill={fill} width={5}>
            <path d="M50 6 L 66 50 L 50 94 L 34 50 Z" fill="#fffdf7" opacity={0.24} />
            <path
              d="M50 6 L 50 94"
              fill="none"
              stroke={shade(fill, -0.3)}
              strokeWidth={3}
              opacity={0.5}
            />
          </Ink>
        );

      case 'leaf':
        return (
          <Ink d="M50 8 C 80 28 86 58 50 92 C 14 58 20 28 50 8 Z" fill={fill}>
            <path
              d="M50 20 L 50 84 M50 42 L 68 32 M50 42 L 32 32 M50 62 L 70 52 M50 62 L 30 52"
              fill="none"
              stroke={shade(fill, -0.3)}
              strokeWidth={4}
              strokeLinecap="round"
              opacity={0.7}
            />
          </Ink>
        );

      case 'capsule':
        // A pea pod, three peas showing.
        return (
          <Ink d="M32 22 H68 a18 18 0 0 1 0 56 H32 a18 18 0 0 1 0-56 Z" fill={fill}>
            <circle cx={32} cy={50} r={9} fill={shade(fill, -0.2)} opacity={0.75} />
            <circle cx={50} cy={50} r={9} fill={shade(fill, -0.2)} opacity={0.75} />
            <circle cx={68} cy={50} r={9} fill={shade(fill, -0.2)} opacity={0.75} />
          </Ink>
        );

      case 'square':
        // A tile of bark.
        return (
          <Ink d="M18 16 L 82 14 C 87 14 88 19 88 24 L 86 82 C 86 87 81 88 76 88 L 20 86 C 15 86 13 81 13 76 L 14 22 C 14 17 13 16 18 16 Z" fill={fill}>
            <path
              d="M28 30 C 46 34 60 28 74 32 M26 52 C 44 48 60 56 76 52 M28 72 C 48 68 62 74 74 70"
              fill="none"
              stroke={shade(fill, -0.28)}
              strokeWidth={4}
              strokeLinecap="round"
              opacity={0.65}
            />
          </Ink>
        );

      case 'circle':
        // A marigold seen face on. Notched rim, so it is not just a filled disc.
        return (
          <g>
            {Array.from({ length: 12 }, (_, i) => (
              <ellipse
                key={i}
                cx={50}
                cy={16}
                rx={7}
                ry={11}
                fill={shade(fill, 0.16)}
                stroke={shade(fill, -0.4)}
                strokeWidth={3}
                transform={`rotate(${i * 30} 50 50)`}
              />
            ))}
            <circle cx={50} cy={50} r={22} fill={fill} stroke={shade(fill, -0.42)} strokeWidth={5} />
            <circle cx={50} cy={50} r={9} fill={HONEY} opacity={0.85} />
          </g>
        );

      case 'cube':
        // The balance items weigh cubes. Here you weigh eggs.
        return (
          <Ink d="M50 8 C 72 26 84 50 84 64 A 34 34 0 0 1 16 64 C 16 50 28 26 50 8 Z" fill={fill}>
            <Gleam cx={36} cy={40} rx={8} ry={13} rot={-18} />
            <circle cx={62} cy={44} r={3.5} fill={shade(fill, -0.28)} />
            <circle cx={56} cy={68} r={3} fill={shade(fill, -0.28)} />
            <circle cx={38} cy={72} r={3.5} fill={shade(fill, -0.28)} />
          </Ink>
        );

      case 'bolt':
        // A twig with two buds on it.
        return (
          <g>
            <path
              d="M34 92 C 44 68 46 46 44 10 M44 44 C 56 36 66 34 78 34 M44 62 C 32 56 24 52 16 50"
              fill="none"
              stroke="#8d5f3c"
              strokeWidth={8}
              strokeLinecap="round"
            />
            <circle cx={80} cy={33} r={9} fill={fill} stroke={shade(fill, -0.42)} strokeWidth={4} />
            <circle cx={15} cy={49} r={7} fill={fill} stroke={shade(fill, -0.42)} strokeWidth={4} />
          </g>
        );

      case 'chevron':
        // A bird, seen from below, very far away.
        return (
          <path
            d="M10 62 C 28 34 42 34 50 56 C 58 34 72 34 90 62"
            fill="none"
            stroke={fill}
            strokeWidth={12}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        );

      /* --- the four chiral figures. asymmetric on both axes, on purpose. --- */

      case 'flag':
        // A fern frond: stem down one side, fronds only on the other, and shortening upward. Mirror
        // it and you can see it; rotate it and you can see that too.
        return (
          <g>
            <path
              d="M26 96 C 24 62 25 30 28 6"
              fill="none"
              stroke="#6f8f45"
              strokeWidth={7}
              strokeLinecap="round"
            />
            {[16, 32, 48, 64, 80].map((y, i) => (
              <path
                key={y}
                d={`M27 ${y} C ${46 - i * 3} ${y - 12} ${66 - i * 6} ${y - 8} ${84 - i * 11} ${y + 2}`}
                fill="none"
                stroke={fill}
                strokeWidth={9}
                strokeLinecap="round"
              />
            ))}
          </g>
        );

      case 'hook':
        // A vine tendril that has caught on something, with one arm longer than the other.
        return (
          <g>
            <path
              d="M32 10 V 56 a 20 20 0 0 0 40 0 V 42"
              fill="none"
              stroke={fill}
              strokeWidth={12}
              strokeLinecap="round"
            />
            <path
              d="M32 14 C 16 8 6 16 8 26 C 10 36 26 32 33 22 Z"
              fill="#6f8f45"
              stroke={shade('#6f8f45', -0.35)}
              strokeWidth={3.5}
              strokeLinejoin="round"
            />
          </g>
        );

      case 'boot':
        // A snail: shell up on the left, head and antennae out to the right.
        return (
          <g>
            <path
              d="M22 86 C 12 86 8 76 14 68 C 26 54 54 50 72 58 C 84 64 90 76 92 88 Z"
              fill={shade(fill, 0.2)}
              stroke={shade(fill, -0.42)}
              strokeWidth={5}
              strokeLinejoin="round"
            />
            <path
              d="M78 58 C 84 46 88 38 94 32 M64 52 C 66 40 68 32 70 24"
              fill="none"
              stroke={shade(fill, -0.42)}
              strokeWidth={5}
              strokeLinecap="round"
            />
            <circle cx={40} cy={40} r={26} fill={fill} stroke={shade(fill, -0.42)} strokeWidth={5} />
            <path
              d="M40 40 a 8 8 0 1 1 8 8 16 16 0 1 1 -16 -16 24 24 0 1 1 24 24"
              fill="none"
              stroke={shade(fill, -0.42)}
              strokeWidth={4}
              strokeLinecap="round"
            />
          </g>
        );

      case 'comma':
        // A fiddlehead, still curled. Chiral for free: the tail only leaves on one side.
        return (
          <g>
            <path
              d="M62 20 a 24 24 0 1 0 -6 44 c 10 0 6 16 -14 24 40 -4 52 -32 44 -52 a 24 24 0 0 0 -24 -16 Z"
              fill={fill}
              stroke={shade(fill, -0.42)}
              strokeWidth={5}
              strokeLinejoin="round"
            />
            <path
              d="M58 32 a 12 12 0 1 0 -2 22"
              fill="none"
              stroke={shade(fill, -0.34)}
              strokeWidth={4}
              strokeLinecap="round"
              opacity={0.75}
            />
          </g>
        );

      default:
        // Unreachable while `ShapeName` is what it is. If it grows, the geometric primitive is drawn
        // and the item stays answerable, which is the right way round for a name nobody has dressed.
        return undefined;
    }
  },

  // No `token`. A pictorial stand-in here would have to be an emoji, and an emoji is somebody
  // else's art direction dropped into the middle of ours.
};

/* ============================================================================
   The creature
   ========================================================================== */

type Mood = 'wake' | 'watch' | 'delight' | 'sleep';
type Gaze = 'child' | 'down';

const BODY = '#f0a68b';
const BODY_DEEP = shade(BODY, -0.2);
const LEAF = '#5f8f5a';
const INK = '#4a3529';

/**
 * The creature, in one SVG.
 *
 * Everything that moves is a named group so the stylesheet owns the animation and this function
 * only owns the drawing. The pupils are their own group because the gaze is the load-bearing part
 * of the whole design: it looks at the child, then down at the question, and back up when a tap
 * lands. That sequence is the instruction, so it must be legible from across a room.
 */
function Creature({ mood, gaze, grown }: { mood: Mood; gaze: Gaze; grown: boolean }) {
  return (
    <svg
      className="hl-cr"
      viewBox="0 0 200 214"
      data-mood={mood}
      data-gaze={gaze}
      data-grown={grown ? 'yes' : 'no'}
      role="presentation"
      aria-hidden="true"
    >
      <g className="hl-cr-breathe">
        {/* head sprouts — the second pair only exists once it has grown */}
        <g className="hl-cr-sprout">
          <path
            d="M100 44 C 99 28 98 18 95 8"
            fill="none"
            stroke={LEAF}
            strokeWidth={7}
            strokeLinecap="round"
          />
          <path
            d="M95 10 C 80 1 65 10 68 22 C 71 33 87 30 95 18 Z"
            fill={LEAF}
            stroke={shade(LEAF, -0.35)}
            strokeWidth={4}
            strokeLinejoin="round"
          />
          <path
            d="M97 22 C 111 11 126 17 125 28 C 124 39 107 38 98 28 Z"
            fill={shade(LEAF, 0.12)}
            stroke={shade(LEAF, -0.35)}
            strokeWidth={4}
            strokeLinejoin="round"
          />
          <g className="hl-cr-sprout2">
            <path
              d="M99 38 C 86 34 76 38 76 46 C 76 54 90 54 99 46 Z"
              fill={shade(LEAF, 0.2)}
              stroke={shade(LEAF, -0.35)}
              strokeWidth={4}
              strokeLinejoin="round"
            />
            <circle cx={95} cy={7} r={7} fill={SUN} stroke={shade(SUN, -0.34)} strokeWidth={4} />
          </g>
        </g>

        {/* feet */}
        <ellipse cx={76} cy={190} rx={19} ry={11} fill={BODY_DEEP} />
        <ellipse cx={124} cy={190} rx={19} ry={11} fill={BODY_DEEP} />

        {/* stubby side flippers */}
        <g className="hl-cr-wing hl-cr-wing-l">
          <path
            d="M36 116 C 12 122 8 148 27 155 C 36 158 43 149 42 140 Z"
            fill={BODY_DEEP}
            stroke={shade(BODY, -0.4)}
            strokeWidth={4}
            strokeLinejoin="round"
          />
        </g>
        <g className="hl-cr-wing hl-cr-wing-r">
          <path
            d="M164 116 C 188 122 192 148 173 155 C 164 158 157 149 158 140 Z"
            fill={BODY_DEEP}
            stroke={shade(BODY, -0.4)}
            strokeWidth={4}
            strokeLinejoin="round"
          />
        </g>

        {/* body */}
        <path
          d="M100 36 C 146 36 172 76 172 118 C 172 161 141 188 100 188 C 59 188 28 161 28 118 C 28 76 54 36 100 36 Z"
          fill={BODY}
          stroke={shade(BODY, -0.4)}
          strokeWidth={6}
          strokeLinejoin="round"
        />
        <ellipse cx={100} cy={146} rx={45} ry={35} fill="#fbe0cb" opacity={0.75} />

        {/* speckles, so it is plainly the thing that was in that egg */}
        <circle cx={58} cy={86} r={4} fill={shade(BODY, -0.16)} />
        <circle cx={142} cy={92} r={3.5} fill={shade(BODY, -0.16)} />
        <circle cx={132} cy={66} r={3} fill={shade(BODY, -0.16)} />
        <circle cx={70} cy={62} r={3} fill={shade(BODY, -0.16)} />

        {/* cheeks */}
        <ellipse cx={54} cy={130} rx={15} ry={9} fill="#e07a5f" opacity={0.42} />
        <ellipse cx={146} cy={130} rx={15} ry={9} fill="#e07a5f" opacity={0.42} />

        {/* eyes */}
        <g className="hl-cr-eyes">
          <ellipse cx={76} cy={104} rx={18} ry={20} fill="#fffaf0" stroke={shade(BODY, -0.34)} strokeWidth={3} />
          <ellipse cx={124} cy={104} rx={18} ry={20} fill="#fffaf0" stroke={shade(BODY, -0.34)} strokeWidth={3} />
          <g className="hl-cr-pupils">
            <circle cx={76} cy={106} r={9.5} fill={INK} />
            <circle cx={124} cy={106} r={9.5} fill={INK} />
            <circle cx={79.5} cy={102} r={3.2} fill="#fffdf7" opacity={0.95} />
            <circle cx={127.5} cy={102} r={3.2} fill="#fffdf7" opacity={0.95} />
          </g>
          <g className="hl-cr-lids">
            <ellipse cx={76} cy={104} rx={19} ry={21} fill={BODY} />
            <ellipse cx={124} cy={104} rx={19} ry={21} fill={BODY} />
          </g>
        </g>

        {/* mouth — one calm, one wide open, swapped by mood */}
        <g className="hl-cr-mouth">
          <path
            className="hl-cr-mouth-calm"
            d="M88 140 C 94 149 106 149 112 140"
            fill="none"
            stroke={INK}
            strokeWidth={5}
            strokeLinecap="round"
          />
          <path
            className="hl-cr-mouth-open"
            d="M84 136 C 88 160 112 160 116 136 Z"
            fill="#c2685e"
            stroke={INK}
            strokeWidth={4}
            strokeLinejoin="round"
          />
        </g>
      </g>
    </svg>
  );
}

/* ============================================================================
   The egg, the nest, the sprig
   ========================================================================== */

const SHELL = '#fdf0d9';

function Egg({ beat }: { beat: number }) {
  return (
    <svg className="hl-egg-svg" viewBox="0 0 200 200" data-beat={beat} role="presentation" aria-hidden="true">
      <g className="hl-egg-rock">
        <g className="hl-egg-shell">
          {/* An ovoid: rounded over the top, widest below the middle. The first pass pushed the top
              control points too far apart and the result was an onion. */}
          <path
            d="M100 8 C 146 8 174 64 174 118 C 174 166 140 192 100 192 C 60 192 26 166 26 118 C 26 64 54 8 100 8 Z"
            fill={SHELL}
            stroke="#c9a679"
            strokeWidth={6}
            strokeLinejoin="round"
          />
          <ellipse cx={68} cy={82} rx={15} ry={28} fill="#fffdf7" opacity={0.7} transform="rotate(-16 68 82)" />
          <circle cx={122} cy={62} r={5} fill="#e9c79b" />
          <circle cx={142} cy={106} r={4} fill="#e9c79b" />
          <circle cx={58} cy={136} r={4.5} fill="#e9c79b" />
          <circle cx={104} cy={162} r={4} fill="#e9c79b" />
          <circle cx={94} cy={104} r={3.5} fill="#e9c79b" />
          <circle cx={132} cy={148} r={3.5} fill="#e9c79b" />
        </g>

        {/* the crack, in three pieces so it can arrive in three beats */}
        <g className="hl-crack">
          <path className="hl-crack-a" d="M52 104 L 74 116 L 58 130 L 80 140" />
          <path className="hl-crack-b" d="M80 140 L 104 128 L 96 148 L 124 138" />
          <path className="hl-crack-c" d="M124 138 L 144 122 L 138 102" />
        </g>
      </g>

      {/* two pieces that leave when it opens */}
      <g className="hl-piece hl-piece-l">
        <path
          d="M32 116 C 34 84 46 48 74 22 L 90 40 L 60 82 L 70 106 Z"
          fill={SHELL}
          stroke="#c9a679"
          strokeWidth={5}
          strokeLinejoin="round"
        />
      </g>
      <g className="hl-piece hl-piece-r">
        <path
          d="M168 120 C 166 86 154 50 126 24 L 110 44 L 140 84 L 130 110 Z"
          fill={SHELL}
          stroke="#c9a679"
          strokeWidth={5}
          strokeLinejoin="round"
        />
      </g>
    </svg>
  );
}

/**
 * The two halves, on one 320x180 box so they always line up.
 *
 * BACK_RIM is the far side of the weave, drawn behind whatever is in the nest. FRONT_WALL is the
 * near side, drawn in front of it. Both are also used as CLIP PATHS for their own weave, and that is
 * the part worth knowing: the first version drew the twigs freehand across the whole box, and
 * because the wall's opening dips low in the middle while its rim sits high at the sides, every
 * stroke sailed straight across the middle of the nest and slung the creature in a hammock. Clipping
 * each weave to its own wall means a twig can only ever appear where there is nest to appear on.
 */
const BACK_RIM = 'M10 56 A 150 42 0 0 1 310 56 L 286 56 A 126 28 0 0 0 34 56 Z';
const FRONT_WALL =
  'M34 56 C 36 108 84 132 160 132 C 236 132 284 108 286 56 L 310 56 C 308 136 250 172 160 172 C 70 172 12 136 10 56 Z';

function NestBack() {
  return (
    <svg className="hl-nest hl-nest-back" viewBox="0 0 320 180" role="presentation" aria-hidden="true">
      <defs>
        <clipPath id="hl-nest-back-clip">
          <path d={BACK_RIM} />
        </clipPath>
      </defs>
      {/* The cavity. Without it you can see the sky through the nest on either side of whatever is
          sitting in it, and the nest reads as a hoop rather than a bowl. */}
      <path
        d="M34 56 A 126 28 0 0 1 286 56 C 284 108 236 132 160 132 C 84 132 36 108 34 56 Z"
        fill="#8a6141"
      />

      {/* twig ends standing up out of the far rim */}
      <g fill="none" stroke="#8d5f3c" strokeWidth={4} strokeLinecap="round" opacity={0.45}>
        <path d="M64 26 C 52 17 42 12 28 9" />
        <path d="M258 26 C 270 17 280 12 294 9" />
        <path d="M150 15 C 140 8 130 5 118 4" />
        <path d="M196 17 C 206 11 214 8 224 7" />
      </g>
      <path
        d={BACK_RIM}
        fill="#b3855b"
        stroke="#7f5432"
        strokeWidth={5}
        strokeLinejoin="round"
      />
      <g clipPath="url(#hl-nest-back-clip)" fill="none" stroke="#7f5432" strokeLinecap="round">
        <path d="M4 58 A 148 48 0 0 1 316 58" strokeWidth={5} opacity={0.38} />
        <path d="M16 56 A 138 33 0 0 1 304 56" strokeWidth={5} opacity={0.3} />
        <path d="M40 30 C 96 14 224 14 280 30" strokeWidth={4} opacity={0.3} />
      </g>
    </svg>
  );
}

function NestFront() {
  return (
    <svg className="hl-nest hl-nest-front" viewBox="0 0 320 180" role="presentation" aria-hidden="true">
      <defs>
        <clipPath id="hl-nest-front-clip">
          <path d={FRONT_WALL} />
        </clipPath>
      </defs>

      {/* it is standing on something, rather than hovering over it */}
      <ellipse cx={160} cy={174} rx={124} ry={11} fill="#a8763f" opacity={0.16} />
      <g fill="none" stroke={LEAF} strokeWidth={5} strokeLinecap="round" opacity={0.66}>
        <path d="M48 164 C 42 150 38 142 32 134" />
        <path d="M58 170 C 55 156 52 148 48 140" />
        <path d="M68 173 C 67 161 66 153 65 146" />
        <path d="M272 164 C 278 150 282 142 288 134" />
        <path d="M262 170 C 265 156 268 148 272 140" />
        <path d="M252 173 C 253 161 254 153 255 146" />
      </g>

      <path
        d={FRONT_WALL}
        fill="#c69a6c"
        stroke="#7f5432"
        strokeWidth={5}
        strokeLinejoin="round"
      />

      <g clipPath="url(#hl-nest-front-clip)" fill="none" stroke="#8d5f3c" strokeLinecap="round">
        <path d="M6 50 C 14 106 76 138 160 138 C 244 138 306 106 314 50" strokeWidth={6} opacity={0.4} />
        <path d="M0 40 C 8 120 74 154 160 154 C 246 154 312 120 320 40" strokeWidth={6} opacity={0.32} />
        <path d="M12 66 C 20 98 78 124 160 124 C 242 124 300 98 308 66" strokeWidth={5} opacity={0.28} />
        <path d="M24 118 C 58 150 118 164 164 163" strokeWidth={5} opacity={0.3} />
        <path d="M296 118 C 262 150 202 164 156 163" strokeWidth={5} opacity={0.3} />
        <path d="M96 140 C 130 156 190 156 226 140" strokeWidth={4} opacity={0.28} />
      </g>

      {/* twig ends poking out sideways past the weave, so the silhouette is not a turned bowl */}
      <g fill="none" stroke="#8d5f3c" strokeWidth={4} strokeLinecap="round" opacity={0.48}>
        <path d="M13 62 C 2 68 -5 74 -10 83" />
        <path d="M307 64 C 318 70 325 76 330 85" />
        <path d="M22 100 C 10 105 3 110 -3 117" />
        <path d="M298 104 C 310 109 317 114 323 121" />
      </g>
    </svg>
  );
}

/** Where the leaves sit on the sprig, in order. Turning up adds the next one. */
const SPRIG: { x: number; y: number; rot: number; flip: boolean }[] = [
  { x: 78, y: 82, rot: -8, flip: false },
  { x: 74, y: 66, rot: -14, flip: true },
  { x: 72, y: 52, rot: -4, flip: false },
  { x: 69, y: 38, rot: -18, flip: true },
  { x: 67, y: 26, rot: 2, flip: false },
  { x: 65, y: 16, rot: -12, flip: true },
  { x: 64, y: 8, rot: 6, flip: false },
  { x: 62, y: 2, rot: -6, flip: true },
];

/**
 * The only thing on screen that advances, and it advances for showing up.
 *
 * One leaf per turn taken, regardless of what was tapped. There is no number attached to it and no
 * total to reach, so it cannot be read as a score even by an adult who wants to.
 */
function Sprig({ leaves, flowered }: { leaves: number; flowered: boolean }) {
  const shown = Math.max(0, Math.min(SPRIG.length, leaves));
  return (
    <svg className="hl-sprig" viewBox="0 0 160 100" role="presentation" aria-hidden="true">
      {/* soil, so a stem with no leaves on it yet still reads as something planted */}
      <path
        d="M52 97 C 62 88 102 88 112 97 Z"
        fill="#a8763f"
        opacity={0.3}
      />
      <path
        d="M82 98 C 79 76 74 48 62 2"
        fill="none"
        stroke={LEAF}
        strokeWidth={6}
        strokeLinecap="round"
      />
      {SPRIG.slice(0, shown).map((a, i) => (
        // The placement lives on the outer group as an attribute and the animation lives on the
        // inner one as CSS, because a CSS transform beats a transform attribute outright — put both
        // on one element and every leaf animates from the same corner of the sprig.
        <g
          key={i}
          transform={`translate(${a.x} ${a.y}) rotate(${a.rot}) scale(${a.flip ? -1 : 1} 1)`}
        >
          <g className="hl-sprig-leaf" style={{ ['--i' as string]: String(i) } as CSSProperties}>
            <path
              d="M0 0 C 15 -13 32 -9 34 4 C 36 17 16 20 0 7 Z"
              fill={i % 2 === 0 ? LEAF : shade(LEAF, 0.14)}
              stroke={shade(LEAF, -0.35)}
              strokeWidth={3.5}
              strokeLinejoin="round"
            />
          </g>
        </g>
      ))}
      {flowered ? (
        <g className="hl-sprig-bloom">
          {[0, 1, 2, 3, 4].map((i) => (
            <ellipse
              key={i}
              cx={62}
              cy={-8}
              rx={7}
              ry={11}
              fill="#e79ab0"
              stroke={shade('#e79ab0', -0.35)}
              strokeWidth={3}
              transform={`rotate(${i * 72} 62 2)`}
            />
          ))}
          <circle cx={62} cy={2} r={6} fill={SUN} stroke={shade(SUN, -0.3)} strokeWidth={3} />
        </g>
      ) : null}
    </svg>
  );
}

/**
 * The way out: one leaf, big enough to hit with a fist.
 *
 * Pointed at the tip and veined, because the first pass was a rounded diamond that read as a gem.
 * The arrow inside it is for the adult; by the time this is on screen the child is finished.
 */
function WayOut({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button type="button" className="hl-big" onClick={onClick} aria-label={label}>
      <svg viewBox="0 0 200 148" role="presentation" aria-hidden="true">
        <path
          d="M100 4 C 178 42 178 106 100 144 C 22 106 22 42 100 4 Z"
          fill={LEAF}
          stroke={shade(LEAF, -0.38)}
          strokeWidth={6}
          strokeLinejoin="round"
        />
        <path
          d="M100 18 L 100 132 M100 52 L 132 38 M100 52 L 68 38 M100 86 L 136 70 M100 86 L 64 70"
          fill="none"
          stroke={shade(LEAF, -0.22)}
          strokeWidth={4}
          strokeLinecap="round"
          opacity={0.5}
        />
        <path
          d="M118 56 L 92 74 L 118 92"
          fill="none"
          stroke="#fffaf0"
          strokeWidth={11}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </button>
  );
}

/* ============================================================================
   Voice — enhancement only, never the carrier
   ========================================================================== */

const WARM = ['Ooh, nice.', 'Thank you!', 'I like that one.', 'Good idea.', 'Mmm, yes.', 'Oh, lovely.'];

/* ============================================================================
   The world
   ========================================================================== */

type Stage = 'nest' | 'hatch' | 'play' | 'grown' | 'trouble';

const REACTIONS = ['bounce', 'wiggle', 'perk', 'hop'] as const;

const MOTES = [
  { x: 8, d: 0, dur: 15 },
  { x: 21, d: 3, dur: 18 },
  { x: 34, d: 7, dur: 13 },
  { x: 47, d: 1, dur: 20 },
  { x: 61, d: 9, dur: 16 },
  { x: 74, d: 5, dur: 19 },
  { x: 88, d: 11, dur: 14 },
];

export default function Hatchling({ onExit }: ExperienceProps) {
  const s = useScreenerSession({ band: 'K-1', precisionIndex: 0, settleMs: 1400 });

  const [stage, setStage] = useState<Stage>('nest');
  const [beat, setBeat] = useState(0);
  const [turns, setTurns] = useState(0);
  const [gaze, setGaze] = useState<Gaze>('child');
  const [reaction, setReaction] = useState<{ n: number; kind: string } | null>(null);
  const [voiceOn, setVoiceOn] = useState(true);

  const voiceRef = useRef(true);
  voiceRef.current = voiceOn;
  const tapCount = useRef(0);

  /** Say something, or say nothing at all, and either way the world works. */
  const say = useCallback((text: string) => {
    if (!voiceRef.current) return;
    try {
      const synth = window.speechSynthesis;
      if (!synth || typeof SpeechSynthesisUtterance === 'undefined') return;
      synth.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.rate = 0.9;
      u.pitch = 1.3;
      u.volume = 0.85;
      u.lang = 'en-US';
      synth.speak(u);
    } catch {
      /* silence is the supported default, not a degraded one */
    }
  }, []);

  useEffect(
    () => () => {
      try {
        window.speechSynthesis?.cancel();
      } catch {
        /* nothing to clean up if it was never there */
      }
    },
    [],
  );

  /* -- hatching ------------------------------------------------------------ */

  const beginHatch = useCallback(() => {
    if (stage !== 'nest') return;
    setStage('hatch');
    setBeat(0);
    void s.start();
  }, [stage, s.start]);

  useEffect(() => {
    if (stage !== 'hatch') return;
    // 1 squash, 2 the first crack, 3 the rest of the crack, 4 the shell opens and something comes
    // up out of it, 5 it is out and pleased about it, 6 the world moves on. Staggered rather than
    // simultaneous, which is what makes it read as one event happening rather than six starting.
    const ts = [200, 560, 900, 1320, 1920, 2500].map((ms, i) =>
      window.setTimeout(() => setBeat(i + 1), ms),
    );
    return () => ts.forEach((t) => window.clearTimeout(t));
  }, [stage]);

  useEffect(() => {
    if (stage === 'hatch' && beat === 5) say('Hello!');
  }, [stage, beat, say]);

  /* -- stage transitions --------------------------------------------------- */

  useEffect(() => {
    if (s.phase === 'error') {
      // Let it finish coming out of the egg before anything else happens. Cutting the hatch off
      // halfway is the one transition in this world that would actually look broken, and the child
      // still gets a creature either way.
      if (stage === 'hatch' && beat < 6) return;
      setStage('trouble');
      return;
    }
    if (stage === 'hatch' && beat >= 6) {
      if (s.phase === 'asking' || s.phase === 'settling') setStage('play');
      else if (s.phase === 'done') setStage('grown');
      return;
    }
    if (stage === 'play' && s.phase === 'done') setStage('grown');
  }, [s.phase, stage, beat]);

  useEffect(() => {
    if (stage !== 'grown') return;
    say('Thank you for helping me. Look, I grew!');
  }, [stage, say]);

  /* -- the gaze, which is how a question is announced ---------------------- */

  const itemId = s.serve?.served.itemId ?? null;
  const firstItem = useRef(true);

  useEffect(() => {
    if (!itemId || stage !== 'play') return;
    // It looks up at the child first, every single time, and only then down at the thing it is
    // trying to decide. That pause is the entire instruction.
    setReaction(null);
    setGaze('child');
    const t = window.setTimeout(() => setGaze('down'), 700);
    if (firstItem.current) {
      firstItem.current = false;
      const v = window.setTimeout(() => say('Help me pick.'), 300);
      return () => {
        window.clearTimeout(t);
        window.clearTimeout(v);
      };
    }
    return () => window.clearTimeout(t);
  }, [itemId, stage, say]);

  /* -- answering ----------------------------------------------------------- */

  const tap = useCallback(
    (key: string) => {
      if (s.phase !== 'asking') return;
      const n = tapCount.current++;
      // Set the reaction BEFORE handing the answer to the session, so the creature has already
      // moved by the time the request leaves. Warmth that waits on a network round trip is not
      // warmth a five-year-old will connect to their own finger.
      setReaction({ n, kind: REACTIONS[n % REACTIONS.length] ?? 'bounce' });
      setGaze('child');
      setTurns((t) => t + 1);
      say(WARM[n % WARM.length] ?? 'Thank you!');
      void s.answer(key);
    },
    [s.phase, s.answer, say],
  );

  const retry = useCallback(() => {
    s.reset();
    setStage('nest');
    setBeat(0);
    setTurns(0);
    firstItem.current = true;
    tapCount.current = 0;
  }, [s.reset]);

  /* -- what the creature is doing right now -------------------------------- */

  const mood: Mood =
    stage === 'trouble'
      ? 'sleep'
      : reaction || stage === 'grown' || (stage === 'hatch' && beat >= 5)
        ? 'delight'
        : stage === 'play'
          ? 'watch'
          : 'wake';

  // If something goes wrong, the nest must not end up EMPTY. An empty nest is the one image in this
  // world that would frighten a five-year-old, so trouble keeps whoever was there: the egg if it
  // never opened, and the creature having a doze if it did.
  const openedOnce = stage === 'play' || stage === 'grown' || (stage === 'hatch' && beat >= 4);
  const hatched = openedOnce || (stage === 'trouble' && beat >= 4);
  const showEgg =
    stage === 'nest' || (stage === 'hatch' && beat < 5) || (stage === 'trouble' && beat < 4);

  return (
    <div
      className="hl-root"
      data-stage={stage}
      data-sun={stage === 'grown' ? 'high' : 'low'}
      data-react={reaction?.kind ?? 'none'}
    >
      {/* ---- sky ---------------------------------------------------------- */}
      <div className="hl-sky" aria-hidden="true">
        <div className="hl-glow" />
        {/* A gradient rather than stacked discs. Concentric circles banded visibly at these
            opacities, and a hard-edged circle in a soft world reads as a hole punched in it. */}
        <div className="hl-sundisc" />
        {MOTES.map((m, i) => (
          <span
            key={i}
            className="hl-mote"
            style={
              {
                ['--x' as string]: `${m.x}%`,
                ['--d' as string]: `${m.d}s`,
                ['--dur' as string]: `${m.dur}s`,
              } as CSSProperties
            }
          />
        ))}
      </div>

      {/* ---- hills -------------------------------------------------------- */}
      <svg className="hl-hills" viewBox="0 0 1000 300" preserveAspectRatio="none" role="presentation" aria-hidden="true">
        <path d="M0 132 C 150 78 290 128 430 106 C 580 82 700 132 830 108 C 900 96 960 108 1000 118 L1000 300 L0 300 Z" fill="#e7b78c" opacity={0.55} />
        <path d="M0 186 C 160 140 300 186 470 168 C 640 150 800 190 1000 172 L1000 300 L0 300 Z" fill="#cf9a72" opacity={0.5} />
        <path d="M0 244 C 220 214 420 250 640 234 C 800 222 920 240 1000 236 L1000 300 L0 300 Z" fill="#7d9a63" opacity={0.55} />
      </svg>

      {/* ---- adult corner controls, deliberately faint --------------------- */}
      <div className="hl-top">
        <button
          type="button"
          className="hl-quiet"
          aria-label={voiceOn ? 'Turn the voice off' : 'Turn the voice on'}
          aria-pressed={voiceOn}
          onClick={() => {
            setVoiceOn((v) => {
              if (v) {
                try {
                  window.speechSynthesis?.cancel();
                } catch {
                  /* ignore */
                }
              }
              return !v;
            });
          }}
        >
          <svg viewBox="0 0 40 40" role="presentation" aria-hidden="true">
            <path d="M10 16 H16 L23 10 V30 L16 24 H10 Z" fill="none" stroke={INK} strokeWidth={3} strokeLinejoin="round" strokeLinecap="round" />
            {voiceOn ? (
              <path d="M28 14 C 33 18 33 22 28 26 M32 10 C 39 16 39 24 32 30" fill="none" stroke={INK} strokeWidth={3} strokeLinecap="round" />
            ) : (
              <path d="M28 14 L 36 26 M36 14 L 28 26" fill="none" stroke={INK} strokeWidth={3} strokeLinecap="round" />
            )}
          </svg>
        </button>
        <button type="button" className="hl-quiet" aria-label="Leave Hatchling" onClick={onExit}>
          <svg viewBox="0 0 40 40" role="presentation" aria-hidden="true">
            <path d="M24 11 L 14 20 L 24 29" fill="none" stroke={INK} strokeWidth={3.5} strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>

      {/* ---- the bay: nest, egg, creature ---------------------------------- */}
      <div className="hl-bay">
        <div className="hl-bayinner">
          {/* The cradle carries the nest's own 320x180 proportions, so everything that sits in the
              nest can be placed as a fraction of the NEST rather than of the screen. */}
          <div className="hl-cradle">
            <NestBack />

            {showEgg ? (
              <button
                type="button"
                className="hl-egg"
                aria-label="Tap the egg"
                onClick={beginHatch}
                disabled={stage !== 'nest'}
              >
                {/* Three rings breathing outward, and the egg rocking. Nobody has to be told. */}
                <span className="hl-ring hl-ring-1" aria-hidden="true" />
                <span className="hl-ring hl-ring-2" aria-hidden="true" />
                <span className="hl-ring hl-ring-3" aria-hidden="true" />
                <Egg beat={beat} />
              </button>
            ) : null}

            {hatched ? (
              <div className="hl-crwrap">
                <Creature mood={mood} gaze={gaze} grown={stage === 'grown'} />
                {reaction ? (
                  <div className="hl-burst" key={reaction.n} aria-hidden="true">
                    {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
                      <span
                        key={i}
                        className="hl-petal"
                        style={
                          { ['--i' as string]: String(i), ['--a' as string]: `${i * 45}deg` } as CSSProperties
                        }
                      />
                    ))}
                  </div>
                ) : null}
              </div>
            ) : null}

            <NestFront />
          </div>
        </div>
      </div>

      {/* ---- the stage: whatever the creature is deciding ------------------ */}
      <div className="hl-stagewrap">
        {stage === 'trouble' ? (
          <div className="hl-panel hl-end" key="trouble">
            <WayOut label="Go back" onClick={onExit} />
            <p className="hl-adult">
              For the grown-up: the nest is quiet just now and nothing reached the egg. Tap the leaf
              to go back, or{' '}
              <button type="button" className="hl-inline" onClick={retry}>
                settle the nest again
              </button>
              .
              {s.error ? <span className="hl-detail"> {s.error}</span> : null}
            </p>
          </div>
        ) : null}

        {stage === 'play' && s.serve ? (
          <div className="hl-panel hl-stage" key={s.serve.served.itemId}>
            <ItemStage
              serve={s.serve}
              band="K-1"
              onAnswer={tap}
              answered={s.phase !== 'asking'}
              skin={HATCHLING_SKIN}
            />
          </div>
        ) : null}

        {stage === 'grown' ? (
          <div className="hl-panel hl-end" key="end">
            <div className="hl-bloomring" aria-hidden="true">
              {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map((i) => (
                <span
                  key={i}
                  className="hl-bloompetal"
                  style={{ ['--i' as string]: String(i), ['--a' as string]: `${i * 30}deg` } as CSSProperties}
                />
              ))}
            </div>
            <WayOut label="Back to the other worlds" onClick={onExit} />
          </div>
        ) : null}
      </div>

      {/* ---- the sprig, and the only prose in the world -------------------- */}
      <div className="hl-foot">
        <Sprig leaves={turns} flowered={stage === 'grown'} />
        <p className="hl-adult">
          {stage === 'nest' || stage === 'hatch'
            ? 'For the grown-up: hand this over and let them tap the egg. Nothing here needs reading.'
            : stage === 'grown'
              ? 'For the grown-up: Hatchling grew, because they turned up. There is nothing to pass here and nothing to read out.'
              : stage === 'trouble'
                ? ''
                : 'For the grown-up: any tap is a good tap. Hatchling is glad of all of them.'}
        </p>
      </div>
    </div>
  );
}
