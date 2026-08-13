import {
  useCallback,
  useMemo,
  useState,
  type CSSProperties,
  type FormEvent,
  type ReactNode,
} from 'react';

import type { Choice, Facets, Question, StemKind } from '../shared/headless/adapt';
import { visualChoices } from '../shared/headless/distinct';
import { useQuestionSession } from '../shared/headless/useQuestionSession';
import { loadProgress, recordRound, type Progress } from '../shared/progression';
import type { ExperienceMeta } from '../shared/types';
import './Backrooms.css';

/**
 * Backrooms: a descent through Level 0, where every junction is a room with doors.
 *
 * Headless, like the reference app. Nothing on screen comes from the library's renderers. The
 * normalised question arrives as a stem plus a bag of facets per choice, and this surface decides that
 * a choice is a DOORWAY, that `count` is tally marks scratched beside the frame, `text` is scrawled on
 * the leaf and `value` is stencilled above it. The reasoning is the bank's; the corridor is not.
 *
 * THE LOOP. The child is being followed and has to keep moving, so every junction is a fork and the
 * choices are the ways out of it. Getting one right puts ground between them and the thing behind; not
 * getting it lets the thing close. Neither branch ever stops the run: depth only ever climbs, the
 * corridor never locks, and the meter tops out at "close" rather than at "caught". Tension with no
 * punishment attached, which is the only version of pursuit that belongs in front of a child.
 *
 * FEEDBACK IS AMBIENT, NOT EVALUATIVE. This band gets a verdict per item nowhere. There is no tick, no
 * cross and no running tally: the only thing that moves is the state of the world behind them, and it
 * is phrased as a description of the corridor rather than a judgement of the person in it.
 *
 * THE ENDING IS THE ENGINE'S. Whether they reach an exit is `result.decision === 'recommend'` and
 * nothing else, so the payoff is the real classification rather than a threshold this file invented.
 * The other branch is a stairwell down, framed as depth reached, never as failure.
 */

export const meta: ExperienceMeta = {
  id: 'backrooms',
  title: 'Backrooms',
  world: 'Backrooms',
  band: '6-8',
  pull: 'Pick the right door. Something is behind you',
  accent: '#d9c760',
};

/* ------------------------------------------------------------------ tuning */

/** Metres gained per junction. Both are positive: a run only ever moves forward. */
const STRIDE_AHEAD = 18;
const STRIDE_SLOW = 7;

/** Separation from the thing behind, in metres. It starts at maximum: nothing is following yet. */
const LEAD_MAX = 60;
const LEAD_MIN = 6;
const LEAD_GAIN = 7;
const LEAD_LOSS = 10;

/** Cells in the proximity meter. Six steps of nine metres across the whole range. */
const CELLS = 6;

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
}

/** How many meter cells are lit. Zero at cold start, six at closest, never past six. */
function cellsLit(lead: number): number {
  return clamp(Math.round((LEAD_MAX - lead) / ((LEAD_MAX - LEAD_MIN) / CELLS)), 0, CELLS);
}

/** The state of the corridor behind, described rather than scored. Never says caught. */
const BEHIND_YOU: readonly string[] = [
  'nothing yet',
  'a long way back',
  'somewhere back there',
  'closer than it was',
  'in the next room',
  'right behind the wall',
  'close',
];

/* --------------------------------------------------------------------- ink */

/**
 * What people scrawl with down here. All six sit above 5.5:1 against the pale label stock the marks are
 * drawn on, which matters more than usual because the whole palette is one hue and yellow-on-yellow
 * fails silently.
 */
const INK: readonly string[] = ['#241f12', '#4a3a16', '#7d3320', '#2b4358', '#3a5c34', '#5a2f4e'];

function hashOf(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}

function inkFor(token: string | undefined): string {
  if (!token) return INK[0] ?? '#241f12';
  return INK[hashOf(token) % INK.length] ?? '#241f12';
}

/* ------------------------------------------------------------------- marks */

/** Mark silhouettes a `shape` or `glyph` token can become. Identities, so the order means nothing. */
const SHAPE_PATHS: Record<string, string> = {
  circle: 'M20 6 A14 14 0 1 1 19.98 6 Z',
  square: 'M7 7 H33 V33 H7 Z',
  triangle: 'M20 5 L35 33 L5 33 Z',
  diamond: 'M20 4 L36 20 L20 36 L4 20 Z',
  hex: 'M20 4 L33 12 L33 28 L20 36 L7 28 L7 12 Z',
  star: 'M20 4 L23.9 14.7 L35.2 15.1 L26.3 22 L29.4 32.9 L20 26.6 L10.6 32.9 L13.7 22 L4.8 15.1 L16.1 14.7 Z',
  cross: 'M15 4 H25 V15 H36 V25 H25 V36 H15 V25 H4 V15 H15 Z',
  chevron: 'M6 9 L20 21 L34 9 L34 19 L20 31 L6 19 Z',
  ring: 'M20 4 A16 16 0 1 1 19.98 4 Z M20 12 A8 8 0 1 0 20.02 12 Z',
  bar: 'M4 15 H36 V25 H4 Z',
  tee: 'M5 6 H35 V15 H25 V34 H15 V15 H5 Z',
  arc: 'M4 33 A16 16 0 0 1 36 33 L27 33 A7 7 0 0 0 13 33 Z',
};

