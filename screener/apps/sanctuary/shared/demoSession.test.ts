import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { DEMO_MAX_ITEMS, DEMO_MIN_ITEMS, DEMO_THRESHOLD, demoAnswer, demoCreateSession, demoNext, demoReset } from './demoSession';

/**
 * Demo mode, and the one property that matters most about it: it talks to nothing.
 *
 * A demo that quietly reached the platform would be worse than no demo — it would create personas, move exposure
 * counts, and put a demonstration into the same tables real children are measured in. So the isolation is
 * asserted rather than intended: `fetch` is replaced with a spy that serves the static bank and fails loudly on
 * any other URL.
 */

const BANK = join(import.meta.dirname, '..', 'public', 'demo-bank.json');

let requested: string[] = [];

beforeEach(() => {
  requested = [];
  demoReset();
  const bank = readFileSync(BANK, 'utf8');
  vi.stubGlobal('fetch', (input: unknown) => {
    const url = String(input);
    requested.push(url);
    if (url.endsWith('demo-bank.json')) {
      return Promise.resolve(new Response(bank, { status: 200, headers: { 'content-type': 'application/json' } }));
    }
    // Anything else is a bug: demo mode has no business reaching a network.
    return Promise.reject(new Error(`demo mode must not fetch ${url}`));
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

async function play(rounds: number, alwaysRight: boolean) {
  const { sessionId } = await demoCreateSession({ personaId: 'demo-keeper' });
  const bank = JSON.parse(readFileSync(BANK, 'utf8')) as {
    items: { itemId: string; correctKey: string | number }[];
  };
  const keyOf = new Map(bank.items.map((i) => [i.itemId, i.correctKey]));

  let last: Awaited<ReturnType<typeof demoAnswer>> | null = null;
  for (let i = 0; i < rounds; i += 1) {
    const next = await demoNext(sessionId);
    if (next.done === true) break;
    const served = next.served as { itemId: string };
    const key = keyOf.get(served.itemId);
    const right = typeof key === 'number' ? { selectedIndex: key } : { key: String(key), selectedKey: String(key) };
    const wrong = typeof key === 'number' ? { selectedIndex: Number(key) === 0 ? 1 : 0 } : { key: 'ZZ', selectedKey: 'ZZ' };
    last = await demoAnswer(sessionId, alwaysRight ? right : wrong);
  }
  return { sessionId, last };
}

describe('demo mode is isolated', () => {
  it('fetches nothing but its own static bank', async () => {
    await play(6, true);
    expect(requested.every((u) => u.endsWith('demo-bank.json'))).toBe(true);
  });

  it('fetches that bank once, however many questions are asked', async () => {
    await play(14, true);
    expect(requested.filter((u) => u.endsWith('demo-bank.json'))).toHaveLength(1);
  });

  it('forgets everything on reset, because nothing was ever stored', async () => {
    const { sessionId } = await play(4, true);
    demoReset();
    await expect(demoNext(sessionId)).rejects.toThrow(/no demo session/);
  });
});

describe('demo mode measures like the real thing', () => {
  it('aims at the same threshold the platform does', () => {
    // If CRITERIA_V1 moves, this has to move with it, or a demo demonstrates a different instrument.
    expect(DEMO_THRESHOLD).toBeCloseTo(1.645, 3);
  });

  it('will not decide before the item floor', async () => {
    const { last } = await play(DEMO_MIN_ITEMS - 1, true);
    expect(last?.state.stopped).toBe(false);
    expect((last?.state as { decision?: unknown } | undefined)?.decision ?? null).toBeNull();
  });

  it('recommends a child who answers everything correctly', async () => {
    const { last } = await play(DEMO_MAX_ITEMS, true);
    expect(last?.state.stopped).toBe(true);
    expect((last?.state as unknown as { decision?: string }).decision).toBe('recommend');
  });

  it('does not recommend a child who answers everything wrongly', async () => {
    const { last } = await play(DEMO_MAX_ITEMS, false);
    expect(last?.state.stopped).toBe(true);
    expect((last?.state as unknown as { decision?: string }).decision).toBe('no-recommendation');
  });

  it('never serves the same item twice in a session', async () => {
    const { sessionId } = await demoCreateSession({ personaId: 'k2' });
    const seen: string[] = [];
    for (let i = 0; i < DEMO_MAX_ITEMS; i += 1) {
      const next = await demoNext(sessionId);
      if (next.done === true) break;
      seen.push((next.served as { itemId: string }).itemId);
      await demoAnswer(sessionId, { key: 'ZZ', selectedKey: 'ZZ', selectedIndex: 99 });
    }
    expect(new Set(seen).size).toBe(seen.length);
  });

  it('never puts an answer key on a served payload', async () => {
    const { sessionId } = await demoCreateSession({ personaId: 'k3' });
    const next = await demoNext(sessionId);
    expect(JSON.stringify(next)).not.toContain('correctKey');
  });
});
