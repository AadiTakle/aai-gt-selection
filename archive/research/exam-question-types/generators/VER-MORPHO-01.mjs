// VER-MORPHO-01 "Word Machines" — DUAL-MODE structured bank generator (Bucket A: grammar).
//
// A Stage 2 learning-block type, built to STAGE2_QUESTION_DESIGN.md §3.3 and §9.2 (U3) under
// D-S2-3 (the scrambled-system control is a binding gate) and D-017 (text-only, never audio).
// `FLU-OPCHAIN-01` is the reference implementation and this file follows its structure
// deliberately; every place it diverges is a verbal-specific requirement and says so.
//
// THE TASK. A tiny invented morphology. The child is shown one labelled reference picture — "this
// is a KIB" — and then either a derived word (`kib-zan-mos`) and four candidate pictures, or a
// target picture and four candidate words. One tap, four fixed positions, no drag, no typing.
// Every morpheme is a three-letter pronounceable pseudo-syllable in Latin script.
//
// ---------------------------------------------------------------------------
// WHY THIS IS ONE GENERATOR AND TWO BANKS
//
// §4.1.1 makes the scrambled control a generator MODE, not a separate artifact: two code paths or
// two renderers would confound the contrast with the generator or the renderer. `systemPersistence`
// is therefore a parameter of this file, present from its first commit:
//
//   consistent  one form->meaning mapping for the WHOLE bank. What the child learns on trial 1 is
//               still true on trial 30, so knowledge of the system transfers across items — the
//               only thing that can transfer, because no item ever repeats.
//   perTrial    a FRESH mapping every item. Any climb observed here is the design's contamination
//               floor: practice, warm-up, residual interface learning, guessing, regression at the
//               handover and difficulty misspecification, summed.
//
// The two banks are equated by CONSTRUCTION. The MEANING sequence is drawn from the lever tuple and
// the seed, identically in both modes; the written word is then the mapping's inverse image of it.
// So the reference picture, the key, the key slot, every option's DENOTATION, the distractor slate,
// the direction, the age band and the stated difficulty are identical item for item across the two
// banks. Only which pseudo-syllables spell the morphemes differs, and the morpheme tray is listed
// in one canonical (alphabetical-by-FORM) order so the tray itself carries no information in either
// mode — ordering the tray by MEANING would hand over the mapping.
// ---------------------------------------------------------------------------
//
// ---------------------------------------------------------------------------
// WHY THE KEY IS NOT DERIVABLE FROM `content` — AND WHY THIS TYPE'S GUARANTEE IS STRONGER
//
// `FLU-OPCHAIN-01` shipped with the key recoverable by brute force on 11 of 234 items (4.7%) before
// its second anti-leak invariant was added, and its post-fix guarantee is "at least two options
// survive the brute force", i.e. the best content-only attack is bounded at 50% against a 20%
// floor. That bound is inherited here as a floor to beat, not as a target.
//
// The attack, stated exactly. A client holding `content` knows the reference picture, the word's
// morpheme forms and the four options. It does NOT know the form->meaning mapping, which lives
// under `answer.system` and which `servedItemSchema` omits wholesale. So it enumerates every
// mapping — every ordered assignment of `depth` DISTINCT meanings to the word's `depth` positions,
// at most 6*5*4*3 = 360 of them — and asks which options survive. Three invariants close it:
//
//   I1  At least one distractor moves as far from the reference picture as the key does, so
//       "tap whichever picture changed the most" cannot beat chance.
//   I2  EVERY option is reachable by some relabelling. Not "at least two" — all four. Nothing can
//       be eliminated, so the elimination attack is exactly the 25% chance floor. This is what
//       forced the distractor taxonomy to the four relabelling-closed classes in {@link FAILURES}
//       and it is the single most consequential design decision in this file (see that comment).
//   I3  The key never carries strictly more relabelling votes than every distractor, so the
//       stronger vote-weighted attack — pick the option the most mappings point at — cannot prefer
//       the key either.
//
// In the picture->word direction I2 and I3 hold ANALYTICALLY rather than by search: every option
// word is a sequence of the same length made of distinct forms, so each is the image of exactly the
// same number of mappings, and all four vote counts are equal by construction. That direction is
// leak-free by proof, not by measurement. The generator measures it anyway.
//
// The reveal a learning block needs — the system resolving the instance after the child commits —
// is deliberately NOT in `content`. The renderer cannot know the correct option; the host supplies
// it after the server has scored the trial. That is a U6/U7 requirement recorded here because
// putting the reveal in the bank would hand the key to the browser.
// ---------------------------------------------------------------------------
//
// ---------------------------------------------------------------------------
// READING LOAD IS A CONSTRUCT-IRRELEVANT HAZARD HERE, AND D-017 FORBIDS OFFLOADING IT
//
// This is the only one of the four Stage 2 types whose stimulus is text. A child who decodes slowly
// looks like a slow learner, and D-017 records that this instrument is text-only with no audio, so
// the demand cannot be moved to a soundtrack. Everything available was spent on it:
//
//   * every morpheme is a CLOSED-SYLLABLE CVC with a short vowel — the first pattern taught in
//     systematic phonics and the most reliably decodable string in English orthography;
//   * no digraphs (no c/h/j/q/w/x/y anywhere, so no sh/ch/th/wh/ph/qu can form), no consonant
//     clusters, no r-controlled vowels (`r` never closes a syllable), no soft-c or soft-g, no
//     silent `e`, no doubled letters, and onset never equals coda;
//   * morphemes are HYPHEN-SEPARATED. Segmenting an unfamiliar string is a real skill and it is not
//     the construct — the construct is the morpheme->meaning mapping and the composition rules — so
//     the segmentation is given away and the child decodes syllables, never a 15-letter blob;
//   * the whole bank runs on TEN forms, so the decoding vocabulary is fixed and small, and the ten
//     are pairwise at edit distance >= 2, so no two morphemes are told apart by a single letter;
//   * the stem is never load-bearing. All four options in an item share the same `kind`, so the
//     stem cannot discriminate; it is there because a word needs one, and the reference picture
//     shows what it denotes anyway;
//   * K-1 is not served at all. Grade-1 decoding accuracy is around 34% (brainlift 6.7), so at K-1
//     this would measure decoding, which §3.3 and §4.3 both say to handle by excluding the band.
//
// The resulting demand, which is the figure to hold this design to: at the youngest band served
// (2-3) the longest word is THREE CVC syllables / 11 characters; at 4-5, four / 15; at 6-8, five /
// 19. Per trial the child reads at most two words in the word->picture direction and at most five
// in the picture->word direction, and in the latter all five are the same length and differ by one
// syllable, so the comparison is sub-lexical rather than five separate decodings.
// ---------------------------------------------------------------------------
//
// ---------------------------------------------------------------------------
// PRIOR-KNOWLEDGE RESISTANCE IS THIS TYPE'S STATED STRENGTH, SO IT IS VERIFIED, NOT ASSUMED
//
// §3.3 claims this design resists prior knowledge best of the four because the lexicon is invented.
// {@link FORM_SCREEN} is the check rather than the claim: no form in play is a word in the 234,456-
// entry web2 dictionary, no form is an English affix, and no form is within edit distance 1 of any
// English word that names one of the six meanings. `printInventoryScreen()` prints the audit.
// ---------------------------------------------------------------------------
//
// ---------------------------------------------------------------------------
// THE CONSTRUCT CLAIM IS AN OPEN ASSUMPTION (A-S2-3), NOT A PROPERTY OF THIS FILE
//
// §3.3 says plainly that whether this type loads on verbal rather than fluid reasoning is untested,
// and calls it the design it is least confident about. Nothing in this generator settles it. What
// the design does is hold the MAPPINGS semantic — negation, number, size and agent/patient role are
// exactly the categories §3.3 names, and they are the categories natural morphology encodes — and
// hold the FORMS readable. That is a design stance. A-S2-3 stays open, and the bank ships
// `validated: false`.
// ---------------------------------------------------------------------------
//
// GOVERNANCE. Born-synthetic only (syntheticOnly:true, validated:false). `difficulty` is a DESIGN
// rung on the shared 1..20 scale computed from the declared levers, NOT a calibrated IRT parameter.
// NOTHING HERE IS GATED: Gate B needs ~128 real children (§4.1.3) and no synthetic run can stand in
// for them, so the honest status of this type is "gate-ready, ungated". It is not wired into the
// live learning block and has no renderer.
//
// WHERE THE TWO BANKS ARE WRITTEN. `banks/` is the SERVED directory: `bank-loader.ts` builds every
// path it reads inside it and `sync-exam-demos.mjs` globs it. So the consistent arm is written
// there as the plain `banks/VER-MORPHO-01.jsonl` and the scrambled arm is written to
// `control-banks/`, a directory no application code names. Same arrangement as `FLU-OPCHAIN-01`,
// for the same reason: a filename convention alone would wire the control arm the moment a matching
// demo appeared.
//
// Run:  node research/exam-question-types/generators/VER-MORPHO-01.mjs
//       writes ../banks/VER-MORPHO-01.jsonl (consistent, live) and
//       ../control-banks/VER-MORPHO-01.perTrial.jsonl (scrambled control, never served)
//       and prints the inventory screen, a coverage summary, the anti-leak audit and the equating
//       summary.

