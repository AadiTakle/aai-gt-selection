import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import type { Facets, Question } from '../shared/headless/adapt';
import { visualChoices, type VisualChoice } from '../shared/headless/distinct';
import { useQuestionSession } from '../shared/headless/useQuestionSession';
import { loadProgress, recordRound, type Progress } from '../shared/progression';
import type { ExperienceMeta } from '../shared/types';
import './Pokedex.css';

/**
 * Pokédex: walk a route, catch what you meet, fill the eight slots.
 *
 * Headless all the way down. Nothing from the library's own renderers appears on screen; this takes the
 * normalised question from `shared/headless` and redraws it as a Pokémon encounter, because the facets
 * the bank already carries land naturally on the franchise's vocabulary: a `count` is how many are
 * rustling in a patch, a `shape` is the marking on a Pokémon's chest, `size` is how big it grew and
 * `fill` is whether it is solid or a ghost of itself.
 *
 * The loop: every choice is a Pokémon you can throw a ball at. Right, and it is caught and registered in
 * the Pokédex forever. Wrong, and it breaks free and runs into the grass, which costs nothing and takes
 * nothing back. The pull is a grid with eight slots and most of them still silhouettes.
 *
 * WHY SPECIES COME FROM THE SLOT. Choices are assigned a species by the visual slot from
 * `shared/headless/distinct`, never by hashing a facet token. Half the types this band serves hand over
 * choices with empty or duplicate facet bags (a ladder's `order`, a viewpoint's bare `{key}`), so a hash
 * would draw two options as the same creature and quietly make the item unanswerable. The slot is unique
 * within a question by construction, so it cannot.
 *
 * The facets still do their own work: the marking on the creature's chest is the real shape, colour,
 * rotation, fill and count, drawn by the same component the stem uses, so a pattern in the stem can be
 * matched against a candidate. The species is only there to make two candidates tellable apart.
 */

export const meta: ExperienceMeta = {
  id: 'pokedex',
  title: 'Pokédex',
  world: 'Pokémon',
  band: '2-3',
  pull: 'Every right answer catches it. Fill the Pokédex',
  accent: '#e3350d',
};

/* ------------------------------------------------------------------ species */

interface Species {
  readonly id: string;
  readonly num: number;
  readonly name: string;
  readonly type: string;
  readonly body: string;
  readonly dark: string;
  readonly accent: string;
}

/** The route roster. Eight, which is a Pokédex page you can finish in one walk. */
const ROSTER: readonly Species[] = [
  { id: 'sprigling', num: 1, name: 'Sprigling', type: 'Grass', body: '#7ac74c', dark: '#4e8f2c', accent: '#c7e89f' },
  { id: 'emberix', num: 2, name: 'Emberix', type: 'Fire', body: '#f2833c', dark: '#b8501a', accent: '#ffd08a' },
  { id: 'puddlup', num: 3, name: 'Puddlup', type: 'Water', body: '#5aa2e8', dark: '#2f6bbf', accent: '#bfe0ff' },
  { id: 'zapkit', num: 4, name: 'Zapkit', type: 'Electric', body: '#f5d13b', dark: '#b98f00', accent: '#fff0a8' },
  { id: 'pebbloth', num: 5, name: 'Pebbloth', type: 'Rock', body: '#c0a765', dark: '#8a7433', accent: '#e6d7ab' },
  { id: 'nocturn', num: 6, name: 'Nocturn', type: 'Ghost', body: '#a56ecb', dark: '#6f3f9e', accent: '#e0c6f2' },
  { id: 'frostnub', num: 7, name: 'Frostnub', type: 'Ice', body: '#8fd8e0', dark: '#2f8a97', accent: '#d9f5f8' },
  { id: 'wingle', num: 8, name: 'Wingle', type: 'Flying', body: '#a99bf0', dark: '#6a5bc4', accent: '#ddd6ff' },
];

const TYPE_COLOR: Record<string, string> = {
  Grass: '#3f8a34',
  Fire: '#c9502a',
  Water: '#2f6bbf',
  Electric: '#9a7b00',
  Rock: '#8a7433',
  Ghost: '#6f3f9e',
  Ice: '#2f8a97',
  Flying: '#6a5bc4',
};

const FIRST: Species = ROSTER[0] ?? {
  id: 'sprigling',
  num: 1,
  name: 'Sprigling',
  type: 'Grass',
  body: '#7ac74c',
  dark: '#4e8f2c',
  accent: '#c7e89f',
};

/**
 * Which species each choice becomes, keyed by its visual slot.
 *
 * Uncaught species come first, so a correct answer nearly always registers a new Pokédex entry and the
 * grid visibly fills. Slots are unique within a question, so no two choices can be the same creature.
 */
function assignSpecies(question: Question | null, caught: readonly string[]): readonly Species[] {
  if (!question) return [];
  const fresh = ROSTER.filter((s) => !caught.includes(s.id));
  const already = ROSTER.filter((s) => caught.includes(s.id));
  const pool = [...fresh, ...already];
  return question.choices.map((_, i) => pool[i % pool.length] ?? FIRST);
}

/* ------------------------------------------------------------------- sprites */

function Eyes({ x1, x2, y, r = 3.4 }: { x1: number; x2: number; y: number; r?: number }) {
  return (
    <g>
      <circle cx={x1} cy={y} r={r} fill="#1b2430" />
      <circle cx={x2} cy={y} r={r} fill="#1b2430" />
      <circle cx={x1 + 1.1} cy={y - 1.3} r={r * 0.34} fill="#ffffff" />
      <circle cx={x2 + 1.1} cy={y - 1.3} r={r * 0.34} fill="#ffffff" />
    </g>
  );
}

