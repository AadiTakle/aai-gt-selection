import type { Battery } from '../shared/batteries';

/**
 * The contract three build tracks share. Owned by the integrator; nobody else edits this file.
 *
 * Slimes, world and screener are built in parallel against these types, so they must be stable.
 */

/**
 * Nineteen slime families, each tied to a concrete thing rather than an abstract silhouette word.
 *
 * The earlier names (bellow, rill, cobble, ember, fern, kite) described shapes and meant nothing to a
 * child. A five-year-old sorts and remembers by object: a waffle slime is a waffle slime. Each family
 * therefore owns a material, a palette and a signature prop, and its silhouette follows from the
 * object rather than the object being painted onto a silhouette.
 *
 * THE ORDER IS THE ORDER THEY WERE ADDED, and it is load-bearing in exactly one place: `FAMILIES` is
 * indexed modulo its length by callers that want "some family" (`Game.tsx`'s pen fill, the vacpack
 * preview), so keeping the original six first means those callers produce the same herd they did before
 * thirteen more names existed. Anything that wants a specific family names it.
 *
 * ICE AND FROST ARE BOTH HERE ON PURPOSE, and they are the one pair in the set that had to be argued
 * rather than just drawn. See the note above `ice` in `slimes/look.ts`: frost is WEATHER (soft rime,
 * powder, a flared skirt where it has crept up off the ground) and ice is MINERAL (hard, transparent,
 * faceted, a leaning shard cluster and no ground feature at all). They are also granted by different
 * stations, so a child meets them apart.
 */
export type Family =
  | 'waffle'
  | 'rose'
  | 'grass'
  | 'rock'
  | 'fairy'
  | 'frost'
  | 'air'
  | 'bunny'
  | 'lion'
  | 'cat'
  | 'radioactive'
  | 'wood'
  | 'fire'
  | 'ice'
  | 'gold'
  | 'sleepy'
  | 'strawberry'
  | 'mango'
  | 'bomb';
export const FAMILIES: readonly Family[] = [
  'waffle',
  'rose',
  'grass',
  'rock',
  'fairy',
  'frost',
  'air',
  'bunny',
  'lion',
  'cat',
  'radioactive',
  'wood',
  'fire',
  'ice',
  'gold',
  'sleepy',
  'strawberry',
  'mango',
  'bomb',
];

/** Growth advances on visits and care performed, NEVER on correctness. */
export type Stage = 'pip' | 'tuffet' | 'crested' | 'warden';
export const STAGES: readonly Stage[] = ['pip', 'tuffet', 'crested', 'warden'];

/**
 * Which battery a family is associated with, so a collection visibly reflects what a child has done.
 *
 * Nineteen families over three batteries: 7 Verbal, 6 Quantitative, 6 Nonverbal. This is flavour, not
 * measurement: nothing about a slime feeds the estimate. What it does decide is WHICH STATION brings
 * which slime, so the split is even by count and coherent by theme — a child who has only ever visited
 * one station should still be collecting a recognisable SET rather than a random six of nineteen.
 *
 *   Verbal        creatures and storybook things. The battery is about words and stories, so it gets
 *                 everything with a face-in-a-story: the animals, the tree, the bedtime one.
 *   Quantitative  countable, weighable, collectable stuff — food, stone, treasure. The battery is about
 *                 amount, and these are the families a child would sort into piles.
 *   Nonverbal     the elements and the abstract patterns. Figure matrices dressed as fire, air, ice's
 *                 sibling frost, and the two that are pure pattern (rose, radioactive, bomb).
 *
 * THE ORIGINAL SIX DID NOT MOVE. grass/fairy stay Verbal, waffle/rock stay Quantitative, frost/rose stay
 * Nonverbal, because `stations/sites.ts` names its pairs literally and the approved station art is built
 * around those pairings.
 *
 * ICE IS DELIBERATELY NOT WITH FROST. They are the two families most at risk of reading as one, so they
 * are granted by different stations: frost from the Nonverbal wall with the weather, ice from the
 * Quantitative one with the gold, where it reads as a gemstone rather than as more snow.
 */
export const FAMILY_BATTERY: Record<Family, Battery> = {
  // Verbal — seven.
  grass: 'Verbal',
  fairy: 'Verbal',
  bunny: 'Verbal',
  lion: 'Verbal',
  cat: 'Verbal',
  sleepy: 'Verbal',
  wood: 'Verbal',
  // Quantitative — six.
  waffle: 'Quantitative',
  rock: 'Quantitative',
  gold: 'Quantitative',
  ice: 'Quantitative',
  strawberry: 'Quantitative',
  mango: 'Quantitative',
  // Nonverbal — six.
  frost: 'Nonverbal',
  rose: 'Nonverbal',
  fire: 'Nonverbal',
  air: 'Nonverbal',
  radioactive: 'Nonverbal',
  bomb: 'Nonverbal',
};

export interface Slime {
  id: string;
  family: Family;
  stage: Stage;
  /** 0..1 within the current stage. Advances per care act performed. */
  growth: number;
  /** Accumulated markings from the coat verb. Decide the adult silhouette. */
  markings: string[];
  /** Which corral it lives in, or null if roaming. */
  corral: number | null;
  /** Wall-clock ms when it last received care, for the overnight change. */
  lastCaredAt: number;
}

export interface WorldState {
  keeperId: string;
  /** Visits, which is what unlocks tiers. Never a score. */
  visits: number;
  /** Wall-clock day index, so the hollow drifts whether or not the child plays. */
  seasonDay: number;
  slimes: Slime[];
  /** Care acts performed, ever. The only counter the child sees, and it only goes up. */
  caresGiven: number;
  lastVisitAt: number;
}

/** What a screener beat asks the world for, and gives back. Screener track owns the implementation. */
export interface ScreenerBeat {
  battery: Battery;
  /** The in-world object the item is dressed as. */
  verbId: string;
  /** Called when the child has answered; the world advances regardless of what was chosen. */
  onComplete: () => void;
}

export const LS_KEY = 'gt-sanctuary:world';
export const LS_KEEPER = 'gt-sanctuary:keeperId';
