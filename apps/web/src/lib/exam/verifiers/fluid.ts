import type { RawBankItem } from '../bank-loader';
import type { Verdict, Verifier } from './types';

/**
 * Per-type verifiers for the fluid domain, keyed by `typeCode`.
 *
 * Each entry grades a constructed response that no generic verifier can handle.
 * Re-derive the expected response from `item.content` plus `item.answer` where
 * possible, rather than trusting a stored key, and never show correctness to the
 * client beyond the boolean this returns.
 *
 * Every verifier below re-derives the expected response with the same solver the
 * type's generator checker (`research/exam-question-types/generators/check-<CODE>.mjs`)
 * uses to validate the bank, and only falls back to the stored key when that
 * derivation is not uniquely determined. The stored key is then a cross-check,
 * not the source of truth.
 *
 * Metric conventions (the submit route merges these over its own defaults):
 *   - `M-POLY`  proportion of the item's scorable parts that are right, 0..1.
 *   - `M-ERRTYPE` 0..1, higher is better, matching the route's error-quality
 *     direction; emitted only where the bank itself defines the components.
 *   - `M-RULEID` count of co-acting rules bound at once, emitted only on a fully
 *     correct response (the scorer's range is 1..4).
 *   - `M-HYP` 0..1 mean reduction of the viable-rule space per test.
 *
 * Types deliberately absent from this record:
 *   - `CX-diverge-01` and `CX-figural-01` are divergent-production banks
 *     (`answer.correctKey === null`, `scoring.mode = 'model_judge_deferred'`).
 *     No response is wrong, and the quality dimensions they declare (`M-ORIG`,
 *     `M-FLEX`) need a per-prompt norm bank and a semantic clusterer that do not
 *     exist (E-093). Any correctness rule here would be fiction, so there is
 *     none.
 */

/* ------------------------------------------------------------------ *
 * shared readers — every one returns null rather than throwing
 * ------------------------------------------------------------------ */

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function asArray(value: unknown): unknown[] | null {
  return Array.isArray(value) ? value : null;
}

function asString(value: unknown): string | null {
  return typeof value === 'string' ? value : null;
}

function asInt(value: unknown): number | null {
  return typeof value === 'number' && Number.isInteger(value) ? value : null;
}

function asFiniteNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function proportion(hits: number, total: number): number {
  return total > 0 ? hits / total : 0;
}

/* ================================================================== *
 * FLU-GRIDCOPY-01 — copy the demonstrated transform onto a probe grid
 *
 * The child edits a copy of `content.probeInput` until it shows what the rule
 * demonstrated by `content.examples` would produce. Correctness is exact grid
 * equality against the transform re-derived from the worked examples: search the
 * documented op space for every program consistent with all examples; when they
 * all predict the same probe output that output IS the key.
 * ================================================================== */

type GridOp =
  | { op: 'shift'; dx: number; dy: number }
  | { op: 'reflectH' }
  | { op: 'reflectV' }
  | { op: 'rot180' }
  | { op: 'recolor'; from: number; to: number }
  | { op: 'shiftColor'; color: number; dx: number; dy: number };

type Grid = number[][];

function readGrid(value: unknown): Grid | null {
  const rows = asArray(value);
  if (!rows || rows.length === 0) return null;
  const out: Grid = [];
  for (const row of rows) {
    const cells = asArray(row);
    if (!cells || cells.length === 0) return null;
    const line: number[] = [];
    for (const cell of cells) {
      const n = asInt(cell);
      if (n === null || n < 0) return null;
      line.push(n);
    }
    const first = out[0];
    if (first && line.length !== first.length) return null;
    out.push(line);
  }
  return out;
}

/** `"000/001/000"` — the serialisation the bank uses for `answer.correctKey`. */
function serializeGrid(grid: Grid): string {
  return grid.map((row) => row.join('')).join('/');
}