const SHAPE_ORDER = Object.keys(SHAPE_PATHS);

/**
 * A token's silhouette.
 *
 * Hashed rather than slotted on purpose. The DOOR carries the slot, so two choices sharing a shape are
 * still distinguishable by the doorway they belong to; the mark is free to stay faithful to the facet
 * instead of being reassigned for the sake of variety.
 */
function pathFor(token: string | undefined): string {
  if (!token) return SHAPE_PATHS.square ?? '';
  const direct = SHAPE_PATHS[token];
  if (direct) return direct;
  const key = SHAPE_ORDER[hashOf(token) % SHAPE_ORDER.length] ?? 'square';
  return SHAPE_PATHS[key] ?? '';
}

type FillMode = 'solid' | 'outline' | 'hatch';

/**
 * Words that describe a fill rather than a colour.
 *
 * FLU-OPCHAIN-01 carries `shade: 'hollow' | 'solid'`, and the adapter files `shade` under `color`. Read
 * literally that is a choice painted the colour "hollow", and the one real distinction between two of
 * its candidates disappears. So a colour token that is plainly a fill is treated as one.
 */
const FILL_WORDS =
  /outline|hollow|empty|open|solid|filled|shade|hatch|striped|half|dotted|grid|none/;

function isFillWord(s: string | undefined): boolean {
  return s !== undefined && FILL_WORDS.test(s.toLowerCase());
}

function fillMode(fill: string | undefined, color?: string): FillMode {
  const token = fill ?? (isFillWord(color) ? color : undefined);
  if (!token) return 'solid';
  const f = token.toLowerCase();
  if (f.includes('outline') || f.includes('hollow') || f.includes('empty') || f.includes('open') || f === 'none') {
    return 'outline';
  }
  if (f.includes('hatch') || f.includes('strip') || f.includes('half') || f.includes('dot') || f.includes('grid') || f.includes('shade')) {
    return 'hatch';
  }
  return 'solid';
}

/** The ink a facet bag is drawn in. A colour token that is really a fill does not get to pick it. */
function inkOf(facets: Facets): string {
  const colour = isFillWord(facets.color) ? undefined : facets.color;
  return inkFor(colour ?? facets.shape ?? facets.glyph);
}

/** `rot` arrives as degrees on some types and as a quarter-turn index on others. */
function rotDeg(rot: number | undefined): number {
  if (rot === undefined) return 0;
  if (Number.isInteger(rot) && Math.abs(rot) <= 4) return rot * 90;
  return rot;
}

function tiltDeg(tilt: string | undefined): number {
  if (!tilt) return 0;
  const t = tilt.toLowerCase();
  if (t.includes('left')) return -20;
  if (t.includes('right')) return 20;
  if (t.includes('flat') || t.includes('lying') || t.includes('down')) return 90;
  if (t.includes('lean') || t.includes('tilt')) return -20;
  return 0;
}

const SIZE_WORDS: Record<string, number> = {
  xs: 0.58, tiny: 0.58, small: 0.72, sm: 0.72, s: 0.72,
  med: 1, medium: 1, md: 1, m: 1, normal: 1,
  large: 1.32, lg: 1.32, l: 1.32, big: 1.32, xl: 1.5, huge: 1.5,
};

/** `size` is ORDERED, so the mapping has to keep the ordering rather than turn it into variety. */
function scaleFor(size: number | string | undefined): number {
  if (size === undefined) return 1;
  if (typeof size === 'number') {
    if (size <= 0) return 1;
    if (size <= 6) return clamp(0.6 + size * 0.14, 0.58, 1.5);
    return clamp(size / 40, 0.58, 1.5);
  }
  return SIZE_WORDS[size.toLowerCase()] ?? 1;
}

/** One facet drawn as a mark: scratched, stencilled or drawn on by somebody who was here first. */
function Mark({ facets, size = 40 }: { facets: Facets; size?: number }) {
  const token = facets.shape ?? facets.glyph ?? (isFillWord(facets.color) ? undefined : facets.color);
  const ink = inkOf(facets);
  const mode = fillMode(facets.fill, facets.color);
  const spin = rotDeg(facets.rot) + tiltDeg(facets.tilt);
  const scale = scaleFor(facets.size);

  return (
    <svg
      className="br-mark"
      width={size}
      height={size}
      viewBox="0 0 40 40"
      aria-hidden="true"
      focusable="false"
    >
      <g transform={`translate(20 20) rotate(${spin}) scale(${scale}) translate(-20 -20)`}>
        <path
          d={pathFor(token)}
          fill={mode === 'outline' ? 'none' : ink}
          fillOpacity={mode === 'hatch' ? 0.38 : 1}
          fillRule="evenodd"
          stroke={ink}
          strokeWidth={mode === 'solid' ? 0 : 3}
          strokeLinejoin="round"
        />
      </g>
    </svg>
  );
}

/**
 * Tally marks, five to a gate.
 *
 * `count` is an ORDERED facet, so it is drawn as that many actual marks rather than collapsed to a
 * numeral. A child comparing two doors should be able to compare them by looking.
 */
