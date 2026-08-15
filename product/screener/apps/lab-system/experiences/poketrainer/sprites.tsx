/**
 * Every pixel on this screen, as inline SVG. No image files, no icon font, no network.
 *
 * The creatures are parametric rather than hand-drawn one by one: a body plan plus a type palette plus
 * one crest. That keeps fourteen of them affordable while guaranteeing that no two on the same route
 * share a silhouette, which is the thing that actually makes a roster read as a roster.
 */

import type { BallKind, Crest, Palette, Species } from './roster';
import { TYPE_PALETTE } from './roster';

/* ----------------------------------------------------------------- balls */

interface BallProps {
  readonly kind?: BallKind;
  readonly px?: number;
  /** Draw it open, mid-burst, for the moment something breaks free. */
  readonly open?: boolean;
  readonly className?: string;
}

const BALL_TOP: Record<BallKind, string> = {
  poke: '#ee3f34',
  great: '#2f6bd8',
  ultra: '#2f3238',
  master: '#7b3fb5',
};

const BALL_TOP_DARK: Record<BallKind, string> = {
  poke: '#b8241c',
  great: '#1e4795',
  ultra: '#17191d',
  master: '#54277f',
};

/** The trim that tells a Poké Ball from a Great Ball at a glance. */
function BallTrim({ kind }: { kind: BallKind }) {
  switch (kind) {
    case 'great':
      return (
        <g>
          <path d="M8 31C10 20 16 12 24 9" stroke="#e7413a" strokeWidth="8" fill="none" strokeLinecap="round" />
          <path d="M56 31C54 20 48 12 40 9" stroke="#e7413a" strokeWidth="8" fill="none" strokeLinecap="round" />
          <path d="M32 3v10" stroke="#f2f5f8" strokeWidth="4" strokeLinecap="round" />
        </g>
      );
    case 'ultra':
      return (
        <g>
          <path d="M20 10 27 29" stroke="#f3c623" strokeWidth="7" strokeLinecap="round" />
          <path d="M44 10 37 29" stroke="#f3c623" strokeWidth="7" strokeLinecap="round" />
        </g>
      );
    case 'master':
      return (
        <g>
          <path d="M22 28 25 12l7 9 7-9 3 16" fill="none" stroke="#f06fc0" strokeWidth="4.5" strokeLinejoin="round" strokeLinecap="round" />
          <circle cx="15" cy="16" r="5" fill="#f2f5f8" />
          <circle cx="49" cy="16" r="5" fill="#f2f5f8" />
        </g>
      );
    default:
      return null;
  }
}

export function Ball({ kind = 'poke', px = 24, open = false, className }: BallProps) {
  const top = BALL_TOP[kind];
  const shade = BALL_TOP_DARK[kind];
  const gap = open ? 9 : 0;
  return (
    <svg
      className={className}
      width={px}
      height={px}
      viewBox="0 0 64 64"
      role="presentation"
      aria-hidden="true"
      focusable="false"
    >
      <g transform={`translate(0 ${-gap})`}>
        <path d="M2 32a30 30 0 0 1 60 0z" fill={top} />
        <path d="M2 32a30 30 0 0 1 60 0" fill="none" stroke={shade} strokeWidth="2.5" />
        <BallTrim kind={kind} />
        <ellipse cx="20" cy="15" rx="8" ry="4.5" fill="#ffffff" opacity="0.35" transform="rotate(-28 20 15)" />
      </g>
      <g transform={`translate(0 ${gap})`}>
        <path d="M2 32a30 30 0 0 0 60 0z" fill="#f4f6f8" />
        <path d="M2 32a30 30 0 0 0 60 0" fill="none" stroke="#2b2f36" strokeWidth="2.5" />
        <ellipse cx="32" cy="52" rx="14" ry="5" fill="#d3d8de" opacity="0.7" />
      </g>
      <rect x="0" y={28 - gap} width="64" height={8 + gap * 2} fill="#20242b" rx="1" />
      <circle cx="32" cy="32" r="10" fill="#20242b" />
      <circle cx="32" cy="32" r="7" fill="#f4f6f8" />
      <circle cx="32" cy="32" r="3.4" fill="#c9d0d8" />
      <circle cx="30" cy="30" r="1.4" fill="#ffffff" />
    </svg>
  );
}

