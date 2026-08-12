import { useFrame } from '@react-three/fiber';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Text } from '@react-three/drei';
import type * as THREE from 'three';

import { handedFor } from './address';
import { EventGlyph } from './EventGlyph';
import { tokenGlyph, type EventMark } from './eventMeaning';
import { canSpeak, hushSpeech, narrate } from './speak';
/**
 * The gate lives in a dependency-free module because it must run at POOL level, in the server plugin's
 * node context — by the time this component sees `content`, the engine has already chosen the item, the
 * child is looking at it, and an answer will be recorded against it. Re-exported here so there is exactly
 * one predicate and it cannot drift between the pool and the panel.
 */
import { SORTING_GATE_BANDS, sortingGateServes, tokenWords } from './sortbotGate';

export { SORTING_GATE_BANDS, sortingGateServes };
import { HUE, MAT, breath, shade, useReducedMotion, useSlab } from './theme';

/**
 * `VER-SORTBOT-01` as a thing in the hollow: the sorting gate, a hopper with two chutes running off it,
 * one into the bin of things that BELONG and one into the bin of things that do not.
 *
 * WHAT WAS WRONG BEFORE THIS FILE. Nothing was wrong with it; nothing existed. The verbal station had
 * exactly one presentation built — the day's log — so every verbal round a child ever played was the same
 * style of question, which is the boredom the owner complained about. The nonverbal station rotates
 * through three and the quantitative through three. This is the verbal station's second.
 *
 * WHAT THE ITEM ACTUALLY IS, read off the bank rather than off the brief. `content` is
 * `{typeCode, presentation, prompt, examplesIn, examplesOut, options, frequencyBand}` and nothing else.
 * `examplesIn` is always exactly two `{text}`, `examplesOut` always exactly one, `options` are three (20
 * items) or four (80 items) of `{token: {text}}`, and the category itself is NEVER SERVED — it lives in
 * `provenance.derivation.rule` on disk, which the client does not get and must not want. So the rule can
 * only be shown, never stated, which is the whole reason this is a machine with two bins rather than a
 * label with a list under it.
 *
 * THERE IS NO "NEW WORD" FIELD, and the brief's description of one is the single place it and the payload
 * disagree. The candidate the child judges is not a separate token sitting on the hopper — it IS whichever
 * option they choose. So the hopper's mouth is not where the question is displayed, it is where the
 * ANSWER is posted: the picked card appears at the lip and rides the lit chute down into the bin. Until
 * something is picked the lip is empty, because until something is picked there is nothing to put on it.
 *
 * THE ADDRESS HAZARD, which is the same one `DayLog` carries and the reason both call the same function.
 * These options have NO `key` field and this type's on-disk `answer.correctKey` is an INTEGER on all 100
 * items, so THE POSITION IS THE ANSWER and `onPick` must hand back `String(index)`. `handedFor` in
 * `address.ts` is the only thing allowed to decide that; hand back a letter and every item of this type is
 * marked wrong, confidently, with no error anywhere. `prove-drawn-types.ts` drives that exact function
 * against the live API and this type is in its list.
 *
 * NO READING IS REQUIRED, and for this type that is a harder promise than it is for the log. The bank's
 * `presentation` is `"word"` and its content is literally single words, so a faithful rendering would be a
 * vocabulary test wearing a reasoning test's clothes. Every token — both worked examples, the one
 * counter-example and every option — is drawn instead, through `tokenGlyph`'s exact-match noun table in
 * `eventMeaning.ts`, which was built for this type. `SERVABLE` below is the guarantee that the drawing is
 * good enough to answer from, and it is a hard gate rather than a hope.
 *
 * ONE CARD SIZE AND ONE CARD DEPTH, EVERYWHERE. Both bins, the socket and the shelf all draw the identical
 * card at the identical scale on the identical plane. This is not tidiness: a shelf placed nearer the
 * camera than the apparatus renders candidates visibly larger, and on a type whose whole question is
 * "is this thing the same KIND as those things" a size difference is a false signal about membership. The
 * shelf therefore drops in HEIGHT to separate itself and does not come forward at all — the same trade
 * `Weave.tsx` argues at length for its own reasons.
 *
 * MATTE, LIKE THE REST OF THE HOLLOW. `roughness` never below 0.85 on anything structural and `metalness`
 * zero throughout. A clearcoat here would mirror the station lamp onto whichever card happened to face it,
 * and a card that is brighter than its neighbours is a card a child will read as chosen.
 *
 * IT CANNOT KNOW THE ANSWER. Nothing here compares anything. The picked card rides into the IN bin because
 * that is what the CHILD said about it, not because it is right — the machine performs the child's claim
 * and passes no comment on it. `onPick` hands back the address and that is all that leaves this file.
 *
 * WHAT THE BAY HAS TO CONTAIN. `game/stations/sites.ts` is not this directory's to edit, so the arithmetic
 * is left here for whoever adds the branch. Every one of the bank's 100 items has exactly two `examplesIn`
 * and one `examplesOut`, so `slots` is 3 and the bins are a FIXED size; only the option count varies, and
 * it never wins the width. Both cases therefore give the same box:
 *
 *     halfW  4.37   the bins' outer edges, `binX + binW / 2`. The 4-option shelf is 4.15 and the
 *                   3-option shelf 3.23, so the apparatus is the widest thing here — which is the
 *                   opposite of every other presentation in this directory, where the shelf always wins.
 *     halfH  2.84   the shelf plank's underside. The hopper's lip reaches 2.80 above, so the drawing is
 *                   very nearly symmetric about its own origin and the panel's centre can sit at the
 *                   site's own height with no adjustment.
 *
 *     if (typeCode === 'VER-SORTBOT-01') return { halfW: 4.37, halfH: 2.84 };
 *
 * AND IT WILL PROJECT SMALLER THAN THOSE NUMBERS SUGGEST, which is worth knowing because the bay note in
 * `sites.ts` is about projection at the child's eye rather than about half-extents. Every other
 * presentation hangs its shelf of candidates 0.4 to 3.1 units in FRONT of the panel plane and pays for it
 * in apparent size; this one hangs its shelf at the panel plane, for the reason given above, so the most
 * forward thing it draws is a bin's front board at z 0.32. There is no parallax to pay. `fitScale` lands
 * at 0.528 and is clamped to 0.52, giving a drawn panel of 4.54 x 2.95 against the Verbal bay's 5.10 x
 * 3.40 — but re-run the measurement rather than taking that on trust, because it is the projection and
 * not the box that the sill has to clear.
 */

