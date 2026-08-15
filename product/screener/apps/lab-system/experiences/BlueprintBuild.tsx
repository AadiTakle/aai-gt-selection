import { useEffect, useMemo, useState, type ReactElement } from 'react';

import { ItemFrame } from '../shared/ItemFrame';
import { loadProgress, recordRound, spend, unlock, type Progress } from '../shared/progression';
import type { ExperienceMeta, Palette } from '../shared/types';
import { useScreenerSession } from '../shared/useScreenerSession';

import './BlueprintBuild.css';

/**
 * Blueprint Build, for grades 4-5. One plot, twelve structures, one blueprint. Every shift the child
 * finishes puts the next structure in the ground, and the plot is drawn as a real isometric build that
 * visibly grows.
 *
 * WHY THIS SHAPE FOR NINE TO ELEVEN YEAR OLDS. This band wants competence and a plan they can see, so
 * the pull is not a surprise or a sticker: the whole blueprint is on screen from the first second as
 * cyan wireframe ghosts on numbered plates, and the child can read exactly what structure 07 is going to
 * be before they have built 01. Cold start is therefore the most legible screen in the experience rather
 * than the emptiest one. The session runs at the Standard step, 8 to 16 items, which lands under twelve
 * minutes for this band.
 *
 * WHAT IS AND IS NOT TIED TO ANYTHING. Structures come from `progress.rounds`. Emeralds come from
 * `recordRound`. Parts of the structure under construction materialise off `session.answerCount`, which
 * ticks on every response whatever it was. Nothing anywhere in this file can see whether a response was
 * right, which is deliberate on the hook's part and load-bearing here: a child optimising for a payout
 * has stopped producing the behaviour the measurement depends on.
 */

export const meta: ExperienceMeta = {
  id: 'blueprint-build',
  title: 'Blueprint Build',
  world: 'Minecraft',
  band: '4-5',
  pull: 'A base that grows every time you finish a round',
  accent: '#5d9c3c',
};

/**
 * Retints the item frame to oak, parchment and grass so a served item reads as a plan pinned to the
 * workbench. `--bad` is deliberately a muted rust rather than an alarm red: nothing in this experience
 * should be able to flash a warning colour at a child.
 */
const PALETTE: Palette = {
  '--ink': '#241c14',
  '--accent': '#5d9c3c',
  '--accent2': '#3c6b2a',
  '--good': '#2f7d32',
  '--bad': '#8a5a3a',
  '--card': '#f6ecd8',
  '--bg1': '#efe3cc',
  '--bg2': '#e3d3b6',
  '--line': '#c6ac82',
  '--paper': '#f9f1e0',
  '--socket': '#cdb489',
};

/* ------------------------------------------------------------------ *
 * Isometric geometry. Everything on the plot is a box on a 2:1 grid.
 * ------------------------------------------------------------------ */

const TW = 100;
const TH = 50;
const COLS = 4;
const ROWS = 3;

/** Keeps the emitted point strings short enough to read in devtools. */
function r2(v: number): number {
  return Math.round(v * 100) / 100;
}

interface Faces {
  readonly top: string;
  readonly left: string;
  readonly right: string;
}

/**
 * The three visible faces of a box, as SVG polygon point strings.
 *
 * `cx`/`cy` are fractional grid coordinates, `sx`/`sy` a footprint in tile units, `base` how far the
 * underside floats above the ground plane and `h` the height, both in projected pixels. Half-steps along
 * the two grid axes project to (TW/2, TH/2) and (-TW/2, TH/2), and every corner is the centre plus or
 * minus those, which is the whole trick.
 */
function faces(cx: number, cy: number, sx: number, sy: number, base: number, h: number): Faces {
  const px = (cx - cy) * (TW / 2);
  const py = (cx + cy) * (TH / 2);
  const ux = (sx * TW) / 4;
  const uy = (sx * TH) / 4;
  const vx = -(sy * TW) / 4;
  const vy = (sy * TH) / 4;
  const t = py - base - h;

  const nX = r2(px - ux - vx);
  const nY = r2(t - uy - vy);
  const eX = r2(px + ux - vx);
  const eY = r2(t + uy - vy);
  const sX = r2(px + ux + vx);
  const sY = r2(t + uy + vy);
  const wX = r2(px - ux + vx);
  const wY = r2(t - uy + vy);

  return {
    top: `${nX},${nY} ${eX},${eY} ${sX},${sY} ${wX},${wY}`,
    left: `${wX},${wY} ${sX},${sY} ${sX},${r2(sY + h)} ${wX},${r2(wY + h)}`,
    right: `${eX},${eY} ${sX},${sY} ${sX},${r2(sY + h)} ${eX},${r2(eY + h)}`,
  };
}

function centreOf(cx: number, cy: number): { x: number; y: number } {
  return { x: r2((cx - cy) * (TW / 2)), y: r2((cx + cy) * (TH / 2)) };
}

/** Unit-length isometric basis, so text can lie flat on the ground plane at a normal font size. */
const GROUND_MATRIX = 'matrix(0.8944,0.4472,-0.8944,0.4472,';

/* ------------------------------------------------------------------ *
 * Materials. Top face brightest, right face mid, left face darkest.
 * ------------------------------------------------------------------ */

interface Mat {
  readonly top: string;
  readonly left: string;
  readonly right: string;
}

