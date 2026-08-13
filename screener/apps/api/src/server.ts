import express from 'express';
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { AgeBand, SessionRecord } from '@gt/contracts';
import { createSeededLibrary, validateGenerator } from '@gt/item-library';
import { ScreenerSession, defaultScreenerConfig, prototypeSurfaces } from '@gt/engine';
import { bySurface, effectivenessStats, generatorStats, screenerStats } from '@gt/stats';
import { PracticeSession, defaultPracticeConfig } from '@gt/practice';
import { QbankSession, loadBanks, precisionAt, PRECISION_STEPS } from '@gt/qbank/server';
/**
 * The wire contract, from the browser-safe entry so the same declarations serve the server and every client.
 * These annotations are what make the contract enforced rather than described: a handler whose response stops
 * matching stops compiling, which is the only kind of spec that does not drift.
 */
import type {
  AnswerResponse,
  BankCatalogueResponse,
  CreateSessionResponse,
  DebugResponse,
  NextResponse,
} from '@gt/qbank';
import { Store } from './store.js';

const PORT = Number(process.env.PORT ?? 5181);

const { library, snapshotId } = createSeededLibrary();
const store = new Store();
store.saveSnapshots(library.allSnapshots());

/**
 * Live sessions, held in memory.
 *
 * The engine is deterministic given its seed, so an interrupted session is replayable rather
 * than lost. Keeping the in-flight object in memory is a convenience, not the source of truth:
 * the source of truth is the appended record.
 */
const live = new Map<string, { session: ScreenerSession; record: SessionRecord; startedAt: number }>();

const app = express();
app.use(express.json());

// --- the playable catalogue ---------------------------------------------------
//
// Served from this origin so the web app can re-skin an embedded item by setting CSS custom
// properties on its document. A cross-origin frame is opaque and could not be themed at all,
// so co-locating these is load-bearing rather than tidy.

// Resolved against this file, so the catalogue is found whichever directory the server is
// launched from. GT_QBANK_DIR overrides it for a deployment that stores the items elsewhere.
const QBANK_DIR =
  process.env.GT_QBANK_DIR ??
  join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..', '..', 'qbank-library');

app.use('/qbank/items', express.static(join(QBANK_DIR, 'items')));

app.get('/api/qbank', (_req, res) => {
  try {
    const files = readdirSync(join(QBANK_DIR, 'items')).filter((f) => f.endsWith('.html'));
    const items = files.map((file) => {
      // Titles look like "SPA-TANGRAM-01 · Shape-Fill Form Board". Read only the head, since
      // some of these files are tens of kilobytes and nothing below the title is needed.
      const head = readFileSync(join(QBANK_DIR, 'items', file), 'utf8').slice(0, 4000);
      const m = /<title>([^<]*)<\/title>/i.exec(head);
      const raw = (m?.[1] ?? file.replace(/\.html$/, '')).trim();
      const [codePart, namePart] = raw.split('·');
      const code = (codePart ?? file).trim();
      const area = code.split('-')[0]?.toUpperCase() ?? 'OTHER';
      return {
        file,
        code,
        name: (namePart ?? code).trim(),
        area,
        readingFree: area === 'SPA' || area === 'WM',
        url: `/qbank/items/${file}`,
      };
    });
    items.sort((a, b) => a.area.localeCompare(b.area) || a.code.localeCompare(b.code));
    return res.json({ items, count: items.length, dir: QBANK_DIR });
  } catch (err) {
    return res.status(500).json({ error: `catalogue unavailable: ${err instanceof Error ? err.message : String(err)}` });
  }
});

// --- library -----------------------------------------------------------------