/* ============================================================================
   what may be served
   ========================================================================== */

/**
 * THE BANDS THIS TYPE MAY BE SERVED TO, and the measurement that decides it.
 *
 * Run `tokenGlyph` over all 100 items of the bank and count, per band, the items that cannot be answered
 * from the pictures. Two ways to fail: an option that no drawing exists for (it falls through to a neutral
 * shell or pebble, which says nothing), and two options that resolve to the SAME drawing (which deletes
 * the choice between them). Measured, over the whole bank:
 *
 *     band          items   two options alike   an option unpictured   distinct tokens drawn
 *     K-1 + 2-3       37            0                    0                    155/155
 *     4-5             20            5                   19                     29/110
 *     6-8             43           26                   42                     43/264
 *
 * The small bands' vocabulary is concrete nouns a five-year-old can point at — cow, chair, bone. The 4-5
 * and 6-8 vocabulary is `abate`, `ad hominem`, `anchoring`, `ephemeral`, and no drawing of any quality
 * depicts those. More than half of the 6-8 items have two options resolving to one picture, which makes
 * them unanswerable from pictures however careful the drawing is; a child would be guessing while the
 * engine recorded the guess as ability. So the gate is not a preference and it is not tunable.
 */
/* `SORTING_GATE_BANDS`, `REFUSED`, `tokenWords` and `sortingGateServes` moved to `sortingGate.ts`,
   dependency-free, so the server plugin can apply the same gate when it builds the pool. */

/* ============================================================================
   layout
   ========================================================================== */

/**
 * ONE CARD, and every drawn token in the item is exactly this one. See the header for why a candidate may
 * never be a different size or a different distance from the things it is being compared with.
 */
