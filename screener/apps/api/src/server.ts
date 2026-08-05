import express from 'express';
import type { AgeBand, SessionRecord } from '@gt/contracts';
import { createSeededLibrary, validateGenerator } from '@gt/item-library';
import { ScreenerSession, defaultScreenerConfig, prototypeSurfaces } from '@gt/engine';
import { bySurface, effectivenessStats, generatorStats, screenerStats } from '@gt/stats';
import { PracticeSession, defaultPracticeConfig } from '@gt/practice';
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

// --- library -----------------------------------------------------------------

app.get('/api/library', (_req, res) => {
  res.json({
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