/** The flat ball glyph used as a bullet and a list marker. */
export function BallDot({ filled, px = 16 }: { filled: boolean; px?: number }) {
  return (
    <svg width={px} height={px} viewBox="0 0 64 64" aria-hidden="true" focusable="false">
      <circle cx="32" cy="32" r="28" fill={filled ? '#ee3f34' : 'none'} stroke="#20242b" strokeWidth="5" />
      {filled ? <path d="M4 32a28 28 0 0 0 56 0z" fill="#f4f6f8" /> : null}
      <rect x="4" y="27" width="56" height="10" fill="#20242b" />
      <circle cx="32" cy="32" r="10" fill="#20242b" />
      <circle cx="32" cy="32" r="6" fill={filled ? '#f4f6f8' : '#c7ccd4'} />
    </svg>
  );
}

/* ------------------------------------------------------------- creatures */

function Eyes({ x1, x2, y, r = 3.6 }: { x1: number; x2: number; y: number; r?: number }) {
  return (
    <g>
      <ellipse cx={x1} cy={y} rx={r} ry={r * 1.15} fill="#20242b" />
      <ellipse cx={x2} cy={y} rx={r} ry={r * 1.15} fill="#20242b" />
      <circle cx={x1 + r * 0.34} cy={y - r * 0.42} r={r * 0.36} fill="#ffffff" />
      <circle cx={x2 + r * 0.34} cy={y - r * 0.42} r={r * 0.36} fill="#ffffff" />
    </g>
  );
}

/** The one feature that separates two creatures sharing a body plan. */
function CrestArt({ crest, p, x, y }: { crest: Crest; p: Palette; x: number; y: number }) {
  switch (crest) {
    case 'leaf':
      return (
        <g transform={`translate(${x} ${y})`}>
          <path d="M0 0C-2-9 4-15 11-16 10-8 7-2 0 0Z" fill={p.dark} />
          <path d="M0 0C1-6 5-11 10-14" stroke={p.light} strokeWidth="1.6" fill="none" />
        </g>
      );
    case 'flame':
      return (
        <g transform={`translate(${x} ${y})`}>
          <path d="M0 0c-7-4-8-13-3-19 0 5 2 7 4 8-2-6 1-11 6-13-2 7 1 10 2 15 1 5-3 9-9 9Z" fill="#ff9d3c" />
          <path d="M0-3c-4-2-4-7-1-11 0 3 1 4 2 5-1-4 1-6 4-8-1 4 1 6 1 8 1 3-2 6-6 6Z" fill="#ffe066" />
        </g>
      );
    case 'horn':
      return (
        <g transform={`translate(${x} ${y})`}>
          <path d="M-7 0 -4-13 0-1Z" fill={p.light} stroke={p.dark} strokeWidth="1.2" strokeLinejoin="round" />
          <path d="M7 0 4-13 0-1Z" fill={p.light} stroke={p.dark} strokeWidth="1.2" strokeLinejoin="round" />
        </g>
      );
    case 'ears':
      return (
        <g transform={`translate(${x} ${y})`}>
          <path d="M-6 2-13-14 -1-6Z" fill={p.body} stroke={p.dark} strokeWidth="1.4" strokeLinejoin="round" />
          <path d="M6 2 13-14 1-6Z" fill={p.body} stroke={p.dark} strokeWidth="1.4" strokeLinejoin="round" />
        </g>
      );
    case 'crown':
      return (
        <g transform={`translate(${x} ${y})`}>
          <path d="M-11 0-9-11-3-5 0-13 3-5 9-11 11 0Z" fill={p.accent} stroke={p.dark} strokeWidth="1.2" strokeLinejoin="round" />
        </g>
      );
    case 'antenna':
      return (
        <g transform={`translate(${x} ${y})`}>
          <path d="M-3 0C-7-6-10-9-13-11" stroke={p.dark} strokeWidth="2" fill="none" strokeLinecap="round" />
          <path d="M3 0C7-6 10-9 13-11" stroke={p.dark} strokeWidth="2" fill="none" strokeLinecap="round" />
          <circle cx="-13" cy="-12" r="3.2" fill={p.accent} />
          <circle cx="13" cy="-12" r="3.2" fill={p.accent} />
        </g>
      );
    case 'fin':
      return (
        <g transform={`translate(${x} ${y})`}>
          <path d="M-8 0 0-14 8 0Z" fill={p.dark} />
          <path d="M-3 0 0-9 3 0Z" fill={p.light} opacity="0.7" />
        </g>
      );
    case 'bolt':
      return (
        <g transform={`translate(${x} ${y})`}>
          <path d="M2-16-8-3h6l-3 9 11-14H2l3-8Z" fill={p.accent} stroke={p.dark} strokeWidth="1.2" strokeLinejoin="round" />
        </g>
      );
    default:
      return null;
  }
}

