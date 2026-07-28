import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

/**
 * Every demo runs in two modes. Opened directly by a researcher it bootstraps
 * its own sample items; embedded in the exam runner it renders only the item
 * the host sends in `{type:'init', item}`. Most demos hedge the embedded case
 * with a timer — "if no init arrived by 500ms, assume there is no host" — which
 * is a race, because a real host init can land later than that on a slow device
 * or a cold route.
 *
 * Losing that race is not cosmetic. The fallback
 *   1. appends "(Standalone preview: cycling bank items.)" — dev-only text — to
 *      the instruction box a child is reading during a scored assessment;
 *   2. fetches `/banks/<CODE>.jsonl`, which 404s because the raw banks must
 *      never be published (see served-boundary.test.ts, "never publishes the
 *      raw banks"); and
 *   3. starts cycling its own items alongside the host's, so the child can be
 *      answering an item the runner never served and will not score.
 *
 * An embedded demo must therefore wait indefinitely for host init. The rule
 * below: a timer that asks "did the host init me?" must also ask "am I
 * embedded?" — checking `gotInit` alone is the defect.
 */

const REPO_ROOT = join(process.cwd(), '..', '..');
const DEMO_DIRS = [
  join(process.cwd(), 'public', 'exam-demos'),
  join(REPO_ROOT, 'research', 'exam-question-types', 'demos'),
];

/** Source of every `setTimeout(...)`/`setInterval(...)` argument list in `src`. */
function timerCalls(src: string): string[] {
  const calls: string[] = [];
  const opener = /\bset(?:Timeout|Interval)\s*\(/g;
  let match: RegExpExecArray | null;
  while ((match = opener.exec(src))) {
    let depth = 1;
    let i = match.index + match[0].length;
    for (; i < src.length && depth > 0; i++) {
      if (src[i] === '(') depth++;
      else if (src[i] === ')') depth--;
    }
    calls.push(src.slice(match.index, i));
  }
  return calls;
}

describe('demo standalone fallback', () => {
  for (const dir of DEMO_DIRS) {
    const files = readdirSync(dir).filter((f) => f.endsWith('.html'));

    it(`cannot fire while embedded (${dir.includes('public') ? 'published' : 'source'})`, () => {
      expect(files.length).toBeGreaterThan(0);

      for (const file of files) {
        const src = readFileSync(join(dir, file), 'utf8');
        for (const call of timerCalls(src)) {
          if (!/\bgotInit\b/.test(call)) continue;
          expect(
            /!\s*embedded\b/.test(call),
            `${file}: a standalone fallback timer checks gotInit but not !embedded, so a ` +
              'host init arriving after the timeout leaves the child with dev-only preview ' +
              'text, a 404 fetch of the unpublished bank, and demo item cycling competing ' +
              `with host control:\n${call}`,
          ).toBe(true);
        }
      }
    });
  }
});