const MATS = {
  grass: { top: '#6f9f3f', left: '#3f5f26', right: '#537b31' },
  wild: { top: '#5f8c37', left: '#365121', right: '#476b2a' },
  dirt: { top: '#8b6743', left: '#54402a', right: '#6d5135' },
  gravel: { top: '#8f8a82', left: '#565248', right: '#706b62' },
  stone: { top: '#9d9d9d', left: '#5e5e5e', right: '#7c7c7c' },
  cobble: { top: '#8b8b8b', left: '#525252', right: '#6d6d6d' },
  oak: { top: '#c08f55', left: '#7a5832', right: '#9b7343' },
  plank: { top: '#cba471', left: '#846445', right: '#a88558' },
  darkoak: { top: '#6f4c2d', left: '#3d2917', right: '#563a22' },
  chest: { top: '#c19a63', left: '#6a4a2c', right: '#8d663d' },
  iron: { top: '#dcdce2', left: '#9d9da6', right: '#bcbcc4' },
  gold: { top: '#f4cf5c', left: '#b08d33', right: '#d2ae46' },
  emerald: { top: '#46d886', left: '#1f8b4e', right: '#2fb266' },
  lapis: { top: '#4079e0', left: '#1f4390', right: '#2d5ab6' },
  obsidian: { top: '#3b3055', left: '#1b1630', right: '#2a2242' },
  portal: { top: '#a660e4', left: '#5c2c90', right: '#7c42b9' },
  redstone: { top: '#e14c3c', left: '#932720', right: '#bb372c' },
  wheat: { top: '#ddc46b', left: '#978133', right: '#bba248' },
  water: { top: '#4685d4', left: '#22508f', right: '#2f68b1' },
  ember: { top: '#ffb347', left: '#b95513', right: '#e0781f' },
  quartz: { top: '#f3eee5', left: '#bdb6a8', right: '#dad3c6' },
  bookshelf: { top: '#c9a06a', left: '#5f4227', right: '#84603a' },
  banner: { top: '#d8452f', left: '#8d2517', right: '#b53422' },
  lantern: { top: '#ffe9a8', left: '#c69a3e', right: '#e6bd5c' },
} as const;

/* ------------------------------------------------------------------ *
 * The blueprint. Twelve structures, one per cell, in build order.
 * ------------------------------------------------------------------ */

interface Part {
  readonly dx?: number;
  readonly dy?: number;
  readonly sx: number;
  readonly sy?: number;
  readonly base?: number;
  readonly h: number;
  readonly mat: Mat;
  readonly glow?: boolean;
  readonly beam?: boolean;
}

interface Structure {
  readonly id: string;
  readonly name: string;
  readonly note: string;
  readonly mats: string;
  readonly c: number;
  readonly r: number;
  /** Authored back to front, so drawing them in array order already resolves overlaps. */
  readonly parts: readonly Part[];
}

