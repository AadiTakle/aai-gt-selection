import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties, ReactNode } from 'react';

import type { ExperienceProps } from '../../shared/experience';
import type { ShapeName, Skin } from '../../shared/glyphs';
import { ItemStage } from '../../shared/ItemStage';
import { useScreenerSession } from '../../shared/useScreenerSession';

import './styles.css';

/* =============================================================================
   NIGHT CLINIC — band 2-3 (ages 7-9)

   THE PULL. Care-taking. A child of seven or eight is rarely the one who is needed, and being
   needed is the strongest motivation available at this age. So the framing is a job on a rota: it
   is the night shift, you are the one on, and animals arrive one at a time. Each item IS a patient.
   Working out the pattern is working out what this animal needs, which is why the question sits on
   the patient's chart rather than beside the animal in a panel of its own.

   WHAT PROGRESS MEANS HERE. Two things advance, and neither is marking. The window over the door
   lightens towards dawn as patients are seen, and the recovery row along the bottom fills with
   sleeping animals. Both move for turning up and finishing. Nothing anywhere moves for being right,
   nothing is ever shown as being not right, and the shift always ends at dawn with every patient
   well. There is no gate and no failure state; the only end is morning.

   ART DIRECTION. Warm lamplight against a cool dark room. The room is nearly flat: one radial pool
   of lamp warmth, no gradients doing decorative work. The one bright surface is the chart, which is
   cream paper with faint rules and a metal clip, and the questions are drawn on it. Everything the
   bank names abstractly is redrawn in CLINIC_DRAW below as a thing that belongs on that paper — a
   tablet, a gauze pad, a paw print, a rolled bandage, a line of stitches — so the pattern a child
   reads is a pattern of supplies and treatments rather than of coloured polygons.
   ============================================================================= */

/* ---- colour helpers ------------------------------------------------------- */

const CREAM = '#fdf6ea';
const SOOT = '#241d1a';

