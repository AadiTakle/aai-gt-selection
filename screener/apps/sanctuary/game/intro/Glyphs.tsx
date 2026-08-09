import type { JSX } from 'react';

import type { Glyph } from './tutorial';

/**
 * THE HANDS, DRAWN.
 *
 * ══ WHY THESE EXIST AT ALL ════════════════════════════════════════════════════════════════════════
 *
 * "Hold the left button" is an instruction that a five-year-old cannot read and that no light on the
 * ground can express. A world marker answers WHERE; nothing in the world answers WHICH FINGER. So the
 * two channels are split cleanly: a mark on the grass for a place, and one of these beside Nan's face
 * for a control. Both are always accompanied by the spoken line, which is the channel a child who can do
 * neither still has.
 *
 * A picture of a mouse with one button lit is not reading. Neither is a cross of four keys with the top
 * one pressed and an arrow coming out of it. The letters on the caps are for whoever is sitting with
 * them, exactly as `stations/Beacon.tsx` argues about the E keycap on its press badge, and they are the
 * third cue rather than the first for the same reason.
 *
 * Every one animates by CSS class only, so `prefers-reduced-motion` in `intro.css` stops all of them in
 * one place and every one resolves to a legible still picture rather than to nothing.
 */

const CAP = '#fffaf0';
const CAP_EDGE = '#d8bb8c';
const MARK = '#6b4a2c';
const HONEY = '#ffd76b';
const HONEY_DEEP = '#e0ac3a';
const SHELL = '#f6ead3';

/** One keycap with a letter drawn as bars, so no font has to be present for it to read. */
function Cap({ x, y, letter, lit }: { x: number; y: number; letter: 'W' | 'A' | 'S' | 'D' | 'E' | 'Q'; lit?: boolean }): JSX.Element {
  const s = 22;
  return (
    <g transform={`translate(${x} ${y})`}>
      <rect x="0" y="3" width={s} height={s} rx="6" fill={lit ? HONEY_DEEP : CAP_EDGE} />
      <rect x="0" y="0" width={s} height={s} rx="6" fill={lit ? HONEY : CAP} />
      <g stroke={MARK} strokeWidth="2.4" strokeLinecap="round" fill="none" transform={`translate(${s / 2} ${s / 2})`}>
        {letter === 'W' ? <path d="M-6 -6 L-3.5 6 L0 -1.5 L3.5 6 L6 -6" /> : null}
        {letter === 'A' ? <path d="M-5.5 6 L0 -6 L5.5 6 M-3.4 1.6 H3.4" /> : null}
        {letter === 'S' ? <path d="M5 -4.6 Q-5 -8 -5 -2 Q-5 1 0 1 Q5 1 5 4 Q5 8 -5 4.6" /> : null}
        {letter === 'D' ? <path d="M-4 -6 V6 H0 Q6 6 6 0 Q6 -6 0 -6 Z" /> : null}
        {letter === 'E' ? <path d="M4.5 -6 H-4 V6 H4.5 M-4 0 H2.6" /> : null}
        {letter === 'Q' ? <path d="M0 -6 A6 6 0 1 0 0 6 A6 6 0 0 0 0 -6 M3 3 L6.5 7" /> : null}
      </g>
    </g>
  );
}

/**
 * A mouse, with one of its two buttons lit.
 *
 * Drawn as a body with a divided top rather than as an outline: at 56 pixels an outlined mouse is a
 * rounded rectangle, and the whole message is WHICH HALF, so the halves have to be filled shapes.
 */