function Blob({ p, crest }: { p: Palette; crest: Crest }) {
  return (
    <g>
      <CrestArt crest={crest} p={p} x={32} y={26} />
      <ellipse cx="13" cy="43" rx="5.5" ry="7" fill={p.dark} />
      <ellipse cx="51" cy="43" rx="5.5" ry="7" fill={p.dark} />
      <ellipse cx="22" cy="57" rx="7.5" ry="4.5" fill={p.dark} />
      <ellipse cx="42" cy="57" rx="7.5" ry="4.5" fill={p.dark} />
      <ellipse cx="32" cy="41" rx="20" ry="17" fill={p.body} />
      <ellipse cx="32" cy="46" rx="11.5" ry="10" fill={p.light} />
      <circle cx="17" cy="45" r="3.6" fill={p.accent} opacity="0.75" />
      <circle cx="47" cy="45" r="3.6" fill={p.accent} opacity="0.75" />
      <Eyes x1={25} x2={39} y={37} />
      <path d="M28 44q4 4 8 0" stroke="#20242b" strokeWidth="2" fill="none" strokeLinecap="round" />
    </g>
  );
}

function Quad({ p, crest }: { p: Palette; crest: Crest }) {
  return (
    <g>
      <path d="M49 34c7-4 10-11 8-17-1 6-4 8-7 9" fill="none" stroke={p.dark} strokeWidth="5" strokeLinecap="round" />
      <rect x="22" y="44" width="7.5" height="15" rx="3.5" fill={p.dark} />
      <rect x="45" y="44" width="7.5" height="15" rx="3.5" fill={p.dark} />
      <ellipse cx="36" cy="39" rx="17" ry="12.5" fill={p.body} />
      <rect x="31" y="45" width="7.5" height="14" rx="3.5" fill={p.body} />
      <rect x="38" y="45" width="7.5" height="14" rx="3.5" fill={p.body} />
      <ellipse cx="36" cy="44" rx="11" ry="6" fill={p.light} />
      <path d="M24 31c6 3 16 3 22 0" stroke={p.dark} strokeWidth="1.8" fill="none" opacity="0.5" />
      <CrestArt crest={crest} p={p} x={16} y={20} />
      <circle cx="17" cy="30" r="12.5" fill={p.body} />
      <ellipse cx="7" cy="34" rx="6.5" ry="5" fill={p.light} />
      <circle cx="4" cy="33" r="2.2" fill="#20242b" />
      <ellipse cx="16" cy="28" rx="3.4" ry="3.9" fill="#20242b" />
      <circle cx="17.2" cy="26.6" r="1.3" fill="#ffffff" />
      <path d="M9 39q5 3 9 0" stroke="#20242b" strokeWidth="1.7" fill="none" strokeLinecap="round" />
    </g>
  );
}

function Bird({ p, crest }: { p: Palette; crest: Crest }) {
  return (
    <g>
      <path d="M22 32C10 22 1 30 3 42c2 9 12 9 19 4Z" fill={p.dark} />
      <path d="M42 32C54 22 63 30 61 42c-2 9-12 9-19 4Z" fill={p.dark} />
      <path d="M23 34C14 27 8 33 9 41c1 6 8 6 14 2Z" fill={p.body} />
      <path d="M41 34C50 27 56 33 55 41c-1 6-8 6-14 2Z" fill={p.body} />
      <path d="M26 52 22 62l8-5zM38 52 42 62l-8-5z" fill={p.dark} />
      <ellipse cx="32" cy="38" rx="13" ry="16" fill={p.body} />
      <ellipse cx="32" cy="43" rx="7.5" ry="10" fill={p.light} />
      <CrestArt crest={crest} p={p} x={32} y={24} />
      <path d="M28 36h8l-4 7z" fill={p.accent} stroke={p.dark} strokeWidth="1" strokeLinejoin="round" />
      <Eyes x1={26} x2={38} y={31} r={3.2} />
      <path d="M26 58h6M38 58h-6" stroke={p.accent} strokeWidth="2.4" strokeLinecap="round" />
    </g>
  );
}

