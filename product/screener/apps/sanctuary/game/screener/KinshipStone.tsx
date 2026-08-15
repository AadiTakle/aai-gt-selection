import { useFrame } from '@react-three/fiber';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type * as THREE from 'three';

import { handedFor } from './address';
import { tokenGlyph, type EventMark } from './eventMeaning';
/**
 * The gates live in a dependency-free module because the serve gate must run at POOL level, in the server
 * plugin's node context — by the time this component sees `content`, the engine has already chosen the
 * item, the child is looking at it, and an answer will be recorded against it. Re-exported here so there
 * is exactly one pair of predicates and they cannot drift between the pool and the panel.
 */
import { kinshipStoneDraws, kinshipStoneServes, pairsOf, pairWords } from './kinshipGate';
import { canSpeak, hushSpeech, narrate, speak, type NarrationState, type StoryLine } from './speak';
import { bankColor, breath, HUE, MAT, shade, useReducedMotion, useSlab } from './theme';
import { EmptySlot, WordCard } from './wordPlate';

export { kinshipStoneDraws, kinshipStoneServes, pairWords };

/**
 * `VER-RELPAIR-01` as a thing in the hollow: the kinship stone, a standing stone with six lines cut across
 * its face. The top line holds a pair of words that go together, the line under it is empty, and the lines
 * below hold the pairs to choose from.
 *
 * WHAT THE ITEM ACTUALLY IS, read off the bank rather than off the brief. `content` is
 * `{typeCode, presentation, relation, stemPair, options, frequencyBand}`. `stemPair` is always exactly two
 * `{text}`; `options` are three (15 items) or four (85 items), each `{pair: [{text}, {text}]}`. This is
 * Verbal Analogies — one of CogAT's three Verbal subtests — and the task is to pick the pair whose two
 * things are joined the same way the stem's two are.
 *
 * ══ THIS TYPE SHOWS ITS WORDS, AND THAT IS A REVERSAL OF WHAT IT USED TO DO ════════════════════════
 *
 * IT USED TO BE ANSWERED BY LISTENING. `tokenGlyph` covers 91 of this bank's 445 distinct words and the
 * count of items where EVERY word has a drawing is zero in all four bands, so there were no pictures to
 * put on the cards; the pairs were spoken and the stone was ten blank slabs with a turned ring on each.
 * A screenshot of it is eight identical stone tiles. On a muted tab, a school image with no voice
 * packages, in a noisy room, or for a deaf child, the item contained NOTHING AT ALL — and the owner, who
 * can hear, reported exactly that: "i can't hear anything with the headphone one so i have no clue what it
 * means ... i think basically all the verbal questions make no sense and at this point you have to use
 * words".
 *
 * He is right, and the rule that produced it was right in the wrong place. "A five-year-old cannot read,
 * so every item must be answerable from pictures" is correct for figure matrices and number series. It
 * cannot hold for the verbal battery, which is about words by definition, and this type is the proof: the
 * undrawable half of an analogy is almost always the CATEGORY — `animal`, `fruit`, `insect`, `number` —
 * and a category has no appearance. `kinshipGate.ts` carries that argument in full, including why drawing
 * it either hands over the answer or inverts the item.
 *
 * SO THE WORDS ARE ON THE STONE, large, dark on pale, one plate each. The voice reads them aloud while
 * they are visible, which is what an emerging reader actually needs, and the pictures would be a third
 * channel if there were any. A question with one channel fails completely when that channel fails; this
 * one now has two, either of which is enough.
 *
 * ══ WHY THE WHOLE LAYOUT TURNED NINETY DEGREES, WHICH IS ARITHMETIC AND NOT TASTE ══════════════════
 *
 * The old shape was a shelf: eight cards in a row, two per pair, four pairs across. Words cannot go in it.
 *
 * The child reads this at `dock` 4.6m from a panel scaled by `fitScale`, which at 1280x800 and fov 62 is
 * about 145 screen pixels per world unit before the panel's own scale. `sites.ts` gives this type a bay of
 * 4.70 x 3.00 units, so the ENTIRE panel is about 680 x 435 pixels of screen however it is arranged. Eight
 * word plates across that is 85 pixels each — 7 pixels per character on `heartbroken`, and no font rescues
 * that. It is the same wall the sorting gate hit.
 *
 * Two plates across instead of eight is 340 pixels each, and the four candidates stack as ROWS. That is
 * the whole reason for the new shape, and the numbers it buys, measured rather than hoped:
 *
 *     plate 3.42 x 0.70 units   →   224 x 46 screen pixels at four options, 256 x 53 at three
 *     letters                   →   about 28 pixels tall, dropping to 24 on the longest word in the bank
 *
 * WHAT IT COSTS is that the four candidates are no longer all the same distance from the camera. A pair
 * 2.9 units below the panel's centre is 3% further away than one at its centre and renders 3% smaller.
 * That is the constraint this directory holds hardest — "a candidate nearer the camera renders larger,
 * which is a false signal" — so it is worth being exact about: the old shelf had that error at 0% between
 * candidates and 13% between the shelf and the stem, this has it at 3% between the outermost candidates,
 * monotone down the column and identical for every item. Against 7 pixels per character it is not a
 * trade, and it is smaller than the hover lift the child triggers on purpose.
 *
 * ONE PLATE SIZE AND ONE PLATE DEPTH, EVERYWHERE, and ONE PAIR ARRANGEMENT everywhere. The stem, the
 * empty line and every candidate draw the identical `WordPair` at the identical scale on the identical
 * plane, which on this type is load-bearing twice over. Once for the usual reason, and once for a reason
 * peculiar to analogies: nearly every item carries a REVERSAL lure — `chill : fridge` against a stem of
 * `oven : bake` — and the only thing distinguishing a pair from its reverse is which side each word is
 * on. That survives only if the arrangement is pixel-identical between the stem and the candidates, which
 * it is, because they are the same component. Left to right, as the written form does it, and no arrow or
 * chevron anywhere: a convention a child has to be taught first is a vocabulary test hiding in a
 * reasoning test.
 *
 * ══ THE PANEL SUPPLIES THE INSTRUCTION; THIS FILE SUPPLIES THE WORDS ══════════════════════════════
 *
 * `Game.tsx` renders the ask above the panel — this bank ships an empty `prompt`, so it writes "Which pair
 * goes together in the same way?" there. Nothing here draws a second copy of it. What this file draws is
 * the item's own words and nothing else, which is the whole division of labour: the instruction is a
 * sentence about the task, the words are the task.
 *
 * The spoken ASK below is deliberately the SAME SENTENCE as the panel's, word for word, because a child
 * learning to read is following the line they can see while the voice says it. Two near-identical
 * sentences would be two things to reconcile. If that sentence changes in `Game.tsx`, change it here too.
 *
 * ══ WHAT THE VOICE MAY AND MAY NOT SAY ════════════════════════════════════════════════════════════
 *
 * `content.relation` IS SERVED, IN WORDS — `is a kind of`, `whole and its part`, `used for` — and it is the
 * answer. It is the very thing the child is being asked to infer from the stem, so speaking it, drawing it,
 * or hinting at its family turns a reasoning item into listening-and-matching. Nothing in this file reads
 * that field except to refuse to. This is the same discipline `speak.ts` documents at length for the log's
 * ordering, arrived at for the same reason, and it is why `analogyLines` is a function with an argument
 * about it rather than a template inline in the component.
 *
 * THE TWO WORDS OF A PAIR ARRIVE AS ONE UTTERANCE and the pairs are separated by an equal silence: the
 * PAIRING is the unit of meaning, and splitting it into two lines would offer the child eight loose words
 * to reassemble. THE PAIRS ARE SPOKEN TOP TO BOTTOM, in the order they stand on the stone, because that
 * order is how a child knows which line they just heard. It is addressing, not content. Their gaps are
 * equal for the reason `speak.ts` gives, since an extra beat anywhere would mark one candidate as special.
 *
 * ══ HEARING IT AGAIN IS FREE, UNLIMITED AND UNTIMED ═══════════════════════════════════════════════
 *
 * THE HORN retells the whole item from the top, as many times as it is pressed — the hollow's established
 * "say it again" object, argued for at length in `DayLog.tsx`. POINTING AT A LINE says just that pair,
 * which is what a child who has lost track of one line actually wants. Both are suppressed while the
 * arrival telling is still running, so a wandering cursor cannot chop the question off mid-sentence.
 * Nothing about either is scored. `onPick` fires on a click and on nothing else.
 *
 * A MACHINE WITH NO VOICE is now a machine that reads a little slower. `speechSynthesis` is absent on some
 * embeddings and silently mute on others — `speak.ts` enumerates them — and this used to be the single
 * biggest operational risk the type carried, because there was nothing else in the item. The horn still
 * goes visibly dull so nobody spends the round pressing it, and the question is all still there.
 *
 * ══ THE THINGS EVERY PRESENTATION HERE HAS LEARNED THE HARD WAY ═══════════════════════════════════
 *
 * MATTE. `roughness` never below 0.85 on anything structural, `metalness` zero throughout. A clearcoat
 * would mirror the station lamp onto whichever plate faced it, and a brighter plate is a plate a child
 * reads as chosen.
 *
 * THE MISSING PLACE IS THE ONLY THING THAT GLOWS. The hollow's one convention, and `SortingGate.tsx`
 * records what happens when it is bent: a band of honey trim next to a honey socket merges with it and the
 * empty place stops being findable. So the joining is carved stone and vine, not light, and the candidate
 * hues are muted tabs at the ends of the lines — never on the plates, never emissive.
 *
 * IT CANNOT KNOW THE ANSWER. Nothing here compares anything. The chosen pair rises into the empty line
 * because that is what the CHILD said about it. `onPick` hands back the address and that is all that
 * leaves this file.
 *
 * THE ADDRESS HAZARD. These options have NO `key` field and this bank's `answer.correctKey` is an INTEGER
 * on all 100 items, so THE POSITION IS THE ANSWER and `onPick` must hand back `String(index)`. `handedFor`
 * in `address.ts` is the only thing allowed to decide that; hand back a letter and every item of this type
 * is marked wrong, silently, with no error. `prove-drawn-types.ts` drives that exact function against the
 * live API on a NONZERO key for this type, because a two-pass proof on a key-0 item passes even for a
 * component that ignores its index entirely.
 *
 * ══ WHAT THE BAY HAS TO CONTAIN ═══════════════════════════════════════════════════════════════════
 *
 * `game/stations/sites.ts` is not this directory's to edit, so the arithmetic is left here for whoever
 * updates the branch. IT IS SAFE TO LEAVE ALONE — the drawing fits inside the extents already declared
 * there, at both option counts — and it is worth updating, because the declared width is now 20% larger
 * than anything drawn and the panel is scaled down to fit a box it no longer fills.
 *
 *     declared today   halfW max(1.43, n * 1.30)  → 3.90 at three options, 5.20 at four
 *                      halfH 2.90
 *     actually drawn   halfW 4.34   the horn's outer edge, `STONE_W / 2 + 0.34 + HORN_R`. Constant now:
 *                                   the candidate count no longer moves the width, only the height.
 *                      halfH (2 + n) * ROW_PITCH / 2 + 0.15 → 2.60 at three options, 3.09 at four
 *
 *     if (typeCode === 'VER-RELPAIR-01') {
 *       const n = Array.isArray(content.options) ? content.options.length : 4;
 *       return { halfW: 4.34, halfH: (2 + n) * 0.49 + 0.15 };
 *     }
 *
 * WITH THE DECLARED NUMBERS the panel renders at `fitScale` 0.452 (four options) and 0.517 (three), and
 * projects to 3.92 x 2.68 and 4.49 x 2.69 units of a 4.70 x 3.00 bay — inside the sill at both counts,
 * which is the property that makes leaving `sites.ts` alone safe rather than merely tolerable. WITH THE
 * MEASURED NUMBERS both counts land at about 0.51 and fill the bay, which is worth roughly four screen
 * pixels of letter height. Re-run the measurement rather than taking either on trust.
 */

