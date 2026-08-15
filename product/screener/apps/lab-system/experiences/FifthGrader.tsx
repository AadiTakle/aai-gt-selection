import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import type { Choice, Facets, Question } from '../shared/headless/adapt';
import { visualChoices } from '../shared/headless/distinct';
import { useQuestionSession } from '../shared/headless/useQuestionSession';
import { loadProgress, recordRound, type Progress } from '../shared/progression';
import type { ExperienceMeta } from '../shared/types';
import './FifthGrader.css';

/**
 * A television studio, a gold ladder and three classmates on your team.
 *
 * The library is consumed headlessly, the same way MinecraftBuild consumes it: no catalogue renderer,
 * no iframe. A normalised question arrives and the studio draws it — the stem becomes the clue board
 * behind the host, and every option becomes a lit podium on the studio floor.
 *
 * THE LOOP. A right answer climbs a rung of the ladder, which is graded 1st through 8th, so climbing
 * past the fifth rung is literally the framing question: is this child working above their grade. A
 * wrong answer never drops a rung and is never shown as wrong. A classmate steps in and takes it, and
 * there are three of them. When a wrong answer arrives with nobody left to call on, the curtain comes
 * down on whatever rung they reached and that is the end of the run — warmly, with the rung banked.
 *
 * THE VERDICT IS THE ENGINE'S, NOT THE LADDER'S. The ladder is the feel of the thing minute to minute;
 * the closing line comes from `result.decision`, which is the engine's own confidence about whether the
 * child is above the threshold. When it says `recommend` the ladder lights to the top and the show says
 * so. Anything else banks the rung they reached and says nothing about what it does not know.
 *
 * PODIUM IDENTITY COMES FROM THE SLOT, NEVER FROM THE FACETS. This is load-bearing rather than tidy.
 * Measured against the live bank, a large share of what the engine serves this band adapts to an EMPTY
 * facet bag — every option of SPA-XSCAN-01 and SPA-VIEW-01, both sides of a QUANT-DOTS-01 comparison,
 * every load on QUANT-BALANCE-01. Those options are only distinguishable at all because
 * `visualChoices` hands out a unique slot per choice, and the podium's letter, number and accent are
 * driven by it. The facets, where they exist, are drawn faithfully on the podium screen on top of that,
 * so an item whose rule is about colour or count still reads the way its author meant it to.
 */

export const meta: ExperienceMeta = {
  id: 'fifth-grader',
  title: 'Smarter Than a 5th Grader?',
  world: 'Game show',
  band: '4-5',
  pull: 'Climb the ladder. Three classmate helps',
  accent: '#f2c744',
};

/* ------------------------------------------------------------------ the set */

interface Rung {
  readonly grade: string;
  readonly tag: string;
  /** Above the fifth rung is the part of the ladder the whole framing is about. */
  readonly above: boolean;
}

/**
 * Eight rungs, because the engine at this precision serves at least eight questions, so a perfect run
 * can always reach the top and the top is never decoration.
 */
const RUNGS: readonly Rung[] = [
  { grade: '1st grade', tag: '', above: false },
  { grade: '2nd grade', tag: '', above: false },
  { grade: '3rd grade', tag: '', above: false },
  { grade: '4th grade', tag: '', above: false },
  { grade: '5th grade', tag: 'Grade level', above: false },
  { grade: '6th grade', tag: 'Above grade', above: true },
  { grade: '7th grade', tag: 'Above grade', above: true },
  { grade: '8th grade', tag: 'Top of the ladder', above: true },
];

const TOP = RUNGS.length;

interface Classmate {
  readonly name: string;
  readonly hue: string;
}

const CLASSMATES: readonly Classmate[] = [
  { name: 'Nia', hue: '#4fd6e0' },
  { name: 'Theo', hue: '#ff8b6b' },
  { name: 'Sam', hue: '#b98bff' },
];

/** The engine's domains, said the way a studio would say them. */
const CATEGORY: Record<string, { name: string; sub: string }> = {
  quantitative: { name: 'Numbers', sub: 'the counting board' },
  verbal: { name: 'Words', sub: 'the reading board' },
  spatial: { name: 'Shapes & Space', sub: 'the turning board' },
  fluid: { name: 'Patterns', sub: 'the thinking board' },
};

/**
 * One distinct accent per podium.
 *
 * Eight of them, because seven options is the widest the bank serves. Two podia never share one, which
 * is what keeps a question answerable when the options themselves carry nothing to look at.
 */
const SLOT_ACCENTS: readonly string[] = [
  '#f2c744',
  '#4fd6e0',
  '#ff8b6b',
  '#b98bff',
  '#6fe0a8',
  '#ff7ba8',
  '#74b6ff',
  '#ffb03a',
];