function Tally({ n, ink = INK[0] ?? '#241f12' }: { n: number; ink?: string }) {
  const total = Math.max(0, Math.round(n));
  if (total === 0) return <span className="br-tally-none">none</span>;
  if (total > 40) {
    return (
      <span className="br-tally-many" style={{ color: ink }}>
        {total} marks
      </span>
    );
  }

  const gates = Math.floor(total / 5);
  const rest = total % 5;
  const width = gates * 30 + (rest > 0 ? rest * 7 + 6 : 0);

  return (
    <svg
      className="br-tally"
      viewBox={`0 0 ${Math.max(width, 10)} 26`}
      width={Math.max(width, 10)}
      height={26}
      aria-hidden="true"
      focusable="false"
    >
      {Array.from({ length: gates }).map((_, g) => (
        <g key={`g${g}`} transform={`translate(${g * 30} 0)`} stroke={ink} strokeWidth={2.6} strokeLinecap="round">
          {[0, 1, 2, 3].map((i) => (
            <line key={i} x1={4 + i * 6} y1={4} x2={4 + i * 6} y2={22} />
          ))}
          <line x1={1} y1={21} x2={27} y2={5} />
        </g>
      ))}
      {Array.from({ length: rest }).map((_, i) => (
        <line
          key={`r${i}`}
          x1={gates * 30 + 4 + i * 7}
          y1={4}
          x2={gates * 30 + 4 + i * 7}
          y2={22}
          stroke={ink}
          strokeWidth={2.6}
          strokeLinecap="round"
        />
      ))}
    </svg>
  );
}

/** A numeric series, drawn as the trace on a strip of graph paper someone left behind. */
function Trace({ series, ink }: { series: readonly number[]; ink: string }) {
  if (series.length < 2) return null;
  const lo = Math.min(...series);
  const hi = Math.max(...series);
  const span = hi - lo || 1;
  const step = 72 / (series.length - 1);
  const points = series
    .map((v, i) => `${(i * step).toFixed(1)},${(30 - ((v - lo) / span) * 26).toFixed(1)}`)
    .join(' ');
  return (
    <svg className="br-trace" viewBox="0 0 72 34" width={78} height={36} aria-hidden="true" focusable="false">
      <polyline points={points} fill="none" stroke={ink} strokeWidth={2.4} strokeLinejoin="round" strokeLinecap="round" />
      {series.map((v, i) => (
        <circle key={i} cx={i * step} cy={30 - ((v - lo) / span) * 26} r={2.2} fill={ink} />
      ))}
    </svg>
  );
}

/** Grid positions, drawn as the pattern of tiles that are down versus lifted. */
function Cells({ blocks, ink }: { blocks: readonly number[]; ink: string }) {
  const max = blocks.reduce((m, b) => Math.max(m, b), 0);
  const cols = max >= 9 ? 4 : 3;
  const rows = Math.max(cols, Math.ceil((max + 1) / cols));
  const set = new Set(blocks);
  return (
    <svg
      className="br-cells"
      viewBox={`0 0 ${cols * 11} ${rows * 11}`}
      width={cols * 11}
      height={rows * 11}
      aria-hidden="true"
      focusable="false"
    >
      {Array.from({ length: rows * cols }).map((_, i) => (
        <rect
          key={i}
          x={(i % cols) * 11 + 1}
          y={Math.floor(i / cols) * 11 + 1}
          width={9}
          height={9}
          fill={set.has(i) ? ink : 'none'}
          stroke={ink}
          strokeWidth={1.1}
          strokeOpacity={0.55}
        />
      ))}
    </svg>
  );
}

/**
 * Everything a facet bag has to say, on a label taped up beside the frame.
 *
 * Deliberately additive: an item whose choices differ only on `fill` still reads, because `fill` is
 * drawn rather than dropped. What guarantees distinguishability regardless is the doorway underneath,
 * which is allocated by slot.
 */
function Label({ facets, size = 40 }: { facets: Facets; size?: number }) {
  const ink = inkOf(facets);
  const hasMark =
    facets.shape !== undefined ||
    facets.glyph !== undefined ||
    (facets.color !== undefined && !isFillWord(facets.color));
  const empty =
    !hasMark &&
    facets.text === undefined &&
    facets.value === undefined &&
    facets.count === undefined &&
    facets.note === undefined &&
    !facets.series &&
    !facets.seq &&
    !facets.blocks;

  // Some served types keep their whole payload in a field the adapter does not carry, so the bag
  // arrives empty — QUANT-BALANCE-01 loses its `load` array this way. Drawing a default mark there
  // would invent a distinction the item does not contain and make four identical labels look like a
  // rendering fault. A blank label is the honest state, and the doorway still carries the choice.
  if (empty) {
    return (
      <span className="br-label">
        <span className="br-unmarked" aria-hidden="true" />
      </span>
    );
  }

  return (
    <span className="br-label">
      {facets.text !== undefined ? (
        <span className="br-scrawl" style={{ color: ink }}>
          {facets.text}
        </span>
      ) : null}
      {facets.value !== undefined ? (
        <span className="br-stencil-num" style={{ color: ink }}>
          {facets.value}
        </span>
      ) : null}
      {hasMark ? <Mark facets={facets} size={size} /> : null}
      {facets.series ? <Trace series={facets.series} ink={ink} /> : null}
      {facets.blocks ? <Cells blocks={facets.blocks} ink={ink} /> : null}
      {facets.seq ? (
        <span className="br-seq">
          {facets.seq.map((s, i) => (
            <span key={i} className="br-seqstep" style={{ borderColor: ink, color: ink }}>
              {s}
            </span>
          ))}
        </span>
      ) : null}
      {facets.count !== undefined ? <Tally n={facets.count} ink={ink} /> : null}
      {!hasMark && facets.note !== undefined ? (
        <span className="br-scrawl" style={{ color: ink }}>
          {facets.note}
        </span>
      ) : null}
    </span>
  );
}