const BLUEPRINT: readonly Structure[] = [
  {
    id: 'shelter',
    name: 'Oak Shelter',
    note: 'Four walls, a door and a roof. Nothing on this plot sleeps outside.',
    mats: 'OAK PLANKS ×48 · COBBLESTONE ×22',
    c: 1,
    r: 2,
    parts: [
      { sx: 0.82, h: 6, mat: MATS.cobble },
      { sx: 0.64, base: 6, h: 30, mat: MATS.plank },
      { sx: 0.78, base: 36, h: 8, mat: MATS.darkoak },
      { sx: 0.5, base: 44, h: 8, mat: MATS.darkoak },
      { dx: 0.16, dy: 0.33, sx: 0.18, sy: 0.06, base: 6, h: 21, mat: MATS.oak },
    ],
  },
  {
    id: 'crafting',
    name: 'Crafting Bay',
    note: 'A bench, a stack of logs, and enough floor to lay every tool out flat.',
    mats: 'OAK LOG ×12 · STONE ×26',
    c: 2,
    r: 2,
    parts: [
      { sx: 0.84, h: 5, mat: MATS.stone },
      { dx: -0.16, dy: -0.16, sx: 0.34, base: 5, h: 24, mat: MATS.oak },
      { dx: -0.16, dy: -0.16, sx: 0.44, base: 29, h: 6, mat: MATS.darkoak },
      { dx: 0.2, dy: -0.18, sx: 0.22, base: 5, h: 14, mat: MATS.oak },
      { dx: 0.2, dy: -0.18, sx: 0.22, base: 19, h: 7, mat: MATS.darkoak },
      { dx: 0.04, dy: 0.24, sx: 0.3, sy: 0.22, base: 5, h: 4, mat: MATS.iron },
    ],
  },
  {
    id: 'smeltery',
    name: 'Smeltery',
    note: 'Two furnaces banked side by side. Ore goes in, ingots come out.',
    mats: 'COBBLESTONE ×64 · COAL ×16',
    c: 2,
    r: 1,
    parts: [
      { sx: 0.84, h: 6, mat: MATS.cobble },
      { dx: -0.18, dy: -0.16, sx: 0.32, base: 6, h: 30, mat: MATS.stone },
      { dx: -0.18, dy: -0.16, sx: 0.38, base: 36, h: 5, mat: MATS.cobble },
      { dx: 0.18, dy: -0.16, sx: 0.32, base: 6, h: 26, mat: MATS.stone },
      { dx: 0.18, dy: -0.16, sx: 0.38, base: 32, h: 5, mat: MATS.cobble },
      { dx: 0, dy: 0.24, sx: 0.34, sy: 0.2, base: 6, h: 5, mat: MATS.ember, glow: true },
    ],
  },
  {
    id: 'storage',
    name: 'Storage Hall',
    note: 'Chests in rows, everything exactly where you left it.',
    mats: 'OAK PLANKS ×36 · IRON INGOT ×8',
    c: 1,
    r: 0,
    parts: [
      { sx: 0.86, h: 5, mat: MATS.plank },
      { dx: -0.2, dy: -0.2, sx: 0.28, base: 5, h: 16, mat: MATS.chest },
      { dx: 0.2, dy: -0.2, sx: 0.28, base: 5, h: 16, mat: MATS.chest },
      { dx: -0.2, dy: 0.2, sx: 0.28, base: 5, h: 16, mat: MATS.chest },
      { dx: 0.2, dy: 0.2, sx: 0.28, base: 5, h: 16, mat: MATS.chest },
      { dx: 0.2, dy: 0.2, sx: 0.3, sy: 0.08, base: 11, h: 4, mat: MATS.iron },
    ],
  },
  {
    id: 'farm',
    name: 'Wheat Farm',
    note: 'Tilled rows either side of a water channel. Food that keeps coming back.',
    mats: 'DIRT ×40 · SEEDS ×24 · WATER ×2',
    c: 0,
    r: 1,
    parts: [
      { sx: 0.9, h: 4, mat: MATS.dirt },
      { dy: -0.28, sx: 0.86, sy: 0.2, base: 4, h: 11, mat: MATS.wheat },
      { sx: 0.9, sy: 0.16, base: 1, h: 3, mat: MATS.water },
      { dy: 0.28, sx: 0.86, sy: 0.2, base: 4, h: 11, mat: MATS.wheat },
    ],
  },
  {
    id: 'well',
    name: 'Stone Well',
    note: 'A stone ring, roofed against the rain, right at the centre of the plot.',
    mats: 'COBBLESTONE ×30 · OAK FENCE ×6',
    c: 0,
    r: 2,
    parts: [
      { sx: 0.7, h: 6, mat: MATS.cobble },
      { sx: 0.5, base: 6, h: 14, mat: MATS.stone },
      { sx: 0.34, base: 6, h: 12, mat: MATS.water },
      { dx: -0.16, dy: -0.16, sx: 0.08, base: 20, h: 22, mat: MATS.oak },
      { dx: 0.16, dy: 0.16, sx: 0.08, base: 20, h: 22, mat: MATS.oak },
      { sx: 0.6, base: 42, h: 7, mat: MATS.darkoak },
    ],
  },
  {
    id: 'tower',
    name: 'Watchtower',
    note: 'High enough to see the whole plot and everything walking toward it.',
    mats: 'STONE BRICK ×96 · OAK LOG ×14',
    c: 0,
    r: 0,
    parts: [
      { sx: 0.74, h: 6, mat: MATS.cobble },
      { sx: 0.5, base: 6, h: 52, mat: MATS.stone },
      { sx: 0.44, base: 58, h: 22, mat: MATS.cobble },
      { sx: 0.62, base: 80, h: 7, mat: MATS.darkoak },
      { sx: 0.14, base: 87, h: 26, mat: MATS.oak },
      { dx: 0.08, dy: -0.08, sx: 0.28, sy: 0.05, base: 96, h: 15, mat: MATS.banner },
    ],
  },
  {
    id: 'hall',
    name: 'Great Hall',
    note: 'One long room with a pillar at each end. Where the base stops being a camp.',
    mats: 'STONE BRICK ×120 · DARK OAK ×44',
    c: 1,
    r: 1,
    parts: [
      { sx: 0.92, h: 6, mat: MATS.stone },
      { dx: -0.3, sx: 0.12, sy: 0.52, base: 6, h: 44, mat: MATS.darkoak },
      { sx: 0.84, sy: 0.5, base: 6, h: 34, mat: MATS.plank },
      { dx: 0.3, sx: 0.12, sy: 0.52, base: 6, h: 44, mat: MATS.darkoak },
      { sx: 0.9, sy: 0.64, base: 40, h: 8, mat: MATS.darkoak },
      { sx: 0.58, sy: 0.32, base: 48, h: 8, mat: MATS.darkoak },
    ],
  },
  {
    id: 'annex',
    name: 'Enchanting Annex',
    note: 'Bookshelves round a lectern. This is where good gear becomes better gear.',
    mats: 'OBSIDIAN ×14 · BOOKSHELF ×15 · LAPIS ×9',
    c: 2,
    r: 0,
    parts: [
      { sx: 0.86, h: 6, mat: MATS.obsidian },
      { dy: -0.3, sx: 0.74, sy: 0.16, base: 6, h: 26, mat: MATS.bookshelf },
      { dx: -0.3, sx: 0.16, sy: 0.74, base: 6, h: 26, mat: MATS.bookshelf },
      { sx: 0.24, base: 6, h: 14, mat: MATS.obsidian },
      { sx: 0.3, sy: 0.22, base: 20, h: 5, mat: MATS.oak },
      { sx: 0.16, base: 31, h: 10, mat: MATS.lapis, glow: true },
      { dx: 0.3, sx: 0.16, sy: 0.74, base: 6, h: 26, mat: MATS.bookshelf },
    ],
  },
  {
    id: 'rail',
    name: 'Rail Terminus',
    note: 'Track in, track out, one cart parked and already loaded.',
    mats: 'IRON INGOT ×48 · REDSTONE ×6 · OAK ×12',
    c: 3,
    r: 2,
    parts: [
      { sx: 0.88, h: 5, mat: MATS.gravel },
      { dy: -0.2, sx: 0.84, sy: 0.12, base: 5, h: 4, mat: MATS.iron },
      { dx: 0.06, sx: 0.3, sy: 0.32, base: 9, h: 16, mat: MATS.stone },
      { dx: 0.06, sx: 0.22, sy: 0.24, base: 22, h: 4, mat: MATS.redstone },
      { dy: 0.2, sx: 0.84, sy: 0.12, base: 5, h: 4, mat: MATS.iron },
    ],
  },
  {
    id: 'gate',
    name: 'Nether Gate',
    note: 'Obsidian frame, lit and holding steady.',
    mats: 'OBSIDIAN ×14 · FLINT AND STEEL ×1',
    c: 3,
    r: 1,
    parts: [
      { sx: 0.8, h: 6, mat: MATS.obsidian },
      { dx: -0.22, sx: 0.16, sy: 0.5, base: 6, h: 42, mat: MATS.obsidian },
      { sx: 0.3, sy: 0.42, base: 8, h: 34, mat: MATS.portal, glow: true },
      { dx: 0.22, sx: 0.16, sy: 0.5, base: 6, h: 42, mat: MATS.obsidian },
      { sx: 0.62, sy: 0.5, base: 48, h: 8, mat: MATS.obsidian },
    ],
  },
  {
    id: 'beacon',
    name: 'Beacon',
    note: 'Lit off a full iron base. You can find your way home from anywhere on the map.',
    mats: 'IRON BLOCK ×164 · NETHER STAR ×1',
    c: 3,
    r: 0,
    parts: [
      { sx: 0.86, h: 6, mat: MATS.iron },
      { sx: 0.66, base: 6, h: 8, mat: MATS.quartz },
      { sx: 0.46, base: 14, h: 16, mat: MATS.obsidian },
      { sx: 0.3, base: 30, h: 12, mat: MATS.emerald, glow: true },
      { sx: 0.38, base: 42, h: 6, mat: MATS.quartz },
      { sx: 0.18, base: 48, h: 118, mat: MATS.emerald, beam: true },
    ],
  },
];