/* ============================================================================
   what gets said
   ========================================================================== */

/**
 * The opening, the ask, and every pair — with the silence after each.
 *
 * PURE AND FREE OF `window`, like `speak.ts`'s `storyLines` and for the same reason: a node-side check can
 * print exactly what a child would hear for a real item without booting a browser. Read the note in this
 * file's header on what these sentences may not say before changing a word of them.
 */
const OPENING = 'Look. These two words go together.';
/**
 * The load-bearing sentence, and it is `Game.tsx`'s panel text verbatim — see the header on why the spoken
 * line and the written line have to be the same sentence. It names that a relation exists and refuses to
 * name which one; `content.relation` holds the answer in plain words and nothing here may leak it.
 */
const ASK = 'Which pair goes together in the same way?';

/**
 * Equal after every line, and EXACTLY equal after every candidate.
 *
 * A beat longer anywhere in the candidate run would mark one of them as special, which is `speak.ts`'s
 * doctrine and applies unchanged. Long enough that a pair lands as its own thing rather than as an item in
 * a list being recited.
 */
const LINE_GAP_MS = 820;

/** How long after arriving the stone speaks. Matches `DayLog`, so the two verbal styles feel like one place. */
const ARRIVAL_BEAT_MS = 900;

/**
 * One pair, as one utterance.
 *
 * ONE utterance rather than two lines because the pairing is the unit of meaning here — see the header.
 * The leading capital and the full stops are for intonation only, which is the same argument `speak.ts`
 * makes in `settled`: `speechSynthesis` takes its contour from punctuation, and two bare nouns run
 * together are read as a list fragment with a rising, unfinished tail. The words themselves are the
 * bank's and are never otherwise altered — the plates show exactly the strings this speaks.
 */