function applyGridOp(grid: Grid, op: GridOp): Grid {
  const rows = grid.length;
  const cols = grid[0]?.length ?? 0;
  const next: Grid = Array.from({ length: rows }, () => Array.from({ length: cols }, () => 0));
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const here = grid[r]?.[c] ?? 0;
      switch (op.op) {
        case 'shift': {
          const sr = r - op.dy;
          const sc = c - op.dx;
          const inside = sr >= 0 && sr < rows && sc >= 0 && sc < cols;
          next[r]![c] = inside ? (grid[sr]?.[sc] ?? 0) : 0;
          break;
        }
        case 'reflectH':
          next[r]![c] = grid[r]?.[cols - 1 - c] ?? 0;
          break;
        case 'reflectV':
          next[r]![c] = grid[rows - 1 - r]?.[c] ?? 0;
          break;
        case 'rot180':
          next[r]![c] = grid[rows - 1 - r]?.[cols - 1 - c] ?? 0;
          break;
        case 'recolor':
          next[r]![c] = here === op.from ? op.to : here;
          break;
        case 'shiftColor':
          // The chosen colour leaves its cell here and is re-placed below.
          next[r]![c] = here === op.color ? 0 : here;
          break;
      }
    }
  }
  if (op.op === 'shiftColor') {
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if ((grid[r]?.[c] ?? 0) !== op.color) continue;
        const tr = r + op.dy;
        const tc = c + op.dx;
        if (tr >= 0 && tr < rows && tc >= 0 && tc < cols) next[tr]![tc] = op.color;
      }
    }
  }
  return next;
}

const runProgram = (grid: Grid, program: readonly GridOp[]): Grid =>
  program.reduce<Grid>((acc, op) => applyGridOp(acc, op), grid);

const gridProgramSpaceCache = new Map<number, GridOp[][]>();

/** Every single op plus every ordered two-step composition, per the op grammar. */
function gridProgramSpace(paletteSize: number): GridOp[][] {
  const cached = gridProgramSpaceCache.get(paletteSize);
  if (cached) return cached;

  const single: GridOp[] = [];
  for (const dx of [-1, 0, 1]) {
    for (const dy of [-1, 0, 1]) if (dx || dy) single.push({ op: 'shift', dx, dy });
  }
  single.push({ op: 'reflectH' }, { op: 'reflectV' }, { op: 'rot180' });
  for (let a = 1; a <= paletteSize; a++) {
    for (let b = 1; b <= paletteSize; b++)
      if (a !== b) single.push({ op: 'recolor', from: a, to: b });
  }
  for (let color = 1; color <= paletteSize; color++) {
    for (const [dx, dy] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ] as const) {
      single.push({ op: 'shiftColor', color, dx, dy });
    }
  }

  const programs: GridOp[][] = single.map((op) => [op]);
  for (const a of single) for (const b of single) programs.push([a, b]);
  gridProgramSpaceCache.set(paletteSize, programs);
  return programs;
}

/** The probe output every example-consistent program agrees on, or null. */
function deriveGridTarget(content: Record<string, unknown>): Grid | null {
  const probeInput = readGrid(content.probeInput);
  const rawExamples = asArray(content.examples);
  const paletteSize = asInt(content.paletteSize);
  if (!probeInput || !rawExamples || rawExamples.length === 0 || paletteSize === null) return null;

  const examples: { input: Grid; output: Grid }[] = [];
  for (const raw of rawExamples) {
    const example = asRecord(raw);
    const input = readGrid(example?.input);
    const output = readGrid(example?.output);
    if (!input || !output) return null;
    examples.push({ input, output });
  }

  const predicted = new Map<string, Grid>();
  for (const program of gridProgramSpace(paletteSize)) {
    if (
      !examples.every(
        (ex) => serializeGrid(runProgram(ex.input, program)) === serializeGrid(ex.output),
      )
    ) {
      continue;
    }
    const out = runProgram(probeInput, program);
    predicted.set(serializeGrid(out), out);
    if (predicted.size > 1) return null; // examples do not identify one answer
  }
  return predicted.size === 1 ? [...predicted.values()][0]! : null;
}

function verifyGridCopy(item: RawBankItem, response: Record<string, unknown>): Verdict {
  const target = deriveGridTarget(item.content) ?? readGrid(item.answer.targetGrid);
  if (!target) return { correct: false };

  const submitted =
    readGrid(response.finalGrid) ??
    (() => {
      const key = asString(response.finalGridKey);
      if (key === null) return null;
      return readGrid(key.split('/').map((row) => [...row].map((ch) => Number.parseInt(ch, 10))));
    })();
  if (!submitted) return { correct: false };
  if (submitted.length !== target.length) return { correct: false };

  let cells = 0;
  let hits = 0;
  for (let r = 0; r < target.length; r++) {
    const wantRow = target[r]!;
    const gotRow = submitted[r];
    if (!gotRow || gotRow.length !== wantRow.length) return { correct: false };
    for (let c = 0; c < wantRow.length; c++) {
      cells++;
      if (gotRow[c] === wantRow[c]) hits++;
    }
  }
  return { correct: hits === cells, metrics: { 'M-POLY': proportion(hits, cells) } };
}

