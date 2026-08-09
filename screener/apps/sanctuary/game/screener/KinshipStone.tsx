import { useFrame } from '@react-three/fiber';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type * as THREE from 'three';

import { handedFor } from './address';
import { EventGlyph } from './EventGlyph';
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

export { kinshipStoneDraws, kinshipStoneServes, pairWords };

/**
 * `VER-RELPAIR-01` as a thing in the hollow: the kinship stone, a standing stone with a pair of things
 * shown joined at the top and an empty joined place beneath it, and a row of candidate pairs below that.
 *
 * WHAT THE ITEM ACTUALLY IS, read off the bank rather than off the brief. `content` is
 * `{typeCode, presentation, relation, stemPair, options, frequencyBand}`. `stemPair` is always exactly two
 * `{text}`; `options` are three (15 items) or four (85 items), each `{pair: [{text}, {text}]}`. This is
 * Verbal Analogies — one of CogAT's three Verbal subtests — and the task is to pick the pair whose two
 * things are joined the same way the stem's two are.
 *
 * ══ THIS TYPE IS SPOKEN, AND THAT IS A MEASUREMENT, NOT A PREFERENCE ══════════════════════════════
 *
 * The obvious build is the one every other presentation here uses: draw every word through `tokenGlyph`
 * and let the child compare pictures. It was tried first and it does not exist. `tokenGlyph`'s noun table
 * was built for `VER-SORTBOT-01`'s vocabulary and against this bank it covers 91 of 445 distinct words —
 * 20% — and the number of items in which EVERY word has a drawing is, per band, 0, 0, 0 and 0. Not a thin
 * pool. No pool. `kinshipGate.ts` carries the per-band table.
 *
 * And it is not a gap a bigger table closes, which is the part that decided the design. The most frequent
 * misses are the superordinate halves of `is a kind of` pairs — `animal`, `fruit`, `insect`, `number`,
 * `person` — and a category has no appearance. Draw `animal` as an animal and the correct pair in
 * `robin : bird | maple : tree | robin : nest | bird : wing` becomes a bird beside a bird while the stem
 * shows two visibly different creatures, so the pair that shares the relation is the one pair that plainly
 * does not match: the item INVERTS and a child reasoning correctly is marked wrong. Draw it as a category
 * badge instead and the badge appears in the stem and in exactly one option, which hands over the answer.
 * `kinshipGate.ts` sets that argument out in full.
 *
 * So the words are said out loud, and the pictures are support that today never fires. This is not a
 * consolation prize: an analogy is four short pairs with NO ORDER TO HOLD, which is precisely what
 * `VER-SEQUENCE-01` — the type this one replaces — could not say for itself, and precisely why that one is
 * being retired. The listening load here is a comparison the child can re-check at will, not a sequence
 * they must keep intact while they think.
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
 * `the same way` is the strongest thing the ask is allowed to be. It says a relation exists, which the
 * child can see from the stem anyway, and says nothing whatever about which relation.
 *
 * THE TWO WORDS OF A PAIR ARRIVE AS ONE UTTERANCE and the pairs are separated by an equal silence. That is
 * the opposite gap structure from the log, and deliberately: there, running the parts together would claim
 * an order the array does not have; here, the PAIRING is the unit of meaning and splitting it into two
 * separate lines would offer the child eight loose words to reassemble.
 *
 * THE OPTIONS ARE SPOKEN LEFT TO RIGHT, in the order they stand on the stone, and unlike the log's parts
 * that order is CLAIMED and must be true — it is how a child knows which socket they just heard. It is
 * addressing, not content: the answer lives in the pairs, not in their arrangement. Their gaps are equal
 * for the reason `speak.ts` gives, since an extra beat anywhere would mark one candidate as special.
 *
 * ══ IT MUST BE REPEATABLE, WITHOUT LIMIT AND WITHOUT COST ═════════════════════════════════════════
 *
 * A spoken item that can be heard once is a memory test wearing a reasoning test's clothes, which is the
 * exact charge that retired `VER-SEQUENCE-01`. So there are two ways to hear it again, both unlimited,
 * neither timed, neither recorded:
 *
 *   THE HORN retells the whole item from the top, as many times as it is pressed. The hollow's established
 *     "say it again" object — see `DayLog.tsx`, which argues for the shape at length.
 *
 *   POINTING AT A PAIR says just that pair. This is the one that actually removes the memory load, and it
 *     is why the horn alone was not enough: a child who has lost track of which candidate was which does
 *     not need the whole item again, they need THAT one, and having to sit through three others to reach
 *     it is the load by another route. It is suppressed while the arrival telling is still running, so
 *     a wandering cursor cannot talk over the question.
 *
 * Nothing about either is scored. `onPick` fires on a click and on nothing else.
 *
 * ══ THE ONE FAILURE THIS CANNOT SURVIVE, WRITTEN DOWN RATHER THAN HIDDEN ══════════════════════════
 *
 * A machine with no voice. `speechSynthesis` is absent on some embeddings, present and permanently silent
 * on a school image with no voice packages, and blocked until a user gesture in others — `speak.ts`
 * enumerates them, and `DayLog` survives all of it because its pictures carry the story on their own. HERE
 * THEY DO NOT, because today there are none. On a voiceless machine this item has nothing in it.
 *
 * That cannot be decided when the pool is built, so it is not gated; it is detected (`voiceless` below),
 * the horn goes visibly dull so nobody spends the round pressing it, and it is reported. It is the single
 * biggest operational risk this type carries and it is a deployment question, not a rendering one.
 *
 * ══ THE THINGS EVERY PRESENTATION HERE HAS LEARNED THE HARD WAY ═══════════════════════════════════
 *
 * ONE CARD SIZE AND ONE CARD DEPTH, EVERYWHERE, and one PAIR ARRANGEMENT everywhere. The stem, the empty
 * place and every candidate draw the identical `Pair` at the identical scale on the identical plane. On
 * this type that is load-bearing twice over. Once for the usual reason — a shelf nearer the camera renders
 * candidates larger and a size difference is a false signal — and once for a reason peculiar to analogies:
 * nearly every item carries a REVERSAL lure, `fin : fish` against a stem of `flower : petal`, and the only
 * thing that distinguishes a pair from its reverse is which side each thing is on. That discrimination
 * survives only if the arrangement is pixel-identical between the stem and the candidates, which it is,
 * because they are the same component. It is also why no arrow, chevron or other direction mark is drawn:
 * direction is carried by position, the way the written form carries it by reading order, and a convention
 * a child has to be taught first is a vocabulary test hiding in a reasoning test.
 *
 * MATTE. `roughness` never below 0.85 on anything structural, `metalness` zero throughout. A clearcoat
 * would mirror the station lamp onto whichever card faced it, and a brighter card is a card a child reads
 * as chosen.
 *
 * THE MISSING PLACE IS THE ONLY THING THAT GLOWS. The hollow's one convention, and `SortingGate.tsx`
 * records what happens when it is bent: a band of honey trim next to a honey socket merges with it and the
 * empty place stops being findable. So the joining groove is carved stone and vine, not light, and the
 * candidate hues are muted bands on the cradles — never on the cards, never emissive.
 *
 * IT CANNOT KNOW THE ANSWER. Nothing here compares anything. The chosen pair rises into the empty place
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
 * `game/stations/sites.ts` is not this directory's to edit, so the arithmetic is left here for whoever adds
 * the branch. The candidate row always wins the width; the stone and the horn never do.
 *
 *     halfW   n * 1.30    the outer edge of the outermost cradle, `n * OPT_PITCH / 2`. 3.90 at three
 *                         options, 5.20 at four. The stone's own half-width is 1.43 and the horn reaches
 *                         2.31, both inside it at either count, so there is nothing to max() against —
 *                         but it is written as a max below in case a future item has two options.
 *     halfH   2.90        the stone's cap. The lowest plinth reaches 2.73 below, so the drawing is very
 *                         nearly symmetric about its own origin and the panel's centre can sit at the
 *                         site's own height with no adjustment.
 *
 *     if (typeCode === 'VER-RELPAIR-01') {
 *       const n = Array.isArray(content.options) ? content.options.length : 4;
 *       return { halfW: Math.max(1.43, n * 1.30), halfH: 2.90 };
 *     }
 *
 * MEASURED OFF THE CONSTANTS ABOVE AND CONFIRMED IN A SHOT AT 1280x800, not copied from a first draft:
 * every number here moved once already, when the candidate pitch had to grow to stop the four cradles
 * reading as one bench.
 *
 * AT FOUR OPTIONS THIS IS THE WIDEST PANEL THE VERBAL BAY HAS BEEN ASKED TO HOLD, and it costs apparent
 * size. `fitScale` is `min(4.7 / 10.40, 3.0 / 5.80)` = 0.452 at four options and clamps to 0.52 at three,
 * against the sorting gate's 0.52, so a card renders about 13% smaller than the same card at the same
 * station on the other type. That is the honest price of showing ten places instead of seven, and it is
 * paid in a currency this type barely spends: nothing on a card has to be READ, because the cards are
 * places and the words are in the air. Re-run the measurement rather than taking it on trust.
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
const OPENING = 'Listen. These two go together.';
/**
 * The load-bearing sentence. `the same way` names that a relation exists and refuses to name which one —
 * `content.relation` holds the answer in plain words and nothing here is allowed to leak it.
 */
