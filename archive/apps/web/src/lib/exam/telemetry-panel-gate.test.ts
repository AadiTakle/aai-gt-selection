import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

/**
 * Every demo ships a researcher sidebar (`<aside id="telemetry">`) that names the
 * behavioural metrics it is harvesting — "Planful: pause before first move",
 * "Focus losses (tracked, not enforced)", "Revisited cells" — beside their live
 * values. Standalone that panel is the point: it is how a researcher reads the
 * renderer. Embedded in the child-facing screener it is a construct-validity
 * threat, because telling a child which behaviour is being measured can change
 * that behaviour, and it makes a scored assessment look like internal tooling.
 *
 * D-028: hide it while embedded unless the demo URL carries `?telemetry=1`.
 * The gate is presentational only — sampling, metric computation and the
 * `{type:'telemetry'}` postMessage stream are untouched.
 *
 * Both halves below are copied verbatim into every demo's `<head>`. A new demo
 * with a panel and no gate fails this test; so does a demo whose gate drifts.
 */

const GATE_STYLE = '<style>html[data-gt-telemetry="off"] #telemetry{display:none}</style>';
const GATE_SCRIPT =
  `(function(){var f=/(^|[?&])telemetry=1(&|$)/.test(location.search),e=true;` +
  `try{e=!!(window.parent&&window.parent!==window);}catch(_){e=true;}` +
  `if(e&&!f)document.documentElement.setAttribute('data-gt-telemetry','off');})();`;

const REPO_ROOT = join(process.cwd(), '..', '..');
const DEMO_DIRS = [
  join(process.cwd(), 'public', 'exam-demos'),
  join(REPO_ROOT, 'research', 'exam-question-types', 'demos'),
];

describe('telemetry panel gate', () => {
  for (const dir of DEMO_DIRS) {
    const label = dir.includes('public') ? 'published' : 'source';
    const files = readdirSync(dir).filter((f) => f.endsWith('.html'));

    it(`is present in every demo that has a panel (${label})`, () => {
      expect(files.length).toBeGreaterThan(0);

      let withPanel = 0;
      for (const file of files) {
        const src = readFileSync(join(dir, file), 'utf8');
        if (!src.includes('<aside id="telemetry"')) continue;
        withPanel++;

        expect(
          src.includes(GATE_STYLE),
          `${file}: ships the researcher telemetry panel with no hiding rule, so a child ` +
            'taking the scored assessment is shown the behavioural metrics being harvested. ' +
            `Copy this into <head>:\n${GATE_STYLE}`,
        ).toBe(true);

        expect(
          src.includes(GATE_SCRIPT),
          `${file}: has the hiding rule but not the guard that arms it, so the panel is ` +
            `either always visible or visible standalone too. Copy this into <head>:\n${GATE_SCRIPT}`,
        ).toBe(true);
      }

      expect(
        withPanel,
        `${label}: no demo had a telemetry panel — did the markup change?`,
      ).toBeGreaterThan(0);
    });
  }

  describe('guard behaviour', () => {
    /** Run the guard verbatim against stubbed globals; report the attribute it set. */
    function runGuard({
      search,
      parentThrows,
      embedded,
    }: {
      search: string;
      parentThrows?: boolean;
      embedded?: boolean;
    }): string | null {
      const html: Record<string, string> = {};
      const documentStub = {
        documentElement: {
          setAttribute(name: string, value: string) {
            html[name] = value;
          },
        },
      };
      const windowStub = {} as { parent: unknown };
      Object.defineProperty(windowStub, 'parent', {
        get() {
          if (parentThrows) throw new Error('cross-origin');
          return embedded ? {} : windowStub;
        },
      });

      new Function('window', 'location', 'document', GATE_SCRIPT)(
        windowStub,
        { search },
        documentStub,
      );
      return html['data-gt-telemetry'] ?? null;
    }

    it('hides the panel when embedded without the flag', () => {
      expect(runGuard({ search: '', embedded: true })).toBe('off');
      expect(runGuard({ search: '?item=3', embedded: true })).toBe('off');
    });

    it('hides the panel when the parent is cross-origin (still embedded)', () => {
      expect(runGuard({ search: '', parentThrows: true })).toBe('off');
    });

    it('shows the panel when embedded with ?telemetry=1', () => {
      expect(runGuard({ search: '?telemetry=1', embedded: true })).toBeNull();
      expect(runGuard({ search: '?item=3&telemetry=1', embedded: true })).toBeNull();
    });

    it('leaves standalone untouched', () => {
      expect(runGuard({ search: '', embedded: false })).toBeNull();
      expect(runGuard({ search: '?telemetry=1', embedded: false })).toBeNull();
    });

    it('does not accept a lookalike flag', () => {
      expect(runGuard({ search: '?telemetry=0', embedded: true })).toBe('off');
      expect(runGuard({ search: '?notelemetry=1', embedded: true })).toBe('off');
    });
  });
});
