import { existsSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { EXAM_BANK, EXAM_DOMAINS } from './bank';

describe('exam bank', () => {
  it('has 8 items, 2 per reasoning domain', () => {
    expect(EXAM_BANK).toHaveLength(8);
    for (const domain of EXAM_DOMAINS) {
      const count = EXAM_BANK.filter((item) => item.domain === domain).length;
      expect(count, `${domain} count`).toBe(2);
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

  it('has unique type codes', () => {
    const codes = new Set(EXAM_BANK.map((i) => i.typeCode));
    expect(codes.size).toBe(EXAM_BANK.length);
  });
});
