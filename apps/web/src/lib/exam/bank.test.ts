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

  it('never runs two of the same domain back to back', () => {
    for (let i = 1; i < EXAM_BANK.length; i++) {
      expect(EXAM_BANK[i]!.domain).not.toBe(EXAM_BANK[i - 1]!.domain);
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