/** One creature, as a bare `<g>` on a 64x64 field so it can be nested in a bigger scene. */
function CreatureArt({ species }: { species: Species }) {
  const { body, dark, accent } = species;

  switch (species.id) {
    case 'emberix':
      return (
        <g>
          <path d="M46 46C57 42 60 29 55 19c-1 8-4 11-7 13 2-9-3-15-9-17 4 10 0 16 3 24z" fill="#ffb03a" />
          <path d="M48 44c6-3 8-11 5-17-1 5-3 7-5 8 1-6-2-10-6-11 3 7 0 11 2 17z" fill="#ffe07a" />
          <path d="M17 27 13 9l15 11z" fill={body} />
          <path d="M43 27 47 9 32 20z" fill={body} />
          <ellipse cx="30" cy="41" rx="17" ry="15" fill={body} />
          <ellipse cx="30" cy="46" rx="10" ry="8" fill={accent} />
          <ellipse cx="22" cy="55" rx="6" ry="3.4" fill={dark} />
          <ellipse cx="38" cy="55" rx="6" ry="3.4" fill={dark} />
          <Eyes x1={23} x2={37} y={38} />
        </g>
      );

    case 'puddlup':
      return (
        <g>
          <path d="M14 39 2 32l10 17z" fill={dark} />
          <path d="M50 39 62 32 52 49z" fill={dark} />
          <path d="M32 11c10 15 18 22 18 30a18 18 0 0 1-36 0c0-8 8-15 18-30z" fill={body} />
          <ellipse cx="32" cy="46" rx="11" ry="8" fill={accent} />
          <Eyes x1={26} x2={38} y={38} />
          <path d="M28 47q4 4 8 0" stroke="#1b2430" strokeWidth="2" fill="none" strokeLinecap="round" />
        </g>
      );

    case 'zapkit':
      return (
        <g>
          <path d="M46 42 60 22h-8l10-14-18 16h8z" fill="#ffe14d" />
          <path d="M17 29 9 7l19 15z" fill={body} />
          <path d="M43 29 51 7 32 22z" fill={body} />
          <path d="M12 13 9 7l7 5z" fill={dark} />
          <path d="M48 13 51 7l-7 5z" fill={dark} />
          <ellipse cx="30" cy="41" rx="17" ry="15" fill={body} />
          <circle cx="16" cy="46" r="4" fill="#e05a2b" />
          <circle cx="44" cy="46" r="4" fill="#e05a2b" />
          <Eyes x1={23} x2={37} y={38} />
        </g>
      );

    case 'pebbloth':
      return (
        <g>
          <rect x="3" y="37" width="11" height="10" rx="4" fill={dark} />
          <rect x="50" y="37" width="11" height="10" rx="4" fill={dark} />
          <path d="M12 44 19 23l14-8 16 7 5 22-8 12H20z" fill={body} />
          <path d="M19 23 33 29l16-7" stroke={dark} strokeWidth="2.4" fill="none" strokeLinejoin="round" />
          <path d="M20 53h29" stroke={dark} strokeWidth="2.4" fill="none" />
          <Eyes x1={25} x2={40} y={40} />
        </g>
      );

    case 'nocturn':
      return (
        <g>
          <circle cx="8" cy="33" r="5.4" fill={body} />
          <circle cx="56" cy="33" r="5.4" fill={body} />
          <path d="M32 9c12 0 20 10 20 24v20l-7-7-7 7-6-7-6 7-7-7-7 7V33C12 19 20 9 32 9z" fill={body} />
          <ellipse cx="32" cy="41" rx="6" ry="4.6" fill="#3a1550" />
          <Eyes x1={24} x2={40} y={29} r={4} />
        </g>
      );

    case 'frostnub':
      return (
        <g>
          <path d="M19 24 23 6l5 18z" fill={accent} />
          <path d="M32 21 36 2l5 19z" fill={accent} />
          <path d="M43 25 48 11l3 14z" fill={accent} />
          <path d="M32 17 50 28v18L32 57 14 46V28z" fill={body} />
          <path d="M32 17v19l18-8" stroke="#ffffff" strokeWidth="1.8" fill="none" opacity="0.65" />
          <path d="M32 36 14 28" stroke="#ffffff" strokeWidth="1.8" fill="none" opacity="0.45" />
          <Eyes x1={26} x2={38} y={40} />
        </g>
      );

    case 'wingle':
      return (
        <g>
          <path d="M17 35C5 27 3 15 7 10c10 4 14 14 14 25z" fill={dark} />
          <path d="M47 35c12-8 14-20 10-25-10 4-14 14-14 25z" fill={dark} />
          <path d="M26 51 21 61l10-6z" fill={dark} />
          <path d="M38 51 43 61l-10-6z" fill={dark} />
          <ellipse cx="32" cy="38" rx="16" ry="15" fill={body} />
          <ellipse cx="32" cy="43" rx="9" ry="7" fill={accent} />
          <path d="M32 40 25 46h14z" fill="#f0a63c" />
          <Eyes x1={25} x2={39} y={34} />
        </g>
      );

    case 'sprigling':
    default:
      return (
        <g>
          <path d="M32 19c0-9-6-13-13-14 1 8 5 13 13 14z" fill="#63b23a" />
          <rect x="30.4" y="15" width="3.2" height="10" rx="1.6" fill="#4e8f2c" />
          <path d="M15 31C6 27 4 18 6 13c8 2 12 9 12 17z" fill="#63b23a" />
          <path d="M49 31c9-4 11-13 9-18-8 2-12 9-12 17z" fill="#63b23a" />
          <ellipse cx="32" cy="39" rx="18" ry="16" fill={body} />
          <ellipse cx="32" cy="44" rx="10" ry="7.5" fill={accent} />
          <ellipse cx="24" cy="55" rx="6" ry="3.4" fill={dark} />
          <ellipse cx="40" cy="55" rx="6" ry="3.4" fill={dark} />
          <Eyes x1={25} x2={39} y={37} />
        </g>
      );
  }
}

