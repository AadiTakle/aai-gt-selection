import { createHmac } from 'node:crypto';
import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

import type { ServedItem } from '@gt-selection/exam-engine';

import {
  openSession,
  replaySession,
  type LedgerRow,
  type MaterialisedSession,
  type OpchainTemplate,
} from '../../../../../research/exam-question-types/stage2-serve-time-materialisation.mjs';
import { ExamBankUnavailableError, assertNoKeyMaterial, type RawBankItem } from './bank-loader';

/**
 * SERVER-ONLY. The serve-time materialisation path for `FLU-OPCHAIN-01`
 * (STAGE2_REDESIGN_SPEC.md §2.1, §3, §4.1; D-211).
 *
 * The shipped bank stores finished items with baked options and one hidden system for its whole life.
 * This path stores TEMPLATES and makes the item per session: draw the symbol->operator mapping, apply
 * the chain, materialise the options from the template's distractor rationales under that mapping, and
 * price the item on four relabelling-invariant levers.
 *
 * ---------------------------------------------------------------------------
 * WHAT IT FIXES, MEASURED
 *
 * PR #51 measured the shipped bank under per-session re-keying and found the answer stops being on
 * screen: 83.3% of mappings land the key on screen at chain depth 1 and **18.4% at depth 4**, because
 * the options predate the mapping and nothing reconciles them. Materialised, it is 100.0% at every
 * depth, because the options are built from the key rather than selected around it.
 *
 * It also kills the difficulty-ordinal attack. The shipped generator walks a global cursor for the
 * key's screen slot and emits in increasing difficulty, so a client that sorts a scraped bank by the
 * served `difficulty` recovers the emission index: 60.7% against its own permutation null of 22.2%.
 * Here the slot comes from a hash of (session seed, template id), and the same attack on a materialised
 * session scores 29.2% against a null of 30.0% — a lift of -0.83, which is no lift.
 *
 * `research/exam-question-types/gate-a/stage2-serve-time-materialisation-probe.mjs` is the whole
 * measurement, in one command.
 *
 * ---------------------------------------------------------------------------
 * THE MAPPING, THE SEED, AND WHY NEITHER CAN CROSS THE BOUNDARY
 *
 * The session's mapping is derived from a session SEED, so the seed is as sensitive as the mapping: a
 * browser holding it could compute the key for every item it will ever be shown. What the browser
 * holds instead is the `sessionId` it already generates for its own run, and the seed is
 * `HMAC(secret, sessionId)` — see {@link sessionSeedFor}. The token is public, the seed is not, and the
 * derivation runs only here.
 *
 * That also satisfies R7 without storing anything: an auditor with the secret and the recorded
 * `sessionId` reconstructs the seed, and {@link replayMaterialisedSession} reconstructs every screen
 * from it. The ledger recorded per trial is the same facts written down, so a replay is checkable
 * against the record rather than merely repeatable.
 *
 * ---------------------------------------------------------------------------
 * DUAL PATH, AND WHICH ONE IS LIVE
 *
 * Off by default. With `EXAM_SERVE_TIME_MATERIALISATION` unset, every route behaves exactly as it did
 * and `FLU-OPCHAIN-01` is served from `banks/FLU-OPCHAIN-01.jsonl` — the block that ships today keeps
 * working while this lands. With it set, and only for `FLU-OPCHAIN-01`, the item comes from a session
 * materialised out of `templates/FLU-OPCHAIN-01.jsonl`. No other type is touched by either switch.
 */

/** The one type on this path. The other three Stage 2 types are being redesigned separately. */
export const MATERIALISED_TYPE_CODE = 'FLU-OPCHAIN-01';

/**
 * Whether the materialised path is live.
 *
 * A read of the environment on every call rather than a module constant, because the test suite has to
 * exercise both paths in one process and a constant captured at import time would make the second one
 * unreachable.
 */
export function materialisationEnabled(): boolean {
  const flag = process.env.EXAM_SERVE_TIME_MATERIALISATION;
  return flag === '1' || flag === 'true';
}

/**
 * The secret the session seed is derived with.
 *
 * NOT a fallback in the "degrade quietly" sense. A deployment that leaves this unset gets a constant,
 * which makes every session's mapping a function of its `sessionId` alone — and `sessionId` is in the
 * browser. That is not a per-session secret at all, so the getter refuses rather than pretending, and
 * only the test/dev default below is allowed to be predictable.
 *
 * It is read per call for the same reason {@link materialisationEnabled} is.
 */