/* ================================================================== *
 * FLU-MATRIXBUILD-01 — build the missing tile of a matrix
 *
 * Each constructed attribute is re-induced from the VISIBLE cells: keep every
 * rule in the declared taxonomy that fits them, and require them all to predict
 * the same blank value. Credit is per attribute, so a child who binds two of
 * three rules is separated from one who binds none.
 * ================================================================== */

type AttrValue = string | number;

function readAttrValue(value: unknown): AttrValue | null {
  if (typeof value === 'string') return value;
  const n = asFiniteNumber(value);
  return n === null ? null : n;
}

/** Normalised comparison form declared by `answer.equivalence.normalization`. */
function normalizeAttr(attribute: string, value: unknown): string | number | null {
  if (attribute === 'count') {
    const n = asFiniteNumber(value);
    if (n !== null) return n;
    const text = asString(value);
    if (text === null) return null;
    const parsed = Number.parseInt(text, 10);
    return Number.isFinite(parsed) ? parsed : null;
  }
  const text = asString(value);
  if (text !== null) return text.trim().toLowerCase();
  const n = asFiniteNumber(value);
  return n === null ? null : n;
}

/** Distinct blank values predicted by the rules that fit the visible cells. */
function induceBlankValues(
  values: (AttrValue | null)[][],
  size: number,
  numeric: boolean,
): AttrValue[] {
  const shown: { r: number; c: number; v: AttrValue }[] = [];
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (r === size - 1 && c === size - 1) continue;
      const v = values[r]?.[c];
      if (v === null || v === undefined) return [];
      shown.push({ r, c, v });
    }
  }
  const row = (r: number) => shown.filter((s) => s.r === r).map((s) => s.v);
  const col = (c: number) => shown.filter((s) => s.c === c).map((s) => s.v);
  const allSame = (xs: AttrValue[]) => xs.every((x) => x === xs[0]);
  const indices = Array.from({ length: size }, (_, i) => i);
  const preds: AttrValue[] = [];

  if (indices.every((r) => allSame(row(r)))) {
    const v = row(size - 1)[0];
    if (v !== undefined) preds.push(v);
  }
  if (indices.every((c) => allSame(col(c)))) {
    const v = col(size - 1)[0];
    if (v !== undefined) preds.push(v);
  }

  const alphabet = [...new Set(shown.map((s) => s.v))];
  if (alphabet.length === size) {
    const rowsDistinct = indices.every((r) => new Set(row(r)).size === row(r).length);
    const colsDistinct = indices.every((c) => new Set(col(c)).size === col(c).length);
    if (rowsDistinct && colsDistinct) {
      const gapRow = alphabet.filter((v) => !row(size - 1).includes(v));
      const gapCol = alphabet.filter((v) => !col(size - 1).includes(v));
      if (gapRow.length === 1 && gapCol.length === 1 && gapRow[0] === gapCol[0])
        preds.push(gapRow[0]!);
    }
  }

  if (numeric) {
    const numbers = (xs: AttrValue[]) => xs.map((x) => (typeof x === 'number' ? x : Number.NaN));
    const deltas: number[] = [];
    for (let r = 0; r < size; r++) {
      const vs = numbers(row(r));
      for (let i = 1; i < vs.length; i++) deltas.push(vs[i]! - vs[i - 1]!);
    }
    const distinctDeltas = [...new Set(deltas)];
    const delta = distinctDeltas[0];
    if (
      distinctDeltas.length === 1 &&
      delta !== undefined &&
      delta !== 0 &&
      Number.isFinite(delta)
    ) {
      const lastRow = numbers(row(size - 1));
      const tail = lastRow[lastRow.length - 1];
      if (tail !== undefined && Number.isFinite(tail)) preds.push(tail + delta);
    }
    if (size === 3) {
      const at = (r: number, c: number) => {
        const v = values[r]?.[c];
        return typeof v === 'number' ? v : Number.NaN;
      };
      const rowsWithSum = [0, 1];
      if (rowsWithSum.every((r) => at(r, 2) === at(r, 0) + at(r, 1)))
        preds.push(at(2, 0) + at(2, 1));
      if (rowsWithSum.every((r) => at(r, 2) === at(r, 0) - at(r, 1)))
        preds.push(at(2, 0) - at(2, 1));
    }
  }

  return [...new Set(preds)];
}

