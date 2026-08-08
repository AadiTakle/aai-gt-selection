import type { Battery } from '../shared/batteries';

/**
 * The contract three build tracks share. Owned by the integrator; nobody else edits this file.
 *
 * Slimes, world and screener are built in parallel against these types, so they must be stable.
 */

/**
 * Six slime families, each tied to a concrete thing rather than an abstract silhouette word.
 *
 * The earlier names (bellow, rill, cobble, ember, fern, kite) described shapes and meant nothing to a
 * child. A five-year-old sorts and remembers by object: a waffle slime is a waffle slime. Each family
 * therefore owns a material, a palette and a signature prop, and its silhouette follows from the
 * object rather than the object being painted onto a silhouette.
 */
export type Family = 'waffle' | 'rose' | 'grass' | 'rock' | 'fairy' | 'frost';
export const FAMILIES: readonly Family[] = ['waffle', 'rose', 'grass', 'rock', 'fairy', 'frost'];

/** Growth advances on visits and care performed, NEVER on correctness. */
export type Stage = 'pip' | 'tuffet' | 'crested' | 'warden';
export const STAGES: readonly Stage[] = ['pip', 'tuffet', 'crested', 'warden'];

/**
 * Which battery a family is associated with, so a collection visibly reflects what a child has done.
 * Two families per battery. This is flavour, not measurement: nothing about a slime feeds the estimate.
 */
export const FAMILY_BATTERY: Record<Family, Battery> = {
  grass: 'Verbal',
  fairy: 'Verbal',
  waffle: 'Quantitative',
  rock: 'Quantitative',
  frost: 'Nonverbal',
  rose: 'Nonverbal',
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