function accentFor(slot: number): string {
  return SLOT_ACCENTS[slot % SLOT_ACCENTS.length] ?? '#f2c744';
}

function letterFor(slot: number): string {
  return String.fromCharCode(65 + (slot % 26));
}

/* -------------------------------------------------------------- facet paint */

/** Colour words the bank uses, given studio-bright values so they read on a dark stage. */
const COLOR_TOKENS: Record<string, string> = {
  gold: '#f2c744',
  amber: '#ffb03a',
  yellow: '#ffd83a',
  orange: '#ff9a3c',
  coral: '#ff8b6b',
  red: '#ff6b5e',
  rose: '#ff7ba8',
  pink: '#ff8ac4',
  violet: '#b98bff',
  purple: '#a06cff',
  indigo: '#8f8bff',
  blue: '#5b8dff',
  sky: '#74b6ff',
  cyan: '#4fd6e0',
  teal: '#3fc8b4',
  mint: '#6fe0a8',
  green: '#5cc96a',
  lime: '#c8e04a',
  brown: '#c08a55',
  silver: '#cdd6e6',
  grey: '#9aa4b8',
  gray: '#9aa4b8',
  white: '#f6f1e4',
  black: '#5b6480',
};

function hashOf(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}

/** A colour token, or a stable studio colour for a word this map has never seen. */
function paintFor(token: string | undefined, fallback: string): string {
  if (!token) return fallback;
  const named = COLOR_TOKENS[token.toLowerCase()];
  if (named) return named;
  const spread = Object.values(COLOR_TOKENS);
  return spread[hashOf(token) % spread.length] ?? fallback;
}

/** Named silhouettes, in a 100 x 100 box. Anything unnamed becomes a polygon instead. */
const SHAPE_PATHS: Record<string, string> = {
  square: 'M18 18 H82 V82 H18 Z',
  rect: 'M12 26 H88 V74 H12 Z',
  triangle: 'M50 14 L87 84 H13 Z',
  diamond: 'M50 10 L88 50 L50 90 L12 50 Z',
  hex: 'M50 11 L84 30 L84 70 L50 89 L16 70 L16 30 Z',
  hexagon: 'M50 11 L84 30 L84 70 L50 89 L16 70 L16 30 Z',
  pentagon: 'M50 11 L88 39 L73 84 H27 L12 39 Z',
  star: 'M50 8 L61 37 L92 38 L67 57 L76 88 L50 70 L24 88 L33 57 L8 38 L39 37 Z',
  drop: 'M50 8 C71 34 83 49 83 63 A33 33 0 0 1 17 63 C17 49 29 34 50 8 Z',
  teardrop: 'M50 8 C71 34 83 49 83 63 A33 33 0 0 1 17 63 C17 49 29 34 50 8 Z',
  arrow: 'M50 8 L80 44 H63 V90 H37 V44 H20 Z',
  bolt: 'M58 6 L25 55 H46 L39 94 L76 41 H53 Z',
  crescent: 'M67 10 A41 41 0 1 0 67 90 A32 32 0 1 1 67 10 Z',
  moon: 'M67 10 A41 41 0 1 0 67 90 A32 32 0 1 1 67 10 Z',
  leaf: 'M15 85 C15 41 44 13 85 13 C85 57 56 85 15 85 Z',
  zigzag: 'M9 32 L30 62 L50 32 L70 62 L91 32 L91 52 L70 82 L50 52 L30 82 L9 52 Z',
  cross: 'M38 10 H62 V38 H90 V62 H62 V90 H38 V62 H10 V38 H38 Z',
  plus: 'M38 10 H62 V38 H90 V62 H62 V90 H38 V62 H10 V38 H38 Z',
  boot: 'M33 9 H57 V52 C57 61 63 66 76 70 C87 74 91 81 91 91 H33 Z',
  comma: 'M42 12 A26 26 0 1 0 42 64 C58 64 63 77 51 91 C80 81 89 55 80 34 C72 16 57 8 42 12 Z',
  trefoil:
    'M50 15 A17 17 0 1 1 49.9 15 Z M27 63 A17 17 0 1 1 26.9 63 Z M73 63 A17 17 0 1 1 72.9 63 Z',
  heart: 'M50 88 C14 63 10 41 24 29 C36 19 47 25 50 34 C53 25 64 19 76 29 C90 41 86 63 50 88 Z',
  cloud: 'M28 74 A19 19 0 0 1 30 37 A24 24 0 0 1 74 40 A18 18 0 0 1 72 74 Z',
};