const ASK = 'Which two go together the same way?';

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
 * bank's and are never otherwise altered.
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
    // Left to right, which is the order they stand in on the stone. See the header: here that order is
    // addressing rather than content, so claiming it is safe and necessary.
    ...p.options.map((o) => ({ text: saidPair(o), gapMs: LINE_GAP_MS })),
  ];
}

/* ============================================================================
   layout
   ========================================================================== */

/** One card, and every place in the item is exactly this one. See the header for why none may differ. */
const CARD = 1.02;
/** How much of the card a drawing fills, when there is one. Lifted from `DayLog` and `SortingGate`. */
const GLYPH = 0.84;
/** Centre to centre WITHIN a pair. */
const PAIR_GAP = 1.18;
/** Stone either side of the two cards. */
const CRADLE_PAD = 0.11;
/** One pair's cradle, outer. */
const CRADLE_W = PAIR_GAP + CARD + CRADLE_PAD * 2;
/**
 * Between candidate pairs, and it is set by the HIT VOLUME rather than by the cradle.
 *
 * A five-year-old aiming a mouse in three dimensions is imprecise, and on this type a miss costs more than
 * usual, because pointing is also how you hear a pair again. The colliders are tiled edge to edge at
 * exactly this pitch — no gap to fall through, and no overlap, since overlapping volumes mean the child
 * who aims between two pairs gets whichever one three happens to hit first, which is a coin toss wearing
 * a choice's clothes.
 *
 * IT IS WIDER THAN THE CRADLE, WHICH THE FIRST SHOT DECIDED. The pitch was the cradle exactly, on the
 * sorting gate's reasoning that a collider should be its object's width, and what came back was A BENCH:
 * four cradles butted edge to edge with a card every 1.18 units, eight identical slabs in an unbroken row,
 * and no way to see where one pair ended and the next began. On a type whose entire question is "which
 * TWO go together" that is not a cosmetic failure, it deletes the question — a child looking at that row
 * has no reason to group card 3 with card 4 rather than with card 2.
 *
 * So the pairs are separated twice over: by this air, and by the posts at each cradle's ends (see
 * `Cradle`). Within a pair the cards are 0.16 apart; between pairs it is 0.18 of air plus two 0.14 posts,
 * which is 0.46 — nearly three times the inner gap, and that RATIO is the whole of what makes a pair read
 * as a pair. The colliders still tile at the pitch, so the air belongs to one candidate or the other and
 * there is nothing to fall through.
 */