/* ------------------------------------------------------------------ *
 * The trading post. Every price is paid in emeralds earned by turning
 * up, and every item is scenery: none of it changes the shift.
 * ------------------------------------------------------------------ */

interface Upgrade {
  readonly id: string;
  readonly name: string;
  readonly note: string;
  readonly cost: number;
}

const UPGRADES: readonly Upgrade[] = [
  { id: 'torches', name: 'Torch Line', note: 'Four corner torches, so the plot keeps its light after dark.', cost: 30 },
  { id: 'path', name: 'Cobble Paths', note: 'A crossroads through the middle so nothing gets tracked through the wheat.', cost: 65 },
  { id: 'wall', name: 'Perimeter Wall', note: 'Cobble the whole way round, one block proud of the ground.', cost: 110 },
  { id: 'lamps', name: 'Nightfall Lamps', note: 'Lanterns on every side. Turns the plot over to evening light.', cost: 150 },
];

/** Loot in the hotbar, one material per slot, so a long shift stacks rather than overflows. */
const LOOT: readonly Mat[] = [
  MATS.cobble,
  MATS.oak,
  MATS.iron,
  MATS.wheat,
  MATS.gravel,
  MATS.lapis,
  MATS.gold,
  MATS.redstone,
  MATS.emerald,
];

const SLOTS = LOOT.length;

/** Where surplus supplies stack once every structure on the blueprint is standing. */
const CRATE_SPOTS: readonly { readonly cx: number; readonly cy: number }[] = [
  { cx: 1.5, cy: -0.55 },
  { cx: -0.55, cy: 1.5 },
  { cx: 1.5, cy: 2.55 },
  { cx: 3.55, cy: 1.5 },
  { cx: 0.5, cy: -0.55 },
  { cx: -0.55, cy: 0.5 },
  { cx: 2.5, cy: 2.55 },
  { cx: 3.55, cy: 2.5 },
];

/* ------------------------------------------------------------------ *
 * Plot rendering
 * ------------------------------------------------------------------ */

function partShape(part: Part, c: number, r: number, uid: string, key: string) {
  const f = faces(
    c + (part.dx ?? 0),
    r + (part.dy ?? 0),
    part.sx,
    part.sy ?? part.sx,
    part.base ?? 0,
    part.h,
  );
  const fill = part.beam ? `url(#${uid}-beam)` : null;
  const cls = part.beam ? 'bp-beam' : undefined;
  return (
    <g key={key}>
      {part.glow ? (
        <polygon points={f.top} fill={part.mat.top} className="bp-halo" filter={`url(#${uid}-soft)`} />
      ) : null}
      <polygon points={f.left} fill={fill ?? part.mat.left} className={cls} />
      <polygon points={f.right} fill={fill ?? part.mat.right} className={cls} />
      <polygon points={f.top} fill={fill ?? part.mat.top} className={cls} />
    </g>
  );
}

function ghostShape(part: Part, c: number, r: number, key: string) {
  const f = faces(
    c + (part.dx ?? 0),
    r + (part.dy ?? 0),
    part.sx,
    part.sy ?? part.sx,
    part.base ?? 0,
    part.h,
  );
  return (
    <g key={key}>
      <polygon points={f.top} />
      <polygon points={f.left} />
      <polygon points={f.right} />
    </g>
  );
}

