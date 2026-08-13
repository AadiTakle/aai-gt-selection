import { useFrame } from '@react-three/fiber';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type * as THREE from 'three';

import { handedFor } from './address';
import { tokenGlyph, type EventMark } from './eventMeaning';
import { canSpeak, hushSpeech, narrate, speak, type NarrationState, type StoryLine } from './speak';
/**
 * The gates live in a dependency-free module because the serve gate must run at POOL level, in the server
 * plugin's node context — by the time this component sees `content`, the engine has already chosen the
 * item, the child is looking at it, and an answer will be recorded against it. Re-exported here so there
 * is exactly one pair of predicates and they cannot drift between the pool and the panel.
 */
import { sortingGateDraws, sortingGateServes, tokenWords } from './sortbotGate';
import { breath, HUE, MAT, shade, useReducedMotion } from './theme';
import { EmptySlot, WordCard } from './wordPlate';

export { sortingGateDraws, sortingGateServes, tokenWords };

/**
 * `VER-SORTBOT-01` as a thing in the hollow: the sorting gate, a robot's head over two crates — one of
 * things that BELONG together and one of things that do not — with the words still to be judged on a shelf
 * below it.
 *
 * WHAT THE ITEM ACTUALLY IS, read off the bank rather than off the brief. `content` is
 * `{typeCode, presentation, prompt, examplesIn, examplesOut, options, frequencyBand}` and nothing else.
 * `examplesIn` is always exactly two `{text}`, `examplesOut` always exactly one, `options` are three (20
 * items) or four (80 items) of `{token: {text}}`, and the category itself is NEVER SERVED — it lives in
 * `provenance.derivation.rule` on disk, which the client does not get and must not want. So the rule can
 * only be shown, never stated, which is the whole reason this is a machine with two crates rather than a
 * label with a list under it.
 *
 * THERE IS NO "NEW WORD" FIELD, and the brief's description of one is the single place it and the payload
 * disagree. The candidate the child judges is not a separate token sitting on the machine — it IS whichever
 * option they choose. So the head's mouth is not where the question is displayed, it is where the ANSWER is
 * posted: the picked plate rises to the mouth and rides the lit chute down into the crate.
 *
 * ══ THE WORDS ARE THE ITEM, WHICH REVERSES WHAT THIS FILE USED TO DO ═══════════════════════════════
 *
 * This presentation was built on the rule that a five-year-old cannot read, so every token — both worked
 * examples, the counter-example and every option — was DRAWN through `tokenGlyph` and the words themselves
 * were never shown. `presentation` is `"word"`; the content is literally single words; and the drawing was
 * asked to carry all of it.
 *
 * IT COST 73 OF THE 100 ITEMS. `sortbotGate.ts` has the table: 4-5 and 6-8 were refused entirely because
 * nothing draws `nylon`, `hydro`, `argon` or `abate`, and ten of the 37 small-band items were refused
 * because two of their words drew alike. Worse, four of the 6-8 rules are `words that rhyme with cat`,
 * `compound words`, `words with double letters` and `past-tense verbs` — questions ABOUT THE LETTERS IN A
 * WORD, which no picture can ask and which are trivially answerable the moment the word is on screen. The
 * rule was not merely narrowing this bank, it was deleting the items that most needed words.
 *
 * So every word is now WRITTEN on its plate, large and dark on pale, and read aloud on arrival. The
 * pictures stay exactly where they were proven good — the 27 items of K-1 and 2-3 whose whole vocabulary
 * draws distinctly — and they are now a tile beside the word rather than a substitute for it, which is the
 * right way round for a pre-reader. `sortingGateDraws` decides that per ITEM and never per word, and the
 * header there explains why a per-word rule would leave the answer as the only bare plate on the shelf.
 *
 * The pool went from 27 to 82. What is still refused is 18 items of tier-1 vocabulary — `ad hominem`,
 * `parsimonious`, `abate` — because showing a word larger does not teach it; `readability.ts` argues that
 * one, including why it is a rarity tier and not the whole 6-8 band.
 *
 * ══ WHY THE LAYOUT TURNED NINETY DEGREES, WHICH IS ARITHMETIC AND NOT TASTE ════════════════════════
 *
 * The old shape put its words in rows: three across each crate, four across the shelf. Words do not fit in
 * it. The child reads this at `dock` 4.6m, which at 1280x800 and fov 62 is about 145 screen pixels per
 * world unit before `fitScale`, and `sites.ts` gives this type a bay of 4.70 x 3.00 units — so the entire
 * panel is about 680 x 435 pixels of screen however it is arranged. Six plates across a crate row and four
 * across a shelf is 110 pixels each, which is 9 pixels per character on `flashlight`.
 *
 * A crate holds its words in a COLUMN instead, and the shelf holds four in two columns of two. That is
 * two plates across the panel rather than six, and it buys:
 *
 *     plate 2.70 x 0.68 units   →   203 x 51 screen pixels
 *     letters                   →   about 30 pixels tall, on every word in the served bank
 *
 * WHAT IT COSTS is that the four candidates are no longer all the same distance from the camera: the
 * second shelf row is 0.9 units lower than the first, which is 1% further away and renders 1% smaller.
 * This directory holds that constraint hard — "a candidate nearer the camera renders larger, which is a
 * false signal on a comparison task" — so the number is worth stating rather than glossing: 1%, uniform,
 * identical for every item, against 9 pixels per character. The two columns are exactly equal.
 *
 * ONE PLATE SIZE AND ONE PLATE DEPTH, EVERYWHERE. Both crates, the socket and the shelf draw the identical
 * plate at the identical scale on the identical plane. Not tidiness: on a type whose whole question is "is
 * this thing the same KIND as those things", a size difference is a false signal about membership. The
 * shelf therefore drops in HEIGHT to separate itself from the crates and does not come forward at all.
 *
 * ══ THE PANEL SUPPLIES THE INSTRUCTION; THIS FILE SUPPLIES THE WORDS ══════════════════════════════
 *
 * `Game.tsx` renders `content.prompt` above the panel — "The robot sorted these words. Tap the new word
 * that also goes IN." — so nothing here draws a second copy of it, and the sentence the whole machine is
 * an illustration of is now actually on screen. The narration reads that same sentence aloud, which is what
 * a shared line between the written and the spoken channel is for.
 *
 * ══ HEARING IT AGAIN IS FREE, UNLIMITED AND UNTIMED ═══════════════════════════════════════════════
 *
 * NEW HERE, AND THE OWNER'S INSTRUCTION IS WHY. Narration used to be a single unrepeatable pass of the
 * prompt on arrival: a child who missed it had no way to ask again, which for a pre-reader is the whole
 * item gone. There is now a horn — the same object `DayLog` and `KinshipStone` use, so a child learns it
 * once — that retells the prompt, both crates and the whole shelf, and POINTING AT A PLATE says that word.
 * Both unlimited, neither timed, neither recorded, and both suppressed while the arrival telling is still
 * running so a wandering cursor cannot talk over the question.
 *
 * WHAT THE VOICE MAY SAY is everything on screen and nothing else. It never names the category: that lives
 * in `provenance.derivation.rule`, is not served, and is the answer. "These go in" and "this one does not"
 * are descriptions of where the words are sitting, which the child can see.
 *
 * ══ THE THINGS EVERY PRESENTATION HERE HAS LEARNED THE HARD WAY ═══════════════════════════════════
 *
 * MATTE. `roughness` never below 0.85 on anything structural and `metalness` zero throughout. A clearcoat
 * here would mirror the station lamp onto whichever plate happened to face it, and a plate that is
 * brighter than its neighbours is a plate a child will read as chosen.
 *
 * THE MISSING PLACE IS THE ONLY THING THAT GLOWS. The IN crate used to carry a honey band along its
 * headboard and the band worked — it just worked at the socket's expense, merging with it into one yellow
 * stripe. Which crate is which is carried by the lit chute pointing into one of them and by the socket
 * sitting in it, which is two cues, and the second is the one that poses the question.
 *
 * IT CANNOT KNOW THE ANSWER. Nothing here compares anything. The picked plate rides into the IN crate
 * because that is what the CHILD said about it — the machine performs the child's claim and passes no
 * comment on it. `onPick` hands back the address and that is all that leaves this file.
 *
 * THE ADDRESS HAZARD, which is the same one `DayLog` carries and the reason both call the same function.
 * These options have NO `key` field and this type's on-disk `answer.correctKey` is an INTEGER on all 100
 * items, so THE POSITION IS THE ANSWER and `onPick` must hand back `String(index)`. `handedFor` in
 * `address.ts` is the only thing allowed to decide that; hand back a letter and every item of this type is
 * marked wrong, confidently, with no error anywhere. `prove-drawn-types.ts` drives that exact function
 * against the live API on a NONZERO key for this type.
 *
 * ══ WHAT THE BAY HAS TO CONTAIN ═══════════════════════════════════════════════════════════════════
 *
 * `game/stations/sites.ts` is not this directory's to edit, so the arithmetic is left here. IT IS SAFE TO
 * LEAVE ALONE: the drawing fits inside the extents already declared there at both option counts, which is
 * the property that matters, and updating it would buy nothing because `fitScale` is already clamped.
 *
 *     declared today   halfW 4.37, halfH 2.84   →  `fitScale` min(4.70/8.74, 3.00/5.68) = 0.528, clamped
 *                                                  to its 0.52 ceiling, so BOTH option counts render at
 *                                                  exactly 0.52 and the declared box is the budget.
 *     actually drawn   halfW 4.47   the horn's outer edge at four options, where the machine itself is
 *                                   only 3.12 — the horn is what sets the width. At three options the
 *                                   shelf is 8.58 wide and the horn still just wins.
 *                      halfH 2.84 at four options (0.95 head + 2.70 crates + 0.22 + 1.80 shelf), 2.39 at
 *                                   three, where the shelf is one row instead of two.
 *
 * 8.94 x 5.67 at 0.52 projects to 4.65 x 2.95 of a 4.70 x 3.00 bay: inside the sill, with 5 hundredths of
 * a unit to spare on the width. That margin is deliberate and it is the reason `PLATE_W` is 2.70 and not
 * 2.80 — re-run the measurement rather than taking it on trust, because the three-option shelf is the
 * binding case and it is the one nobody looks at.
 */