const OPT_PITCH = CRADLE_W + 0.18;

/** The three heights. Separated by HEIGHT and never by depth — see the header. */
const STEM_Y = 2.02;
const SOCK_Y = 0.46;
const OPT_Y = -1.62;

/**
 * How far a cradle reaches BELOW the middle of its cards — the sill, the band and the joining.
 *
 * The upward reach is not a constant because nothing needs it: the cradle's back is symmetric about the
 * cards and the plinth and the extents are both measured downward from here. A `CRADLE_UP` was declared
 * alongside this and used by nothing, which is how a number stops being true without anybody noticing.
 */
const CRADLE_DOWN = 0.81;

/** The standing stone itself, which stands behind the stem and the empty place. */
const STONE_W = CRADLE_W + 0.44;
const STONE_TOP = 2.90;
const STONE_BOTTOM = -0.55;

/** The horn's mouth radius, and where it hangs off the stone's shoulder. */
const HORN_R = 0.5;
const HORN_X = -(STONE_W / 2 + 0.3);

/**
 * A hue per candidate, so a child can hold "the blue one" across four spoken pairs.
 *
 * BY POSITION, NEVER BY CONTENT, which is what makes it safe: it is a handle for referring to a candidate,
 * and it carries not one bit about which candidate is right. `DayLog` already does exactly this and argues
 * for it — "the child can still see that the third slab is the gold one and track it from row to row" —
 * and on a spoken item with no pictures the need is sharper, because position in a row of four is
 * otherwise the only thing a five-year-old has to hang a heard pair on.
 *
 * `gold` is left out of the ring on purpose: it resolves to `HUE.honey`, which is the socket's colour, and
 * the hollow's rule is that the missing place is the only thing wearing it.
 */