const CARD = 1.02;
/** How much of the card the drawing fills. Lifted from `DayLog`'s slabs so a cow is a cow at both stations. */
const GLYPH = 0.84;
/** Between cards standing in a bin. Tight, because a bin is a row of things that were put together. */
const SLOT_PITCH = 1.16;
/**
 * Between cards on the shelf, and it is set by the HIT VOLUME rather than by the card.
 *
 * A five-year-old aiming a mouse in three dimensions is imprecise, so each candidate needs a collider far
 * larger than its drawing. Those colliders are tiled edge to edge at exactly this pitch — no gap to fall
 * through and no overlap, because overlapping volumes mean the child who aims between two cards gets
 * whichever one three happens to hit first, which is a coin toss wearing a choice's clothes. So the pitch
 * is the collider's width and the card floats in the middle of it with room all round.
 */
const OPT_PITCH = 1.85;

/** Clear air between the two bins, which the hopper stands over. */
const BIN_GAP = 1.1;
/** Where the row of cards inside a bin sits. */
const BIN_Y = 0.35;
/**
 * The hopper's middle, and it is SMALL — which the first screenshot decided.
 *
 * At a 1.15 mouth radius this was 2.3 units across, wider than a bin is tall, and from the child's vantage
 * — which looks slightly UP at the panel — you see straight into the cone. What came back was a big brown
 * lampshade hanging over the machine with a dark hole in it: the largest object in the frame, and the one
 * carrying the least information. The mouth now only has to be wide enough to hold a posted card, which is
 * what it is for, and the bins and the cards are the biggest things on screen again.
 */
const HOPPER_Y = 2.35;
const HOPPER_H = 0.7;
/** Mouth and throat. The mouth takes a whole card and not much more; the throat feeds the chutes. */
const HOPPER_RT = 0.68;
const HOPPER_RB = 0.26;
/**
 * The shelf, and it drops rather than coming forward — see the header.
 *
 * Chosen so the machine's visible top and the shelf plank's visible underside land at nearly the same
 * distance from the origin (2.79 up, 2.82 down), which keeps the panel's centre at the site's own height
 * the way every other presentation here does. The first pass had it at -2.1 and the extra third of a metre
 * of dead air read, in a shot, as two unrelated objects rather than one machine with a shelf under it.
 */
const SHELF_Y = -1.77;

/** How long after arriving the gate says the item's own prompt. Matches `DayLog`, for the same reason. */
const ARRIVAL_BEAT_MS = 900;

/** A card is drawn against this rather than against white — see the note in `Card`. */
const FACE = HUE.stone;

/** How many slots a bin holds. Both bins get the larger, so neither reads as the more important object. */
function binSlots(inCount: number, outCount: number): number {
  return Math.max(inCount + 1, outCount, 1);
}

/** Where the nth of `count` cards sits across a bin or a shelf. */
function slotX(i: number, count: number, pitch: number): number {
  return (i - (count - 1) / 2) * pitch;
}

/* ============================================================================
   the parts
   ========================================================================== */

/**
 * One token, drawn on a card.
 *
 * A WARM MID STONE RATHER THAN PAPER WHITE, which `DayLog` learned from a screenshot and this file inherits
 * rather than rediscovers: the pictures are built from primitives and a great many of them have white or
 * cream parts — an egg, a cloud, a hen, a plate, a glass — and against a near-white face those parts vanish
 * and the card looks half-drawn. The rim is a shade of the same stone rather than a colour, because a
 * coloured rim would be an attribute this item is not asking about, and `farm animals` items would start
 * looking like they had been grouped by trim.
 */