/* ============================================================================
   what gets said
   ========================================================================== */

/** Between spoken lines. Equal everywhere, and exactly equal between candidates — see `speak.ts`. */
const LINE_GAP_MS = 780;

/** How long after arriving the gate speaks. Matches `DayLog` and `KinshipStone`, so the hollow has one pace. */
const ARRIVAL_BEAT_MS = 900;

/** Used only if an item arrives with no authored prompt. The bank's own wording, so it cannot drift. */
const FALLBACK_ASK = 'Tap the word that also goes in.';

/**
 * A run of words as ONE utterance, so a crate's contents arrive as one group rather than as loose words.
 *
 * The capitals and the full stops are for intonation only, which is the argument `speak.ts` makes in
 * `settled`: `speechSynthesis` takes its contour from punctuation, and bare nouns run together are read as
 * an unfinished list with a rising tail. The words themselves are the bank's and are never altered — what
 * this says is exactly what the plates show.
 *
 * EVERY WORD IN THE RUN IS CAPITALISED, not just the first, which a node-side print of the real lines
 * caught: `These go in. Dog. cat.` The full stop had already told the voice to fall, and the lowercase word
 * after it is a sentence that starts in the middle. Each word in a crate is its own settled sentence.
 */
function saidRun(lead: string, words: readonly string[]): string {
  const said = words.map((w) => w.charAt(0).toUpperCase() + w.slice(1));
  return `${lead} ${said.join('. ')}.`;
}