function hex(c: string): [number, number, number] {
  const h = c.replace('#', '');
  const n = parseInt(
    h.length === 3
      ? h
          .split('')
          .map((d) => d + d)
          .join('')
      : h,
    16,
  );
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/**
 * Mixed in JS rather than with `color-mix` so the animals draw identically wherever this runs, and
 * so a fur tone can be derived once at module scope instead of per render.
 */
function mix(a: string, b: string, t: number): string {
  const [r1, g1, b1] = hex(a);
  const [r2, g2, b2] = hex(b);
  const f = (x: number, y: number) => Math.round(x + (y - x) * t);
  return `rgb(${f(r1, r2)} ${f(g1, g2)} ${f(b1, b2)})`;
}

/* =============================================================================
   THE SKIN — the bank's vocabulary, redrawn as clinic supplies.

   Every drawing takes its body colour from `fill`, because colour is one of the attributes the
   items actually vary (`activeRules: ['color']` in the matrix bank, `activeAttrs: ['color']` in the
   carpet bank). A depiction that fixed its own colours would quietly destroy those items. Accents
   are therefore only ever cream at low opacity, which reads as lamplight on the object and never
   competes with the attribute.

   Silhouettes stay close to the abstract geometry they replace for the same reason: size and
   rotation are also live attributes, so a chevron has to still read as a chevron pointing somewhere
   once it has become a strip of tape.
   ============================================================================= */

const LIT = 'rgb(253 246 234 / 0.62)';
const LIT_SOFT = 'rgb(253 246 234 / 0.34)';

const CLINIC_DRAW: Record<string, (fill: string) => ReactNode> = {
  /* a round tablet, scored down the middle */
  circle: (f) => (
    <>
      <circle cx="50" cy="50" r="38" fill={f} />
      <rect x="46" y="14" width="8" height="72" rx="4" fill={LIT} />
      <circle cx="34" cy="34" r="8" fill={LIT_SOFT} />
    </>
  ),
  /* a small plain tablet */
  dot: (f) => (
    <>
      <circle cx="50" cy="50" r="27" fill={f} />
      <circle cx="41" cy="41" r="7" fill={LIT_SOFT} />
    </>
  ),
  /* a two-tone capsule */
  capsule: (f) => (
    <>
      <rect x="8" y="31" width="84" height="38" rx="19" fill={f} />
      <path d="M27 31H50V69H27A19 19 0 0 1 27 31Z" fill={LIT} />
      <rect x="16" y="38" width="9" height="10" rx="4" fill={LIT_SOFT} />
    </>
  ),
  /* a gauze pad, woven */
  square: (f) => (
    <>
      <rect x="12" y="12" width="76" height="76" rx="9" fill={f} />
      <path
        d="M33 12V88M67 12V88M12 33H88M12 67H88"
        stroke={LIT_SOFT}
        strokeWidth="5"
        fill="none"
      />
      <rect
        x="20"
        y="20"
        width="60"
        height="60"
        rx="5"
        fill="none"
        stroke={LIT}
        strokeWidth="3"
        strokeDasharray="7 7"
      />
    </>
  ),
  /* a hex vial cap */
  hexagon: (f) => (
    <>
      <path d="M50 8 87 29V71L50 92 13 71V29Z" fill={f} />
      <circle cx="50" cy="50" r="16" fill="none" stroke={LIT} strokeWidth="6" />
      <path d="M50 8 87 29 50 46 13 29Z" fill={LIT_SOFT} />
    </>
  ),
  /* an ointment tin, lid catching the lamp */
  pentagon: (f) => (
    <>
      <path d="M50 8 92 39 76 89H24L8 39Z" fill={f} />
      <path d="M50 8 92 39H8Z" fill={LIT_SOFT} />
      <rect x="30" y="52" width="40" height="9" rx="4" fill={LIT} />
    </>
  ),
  /* a paw print */
  star: (f) => (
    <>
      <ellipse cx="21" cy="45" rx="11" ry="14" fill={f} />
      <ellipse cx="40" cy="26" rx="11" ry="14" fill={f} />
      <ellipse cx="62" cy="24" rx="11" ry="14" fill={f} />
      <ellipse cx="81" cy="43" rx="11" ry="14" fill={f} />
      <path d="M51 44C69 44 84 58 84 71 84 85 68 92 51 92 34 92 18 85 18 71 18 58 33 44 51 44Z" fill={f} />
      <path d="M40 62C48 58 56 58 64 62" stroke={LIT_SOFT} strokeWidth="5" fill="none" strokeLinecap="round" />
    </>
  ),
  /* a folded triangle sling */
  triangle: (f) => (
    <>
      <path d="M50 12 90 84H10Z" fill={f} />
      <path d="M50 20V78" stroke={LIT} strokeWidth="4" fill="none" />
      <path d="M22 76 78 76" stroke={LIT_SOFT} strokeWidth="6" fill="none" strokeLinecap="round" />
    </>
  ),
  /* a throat lozenge */
  diamond: (f) => (
    <>
      <path d="M50 8 88 50 50 92 12 50Z" fill={f} />
      <path d="M34 50H66" stroke={LIT} strokeWidth="6" fill="none" strokeLinecap="round" />
      <path d="M50 8 74 36 50 50 26 36Z" fill={LIT_SOFT} />
    </>
  ),
  /* a strip of tape */
  chevron: (f) => (
    <>
      <path d="M14 22 50 48 86 22V48L50 74 14 48Z" fill={f} />
      <circle cx="34" cy="38" r="4" fill={LIT} />
      <circle cx="50" cy="49" r="4" fill={LIT} />
      <circle cx="66" cy="38" r="4" fill={LIT} />
    </>
  ),
  /* a syringe, laid on the diagonal like the bolt it replaces */
  bolt: (f) => (
    <g transform="rotate(-38 50 50)">
      <rect x="8" y="45" width="18" height="10" rx="3" fill={f} />
      <rect x="26" y="38" width="42" height="24" rx="4" fill={f} />
      <rect x="32" y="43" width="14" height="14" rx="3" fill={LIT} />
      <rect x="68" y="44" width="10" height="12" rx="3" fill={f} />
      <rect x="78" y="48" width="16" height="4" rx="2" fill={LIT_SOFT} />
    </g>
  ),
  /* the chart tag that hangs on a cage */
  flag: (f) => (
    <>
      <rect x="20" y="8" width="8" height="84" rx="4" fill={f} />
      <path d="M28 14C48 4 64 24 84 14V48C64 58 48 38 28 48Z" fill={f} />
      <path d="M36 24 72 24M36 38 66 38" stroke={LIT} strokeWidth="5" fill="none" strokeLinecap="round" />
    </>
  ),
  /* a cone collar, seen edge on */
  crescent: (f) => (
    <>
      <path d="M64 10a40 40 0 1 0 0 80 32 32 0 1 1 0-80Z" fill={f} />
      <path d="M56 26a26 26 0 1 0 0 48" stroke={LIT} strokeWidth="6" fill="none" strokeLinecap="round" />
    </>
  ),
  /* a rolled bandage */
  spiral: (f) => (
    <>
      <path
        d="M50 50a12 12 0 1 1 12 12 24 24 0 1 1-24-24 36 36 0 1 1 36 36"
        stroke={f}
        strokeWidth="13"
        strokeLinecap="round"
        fill="none"
      />
      <circle cx="50" cy="50" r="5" fill={LIT} />
    </>
  ),
  /* three cotton balls */
  trefoil: (f) => (
    <>
      <circle cx="50" cy="30" r="19" fill={f} />
      <circle cx="30" cy="68" r="19" fill={f} />
      <circle cx="70" cy="68" r="19" fill={f} />
      <circle cx="44" cy="24" r="6" fill={LIT_SOFT} />
      <circle cx="24" cy="62" r="6" fill={LIT_SOFT} />
      <circle cx="64" cy="62" r="6" fill={LIT_SOFT} />
    </>
  ),
  /* a line of stitches */
  zigzag: (f) => (
    <>
      <path d="M10 70 30 30 50 70 70 30 90 70" stroke={f} strokeWidth="9" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <path d="M20 50 32 56M40 50 52 56M60 50 72 56" stroke={LIT} strokeWidth="4" fill="none" strokeLinecap="round" />
    </>
  ),
  /* a drop of medicine */
  teardrop: (f) => (
    <>
      <path d="M50 10C68 34 82 48 82 62A32 32 0 1 1 18 62C18 48 32 34 50 10Z" fill={f} />
      <ellipse cx="38" cy="60" rx="8" ry="12" fill={LIT_SOFT} />
    </>
  ),
  /* the same drop, still on the dropper */
  drop: (f) => (
    <>
      <rect x="42" y="4" width="16" height="16" rx="5" fill={LIT_SOFT} />
      <path d="M50 20C66 42 78 54 78 66A28 28 0 1 1 22 66C22 54 34 42 50 20Z" fill={f} />
      <ellipse cx="40" cy="64" rx="7" ry="10" fill={LIT_SOFT} />
    </>
  ),
  /* a poultice leaf */
  leaf: (f) => (
    <>
      <path d="M50 10C78 28 84 58 50 92 16 58 22 28 50 10Z" fill={f} />
      <path d="M50 22V82" stroke={LIT} strokeWidth="4" fill="none" strokeLinecap="round" />
      <path d="M50 44 66 34M50 58 34 48M50 70 64 60" stroke={LIT_SOFT} strokeWidth="4" fill="none" strokeLinecap="round" />
    </>
  ),
  /* a soft compress */
  petal: (f) => (
    <>
      <path d="M50 8C82 26 82 62 50 92 18 62 18 26 50 8Z" fill={f} />
      <path d="M32 50C42 42 58 42 68 50" stroke={LIT} strokeWidth="5" fill="none" strokeLinecap="round" />
    </>
  ),
  /* a feed block */
  cube: (f) => (
    <>
      <path d="M50 10 86 30 50 50 14 30Z" fill={mix(CREAM, SOOT, 0.06)} opacity="0.55" />
      <path d="M14 30 50 50V90L14 70Z" fill={f} />
      <path d="M86 30 50 50V90L86 70Z" fill={f} opacity="0.72" />
      <path d="M50 10 86 30 50 50 14 30Z" fill={LIT_SOFT} />
    </>
  ),
  /* a name tag on its ring */
  kite: (f) => (
    <>
      <path d="M50 6 82 42 50 94 18 42Z" fill={f} />
      <circle cx="50" cy="28" r="7" fill={CREAM} opacity="0.8" />
      <path d="M34 52 66 52M38 66 62 66" stroke={LIT} strokeWidth="4" fill="none" strokeLinecap="round" />
    </>
  ),
  /* a cage latch */
  hook: (f) => (
    <>
      <path
        d="M34 12V52a20 20 0 0 0 40 0"
        stroke={f}
        strokeWidth="13"
        strokeLinecap="round"
        fill="none"
      />
      <circle cx="34" cy="12" r="9" fill={f} />
      <circle cx="34" cy="12" r="4" fill={LIT} />
    </>
  ),
  /* a little cast boot */
  boot: (f) => (
    <>
      <path d="M34 10h30v46l24 10a10 10 0 0 1 6 10v10H34Z" fill={f} />
      <path d="M34 76h60v10H34Z" fill={LIT_SOFT} />
      <path d="M40 26 60 26M40 40 60 40" stroke={LIT} strokeWidth="5" fill="none" strokeLinecap="round" />
    </>
  ),
  /* a cotton swab, curled */
  comma: (f) => (
    <>
      <path d="M62 22C84 38 78 70 48 82 60 66 62 46 40 42Z" fill={f} />
      <circle cx="52" cy="26" r="11" fill={LIT} />
    </>
  ),
};

/**
 * The bank colours (`teal`, `ink`, `violet`, `blue`, `gold`, `coral`) mapped onto pigments that sit
 * on cream paper under a lamp: tonic green, charcoal, tincture, saline, syrup, iodine. The neutral
 * palette's own names are kept as well so nothing falls through to a default teal.
 */
const PIGMENT: Record<string, string> = {
  teal: '#2f8b7d',
  ink: '#39474f',
  violet: '#7a5aa4',
  blue: '#3a76a8',
  gold: '#b3801c',
  coral: '#cb5a3f',
  crimson: '#b34260',
  amber: '#b3801c',
  indigo: '#4a5aa0',
  lime: '#6f8f2a',
  slate: '#5b6b7a',
  rose: '#c06a7e',
};

const CLINIC_SKIN: Skin = {
  id: 'night-clinic',
  color: (name) => PIGMENT[name] ?? PIGMENT.ink!,
  /**
   * Typed against ShapeName to honour the interface, read as a plain string on the way in: the
   * banks use eight names (`kite`, `dot`, `capsule`, `petal`, `hook`, `boot`, `comma`, `drop`) that
   * are not in ShapeName, and a renderer that hands them straight through should still get a
   * drawing rather than a fallback.
   */
  draw: (shape: ShapeName, fill: string) => CLINIC_DRAW[shape as string]?.(fill),
};

/* =============================================================================
   THE PATIENTS
   ============================================================================= */

type AnimalKind =
  | 'cat'
  | 'rabbit'
  | 'hedgehog'
  | 'owl'
  | 'fox'
  | 'tortoise'
  | 'duckling'
  | 'mouse'
  | 'puppy'
  | 'lamb';

interface Patient {
  kind: AnimalKind;
  name: string;
  fur: string;
  /** What this one came in with. Short, mild, and always fixable. */
  need: string;
  /** The in-world reaction once this one has been seen. Never a judgement, always a change of state. */
  settled: string;
}

const PATIENTS: readonly Patient[] = [
  { kind: 'cat', name: 'Mo', fur: '#b9a893', need: 'Mo has a sore paw.', settled: 'Paw wrapped. Mo is asleep.' },
  { kind: 'rabbit', name: 'Nell', fur: '#e2d7c7', need: 'Nell will not eat.', settled: 'Nell ate a little. She rests.' },
  { kind: 'hedgehog', name: 'Pip', fur: '#a58a72', need: 'Pip has a thorn in his foot.', settled: 'The thorn is out. Pip curls up.' },
  { kind: 'owl', name: 'Otto', fur: '#c9a97e', need: 'Otto hurt his wing.', settled: 'Wing in a sling. Otto sleeps.' },
  { kind: 'fox', name: 'Roo', fur: '#d98a5b', need: 'Roo bumped his nose.', settled: 'Nose cleaned. Roo yawns.' },
  { kind: 'tortoise', name: 'Tam', fur: '#8fa98d', need: 'Tam is too cold.', settled: 'Warm pad on. Tam tucks in.' },
  { kind: 'duckling', name: 'Bud', fur: '#e8c470', need: 'Bud has a cough.', settled: 'One drop of syrup. Bud settles.' },
  { kind: 'mouse', name: 'Ada', fur: '#c6b7b2', need: 'Ada has an itchy ear.', settled: 'Ear cleaned. Ada is calm.' },
  { kind: 'puppy', name: 'Sam', fur: '#cba172', need: 'Sam will not sit still.', settled: 'Sam had a long drink. He is calm.' },
  { kind: 'lamb', name: 'Ivy', fur: '#efe6da', need: 'Ivy has a cut on her leg.', settled: 'Cut is clean. Ivy lies down.' },
];

/**
 * The animals, drawn on a 120x110 box with the ground at y=96 so a blanket can be laid across all
 * ten at the same height. Two tones are derived from the fur colour and one cream, which is what
 * keeps ten different creatures looking like they came out of the same set of pencils.
 */
const ANIMALS: Record<AnimalKind, (fur: string) => ReactNode> = {
  cat: (fur) => {
    const d = mix(fur, SOOT, 0.4);
    const l = mix(fur, CREAM, 0.5);
    return (
      <>
        <path d="M90 86C112 82 108 56 96 54" stroke={d} strokeWidth="10" strokeLinecap="round" fill="none" />
        <ellipse cx="60" cy="74" rx="31" ry="22" fill={fur} />
        <path d="M40 30 35 9 56 23Z" fill={d} />
        <path d="M80 30 85 9 64 23Z" fill={d} />
        <path d="M42 28 40 16 52 24Z" fill={l} />
        <path d="M78 28 80 16 68 24Z" fill={l} />
        <circle cx="60" cy="45" r="24" fill={fur} />
        <ellipse cx="60" cy="56" rx="13" ry="9" fill={l} />
        <path d="M45 43q6 6 12 0M63 43q6 6 12 0" stroke={SOOT} strokeWidth="3" fill="none" strokeLinecap="round" />
        <path d="M60 52 55 57h10Z" fill={d} />
        <path d="M46 58 30 55M46 62 31 64M74 58 90 55M74 62 89 64" stroke={l} strokeWidth="2" fill="none" strokeLinecap="round" />
      </>
    );
  },
  rabbit: (fur) => {
    const d = mix(fur, SOOT, 0.34);
    const l = mix(fur, CREAM, 0.55);
    return (
      <>
        <circle cx="30" cy="78" r="9" fill={l} />
        <ellipse cx="62" cy="76" rx="27" ry="20" fill={fur} />
        <path d="M47 34C40 8 46 2 52 4 59 6 56 22 55 34Z" fill={fur} />
        <path d="M74 34C81 8 75 2 69 4 62 6 65 22 66 34Z" fill={fur} />
        <path d="M49 30C45 12 49 8 52 10 56 12 54 22 53 30Z" fill={l} />
        <path d="M72 30C76 12 72 8 69 10 65 12 67 22 68 30Z" fill={l} />
        <circle cx="60" cy="50" r="21" fill={fur} />
        <ellipse cx="60" cy="59" rx="11" ry="8" fill={l} />
        <path d="M47 48q6 6 12 0M61 48q6 6 12 0" stroke={SOOT} strokeWidth="3" fill="none" strokeLinecap="round" />
        <path d="M60 55 56 59h8Z" fill={d} />
      </>
    );
  },
  hedgehog: (fur) => {
    const d = mix(fur, SOOT, 0.42);
    const l = mix(fur, CREAM, 0.52);
    return (
      <>
        <path
          d="M16 92 24 62 32 78 40 50 48 72 57 44 66 68 74 48 82 74 90 60 96 92Z"
          fill={d}
        />
        <path d="M20 92 26 74 34 86 42 66 50 84 58 62 66 82 74 66 82 84 90 74 94 92Z" fill={fur} />
        <ellipse cx="98" cy="80" rx="16" ry="12" fill={l} />
        <circle cx="112" cy="78" r="4" fill={SOOT} />
        <path d="M92 76q5 5 10 0" stroke={SOOT} strokeWidth="3" fill="none" strokeLinecap="round" />
      </>
    );
  },
  owl: (fur) => {
    const d = mix(fur, SOOT, 0.36);
    const l = mix(fur, CREAM, 0.6);
    return (
      <>
        <path d="M60 14C88 14 98 44 98 64 98 86 82 96 60 96 38 96 22 86 22 64 22 44 32 14 60 14Z" fill={fur} />
        <path d="M40 20 34 6 50 16Z" fill={d} />
        <path d="M80 20 86 6 70 16Z" fill={d} />
        <path d="M26 50C22 68 28 84 40 92 30 84 26 66 26 50Z" fill={d} />
        <circle cx="47" cy="50" r="17" fill={l} />
        <circle cx="73" cy="50" r="17" fill={l} />
        <path d="M38 50q9 8 18 0M64 50q9 8 18 0" stroke={SOOT} strokeWidth="3.5" fill="none" strokeLinecap="round" />
        <path d="M60 54 67 66H53Z" fill="#b3801c" />
        <path d="M50 92 44 100M70 92 76 100" stroke="#b3801c" strokeWidth="5" fill="none" strokeLinecap="round" />
      </>
    );
  },
  fox: (fur) => {
    const d = mix(fur, SOOT, 0.38);
    const l = mix(fur, CREAM, 0.62);
    return (
      <>
        <path d="M32 86C6 84 6 50 28 48 40 47 44 62 36 72Z" fill={fur} />
        <path d="M18 54C6 60 8 78 20 84 12 74 12 62 18 54Z" fill={l} />
        <ellipse cx="66" cy="76" rx="28" ry="20" fill={fur} />
        <path d="M46 32 38 10 60 24Z" fill={d} />
        <path d="M84 32 92 10 70 24Z" fill={d} />
        <circle cx="65" cy="48" r="23" fill={fur} />
        <path d="M84 44 108 54 84 62Z" fill={l} />
        <circle cx="106" cy="55" r="4" fill={SOOT} />
        <path d="M52 46q6 6 12 0M70 46q6 6 12 0" stroke={SOOT} strokeWidth="3" fill="none" strokeLinecap="round" />
        <ellipse cx="62" cy="60" rx="12" ry="7" fill={l} />
      </>
    );
  },
  tortoise: (fur) => {
    const d = mix(fur, SOOT, 0.4);
    const l = mix(fur, CREAM, 0.5);
    return (
      <>
        <rect x="28" y="80" width="16" height="18" rx="7" fill={d} />
        <rect x="70" y="80" width="16" height="18" rx="7" fill={d} />
        <path d="M14 86C14 54 34 40 58 40 82 40 100 54 100 86Z" fill={fur} />
        <path d="M32 86C32 62 44 52 58 52 72 52 84 62 84 86Z" fill={l} opacity="0.5" />
        <path d="M58 40V86M32 62 84 62" stroke={d} strokeWidth="3.5" fill="none" />
        <ellipse cx="110" cy="76" rx="13" ry="10" fill={d} />
        <path d="M104 74q5 5 10 0" stroke={SOOT} strokeWidth="3" fill="none" strokeLinecap="round" />
      </>
    );
  },
  duckling: (fur) => {
    const d = mix(fur, SOOT, 0.3);
    const l = mix(fur, CREAM, 0.55);
    return (
      <>
        <circle cx="56" cy="72" r="26" fill={fur} />
        <path d="M40 60C30 70 32 88 44 94 34 86 32 70 40 60Z" fill={l} />
        <circle cx="76" cy="40" r="19" fill={fur} />
        <path d="M70 22 66 12M77 21 78 10M84 24 90 15" stroke={d} strokeWidth="4" fill="none" strokeLinecap="round" />
        <path d="M92 38q16 2 13 9-2 5-15 1Z" fill="#b3801c" />
        <path d="M69 40q6 5 12 0" stroke={SOOT} strokeWidth="3" fill="none" strokeLinecap="round" />
        <path d="M46 96 38 104M64 96 72 104" stroke="#b3801c" strokeWidth="5" fill="none" strokeLinecap="round" />
      </>
    );
  },
  mouse: (fur) => {
    const d = mix(fur, SOOT, 0.34);
    const l = mix(fur, CREAM, 0.55);
    return (
      <>
        <path d="M92 84C110 84 114 70 106 62" stroke={d} strokeWidth="6" strokeLinecap="round" fill="none" />
        <circle cx="38" cy="38" r="16" fill={fur} />
        <circle cx="82" cy="38" r="16" fill={fur} />
        <circle cx="38" cy="38" r="9" fill={l} />
        <circle cx="82" cy="38" r="9" fill={l} />
        <path d="M60 26C80 26 92 60 92 76 92 90 78 96 60 96 42 96 28 90 28 76 28 60 40 26 60 26Z" fill={fur} />
        <path d="M48 56q6 6 12 0M62 56q6 6 12 0" stroke={SOOT} strokeWidth="3" fill="none" strokeLinecap="round" />
        <ellipse cx="60" cy="76" rx="11" ry="8" fill={l} />
        <circle cx="60" cy="74" r="4" fill={d} />
      </>
    );
  },
  puppy: (fur) => {
    const d = mix(fur, SOOT, 0.36);
    const l = mix(fur, CREAM, 0.55);
    return (
      <>
        <path d="M88 82C104 78 104 62 96 56" stroke={d} strokeWidth="9" strokeLinecap="round" fill="none" />
        <ellipse cx="60" cy="76" rx="29" ry="20" fill={fur} />
        <ellipse cx="34" cy="48" rx="11" ry="19" fill={d} />
        <ellipse cx="86" cy="48" rx="11" ry="19" fill={d} />
        <circle cx="60" cy="46" r="23" fill={fur} />
        <ellipse cx="60" cy="58" rx="16" ry="11" fill={l} />
        <path d="M46 44q6 6 12 0M62 44q6 6 12 0" stroke={SOOT} strokeWidth="3" fill="none" strokeLinecap="round" />
        <ellipse cx="60" cy="54" rx="7" ry="5" fill={SOOT} />
      </>
    );
  },
  lamb: (fur) => {
    const d = mix(fur, SOOT, 0.44);
    const l = mix(fur, CREAM, 0.4);
    return (
      <>
        <rect x="40" y="82" width="8" height="16" rx="4" fill={d} />
        <rect x="64" y="82" width="8" height="16" rx="4" fill={d} />
        <circle cx="36" cy="70" r="17" fill={l} />
        <circle cx="58" cy="62" r="20" fill={l} />
        <circle cx="46" cy="84" r="15" fill={l} />
        <circle cx="72" cy="80" r="16" fill={l} />
        <circle cx="78" cy="62" r="14" fill={l} />
        <ellipse cx="94" cy="56" rx="13" ry="15" fill={d} />
        <ellipse cx="82" cy="46" rx="8" ry="5" fill={d} />
        <ellipse cx="106" cy="48" rx="8" ry="5" fill={d} />
        <path d="M88 54q6 5 12 0" stroke={CREAM} strokeWidth="3" fill="none" strokeLinecap="round" />
        <circle cx="99" cy="66" r="3" fill={CREAM} opacity="0.7" />
      </>
    );
  },
};

/** One animal, optionally under a blanket. The blanket is the same for every patient on purpose. */
function Animal({
  patient,
  asleep = false,
  className,
}: {
  patient: Patient;
  asleep?: boolean;
  className?: string;
}) {
  return (
    <svg viewBox="0 0 124 110" className={className} role="img" aria-label={patient.name}>
      <g className="pc-breathe">
        {ANIMALS[patient.kind](patient.fur)}
        {/* One blanket for every patient, laid at the same height on all ten, tucked low enough
            that each animal's face still shows above it in the recovery row. */}
        {asleep ? (
          <g className="pc-quilt">
            <path d="M8 78H116V96Q62 104 8 96Z" fill="#3d7a70" />
            <path d="M8 78H116V85Q62 92 8 85Z" fill="#dfe9e4" opacity="0.7" />
            <path d="M30 89 37 96M52 90 59 97M74 90 81 97M96 89 103 96" stroke="#2b5c55" strokeWidth="3" fill="none" strokeLinecap="round" />
          </g>
        ) : null}
      </g>
    </svg>
  );
}

/* =============================================================================
   COPY
   ============================================================================= */

const WORDS = [
  'No',
  'One',
  'Two',
  'Three',
  'Four',
  'Five',
  'Six',
  'Seven',
  'Eight',
  'Nine',
  'Ten',
  'Eleven',
  'Twelve',
] as const;

function word(n: number): string {
  return WORDS[n] ?? String(n);
}

function shuffled<T>(list: readonly T[]): T[] {
  const out = list.slice();
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    const a = out[i] as T;
    const b = out[j] as T;
    out[i] = b;
    out[j] = a;
  }
  return out;
}

