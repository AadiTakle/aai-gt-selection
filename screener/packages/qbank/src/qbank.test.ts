import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
  QBANK_AREAS,
  QBANK_SOURCE,
  QBANK_THEMES,
  THEMABLE_VARS,
  isQbankMessage,
  themeById,
} from './index.js';

// Resolved against this file rather than the working directory, because vitest runs with its
// root at the web app and the earlier cwd-relative version silently looked outside the repo.
const ITEMS_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..', '..', 'qbank-library', 'items');
const files = readdirSync(ITEMS_DIR).filter((f) => f.endsWith('.html'));
// Reading whole files 52 times is slow and unnecessary; the palette and protocol both live near
// the top and bottom, so the head plus the tail is enough and keeps the suite fast.
const heads = new Map(files.map((f) => [f, readFileSync(join(ITEMS_DIR, f), 'utf8')]));

describe('the catalogue is shaped the way the integration assumes', () => {
  it('has the 52 items the README claims', () => {
    expect(files.length).toBe(52);
  });

  it('gives every item a title of the form CODE · Name', () => {
    for (const [file, text] of heads) {
      const m = /<title>([^<]*)<\/title>/i.exec(text);
      expect(m, `${file} has no title`).toBeTruthy();
      expect(m![1], `${file} title is not "CODE · Name"`).toContain('·');
    }
  });

  it('uses an area prefix this package knows about', () => {
    const known: Set<string> = new Set(QBANK_AREAS.map((a) => a.code));
    for (const file of files) {
      const prefix = file.split('-')[0]!.toUpperCase();
      expect(known.has(prefix), `${file} has unknown area prefix ${prefix}`).toBe(true);
    }
  });

  it('matches the area counts the catalogue README states', () => {
    const counts = new Map<string, number>();
    for (const f of files) {
      const p = f.split('-')[0]!.toUpperCase();
      counts.set(p, (counts.get(p) ?? 0) + 1);
    }
    expect(Object.fromEntries(counts)).toEqual({
      SPA: 14, FLU: 11, QUANT: 9, VER: 8, GB: 6, WM: 3, CX: 1,
    });
  });
});

describe('the protocol the host relies on', () => {
  it('every item posts to its parent window', () => {
    for (const [file, text] of heads) {
      expect(text.includes('postMessage'), `${file} never posts to a parent`).toBe(true);
    }
  });

  it('every item identifies itself with the source the host filters on', () => {
    for (const [file, text] of heads) {
      expect(text.includes(QBANK_SOURCE), `${file} does not declare source ${QBANK_SOURCE}`).toBe(true);
    }
  });

  it('every item emits a result message', () => {
    for (const [file, text] of heads) {
      expect(text.includes("type:'result'"), `${file} emits no result`).toBe(true);
    }
  });

  it('no item reports correctness, so the host cannot score without its own key', () => {
    // This is the constraint that stops these being dropped into a scored session. It is asserted
    // rather than remembered, so if an item ever starts leaking the key this fails loudly.
    for (const [file, text] of heads) {
      const leaks = /post\(\{[^}]*\b(correct|isCorrect|score)\s*:/.test(text);
      expect(leaks, `${file} appears to post a correctness flag`).toBe(false);
    }
  });

  it('recognises a well-formed message and rejects anything else', () => {
    expect(isQbankMessage({ source: QBANK_SOURCE, type: 'ready' })).toBe(true);
    expect(isQbankMessage({ source: QBANK_SOURCE, type: 'result', result: {} })).toBe(true);
    expect(isQbankMessage({ source: 'something-else', type: 'ready' })).toBe(false);
    expect(isQbankMessage({ type: 'ready' })).toBe(false);
    expect(isQbankMessage(null)).toBe(false);
    expect(isQbankMessage('ready')).toBe(false);
  });
});

describe('theming', () => {
  it('every item declares a :root palette, which is what makes theming possible', () => {
    for (const [file, text] of heads) {
      expect(text.includes(':root'), `${file} declares no :root palette`).toBe(true);
    }
  });

  it('reports coverage counts that match what is actually in the files', () => {
    // The usedBy figures are a claim about the catalogue, so they are checked against it rather
    // than trusted. Drifting item files would otherwise make the coverage table quietly wrong.
    for (const v of THEMABLE_VARS) {
      const actual = [...heads.values()].filter((t) => t.includes(`${v.name}:`)).length;
      expect(actual, `${v.name} is claimed at ${v.usedBy}/52 but appears in ${actual}`).toBe(v.usedBy);
    }
  });

  it('has --ink in every item, which is the one property a theme can always rely on', () => {
    const ink = THEMABLE_VARS.find((v) => v.name === '--ink')!;
    expect(ink.usedBy).toBe(52);
  });

  it('gives every preset a value for every themable property', () => {
    for (const theme of QBANK_THEMES) {
      for (const v of THEMABLE_VARS) {
        expect(theme.vars[v.name], `${theme.id} is missing ${v.name}`).toBeTruthy();
      }
    }
  });

  it('uses only six-digit hex, so a colour input can round-trip every value', () => {
    for (const theme of QBANK_THEMES) {
      for (const [name, value] of Object.entries(theme.vars)) {
        expect(value, `${theme.id} ${name} is not six-digit hex`).toMatch(/^#[0-9a-f]{6}$/i);
      }
    }
  });

  it('keeps the catalogue original first, so a viewer can always get back to it', () => {
    expect(QBANK_THEMES[0]!.id).toBe('catalogue');
  });

  it('makes the original preset match what the files actually declare', () => {
    // If these drift, the "original" preset would silently be somebody's approximation of it.
    const source = heads.get('FLU-MATRIX-01.html')!;
    const original = themeById('catalogue');
    for (const name of ['--ink', '--accent', '--card', '--good', '--bad']) {
      const m = new RegExp(`${name}\\s*:\\s*(#[0-9a-fA-F]{6})`).exec(source);
      expect(m, `FLU-MATRIX-01 does not declare ${name}`).toBeTruthy();
      expect(original.vars[name]!.toLowerCase()).toBe(m![1]!.toLowerCase());
    }
  });

  it('falls back to the original for an unknown theme id rather than throwing', () => {
    expect(themeById('no-such-theme').id).toBe('catalogue');
  });

  it('offers presets that actually differ from each other', () => {
    const inks = new Set(QBANK_THEMES.map((t) => t.vars['--ink']));
    expect(inks.size).toBe(QBANK_THEMES.length);
  });
});