function sessionSecret(): string {
  const secret = process.env.EXAM_SESSION_SEED_SECRET;
  if (secret !== undefined && secret.length >= 16) return secret;
  if (process.env.NODE_ENV === 'production') {
    throw new ExamBankUnavailableError(
      'EXAM_SERVE_TIME_MATERIALISATION is on but EXAM_SESSION_SEED_SECRET is unset or shorter than 16 ' +
        'characters. The session mapping is derived from this secret and the browser-visible sessionId, ' +
        'so without it the mapping is computable by the browser and every item becomes a lookup.',
    );
  }
  return 'dev-only-materialisation-secret';
}

/**
 * The session seed for one browser-visible session id.
 *
 * The whole security argument in one function. `sessionId` is public — the runner generates it and
 * puts it in `localStorage` — and the mapping must not be derivable from it, so the seed is an HMAC
 * under a server-only secret rather than the id itself or a hash of it. Everything downstream is a pure
 * function of this string, which is what makes the session replayable and what makes it opaque.
 */
export function sessionSeedFor(sessionId: string): string {
  return createHmac('sha256', sessionSecret())
    .update(`stage2-materialisation|v1|${sessionId}`)
    .digest('hex');
}

/* ------------------------------------------------------------------ *
 * The template bank on disk
 * ------------------------------------------------------------------ */

/**
 * Where the templates are, spelled out as literal segments at module scope for the reason
 * `bank-loader.ts` gives at length: Next's build tracer statically evaluates the argument of every
 * `fs` call it can see, and an argument it cannot resolve makes it glob the nearest directory it did
 * resolve — which is how the standalone bundle once acquired `docs/` and `brainlifting/`.
 *
 * They are ALTERNATIVES, not a search path. cwd is the repo root under the workspace scripts and the
 * vitest suites, and `apps/web` under `next dev`, `next start` and the standalone server.
 */
const TEMPLATES_DIR_FROM_REPO_ROOT = path.join(
  process.cwd(),
  'research',
  'exam-question-types',
  'templates',
);
const TEMPLATES_DIR_FROM_APP = path.join(
  process.cwd(),
  '..',
  '..',
  'research',
  'exam-question-types',
  'templates',
);
const TEMPLATES_DIR = existsSync(TEMPLATES_DIR_FROM_REPO_ROOT)
  ? TEMPLATES_DIR_FROM_REPO_ROOT
  : TEMPLATES_DIR_FROM_APP;

let templateCache: OpchainTemplate[] | null = null;

/**
 * Every template, parsed once.
 *
 * Fatal on any read or parse failure, for the reason {@link ExamBankUnavailableError} already gives:
 * a corrupt line silently shrinks the pool the adaptive engine draws from, and on the path that serves
 * questions to children a quietly different pool is the wrong default.
 */
export async function loadTemplates(): Promise<OpchainTemplate[]> {
  if (templateCache) return templateCache;
  const file = path.join(TEMPLATES_DIR, `${MATERIALISED_TYPE_CODE}.jsonl`);
  let text: string;
  try {
    text = await readFile(file, 'utf8');
  } catch (cause) {
    throw new ExamBankUnavailableError(
      `serve-time materialisation is on but the template bank could not be read: ${file}. ` +
        'Regenerate it with `node research/exam-question-types/generators/FLU-OPCHAIN-01-template.mjs`.',
      { cause },
    );
  }

  const templates: OpchainTemplate[] = [];
  const lines = text.split('\n');
  for (let i = 0; i < lines.length; i += 1) {
    const trimmed = lines[i]!.trim();
    if (!trimmed) continue;
    try {
      templates.push(JSON.parse(trimmed) as OpchainTemplate);
    } catch (cause) {
      throw new ExamBankUnavailableError(`${file}:${i + 1} is not valid JSON.`, { cause });
    }
  }
  if (templates.length === 0) {
    throw new ExamBankUnavailableError(`${file} holds no templates.`);
  }
  templateCache = templates;
  return templates;
}

/** Test seam: forget the parsed templates so a suite can re-read a rewritten file. */
export function resetTemplateCache(): void {
  templateCache = null;
}

/* ------------------------------------------------------------------ *
 * Live sessions
 * ------------------------------------------------------------------ */

