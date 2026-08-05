/**
 * Browser-safe entry point.
 *
 * The bank loader reads 19 MB off disk and the adaptive session depends on it, so both live behind
 * `@gt/qbank/server` instead. Re-exporting them here bundled `node:fs` into the web build, which is
 * how that boundary got discovered.
 */
/**
 * The playable question catalogue, as a source the app can serve and theme.
 *
 * These 52 items are self-contained HTML pages rather than generators, so they sit alongside the
 * generator library rather than inside it. Two facts about them make integration cheap, and both
 * were already true before this module existed:
 *
 *   1. Every item posts `{source:'gt-exam-demo', type:'ready'|'telemetry'|'result'}` to its
 *      parent window, so a host can observe a session without modifying the item.
 *   2. Every item declares its palette as CSS custom properties on `:root`, so a same-origin host
 *      can re-skin it by setting those properties on the iframe's document. No item file is
 *      edited, and the change is reversible by clearing the properties.
 *
 * One thing they deliberately do not do: report whether an answer was correct. The comment in the
 * items themselves is "NEUTRAL acknowledgment only — never correct/incorrect." So a host can read
 * the response and the metrics but cannot score without its own answer key, and this module does
 * not pretend otherwise.
 */

export const QBANK_SOURCE = 'gt-exam-demo';
export const QBANK_HOST = 'gt-exam-host';

export const QBANK_AREAS = [
  { code: 'VER', label: 'Verbal reasoning', blurb: 'Meaning, relations between words, sense-making in language.' },
  { code: 'QUANT', label: 'Quantitative reasoning', blurb: 'Number sense, rules and relationships. Several need no reading.' },
  { code: 'SPA', label: 'Spatial reasoning', blurb: 'Mental rotation, folding, perspective, cross-sections. No reading.' },
  { code: 'FLU', label: 'Fluid reasoning', blurb: 'Working out a rule that was never taught, then applying it.' },
  { code: 'GB', label: 'Interactive tasks', blurb: 'Longer tasks where the process is observed, not just the answer.' },
  { code: 'WM', label: 'Working memory', blurb: 'How much a child can hold and manipulate at once.' },
  { code: 'CX', label: 'Consistency check', blurb: 'Serves the same problem twice to test whether an answer was stable.' },
] as const;

export type QbankAreaCode = (typeof QBANK_AREAS)[number]['code'];

export interface QbankItem {
  /** File name under the catalogue directory. */
  readonly file: string;
  /** The item's own code, e.g. FLU-MATRIX-01. */
  readonly code: string;
  readonly name: string;
  readonly area: QbankAreaCode | 'OTHER';
  /** True when the item declares no reading requirement, from its area rather than from parsing. */
  readonly readingFree: boolean;
}

/** Messages the catalogue items send to their host. Names are the items', not ours. */
export type QbankMessage =
  | { source: typeof QBANK_SOURCE; type: 'ready' }
  | { source: typeof QBANK_SOURCE; type: 'telemetry'; [k: string]: unknown }
  | {
      source: typeof QBANK_SOURCE;
      type: 'result';
      result: {
        itemId?: string;
        typeCode?: string;
        domain?: string;
        response?: unknown;
        /** Response time, first-action latency, revisions, focus losses, rapid-guess flag. */
        metrics?: Record<string, unknown>;
        telemetry?: unknown[];
      };
    };

export function isQbankMessage(data: unknown): data is QbankMessage {
  return (
    typeof data === 'object' &&
    data !== null &&
    (data as { source?: unknown }).source === QBANK_SOURCE &&
    typeof (data as { type?: unknown }).type === 'string'
  );
}

// ---------------------------------------------------------------------------
// Theming
// ---------------------------------------------------------------------------

/**
 * The palette an item exposes.
 *
 * These names are read off the catalogue rather than invented. Coverage is uneven and worth being
 * honest about: `--ink` appears in all 52 items, `--good` in 47, `--accent` in 39, `--card` in 38,
 * the two background stops in 35, and the telemetry panel's four in 31. A theme therefore re-skins
 * most of the catalogue and not every corner of it, and a few items carry extra one-off colours
 * that no global theme will reach.
 */
export interface QbankTheme {
  readonly id: string;
  readonly label: string;
  readonly description: string;
  readonly vars: Readonly<Record<string, string>>;
}

/** Every property a theme may set, with the count of items that use it. Ordered by coverage. */
export const THEMABLE_VARS: readonly { name: string; usedBy: number; role: string }[] = [
  { name: '--ink', usedBy: 52, role: 'Body text' },
  { name: '--good', usedBy: 47, role: 'Positive acknowledgement' },
  { name: '--accent', usedBy: 39, role: 'Primary accent' },
  { name: '--card', usedBy: 38, role: 'Card surface' },
  { name: '--bg1', usedBy: 35, role: 'Background gradient, first stop' },
  { name: '--bg2', usedBy: 35, role: 'Background gradient, second stop' },
  { name: '--tel-bg', usedBy: 31, role: 'Telemetry panel background' },
  { name: '--tel-ink', usedBy: 31, role: 'Telemetry panel text' },
  { name: '--tel-key', usedBy: 31, role: 'Telemetry panel key colour' },
  { name: '--tel-dim', usedBy: 31, role: 'Telemetry panel dimmed text' },
  { name: '--bad', usedBy: 25, role: 'Negative acknowledgement' },
  { name: '--socket', usedBy: 10, role: 'Empty-slot outline' },
  { name: '--paper', usedBy: 9, role: 'Paper surface' },
  { name: '--line', usedBy: 8, role: 'Rules and dividers' },
];