app.get('/api/library', (_req, res) => {
  // The banks are part of the library, so the studio lists them beside the generators rather than
  // pretending the 13 generator families are all there is.
  const bankTypes = [...banks.values()].map((b) => ({
    typeCode: b.typeCode,
    domain: b.domain,
    scorable: b.scorable.length,
    total: b.total,
    excluded: b.excluded,
    difficultyRange: b.difficultyRange,
    ageBands: b.ageBands,
    rendererUrl: `/qbank/items/${b.typeCode}.html`,
  })).sort((a, b) => a.typeCode.localeCompare(b.typeCode));
  res.json({
    bankTypes,
    bankTotals: {
      types: bankTypes.length,
      scorable: bankTypes.reduce((n, t) => n + t.scorable, 0),
      total: bankTypes.reduce((n, t) => n + t.total, 0),
    },
    generators: library.all().map((g) => ({
      id: g.id,
      version: g.version,
      title: g.title,
      construct: g.construct,
      domain: g.domain,
      ageBands: g.ageBands,
      readingLoad: g.readingLoad,
      difficulty: g.difficulty,
      status: g.status,
      deprecationNote: g.deprecationNote ?? null,
      selectFromStem: g.selectFromStem ?? false,
    })),
    snapshots: library.allSnapshots(),
  });
});

/** Preview a generator across seeds. This is how an author checks a family before publishing. */
app.get('/api/library/:id/:version/preview', (req, res) => {
  const { id, version } = req.params;
  const gen = library.get(id, version);
  if (!gen) return res.status(404).json({ error: `no generator ${id}@${version}` });
  const count = Math.min(Number(req.query.count ?? 6), 24);
  const first = Number(req.query.firstSeed ?? 1);
  const items = Array.from({ length: count }, (_, i) => gen.render(first + i));
  return res.json({ generator: { id, version, title: gen.title }, items, validation: validateGenerator(gen) });
});

