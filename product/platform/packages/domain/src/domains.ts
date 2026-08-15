/**
 * The four domains the blueprint balances against.
 *
 * These mirror `Domain` in `@gt/contracts` rather than redefining the construct: the platform is a
 * second consumer of the same measurement model, not a fork of it.
 */

export type DomainName = 'quantitative' | 'verbal' | 'spatial' | 'fluid';

export const DOMAIN_NAMES: readonly DomainName[] = [
  'quantitative',
  'verbal',
  'spatial',
  'fluid',
] as const;

export function isDomainName(value: unknown): value is DomainName {
  return typeof value === 'string' && (DOMAIN_NAMES as readonly string[]).includes(value);
}

/**
 * Infer a domain from a type code prefix.
 *
 * This reproduces `domainOf` in `@gt/qbank` and exists only to seed the registry for the 53 codes
 * that predate it. It is a heuristic and it is wrong for codes that do not carry a domain prefix:
 * a future CogAT code such as `VA-01` is verbal but would fall through to fluid. That is exactly
 * why the registry stores domain as an explicit field rather than deriving it at read time.
 */
export function domainFromTypeCode(code: string): DomainName {
  const upper = code.toUpperCase();
  if (upper.startsWith('QUANT')) return 'quantitative';
  if (upper.startsWith('VER')) return 'verbal';
  if (upper.startsWith('SPA')) return 'spatial';
  return 'fluid';
}

export function emptyDomainRecord<T>(fill: () => T): Record<DomainName, T> {
  return {
    quantitative: fill(),
    verbal: fill(),
    spatial: fill(),
    fluid: fill(),
  };
}
