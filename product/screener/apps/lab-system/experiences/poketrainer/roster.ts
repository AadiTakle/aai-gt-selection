/**
 * The world's vocabulary: the four League divisions, the ball each one is issued, the creatures that
 * live on the route, and the ranks a trainer walks away with.
 *
 * All of it is decoration. Nothing here knows what a question is, and nothing here decides anything
 * about an answer; the only input from the session is a count of catches, which the server produced.
 */

import type { AgeBand } from '../../shared/types';

/* ---------------------------------------------------------------- types */

export type PokeType =
  | 'Grass'
  | 'Fire'
  | 'Water'
  | 'Electric'
  | 'Psychic'
  | 'Rock'
  | 'Ice'
  | 'Dragon'
  | 'Ghost'
  | 'Steel'
  | 'Bug'
  | 'Fairy';

export interface Palette {
  /** The type chip colour, the one a fan reads before they read the word. */
  readonly badge: string;
  readonly body: string;
  readonly dark: string;
  readonly light: string;
  readonly accent: string;
}

export const TYPE_PALETTE: Record<PokeType, Palette> = {
  Grass: { badge: '#5aa83a', body: '#7ac74c', dark: '#3f7d24', light: '#c9ea9f', accent: '#ffe45e' },
  Fire: { badge: '#e2743a', body: '#f08030', dark: '#a8451a', light: '#ffcf9e', accent: '#ffe066' },
  Water: { badge: '#4a7fe0', body: '#6390f0', dark: '#2b53a8', light: '#c3d7ff', accent: '#8ff0ea' },
  Electric: { badge: '#c9a300', body: '#f7d02c', dark: '#a97c00', light: '#fff0a3', accent: '#fffbe0' },
  Psychic: { badge: '#e04a78', body: '#f95587', dark: '#a8214b', light: '#ffc7da', accent: '#ffe9f1' },
  Rock: { badge: '#9c8a3e', body: '#c6b566', dark: '#7c6a2c', light: '#eadfb4', accent: '#fff3c9' },
  Ice: { badge: '#4fa8b8', body: '#8ed6de', dark: '#2c7b88', light: '#dbf6fa', accent: '#ffffff' },
  Dragon: { badge: '#6a45d8', body: '#8a63f0', dark: '#4526a3', light: '#d3c4ff', accent: '#ffcf5e' },
  Ghost: { badge: '#6b5390', body: '#9179c0', dark: '#4a356e', light: '#ddd0f2', accent: '#c6f7d0' },
  Steel: { badge: '#7c8398', body: '#b0b7c8', dark: '#5c6376', light: '#e6eaf2', accent: '#9fe2ff' },
  Bug: { badge: '#8a9a1a', body: '#b4c22c', dark: '#6a7411', light: '#e6efa8', accent: '#ff8f6b' },
  Fairy: { badge: '#c66a97', body: '#e58fb8', dark: '#95436c', light: '#ffdcec', accent: '#fff4b0' },
};

/* ------------------------------------------------------------- species */

/** Body plan. Chosen so two creatures on the same route never share a silhouette. */
export type Archetype = 'blob' | 'quad' | 'bird' | 'serpent' | 'float' | 'bug' | 'spike' | 'finned';

/** A single extra feature, which is what stops two blobs reading as the same creature. */
export type Crest = 'none' | 'leaf' | 'flame' | 'horn' | 'ears' | 'crown' | 'antenna' | 'fin' | 'bolt';

export interface Species {
  readonly id: string;
  readonly num: number;
  readonly name: string;
  readonly type: PokeType;
  readonly archetype: Archetype;
  readonly crest: Crest;
  /** The one-line entry that lands on the trainer card once it has been caught. */
  readonly entry: string;
}