import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { serializeBank } from './item-shape.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));

/* ================================================================== *
 * THE MEANING VOCABULARY — six affixes, in the categories §3.3 names.
 *
 * §1.3 is the reason there are six rather than one hidden rule: a single
 * rule to discover produces a STEP (chance until insight, ceiling after),
 * and fitting a linear lambda to a step wastes most of 30 trials. A
 * composable vocabulary makes "having learned it" a ladder — know one
 * morpheme, stack two, stack three, extend to a combination never shown.
 *
 * THE SPLIT IS WHAT MAKES ORDER A REAL THING TO LEARN. Three affixes are
 * NUMBER affixes: each swaps two values of a three-valued count (one / two /
 * many), so together they are the three transpositions of S3, which is not
 * abelian. Two number affixes in the other order give a different count. The
 * other three each toggle one separable attribute and commute with
 * everything, so a word built only from those is order-free and easier —
 * which is the other half of the same lever.
 *
 * Singular / dual / paucal / plural number systems are real morphology
 * (Arabic, Slovenian, Sanskrit), so the non-commutativity is bought with a
 * semantic category rather than with an arbitrary algebra. That matters
 * because §3.3's stated tension is that pushing the abstraction far enough to
 * guarantee novelty turns the task into figural rule induction.
 * ================================================================== */
export const NUMBER_MEANINGS = ['plural', 'dual', 'paucal'];
export const PLAIN_MEANINGS = ['negate', 'resize', 'swapRole'];
export const MEANINGS = [...NUMBER_MEANINGS, ...PLAIN_MEANINGS];
export const isNumberMeaning = (m) => NUMBER_MEANINGS.includes(m);

/** The two counts each number affix swaps. Together: the three transpositions of S3. */
const NUMBER_SWAP = {
  plural: [1, 3], // one <-> many
  dual: [1, 2], // one <-> two
  paucal: [2, 3], // two <-> many
};

/**
 * The four picture attributes a scored item can turn on, all SEPARABLE.
 *
 * §1.6: imported category-difficulty orderings invert when dimensions are
 * integral rather than separable, and a wrong ordering biases lambda rather
 * than merely adding noise. Count, size, a negation mark and a role arrow are
 * four things a child can attend to one at a time. None is colour, so colour
 * vision does not gate the task.
 */
export const PICTURE_ATTRIBUTES = ['count', 'size', 'mark', 'role'];

/** Drawn kinds. Cosmetic variety only: every option in an item shares one, so kind never keys. */
export const KINDS = ['blob', 'star', 'leaf', 'drop'];

/**
 * Whether the word mixes number affixes with plain ones.
 *
 * A word of three toggles is bookkeeping; a word that interleaves toggles with
 * number affixes forces the child to carry a running COUNT through morphemes
 * that do not touch it. That is a real load, it is derived from
 * (depth, scope) rather than added as a free parameter that could be
 * unreachable, and it is checkable. Same device, and same justification, as
 * `FLU-OPCHAIN-01`'s representational mixing.
 */
export const isMixed = (depth, scope) => (scope > 0 && scope < depth ? 1 : 0);

/* ------------------------------------------------------------------ *
 * Seeded RNG (xmur3 -> mulberry32), the same idiom every generator here uses.
 * ------------------------------------------------------------------ */