/**
 * Everything the machine says, and the silence between: the item's own prompt, what is in each crate, then
 * every word on the shelf.
 *
 * PURE AND FREE OF `window`, like `speak.ts`'s `storyLines`, so a node-side check can print exactly what a
 * child would hear for a real item without booting a browser.
 *
 * IT NEVER NAMES THE CATEGORY. `provenance.derivation.rule` is the answer and is not served; "these go in"
 * and "this one does not" describe where the words are sitting, which is on screen. The shelf is spoken in
 * the order it is drawn, top to bottom then left to right, because that order is how a child knows which
 * plate they just heard — addressing, not content — and the gaps are equal so no plate is marked special.
 */
export function sortLines(content: Record<string, unknown>): StoryLine[] {
  const texts = (v: unknown, dig: (o: Record<string, unknown>) => unknown): string[] =>
    (Array.isArray(v) ? (v as Record<string, unknown>[]) : [])
      .map((o) => dig(o ?? {}))
      .map((t) => (typeof t === 'string' ? t.trim() : ''))
      .filter((t) => t.length > 0);

  const inWords = texts(content.examplesIn, (o) => o.text);
  const outWords = texts(content.examplesOut, (o) => o.text);
  const options = texts(content.options, (o) => (o.token as Record<string, unknown> | undefined)?.text);
  if (options.length === 0) return [];

  const prompt = typeof content.prompt === 'string' ? content.prompt.trim() : '';
  const lines: StoryLine[] = [{ text: prompt.length > 0 ? prompt : FALLBACK_ASK, gapMs: LINE_GAP_MS }];
  if (inWords.length > 0) lines.push({ text: saidRun('These go in.', inWords), gapMs: LINE_GAP_MS });
  if (outWords.length > 0) {
    lines.push({
      text: saidRun(outWords.length === 1 ? 'This one does not.' : 'These do not.', outWords),
      gapMs: LINE_GAP_MS,
    });
  }
  for (const w of options) lines.push({ text: saidRun('', [w]).trim(), gapMs: LINE_GAP_MS });
  return lines;
}

/* ============================================================================
   layout
   ========================================================================== */

/**
 * ONE WORD PLATE, and every place in the item is exactly this one. See the header for the pixel arithmetic
 * that set these two numbers, and for why a plate may never be a different size from the things it is being
 * compared with.
 *
 * 2.70 rather than 2.80 because the THREE-OPTION shelf is the binding case: three of these at a 2.94 pitch
 * is 8.58 units, and the bay is 4.70 at a `fitScale` of 0.52, which is 9.04 units of room in total.
 */
