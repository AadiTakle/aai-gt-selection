import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * The item banks behind the playable catalogue.
 *
 * 53 files, 7,319 records, each carrying the item's content, a difficulty on a 1 to 20 scale, and
 * an answer. The catalogue pages are renderers: they accept an item over `postMessage`, display it,
 * and report the response back without ever being told what the right answer was.
 *
 * That split is what makes a real adaptive session possible on these items, and it is why this
 * module exists on the server rather than in the browser. The bank record is the only place the key
 * lives, `toServed` removes it before anything crosses to the frame, and scoring happens here.
 */

const HERE = dirname(fileURLToPath(import.meta.url));
export const BANK_DIR =
  process.env.GT_QBANK_BANKS ?? join(HERE, '..', '..', '..', '..', 'qbank-library', 'banks');

/** How a record says it should be marked. Only the first can be scored without a solver. */
export type ScoringMode = 'deterministic_key' | 'computed_solver' | 'model_judge_deferred';

export interface BankRecord {
  readonly itemId: string;
  readonly typeCode: string;
  readonly domain: string;
  /** On the bank's own 1 to 20 scale, not in logits. Use `toLogits`. */
  readonly difficulty: number;
  readonly ageBands: readonly string[];
  readonly content: Record<string, unknown>;
  readonly answer: { readonly correctKey: string } & Record<string, unknown>;
  readonly scoring: { readonly mode: ScoringMode } & Record<string, unknown>;
  readonly syntheticOnly?: boolean;
  readonly validated?: boolean;
}

/** What crosses to the frame. Answer, scoring and provenance are absent by construction. */
export type ServedItem = Omit<BankRecord, 'answer' | 'scoring'> & { provenance?: never };

export function toServed(record: BankRecord): ServedItem {
  const { answer, scoring, ...rest } = record as BankRecord & { provenance?: unknown };
  void answer;
  void scoring;
  const served = { ...rest } as Record<string, unknown>;
  delete served.provenance;
  return served as ServedItem;
}

/**
 * Map the bank's difficulty onto the ability scale the engine works in.
 *
 * The bank uses 1 to 20, near-uniformly, with a median of 10.59. Dividing the centred value by
 * three puts it at roughly plus or minus 3.2 logits, which covers the posterior grid without
 * clipping.
 *
 * This is a rescaling and not a calibration. The bank's difficulties are themselves synthetic on
 * most records, so an item's position on this scale is an assumption inherited from whoever
 * generated it, carried through a linear transform we chose. Nothing here has met a child.
 */
export const DIFFICULTY_MIDPOINT = 10.5;
export const DIFFICULTY_DIVISOR = 3;

export function toLogits(difficulty: number): number {
  return (difficulty - DIFFICULTY_MIDPOINT) / DIFFICULTY_DIVISOR;
}

export function fromLogits(b: number): number {
  return b * DIFFICULTY_DIVISOR + DIFFICULTY_MIDPOINT;
}

export interface LoadedBank {
  readonly typeCode: string;
  readonly domain: string;
  /** Only records this host can mark, sorted by difficulty. */
  readonly scorable: readonly BankRecord[];
  /** Everything, including records needing a solver or a judge. */
  readonly total: number;
  readonly excluded: Readonly<Record<string, number>>;
  readonly difficultyRange: readonly [number, number];
  readonly ageBands: readonly string[];
}

/**
 * Load every bank once.
 *
 * Reads 19 MB from disk, so it is done at startup and held. Records whose scoring mode needs a
 * solver or a human judge are counted and set aside rather than silently dropped, because "this
 * type has 120 items and we can mark 0 of them" is something a caller needs to be able to see.
 */
export function loadBanks(dir: string = BANK_DIR): Map<string, LoadedBank> {
  const out = new Map<string, LoadedBank>();
  if (!existsSync(dir)) return out;

  for (const file of readdirSync(dir).filter((f) => f.endsWith('.jsonl'))) {
    const typeCode = file.replace(/\.jsonl$/, '');
    const scorable: BankRecord[] = [];
    const excluded: Record<string, number> = {};
    const ageBands = new Set<string>();
    let total = 0;
    let domain = 'unknown';

    for (const line of readFileSync(join(dir, file), 'utf8').split('\n')) {
      if (!line.trim()) continue;
      let record: BankRecord;
      try {
        record = JSON.parse(line) as BankRecord;
      } catch {
        // A truncated line should cost one item rather than a whole type.
        excluded.unparseable = (excluded.unparseable ?? 0) + 1;
        continue;
      }
      total += 1;
      domain = record.domain ?? domain;
      for (const b of record.ageBands ?? []) ageBands.add(b);

      const mode = record.scoring?.mode;
      if (mode !== 'deterministic_key') {
        excluded[mode ?? 'unknown'] = (excluded[mode ?? 'unknown'] ?? 0) + 1;
        continue;
      }
      if (typeof record.answer?.correctKey !== 'string') {
        excluded['no-key'] = (excluded['no-key'] ?? 0) + 1;
        continue;
      }
      if (typeof record.difficulty !== 'number') {
        excluded['no-difficulty'] = (excluded['no-difficulty'] ?? 0) + 1;
        continue;
      }
      scorable.push(record);
    }

    scorable.sort((a, b) => a.difficulty - b.difficulty);
    if (scorable.length === 0 && total === 0) continue;

    out.set(typeCode, {
      typeCode,
      domain,
      scorable,
      total,
      excluded,
      difficultyRange: scorable.length
        ? [scorable[0]!.difficulty, scorable[scorable.length - 1]!.difficulty]
        : [NaN, NaN],
      ageBands: [...ageBands].sort(),
    });
  }
  return out;
}

/**
 * Score a response against the key the host kept.
 *
 * The frame reports whatever the item's own UI produced, which for a keyed item is the option key.
 * Accepts a few shapes because the 38 scorable types were written independently and do not all
 * agree on where they put it.
 */
export function scoreResponse(record: BankRecord, response: unknown): boolean | null {
  const expected = record.answer?.correctKey;
  if (typeof expected !== 'string') return null;

  const candidate =
    typeof response === 'string'
      ? response
      : typeof response === 'object' && response !== null
        ? ((response as Record<string, unknown>).key ??
           (response as Record<string, unknown>).selectedKey ??
           (response as Record<string, unknown>).value)
        : undefined;

  if (typeof candidate !== 'string') return null;
  return candidate.trim().toUpperCase() === expected.trim().toUpperCase();
}

/** Domain labels the banks use, mapped to the four the engine blueprints against. */
export function domainOf(record: BankRecord | LoadedBank): 'quantitative' | 'verbal' | 'spatial' | 'fluid' {
  const code = ('typeCode' in record ? record.typeCode : '').toUpperCase();
  if (code.startsWith('QUANT')) return 'quantitative';
  if (code.startsWith('VER')) return 'verbal';
  if (code.startsWith('SPA')) return 'spatial';
  // FLU, GB, WM and CX all exercise rule-finding or capacity rather than a taught subject, so they
  // land in fluid. Crude, and better than inventing two more blueprint slots for one item each.
  return 'fluid';
}