/** What the label says out loud, for anyone not reading it with their eyes. */
function spoken(facets: Facets, letter: string): string {
  const bits: string[] = [];
  if (facets.text !== undefined) bits.push(`marked ${facets.text}`);
  if (facets.value !== undefined) bits.push(`numbered ${facets.value}`);
  const mark = facets.shape ?? facets.glyph;
  const mode = fillMode(facets.fill, facets.color);
  const modeWord = mode === 'outline' ? 'an outlined ' : mode === 'hatch' ? 'a shaded ' : 'a solid ';
  if (mark !== undefined) bits.push(`${modeWord}${mark} mark`);
  if (mark === undefined && facets.color !== undefined && !isFillWord(facets.color)) {
    bits.push(`a ${facets.color} mark`);
  }
  if (facets.rot !== undefined) bits.push(`turned ${rotDeg(facets.rot)} degrees`);
  if (facets.tilt !== undefined) bits.push(`${facets.tilt}`);
  if (facets.size !== undefined) bits.push(`size ${facets.size}`);
  if (facets.count !== undefined) bits.push(`${facets.count} tally ${facets.count === 1 ? 'mark' : 'marks'}`);
  if (facets.series) bits.push(`a trace reading ${facets.series.join(', ')}`);
  if (facets.seq) bits.push(`steps ${facets.seq.join(', ')}`);
  if (facets.blocks) bits.push(`${facets.blocks.length} tiles down`);
  return bits.length > 0 ? `Doorway ${letter}, ${bits.join(', ')}` : `Doorway ${letter}`;
}

/* ----------------------------------------------------------------- doorways */

type DoorKind =
  | 'plain'
  | 'double'
  | 'arch'
  | 'service'
  | 'stair'
  | 'hatch'
  | 'vent'
  | 'strips'
  | 'gap'
  | 'breach';

/**
 * Ten silhouettes, and a stencilled letter on top of that.
 *
 * ALLOCATED BY SLOT, NEVER BY HASHING THE FACETS. Hashing collides, and two choices that draw as the
 * same doorway make a perfectly good item unanswerable — it is the bug this whole indirection exists to
 * prevent. `visualChoices` hands out a slot that is unique within a question; this maps it to a shape
 * and a letter, so no two ways out of a junction can look alike.
 */
const DOOR_ORDER: readonly DoorKind[] = [
  'plain',
  'double',
  'arch',
  'service',
  'stair',
  'hatch',
  'vent',
  'strips',
  'gap',
  'breach',
];

const DOOR_NAME: Record<DoorKind, string> = {
  plain: 'a single door',
  double: 'double doors',
  arch: 'an open archway',
  service: 'a service door',
  stair: 'a stairwell down',
  hatch: 'a low hatch',
  vent: 'a vent grate',
  strips: 'a strip curtain',
  gap: 'a gap in the panels',
  breach: 'a hole in the drywall',
};

function doorFor(slot: number): DoorKind {
  return DOOR_ORDER[slot % DOOR_ORDER.length] ?? 'plain';
}

function letterFor(slot: number): string {
  return String.fromCharCode(65 + (slot % 26));
}