function xmur3(str) {
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return () => {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    h ^= h >>> 16;
    return h >>> 0;
  };
}
function mulberry32(a) {
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function makeRng(seed) {
  return mulberry32(xmur3(seed)());
}
function shuffle(arr, rng) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
function seededUuid(seed) {
  const rng = makeRng('uuid|' + seed);
  const hex = [];
  for (let i = 0; i < 32; i++) hex.push(Math.floor(rng() * 16).toString(16));
  hex[12] = '4';
  hex[16] = ((parseInt(hex[16], 16) & 0x3) | 0x8).toString(16);
  const h = hex.join('');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

const clamp = (x, lo, hi) => Math.max(lo, Math.min(hi, x));
const round2 = (x) => Math.round(x * 100) / 100;

/* ================================================================== *
 * THE FORM SPACE — phonotactics first, then three screens against English.
 * ================================================================== */

/** Onsets. No c/g/h/j/q/w/x/y: soft-c, soft-g and every English digraph are unreachable. */
export const ONSETS = 'bdfklmnprstvz'.split('');
/** Short vowels only, and every syllable is closed, so each spells its one regular sound. */
export const VOWELS = 'aeiou'.split('');
/** Codas. `r` is excluded: `ar/er/ir/or/ur` are r-controlled and a later phonics skill. */
export const CODAS = 'bdfgklmnpstvz'.split('');

/**
 * Every CVC over the letter sets above that is an entry in the 234,456-word web2 dictionary
 * (`/usr/share/dict/words`), enumerated once and frozen here so the generator is reproducible on a
 * machine with no dictionary. 386 of the 845 candidates collide, which is why the screen is a list
 * and not a hunch — a third of this form space is real English.
 */
export const ENGLISH_CVC = Object.freeze(
  new Set(
    ('bab bad bag bal bam ban bap bas bat bed beg bel ben bes bet bib bid big bim bin bis bit biz ' +
      'bob bod bog bom bon bop bos bot bub bud bug bum bun bus but dab dad dag dak dal dam dan dap ' +
      'das deb deg del den dev dib did dig dim din dip dis dit div dob dod dog dol dom don dop dos ' +
      'dot dub dud dug dum dun dup fad fag fam fan fat fed fen fet fez fib fid fig fin fip fit fob ' +
      'fod fog fon fop fot fub fud fug fum fun fut kaf kan kat keb ked kef keg ken kep ket kid kil ' +
      'kim kin kip kit kob kol kon kop kos lab lad lag lak lam lan lap las lat laz led leg lek len ' +
      'les let lev lid lif lim lin lip lis lit liv liz lob lod lof log lop lot lug lum lut mab mad ' +
      'mag mal mam man map mas mat meg mel mem men mes met mev mib mid mig mil mim min mob mod mog ' +
      'mon mop mot mud mug mum mun mus nab nag nak nam nan nap nat neb ned nef nep net nib nid nig ' +
      'nil nim nip nit nob nod nog non not nub nul nun nut pad pal pam pan pap pat ped peg pen pep ' +
      'pes pet pig pik pim pin pip pit pob pod pol pom pon pop pot pub pud pug pul pun pup pus put ' +
      'rab rad rag ram ran rap ras rat reb red ref reg rel rep ret rev rib rid rig rik rim rip rit ' +
      'rob rod rog rok ron rot rub rud rug rum run rus rut sab sad sag sak sal sam san sap sat seg ' +
      'sen set sib sid sig sil sim sin sip sis sit sob sod sog sok sol son sop sot sov sub sud suk ' +
      'sum sun sup sus suz tab tad tag tal tam tan tap tat tav ted teg ten tez tib tid tig til tim ' +
      'tin tip tit tod tog tol tom ton top tot tub tug tum tun tup tut vag val van vas vat vet vim ' +
      'vip vis vod vog vol vug vum zad zag zak zan zat zed zel zen zep zig zip').split(' '),
  ),
);

/**
 * English affixes short enough to be confusable with a morpheme here.
 *
 * A form that IS an English affix is the collision that matters most: a strong reader meeting
 * `non-` in a negation slot has been handed the mapping.
 */
export const ENGLISH_AFFIXES = Object.freeze(
  new Set(
    ('non mis dis sub pre pro bio geo neo ful ous est ist ism ise ize let kin ing ant ent ate ify ' +
      'ity ive ers ies ted ded ish ern ial ian eer ese ous age ary ory ent ard ure').split(' '),
  ),
);

/**
 * English words that NAME one of the six meanings, for an edit-distance-1 screen.
 *
 * A form does not have to BE English to leak. `bik` in an augmentative slot is close enough to
 * "big" that a strong reader could shortcut the induction phonologically, which is exactly the
 * accidental collision §3.3's prior-knowledge claim has to survive.
 */
export const MEANING_WORDS = Object.freeze([
  'one', 'two', 'ten', 'all', 'few', 'lot', 'mob', 'set', 'pair', 'more', 'many', 'some', 'sum',
  'add', 'dual', 'both', 'pack', 'heap', 'big', 'wee', 'tot', 'tiny', 'huge', 'fat', 'small',
  'mini', 'max', 'grow', 'not', 'non', 'nix', 'nay', 'nil', 'neg', 'ban', 'bad', 'anti', 'undo',
  'doer', 'doe', 'get', 'got', 'give', 'take', 'put', 'act', 'hit', 'own', 'role',
]);

/** Levenshtein distance, capped where it does not matter. */
export function editDistance(a, b) {
  const m = a.length;
  const n = b.length;
  let prev = Array.from({ length: n + 1 }, (_, j) => j);
  for (let i = 1; i <= m; i++) {
    const cur = [i];
    for (let j = 1; j <= n; j++) {
      cur[j] = Math.min(
        prev[j] + 1,
        cur[j - 1] + 1,
        prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1),
      );
    }
    prev = cur;
  }
  return prev[n];
}

/**
 * Why a candidate form was rejected, or `null` when it survives every screen.
 *
 * Exported so `printInventoryScreen()` can show the audit and so the checker can re-run the screens
 * against the ten forms the bank actually shipped.
 */
export function screenForm(form) {
  if (!/^[bdfklmnprstvz][aeiou][bdfgklmnpstvz]$/.test(form)) return 'not a legal CVC';
  if (form[0] === form[2]) return 'onset equals coda';
  if (ENGLISH_CVC.has(form)) return 'is an English word (web2)';
  if (ENGLISH_AFFIXES.has(form)) return 'is an English affix';
  for (const word of MEANING_WORDS) {
    if (editDistance(form, word) <= 1) return `edit distance <=1 from "${word}"`;
  }
  return null;
}

/** Every CVC form that survives all four screens, in a fixed order. */
export const FORM_POOL = (() => {
  const out = [];
  for (const o of ONSETS) {
    for (const v of VOWELS) {
      for (const c of CODAS) {
        const form = `${o}${v}${c}`;
        if (screenForm(form) === null) out.push(form);
      }
    }
  }
  return out;
})();

/**
 * The ten forms the whole bank runs on: six affixes and four stems.
 *
 * Pairwise edit distance >= 2, so no two morphemes are told apart by a single letter — a
 * single-letter contrast would put a visual-discrimination load on the score that has nothing to do
 * with the construct. Drawn once from a fixed seed, sorted, and frozen: the tray is a constant in
 * both arms and in every item, so it carries no information about the mapping.
 */
export const FORM_INVENTORY = (() => {
  const rng = makeRng('VER-MORPHO-01|forms|v1');
  const shuffled = shuffle(FORM_POOL, rng);
  const chosen = [];
  for (const form of shuffled) {
    if (chosen.every((other) => editDistance(form, other) >= 2)) chosen.push(form);
    if (chosen.length === 10) break;
  }
  if (chosen.length < 10) throw new Error('form pool exhausted before ten forms were chosen');
  return Object.freeze(chosen.sort());
})();

/** Canonical tray order is alphabetical by FORM. By MEANING it would BE the mapping. */
export const AFFIX_FORMS = Object.freeze(FORM_INVENTORY.slice(0, 6));
export const STEM_FORMS = Object.freeze(FORM_INVENTORY.slice(6));

/* ================================================================== *
 * PICTURE SEMANTICS
 *
 * A picture is `{kind, count, size, mark, role}`. Every affix is an
 * involution, so "a doubled morpheme undoes itself" is one uniform rule
 * rather than six special cases — which is the third thing §3.3 lists as
 * learnable, alongside the mapping and affix order.
 * ================================================================== */

/** Apply one meaning to a picture. Pure; never mutates. */
export function applyMeaning(meaning, picture) {
  if (isNumberMeaning(meaning)) {
    const [lo, hi] = NUMBER_SWAP[meaning];
    if (picture.count === lo) return { ...picture, count: hi };
    if (picture.count === hi) return { ...picture, count: lo };
    return { ...picture };
  }
  if (meaning === 'negate') return { ...picture, mark: picture.mark === 'none' ? 'cross' : 'none' };
  if (meaning === 'resize') return { ...picture, size: picture.size === 'small' ? 'big' : 'small' };
  if (meaning === 'swapRole') {
    return { ...picture, role: picture.role === 'doer' ? 'target' : 'doer' };
  }
  throw new Error(`unknown meaning "${meaning}"`);
}

/** Apply a morpheme sequence left to right: the morpheme nearest the stem acts first. */
export function applyChain(meanings, picture) {
  return meanings.reduce((state, meaning) => applyMeaning(meaning, state), picture);
}

export const pictureKey = (p) => `${p.kind}|${p.count}|${p.size}|${p.mark}|${p.role}`;

/**
 * How many of the four mutable attributes separate two pictures.
 *
 * This is the metric BOTH anti-leak invariant I1 and the within-rung difficulty positioner are
 * stated in. A distractor one attribute from the key is §3.3's minimal pair — the item on which a
 * child holding an approximate whole-word association fails and a child holding the decomposition
 * succeeds.
 */
export function pictureDistance(a, b) {
  let d = 0;
  for (const attribute of PICTURE_ATTRIBUTES) if (a[attribute] !== b[attribute]) d += 1;
  return d;
}

/* ================================================================== *
 * DIFFICULTY MODEL — from the declared levers, monotone by construction.
 *
 * §1.1(d) is why this is arithmetic over generator parameters rather than a
 * hand label: the block serves systematically different item subsets early
 * and late, so any difficulty error that correlates with the composition of
 * those subsets correlates with trialIndex, and correlated error in `b` maps
 * straight onto `lambda`. Random labelling error only attenuates; structured
 * labelling error BIASES.
 *
 * `direction` is deliberately NOT a term. Whether picture->word is harder
 * than word->picture is untested — §3.3 makes the two DIVERGING its failure
 * mode (c), which is a question to answer, not an ordering to assume — and
 * §1.1(d) says a wrong ordering biases lambda. Instead the two directions are
 * balanced within every 0.5-point rung, so whatever difficulty difference
 * exists is orthogonal to difficulty and therefore to trial index: it
 * attenuates the fit instead of biasing it. That is the whole reason the
 * balancing is by rung and not merely bank-wide.
 * ================================================================== */
export const DEPTH_LOAD = { 1: 0, 2: 2.4, 3: 4.4, 4: 6.0 };
/** Load per number affix: a count permutation to carry, not a one-look toggle. */
const SCOPE_WEIGHT = 0.9;
/** Extra load once TWO number affixes are in play, which is exactly when order matters. */
const ORDER_WEIGHT = 1.5;
/** Load for carrying a running count through morphemes that do not touch it. */
const MIX_WEIGHT = 1.2;
/** Span of the continuous minimal-pair lever, the within-rung positioner. */
const SIMILARITY_SPAN = 2.6;

export function baseScore({ depth, scope }) {
  return (
    1.0 +
    DEPTH_LOAD[depth] +
    SCOPE_WEIGHT * scope +
    ORDER_WEIGHT * Math.max(0, scope - 1) +
    MIX_WEIGHT * isMixed(depth, scope)
  );
}

/**
 * Every lever combination the grammar can build.
 *
 * `scope` counts NUMBER affixes and stops at 2, which is a fact about S3 and not a choice: the
 * three transpositions compose, in every step-legal order, to a permutation that returns the count
 * to where it started. A three-number word would charge for three morphemes and deliver a count
 * the child could have got by ignoring all three — the §1.1(d) structured error, so it is
 * unreachable by construction rather than filtered later. `depth - scope` plain affixes must also
 * be distinct and there are only three of them, which is what forces scope >= 1 at depth 4.
 */
export const ALLOWED_CONFIGS = (() => {
  const out = [];
  for (const depth of [1, 2, 3, 4]) {
    const minScope = Math.max(0, depth - PLAIN_MEANINGS.length);
    for (let scope = minScope; scope <= Math.min(depth, 2); scope++) out.push({ depth, scope });
  }
  return out;
})();

const ALL_BASES = ALLOWED_CONFIGS.map(baseScore);
const RAW_MIN = Math.min(...ALL_BASES);
const RAW_MAX = Math.max(...ALL_BASES) + SIMILARITY_SPAN;

/** Lever tuple -> design rung on the shared 1..20 scale. */
export function difficultyFromLevers(cfg, distractorSimilarity) {
  const raw = baseScore(cfg) + SIMILARITY_SPAN * distractorSimilarity;
  return clamp(1 + ((raw - RAW_MIN) * 19) / (RAW_MAX - RAW_MIN), 1, 20);
}

function solveSimilarity(cfg, targetDifficulty) {
  const rawNeeded = RAW_MIN + ((targetDifficulty - 1) * (RAW_MAX - RAW_MIN)) / 19;
  return clamp((rawNeeded - baseScore(cfg)) / SIMILARITY_SPAN, 0, 1);
}

/* ================================================================== *
 * BANDS — and the one place this type's ladder is not FLU-OPCHAIN-01's.
 *
 * K-1 IS NOT SERVED. §3.3: the task requires decoding three-letter
 * pseudo-words, Grade-1 decoding accuracy is around 34% (brainlift 6.7), and
 * a block that measures decoding produces a floored child, a flat curve and
 * no rate at all. §4.3 says to handle a developmental floor by reporting per
 * band and excluding where the design floors, as the catalog already does for
 * SPA-SCENE-01 and SPA-VIEW-01. So band 2-3 carries the bottom of the scale
 * and no item anywhere in the bank declares K-1.
 *
 * Above that the cap is on composition depth, for the reason §4.3 gives:
 * 6-7-year-olds were mostly best fit by a RANDOM-RESPONSE model on an
 * information-integration structure, so multi-dimensional integration is out
 * at the young bands. Depth is exactly that dimensionality here.
 * ================================================================== */
export const BANDS = [
  { band: '2-3', lo: 1, hi: 8, maxDepth: 2 },
  { band: '4-5', lo: 8, hi: 12, maxDepth: 3 },
  { band: '6-8', lo: 12, hi: 20, maxDepth: 4 },
];

/** The band whose window contains a difficulty. */
export function bandFor(difficulty) {
  return BANDS.find((b) => difficulty < b.hi) ?? BANDS[BANDS.length - 1];
}

/** Declared age band, read straight off the difficulty window. */
export function ageBandsFor(difficulty) {
  return [bandFor(difficulty).band];
}

/* ================================================================== *
 * THE HIDDEN SYSTEM — a form->meaning bijection, plus a stem->kind one.
 *
 * `consistent` draws one and holds it for the whole bank. `perTrial` draws a
 * fresh one per item. Nothing else about the item changes with the mode.
 * ================================================================== */
export function drawSystem(seed) {
  const rng = makeRng(`system|${seed}`);
  const meanings = shuffle(MEANINGS, rng);
  const kinds = shuffle(KINDS, rng);
  const affixMap = {};
  AFFIX_FORMS.forEach((form, i) => {
    affixMap[form] = meanings[i];
  });
  const stemMap = {};
  STEM_FORMS.forEach((form, i) => {
    stemMap[form] = kinds[i];
  });
  return { systemId: `sys-${seed}`, affixMap, stemMap };
}

/** The form that spells `meaning` under this system. */
function formFor(system, meaning) {
  const found = AFFIX_FORMS.find((form) => system.affixMap[form] === meaning);
  if (!found) throw new Error(`system ${system.systemId} has no form for "${meaning}"`);
  return found;
}

/** The stem that names `kind` under this system. */
function stemFor(system, kind) {
  const found = STEM_FORMS.find((form) => system.stemMap[form] === kind);
  if (!found) throw new Error(`system ${system.systemId} has no stem for "${kind}"`);
  return found;
}

/** How a word is written: stem first, then affixes, hyphen-separated (see the reading-load note). */
export const spellWord = (stem, forms) => [stem, ...forms].join('-');

/* ================================================================== *
 * WORD CONSTRUCTION
 *
 * No morpheme repeats inside a word — every affix is an involution, so a
 * repeat would cancel and the word would silently be shorter than its stated
 * depth, which is exactly the structured difficulty error §1.1(d) warns
 * biases lambda.
 *
 * EVERY MORPHEME MUST ALSO CHANGE THE RUNNING PICTURE. A number affix applied
 * where its two counts are both absent is a no-op, and a word carrying one is
 * easier than its stated depth in a way the child can exploit without knowing
 * it. FLU-OPCHAIN-01 checks the weaker property that the chain is not a
 * no-op overall; this checks each step, which is what makes the declared
 * depth the real depth.
 * ================================================================== */
export function buildChain({ depth, scope }, base, rng) {
  const plainCount = depth - scope;
  for (let attempt = 0; attempt < 400; attempt++) {
    const numberPicks = shuffle(NUMBER_MEANINGS, rng).slice(0, scope);
    const plainPicks = shuffle(PLAIN_MEANINGS, rng).slice(0, plainCount);
    const chain = shuffle([...numberPicks, ...plainPicks], rng);
    if (chain.length !== depth) continue;
    if (everyMorphemeBites(chain, base)) return chain;
  }
  return null;
}

/** Whether every morpheme in the word changes the picture it is applied to. */
export function everyMorphemeBites(meanings, base) {
  let state = base;
  for (const meaning of meanings) {
    const next = applyMeaning(meaning, state);
    if (pictureKey(next) === pictureKey(state)) return false;
    state = next;
  }
  return true;
}

/* ================================================================== *
 * DISTRACTORS — each one a NAMED incomplete version of the system, and each
 * one RELABELLING-REACHABLE. The second property is why the list is short.
 *
 * §4.6 makes the tagging a build requirement rather than a nicety: with every
 * wrong option encoding a specific partial rule, each response is
 * classifiable, which gives a falsification test (in a real learner errors
 * should migrate from spread-out toward one-morpheme and wrong-order) and the
 * ordinal fallback the §4.1.4 Verdict-2 branch depends on.
 *
 * WHAT WAS TRADED AWAY, AND WHY. FLU-OPCHAIN-01 also carries `omission`,
 * `first_step_only` and `identity_copy`. All three are excluded here on
 * purpose. Each produces a picture reachable only by a SHORTER morpheme
 * sequence, so a client brute-forcing the mappings can prove it is not the
 * key and delete it — three such options would leave the attacker choosing
 * between two, i.e. 50% against a 25% floor, which is the bound
 * FLU-OPCHAIN-01 lives with. The four classes below are closed under
 * relabelling: every one of them is the image of the word under SOME mapping,
 * so nothing can be eliminated and the elimination attack sits exactly on the
 * chance floor (invariant I2). One strategy-trace class was worth less than a
 * 25-point leak.
 *
 * The difficulty lever moved with it. FLU-OPCHAIN-01 positions items within a
 * rung by rule-class nearness, which needs the far classes to exist. Here the
 * positioner is PICTURE DISTANCE from the key — how many attributes separate
 * a distractor from the right answer — which is §3.3's own minimal-pair
 * mechanism and does not depend on the rule taxonomy at all.
 * ================================================================== */
const FAILURES = [
  { kind: 'order_error', lure: 'order_error' },
  { kind: 'near_miss', lure: 'near_miss' },
  { kind: 'wrong_operator', lure: 'wrong_operator' },
  { kind: 'wrong_family', lure: 'wrong_family' },
];
export const FAILURE_KINDS = FAILURES.map((f) => f.kind);

/**
 * Every partial rule this word admits, as {ruleId, kind, meanings, note}.
 *
 * All four classes preserve length and distinctness, so each is a legal morpheme sequence in its
 * own right and each spells a legal word of the same length as the key's — which is what closes
 * "count the syllables" in the picture->word direction.
 */
export function partialRules(chain) {
  const out = [];
  const label = (ms) => ms.join('>');
  const unused = MEANINGS.filter((m) => !chain.includes(m));

  for (let i = 0; i < chain.length; i++) {
    for (let j = i + 1; j < chain.length; j++) {
      const swapped = chain.slice();
      [swapped[i], swapped[j]] = [swapped[j], swapped[i]];
      out.push({
        ruleId: `swap@${i},${j}:${label(swapped)}`,
        kind: 'order_error',
        meanings: swapped,
        note: `applied morpheme ${i + 1} and morpheme ${j + 1} in the wrong order`,
      });
    }
  }

  for (let i = 0; i < chain.length; i++) {
    for (const meaning of unused) {
      const substituted = chain.slice();
      substituted[i] = meaning;
      // Same family is the minimal pair: two number affixes differ only in which counts they swap,
      // so mixing them up moves the count and nothing else. Across families the error is coarser.
      const sameFamily = isNumberMeaning(meaning) === isNumberMeaning(chain[i]);
      out.push({
        ruleId: `sub@${i}:${label(substituted)}`,
        kind: sameFamily ? 'near_miss' : 'wrong_operator',
        meanings: substituted,
        note: sameFamily
          ? `read morpheme ${i + 1} as the other morpheme of its family`
          : `read morpheme ${i + 1} as a morpheme from the other family`,
      });
    }
  }

  for (let i = 0; i < chain.length; i++) {
    for (let j = i + 1; j < chain.length; j++) {
      for (const a of unused) {
        for (const b of unused) {
          if (a === b) continue;
          const substituted = chain.slice();
          substituted[i] = a;
          substituted[j] = b;
          out.push({
            ruleId: `sub2@${i},${j}:${label(substituted)}`,
            kind: 'wrong_family',
            meanings: substituted,
            note: `read morphemes ${i + 1} and ${j + 1} as two different morphemes`,
          });
        }
      }
    }
  }

  return out;
}

/**
 * Every picture an attacker can reach from `content` alone, with the number of mappings that reach
 * it — the relabelling VOTE count that invariants I2 and I3 are stated in.
 *
 * A mapping is a form->meaning bijection and the forms in a word are distinct, so guessing it is
 * exactly guessing an ordered selection of `depth` distinct meanings for the word's positions: at
 * most 6*5*4*3 = 360 of them. Anything the client can compute it can compute this way, so this map
 * IS the client's posterior over which option is the key, up to the constant (6 - depth)!.
 */
export function relabelVotes(depth, base) {
  const votes = new Map();
  const used = new Set();
  const walk = (position, state) => {
    if (position === depth) {
      const k = pictureKey(state);
      votes.set(k, (votes.get(k) ?? 0) + 1);
      return;
    }
    for (const meaning of MEANINGS) {
      if (used.has(meaning)) continue;
      used.add(meaning);
      walk(position + 1, applyMeaning(meaning, state));
      used.delete(meaning);
    }
  };
  walk(0, base);
  return votes;
}

/**
 * How far a slate's summed distance cost may exceed the best available before the vote-balancing
 * objective stops being allowed to move it.
 *
 * The difficulty lever comes FIRST and the anti-leak objective is only allowed to choose among
 * slates the lever is nearly indifferent between. 0.75 over three distractors is a quarter of one
 * picture attribute each — below the granularity the lever itself resolves, so it cannot reorder
 * two items on the difficulty scale. Without a bound like this, minimising the attack would quietly
 * become the difficulty model, which is the §1.1(d) failure wearing a security badge.
 */
const DISTANCE_COST_TOLERANCE = 0.75;

/**
 * Choose three distractors at the requested minimal-pair distance, subject to the three invariants.
 *
 * The primary ordering key is PICTURE DISTANCE from the key, because that is the declared lever: at
 * similarity 1 every distractor sits one attribute from the right answer and the item is §3.3's
 * minimal pair; at similarity 0 they sit as far away as this word admits.
 *
 * The three invariants, in the order they bind:
 *
 *   I2  every chosen distractor must be relabelling-reachable. Enforced as a FILTER rather than a
 *       repair, because the four classes in {@link FAILURES} are reachable by construction — the
 *       filter is the assertion that they are, and it fires only if that reasoning is wrong.
 *   I1  at least one chosen distractor must move as far from the reference picture as the key
 *       does, or "tap whichever picture changed most" scores above chance with no system.
 *   I3  at least one chosen distractor must carry at least as many relabelling votes as the key,
 *       so the vote-weighted attack — pick the option the most mappings point at — cannot prefer
 *       the key.
 *
 * I3 alone bounds the attack loosely: it stops the key being the unique modal option but leaves the
 * attacker a modal DISTRACTOR whose posterior can still sit well above 25%. So among the slates the
 * difficulty lever is indifferent between (within {@link DISTANCE_COST_TOLERANCE}), the one whose
 * four vote counts are most nearly equal is taken. Slates are enumerated exhaustively rather than
 * hill-climbed: the candidate list is at most a few dozen entries after de-duplication by picture,
 * so all triples is a few thousand evaluations and there is no reason to accept a local optimum on
 * the one property E-075/E-076 turn on.
 */
function chooseDistractors(chain, base, key, similarity, votes) {
  const keyPictureKey = pictureKey(key);
  const seen = new Set([keyPictureKey]);
  const keyVotes = votes.get(keyPictureKey) ?? 0;
  const keyBaseDistance = pictureDistance(base, key);

  const reachable = partialRules(chain)
    .map((rule) => ({ rule, output: applyChain(rule.meanings, base) }))
    .filter(({ output }) => {
      const k = pictureKey(output);
      if (seen.has(k)) return false;
      seen.add(k);
      return (votes.get(k) ?? 0) >= 1; // I2
    })
    .map((entry) => ({
      ...entry,
      distance: pictureDistance(key, entry.output),
      baseDistance: pictureDistance(base, entry.output),
      votes: votes.get(pictureKey(entry.output)) ?? 0,
    }));
  if (reachable.length < 3) return null;

  const maxDistance = Math.max(...reachable.map((c) => c.distance));
  const target = 1 + (1 - similarity) * (maxDistance - 1);
  const ordered = reachable
    .map((entry) => ({ ...entry, cost: Math.abs(entry.distance - target) }))
    .sort((a, b) => a.cost - b.cost || (a.rule.ruleId < b.rule.ruleId ? -1 : 1));

  const admissible = [];
  for (let i = 0; i < ordered.length; i++) {
    for (let j = i + 1; j < ordered.length; j++) {
      for (let k = j + 1; k < ordered.length; k++) {
        const slate = [ordered[i], ordered[j], ordered[k]];
        if (!slate.some((c) => c.baseDistance >= keyBaseDistance)) continue; // I1
        if (!slate.some((c) => c.votes >= keyVotes)) continue; // I3
        const distanceCost = slate.reduce((a, c) => a + c.cost, 0);
        const tally = [keyVotes, ...slate.map((c) => c.votes)];
        admissible.push({
          slate,
          distanceCost,
          share: Math.max(...tally) / tally.reduce((a, b) => a + b, 0),
        });
      }
    }
  }
  if (admissible.length === 0) return null;

  // Lever first, anti-leak second: the budget is measured against the BEST distance cost any
  // admissible slate achieves, so the vote-balancing objective can only pick among slates the
  // difficulty lever already treats as equivalent.
  const budget = Math.min(...admissible.map((c) => c.distanceCost)) + DISTANCE_COST_TOLERANCE;
  const key3 = (c) => c.slate.map((s) => s.rule.ruleId).join('|');
  return admissible
    .filter((c) => c.distanceCost <= budget + 1e-9)
    .sort(
      (a, b) =>
        a.share - b.share ||
        a.distanceCost - b.distanceCost ||
        (key3(a) < key3(b) ? -1 : key3(a) > key3(b) ? 1 : 0),
    )[0].slate;
}

/* ================================================================== *
 * ONE ITEM
 * ================================================================== */

/** The reference picture the item labels with the bare stem. */
function drawBase(kind, rng) {
  return {
    kind,
    count: [1, 2, 3][Math.floor(rng() * 3)],
    size: rng() < 0.5 ? 'small' : 'big',
    mark: rng() < 0.5 ? 'none' : 'cross',
    role: rng() < 0.5 ? 'doer' : 'target',
  };
}

/**
 * Generate ONE structured BankItem.
 *
 * The retry loop is inside the function and driven by the item's own seeded stream, so the item
 * stays byte-reproducible from its provenance: the checker regenerates it from `levers` + `seed`
 * and takes the same branches.
 *
 * @param {{depth,scope,distractorSimilarity,keyPosition,direction,kindIndex,
 *          systemPersistence,systemSeed,seed}} lever
 */
export function genItem({
  depth,
  scope,
  distractorSimilarity,
  keyPosition,
  direction,
  kindIndex,
  systemPersistence,
  systemSeed,
  seed,
}) {
  if (systemPersistence !== 'consistent' && systemPersistence !== 'perTrial') {
    throw new Error(`systemPersistence must be consistent|perTrial, got "${systemPersistence}"`);
  }
  if (direction !== 'wordToPicture' && direction !== 'pictureToWord') {
    throw new Error(`direction must be wordToPicture|pictureToWord, got "${direction}"`);
  }
  const rng = makeRng(seed);
  const kind = KINDS[kindIndex % KINDS.length];

  // The MEANING sequence, the reference picture and the whole option slate depend only on the
  // levers and the seed — never on the mode. That is what equates the two banks: both arms serve
  // the same pictures, the same key and the same difficulty, and differ only in the spelling.
  let attempt = 0;
  for (; attempt < 60; attempt++) {
    const base = drawBase(kind, rng);
    const chain = buildChain({ depth, scope }, base, rng);
    if (chain === null) continue;
    const key = applyChain(chain, base);
    if (pictureKey(key) === pictureKey(base)) continue;

    const votes = relabelVotes(depth, base);
    const distractors = chooseDistractors(chain, base, key, distractorSimilarity, votes);
    if (distractors === null) continue;

    return assemble({
      depth,
      scope,
      distractorSimilarity,
      keyPosition,
      direction,
      kindIndex,
      systemPersistence,
      systemSeed,
      seed,
      base,
      chain,
      key,
      distractors,
      votes,
    });
  }
  throw new Error(`no admissible item for depth=${depth} scope=${scope} (seed ${seed})`);
}

const OPTION_KEYS = ['A', 'B', 'C', 'D'];

function assemble({
  depth,
  scope,
  distractorSimilarity,
  keyPosition,
  direction,
  kindIndex,
  systemPersistence,
  systemSeed,
  seed,
  base,
  chain,
  key,
  distractors,
  votes,
}) {
  const slot = keyPosition % OPTION_KEYS.length;
  const pictures = [];
  const rules = [];
  const chains = [];
  let d = 0;
  for (let i = 0; i < OPTION_KEYS.length; i++) {
    if (i === slot) {
      pictures.push(key);
      rules.push(null);
      chains.push(chain);
    } else {
      pictures.push(distractors[d].output);
      rules.push(distractors[d].rule);
      chains.push(distractors[d].rule.meanings);
      d++;
    }
  }

  const system =
    systemPersistence === 'consistent'
      ? drawSystem(systemSeed)
      : drawSystem(`${systemSeed}|${seed}`);
  const stem = stemFor(system, base.kind);
  const spell = (meanings) => spellWord(stem, meanings.map((m) => formFor(system, m)));
  const affixForms = chain.map((m) => formFor(system, m));

  const distractorRationales = {};
  const strategyTrace = {};
  OPTION_KEYS.forEach((optionKey, i) => {
    const rule = rules[i];
    if (rule === null) {
      distractorRationales[optionKey] = {
        lure: 'correct',
        ruleId: `full:${chain.join('>')}`,
        note: 'every morpheme applied once, in the order written',
      };
      strategyTrace[optionKey] = { ruleId: `full:${chain.join('>')}`, kind: 'correct' };
      return;
    }
    distractorRationales[optionKey] = {
      lure: FAILURES.find((f) => f.kind === rule.kind).lure,
      ruleId: rule.ruleId,
      partialRuleKind: rule.kind,
      note: rule.note,
      // The minimal-pair depth of this option: 1 means it differs from the right answer in exactly
      // one picture attribute, which is the item shape §3.3 says separates decomposition from a
      // whole-word association.
      attributesFromKey: pictureDistance(key, pictures[i]),
    };
    strategyTrace[optionKey] = { ruleId: rule.ruleId, kind: rule.kind };
  });

  const cfg = { depth, scope };
  const difficulty = round2(difficultyFromLevers(cfg, distractorSimilarity));
  const optionVotes = pictures.map((p) => votes.get(pictureKey(p)) ?? 0);
  const totalVotes = optionVotes.reduce((a, b) => a + b, 0);

  const shared = {
    typeCode: 'VER-MORPHO-01',
    direction,
    // The full affix inventory, always alphabetical by FORM, so the tray leaks nothing in either
    // mode. Ordered by meaning it would BE the mapping.
    morphemeTray: AFFIX_FORMS.slice(),
    // The labelled reference: "this is a KIB". What each morpheme does to it is server-only.
    stem,
    stemPicture: { ...base },
  };

  const content =
    direction === 'wordToPicture'
      ? {
          ...shared,
          word: spell(chain),
          wordMorphemes: affixForms.slice(),
          options: OPTION_KEYS.map((optionKey, i) => ({
            key: optionKey,
            picture: { ...pictures[i] },
          })),
        }
      : {
          ...shared,
          targetPicture: { ...key },
          options: OPTION_KEYS.map((optionKey, i) => ({
            key: optionKey,
            word: spell(chains[i]),
            morphemes: chains[i].map((m) => formFor(system, m)),
          })),
        };

  return {
    itemId: seededUuid(`${systemPersistence}|${direction}|${seed}`),
    typeCode: 'VER-MORPHO-01',
    domain: 'verbal',
    difficulty, // FLOAT 1..20 — DESIGN rung from the levers, not calibrated (validated:false)
    ageBands: ageBandsFor(difficulty),
    demoPath: 'demos/VER-MORPHO-01.html',
    content,
    answer: {
      correctKey: OPTION_KEYS[slot],
      // SERVER-ONLY: the system itself. Shipping this would make every item a lookup.
      system: {
        systemId: system.systemId,
        affixMap: { ...system.affixMap },
        stemMap: { ...system.stemMap },
      },
      meaningChain: chain.slice(),
      morphemeChain: affixForms.slice(),
      keyPicture: { ...key },
      // §4.6's per-trial strategy trace: which partial rule each option is consistent with.
      strategyTrace,
      strategyTraceRules: FAILURE_KINDS.slice(),
      keyDistanceFromStem: pictureDistance(base, key),
      // The anti-leak audit, carried per item so the claim is checkable off the shipped bank rather
      // than only off a generator run. `optionVotes` counts the mappings that send the word to each
      // option; `maxVoteShare` is the accuracy of the best possible content-only attack, whose
      // floor is 1/4.
      relabelling: {
        optionVotes,
        viableOptions: optionVotes.filter((v) => v > 0).length,
        maxVoteShare: totalVotes === 0 ? 1 : round2(Math.max(...optionVotes) / totalVotes),
      },
      distractorRationales,
    },
    scoring: { mode: 'deterministic_key' },
    provenance: {
      generator: 'grammar',
      generatorRef: 'ver-morpho-01-grammar@1',
      seed,
      levers: {
        depth,
        scope,
        // Derived from (depth, scope), recorded so the checker re-derives difficulty from the
        // levers alone without re-deriving the derivation.
        mixed: isMixed(depth, scope),
        // Balanced, never priced. See the difficulty-model comment for why.
        direction,
        // The control condition, recorded in provenance rather than content: the renderer must not
        // know which arm it is serving, and `servedItemSchema` omits provenance (§4.1.1).
        systemPersistence,
        systemSeed,
        keyPosition,
        kindIndex,
        // Full precision (not rounded): enables exact, reproducible regeneration.
        distractorSimilarity,
      },
    },
    syntheticOnly: true,
    validated: false,
  };
}

/**
 * What each option DENOTES, recomputed from a finished item.
 *
 * Mode-independent by construction: in the picture->word direction the option words are the
 * mapping's image of their meaning sequences, so decoding them through the same mapping returns the
 * meanings whichever arm the item belongs to.
 */
export function optionDenotations(item) {
  const c = item.content;
  if (c.direction === 'wordToPicture') return c.options.map((o) => pictureKey(o.picture));
  const map = item.answer.system.affixMap;
  return c.options.map((o) =>
    pictureKey(applyChain(o.word.split('-').slice(1).map((form) => map[form]), c.stemPicture)),
  );
}

/**
 * The item's identity as a child would experience it, with the spelling projected out.
 *
 * `learning-block.ts` forbids serving the same item twice because a repeat measures recall of that
 * item, and two items that differ only in `itemId` are a repeat wearing a new label. Worse, the
 * pairs this catches carried DIFFERENT stated difficulties — the same stimulus priced twice — which
 * is the §1.1(d) structured labelling error rather than mere redundancy. The bank builder uses this
 * to reject collisions and redraw.
 *
 * The fingerprint deliberately omits the written forms, so it is identical across the two
 * persistence arms and both arms take the same redraws. A spelling-sensitive fingerprint would let
 * the arms diverge in which items they contain, which would break the equating the gate rests on.
 */
export function semanticFingerprint(item) {
  return [
    item.content.direction,
    pictureKey(item.content.stemPicture),
    item.answer.correctKey,
    item.answer.meaningChain.join('>'),
    optionDenotations(item).join(','),
  ].join('#');
}

/**
 * Assign every planned item the screen slot its key will occupy.
 *
 * WHY THIS IS NOT A CURSOR ANY MORE. `keyPosition = n % 4` over items emitted rung by rung in
 * increasing difficulty makes the answer slot a function of the item's RANK IN THE BANK'S
 * DIFFICULTY ORDER — and `difficulty` is a served field. Sorting a scraped bank recovers `n`, and
 * `n mod 4` is the answer. STAGE2_ANTILEAK_COMPARISON §7.2 measures that at 59.0% against a 25.0%
 * floor on this bank, and 84.0% cross-validated once the served covariates are added. No brute
 * force, no understanding of the item.
 *
 * The replacement keeps everything the cursor bought and drops the order it leaked. Slots are
 * allocated as a balanced MULTISET inside each stratum — a cell of the served covariates an
 * attacker can condition on — and then PERMUTED inside that cell from the seeded stream, so an
 * item's slot is independent of where it sits in the difficulty order. The remainder that does not
 * divide is carried across cells that share a `carryOf` bucket, so the bucket's own counts still
 * differ by at most one (E-094 balance) rather than accumulating on whichever slot the cells
 * happen to start on.
 *
 * `carryOf` is what makes the §7.3 direction lock unrepresentable rather than merely unlikely.
 * Carrying per DIRECTION forces each of A/B/C/D to be the key 58 or 59 times within each arm, so
 * "the answer is never in B or D on a word->picture item" cannot recur however the cells fall.
 *
 * @param {string[]} strata one stratum label per planned item, in emission order
 * @param {(stratum: string) => string} carryOf which cells must balance against each other
 */
function allocateKeySlots(strata, optionCount, seed, carryOf) {
  const rng = makeRng(seed);
  const cells = new Map();
  strata.forEach((stratum, index) => {
    const cell = cells.get(stratum) ?? [];
    cell.push(index);
    cells.set(stratum, cell);
  });

  const carried = new Map();
  const slots = new Array(strata.length);
  // Cells are walked in a fixed lexical order, not in Map insertion order, so the allocation does
  // not depend on the order the rung loop happened to discover the strata in.
  for (const stratum of [...cells.keys()].sort()) {
    const indices = cells.get(stratum);
    const bucket = carryOf(stratum);
    const used = carried.get(bucket) ?? new Array(optionCount).fill(0);

    const base = Math.floor(indices.length / optionCount);
    const multiset = [];
    for (let slot = 0; slot < optionCount; slot++) {
      for (let n = 0; n < base; n++) multiset.push(slot);
    }
    // The remainder goes to the slots this bucket has used LEAST so far. Ties are broken off the
    // seeded stream rather than by slot index, or slot A would collect every remainder.
    const bySlack = shuffle([...Array(optionCount).keys()], rng).sort((a, b) => used[a] - used[b]);
    for (let n = 0; n < indices.length - base * optionCount; n++) multiset.push(bySlack[n]);
    for (const slot of multiset) used[slot] += 1;
    carried.set(bucket, used);

    const permuted = shuffle(multiset, rng);
    indices.forEach((index, n) => {
      slots[index] = permuted[n];
    });
  }
  return slots;
}

/* ================================================================== *
 * BANK BUILDER
 *
 * Fills every 0.5-point rung of the 1..20 scale with >=perRung items.
 *
 * 0.5 and not 1.0 because §1.1(c) is a bank-SHAPE requirement: a child
 * climbing at 0.10 points/trial ends a 30-trial block wanting items around
 * `standing + 4`, and a pool that thins out saturates, goes all-correct, and
 * has its lambda pushed toward the bound with an inflated SE.
 *
 * TWELVE per rung and not six, which is the one bank-shape change this type
 * makes on purpose. STAGE2_BANK_RECOVERY_MEASUREMENT §5 found that
 * FLU-OPCHAIN-01 tracks an idealised grid to about 45 trials and then falls
 * behind it, and named the most likely cause: the ideal grid carries 12 items
 * per 0.5-point rung and that bank carries 6, so a long block visiting a
 * narrow band of rungs exhausts the good ones. The document flags this as an
 * untested conjecture. Twelve is the cheapest way to remove the difference
 * rather than argue about it, and it is the right lever for the ceiling:
 * §8 of the same document shows the truncation that bites high-standing
 * children is the 20-point SCALE ceiling, which deepening the composition
 * cannot fix and density does not pretend to.
 * ================================================================== */
export function buildBank({ systemPersistence, perRung = 12, systemSeed = 'VER-MORPHO-01|v1' }) {
  const items = [];
  const rungs = [];
  for (let d = 1; d <= 20 + 1e-9; d += 0.5) rungs.push(round2(d));

  let kindCursor = 0;
  let directionCursor = 0;
  const seen = new Set();

  // PASS 1 — the lever plan for the whole bank, everything except the key's screen slot. The slot
  // has to be allocated over the finished plan rather than inside this loop, because the strata it
  // balances within are cells of the whole bank and a cursor cannot see them one item at a time.
  const plan = [];

  for (const rung of rungs) {
    // The rung window is clipped to its BAND's window as well as to +/-0.24, so an item cannot land
    // a rounding-width across a band edge and carry the neighbouring band's depth cap with it. The
    // checker caps depth by the item's own difficulty, not by the rung it was aimed at, and without
    // this clip the two disagree at every boundary rung.
    const band = bandFor(rung);
    const lo = Math.max(1, rung - 0.24, band.lo);
    const hi = Math.min(20, rung + 0.24, band.band === '6-8' ? 20 : band.hi - 0.01);

    const segments = [];
    for (const cfg of ALLOWED_CONFIGS) {
      if (cfg.depth > band.maxDepth) continue; // §4.3 developmental floor
      const a = Math.max(lo, difficultyFromLevers(cfg, 0));
      const b = Math.min(hi, difficultyFromLevers(cfg, 1));
      if (b > a + 1e-6) segments.push({ cfg, lo: a, hi: b });
    }
    if (segments.length === 0) {
      throw new Error(`no lever config reaches rung ${rung} under the ${band.band} depth cap`);
    }

    const stride = Math.max(1, Math.floor(segments.length / perRung));
    const hits = segments.map(() => 0);
    for (let i = 0; i < perRung; i++) hits[(i * stride) % segments.length]++;
    const localSeen = segments.map(() => 0);

    for (let i = 0; i < perRung; i++) {
      const index = (i * stride) % segments.length;
      const segment = segments[index];
      const li = localSeen[index]++;
      const target = segment.lo + (segment.hi - segment.lo) * ((li + 0.5) / hits[index]);
      const similarity = solveSimilarity(segment.cfg, target);
      const c = segment.cfg;
      const base = `VER-MORPHO-01|rung=${rung}|i=${i}|D${c.depth}S${c.scope}`;
      plan.push({
        rung,
        base,
        levers: {
          ...c,
          distractorSimilarity: similarity,
          // Round-robin, so direction and kind are balanced by construction rather than by luck
          // (E-094) — and direction is balanced WITHIN each rung, which is what keeps an unpriced
          // direction effect orthogonal to difficulty.
          direction: ['wordToPicture', 'pictureToWord'][directionCursor++ % 2],
          kindIndex: kindCursor++ % KINDS.length,
          systemPersistence,
          systemSeed,
        },
      });
    }
  }

  // PASS 2 — the key's screen slot, balanced inside each (direction, depth) cell and permuted
  // there, with the remainder carried per DIRECTION. The cell is the pair of served covariates an
  // attacker can condition on, so a slot policy fitted on either of them scores the 25.0% floor;
  // the permutation is what removes the difficulty-order recovery; and the per-direction carry is
  // what makes the §7.3 lock — the answer never in B or D on a word->picture item — impossible
  // rather than merely absent from this draw.
  const slots = allocateKeySlots(
    plan.map((p) => `${p.levers.direction}|D${p.levers.depth}`),
    OPTION_KEYS.length,
    `${systemSeed}|keySlots`,
    (stratum) => stratum.split('|')[0],
  );

  // PASS 3 — generate, in the same rung order as before, so the de-duplication below sees items in
  // the order the bank ships them.
  for (let n = 0; n < plan.length; n++) {
    const { rung, base } = plan[n];
    const levers = { ...plan[n].levers, keyPosition: slots[n] };

    // Redraw on a semantic collision. The redraw is carried in the SEED rather than in a separate
    // lever, so an item stays byte-reproducible from its own provenance: the checker regenerates
    // from `levers` + `seed` and lands on the same draw without knowing a redraw happened.
    let item = null;
    for (let redraw = 0; redraw < 64; redraw++) {
      const candidate = genItem({ ...levers, seed: redraw === 0 ? base : `${base}|r${redraw}` });
      const fingerprint = semanticFingerprint(candidate);
      if (seen.has(fingerprint)) continue;
      seen.add(fingerprint);
      item = candidate;
      break;
    }
    if (item === null) throw new Error(`64 redraws at rung ${rung} all collided (${base})`);
    items.push(item);
  }
  return items;
}

/* ------------------------------------------------------------------ *
 * CLI entrypoint: write BOTH banks and print the audits.
 * ------------------------------------------------------------------ */
function isMain() {
  return process.argv[1] && resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url));
}