/**
 * Open sessions, keyed by the browser-visible session id.
 *
 * IN-PROCESS, AND THAT IS A STATED LIMIT RATHER THAN AN OVERSIGHT. A session's materialisation is a
 * pure function of its seed, and the seed is a pure function of (secret, sessionId), so a request that
 * lands on an instance which has never seen this session rebuilds an IDENTICAL session — the cache is
 * a cost optimisation, not state the correctness depends on. What does NOT survive is the evidence
 * accumulated so far, because that is a function of the trials committed on this instance, so on a
 * multi-instance deployment the difficulty of a mid-block item could be computed against a shorter
 * history than the child actually has. Recorded as an open assumption in E-213; closing it means
 * persisting the ledger, which is a migration and is out of scope here.
 */
const sessions = new Map<string, MaterialisedSession>();

export async function materialisedSessionFor(sessionId: string): Promise<MaterialisedSession> {
  const open = sessions.get(sessionId);
  if (open) return open;
  const session = openSession({
    sessionSeed: sessionSeedFor(sessionId),
    templates: await loadTemplates(),
  });
  sessions.set(sessionId, session);
  return session;
}

/** Test seam: drop live sessions so a suite can re-open one from scratch. */
export function resetMaterialisedSessions(): void {
  sessions.clear();
}

/**
 * Re-run a session from the audit record. R7's reconstruction.
 *
 * Takes the browser-visible `sessionId` and the recorded (templateId, chosenKey) pairs, and returns the
 * ledger. Deliberately NOT given the served options, keys or difficulties: reproducing those is the
 * property being checked, so accepting them would make the check circular.
 */
export async function replayMaterialisedSession(
  sessionId: string,
  choices: readonly { templateId: string; chosenKey: string }[],
): Promise<LedgerRow[]> {
  const replayed = replaySession({
    sessionSeed: sessionSeedFor(sessionId),
    templates: await loadTemplates(),
    choices: choices.map((choice) => ({ ...choice })),
  });
  return replayed.ledger;
}

/* ------------------------------------------------------------------ *
 * The two shapes the rest of the app asks for
 * ------------------------------------------------------------------ */

/**
 * Every candidate of this session, as served items — no key, no mapping.
 *
 * Priced against the evidence so far, so the `difficulty` an engine selects on is the one that will be
 * recorded. Selecting on one number and recording another is how a replay stops matching.
 */
export async function materialisedServedItems(sessionId: string): Promise<ServedItem[]> {
  const session = await materialisedSessionFor(sessionId);
  return session
    .candidates()
    .map((candidate) => toServedMaterialised(candidate.item, candidate.difficulty));
}

/**
 * The selection index for this session's candidates — everything the engine needs to choose the next
 * item, and no `content`.
 *
 * A CONSEQUENCE OF §2.1 THAT THE ROUTE CONTRACT HAS TO ABSORB. The shipped index is fetched ONCE per
 * session, because `difficulty` is a number in a file and cannot change. Under materialisation it is a
 * function of the child's evidence, so an index fetched at trial 1 is stale by trial 2 — measured on a
 * seeded run, the pool's mean price falls from 14.17 to 8.90 over 30 trials. So a caller on this path
 * must re-fetch per trial. That is cheap (this index is a few tens of kilobytes and holds one type, not
 * the whole 3k-item pool) but it is a real change to how the runner talks to `/api/exam-items`, and it
 * is why the materialised path is flagged rather than swapped in.
 */
export async function materialisedIndexEntries(
  sessionId: string,
): Promise<(Omit<ServedItem, 'content'> & { content: { optionCount?: number } })[]> {
  const session = await materialisedSessionFor(sessionId);
  return session.candidates().map((candidate) => ({
    itemId: candidate.item.itemId,
    typeCode: candidate.item.typeCode,
    domain: candidate.item.domain as ServedItem['domain'],
    difficulty: candidate.difficulty,
    ageBands: candidate.item.ageBands as ServedItem['ageBands'],
    content: { optionCount: candidate.item.content.options.length },
    syntheticOnly: true as const,
    validated: false as const,
  }));
}

/**
 * One item of this session, with its stimulus content and still key-free — and RECORDED as served.
 *
 * Fetching the item to render it and recording that it was served are the same event here, because
 * the difficulty that has to go in the R7 record is the one computed at the moment the screen was
 * built. Recording it later would price it against evidence that includes trials the child had not yet
 * met.
 *
 * IDEMPOTENT by item id. A retried fetch, a re-render, or a page reload must not look like a second
 * trial, so an item already in the ledger returns its recorded row rather than advancing it.
 */
