/**
 * THE RIVAL — band 6-8.
 *
 * A tamers' circuit, late, one table left lit. The child has drawn Vesk, who reads creature
 * matchups faster than anyone here and is candid about it. Every item is one matchup call: traits
 * and lineage decide what holds against what.
 *
 * WHY IT IS BUILT THIS WAY, since the band is the whole reason for the choices:
 *
 * RIVALRY RATHER THAN PRAISE. Eleven to fourteen reads encouragement as condescension, so nothing
 * in here congratulates anyone. Vesk is dry, faintly arrogant and never cruel, and what he says is
 * about the matchups rather than about the child. He is the reason to keep going.
 *
 * FEEDBACK IS DEFERRED AND IS NOT A VERDICT. Nothing reacts per item. Every fourth call the table
 * resolves: Vesk says his piece and the exchange is recapped by WHAT IT TURNED ON — lineage, mass,
 * stance — never by how it went. There is deliberately no record kept against him. A win-loss
 * tally would make his respect performance-contingent, and his respect is the ending, which every
 * child reaches. See CONCEDE.
 *
 * PROGRESS COUNTS TURNING UP. The rail's notches advance on answering, full stop. They move
 * identically whichever option was chosen.
 *
 * THE SKIN IS THE POINT. `MT_SKIN` redraws all seventeen abstract shape names as engraved creature
 * marks and trait sigils, so the questions are inside this world rather than framed by it. Notes on
 * the two constraints that shaped it are at PALETTE and MARKS.
 */