const PLATE_W = 2.7;
const PLATE_H = 0.68;

/** Between one plate and the next, down a crate or down the shelf. */
const ROW_PITCH = 0.9;

/** A crate, outer: one plate wide plus its walls. */
const CRATE_W = PLATE_W + 0.34;
/**
 * Clear air between the two crates, and it is wide because a screenshot said so twice.
 *
 * At 0.16 the two crates butted up into ONE box with a divider down the middle, which on a type whose whole
 * question is "does this belong with those or not" deletes the question — a child looking at one box has no
 * reason to read the left half as a different pile from the right. It is also where the robot's head lives,
 * so the gap has to be wide enough to hold it in open air rather than sitting it on the crates' shoulders,
 * which is what the first shot showed: a dark mushroom growing out of the woodwork.
 */
const BIN_GAP = 0.8;
/** Crate centres. */
const BIN_X = (CRATE_W + BIN_GAP) / 2;

/**
 * How many slots a crate is built to hold. BOTH CRATES GET THE SAME COUNT even though one holds three
 * things and the other holds one, because a larger crate reads as a more important crate and which pile is
 * bigger is not what the child is being asked. The OUT crate's spare slots are plain interior with no
 * recess drawn in them, so nothing there competes with the socket.
 */
const CRATE_SLOTS = 3;

/** The head's mouth and throat. Small — see the note on `Head`. */
const HEAD_RT = 0.44;
const HEAD_RB = 0.18;
const HEAD_H = 0.5;
/** The band at the top of the panel the head occupies, measured from the panel's own top edge. */
const HEAD_BAND = 0.95;

/** Between the crates' floor and the shelf's first row. */
const SHELF_GAP = 0.22;

/** The horn's mouth radius, and how far out from the machine it hangs. */
const HORN_R = 0.5;

/**
 * How the shelf is arranged, which is the one thing that changes with the option count.
 *
 * FOUR OPTIONS GO IN TWO COLUMNS OF TWO, aligned under the two crates, because four plates in a row do not
 * fit in the bay at a readable size — that is the whole arithmetic in the header. THREE GO IN ONE ROW,
 * because 2-plus-1 would leave one plate alone on a row with a hole beside it, and a plate that is the only
 * thing on its row is a plate a child looks at first. One row of three fits at 2.94 pitch with 0.46 of the
 * bay to spare.
 */
function shelfShape(n: number): { cols: number; rows: number; pitchX: number } {
  if (n <= 3) return { cols: Math.max(1, n), rows: 1, pitchX: 2.94 };
  return { cols: 2, rows: Math.ceil(n / 2), pitchX: BIN_X * 2 };
}

/** Where the nth plate of a row of `count` sits. */
function slotX(i: number, count: number, pitch: number): number {
  return (i - (count - 1) / 2) * pitch;
}

/* ============================================================================
   the parts
   ========================================================================== */

/**
 * A crate: an open box the robot has already sorted words into, holding them in a column.
 *
 * NOTHING ON IT GLOWS, which a screenshot corrected in the old layout and which still holds. The IN crate
 * used to carry a honey band along its headboard to mark itself out, and the band worked — it just worked
 * at the socket's expense. A run of lit trim immediately above a lit slot, in the same honey, merged with
 * it: the empty place stopped being the brightest thing on screen and became part of a yellow stripe. The
 * hollow's rule is that the missing place is the ONLY thing that glows, and it is a rule because this is
 * what happens when it is bent.
 */
function Crate({ slots }: { slots: number }) {
  const h = slots * ROW_PITCH;
  return (
    <group>
      {/*
        * The back the plates stand against, and it is a LIGHT timber rather than the deep bark it started
        * as. The OUT crate holds one word in a three-slot box, so most of its back is bare, and in deep bark
        * that bare part came back from a shot as a black hole in the machine — heavier than anything with
        * information on it. Bare crate should read as an empty crate, which is dull, not as a void.
        */}
      <mesh position={[0, -h / 2, -0.26]}>
        <boxGeometry args={[CRATE_W, h, 0.16]} />
        <meshStandardMaterial color={shade(HUE.barkSoft, 0.14)} roughness={0.94} metalness={0} />
      </mesh>
      {/* Side walls. */}
      {[-1, 1].map((side) => (
        <mesh key={side} position={[(side * CRATE_W) / 2, -h / 2, -0.02]}>
          <boxGeometry args={[0.16, h, 0.62]} />
          <meshStandardMaterial {...MAT.barkDeep} />
        </mesh>
      ))}
      {/* The floor. Structure, not signal — see the note above about what happened when this was honey. */}
      <mesh position={[0, -h + 0.07, -0.02]}>
        <boxGeometry args={[CRATE_W, 0.14, 0.62]} />
        <meshStandardMaterial {...MAT.barkDeep} />
      </mesh>
      {/*
        * AND THERE IS NO CAPPING RAIL ALONG THE TOP, which a shot deleted. A 0.12 rail at the crate's lip
        * sits 0.08 in FRONT of the socket's honey ring and cut the top off it: the ring came back as an L
        * along the left and bottom of the slot instead of a ring, and the one thing in this world that must
        * never be hard to find was the thing being occluded by trim.
        */}
    </group>
  );
}