/** Expected tile per constructed attribute, re-induced from the visible cells. */
function deriveMatrixTile(content: Record<string, unknown>): Map<string, AttrValue> | null {
  const size = asInt(content.gridSize);
  const attributes = asArray(content.constructedAttributes)?.map(asString) ?? null;
  const matrix = asRecord(content.matrix);
  const cells = asArray(matrix?.cells);
  if (size === null || size < 2 || !attributes || attributes.some((a) => a === null) || !cells)
    return null;
  if (cells.length !== size) return null;

  const blank = asRecord(matrix?.blank);
  // The induction below reads the blank as the bottom-right cell, as the bank
  // guarantees; anything else is not a shape this solver can reason about.
  if (asInt(blank?.row) !== size - 1 || asInt(blank?.col) !== size - 1) return null;

  const out = new Map<string, AttrValue>();
  for (const attribute of attributes as string[]) {
    const values: (AttrValue | null)[][] = [];
    for (let r = 0; r < size; r++) {
      const rowCells = asArray(cells[r]);
      if (!rowCells || rowCells.length !== size) return null;
      const row: (AttrValue | null)[] = [];
      for (let c = 0; c < size; c++) {
        if (r === size - 1 && c === size - 1) {
          row.push(null);
          continue;
        }
        const tile = asRecord(rowCells[c]);
        const value = tile ? readAttrValue(tile[attribute]) : null;
        if (value === null) return null;
        row.push(value);
      }
      values.push(row);
    }
    const predicted = induceBlankValues(values, size, attribute === 'count');
    if (predicted.length !== 1) return null;
    out.set(attribute, predicted[0]!);
  }
  return out;
}

function verifyMatrixBuild(item: RawBankItem, response: Record<string, unknown>): Verdict {
  const content = item.content;
  const attributes = (asArray(content.constructedAttributes) ?? [])
    .map(asString)
    .filter((a): a is string => a !== null);
  if (attributes.length === 0) return { correct: false };

  const derived = deriveMatrixTile(content);
  const canonical = asRecord(item.answer.canonical);
  const constructed = asRecord(response.constructed);
  if (!constructed) return { correct: false };

  let hits = 0;
  for (const attribute of attributes) {
    const want = normalizeAttr(attribute, derived?.get(attribute) ?? canonical?.[attribute]);
    const got = normalizeAttr(attribute, constructed[attribute]);
    if (want === null || got === null) continue;
    if (want === got) hits++;
  }

  const correct = hits === attributes.length;
  const metrics: Record<string, number> = { 'M-POLY': proportion(hits, attributes.length) };
  // Halford relational complexity: only a fully correct tile evidences that the
  // child bound all of the co-acting attribute rules at once.
  if (correct) metrics['M-RULEID'] = attributes.length;
  return { correct, metrics };
}

/* ================================================================== *
 * FLU-CONCEPT-01 — find the gate's hidden rule, then classify three probes
 *
 * The child tests figures against a gate and then says whether each of three
 * unbuildable probes opens it. `content.gateOracle` is the complete accept-set
 * over the buildable palette, so the rules consistent with it are enumerable and
 * (by construction) agree on all three probes: that agreement is the key.
 *
 * The oracle is in `content` because the child has to be able to run tests; the
 * type is recorded as knowingly stimulus-derivable in
 * `research/exam-question-types/qa/NOT_SERVABLE.json` (E-075) and is not blocked.
 * ================================================================== */

interface ConceptAtom {
  kind: 'eq' | 'gte';
  dim: string;
  value: AttrValue;
}

type ConceptFigure = Record<string, AttrValue>;

const CONCEPT_DIMS = ['shape', 'color', 'count', 'size'] as const;

function readFigure(value: unknown): ConceptFigure | null {
  const record = asRecord(value);
  if (!record) return null;
  const figure: ConceptFigure = {};
  for (const dim of CONCEPT_DIMS) {
    const v = readAttrValue(record[dim]);
    if (v !== null) figure[dim] = v;
  }
  return figure;
}