export async function materialisedServedItem(
  sessionId: string,
  itemId: string,
): Promise<ServedItem | null> {
  const session = await materialisedSessionFor(sessionId);
  const recorded = session.ledger.find((row) => row.itemId === itemId);
  if (recorded !== undefined) {
    const entry = session.materialised.find((candidate) => candidate.item.itemId === itemId);
    return entry === undefined ? null : toServedMaterialised(entry.item, recorded.difficulty);
  }
  const candidate = session.candidates().find((c) => c.item.itemId === itemId);
  if (candidate === undefined) return null;
  const { item, row } = session.serve(candidate.entry.template.templateId);
  return toServedMaterialised(item, row.difficulty);
}

/**
 * The FULL materialised item for `/api/exam-submit` to grade against, in the shape the shipped
 * verifier already reads.
 *
 * `answer.system.mapping` is what `verifyOpChain` resolves the badge chain through, and it re-derives
 * the key rather than trusting `correctKey` — so handing it the session's mapping means the materialised
 * path is graded by the SAME verifier as the shipped path, with no branch on which path produced the
 * item. A second grading path is a second thing that can be wrong about the algebra.
 *
 * Looked up over `materialised` rather than `candidates`, because by the time a submission arrives the
 * item has been served and a candidate list excludes served items.
 */
export async function materialisedBankItem(
  sessionId: string,
  itemId: string,
): Promise<RawBankItem | null> {
  const session = await materialisedSessionFor(sessionId);
  const entry = session.materialised.find((candidate) => candidate.item.itemId === itemId);
  if (entry === undefined) return null;
  const row = session.ledger.find((ledgerRow) => ledgerRow.itemId === itemId);
  return {
    ...entry.item,
    // The difficulty RECORDED when the item was served, never a re-computation. Re-pricing at submit
    // time would use the evidence as it is now, which includes trials served after this one, and the
    // engine would then be updated against a number the child never faced.
    difficulty: row?.difficulty ?? entry.item.difficulty ?? 0,
    ageBands: entry.item.ageBands as RawBankItem['ageBands'],
    domain: entry.item.domain as RawBankItem['domain'],
    answer: {
      ...entry.item.answer,
      system: { systemId: session.system.systemId, mapping: { ...session.system.badgeToOperator } },
    },
    syntheticOnly: true,
    validated: false,
  };
}

/**
 * The served projection for a materialised item.
 *
 * Built by NAMING the seven fields a `ServedItem` carries, exactly as `toServedItem` does, so a field
 * added to `MaterialisedItem` later is absent here by default rather than present by oversight. The
 * key-material assertion is `bank-loader.ts`'s `assertNoKeyMaterial`, applied by that module to both
 * paths — this one does not get its own weaker copy.
 */
function toServedMaterialised(
  item: { itemId: string; typeCode: string; domain: string; ageBands: string[]; content: unknown },
  difficulty: number,
): ServedItem {
  const served: ServedItem = {
    itemId: item.itemId,
    typeCode: item.typeCode,
    domain: item.domain as ServedItem['domain'],
    difficulty,
    ageBands: item.ageBands as ServedItem['ageBands'],
    content: item.content as Record<string, unknown>,
    syntheticOnly: true,
    validated: false,
  };
  assertNoKeyMaterial(served);
  return served;
}

/**
 * Fold a committed answer into the session's evidence, so the next item is priced against it.
 *
 * Returns null when the trial was already committed or nothing has been served, rather than throwing:
 * a duplicate submission is a network event, not a programming error, and failing a child's submission
 * over one is the wrong trade. The ledger row it would have written already exists.
 */
export async function commitMaterialisedTrial(
  sessionId: string,
  itemId: string,
  chosenKey: string,
): Promise<LedgerRow | null> {
  const session = await materialisedSessionFor(sessionId);
  const row = session.ledger[session.ledger.length - 1];
  if (row === undefined || row.itemId !== itemId || row.chosenKey !== null) return null;
  return session.commit({ chosenKey });
}

/**
 * The audit record for one session: what was served, in what order, with which options and difficulty.
 *
 * This is the R7 artifact. It is written into the append-only telemetry trace by `/api/exam-submit`, so
 * a rejected family's block is reconstructible from the record and re-derivable from the seed, and the
 * two can be compared. Server-side only — it names the key.
 */
export async function materialisationLedger(sessionId: string): Promise<LedgerRow[]> {
  const session = await materialisedSessionFor(sessionId);
  return session.ledger;
}
