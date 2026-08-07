/**
 * Reviewer comments, held in the browser and exported by hand.
 *
 * The storage key is deliberately the SAME one the original harness used (`gt-type-review-v1`), so a
 * reviewer who has comments sitting in that browser from the old tool opens this one and finds their
 * work already there. Changing the key would have quietly orphaned it.
 *
 * Export writes both Markdown and JSON, because the two do different jobs: the Markdown is what gets
 * read and pasted into a thread, and the JSON is what can be imported back to continue.
 */

import { CATS, type ReviewType, type Store, type TypeComments } from './types';

const LS_KEY = 'gt-type-review-v1';

export function loadStore(): Store {
  try {
    return (JSON.parse(localStorage.getItem(LS_KEY) ?? 'null') as Store) ?? {};
  } catch {
    return {};
  }
}

export function saveStore(store: Store): void {
  localStorage.setItem(LS_KEY, JSON.stringify(store));
}

export function hasComments(store: Store, id: string): boolean {
  const c = store[id];
  if (!c) return false;
  return CATS.some((cat) => String(c[cat.key] ?? '').trim() !== '');
}

export function hasRange(store: Store, id: string): boolean {
  const r = store[id]?.diffRange;
  return !!r && (r.min != null || r.max != null);
}

export function rangeText(store: Store, id: string): string {
  const r = store[id]?.diffRange;
  if (!r || (r.min == null && r.max == null)) return '';
  return `${r.min == null ? '?' : r.min}–${r.max == null ? '?' : r.max} of 1–20`;
}

function download(name: string, text: string, type: string): void {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([text], { type }));
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
}

/**
 * Emit the same Markdown shape the original produced, so an export from this tool and an export from
 * the old one can sit in the same document without the reader noticing a seam.
 */
export function exportReview(data: readonly ReviewType[], store: Store): void {
  const stamp = new Date().toISOString().slice(0, 16).replace('T', ' ');
  const withC = data.filter((d) => hasComments(store, d.type_id) || hasRange(store, d.type_id));
  let md = `# GT Question-Type Review — comments\n\n_${String(withC.length)} of ${String(data.length)} types reviewed · exported ${stamp}_\n\n`;
  let curDom: string | null = null;

  for (const d of withC) {
    if (d.domain !== curDom) {
      md += `\n## Domain: ${d.domain}\n`;
      curDom = d.domain;
    }
    const c: TypeComments = store[d.type_id] ?? {};
    md += `\n### ${d.type_id} — ${d.name}  (${d.stage})\n`;
    const rt = rangeText(store, d.type_id);
    if (rt) md += `- **Intended difficulty range:** ${rt}\n`;
    for (const cat of CATS) {
      const v = String(c[cat.key] ?? '').trim();
      if (v) md += `- **${cat.label.replace(/^\d+ · /, '')}:** ${v}\n`;
    }
  }

  download('gt-type-review.md', md, 'text/markdown');
  download('gt-type-review.json', JSON.stringify(store, null, 2), 'application/json');
}

/** Merge an imported file into what is already here rather than replacing it, so nothing is lost. */
export function importReview(file: File, onDone: (merged: Store) => void): void {
  const r = new FileReader();
  r.onload = () => {
    try {
      const obj = JSON.parse(String(r.result)) as Store;
      const store = loadStore();
      for (const id of Object.keys(obj)) {
        store[id] = Object.assign(store[id] ?? {}, obj[id]);
      }
      saveStore(store);
      onDone(store);
    } catch {
      alert('Could not parse that JSON.');
    }
  };
  r.readAsText(file);
}