/**
 * Presets.
 *
 * The first is the catalogue's own palette, kept so a viewer can always get back to what the
 * authors drew. The rest exist because a demo audience reads visual identity as a claim about what
 * the product is, and the brand constraint on this work is explicit that it must not look like a
 * game. So there is a deliberately sober option and a deliberately warm one, and switching between
 * them in front of someone is the fastest way to show the questions are not welded to a look.
 */
export const QBANK_THEMES: readonly QbankTheme[] = [
  {
    id: 'catalogue',
    label: 'Catalogue original',
    description: "The palette the items were drawn in. Warm, high contrast, unbranded.",
    vars: {
      '--ink': '#001117',
      '--good': '#146c43',
      '--accent': '#004f71',
      '--card': '#ffffff',
      '--bg1': '#fcf4ef',
      '--bg2': '#f8e8de',
      '--tel-bg': '#002a3a',
      '--tel-ink': '#f5ddcd',
      '--tel-key': '#ebba9b',
      '--tel-dim': '#e48b53',
      '--bad': '#a4442f',
      '--socket': '#ebba9b',
      '--paper': '#fffdf9',
      '--line': '#ecd9cb',
    },
  },
  {
    id: 'institutional',
    label: 'Institutional',
    description: 'Cool, restrained, closest to an examination paper. The default for anything a parent sees.',
    vars: {
      '--ink': '#141a21',
      '--good': '#1f6b45',
      '--accent': '#2c5f8a',
      '--card': '#ffffff',
      '--bg1': '#f7f9fb',
      '--bg2': '#eaeff5',
      '--tel-bg': '#1b2733',
      '--tel-ink': '#e7edf3',
      '--tel-key': '#8fb4d4',
      '--tel-dim': '#7d8fa1',
      '--bad': '#9c3535',
      '--socket': '#c3d3e2',
      '--paper': '#fdfefe',
      '--line': '#dde5ee',
    },
  },
  {
    id: 'ink',
    label: 'Ink on paper',
    description: 'Near-monochrome. Useful when the question is the subject and colour is a distraction.',
    vars: {
      '--ink': '#14161a',
      '--good': '#2f5d3a',
      '--accent': '#3a3f47',
      '--card': '#ffffff',
      '--bg1': '#f6f6f4',
      '--bg2': '#ecebe7',
      '--tel-bg': '#22242a',
      '--tel-ink': '#eeeeec',
      '--tel-key': '#a9adb5',
      '--tel-dim': '#84888f',
      '--bad': '#7d3a34',
      '--socket': '#cfcec9',
      '--paper': '#fbfbf9',
      '--line': '#dedcd6',
    },
  },
  {
    id: 'evening',
    label: 'Evening',
    description: 'Dark surfaces. Included to prove the palette is not assumed light, not because a child should use it.',
    vars: {
      '--ink': '#e8eef4',
      '--good': '#4bbd85',
      '--accent': '#6fa8d6',
      '--card': '#1c232c',
      '--bg1': '#12171d',
      '--bg2': '#1a222b',
      '--tel-bg': '#0c1116',
      '--tel-ink': '#dbe5ee',
      '--tel-key': '#7fb6dd',
      '--tel-dim': '#8593a1',
      '--bad': '#e08278',
      '--socket': '#3b4655',
      '--paper': '#212a34',
      '--line': '#2e3946',
    },
  },
];

export function themeById(id: string): QbankTheme {
  return QBANK_THEMES.find((t) => t.id === id) ?? (QBANK_THEMES[0] as QbankTheme);
}

/**
 * Apply a palette to an embedded item.
 *
 * Sets the properties on the iframe's own document element, which wins over the item's `:root`
 * block by specificity without touching the file. Returns false when the document is unreachable,
 * which happens if the catalogue is ever served cross-origin, and the caller should treat that as
 * theming being unavailable rather than as an error.
 */
export function applyThemeToFrame(
  frame: HTMLIFrameElement | null,
  vars: Readonly<Record<string, string>>,
): boolean {
  const doc = frame?.contentDocument;
  if (!doc?.documentElement) return false;
  for (const [name, value] of Object.entries(vars)) {
    doc.documentElement.style.setProperty(name, value);
  }
  return true;
}

/** Which of a theme's properties this particular item actually declares, so coverage is visible. */
export function themeCoverage(
  frame: HTMLIFrameElement | null,
  vars: Readonly<Record<string, string>>,
): { applied: string[]; unused: string[] } | null {
  const doc = frame?.contentDocument;
  if (!doc?.documentElement) return null;
  // Read the item's own computed value before the override took effect by checking the stylesheet
  // text, which is cheaper and more reliable than trying to diff computed styles.
  const css = [...doc.styleSheets]
    .flatMap((sheet) => {
      try {
        return [...sheet.cssRules].map((r) => r.cssText);
      } catch {
        return [];
      }
    })
    .join('\n');
  const applied: string[] = [];
  const unused: string[] = [];
  for (const name of Object.keys(vars)) {
    (css.includes(`${name}:`) ? applied : unused).push(name);
  }
  return { applied, unused };
}