function boxShape(
  cx: number,
  cy: number,
  sx: number,
  sy: number,
  base: number,
  h: number,
  mat: Mat,
  key: string,
  className?: string,
) {
  const f = faces(cx, cy, sx, sy, base, h);
  return (
    <g key={key} className={className}>
      <polygon points={f.left} fill={mat.left} />
      <polygon points={f.right} fill={mat.right} />
      <polygon points={f.top} fill={mat.top} />
    </g>
  );
}

interface PlotProps {
  readonly uid: string;
  readonly placed: number;
  readonly underway: number | null;
  readonly underwayParts: number;
  readonly landing: number | null;
  readonly upgrades: ReadonlySet<string>;
  readonly crates: number;
  readonly compact?: boolean;
  readonly label: string;
}

function Plot({
  uid,
  placed,
  underway,
  underwayParts,
  landing,
  upgrades,
  crates,
  compact = false,
  label,
}: PlotProps) {
  const hasWall = upgrades.has('wall');
  const hasPath = upgrades.has('path');
  const hasTorches = upgrades.has('torches');
  const night = upgrades.has('lamps');

  // Everything above ground goes into one depth-sorted pass, because a long wall and a tall tower only
  // overlap correctly if they are ordered by the same rule.
  const layers: { d: number; node: ReactElement }[] = [];

  BLUEPRINT.forEach((s, i) => {
    const d = s.c + s.r;
    if (i < placed) {
      layers.push({
        d,
        node: (
          <g key={`s-${s.id}`} className={`bp-struct${landing === i ? ' is-landing' : ''}`}>
            {s.parts.map((p, j) => partShape(p, s.c, s.r, uid, `${s.id}-${j}`))}
            {landing === i ? (
              <ellipse
                className="bp-dust"
                cx={centreOf(s.c, s.r).x}
                cy={centreOf(s.c, s.r).y}
                rx={46}
                ry={23}
              />
            ) : null}
          </g>
        ),
      });
      return;
    }

    const isUnderway = underway === i;
    const shown = isUnderway ? Math.max(0, Math.min(s.parts.length, underwayParts)) : 0;
    const centre = centreOf(s.c, s.r);
    const plate = faces(s.c, s.r, 0.92, 0.92, 0, 0);
    const inner = faces(s.c, s.r, 0.74, 0.74, 0, 0);

    layers.push({
      d,
      node: (
        <g key={`p-${s.id}`} className={`bp-plan${isUnderway ? ' is-underway' : ''}`}>
          <polygon points={plate.top} className="bp-plan-plate" />
          <polygon points={inner.top} className="bp-plan-dash" />
          <g className="bp-ghost">{s.parts.map((p, j) => ghostShape(p, s.c, s.r, `${s.id}-g${j}`))}</g>
          {shown > 0
            ? s.parts.slice(0, shown).map((p, j) => partShape(p, s.c, s.r, uid, `${s.id}-b${j}`))
            : null}
          {!compact ? (
            <text
              className="bp-plan-num"
              transform={`${GROUND_MATRIX}${centre.x},${centre.y})`}
              textAnchor="middle"
              dominantBaseline="central"
              fontSize={20}
            >
              {String(i + 1).padStart(2, '0')}
            </text>
          ) : null}
        </g>
      ),
    });
  });

  if (hasWall) {
    for (let c = -1; c <= COLS; c += 1) {
      layers.push({ d: c - 1, node: boxShape(c, -1, 1, 1, 0, 14, MATS.cobble, `wn-${c}`) });
      layers.push({ d: c + ROWS, node: boxShape(c, ROWS, 1, 1, 0, 14, MATS.cobble, `ws-${c}`) });
    }
    for (let r = 0; r < ROWS; r += 1) {
      layers.push({ d: r - 1, node: boxShape(-1, r, 1, 1, 0, 14, MATS.cobble, `ww-${r}`) });
      layers.push({ d: r + COLS, node: boxShape(COLS, r, 1, 1, 0, 14, MATS.cobble, `we-${r}`) });
    }
  }

  if (hasTorches) {
    const spots = [
      { cx: -0.5, cy: -0.5 },
      { cx: COLS - 0.5, cy: -0.5 },
      { cx: -0.5, cy: ROWS - 0.5 },
      { cx: COLS - 0.5, cy: ROWS - 0.5 },
    ];
    spots.forEach((sp, i) => {
      const f = faces(sp.cx, sp.cy, 0.14, 0.14, 26, 6);
      layers.push({
        d: sp.cx + sp.cy + 0.01,
        node: (
          <g key={`t-${i}`} className="bp-torch">
            {boxShape(sp.cx, sp.cy, 0.14, 0.14, 0, 26, MATS.oak, `tp-${i}`)}
            <polygon points={f.top} fill={MATS.ember.top} className="bp-halo" filter={`url(#${uid}-soft)`} />
            <polygon points={f.left} fill={MATS.ember.left} />
            <polygon points={f.right} fill={MATS.ember.right} />
            <polygon points={f.top} fill={MATS.ember.top} />
          </g>
        ),
      });
    });
  }

  if (night) {
    const spots = [
      { cx: 1.5, cy: -0.85 },
      { cx: -0.85, cy: 1 },
      { cx: 1.5, cy: 2.85 },
      { cx: 3.85, cy: 1 },
    ];
    spots.forEach((sp, i) => {
      const f = faces(sp.cx, sp.cy, 0.3, 0.3, 30, 10);
      layers.push({
        d: sp.cx + sp.cy + 0.02,
        node: (
          <g key={`l-${i}`} className="bp-lamp">
            {boxShape(sp.cx, sp.cy, 0.12, 0.12, 0, 30, MATS.iron, `lp-${i}`)}
            <polygon points={f.top} fill={MATS.lantern.top} className="bp-halo" filter={`url(#${uid}-soft)`} />
            <polygon points={f.left} fill={MATS.lantern.left} />
            <polygon points={f.right} fill={MATS.lantern.right} />
            <polygon points={f.top} fill={MATS.lantern.top} />
          </g>
        ),
      });
    });
  }

  for (let i = 0; i < Math.min(crates, CRATE_SPOTS.length); i += 1) {
    const spot = CRATE_SPOTS[i];
    if (!spot) continue;
    layers.push({
      d: spot.cx + spot.cy,
      node: (
        <g key={`c-${i}`}>
          {boxShape(spot.cx, spot.cy, 0.32, 0.32, 0, 15, MATS.chest, `cr-${i}`)}
          {boxShape(spot.cx, spot.cy, 0.34, 0.09, 10, 4, MATS.iron, `cb-${i}`)}
        </g>
      ),
    });
  }

  layers.sort((a, b) => a.d - b.d);

  const slab = faces(1.5, 1, 6.2, 5.2, -16, 16);
  const roadA = faces(1.5, 1, 6.0, 0.3, 0, 3);
  const roadB = faces(1.5, 1, 0.3, 5.0, 0, 3);

  const tiles: ReactElement[] = [];
  for (let r = -1; r <= ROWS; r += 1) {
    for (let c = -1; c <= COLS; c += 1) {
      const inPlot = c >= 0 && c < COLS && r >= 0 && r < ROWS;
      const mat = inPlot ? MATS.grass : MATS.wild;
      const f = faces(c, r, inPlot ? 0.96 : 1, inPlot ? 0.96 : 1, 0, 0);
      tiles.push(
        <polygon
          key={`g-${c}-${r}`}
          points={f.top}
          fill={mat.top}
          className={inPlot ? 'bp-tile is-plot' : 'bp-tile'}
          opacity={inPlot ? 1 : 0.92}
        />,
      );
    }
  }

  return (
    <svg
      className={`bp-plot${compact ? ' is-compact' : ''}${night ? ' is-night' : ''}`}
      viewBox="-270 -140 586 376"
      preserveAspectRatio="xMidYMid meet"
      role="img"
      aria-label={label}
    >
      <defs>
        <filter id={`${uid}-soft`} x="-70%" y="-70%" width="240%" height="240%">
          <feGaussianBlur stdDeviation="7" />
        </filter>
        <linearGradient id={`${uid}-beam`} x1="0" y1="1" x2="0" y2="0">
          <stop offset="0%" stopColor="#8dffc0" stopOpacity="0.62" />
          <stop offset="100%" stopColor="#8dffc0" stopOpacity="0" />
        </linearGradient>
      </defs>

      <g className="bp-ground">
        <polygon points={slab.left} fill={MATS.dirt.left} />
        <polygon points={slab.right} fill={MATS.dirt.right} />
        <polygon points={slab.top} fill={MATS.dirt.top} />
        {tiles}
        {hasPath ? (
          <>
            <polygon points={roadA.top} fill={MATS.gravel.top} className="bp-tile" />
            <polygon points={roadB.top} fill={MATS.gravel.top} className="bp-tile" />
          </>
        ) : null}
      </g>

      {layers.map((l) => l.node)}

      {night ? (
        <rect className="bp-night" x="-270" y="-140" width="586" height="376" fill="#4e5d96" />
      ) : null}
    </svg>
  );
}