/** Shapes that only read as a line. Filling them turns them into a blob. */
const STROKE_ONLY = new Set(['spiral', 'wave', 'squiggle']);

const SPIRAL =
  'M70 50 A20 20 0 1 1 50 30 A28 28 0 1 0 78 58 A36 36 0 1 1 42 22 A44 44 0 1 0 86 66';

/** A regular polygon, so an unnamed token still draws as a stable, distinct silhouette. */
function polygonFor(token: string): string {
  const h = hashOf(token);
  const sides = 3 + (h % 6);
  const spin = ((h >> 3) % 8) * (Math.PI / 8);
  const pts: string[] = [];
  for (let i = 0; i < sides; i++) {
    const a = spin - Math.PI / 2 + (i * 2 * Math.PI) / sides;
    pts.push(`${(50 + 39 * Math.cos(a)).toFixed(1)} ${(50 + 39 * Math.sin(a)).toFixed(1)}`);
  }
  return `M${pts.join(' L')} Z`;
}

function scaleFor(size: number | string | undefined): number {
  if (size === undefined) return 1;
  if (typeof size === 'number') {
    // Tile scales run about 1 to 3; dot radii run about 10 to 22. Both stay ordered either way.
    if (size <= 4) return 0.74 + Math.min(size, 4) * 0.12;
    return 0.72 + Math.min(1, size / 26) * 0.5;
  }
  const t = size.toLowerCase();
  if (t.startsWith('s') || t === 'tiny' || t === 'xs') return 0.72;
  if (t.startsWith('b') || t.startsWith('l') || t === 'huge') return 1.16;
  return 0.94;
}

/**
 * One facet bag as a lit emblem.
 *
 * Every facet the bag carries is drawn rather than dropped: `shape` picks the silhouette, `color` its
 * paint, `fill` whether it is solid or an outline, `size` how big, `tilt` and `rot` which way it leans,
 * and `count` a row of pips beneath it so magnitude survives. Dropping any of them is what makes two
 * genuinely different options look like the same thing.
 */
function Emblem({ facets, tone }: { facets: Facets; tone: string }) {
  const token = facets.shape ?? facets.glyph ?? facets.color ?? '';
  const round = token === '' || token === 'circle' || token === 'dot' || token === 'orb';
  const stroked = STROKE_ONLY.has(token);
  const path = stroked ? SPIRAL : (SHAPE_PATHS[token] ?? polygonFor(token));
  const paint = paintFor(facets.color ?? facets.fill, tone);
  const hollow =
    facets.fill === 'hollow' || facets.fill === 'outline' || facets.fill === 'open' || stroked;
  const scale = scaleFor(facets.size);
  const lean = facets.tilt === 'leaning' || facets.tilt === 'tilted' ? -15 : 0;
  const spin = (facets.rot ?? 0) + lean;
  const pips = Math.max(0, Math.min(8, facets.count ?? 0));

  return (
    <span className="fg-emblem">
      <svg viewBox="0 0 100 100" role="presentation" focusable="false">
        <g transform={`rotate(${spin} 50 50) translate(50 50) scale(${scale.toFixed(3)}) translate(-50 -50)`}>
          {round ? (
            <circle
              cx="50"
              cy="50"
              r="37"
              fill={hollow ? 'none' : paint}
              stroke={paint}
              strokeWidth={hollow ? 9 : 0}
            />
          ) : (
            <path
              d={path}
              fill={hollow ? 'none' : paint}
              stroke={paint}
              strokeWidth={hollow ? 9 : 0}
              strokeLinejoin="round"
              strokeLinecap="round"
            />
          )}
        </g>
      </svg>
      {pips > 0 ? (
        <span className="fg-pips" aria-hidden="true">
          {Array.from({ length: pips }).map((_, i) => (
            <span key={i} className="fg-pip" style={{ background: paint }} />
          ))}
        </span>
      ) : null}
    </span>
  );
}

/** A numeric series as a studio graph. Ordered, so the shape of the line is the whole content. */
function Trace({ series, tone }: { series: readonly number[]; tone: string }) {
  const lo = Math.min(...series, 0);
  const hi = Math.max(...series, 1);
  const span = hi - lo || 1;
  const step = series.length > 1 ? 100 / (series.length - 1) : 100;
  const pts = series.map((v, i) => `${(i * step).toFixed(1)},${(56 - ((v - lo) / span) * 48).toFixed(1)}`);
  return (
    <span className="fg-trace">
      <svg viewBox="-6 0 112 64" role="presentation" focusable="false">
        <line x1="-4" y1="58" x2="104" y2="58" stroke="rgba(246,241,228,0.24)" strokeWidth="1.5" />
        <polyline
          points={pts.join(' ')}
          fill="none"
          stroke={tone}
          strokeWidth="4"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        {series.map((v, i) => (
          <circle
            key={i}
            cx={(i * step).toFixed(1)}
            cy={(56 - ((v - lo) / span) * 48).toFixed(1)}
            r="4.5"
            fill={tone}
          />
        ))}
      </svg>
    </span>
  );
}