app.post('/api/library/:id/:version/deprecate', (req, res) => {
  const { id, version } = req.params;
  const note = String(req.body?.note ?? 'no reason given');
  try {
    library.deprecate(id, version, note);
    // Existing snapshots are untouched by design, so nothing live changes here.
    return res.json({ ok: true, affectedLiveSnapshots: 0 });
  } catch (err) {
    return res.status(400).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

app.post('/api/snapshots', (req, res) => {
  try {
    const snapshot = library.createSnapshot({
      label: String(req.body?.label ?? 'untitled snapshot'),
      createdBy: String(req.body?.createdBy ?? 'studio'),
    });
    store.saveSnapshots(library.allSnapshots());
    return res.json(snapshot);
  } catch (err) {
    return res.status(400).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

// --- adaptive sessions over the real item banks -------------------------------
//
// The same posterior, the same information-at-threshold selection and the same asymmetric stop rule
// as the generator screener. What differs is that items come from the banks and the answer key never
// leaves this process: the frame is handed an item with the key removed and reports a response,
// which is marked here.

const banks = loadBanks();
const bankSessions = new Map<string, QbankSession>();
// Item id to correct key. Held so the practice tool can show an answer once it has been attempted.
// The screener never reads this, which is the difference between the two products.
const keyIndex = new Map<string, string>();
for (const bank of banks.values()) {
  // Stringified because this is only ever shown to a person. An index-keyed type reads as its position.
  for (const record of bank.scorable) keyIndex.set(record.itemId, String(record.answer.correctKey));
}
{
  const scorable = [...banks.values()].reduce((n, b) => n + b.scorable.length, 0);
  const total = [...banks.values()].reduce((n, b) => n + b.total, 0);
  console.log(`[api] banks: ${banks.size} types, ${scorable} scorable of ${total} records`);
}

app.get('/api/bank', (_req, res) => {
  const types = [...banks.values()].map((b) => ({
    typeCode: b.typeCode,
    domain: b.domain,
    scorable: b.scorable.length,
    total: b.total,
    excluded: b.excluded,
    difficultyRange: b.difficultyRange,
    ageBands: b.ageBands,
  }));
  const catalogue: BankCatalogueResponse = {
    types: types.sort((a, b) => a.typeCode.localeCompare(b.typeCode)),
    typeCount: types.length,
    scorable: types.reduce((n, t) => n + t.scorable, 0),
    total: types.reduce((n, t) => n + t.total, 0),
    precisionSteps: PRECISION_STEPS,
    // Stated so nobody has to read source to find out how the bank scale became logits.
    difficultyMapping: { midpoint: 10.5, divisor: 3, note: 'a rescaling of the bank 1-20 scale, not a calibration' },
  };
  res.json(catalogue);
});

app.post('/api/bank/sessions', (req, res) => {
  const precisionIndex = Number(req.body?.precisionIndex ?? 2);
  const ageBand = req.body?.ageBand || undefined;
  const config = {
    abilityThreshold: Number(req.body?.abilityThreshold ?? 1.0),
    precision: precisionAt(precisionIndex),
    ageBand,
    perDomainMinimum: Number(req.body?.perDomainMinimum ?? 1),
    recommendProbability: Number(req.body?.recommendProbability ?? 0.35),
    // Advisory until 2.3. An instrument claiming CogAT alignment has to ask for it, and asking is now enough:
    // the pool is filtered at construction, so selection can no longer reach an unmapped type.
    cogatAlignment: ((): 'any' | 'direct' | 'direct-or-loose' => {
      const asked = String(req.body?.cogatAlignment ?? 'any');
      return asked === 'direct' || asked === 'direct-or-loose' ? asked : 'any';
    })(),
  };
  const seed = Number(req.body?.seed ?? Math.floor(Math.random() * 1_000_000));

  // A caller may restrict the pool to certain types. Restricting here rather than at the point of
  // drawing means the engine only ever selects items that will actually be shown, so it does not spend
  // a session serving things the surface declines and then build an estimate out of unscorable
  // attempts. Unknown codes are reported rather than ignored, since a typo would otherwise silently
  // narrow the pool.
  const requested: unknown = req.body?.types;
  let pool = banks;
  if (Array.isArray(requested) && requested.length > 0) {
    const wanted = new Set(requested.map(String));
    const unknown = [...wanted].filter((t) => !banks.has(t));
    if (unknown.length > 0) {
      return res.status(400).json({ error: `unknown type codes: ${unknown.sort().join(', ')}` });
    }
    pool = new Map([...banks].filter(([typeCode]) => wanted.has(typeCode)));
  }

  const session = new QbankSession(config, pool, seed);
  if (session.poolSize === 0) {
    const scope = pool === banks ? '' : ` among the ${String(pool.size)} requested types`;
    return res
      .status(400)
      .json({ error: `no scorable bank items match age band ${ageBand ?? 'any'}${scope}` });
  }
  const id = `bank-${Date.now().toString(36)}-${Math.floor(Math.random() * 1e6).toString(36)}`;
  bankSessions.set(id, session);
  const created: CreateSessionResponse = { sessionId: id, poolSize: session.poolSize, config, state: session.state() };
  return res.json(created);
});

app.get('/api/bank/sessions/:id/next', (req, res) => {
  const session = bankSessions.get(req.params.id);
  if (!session) return res.status(404).json({ error: 'unknown bank session' });
  const finished = (): NextResponse => ({ done: true, state: session.state() });
  if (session.state().stopped) return res.json(finished());
  const serve = session.nextItem();
  if (!serve) return res.json(finished());
  // `served` has had answer, scoring and provenance removed by toServed before reaching here.
  const next: NextResponse = { done: false, ...serve, state: session.state() };
  return res.json(next);
});

app.post('/api/bank/sessions/:id/answer', (req, res) => {
  const session = bankSessions.get(req.params.id);
  if (!session) return res.status(404).json({ error: 'unknown bank session' });
  try {
    const state = session.submit(req.body?.response, Number(req.body?.latencyMs ?? 0));
    const last = session.getAttempts().at(-1);
    const answered: AnswerResponse = { state, correct: last?.correct ?? null, difficulty: last?.difficulty ?? null };
    return res.json(answered);
  } catch (err) {
    return res.status(400).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

/**
 * Practice over the banks.
 *
 * Deliberately a different object from the screener's session even though both read the same banks,
 * because the two want opposite selection rules. This one aims a little above the learner's running
 * estimate; the screener aims at a fixed threshold. Sharing an implementation would mean a flag
 * inside it deciding which of two products it was, which is how that kind of code rots.
 */
const bankPractice = new Map<string, { session: QbankSession; keyById: Map<string, string> }>();

app.post('/api/bank/practice', (req, res) => {
  const ageBand = req.body?.ageBand || undefined;
  // A high threshold would make practice serve only its hardest items, so it sits at the middle of
  // the bank scale and the session's own stretch does the targeting.
  const config = {
    abilityThreshold: 0,
    precision: precisionAt(Number(req.body?.precisionIndex ?? 3)),
    ageBand,
    perDomainMinimum: 1,
    recommendProbability: 0.5,
  };
  const seed = Number(req.body?.seed ?? Math.floor(Math.random() * 1_000_000));
  const session = new QbankSession(config, banks, seed);
  if (session.poolSize === 0) return res.status(400).json({ error: 'no markable bank items for this age band' });
  const id = `bp-${Date.now().toString(36)}-${Math.floor(Math.random() * 1e6).toString(36)}`;
  bankPractice.set(id, { session, keyById: keyIndex });
  return res.json({ sessionId: id, poolSize: session.poolSize, state: session.state() });
});

app.get('/api/bank/practice/:id/next', (req, res) => {
  const entry = bankPractice.get(req.params.id);
  if (!entry) return res.status(404).json({ error: 'unknown practice session' });
  if (entry.session.state().stopped) return res.json({ done: true, state: entry.session.state() });
  const serve = entry.session.nextItem();
  if (!serve) return res.json({ done: true, state: entry.session.state() });
  return res.json({ done: false, ...serve, state: entry.session.state() });
});

app.post('/api/bank/practice/:id/answer', (req, res) => {
  const entry = bankPractice.get(req.params.id);
  if (!entry) return res.status(404).json({ error: 'unknown practice session' });
  const itemId = String(req.body?.itemId ?? '');
  try {
    const state = entry.session.submit(req.body?.response, Number(req.body?.latencyMs ?? 0));
    const last = entry.session.getAttempts().at(-1);
    // A practice tool is allowed to reveal the key after the attempt. A screener never is, which is
    // why this endpoint exists and the screener's equivalent does not return it.
    return res.json({
      state,
      correct: last?.correct ?? null,
      correctKey: entry.keyById.get(itemId) ?? null,
      difficulty: last?.difficulty ?? null,
    });
  } catch (err) {
    return res.status(400).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

app.get('/api/bank/sessions/:id/debug', (req, res) => {
  const session = bankSessions.get(req.params.id);
  if (!session) return res.status(404).json({ error: 'unknown bank session' });
  const debug: DebugResponse = {
    ...session.debug(),
    state: session.state(),
    thresholdInBankScale: session.debug().threshold * 3 + 10.5,
  };
  return res.json(debug);
});

// --- practice: a second consumer of the same library -------------------------
//
// These routes exist to demonstrate the boundary rather than to be complete. They read the same
// snapshot the screener reads, filtered to families that declare themselves teachable, and they
// touch none of the screener's session machinery.

const practiceSessions = new Map<string, PracticeSession>();

app.get('/api/practice/available', (req, res) => {
  const ageBand = (req.query.ageBand ?? '3-5') as AgeBand;
  const config = defaultPracticeConfig(snapshotId, ageBand);
  try {
    const forPractice = library.resolveForConsumer(snapshotId, {
      ageBand,
      maxReadingLoad: config.maxReadingLoad,
      requireCalibrated: false,
      usage: 'prep',
      requireExplanation: true,
    });
    const forScreening = library.resolveForConsumer(snapshotId, {
      ageBand,
      maxReadingLoad: config.maxReadingLoad,
      requireCalibrated: false,
      usage: 'assessment',
    });
    // Both counts are returned together on purpose: the gap between them is the partition,
    // and it is the thing worth seeing rather than describing.
    return res.json({
      config,
      practice: forPractice.map((g) => ({ id: g.id, version: g.version, title: g.title, domain: g.domain, usage: g.usage })),
      screening: forScreening.map((g) => ({ id: g.id, version: g.version, title: g.title, domain: g.domain, usage: g.usage })),
      inLibrary: library.all().length,
    });
  } catch (err) {
    return res.status(400).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

app.post('/api/practice/sessions', (req, res) => {
  const ageBand = (req.body?.ageBand ?? '3-5') as AgeBand;
  const domain = req.body?.domain || undefined;
  const config = { ...defaultPracticeConfig(snapshotId, ageBand), ...(domain ? { domain } : {}) };
  const available = library.resolveForConsumer(snapshotId, {
    ageBand,
    maxReadingLoad: config.maxReadingLoad,
    requireCalibrated: false,
    usage: 'prep',
    requireExplanation: true,
  });
  if (available.length === 0) {
    return res.status(400).json({ error: 'no families in this snapshot are marked teachable for this age band' });
  }
  const id = `prac-${Date.now().toString(36)}-${Math.floor(Math.random() * 1e6).toString(36)}`;
  const seed = Number(req.body?.seed ?? Math.floor(Math.random() * 1_000_000));
  const session = new PracticeSession(config, available, seed);
  practiceSessions.set(id, session);
  return res.json({ sessionId: id, state: session.state(), availableFamilies: available.length, config });
});

app.get('/api/practice/sessions/:id/next', (req, res) => {
  const session = practiceSessions.get(req.params.id);
  if (!session) return res.status(404).json({ error: 'unknown practice session' });
  const next = session.nextItem();
  if (!next) return res.json({ done: true, state: session.state() });
  // The key is withheld here exactly as it is in the screener, and returned on submit so the
  // learner can be shown what they should have picked.
  const { correctOptionId, explanation, ...item } = next.item;
  void correctOptionId;
  void explanation;
  return res.json({ done: false, item, targetedAt: next.targetedAt, selectionReason: next.selectionReason, state: session.state() });
});

app.post('/api/practice/sessions/:id/answer', (req, res) => {
  const session = practiceSessions.get(req.params.id);
  if (!session) return res.status(404).json({ error: 'unknown practice session' });
  try {
    const out = session.submit(String(req.body?.optionId ?? ''), Number(req.body?.latencyMs ?? 0));
    return res.json(out);
  } catch (err) {
    return res.status(400).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

app.get('/api/practice/sessions/:id', (req, res) => {
  const session = practiceSessions.get(req.params.id);
  if (!session) return res.status(404).json({ error: 'unknown practice session' });
  return res.json({ state: session.state(), attempts: session.getAttempts() });
});

// --- sessions ----------------------------------------------------------------

app.post('/api/sessions', (req, res) => {
  const ageBand = (req.body?.ageBand ?? '3-5') as AgeBand;
  const surfaceId = String(req.body?.surfaceId ?? 'web-plain');
  const requestedSnapshot = String(req.body?.snapshotId ?? snapshotId);
  const surface = prototypeSurfaces.find((s) => s.id === surfaceId);
  if (!surface) return res.status(400).json({ error: `unknown surface ${surfaceId}` });

  const config = defaultScreenerConfig(requestedSnapshot, ageBand);
  let available;
  try {
    available = library.resolveForConsumer(requestedSnapshot, {
      ageBand,
      maxReadingLoad: config.maxReadingLoad,
      requireCalibrated: config.requireCalibratedItems, usage: 'assessment',
    });
  } catch (err) {
    return res.status(400).json({ error: err instanceof Error ? err.message : String(err) });
  }
  if (available.length === 0) {
    return res.status(400).json({ error: 'snapshot contains nothing servable for this age band and reading cap' });
  }

  const seed = Number(req.body?.seed ?? Math.floor(Math.random() * 1_000_000));
  const id = `sess-${Date.now().toString(36)}-${Math.floor(Math.random() * 1e6).toString(36)}`;
  const session = new ScreenerSession({ sessionId: id, config, surface, available, seed });

  const record: SessionRecord = {
    id,
    screenerConfigId: config.id,
    screenerConfigVersion: config.version,
    snapshotId: requestedSnapshot,
    surfaceId,
    ageBand,
    seed,
    startedAt: new Date().toISOString(),
    endedAt: null,
    responses: [],
    stopReason: null,
    pAbove: session.state().pAbove,
    decision: null,
    usedUncalibratedItems: false,
  };
  live.set(id, { session, record, startedAt: Date.now() });
  store.saveSession(record);

  return res.json({ sessionId: id, seed, state: session.state(), servableGenerators: available.length });
});

/**
 * Reconstruct the terminal state of a session that is no longer in flight.
 *
 * A finished session is removed from the live map, so asking it for a next item has to answer
 * "there isn't one" rather than "no such session". Returning 404 there was a real bug: it also
 * broke a page refresh after the last question, since the client could no longer read its own
 * result.
 */
function finishedState(id: string) {
  const record = store.getSession(id);
  if (!record || !record.stopReason) return null;
  return {
    stopped: true,
    stopReason: record.stopReason,
    pAbove: record.pAbove,
    decision: record.decision,
    itemsServed: record.responses.length,
    interval: [0, 0] as [number, number],
  };
}

app.get('/api/sessions/:id/next', (req, res) => {
  const entry = live.get(req.params.id);
  if (!entry) {
    const done = finishedState(req.params.id);
    if (done) return res.json({ done: true, state: done });
    return res.status(404).json({ error: 'unknown session' });
  }
  const state = entry.session.state();
  if (state.stopped) return res.json({ done: true, state });
  const next = entry.session.nextItem();
  if (!next) return res.json({ done: true, state: entry.session.state() });
  // The answer key is deliberately withheld from the client.
  const { correctOptionId, ...item } = next.item;
  void correctOptionId;
  return res.json({ done: false, item, state });
});

app.post('/api/sessions/:id/answer', (req, res) => {
  const entry = live.get(req.params.id);
  if (!entry) {
    const done = finishedState(req.params.id);
    if (done) return res.status(409).json({ error: 'this session has already finished', state: done });
    return res.status(404).json({ error: 'unknown session' });
  }
  const optionId = String(req.body?.optionId ?? '');
  const latencyMs = Number(req.body?.latencyMs ?? 0);

  let state;
  try {
    state = entry.session.submit(optionId, latencyMs);
  } catch (err) {
    return res.status(400).json({ error: err instanceof Error ? err.message : String(err) });
  }

  const updated: SessionRecord = {
    ...entry.record,
    responses: entry.session.getResponses(),
    stopReason: state.stopReason,
    pAbove: state.pAbove,
    decision: state.decision,
    usedUncalibratedItems: entry.session.usedUncalibratedItems,
    endedAt: state.stopped ? new Date().toISOString() : null,
  };
  entry.record = updated;
  store.saveSession(updated);
  if (state.stopped) live.delete(req.params.id);

  return res.json({ state, correct: entry.session.getResponses().at(-1)?.correct ?? null });
});

app.post('/api/sessions/:id/abandon', (req, res) => {
  const entry = live.get(req.params.id);
  if (!entry) return res.status(404).json({ error: 'unknown or expired session' });
  const state = entry.session.abandon();
  const updated: SessionRecord = {
    ...entry.record,
    responses: entry.session.getResponses(),
    stopReason: state.stopReason,
    pAbove: state.pAbove,
    decision: null,
    endedAt: new Date().toISOString(),
  };
  store.saveSession(updated);
  live.delete(req.params.id);
  return res.json({ state });
});

app.get('/api/sessions/:id', (req, res) => {
  const record = store.getSession(req.params.id);
  if (!record) return res.status(404).json({ error: 'unknown session' });
  return res.json(record);
});

/** Attach a real outcome. Until this is called the effectiveness statistics stay unavailable. */
app.post('/api/sessions/:id/outcome', (req, res) => {
  const clearedBar = Boolean(req.body?.clearedBar);
  const source = String(req.body?.source ?? 'manual');
  const updated = store.attachOutcome(req.params.id, {
    clearedBar,
    source,
    recordedAt: new Date().toISOString(),
  });
  if (!updated) return res.status(404).json({ error: 'unknown session' });
  return res.json(updated);
});

// --- statistics --------------------------------------------------------------

app.get('/api/stats', (_req, res) => {
  const sessions = store.allSessions();
  const surfaces = [...bySurface(sessions).entries()].map(([surfaceId, list]) => {
    const surface = prototypeSurfaces.find((s) => s.id === surfaceId);
    return {
      surfaceId,
      label: surface?.label ?? surfaceId,
      screener: screenerStats(list),
      effectiveness: effectivenessStats(list, surface?.recommendProbability ?? 0.35),
    };
  });
  res.json({
    overall: screenerStats(sessions),
    generators: generatorStats(sessions),
    surfaces,
    dataDir: store.dataDir,
  });
});

app.get('/api/config', (_req, res) => {
  res.json({
    defaultSnapshotId: snapshotId,
    surfaces: prototypeSurfaces,
    config: defaultScreenerConfig(snapshotId, '3-5'),
  });
});

app.listen(PORT, () => {
  console.log(`[api] listening on http://localhost:${PORT}`);
  console.log(`[api] ${library.all().length} generators, snapshot ${snapshotId}`);
  console.log(`[api] data in ${store.dataDir}`);
});