function Mouse({ side }: { side: 'left' | 'right' | 'none' }): JSX.Element {
  return (
    <g transform="translate(38 8)">
      <rect x="0" y="4" width="44" height="62" rx="21" fill={CAP_EDGE} />
      <rect x="0" y="0" width="44" height="62" rx="21" fill={CAP} />
      {/* The two buttons. */}
      <path
        d="M0 21 V21 A21 21 0 0 1 21 0 H21 V25 H0 Z"
        fill={side === 'left' ? HONEY : SHELL}
        className={side === 'left' ? 'nb-pulse' : undefined}
      />
      <path
        d="M23 0 A21 21 0 0 1 44 21 V25 H23 Z"
        fill={side === 'right' ? HONEY : SHELL}
        className={side === 'right' ? 'nb-pulse' : undefined}
      />
      <path d="M22 0 V25" stroke={CAP_EDGE} strokeWidth="2" />
      <rect x="19" y="6" width="6" height="12" rx="3" fill={CAP_EDGE} />
      <rect x="0" y="0" width="44" height="62" rx="21" fill="none" stroke={CAP_EDGE} strokeWidth="2.5" />
    </g>
  );
}

/** The picture that goes with the line. 120 x 76 so it sits under a two-line card without stretching it. */
export function ControlGlyph({ glyph }: { glyph: Glyph }): JSX.Element | null {
  if (glyph === 'none') return null;

  return (
    <svg className="nb-glyph" viewBox="0 0 120 76" role="img" aria-label={LABELS[glyph]} focusable="false">
      {glyph === 'walk' ? (
        <g>
          {/* The cross, with W held down and a chevron leaving it. Direction is the message; the letters
              are the footnote. */}
          <Cap x="49" y="26" letter="W" lit />
          <Cap x="25" y="50" letter="A" />
          <Cap x="49" y="50" letter="S" />
          <Cap x="73" y="50" letter="D" />
          <g className="nb-rise" stroke={HONEY_DEEP} strokeWidth="4" strokeLinecap="round" fill="none">
            <path d="M60 20 L50 30 M60 20 L70 30" />
            <path d="M60 6 L50 16 M60 6 L70 16" opacity="0.5" />
          </g>
        </g>
      ) : null}

      {glyph === 'look' ? (
        <g>
          <Mouse side="none" />
          {/* Swept both ways, because looking is not a direction. */}
          <g className="nb-sweep" stroke={HONEY_DEEP} strokeWidth="4" strokeLinecap="round" fill="none">
            <path d="M30 22 Q60 2 90 22" />
            <path d="M30 22 L30 12 M30 22 L40 22" />
            <path d="M90 22 L90 12 M90 22 L80 22" />
          </g>
        </g>
      ) : null}

      {glyph === 'suck' ? (
        <g>
          <Mouse side="left" />
          {/* Arrows travelling INWARD: the picture of drawing something in. */}
          <g className="nb-inward" stroke={HONEY_DEEP} strokeWidth="4" strokeLinecap="round" fill="none">
            <path d="M12 20 L28 32 M28 32 L18 32 M28 32 L28 22" />
            <path d="M108 20 L92 32 M92 32 L102 32 M92 32 L92 22" />
          </g>
        </g>
      ) : null}

      {glyph === 'plop' ? (
        <g>
          <Mouse side="right" />
          {/* And outward, which is the same picture reversed — plus the key that does the same job. */}
          <g className="nb-outward" stroke={HONEY_DEEP} strokeWidth="4" strokeLinecap="round" fill="none">
            <path d="M28 32 L12 20 M12 20 L22 20 M12 20 L12 30" />
          </g>
          <Cap x="94" y="44" letter="Q" />
        </g>
      ) : null}

      {glyph === 'press' ? (
        <g>
          <Cap x="49" y="26" letter="E" lit />
          {/* Rings collapsing INWARD onto the cap. Outward rings are the picture of something emitting;
              inward rings are the picture of something being pushed. `stations/Beacon.tsx` settles this. */}
          <g fill="none" stroke={HONEY_DEEP} strokeWidth="3">
            <circle className="nb-ring nb-ring-a" cx="60" cy="37" r="18" />
            <circle className="nb-ring nb-ring-b" cx="60" cy="37" r="18" />
          </g>
        </g>
      ) : null}
    </svg>
  );
}

const LABELS: Record<Glyph, string> = {
  none: '',
  look: 'Move the mouse to look around',
  walk: 'Press W, A, S and D to walk',
  press: 'Press the E key',
  suck: 'Hold the left mouse button',
  plop: 'Press the right mouse button, or Q',
};