function saidPair(pair: readonly [string, string]): string {
  const first = pair[0].charAt(0).toUpperCase() + pair[0].slice(1);
  return `${first}. And ${pair[1]}.`;
}

export function analogyLines(content: Record<string, unknown>): StoryLine[] {
  const p = pairsOf(content);
  if (!p) return [];
  return [
    { text: OPENING, gapMs: LINE_GAP_MS },
    { text: saidPair(p.stem), gapMs: LINE_GAP_MS },
    { text: ASK, gapMs: LINE_GAP_MS },
    // Top to bottom, which is the order they stand in on the stone. See the header: here that order is
    // addressing rather than content, so claiming it is safe and necessary.
    ...p.options.map((o) => ({ text: saidPair(o), gapMs: LINE_GAP_MS })),
  ];
}

/* ============================================================================
   layout
   ========================================================================== */

/**
 * ONE WORD PLATE, and every place in the item is exactly this one. See the header for why none may differ,
 * and for the pixel arithmetic that set these two numbers.
 *
 * The width is the largest that keeps the whole stone plus its horn inside the bay at THREE options, which
 * is the tighter of the two cases: `fitScale` is 0.517 there against 0.452 at four, so a panel that fits
 * at three fits at four with room to spare. The height is what six lines of it leave in 5.80 units.
 */