/** The route roster. Fourteen, so a long bootcamp still meets something new near the end. */
export const ROSTER: readonly Species[] = [
  { id: 'sprucub', num: 1, name: 'Sprucub', type: 'Grass', archetype: 'quad', crest: 'leaf', entry: 'Sleeps under pine needles and wakes smelling of sap.' },
  { id: 'emberling', num: 2, name: 'Emberling', type: 'Fire', archetype: 'blob', crest: 'flame', entry: 'Warms its own footprints so the next one can follow.' },
  { id: 'puddleon', num: 3, name: 'Puddleon', type: 'Water', archetype: 'finned', crest: 'fin', entry: 'Rides rain gutters downhill for fun.' },
  { id: 'voltick', num: 4, name: 'Voltick', type: 'Electric', archetype: 'bug', crest: 'antenna', entry: 'Static clings to anyone who stands too close.' },
  { id: 'mystipuff', num: 5, name: 'Mystipuff', type: 'Psychic', archetype: 'float', crest: 'crown', entry: 'Hums a note only the person it likes can hear.' },
  { id: 'boulderpup', num: 6, name: 'Boulderpup', type: 'Rock', archetype: 'quad', crest: 'horn', entry: 'Naps in the shape of an ordinary rock. Fools nobody.' },
  { id: 'frostwing', num: 7, name: 'Frostwing', type: 'Ice', archetype: 'bird', crest: 'none', entry: 'Its feathers ring like glass on a cold morning.' },
  { id: 'nebulisk', num: 8, name: 'Nebulisk', type: 'Dragon', archetype: 'serpent', crest: 'horn', entry: 'Coils around chimney smoke and drifts up with it.' },
  { id: 'wispine', num: 9, name: 'Wispine', type: 'Ghost', archetype: 'float', crest: 'none', entry: 'Politely relights any candle it blows out.' },
  { id: 'chromite', num: 10, name: 'Chromite', type: 'Steel', archetype: 'spike', crest: 'none', entry: 'Grows one new facet for every storm it sits through.' },
  { id: 'thistlebee', num: 11, name: 'Thistlebee', type: 'Bug', archetype: 'bug', crest: 'antenna', entry: 'Carries seeds it has no intention of planting.' },
  { id: 'lumibell', num: 12, name: 'Lumibell', type: 'Fairy', archetype: 'float', crest: 'crown', entry: 'Rings once at dusk, then pretends it did not.' },
  { id: 'cindertail', num: 13, name: 'Cindertail', type: 'Fire', archetype: 'serpent', crest: 'flame', entry: 'Writes in the air with the tip of its tail.' },
  { id: 'galewisp', num: 14, name: 'Galewisp', type: 'Electric', archetype: 'bird', crest: 'bolt', entry: 'Beats its wings once and the grass lies flat.' },
];

const FALLBACK: Species = {
  id: 'sprucub',
  num: 1,
  name: 'Sprucub',
  type: 'Grass',
  archetype: 'quad',
  crest: 'leaf',
  entry: 'Sleeps under pine needles and wakes smelling of sap.',
};