function Serpent({ p, crest }: { p: Palette; crest: Crest }) {
  return (
    <g>
      <path
        d="M14 58C6 48 16 42 26 39 38 35 42 28 38 21"
        fill="none"
        stroke={p.dark}
        strokeWidth="13"
        strokeLinecap="round"
      />
      <path
        d="M14 58C6 48 16 42 26 39 38 35 42 28 38 21"
        fill="none"
        stroke={p.body}
        strokeWidth="9"
        strokeLinecap="round"
      />
      <path d="M18 52h7M25 44h7M34 35h6" stroke={p.light} strokeWidth="2.6" strokeLinecap="round" opacity="0.85" />
      <CrestArt crest={crest} p={p} x={40} y={9} />
      <circle cx="40" cy="19" r="12" fill={p.body} />
      <ellipse cx="40" cy="24" rx="7" ry="5" fill={p.light} />
      <Eyes x1={35} x2={45} y={17} r={3.2} />
      <path d="M40 26q0 3 3 3" stroke="#20242b" strokeWidth="1.6" fill="none" strokeLinecap="round" />
    </g>
  );
}

function Float({ p, crest }: { p: Palette; crest: Crest }) {
  return (
    <g>
      <path d="M20 44c2 6 0 9-3 12 5 1 7-1 9-4 1 5 4 7 6 7s5-2 6-7c2 3 4 5 9 4-3-3-5-6-3-12Z" fill={p.dark} opacity="0.85" />
      <circle cx="32" cy="29" r="17" fill={p.body} />
      <circle cx="32" cy="29" r="11" fill={p.light} opacity="0.55" />
      <ellipse cx="32" cy="31" rx="25" ry="7.5" fill="none" stroke={p.accent} strokeWidth="2.4" opacity="0.9" transform="rotate(-14 32 31)" />
      <CrestArt crest={crest} p={p} x={32} y={14} />
      <Eyes x1={26} x2={38} y={28} r={3.4} />
      <path d="M28 35q4 3 8 0" stroke="#20242b" strokeWidth="1.8" fill="none" strokeLinecap="round" />
    </g>
  );
}

function Bug({ p, crest }: { p: Palette; crest: Crest }) {
  return (
    <g>
      <ellipse cx="15" cy="32" rx="11" ry="7" fill="#ffffff" opacity="0.55" stroke={p.dark} strokeWidth="1.4" transform="rotate(-24 15 32)" />
      <ellipse cx="49" cy="32" rx="11" ry="7" fill="#ffffff" opacity="0.55" stroke={p.dark} strokeWidth="1.4" transform="rotate(24 49 32)" />
      <path d="M22 40h-9M22 47h-8M42 40h9M42 47h8" stroke={p.dark} strokeWidth="2.2" strokeLinecap="round" />
      <ellipse cx="32" cy="46" rx="13" ry="12" fill={p.body} />
      <path d="M20 43h24M21 50h22" stroke={p.dark} strokeWidth="3" strokeLinecap="round" opacity="0.8" />
      <ellipse cx="32" cy="30" rx="12" ry="10" fill={p.dark} />
      <ellipse cx="32" cy="30" rx="9" ry="7.5" fill={p.body} />
      <CrestArt crest={crest} p={p} x={32} y={22} />
      <Eyes x1={27} x2={37} y={29} r={3.2} />
    </g>
  );
}

function Spike({ p, crest }: { p: Palette; crest: Crest }) {
  return (
    <g>
      <path d="M8 40 3 28l9 4z" fill={p.dark} />
      <path d="M56 40 61 28l-9 4z" fill={p.dark} />
      <path d="M32 4 51 22 45 54H19L13 22Z" fill={p.body} />
      <path d="M32 4 45 54 32 44 19 54Z" fill={p.light} opacity="0.45" />
      <path d="M32 4 51 22 45 54" fill="none" stroke={p.light} strokeWidth="1.8" opacity="0.7" />
      <path d="M13 22h38" stroke={p.dark} strokeWidth="1.8" opacity="0.5" />
      <CrestArt crest={crest} p={p} x={32} y={6} />
      <Eyes x1={26} x2={39} y={33} r={3.4} />
      <path d="M28 42h9" stroke="#20242b" strokeWidth="2" strokeLinecap="round" />
    </g>
  );
}