const PLATE_W = 3.42;
const PLATE_H = 0.7;

/** Clear air between the two plates of a pair, which the joining is drawn into. */
const WORD_GAP = 0.3;
/** Centre to centre WITHIN a pair. */
const PAIR_PITCH = PLATE_W + WORD_GAP;

/**
 * Between one line and the next, and it is the same for every line including the stem and the empty place.
 *
 * UNIFORM, WHICH TOOK A DECISION. Giving the stem and the empty place more air than the candidates get
 * would separate the question from the choices, which is genuinely useful — and it would also make the
 * candidate lines the tight ones, which is where the reading happens. The separation is carried instead by
 * a carved rail across the stone (see `railY`) and by the candidate hue tabs, neither of which costs any
 * height. The 0.19 of stone left between plate rims is what makes six lines read as six.
 */
const ROW_PITCH = 0.98;

/** The recess one pair is set into: both plates and a hand's width of stone around them. */
const ROW_W = PAIR_PITCH + PLATE_W + 0.24;

/** The standing stone itself. Its height follows the number of lines; its width never does. */
const STONE_W = ROW_W + 0.46;

/** The horn's mouth radius, and where it hangs off the stone's shoulder. */
const HORN_R = 0.5;
const HORN_X = -(STONE_W / 2 + 0.34);

/**
 * A hue per candidate, so a child can hold "the blue line" across four spoken pairs.
 *
 * BY POSITION, NEVER BY CONTENT, which is what makes it safe: it is a handle for referring to a candidate
 * and it carries not one bit about which candidate is right. `DayLog` already does exactly this and argues
 * for it. It matters less than it did — the lines have words on them now, which is a far better handle —
 * but a child who cannot yet read them still needs one, and it costs nothing.
 *
 * `gold` is left out of the ring on purpose: it resolves to `HUE.honey`, which is the socket's colour, and
 * the hollow's rule is that the missing place is the only thing wearing it.
 */
const CAND_HUES = ['coral', 'blue', 'teal', 'violet'] as const;
function hueFor(i: number): string {
  return bankColor(CAND_HUES[i % CAND_HUES.length] ?? 'coral');
}

/** How many lines the stone has: the given pair, the empty place, and one per candidate. */
function lineCount(n: number): number {
  return 2 + Math.max(1, n);
}

/** The height of the nth line from the top, measured from the stone's own centre. */
function lineY(i: number, lines: number): number {
  return ((lines - 1) / 2 - i) * ROW_PITCH;
}

/* ============================================================================
   the parts
   ========================================================================== */

/**
 * THE JOINING, drawn the same way in all three places: a cord run between the two plates of a pair, over a
 * groove cut in the stone behind it.
 *
 * This is what makes a pair read as A PAIR WITH SOMETHING BETWEEN THEM rather than as two words that
 * happen to be next to each other, which is the difference between a child comparing relations and a child
 * comparing words. Carved stone and vine rather than light, because the missing place is the only thing in
 * the hollow allowed to glow and a lit tie immediately above a lit socket merges with it — the mistake
 * `SortingGate.tsx` records against its own IN bin.
 *
 * SYMMETRIC, with no arrowhead and no taper. Direction is carried by which word is on which side, exactly
 * as the written form carries it by reading order. Since nearly every item in this bank carries a reversal
 * lure, this is the discrimination the whole presentation turns on — see the header.
 *
 * IT SITS IN THE GAP AND NOT IN FRONT OF THE PLATES. The old version of this file cut its groove behind
 * the cradle's front board, so the one element carrying the whole idea of the presentation was hidden
 * behind a plank in every shot. Here the plates are 0.30 apart and the cord runs through that air, which
 * cannot be occluded by anything.
 */
function Joining() {
  return (
    <group>
      {/* The groove, cut into the stone behind the cord. */}
      <mesh position={[0, 0, -0.06]}>
        <boxGeometry args={[WORD_GAP + 0.06, 0.26, 0.06]} />
        <meshStandardMaterial {...MAT.cut} />
      </mesh>
      {/* The cord itself. Vine rather than stone so the joining reads as a TIE — something put there on
          purpose — rather than as a moulding in the slab. */}
      <mesh position={[0, 0, 0.06]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.055, 0.055, WORD_GAP + 0.16, 10]} />
        <meshStandardMaterial {...MAT.vine} />
      </mesh>
      {[-1, 1].map((side) => (
        <mesh key={side} position={[(side * (WORD_GAP + 0.14)) / 2, 0, 0.06]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.085, 0.095, 0.08, 14]} />
          <meshStandardMaterial color={shade(HUE.stoneDeep, 0.06)} roughness={0.9} metalness={0} />
        </mesh>
      ))}
    </group>
  );
}

