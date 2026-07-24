import type { MetricMap } from './types';

/**
 * Harvest results from a self-contained question demo by reading its DOM.
 *
 * Aadi's demos expose no window globals or postMessage hook — they render live
 * metrics into `#mlist` (rows of `.mid` label + `.mval` value) and flip
 * `#phasecue[data-phase]` to `"done"` when the scored items finish. Because the
 * demos are same-origin (served from our own `/exam-demos/`), the parent frame
 * can read that DOM directly. We do not modify the demo files.
 */

/** True once the demo has reached its scored-complete phase. */
export function isDemoDone(doc: Document): boolean {
  const cue = doc.querySelector('#phasecue');
  return cue?.getAttribute('data-phase') === 'done';
}

/** Parse "4/6  67%" / "L5 · 3 rules" / "820 ms (mean 910)" → a leading number. */
function parseLeadingNumber(raw: string): number | null {
  const match = raw.match(/-?\d+(?:\.\d+)?/);
  return match ? Number(match[0]) : null;
}

/** Read every `M-*` metric row the demo currently shows. */
export function readMetrics(doc: Document): MetricMap {
  const metrics: MetricMap = {};
  const rows = doc.querySelectorAll('#mlist .mrow');
  rows.forEach((row) => {
    const id = row.querySelector('.mid')?.textContent?.trim();
    const value = row.querySelector('.mval')?.textContent?.trim();
    if (!id || !value) return;
    metrics[id] = value;
    const num = parseLeadingNumber(value);
    if (num != null) metrics[`${id}_num`] = num;
  });
  return metrics;
}

/** Accuracy 0..1 from M-ACC ("4/6  67%") — prefer the fraction, fall back to %. */
export function accuracyFrom(metrics: MetricMap): number | null {
  const raw = metrics['M-ACC'];
  if (typeof raw !== 'string') return null;
  const frac = raw.match(/(\d+)\s*\/\s*(\d+)/);
  if (frac) {
    const denom = Number(frac[2]);
    return denom > 0 ? Number(frac[1]) / denom : null;
  }
  const pct = raw.match(/(\d+(?:\.\d+)?)\s*%/);
  return pct ? Number(pct[1]) / 100 : null;
}

/** Max difficulty level from M-DIFFREACH ("L5 · 3 rules") → 5. */
export function difficultyFrom(metrics: MetricMap): number | null {
  const raw = metrics['M-DIFFREACH'];
  if (typeof raw !== 'string') return null;
  const lvl = raw.match(/L\s*(\d+)/i);
  if (lvl) return Number(lvl[1]);
  const num = raw.match(/-?\d+(?:\.\d+)?/);
  return num ? Number(num[0]) : null;
}