function Creature({
  species,
  px = 64,
  silhouette = false,
}: {
  species: Species;
  px?: number;
  silhouette?: boolean;
}) {
  return (
    <svg
      className={silhouette ? 'pkd-sprite pkd-sil' : 'pkd-sprite'}
      viewBox="0 0 64 64"
      width={px}
      height={px}
      role="presentation"
      focusable="false"
      aria-hidden="true"
    >
      <CreatureArt species={species} />
    </svg>
  );
}

/** The ball, used for the throw, for a gap in a pattern, and as the bullet on a field note. */
function Ball({ px = 22, open = false }: { px?: number; open?: boolean }) {
  return (
    <svg viewBox="0 0 32 32" width={px} height={px} aria-hidden="true" focusable="false" className="pkd-ball">
      <circle cx="16" cy="16" r="14" fill={open ? 'none' : '#f2f4f5'} stroke="#1b2430" strokeWidth="2.4" />
      <path
        d="M2.4 16A13.6 13.6 0 0 1 29.6 16z"
        fill={open ? 'none' : '#e3350d'}
        stroke={open ? '#1b2430' : 'none'}
        strokeWidth="2.4"
      />
      <path d="M2 16h28" stroke="#1b2430" strokeWidth="2.6" />
      <circle cx="16" cy="16" r="4.6" fill="#ffffff" stroke="#1b2430" strokeWidth="2.4" />
    </svg>
  );
}

/* ------------------------------------------------------- facets, drawn once */

/**
 * The colour vocabulary. Bank tokens are named colours, so they get the colour they say; anything else
 * lands somewhere stable in the palette and is also printed as a chip, so the word is never lost.
 */
const COLOR_TOKENS: Record<string, string> = {
  coral: '#ff6f61',
  gold: '#eab308',
  violet: '#8b5cf6',
  teal: '#14b8a6',
  azure: '#3b82f6',
  mint: '#34d399',
  rose: '#fb7185',
  amber: '#f59e0b',
  slate: '#64748b',
  lime: '#84cc16',
  plum: '#a855f7',
  sky: '#38bdf8',
  red: '#ef4444',
  blue: '#3b82f6',
  green: '#22c55e',
  yellow: '#facc15',
  purple: '#a855f7',
  orange: '#fb923c',
};

const PALETTE = Object.values(COLOR_TOKENS);

function hashOf(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}

function colorFor(token: string | undefined): string {
  if (!token) return '#4a7fb5';
  return COLOR_TOKENS[token.toLowerCase()] ?? PALETTE[hashOf(token) % PALETTE.length] ?? '#4a7fb5';
}

const SHAPE_POINTS: Record<string, string> = {
  square: '11,11 53,11 53,53 11,53',
  triangle: '32,8 55,54 9,54',
  diamond: '32,6 56,32 32,58 8,32',
  pentagon: '32,9 54.8,25.6 46.1,52.4 17.9,52.4 9.2,25.6',
  hexagon: '32,9 52.8,21 52.8,45 32,57 11.2,45 11.2,21',
  star: '32,9 37.9,24.9 54.8,25.6 41.5,36.1 46.1,52.4 32,43 17.9,52.4 22.5,36.1 9.2,25.6 26.1,24.9',
  cross: '24,8 40,8 40,24 56,24 56,40 40,40 40,56 24,56 24,40 8,40 8,24 24,24',
  arrow: '32,6 54,32 42,32 42,58 22,58 22,32 10,32',
  heart: '32,56 8,32 8,20 20,12 32,22 44,12 56,20 56,32',
  octagon: '21,8 43,8 56,21 56,43 43,56 21,56 8,43 8,21',
  trapezoid: '18,9 46,9 57,55 7,55',
  bolt: '37,4 13,35 27,35 23,60 51,27 35,27',
  wedge: '9,10 55,10 32,56',
};

const SHAPE_KEYS = Object.keys(SHAPE_POINTS);

/** Tokens that mean "a round thing", which is the one shape drawn as a real circle rather than a polygon. */
const ROUND_TOKENS = new Set(['circle', 'round', 'orb', 'dot', 'ball', 'disc', 'sphere', 'ring']);

/**
 * The polygon for a shape token, or null for a circle.
 *
 * An unknown token is hashed into the set rather than defaulting to a circle, because defaulting drew
 * every FLU-OPCHAIN glyph as the same blue disc: five options that differed only by a vocabulary this
 * app had not met all rendered alike. Different unknown tokens now get different shapes, and the token
 * itself is still printed on a chip so the word is never lost.
 */
function pointsFor(token: string | undefined): string | null {
  if (!token) return null;
  const key = token.toLowerCase();
  if (ROUND_TOKENS.has(key)) return null;
  const known = SHAPE_POINTS[key];
  if (known) return known;
  const fallback = SHAPE_KEYS[hashOf(key) % SHAPE_KEYS.length];
  return fallback ? (SHAPE_POINTS[fallback] ?? null) : null;
}

/** Whether a facet bag has anything a marking could actually draw. */
function hasMark(f: Facets): boolean {
  return (
    f.shape !== undefined ||
    f.glyph !== undefined ||
    f.color !== undefined ||
    f.count !== undefined ||
    f.fill !== undefined ||
    f.size !== undefined ||
    f.rot !== undefined ||
    f.tilt !== undefined
  );
}