/**
 * Where each arm's bank file lives. The consistent arm takes the bare code inside the served
 * directory so the loader and the sync script find it by the ordinary rule; the scrambled arm is
 * written outside that directory entirely, keeping its arm suffix so a stray copy is recognisable.
 */
export const BANK_PATHS = {
  consistent: '../banks/VER-MORPHO-01.jsonl',
  perTrial: '../control-banks/VER-MORPHO-01.perTrial.jsonl',
};

function printInventoryScreen() {
  console.log(
    `\nform space: ${FORM_POOL.length} of ${ONSETS.length * VOWELS.length * CODAS.length} CVC ` +
      `candidates survive the phonotactic and English screens ` +
      `(${ENGLISH_CVC.size} are web2 words)`,
  );
  const rows = [
    ...AFFIX_FORMS.map((f) => [f, 'affix slot']),
    ...STEM_FORMS.map((f) => [f, 'stem slot']),
  ];
  let worstPair = null;
  for (let i = 0; i < FORM_INVENTORY.length; i++) {
    for (let j = i + 1; j < FORM_INVENTORY.length; j++) {
      const d = editDistance(FORM_INVENTORY[i], FORM_INVENTORY[j]);
      if (worstPair === null || d < worstPair.d) {
        worstPair = { d, a: FORM_INVENTORY[i], b: FORM_INVENTORY[j] };
      }
    }
  }
  console.log(
    `inventory (${rows.length} forms, all CVC, all screened): ` +
      rows.map(([f, slot]) => `${f} [${slot}]`).join('  '),
  );
  console.log(
    `English collision screen: ${rows.filter(([f]) => screenForm(f) !== null).length} form(s) ` +
      `fail — every form is absent from web2, is not an English affix, and is at edit distance ` +
      `>1 from all ${MEANING_WORDS.length} meaning-naming English words`,
  );
  console.log(
    `closest pair of forms: ${worstPair.a}/${worstPair.b} at edit distance ${worstPair.d} ` +
      `(>=2 required, so no two morphemes differ by one letter)`,
  );
}

