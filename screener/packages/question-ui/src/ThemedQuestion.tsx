import { useEffect, useMemo, useState, type CSSProperties, type JSX, type ReactNode } from 'react';

import type { Kit } from '../../../apps/lab-system/shared/uikit/kit';
import type { Visual } from '../../../apps/lab-system/shared/uikit/resolve';
import type { Manifest } from '../../../apps/lab-system/shared/uispec/abstract';
import {
  cellId,
  choiceId,
  pairId,
  planFor,
  type BankItem,
  type Drawable,
  type Drawn,
} from './adapt-item';
import './ThemedQuestion.css';

/**
 * One real bank item, drawn as a playable question out of a UI kit.
 *
 * WHAT THIS IS FOR. The archive ships a hand-built HTML renderer per type and they are good, but there
 * are 53 of them and each one knows what its own question is. This is the other answer: one renderer
 * that knows what a GRID is and what a CHOICE is, and gets everything it draws from a kit. Swap the kit
 * and the same item comes back as Pokémon, or flowers, without the item changing at all. That claim is
 * only worth anything if it is falsifiable, which is why this sits next to the archive's renderer in the
 * review tool rather than replacing it.
 *
 * WHAT IT REFUSES TO DO, and this is the load-bearing part. `resolve()` guarantees that cells the item
 * says differ get different pictures and cells that match get the same one. When it cannot honour that
 * it says so, and what it says goes on the screen instead of a picture. A near-miss substitution is the
 * worst possible outcome here: the item still looks like a question, a child still answers it, the
 * engine still counts the answer, and nothing anywhere reports that the item had two defensible answers
 * or none. So there is no fallback path in this file that draws something approximate.
 *
 * WHAT IT NEVER SEES. `answer`, `scoring` and `provenance` are stripped in `adapt-item.ts` and are not
 * on the `BankItem` type this file accepts, so reaching for the key does not compile. Options are
 * lettered by position rather than by their own key, so the key never reaches the DOM in any form; it is
 * handed back through `onAnswer` for the host to mark, because deciding correctness is the host's job.
 */

/**
 * How a kit's `sprite:<key>` art gets drawn.
 *
 * Kits that ship vector art rather than URLs supply this. It is handed `turns` and `size` rather than
 * having a CSS transform wrapped around it, so a drawn sprite can turn about its own centre and keep its
 * stroke weight instead of being scaled like a photograph.
 */
export type SpriteRenderer = (a: {
  sprite: string;
  size?: number;
  turns?: number;
  tint?: string;
}) => JSX.Element;

export interface ThemedQuestionProps {
  /** A line out of `qbank-library/banks/<TYPE>.jsonl`, minus everything answer-shaped. */
  readonly item: BankItem;
  /** A kit that has already been through `checkKit`. */
  readonly kit: Kit;
  readonly sprite?: SpriteRenderer;
  /** Same seed, same pictures. Change it to see the item dressed differently. */
  readonly seed?: number;
  /** A vocabulary wider than this item's, when the caller has the whole bank. */
  readonly manifest?: Manifest;
  /** Which option was tapped. The host marks it; nothing here knows whether it was right. */
  readonly onAnswer?: (choiceIndex: number, choiceKey: string) => void;
}

/** Everything the drawing helpers need, gathered once so it is not threaded through by hand. */
interface DrawContext {
  readonly parts: ReadonlyMap<string, Drawn>;
  readonly sprite: SpriteRenderer | undefined;
  readonly degreesPerTurn: number;
  readonly tints: ReadonlyMap<string, number>;
  /**
   * Whether to write the entry's name under it.
   *
   * Only when the item varies something the bank carries. A counting item resolves to one entry drawn
   * over and over, and printing "Bulbasaur" under all nine cells says nothing, costs the sprites room
   * and makes the thing that does change harder to see.
   */
  readonly showNames: boolean;
}