/** Dice-ish positions so a child can count the dots at a glance. */
function dotPositions(n: number): readonly { x: number; y: number }[] {
  const capped = Math.max(0, Math.min(9, Math.round(n)));
  const cols = Math.min(3, capped);
  const rows = Math.ceil(capped / Math.max(1, cols));
  const out: { x: number; y: number }[] = [];
  for (let i = 0; i < capped; i++) {
    const r = Math.floor(i / cols);
    const inRow = Math.min(cols, capped - r * cols);
    const c = i % cols;
    out.push({
      x: 32 + (c - (inRow - 1) / 2) * 11,
      y: 32 + (r - (rows - 1) / 2) * 11,
    });
  }
  return out;
}

function scaleFor(size: number | string | undefined): number {
  if (size === undefined) return 1;
  if (typeof size === 'number') return 0.72 + Math.max(0, Math.min(4, size)) * 0.15;
  const s = size.toLowerCase();
  if (s === 'small' || s === 'tiny' || s === 'little') return 0.76;
  if (s === 'big' || s === 'large' || s === 'huge') return 1.22;
  return 1;
}

/**
 * Words that describe a fill rather than a colour.
 *
 * FLU-OPCHAIN keeps its fill under `shade`, which the adapter reads as `color`. Taken at face value that
 * turns "solid" and "hollow" into two arbitrary hashed hues, and the one difference the item actually
 * offers stops looking like a difference. Read as a fill instead, the same options draw as a filled
 * marking against an outlined one.
 */
const FILL_WORDS = new Set(['solid', 'filled', 'full', 'hollow', 'outline', 'none', 'empty', 'open']);

function isFillWord(value: string | undefined): boolean {
  return value !== undefined && FILL_WORDS.has(value.toLowerCase());
}

function isHollow(fill: string | undefined): boolean {
  if (!fill) return false;
  const f = fill.toLowerCase();
  return f === 'hollow' || f === 'outline' || f === 'none' || f === 'empty' || f === 'open';
}

function isLeaning(tilt: string | undefined): boolean {
  if (!tilt) return false;
  const t = tilt.toLowerCase();
  return t === 'leaning' || t === 'tilted' || t === 'tipped' || t === 'slanted';
}

/**
 * A facet bag drawn as one marking.
 *
 * The same component draws the pattern in the stem and the marking on a candidate, which is the only
 * reason a matrix or an analogy stays solvable: the child compares like with like.
 */
function FacetMark({ facets, px = 46 }: { facets: Facets; px?: number }) {
  const shape = facets.shape ?? facets.glyph;

  // Some stems describe their parts as bare words ('orb', 'cube'). Drawing those as anonymous discs lost
  // the whole target, so the word is shown as the word.
  if (shape === undefined && facets.text !== undefined) {
    return (
      <span className="pkd-word" style={{ background: colorFor(facets.text) }}>
        {facets.text}
      </span>
    );
  }

  const colorToken = isFillWord(facets.color) ? undefined : facets.color;
  const points = pointsFor(shape);
  const paint = colorFor(colorToken ?? shape);
  const hollow = isHollow(facets.fill ?? (isFillWord(facets.color) ? facets.color : undefined));
  const scale = scaleFor(facets.size);
  const spin = (facets.rot ?? 0) + (isLeaning(facets.tilt) ? -16 : 0);
  const dots = facets.count !== undefined ? dotPositions(facets.count) : [];

  const skin = hollow
    ? { fill: 'none', stroke: paint, strokeWidth: 5 }
    : { fill: paint, stroke: 'rgba(12,24,32,0.34)', strokeWidth: 2 };

  return (
    <svg
      className="pkd-mark"
      viewBox="0 0 64 64"
      width={px}
      height={px}
      aria-hidden="true"
      focusable="false"
    >
      {/* Rotate about the middle, then scale about the middle, so `rot` and `size` do not drag the
          marking off its own tile. */}
      <g
        transform={`rotate(${spin} 32 32) translate(${32 * (1 - scale)} ${32 * (1 - scale)}) scale(${scale})`}
      >
        {points ? (
          <polygon points={points} {...skin} strokeLinejoin="round" />
        ) : (
          <circle cx="32" cy="32" r="23" {...skin} />
        )}
        {dots.map((d, i) => (
          <circle
            key={i}
            cx={d.x}
            cy={d.y}
            r={3.4}
            fill={hollow ? paint : 'rgba(255,255,255,0.94)'}
            stroke="rgba(12,24,32,0.28)"
            strokeWidth="1"
          />
        ))}
      </g>
    </svg>
  );
}

/** A 4x4 footprint, for the block-placement types. */
function BlockGrid({ blocks }: { blocks: readonly number[] }) {
  const on = new Set(blocks);
  return (
    <span className="pkd-blocks" aria-hidden="true">
      {Array.from({ length: 16 }).map((_, i) => (
        <span key={i} className={on.has(i) ? 'pkd-blockcell on' : 'pkd-blockcell'} />
      ))}
    </span>
  );
}

const ARROW: Record<string, string> = { L: '◀', R: '▶', T: '▲', B: '▼', U: '▲', D: '▼' };

function SeqTrail({ seq }: { seq: readonly string[] }) {
  return (
    <span className="pkd-seq" aria-hidden="true">
      {seq.map((step, i) => (
        <span key={i} className="pkd-seqstep">
          {ARROW[step.toUpperCase()] ?? step}
        </span>
      ))}
    </span>
  );
}

function Sparkline({ series }: { series: readonly number[] }) {
  const top = Math.max(1, ...series);
  return (
    <span className="pkd-series" aria-hidden="true">
      {series.map((v, i) => (
        <span key={i} className="pkd-bar" style={{ height: `${Math.max(8, (v / top) * 100)}%` }}>
          <span className="pkd-barnum">{v}</span>
        </span>
      ))}
    </span>
  );
}

