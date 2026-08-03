/**
 * Canonical measurement identifiers.
 *
 * Mirrors the 63 IDs declared in
 * `research/exam-question-types/MEASUREMENTS.md` (source of truth:
 * `measurements.json`). Kept as a local list so this package does not block on
 * `packages/contracts`; reconcile at the integration merge.
 */
export const METRIC_IDS = [
  'M-ACC',
  'M-POLY',
  'M-RT',
  'M-RTFIRST',
  'M-RTVAR',
  'M-LAPSE',
  'M-REV',
  'M-PATH',
  'M-EFF',
  'M-HINT',
  'M-PERSIST',
  'M-ERRTYPE',
  'M-CONF',
  'M-EXPLORE',
  'M-PROG',
  'M-SPEEDACC',
  'M-DIFFREACH',
  'M-DRIFT',
  'M-ENGAGE',
  'M-CONSIST',
  'M-RESUME',
  'M-IDEAFLU',
  'M-FLEX',
  'M-ORIG',
  'M-ELAB',
  'M-QUERY',
  'M-UNCERT',
  'M-CHOICE',
  'M-DELAY',
  'M-EFFALLOC',
  'M-LEARNRATE',
  'M-PLANFUL',
  'M-RAPIDGUESS',
  'M-RULEID',
  'M-HYP',
  'M-COMBO',
  'M-FALSEALARM',
  'M-HICKSLOPE',
  'M-ITTHRESH',
  'M-PAE',
  'M-WEBER',
  'M-EQREL',
  'M-PROPSTRAT',
  'M-ROTSLOPE',
  'M-MIRRORFA',
  'M-VIEWANG',
  'M-VOCABLVL',
  'M-LURETYPE',
  'M-INFDEPTH',
  'M-ORALSPAN',
  'M-SPAN',
  'M-MANIPCOST',
  'M-DPRIME',
  'M-UPDATECOST',
  'M-POSTERR',
  'M-COMM',
  'M-SSRT',
  'M-CONGEFF',
  'M-SWITCHCOST',
  'M-PERSEV',
  'M-PROCACC',
  'M-BETWEENERR',
  'M-SEARCHSTRAT',
] as const;

/** A measurement ID known to the registry. */
export type KnownMetricId = (typeof METRIC_IDS)[number];

/**
 * A metric key on an {@link ItemResult}. Known IDs get autocomplete; the
 * `(string & {})` arm keeps forward-compatibility with IDs added by other
 * workstreams before this registry is regenerated.
 */
export type MetricId = KnownMetricId | (string & {});

const METRIC_ID_SET: ReadonlySet<string> = new Set(METRIC_IDS);

/** Type guard: is `id` one of the 63 canonical measurement IDs? */
export function isKnownMetricId(id: string): id is KnownMetricId {
  return METRIC_ID_SET.has(id);
}