/**
 * The line one pair sits in: a recess cut across the stone, wide enough for both plates.
 *
 * `band` is the candidate's own hue, on a tab at the recess's left end and never on a plate. Absent for the
 * stem, which is not a candidate and does not need a handle to refer to it by; what the stem must share
 * with the candidates is the ARRANGEMENT, and it does, because this is the same component.
 */
function Line({ band }: { band?: string }) {
  const bed = useSlab(ROW_W, PLATE_H + 0.3, 0.18, 0.08);
  return (
    <group>
      <mesh geometry={bed} position={[0, 0, -0.16]}>
        <meshStandardMaterial {...MAT.stoneDeep} />
      </mesh>
      {band ? (
        <mesh position={[-(ROW_W / 2 + 0.1), 0, -0.06]}>
          <boxGeometry args={[0.16, PLATE_H, 0.1]} />
          {/* Not emissive, and never will be. See the header on what glows. */}
          <meshStandardMaterial color={band} roughness={0.9} metalness={0} />
        </mesh>
      ) : null}
    </group>
  );
}

/**
 * A LINE WHOSE PAIR HAS GONE UP: the recess, the hue tab, and two plain stone blanks where the plates were.
 *
 * THE BLANKS ARE THE WHOLE POINT AND A SHOT PUT THEM THERE. Removing the plates and leaving the bare recess
 * looked right in the code and came back wrong: the vacated line is a long dark rectangle, and next to a
 * FILLED socket — which by then has a pair sitting in it and is no longer dark — it becomes the most
 * missing-looking place on the stone. Two competing empty places, and the brighter one is the answered
 * question. So the line is closed over in mid stone: plainly used, plainly not a socket, and it still holds
 * its shape so the row of candidates does not collapse by one.
 */
function SpentLine({ band, blank }: { band: string; blank: THREE.ExtrudeGeometry }) {
  return (
    <group>
      <Line band={band} />
      {[0, 1].map((i) => (
        <mesh key={i} geometry={blank} position={[(i === 0 ? -PAIR_PITCH : PAIR_PITCH) / 2, 0, 0]}>
          <meshStandardMaterial color={shade(HUE.stone, -0.05)} roughness={0.95} metalness={0} />
        </mesh>
      ))}
    </group>
  );
}

/** One complete pair: two word plates in one line with the joining between them. */
function WordPair({
  words,
  marks,
  band,
}: {
  words: readonly [string, string];
  marks: readonly [EventMark | null, EventMark | null];
  band?: string;
}) {
  return (
    <group>
      <Line band={band} />
      <Joining />
      {[0, 1].map((i) => (
        <group key={i} position={[(i === 0 ? -PAIR_PITCH : PAIR_PITCH) / 2, 0, 0.02]}>
          <WordCard word={words[i] ?? ''} w={PLATE_W} h={PLATE_H} mark={marks[i] ?? null} />
        </group>
      ))}
    </group>
  );
}

/**
 * THE ONE MISSING PLACE: an empty line with two sockets in it, joined the same way the stem's pair is.
 *
 * The hollow has exactly one convention for this and every dressing in the directory uses it — a recessed
 * dark bed ringed in breathing honey light, the only thing in the world that moves on its own. A child who
 * cannot read a word of this finds it in under a second, and having found it has understood the item
 * without being told: those two up there go together, and TWO MORE go here, joined the same way.
 *
 * BOTH HALVES BREATHE ON ONE CLOCK, driven from here rather than from inside `EmptySlot`, because this is
 * one place and not two: two sockets pulsing out of phase read as two separate places. Nothing here goes
 * through React — the two ring materials are collected and mutated inside `useFrame`, which is
 * `theme.ts`'s rule about what may run at 60fps. Under `prefers-reduced-motion` the breath resolves to its
 * MIDPOINT rather than to nothing, so the sockets still plainly glow and the affordance survives.
 */
function EmptyPlace({ filled }: { filled: boolean }) {
  const frame = useRef<THREE.Group>(null);
  const reduced = useReducedMotion();
  const mats = useRef<(THREE.MeshStandardMaterial | null)[]>([null, null]);

  useFrame(({ clock }) => {
    const b = filled ? 0.25 : breath(clock.elapsedTime, 2.6, reduced);
    for (const m of mats.current) if (m) m.emissiveIntensity = 0.4 + b * 0.9;
    if (frame.current) {
      const s = filled ? 1 : 1 + b * 0.02;
      frame.current.scale.set(s, s, 1);
    }
  });

  return (
    <group>
      <Line />
      <Joining />
      <group ref={frame}>
        {[0, 1].map((i) => (
          <group key={i} position={[(i === 0 ? -PAIR_PITCH : PAIR_PITCH) / 2, 0, 0]}>
            <EmptySlot
              w={PLATE_W}
              h={PLATE_H}
              onMaterial={(m) => {
                mats.current[i] = m;
              }}
            />
          </group>
        ))}
      </group>
    </group>
  );
}

