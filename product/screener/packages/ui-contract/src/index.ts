/**
 * The UI contract: what each question type needs from an app, and what an app can therefore serve.
 *
 * An item states what it asks, what the choices are and how it is answered. It never states how any of
 * that looks. This package is the other half of that bargain: the machine-checkable statement of what
 * an app has to be capable of before a given type may be served on it.
 *
 * Two directions, and the reverse one gets used more:
 *
 *   planFor(['FLU-MATRIX-01', ...])   the types I want, and the UI they cost
 *   servableBy(MY_APP_PROFILE)        what my app can do, and therefore what it may serve
 *
 * CLI: `npm run ui -- --help` equivalents are documented at the top of `cli.ts`.
 */
export {
  ALL_PRESENTATION_ELEMENTS,
  ALL_RESPONSE_ELEMENTS,
  COUNTED_ELEMENTS,
  EMPTY_REQUIREMENT,
  PRESENTATION_ELEMENTS,
  READING_BANDS,
  RESPONSE_ELEMENTS,
  bandRank,
  describe,
  isCounted,
  mergeRequirements,
  type CountedElement,
  type PresentationElement,
  type ResponseElement,
  type UiCapability,
  type UiElement,
  type UiRequirement,
} from './capabilities';

export {
  BANKS_DIR,
  CHANNEL_OVERRIDES,
  allTypeCodes,
  requirementFor,
  requirementForSet,
  requirementsForAll,
  signalsFor,
  type ChannelOverride,
  type TypeSignals,
} from './requirements';

export {
  countedElementsIn,
  minimumForEverything,
  planFor,
  satisfies,
  servableBy,
  unlockOrder,
  type MatchResult,
  type Plan,
  type Shortfall,
  type TypePlan,
} from './plan';

export {
  FULL_CLIENT,
  GLANCE,
  PRINT,
  PROFILES,
  THEMED_VISUAL,
  VOICE_ONLY,
  type ProfileName,
} from './profiles';

export {
  COGAT_ALIGNED_TYPES,
  COGAT_MAP,
  COGAT_SUBTESTS,
  SCREENING_FORM_SUBTESTS,
  typesForSubtest,
  uncoveredSubtests,
  type CogatMapping,
  type CogatSubtest,
} from './cogat';

export {
  CONTEXT_PROFILES,
  contextProfileFor,
  costBreakdown,
  lexicalSignals,
  themeUiGaps,
  validateTheme,
  type ContextCost,
  type ContextProfile,
  type ThemeIssue,
  type ThemePack,
} from './context';

export {
  planAssets,
  themeWords,
  type AssetBrief,
  type AssetPlan,
} from './assets';
