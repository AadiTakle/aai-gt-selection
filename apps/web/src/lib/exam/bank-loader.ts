import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

import type { ServedItem } from '@gt-selection/exam-engine';

/**
 * SERVER-ONLY bank loader (BUILD_PLAN §2/§6). Reads the four structured banks
 * from `research/exam-question-types/banks/*.jsonl`, caches them in-process, and
 * exposes:
 *
 *  - {@link getServedItems} — items with `answer`/`scoring`/`provenance` STRIPPED
 *    (a `ServedItem` is all the browser may ever see); supports a `typeCode` +
 *    nearest-`difficulty` filter.
 *  - {@link findBankItem} — the FULL item incl. the server-only answer key, for
 *    server-authoritative verification in `/api/exam-submit`.
 *
 * The answer key, scoring mode, and provenance NEVER leave this module toward the
 * browser. Only route handlers (server) import this file. Born-synthetic only
 * (`syntheticOnly=true`, `validated=false`).
 */

/** The four type codes that currently have a structured bank + refactored renderer. */
export const BANK_TYPE_CODES = [
  'FLU-MATRIX-01',
  'VER-RELPAIR-01',
  'QUANT-SERIES-01',
  'SPA-FOLDNET-01',
] as const;
export type BankTypeCode = (typeof BANK_TYPE_CODES)[number];

/**
 * A full bank item as stored on disk. `answer` / `scoring` / `provenance` are
 * SERVER-ONLY. `correctKey` is a string option key (e.g. `"B"`) for keyed types
 * or a numeric option index for index-keyed types (e.g. VER-RELPAIR).
 */
export interface RawBankItem {
  itemId: string;
  typeCode: string;
  domain: ServedItem['domain'];
  difficulty: number;
  ageBands: ServedItem['ageBands'];
  content: Record<string, unknown>;
  answer: { correctKey: string | number; distractorRationales?: unknown };
  scoring?: { mode?: string };
  provenance?: Record<string, unknown>;
  syntheticOnly: true;
  validated: false;
  /** On-disk relative demo path — NOT served (the runner derives it from typeCode). */
  demoPath?: string;
}

let cache: RawBankItem[] | null = null;

/** Resolve the banks dir robustly whether cwd is the app or the repo root. */
function resolveBanksDir(): string {
  const rel = ['research', 'exam-question-types', 'banks'];
  const candidates = [
    path.join(process.cwd(), ...rel),
    path.join(process.cwd(), '..', '..', ...rel),
    path.join(process.cwd(), '..', '..', '..', ...rel),
  ];
  for (const dir of candidates) if (existsSync(dir)) return dir;
  return candidates[0]!;
}

async function loadAll(): Promise<RawBankItem[]> {
  if (cache) return cache;
  const dir = resolveBanksDir();
  const items: RawBankItem[] = [];
  for (const code of BANK_TYPE_CODES) {
    let text: string;
    try {
      text = await readFile(path.join(dir, `${code}.jsonl`), 'utf8');
    } catch {
      continue; // a missing bank must not crash the whole battery
    }
    for (const line of text.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      try {
        items.push(JSON.parse(trimmed) as RawBankItem);
      } catch {
        // skip a malformed line rather than fail the whole file
      }
    }
  }
  cache = items;
  return items;
}

/** Strip every server-only field (answer/scoring/provenance) + the on-disk demoPath. */
export function toServedItem(item: RawBankItem): ServedItem {
  return {
    itemId: item.itemId,
    typeCode: item.typeCode,
    domain: item.domain,
    difficulty: item.difficulty,
    ageBands: item.ageBands,
    content: item.content,
    syntheticOnly: true,
    validated: false,
  };
}

export interface ServedQuery {
  typeCode?: string | null;
  /** Target difficulty (1..20). When set, results are sorted nearest-first. */
  difficulty?: number | null;
  /** Item ids already served this session (never re-serve them). */
  exclude?: ReadonlySet<string> | undefined;
  limit?: number | null;
}

/**
 * Served items only (NO answer key). Optionally filtered by `typeCode` and sorted
 * by nearest `difficulty`, excluding already-seen ids.
 */
export async function getServedItems(query: ServedQuery = {}): Promise<ServedItem[]> {
  const all = await loadAll();
  let pool = all;
  if (query.typeCode) pool = pool.filter((i) => i.typeCode === query.typeCode);
  if (query.exclude && query.exclude.size > 0) {
    pool = pool.filter((i) => !query.exclude!.has(i.itemId));
  }

  let served = pool.map(toServedItem);
  if (typeof query.difficulty === 'number' && Number.isFinite(query.difficulty)) {
    const target = query.difficulty;
    served = [...served].sort(
      (a, b) =>
        Math.abs(a.difficulty - target) - Math.abs(b.difficulty - target) ||
        a.itemId.localeCompare(b.itemId),
    );
  }
  if (typeof query.limit === 'number' && query.limit > 0) served = served.slice(0, query.limit);
  return served;
}

/** Look up the FULL bank item (incl. the server-only answer key) by id. */
export async function findBankItem(itemId: string): Promise<RawBankItem | null> {
  const all = await loadAll();
  return all.find((i) => i.itemId === itemId) ?? null;
}