/**
 * TELL IT AGAIN. A horn grown out of the standing stone's shoulder, mouth turned toward the child.
 *
 * WHY A HORN AND NOT A BUTTON, and why this one is the same species as `DayLog`'s rather than a new idea:
 * a child who missed a word needs to ask for it again without being told how, and by the time they reach
 * this station they may already have met the log's horn and learned what it does. Two different "say it
 * again" objects in one battery would be two things to learn. Three states, as there:
 *
 *   speaking — lit and pulsing, so a child knows the machine is mid-sentence and it is not their turn.
 *   dormant  — no glow at all, plain carved stone. This is what a machine with no voice looks like, and
 *              it has to look like something, or a child spends the round pressing it. Still pressable,
 *              because a press is how a late-loading voice gets discovered.
 *   lit      — the crosshair is on it.
 *
 * `prefers-reduced-motion` pins the pulse to its midpoint: a still horn that is plainly lit, rather than a
 * horn that stops existing.
 */
function Horn({ speaking, dormant, lit }: { speaking: boolean; dormant: boolean; lit: boolean }) {
  const mouth = useRef<THREE.MeshStandardMaterial>(null);
  const reduced = useReducedMotion();

  useFrame(({ clock }) => {
    if (!mouth.current) return;
    const b = speaking ? breath(clock.elapsedTime, 1.1, reduced) : 0;
    mouth.current.emissiveIntensity = dormant ? 0 : (lit ? 0.5 : 0.16) + b * 0.7;
  });

  return (
    /* Yawed well round, because a horn seen square on is a ring, and a ring is a bowl. The first shot had
       it at -0.22 and what came back was a brown doughnut floating beside the stone. */
    <group rotation={[0, -0.5, 0]}>
      {/* The neck, which lets the horn into the stone. Without it the bell hangs in the air beside a slab
          it has no visible relationship with — which is what the first shot showed. */}
      <mesh position={[0.34, 0, -0.34]} rotation={[0, Math.PI / 2, 0]}>
        <cylinderGeometry args={[0.13, 0.16, 0.7, 12]} />
        <meshStandardMaterial {...MAT.stoneDeep} />
      </mesh>
      {/* The bell. Two-sided, because a child looking INTO a single-sided cone sees a hole in the world —
          the mistake `DayLog`'s horn documents. */}
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[HORN_R, HORN_R * 0.36, 0.62, 24, 1, true]} />
        <meshStandardMaterial color={shade(HUE.stone, 0.1)} roughness={0.9} metalness={0} side={2} />
      </mesh>
      {/* The lit disc inside the mouth. Never white when bright: a mouth that loses its rim stops being a
          horn and becomes a bead. */}
      <mesh position={[0, 0, 0.3]}>
        <circleGeometry args={[HORN_R * 0.86, 24]} />
        <meshStandardMaterial
          ref={mouth}
          color={dormant ? shade(HUE.stoneDeep, -0.1) : HUE.honey}
          emissive={dormant ? '#000000' : HUE.honey}
          emissiveIntensity={0}
          roughness={0.6}
          metalness={0}
        />
      </mesh>
      {/* The lip, unrotated: a torus already lies in the XY plane, and turning it a quarter turn to match
          the cone lays a flat band across the mouth that reads as a carrying handle. */}
      <mesh position={[0, 0, 0.31]}>
        <torusGeometry args={[HORN_R, 0.075, 10, 28]} />
        <meshStandardMaterial {...MAT.stoneDeep} />
      </mesh>
      {/* The collar, where the horn is let into the stone. Without it the bell floats. */}
      <mesh position={[0, 0, -0.34]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[HORN_R * 0.42, HORN_R * 0.42, 0.26, 16]} />
        <meshStandardMaterial {...MAT.stoneDeep} />
      </mesh>
    </group>
  );
}

/* ============================================================================
   the stone
   ========================================================================== */

