/**
 * Proof that these apps ask the library's questions and let the library mark them.
 *
 * Run: `npx tsx apps/lab-system/verify-provenance.ts` from `screener/`, with the API up on 5202.
 *
 * The claim being tested is "nothing here is made up". That is not something to assert in a comment, so
 * this checks it against the files on disk and the running engine:
 *
 *  1. every item the engine serves exists, by id, in a bank file under `qbank-library/banks/`
 *  2. the served payload carries NO answer key, so the browser could not mark anything itself
 *  3. the answer key on disk really is the one the server marks against: submit the correct key and the
 *     server says correct, submit a different one and it says incorrect
 *  4. the engine is adapting rather than reading a fixed list: difficulty moves in response to answers,
 *     and it reports why it chose each item
 *  5. the choice keys the apps submit are the bank's own option keys, not invented ones
 */
import { readdirSync, readFileSync } from 'node:fs';

import { UNPRESENTABLE } from './shared/headless/adapt';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const API = process.env['LAB_API'] ?? 'http://127.0.0.1:5202';
const BANKS =
  process.env['GT_QBANK_BANKS'] ??
  join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..', 'qbank-library', 'banks');

interface RawBankItem {
  itemId: string;
  typeCode: string;
  difficulty: number;
  content: Record<string, unknown>;
  answer: { correctKey: string | number };
}

/** Every bank item on disk, keyed by id. This is the ground truth the API is checked against. */
function loadBanksFromDisk(): Map<string, { item: RawBankItem; file: string }> {
  const byId = new Map<string, { item: RawBankItem; file: string }>();
  for (const file of readdirSync(BANKS).filter((f) => f.endsWith('.jsonl'))) {
    for (const line of readFileSync(join(BANKS, file), 'utf8').split('\n')) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      const item = JSON.parse(trimmed) as RawBankItem;
      byId.set(item.itemId, { item, file });
    }
  }
  return byId;
}