const figureKey = (figure: ConceptFigure) => CONCEPT_DIMS.map((d) => String(figure[d])).join('|');

function atomHolds(atom: ConceptAtom, figure: ConceptFigure): boolean {
  const value = figure[atom.dim];
  if (value === undefined) return false;
  if (atom.kind === 'gte')
    return typeof value === 'number' && typeof atom.value === 'number' && value >= atom.value;
  return value === atom.value;
}

const ruleAccepts = (rule: readonly ConceptAtom[], figure: ConceptFigure) =>
  rule.every((atom) => atomHolds(atom, figure));

/** Conjunctive rules of arity 1..maxArity, at most one atom per dimension. */
function conceptHypotheses(
  varyDims: readonly string[],
  valuesByDim: Map<string, AttrValue[]>,
  maxArity: number,
): ConceptAtom[][] {
  const atoms: ConceptAtom[] = [];
  for (const dim of varyDims) {
    const values = valuesByDim.get(dim) ?? [];
    for (const value of values) atoms.push({ kind: 'eq', dim, value });
    if (dim === 'count') {
      const numbers = values
        .filter((v): v is number => typeof v === 'number')
        .sort((a, b) => a - b);
      for (const value of numbers.slice(1)) atoms.push({ kind: 'gte', dim: 'count', value });
    }
  }

  const rules: ConceptAtom[][] = [];
  const used = new Set<string>();
  const walk = (start: number, current: ConceptAtom[]) => {
    if (current.length) rules.push(current.slice());
    if (current.length === maxArity) return;
    for (let i = start; i < atoms.length; i++) {
      const atom = atoms[i]!;
      if (used.has(atom.dim)) continue;
      current.push(atom);
      used.add(atom.dim);
      walk(i + 1, current);
      used.delete(atom.dim);
      current.pop();
    }
  };
  walk(0, []);
  return rules;
}

interface ConceptModel {
  probeKeys: string[];
  expected: string;
  hypotheses: ConceptAtom[][];
  oracle: { figure: ConceptFigure; accepts: boolean }[];
}

/** Hypothesis space, oracle and the one probe-verdict string the evidence forces. */
function buildConceptModel(item: RawBankItem): ConceptModel | null {
  const content = item.content;
  const varyDims = (asArray(content.varyDims) ?? [])
    .map(asString)
    .filter((d): d is string => d !== null);
  const rawOracle = asArray(content.gateOracle);
  const rawProbes = asArray(content.probes);
  if (varyDims.length === 0 || !rawOracle || !rawProbes || rawProbes.length === 0) return null;

  const oracle: { figure: ConceptFigure; accepts: boolean }[] = [];
  const valuesByDim = new Map<string, AttrValue[]>();
  for (const raw of rawOracle) {
    const entry = asRecord(raw);
    const figure = readFigure(entry?.figure);
    if (!figure || typeof entry?.accepts !== 'boolean') return null;
    oracle.push({ figure, accepts: entry.accepts });
    for (const dim of varyDims) {
      const value = figure[dim];
      if (value === undefined) continue;
      const seen = valuesByDim.get(dim) ?? [];
      if (!seen.includes(value)) seen.push(value);
      valuesByDim.set(dim, seen);
    }
  }

  const probes: { key: string; figure: ConceptFigure }[] = [];
  for (const raw of rawProbes) {
    const entry = asRecord(raw);
    const key = asString(entry?.key);
    const figure = readFigure(entry?.figure);
    if (key === null || !figure) return null;
    probes.push({ key, figure });
  }

  const maxArity = Math.min(3, Math.max(1, varyDims.length - 1));
  const hypotheses = conceptHypotheses(varyDims, valuesByDim, maxArity);
  const consistent = hypotheses.filter((rule) =>
    oracle.every((entry) => ruleAccepts(rule, entry.figure) === entry.accepts),
  );
  const verdicts = new Set(
    consistent.map((rule) => probes.map((p) => (ruleAccepts(rule, p.figure) ? 'Y' : 'N')).join('')),
  );
  const derived = verdicts.size === 1 ? [...verdicts][0]! : null;
  const stored = asString(item.answer.correctKey);
  const expected = derived ?? stored;
  if (expected === null || expected.length !== probes.length) return null;

  return { probeKeys: probes.map((p) => p.key), expected, hypotheses, oracle };
}

