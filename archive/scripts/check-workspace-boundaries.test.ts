import { describe, expect, it } from 'vitest';

import { findBoundaryViolations, moduleSpecifiers } from './check-workspace-boundaries';

/**
 * The pair that matters. A check that only asserted the second half would pass just as well
 * against the substring search this replaced, which flagged any file that so much as named the
 * forbidden path — including the comments explaining why the boundary exists.
 */
describe('workspace dependency boundaries', () => {
  it('ignores a comment, JSDoc block or string that merely names the web app', () => {
    const source = [
      "// This package is consumed by apps/web; it must never import from 'apps/web' itself.",
      "/* Nor may it require('@gt-selection/web') — that edge would be a cycle. */",
      "/** See apps/web/src/lib/exam for the caller, and import('apps/web/...') for the anti-pattern. */",
      "const documentedPath = 'apps/web/public/exam-demos';",
      "import { z } from 'zod';",
      'export const note = documentedPath;',
    ].join('\n');

    expect(findBoundaryViolations('packages/contracts/src/notes.ts', source)).toEqual([]);
  });

  it.each([
    ["import { app } from '@gt-selection/web';", '@gt-selection/web'],
    ["export { app } from '@gt-selection/web';", '@gt-selection/web'],
    ["const app = require('../../apps/web/src/lib/env');", '../../apps/web/src/lib/env'],
    ["const app = await import('apps/web/src/lib/exam/bank');", 'apps/web/src/lib/exam/bank'],
  ])('flags a real dependency on the web app: %s', (source, specifier) => {
    expect(findBoundaryViolations('packages/exam-engine/src/index.ts', source)).toEqual([
      `packages/exam-engine/src/index.ts imports ${specifier}`,
    ]);
  });

  it('flags a Supabase import from contracts but not from another package', () => {
    const source = "import { createClient } from '@supabase/supabase-js';";

    expect(findBoundaryViolations('packages/contracts/src/client.ts', source)).toEqual([
      'packages/contracts/src/client.ts imports @supabase/supabase-js (contracts may not import Supabase)',
    ]);
    expect(findBoundaryViolations('packages/exam-scoring/src/client.ts', source)).toEqual([]);
  });

  it('does not mistake an unrelated path segment for the web app', () => {
    // `apps/website` and `@gt-selection/web-utils` are not `apps/web`.
    const source = [
      "import a from 'apps/website/thing';",
      "import b from '@gt-selection/web-utils';",
    ].join('\n');

    expect(findBoundaryViolations('packages/contracts/src/index.ts', source)).toEqual([]);
  });

  it('reads specifiers from every import form the check relies on', () => {
    const source = [
      "import a from './a';",
      "export { b } from './b';",
      "const c = require('./c');",
      "const d = import('./d');",
    ].join('\n');

    expect(moduleSpecifiers(source)).toEqual(['./a', './b', './c', './d']);
  });
});