/** Stable 32-bit hash, so one item always meets the same creature within a walk. */
function hash(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

/**
 * Which creature is rustling in the grass for a given item.
 *
 * Keyed on the item id so it cannot reshuffle while a child is deciding, and biased away from whatever
 * was just met so the route does not serve the same face twice running.
 */
export function speciesFor(itemId: string, avoid?: string | null): Species {
  const n = ROSTER.length;
  if (n === 0) return FALLBACK;
  const base = hash(itemId) % n;
  const first = ROSTER[base] ?? FALLBACK;
  if (avoid === undefined || avoid === null || first.id !== avoid) return first;
  return ROSTER[(base + 1) % n] ?? FALLBACK;
}

/* ------------------------------------------------------------ divisions */

export type BallKind = 'poke' | 'great' | 'ultra' | 'master';

export interface Division {
  readonly band: AgeBand;
  readonly ball: BallKind;
  readonly ballName: string;
  readonly name: string;
  readonly grades: string;
  readonly motto: string;
  /** What the engine is asked for. Shorter routes for the youngest trainers. */
  readonly precisionIndex: number;
}

/**
 * Four divisions, four balls.
 *
 * The ball ladder is doing the work here: a Pokémon fan reads Poké → Great → Ultra → Master instantly
 * as an ordering, so a five year old and a thirteen year old can both find their own row without the
 * screen ever looking like a form with a dropdown on it.
 */
export const DIVISIONS: readonly Division[] = [
  {
    band: 'K-1',
    ball: 'poke',
    ballName: 'Poké Ball',
    name: 'Sprout Division',
    grades: 'Kindergarten and Grade 1',
    motto: 'Everyone starts here. Even Champions.',
    precisionIndex: 0,
  },
  {
    band: '2-3',
    ball: 'great',
    ballName: 'Great Ball',
    name: 'Junior Division',
    grades: 'Grades 2 and 3',
    motto: 'You know the grass. Now go into it.',
    precisionIndex: 1,
  },
  {
    band: '4-5',
    ball: 'ultra',
    ballName: 'Ultra Ball',
    name: 'Senior Division',
    grades: 'Grades 4 and 5',
    motto: 'The route gets interesting from here.',
    precisionIndex: 2,
  },
  {
    band: '6-8',
    ball: 'master',
    ballName: 'Master Ball',
    name: 'Elite Division',
    grades: 'Grades 6, 7 and 8',
    motto: 'Nothing on this route is easy. Good.',
    precisionIndex: 2,
  },
];

export const DEFAULT_DIVISION: Division = DIVISIONS[2] ?? {
  band: '4-5',
  ball: 'ultra',
  ballName: 'Ultra Ball',
  name: 'Senior Division',
  grades: 'Grades 4 and 5',
  motto: 'The route gets interesting from here.',
  precisionIndex: 2,
};

export function divisionFor(band: AgeBand): Division {
  return DIVISIONS.find((d) => d.band === band) ?? DEFAULT_DIVISION;
}

/* ---------------------------------------------------------------- ranks */

export interface Rank {
  readonly title: string;
  readonly line: string;
  /** Ribbon colour on the trainer card. */
  readonly ribbon: string;
}

/**
 * The rank on the trainer card.
 *
 * Every rung is somewhere a real trainer stands, including the first one. There is no rung that means
 * "you did badly", because there is no such outcome here: a route you walked is a route you walked.
 */
const RANKS: readonly { readonly at: number; readonly rank: Rank }[] = [
  { at: 0, rank: { title: 'Rookie Trainer', line: 'Registered, kitted out and back on the route tomorrow.', ribbon: '#8a94a6' } },
  { at: 1, rank: { title: 'Route Scout', line: 'You know what the grass sounds like now.', ribbon: '#5aa83a' } },
  { at: 3, rank: { title: 'Poké Ball Regular', line: 'The shopkeeper has started nodding at you.', ribbon: '#4a7fe0' } },
  { at: 5, rank: { title: 'Ace Trainer', line: 'Other trainers step off the path when you pass.', ribbon: '#c9a300' } },
  { at: 8, rank: { title: 'Gym Challenger', line: 'The first badge is well within reach.', ribbon: '#e2743a' } },
  { at: 11, rank: { title: 'Elite Four Hopeful', line: 'Word has reached Indigo Plateau.', ribbon: '#6a45d8' } },
  { at: 15, rank: { title: 'League Champion', line: 'They will need a bigger Pokédex.', ribbon: '#e3350d' } },
];

const FIRST_RANK: Rank = { title: 'Rookie Trainer', line: 'Registered, kitted out and back on the route tomorrow.', ribbon: '#8a94a6' };

export function rankFor(caught: number): Rank {
  let out: Rank = FIRST_RANK;
  for (const step of RANKS) {
    if (caught >= step.at) out = step.rank;
  }
  return out;
}
