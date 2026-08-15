/**
 * Prove the curated pool actually works, per age band.
 *
 * Run: npm run verify:showcase          (needs the lab API on 5202)
 *
 * Two things could go wrong with an allowlist and neither is visible from reading it. A held-back type
 * could still reach a child, which is the whole point of the list. Or the list could be too narrow for
 * some age band — the engine needs items in every domain it wants a minimum from, and a band with none
 * either stops early or cannot start, which would look like a broken demo rather than a narrow pool.
 *
 * So this starts a real session per band against the real API, plays it to its own stopping point, and
 * reports the pool size, what was served, and whether anything held back leaked through.
 */

import { HELD_BACK, SHOWCASE_TYPE_CODES, familyOf, FAMILY_LABELS, type ShowcaseFamily } from './shared/showcase';

const API = process.env['GT_LAB_API'] ?? 'http://127.0.0.1:5202/api';
const HELD = new Set(HELD_BACK.map((h) => h.typeCode));

async function api<T>(path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    method: body === undefined ? 'GET' : 'POST',
    headers: { 'content-type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data: unknown = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as { error?: string }).error ?? res.statusText);
  return data as T;
}

interface Started {
  sessionId: string;
  poolSize: number;
}

async function playBand(band: string, precisionIndex: number): Promise<{ ok: boolean; line: string; detail: string }> {
  let start: Started;
  try {
    start = await api<Started>('/bank/sessions', {
      ageBand: band,
      precisionIndex,
      types: [...SHOWCASE_TYPE_CODES],
      seed: 424242,
    });
  } catch (e) {
    return { ok: false, line: `${band.padEnd(5)} COULD NOT START: ${e instanceof Error ? e.message : String(e)}`, detail: '' };
  }

  const served: string[] = [];
  let leaked = 0;
  let stopped = false;

  for (let i = 0; i < 60; i += 1) {
    const next = await api<{ done: boolean; served?: { typeCode: string }; typeCode?: string }>(
      `/bank/sessions/${start.sessionId}/next`,
    );
    if (next.done) {
      stopped = true;
      break;
    }
    const code = next.served?.typeCode ?? next.typeCode ?? '?';
    served.push(code);
    if (HELD.has(code)) leaked += 1;

    // Answering 'A' every time is fine: this checks which items the engine selects and that a session
    // reaches its own stopping point, not whether the ability estimate is any good.
    const out = await api<{ state: { stopped: boolean } }>(`/bank/sessions/${start.sessionId}/answer`, {
      response: { choiceKey: 'A' },
      // 3000 rather than 1200: seven types now have a rapid-guess floor above 1200ms (1b.3), and a
      // simulated child answering a word problem in 1.2s was never plausible anyway. Below the floor the
      // response comes back unscorable and this script would report a fault that is its own.
      latencyMs: 3000,
    });
    if (out.state.stopped) {
      stopped = true;
      break;
    }
  }

  const families = new Set<ShowcaseFamily | 'HELD BACK'>();
  for (const code of served) families.add(familyOf(code) ?? 'HELD BACK');
  const ok = leaked === 0 && stopped && served.length > 0;

  return {
    ok,
    line:
      `${band.padEnd(5)} pool ${String(start.poolSize).padStart(4)}  served ${String(served.length).padStart(2)}  ` +
      `leaked ${String(leaked)}  ${stopped ? 'stopped cleanly' : 'DID NOT STOP'}`,
    detail: `        ${[...new Set(served)].sort().join(', ')}\n        families: ${[...families].map((f) => (f === 'HELD BACK' ? f : FAMILY_LABELS[f])).join(' · ')}`,
  };
}

async function main(): Promise<void> {
  console.log(`\nSHOWCASE POOL\n${'='.repeat(74)}`);
  console.log(`  allowing ${String(SHOWCASE_TYPE_CODES.length)} types, holding back ${String(HELD.size)}\n`);

  let allOk = true;
  for (const [band, precision] of [['K-1', 0], ['2-3', 1], ['4-5', 2], ['6-8', 2]] as const) {
    const { ok, line, detail } = await playBand(band, precision);
    console.log(`  ${line}`);
    if (detail) console.log(detail);
    if (!ok) allOk = false;
  }

  console.log(`\n  ${allOk ? 'every band starts, stops and serves only allowed types.' : 'SOMETHING IS WRONG above.'}\n`);
  if (!allOk) process.exit(1);
}

await main();