import { Component, useCallback, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';

import type { ExperienceProps } from '../../shared/experience';
import { Glyph } from '../../shared/glyphs';
import type { ShapeName, Skin } from '../../shared/glyphs';
import { ItemStage } from '../../shared/ItemStage';
import { useScreenerSession } from '../../shared/useScreenerSession';

import './styles.css';

/* ===========================================================================
   PALETTE

   The world's chrome is near-black plus ONE hot accent, and the accent is scarce: notches, the
   crest's eye slits, focus, one rule under a heading.

   The item glyphs cannot be monochrome, and that is not a lapse in the art direction. The banks
   express real rules in colour — a matrix row can be "same shape, colour advances" — so collapsing
   six colour names onto one accent would make those items unanswerable. Six names therefore stay
   six values. What keeps it from reading as a rainbow is that only ONE of the six is hot, and it is
   the same hot as the chrome: `coral` IS the accent. The other five are deliberately low-chroma.

   Every value is mid-luminance on purpose. The renderers under `renderers/` draw their own tap
   targets and some of them are light plates, so a mark has to stay legible on near-black AND on
   white. `ink` is the one that shows this most: a true ink would vanish on this background, so it
   is a steel grey that reads either way.
   =========================================================================== */

const HOT = '#ff3d5a';

const FACTION: Record<string, string> = {
  /* the six the 6-8 pool actually serves */
  coral: HOT,
  teal: '#16968c',
  blue: '#3a6fc9',
  violet: '#7d55c8',
  gold: '#bf8f2a',
  ink: '#7b8393',
  /* names from the neutral palette and other banks, so nothing ever falls through to a default */
  crimson: HOT,
  rose: HOT,
  jade: '#16968c',
  mint: '#16968c',
  lime: '#16968c',
  azure: '#3a6fc9',
  indigo: '#3a6fc9',
  purple: '#7d55c8',
  amber: '#bf8f2a',
  slate: '#7b8393',
};

const RAMP = [HOT, '#16968c', '#3a6fc9', '#7d55c8', '#bf8f2a', '#7b8393'];

/**
 * Some banks carry raw hex in `color` rather than a name. Passing it through would let another
 * palette leak into this world, so it is hashed onto the ramp instead: still stable per value, so
 * an item whose rule is "these two match" still shows two matching marks.
 */
function factionColor(name: string): string {
  const named = FACTION[name];
  if (named) return named;
  let h = 2166136261;
  for (let i = 0; i < name.length; i += 1) h = (Math.imul(h, 16777619) ^ name.charCodeAt(i)) >>> 0;
  return RAMP[h % RAMP.length] ?? HOT;
}

/* ===========================================================================
   MARKS — the creature marks and trait sigils the questions are drawn with.

   Construction is the same for all of them so they read as one bestiary: a bold silhouette with the
   interior CUT OUT rather than overpainted. The cuts are even-odd holes, so a mark shows whatever
   is behind it and survives being dropped onto a renderer's white plate or onto this world's
   near-black — nothing is hard-coded to one background.

   Each silhouette keeps the family of the abstract shape it stands for, because that is what the
   item's shape rule is expressed in and a child has to be able to tell two of them apart.

   Every mark is also deliberately ASYMMETRIC — an off-centre pupil, vents down one flank, a chipped
   corner. Several types carry a `rot` attribute and rotation is only a visible rule if the mark
   looks different turned, which the shared geometric primitives mostly do not.

   The extra names past the seventeen (kite, petal, hook, boot, comma, drop, capsule, dot) are the
   bank's own vocabulary. `Glyph` folds any name it lacks a path for down to `circle` before a skin
   is consulted, so these normally never arrive — the renderers alias them first. They are here so
   that a renderer which hands its raw name straight to `skin.draw` still gets a distinct mark
   rather than a circle. See the note at the end of this file.
   =========================================================================== */

type MarkFn = (fill: string) => ReactNode;

/** One silhouette, one or more holes, drawn as a single even-odd path. */
const cut = (d: string): MarkFn => (fill) => <path d={d} fill={fill} fillRule="evenodd" />;

const MARKS: Record<string, MarkFn> = {
  /* SPIKED CREST */
  star: cut(
    'M50 4 62 36 96 38 69 58 79 92 50 72 21 92 31 58 4 38 38 36Z' +
      'M50 33 59 47 49 61 41 47Z',
  ),
  /* SHIELD */
  pentagon: cut(
    'M50 5 94 33 78 92 22 92 6 33Z' +
      'M30 44 45 39V52L30 57Z' +
      'M70 44 55 39V52L70 57Z' +
      'M22 65 35 69V76L22 72Z',
  ),
  /* ORB — the pupil is off-centre, which is what makes a quarter turn readable */
  circle: (fill) => (
    <>
      <path
        d={'M3 50a47 47 0 1 0 94 0a47 47 0 1 0-94 0Z' + 'M50 22a28 28 0 1 0 0 56 28 28 0 1 0 0-56Z'}
        fill={fill}
        fillRule="evenodd"
      />
      <path d="M43 39a13 13 0 1 0 0 26 13 13 0 1 0 0-26Z" fill={fill} />
    </>
  ),
  /* PLATE */
  square: cut(
    'M22 8H78L92 22V78L78 92H22L8 78V22Z' + 'M28 42H72V54H28Z' + 'M14 22H26V32H14Z',
  ),
  /* FANG */
  triangle: cut('M50 4 92 92H8Z' + 'M50 40 74 86H26Z' + 'M56 64 68 84H45Z'),
  /* SCALE */
  diamond: cut('M50 2 92 50 50 98 8 50Z' + 'M50 21 77 50 50 79 23 50Z' + 'M43 38 57 50 43 62 29 50Z'),
  /* CARAPACE — vents doubled on one flank */
  hexagon: cut(
    'M50 4 90 27V73L50 96 10 73V27Z' +
      'M26 41 44 34V46L26 53Z' +
      'M26 59 44 52V64L26 71Z' +
      'M74 47 61 42V55L74 60Z',
  ),
  /* WING, ranked */
  chevron: cut(
    'M50 8 92 44V70L50 36 8 70V44Z' + 'M62 33 79 48V57L62 42Z' + 'M50 56 92 90V98L50 68 8 98V90Z',
  ),
  /* SPINE */
  bolt: cut('M62 3 20 52H44L36 97 80 44H54Z' + 'M53 15H61L47 39H39Z'),
  /* BANNER, with a device cut into it */
  flag: cut(
    'M17 4H29V96H17Z' + 'M29 12C51 2 70 24 94 12V52C70 62 51 40 29 50Z' + 'M45 24 62 20 66 34 49 40Z',
  ),
  /* HORN, pierced */
  crescent: cut('M66 5a47 47 0 1 0 0 90 37 37 0 1 1 0-90Z' + 'M39 39a11 11 0 1 0 0 22 11 11 0 1 0 0-22Z'),
  /* COIL — the one mark that reads as a stroke, and keeps its cap asymmetric */
  spiral: (fill) => (
    <path
      d="M50 50a13 13 0 1 1 13 13 26 26 0 1 1-26-26 39 39 0 1 1 39 39"
      fill="none"
      stroke={fill}
      strokeWidth={12}
      strokeLinecap="round"
    />
  ),
  /* SPORE CLUSTER — the lobes and the core overlap, so the joins engrave themselves */
  trefoil: cut(
    'M50 8a19 19 0 1 0 0 38 19 19 0 1 0 0-38Z' +
      'M24 54a19 19 0 1 0 0 38 19 19 0 1 0 0-38Z' +
      'M76 54a19 19 0 1 0 0 38 19 19 0 1 0 0-38Z' +
      'M50 40 72 82H28Z',
  ),
  /* RIDGE */
  zigzag: (fill) => (
    <>
      <path
        d="M6 76 27 26 48 76 69 26 90 76"
        fill="none"
        stroke={fill}
        strokeWidth={12}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M27 8a7 7 0 1 0 0 14 7 7 0 1 0 0-14Z" fill={fill} />
    </>
  ),
  /* VENOM */
  teardrop: cut(
    'M50 4C70 32 86 48 86 63A36 36 0 1 1 14 63C14 48 30 32 50 4Z' +
      'M50 48a15 15 0 1 0 0 30 15 15 0 1 0 0-30Z' +
      'M39 29 48 36 39 45 32 37Z',
  ),
  /* FROND, veined */
  leaf: cut('M50 4C82 26 90 60 50 98 10 60 18 26 50 4Z' + 'M50 18 56 54 50 88 44 54Z' + 'M22 51 34 56 30 66 20 60Z'),
  /* CORE STONE — three faces, so a cube never reads as a hexagon */
  cube: (fill) => (
    <>
      <path d={'M50 6 88 28 50 50 12 28Z' + 'M50 20 64 28 50 36 36 28Z'} fill={fill} fillRule="evenodd" />
      <path d="M12 28 50 50V94L12 72Z" fill={fill} opacity={0.5} />
      <path d="M88 28 50 50V94L88 72Z" fill={fill} opacity={0.78} />
    </>
  ),

  /* ---- the bank's own names, in case a renderer forwards one unaliased ---- */

  /* KITE */
  kite: cut('M50 3 84 42 50 97 16 42Z' + 'M50 26 68 43 50 70 32 43Z' + 'M43 38 56 47 43 58 33 47Z'),
  /* SINGLE PETAL */
  petal: cut('M50 3C86 30 86 66 50 97 14 66 14 30 50 3Z' + 'M50 24C70 42 70 62 50 80 30 62 30 42 50 24Z' + 'M44 44 56 52 44 62 36 52Z'),
  drop: cut(
    'M50 4C70 32 86 48 86 63A36 36 0 1 1 14 63C14 48 30 32 50 4Z' +
      'M50 48a15 15 0 1 0 0 30 15 15 0 1 0 0-30Z' +
      'M39 29 48 36 39 45 32 37Z',
  ),
  /* CAPSULE — a plated bar */
  capsule: cut('M24 26h52a24 24 0 0 1 0 48H24a24 24 0 0 1 0-48Z' + 'M36 42h30v16H36Z' + 'M74 44h8v12h-8Z'),
  /* HOOK */
  hook: cut('M62 6h14v52a30 30 0 0 1-58 10l13-6a17 17 0 0 0 31-4Z' + 'M65 18h8v22h-8Z'),
  /* BOOT */
  boot: cut('M32 6h16v46l34 18v24H32Z' + 'M40 18h8v26h-8Z' + 'M46 72h28v10H46Z'),
  /* COMMA */
  comma: cut('M62 8a30 30 0 1 1 0 60c14 8 8 24-14 30 26-16 14-26 0-30a30 30 0 0 1 14-60Z' + 'M60 24a12 12 0 1 0 0 24 12 12 0 1 0 0-24Z'),
  /* PIP */
  dot: cut('M50 22a28 28 0 1 0 0 56 28 28 0 1 0 0-56Z' + 'M44 38a10 10 0 1 0 0 20 10 10 0 1 0 0-20Z'),
};

export const MT_SKIN: Skin = {
  id: 'monster-tamer',
  color: factionColor,
  draw: (shape: ShapeName, fill: string) => MARKS[shape]?.(fill),
};

/* ===========================================================================
   TRAITS — the domains, said in this world's words.

   The engine reports `fluid`; the bank files say `fluid_reasoning`. Both keys are here so a recap
   never comes back blank because of which side of the wire it came from.
   =========================================================================== */

interface Trait {
  name: string;
  sigil: ShapeName;
  color: string;
  turns: string;
}

const LINEAGE: Trait = { name: 'Lineage', sigil: 'star', color: 'teal', turns: 'lineage' };
const MASS: Trait = { name: 'Mass', sigil: 'cube', color: 'gold', turns: 'mass' };
const STANCE: Trait = { name: 'Stance', sigil: 'hexagon', color: 'blue', turns: 'stance' };
const NAMING: Trait = { name: 'Naming', sigil: 'flag', color: 'violet', turns: 'naming' };
const FORM: Trait = { name: 'Form', sigil: 'diamond', color: 'ink', turns: 'form' };

const TRAITS: Record<string, Trait> = {
  fluid: LINEAGE,
  fluid_reasoning: LINEAGE,
  quantitative: MASS,
  spatial: STANCE,
  verbal: NAMING,
};

const traitOf = (domain: string | undefined): Trait => (domain ? TRAITS[domain] ?? FORM : FORM);

function tally(domains: readonly string[]): { trait: Trait; count: number }[] {
  const order: Trait[] = [];
  const counts = new Map<Trait, number>();
  for (const d of domains) {
    const t = traitOf(d);
    if (!counts.has(t)) order.push(t);
    counts.set(t, (counts.get(t) ?? 0) + 1);
  }
  return order
    .map((trait) => ({ trait, count: counts.get(trait) ?? 0 }))
    .sort((a, b) => b.count - a.count);
}

/* ===========================================================================
   VESK

   Dry, a little arrogant, never cruel, and never talking about the child's choices. He remarks on
   the matchups and on the fact that someone is still sitting opposite him. No exclamation marks, no
   praise, nothing that could be read as a verdict.
   =========================================================================== */

const ROUND_SIZE = 4;

const VESK_ROUNDS: string[] = [
  'Four calls in and you have not said anything. Most people talk at me by now. I prefer this.',
  'That set leaned on mass. Mass is where this table usually gets decided, so nobody should be quick about it.',
  'I stopped being able to guess you somewhere in there. Do not read too much into it yet.',
  'You are reading these differently than you were when you sat down. I watched it happen.',
  'Whatever it is you have started doing, keep doing it. I am running out of remarks.',
  'Still here. Still not boring.',
];

const veskRound = (i: number) => VESK_ROUNDS[Math.min(i, VESK_ROUNDS.length - 1)] ?? VESK_ROUNDS[0]!;

/**
 * The aside carries what Vesk DOES and the main column carries what he SAYS, so the two never print
 * the same sentence twice. These are the stage directions for the beat where the table resolves.
 */
const VESK_BEATS: string[] = [
  'He leans back and lets the felt clear.',
  'He turns a creature over in his hand and does not send it.',
  'He watches the felt clear without watching you.',
  'He resets his side of the table slowly, because he can.',
];

const veskBeat = (i: number) => VESK_BEATS[i % VESK_BEATS.length] ?? VESK_BEATS[0]!;

const VESK_IDLE = 'He has taken nine callers at this table tonight. He remembers two of them.';

/* ===========================================================================
   THE CREST

   Vesk's mark, and the only pictorial thing in the world: a plated beast helm, near-black on
   near-black, with the hot accent spent entirely on two eye slits. Nothing about it is a mascot —
   no face, no expression, no animal.
   =========================================================================== */

function Crest({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 120 140" className={className} role="presentation" aria-hidden="true">
      <defs>
        <radialGradient id="mt-bloom" cx="50%" cy="52%" r="46%">
          <stop offset="0%" stopColor={HOT} stopOpacity="0.34" />
          <stop offset="100%" stopColor={HOT} stopOpacity="0" />
        </radialGradient>
      </defs>
      <circle cx="60" cy="72" r="56" fill="url(#mt-bloom)" />
      <path d="M30 60C17 43 13 25 21 6l16 17c-2 13 0 24 8 34Z" className="mt-crest-horn" />
      <path d="M90 60c13-17 17-35 9-54L83 23c2 13 0 24-8 34Z" className="mt-crest-horn" />
      <path d="M60 30 97 55 91 97 60 128 29 97 23 55Z" className="mt-crest-plate" />
      <path d="M38 96 60 111 82 96 78 109 60 124 42 109Z" className="mt-crest-jaw" />
      <path d="M60 30V16" className="mt-crest-rule" />
      <path d="M39 66 55 61V75L39 79Z" className="mt-crest-eye" />
      <path d="M81 66 65 61V75L81 79Z" className="mt-crest-eye" />
      <path d="M46 44H74" className="mt-crest-tick" />
      <path d="M52 138H68" className="mt-crest-tick" />
    </svg>
  );
}

/* ===========================================================================
   THE STAGE GUARD

   `ItemStage` prints its own notice for a type with no renderer registered, which is handled. What
   it cannot handle is a registered renderer whose module fails to load or throws while drawing —
   Suspense rethrows that and it would take the whole table down mid-session. A child should never
   pay for that, so it is caught here and turned into one more thing happening in the world, with a
   way onward. Keyed on the item so the next call is never blocked by the last one's failure.
   =========================================================================== */

class StageGuard extends Component<{ children: ReactNode; onSkip: () => void }, { failed: boolean }> {
  override state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  override render() {
    if (this.state.failed) {
      return (
        <div className="mt-fault" role="alert">
          <p className="mt-eyebrow">Table interruption</p>
          <p className="mt-fault-line">
            The creature on the table will not settle into a shape either of you can read. Vesk waves
            it off the felt and reaches for the next one.
          </p>
          <button type="button" className="mt-btn" onClick={this.props.onSkip}>
            Take the next call
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

/* ===========================================================================
   THE WORLD
   =========================================================================== */

type Scene = 'gate' | 'arena' | 'interlude' | 'concede' | 'closed';

export default function MonsterTamer({ onExit }: ExperienceProps) {
  /* Standard precision: eight to sixteen calls, which is a long enough rivalry to be one and short
     enough to finish in a sitting. The settle is the beat where a chosen creature is lifted off the
     felt before the next arrives. */
  const s = useScreenerSession({ band: '6-8', precisionIndex: 2, settleMs: 700 });

  /* What each call turned on, recorded as it is answered. This is the ONLY history kept, and it is
     deliberately a record of the matchups rather than of the child. */
  const [log, setLog] = useState<string[]>([]);
  const [cleared, setCleared] = useState(0);

  const answered = s.answeredCount;
  const breakDue = answered > 0 && answered % ROUND_SIZE === 0 && answered !== cleared;

  let target: Scene = 'gate';
  if (s.phase === 'error') target = 'closed';
  else if (s.phase === 'done') target = 'concede';
  else if (s.phase === 'asking') target = breakDue ? 'interlude' : 'arena';
  else if (s.phase === 'settling') target = 'arena';

  /* One handoff for every scene change, so nothing in this world ever cuts: the outgoing scene
     leaves, then the incoming one arrives on the same curve. */
  const scene = useHandoff(target, 240);

  const answer = useCallback(
    (key: string) => {
      if (s.phase !== 'asking') return;
      const domain = s.serve?.domain;
      if (domain) setLog((l) => [...l, domain]);
      void s.answer(key);
    },
    [s.phase, s.serve, s.answer],
  );

  const begin = useCallback(() => {
    setLog([]);
    setCleared(0);
    void s.start();
  }, [s.start]);

  const retry = useCallback(() => {
    s.reset();
    setLog([]);
    setCleared(0);
    void s.start();
  }, [s.reset, s.start]);

  const total = s.expected?.max ?? 16;
  const round = Math.max(1, Math.ceil(answered / ROUND_SIZE));
  const trait = traitOf(s.serve?.domain);
  const runTally = useMemo(() => tally(log), [log]);
  const roundTally = useMemo(() => tally(log.slice(-ROUND_SIZE)), [log]);

  const veskLine =
    scene.shown === 'gate'
      ? VESK_IDLE
      : scene.shown === 'closed'
        ? 'He is still standing there with his arms folded, waiting for someone to see to the lamps.'
        : scene.shown === 'concede'
          ? 'He moves his creature off the table, which at this circuit means what a handshake means anywhere else.'
          : scene.shown === 'interlude'
            ? veskBeat(round - 1)
            : answered === 0
              ? 'He puts one creature on the felt without looking at it, then looks at you instead.'
              : `Call ${pad(answered + 1)}. He has already decided what he would send.`;

  return (
    <div className="mt-root" data-scene={scene.shown}>
      <div className="mt-grain" aria-hidden="true" />

      <header className="mt-rail">
        <p className="mt-rail-mark">
          <span className="mt-rail-circuit">Tamers&rsquo; circuit</span>
          <span className="mt-rail-table">North table</span>
        </p>

        {scene.shown === 'arena' || scene.shown === 'interlude' ? (
          <div className="mt-tally">
            <span className="mt-tally-label">
              Call {pad(Math.min(answered + (scene.shown === 'arena' ? 1 : 0), total))} of up to{' '}
              {total}
            </span>
            <span
              className="mt-notches"
              role="img"
              aria-label={`${answered} of up to ${total} calls taken`}
            >
              {Array.from({ length: total }, (_, i) => (
                <span key={i} className={`mt-notch${i < answered ? ' mt-notch-on' : ''}`} />
              ))}
            </span>
          </div>
        ) : (
          <span />
        )}

        <button type="button" className="mt-leave" onClick={onExit}>
          Leave the table
        </button>
      </header>

      <div className="mt-body">
        <aside className="mt-rival">
          <div className="mt-rival-head">
            <div className="mt-crest-hold">
              <Crest className="mt-crest" />
            </div>
            <div>
              <p className="mt-eyebrow">Opposing tamer</p>
              <h2 className="mt-rival-name">Vesk</h2>
              <p className="mt-rival-meta">Undefeated this season. Visibly bored by it.</p>
            </div>
          </div>

          <blockquote className="mt-say" key={veskLine} aria-live="polite">
            <p>{veskLine}</p>
          </blockquote>
        </aside>

        <main className="mt-main">
          <div className="mt-scene" data-leaving={scene.leaving} key={scene.shown}>
            {scene.shown === 'gate' && (
              <section className="mt-gate">
                <p className="mt-eyebrow mt-stagger" style={step(0)}>
                  Last table lit
                </p>
                <h1 className="mt-display mt-stagger" style={step(1)}>
                  You have drawn Vesk.
                </h1>
                <div className="mt-rule mt-stagger" style={step(2)} />
                <p className="mt-lede mt-stagger" style={step(3)}>
                  He reads matchups faster than anyone at this circuit and he is not shy about it.
                  Each call is a single matchup: traits, lineage and mass decide what holds against
                  what. Take as long as you want on any of them. He will talk either way.
                </p>
                <ul className="mt-legend mt-stagger" style={step(4)}>
                  {[LINEAGE, MASS, STANCE].map((t) => (
                    <li key={t.name} className="mt-chip">
                      <span className="mt-chip-mark">
                        <Glyph shape={t.sigil} color={t.color} skin={MT_SKIN} />
                      </span>
                      <span className="mt-chip-name">{t.name}</span>
                    </li>
                  ))}
                </ul>
                <div className="mt-actions mt-stagger" style={step(5)}>
                  <button
                    type="button"
                    className="mt-btn mt-btn-hot"
                    onClick={begin}
                    disabled={s.phase === 'starting'}
                  >
                    {s.phase === 'starting' ? 'Sitting down' : 'Sit down opposite him'}
                  </button>
                </div>
              </section>
            )}

            {scene.shown === 'arena' && s.serve && (
              <section className="mt-call">
                <div className="mt-call-head">
                  <p className="mt-eyebrow">
                    Call {pad(answered + 1)}
                    <span className="mt-sep" aria-hidden="true" />
                    <span className="mt-call-trait">{trait.name}</span>
                  </p>
                  <p className="mt-call-turns">This one turns on {trait.turns}.</p>
                  <p className="mt-spec">
                    spec&thinsp;/&thinsp;{s.serve.served.itemId.slice(0, 4).toUpperCase()}
                  </p>
                </div>

                <div className="mt-felt">
                  <StageGuard key={s.serve.served.itemId} onSkip={() => answer('A')}>
                    <ItemStage
                      serve={s.serve}
                      band="6-8"
                      onAnswer={answer}
                      answered={s.phase !== 'asking'}
                      skin={MT_SKIN}
                    />
                  </StageGuard>
                </div>
              </section>
            )}

            {scene.shown === 'arena' && !s.serve && <div className="mt-hold" aria-hidden="true" />}

            {scene.shown === 'interlude' && (
              <section className="mt-resolve">
                <p className="mt-eyebrow mt-stagger" style={step(0)}>
                  Exchange {pad(round)}
                  <span className="mt-sep" aria-hidden="true" />
                  <span className="mt-call-trait">Resolved</span>
                </p>
                <h1 className="mt-display mt-display-sm mt-stagger" style={step(1)}>
                  {ROUND_WORD[Math.min(answered, ROUND_WORD.length - 1)] ?? 'Four'} calls, and the
                  table holds.
                </h1>
                <div className="mt-rule mt-stagger" style={step(2)} />
                <p className="mt-lede mt-stagger" style={step(3)}>
                  &ldquo;{veskRound(round - 1)}&rdquo;
                </p>
                <div className="mt-stagger" style={step(4)}>
                  <p className="mt-eyebrow mt-eyebrow-quiet">What that exchange turned on</p>
                  <ul className="mt-legend">
                    {roundTally.map(({ trait: t, count }) => (
                      <li key={t.name} className="mt-chip">
                        <span className="mt-chip-mark">
                          <Glyph shape={t.sigil} color={t.color} skin={MT_SKIN} />
                        </span>
                        <span className="mt-chip-name">{t.name}</span>
                        <span className="mt-chip-count">{count}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="mt-actions mt-stagger" style={step(5)}>
                  <button
                    type="button"
                    className="mt-btn mt-btn-hot"
                    onClick={() => setCleared(answered)}
                  >
                    Take the next call
                  </button>
                </div>
              </section>
            )}

            {scene.shown === 'concede' && (
              <section className="mt-end">
                <p className="mt-eyebrow mt-stagger" style={step(0)}>
                  End of the table
                </p>
                <h1 className="mt-display mt-stagger" style={step(1)}>
                  Vesk stands down.
                </h1>
                <div className="mt-rule mt-stagger" style={step(2)} />
                <p className="mt-lede mt-stagger" style={step(3)}>
                  &ldquo;You read these the way people read them who have been reading them a long
                  time. I do not hand that out, and I am not handing it to you to be pleasant.&rdquo;
                </p>
                <p className="mt-lede mt-lede-quiet mt-stagger" style={step(4)}>
                  &ldquo;The table is yours for the evening. I will want it back.&rdquo;
                </p>
                <div className="mt-stagger" style={step(5)}>
                  <p className="mt-eyebrow mt-eyebrow-quiet">
                    {answered} calls taken, and what they turned on
                  </p>
                  <ul className="mt-legend">
                    {runTally.map(({ trait: t, count }) => (
                      <li key={t.name} className="mt-chip">
                        <span className="mt-chip-mark">
                          <Glyph shape={t.sigil} color={t.color} skin={MT_SKIN} />
                        </span>
                        <span className="mt-chip-name">{t.name}</span>
                        <span className="mt-chip-count">{count}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="mt-actions mt-stagger" style={step(6)}>
                  <button type="button" className="mt-btn mt-btn-hot" onClick={onExit}>
                    Leave the circuit
                  </button>
                </div>
              </section>
            )}

            {scene.shown === 'closed' && (
              <section className="mt-end" role="alert">
                <p className="mt-eyebrow mt-stagger" style={step(0)}>
                  Table dark
                </p>
                <h1 className="mt-display mt-stagger" style={step(1)}>
                  The lamps over this table are out.
                </h1>
                <div className="mt-rule mt-stagger" style={step(2)} />
                <p className="mt-lede mt-stagger" style={step(3)}>
                  Nothing to do with the calls you made. The circuit cannot bring creatures out onto
                  a table it cannot see.
                </p>
                <div className="mt-actions mt-stagger" style={step(4)}>
                  <button type="button" className="mt-btn mt-btn-hot" onClick={retry}>
                    Ask for the lamps again
                  </button>
                  <button type="button" className="mt-btn" onClick={onExit}>
                    Leave the table
                  </button>
                </div>
                {s.error && <p className="mt-diag mt-stagger" style={step(5)}>{s.error}</p>}
              </section>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}

/* ---- small local helpers -------------------------------------------------- */

const ROUND_WORD = ['No', 'One', 'Two', 'Three', 'Four'] as const;

const pad = (n: number) => String(n).padStart(2, '0');
const step = (i: number) => ({ ['--mt-i' as string]: String(i) });

/**
 * Holds the outgoing scene for `outMs` so it can leave before the next one arrives. Without it the
 * matchup would vanish and the interlude appear in the same frame, which is the one abrupt cut this
 * world would otherwise have had.
 */
function useHandoff<T>(next: T, outMs: number): { shown: T; leaving: boolean } {
  const [shown, setShown] = useState(next);
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    if (next === shown) return;
    setLeaving(true);
    const t = window.setTimeout(() => {
      setShown(next);
      setLeaving(false);
    }, outMs);
    return () => window.clearTimeout(t);
  }, [next, shown, outMs]);

  return { shown, leaving };
}

/* ===========================================================================
   WANTED FROM shared/, REPORTED RATHER THAN CHANGED

   1. `Glyph` resolves an unknown shape name to `circle` BEFORE consulting `skin.draw`, so a skin
      can never see the bank's own vocabulary — `kite`, `drop`, `petal`, `capsule`, `hook`, `boot`,
      `comma`, `dot`. Every renderer therefore has to keep its own alias table onto the seventeen
      primitives, and two banks that both use `petal` and `leaf` are one alias collision away from
      an unanswerable item. Passing the raw name through to `skin.draw` and falling back only when
      it returns undefined would put that decision in one place.

   2. There is no way for an experience to HOLD the loop. Deferred feedback at the end of a stage is
      what this band wants, but `answer()` advances on `settleMs` and the next item's `shownAt` is
      stamped when it loads, so an interlude the child dismisses at their own pace is charged to
      that item's `latencyMs`. Harmless here — latency is only aggregated in `packages/stats` and
      never reaches the ability estimate — but a `hold()` / `resume()` pair, or `shownAt` being
      stamped on first render rather than on load, would make end-of-stage pacing free.

   3. `ItemStage`'s missing-renderer notice is styled by the global `stage-missing` on the light
      shell palette, and reads as dark text on dark in a near-black world. It is re-skinned from
      this world's stylesheet under `.mt-root`, which works but means every dark world will have to
      do it again.
   =========================================================================== */