/** Grid positions as a lit panel. The bank places these on a four-by-four board. */
function Panel({ blocks, tone }: { blocks: readonly number[]; tone: string }) {
  const highest = blocks.reduce((m, b) => Math.max(m, b), 0);
  const side = highest > 24 ? 6 : highest > 15 ? 5 : 4;
  const on = new Set(blocks);
  return (
    <span className="fg-panel" style={{ gridTemplateColumns: `repeat(${side}, 1fr)` }}>
      {Array.from({ length: side * side }).map((_, i) => (
        <span
          key={i}
          className={on.has(i) ? 'fg-cellon' : 'fg-celloff'}
          style={on.has(i) ? { background: tone, color: tone } : undefined}
        />
      ))}
    </span>
  );
}

/** A move sequence as a run of chips, in order, because the order is the answer. */
function Moves({ seq, tone }: { seq: readonly string[]; tone: string }) {
  return (
    <span className="fg-moves">
      {seq.map((m, i) => (
        <span key={i} className="fg-move" style={{ borderColor: tone, color: tone }}>
          {m}
        </span>
      ))}
    </span>
  );
}

/** Counted dots at their true radius, so a comparison stays the comparison the item intended. */
function DotField({ facets }: { facets: Facets }) {
  const n = Math.max(0, Math.min(30, facets.count ?? 0));
  const r = typeof facets.size === 'number' ? facets.size : 15;
  const px = Math.max(7, Math.min(20, r * 0.78));
  return (
    <span className="fg-dotfield">
      {Array.from({ length: n }).map((_, i) => (
        <span key={i} className="fg-dot" style={{ width: px, height: px }} />
      ))}
    </span>
  );
}

/**
 * Whether this bag has anything at all to draw.
 *
 * Several types the engine serves adapt to a bag with nothing in it, and a podium showing nothing is
 * indistinguishable from a broken one. Asking first lets the podium put its own letter up on the
 * screen instead, which is a real thing a studio does rather than a hole where content should be.
 */
function hasContent(f: Facets): boolean {
  return (
    f.text !== undefined ||
    f.value !== undefined ||
    f.shape !== undefined ||
    f.glyph !== undefined ||
    f.color !== undefined ||
    f.fill !== undefined ||
    f.count !== undefined ||
    f.size !== undefined ||
    f.note !== undefined ||
    (f.series?.length ?? 0) > 1 ||
    (f.blocks?.length ?? 0) > 0 ||
    (f.seq?.length ?? 0) > 0
  );
}

/** Whatever the facet bag actually carries, on the podium screen. */
function FacetScreen({ facets, tone }: { facets: Facets; tone: string }) {
  if (facets.text !== undefined) {
    return <span className={facets.text.length > 26 ? 'fg-words long' : 'fg-words'}>{facets.text}</span>;
  }
  if (facets.value !== undefined && facets.shape === undefined && facets.glyph === undefined) {
    return <span className="fg-number">{facets.value}</span>;
  }
  if (facets.series && facets.series.length > 1) return <Trace series={facets.series} tone={tone} />;
  if (facets.blocks && facets.blocks.length > 0) return <Panel blocks={facets.blocks} tone={tone} />;
  if (facets.seq && facets.seq.length > 0) return <Moves seq={facets.seq} tone={tone} />;
  if (
    facets.shape !== undefined ||
    facets.glyph !== undefined ||
    facets.color !== undefined ||
    facets.fill !== undefined ||
    facets.count !== undefined ||
    facets.size !== undefined
  ) {
    return <Emblem facets={facets} tone={tone} />;
  }
  if (facets.note !== undefined) return <span className="fg-words">{facets.note}</span>;
  return null;
}

/** A short spoken description of a podium, so the run works without looking at it. */
function describeFacets(facets: Facets): string {
  const bits: string[] = [];
  if (facets.text !== undefined) bits.push(facets.text);
  if (facets.value !== undefined) bits.push(String(facets.value));
  if (facets.size !== undefined) bits.push(String(facets.size));
  if (facets.color !== undefined) bits.push(facets.color);
  if (facets.fill !== undefined) bits.push(facets.fill);
  if (facets.tilt !== undefined) bits.push(facets.tilt);
  if (facets.shape ?? facets.glyph) bits.push(String(facets.shape ?? facets.glyph));
  if (facets.count !== undefined) bits.push(`${facets.count} marks`);
  if (facets.seq) bits.push(`moves ${facets.seq.join(', ')}`);
  if (facets.series) bits.push(`line ${facets.series.join(', ')}`);
  if (facets.blocks) bits.push(`${facets.blocks.length} lit squares`);
  return bits.join(', ');
}

