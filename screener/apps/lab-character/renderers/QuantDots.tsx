/**
 * QUANT-DOTS-01 — two fields flash, and the child says which had more.
 *
 * THE TIMING IS THE ITEM. This is a non-symbolic 2AFC: the approximate number system, measured by
 * showing two dot fields for a fixed `exposureMs` (1200ms at the bottom of the bank, 250ms at the top)
 * and then taking them away. If the fields stay up while the child answers, the item stops measuring
 * estimation and starts measuring counting, which is a different construct at a different difficulty.
 * So the exposure is honoured exactly, and three things follow from that:
 *
 *   1. THE CHILD OPENS THE WINDOW. Nothing flashes on mount. A fixed exposure spent while the child
 *      was looking at the ceiling is the one look they get, wasted, so the exposure starts from a tap.
 *      (The prebuilt renderer in `qbank-library/items/QUANT-DOTS-01.html` gates it the same way.)
 *   2. THE DOTS ARE MOUNTED FOR EXACTLY `exposureMs`. The shutters take a moment to open and close,
 *      but the dots are not on screen during either move — they appear when the windows are already
 *      open and are gone before the shutters start closing. The beat around the exposure is therefore
 *      deliberate without lengthening it, and the closing shutter reads as "that was the look".
 *   3. REDUCED MOTION SHORTENS THE SHUTTERS, NOT THE EXPOSURE. `prefers-reduced-motion` removes the
 *      shutter travel; `exposureMs` is untouched, because it is data rather than decoration.
 *
 * GEOMETRY. `dots` carry explicit `{x, y}` as percentages of a square field and `r` is a dot radius in
 * px against the generator's nominal 240px window (`WINDOW_PX` in its grammar). In a 100-unit box that
 * is `r / 2.4`. Both are drawn as given: `cueCondition` is `equal-size`, `area-controlled` or
 * `incongruent`, meaning dot size and total area are deliberately set relative to count, and rescaling
 * or re-scattering the dots would destroy the cue the item was built around.
 *
 * WHAT A DOT LOOKS LIKE IS THE WORLD'S BUSINESS. Each mark is a `Glyph` on the vocabulary's `dot`, laid
 * at the item's own coordinates, so a field of berries or a field of pips flashes instead of a field of
 * discs. It was a bare `<circle>` before and no world could touch it. The item's geometry is untouched
 * by this: the box a mark sits in is exactly the diameter the item asked for, and both fields are drawn
 * the same way, so every ratio the cue conditions control is preserved. A mark that does not fill its
 * own box therefore draws a little under the nominal size — which is the right way round, since the
 * alternative is letting a world's artwork grow into its neighbour and merge two dots into one.
 *
 * Options are `[{key:'L'},{key:'R'}]` and carry nothing else, so the side is the answer: the button
 * sits under the field it refers to and sends that field's key.
 */
import { useEffect, useId, useMemo, useState, type CSSProperties } from 'react';

import { Glyph, NEUTRAL_SKIN, type Skin } from '../shared/glyphs';
import type { RendererProps } from '../shared/types';

import './QuantDots.css';

interface Dot {
  x: number;
  y: number;
}

interface Field {
  count: number;
  r: number;
  dots: Dot[];
}

/** The generator's nominal window is 240px across and the field is drawn on a 100-unit box. */
const FIELD_PX = 240;
const UNITS = FIELD_PX / 100;

/**
 * The shape and the ink for every mark in this item, both explicit FALLBACKS.
 *
 * A field is `{count, r, dots:[{x,y}]}`: there is no shape name and no colour anywhere in the payload
 * to read, so they are named once, here, and resolved through `Glyph` and `skin.color` — which is what
 * lets a world answer with its own mark and its own value. The literals this replaces were
 * `skin.color('blue')` for the dots and `color="ink"` on the chevrons, asked for identically whatever
 * the item or the world said.
 *
 * The shutters take the same ink. They are furniture rather than part of the question, but they are the
 * one large surface in this renderer and leaving them on a fixed grey put a cold plate in the middle of
 * a warm world.
 */
const MARK_SHAPE = 'dot';
const MARK_INK = 'ink';

/** How long the shutters take to travel. Decoration, so reduced motion is allowed to remove it. */
const SHUTTER_MS = 380;

type Phase = 'ready' | 'opening' | 'exposed' | 'closing' | 'gone';

function asRecord(v: unknown): Record<string, unknown> {
  return v && typeof v === 'object' ? (v as Record<string, unknown>) : {};
}

function asList(v: unknown): unknown[] {
  return Array.isArray(v) ? v : [];
}

function asNumber(v: unknown, fallback = 0): number {
  return typeof v === 'number' && Number.isFinite(v) ? v : fallback;
}

function asText(v: unknown): string | undefined {
  return typeof v === 'string' && v.length > 0 ? v : undefined;
}

function readField(v: unknown): Field {
  const f = asRecord(v);
  const dots = asList(f.dots).map((raw) => {
    const d = asRecord(raw);
    return { x: asNumber(d.x, 50), y: asNumber(d.y, 50) };
  });
  return { count: asNumber(f.count, dots.length), r: asNumber(f.r, 12), dots };
}

function readKeys(v: unknown): string[] {
  const out: string[] = [];
  for (const raw of asList(v)) {
    const key = asText(asRecord(raw).key);
    if (key) out.push(key);
  }
  return out;
}

