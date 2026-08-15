import { lazy } from 'react';

import type { ExperienceMeta, ExperienceProps } from '../shared/experience';

/**
 * Every finished world, in launcher order.
 *
 * A world appears here only once it runs end to end. A card that opens onto something half-built
 * makes the whole set look unfinished, so the rule is that this file is the last edit of a world
 * rather than the first.
 */
export interface Entry {
  meta: ExperienceMeta;
  Component: React.LazyExoticComponent<React.ComponentType<ExperienceProps>>;
}

export const EXPERIENCES: Entry[] = [
  {
    meta: {
      id: 'hatchling',
      title: 'Hatchling',
      band: 'K-1',
      interest: 'Something small needs you',
      blurb: 'An egg hatches, and the creature inside looks to you before it decides anything.',
      accent: ['#f4d58d', '#3d7068'],
      minutes: 'about 4 minutes',
    },
    Component: lazy(() => import('./hatchling')),
  },
  {
    meta: {
      id: 'pet-clinic',
      title: 'Night Clinic',
      band: '2-3',
      interest: 'Animals arrive needing help',
      blurb: 'Patients come in one at a time. Work out what each one needs before the sun comes up.',
      accent: ['#cfe8e0', '#2f6d63'],
      minutes: 'about 7 minutes',
    },
    Component: lazy(() => import('./pet-clinic')),
  },
  {
    meta: {
      id: 'navigator',
      title: "Ship's Navigator",
      band: '4-5',
      interest: 'A crew is counting on you',
      blurb: 'You read the console nobody else can read, and the ship goes where you say.',
      accent: ['#1b2f45', '#5ad2c4'],
      minutes: 'about 10 minutes',
    },
    Component: lazy(() => import('./navigator')),
  },
  {
    meta: {
      id: 'monster-tamer',
      title: 'The Rival',
      band: '6-8',
      interest: 'Someone keeps beating you',
      blurb: 'A rival tamer reads matchups faster than you do. Close the gap.',
      accent: ['#17141f', '#c4577c'],
      minutes: 'about 12 minutes',
    },
    Component: lazy(() => import('./monster-tamer')),
  },
];
