import type { UiCapability } from './capabilities';

/**
 * Example app profiles, so the reverse lookup has something real to answer against.
 *
 * These are the five shapes from `docs/design/embedded-screening-contexts.md` written as capabilities.
 * A team integrating a screener writes one of these for their own app and then asks which types they
 * can serve, which is a two-minute job rather than a design review.
 */

/** Everything. A normal web or game client with a screen and a pointer. */
export const FULL_CLIENT: UiCapability = {
  name: 'full-client',
  elements: [
    'choiceList',
    'multiSelect',
    'reorderable',
    'sequenceTap',
    'analogControl',
    'valueEntry',
    'canvasPlacement',
    'nominalChannel',
    'orderedChannel',
    'cyclicChannel',
    'gridLayout',
    'coPresent',
    'timedReveal',
    'motion',
    'depthCue',
    'richText',
    'audioOut',
  ],
  counts: { nominalChannel: 12, orderedChannel: 8, cyclicChannel: 8, coPresent: 16 },
  readingBand: '6-8',
};

/**
 * A themed app with pictures and buttons but no fine spatial manipulation and no reliable timing.
 *
 * The commonest real case, and the reason `timedReveal` is a capability rather than an assumption: an
 * app inside somebody else's game loop usually cannot promise when a frame appears.
 */
export const THEMED_VISUAL: UiCapability = {
  name: 'themed-visual',
  elements: [
    'choiceList',
    'multiSelect',
    'reorderable',
    'nominalChannel',
    'orderedChannel',
    'coPresent',
    'richText',
  ],
  counts: { nominalChannel: 8, orderedChannel: 5, coPresent: 8 },
  readingBand: '4-5',
};

/** Voice only. A smart speaker skill, or an audio story. No screen at all. */
export const VOICE_ONLY: UiCapability = {
  name: 'voice-only',
  elements: ['choiceList', 'valueEntry', 'sequenceTap', 'nominalChannel', 'audioOut', 'richText'],
  counts: { nominalChannel: 4, coPresent: 4 },
  readingBand: '4-5',
};

/** Print. Static and untimed, but spatially rich and it can show depth on the page. */
export const PRINT: UiCapability = {
  name: 'print',
  elements: [
    'choiceList',
    'multiSelect',
    'nominalChannel',
    'orderedChannel',
    'cyclicChannel',
    'gridLayout',
    'coPresent',
    'depthCue',
    'richText',
  ],
  counts: { nominalChannel: 10, orderedChannel: 6, cyclicChannel: 8, coPresent: 12 },
  readingBand: '6-8',
};

/** A few seconds of divided attention: an interstitial, a loading screen, a TV remote. */
export const GLANCE: UiCapability = {
  name: 'glance',
  elements: ['choiceList', 'nominalChannel', 'coPresent'],
  counts: { nominalChannel: 4, coPresent: 5 },
  readingBand: 'K-1',
};

export const PROFILES = {
  'full-client': FULL_CLIENT,
  'themed-visual': THEMED_VISUAL,
  'voice-only': VOICE_ONLY,
  print: PRINT,
  glance: GLANCE,
} as const;

export type ProfileName = keyof typeof PROFILES;
