import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import type { Plugin } from 'vite';

import { COGAT_MAP, COGAT_SUBTESTS } from '../../packages/ui-contract/src/cogat';
import { contextProfileFor } from '../../packages/ui-contract/src/context';
import { BANKS_DIR, requirementFor } from '../../packages/ui-contract/src/requirements';

/**
 * The review app's back end, as a dev-server plugin.
 *
 * The banks are 7,319 items across 53 files and around 35MB. Summarising them server-side is the
 * whole reason this exists: the browser gets per-type aggregates and a handful of sample items, never
 * the bank. Answer keys are stripped before anything leaves this file, since a reviewer looking at
 * difficulty has no need for them and shipping them would put every key in a browser cache.
 */

const HERE = dirname(fileURLToPath(import.meta.url));
const REVIEW_FILE = resolve(HERE, '..', '..', '..', 'docs', 'design', 'bank-review.json');

interface RawItem {
  itemId: string;
  typeCode: string;
  domain: string;
  difficulty: number;
  ageBands: string[];
  content: Record<string, unknown>;
}

/** Age bands in the order the banks use them, so a range can be reported as a span. */
const BAND_ORDER = ['K-1', '2-3', '4-5', '6-8'];

export interface TypeSummary {
  typeCode: string;
  domain: string;
  items: number;
  difficulty: {
    min: number;
    max: number;
    mean: number;
    median: number;
    /** Ten buckets over the 1-20 design scale, for a shape rather than a statistic. */
    histogram: number[];
    /** Design rungs with no items at all, which is where an adaptive engine runs out of road. */
    emptyRungs: number[];
  };
  ageBands: { band: string; items: number }[];
  bandSpan: string;
  cogat: { subtest: string; strength: 'direct' | 'loose' } | null;
  contextCost: string;
  readingBand: string | null;
  uiElements: string[];
  samples: { itemId: string; difficulty: number; ageBands: string[]; contentKeys: string[]; preview: string }[];
}

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1]! + sorted[mid]!) / 2 : sorted[mid]!;
}

/** A short human-readable glimpse of an item, with nothing that could be an answer key. */
function preview(content: Record<string, unknown>): string {
  for (const key of ['prompt', 'question', 'storyText', 'sentenceFrame', 'scenario', 'mode']) {
    const value = content[key];
    if (typeof value === 'string' && value.length > 0) return value.slice(0, 160);
    if (value !== null && typeof value === 'object') {
      const nested = (value as { prompt?: unknown }).prompt;
      if (typeof nested === 'string') return nested.slice(0, 160);
    }
  }
  return '(no prompt text; this type is presented entirely by its renderer)';
}

let cache: TypeSummary[] | null = null;

function summarise(): TypeSummary[] {
  if (cache) return cache;

  const files = readdirSync(BANKS_DIR).filter((f) => f.endsWith('.jsonl'));
  const out: TypeSummary[] = [];

  for (const file of files.sort()) {
    const typeCode = file.slice(0, -'.jsonl'.length);
    const items: RawItem[] = [];
    for (const line of readFileSync(join(BANKS_DIR, file), 'utf8').split('\n')) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      items.push(JSON.parse(trimmed) as RawItem);
    }
    if (items.length === 0) continue;

    const difficulties = items.map((i) => i.difficulty).filter((d) => Number.isFinite(d));
    const histogram = new Array<number>(10).fill(0);
    for (const d of difficulties) {
      const bucket = Math.min(9, Math.max(0, Math.floor((d - 1) / 2)));
      histogram[bucket] = (histogram[bucket] ?? 0) + 1;
    }

    const bandCounts = new Map<string, number>();
    for (const item of items) {
      for (const band of item.ageBands ?? []) {
        bandCounts.set(band, (bandCounts.get(band) ?? 0) + 1);
      }
    }
    const bands = [...bandCounts.entries()]
      .map(([band, count]) => ({ band, items: count }))
      .sort((a, b) => BAND_ORDER.indexOf(a.band) - BAND_ORDER.indexOf(b.band));

    const present = BAND_ORDER.filter((b) => bandCounts.has(b));
    const mapping = COGAT_MAP[typeCode];
    const requirement = requirementFor(typeCode);

    out.push({
      typeCode,
      domain: items[0]!.domain,
      items: items.length,
      difficulty: {
        min: Math.min(...difficulties),
        max: Math.max(...difficulties),
        mean: difficulties.reduce((s, d) => s + d, 0) / difficulties.length,
        median: median(difficulties),
        histogram,
        emptyRungs: histogram
          .map((count, i) => ({ count, rung: i }))
          .filter((h) => h.count === 0)
          .map((h) => h.rung),
      },
      ageBands: bands,
      bandSpan: present.length === 0 ? 'none' : `${present[0]!}..${present[present.length - 1]!}`,
      // `subtest: 'none'` now carries what an absent entry used to, so null still means "not CogAT"
      // to every existing consumer of this payload.
      cogat: mapping && mapping.subtest !== 'none' ? { subtest: mapping.subtest, strength: mapping.strength } : null,
      contextCost: contextProfileFor(typeCode).cost,
      readingBand: requirement.readingBand,
      uiElements: [...requirement.elements],
      samples: items.slice(0, 4).map((item) => ({
        itemId: item.itemId,
        difficulty: item.difficulty,
        ageBands: item.ageBands ?? [],
        contentKeys: Object.keys(item.content ?? {}).sort(),
        preview: preview(item.content ?? {}),
      })),
    });
  }

  cache = out;
  return out;
}

function json(res: import('node:http').ServerResponse, status: number, body: unknown): void {
  res.writeHead(status, { 'content-type': 'application/json' });
  res.end(JSON.stringify(body));
}

async function readBody(req: import('node:http').IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) chunks.push(chunk as Buffer);
  return JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}');
}

export function bankReviewApi(): Plugin {
  return {
    name: 'bank-review-api',
    configureServer(server) {
      server.middlewares.use('/api/summary', (_req, res) => {
        try {
          json(res, 200, { types: summarise(), subtests: COGAT_SUBTESTS });
        } catch (error) {
          json(res, 500, { error: error instanceof Error ? error.message : String(error) });
        }
      });

      server.middlewares.use('/api/review', (req, res) => {
        void (async () => {
          try {
            if (req.method === 'POST') {
              const body = (await readBody(req)) as { review?: unknown };
              mkdirSync(dirname(REVIEW_FILE), { recursive: true });
              writeFileSync(REVIEW_FILE, `${JSON.stringify(body.review ?? {}, null, 2)}\n`, 'utf8');
              json(res, 200, { savedTo: REVIEW_FILE });
              return;
            }
            const existing = existsSync(REVIEW_FILE)
              ? (JSON.parse(readFileSync(REVIEW_FILE, 'utf8')) as unknown)
              : {};
            json(res, 200, { review: existing, path: REVIEW_FILE });
          } catch (error) {
            json(res, 500, { error: error instanceof Error ? error.message : String(error) });
          }
        })();
      });
    },
  };
}
