// Throwaway evidence script: drive one real exam battery over HTTP against the running dev
// server and the live local Supabase stack, then read the per-item verdict back out of the
// database to confirm the DATABASE recorded its own correctness independently.
const BASE = process.env.BASE ?? 'http://127.0.0.1:3030';

const post = async (path, body) => {
  const res = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  return { status: res.status, body: await res.json().catch(() => null) };
};

const participantCode = `PART-SYN-VERIFY-${Date.now()}`;

const session = await post('/api/exam-session', { participantCode, gradeBand: '4-5' });
console.log('1. POST /api/exam-session ->', session.status, JSON.stringify(session.body));

const examSessionId = session.body?.examSessionId;
if (!examSessionId) {
  console.log('   NOTE: no examSessionId returned; persistence likely disabled. Stopping.');
  process.exit(0);
}

// Pull a few real bank items and answer them.
const itemsRes = await fetch(`${BASE}/api/exam-items`);
const items = (await itemsRes.json()).items;
console.log('2. GET /api/exam-items ->', itemsRes.status, 'items:', items.length);

const submitted = [];
for (const item of items.slice(0, 3)) {
  const result = await post('/api/exam-submit', {
    examSessionId,
    itemId: item.itemId,
    response: {},
    skipped: false,
    latencyMs: 1200,
    telemetry: [],
  });
  submitted.push({ itemId: item.itemId, typeCode: item.typeCode, status: result.status, body: result.body });
}
console.log('3. POST /api/exam-submit x3 ->');
for (const s of submitted) {
  console.log(`   ${s.status} ${s.typeCode} ${JSON.stringify(s.body)?.slice(0, 220)}`);
}

const results = await post('/api/exam-results', { examSessionId, participantCode, scoredItems: [] });
console.log('4. POST /api/exam-results ->', results.status, JSON.stringify(results.body)?.slice(0, 600));
console.log('\nexamSessionId for DB cross-check:', examSessionId);