const CAND_HUES = ['coral', 'blue', 'teal', 'violet'] as const;
function hueFor(i: number): string {
  return bankColor(CAND_HUES[i % CAND_HUES.length] ?? 'coral');
}

/** A card is drawn against this rather than against white — see the note in `Card`. */
const FACE = HUE.stone;

/** Where the nth of `count` things sits across a row. */
function slotX(i: number, count: number, pitch: number): number {
  return (i - (count - 1) / 2) * pitch;
}

/* ============================================================================
   the parts
   ========================================================================== */

/**
 * One place a word lives.
 *
 * WHEN THERE IS NO PICTURE — which today is every card of every item — the face carries a shallow turned
 * bowl and nothing else. Deliberately EMPTY rather than filled with a neutral token: `tokenGlyph` returns a
 * pebble or a shell for a word it does not know, and a pebble on a card is a drawing a child will try to
 * read. A plain bowl says "a word belongs here" and says nothing false. It is identical on all ten cards,
 * so it cannot make one of them more interesting than another.
 *
 * WHEN THERE IS ONE, a warm mid stone rather than paper white, which `DayLog` learned from a screenshot
 * and this file inherits: the pictures are built from primitives and many have white or cream parts — an
 * egg, a cloud, a hen, a plate — which vanish against a near-white face.
 */