function DoorShape({ kind }: { kind: DoorKind }) {
  switch (kind) {
    case 'double':
      return (
        <>
          <rect className="br-leaf" x="12" y="28" width="96" height="180" rx="1" />
          <line className="br-seam" x1="60" y1="28" x2="60" y2="208" />
          <rect className="br-jamb" x="12" y="28" width="96" height="180" rx="1" />
          <circle className="br-fitting" cx="52" cy="122" r="3.2" />
          <circle className="br-fitting" cx="68" cy="122" r="3.2" />
        </>
      );
    case 'arch':
      return (
        <>
          <path className="br-void" d="M22 208 V80 A38 38 0 0 1 98 80 V208 Z" />
          <path className="br-jamb" d="M22 208 V80 A38 38 0 0 1 98 80 V208" />
          <rect className="br-sill" x="18" y="203" width="84" height="6" />
        </>
      );
    case 'service':
      return (
        <>
          <rect className="br-leaf" x="24" y="28" width="72" height="180" rx="1" />
          <rect className="br-pane" x="38" y="44" width="44" height="42" />
          <line className="br-wire" x1="38" y1="58" x2="82" y2="58" />
          <line className="br-wire" x1="38" y1="72" x2="82" y2="72" />
          <line className="br-wire" x1="53" y1="44" x2="53" y2="86" />
          <line className="br-wire" x1="67" y1="44" x2="67" y2="86" />
          <rect className="br-kick" x="24" y="180" width="72" height="28" />
          <rect className="br-jamb" x="24" y="28" width="72" height="180" rx="1" />
          <circle className="br-fitting" cx="86" cy="126" r="3.6" />
        </>
      );
    case 'stair':
      return (
        <>
          <rect className="br-void" x="20" y="44" width="80" height="164" />
          {[0, 1, 2, 3, 4].map((i) => (
            <line
              key={i}
              className="br-step"
              x1={26 + i * 6}
              y1={132 + i * 15}
              x2={94 - i * 6}
              y2={132 + i * 15}
            />
          ))}
          <rect className="br-jamb" x="20" y="44" width="80" height="164" />
        </>
      );
    case 'hatch':
      return (
        <>
          <rect className="br-void" x="10" y="112" width="100" height="96" />
          <rect className="br-lintel" x="4" y="102" width="112" height="12" />
          <rect className="br-jamb" x="10" y="112" width="100" height="96" />
        </>
      );
    case 'vent':
      return (
        <>
          <rect className="br-void" x="26" y="62" width="68" height="122" />
          {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
            <rect key={i} className="br-slat" x="30" y={68 + i * 14} width="60" height="7" />
          ))}
          <rect className="br-jamb" x="26" y="62" width="68" height="122" />
          {[
            [32, 68],
            [88, 68],
            [32, 178],
            [88, 178],
          ].map(([cx, cy], i) => (
            <circle key={i} className="br-fitting" cx={cx} cy={cy} r={2.2} />
          ))}
        </>
      );
    case 'strips':
      return (
        <>
          <rect className="br-void" x="20" y="38" width="80" height="170" />
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <rect key={i} className="br-strip" x={22 + i * 13} y="38" width="11" height="170" />
          ))}
          <rect className="br-lintel" x="16" y="30" width="88" height="10" />
          <rect className="br-jamb" x="20" y="38" width="80" height="170" />
        </>
      );
    case 'gap':
      return (
        <>
          <rect className="br-void" x="48" y="20" width="24" height="188" />
          <line className="br-seam" x1="40" y1="20" x2="40" y2="208" />
          <line className="br-seam" x1="80" y1="20" x2="80" y2="208" />
          <rect className="br-jamb" x="48" y="20" width="24" height="188" />
        </>
      );
    case 'breach':
      return (
        <>
          <path
            className="br-void"
            d="M30 208 L24 138 L38 100 L30 66 L54 46 L86 56 L96 92 L86 134 L98 208 Z"
          />
          <path
            className="br-torn"
            d="M30 208 L24 138 L38 100 L30 66 L54 46 L86 56 L96 92 L86 134 L98 208"
          />
          <path className="br-tornedge" d="M36 196 L32 140 L44 106 L37 72 L57 55 L82 64" />
        </>
      );
    case 'plain':
    default:
      return (
        <>
          <rect className="br-leaf" x="22" y="28" width="76" height="180" rx="1" />
          <rect className="br-panel" x="32" y="42" width="56" height="66" />
          <rect className="br-panel" x="32" y="124" width="56" height="66" />
          <rect className="br-jamb" x="22" y="28" width="76" height="180" rx="1" />
          <circle className="br-fitting" cx="86" cy="120" r="3.6" />
        </>
      );
  }
}

/** One way out of the junction: a doorway, a stencilled letter and whatever is taped beside it. */
function Doorway({ slot, children }: { slot: number; children?: ReactNode }) {
  const kind = doorFor(slot);
  const letter = letterFor(slot);
  return (
    <span className="br-doorway">
      <span className="br-plate">{children}</span>
      <svg
        className="br-door"
        viewBox="0 0 120 228"
        preserveAspectRatio="xMidYMax meet"
        aria-hidden="true"
        focusable="false"
      >
        <rect className="br-sign" x="34" y="2" width="52" height="20" rx="1" />
        <text className="br-signletter" x="60" y="16" textAnchor="middle">
          {letter}
        </text>
        <ellipse className="br-cast" cx="60" cy="212" rx="52" ry="9" />
        <g transform="translate(0 -6)">
          <DoorShape kind={kind} />
        </g>
      </svg>
    </span>
  );
}

/* ------------------------------------------------------------------ the stem */

/**
 * The junction's own wording, derived from the stem's SHAPE rather than lifted from `question.ask`.
 *
 * The bank speaks like an exam paper. Printing that here would put an exam inside the corridor, which
 * is the one thing the whole surface exists to avoid, so every kind gets a line written for this place.
 */