export function ThemedQuestion({ item, kit, sprite, seed = 1, manifest, onAnswer }: ThemedQuestionProps) {
  const plan = useMemo(() => planFor({ item, kit, seed, manifest }), [item, kit, seed, manifest]);
  const tints = useMemo(() => tintSlots(kit), [kit]);
  const [picked, setPicked] = useState<number | null>(null);

  // A new item, a new kit or a new draw is a new question, and carrying a selection across would show a
  // reviewer a tick against something they never chose.
  useEffect(() => {
    setPicked(null);
  }, [item.itemId, kit.id, seed]);

  if (!plan.ok) {
    return (
      <section className="tq tq-declined" aria-label={`${item.typeCode}, not drawn`}>
        <Banner typeCode={item.typeCode} kitName={kit.name} />
        <p className="tq-refusal">
          <b>This item is not being drawn.</b> {plan.why}
        </p>
        <p className="tq-refusal-why">
          Showing an approximation here would leave the item looking answerable when it is not, so nothing
          is drawn instead.
        </p>
      </section>
    );
  }

  const context: DrawContext = {
    parts: plan.parts,
    sprite,
    degreesPerTurn: plan.degreesPerTurn,
    tints,
    showNames: Object.keys(plan.using).length > 0,
  };
  const chosen = picked === null ? undefined : plan.parts.get(choiceId(picked));
  const chosenWord = chosen?.kind === 'word' ? chosen.text : null;

  const pick = (index: number): void => {
    setPicked(index);
    const choice = plan.choices[index];
    if (choice) onAnswer?.(choice.index, choice.key);
  };

  return (
    <section className="tq" aria-label={`${item.typeCode} question`}>
      <Banner typeCode={item.typeCode} kitName={kit.name} />
      <p className="tq-ask">{plan.ask}</p>
      <Stem plan={plan} context={context} chosenWord={chosenWord} />
      {plan.choicesAreStemRows && plan.stem.kind === 'pairs' ? (
        <PairChoices plan={plan} context={context} picked={picked} onPick={pick} />
      ) : (
        <Choices plan={plan} context={context} picked={picked} onPick={pick} />
      )}
      <Footnotes plan={plan} />
    </section>
  );
}

function Banner({ typeCode, kitName }: { typeCode: string; kitName: string }) {
  return (
    <header className="tq-banner">
      <span className="tq-code">{typeCode}</span>
      <span className="tq-drawn">drawn from {kitName}</span>
    </header>
  );
}

/* ------------------------------------------------------------------ stems */

function Stem({
  plan,
  context,
  chosenWord,
}: {
  plan: Drawable;
  context: DrawContext;
  chosenWord: string | null;
}) {
  const stem = plan.stem;
  switch (stem.kind) {
    case 'matrix': {
      // A series is a matrix one row tall and an analogy is a two-by-two with the hole bottom right, so
      // all three of those shapes arrive here and none of them needs a second layout.
      const strip = stem.rows === 1;
      return (
        <div
          className={strip ? 'tq-grid tq-strip' : 'tq-grid'}
          style={cssVars({ '--tq-cols': String(Math.max(1, stem.cols)) })}
          role="group"
          aria-label={strip ? 'The sequence so far' : 'The grid'}
        >
          {stem.cells.map((cell, i) =>
            cell === null ? (
              <div key={i} className="tq-slot tq-hole" aria-label="the missing one">
                <span aria-hidden="true">?</span>
              </div>
            ) : (
              <div key={i} className="tq-slot">
                <Part id={cellId(i)} context={context} />
              </div>
            ),
          )}
        </div>
      );
    }

    case 'passage':
      return (
        <div className="tq-passage">
          {stem.title ? <p className="tq-passage-title">{stem.title}</p> : null}
          {stem.sentences.map((sentence, i) => (
            <p key={i} className="tq-sentence">
              {withGap(sentence, chosenWord)}
            </p>
          ))}
          {stem.question ? <p className="tq-question">{stem.question}</p> : null}
        </div>
      );

    case 'constraints':
      return (
        <ul className="tq-clues">
          {stem.clues.map((clue, i) => (
            <Clue key={i} clue={clue} />
          ))}
        </ul>
      );

    case 'compare':
      return (
        <div className="tq-compare" role="group" aria-label="The two sides">
          <div className="tq-slot">
            <Part id="left" context={context} />
          </div>
          <span className="tq-versus" aria-hidden="true">
            vs
          </span>
          <div className="tq-slot">
            <Part id="right" context={context} />
          </div>
          <p className="tq-hint">the side with {stem.wants}</p>
        </div>
      );

    // The rows are the options, so they are drawn once, below, as the things you tap.
    case 'pairs':
      return null;

    /**
     * Nothing to show but the question itself, which is already above.
     *
     * `planFor` refuses this stem before it gets here, because in this bank it is never an item with no
     * stimulus, it is an item whose stimulus was not recognised. The branch stays because laying out a
     * genuinely plain item IS just the ask and the options, and that should not become wrong the day a
     * caller has one.
     */
    case 'plain':
      return null;

    default:
      return (
        <p className="tq-refusal">
          This renderer does not know how to lay out a <b>{(stem as { kind: string }).kind}</b> stem, so it
          is not drawing one. Whatever the item shows here would be a guess.
        </p>
      );
  }
}