function Card({ mark }: { mark: EventMark | null }) {
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
      {mark ? (
        <group position={[0, 0.02, 0.12]} scale={GLYPH}>
          <EventGlyph glyph={mark.glyph} state={mark.state} bg={FACE} />
        </group>
      ) : (
        /* A turned ring rather than a filled disc, and it took a shot to settle. The first version was a
           dark disc, which at this size reads as an object ON the card — an eye, a coin, a hole — and a
           card with an object on it is a card a child will try to read. A ring is plainly a moulding in
           the stone. `z` is 0.082 against a face whose front is at 0.080: any less and it is swallowed by
           the slab, which is what happened first and looked exactly like a card with nothing drawn on it
           by mistake. */
        <mesh position={[0, 0, 0.082]}>
          <torusGeometry args={[CARD * 0.29, 0.035, 8, 26]} />
          <meshStandardMaterial color={shade(HUE.stoneDeep, -0.06)} roughness={0.95} metalness={0} />
        </mesh>
      )}
    </group>
  );
}

/**
 * THE JOINING, drawn the same way in all three places: a groove cut between the two cards with a boss
 * under each of them.
 *
 * This is what makes a pair read as A PAIR WITH SOMETHING BETWEEN THEM rather than as two things that
 * happen to be next to each other, which is the difference between a child comparing relations and a child
 * comparing objects. Carved stone rather than light, because the missing place is the only thing in the
 * hollow allowed to glow and a lit groove immediately above a lit socket merges with it — the mistake
 * `SortingGate.tsx` records against its own IN bin.
 *
 * SYMMETRIC, with no arrowhead and no taper. Direction is carried by which card is on which side, exactly
 * as the written form carries it by reading order; a mark meaning "this way round" is a convention, and a
 * convention has to be taught before the item can be answered. Since nearly every item in this bank
 * carries a reversal lure, this is the discrimination the whole presentation turns on — see the header.
 */
function Joining() {
  return (
    /* IN FRONT OF THE CRADLE'S FRONT BOARD, at z 0.24 against the board's 0.21, and that is not a detail.
       The first version cut the groove at z 0.14, INSIDE the board, so the one element carrying the whole
       idea of the presentation was hidden behind a plank in every shot — the pairs read as two cards
       sitting near each other and nothing else. If the joining is ever not visible, this type is not
       asking its question. */
    <group position={[0, -0.52, 0.24]}>
      <mesh>
        <boxGeometry args={[PAIR_GAP, 0.17, 0.07]} />
        <meshStandardMaterial {...MAT.cut} />
      </mesh>
      {[-1, 1].map((side) => (
        <mesh key={side} position={[(side * PAIR_GAP) / 2, 0, 0.04]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.13, 0.15, 0.1, 18]} />
          <meshStandardMaterial color={shade(HUE.stoneDeep, 0.06)} roughness={0.9} metalness={0} />
        </mesh>
      ))}
      {/* The cord itself, run between the two bosses. Vine rather than stone so the joining reads as a
          TIE — something put there on purpose — rather than as a moulding in the slab. */}
      <mesh position={[0, 0, 0.07]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.05, 0.05, PAIR_GAP, 10]} />
        <meshStandardMaterial {...MAT.vine} />
      </mesh>
    </group>
  );
}

/**
 * The stone one pair sits in: a single slab spanning both cards, so a pair is one object.
 *
 * `band` is the candidate's own hue, on the cradle's front edge and never on a card. Absent for the stem,
 * which is not a candidate and does not need a handle to refer to it by; what the stem must share with the
 * candidates is the ARRANGEMENT, and it does, because this is the same component.
 */