/**
 * The robot's head, and the two short spouts it drops words through — one into each crate.
 *
 * WHY THE SPOUTS ARE STUBS AND NOT CHUTES, which is the correction the first shot of this layout forced.
 * The old row layout ran a long board from the head's throat diagonally down into each bin, and the lit one
 * was the whole reason a child could tell which bin the question was about. In a COLUMN layout that device
 * cannot work: both crates fill from their top slot, which is level with the head, so the "chute" has 1.5
 * units of run and 0.15 of drop. What came back was two planks lying across the crates' shoulders — clutter
 * that read as scaffolding, and the lit one was a yellow sliver nobody would follow.
 *
 * So the run is gone and only the pointing is kept: two stubby spouts angled down and out of the head's
 * base, the LEFT ONE LIT, ending in open air above each crate's first slot. It is still a path with a light
 * on it ending at a place with a hole in it, which is a sentence a five-year-old reads without being taught
 * the vocabulary; it is just three inches long instead of two feet. The socket in the IN crate is the other
 * cue and the one that actually poses the question.
 *
 * THE HEAD IS SMALL, which the old layout's first screenshot decided. At a 1.15 mouth radius it was wider
 * than a crate, and from the child's vantage — which looks slightly UP at the panel — you saw straight into
 * the cone: a big brown lampshade with a dark hole in it, the largest object in the frame and the one
 * carrying the least information. The mouth only has to be wide enough to take a posted plate on its way
 * through, which is what it is for. Two-sided, because a child looking INTO a single-sided cone sees a hole
 * in the world — the mistake `DayLog`'s horn documents — and the lip is an unrotated torus for the reason
 * that file gives at length.
 */
function Head() {
  const timber = useMemo(() => shade(HUE.barkSoft, 0.16), []);
  return (
    <group>
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[HEAD_RT, HEAD_RB, HEAD_H, 26, 1, true]} />
        <meshStandardMaterial color={timber} roughness={0.9} metalness={0} side={2} />
      </mesh>
      <mesh position={[0, HEAD_H / 2, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[HEAD_RT, 0.09, 10, 30]} />
        <meshStandardMaterial {...MAT.barkDeep} />
      </mesh>
      <mesh position={[0, -HEAD_H / 2, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[HEAD_RB, 0.07, 8, 20]} />
        <meshStandardMaterial {...MAT.barkDeep} />
      </mesh>
      {/* The two ways out. `side` -1 is the IN crate, which is the lit one. */}
      {[-1, 1].map((side) => (
        <group
          key={side}
          position={[side * 0.3, -HEAD_H / 2 - 0.12, 0]}
          rotation={[0, 0, side * -0.72]}
        >
          <mesh>
            <boxGeometry args={[0.6, 0.16, 0.42]} />
            <meshStandardMaterial {...MAT.bark} />
          </mesh>
          {[-1, 1].map((rail) => (
            <mesh key={rail} position={[0.03, 0.09, rail * 0.22]}>
              <boxGeometry args={[0.56, 0.1, 0.08]} />
              <meshStandardMaterial
                color={side < 0 ? HUE.honey : shade(HUE.barkSoft, -0.12)}
                emissive={side < 0 ? HUE.honey : '#000000'}
                emissiveIntensity={side < 0 ? 0.45 : 0}
                roughness={0.85}
                metalness={0}
              />
            </mesh>
          ))}
        </group>
      ))}
    </group>
  );
}

/**
 * TELL IT AGAIN. A horn on the machine's shoulder, mouth turned toward the child.
 *
 * THE SAME OBJECT `DayLog` AND `KinshipStone` USE, deliberately: a child who missed a word needs to ask for
 * it again without being told how, and three different "say it again" objects in one battery would be three
 * things to learn. Three states, as there: pulsing while speaking, plain dead stone on a machine with no
 * voice (so nobody spends the round pressing it), lit when the crosshair is on it. Still pressable when
 * dormant, because a press is how a late-loading voice gets discovered.
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
    /* Yawed well round, because a horn seen square on is a ring, and a ring is a bowl. */
    <group rotation={[0, -0.5, 0]}>
      <mesh position={[0.34, 0, -0.34]} rotation={[0, Math.PI / 2, 0]}>
        <cylinderGeometry args={[0.13, 0.16, 0.7, 12]} />
        <meshStandardMaterial {...MAT.barkDeep} />
      </mesh>
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[HORN_R, HORN_R * 0.36, 0.62, 24, 1, true]} />
        <meshStandardMaterial color={shade(HUE.barkSoft, 0.16)} roughness={0.9} metalness={0} side={2} />
      </mesh>
      <mesh position={[0, 0, 0.3]}>
        <circleGeometry args={[HORN_R * 0.86, 24]} />
        <meshStandardMaterial
          ref={mouth}
          color={dormant ? shade(HUE.bark, 0.06) : HUE.honey}
          emissive={dormant ? '#000000' : HUE.honey}
          emissiveIntensity={0}
          roughness={0.6}
          metalness={0}
        />
      </mesh>
      <mesh position={[0, 0, 0.31]}>
        <torusGeometry args={[HORN_R, 0.075, 10, 28]} />
        <meshStandardMaterial {...MAT.barkDeep} />
      </mesh>
      <mesh position={[0, 0, -0.34]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[HORN_R * 0.42, HORN_R * 0.42, 0.26, 16]} />
        <meshStandardMaterial {...MAT.barkDeep} />
      </mesh>
    </group>
  );
}