function junctionLine(stem: StemKind | undefined): { readonly found: string; readonly go: string } {
  switch (stem?.kind) {
    case 'compare':
      return {
        found: 'Someone kept a count on both walls.',
        go: 'Take the doorway under the larger count.',
      };
    case 'matrix':
      return {
        found: 'The floor tiles run to a pattern. One has been lifted.',
        go: 'Take the doorway carrying the tile that goes back.',
      };
    case 'transform':
      return {
        found: 'A service panel. Something goes in, the switches act on it in order.',
        go: 'Take the doorway showing what comes out.',
      };
    case 'constraints':
      return {
        found: 'Notes on the wall, left by whoever came through before you.',
        go: 'Take the doorway that fits every note.',
      };
    case 'passage':
      return {
        found: 'A page, torn out and left on the carpet.',
        go: 'Take the doorway that answers it.',
      };
    case 'pairs':
      return {
        found: 'Marks on the wall in pairs. One pair was not made the same way as the rest.',
        go: 'Take the corridor under the odd pair.',
      };
    case 'target':
      return {
        found: 'Something is pinned beside the frame.',
        go: 'Take the doorway that matches it.',
      };
    default:
      // Nothing is asserted about the walls here, because for a `plain` stem there is genuinely
      // nothing on them: the adapter carries no material, only the choices. Claiming a pattern the
      // child cannot see would be worse than admitting the junction is bare.
      return {
        found: 'Nothing written up here.',
        go: 'Go on what the doorways themselves carry.',
      };
  }
}

/** The junction, drawn as things you would find in a room nobody maintains. */
function Stem({ question }: { question: Question }) {
  const s = question.stem;

  if (s.kind === 'compare') {
    return (
      <div className="br-walls">
        {([
          ['This wall', s.left],
          ['That wall', s.right],
        ] as const).map(([name, side], i) => (
          <div key={i} className="br-wallcount">
            <span className="br-wallname">{name}</span>
            <span className="br-scratched">
              <Label facets={side} size={48} />
            </span>
          </div>
        ))}
      </div>
    );
  }

  if (s.kind === 'matrix') {
    return (
      <div className="br-tiles" style={{ gridTemplateColumns: `repeat(${s.cols}, 1fr)` }}>
        {s.cells.map((cell, i) => (
          <div key={i} className={cell === null ? 'br-tile lifted' : 'br-tile'}>
            {cell === null ? (
              <span className="br-tilegap" aria-label="lifted tile" />
            ) : (
              <Label facets={cell} size={34} />
            )}
          </div>
        ))}
      </div>
    );
  }

  if (s.kind === 'transform') {
    return (
      <div className="br-panel-unit">
        <div className="br-window">
          <span className="br-windowcap">In</span>
          <Label facets={s.input} size={44} />
        </div>
        <div className="br-switches">
          {s.chain.map((op, i) => (
            <span key={i} className="br-switch">
              <span className="br-switchno">{i + 1}</span>
              {op}
            </span>
          ))}
        </div>
        <div className="br-window unknown">
          <span className="br-windowcap">Out</span>
          <span className="br-unknown" aria-label="unknown" />
        </div>
        {s.vocabulary.length > 0 ? (
          <p className="br-legend">
            <span className="br-legendcap">Panel legend</span>
            {s.vocabulary.join(' · ')}
          </p>
        ) : null}
      </div>
    );
  }

  if (s.kind === 'constraints') {
    return (
      <ul className="br-notes">
        {s.clues.map((clue, i) => (
          <li key={i} className="br-note" style={{ ['--lean' as string]: `${((i % 3) - 1) * 0.7}deg` } as CSSProperties}>
            {clue}
          </li>
        ))}
      </ul>
    );
  }

  if (s.kind === 'passage') {
    return (
      <article className="br-page">
        {s.title ? <h3 className="br-pagetitle">{s.title}</h3> : null}
        {s.sentences.map((line, i) => (
          <p key={i}>{line}</p>
        ))}
        {s.question ? <p className="br-pageq">{s.question}</p> : null}
      </article>
    );
  }

  if (s.kind === 'pairs') {
    // The rows ARE the choices here, so they are drawn on the doorways rather than duplicated up top.
    return <p className="br-aside">Each corridor below is one of the pairs.</p>;
  }

  if (s.kind === 'target') {
    return (
      <div className="br-pinned">
        <span className="br-pincap">Pinned up</span>
        <div className="br-pinrow">
          {s.target.map((f, i) => (
            <span key={i} className="br-pinitem">
              <Label facets={f} size={38} />
            </span>
          ))}
        </div>
        {s.note ? <span className="br-pinnote">{s.note}</span> : null}
      </div>
    );
  }

  return null;
}

/* ------------------------------------------------------------------ the room */

/** Grain, as an inline turbulence filter. No image is fetched; the noise is generated in the document. */
function Grain() {
  return (
    <svg className="br-grain" aria-hidden="true" focusable="false">
      <filter id="br-grain-filter">
        <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="3" stitchTiles="stitch" />
        <feColorMatrix type="saturate" values="0" />
      </filter>
      <rect width="100%" height="100%" filter="url(#br-grain-filter)" />
    </svg>
  );
}

/** Level 0. Mono-yellow, damp tiles, one continuous strip light, and no way to tell how big it is. */
function Room() {
  return (
    <div className="br-room" aria-hidden="true">
      <div className="br-ceiling">
        <div className="br-ceiling-plane">
          {[4, 14, 28, 46, 70, 96].map((top) => (
            <span key={top} className="br-tube" style={{ top: `${top}%` }} />
          ))}
        </div>
      </div>
      <div className="br-far" />
      <div className="br-carpet">
        <div className="br-carpet-plane" />
      </div>
      <div className="br-sidewall left" />
      <div className="br-sidewall right" />
      <div className="br-damp" />
      <Grain />
      <div className="br-vignette" />
    </div>
  );
}