function Cradle({ band }: { band?: string }) {
  return (
    <group>
      {/* The back, which the cards stand against. */}
      <mesh position={[0, -0.09, -0.22]}>
        <boxGeometry args={[CRADLE_W, CARD + 0.5, 0.2]} />
        <meshStandardMaterial {...MAT.stone} />
      </mesh>
      {/* The sill the cards sit on. Shallower than it was, so the joining in front of it stands proud. */}
      <mesh position={[0, -CRADLE_DOWN + 0.12, 0.04]}>
        <boxGeometry args={[CRADLE_W, 0.24, 0.3]} />
        <meshStandardMaterial {...MAT.stoneDeep} />
      </mesh>
      {/* THE END POSTS, and they are the other half of the fix `OPT_PITCH` describes. Air alone does not
          separate four cradles at this scale — it reads as a gap in a bench rather than as the edge of an
          object. An upright at each end gives the cradle a silhouette that closes, so a row of four is
          four things. They are on the STEM's cradle too, because what the stem must share with the
          candidates is its arrangement, and an unposted stem would be a different object. */}
      {[-1, 1].map((side) => (
        <mesh key={side} position={[(side * CRADLE_W) / 2, -0.09, -0.04]}>
          <boxGeometry args={[0.14, CARD + 0.62, 0.42]} />
          <meshStandardMaterial {...MAT.stoneDeep} />
        </mesh>
      ))}
      {band ? (
        <mesh position={[0, -CRADLE_DOWN + 0.02, 0.2]}>
          <boxGeometry args={[CRADLE_W - 0.3, 0.13, 0.06]} />
          {/* Not emissive, and never will be. See the header on what glows. */}
          <meshStandardMaterial color={band} roughness={0.9} metalness={0} />
        </mesh>
      ) : null}
    </group>
  );
}

/** One complete pair: two cards in one cradle with the joining between them. */
function Pair({ marks, band }: { marks: readonly [EventMark | null, EventMark | null]; band?: string }) {
  return (
    <group>
      <Cradle band={band} />
      <Joining />
      {[0, 1].map((i) => (
        <group key={i} position={[(i === 0 ? -PAIR_GAP : PAIR_GAP) / 2, 0, 0.02]}>
          <Card mark={marks[i] ?? null} />
        </group>
      ))}
    </group>
  );
}

/**
 * THE ONE MISSING PLACE: an empty cradle with two sockets in it, joined the same way the stem's pair is.
 *
 * The hollow has exactly one convention for this and every dressing in the directory uses it — a recessed
 * dark bed ringed in breathing honey light, the only thing in the world that moves on its own. A child who
 * cannot read a word of this finds it in under a second, and having found it has understood the item
 * without being told: those two up there are joined, and TWO MORE go here, joined the same way.
 *
 * Both halves breathe together, on one clock, because this is one place and not two. Under
 * `prefers-reduced-motion` the breath resolves to its MIDPOINT rather than to nothing, so the sockets still
 * plainly glow and the affordance survives — the rule the whole directory follows.
 */