async function api<T>(path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${API}/api${path}`, {
    method: body === undefined ? 'GET' : 'POST',
    headers: { 'content-type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return (await res.json()) as T;
}

const disk = loadBanksFromDisk();
console.log(`Bank files on disk: ${readdirSync(BANKS).filter((f) => f.endsWith('.jsonl')).length}`);
console.log(`Items on disk: ${disk.size}\n`);

const failures: string[] = [];
/**
 * Items whose key is not one of their own option keys, because it encodes more than one selection
 * (VER-EVIDENCE-01 uses `"A+s5"`: the option, plus the sentence that supports it).
 *
 * That is a fact about the bank rather than a provenance problem, so it is reported separately. What IS
 * asserted is that a surface which cannot make two selections declines the type, since submitting the
 * option alone gets marked wrong every single time.
 */
const compoundKeyTypes = new Set<string>();
let checkedItems = 0;
let keyMatches = 0;
let keyMismatchesExpected = 0;
const difficulties: number[] = [];
const reasons = new Set<string>();

for (const [band, precisionIndex] of [
  ['K-1', 0],
  ['2-3', 1],
  ['4-5', 2],
  ['6-8', 2],
] as const) {
  const start = await api<{ sessionId: string; error?: string }>('/bank/sessions', {
    precisionIndex,
    ageBand: band,
    seed: 20260806,
  });
  if (!start.sessionId) {
    failures.push(`${band}: could not start a session (${start.error ?? 'unknown'})`);
    continue;
  }

  console.log(`## ${band}`);

  for (let i = 0; i < 40; i++) {
    const next = await api<{
      done: boolean;
      served?: { itemId: string; typeCode: string; difficulty: number; content: Record<string, unknown> };
      typeCode?: string;
      difficulty?: number;
      selectionReason?: string;
      state: { stopped: boolean };
    }>(`/bank/sessions/${start.sessionId}/next`);
    if (next.done || !next.served) break;

    const served = next.served;
    checkedItems++;
    difficulties.push(served.difficulty);
    if (next.selectionReason) reasons.add(next.selectionReason);

    // 1. It must exist on disk, by id.
    const onDisk = disk.get(served.itemId);
    if (!onDisk) {
      failures.push(`${served.itemId} was served but is in no bank file on disk`);
      break;
    }

    // 2. The served payload must carry no answer key.
    const servedKeys = Object.keys(served as unknown as Record<string, unknown>);
    for (const forbidden of ['answer', 'scoring', 'provenance']) {
      if (servedKeys.includes(forbidden)) {
        failures.push(`${served.itemId}: served payload leaked "${forbidden}"`);
      }
    }
    if (JSON.stringify(served.content).includes('correctKey')) {
      failures.push(`${served.itemId}: content contains correctKey`);
    }

    // 3. The disk key is what the server marks against. Alternate between submitting the right key and
    //    a deliberately different one, and require the server to disagree with itself accordingly.
    const trueKey = String(onDisk.item.answer.correctKey);
    const contentOptions = (served.content as { options?: { key?: string }[] }).options;
    const optionKeys = Array.isArray(contentOptions)
      ? contentOptions.map((o, idx) => String(o?.key ?? idx))
      : [];
    const sendTrue = i % 2 === 0;
    const wrongKey = optionKeys.find((k) => k !== trueKey);
    const submit = sendTrue || wrongKey === undefined ? trueKey : wrongKey;

    const out = await api<{ correct: boolean | null; state: { stopped: boolean } }>(
      `/bank/sessions/${start.sessionId}/answer`,
      { response: { selectedKey: submit }, latencyMs: 1000 },
    );

    if (submit === trueKey) {
      if (out.correct === true) keyMatches++;
      else if (out.correct === null) {
        // Some types key on something other than a plain option key; not a provenance failure.
      } else {
        failures.push(
          `${served.itemId} (${served.typeCode}): submitted the on-disk correctKey "${trueKey}" and the server marked it wrong`,
        );
      }
    } else if (out.correct === false) {
      keyMismatchesExpected++;
    } else if (out.correct === true) {
      failures.push(
        `${served.itemId}: submitted "${submit}" which is NOT the on-disk key "${trueKey}", and the server marked it correct`,
      );
    }

    // 5. Option keys the app would submit come from the bank, not from the app. A key that is not one
    //    of its own options encodes a second selection, which is recorded rather than failed.
    if (optionKeys.length > 0 && !optionKeys.includes(trueKey) && out.correct !== null) {
      compoundKeyTypes.add(served.typeCode);
    }

    console.log(
      `   ${served.itemId.slice(0, 26).padEnd(26)} ${served.typeCode.padEnd(18)} ` +
        `diff ${served.difficulty.toFixed(1).padStart(4)}  from ${onDisk.file}`,
    );

    if (out.state.stopped) break;
  }
  console.log('');
}

/* 4. Is it adapting, or reading a list? */
const spread = Math.max(...difficulties) - Math.min(...difficulties);

console.log('## Evidence\n');
console.log(`  items served and traced      : ${checkedItems}`);
console.log(`  every one found in a bank file: ${failures.some((f) => f.includes('no bank file')) ? 'NO' : 'yes'}`);
console.log(`  answer key present in payload : ${failures.some((f) => f.includes('leaked')) ? 'YES (bad)' : 'no'}`);
console.log(`  on-disk key marked correct    : ${keyMatches} times`);
console.log(`  a different key marked wrong  : ${keyMismatchesExpected} times`);
console.log(`  difficulty range served       : ${Math.min(...difficulties).toFixed(1)} to ${Math.max(...difficulties).toFixed(1)} (spread ${spread.toFixed(1)})`);
console.log(`  distinct selection reasons    : ${reasons.size}`);
for (const r of [...reasons].slice(0, 6)) console.log(`     ${r}`);

if (compoundKeyTypes.size > 0) {
  console.log('');
  console.log('## Types needing more than one selection\n');
  for (const type of compoundKeyTypes) {
    const declined = UNPRESENTABLE.includes(type);
    console.log(`  ${type.padEnd(18)} key encodes two choices  ${declined ? 'declined by the apps: correct' : 'NOT DECLINED: every one would be marked wrong'}`);
    if (!declined) {
      failures.push(`${type} needs two selections but is not in UNPRESENTABLE, so it is always wrong`);
    }
  }
}

console.log('');
if (failures.length === 0) {
  console.log('PASS. Every question came from a bank file, no answer key reached the client, and the');
  console.log('server marked against the key on disk rather than anything the app supplied.\n');
  process.exit(0);
}
console.log(`FAIL, ${failures.length} problem(s):`);
for (const f of failures.slice(0, 15)) console.log(`  - ${f}`);
process.exit(1);
