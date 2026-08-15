/**
 * Draw a real bank item through a kit, as a standalone HTML page.
 *
 * Run: npm run kit:preview [TYPE-CODE] [kit.json]
 *
 * This is the end-to-end check that the format is worth anything: a real item out of the real bank,
 * abstracted, resolved through the kit, and rendered with nothing type-specific in the renderer. If a
 * matrix comes out legible here, an app can draw it from the same data.
 */

import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { dirname, join, resolve as resolvePath } from 'node:path';
import { fileURLToPath } from 'node:url';

import { abstractElement, buildManifest } from '../uispec/abstract';
import { checkKit } from './kit';
import { resolve, type Visual } from './resolve';

const HERE = dirname(fileURLToPath(import.meta.url));
const BANKS = process.env['GT_QBANK_BANKS'] ?? join(HERE, '..', '..', '..', '..', '..', 'qbank-library', 'banks');

const typeCode = process.argv[2] ?? 'FLU-MATRIX-01';
const kitPath = process.argv[3] ? resolvePath(process.argv[3]) : join(HERE, 'kits', 'pokedex.kit.json');

const { kit } = checkKit(JSON.parse(readFileSync(kitPath, 'utf8')));
if (!kit) throw new Error('kit did not load');

const file = readdirSync(BANKS).find((f) => f === `${typeCode}.jsonl`);
if (!file) throw new Error(`no bank for ${typeCode}`);
const items = readFileSync(join(BANKS, file), 'utf8')
  .split('\n')
  .filter((l) => l.trim())
  .map((l) => JSON.parse(l) as { itemId: string; typeCode: string; content: Record<string, unknown> });

const manifest = buildManifest(items.map((i) => i.content));

function elementsOf(content: Record<string, unknown>): { id: string; source: Record<string, unknown> }[] {
  const out: { id: string; source: Record<string, unknown> }[] = [];
  const grid = (content.matrix ?? content.carpet) as { cells?: unknown[][] } | undefined;
  if (grid?.cells) {
    grid.cells.forEach((row, r) => {
      if (!Array.isArray(row)) return;
      row.forEach((cell, c) => {
        if (cell !== null && typeof cell === 'object') {
          out.push({ id: `cell-${String(r)}-${String(c)}`, source: cell as Record<string, unknown> });
        }
      });
    });
  }
  const options = content.options ?? content.candidates;
  if (Array.isArray(options)) {
    options.forEach((opt, i) => {
      if (opt === null || typeof opt !== 'object') return;
      const o = opt as Record<string, unknown>;
      const inner = (o.tile ?? o.figure ?? o.picture ?? o) as Record<string, unknown>;
      out.push({ id: `option-${String(i)}`, source: inner });
    });
  }
  return out;
}

function tile(v: Visual | undefined, missing = false): string {
  if (missing) return '<div class="tile missing">?</div>';
  if (!v) return '<div class="tile"></div>';
  const sprites = Array.from({ length: v.repeat }, () =>
    v.art && v.art.startsWith('http')
      ? `<img src="${v.art}" alt="${v.label}" style="transform:rotate(${String(v.turns * 90)}deg) scale(${v.size.toFixed(2)})">`
      : `<span class="glyph">${v.label.slice(0, 2)}</span>`,
  ).join('');
  const cls = v.repeat > 4 ? 'tile many' : v.repeat > 1 ? 'tile few' : 'tile';
  return `<div class="${cls}" title="${v.label} — ${JSON.stringify(v.vars)}">${sprites}<b>${v.label}</b></div>`;
}