/** Which facets actually separate the options. Only those become chips, so a card stays readable. */
function varyingKeys(question: Question): ReadonlySet<keyof Facets> {
  const present = new Set<keyof Facets>();
  for (const c of question.choices) {
    for (const k of Object.keys(c.facets) as (keyof Facets)[]) present.add(k);
  }
  const out = new Set<keyof Facets>();
  for (const key of present) {
    const values = new Set(question.choices.map((c) => String(c.facets[key] ?? '')));
    if (values.size > 1) out.add(key);
  }
  return out;
}

const CHIP_KEYS: readonly (keyof Facets)[] = ['shape', 'glyph', 'color', 'fill', 'size', 'tilt', 'count'];

/** Type-badge styling, because a badge row is how a Pokédex has always listed what a thing is. */
function TraitChips({ facets, keys }: { facets: Facets; keys: ReadonlySet<keyof Facets> }) {
  const chips = CHIP_KEYS.filter((k) => keys.has(k) && facets[k] !== undefined).map((k) => ({
    key: k,
    label: String(facets[k]),
  }));
  if (chips.length === 0) return null;
  return (
    <span className="pkd-chips">
      {chips.map((c) => (
        <span key={c.key} className="pkd-chip" style={{ background: colorFor(c.label) }}>
          {c.label}
        </span>
      ))}
    </span>
  );
}

/** Everything a screen reader needs to tell two candidates apart. */
function describeChoice(species: Species, facets: Facets): string {
  const bits: string[] = [species.name];
  for (const k of CHIP_KEYS) {
    const v = facets[k];
    if (v !== undefined) bits.push(`${k} ${String(v)}`);
  }
  if (facets.text !== undefined) bits.push(facets.text);
  if (facets.value !== undefined) bits.push(String(facets.value));
  return bits.join(', ');
}

/* --------------------------------------------------------------- the stem */

function GrassPatch({ side, count }: { side: string; count: number }) {
  const shown = Math.min(28, Math.max(0, count));
  return (
    <div className="pkd-patch">
      <span className="pkd-patchname">{side}</span>
      <div className="pkd-patchbody">
        {Array.from({ length: shown }).map((_, i) => (
          <span key={i} className="pkd-rustle" aria-hidden="true">
            <svg viewBox="0 0 18 18" width="18" height="18" focusable="false">
              <path d="M4.6 6 2.4 1 7 4.6z" fill="#1c3a27" />
              <path d="M13.4 6 15.6 1 11 4.6z" fill="#1c3a27" />
              <path d="M9 3.4c4 0 6.4 3 6.4 7V16H2.6v-5.6c0-4 2.4-7 6.4-7z" fill="#1c3a27" />
              <circle cx="6.6" cy="9.6" r="1.5" fill="#eaf7e4" />
              <circle cx="11.4" cy="9.6" r="1.5" fill="#eaf7e4" />
            </svg>
          </span>
        ))}
      </div>
    </div>
  );
}

function Stem({ question }: { question: Question }) {
  const s = question.stem;

  if (s.kind === 'compare') {
    return (
      <div className="pkd-compare">
        <GrassPatch side="Left patch" count={s.left.count ?? 0} />
        <span className="pkd-or">or</span>
        <GrassPatch side="Right patch" count={s.right.count ?? 0} />
      </div>
    );
  }

  if (s.kind === 'matrix') {
    return (
      <div className="pkd-trail" style={{ gridTemplateColumns: `repeat(${s.cols}, 1fr)` }}>
        {s.cells.map((cell, i) => (
          <div key={i} className={cell === null ? 'pkd-step gap' : 'pkd-step'}>
            {cell === null ? <Ball px={30} open /> : <FacetMark facets={cell} px={40} />}
          </div>
        ))}
      </div>
    );
  }

  if (s.kind === 'transform') {
    return (
      <div className="pkd-machine">
        <div className="pkd-machineside">
          <span className="pkd-tag">Goes in</span>
          <FacetMark facets={s.input} px={48} />
        </div>
        <div className="pkd-ops">
          {s.chain.map((op, i) => (
            <span key={i} className="pkd-op">
              {op}
            </span>
          ))}
          <span className="pkd-flow" aria-hidden="true">
            ⟶
          </span>
        </div>
        <div className="pkd-machineside">
          <span className="pkd-tag">Comes out</span>
          <span className="pkd-outslot">
            <Ball px={30} open />
          </span>
        </div>
      </div>
    );
  }

  if (s.kind === 'constraints') {
    return (
      <ul className="pkd-notes">
        {s.clues.map((clue, i) => (
          <li key={i}>
            <Ball px={16} />
            <span>{clue}</span>
          </li>
        ))}
      </ul>
    );
  }

  if (s.kind === 'passage') {
    return (
      <div className="pkd-entry">
        {s.title ? <h4>{s.title}</h4> : null}
        {s.sentences.map((line, i) => (
          <p key={i}>{line}</p>
        ))}
        {s.question ? <p className="pkd-entryq">{s.question}</p> : null}
      </div>
    );
  }

  if (s.kind === 'pairs') {
    return (
      <p className="pkd-hint">
        These Pokémon travel in pairs. One pair does not follow the same habit as the others.
      </p>
    );
  }

  if (s.kind === 'target') {
    return (
      <div className="pkd-target">
        <span className="pkd-tag">Match this</span>
        <div className="pkd-targetrow">
          {s.target.map((f, i) => (
            <FacetMark key={i} facets={f} px={40} />
          ))}
        </div>
        {s.note ? <p className="pkd-targetnote">{s.note}</p> : null}
      </div>
    );
  }

  // 'plain'. The item's own words are all there is, so they are relayed as a call from the Professor
  // rather than dropped, which would leave the child staring at options with no question.
  return (
    <div className="pkd-radio">
      <span className="pkd-tag">Radio</span>
      <p>{question.ask}</p>
    </div>
  );
}

