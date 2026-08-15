import { existsSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { EXAM_BANK, EXAM_BANK_BY_CODE, EXAM_DOMAINS } from './bank';
import { EXAM_TYPE_REGISTRY } from './registry.generated';

describe('exam bank', () => {
  it('wires every type in the generated registry', () => {
    expect(EXAM_BANK).toHaveLength(EXAM_TYPE_REGISTRY.length);
    expect(new Set(EXAM_BANK.map((i) => i.typeCode))).toEqual(
      new Set(EXAM_TYPE_REGISTRY.map((t) => t.typeCode)),
    );
  });

  it('covers all four reasoning domains', () => {
    for (const domain of EXAM_DOMAINS) {
      const count = EXAM_BANK.filter((item) => item.domain === domain).length;
      // A domain with no wired type makes the engine's even-spread stop rule
      // unsatisfiable — the battery would run to the hard item cap every time.
      expect(count, `${domain} wired type count`).toBeGreaterThan(0);
    }
  });

  it('only repeats a domain back to back once no other domain is left to place', () => {
    // Strict alternation is impossible once the domains are unbalanced: with 11
    // quantitative types out of 33, the largest domain must eventually double up.
    // What the interleave still owes us is that it never doubles up *early* —
    // a repeat is only allowed when every other domain is exhausted from that
    // point on. (Ordering here is a fallback anyway: the engine picks the next
    // type adaptively, so this guards the shape of the pool, not the battery.)
    const remaining = new Map<string, number>();
    for (const item of EXAM_BANK) {
      remaining.set(item.domain, (remaining.get(item.domain) ?? 0) + 1);
    }
    for (let i = 0; i < EXAM_BANK.length; i++) {
      const domain = EXAM_BANK[i]!.domain;
      remaining.set(domain, remaining.get(domain)! - 1);
      if (i === 0 || EXAM_BANK[i - 1]!.domain !== domain) continue;
      const alternativesLeft = [...remaining.entries()]
        .filter(([d, n]) => d !== domain && n > 0)
        .map(([d, n]) => `${d}=${n}`);
      expect(
        alternativesLeft,
        `${domain} repeats at index ${i} while other domains still have types to place`,
      ).toEqual([]);
    }
  });

  it('points every item at a demo file that exists under public/', () => {
    const publicDir = join(process.cwd(), 'public');
    for (const item of EXAM_BANK) {
      expect(item.demoPath.startsWith('/exam-demos/')).toBe(true);
      const filePath = join(publicDir, item.demoPath);
      expect(existsSync(filePath), `${item.typeCode} demo file`).toBe(true);
    }
  });

  it('has unique type codes and a lookup entry for each', () => {
    const codes = new Set(EXAM_BANK.map((i) => i.typeCode));
    expect(codes.size).toBe(EXAM_BANK.length);
    for (const code of codes) expect(EXAM_BANK_BY_CODE.get(code)?.typeCode).toBe(code);
  });

  it('gives every wired type a title and a blurb', () => {
    for (const item of EXAM_BANK) {
      expect(item.title.length, `${item.typeCode} title`).toBeGreaterThan(0);
      expect(item.blurb.length, `${item.typeCode} blurb`).toBeGreaterThan(0);
    }
  });
});