function Finned({ p, crest }: { p: Palette; crest: Crest }) {
  return (
    <g>
      <path d="M46 33 62 20l-4 13 4 13z" fill={p.dark} />
      <CrestArt crest={crest} p={p} x={30} y={19} />
      <path d="M11 34C17 17 41 15 48 33 41 51 17 51 11 34Z" fill={p.body} />
      <path d="M17 39C24 48 40 48 46 38 40 47 24 48 17 39Z" fill={p.light} />
      <path d="M27 40 22 52l14-6z" fill={p.dark} opacity="0.9" />
      <path d="M20 26c4 8 4 12 0 18" fill="none" stroke={p.dark} strokeWidth="1.8" opacity="0.6" />
      <ellipse cx="24" cy="30" rx="3.6" ry="4" fill="#20242b" />
      <circle cx="25.2" cy="28.6" r="1.4" fill="#ffffff" />
      <path d="M14 36q4 3 7 1" stroke="#20242b" strokeWidth="1.7" fill="none" strokeLinecap="round" />
    </g>
  );
}

interface CreatureProps {
  readonly species: Species;
  readonly px?: number;
  /** Black fill, for the moment before a creature is identified. */
  readonly silhouette?: boolean;
  readonly className?: string;
}

export function Creature({ species, px = 120, silhouette = false, className }: CreatureProps) {
  const p = TYPE_PALETTE[species.type];
  const flat: Palette = { badge: p.badge, body: '#1d2330', dark: '#1d2330', light: '#1d2330', accent: '#1d2330' };
  const use = silhouette ? flat : p;
  const inner = (() => {
    switch (species.archetype) {
      case 'blob':
        return <Blob p={use} crest={species.crest} />;
      case 'quad':
        return <Quad p={use} crest={species.crest} />;
      case 'bird':
        return <Bird p={use} crest={species.crest} />;
      case 'serpent':
        return <Serpent p={use} crest={species.crest} />;
      case 'float':
        return <Float p={use} crest={species.crest} />;
      case 'bug':
        return <Bug p={use} crest={species.crest} />;
      case 'spike':
        return <Spike p={use} crest={species.crest} />;
      case 'finned':
        return <Finned p={use} crest={species.crest} />;
      default:
        return <Blob p={use} crest={species.crest} />;
    }
  })();
  return (
    <svg
      className={className}
      width={px}
      height={px}
      viewBox="0 0 64 64"
      role="img"
      aria-label={silhouette ? 'An unidentified Pokémon' : species.name}
      focusable="false"
    >
      {silhouette ? <g opacity="0.92">{inner}</g> : inner}
    </svg>
  );
}

/* ---------------------------------------------------------------- chrome */

export function TypeBadge({ type, small = false }: { type: Species['type']; small?: boolean }) {
  return (
    <span className={small ? 'pkb-type sm' : 'pkb-type'} style={{ background: TYPE_PALETTE[type].badge }}>
      {type}
    </span>
  );
}

/** Four-point sparkle, for the click of a ball that stayed shut. */
export function Sparkle({ px = 22, className }: { px?: number; className?: string }) {
  return (
    <svg className={className} width={px} height={px} viewBox="0 0 32 32" aria-hidden="true" focusable="false">
      <path d="M16 0c1.5 9 6.5 14 16 16-9.5 2-14.5 7-16 16-1.5-9-6.5-14-16-16 9.5-2 14.5-7 16-16z" fill="#fff2a8" />
      <path d="M16 6c1 5.5 4.5 9 10 10-5.5 1-9 4.5-10 10-1-5.5-4.5-9-10-10 5.5-1 9-4.5 10-10z" fill="#ffffff" />
    </svg>
  );
}