/* ------------------------------------------------------------ the clue board */

/**
 * The question's setup, dressed as the board behind the host.
 *
 * Every stem the adapter can produce has a branch here. An untreated one renders nothing, and a
 * question with nothing on the board is a question nobody can answer.
 */
function ClueBoard({ question }: { question: Question }) {
  const s = question.stem;

  if (s.kind === 'compare') {
    return (
      <div className="fg-compare">
        <div className="fg-half">
          <span className="fg-halftag">Left board</span>
          <div className="fg-halfbody">
            <DotField facets={s.left} />
          </div>
        </div>
        <span className="fg-versus">vs</span>
        <div className="fg-half">
          <span className="fg-halftag">Right board</span>
          <div className="fg-halfbody">
            <DotField facets={s.right} />
          </div>
        </div>
      </div>
    );
  }

  if (s.kind === 'matrix') {
    return (
      <div className="fg-grid" style={{ gridTemplateColumns: `repeat(${s.cols}, 1fr)` }}>
        {s.cells.map((cell, i) => (
          <div key={i} className={cell === null ? 'fg-gridcell blank' : 'fg-gridcell'}>
            {cell === null ? (
              <span className="fg-blankmark">?</span>
            ) : (
              <FacetScreen facets={cell} tone="#f2c744" />
            )}
          </div>
        ))}
      </div>
    );
  }

  if (s.kind === 'transform') {
    return (
      <div className="fg-machine">
        <div className="fg-machineside">
          <span className="fg-sidetag">Goes in</span>
          <div className="fg-machinebox">
            <FacetScreen facets={s.input} tone="#4fd6e0" />
          </div>
        </div>
        <div className="fg-chain">
          {s.chain.map((op, i) => (
            <span key={i} className="fg-op">
              {op}
            </span>
          ))}
          <span className="fg-flow" aria-hidden="true" />
        </div>
        <div className="fg-machineside">
          <span className="fg-sidetag">Comes out</span>
          <div className="fg-machinebox mystery">
            <span className="fg-blankmark">?</span>
          </div>
        </div>
        {s.vocabulary.length > 0 ? (
          <p className="fg-vocab">
            <span>Tonight&rsquo;s moves</span>
            {s.vocabulary.map((v, i) => (
              <em key={i}>{v}</em>
            ))}
          </p>
        ) : null}
      </div>
    );
  }

  if (s.kind === 'constraints') {
    // The bank's clue labels are bare attributes ("big", "mint", "dot inside"), so the board supplies
    // the sentence they belong to rather than listing them with no subject.
    return (
      <div className="fg-clueboard">
        <span className="fg-boardtag">The one we want is</span>
        <ol className="fg-clues">
          {s.clues.map((clue, i) => (
            <li key={i}>
              <span className="fg-cluenum">{i + 1}</span>
              <span className="fg-cluetext">{clue}</span>
            </li>
          ))}
        </ol>
      </div>
    );
  }

  if (s.kind === 'passage') {
    return (
      <div className="fg-card">
        {s.title ? <h3 className="fg-cardtitle">{s.title}</h3> : null}
        {s.sentences.map((line, i) => (
          <p key={i}>{line}</p>
        ))}
        {s.question ? <p className="fg-cardask">{s.question}</p> : null}
      </div>
    );
  }

  if (s.kind === 'pairs') {
    return (
      <div className="fg-pairboard">
        <span className="fg-boardtag">On the board</span>
        <div className="fg-pairlist">
          {s.rows.map((row, i) => (
            <div key={row.key} className="fg-pairrow">
              <span className="fg-pairletter">{letterFor(i)}</span>
              <Emblem facets={row.left} tone={accentFor(i)} />
              <span className="fg-pairarrow" aria-hidden="true">
                →
              </span>
              <Emblem facets={row.right} tone={accentFor(i)} />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (s.kind === 'target') {
    const shown = s.target.filter((f) => Object.keys(f).length > 0);
    return (
      <div className="fg-target">
        <span className="fg-boardtag">Up on the big screen</span>
        {shown.length > 0 ? (
          <div className="fg-targetrow">
            {shown.map((f, i) => (
              <FacetScreen key={i} facets={f} tone="#f2c744" />
            ))}
          </div>
        ) : (
          <p className="fg-targetnote">
            The host is holding it up. Work it out from the podia below.
          </p>
        )}
        {s.note ? <p className="fg-targetnote">{s.note}</p> : null}
      </div>
    );
  }

  // 'plain': the podia are the whole board, so the board says so rather than sitting empty.
  return (
    <div className="fg-plainboard">
      <span className="fg-boardtag">Straight to the podia</span>
    </div>
  );
}

/* --------------------------------------------------------------- host lines */

/** Our own wording, derived from the shape of the stem. The library's phrasing is never printed. */
function hostLine(question: Question): string {
  const s = question.stem;
  if (s.kind === 'compare') return 'Two boards up. Which one is holding more?';
  if (s.kind === 'matrix') return 'A tile has gone missing from the board. Which podium has it?';
  if (s.kind === 'transform') return 'Watch what the machine does. Which podium comes out the far end?';
  if (s.kind === 'constraints') return 'Every clue on that board is true. Only one podium fits all of them.';
  if (s.kind === 'passage') return 'Read the card, then take your pick.';
  if (s.kind === 'pairs') return 'Every pair on the board changes the same way, except one. Which one?';
  if (s.kind === 'target') return 'Match what is on the big screen.';

  // 'plain' carries no setup, so the line is derived from what the podia are actually holding.
  const every = (fn: (f: Facets) => boolean) => question.choices.every((c) => fn(c.facets));
  if (every((f) => f.series !== undefined)) return 'Which board plots the story the right way?';
  if (every((f) => f.text !== undefined)) return 'Which one is it?';
  if (every((f) => f.value !== undefined)) return 'What is the number?';
  return 'Take your pick. Only one of these works.';
}

/* ------------------------------------------------------------------- pieces */

function Ladder({ rung, litToTop }: { rung: number; litToTop: boolean }) {
  return (
    <ol className="fg-rungs">
      {[...RUNGS].reverse().map((r, revIndex) => {
        const index = TOP - 1 - revIndex;
        const lit = litToTop || index < rung;
        const current = !litToTop && index === rung;
        const classes = ['fg-rung'];
        if (lit) classes.push('lit');
        if (current) classes.push('current');
        if (r.above) classes.push('above');
        return (
          <li
            key={r.grade}
            className={classes.join(' ')}
            {...(current ? { 'aria-current': 'step' as const } : {})}
          >
            <span className="fg-rungno">{index + 1}</span>
            <span className="fg-runggrade">{r.grade}</span>
            {r.tag ? <span className="fg-rungtag">{r.tag}</span> : null}
          </li>
        );
      })}
    </ol>
  );
}

function Classmates({ used }: { used: number }) {
  return (
    <div className="fg-class">
      <span className="fg-classhead">Your classmates</span>
      <div className="fg-desks">
        {CLASSMATES.map((c, i) => {
          const spent = i < used;
          return (
            <div key={c.name} className={spent ? 'fg-desk spent' : 'fg-desk'}>
              <svg viewBox="0 0 40 40" className="fg-face" role="presentation" focusable="false">
                <circle cx="20" cy="15" r="8" fill={spent ? '#39415c' : c.hue} />
                <path
                  d="M6 38 C6 27 13 24 20 24 C27 24 34 27 34 38 Z"
                  fill={spent ? '#39415c' : c.hue}
                />
              </svg>
              <span className="fg-deskname">{c.name}</span>
              <span className="fg-deskstate">{spent ? 'took one' : 'ready'}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* --------------------------------------------------------------- the studio */

type BeatKind = 'climb' | 'help' | 'hold';

interface Beat {
  readonly kind: BeatKind;
  readonly line: string;
  readonly sub: string;
}

export default function FifthGrader() {
  const [progress, setProgress] = useState<Progress>(() => loadProgress(meta.id));
  const [rung, setRung] = useState(0);
  const [helpsUsed, setHelpsUsed] = useState(0);
  const [beat, setBeat] = useState<Beat | null>(null);
  const [curtain, setCurtain] = useState(false);
  const [picked, setPicked] = useState<string | null>(null);

  // Read inside the answer callback, which can fire before a re-render has published new state.
  const rungRef = useRef(0);
  const helpsRef = useRef(0);
  const recorded = useRef(false);
  const timer = useRef<number | null>(null);

  const showBeat = useCallback((next: Beat) => {
    setBeat(next);
    if (timer.current !== null) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setBeat(null), 1500);
  }, []);

  useEffect(
    () => () => {
      if (timer.current !== null) window.clearTimeout(timer.current);
    },
    [],
  );

  const bank = useCallback((items: number) => {
    if (recorded.current) return;
    recorded.current = true;
    setProgress(recordRound(meta.id, items).progress);
  }, []);

  const session = useQuestionSession({
    ageBand: '4-5',
    // Standard on the precision ladder: 8 to 16 questions, which fits an eight rung climb and keeps a
    // nine to eleven year old well inside twelve minutes.
    precisionIndex: 2,
    onAnswered: ({ correct, asked }) => {
      setPicked(null);

      if (correct === true) {
        rungRef.current = Math.min(TOP, rungRef.current + 1);
        setRung(rungRef.current);
        const reached = RUNGS[rungRef.current - 1];
        showBeat({
          kind: 'climb',
          line: 'Locked in.',
          sub:
            rungRef.current >= TOP
              ? 'Top of the ladder. Every rung lit.'
              : `Up to ${reached?.grade ?? 'the next rung'}.`,
        });
        return;
      }

      if (correct === null) {
        // The server could not mark it, so nothing moves and nobody is spent. Keep the show going.
        showBeat({ kind: 'hold', line: 'Judges are checking that one.', sub: 'Straight on to the next.' });
        return;
      }

      if (helpsRef.current < CLASSMATES.length) {
        const who = CLASSMATES[helpsRef.current];
        helpsRef.current += 1;
        setHelpsUsed(helpsRef.current);
        const last = helpsRef.current === CLASSMATES.length;
        showBeat({
          kind: 'help',
          line: `${who?.name ?? 'A classmate'} took that one for you.`,
          sub: last
            ? 'That is the whole class. You keep every rung you have.'
            : `${CLASSMATES.length - helpsRef.current} classmates still at their desks.`,
        });
        return;
      }

      // Nobody left at a desk. The run ends here, on the rung already climbed, and nothing is taken.
      setBeat(null);
      setCurtain(true);
      bank(asked);
    },
    onFinished: (result) => {
      bank(result.itemsServed);
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
    rungRef.current = 0;
    helpsRef.current = 0;
    recorded.current = false;
    if (timer.current !== null) window.clearTimeout(timer.current);
    setRung(0);
    setHelpsUsed(0);
    setBeat(null);
    setCurtain(false);
    setPicked(null);
    session.reset();
  }, [session]);

  const question = session.question;
  const line = useMemo(() => (question ? hostLine(question) : ''), [question]);
  const category = question
    ? (CATEGORY[question.domain] ?? { name: 'Mixed round', sub: 'the studio board' })
    : null;

  const over = !session.error && (curtain || session.phase === 'finished');
  // The engine's own confidence, not the ladder, decides what the closing line is allowed to claim.
  const cleared = session.result?.decision === 'recommend';
  const banked = RUNGS[Math.max(0, rung - 1)];
  const onStage = session.phase === 'asking' && question !== null && !curtain;

  const options = useMemo(
    () => (question ? visualChoices(question.choices) : []),
    [question],
  );
  const pairRows = question?.stem.kind === 'pairs' ? question.stem.rows : null;
  const sided = question?.stem.kind === 'compare' && options.length === 2;

  return (
    <div className="fg">
      <div className="fg-lights" aria-hidden="true">
        <span className="fg-beam a" />
        <span className="fg-beam b" />
        <span className="fg-beam c" />
      </div>

      <aside className="fg-rail">
        <div className="fg-railhead">
          <span className="fg-railkicker">Tonight&rsquo;s ladder</span>
          <strong>{cleared ? 'All the way up' : rung > 0 ? (banked?.grade ?? '') : 'On deck'}</strong>
        </div>
        <Ladder rung={rung} litToTop={over && cleared} />
        <Classmates used={helpsUsed} />
      </aside>

      <main className="fg-stage">
        <header className="fg-marquee">
          <span className="fg-bulbs" aria-hidden="true" />
          <h1>
            Are you smarter than a <em>5th grader?</em>
          </h1>
          <p className="fg-strap">
            Eight rungs, one grade at a time. Three classmates on your team.
          </p>
        </header>

        {session.phase === 'idle' ? (
          <section className="fg-open">
            <div className="fg-openinner">
              <p className="fg-opencue">Studio is lit. Ladder is at the bottom rung.</p>
              <h2>Take the stage</h2>
              <p className="fg-openbody">
                Every question you take climbs one rung, from 1st grade up to 8th. Miss one and you never
                drop &mdash; a classmate steps in and takes it for you. You have three of them, and every
                rung you climb stays banked.
              </p>
              <button type="button" className="fg-go" onClick={() => void session.start()}>
                Start the show
              </button>
              {progress.rounds > 0 ? (
                <p className="fg-sofar">
                  {progress.rounds} {progress.rounds === 1 ? 'run' : 'runs'} so far &middot;{' '}
                  {progress.items} questions taken
                </p>
              ) : null}
            </div>
          </section>
        ) : null}

        {session.phase === 'starting' ? (
          <section className="fg-open">
            <div className="fg-openinner">
              <p className="fg-opencue">Rolling.</p>
              <h2>Warming the lights</h2>
            </div>
          </section>
        ) : null}

        {session.error ? (
          <section className="fg-open">
            <div className="fg-openinner">
              <p className="fg-opencue">Off air</p>
              <h2>The studio lost the feed</h2>
              <p className="fg-openbody">{session.error}</p>
              <button type="button" className="fg-go" onClick={restart}>
                Try the show again
              </button>
            </div>
          </section>
        ) : null}

        {onStage && question && category ? (
          <section className="fg-floor">
            <div className="fg-boardhead">
              <div className="fg-cat" key={question.itemId}>
                <span className="fg-catface back">Category</span>
                <span className="fg-catface front">
                  <strong>{category.name}</strong>
                  <em>{category.sub}</em>
                </span>
              </div>
              <div className="fg-counter">
                <span className="fg-counterno">Question {session.asked + 1}</span>
                {session.expectedItems ? (
                  <span className="fg-counterof">of up to {session.expectedItems.max}</span>
                ) : null}
              </div>
            </div>

            <p className="fg-host">{line}</p>

            <div className="fg-board">
              <ClueBoard question={question} />
            </div>

            <div className={options.length > 4 ? 'fg-podia wide' : 'fg-podia'}>
              {options.map((vc, i) => {
                const tone = accentFor(vc.slot);
                const chip = sided ? (i === 0 ? 'LEFT' : 'RIGHT') : letterFor(vc.slot);
                const pair = pairRows ? pairRows[i] : undefined;
                const spoken = pair
                  ? `${describeFacets(pair.left)} becomes ${describeFacets(pair.right)}`
                  : describeFacets(vc.facets);
                return (
                  <button
                    key={vc.choice.key}
                    type="button"
                    className={`fg-podium${picked === vc.choice.key ? ' picked' : ''}`}
                    style={{ ['--tone' as string]: tone }}
                    disabled={session.busy}
                    onClick={() => void choose(vc.choice)}
                    aria-label={spoken ? `Podium ${chip}: ${spoken}` : `Podium ${chip}`}
                  >
                    <span className="fg-screen">
                      {pair ? (
                        <span className="fg-pairpick">
                          <Emblem facets={pair.left} tone={tone} />
                          <span className="fg-pairarrow" aria-hidden="true">
                            →
                          </span>
                          <Emblem facets={pair.right} tone={tone} />
                        </span>
                      ) : hasContent(vc.facets) ? (
                        <FacetScreen facets={vc.facets} tone={tone} />
                      ) : (
                        // Nothing survived the adapter for this option, so the podium is its own
                        // identity. A lit letter is what a studio would put there anyway.
                        <span className={chip.length > 2 ? 'fg-bigletter word' : 'fg-bigletter'}>
                          {chip}
                        </span>
                      )}
                    </span>
                    <span className="fg-plinth">
                      <span className="fg-chip">{chip}</span>
                    </span>
                  </button>
                );
              })}
            </div>

            {beat ? (
              <div className={`fg-beat ${beat.kind}`} role="status" aria-live="polite">
                <strong>{beat.line}</strong>
                <span>{beat.sub}</span>
              </div>
            ) : null}
          </section>
        ) : null}

        {over ? (
          <section className="fg-curtain">
            <div className="fg-openinner">
              <p className="fg-opencue">{cleared ? 'And that is the top' : 'That is our show'}</p>
              <h2>
                {cleared
                  ? 'You are working above 5th grade level'
                  : rung > 0
                    ? `Banked at ${banked?.grade ?? 'the first rung'}`
                    : 'Banked, and the ladder is still standing'}
              </h2>
              <p className="fg-openbody">
                {cleared
                  ? 'The ladder lit all the way to the top. On tonight\u2019s questions you were working past 5th grade, and every rung is yours.'
                  : `You climbed ${rung} of ${TOP} rungs across ${session.result?.asked ?? session.asked} questions and kept every one of them. Tonight\u2019s run says where you got to, and nothing at all about where you stop.`}
              </p>
              <div className="fg-tally">
                <span>
                  <em>{rung}</em>rungs climbed
                </span>
                <span>
                  <em>{CLASSMATES.length - helpsUsed}</em>classmates still seated
                </span>
                <span>
                  <em>{progress.rounds}</em>runs all together
                </span>
              </div>
              <button type="button" className="fg-go" onClick={restart}>
                Back to the studio
              </button>
            </div>
          </section>
        ) : null}
      </main>
    </div>
  );
}
