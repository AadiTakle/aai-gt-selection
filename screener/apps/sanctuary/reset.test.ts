import { beforeEach, describe, expect, it, vi } from 'vitest';

import { resetIfAsked } from './reset';

/**
 * A reset that misses one key is worse than no reset at all: the game looks new and behaves as though
 * it is not, and the person who typed the URL has no reason to suspect it. So the two things worth
 * testing are that it clears EVERYTHING it should, and NOTHING it should not.
 */

const store = new Map<string, string>();

beforeEach(() => {
  store.clear();
  vi.stubGlobal('localStorage', {
    get length() {
      return store.size;
    },
    key: (i: number) => [...store.keys()][i] ?? null,
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => void store.set(k, v),
    removeItem: (k: string) => void store.delete(k),
  });
  vi.stubGlobal('window', {
    location: { href: 'http://127.0.0.1:5230/?reset=1', search: '?reset=1' },
    history: { replaceState: vi.fn() },
  });
});

/** Every key the app writes, taken from the files that own them. */
const OWNED = [
  'gt-sanctuary:world',
  'gt-sanctuary:keeperId',
  'gt-sanctuary:coins',
  'gt-sanctuary:intro',
  'gt-sanctuary:board',
  'gt-sanctuary:muted',
];

describe('starting Bramblebrook over', () => {
  it('does nothing at all without the flag', () => {
    for (const k of OWNED) store.set(k, 'x');
    expect(resetIfAsked('')).toEqual([]);
    expect(store.size).toBe(OWNED.length);
  });

  it('clears every key the app owns', () => {
    for (const k of OWNED) store.set(k, 'x');
    const cleared = resetIfAsked('?reset=1');
    expect(cleared.sort()).toEqual([...OWNED].sort());
    expect(store.size).toBe(0);
  });

  it('clears the keeper id, which is what actually resets difficulty', () => {
    /* The ability estimate is NOT in the browser — it is server-side in keepers.jsonl, keyed by this
       id, along with every item already served. Leave it and the ranch looks new while the questions
       are still steered by the old posterior and still excluding items as already-seen. */
    store.set('gt-sanctuary:keeperId', 'k-abc123');
    resetIfAsked('?reset=1');
    expect(store.has('gt-sanctuary:keeperId')).toBe(false);
  });

  it('leaves other applications alone', () => {
    store.set('gt-loop-a:thing', 'keep');
    store.set('unrelated', 'keep');
    store.set('gt-sanctuary:coins', 'go');
    resetIfAsked('?reset=1');
    expect([...store.keys()].sort()).toEqual(['gt-loop-a:thing', 'unrelated']);
  });

  it('removes every key rather than every other one', () => {
    /* The bug this exists for: removing while iterating `localStorage.key(i)` re-indexes the store
       underneath the loop, so a naive single pass clears exactly half. */
    for (let i = 0; i < 10; i++) store.set(`gt-sanctuary:k${i}`, 'x');
    expect(resetIfAsked('?reset=1')).toHaveLength(10);
    expect(store.size).toBe(0);
  });

  it('strips the flag so a refresh does not wipe the ranch again', () => {
    resetIfAsked('?reset=1');
    const replace = (window as unknown as { history: { replaceState: ReturnType<typeof vi.fn> } }).history
      .replaceState;
    expect(replace).toHaveBeenCalledOnce();
    expect(String(replace.mock.calls[0]?.[2] ?? '')).not.toContain('reset');
  });

  it('still boots when localStorage throws', () => {
    /* Private browsing. Nothing was ever stored, so nothing needs clearing — but an exception here
       would stop the game mounting at all, which is a far worse outcome than a missed reset. */
    vi.stubGlobal('localStorage', {
      get length(): number {
        throw new Error('denied');
      },
    });
    expect(() => resetIfAsked('?reset=1')).not.toThrow();
  });
});
