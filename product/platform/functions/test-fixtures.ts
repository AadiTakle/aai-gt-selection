import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

/**
 * A small bank on disk, so the handler tests publish a real catalog without paying for the real one.
 *
 * Compiling all 53 banks writes about nine thousand rows to DynamoDB Local, which turns a fast test
 * suite into a slow one. The catalog package already owns the golden test against the real banks; what
 * these tests need is a catalog with known contents and one type per domain, so coverage minimums and
 * the approval filter can both be exercised.
 */

export interface FixtureBank {
  readonly dir: string;
  readonly typeCodes: readonly string[];
  readonly itemsPerType: number;
  /** itemId to correct key, so a test can answer correctly on purpose. */
  readonly keys: ReadonlyMap<string, string>;
}

const TYPES: readonly [string, string][] = [
  ['QUANT-FIXTURE-01', 'quantitative'],
  ['VER-FIXTURE-01', 'verbal'],
  ['SPA-FIXTURE-01', 'spatial'],
  ['FLU-FIXTURE-01', 'fluid_reasoning'],
];

const OPTION_KEYS = ['A', 'B', 'C', 'D'] as const;

export function writeFixtureBanks(itemsPerType = 12): FixtureBank {
  const dir = mkdtempSync(join(tmpdir(), 'gt-banks-'));
  const keys = new Map<string, string>();

  for (const [typeCode, domain] of TYPES) {
    const lines: string[] = [];
    for (let i = 0; i < itemsPerType; i++) {
      const itemId = `${typeCode}-i${String(i).padStart(2, '0')}`;
      // Spread across the authoring scale so selection has somewhere to move. b = (d - 10.5) / 3, so
      // 4 to 18 covers roughly -2.2 to +2.5 logits.
      const difficulty = Number((4 + (14 * i) / Math.max(1, itemsPerType - 1)).toFixed(2));
      const correctKey = OPTION_KEYS[i % OPTION_KEYS.length] as string;
      keys.set(itemId, correctKey);

      lines.push(
        JSON.stringify({
          itemId,
          typeCode,
          domain,
          difficulty,
          ageBands: ['3-5'],
          content: {
            typeCode,
            stem: `fixture stem ${i}`,
            options: OPTION_KEYS.map((key) => ({ key, label: `option ${key}` })),
          },
          answer: { correctKey, distractorRationales: { A: 'no' } },
          scoring: { mode: 'deterministic_key' },
          syntheticOnly: false,
          validated: true,
        }),
      );
    }
    writeFileSync(join(dir, `${typeCode}.jsonl`), `${lines.join('\n')}\n`, 'utf8');
  }

  return { dir, typeCodes: TYPES.map(([code]) => code), itemsPerType, keys };
}

/** An in-memory stand-in for the snapshot bucket. */
export function memoryObjectStore(): {
  put: (key: string, body: Buffer) => Promise<void>;
  fetch: (bucket: string, key: string) => Promise<Buffer>;
  size: () => number;
} {
  const objects = new Map<string, Buffer>();
  return {
    put: async (key, body) => {
      objects.set(key, body);
    },
    fetch: async (_bucket, key) => {
      const found = objects.get(key);
      if (!found) throw new Error(`no object ${key}`);
      return found;
    },
    size: () => objects.size,
  };
}

export function apiEvent(options: {
  readonly method: string;
  readonly path: string;
  readonly appId?: string | null;
  readonly body?: unknown;
  readonly pathParameters?: Record<string, string>;
  readonly headers?: Record<string, string>;
  readonly query?: Record<string, string>;
}): Record<string, unknown> {
  return {
    requestContext: {
      http: { method: options.method, path: options.path },
      authorizer: options.appId ? { lambda: { appId: options.appId } } : {},
    },
    headers: options.headers ?? {},
    queryStringParameters: options.query ?? {},
    pathParameters: options.pathParameters ?? {},
    body: options.body === undefined ? null : JSON.stringify(options.body),
  };
}