/* ------------------------------------------------------------------- the run */

export default function Backrooms() {
  const [depth, setDepth] = useState(0);
  const [lead, setLead] = useState(LEAD_MAX);
  const [picked, setPicked] = useState<string | null>(null);
  const [progress, setProgress] = useState<Progress>(() => loadProgress(meta.id));
  const [email, setEmail] = useState('');
  const [listed, setListed] = useState(false);

  const session = useQuestionSession({
    ageBand: '6-8',
    // Standard: 8 to 16 junctions, comfortably under fifteen minutes for this band.
    precisionIndex: 2,
    onAnswered: ({ correct }) => {
      if (correct === true) {
        // Ground gained. Depth climbs faster and the thing behind falls back.
        setDepth((d) => d + STRIDE_AHEAD);
        setLead((l) => clamp(l + LEAD_GAIN, LEAD_MIN, LEAD_MAX));
      } else if (correct === false) {
        // Still moving, just slower, and it uses the time to close. Nothing is taken away.
        setDepth((d) => d + STRIDE_SLOW);
        setLead((l) => clamp(l - LEAD_LOSS, LEAD_MIN, LEAD_MAX));
      } else {
        // The server could not mark it, so it changes nothing but the distance walked.
        setDepth((d) => d + STRIDE_SLOW);
      }
      setPicked(null);
    },
    onFinished: (result) => {
      setProgress(recordRound(meta.id, result.itemsServed).progress);
    },
  });

  const choose = useCallback(
    async (choice: Choice) => {
      if (session.busy) return;
      setPicked(choice.key);
      await session.answer(choice);
    },
    [session],
  );

  const restart = useCallback(() => {
    setDepth(0);
    setLead(LEAD_MAX);
    setPicked(null);
    setEmail('');
    setListed(false);
    session.reset();
  }, [session]);

  /**
   * The list is a demo of the call to action and nothing else.
   *
   * There is no fetch, no storage and no analytics behind this: the handler flips one piece of local
   * state and `email` never leaves the component. A prototype that quietly collected a child's address
   * would be a different kind of thing entirely.
   */
  const addToList = useCallback((e: FormEvent) => {
    e.preventDefault();
    setListed(true);
  }, []);

  const close = cellsLit(lead);
  const behind = BEHIND_YOU[close] ?? BEHIND_YOU[0] ?? 'nothing yet';
  const line = junctionLine(session.question?.stem);
  const finished = session.phase === 'finished';
  // The engine's own classification decides the ending, not a threshold invented here.
  const escaped = session.result?.decision === 'recommend';
  // A finished run always has distance on it. If the per-answer counter never ran, the junctions the
  // engine actually served still describe how far they walked, so the payoff cannot read "0 metres".
  const endDepth = Math.max(depth, (session.result?.asked ?? 0) * STRIDE_SLOW);

  const vcs = useMemo(
    () => (session.question ? visualChoices(session.question.choices) : []),
    [session.question],
  );

  /** For odd-pair items the row is the choice, so the doorway carries the pair itself. */
  const pairRows = session.question?.stem.kind === 'pairs' ? session.question.stem.rows : null;

  const expected = session.expectedItems;

  return (
    <div
      className="br"
      data-phase={session.phase}
      style={{ ['--close' as string]: String(close) } as CSSProperties}
    >
      <Room />

      <div className="br-stage">
        <header className="br-hud">
          <span className="br-hudcell">
            <span className="br-hudcap">Level</span>
            <span className="br-hudval">0</span>
            <span className="br-hudsub">the lobby</span>
          </span>
          <span className="br-hudcell wide">
            <span className="br-hudcap">Depth</span>
            <span className="br-hudval big">
              {depth}
              <span className="br-unit">m</span>
            </span>
          </span>
          <span className="br-hudcell wide">
            <span className="br-hudcap">Behind you</span>
            <span className="br-meter" role="img" aria-label={`Behind you: ${behind}`}>
              {Array.from({ length: CELLS }).map((_, i) => (
                <span key={i} className={i < close ? 'br-cell on' : 'br-cell'} />
              ))}
            </span>
            <span className="br-hudsub">{behind}</span>
          </span>
          <span className="br-hudcell">
            <span className="br-hudcap">Rooms</span>
            <span className="br-hudval">
              {session.asked}
              {expected ? <span className="br-unit">of ~{expected.max}</span> : null}
            </span>
          </span>
        </header>

        <main className="br-junction">
          {session.phase === 'idle' ? (
            <div className="br-entrywrap">
              <section className="br-entry">
                <p className="br-kicker">Level 0 · no entities · no escape logged</p>
                <h2>You noclipped out.</h2>
                <p className="br-lede">
                  Damp carpet, mono-yellow walls, strip lights that never quite settle, and no windows
                  in any direction. Nothing behind you yet. Ahead, one way on.
                </p>
                <p className="br-lede">
                  Every junction is a room with doorways out of it. Read what is on the walls, take the
                  doorway that follows from it, keep moving. A bad door never sends you back. It costs
                  you ground, and the thing behind you uses that.
                </p>
                <p className="br-fineprint">
                  {expected
                    ? `Roughly ${expected.min} to ${expected.max} junctions.`
                    : 'Roughly a dozen junctions.'}
                  {progress.rounds > 0
                    ? ` You have been down here ${progress.rounds} ${progress.rounds === 1 ? 'time' : 'times'} before.`
                    : ''}
                </p>
              </section>

              {/* One door, in the same visual language every junction uses. A button here would be the
                  only control in the whole run that is not a way out of a room. */}
              <div className="br-entrydoor">
                <button
                  type="button"
                  className="br-choice br-firstdoor"
                  onClick={() => void session.start()}
                  aria-label="Go in. The only doorway out of this room."
                >
                  <Doorway slot={0}>
                    <span className="br-scrawl">Go in</span>
                  </Doorway>
                </button>
              </div>
            </div>
          ) : null}

          {session.phase === 'starting' ? <p className="br-waiting">The lights are coming up…</p> : null}

          {session.phase === 'error' ? (
            <section className="br-entry">
              <h2>The corridor went dark.</h2>
              <p className="br-lede">The rooms stopped loading. Nothing lost — the way back in is here.</p>
              <p className="br-fineprint">{session.error}</p>
              <div className="br-entrydoor">
                <button type="button" className="br-go" onClick={restart}>
                  Go in again
                </button>
              </div>
            </section>
          ) : null}

          {session.phase === 'asking' && !session.question ? (
            <p className="br-waiting">Walking…</p>
          ) : null}

          {session.phase === 'asking' && session.question ? (
            <section className="br-fork" key={session.question.itemId}>
              <div className="br-brief">
                <p className="br-found">{line.found}</p>
                <div className="br-material">
                  <Stem question={session.question} />
                </div>
                <p className="br-go-line">{line.go}</p>
              </div>

              <div className={`br-doors n${Math.min(vcs.length, 8)}`}>
                {vcs.map((vc) => {
                  const letter = letterFor(vc.slot);
                  const row = pairRows?.find((r) => r.key === vc.choice.key);
                  const spokenLabel = row
                    ? `Corridor ${letter}, a pair: ${spoken(row.left, letter)} and ${spoken(row.right, letter)}`
                    : spoken(vc.facets, letter);
                  return (
                    <button
                      key={vc.choice.key}
                      type="button"
                      className={`br-choice${picked === vc.choice.key ? ' taken' : ''}`}
                      disabled={session.busy}
                      onClick={() => void choose(vc.choice)}
                      aria-label={`${spokenLabel}. ${DOOR_NAME[doorFor(vc.slot)]}.`}
                    >
                      <Doorway slot={vc.slot}>
                        {row ? (
                          <span className="br-pair">
                            <Label facets={row.left} />
                            <span className="br-pairlink" aria-hidden="true" />
                            <Label facets={row.right} />
                          </span>
                        ) : (
                          <Label facets={vc.facets} />
                        )}
                      </Doorway>
                    </button>
                  );
                })}
              </div>
            </section>
          ) : null}

          {finished && session.result ? (
            <section className={escaped ? 'br-end escaped' : 'br-end descent'}>
              {escaped ? (
                <>
                  <p className="br-kicker exit">Exit · Level 0 cleared</p>
                  <h2>You found a door that opened outward.</h2>
                  <p className="br-lede">
                    {endDepth} metres in, {session.result.asked} junctions, and you were still ahead of
                    it when the door gave. Most runs end at a stairwell.
                  </p>
                  <div className="br-cta">
                    {listed ? (
                      <p className="br-listed">
                        Logged at {endDepth} m. You are on the board.
                      </p>
                    ) : (
                      <form className="br-listform" onSubmit={addToList}>
                        <label className="br-listlabel" htmlFor="br-email">
                          There is a list of everyone who got out, ranked by depth. Put yourself on it.
                        </label>
                        <div className="br-listrow">
                          <input
                            id="br-email"
                            className="br-input"
                            type="email"
                            inputMode="email"
                            autoComplete="off"
                            placeholder="you@somewhere"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                          />
                          <button type="submit" className="br-go small">
                            Add me at {endDepth} m
                          </button>
                        </div>
                      </form>
                    )}
                    <p className="br-fineprint">
                      Prototype. Nothing is sent, stored or read — the field is here to show the moment,
                      not to collect anything.
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <p className="br-kicker">Stairwell · Level 1 below</p>
                  <h2>The corridor ended in stairs going down.</h2>
                  <p className="br-lede">
                    {endDepth} metres and {session.result.asked} junctions before the floor dropped
                    away. That is further than most get on a first run. Level 1 is down there; Level 0
                    is still behind you, and it is still walkable.
                  </p>
                </>
              )}

              <div className="br-endrow">
                <button type="button" className="br-go" onClick={restart}>
                  Walk it again
                </button>
                <span className="br-tally-line">
                  {progress.rounds} {progress.rounds === 1 ? 'run' : 'runs'} · {progress.items} rooms
                  walked
                </span>
              </div>
            </section>
          ) : null}
        </main>
      </div>
    </div>
  );
}
