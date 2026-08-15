import type {
  AgeBand,
  DifficultyEstimate,
  Domain,
  ItemContent,
  ItemExplanation,
  ItemGenerator,
  ItemOption,
  ItemUsage,
  ReadingLoad,
  RenderedItem,
} from '@gt/contracts';
import { Rng } from './rng.js';

/**
 * What an author writes. The kit turns it into an ItemGenerator, which means authors never
 * hand-build a RenderedItem and cannot forget to shuffle the options or to mark the key.
 */
export interface GeneratorSpec {
  id: string;
  version: string;
  title: string;
  construct: string;
  domain: Domain;
  ageBands: readonly AgeBand[];
  readingLoad: ReadingLoad;
  /**
   * Every new generator starts assumed. It becomes calibrated only when real responses
   * back it, and the type will not let anyone skip that step quietly.
   */
  assumedDifficulty: number;
  /** Assumed discrimination. Leave unset unless this family should be sharper or flatter. */
  assumedDiscrimination?: number;
  /**
   * Which tools may serve this family. Defaults to 'assessment', so a family only becomes
   * available to a practice tool when an author says so and has written an explanation.
   */
  usage?: ItemUsage;
  /** Set when the options are legitimately drawn from the stem, e.g. odd-one-out. */
  selectFromStem?: boolean;
  authoredBy: string;
  authoredAt: string;
  /**
   * Build one item. Return the stem, the correct answer, and the distractors. The kit
   * assigns option ids and shuffles, so ordering here is irrelevant and cannot leak the key.
   */
  build(rng: Rng): {
    prompt: string;
    stem: ItemContent;
    correct: ItemContent;
    distractors: readonly ItemContent[];
    /** Required for any family marked 'prep' or 'both'. Checked at publish time. */
    explanation?: ItemExplanation;
  };
}

/**
 * Assumed item parameters, carrying a deliberately wide standard error because they are a
 * guess.
 *
 * The default discrimination of 1.5 is itself an assumption, and it is load-bearing: at 1.0
 * a sixteen-item session leaves a posterior standard error near 0.54, which cannot resolve
 * which side of a threshold a candidate sits on, so the stop rule never fires and every
 * session runs to the cap. Calibration should replace this number early.
 */
export function assumed(b: number, a = 1.5): DifficultyEstimate {
  return { b, a, se: 1.0, source: 'assumed', n: 0 };
}

export function defineGenerator(spec: GeneratorSpec): ItemGenerator {
  const meta = {
    id: spec.id,
    version: spec.version,
    title: spec.title,
    construct: spec.construct,
    domain: spec.domain,
    ageBands: spec.ageBands,
    readingLoad: spec.readingLoad,
    difficulty: assumed(spec.assumedDifficulty, spec.assumedDiscrimination),
    usage: spec.usage ?? 'assessment',
    selectFromStem: spec.selectFromStem ?? false,
    status: 'published' as const,
    authoredBy: spec.authoredBy,
    authoredAt: spec.authoredAt,
  };

  return {
    ...meta,
    render(seed: number): RenderedItem {
      const rng = new Rng(seed);
      const built = spec.build(rng);

      const correctId = 'opt-correct';
      const unshuffled: ItemOption[] = [
        { id: correctId, content: built.correct },
        ...built.distractors.map((content, i) => ({ id: `opt-d${i}`, content })),
      ];

      // Shuffled with the same rng stream, so key position varies with the seed. The
      // validator checks the resulting distribution across many seeds.
      const options = rng.shuffle(unshuffled);

      return {
        generatorId: spec.id,
        generatorVersion: spec.version,
        seed,
        prompt: built.prompt,
        stem: built.stem,
        options,
        correctOptionId: correctId,
        readingLoad: spec.readingLoad,
        ...(built.explanation ? { explanation: built.explanation } : {}),
      };
    },
  };
}

// --- content helpers, so generators stay readable ------------------------------------

export const text = (t: string): ItemContent => ({ kind: 'text', text: t });

export const glyphs = (g: readonly string[]): ItemContent => ({ kind: 'glyphSequence', glyphs: [...g] });

export const grid = (rows: number, cols: number, cells: readonly (string | null)[]): ItemContent => ({
  kind: 'grid',
  rows,
  cols,
  cells: [...cells],
});

export const shape = (
  path: readonly [number, number][],
  rotation: number,
  mirrored: boolean,
): ItemContent => ({ kind: 'shape', path: [...path], rotation, mirrored });

/**
 * Build exactly `count` numeric distractors that are distinct from each other and from the
 * answer.
 *
 * Hand-written distractor lists collide. A generator whose wrong answers are arithmetic on
 * its own parameters will, for some parameter combinations, produce a "wrong" value equal to
 * the right one, and the candidate then sees the answer twice. Preferred candidates are tried
 * in order, then the gap is filled by walking outward from the answer.
 */
export function numericDistractors(
  answer: number,
  preferred: readonly number[],
  count = 3,
): ItemContent[] {
  const used = new Set<number>([answer]);
  const out: number[] = [];

  for (const candidate of preferred) {
    if (out.length >= count) break;
    if (!Number.isFinite(candidate)) continue;
    if (candidate < 0) continue;
    if (used.has(candidate)) continue;
    used.add(candidate);
    out.push(candidate);
  }

  // Walk outward from the answer until the set is full. Guaranteed to terminate because the
  // offset grows without bound.
  for (let offset = 1; out.length < count; offset++) {
    for (const candidate of [answer + offset, answer - offset]) {
      if (out.length >= count) break;
      if (candidate < 0 || used.has(candidate)) continue;
      used.add(candidate);
      out.push(candidate);
    }
  }

  return out.map((n) => text(String(n)));
}

/**
 * Build exactly `count` distractors distinct from each other and from the correct answer,
 * for any content kind.
 *
 * Every generator that derives its wrong answers arithmetically will, for some parameter
 * combination, derive one that equals another wrong answer or the right one. Two of the seed
 * generators did exactly that and the publish check caught both. Preferred candidates are
 * tried in order, then `fallback` is called with increasing indices until the set is full,
 * so the caller supplies the escape hatch and the helper guarantees distinctness.
 */
export function distinctDistractors(
  correct: ItemContent,
  preferred: readonly ItemContent[],
  fallback: (attempt: number) => ItemContent | null,
  count = 3,
): ItemContent[] {
  const used = new Set<string>([contentKey(correct)]);
  const out: ItemContent[] = [];

  for (const candidate of preferred) {
    if (out.length >= count) break;
    const k = contentKey(candidate);
    if (used.has(k)) continue;
    used.add(k);
    out.push(candidate);
  }

  for (let attempt = 0; out.length < count; attempt++) {
    if (attempt > 500) {
      throw new Error('distinctDistractors: fallback could not supply enough distinct options');
    }
    const candidate = fallback(attempt);
    if (!candidate) continue;
    const k = contentKey(candidate);
    if (used.has(k)) continue;
    used.add(k);
    out.push(candidate);
  }

  return out;
}

/** Serialise content for equality checks. Used to reject duplicate distractors. */
export function contentKey(c: ItemContent): string {
  switch (c.kind) {
    case 'text':
      return `t:${c.text}`;
    case 'glyphSequence':
      return `g:${c.glyphs.join(',')}`;
    case 'grid':
      return `r:${c.rows}x${c.cols}:${c.cells.map((x) => x ?? '_').join(',')}`;
    case 'shape':
      return `s:${c.path.map(([x, y]) => `${x}|${y}`).join(',')}:${c.rotation}:${c.mirrored}`;
  }
}