/**
 * THE ONE MISSING PLACE: the empty slot at the top of the IN crate, which is the whole question in one
 * object.
 *
 * A child who cannot read a word finds it in under a second, and having found it they have understood the
 * item without being told anything: two words are in this crate, one word is in that one, and this crate
 * has room for one more. The rule is never stated because it never can be; it is shown by what is already
 * sorted. Under `prefers-reduced-motion` the breath resolves to its MIDPOINT rather than to nothing, so the
 * socket still plainly glows and the affordance survives.
 */
function Socket({ filled }: { filled: boolean }) {
  const frame = useRef<THREE.Group>(null);
  const reduced = useReducedMotion();
  const mat = useRef<THREE.MeshStandardMaterial | null>(null);

  /* Mutated inside the frame loop rather than pushed through React — `theme.ts`'s rule about what may run
     at 60fps, and the reason `EmptySlot` hands its material out instead of taking a glow prop. */
  useFrame(({ clock }) => {
    const b = filled ? 0.25 : breath(clock.elapsedTime, 2.6, reduced);
    if (mat.current) mat.current.emissiveIntensity = 0.4 + b * 0.9;
    if (frame.current) {
      const s = filled ? 1 : 1 + b * 0.02;
      frame.current.scale.set(s, s, 1);
    }
  });

  return (
    <group ref={frame}>
      <EmptySlot
        w={PLATE_W}
        h={PLATE_H}
        onMaterial={(m) => {
          mat.current = m;
        }}
      />
    </group>
  );
}

/* ============================================================================
   the gate
   ========================================================================== */