function Card({ mark, word }: { mark: EventMark; word?: string | undefined }) {
  const face = useSlab(CARD, CARD, 0.16, 0.09);
  const rim = useSlab(CARD + 0.1, CARD + 0.1, 0.11, 0.1);
  return (
    <group>
      <mesh geometry={rim} position={[0, 0, -0.05]}>
        <meshStandardMaterial color={shade(HUE.stoneDeep, 0.1)} roughness={0.9} metalness={0} />
      </mesh>
      <mesh geometry={face}>
        <meshStandardMaterial color={FACE} roughness={0.88} metalness={0} />
      </mesh>
      {/*
        * THE WORD, when the app's reading band allows one, and the picture otherwise.
        *
        * Not a style toggle. The glyph table matches 27 of this bank's 100 items; on the other 73 it either
        * cannot draw a word at all or draws two different words identically, and on 8 of those it draws the
        * KEYED ANSWER as the same shape as the OUT counter-example — so the only visible evidence points away
        * from the right answer. No glyph table can be completed out of that, because one whole family keys on
        * rhyme and another on abstract adjectives, and neither has a picture.
        *
        * The word is the bank's own intent: every item declares `presentation: "word"`. Third to fifth graders
        * read fluently and real CogAT sets Verbal Classification as words from grade 3 up. `showWords` comes
        * from the platform's app registration rather than from a constant here, so the presentation and the pool
        * the platform is selecting from cannot disagree.
        *
        * Sized off `CARD` rather than chosen: the longest word in the servable pool is nine characters, and at
        * 0.26 of the card width a nine-character word sits inside the face with a margin at every scale the
        * shelf takes.
        */}
      {word ? (
        <Text
          position={[0, 0.02, 0.13]}
          fontSize={CARD * 0.26}
          maxWidth={CARD * 0.92}
          textAlign="center"
          anchorX="center"
          anchorY="middle"
          color={shade(HUE.stoneDeep, -0.45)}
          outlineWidth={0}
        >
          {word}
        </Text>
      ) : (
        <group position={[0, 0.02, 0.12]} scale={GLYPH}>
          <EventGlyph glyph={mark.glyph} state={mark.state} bg={FACE} />
        </group>
      )}
    </group>
  );
}

/**
 * THE ONE MISSING PLACE: the empty slot at the end of the IN bin, which is the whole question in one
 * object.
 *
 * The hollow has exactly one convention for this and every dressing in the directory uses it — a recessed
 * dark bed ringed in breathing honey light, the only thing in the world that moves on its own. A child who
 * cannot read a word finds it in under a second, and having found it they have understood the item without
 * being told anything: two things are in this bin, one thing is in that bin, and this bin has room for one
 * more. The rule is never stated because it never can be; it is shown by what is already sorted.
 *
 * Under `prefers-reduced-motion` the breath resolves to its MIDPOINT rather than to nothing, so the socket
 * still plainly glows and the affordance survives — the rule the whole directory follows.
 */
function Socket({ filled }: { filled: boolean }) {
  const ring = useSlab(CARD + 0.16, CARD + 0.16, 0.14, 0.11);
  const bed = useSlab(CARD - 0.08, CARD - 0.08, 0.16, 0.09);
  const mat = useRef<THREE.MeshStandardMaterial>(null);
  const frame = useRef<THREE.Group>(null);
  const reduced = useReducedMotion();

  useFrame(({ clock }) => {
    const b = filled ? 0.25 : breath(clock.elapsedTime, 2.6, reduced);
    if (mat.current) mat.current.emissiveIntensity = 0.4 + b * 0.9;
    if (frame.current) {
      const s = filled ? 1 : 1 + b * 0.025;
      frame.current.scale.set(s, s, 1);
    }
  });

  return (
    <group>
      <group ref={frame}>
        <mesh geometry={ring} position={[0, 0, -0.12]}>
          <meshStandardMaterial
            ref={mat}
            color={HUE.honey}
            emissive={HUE.honey}
            emissiveIntensity={0.8}
            roughness={0.5}
            metalness={0}
          />
        </mesh>
      </group>
      <mesh geometry={bed} position={[0, 0, -0.04]}>
        <meshStandardMaterial {...MAT.cut} />
      </mesh>
    </group>
  );
}

/**
 * A bin: an open crate the robot has already sorted things into.
 *
 * BOTH BINS ARE BUILT TO THE SAME SIZE even though one holds three places and the other holds one, because
 * a larger crate reads as a more important crate and which pile is bigger is not what the child is being
 * asked.
 *
 * AND NEITHER OF THEM GLOWS, which a screenshot corrected. The IN bin used to carry a honey band along its
 * headboard to mark itself out, and the band worked — it just worked at the socket's expense. A metre of
 * lit trim immediately above a lit slot, in the same honey, merged with it: the empty place stopped being
 * the brightest thing on screen and became part of a yellow stripe. The hollow's rule is that the missing
 * place is the ONLY thing that glows, and it is a rule because this is what happens when it is bent. Which
 * bin is which is carried by the lit chute pointing into one of them and by the socket sitting in it, which
 * is two cues, and the second is the one that actually poses the question.
 */