/* -------------------------------------------------------------- the scene */

/**
 * The route, for the screen before the first encounter and after the last.
 *
 * The viewBox matches the panel's own proportions, so the scene fills the width without either
 * letterboxing into a strip or cropping the grass off the bottom.
 */
function RouteScene({ caught }: { caught: readonly string[] }) {
  const peeking = ROSTER.slice(0, 3);
  return (
    <svg
      className="pkd-scene"
      viewBox="0 0 360 104"
      preserveAspectRatio="xMidYMid slice"
      role="img"
      aria-label="A grassy route with tall grass and Pokémon hiding in it"
    >
      <defs>
        <linearGradient id="pkd-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#bfe7f5" />
          <stop offset="100%" stopColor="#eaf7e4" />
        </linearGradient>
        <linearGradient id="pkd-turf" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#6cb551" />
          <stop offset="100%" stopColor="#39793a" />
        </linearGradient>
      </defs>
      <rect width="360" height="104" fill="url(#pkd-sky)" />
      <circle cx="30" cy="23" r="11" fill="#ffe08a" />
      <path d="M0 52c38-20 70-20 104 0 30-17 58-17 88 0 34-19 70-19 108 0v14H0z" fill="#8fc98a" />
      <rect y="62" width="360" height="42" fill="url(#pkd-turf)" />
      <path d="M148 62h40l30 42H118z" fill="#dcc99b" />
      {peeking.map((sp, i) => (
        <g key={sp.id} transform={`translate(${36 + i * 84} 42) scale(0.52)`}>
          <g className={caught.includes(sp.id) ? '' : 'pkd-sil'}>
            <CreatureArt species={sp} />
          </g>
        </g>
      ))}
      {/* Tall grass in front, so the creatures are standing in it rather than on it. */}
      {Array.from({ length: 40 }).map((_, i) => {
        const x = 3 + i * 9;
        const y = 78 + ((i * 13) % 22);
        return (
          <path
            key={i}
            d={`M${x} ${y}c0-7 4-11 4-11s1 6-1 11zM${x + 4} ${y}c0-9 5-13 5-13s1 7-1 13z`}
            fill="#2f6b33"
            opacity="0.9"
          />
        );
      })}
      <rect x="288" y="34" width="6" height="34" rx="2.5" fill="#8a6a3c" />
      <rect x="262" y="20" width="58" height="21" rx="4" fill="#c69c5d" stroke="#8a6a3c" strokeWidth="2.5" />
      <text x="291" y="35" textAnchor="middle" fontSize="12" fontWeight="800" fill="#4a3418">
        ROUTE 1
      </text>
    </svg>
  );
}

/* ---------------------------------------------------------------- the app */

interface Flash {
  readonly kind: 'caught' | 'fled';
  readonly species: Species | null;
}