const shown: string[] = [];
for (const item of items.slice(0, 3)) {
  const elements = elementsOf(item.content)
    .map(({ id, source }) => abstractElement(id, source, manifest))
    .filter((e) => Object.keys(e.vars).length > 0);
  if (elements.length === 0) continue;

  const result = resolve(elements, manifest, kit, item.itemId.length);
  if (!result.ok) {
    shown.push(`<section><h2>${item.itemId}</h2><p class="no">${result.why}</p></section>`);
    continue;
  }

  const byId = new Map(result.visuals.map((v) => [v.id, v]));
  const grid = (item.content.matrix ?? item.content.carpet) as { cells?: unknown[][] } | undefined;
  const rows = grid?.cells?.length ?? 0;
  const cols = grid?.cells?.[0]?.length ?? 0;

  let gridHtml = '';
  if (rows > 0) {
    gridHtml = `<div class="grid" style="grid-template-columns:repeat(${String(cols)},1fr)">`;
    for (let r = 0; r < rows; r += 1) {
      for (let c = 0; c < cols; c += 1) {
        const cell = grid?.cells?.[r]?.[c];
        gridHtml += tile(byId.get(`cell-${String(r)}-${String(c)}`), cell === null || cell === undefined);
      }
    }
    gridHtml += '</div>';
  }

  const opts = result.visuals.filter((v) => v.id.startsWith('option-'));
  const optHtml = opts.length
    ? `<div class="opts">${opts.map((v, i) => `<div class="opt"><i>${String.fromCharCode(65 + i)}</i>${tile(v)}</div>`).join('')}</div>`
    : '';

  shown.push(
    `<section><h2>${item.itemId}</h2>
     <p class="using">variables drawn as: ${Object.entries(result.using).map(([d, f]) => `${d} = ${f}`).join(', ') || 'transforms only'}</p>
     ${gridHtml}${optHtml}</section>`,
  );
}

const html = `<!doctype html><meta charset="utf-8"><title>${typeCode} through ${kit.name}</title>
<style>
  body{margin:0;padding:28px;background:#fdf6f0;color:#123;font:15px/1.5 ui-sans-serif,system-ui,sans-serif}
  h1{font-size:19px;letter-spacing:.06em;text-transform:uppercase;color:#0b3a4a;margin:0 0 4px}
  .sub{color:#5d7580;margin:0 0 26px}
  section{background:#fff;border:1px solid #e6d8cf;border-radius:14px;padding:18px;margin-bottom:18px;
    box-shadow:0 1px 3px rgba(18,50,60,.06)}
  h2{font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:#8a6a55;margin:0 0 4px}
  .using{font-size:12px;color:#5d7580;margin:0 0 14px}
  .grid{display:inline-grid;gap:8px;padding:10px;background:#f6efe9;border-radius:10px}
  .tile{width:96px;height:96px;background:#fff;border:2px solid #e0cfc2;border-radius:10px;
    display:flex;flex-wrap:wrap;align-content:center;justify-content:center;gap:2px;position:relative}
  .tile img{width:58px;height:58px;image-rendering:auto}
  .tile.few img{width:34px;height:34px}
  .tile.many img{width:24px;height:24px}
  .tile b{position:absolute;bottom:3px;left:0;right:0;text-align:center;font-size:8.5px;font-weight:600;
    color:#8a6a55;letter-spacing:.02em}
  .tile.missing{display:grid;place-items:center;font-size:34px;color:#c9a; border-style:dashed}
  .opts{display:flex;flex-wrap:wrap;gap:10px;margin-top:16px}
  .opt{display:flex;align-items:center;gap:6px}
  .opt i{font-style:normal;font-weight:700;font-size:11px;background:#0b3a4a;color:#fdf6f0;
    width:20px;height:20px;border-radius:50%;display:grid;place-items:center}
  .no{color:#a33;font-size:13px;margin:0}
  .glyph{font-weight:700;color:#0b3a4a}
</style>
<h1>${typeCode} drawn through ${kit.name}</h1>
<p class="sub">Real bank items. Nothing in this renderer knows what ${typeCode} is — it draws whatever the kit resolved.</p>
${shown.join('\n')}
`;

const out = join(HERE, `preview-${typeCode}.html`);
writeFileSync(out, html, 'utf8');
console.log(out);