/** A 24px isometric cube for the hotbar, so a slot looks like an item and not a swatch. */
function Cube({ mat }: { mat: Mat }) {
  return (
    <svg viewBox="0 0 24 24" className="bp-cube" aria-hidden="true">
      <polygon points="2,7.5 12,13 12,22.5 2,17" fill={mat.left} />
      <polygon points="22,7.5 12,13 12,22.5 22,17" fill={mat.right} />
      <polygon points="12,1.5 22,7.5 12,13 2,7.5" fill={mat.top} />
    </svg>
  );
}

/* ------------------------------------------------------------------ *
 * The experience
 * ------------------------------------------------------------------ */

interface Report {
  readonly index: number;
  readonly loads: number;
  readonly emeralds: number;
  readonly streak: number;
  readonly streakAdvanced: boolean;
  readonly rarity: boolean;
  readonly placed: number;
}

function at(i: number): Structure | null {
  return BLUEPRINT[i] ?? null;
}

export default function BlueprintBuild() {
  const [progress, setProgress] = useState<Progress>(() => loadProgress(meta.id));
  const [report, setReport] = useState<Report | null>(null);
  const [landing, setLanding] = useState<number | null>(null);
  const [bought, setBought] = useState<string | null>(null);

  const session = useScreenerSession({
    ageBand: '4-5',
    // Standard on the precision ladder: 8 to 16 items, which brackets the range classification research
    // associates with reliable decisions and still finishes inside twelve minutes for this band.
    precisionIndex: 2,
    palette: PALETTE,
    onFinished: (result) => {
      const outcome = recordRound(meta.id, result.itemsServed);
      setProgress(outcome.progress);
      const index = outcome.progress.rounds - 1;
      setReport({
        index,
        loads: result.itemsServed,
        emeralds: outcome.currencyEarned,
        streak: outcome.progress.streak,
        streakAdvanced: outcome.streakAdvanced,
        rarity: outcome.rarityEarned,
        placed: Math.min(BLUEPRINT.length, outcome.progress.rounds),
      });
      setLanding(index < BLUEPRINT.length ? index : null);
    },
  });

  const placed = Math.min(BLUEPRINT.length, progress.rounds);
  const complete = placed >= BLUEPRINT.length;
  const nextIndex = complete ? null : placed;
  const next = nextIndex === null ? null : at(nextIndex);
  const upgrades = useMemo(() => new Set(progress.unlocked), [progress.unlocked]);
  const crates = Math.max(0, progress.rounds - BLUEPRINT.length);

  useEffect(() => {
    if (landing === null) return;
    const t = setTimeout(() => setLanding(null), 1500);
    return () => clearTimeout(t);
  }, [landing]);

  useEffect(() => {
    if (!bought) return;
    const t = setTimeout(() => setBought(null), 2200);
    return () => clearTimeout(t);
  }, [bought]);

  const playing = session.phase === 'playing' && session.serve !== null;
  const busy = session.phase === 'starting' || playing;

  // Parts of the structure under construction arrive on the fact of a response, never on its outcome.
  // The last part is held back so the capping piece always lands when the shift ends.
  const expectedMin = session.expectedItems?.min ?? 8;
  const underwayParts = next
    ? Math.min(next.parts.length - 1, Math.ceil((session.answerCount / expectedMin) * next.parts.length))
    : 0;

  const plotLabel = complete
    ? `Your plot, finished. All ${BLUEPRINT.length} structures standing.`
    : `Your plot. ${placed} of ${BLUEPRINT.length} structures standing. Next on the blueprint: ${
        next?.name ?? '—'
      }.`;

  function beginShift() {
    setReport(null);
    setLanding(null);
    void session.start();
  }

  function buy(u: Upgrade) {
    if (spend(meta.id, u.cost) === null) return;
    setProgress(unlock(meta.id, u.id));
    setBought(u.id);
  }

  return (
    <div className="bp">
      <div className="bp-hud">
        <div className="bp-hud-id">
          <span className="bp-hud-kicker">Build log</span>
          <strong>Overworld Plot</strong>
        </div>
        <div className="bp-hud-stats">
          <div className="bp-stat">
            <span className="bp-stat-k">Structures</span>
            <span className="bp-stat-v">
              {String(placed).padStart(2, '0')}
              <i>/{BLUEPRINT.length}</i>
            </span>
          </div>
          <div className="bp-stat">
            <span className="bp-stat-k">Day streak</span>
            <span className="bp-stat-v">
              {progress.streak}
              <i>best {progress.bestStreak}</i>
            </span>
          </div>
          <div className="bp-stat is-emerald">
            <span className="bp-stat-k">Emeralds</span>
            <span className="bp-stat-v">{progress.currency}</span>
          </div>
        </div>
      </div>

      {playing && session.serve ? (
        <div className="bp-shift">
          <div className="bp-shift-main">
            <div className="bp-panel bp-shift-top">
              <div className="bp-shift-head">
                <div>
                  <span className="bp-hud-kicker">Shift in progress</span>
                  <h2>
                    {nextIndex === null ? null : <i>{String(nextIndex + 1).padStart(2, '0')}</i>}
                    {next?.name ?? 'Supply run'}
                  </h2>
                </div>
                <p className="bp-shift-note">
                  Work out each load and send it up. Every load you send moves the build on.
                </p>
              </div>
              <div className="bp-bar" aria-hidden="true">
                {Array.from({ length: 20 }).map((_, i) => (
                  <span key={i} className={i / 20 < session.progress ? 'on' : ''} />
                ))}
              </div>
            </div>
            <ItemFrame
              serve={session.serve}
              frameRef={session.frameRef}
              onLoad={session.onFrameLoad}
              palette={PALETTE}
              className="bp-frame"
            />
          </div>

          <aside className="bp-rail">
            <div className="bp-panel bp-rail-site">
              <span className="bp-hud-kicker">On site</span>
              <Plot
                uid="mini"
                placed={placed}
                underway={nextIndex}
                underwayParts={underwayParts}
                landing={null}
                upgrades={upgrades}
                crates={crates}
                compact
                label={plotLabel}
              />
            </div>

            <div className="bp-panel bp-loads">
              <div className="bp-loads-head">
                <span className="bp-hud-kicker">Loads hauled</span>
                <strong className="bp-loads-n" aria-live="polite">
                  {String(session.answerCount).padStart(2, '0')}
                </strong>
              </div>
              <div className="bp-hotbar" aria-hidden="true">
                {LOOT.map((mat, i) => {
                  const n = session.answerCount;
                  const count = Math.floor(n / SLOTS) + (i < n % SLOTS ? 1 : 0);
                  return (
                    <div
                      key={i}
                      className={`bp-slot${count > 0 ? ' is-filled' : ''}${
                        n > 0 && (n - 1) % SLOTS === i ? ' is-new' : ''
                      }`}
                    >
                      {count > 0 ? <Cube mat={mat} /> : null}
                      {count > 1 ? <span className="bp-slot-n">{count}</span> : null}
                    </div>
                  );
                })}
              </div>
              <p className="bp-fine">Every load counts the same. The build moves for sending it, full stop.</p>
            </div>
          </aside>
        </div>
      ) : (
        <div className="bp-main">
          <section className="bp-panel bp-site">
            <header className="bp-site-head">
              <div>
                <span className="bp-hud-kicker">Blueprint · 12 structures</span>
                <h1>Blueprint Build</h1>
              </div>
              <p className="bp-site-lede">
                One plot, one blueprint, twelve structures. Finish a shift and the next one goes in the
                ground.
              </p>
            </header>
            <div className="bp-stage">
              <Plot
                uid="main"
                placed={placed}
                underway={session.phase === 'starting' ? nextIndex : null}
                underwayParts={0}
                landing={landing}
                upgrades={upgrades}
                crates={crates}
                label={plotLabel}
              />
            </div>
            <div className="bp-legend">
              <span>
                <i className="bp-key is-built" /> Standing
              </span>
              <span>
                <i className="bp-key is-plan" /> Marked out
              </span>
              {crates > 0 ? (
                <span>
                  <i className="bp-key is-crate" /> Surplus ×{Math.min(crates, CRATE_SPOTS.length)}
                </span>
              ) : null}
            </div>
          </section>

          <div className="bp-side">
            {report ? (
              <section className="bp-panel bp-report" role="status">
                <span className="bp-hud-kicker">
                  {report.index < BLUEPRINT.length ? 'Structure placed' : 'Supplies stored'}
                </span>
                <h2 className="bp-report-name">
                  {at(report.index)?.name ?? 'Surplus crate'}
                </h2>
                <div className="bp-report-grid">
                  <div>
                    <span className="bp-stat-k">Loads hauled</span>
                    <strong>{report.loads}</strong>
                  </div>
                  <div>
                    <span className="bp-stat-k">Emeralds</span>
                    <strong className="is-emerald">+{report.emeralds}</strong>
                  </div>
                  <div>
                    <span className="bp-stat-k">On the plot</span>
                    <strong>
                      {report.placed}/{BLUEPRINT.length}
                    </strong>
                  </div>
                </div>
                {report.rarity ? (
                  <p className="bp-report-line is-rare">
                    Seven days running. The netherite crate is yours — it turns up in storage next shift.
                  </p>
                ) : report.streakAdvanced ? (
                  <p className="bp-report-line">
                    Day {report.streak} in a row on this plot.
                  </p>
                ) : (
                  <p className="bp-report-line">Second shift today. The plot keeps growing either way.</p>
                )}
              </section>
            ) : null}

            <section className="bp-panel bp-next">
              <span className="bp-hud-kicker">{complete ? 'Plot finished' : 'Next on the blueprint'}</span>
              {next && nextIndex !== null ? (
                <>
                  <h2 className="bp-next-name">
                    <i>{String(nextIndex + 1).padStart(2, '0')}</i> {next.name}
                  </h2>
                  <p className="bp-next-note">{next.note}</p>
                  <p className="bp-next-mats">{next.mats}</p>
                </>
              ) : (
                <>
                  <h2 className="bp-next-name">Every structure standing</h2>
                  <p className="bp-next-note">
                    Nothing left on the blueprint. Shifts from here stock the base — surplus crates stack up
                    around the walls and the emeralds keep coming.
                  </p>
                </>
              )}

              {progress.rounds === 0 ? (
                <p className="bp-next-cold">
                  The plot is marked out and nothing is standing yet. That is exactly how a build starts:
                  every cyan outline is a structure waiting for its shift.
                </p>
              ) : null}

              <button type="button" className="bp-go" onClick={beginShift} disabled={busy}>
                {session.phase === 'starting'
                  ? 'Hauling materials…'
                  : progress.rounds === 0
                    ? 'Start the first shift'
                    : complete
                      ? 'Start a supply shift'
                      : 'Start the shift'}
              </button>
              <p className="bp-fine">About ten minutes. You can stop between loads whenever you like.</p>
              {session.error ? (
                <p className="bp-oops" role="status">
                  The site could not be reached just now. Nothing is lost — try again in a moment.
                  <span className="bp-oops-detail">{session.error}</span>
                </p>
              ) : null}
            </section>

            <section className="bp-panel bp-roster">
              <span className="bp-hud-kicker">Schematic</span>
              <ol className="bp-roster-grid">
                {BLUEPRINT.map((s, i) => (
                  <li
                    key={s.id}
                    className={`bp-chip${i < placed ? ' is-built' : ''}${i === nextIndex ? ' is-next' : ''}`}
                  >
                    <span className="bp-chip-n">{String(i + 1).padStart(2, '0')}</span>
                    <span className="bp-chip-name">{s.name}</span>
                  </li>
                ))}
              </ol>
            </section>

            <section className="bp-panel bp-shop">
              <span className="bp-hud-kicker">Trading post</span>
              <p className="bp-shop-lede">
                Emeralds come from finishing shifts and nothing else. Everything here is scenery for the
                plot.
              </p>
              <ul className="bp-shop-list">
                {UPGRADES.map((u) => {
                  const owned = upgrades.has(u.id);
                  const short = u.cost - progress.currency;
                  return (
                    <li key={u.id} className={`bp-buy${owned ? ' is-owned' : ''}${bought === u.id ? ' is-fresh' : ''}`}>
                      <div className="bp-buy-text">
                        <strong>{u.name}</strong>
                        <span>{u.note}</span>
                      </div>
                      {owned ? (
                        <span className="bp-buy-owned">On the plot</span>
                      ) : (
                        <button
                          type="button"
                          className="bp-buy-btn"
                          onClick={() => buy(u)}
                          disabled={short > 0}
                        >
                          <span className="bp-gem" aria-hidden="true" />
                          {short > 0 ? `${short} to go` : u.cost}
                        </button>
                      )}
                    </li>
                  );
                })}
              </ul>
            </section>
          </div>
        </div>
      )}
    </div>
  );
}