export default function Pokedex() {
  const [progress, setProgress] = useState<Progress>(() => loadProgress(meta.id));
  const [caught, setCaught] = useState<readonly string[]>([]);
  const [flash, setFlash] = useState<Flash | null>(null);
  const [pickedKey, setPickedKey] = useState<string | null>(null);
  const [justCaught, setJustCaught] = useState<string | null>(null);

  // Refs, because the hook calls onAnswered with the callback captured before this render's state
  // lands. Reading state there would tell us which Pokémon was tapped one encounter too late.
  const caughtRef = useRef<readonly string[]>([]);
  const pickedSpecies = useRef<Species | null>(null);
  const timers = useRef<number[]>([]);

  useEffect(() => {
    const pending = timers.current;
    return () => {
      for (const t of pending) window.clearTimeout(t);
    };
  }, []);

  const later = useCallback((fn: () => void, ms: number) => {
    timers.current.push(window.setTimeout(fn, ms));
  }, []);

  const session = useQuestionSession({
    ageBand: '2-3',
    // Short: 6 to 10 encounters. Long enough to fill most of a page of the Pokédex, short enough that a
    // seven year old is still leaning in at the end, and comfortably inside eight minutes.
    precisionIndex: 1,
    onAnswered: ({ correct }) => {
      const sp = pickedSpecies.current;
      if (correct === true && sp) {
        if (!caughtRef.current.includes(sp.id)) {
          caughtRef.current = [...caughtRef.current, sp.id];
          setCaught(caughtRef.current);
        }
        setFlash({ kind: 'caught', species: sp });
        setJustCaught(sp.id);
        later(() => setJustCaught(null), 1600);
      } else {
        // It broke free. Nothing is taken back, nothing closes, and the grass rustles again straight
        // away, which is the whole reason a child will try the next one.
        setFlash({ kind: 'fled', species: sp });
      }
      later(() => setFlash(null), 1500);
      setPickedKey(null);
    },
    onFinished: (result) => {
      setProgress(recordRound(meta.id, result.itemsServed).progress);
    },
  });

  const question = session.question;

  // Keyed on the question object, which the hook replaces exactly once per item, so the roster cannot
  // reshuffle underneath a child who is mid-decision.
  const speciesBySlot = useMemo(() => assignSpecies(question, caughtRef.current), [question]);
  const chosen = useMemo(() => (question ? visualChoices(question.choices) : []), [question]);
  const varying = useMemo(() => (question ? varyingKeys(question) : new Set<keyof Facets>()), [question]);

  const pairsByKey = useMemo(() => {
    const map = new Map<string, { left: Facets; right: Facets }>();
    if (question?.stem.kind === 'pairs') {
      for (const row of question.stem.rows) map.set(row.key, { left: row.left, right: row.right });
    }
    return map;
  }, [question]);

  const throwBall = useCallback(
    async (vc: VisualChoice, sp: Species) => {
      if (session.busy) return;
      pickedSpecies.current = sp;
      setPickedKey(vc.choice.key);
      await session.answer(vc.choice);
    },
    [session],
  );

  const walkAgain = useCallback(() => {
    caughtRef.current = [];
    setCaught([]);
    setFlash(null);
    setJustCaught(null);
    session.reset();
  }, [session]);

  /** Our own line for every stem the adapter can hand over. The library's wording is never the headline. */
  const fieldNote = useMemo(() => {
    switch (question?.stem.kind) {
      case 'compare':
        return 'Two patches of grass. Tap the side with more.';
      case 'matrix':
        return 'The trail has a gap. Tap the one that fills it.';
      case 'transform':
        return 'The machine changes it. Tap what comes out.';
      case 'constraints':
        return 'These notes fit one Pokémon. Tap it.';
      case 'passage':
        return 'Read the entry. Tap the answer.';
      case 'pairs':
        return 'One pair is not like the rest. Tap that pair.';
      case 'target':
        return 'Match the target. Tap the one that fits.';
      default:
        return 'Tap the one that fits.';
    }
  }, [question]);

  const summaryLine = useMemo(() => {
    const names = ROSTER.filter((s) => caught.includes(s.id)).map((s) => s.name);
    if (names.length === 0) {
      return 'They all slipped back into the grass this time. The route is still there, and so are they.';
    }
    return `You caught ${names.length} of ${ROSTER.length} on this walk: ${names.join(', ')}.`;
  }, [caught]);

  const isCompare = question?.stem.kind === 'compare';
  const wide = chosen.some(
    (vc) => vc.facets.text !== undefined || vc.facets.blocks !== undefined || vc.facets.seq !== undefined,
  );
  const registered = caught.length;
  const started = session.phase !== 'idle';
  const finished = session.phase === 'finished';

  return (
    <div className="pkd">
      <div className="pkd-device">
        {/* ---- left half: the encounter ---- */}
        <div className="pkd-half pkd-left">
          <div className="pkd-lamps">
            <span className="pkd-lens" aria-hidden="true">
              <span className="pkd-lensglint" />
            </span>
            <span className="pkd-led red" aria-hidden="true" />
            <span className="pkd-led amber" aria-hidden="true" />
            <span className="pkd-led green" aria-hidden="true" />
            <span className="pkd-route">Route 1</span>
            {started && !finished ? (
              <span className="pkd-encounter">Encounter {Math.min(session.asked + 1, 99)}</span>
            ) : null}
          </div>

          <div className="pkd-screen">
            <div className="pkd-screeninner">
              {session.phase === 'idle' ? (
                <div className="pkd-intro">
                  <RouteScene caught={caught} />
                  <h2>Eight Pokémon live on this route.</h2>
                  <p>
                    Every one you catch goes in the Pokédex. Miss one and it runs into the grass, which
                    costs you nothing. The next one is right behind it.
                  </p>
                  {progress.rounds > 0 ? (
                    <p className="pkd-sofar">
                      {progress.rounds} {progress.rounds === 1 ? 'route' : 'routes'} walked ·{' '}
                      {progress.items} encounters
                    </p>
                  ) : (
                    <p className="pkd-sofar">Your Pokédex is empty. That is the fun bit.</p>
                  )}
                  <button type="button" className="pkd-go" onClick={() => void session.start()}>
                    <Ball px={20} /> Head into the grass
                  </button>
                  {session.expectedItems ? (
                    <p className="pkd-fine">
                      About {session.expectedItems.min} to {session.expectedItems.max} encounters.
                    </p>
                  ) : null}
                </div>
              ) : null}

              {session.phase === 'starting' ? (
                <p className="pkd-loading">
                  <Ball px={26} /> Walking into the grass…
                </p>
              ) : null}

              {session.phase === 'error' ? (
                <div className="pkd-intro">
                  <h2>The radio cut out.</h2>
                  <p>{session.error}</p>
                  <button type="button" className="pkd-go" onClick={() => void session.start()}>
                    Try the route again
                  </button>
                </div>
              ) : null}

              {session.phase === 'asking' && question ? (
                <div className="pkd-ask">
                  <p className="pkd-note">{fieldNote}</p>
                  <div className="pkd-stemwrap">
                    <Stem question={question} />
                  </div>
                </div>
              ) : null}

              {finished ? (
                <div className="pkd-intro">
                  <RouteScene caught={caught} />
                  <h2>{registered === ROSTER.length ? 'Pokédex full.' : 'Route walked.'}</h2>
                  <p>{summaryLine}</p>
                  <button type="button" className="pkd-go" onClick={walkAgain}>
                    <Ball px={20} /> Walk it again
                  </button>
                  <p className="pkd-fine">
                    {progress.rounds} {progress.rounds === 1 ? 'route' : 'routes'} walked so far.
                  </p>
                </div>
              ) : null}
            </div>

            <div className="pkd-grassline" aria-hidden="true" />
          </div>

          {/* The device's readout. Fixed height and outside the screen, so a catch never covers a clue
              and nothing on screen jumps when the message arrives. */}
          <div className={`pkd-report${flash ? ` ${flash.kind}` : ''}`}>
            {/* Announced once when it arrives, and silent when it clears, which is why the visible copy
                below is hidden from assistive tech rather than read twice. */}
            <span className="pkd-sr" aria-live="polite">
              {flash?.kind === 'caught'
                ? `Gotcha. ${flash.species?.name ?? 'It'} was caught. ${registered} of ${ROSTER.length} registered.`
                : flash?.kind === 'fled'
                  ? 'It broke free and ran into the grass. The next one is already here.'
                  : ''}
            </span>

            {flash === null ? (
              <span className="pkd-standby" aria-hidden="true">
                Route 1 · standing by
              </span>
            ) : null}

            {flash?.kind === 'caught' ? (
              <span className="pkd-readline" aria-hidden="true">
                <span className="pkd-wobble">
                  <Ball px={26} />
                </span>
                <strong>Gotcha! {flash.species?.name ?? 'It'} was caught.</strong>
                <span className="pkd-tally">
                  {registered} of {ROSTER.length} registered
                </span>
              </span>
            ) : null}

            {flash?.kind === 'fled' ? (
              <span className="pkd-readline" aria-hidden="true">
                <span className="pkd-hop">
                  {flash.species ? <Creature species={flash.species} px={26} silhouette /> : null}
                </span>
                <strong>It broke free and ran into the grass.</strong>
                <span className="pkd-tally">The next one is already here.</span>
              </span>
            ) : null}
          </div>

          {session.phase === 'asking' && question ? (
            <div className={wide ? 'pkd-choices wide' : 'pkd-choices'}>
              {chosen.map((vc, i) => {
                const sp = speciesBySlot[vc.slot] ?? FIRST;
                const f = vc.facets;
                const pair = pairsByKey.get(vc.choice.key);
                const side = isCompare
                  ? vc.choice.key.toUpperCase() === 'L' || i === 0
                    ? 'Left patch'
                    : 'Right patch'
                  : null;

                return (
                  <button
                    key={vc.choice.key}
                    type="button"
                    className={`pkd-choice${pickedKey === vc.choice.key ? ' picked' : ''}${
                      side ? ' sidepick' : ''
                    }`}
                    disabled={session.busy}
                    onClick={() => void throwBall(vc, sp)}
                    aria-label={side ?? describeChoice(sp, f)}
                  >
                    <span className="pkd-throw" aria-hidden="true">
                      <Ball px={18} />
                    </span>

                    {side ? (
                      // The two options are the two patches, so they are named as the patches. A species
                      // here would tell the child nothing about which side they were choosing.
                      <>
                        <span className="pkd-sidemark" aria-hidden="true">
                          {side === 'Left patch' ? '◀' : '▶'}
                        </span>
                        <strong className="pkd-sidename">{side}</strong>
                      </>
                    ) : pair ? (
                      <>
                        <span className="pkd-pair">
                          <FacetMark facets={pair.left} px={38} />
                          <span className="pkd-pairlink" aria-hidden="true">
                            +
                          </span>
                          <FacetMark facets={pair.right} px={38} />
                        </span>
                        <span className="pkd-name">Pair {i + 1}</span>
                      </>
                    ) : (
                      <>
                        <span className="pkd-portrait">
                          <Creature species={sp} px={wide ? 44 : 66} />
                          {hasMark(f) ? (
                            <span className="pkd-badge">
                              <FacetMark facets={f} px={wide ? 26 : 32} />
                            </span>
                          ) : null}
                        </span>
                        <span className="pkd-meta">
                          <span className="pkd-name">{sp.name}</span>
                          <span className="pkd-type" style={{ background: TYPE_COLOR[sp.type] ?? '#4a5568' }}>
                            {sp.type}
                          </span>
                        </span>
                        {f.text !== undefined ? <span className="pkd-text">{f.text}</span> : null}
                        {f.value !== undefined && f.text === undefined ? (
                          <span className="pkd-value">{f.value}</span>
                        ) : null}
                        {f.blocks ? <BlockGrid blocks={f.blocks} /> : null}
                        {f.seq ? <SeqTrail seq={f.seq} /> : null}
                        {f.series ? <Sparkline series={f.series} /> : null}
                        <TraitChips facets={f} keys={varying} />
                      </>
                    )}
                  </button>
                );
              })}
            </div>
          ) : null}

          <div className="pkd-controls" aria-hidden="true">
            <span className="pkd-dpad">
              <span className="pkd-dpad-v" />
              <span className="pkd-dpad-h" />
            </span>
            <span className="pkd-btnrow">
              <span className="pkd-roundbtn" />
              <span className="pkd-roundbtn dark" />
              <span className="pkd-pill" />
              <span className="pkd-pill" />
            </span>
          </div>
        </div>

        {/* ---- right half: the Pokédex itself ---- */}
        <div className="pkd-half pkd-right">
          <div className="pkd-dexhead">
            <h3>Pokédex</h3>
            <span className="pkd-dexcount">
              {registered} <em>/ {ROSTER.length}</em>
            </span>
          </div>
          <div className="pkd-dexbar">
            <span style={{ width: `${(registered / ROSTER.length) * 100}%` }} />
          </div>

          <ul className="pkd-dexgrid">
            {ROSTER.map((sp) => {
              const has = caught.includes(sp.id);
              return (
                <li
                  key={sp.id}
                  className={`pkd-slot${has ? ' has' : ''}${justCaught === sp.id ? ' pop' : ''}`}
                >
                  <span className="pkd-slotnum">#{String(sp.num).padStart(3, '0')}</span>
                  <span className="pkd-slotart" style={has ? { background: `${sp.accent}55` } : undefined}>
                    <Creature species={sp} px={52} silhouette={!has} />
                  </span>
                  <span className="pkd-slotname">{has ? sp.name : '— — —'}</span>
                  <span
                    className="pkd-slottype"
                    style={has ? { background: TYPE_COLOR[sp.type] ?? '#4a5568' } : undefined}
                  >
                    {has ? sp.type : '???'}
                  </span>
                </li>
              );
            })}
          </ul>

          <p className="pkd-dexfoot">
            {registered === 0
              ? 'Nothing registered yet. Catch one and it appears here.'
              : registered === ROSTER.length
                ? 'Every slot on Route 1 is filled.'
                : `${ROSTER.length - registered} still out in the grass.`}
          </p>
        </div>
      </div>
    </div>
  );
}