function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function DotField({ field, showing, skin }: { field: Field; showing: boolean; skin: Skin }) {
  // The diameter the item asked for, as a percentage of the field: `r` is px against a nominal 240px
  // window, and the field is 100 units across.
  const span = `${(2 * field.r) / UNITS}%`;
  return (
    <span className="qd-art" aria-hidden="true">
      {showing
        ? field.dots.map((dot, i) => (
            <span
              key={i}
              className="qd-dot"
              style={{ left: `${dot.x}%`, top: `${dot.y}%`, width: span } as CSSProperties}
            >
              <Glyph shape={MARK_SHAPE} color={MARK_INK} skin={skin} />
            </span>
          ))
        : null}
    </span>
  );
}

export default function QuantDots({
  content,
  onAnswer,
  answered,
  band,
  skin = NEUTRAL_SKIN,
}: RendererProps & { skin?: Skin }) {
  const [phase, setPhase] = useState<Phase>('ready');
  const [picked, setPicked] = useState<string | null>(null);
  const promptId = useId();

  const reduced = useMemo(prefersReducedMotion, []);

  const left = useMemo(() => readField(content.left), [content]);
  const right = useMemo(() => readField(content.right), [content]);
  const exposureMs = Math.max(80, asNumber(content.exposureMs, 800));
  const prompt = asText(content.prompt) ?? 'Which side had more dots?';

  // `[{key:'L'},{key:'R'}]` in this bank. Position carries the meaning, so L is drawn on the left and
  // R on the right; anything else falls back to the order the item listed.
  const keys = readKeys(content.options);
  const leftKey = keys.includes('L') ? 'L' : (keys[0] ?? 'L');
  const rightKey = keys.includes('R') ? 'R' : (keys[1] ?? 'R');

  const shutterMs = reduced ? 0 : SHUTTER_MS;

  useEffect(() => {
    if (phase === 'ready' || phase === 'gone') return undefined;
    const wait = phase === 'exposed' ? exposureMs : shutterMs;
    const next: Phase = phase === 'opening' ? 'exposed' : phase === 'exposed' ? 'closing' : 'gone';
    const timer = window.setTimeout(() => setPhase(next), wait);
    return () => window.clearTimeout(timer);
  }, [phase, exposureMs, shutterMs]);

  // If the stage hands us an item that is already answered, there is no look left to give.
  useEffect(() => {
    if (answered && phase === 'ready') setPhase('gone');
  }, [answered, phase]);

  const settled = answered || picked !== null;
  const live = phase === 'gone' && !settled;

  function choose(key: string) {
    if (!live) return;
    setPicked(key);
    onAnswer(key);
  }

  const shuttersOpen = phase === 'opening' || phase === 'exposed';
  const showing = phase === 'exposed';

  const caption =
    phase === 'ready'
      ? 'Two windows will open for a moment. Watch them both.'
      : shuttersOpen
        ? 'Watch.'
        : prompt;

  return (
    <section
      className="qd"
      data-band={band}
      data-phase={phase}
      data-settled={settled ? 'true' : undefined}
      style={
        {
          '--qd-shutter': skin.color(MARK_INK),
          '--qd-shutter-ms': `${shutterMs}ms`,
        } as CSSProperties
      }
    >
      <p className="qd-prompt" id={promptId}>
        {caption}
      </p>

      <div className="qd-fields">
        <div className="qd-window">
          <DotField field={left} showing={showing} skin={skin} />
          <div className="qd-shutter" data-open={shuttersOpen ? 'true' : undefined} aria-hidden="true" />
        </div>
        <div className="qd-window">
          <DotField field={right} showing={showing} skin={skin} />
          <div className="qd-shutter" data-open={shuttersOpen ? 'true' : undefined} aria-hidden="true" />
        </div>
      </div>

      {/* One footer well, whatever is in it, so the flash never moves the ground under a tap. */}
      <div className="qd-foot">
        {phase === 'ready' ? (
          <button type="button" className="qd-start" onClick={() => setPhase('opening')}>
            I am ready
          </button>
        ) : null}

        {phase === 'gone' ? (
          <div className="qd-choices" role="group" aria-labelledby={promptId}>
            {/* The chevron points at the window the button answers for. The glyph's base points
                down and rotation is in degrees, so 90 is left and 270 is right. */}
            {[
              { key: leftKey, label: 'Left', rotDeg: 90 },
              { key: rightKey, label: 'Right', rotDeg: 270 },
            ].map((side, i) => (
              <button
                key={side.key}
                type="button"
                className="qd-choice"
                style={{ '--i': i } as CSSProperties}
                onClick={() => choose(side.key)}
                aria-disabled={!live || undefined}
                aria-pressed={picked === side.key}
                data-chosen={picked ? String(picked === side.key) : undefined}
                aria-label={`${side.label} side had more dots`}
              >
                <span className="qd-choice-mark" aria-hidden="true">
                  <Glyph shape="chevron" color={MARK_INK} skin={skin} rotDeg={side.rotDeg} />
                </span>
                <span className="qd-choice-word">{side.label}</span>
              </button>
            ))}
          </div>
        ) : null}
      </div>

      {/* Said out loud once, so it is clear the windows closed on purpose. */}
      <p className="qd-said" role="status" aria-live="polite">
        {phase === 'gone' ? 'The windows are closed now.' : ''}
      </p>
    </section>
  );
}