/** The trainer, from behind, arm up with their division's ball ready. */
export function TrainerBack({ px = 130, ball = 'poke' }: { px?: number; ball?: BallKind }) {
  const held = BALL_TOP[ball];
  return (
    <svg width={px} height={px} viewBox="0 0 88 108" aria-hidden="true" focusable="false">
      <ellipse cx="42" cy="103" rx="26" ry="5" fill="#1f3b1c" opacity="0.3" />
      <rect x="30" y="78" width="11" height="22" rx="5" fill="#28407e" />
      <rect x="45" y="78" width="11" height="22" rx="5" fill="#28407e" />
      <ellipse cx="35" cy="101" rx="9" ry="4.4" fill="#20242b" />
      <ellipse cx="51" cy="101" rx="9" ry="4.4" fill="#20242b" />
      <path d="M22 56q21-8 42 0l5 28q-26 8-52 0z" fill="#2f6bd8" />
      <path d="M38 51h10l2 35h-14z" fill="#f4f6f8" opacity="0.9" />
      <path d="M24 82q19 6 38 0l1 5q-20 6-40 0z" fill="#20242b" />
      <path d="M22 58q-9 6-9 18l9 3z" fill="#2f6bd8" />
      <path d="M65 58q7 3 9 10l-8 5z" fill="#2f6bd8" />
      <path d="M66 62 78 40l8 5-11 22z" fill="#2f6bd8" />
      <circle cx="82" cy="38" r="7.5" fill="#f2c9a2" />
      <circle cx="82" cy="30" r="8" fill={held} />
      <path d="M74 30a8 8 0 0 0 16 0z" fill="#f4f6f8" />
      <rect x="74" y="28.4" width="16" height="3.4" fill="#20242b" />
      <path d="M24 47c0-13 8-21 18-21s18 8 18 21c0 8-8 12-18 12s-18-4-18-12z" fill="#33251b" />
      <path d="M24 44a19 19 0 0 1 38 0c0 4-2 6-6 6H30c-4 0-6-2-6-6z" fill="#e3350d" />
      <path d="M24 44a19 19 0 0 1 38 0z" fill="#f04a26" />
      <rect x="22" y="43" width="42" height="6" rx="3" fill="#f4f6f8" />
      <circle cx="43" cy="35" r="7" fill="#f4f6f8" />
      <path d="M36 35a7 7 0 0 1 14 0z" fill="#e3350d" />
      <circle cx="43" cy="35" r="2.4" fill="#20242b" />
    </svg>
  );
}

/**
 * The horizon: two hill bands and a treeline.
 *
 * The treeline is a bumpy silhouette rather than trees with trunks, because this SVG is stretched to
 * whatever width the scene happens to be and a stretched trunk reads as a mushroom.
 */
export function RouteHorizon() {
  return (
    <svg
      className="pkb-horizon"
      viewBox="0 0 320 100"
      preserveAspectRatio="none"
      aria-hidden="true"
      focusable="false"
    >
      {/*
        Every band must reach x=320 before it closes. A path that stops short leaves the right of the
        scene uncovered, which showed up as a hard rectangular step in the hillside.
      */}
      <path
        d="M0 34 Q40 18 80 30 Q120 42 160 26 Q200 10 240 24 Q280 38 320 26 L320 100 L0 100 Z"
        fill="#a3dc83"
      />
      <path
        d="M0 56 Q45 44 90 54 Q135 64 180 50 Q225 36 270 48 Q296 55 320 50 L320 100 L0 100 Z"
        fill="#7cc85f"
      />
      <path
        d="M0 80 Q60 70 120 80 Q180 90 240 78 Q282 70 320 76 L320 100 L0 100 Z"
        fill="#57ab4d"
      />
    </svg>
  );
}

/** One clump of route grass. Several of these across the foreground make the band read as tall grass. */
export function GrassTuft({ px = 54, className }: { px?: number; className?: string }) {
  return (
    <svg className={className} width={px} height={px * 0.6} viewBox="0 0 60 36" aria-hidden="true" focusable="false">
      <path d="M6 36C4 24 8 14 14 8c-2 10 0 20 4 28z" fill="#3f8f3c" />
      <path d="M20 36C16 22 20 10 28 4c-4 12-2 22 0 32z" fill="#4fa348" />
      <path d="M34 36C32 22 38 10 46 6c-6 10-6 20-4 30z" fill="#3f8f3c" />
      <path d="M46 36c0-10 4-18 10-22-4 8-4 15-3 22z" fill="#61b556" />
    </svg>
  );
}

/** The League's own mark: a ball inside a laurel, stamped on the desk and the trainer card. */
export function LeagueCrest({ px = 64 }: { px?: number }) {
  return (
    <svg width={px} height={px} viewBox="0 0 64 64" aria-hidden="true" focusable="false">
      <path d="M14 34c-4-12 2-22 10-26-4 8-4 18 2 26z" fill="#c9a227" />
      <path d="M50 34c4-12-2-22-10-26 4 8 4 18-2 26z" fill="#c9a227" />
      <path d="M12 36c2 12 10 20 20 22 10-2 18-10 20-22z" fill="none" stroke="#c9a227" strokeWidth="3" strokeLinecap="round" />
      <circle cx="32" cy="28" r="16" fill="#f4f6f8" stroke="#20242b" strokeWidth="3" />
      <path d="M16 28a16 16 0 0 1 32 0z" fill="#ee3f34" />
      <rect x="16" y="25" width="32" height="6" fill="#20242b" />
      <circle cx="32" cy="28" r="6" fill="#20242b" />
      <circle cx="32" cy="28" r="3.4" fill="#f4f6f8" />
    </svg>
  );
}