function Bin({ w }: { w: number }) {
  return (
    <group>
      {/* Headboard, tall enough to stand a card against. */}
      <mesh position={[0, 0.05, -0.3]}>
        <boxGeometry args={[w, CARD + 0.44, 0.16]} />
        <meshStandardMaterial {...MAT.bark} />
      </mesh>
      {/* A plain capping rail. Structure, not signal — see the note above about what happened when this
          was honey. */}
      <mesh position={[0, 0.72, -0.21]}>
        <boxGeometry args={[w - 0.14, 0.14, 0.06]} />
        <meshStandardMaterial color={shade(HUE.barkSoft, -0.12)} roughness={0.9} metalness={0} />
      </mesh>
      <mesh position={[0, -0.61, 0]}>
        <boxGeometry args={[w, 0.16, 0.72]} />
        <meshStandardMaterial {...MAT.barkDeep} />
      </mesh>
      {/* The front board. Low on purpose — it has to hold the cards in without covering any part of a
          drawing, and a card's picture starts 0.42 above its own middle. */}
      <mesh position={[0, -0.44, 0.32]}>
        <boxGeometry args={[w, 0.34, 0.14]} />
        <meshStandardMaterial {...MAT.bark} />
      </mesh>
      {[-1, 1].map((side) => (
        <mesh key={side} position={[(side * w) / 2, -0.16, 0]}>
          <boxGeometry args={[0.16, 1.1, 0.72]} />
          <meshStandardMaterial {...MAT.barkDeep} />
        </mesh>
      ))}
    </group>
  );
}

/**
 * One chute: a board with two rails, running from the hopper's throat down to a bin.
 *
 * The lit one is the whole reason a child knows which bin the question is about. It is not an arrow and it
 * is not a label — it is a path with a light on it ending at a place with a hole in it, which is a sentence
 * a five-year-old reads without being taught the vocabulary.
 */
function Chute({
  from,
  to,
  drop,
  lit,
}: {
  from: readonly [number, number];
  to: readonly [number, number];
  /** How far the spout at the far end reaches down toward the bin's mouth. */
  drop: number;
  lit: boolean;
}) {
  const dx = to[0] - from[0];
  const dy = to[1] - from[1];
  const len = Math.hypot(dx, dy);
  return (
    <group>
      <group position={[(from[0] + to[0]) / 2, (from[1] + to[1]) / 2, 0]} rotation={[0, 0, Math.atan2(dy, dx)]}>
        <mesh>
          <boxGeometry args={[len, 0.16, 0.62]} />
          <meshStandardMaterial {...MAT.bark} />
        </mesh>
        {[-1, 1].map((side) => (
          <mesh key={side} position={[0, 0.07, side * 0.32]}>
            <boxGeometry args={[len, 0.12, 0.1]} />
            <meshStandardMaterial
              color={lit ? HUE.honey : shade(HUE.barkSoft, -0.12)}
              emissive={lit ? HUE.honey : '#000000'}
              emissiveIntensity={lit ? 0.4 : 0}
              roughness={0.85}
              metalness={0}
            />
          </mesh>
        ))}
      </group>
      {/* The spout, which is what makes the chute POINT INTO the bin rather than merely end above it. */}
      <mesh position={[to[0], to[1] - drop / 2, 0]}>
        <boxGeometry args={[0.34, drop, 0.5]} />
        <meshStandardMaterial {...MAT.barkDeep} />
      </mesh>
    </group>
  );
}

/**
 * The hopper: the machine's mouth, where a word is posted in.
 *
 * A truncated cone open at both ends and drawn two-sided, because a child is looking down INTO it and a
 * single-sided cone shows a hole in the world instead of a far inner wall — the mistake `DayLog`'s horn
 * documents. The lip is an unrotated torus for the same reason that file gives at length: a torus already
 * lies in the XY plane, and turning it a quarter turn to match the cone lays a flat band across the mouth
 * that reads as a handle.
 */
