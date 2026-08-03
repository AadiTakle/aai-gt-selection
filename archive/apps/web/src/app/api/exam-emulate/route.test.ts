import { NextRequest } from 'next/server';
import { afterEach, describe, expect, it } from 'vitest';

import { POST } from './route';

/**
 * The emulator returns a `correct: true` verdict without anyone answering, which is exactly the
 * thing the rest of the exam is built to prevent a client from doing. These tests pin the gate
 * shut: the endpoint must be invisible unless a development build has explicitly opted in.
 */

function postRequest(body: unknown): NextRequest {
  return new NextRequest('http://127.0.0.1/api/exam-emulate', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

const original = process.env.GT_EXAM_EMULATE_ENABLED;

afterEach(() => {
  if (original === undefined) delete process.env.GT_EXAM_EMULATE_ENABLED;
  else process.env.GT_EXAM_EMULATE_ENABLED = original;
});

describe('exam-emulate gate', () => {
  it('is a 404 when the opt-in is absent, so it does not advertise itself', async () => {
    delete process.env.GT_EXAM_EMULATE_ENABLED;
    const response = await POST(postRequest({ itemId: 'anything', ability: 12 }));
    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toMatchObject({ ok: false, error: 'NOT_FOUND' });
  });

  it('is a 404 when the opt-in is set to anything other than true', async () => {
    process.env.GT_EXAM_EMULATE_ENABLED = '1';
    expect((await POST(postRequest({ itemId: 'anything', ability: 12 }))).status).toBe(404);
    process.env.GT_EXAM_EMULATE_ENABLED = 'yes';
    expect((await POST(postRequest({ itemId: 'anything', ability: 12 }))).status).toBe(404);
  });

  it('refuses the gate before it ever looks an item up', async () => {
    // A 404 for an item id that could not exist proves the gate short-circuits ahead of the bank,
    // so a disabled endpoint cannot be used to probe which item ids are real.
    delete process.env.GT_EXAM_EMULATE_ENABLED;
    const unknown = await POST(postRequest({ itemId: 'definitely-not-an-item', ability: 12 }));
    const malformed = await POST(postRequest({ nonsense: true }));
    expect(unknown.status).toBe(404);
    // Validation would be a 422; the gate must win, so this is a 404 too.
    expect(malformed.status).toBe(404);
  });
});