/** Mean share of the viable-rule space each of the child's tests eliminated. */
function hypothesisSearchEfficiency(
  model: ConceptModel,
  response: Record<string, unknown>,
): number | null {
  const tests = asArray(response.tests);
  if (!tests || tests.length === 0) return null;
  const oracleMap = new Map(model.oracle.map((entry) => [figureKey(entry.figure), entry.accepts]));

  let viable = model.hypotheses;
  let reductions = 0;
  let counted = 0;
  for (const raw of tests) {
    const figure = readFigure(asRecord(raw)?.figure);
    if (!figure) continue;
    const outcome = oracleMap.get(figureKey(figure));
    if (outcome === undefined) continue;
    const before = viable.length;
    if (before === 0) break;
    viable = viable.filter((rule) => ruleAccepts(rule, figure) === outcome);
    reductions += (before - viable.length) / before;
    counted++;
  }
  return counted > 0 ? reductions / counted : null;
}

function verifyConcept(item: RawBankItem, response: Record<string, unknown>): Verdict {
  const model = buildConceptModel(item);
  if (!model) return { correct: false };

  // `probeAnswers` carries the probe key with each verdict; `answerKeyString` is
  // the same thing positionally, and is the fallback when the array is absent.
  const answers = asArray(response.probeAnswers);
  let submitted: string | null = null;
  if (answers && answers.length === model.probeKeys.length) {
    const byKey = new Map<string, boolean>();
    for (const raw of answers) {
      const entry = asRecord(raw);
      const key = asString(entry?.key);
      if (key === null || typeof entry?.opens !== 'boolean') {
        byKey.clear();
        break;
      }
      byKey.set(key, entry.opens);
    }
    if (byKey.size === model.probeKeys.length) {
      submitted = model.probeKeys.map((key) => (byKey.get(key) ? 'Y' : 'N')).join('');
    }
  }
  submitted ??= asString(response.answerKeyString);
  if (submitted === null || submitted.length !== model.expected.length) return { correct: false };

  let hits = 0;
  for (let i = 0; i < model.expected.length; i++) if (submitted[i] === model.expected[i]) hits++;

  const metrics: Record<string, number> = { 'M-POLY': proportion(hits, model.expected.length) };
  const hyp = hypothesisSearchEfficiency(model, response);
  if (hyp !== null) metrics['M-HYP'] = hyp;
  return { correct: hits === model.expected.length, metrics };
}

/* ================================================================== *
 * CX-check-01 — review a sorter's work and fix the tiles it misplaced
 *
 * Every tile's true bin is recomputed from the visible board: canonicalise the
 * tile text to its repetition signature (`NGG` -> `ABB`) and take the one bin
 * whose rule is that signature. The child is correct when every tile ends in its
 * true bin, whether or not they moved anything.
 * ================================================================== */

/** Canonical repetition signature: first distinct char -> A, next -> B, … */
function repetitionSignature(text: string): string {
  const seen = new Map<string, string>();
  let out = '';
  for (const ch of text) {
    let label = seen.get(ch);
    if (label === undefined) {
      label = String.fromCharCode(65 + seen.size);
      seen.set(ch, label);
    }
    out += label;
  }
  return out;
}

/** tokenId -> true bin key, re-derived from the board; null when ambiguous. */
function deriveTrueBins(content: Record<string, unknown>): Map<string, string> | null {
  const bins = asArray(content.bins);
  const tokens = asArray(content.tokens);
  if (!bins || !tokens || tokens.length === 0) return null;

  const byPattern = new Map<string, string[]>();
  for (const raw of bins) {
    const bin = asRecord(raw);
    const key = asString(bin?.key);
    const pattern = asString(bin?.pattern);
    if (key === null || pattern === null) return null;
    byPattern.set(pattern, [...(byPattern.get(pattern) ?? []), key]);
  }

  const out = new Map<string, string>();
  for (const raw of tokens) {
    const token = asRecord(raw);
    const id = asString(token?.id);
    const text = asString(token?.text);
    if (id === null || text === null) return null;
    const matches = byPattern.get(repetitionSignature(text));
    if (!matches || matches.length !== 1) return null;
    out.set(id, matches[0]!);
  }
  return out;
}