function EmptyPlace({ filled }: { filled: boolean }) {
  /**
   * A RIM, NOT A FIELD, which a shot corrected.
   *
   * These were the sorting gate's numbers — a 1.18 ring around a 0.94 bed — and that socket is alone on
   * its shelf while these two are 1.18 apart. Two 1.18 rings at a 1.18 pitch touch exactly, so the honey
   * merged into one flat panel with two dark holes punched in it and a bright T-shape standing between
   * them. The empty place stopped reading as two sockets and started reading as a yellow sign.
   *
   * A 1.16 ring around a 1.00 bed leaves an even 0.08 rim and 0.02 of clear air between the two, so each
   * half is a recess with a lit edge and the pair still reads as one place. The honey is a line again
   * rather than an area, which is the whole of why it is the only thing here allowed to glow.
   */
  const ring = useSlab(CARD + 0.14, CARD + 0.14, 0.14, 0.11);
  const bed = useSlab(CARD - 0.02, CARD - 0.02, 0.16, 0.09);
  const mats = useRef<(THREE.MeshStandardMaterial | null)[]>([null, null]);
  const frame = useRef<THREE.Group>(null);
  const reduced = useReducedMotion();

  useFrame(({ clock }) => {
    const b = filled ? 0.25 : breath(clock.elapsedTime, 2.6, reduced);
    for (const m of mats.current) if (m) m.emissiveIntensity = 0.4 + b * 0.9;
    if (frame.current) {
      const s = filled ? 1 : 1 + b * 0.025;
      frame.current.scale.set(s, s, 1);
    }
  });

  return (
    <group>
      <Cradle />
      <Joining />
      <group ref={frame}>
        {[0, 1].map((i) => (
          <mesh key={i} geometry={ring} position={[(i === 0 ? -PAIR_GAP : PAIR_GAP) / 2, 0, -0.12]}>
            <meshStandardMaterial
              ref={(m) => {
                mats.current[i] = m;
              }}
              color={HUE.honey}
              emissive={HUE.honey}
              emissiveIntensity={0.8}
              roughness={0.5}
              metalness={0}
            />
          </mesh>
        ))}
      </group>
      {[0, 1].map((i) => (
        <mesh key={i} geometry={bed} position={[(i === 0 ? -PAIR_GAP : PAIR_GAP) / 2, 0, -0.04]}>
          <meshStandardMaterial {...MAT.cut} />
        </mesh>
      ))}
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

  const stoneSlab = useSlab(STONE_W, STONE_TOP - STONE_BOTTOM, 0.3, 0.18);

  /**
   * PICTURES ARE ALL OR NOTHING PER ITEM — see `kinshipStoneDraws`. Drawing the pairs that happen to be
   * drawable and leaving the rest blank would make some candidates carry a picture and others not, and a
   * candidate with a picture on it is the one a child looks at; 23 of the bank's 100 items would be mixed
   * that way. It resolves false for every item today, which is why the stone is a stone and not a gallery.
   */
  const drawn = useMemo(() => kinshipStoneDraws(content), [content]);

  const pairs = useMemo(() => pairsOf(content), [content]);

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
  const lines = useMemo(() => analogyLines(content), [content]);

  const retell = useCallback(() => {
    if (lines.length === 0) return;
    narrate(lines, setNarration);
  }, [lines]);

  /**
   * Told once on arrival, after a beat, and then left alone.
   *
   * Automatic rather than waiting for a press, because a child should not have to discover the horn to
   * find out what they are being asked; the horn is for the second and third time. Nothing is left talking
   * when the item changes — this component is keyed on the item, so unmount is per question.
   */
  useEffect(() => {
    if (lines.length === 0) return;
    if (!canSpeak()) {
      setNarration('unavailable');
      return;
    }
    const t = setTimeout(retell, ARRIVAL_BEAT_MS);
    return () => {
      clearTimeout(t);
      hushSpeech();
    };
  }, [lines, retell]);

  const voiceless = narration === 'unavailable';
  const speaking = narration === 'speaking';

  /**
   * Say one pair on its own, which is the affordance that keeps this from being a memory test.
   *
   * SUPPRESSED WHILE THE ARRIVAL TELLING IS RUNNING, and that guard is not cosmetic: `speak()` cancels
   * whatever is queued, so a cursor drifting across the shelf during the opening would chop the question
   * off mid-sentence and leave the child with one candidate and no ask.
   */
  const sayPair = useCallback(
    (pair: readonly [string, string]) => {
      if (speaking) return;
      speak(saidPair(pair));
    },
    [speaking],
  );

  const n = Math.max(1, options.length);
  if (!pairs) return null;

  const stemMarks = marksOf(pairs.stem);
  const pickedOption = picked === null ? null : (options.find((o) => o.index === picked) ?? null);

  return (
    <group>
      {/* The stone itself, standing behind the pair that is given and the place that is empty. */}
      <mesh geometry={stoneSlab} position={[0, (STONE_TOP + STONE_BOTTOM) / 2, -0.34]}>
        <meshStandardMaterial {...MAT.stone} />
      </mesh>
      {/* A moss cap, so a standing stone in a hollow looks like it has been standing a while. */}
      <mesh position={[0, STONE_TOP - 0.08, -0.34]}>
        <boxGeometry args={[STONE_W - 0.3, 0.14, 0.34]} />
        <meshStandardMaterial {...MAT.moss} />
      </mesh>

      {/* GIVEN: the pair whose joining the child has to read. */}
      <group position={[0, STEM_Y, 0]}>
        <Pair marks={stemMarks} />
      </group>

      {/* MISSING: two more, joined the same way. The only thing here that glows. */}
      <group position={[0, SOCK_Y, 0]}>
        <EmptyPlace filled={pickedOption !== null} />
        {pickedOption ? (
          <SeatedPair
            marks={pickedOption.marks}
            band={pickedOption.hue}
            from={[slotX(pickedOption.index, n, OPT_PITCH), OPT_Y - SOCK_Y, 0.04]}
            reduced={reduced}
          />
        ) : null}
      </group>

      {/* The horn, off the stone's shoulder, where nothing is measuring. */}
      <group position={[HORN_X, STEM_Y - 0.2, 0.1]}>
        <Horn speaking={speaking} dormant={voiceless} lit={onHorn} />
      </group>
      {/* A five-year-old aiming in three dimensions does not hit a horn, so what actually takes the press
          is a volume far larger than the horn — everything a child could plausibly be pointing at when
          they mean "again". */}
      <mesh
        visible={false}
        position={[HORN_X, STEM_Y - 0.2, 0.6]}
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
        <boxGeometry args={[1.5, 1.5, 1.4]} />
      </mesh>

      {/* CANDIDATES: the same pair object, the same size, on the same plane, separated by height alone. */}
      {options.map((o) => {
        const live = !disabled && picked === null;
        const lit = hover === o.index && live;
        const taken = picked === o.index;
        return (
          <group key={o.index} position={[slotX(o.index, n, OPT_PITCH), OPT_Y, 0]}>
            {/* Invisible and oversized, tiled edge to edge at the shelf pitch — see `OPT_PITCH`. */}
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
                // A tap on a pair that cannot be chosen any more still says it, because wanting to hear
                // it again is not the same as wanting to answer and must never cost anything.
                if (!live) {
                  sayPair(o.pair);
                  return;
                }
                setPicked(o.index);
                onPick(o.handed);
              }}
            >
              <boxGeometry args={[OPT_PITCH, 2.3, 1.7]} />
            </mesh>

            {/* The pair leaves the shelf when it is seated, so the shelf shows what is still on offer. Its
                plinth stays, so the empty place still reads as a place. */}
            {taken ? null : (
              <group position={[0, lit ? 0.12 : 0, 0]} scale={lit ? 1.04 : 1}>
                <Pair marks={o.marks} band={o.hue} />
              </group>
            )}

            {/* The plinth is the hover tell: a whole lit block under the pair, which is unmissable to a
                child who is not sure whether their aim landed — and on a spoken item it is also the only
                confirmation that the thing they just heard is the thing they are pointing at. */}
            <mesh position={[0, -CRADLE_DOWN - 0.15, 0]}>
              <boxGeometry args={[CRADLE_W - 0.5, 0.3, 0.5]} />
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
 * The chosen pair, rising from the shelf into the empty place.
 *
 * WHY IT MOVES AT ALL. A pair that simply appears in the sockets reads as the stone having filled them; a
 * pair that visibly travels from the shelf reads as the CHILD having put it there. The difference matters
 * because of what the movement is not: it is not a verdict. The pair rises whichever one was chosen,
 * because rising is what the child SAID about it. Nothing here knows or could know whether it is right.
 *
 * Half a second, because the interesting part of this presentation is over once the pick is made and an
 * animation that outlasts its meaning is a delay. Under `prefers-reduced-motion` there is no travel at all:
 * the pair is simply seated, which is the resting state of the same fact.
 *
 * It keeps its own hue on the way up and after it lands, so the pair in the empty place is visibly the pair
 * that left the shelf — which is the one moment the candidate hues have to do real work.
 */
function SeatedPair({
  marks,
  band,
  from,
  reduced,
}: {
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
      <Pair marks={marks} band={band} />
    </group>
  );
}