export function KinshipStone({
  content,
  onPick,
  disabled = false,
}: {
  content: Record<string, unknown>;
  onPick: (handed: string) => void;
  disabled?: boolean;
}) {
  const [picked, setPicked] = useState<number | null>(null);
  const [hover, setHover] = useState<number | null>(null);
  const [onHorn, setOnHorn] = useState(false);
  const [narration, setNarration] = useState<NarrationState>('idle');
  const reduced = useReducedMotion();

  const pairs = useMemo(() => pairsOf(content), [content]);
  const lines = lineCount(pairs?.options.length ?? 4);
  const stoneH = lines * ROW_PITCH + 0.3;
  const stoneSlab = useSlab(STONE_W, stoneH, 0.3, 0.18);
  /** What a spent line is closed over with. Built here because a hook may not live inside the option map. */
  const blank = useSlab(PLATE_W, PLATE_H, 0.1, 0.05);

  /**
   * PICTURES ARE ALL OR NOTHING PER ITEM — see `kinshipStoneDraws`, which argues that a per-word rule
   * would leave the correct pair as the only bare line on the stone, because the undrawable word in an
   * analogy is systematically the category the relation is about. It resolves false for every item today,
   * which is why the plates carry words and no cow. The words are the channel; this is the trimming.
   */
  const drawn = useMemo(() => kinshipStoneDraws(content), [content]);

  const marksOf = useCallback(
    (pair: readonly [string, string]): readonly [EventMark | null, EventMark | null] =>
      drawn ? [tokenGlyph(pair[0]), tokenGlyph(pair[1])] : [null, null],
    [drawn],
  );

  /**
   * The candidates.
   *
   * `handed` comes from `handedFor` and from nowhere else. For this type it resolves to the POSITION,
   * because these options carry no `key` — see the note in the header. The function is shared with every
   * other presentation here precisely so that no file gets its own opinion about it.
   */
  const options = useMemo(() => {
    const raw = Array.isArray(content.options) ? (content.options as Record<string, unknown>[]) : [];
    return (pairs?.options ?? []).map((pair, i) => ({
      index: i,
      handed: handedFor(raw[i], i),
      pair,
      marks: marksOf(pair),
      hue: hueFor(i),
    }));
  }, [content, pairs, marksOf]);

  /** Everything the stone says and the silence between. Nothing here may reorder or relabel it. */
  const said = useMemo(() => analogyLines(content), [content]);

  const retell = useCallback(() => {
    if (said.length === 0) return;
    narrate(said, setNarration);
  }, [said]);

  /**
   * Told once on arrival, after a beat, and then left alone.
   *
   * Automatic rather than waiting for a press, because a child should not have to discover the horn to
   * hear the words the first time; the horn is for the second and third. Nothing is left talking when the
   * item changes — this component is keyed on the item, so unmount is per question.
   */
  useEffect(() => {
    if (said.length === 0) return;
    if (!canSpeak()) {
      setNarration('unavailable');
      return;
    }
    const t = setTimeout(retell, ARRIVAL_BEAT_MS);
    return () => {
      clearTimeout(t);
      hushSpeech();
    };
  }, [said, retell]);

  const voiceless = narration === 'unavailable';
  const speaking = narration === 'speaking';

  /**
   * Say one pair on its own, which is what a child who has lost track of one line actually wants.
   *
   * SUPPRESSED WHILE THE ARRIVAL TELLING IS RUNNING, and that guard is not cosmetic: `speak()` cancels
   * whatever is queued, so a cursor drifting down the stone during the opening would chop the question
   * off mid-sentence and leave the child with one candidate and no ask.
   */
  const sayPair = useCallback(
    (pair: readonly [string, string]) => {
      if (speaking) return;
      speak(saidPair(pair));
    },
    [speaking],
  );

  if (!pairs) return null;

  const stemMarks = marksOf(pairs.stem);
  const pickedOption = picked === null ? null : (options.find((o) => o.index === picked) ?? null);
  const sockY = lineY(1, lines);
  /** Where the carved rail runs: between the empty place and the first candidate. */
  const railY = (lineY(1, lines) + lineY(2, lines)) / 2;

  return (
    <group>
      {/* The stone itself. */}
      <mesh geometry={stoneSlab} position={[0, 0, -0.34]}>
        <meshStandardMaterial {...MAT.stone} />
      </mesh>
      {/* A moss cap, so a standing stone in a hollow looks like it has been standing a while. */}
      <mesh position={[0, stoneH / 2 - 0.07, -0.34]}>
        <boxGeometry args={[STONE_W - 0.3, 0.14, 0.34]} />
        <meshStandardMaterial {...MAT.moss} />
      </mesh>
      {/* THE RAIL, which is what separates the question from the choices now that every line has the same
          pitch. A moulding rather than air, because air would have to come out of the line spacing and the
          line spacing is where the reading happens. */}
      <mesh position={[0, railY, -0.2]}>
        <boxGeometry args={[STONE_W - 0.16, 0.1, 0.3]} />
        <meshStandardMaterial {...MAT.stoneDeep} />
      </mesh>

      {/* GIVEN: the pair whose joining the child has to read. */}
      <group position={[0, lineY(0, lines), 0]}>
        <WordPair words={pairs.stem} marks={stemMarks} />
      </group>

      {/* MISSING: two more, joined the same way. The only thing here that glows. */}
      <group position={[0, sockY, 0]}>
        <EmptyPlace filled={pickedOption !== null} />
        {pickedOption ? (
          <SeatedPair
            words={pickedOption.pair}
            marks={pickedOption.marks}
            band={pickedOption.hue}
            from={[0, lineY(2 + pickedOption.index, lines) - sockY, 0]}
            reduced={reduced}
          />
        ) : null}
      </group>

      {/* The horn, off the stone's shoulder, where nothing is measuring. */}
      <group position={[HORN_X, lineY(0, lines), 0.1]}>
        <Horn speaking={speaking} dormant={voiceless} lit={onHorn} />
      </group>
      {/* A five-year-old aiming in three dimensions does not hit a horn, so what actually takes the press
          is a volume far larger than the horn — everything a child could plausibly be pointing at when
          they mean "again". Its lower edge clears the topmost candidate line's own volume. */}
      <mesh
        visible={false}
        position={[HORN_X, lineY(0, lines), 0.6]}
        onPointerOver={(e) => {
          e.stopPropagation();
          setOnHorn(true);
        }}
        onPointerOut={(e) => {
          e.stopPropagation();
          setOnHorn(false);
        }}
        onClick={(e) => {
          e.stopPropagation();
          // Unlimited, untimed, unrecorded. Nothing about hearing it again is scored.
          retell();
        }}
      >
        <boxGeometry args={[1.5, 1.4, 1.4]} />
      </mesh>

      {/* CANDIDATES: the same pair object, the same size, on the same plane, one line each. */}
      {options.map((o) => {
        const y = lineY(2 + o.index, lines);
        const live = !disabled && picked === null;
        const lit = hover === o.index && live;
        const taken = picked === o.index;
        return (
          <group key={o.index} position={[0, y, 0]}>
            {/* Invisible and oversized: the WHOLE LINE takes the press, tiled edge to edge at the line
                pitch. No gap to fall through, and no overlap — overlapping volumes mean the child who
                aims between two lines gets whichever one three happens to hit first, which is a coin toss
                wearing a choice's clothes. A full-width line is a far more forgiving target than the old
                shelf's cards were, which is the one thing the new layout gives away for free. */}
            <mesh
              visible={false}
              position={[0, 0, 0.5]}
              onPointerOver={(e) => {
                e.stopPropagation();
                setHover(o.index);
                sayPair(o.pair);
              }}
              onPointerOut={(e) => {
                e.stopPropagation();
                setHover((h) => (h === o.index ? null : h));
              }}
              onClick={(e) => {
                e.stopPropagation();
                // A tap on a line that cannot be chosen any more still says it, because wanting to hear
                // it again is not the same as wanting to answer and must never cost anything.
                if (!live) {
                  sayPair(o.pair);
                  return;
                }
                setPicked(o.index);
                onPick(o.handed);
              }}
            >
              <boxGeometry args={[STONE_W, ROW_PITCH, 1.7]} />
            </mesh>

            {/* The pair leaves its line when it is seated, so the stone shows what is still on offer. The
                line is then closed over in stone rather than left as a hole — see `SpentLine`. */}
            {taken ? (
              <SpentLine band={o.hue} blank={blank} />
            ) : (
              <group position={[0, lit ? 0.06 : 0, 0]}>
                <WordPair words={o.pair} marks={o.marks} band={o.hue} />
              </group>
            )}

            {/* The hover tell: a lit ledge the full width of the line, which is unmissable to a child who
                is not sure whether their aim landed. It lives in the 0.19 of stone between this line's
                plates and the next line's, so it costs no reading height, and it is UNDER the line rather
                than on it, so it can never be read as one plate being brighter than another. */}
            <mesh position={[0, -(PLATE_H / 2 + 0.13), 0.06]}>
              <boxGeometry args={[ROW_W - 0.4, 0.12, 0.4]} />
              <meshStandardMaterial
                color={lit ? HUE.honey : shade(HUE.stone, 0.04)}
                emissive={lit ? HUE.honey : '#000000'}
                emissiveIntensity={lit ? 0.55 : 0}
                roughness={0.8}
                metalness={0}
              />
            </mesh>
          </group>
        );
      })}
    </group>
  );
}