/**
 * A clue line.
 *
 * `IN:` and `OUT:` are the adapter's own wording for a sorted-in/sorted-out rule, and splitting them
 * back out is purely presentational — a line that does not match is printed exactly as it arrived, which
 * is what free-text clues like "dot inside" need.
 */
function Clue({ clue }: { clue: string }) {
  const parsed = /^(IN|OUT):\s*(.*)$/.exec(clue);
  const tag = parsed?.[1];
  const rest = parsed?.[2];
  if (tag === undefined || rest === undefined) return <li className="tq-clue">{clue}</li>;

  const words = rest.split(/,\s*/).filter((w) => w.length > 0);
  return (
    <li className={tag === 'IN' ? 'tq-clue tq-clue-in' : 'tq-clue tq-clue-out'}>
      <span className="tq-tag">{tag === 'IN' ? 'goes in' : 'stays out'}</span>
      <span className="tq-chips">
        {words.map((word, i) => (
          <span key={i} className="tq-chip">
            {word}
          </span>
        ))}
      </span>
    </li>
  );
}

/** A sentence, with its gap made into a gap rather than a run of underscores. */
function withGap(sentence: string, chosenWord: string | null): ReactNode {
  const bits = sentence.split(/(_{2,})/);
  if (bits.length === 1) return sentence;
  return bits.map((bit, i) =>
    /^_{2,}$/.test(bit) ? (
      <span key={i} className={chosenWord === null ? 'tq-gap' : 'tq-gap tq-gap-filled'}>
        {chosenWord ?? '\u00a0'}
      </span>
    ) : (
      <span key={i}>{bit}</span>
    ),
  );
}

/* ---------------------------------------------------------------- choices */

function Choices({
  plan,
  context,
  picked,
  onPick,
}: {
  plan: Drawable;
  context: DrawContext;
  picked: number | null;
  onPick: (index: number) => void;
}) {
  return (
    <div className="tq-choices" role="group" aria-label="The things you can choose">
      {plan.choices.map((choice, i) => (
        <button
          key={choice.index}
          type="button"
          className="tq-choice"
          aria-pressed={picked === i}
          onClick={() => {
            onPick(i);
          }}
        >
          <span className="tq-letter" aria-hidden="true">
            {letter(i)}
          </span>
          <span className="tq-slot tq-slot-choice">
            <Part id={choiceId(i)} context={context} />
          </span>
        </button>
      ))}
    </div>
  );
}

/** For the one stem whose rows ARE the options: each row is the thing you tap. */
function PairChoices({
  plan,
  context,
  picked,
  onPick,
}: {
  plan: Drawable;
  context: DrawContext;
  picked: number | null;
  onPick: (index: number) => void;
}) {
  if (plan.stem.kind !== 'pairs') return null;
  return (
    <div className="tq-rows" role="group" aria-label="The rows you can choose">
      {plan.stem.rows.map((_row, i) => (
        <button
          key={i}
          type="button"
          className="tq-row"
          aria-pressed={picked === i}
          onClick={() => {
            onPick(i);
          }}
        >
          <span className="tq-letter" aria-hidden="true">
            {letter(i)}
          </span>
          <span className="tq-slot tq-slot-choice">
            <Part id={pairId(i, 'left')} context={context} />
          </span>
          <span className="tq-arrow" aria-hidden="true">
            →
          </span>
          <span className="tq-slot tq-slot-choice">
            <Part id={pairId(i, 'right')} context={context} />
          </span>
        </button>
      ))}
    </div>
  );
}

/* ---------------------------------------------------------------- drawing */

function Part({ id, context }: { id: string; context: DrawContext }) {
  const part = context.parts.get(id);
  if (part === undefined || part.kind === 'nothing') return <span className="tq-empty" aria-hidden="true" />;
  if (part.kind === 'word') return <span className="tq-word">{part.text}</span>;
  return <Picture visual={part.visual} context={context} />;
}

/**
 * One resolved thing, with the item's transforms on it.
 *
 * `repeat` is a REAL quantity out of the manifest and not a rank, so four means four drawn things and a
 * series that counts up counts up. The copies shrink as there are more of them so that nine still fits a
 * cell without any of them dropping below reading size.
 */