function verifyCheckTwice(item: RawBankItem, response: Record<string, unknown>): Verdict {
  let trueBins = deriveTrueBins(item.content);
  if (!trueBins) {
    const stored = asRecord(item.answer.trueBin);
    if (!stored) return { correct: false };
    trueBins = new Map<string, string>();
    for (const [id, bin] of Object.entries(stored)) {
      const key = asString(bin);
      if (key === null) return { correct: false };
      trueBins.set(id, key);
    }
  }

  const finalPlacement = asRecord(response.finalPlacement);
  if (!finalPlacement) return { correct: false };

  let hits = 0;
  for (const [id, want] of trueBins) if (asString(finalPlacement[id]) === want) hits++;

  // Planted slips are the tiles the sorter placed away from their true bin;
  // `M-ERRTYPE` is the share of those the child actually caught (0..1, higher is
  // better), per the type's declared deterministic scoring components.
  let planted = 0;
  let caught = 0;
  for (const raw of asArray(item.content.tokens) ?? []) {
    const token = asRecord(raw);
    const id = asString(token?.id);
    const served = asString(token?.bin);
    if (id === null || served === null) continue;
    const want = trueBins.get(id);
    if (want === undefined || served === want) continue;
    planted++;
    if (asString(finalPlacement[id]) === want) caught++;
  }

  return {
    correct: hits === trueBins.size,
    metrics: {
      'M-POLY': proportion(hits, trueBins.size),
      'M-ERRTYPE': planted === 0 ? 1 : caught / planted,
    },
  };
}

/* ================================================================== *
 * CX-curious-02 — spot what the scene does NOT tell us
 *
 * Only the information-gap pick is keyed. The questions the child asks and the
 * cause/next guesses they make are never right or wrong (they are counted, and
 * their quality is judge-deferred), so nothing here scores them. The gap option
 * is re-derived as the single option whose evidence model records no support in
 * the scene.
 * ================================================================== */

function deriveGapKey(item: RawBankItem): string | null {
  const options = asArray(item.content.gapOptions);
  if (!options) return null;
  const offered = new Set<string>();
  for (const raw of options) {
    const id = asString(asRecord(raw)?.id);
    if (id === null) return null;
    offered.add(id);
  }

  const evidence = asArray(asRecord(item.answer.evidenceModel)?.gapOptions);
  if (evidence) {
    const unknown = evidence
      .map((raw) => asRecord(raw))
      .filter((entry) => asString(entry?.support) === 'unknown')
      .map((entry) => asString(entry?.id))
      .filter((id): id is string => id !== null && offered.has(id));
    if (unknown.length === 1) return unknown[0]!;
  }

  const stored = asString(item.answer.correctKey);
  return stored !== null && offered.has(stored) ? stored : null;
}

function verifyCurious(item: RawBankItem, response: Record<string, unknown>): Verdict {
  const expected = deriveGapKey(item);
  if (expected === null) return { correct: false };
  return { correct: asString(response.gapKey) === expected };
}

/* ================================================================== *
 * CX-achieve-02 — run trials on a bench, then say which setup wins
 *
 * The keyed part is the conclusion (and the highest-effect factor when the item
 * asks for it), both re-derived by evaluating `content.apparatus` over every
 * conclusion option and taking the extremum the scenario asks for.
 *
 * NOTE: this type stays BLOCKED from serving. `content.apparatus` ships the
 * closed-form outcome model, so a taker can recover the key with zero trials
 * (E-076, `research/exam-question-types/qa/NOT_SERVABLE.json`). The verifier
 * exists so the type is ready the moment that leak is resolved; it does not
 * unblock it, and the same derivation that makes it verifiable here is exactly
 * the exploit.
 * ================================================================== */

interface BenchFactor {
  id: string;
  levels: number[];
}

function readBenchFactors(content: Record<string, unknown>): BenchFactor[] | null {
  const raw = asArray(content.factors);
  if (!raw || raw.length === 0) return null;
  const factors: BenchFactor[] = [];
  for (const entry of raw) {
    const factor = asRecord(entry);
    const id = asString(factor?.id);
    const levels = asArray(factor?.levels);
    if (id === null || !levels) return null;
    const values: number[] = [];
    for (const level of levels) {
      const value = asInt(asRecord(level)?.value);
      if (value === null) return null;
      values.push(value);
    }
    factors.push({ id, levels: values });
  }
  return factors;
}