/**
 * The chosen pair, rising from its line into the empty place.
 *
 * WHY IT MOVES AT ALL. A pair that simply appears in the sockets reads as the stone having filled them; a
 * pair that visibly travels from its line reads as the CHILD having put it there. The difference matters
 * because of what the movement is not: it is not a verdict. The pair rises whichever one was chosen,
 * because rising is what the child SAID about it. Nothing here knows or could know whether it is right.
 *
 * Half a second, because the interesting part of this presentation is over once the pick is made and an
 * animation that outlasts its meaning is a delay. Under `prefers-reduced-motion` there is no travel at all:
 * the pair is simply seated, which is the resting state of the same fact.
 *
 * It keeps its own hue on the way up and after it lands, so the pair in the empty place is visibly the pair
 * that left the line it came from.
 */
function SeatedPair({
  words,
  marks,
  band,
  from,
  reduced,
}: {
  words: readonly [string, string];
  marks: readonly [EventMark | null, EventMark | null];
  band: string;
  /** Where the pair started, in the empty place's own coordinates. */
  from: readonly [number, number, number];
  reduced: boolean;
}) {
  const group = useRef<THREE.Group>(null);
  const t = useRef(reduced ? 1 : 0);

  useFrame((_, dt) => {
    if (!group.current) return;
    t.current = Math.min(1, t.current + dt / 0.5);
    const e = 1 - (1 - t.current) * (1 - t.current);
    group.current.position.set(from[0] * (1 - e), from[1] * (1 - e), from[2] * (1 - e));
  });

  return (
    <group ref={group} position={[from[0], from[1], from[2]]}>
      <WordPair words={words} marks={marks} band={band} />
    </group>
  );
}