if (isMain()) {
  const perRung = Number(process.env.PER_RUNG || 12);
  const modes = ['consistent', 'perTrial'];
  const banks = {};

  printInventoryScreen();

  for (const mode of modes) {
    const items = buildBank({ systemPersistence: mode, perRung });
    banks[mode] = items;
    const outPath = resolve(__dirname, BANK_PATHS[mode]);
    mkdirSync(dirname(outPath), { recursive: true });
    writeFileSync(outPath, serializeBank(items));
    console.log(`\nVER-MORPHO-01 (${mode}): ${items.length} items -> ${outPath}`);
  }

  const reference = banks.consistent;
  const rungCounts = new Map();
  for (const it of reference) {
    const rung = round2(Math.round(it.difficulty * 2) / 2);
    rungCounts.set(rung, (rungCounts.get(rung) ?? 0) + 1);
  }
  const short = [...rungCounts].filter(([, n]) => n < 10).map(([r]) => r);
  const diffs = reference.map((it) => it.difficulty);
  console.log(
    `\ndifficulty span: ${round2(Math.min(...diffs))} .. ${round2(Math.max(...diffs))} ` +
      `over ${rungCounts.size} distinct 0.5-point rungs`,
  );
  console.log(short.length ? `SHORT RUNGS (<10): ${short.join(',')}` : 'all 0.5-point rungs >=10');

  const keyCounts = {};
  for (const it of reference) {
    keyCounts[it.answer.correctKey] = (keyCounts[it.answer.correctKey] ?? 0) + 1;
  }
  console.log(
    `key positions (all items are 4-option, so one stratum): ` +
      Object.entries(keyCounts)
        .sort()
        .map(([k, n]) => `${k}:${n} (${((100 * n) / reference.length).toFixed(1)}%)`)
        .join('  '),
  );

  const bandCounts = {};
  const dirCounts = {};
  for (const it of reference) {
    const b = it.ageBands.join('+');
    bandCounts[b] = (bandCounts[b] ?? 0) + 1;
    const d = it.provenance.levers.direction;
    dirCounts[d] = (dirCounts[d] ?? 0) + 1;
  }
  console.log(
    `bands served: ${Object.entries(bandCounts)
      .sort()
      .map(([b, n]) => `${b}:${n}`)
      .join('  ')}   (K-1 is deliberately unserved — decoding floor, §3.3)`,
  );
  console.log(
    `direction: ${Object.entries(dirCounts)
      .sort()
      .map(([d, n]) => `${d}:${n}`)
      .join('  ')}`,
  );

  // The anti-leak audit (E-075/E-076), by difficulty quartile, because the question is what the
  // WORST slice does and a bank-wide mean would hide it.
  console.log('\nanti-leak audit — best content-only attack after brute-forcing every mapping');
  console.log('| slice | items | fully determined | mean viable options | mean best-attack |');
  console.log('| --- | --- | --- | --- | --- |');
  const sorted = reference.slice().sort((a, b) => a.difficulty - b.difficulty);
  const sliceSize = Math.ceil(sorted.length / 4);
  const sliceRows = [];
  for (let q = 0; q < 4; q++) {
    const slice = sorted.slice(q * sliceSize, (q + 1) * sliceSize);
    if (slice.length === 0) continue;
    const determined = slice.filter((it) => it.answer.relabelling.viableOptions <= 1).length;
    const viable =
      slice.reduce((a, it) => a + it.answer.relabelling.viableOptions, 0) / slice.length;
    const attack =
      slice.reduce((a, it) => a + it.answer.relabelling.maxVoteShare, 0) / slice.length;
    sliceRows.push({ q, n: slice.length, determined, viable, attack });
    console.log(
      `| Q${q + 1} (${round2(slice[0].difficulty)}..${round2(slice[slice.length - 1].difficulty)}) ` +
        `| ${slice.length} | ${determined} | ${viable.toFixed(2)} / 4 | ` +
        `${(100 * attack).toFixed(1)}% |`,
    );
  }
  const worst = sliceRows.reduce((a, b) => (b.attack > a.attack ? b : a));
  console.log(
    `worst slice Q${worst.q + 1}: mean best-attack ${(100 * worst.attack).toFixed(1)}% against a ` +
      `25.0% four-option chance floor; ` +
      `${reference.filter((it) => it.answer.relabelling.viableOptions <= 1).length} of ` +
      `${reference.length} items fully determined by content`,
  );

  // Equating (U3(g)): the two banks must differ ONLY in persistence.
  const a = banks.consistent;
  const b = banks.perTrial;
  const mismatches = [];
  if (a.length !== b.length) mismatches.push(`item counts ${a.length} vs ${b.length}`);
  for (let i = 0; i < Math.min(a.length, b.length); i++) {
    if (a[i].difficulty !== b[i].difficulty) mismatches.push(`item ${i}: difficulty`);
    if (a[i].answer.correctKey !== b[i].answer.correctKey) mismatches.push(`item ${i}: key slot`);
    if (a[i].content.options.length !== b[i].content.options.length) {
      mismatches.push(`item ${i}: option count`);
    }
    if (a[i].content.direction !== b[i].content.direction) mismatches.push(`item ${i}: direction`);
    if (JSON.stringify(a[i].answer.meaningChain) !== JSON.stringify(b[i].answer.meaningChain)) {
      mismatches.push(`item ${i}: meaning chain`);
    }
    if (JSON.stringify(a[i].answer.strategyTrace) !== JSON.stringify(b[i].answer.strategyTrace)) {
      mismatches.push(`item ${i}: strategy trace`);
    }
  }
  const distinctSystems = new Set(b.map((it) => it.answer.system.systemId)).size;
  console.log(
    `\nequating: ${
      mismatches.length === 0
        ? 'the two banks match on every scored property'
        : `MISMATCH — ${mismatches.slice(0, 5).join('; ')}`
    }`,
  );
  console.log(
    `persistence: consistent bank uses ${new Set(a.map((it) => it.answer.system.systemId)).size} ` +
      `system(s); perTrial bank uses ${distinctSystems} (one per item)`,
  );

  const longest = Math.max(
    ...reference.flatMap((it) =>
      it.content.direction === 'wordToPicture'
        ? [it.content.word.length]
        : it.content.options.map((o) => o.word.length),
    ),
  );
  const longestByBand = {};
  for (const it of reference) {
    const band = it.ageBands[0];
    const chars =
      it.content.direction === 'wordToPicture'
        ? it.content.word.length
        : Math.max(...it.content.options.map((o) => o.word.length));
    longestByBand[band] = Math.max(longestByBand[band] ?? 0, chars);
  }
  console.log(
    `\nreading demand: every morpheme is a 3-letter CVC; longest word ${longest} characters ` +
      `(${(longest + 1) / 4} syllables). By band: ` +
      Object.entries(longestByBand)
        .sort()
        .map(([band, chars]) => `${band}:${chars} chars/${(chars + 1) / 4} syllables`)
        .join('  '),
  );

  console.log(
    '\nNOT GATED. Gate B needs ~128 real children (§4.1.3); no synthetic run substitutes. Whether\n' +
      'this type loads on verbal rather than fluid reasoning is A-S2-3 and is UNTESTED. The\n' +
      'consistent arm is the live bank; the scrambled arm lives outside banks/ and is never served.',
  );
}