/** The bench's noise-free outcome for one setting. */
function benchExpected(
  apparatus: Record<string, unknown>,
  factors: readonly BenchFactor[],
  setting: Record<string, unknown>,
): number | null {
  let value = asFiniteNumber(apparatus.base);
  if (value === null) return null;
  const weights = asRecord(apparatus.weights);
  if (!weights) return null;

  for (const factor of factors) {
    const level = asInt(setting[factor.id]);
    const perLevel = asArray(weights[factor.id]);
    if (level === null || !perLevel) return null;
    const weight = asFiniteNumber(perLevel[level]);
    if (weight === null) return null;
    value += weight;
  }

  const interaction = asRecord(apparatus.interaction);
  if (interaction) {
    const a = asString(interaction.factorA);
    const b = asString(interaction.factorB);
    const bonus = asFiniteNumber(interaction.bonus);
    if (a === null || b === null || bonus === null) return null;
    if (
      asInt(setting[a]) === asInt(interaction.levelA) &&
      asInt(setting[b]) === asInt(interaction.levelB)
    ) {
      value += bonus;
    }
  }
  return value;
}

/** Option key of the uniquely best setup among the offered conclusion options. */
function deriveBestOptionKey(item: RawBankItem): string | null {
  const content = item.content;
  const factors = readBenchFactors(content);
  const apparatus = asRecord(content.apparatus);
  const options = asArray(asRecord(content.conclusion)?.options);
  const direction = asString(asRecord(content.scenario)?.direction) ?? 'max';
  if (!factors || !apparatus || !options) return null;

  const scored: { key: string; value: number }[] = [];
  for (const raw of options) {
    const option = asRecord(raw);
    const key = asString(option?.key);
    const setting = asRecord(option?.setting);
    if (key === null || !setting) return null;
    const value = benchExpected(apparatus, factors, setting);
    if (value === null) return null;
    scored.push({ key, value });
  }
  if (scored.length === 0) return null;

  const best = scored.reduce((a, b) =>
    direction === 'min' ? (b.value < a.value ? b : a) : b.value > a.value ? b : a,
  );
  const tied = scored.filter((s) => s.value === best.value);
  return tied.length === 1 ? best.key : null;
}

/** Factor with the uniquely widest weight span — the depth-2 sub-key. */
function deriveTopFactorId(item: RawBankItem): string | null {
  const factors = readBenchFactors(item.content);
  const weights = asRecord(asRecord(item.content.apparatus)?.weights);
  if (!factors || !weights) return null;

  const spans: { id: string; span: number }[] = [];
  for (const factor of factors) {
    const perLevel = (asArray(weights[factor.id]) ?? []).map(asFiniteNumber);
    if (perLevel.length === 0 || perLevel.some((w) => w === null)) return null;
    const values = perLevel as number[];
    spans.push({ id: factor.id, span: Math.max(...values) - Math.min(...values) });
  }
  spans.sort((a, b) => b.span - a.span);
  const top = spans[0];
  if (!top) return null;
  return spans.length > 1 && spans[1]!.span === top.span ? null : top.id;
}

function verifyInvestigation(item: RawBankItem, response: Record<string, unknown>): Verdict {
  const expectedKey = deriveBestOptionKey(item) ?? asString(item.answer.correctKey);
  if (expectedKey === null) return { correct: false };

  let asked = 1;
  let hits = asString(response.conclusionKey) === expectedKey ? 1 : 0;

  if (asRecord(item.content.conclusion)?.askFactorPick === true) {
    const expectedFactor = deriveTopFactorId(item) ?? asString(item.answer.topFactorId);
    if (expectedFactor === null) return { correct: false };
    asked++;
    if (asString(response.factorPick) === expectedFactor) hits++;
  }

  return { correct: hits === asked, metrics: { 'M-POLY': proportion(hits, asked) } };
}

export const fluidVerifiers: Record<string, Verifier> = {
  'FLU-GRIDCOPY-01': verifyGridCopy,
  'FLU-MATRIXBUILD-01': verifyMatrixBuild,
  'FLU-CONCEPT-01': verifyConcept,
  'CX-check-01': verifyCheckTwice,
  'CX-curious-02': verifyCurious,
  'CX-achieve-02': verifyInvestigation,
};