function Hopper() {
  const timber = useMemo(() => shade(HUE.barkSoft, 0.16), []);
  return (
    <group>
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[HOPPER_RT, HOPPER_RB, HOPPER_H, 26, 1, true]} />
        <meshStandardMaterial color={timber} roughness={0.9} metalness={0} side={2} />
      </mesh>
      <mesh position={[0, HOPPER_H / 2, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[HOPPER_RT, 0.1, 10, 30]} />
        <meshStandardMaterial {...MAT.barkDeep} />
      </mesh>
      <mesh position={[0, -HOPPER_H / 2, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[HOPPER_RB, 0.08, 8, 20]} />
        <meshStandardMaterial {...MAT.barkDeep} />
      </mesh>
    </group>
  );
}

/* ============================================================================
   the gate
   ========================================================================== */

/**
 * What the gate says on arrival, in place of the bank's prompt.
 *
 * "Point at" rather than "tap", because that is the gesture; "the one" rather than "the word", because the
 * cards are pictures whenever the app's reading band forbids text. Short enough to finish before a child has
 * chosen, which is the constraint that rules out explaining the rule — and the rule must not be explained
 * anyway, since inferring it is the item.
 */
const POINT_AND_PICK = 'The robot sorted these. Point at the one that also goes in.';

export function SortingGate({
  content,
  onPick,
  disabled = false,
  showWords = false,
}: {
  content: Record<string, unknown>;
  onPick: (handed: string) => void;
  disabled?: boolean;
  /**
   * Set the words as words rather than drawing them. Comes from the app's registered reading band.
   *
   * Defaults to `false` so a caller that has not thought about it gets the old behaviour rather than
   * accidentally putting text in front of a pre-reader.
   */
  showWords?: boolean;
}) {
  const [picked, setPicked] = useState<number | null>(null);
  const [hover, setHover] = useState<number | null>(null);
  const reduced = useReducedMotion();

  const examplesIn = useMemo(() => marksOf(content.examplesIn, (o) => o.text), [content]);
  const examplesOut = useMemo(() => marksOf(content.examplesOut, (o) => o.text), [content]);
  /**
   * The words themselves, kept beside the marks rather than instead of them.
   *
   * Both are needed at once: `showWords` decides per render which face a card shows, and the marks stay live so
   * that turning reading off does not require re-deriving anything.
   */
  const wordsIn = useMemo(() => wordsOf(content.examplesIn), [content]);
  const wordsOut = useMemo(() => wordsOf(content.examplesOut), [content]);

  /**
   * The candidates.
   *
   * `handed` comes from `handedFor` and from nowhere else. For this type it resolves to the POSITION,
   * because these options carry no `key` — see the note at the top of the file. The function is shared
   * with every other presentation here precisely so that no file gets its own opinion about it.
   */
  const options = useMemo(() => {
    const raw = Array.isArray(content.options) ? (content.options as Record<string, unknown>[]) : [];
    return raw.map((o, i) => {
      const token = (o?.token ?? {}) as Record<string, unknown>;
      const text = typeof token.text === 'string' ? token.text.trim() : '';
      return { index: i, handed: handedFor(o, i), mark: tokenGlyph(text), word: text };
    });
  }, [content]);

  /**
   * The item's own authored prompt, said once on arrival.
   *
   * A SECOND CHANNEL AND NOTHING MORE. Unlike the day's log — where the sentences ARE the item and a child
   * who hears nothing has been handed a blank — everything this item asks is on screen: two things sorted
   * one way, one thing sorted the other, a lit empty place. So there is no horn, no voiceless fallback and
   * no state to track. A machine with no voice loses the instruction and keeps the question, which is why
   * the pictures had to carry it in the first place.
   */
  useEffect(() => {
    /**
     * THE BANK'S PROMPT IS NOT SPOKEN VERBATIM, because on this surface it is twice wrong.
     *
     * Every item's `content.prompt` reads "The robot sorted these words. Tap the new word that also goes IN."
     * Both halves describe a different interface: nothing here TAPS — a child aims a crosshair under pointer
     * lock and clicks, or presses Enter — and when `showWords` is false the cards are not WORDS but pictures,
     * deliberately, so that the rule can be shown rather than stated. A child who trusts the sentence goes
     * looking for something to tap and for words that are not there.
     *
     * So the presentation owns its own wording. `POINT_AND_PICK` names the gesture this surface actually has
     * and stays true whichever face the cards are showing.
     */
    if (!canSpeak()) return;
    const t = setTimeout(() => narrate([POINT_AND_PICK]), ARRIVAL_BEAT_MS);
    return () => {
      clearTimeout(t);
      hushSpeech();
    };
  }, [content]);

  const slots = binSlots(examplesIn.length, examplesOut.length);
  const binInner = slots * SLOT_PITCH;
  const binW = binInner + 0.34;
  const binX = binW / 2 + BIN_GAP / 2;
  const n = Math.max(1, options.length);
  /**
   * The slot each bin fills first, and where its chute therefore points.
   *
   * BOTH BINS FILL FROM THE INSIDE OUT, which is what makes the machine symmetrical rather than merely
   * mirrored. The IN bin's empty socket is its innermost slot and the OUT bin's one card sits in its
   * innermost slot, so the two chutes come off the throat at the same angle and each lands over the thing
   * its side of the machine is about. Centring the OUT card in its crate instead — which is what this did
   * first — left the OUT chute pointing at bare planking for no reason a child could work out.
   */
  const mouthX = binX - slotX(slots - 1, slots, SLOT_PITCH);

  /** Where the posted card starts and where it comes to rest. Both are places on the machine. */
  const lip = [0, HOPPER_Y + HOPPER_H / 2 - 0.18, 0.3] as const;
  const rest = [-binX + slotX(examplesIn.length, slots, SLOT_PITCH), BIN_Y, 0.02] as const;

  const pickedMark = picked === null ? null : (options.find((o) => o.index === picked)?.mark ?? null);
  const pickedWord = picked === null ? undefined : options.find((o) => o.index === picked)?.word;

  return (
    <group>
      <group position={[0, HOPPER_Y, 0]}>
        <Hopper />
      </group>

      {/* The two paths out of the throat, and THE LIT ONE ENDS DIRECTLY ABOVE THE EMPTY SLOT.
          Two screenshots decided this shape. Aiming a chute at a bin's MIDDLE lays it across the cards
          standing in that bin — the first shot had the IN chute running over the socket, which is the one
          thing here that must never be hard to find. Running them out to the bins' far ends instead fixed
          the occlusion and cost more than it saved: two long symmetric diagonals meeting over the middle
          read, unmistakably, as the ROOF of a house, and the machine disappeared under it.
          Short and steep, ending over the slot each bin fills first, is what actually reads as a chute —
          and it makes the lit one into a pointing finger. Its spout stops at 1.15 and the tallest card
          tops out at 0.86, so it indicates the socket without covering any part of it. */}
      <Chute
        from={[-HOPPER_RB * 0.9, HOPPER_Y - HOPPER_H / 2]}
        to={[-mouthX, BIN_Y + 1.1]}
        drop={0.3}
        lit
      />
      <Chute
        from={[HOPPER_RB * 0.9, HOPPER_Y - HOPPER_H / 2]}
        to={[mouthX, BIN_Y + 1.1]}
        drop={0.3}
        lit={false}
      />

      {/* IN: what the robot has already decided belongs, and room for one more. */}
      <group position={[-binX, BIN_Y, 0]}>
        <Bin w={binW} />
        {examplesIn.map((mark, i) => (
          <group key={i} position={[slotX(i, slots, SLOT_PITCH), 0, 0.02]}>
            <Card mark={mark} word={showWords ? wordsIn[i] : undefined} />
          </group>
        ))}
        <group position={[slotX(examplesIn.length, slots, SLOT_PITCH), 0, 0.02]}>
          <Socket filled={pickedMark !== null} />
        </group>
      </group>

      {/* OUT: what it decided does not. Filled from the inside out, under its own chute — see `mouthX`. */}
      <group position={[binX, BIN_Y, 0]}>
        <Bin w={binW} />
        {examplesOut.map((mark, i) => (
          <group key={i} position={[slotX(i, slots, SLOT_PITCH), 0, 0.02]}>
            <Card mark={mark} word={showWords ? wordsOut[i] : undefined} />
          </group>
        ))}
      </group>

      {/* The posted card, riding from the lip down into the bin. See `PostedCard`. */}
      {pickedMark ? (
        <PostedCard
          mark={pickedMark}
          word={showWords ? pickedWord : undefined}
          from={lip}
          to={rest}
          reduced={reduced}
        />
      ) : null}

      {/* The shelf of words to choose from. */}
      <group position={[0, SHELF_Y, 0]}>
        <mesh position={[0, -CARD / 2 - 0.43, -0.1]}>
          <boxGeometry args={[n * OPT_PITCH + 0.9, 0.26, 1.15]} />
          <meshStandardMaterial {...MAT.bark} />
        </mesh>
        {options.map((o) => {
          const live = !disabled && picked === null;
          const lit = hover === o.index && live;
          const taken = picked === o.index;
          return (
            <group key={o.index} position={[slotX(o.index, n, OPT_PITCH), 0, 0]}>
              {/* Invisible and oversized, tiled edge to edge at the shelf pitch — see `OPT_PITCH`. */}
              <mesh
                visible={false}
                position={[0, 0, 0.5]}
                onPointerOver={(e) => {
                  e.stopPropagation();
                  setHover(o.index);
                }}
                onPointerOut={(e) => {
                  e.stopPropagation();
                  setHover((h) => (h === o.index ? null : h));
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  if (!live) return;
                  setPicked(o.index);
                  onPick(o.handed);
                }}
              >
                <boxGeometry args={[OPT_PITCH, 2.2, 1.7]} />
              </mesh>
              {/* The card leaves the shelf when it is posted, so the shelf shows what is still on offer
                  and nothing else. Its plinth stays, so the empty place still reads as a place. */}
              {taken ? null : (
                <group position={[0, lit ? 0.14 : 0, 0.02]} scale={lit ? 1.05 : 1}>
                  <Card mark={o.mark} word={showWords ? o.word : undefined} />
                </group>
              )}
              {/* The plinth is the hover tell: a whole lit block under the card, which is unmissable to a
                  child who is not sure whether their aim landed. */}
              <mesh position={[0, -CARD / 2 - 0.16, 0]}>
                <cylinderGeometry args={[0.4, 0.48, 0.16, 24]} />
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
    </group>
  );
}

/**
 * The chosen card, posted into the hopper and riding the lit chute down to the empty place.
 *
 * WHY IT MOVES AT ALL. A card that simply teleports into the socket reads as the socket having been filled
 * by the machine; a card that visibly travels from the mouth reads as the CHILD having put it there. The
 * difference matters because of what the movement is not: it is not a verdict. The card goes to the IN bin
 * whichever option was chosen, because going to the IN bin is what the child SAID about it. Nothing here
 * knows or could know whether that is right.
 *
 * A straight run rather than a follow of the chute's dogleg, and half a second rather than a beat longer,
 * because the interesting part of this presentation is over once the pick is made and an animation that
 * outlasts its meaning is a delay. Under `prefers-reduced-motion` there is no travel at all: the card is
 * simply in the socket, which is the resting state of the same fact.
 */
function PostedCard({
  mark,
  word,
  from,
  to,
  reduced,
}: {
  mark: EventMark;
  word?: string | undefined;
  from: readonly [number, number, number];
  to: readonly [number, number, number];
  reduced: boolean;
}) {
  const group = useRef<THREE.Group>(null);
  const t = useRef(reduced ? 1 : 0);

  useFrame((_, dt) => {
    if (!group.current) return;
    t.current = Math.min(1, t.current + dt / 0.55);
    // Eased so it leaves the lip briskly and settles rather than arriving at speed.
    const e = 1 - (1 - t.current) * (1 - t.current);
    group.current.position.set(
      from[0] + (to[0] - from[0]) * e,
      from[1] + (to[1] - from[1]) * e,
      from[2] + (to[2] - from[2]) * e,
    );
  });

  return (
    <group ref={group} position={[from[0], from[1], from[2]]}>
      <Card mark={mark} word={word} />
    </group>
  );
}

/** Every `{text}` in a list, turned into the picture that stands for it. */
/**
 * The words in the same order `marksOf` produces marks, so index `i` of one is index `i` of the other.
 *
 * Sharing the trim-and-drop-empties rule with `marksOf` is what keeps them aligned; a word list filtered by a
 * different predicate would silently put the wrong label on a card.
 */
function wordsOf(value: unknown): string[] {
  return (Array.isArray(value) ? (value as Record<string, unknown>[]) : [])
    .map((o) => (o ?? {}).text)
    .map((t) => (typeof t === 'string' ? t.trim() : ''))
    .filter((t) => t.length > 0);
}

function marksOf(value: unknown, dig: (o: Record<string, unknown>) => unknown): EventMark[] {
  return (Array.isArray(value) ? (value as Record<string, unknown>[]) : [])
    .map((o) => dig(o ?? {}))
    .map((t) => (typeof t === 'string' ? t.trim() : ''))
    .filter((t) => t.length > 0)
    .map(tokenGlyph);
}