export function SortingGate({
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

  /**
   * PICTURES ARE ALL OR NOTHING PER ITEM — see `sortingGateDraws`. True for the 27 items of K-1 and 2-3
   * whose whole vocabulary draws distinctly, false for everything else, and a false is now a plate with a
   * word on it rather than an item nobody may be served.
   */
  const drawn = useMemo(() => sortingGateDraws(content), [content]);
  const markOf = useCallback((word: string): EventMark | null => (drawn ? tokenGlyph(word) : null), [drawn]);

  const examplesIn = useMemo(() => wordsOf(content.examplesIn, (o) => o.text), [content]);
  const examplesOut = useMemo(() => wordsOf(content.examplesOut, (o) => o.text), [content]);

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
      return { index: i, handed: handedFor(o, i), word: text };
    });
  }, [content]);

  /** Everything the machine says and the silence between. Nothing here may reorder or relabel it. */
  const said = useMemo(() => sortLines(content), [content]);

  const retell = useCallback(() => {
    if (said.length === 0) return;
    narrate(said, setNarration);
  }, [said]);

  /**
   * Told once on arrival, after a beat, and then left alone — the horn is for the second and third time.
   * Nothing is left talking when the item changes: this component is keyed on the item, so unmount is per
   * question.
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
   * Say one word on its own, which is what a pre-reader pointing at a plate wants.
   *
   * SUPPRESSED WHILE THE ARRIVAL TELLING IS RUNNING: `speak()` cancels whatever is queued, so a cursor
   * drifting across the shelf during the opening would chop the prompt off mid-sentence.
   */
  const sayWord = useCallback(
    (word: string) => {
      if (speaking || word.length === 0) return;
      speak(`${word.charAt(0).toUpperCase()}${word.slice(1)}.`);
    },
    [speaking],
  );

  const n = Math.max(1, options.length);
  const shelf = shelfShape(n);

  /* The panel's own box, top-down: the head's band, the crates, a gap, then the shelf. */
  const panelH = HEAD_BAND + CRATE_SLOTS * ROW_PITCH + SHELF_GAP + shelf.rows * ROW_PITCH;
  const top = panelH / 2;
  /** The top edge of a crate's interior: where its first slot begins. */
  const crateTop = top - HEAD_BAND;
  /* The head sits in the air between the two crates, above their shoulders — see `BIN_GAP`. */
  const headY = crateTop + 0.44;
  const slotY = (i: number): number => crateTop - (i + 0.5) * ROW_PITCH;
  const shelfTop = crateTop - CRATE_SLOTS * ROW_PITCH - SHELF_GAP;
  const shelfY = (row: number): number => shelfTop - (row + 0.5) * ROW_PITCH;

  /**
   * The horn hangs off the machine's left shoulder, and this is the number that sets the PANEL'S WIDTH.
   *
   * The machine itself is 6.88 wide at four options; the horn takes the drawn width to 8.98, which at
   * `fitScale` 0.52 projects to 4.67 of the bay's 4.70. Three hundredths of a unit, so a horn moved further
   * out pokes through the bay's frame — re-measure rather than nudging this.
   */
  const hornX = -(BIN_X + CRATE_W / 2 + 0.55);

  /** Where a posted plate starts, where it passes through, and where it comes to rest. */
  const mouth = [0, headY - HEAD_H / 2 - 0.1, 0.3] as const;
  const rest = [-BIN_X, slotY(0), 0.02] as const;

  const pickedOption = picked === null ? null : (options.find((o) => o.index === picked) ?? null);
  const pickedFrom = (): readonly [number, number, number] => {
    if (!pickedOption) return [0, 0, 0];
    const row = Math.floor(pickedOption.index / shelf.cols);
    const col = pickedOption.index % shelf.cols;
    return [slotX(col, Math.min(shelf.cols, n), shelf.pitchX), shelfY(row), 0.02];
  };

  return (
    <group>
      {/* The machine's head, in the air between the crates, with a lit spout leaning toward the crate that
          has the empty place in it and a dull one leaning the other way. */}
      <group position={[0, headY, 0]}>
        <Head />
      </group>

      {/* IN: what the robot has already decided belongs, and room for one more at the top. */}
      <group position={[-BIN_X, crateTop, 0]}>
        <Crate slots={CRATE_SLOTS} />
      </group>
      <group position={[-BIN_X, slotY(0), 0]}>
        <Socket filled={pickedOption !== null} />
      </group>
      {examplesIn.map((word, i) => (
        <group key={`in-${i}`} position={[-BIN_X, slotY(i + 1), 0.02]}>
          <WordCard word={word} w={PLATE_W} h={PLATE_H} mark={markOf(word)} />
        </group>
      ))}

      {/* OUT: what it decided does not. Its crate is built to the same size — see `CRATE_SLOTS`. */}
      <group position={[BIN_X, crateTop, 0]}>
        <Crate slots={CRATE_SLOTS} />
      </group>
      {examplesOut.map((word, i) => (
        <group key={`out-${i}`} position={[BIN_X, slotY(i), 0.02]}>
          <WordCard word={word} w={PLATE_W} h={PLATE_H} mark={markOf(word)} />
        </group>
      ))}

      {/* The horn, out on the machine's shoulder, where nothing is measuring. Level with the crate's upper
          wall rather than with the head, so its neck is let into timber instead of hanging in the sky. */}
      <group position={[hornX, crateTop - 0.34, 0.1]}>
        <Horn speaking={speaking} dormant={voiceless} lit={onHorn} />
      </group>
      {/* A five-year-old aiming in three dimensions does not hit a horn, so what takes the press is a
          volume far larger than the horn. It sits clear of the shelf's own volumes, which start 1.9 units
          below it. */}
      <mesh
        visible={false}
        position={[hornX, crateTop - 0.34, 0.6]}
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

      {/* The posted plate, riding from the shelf through the mouth and down into the crate. */}
      {pickedOption ? (
        <PostedCard
          word={pickedOption.word}
          mark={markOf(pickedOption.word)}
          from={pickedFrom()}
          via={mouth}
          to={rest}
          reduced={reduced}
        />
      ) : null}

      {/* The shelf of words to choose from. */}
      <group>
        {/* The plank the shelf stands on, under the last row. */}
        <mesh position={[0, shelfY(shelf.rows - 1) - PLATE_H / 2 - 0.28, -0.12]}>
          <boxGeometry args={[Math.min(shelf.cols, n) * shelf.pitchX + 0.5, 0.24, 1.0]} />
          <meshStandardMaterial {...MAT.bark} />
        </mesh>
        {options.map((o) => {
          const row = Math.floor(o.index / shelf.cols);
          const colsHere = Math.min(shelf.cols, n);
          const col = o.index % shelf.cols;
          const x = slotX(col, colsHere, shelf.pitchX);
          const y = shelfY(row);
          const live = !disabled && picked === null;
          const lit = hover === o.index && live;
          const taken = picked === o.index;
          return (
            <group key={o.index} position={[x, y, 0]}>
              {/* Invisible and oversized, tiled edge to edge at the shelf pitch in BOTH directions — no gap
                  to fall through and no overlap, because overlapping volumes mean the child who aims
                  between two plates gets whichever one three happens to hit first, which is a coin toss
                  wearing a choice's clothes. */}
              <mesh
                visible={false}
                position={[0, 0, 0.5]}
                onPointerOver={(e) => {
                  e.stopPropagation();
                  setHover(o.index);
                  sayWord(o.word);
                }}
                onPointerOut={(e) => {
                  e.stopPropagation();
                  setHover((h) => (h === o.index ? null : h));
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  // A tap on a plate that cannot be chosen any more still says it, because wanting to hear
                  // it again is not the same as wanting to answer and must never cost anything.
                  if (!live) {
                    sayWord(o.word);
                    return;
                  }
                  setPicked(o.index);
                  onPick(o.handed);
                }}
              >
                <boxGeometry args={[shelf.pitchX, ROW_PITCH, 1.7]} />
              </mesh>

              {/* The plate leaves the shelf when it is posted, so the shelf shows what is still on offer
                  and nothing else. Its ledge stays, so the gap still reads as a place. */}
              {taken ? null : (
                <group position={[0, lit ? 0.06 : 0, 0.02]}>
                  <WordCard word={o.word} w={PLATE_W} h={PLATE_H} mark={markOf(o.word)} />
                </group>
              )}

              {/* The hover tell: a lit ledge the width of the plate, in the air below it. Unmissable to a
                  child who is not sure whether their aim landed, and UNDER the plate rather than on it, so
                  it can never be read as one word being brighter than another. */}
              <mesh position={[0, -(PLATE_H / 2 + 0.11), 0.06]}>
                <boxGeometry args={[PLATE_W - 0.2, 0.09, 0.42]} />
                <meshStandardMaterial
                  color={lit ? HUE.honey : shade(HUE.barkSoft, 0.06)}
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
 * The chosen plate, posted into the head and riding the lit chute down to the empty place.
 *
 * WHY IT MOVES AT ALL. A plate that simply teleports into the socket reads as the socket having been filled
 * by the machine; a plate that visibly travels from the shelf, through the mouth, into the crate reads as
 * the CHILD having put it there. The difference matters because of what the movement is not: it is not a
 * verdict. The plate goes to the IN crate whichever option was chosen, because going to the IN crate is
 * what the child SAID about it. Nothing here knows or could know whether that is right.
 *
 * TWO LEGS RATHER THAN ONE STRAIGHT RUN, which is the one thing the old version could not do because its
 * shelf was not under the mouth: up into the head, then down the lit chute. That is the machine's own story
 * and it is worth the six lines — a straight diagonal from the shelf to the crate would say the plate went
 * around the machine rather than through it.
 *
 * Just over half a second for the pair of legs, because the interesting part of this presentation is over
 * once the pick is made and an animation that outlasts its meaning is a delay. Under
 * `prefers-reduced-motion` there is no travel at all: the plate is simply in the socket, which is the
 * resting state of the same fact.
 */
function PostedCard({
  word,
  mark,
  from,
  via,
  to,
  reduced,
}: {
  word: string;
  mark: EventMark | null;
  from: readonly [number, number, number];
  via: readonly [number, number, number];
  to: readonly [number, number, number];
  reduced: boolean;
}) {
  const group = useRef<THREE.Group>(null);
  const t = useRef(reduced ? 1 : 0);

  useFrame((_, dt) => {
    if (!group.current) return;
    t.current = Math.min(1, t.current + dt / 0.62);
    // The first 45% is the rise to the mouth, the rest is the ride down the chute. Each leg is eased so
    // the plate leaves briskly and settles rather than arriving at speed.
    const leg = t.current < 0.45 ? t.current / 0.45 : (t.current - 0.45) / 0.55;
    const e = 1 - (1 - leg) * (1 - leg);
    const a = t.current < 0.45 ? from : via;
    const b = t.current < 0.45 ? via : to;
    group.current.position.set(
      a[0] + (b[0] - a[0]) * e,
      a[1] + (b[1] - a[1]) * e,
      a[2] + (b[2] - a[2]) * e,
    );
  });

  return (
    <group ref={group} position={[from[0], from[1], from[2]]}>
      <WordCard word={word} w={PLATE_W} h={PLATE_H} mark={mark} />
    </group>
  );
}

/** Every `{text}` in a list, trimmed, in reading order. */
function wordsOf(value: unknown, dig: (o: Record<string, unknown>) => unknown): string[] {
  return (Array.isArray(value) ? (value as Record<string, unknown>[]) : [])
    .map((o) => dig(o ?? {}))
    .map((t) => (typeof t === 'string' ? t.trim() : ''))
    .filter((t) => t.length > 0);
}