function Picture({ visual, context }: { visual: Visual; context: DrawContext }) {
  const copies = Math.max(1, Math.round(visual.repeat));
  const density = copies > 6 ? 'many' : copies > 2 ? 'few' : copies > 1 ? 'pair' : 'one';
  const tint = tintOf(visual.tint, context.tints);
  const style = cssVars({
    '--tq-spin': `${(visual.turns * context.degreesPerTurn).toFixed(1)}deg`,
    '--tq-scale': visual.size.toFixed(3),
    ...(tint.colour === undefined ? {} : { '--tq-tint': tint.colour }),
  });

  return (
    <span
      className={`tq-pic tq-pic-${density}`}
      style={style}
      data-tint={tint.slot}
      role="img"
      aria-label={copies > 1 ? `${String(copies)} ${visual.label}` : visual.label}
    >
      <span className="tq-copies">
        {Array.from({ length: copies }, (_, i) => (
          <Glyph key={i} visual={visual} context={context} />
        ))}
      </span>
      {context.showNames && drawsArt(visual, context.sprite) ? (
        <span className="tq-name" aria-hidden="true">
          {visual.label}
        </span>
      ) : null}
    </span>
  );
}

/**
 * Whether there is a picture to draw, as opposed to a label standing in for one.
 *
 * Decided in one place because two things depend on it: which branch `Glyph` takes, and whether the
 * name is written underneath. When the label IS the picture, writing it twice says nothing and takes the
 * room the label needs to be readable.
 */
function drawsArt(visual: Visual, sprite: SpriteRenderer | undefined): boolean {
  const art = visual.art;
  if (art === undefined) return false;
  if (/^https?:\/\//i.test(art)) return true;
  return art.startsWith('sprite:') && sprite !== undefined;
}

/**
 * One copy of the picture.
 *
 * Three ways a kit can supply art and one honest way to have none. A `sprite:` kit with no renderer
 * falls back to the entry's own label rather than to a placeholder, because a label still says which
 * thing it is and a placeholder says nothing — and the label still carries the rotation and scale, so an
 * item whose rule is "it turned" is still answerable.
 */
function Glyph({ visual, context }: { visual: Visual; context: DrawContext }) {
  const art = visual.art;
  if (art !== undefined && /^https?:\/\//i.test(art)) {
    return <img className="tq-img" src={art} alt="" loading="lazy" draggable={false} />;
  }
  if (art !== undefined && art.startsWith('sprite:') && context.sprite) {
    return <span className="tq-sprite">{context.sprite({ sprite: art.slice(7), size: visual.size, turns: visual.turns, tint: visual.tint })}</span>;
  }
  return <span className="tq-fallback">{visual.label}</span>;
}

function Footnotes({ plan }: { plan: Drawable }) {
  const using = Object.entries(plan.using);
  if (plan.notes.length === 0 && using.length === 0) return null;
  return (
    <footer className="tq-foot">
      {plan.notes.map((note, i) => (
        <p key={i} className="tq-note">
          {note}
        </p>
      ))}
      {using.length > 0 ? (
        <p className="tq-using">
          {using.map(([dimension, field]) => `${dimension} is drawn as ${field}`).join(' · ')}
        </p>
      ) : null}
    </footer>
  );
}

/* ----------------------------------------------------------------- pieces */

const letter = (index: number): string => String.fromCharCode(65 + (index % 26));

/** Custom properties are how the transforms reach the stylesheet, and `CSSProperties` has no room for them. */
function cssVars(vars: Record<string, string>): CSSProperties {
  return vars as unknown as CSSProperties;
}

const COLOUR = /^(#|rgba?\(|hsla?\()/i;

/**
 * Every tint token a kit declares, and the slot it gets.
 *
 * A tint is "an app-interpreted token" — `card`, `shadow`, `outline` on one kit and hex on another — so
 * the app has to interpret it, and the one thing it must never do is interpret two tokens the same way.
 * Slots are taken from the kit's own declared order, which makes them distinct by construction; a token
 * from nowhere gets a slot from its own characters so it is still distinguishable rather than invisible.
 */
function tintSlots(kit: Kit): ReadonlyMap<string, number> {
  const slots = new Map<string, number>();
  for (const source of Object.values(kit.dimensions)) {
    if (source?.from !== 'tint') continue;
    source.values.forEach((value, i) => {
      if (!slots.has(value)) slots.set(value, i);
    });
  }
  return slots;
}

function tintOf(
  token: string | undefined,
  slots: ReadonlyMap<string, number>,
): { slot: string; colour?: string } {
  if (token === undefined) return { slot: 'none' };
  if (COLOUR.test(token)) return { slot: 'colour', colour: token };
  const declared = slots.get(token);
  if (declared !== undefined) return { slot: String(declared % 8) };
  let sum = 0;
  for (let i = 0; i < token.length; i += 1) sum += token.charCodeAt(i);
  return { slot: String(sum % 8) };
}