/* =============================================================================
   THE WORLD
   ============================================================================= */

export default function PetClinic({ onExit }: ExperienceProps) {
  const s = useScreenerSession({ band: '2-3', precisionIndex: 1, settleMs: 1100 });

  /** The night's rota, fixed when the world opens so a patient never changes mid-visit. */
  const [rota] = useState(() => shuffled(PATIENTS));
  const [cursor, setCursor] = useState(0);
  const [resting, setResting] = useState<number[]>([]);

  const cursorRef = useRef(0);
  cursorRef.current = cursor;
  const prevPhase = useRef(s.phase);

  /**
   * A patient moves to the recovery row on the beat AFTER the settle reaction, which is the moment
   * the session hands over the next item. Doing it on the answer instead would tuck the animal in
   * before the child had seen it react, and the reaction is the whole reward.
   */
  useEffect(() => {
    const before = prevPhase.current;
    prevPhase.current = s.phase;
    if (before === 'settling' && (s.phase === 'asking' || s.phase === 'done')) {
      const idx = cursorRef.current;
      setResting((r) => (r.includes(idx) ? r : [...r, idx]));
      setCursor((c) => c + 1);
    }
  }, [s.phase]);

  const patient = rota[cursor % rota.length] ?? PATIENTS[0]!;

  /** Dawn: driven by patients seen, never by how they were answered. Morning is unconditional. */
  const target = s.expected?.max ?? 10;
  const dawn =
    s.phase === 'done' ? 1 : Math.min(0.86, s.answeredCount / Math.max(4, target)) * 0.95;

  const openDoors = useCallback(() => {
    void s.start();
  }, [s]);

  const tryAgain = useCallback(() => {
    s.reset();
    setCursor(0);
    setResting([]);
    void s.start();
  }, [s]);

  const seen = resting.length;

  const rootStyle = useMemo(
    () => ({ ['--pc-dawn' as string]: String(dawn) }) as CSSProperties,
    [dawn],
  );

  return (
    <div className="pc-root" style={rootStyle}>
      <div className="pc-night" aria-hidden="true" />
      <div className="pc-daybreak" aria-hidden="true" />
      <div className="pc-lamplight" aria-hidden="true" />

      <div className="pc-frame">
        <header className="pc-bar">
          <span className="pc-window" aria-hidden="true">
            <span className="pc-sky" />
            <span className="pc-moon" />
            <span className="pc-sun" />
            <span className="pc-mullion" />
          </span>
          <span className="pc-bar-text">
            <span className="pc-kicker">{s.phase === 'done' ? 'Morning' : 'Night shift'}</span>
            <span className="pc-place">Night Clinic</span>
          </span>
          <button type="button" className="pc-leave" onClick={onExit}>
            Leave
          </button>
        </header>

        <main className="pc-main">
          {(s.phase === 'idle' || s.phase === 'starting') && (
            <section className="pc-panel pc-enter" key="door">
              <p className="pc-eyebrow">You are on tonight</p>
              <h1 className="pc-title">The clinic is open all night.</h1>
              <p className="pc-lede">
                Animals come in one at a time. Each one has a chart. Read the chart, and you will
                know what that animal needs.
              </p>
              <button
                type="button"
                className="pc-big"
                onClick={openDoors}
                disabled={s.phase === 'starting'}
              >
                {s.phase === 'starting' ? 'Turning on the lamp…' : 'Open the doors'}
              </button>
              <p className="pc-fineprint">You can stop any time. The animals will be fine.</p>
            </section>
          )}

          {(s.phase === 'asking' || s.phase === 'settling') && (
            <section className="pc-shift">
              <div
                className="pc-patient"
                key={`${cursor}-${patient.name}`}
                data-settled={s.phase === 'settling' ? 'yes' : 'no'}
              >
                <span className="pc-cot" aria-hidden="true" />
                <Animal
                  patient={patient}
                  asleep={s.phase === 'settling'}
                  className="pc-animal"
                />
                <span className="pc-id">
                  <span className="pc-name">{patient.name}</span>
                  <span className="pc-need">{patient.need}</span>
                </span>
              </div>

              <div className="pc-chart">
                <span className="pc-clip" aria-hidden="true" />
                <p className="pc-chartlabel">{patient.name} · chart</p>
                <div className="pc-chartbody">
                  {s.serve ? (
                    <ItemStage
                      serve={s.serve}
                      band="2-3"
                      onAnswer={s.answer}
                      answered={s.phase !== 'asking'}
                      skin={CLINIC_SKIN}
                    />
                  ) : (
                    <div className="pc-hold" aria-hidden="true" />
                  )}
                </div>
              </div>

              {/*
                The one text slot the world speaks through, and the only place it speaks: reassurance
                while the chart is live, the patient's reaction once it has been seen. Deliberately
                NOT an instruction — each item type states its own task on the paper ("Watch.",
                "Which pattern comes out?"), and a second voice telling the child to pick something
                would contradict the ones that ask them to wait and watch first.

                role=status so the reaction is announced; the span is keyed so the line re-animates
                per patient without remounting the live region.
              */}
              <p className="pc-say" role="status">
                <span
                  className="pc-say-line"
                  key={`${cursor}-${s.phase}`}
                  data-mood={s.phase === 'settling' ? 'settled' : 'asking'}
                >
                  {s.phase === 'settling'
                    ? patient.settled
                    : `Take your time. ${patient.name} is not in a hurry.`}
                </span>
              </p>
            </section>
          )}

          {s.phase === 'done' && (
            <section className="pc-panel pc-enter" key="dawn">
              <p className="pc-eyebrow">The sun is up</p>
              <h1 className="pc-title">Every animal here is well.</h1>
              <p className="pc-lede">
                {seen > 0
                  ? `${word(seen)} came in tonight. ${word(seen)} are asleep and warm.`
                  : 'The clinic stayed quiet tonight. Everyone is asleep and warm.'}
              </p>
              <button type="button" className="pc-big" onClick={onExit}>
                Hand over the keys
              </button>
              <p className="pc-fineprint">You were needed. Thank you for staying up.</p>
            </section>
          )}

          {s.phase === 'error' && (
            <section className="pc-panel pc-enter" key="quiet">
              <p className="pc-eyebrow">All quiet</p>
              <h1 className="pc-title">The doors will not open.</h1>
              <p className="pc-lede">
                The animals are all fine. We can wait a moment and try, or head home.
              </p>
              <div className="pc-pair">
                <button type="button" className="pc-big" onClick={tryAgain}>
                  Try the doors
                </button>
                <button type="button" className="pc-big pc-big--plain" onClick={onExit}>
                  Head home
                </button>
              </div>
              <p className="pc-fineprint pc-detail">{s.error}</p>
            </section>
          )}
        </main>

        <footer className="pc-recovery">
          <p className="pc-recovery-label" data-empty={seen === 0 ? 'yes' : 'no'}>
            {seen === 0 ? 'Recovery row' : `Recovery row · ${word(seen).toLowerCase()} resting`}
          </p>
          <ul className="pc-beds">
            {resting.map((idx, i) => {
              const p = rota[idx % rota.length] ?? PATIENTS[0]!;
              return (
                <li
                  className="pc-bed"
                  key={`${idx}-${p.name}`}
                  style={{ ['--pc-i' as string]: String(i) } as CSSProperties}
                >
                  <Animal patient={p} asleep className="pc-bed-animal" />
                  <span className="pc-bed-name">{p.name}</span>
                </li>
              );
            })}
          </ul>
        </footer>
      </div>
    </div>
  );
}
