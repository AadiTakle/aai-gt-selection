// VER-ROLES-01 "Who Did What" — DUAL-MODE structured TEMPLATE generator (Bucket A: grammar).
//
// A Stage 2 learning-block type, built to STAGE2_REDESIGN_SPEC.md §5.3 — which
// docs/product/STAGE2_VER_ROLES_01_SPEC.md expands into the §3.1 shape — under D-S2-3 (the
// scrambled-system control is a binding gate), D-017 (text-only, never audio), and §2.1 of the
// redesign spec (banks store TEMPLATES, not finished items).
//
// THE TASK. The child sees a schematic SCENE — who did what to whom — and a SENTENCE in an invented
// language. The language marks thematic roles either by particles or by word order. The child
// induces the grammar across trials, then taps either which of four scenes a sentence describes, or
// which of four sentences describes a scene. One tap, four fixed positions, no drag and no typing.
//
// ---------------------------------------------------------------------------
// WHY THIS IS NOT `VER-MORPHO-01` WEARING DIFFERENT TOKENS
//
// The owner rejected `VER-MORPHO-01`, and the diagnosis was specific: it is the same
// compose-hidden-operators task as the other three Stage 2 types, with word-shaped tokens. Its
// semantics really are an operator chain — a morpheme is a unary function on a picture state, a word
// is a composition of them, and the answer is the resulting state.
//
// This type is not that, and the difference is structural rather than thematic. Here the answer is
// not a state reached by applying functions; it is an ASSIGNMENT of participants to the argument
// slots of a predicate. Three properties follow, and none of them holds of any operator chain:
//
//   1. THE OPTIONS ARE PERMUTATIONS OF ONE ANOTHER'S BINDINGS. On a `roleOnlyDistractors: 3` item
//      all four options show the SAME participants and the SAME predicate, and differ only in who
//      fills which role. An operator chain cannot construct such an item, because it has no
//      bindings to permute — its options differ in the VALUE of a composition, so "same value,
//      different assignment" is not expressible in it.
//   2. REARRANGING THE SAME WORDS MEANS SOMETHING ELSE. For every item there is a rearrangement of
//      its own word forms that denotes a DIFFERENT scene — reordering the arguments when the
//      language marks by position, re-pairing the particles with the nouns when it marks by
//      particle. {@link orderIsSemantic} asserts it on every item under every grammar sampled.
//      Non-commuting operators change an OUTPUT when reordered; they do not change WHO DID IT,
//      because there is no who.
//   3. THE HIDDEN SYSTEM IS NOT A SYMBOL TABLE. A grammar is a particle→role bijection AND a base
//      role order, and the two are alternative routes to the same fact rather than a vocabulary and
//      its composition rule. The same particle inventory with a different base order parses a bare
//      sentence differently and a marked sentence identically, which is a property no assignment of
//      meanings to symbols has.
//
// If a future change collapses any of these three — in particular if the option slate stops being
// role-permutations over one participant set — the type has been rebuilt as `VER-MORPHO-01` and
// should be stopped rather than shipped.
// ---------------------------------------------------------------------------
//
// ---------------------------------------------------------------------------
// WHY THIS FILE EMITS TEMPLATES RATHER THAN ITEMS, AND WHAT THAT BUYS
//
// §2 of the redesign spec measured what per-session re-keying costs a bank whose options are baked
// at build time: on the four shipped Stage 2 banks a free relabelling moves the difficulty count on
// 21.4%–50.3% of item×mapping pairs (Failure A), and at chain depth 4 only 13.8% of mappings leave
// the correct answer on screen at all (Failure B). Both have one cause — the options are fixed while
// the mapping is drawn later, and nothing reconciles them.
//
// So a record here is a TEMPLATE, and the abstraction line is the load-bearing decision. The
// template owns everything that is NOT the hidden system:
//
//   * the predicate and the participants — these are SCENE content, and the grammar only supplies
//     their spelling, so naming them in the template costs nothing;
//   * the SURFACE PLAN — which participant sits at which rank, and which rank carries which particle
//     SLOT. Slots, not roles: what a slot means is the hidden system's business;
//   * the distractor RATIONALES, as transforms of the surface plan — "the participants at ranks 0
//     and 1 exchanged" — so a wrong option is an instruction rather than a picture.
//
// The template does NOT own the role assignment. The key reading is what {@link parse} says the
// materialised sentence means under the session grammar, so the key is a function of the grammar and
// is correct by construction under every one of them. This is the inversion that kills both
// failures: a bank of finished items fixes the meaning and hopes the grammar agrees, and a bank of
// templates fixes the form and lets the grammar decide the meaning.
//
// A sibling agent owns the serve-time path. {@link materialise} exists so the generator and the
// checker can audit templates before that path lands, and so the contract it must satisfy is
// executable rather than described.
//
// `content.optionCount` rather than `content.options` is deliberate and not a shortcut:
// `itemOptionCount` in `packages/exam-engine/src/item-format.ts` already accepts that spelling —
// written for the selection index, which ships counts instead of megabytes of stimulus — so the
// per-type guessing-floor machinery reads a template correctly with no change to it.
// ---------------------------------------------------------------------------
//
// ---------------------------------------------------------------------------
// WHY THE KEY IS NOT DERIVABLE FROM `content`, IN TWO TIERS
//
// `content` names no role anywhere. It states how many arguments the sentence has, whether marking
// is by particle or by position, the direction and the option count. Every role fact lives under
// `answer`, which `servedItemSchema` omits wholesale. The brute force is then over GRAMMARS, and it
// is reported at two tiers because the two answer different questions:
//
//   TIER 1 — nothing known. Every noun form may denote any entity, every verb form any predicate,
//     every particle any role, and the base order is free. This is the E-075/E-076 question: what
//     can a client compute from `content` alone? The invariant is that ALL FOUR options are
//     reachable, so nothing can be eliminated and "delete the impossible, guess among the rest"
//     sits exactly on the 25% four-option floor.
//   TIER 2 — the vocabulary known, the role system not. A child eight trials in has the nouns and
//     the verbs; nothing in the block reveals the role system except by inference. The invariant is
//     that at least TWO options survive. Tier 2 is not a leak bound — it is the DIFFICULTY of the
//     item for a part-way-there child, and it equals `roleOnlyDistractors + 1` by construction.
//     That identity is why §5.3's third and fourth difficulty levers are one lever seen twice, and
//     this file prices it once rather than twice.
//
// ORDER STRATEGIES ARE THE ATTACK THAT MATTERS, and they are measured rather than argued. "The
// first noun is the agent" is the English reading; it is what a child brings to trial 1 and the
// first thing an attacker would try. {@link auditOrderStrategies} enumerates every injection from
// roles to surface ranks, scores each over the bank MARGINALISED OVER THE GRAMMAR FAMILY — which is
// the position a client without the session grammar is actually in, since the grammar is redrawn per
// session and never shipped — and reports the best. What holds it at the floor is the `roleLayout`
// quota: the participants' order relative to the key reading is allocated round-robin, so no fixed
// role-to-rank assumption is right more often than chance. That is this type's analogue of
// `FLU-OPCHAIN-01`'s vote-rank quota, and for the same reason: bounding one strategy just hands the
// certainty to its opposite, so the only fix is to make the truth uniform.
//
// The reveal a learning block needs — the scene the sentence actually describes, shown after the
// child commits — is deliberately NOT in `content`. The renderer cannot know it; the host supplies
// it once the server has scored the trial.
// ---------------------------------------------------------------------------
//
// ---------------------------------------------------------------------------
// READING LOAD, AND WHY D-017 MAKES IT THIS FILE'S PROBLEM
//
// Like `VER-MORPHO-01` this type's stimulus is text, and D-017 records that the instrument is
// text-only with no audio, so decoding demand cannot be moved to a soundtrack. A child who decodes
// slowly would look like a slow learner. The same mitigations apply, plus one this type needs on its
// own account:
//
//   * every noun and verb form is a CLOSED-SYLLABLE CVC with a short vowel, and every particle a CV
//     — no digraphs (c/h/j/q/w/x/y never appear, so sh/ch/th/wh/ph/qu cannot form), no clusters, no
//     r-controlled vowels, no soft c or g, no silent e, no doubled letters, onset never equals coda;
//   * PARTICLES ARE HYPHENATED TO THEIR HOST NOUN. Working out WHICH noun a floating particle marks
//     is a segmentation puzzle and is not the construct; the construct is which ROLE it marks. So
//     attachment is given away and the role is not. This also makes particle-vs-noun decidable by
//     length — two letters against three — which removes a second construct-irrelevant puzzle;
//   * K-1 IS NOT SERVED. Grade-1 decoding accuracy is around 34% (gifted-assessment BrainLift 6.7),
//     the same evidence and the same treatment §3.3 and §4.3 give `VER-MORPHO-01`;
//   * the longest sentence in the bank is a three-argument particle-marked one: three CVC nouns,
//     three CV particles and one CVC verb — 4 whitespace tokens, 21 letters. Band 2-3 is capped at
//     two arguments, so at the youngest band served the longest sentence is 3 tokens, 13 letters.
// ---------------------------------------------------------------------------
//
// GOVERNANCE. Born-synthetic only (syntheticOnly:true, validated:false). `difficulty` is a DESIGN
// rung on the shared 1..20 scale computed from the declared levers, NOT a calibrated IRT parameter.
// NOTHING HERE IS GATED: Gate B needs ~128 real children (§4.1.3) and no synthetic run substitutes,
// and Gate A (U5) has not been run on this type at all. The honest status is "specced, generated and
// checked; unexamined by any gate". It has no renderer and is not wired into the live block.
//
// WHERE THE TEMPLATES ARE WRITTEN, AND WHY NOT IN `banks/`.
//
// `banks/` is the SERVED directory: `apps/web/src/lib/exam/bank-loader.ts` builds every path it
// reads inside it, `scripts/sync-exam-demos.mjs` globs it to decide what is wired, and
// `packages/contracts/src/bank-conformance.test.ts` validates every file in it against
// `bankItemSchema`. A template is not a servable item — it has no `content.options` — so putting one
// there would either fail that test or, worse, pass it and be served. Both arms are therefore
// written to `templates/` and `control-templates/`, directories no application code names. The
// serve-time materialisation path is what will turn a template into something `banks/` could hold;
// until it lands, nothing in the app can reach these files.
//
// Run:  node research/exam-question-types/generators/VER-ROLES-01.mjs
//       writes ../templates/VER-ROLES-01.jsonl (measurement arm) and
//       ../control-templates/VER-ROLES-01.perTrial.jsonl (scrambled control, never served)
//       and prints the inventory screen, coverage, the two-tier anti-leak audit, the order-strategy
//       audit, the re-draw invariance certificate and the equating summary.

import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { serializeBank } from './item-shape.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));

/* ================================================================== *
 * THE ROLE INVENTORY — three thematic roles, which is "who did what to whom".
 *
 * Agent, patient and goal are the core argument roles of every natural
 * predicate-argument system, and three is the smallest inventory in which
 * pinning ONE role does not pin the reading: knowing the agent still leaves
 * patient and goal to place. That is what keeps a partial order heuristic below
 * the guessing floor, so the inventory size is a measurement decision rather
 * than a taste in linguistics.
 *
 * It is also why a TWO-argument sentence has six readings rather than two: with
 * three roles available and only two argument positions, one role is always
 * spare, and which two roles are in play is itself part of what the grammar
 * decides. Without that, a two-argument item would be a two-alternative forced
 * choice dressed as a four-option one, and no quota can hold an order strategy
 * to 25% on a 2AFC.
 * ================================================================== */
export const ROLES = ['agent', 'patient', 'goal'];

/**
 * The entities a scene can contain. Schematic and text-only per D-017: the
 * renderer draws a labelled outline, never a photograph and never a word the
 * child must already know.
 *
 * They are deliberately SEMANTICALLY INERT — nothing about a square makes it a
 * likelier agent than a circle. That closes the standing failure mode of
 * thematic-role items built from real-world nouns: "the dog chased the ball" has
 * exactly one sensible reading, so a child who answers it has used world
 * knowledge and the item has measured vocabulary. Every reading of every item
 * here is equally plausible, so only the grammar separates them.
 */
export const ENTITIES = ['circle', 'square', 'triangle', 'diamond', 'hexagon'];

/**
 * The predicates. Every one takes up to three arguments, so the same verb can
 * appear with two participants or three — which is what makes ARGUMENT COUNT a
 * difficulty lever rather than a change of vocabulary. Like the entities they
 * are reversible: any participant can do any of these to any other.
 */
export const PREDICATES = ['push', 'carry', 'follow', 'hand'];

/* ------------------------------------------------------------------ *
 * THE FORM POOLS — phonics-safe pseudo-syllables.
 *
 * Onsets and codas exclude c/h/j/q/w/x/y entirely, so no digraph can form; `r`
 * never closes a syllable, so no r-controlled vowel; onset never equals coda, so
 * no doubled letter. Nouns and verbs are CVC and particles CV, which is both the
 * natural shape of case morphology (Japanese ga/o/ni, Turkish -i/-e) and what
 * makes particle-vs-argument decidable without decoding either.
 * ------------------------------------------------------------------ */
const ONSETS = ['b', 'd', 'f', 'g', 'k', 'l', 'm', 'n', 'p', 'r', 's', 't', 'v', 'z'];
const VOWELS = ['a', 'e', 'i', 'o', 'u'];
const CODAS = ['b', 'd', 'f', 'g', 'k', 'l', 'm', 'n', 'p', 's', 't', 'v', 'z'];

/**
 * Forms this generator will not use. The screen exists rather than the claim,
 * because §5.3's stated strength is prior-knowledge resistance — "the language is
 * invented, so vocabulary and schooling cannot help" — and a form that is an
 * English word would quietly hand a strong reader a foothold the design says it
 * has removed. The list covers the short English words the grammars above can
 * actually produce.
 */
const BLOCKED_FORMS = new Set([
  'bad', 'bag', 'ban', 'bat', 'bed', 'beg', 'bet', 'bib', 'bid', 'big', 'bit', 'bob', 'bog',
  'bud', 'bug', 'bum', 'bun', 'bus', 'but', 'dad', 'dam', 'den', 'did', 'dig', 'dim', 'din',
  'dip', 'dog', 'dot', 'dub', 'dug', 'fad', 'fan', 'fat', 'fed', 'fig', 'fin', 'fit', 'fog',
  'fun', 'gag', 'gap', 'gas', 'gel', 'gem', 'get', 'gig', 'gum', 'gun', 'gut', 'kid', 'kin',
  'kit', 'lab', 'lad', 'lag', 'lap', 'led', 'leg', 'let', 'lid', 'lip', 'lit', 'log', 'lot',
  'mad', 'man', 'map', 'mat', 'men', 'met', 'mob', 'mom', 'mop', 'mud', 'mug', 'nab', 'nap',
  'net', 'nib', 'nip', 'nod', 'not', 'nut', 'pad', 'pal', 'pan', 'pat', 'peg', 'pen', 'pet',
  'pig', 'pin', 'pit', 'pod', 'pop', 'pot', 'pub', 'pug', 'pun', 'pup', 'put', 'rag', 'ram',
  'ran', 'rap', 'rat', 'red', 'rib', 'rid', 'rig', 'rim', 'rip', 'rob', 'rod', 'rot', 'rub',
  'rug', 'rum', 'run', 'rut', 'sad', 'sag', 'sap', 'sat', 'set', 'sin', 'sip', 'sit', 'sob',
  'sod', 'son', 'sop', 'sub', 'sum', 'sun', 'tab', 'tad', 'tag', 'tan', 'tap', 'ten', 'tin',
  'tip', 'tog', 'tom', 'ton', 'top', 'tot', 'tub', 'tug', 'van', 'vat', 'vet', 'vim', 'zap',
  'zip', 'zit',
  'be', 'do', 'go', 'if', 'in', 'is', 'it', 'la', 'lo', 'me', 'no', 'of', 'on', 'so', 'to',
  'up', 'us', 'we',
]);

/** Every admissible CVC form, in one deterministic order. */
export const CVC_FORMS = (() => {
  const out = [];
  for (const onset of ONSETS) {
    for (const vowel of VOWELS) {
      for (const coda of CODAS) {
        if (onset === coda) continue;
        const form = onset + vowel + coda;
        if (BLOCKED_FORMS.has(form)) continue;
        out.push(form);
      }
    }
  }
  return out;
})();

/** Every admissible CV particle form, in one deterministic order. */
export const CV_FORMS = (() => {
  const out = [];
  for (const onset of ONSETS) {
    for (const vowel of VOWELS) {
      const form = onset + vowel;
      if (BLOCKED_FORMS.has(form)) continue;
      out.push(form);
    }
  }
  return out;
})();

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
export function makeRng(seed) {
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

/** All permutations of a list, in a deterministic order. */
export function permutations(list) {
  if (list.length <= 1) return [list.slice()];
  const out = [];
  for (let i = 0; i < list.length; i++) {
    const rest = [...list.slice(0, i), ...list.slice(i + 1)];
    for (const tail of permutations(rest)) out.push([list[i], ...tail]);
  }
  return out;
}

/* ================================================================== *
 * THE HIDDEN GRAMMAR
 *
 * Five parts, and the split between load-bearing and cosmetic is stated because
 * a cosmetic parameter that looked load-bearing would be a difficulty leak
 * waiting to happen:
 *
 *   nouns, verbs    THE LEXICON. Learnable from the scenes alone — a form that
 *                   appears whenever the circle is in the scene names the circle
 *                   — so this is the cheap tier, and Tier 2 of the anti-leak
 *                   audit assumes the child already has it.
 *   particleForms   the three case markers, in SLOT order.
 *   particleRoles   which role each SLOT marks. This and the previous field
 *                   together are the case system; splitting them is what lets a
 *                   template name a slot without naming a role.
 *   baseRoleOrder   the order arguments appear in when the sentence carries no
 *                   particles, and — for a particle-marked sentence — nothing at
 *                   all. This is the positional half of the marking system.
 *   particlePlacement / verbSlot
 *                   COSMETIC. Particles are two letters and nouns three, so
 *                   placement is recoverable from the string; the verb is
 *                   identifiable by lexicon, not by position. Both are drawn
 *                   anyway, because they make a re-drawn grammar look different
 *                   to a child who has seen one before, and NEITHER is priced,
 *                   because neither is a demand.
 *
 * There is no per-predicate argument frame, and the absence is deliberate. An
 * earlier draft gave each verb a hidden frame naming which two roles a
 * two-argument use takes; it made the role set undeterminable from the surface
 * whenever the template's frame disagreed with the grammar's, which broke the
 * parse on real items. The rule below — unclaimed roles are filled from base
 * order — recovers the same six-reading space with no extra hidden parameter,
 * and it is a real typological pattern rather than an invention: a clause
 * realises the highest-ranked roles unless a marker overrides.
 * ================================================================== */
export function drawGrammar(seed) {
  const rng = makeRng(`grammar|${seed}`);
  const cvc = shuffle(CVC_FORMS, rng);
  const cv = shuffle(CV_FORMS, rng);

  const nouns = {};
  ENTITIES.forEach((entity, i) => {
    nouns[entity] = cvc[i];
  });
  const verbs = {};
  PREDICATES.forEach((predicate, i) => {
    verbs[predicate] = cvc[ENTITIES.length + i];
  });

  return {
    grammarId: `gr-${seed}`,
    nouns,
    verbs,
    particleForms: cv.slice(0, ROLES.length),
    particleRoles: shuffle(ROLES, rng),
    baseRoleOrder: shuffle(ROLES, rng),
    particlePlacement: rng() < 0.5 ? 'pre' : 'post',
    verbSlot: rng() < 0.5 ? 'initial' : 'final',
  };
}

/** The particle slot whose role is `role`, or -1. Used only at materialisation. */
export function slotForRole(grammar, role) {
  return grammar.particleRoles.indexOf(role);
}

function grammarIndex(grammar) {
  const entityOf = {};
  for (const [entity, form] of Object.entries(grammar.nouns)) entityOf[form] = entity;
  const predicateOf = {};
  for (const [predicate, form] of Object.entries(grammar.verbs)) predicateOf[form] = predicate;
  const roleOf = {};
  grammar.particleForms.forEach((form, slot) => {
    roleOf[form] = grammar.particleRoles[slot];
  });
  return { entityOf, predicateOf, roleOf };
}

/* ================================================================== *
 * SPELLING AND PARSING
 *
 * Kept as separate functions over a SURFACE PLAN so the checker can
 * re-implement `parse` from the documented rule and disagree with `spell` if
 * either is wrong. The key reading is never asserted — it is whatever `parse`
 * returns, which is why the key cannot be wrong under any grammar.
 * ================================================================== */

/**
 * A surface plan: `participants[rank]` is the entity at that surface rank, and
 * `particleSlots[rank]` is the particle slot marking it, or `null` for an
 * unmarked argument. Every plan in this file is uniformly marked or uniformly
 * bare — see {@link MARKING} for why.
 */
export function spellPlan(plan, grammar) {
  const argTokens = plan.participants.map((entity, rank) => {
    const noun = grammar.nouns[entity];
    if (noun === undefined) return null;
    const slot = plan.particleSlots[rank];
    if (slot === null) return noun;
    const particle = grammar.particleForms[slot];
    if (particle === undefined) return null;
    return grammar.particlePlacement === 'post' ? `${noun}-${particle}` : `${particle}-${noun}`;
  });
  if (argTokens.some((t) => t === null)) return null;
  const verb = grammar.verbs[plan.predicate];
  if (verb === undefined) return null;
  return grammar.verbSlot === 'initial'
    ? [verb, ...argTokens].join(' ')
    : [...argTokens, verb].join(' ');
}

/**
 * Parse a sentence under a grammar into a reading, or `null` if the grammar
 * cannot parse it.
 *
 * The rule, in full, because it IS the language:
 *   1. the verb is the bare token the verb lexicon recognises;
 *   2. every argument token carrying a particle takes that particle's role;
 *   3. every remaining argument takes a remaining role, matched by SURFACE ORDER
 *      against the grammar's BASE ROLE ORDER.
 *
 * Step 3 is what makes word order load-bearing, and it is why a bare sentence is
 * answerable at all. It is also why the same string can mean two different things
 * under two grammars that share a lexicon: base order is a role fact, not a word
 * fact.
 *
 * `null` is a real and load-bearing outcome rather than an error path: it is what
 * makes the brute force informative, because a grammar the sentence rules out is
 * a grammar the client has eliminated for free.
 */
export function parse(sentence, grammar) {
  const { entityOf, predicateOf, roleOf } = grammarIndex(grammar);
  const tokens = sentence.split(' ');

  let predicate = null;
  const argTokens = [];
  for (const token of tokens) {
    if (!token.includes('-') && predicateOf[token] !== undefined) {
      if (predicate !== null) return null; // two verbs: not a sentence of this language
      predicate = predicateOf[token];
      continue;
    }
    argTokens.push(token);
  }
  if (predicate === null || argTokens.length < 2 || argTokens.length > ROLES.length) return null;

  const assignment = {};
  const unmarked = [];
  for (const token of argTokens) {
    if (token.includes('-')) {
      const parts = token.split('-');
      if (parts.length !== 2) return null;
      const noun = parts[0].length === 3 ? parts[0] : parts[1];
      const particle = parts[0].length === 3 ? parts[1] : parts[0];
      const entity = entityOf[noun];
      const role = roleOf[particle];
      if (entity === undefined || role === undefined) return null;
      if (assignment[role] !== undefined) return null; // one role, marked twice
      assignment[role] = entity;
      continue;
    }
    const entity = entityOf[token];
    if (entity === undefined) return null;
    unmarked.push(entity);
  }

  const remaining = grammar.baseRoleOrder.filter((role) => assignment[role] === undefined);
  if (remaining.length < unmarked.length) return null;
  unmarked.forEach((entity, i) => {
    assignment[remaining[i]] = entity;
  });

  if (new Set(Object.values(assignment)).size !== Object.keys(assignment).length) return null;
  return { predicate, assignment };
}

/** A reading, canonically serialised. Role order is fixed, so equality is textual. */
export const readingKey = (reading) =>
  `${reading.predicate}|` +
  ROLES.map((role) => `${role}=${reading.assignment[role] ?? '-'}`).join(',');

/** The roles a reading uses, in canonical order. */
const rolesOf = (reading) => ROLES.filter((role) => reading.assignment[role] !== undefined);

/* ================================================================== *
 * MARKING — the binary §5.3 asks for, and why it is binary.
 *
 * §5.3's second difficulty lever is "whether role marking is by particle or
 * position". An earlier draft made it a COUNT — how many of the arguments carry
 * a particle — which is a richer lever and which had to go. With a partially
 * marked sentence, the roles of the unmarked arguments are pinned by base order,
 * so which readings a distractor rationale can reach becomes a function of the
 * drawn base order. That is Failure B returning through a side door: a slate
 * admissible under one grammar and not another is a slate whose correct answer
 * is on screen by luck.
 *
 * Uniform marking removes it. Under `particle`, roles come entirely from
 * particles, so every one of the six readings is reachable by re-pairing them.
 * Under `position`, roles come entirely from base order, so every reading is
 * reachable by permuting the participants. Either way the reachable set is the
 * whole reading space, for every grammar, which is what lets the invariance
 * certificate be exact rather than probabilistic.
 * ================================================================== */
export const MARKING = ['particle', 'position'];

/* ================================================================== *
 * PLAN TRANSFORMS — the distractor rationales, as instructions.
 *
 * A rationale must be grammar-independent, or difficulty drifts when the grammar
 * is redrawn. So it is a transform of the SURFACE PLAN, never of the reading:
 *
 *   permute      a permutation of which participant sits at which rank. The
 *                participants swap roles, and the sentence is the same word forms
 *                rearranged. This is "same words, roles swapped".
 *   substitute   the participant at one rank takes the role NONE of them holds —
 *                the spare role. Available only at two arguments, where a role is
 *                spare, and only under `particle` marking, where a rank's role
 *                can be forced by changing its particle.
 *   predicate    the verb read as a different predicate. Not role-only.
 *   entity       one participant replaced by one the sentence does not name. Not
 *                role-only.
 *
 * `permute` and `substitute` together reach EXACTLY the reading space: at two
 * arguments the 2 permutations x 3 substitution choices give all six readings,
 * and at three arguments the 6 permutations give all six. So the role-only
 * distractor space is the residual-ambiguity space, which is the identity the
 * two-tier audit rests on.
 *
 * BINDING DISTANCE IS GRAMMAR-INDEPENDENT, and that is the property that makes
 * the within-rung positioner safe. A participant's role changes under
 * `(permute, substitute)` exactly when its rank moves or its rank is the
 * substituted one — a fact about the permutation, not about which role it
 * happened to hold.
 * ================================================================== */

/** Every role-only transform available to a plan, excluding the identity. */
export function roleOnlyTransforms(argCount, marking) {
  const out = [];
  const ranks = [...Array(argCount).keys()];
  const substitutions = marking === 'particle' && argCount < ROLES.length ? [null, ...ranks] : [null];
  for (const permute of permutations(ranks)) {
    for (const substitute of substitutions) {
      const isIdentity = substitute === null && permute.every((r, i) => r === i);
      if (isIdentity) continue;
      out.push({
        kind: substitute === null ? 'permute' : 'substitute',
        permute: permute.slice(),
        substitute,
        // A participant's role moves when its rank moves, or when it lands on the substituted rank.
        bindingDistance: ranks.filter((rank) => permute[rank] !== rank || rank === substitute).length,
      });
    }
  }
  return out;
}

/** Apply a role-only transform to a plan, under a grammar. `null` if not spellable. */
function applyRoleOnly(plan, transform, grammar, keyReading) {
  const participants = plan.participants.map((_, rank) => plan.participants[transform.permute[rank]]);
  const particleSlots = plan.particleSlots.slice();
  if (transform.substitute !== null) {
    const spare = ROLES.filter((role) => keyReading.assignment[role] === undefined);
    if (spare.length === 0) return null;
    const slot = slotForRole(grammar, spare[0]);
    if (slot < 0) return null;
    // Two ranks cannot carry one particle, so the rank that already held that slot takes the one
    // being vacated. That keeps the sentence a permutation of the same word forms.
    const collides = particleSlots.indexOf(slot);
    const vacated = particleSlots[transform.substitute];
    particleSlots[transform.substitute] = slot;
    if (collides >= 0 && collides !== transform.substitute) particleSlots[collides] = vacated;
  }
  return { ...plan, participants, particleSlots };
}

/** Apply a filler transform to a plan. */
function applyFiller(plan, transform) {
  if (transform.kind === 'predicate') return { ...plan, predicate: transform.predicate };
  const participants = plan.participants.slice();
  participants[transform.rank] = transform.entity;
  return { ...plan, participants };
}

/**
 * How far an option sits from the key, on ONE axis shared by every distractor
 * class, so the within-rung positioner is live at every lever setting.
 *
 * An earlier draft priced only the role-only distractors' binding distance, and
 * at (2 arguments, position marking) exactly one role-only transform exists — so
 * there was nothing to choose between, the positioner was dead, and the bank
 * claimed a difficulty span that config could not deliver. That is the §1.1(d)
 * labelling error precisely: a lever that moves the stated difficulty without
 * moving the item.
 *
 * Low is hard. A different verb over identical bindings is the closest thing to
 * the key there is; a participant the sentence never names is the easiest reject
 * once the nouns are known.
 */
const FILLER_DISTANCE = { predicate: 1, entity: 3 };
export const transformDistance = (t) => t.bindingDistance ?? FILLER_DISTANCE[t.kind];

/* ================================================================== *
 * DIFFICULTY MODEL — from the declared levers, monotone by construction, and
 * priced ONLY on quantities a relabelling cannot move.
 *
 * §2 of the redesign spec is the whole reason this section reads the way it does.
 * Every current Stage 2 type prices difficulty on a count of one OPERATOR
 * SUB-CLASS; class membership belongs to the operator rather than the symbol, so
 * a free relabelling moves the count on 21.4%-50.3% of item x mapping pairs. Not
 * one term below mentions a particle, a word or a base order. They are: how many
 * arguments, whether marking is positional, how many wrong options are role-only,
 * and how close the slate sits to the key. All four are counts over the TEMPLATE,
 * so `auditRedrawInvariance` asserts difficulty is LITERALLY unchanged under a
 * re-draw rather than merely close to it.
 * ================================================================== */

/** Load from argument count: three bindings to hold rather than two. The dominant term. */
export const ARG_LOAD = { 2: 0, 3: 3.4 };
/**
 * Load for positional rather than particle marking.
 *
 * The SIGN of this term is a claim about children and it is an open assumption,
 * not a measurement — recorded as A-S2-7 rather than asserted. The reasoning for
 * making positional harder: a bare sentence offers no per-argument cue, so a
 * partially induced grammar gets no partial credit from it, and it is where the
 * English word-order prior does its damage. The reasoning against: a bare
 * sentence needs ONE fact (the base order) where a marked one needs three (the
 * particles), so early in a block the marked sentence may be harder. If the
 * ordering is wrong the error is STRUCTURED rather than random, which §1.1(d)
 * says biases lambda rather than merely attenuating it, so this is the term to
 * check first if Gate A's A1 fails.
 */
const POSITIONAL_WEIGHT = 1.6;
/** Load per role-only distractor beyond the first — which is residual ambiguity beyond two. */
const ROLE_ONLY_WEIGHT = 1.3;
/** Span of the continuous slate-proximity lever, the within-rung positioner. */
const PROXIMITY_SPAN = 2.4;

export const OPTION_COUNT = 4;
export const OPTION_KEYS = ['A', 'B', 'C', 'D'];
export const DIRECTIONS = ['sentence_to_scene', 'scene_to_sentence'];

export function baseScore({ argCount, marking, roleOnlyDistractors }) {
  return (
    1.0 +
    ARG_LOAD[argCount] +
    POSITIONAL_WEIGHT * (marking === 'position' ? argCount : 0) +
    ROLE_ONLY_WEIGHT * (roleOnlyDistractors - 1)
  );
}

/**
 * Every lever combination the grammar can build. Reachable by construction —
 * there is no filtering step, because an unreachable config would be a difficulty
 * the bank claims to serve and cannot.
 *
 * The one restriction: `roleOnlyDistractors` cannot exceed the number of
 * role-only transforms the (argCount, marking) pair admits. At two arguments
 * under positional marking there is exactly one — the participants swap — so
 * that cell carries one role-only distractor and its two fillers. The bound is
 * grammar-independent, which is what keeps difficulty invariant.
 */
export const ALLOWED_CONFIGS = (() => {
  const out = [];
  for (const argCount of [2, 3]) {
    for (const marking of MARKING) {
      const available = roleOnlyTransforms(argCount, marking).length;
      for (let roleOnlyDistractors = 1; roleOnlyDistractors < OPTION_COUNT; roleOnlyDistractors++) {
        if (roleOnlyDistractors > available) continue;
        out.push({ argCount, marking, roleOnlyDistractors });
      }
    }
  }
  return out;
})();

const ALL_BASES = ALLOWED_CONFIGS.map(baseScore);
const RAW_MIN = Math.min(...ALL_BASES);
const RAW_MAX = Math.max(...ALL_BASES) + PROXIMITY_SPAN;

/** Lever tuple -> design rung on the shared 1..20 scale. */
export function difficultyFromLevers(cfg, slateProximity) {
  const raw = baseScore(cfg) + PROXIMITY_SPAN * slateProximity;
  return clamp(1 + ((raw - RAW_MIN) * 19) / (RAW_MAX - RAW_MIN), 1, 20);
}

function solveProximity(cfg, targetDifficulty) {
  const rawNeeded = RAW_MIN + ((targetDifficulty - 1) * (RAW_MAX - RAW_MIN)) / 19;
  return clamp((rawNeeded - baseScore(cfg)) / PROXIMITY_SPAN, 0, 1);
}

/* ================================================================== *
 * BANDS — the developmental floor §4.3 requires, expressed over argument count.
 *
 * K-1 is EXCLUDED rather than capped, on the same evidence and for the same
 * reason as `VER-MORPHO-01`: the stimulus is text, Grade-1 decoding accuracy is
 * around 34%, and a decoding floor reads as low ability. Above that the cap is on
 * ARGUMENT COUNT, because argument count is exactly the dimensionality the
 * developmental evidence constrains — Li et al. (2024) found 6-7-year-olds mostly
 * best fit by a random-response model on an information-integration structure,
 * and holding three simultaneous role bindings is that structure.
 * ================================================================== */
export const BANDS = [
  { band: '2-3', lo: 1, hi: 8, maxArgCount: 2 },
  { band: '4-5', lo: 8, hi: 12, maxArgCount: 3 },
  { band: '6-8', lo: 12, hi: 20, maxArgCount: 3 },
];

export function bandFor(difficulty) {
  return BANDS.find((b) => difficulty < b.hi) ?? BANDS[BANDS.length - 1];
}
export function ageBandsFor(difficulty) {
  return [bandFor(difficulty).band];
}

/* ================================================================== *
 * RATIONALE SLATE
 *
 * Lure labels come from the registered vocabulary in item-shape.mjs and nothing
 * is added to it: a role permutation IS the relation applied backwards
 * (`reversed_relation`), a spare-role substitution assigns the wrong role
 * (`wrong_attribute` -> rule_violation), a swapped verb is the wrong relation
 * family (`wrong_family` -> global_mismatch) and a foreign participant is an
 * intrusion (`intrusion` -> global_mismatch). The machine-readable transform
 * rides alongside on `planTransform`, which is what the materialiser reads and
 * what M-ERRTYPE does not need to understand.
 * ================================================================== */
const TRANSFORM_LURES = {
  permute: 'reversed_relation',
  substitute: 'wrong_attribute',
  predicate: 'wrong_family',
  entity: 'intrusion',
};
export const ROLE_ONLY_KINDS = new Set(['permute', 'substitute']);

/**
 * Choose the slate: `roleOnlyCount` role-only transforms plus fillers, aimed at
 * the mean option distance the proximity lever asks for.
 *
 * Enumerated exhaustively over role-only subsets and filler mixes rather than
 * hill-climbed: the candidate space is a few hundred evaluations, and there is no
 * reason to accept a local optimum on the quantity the stated difficulty depends
 * on. Ties break on the transform id so the bank is byte-reproducible.
 *
 * The lever comes FIRST — this function is given a proximity and hits it; the
 * anti-leak invariants are structural (every slate has >= 1 role-only distractor
 * and all four options materialise) rather than an objective competing with the
 * lever. That is deliberate, and it is the discipline `FLU-OPCHAIN-01` had to buy
 * with a tolerance constant: minimising an attacker without a bound quietly
 * BECOMES the difficulty model, which is the §1.1(d) error wearing a security
 * badge. Here there is no such constant, because there is no such competition.
 */
function chooseSlate(argCount, marking, participants, predicate, roleOnlyCount, proximity, rng) {
  const roleOnly = roleOnlyTransforms(argCount, marking);
  if (roleOnly.length < roleOnlyCount) return null;

  const fillerCount = OPTION_COUNT - 1 - roleOnlyCount;
  const otherPredicates = shuffle(
    PREDICATES.filter((p) => p !== predicate),
    rng,
  );
  const spareEntities = shuffle(
    ENTITIES.filter((e) => !participants.includes(e)),
    rng,
  );
  const fillerPool = [
    ...otherPredicates.map((p) => ({ kind: 'predicate', predicate: p })),
    ...spareEntities.map((entity, i) => ({ kind: 'entity', rank: i % argCount, entity })),
  ];

  const distances = [
    ...roleOnly.map(transformDistance),
    ...fillerPool.map(transformDistance),
  ];
  const lo = Math.min(...distances);
  const hi = Math.max(...distances);
  const target = hi - proximity * (hi - lo);

  // Subsets of the role-only transforms, in a deterministic order.
  const roleSubsets = [];
  const walk = (start, picked) => {
    if (picked.length === roleOnlyCount) {
      roleSubsets.push(picked.slice());
      return;
    }
    for (let i = start; i < roleOnly.length; i++) walk(i + 1, [...picked, roleOnly[i]]);
  };
  walk(0, []);

  const fillerSubsets = [];
  const walkFillers = (start, picked) => {
    if (picked.length === fillerCount) {
      fillerSubsets.push(picked.slice());
      return;
    }
    for (let i = start; i < fillerPool.length; i++) walkFillers(i + 1, [...picked, fillerPool[i]]);
  };
  walkFillers(0, []);
  if (fillerSubsets.length === 0) return null;

  let best = null;
  for (const roles of roleSubsets) {
    for (const fillers of fillerSubsets) {
      const slate = [...roles, ...fillers];
      const mean = slate.reduce((a, t) => a + transformDistance(t), 0) / slate.length;
      const cost = Math.abs(mean - target);
      const id = slate.map(transformId).join('|');
      if (best === null || cost < best.cost - 1e-9 || (cost < best.cost + 1e-9 && id < best.id)) {
        best = { slate, cost, id, mean };
      }
    }
  }
  return best === null ? null : best.slate;
}

const transformId = (t) =>
  t.kind === 'predicate'
    ? `predicate=${t.predicate}`
    : t.kind === 'entity'
      ? `entity@${t.rank}=${t.entity}`
      : `${t.kind}:${t.permute.join('')}/${t.substitute ?? '-'}`;

/* ================================================================== *
 * ONE TEMPLATE
 * ================================================================== */

/**
 * Generate ONE structured template.
 *
 * `systemPersistence` does exactly one thing here, and that is the whole point
 * of §4.1.1: it selects which grammar seed the item names. The template itself —
 * surface plan, rationale slate, key slot, difficulty, direction, band — is
 * identical in both arms, because none of it mentions a word or a role. So the
 * two banks are byte-identical except for `answer.grammarRef` and the arm label,
 * which is a stronger equating than any bank of finished items can reach: there
 * is nothing left over that could differ.
 *
 * @param {{argCount,marking,roleOnlyDistractors,slateProximity,keyPosition,
 *          roleLayout,direction,systemPersistence,systemSeed,seed}} lever
 */
export function genTemplate({
  argCount,
  marking,
  roleOnlyDistractors,
  slateProximity,
  keyPosition,
  roleLayout,
  direction,
  systemPersistence,
  systemSeed,
  seed,
}) {
  if (systemPersistence !== 'consistent' && systemPersistence !== 'perTrial') {
    throw new Error(`systemPersistence must be consistent|perTrial, got "${systemPersistence}"`);
  }
  if (!DIRECTIONS.includes(direction)) throw new Error(`unknown direction "${direction}"`);
  if (!MARKING.includes(marking)) throw new Error(`unknown marking "${marking}"`);
  const rng = makeRng(seed);

  const predicate = PREDICATES[Math.floor(rng() * PREDICATES.length)];
  const drawn = shuffle(ENTITIES, rng).slice(0, argCount);

  // `roleLayout` fixes which permutation of the drawn participants sits at the surface ranks, and
  // which particle slots mark them, allocated round-robin by the builder. That is the quota that
  // holds every order strategy at the guessing floor: because the grammar decides what a rank or a
  // slot MEANS, walking the layouts uniformly makes every role equally often at every rank, so no
  // fixed role-to-rank assumption is right more than 1/argCount! of the time.
  const participantOrders = permutations(drawn);
  const participants = participantOrders[roleLayout % participantOrders.length];
  const slotOrders =
    marking === 'particle'
      ? permutations([...Array(ROLES.length).keys()]).map((p) => p.slice(0, argCount))
      : [[...Array(argCount).keys()].map(() => null)];
  const particleSlots = slotOrders[
    Math.floor(roleLayout / participantOrders.length) % slotOrders.length
  ].slice();

  const plan = { predicate, participants: participants.slice(), particleSlots };

  const slate = chooseSlate(
    argCount,
    marking,
    participants,
    predicate,
    roleOnlyDistractors,
    slateProximity,
    rng,
  );
  if (slate === null) {
    throw new Error(`no admissible slate for ${argCount}/${marking}/${roleOnlyDistractors} (${seed})`);
  }

  const slot = keyPosition % OPTION_COUNT;
  const distractorRationales = {};
  const strategyTrace = {};
  let d = 0;
  for (let i = 0; i < OPTION_COUNT; i++) {
    const optionKey = OPTION_KEYS[i];
    if (i === slot) {
      distractorRationales[optionKey] = {
        lure: 'correct',
        ruleId: 'full:the-reading-the-grammar-gives',
        note: 'every role read from the marking the language actually uses',
      };
      strategyTrace[optionKey] = { ruleId: 'full:the-reading-the-grammar-gives', kind: 'correct' };
      continue;
    }
    const transform = slate[d++];
    const ruleId = `${transform.kind}:${transformId(transform)}`;
    distractorRationales[optionKey] = {
      lure: TRANSFORM_LURES[transform.kind],
      ruleId,
      transformKind: transform.kind,
      planTransform: { ...transform },
      optionDistance: transformDistance(transform),
      roleOnly: ROLE_ONLY_KINDS.has(transform.kind),
      note: transformNote(transform),
    };
    strategyTrace[optionKey] = { ruleId, kind: transform.kind };
  }

  const cfg = { argCount, marking, roleOnlyDistractors };
  const difficulty = round2(difficultyFromLevers(cfg, slateProximity));
  const systemSeedForItem = systemPersistence === 'consistent' ? systemSeed : `${systemSeed}|${seed}`;

  return {
    itemId: seededUuid(`${systemPersistence}|${seed}`),
    typeCode: 'VER-ROLES-01',
    domain: 'verbal_reasoning',
    difficulty, // FLOAT 1..20 — DESIGN rung from the levers, not calibrated (validated:false)
    ageBands: ageBandsFor(difficulty),
    demoPath: 'demos/VER-ROLES-01.html',
    // A TEMPLATE's content, and it names no role anywhere. It states the SHAPE of the sentence and
    // the option count the floor machinery reads. What each rank or particle MEANS is under
    // `answer`, which servedItemSchema omits.
    content: {
      typeCode: 'VER-ROLES-01',
      materialisation: 'session_grammar',
      direction,
      optionCount: OPTION_COUNT,
      argCount,
      marking,
      // The renderer's contract, so a demo can be built against the template rather than against a
      // particular grammar.
      renderContract: {
        sentenceIsSpaceSeparatedTokens: true,
        particleIsHyphenatedToItsHostNoun: true,
        nounAndVerbFormsAreThreeLetters: true,
        particleFormsAreTwoLetters: true,
        sceneIsPredicatePlusRoleLabelledParticipants: true,
      },
    },
    answer: {
      // SERVER-ONLY. The surface plan: which participant sits at which rank, and which particle
      // SLOT marks it. Slots rather than roles — what a slot means belongs to the grammar, which is
      // why the key reading is derived at materialisation rather than stated here.
      plan,
      // Which grammar this item is materialised under. The ONE field that differs between the two
      // arms, and therefore the entire control manipulation.
      grammarRef: systemSeedForItem,
      correctKey: OPTION_KEYS[slot],
      // §4.6's per-trial strategy trace: which named misreading each option encodes.
      strategyTrace,
      strategyTraceRules: Object.keys(TRANSFORM_LURES),
      // The per-item anti-leak audit, carried so the claim is checkable off the shipped template
      // rather than only off a generator run. `tier2Reachable` is how many options a child who knows
      // the vocabulary but not the role system cannot eliminate; its floor is 2 and it equals
      // roleOnlyDistractors + 1 by construction, which is also the residual ambiguity.
      antiLeak: {
        readingCount: readingSpaceSize(argCount),
        roleOnlyDistractors,
        tier2Reachable: roleOnlyDistractors + 1,
        residualAmbiguity: roleOnlyDistractors + 1,
        impliedVocabularyOnlyCeiling: round2(1 / (roleOnlyDistractors + 1)),
        orderStrategyBound: round2(orderStrategyBound(argCount, roleOnlyDistractors)),
      },
      distractorRationales,
    },
    scoring: { mode: 'deterministic_key' },
    provenance: {
      generator: 'grammar',
      generatorRef: 'ver-roles-01-template@1',
      seed,
      levers: {
        argCount,
        marking,
        roleOnlyDistractors,
        // The control condition, recorded in provenance rather than content: the renderer must not
        // know which arm it is serving, and `servedItemSchema` omits provenance (§4.1.1).
        systemPersistence,
        systemSeed,
        keyPosition,
        // Which participant-order x particle-slot layout the plan uses, round-robin across the
        // bank. This is the quota that holds every order strategy at the guessing floor.
        roleLayout,
        direction,
        // Full precision (not rounded): enables exact, reproducible regeneration.
        slateProximity,
      },
    },
    syntheticOnly: true,
    validated: false,
  };
}

/** How many readings an item's participant set admits: P(3, argCount), six at both counts. */
export function readingSpaceSize(argCount) {
  let n = 1;
  for (let i = 0; i < argCount; i++) n *= ROLES.length - i;
  return n;
}

/**
 * Exactly what an order strategy scores on an item, derived rather than measured,
 * so the audit has something sharper to be checked against than a round number.
 *
 * A strategy assumes a fixed role-to-rank mapping. Over the `R` role systems the
 * client cannot distinguish, it is exactly right on `1/R` of them. On the rest its
 * guess is one of the other `R-1` readings, of which `roleOnly` are on screen —
 * there it scores 0 — and `R-1-roleOnly` are not, where it learns that much and
 * guesses uniformly:
 *
 *     1/R  +  ((R-1-roleOnly)/R) * (1/optionCount)
 *
 * Subtract the floor `1/optionCount` and the excess is
 * `(optionCount-1-roleOnly) / (optionCount*R)`, which is ZERO exactly when every
 * distractor is role-only.
 *
 * WHY THAT RESIDUAL IS NOT CLOSED, WHICH IS A DECISION AND NOT AN OVERSIGHT. The
 * excess is the intrinsic multiple-choice asymmetry — the key is on screen with
 * probability 1 and every rival reading with probability `roleOnly/(R-1)` — so a
 * strategy that lands on the key is believed more than one that lands elsewhere.
 * Three ways to remove it, and each costs more than it saves:
 *
 *   * pin `roleOnly` at `optionCount-1`. Exact floor, but it deletes §5.3's third
 *     difficulty lever, and without it the raw scale has gaps at 3.4-4.2 and
 *     6.8-9.2 that no other lever reaches, so the bank could not fill its rungs.
 *   * widen the role inventory to four. The excess falls as `1/R`, so a fourth
 *     role halves it at two arguments and quarters it at three. It also doubles
 *     the induction space at band 2-3, which is the band §4.3 and Li et al. (2024)
 *     say to protect, and this type already excludes K-1 for load.
 *   * more options. Strictly worse: the excess falls as `1/optionCount` while the
 *     floor falls as `1/optionCount` too, so the RATIO gets worse, and the
 *     response grammar would stop matching the S1 verbal partner.
 *
 * So it is reported instead, and where it lands is the reason that is defensible:
 * the excess is largest at `roleOnly = 1`, difficulty rises with `roleOnly`, so
 * the leak sits on the EASIEST items and vanishes on the hardest. That is the
 * opposite of `FLU-OPCHAIN-01`'s failure, which scored 34.0% in its hardest slice
 * against a 20% floor — on exactly the children the measurement is about. An
 * excess on easy items inflates early-trial accuracy, which FLATTENS the fitted
 * climb and biases lambda downward, so the residual is also in the conservative
 * direction. Neither of those makes it harmless: it is difficulty-correlated
 * error, and §1.1(d) says that biases lambda rather than merely attenuating it.
 * It is the first term to interrogate if Gate A's A1 check fails.
 */
export function orderStrategyBound(argCount, roleOnlyDistractors) {
  const R = readingSpaceSize(argCount);
  return 1 / OPTION_COUNT + (OPTION_COUNT - 1 - roleOnlyDistractors) / (OPTION_COUNT * R);
}

function transformNote(transform) {
  if (transform.kind === 'permute') {
    return `same words, the participants at ranks ${transform.permute.join(' and ')} exchanged`;
  }
  if (transform.kind === 'substitute') {
    return `same words, the participant at rank ${transform.substitute} given the role none of them holds`;
  }
  if (transform.kind === 'predicate') {
    return `same participants in the same roles, but the verb read as "${transform.predicate}"`;
  }
  return `rank ${transform.rank} filled by a participant the sentence does not name`;
}

/* ================================================================== *
 * MATERIALISATION — template + grammar -> served item.
 *
 * This is the contract the serve-time path must satisfy, written executably so
 * the generator and the checker can audit templates before that path exists. It
 * draws nothing and decides nothing: every choice was made by the template, so
 * the same template under the same grammar always produces the same served item,
 * and under a DIFFERENT grammar produces the same item with different words and a
 * different meaning.
 *
 * The key reading is `parse(spell(plan))`, not a stated fact. That is the whole
 * inversion: the key is what the grammar says the sentence means, so it cannot
 * disagree with the grammar and it is always on screen.
 * ================================================================== */
export function materialise(template, grammar) {
  const { plan, distractorRationales, correctKey } = template.answer;
  const { direction } = template.content;

  const keySentence = spellPlan(plan, grammar);
  if (keySentence === null) return null;
  const keyReading = parse(keySentence, grammar);
  if (keyReading === null) return null;

  const options = [];
  for (const optionKey of OPTION_KEYS) {
    let optionPlan = plan;
    if (optionKey !== correctKey) {
      const transform = distractorRationales[optionKey].planTransform;
      optionPlan = ROLE_ONLY_KINDS.has(transform.kind)
        ? applyRoleOnly(plan, transform, grammar, keyReading)
        : applyFiller(plan, transform);
      if (optionPlan === null) return null;
    }
    const sentence = spellPlan(optionPlan, grammar);
    if (sentence === null) return null;
    const reading = parse(sentence, grammar);
    if (reading === null) return null;
    options.push(
      direction === 'sentence_to_scene'
        ? { key: optionKey, scene: { predicate: reading.predicate, roles: { ...reading.assignment } } }
        : { key: optionKey, sentence },
    );
  }

  // Two options that render identically would make the item unanswerable. The transform classes are
  // disjoint by construction; this is the guard that says so on every materialisation.
  const rendered = options.map((o) => JSON.stringify(o.scene ?? o.sentence));
  if (new Set(rendered).size !== rendered.length) return null;

  return {
    itemId: template.itemId,
    typeCode: template.typeCode,
    difficulty: template.difficulty,
    content: {
      typeCode: template.typeCode,
      direction,
      optionCount: OPTION_COUNT,
      ...(direction === 'sentence_to_scene'
        ? { sentence: keySentence }
        : { scene: { predicate: keyReading.predicate, roles: { ...keyReading.assignment } } }),
      options,
    },
    correctKey,
    keyReading,
    grammarId: grammar.grammarId,
  };
}

/* ================================================================== *
 * THE TWO-TIER BRUTE FORCE
 *
 * Stated as a search over GRAMMARS rather than over readings, because "the key is
 * not derivable from content" is a claim about what a client holding content can
 * compute, and a client computes by trying grammars. Enumerating readings instead
 * would assume the answer.
 * ================================================================== */

/** Every grammar differing from `grammar` only in the role system: 6 particle orders x 6 base orders x 2 placements. */
function roleSystemVariants(grammar) {
  const out = [];
  for (const particleRoles of permutations(ROLES)) {
    for (const baseRoleOrder of permutations(ROLES)) {
      for (const particlePlacement of ['pre', 'post']) {
        out.push({ ...grammar, particleRoles, baseRoleOrder, particlePlacement });
      }
    }
  }
  return out;
}

/**
 * TIER 2: which options a client who knows the vocabulary but not the role system
 * cannot eliminate.
 *
 * The measured quantity is `1 / |survivors|`, which is what such a client scores
 * by guessing among what it cannot rule out. The invariant is `>= 2`, and it is a
 * DIFFICULTY statement rather than a leak bound: a child part-way through the
 * block IS this client, and how much the vocabulary alone buys them is exactly
 * what `roleOnlyDistractors` prices.
 */
export function tier2Survivors(template, grammar) {
  const served = materialise(template, grammar);
  if (served === null) return null;
  const survivors = new Set();

  for (const variant of roleSystemVariants(grammar)) {
    if (template.content.direction === 'sentence_to_scene') {
      const reading = parse(served.content.sentence, variant);
      if (reading === null) continue;
      const hit = served.content.options.find(
        (o) =>
          readingKey({ predicate: o.scene.predicate, assignment: o.scene.roles }) ===
          readingKey(reading),
      );
      if (hit) survivors.add(hit.key);
    } else {
      const target = readingKey({
        predicate: served.content.scene.predicate,
        assignment: served.content.scene.roles,
      });
      for (const option of served.content.options) {
        const reading = parse(option.sentence, variant);
        if (reading !== null && readingKey(reading) === target) survivors.add(option.key);
      }
    }
  }
  return survivors;
}

/**
 * TIER 1: whether EVERY option is reachable once the lexicon is free too.
 *
 * This is the E-075/E-076 question, and with all four options reachable the
 * elimination attack sits exactly on the 25% four-option floor. Searched
 * constructively with early exit rather than by full enumeration: the lexicon
 * dimension multiplies the grammar space by three orders of magnitude and the
 * property needed is existence, not a count. A `predicate` filler is reached by
 * transposing two verb forms; an `entity` filler by transposing two noun forms;
 * a role-only distractor by the role system alone.
 */
export function tier1Unreachable(template, grammar) {
  const served = materialise(template, grammar);
  if (served === null) return null;
  const unreachable = [];
  const forward = template.content.direction === 'sentence_to_scene';
  const target = forward
    ? null
    : readingKey({
        predicate: served.content.scene.predicate,
        assignment: served.content.scene.roles,
      });

  for (const option of served.content.options) {
    const wanted = forward
      ? readingKey({ predicate: option.scene.predicate, assignment: option.scene.roles })
      : target;
    const surface = forward ? served.content.sentence : option.sentence;

    let found = false;
    // Transpose any two verb forms and any two noun forms, then let the role system range freely.
    // That is the whole of what a content-only client can relabel, and it covers every class.
    const verbSwaps = [null, ...PREDICATES.flatMap((p, i) => PREDICATES.slice(i + 1).map((q) => [p, q]))];
    const nounSwaps = [null, ...ENTITIES.flatMap((e, i) => ENTITIES.slice(i + 1).map((f) => [e, f]))];
    outer: for (const vs of verbSwaps) {
      for (const ns of nounSwaps) {
        const verbs = { ...grammar.verbs };
        if (vs) [verbs[vs[0]], verbs[vs[1]]] = [verbs[vs[1]], verbs[vs[0]]];
        const nouns = { ...grammar.nouns };
        if (ns) [nouns[ns[0]], nouns[ns[1]]] = [nouns[ns[1]], nouns[ns[0]]];
        for (const variant of roleSystemVariants({ ...grammar, verbs, nouns })) {
          const reading = parse(surface, variant);
          if (reading !== null && readingKey(reading) === wanted) {
            found = true;
            break outer;
          }
        }
      }
    }
    if (!found) unreachable.push(option.key);
  }
  return unreachable;
}

/**
 * The property that separates this type from an operator chain, asserted on every
 * item rather than argued in a comment.
 *
 * There must exist a rearrangement of the item's own WORD FORMS that denotes a
 * different scene. Under positional marking that is reordering the arguments;
 * under particle marking it is re-pairing the particles with the nouns. Either
 * way the same words in a different arrangement mean something else — the
 * property §5.3 says no operator chain has, because an operator chain has no
 * participants to reassign.
 */
export function orderIsSemantic(template, grammar) {
  const { plan } = template.answer;
  const keySentence = spellPlan(plan, grammar);
  if (keySentence === null) return false;
  const keyReading = parse(keySentence, grammar);
  if (keyReading === null) return false;
  const wordBag = (s) => s.split(' ').flatMap((t) => t.split('-')).sort().join('|');
  const bag = wordBag(keySentence);

  for (const transform of roleOnlyTransforms(template.content.argCount, template.content.marking)) {
    const rival = applyRoleOnly(plan, transform, grammar, keyReading);
    if (rival === null) continue;
    const sentence = spellPlan(rival, grammar);
    if (sentence === null) continue;
    const reading = parse(sentence, grammar);
    if (reading === null) continue;
    if (wordBag(sentence) === bag && readingKey(reading) !== readingKey(keyReading)) return true;
  }
  return false;
}

/* ================================================================== *
 * WHAT MAKES TWO TEMPLATES THE SAME QUESTION
 *
 * `learning-block.ts` forbids re-serving an item, because a repeat measures
 * recall of that item rather than the system. Two templates that differ only in
 * `itemId` are a repeat wearing a new label, and if they also carry different
 * stated difficulties they are the §1.1(d) structured labelling error as well —
 * the same question priced twice.
 *
 * GRAMMAR-INDEPENDENT by construction, because a template is. The option set is
 * compared UNORDERED, because two templates offering the same four options are
 * the same question however the key has been round-robined among them.
 * ================================================================== */
export function stimulusFingerprint(template) {
  const transforms = OPTION_KEYS.filter((k) => k !== template.answer.correctKey)
    .map((k) => transformId(template.answer.distractorRationales[k].planTransform))
    .sort();
  return JSON.stringify([
    template.content.direction,
    template.content.marking,
    template.answer.plan,
    transforms,
  ]);
}

/* ================================================================== *
 * BANK BUILDER
 *
 * Fills every 0.5-point rung of the 1..20 scale with >=perRung templates.
 *
 * 0.5 and not 1.0 because §1.1(c) is a bank-SHAPE requirement, not an item count:
 * a child climbing at 0.10 points/trial ends a 30-trial block wanting items
 * around `standing + 4`, and a pool that thins before then saturates, goes
 * all-correct, and has its lambda pushed toward the bound with an inflated SE.
 * Twelve per rung rather than six follows `VER-MORPHO-01`, which took the figure
 * from STAGE2_BANK_RECOVERY_MEASUREMENT §5 tracing `FLU-OPCHAIN-01` falling
 * behind an idealised grid at 45-60 trials to exactly that difference in depth.
 * ================================================================== */
export function buildBank({ systemPersistence, perRung = 12, systemSeed = 'VER-ROLES-01|v1' }) {
  const items = [];
  const rungs = [];
  for (let d = 1; d <= 20 + 1e-9; d += 0.5) rungs.push(round2(d));

  // One global item counter driving three balanced allocations, each on its own stride so no two
  // become correlated. A client that could read one off another would have a leak assembled out of
  // two separate anti-leak measures, which is the trap `FLU-OPCHAIN-01` documented.
  let itemCursor = 0;
  /** Every stimulus already emitted, so a duplicate question is refused rather than shipped. */
  const emitted = new Set();

  for (const rung of rungs) {
    // Clipped to the BAND's window as well as to +/-0.24, so an item cannot land a rounding-width
    // across a band edge and carry the neighbouring band's argument cap with it.
    const band = bandFor(rung);
    const lo = Math.max(1, rung - 0.24, band.lo);
    const hi = Math.min(20, rung + 0.24, band.band === '6-8' ? 20 : band.hi - 0.01);

    const segments = [];
    for (const cfg of ALLOWED_CONFIGS) {
      if (cfg.argCount > band.maxArgCount) continue; // §4.3 developmental floor
      const a = Math.max(lo, difficultyFromLevers(cfg, 0));
      const b = Math.min(hi, difficultyFromLevers(cfg, 1));
      if (b > a + 1e-6) segments.push({ cfg, lo: a, hi: b });
    }
    if (segments.length === 0) {
      throw new Error(`no lever config reaches rung ${rung} under the ${band.band} argument cap`);
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
      const proximity = solveProximity(segment.cfg, target);
      const cfg = segment.cfg;
      const layoutCount =
        factorial(cfg.argCount) *
        (cfg.marking === 'particle' ? permutations([0, 1, 2]).length : 1);
      const baseSeed = `VER-ROLES-01|rung=${rung}|i=${i}|A${cfg.argCount}${cfg.marking[0].toUpperCase()}R${cfg.roleOnlyDistractors}`;

      const lever = {
        ...cfg,
        slateProximity: proximity,
        // Round-robin over all three, on three different strides, so key position, role layout and
        // direction are balanced by construction rather than by luck (E-094). The role-layout quota
        // is the one that holds every order strategy at the floor.
        keyPosition: itemCursor % OPTION_COUNT,
        roleLayout: Math.floor(itemCursor / OPTION_COUNT) % layoutCount,
        direction: DIRECTIONS[(itemCursor + Math.floor(itemCursor / OPTION_COUNT)) % DIRECTIONS.length],
        systemPersistence,
        systemSeed,
      };
      itemCursor++;

      // Redraw on a duplicate stimulus, carrying the attempt in the SEED rather than in a new lever,
      // so the template stays byte-reproducible from its own provenance: the checker regenerates
      // from `levers` + `provenance.seed` and lands on the same draw without knowing a redraw
      // happened.
      let item = null;
      for (let attempt = 0; attempt < 64 && item === null; attempt++) {
        const candidate = genTemplate({
          ...lever,
          seed: attempt === 0 ? baseSeed : `${baseSeed}|r${attempt}`,
        });
        if (emitted.has(stimulusFingerprint(candidate))) continue;
        item = candidate;
      }
      if (item === null) {
        throw new Error(`64 redraws at rung ${rung} i=${i} all duplicated an existing stimulus`);
      }
      emitted.add(stimulusFingerprint(item));
      items.push(item);
    }
  }
  return items;
}

const factorial = (n) => (n <= 1 ? 1 : n * factorial(n - 1));

/* ================================================================== *
 * AUDITS — the three claims this design makes, measured rather than argued.
 * ================================================================== */

/**
 * THE RE-DRAW INVARIANCE CERTIFICATE, which is the claim §2 of the redesign spec
 * says the current banks cannot make.
 *
 * Materialise every template under a sample of grammars and assert that the
 * stated difficulty, the option count and the key slot never move, that
 * materialisation never fails, and that the key reading really is the parse of
 * the served sentence. If any of those moves, the type has Failure A or Failure B
 * and its difficulty ladder does not survive per-session keying.
 */
export function auditRedrawInvariance(items, grammarCount = 24) {
  const grammars = [];
  for (let g = 0; g < grammarCount; g++) grammars.push(drawGrammar(`redraw|${g}`));
  let materialisations = 0;
  const distinctKeyReadings = new Map();
  const failures = [];
  for (const item of items) {
    const readings = new Set();
    for (const grammar of grammars) {
      const served = materialise(item, grammar);
      if (served === null) {
        failures.push(`${item.itemId} failed to materialise under ${grammar.grammarId}`);
        continue;
      }
      materialisations++;
      readings.add(readingKey(served.keyReading));
      if (served.difficulty !== item.difficulty) failures.push(`${item.itemId}: difficulty moved`);
      if (served.content.options.length !== OPTION_COUNT)
        failures.push(`${item.itemId}: option count moved`);
      if (served.correctKey !== item.answer.correctKey)
        failures.push(`${item.itemId}: key slot moved`);
      const keyOption = served.content.options.find((o) => o.key === served.correctKey);
      const shown =
        item.content.direction === 'sentence_to_scene'
          ? readingKey({ predicate: keyOption.scene.predicate, assignment: keyOption.scene.roles })
          : readingKey(parse(keyOption.sentence, grammar));
      if (shown !== readingKey(served.keyReading))
        failures.push(`${item.itemId}: the key option is not the sentence's reading`);
    }
    distinctKeyReadings.set(item.itemId, readings.size);
  }
  const meanReadings =
    [...distinctKeyReadings.values()].reduce((a, b) => a + b, 0) / distinctKeyReadings.size;
  return { grammars: grammars.length, materialisations, failures, meanReadings };
}

/**
 * The exact family a client is uncertain over: one fixed lexicon crossed with
 * EVERY role system — all 6 particle-role assignments by all 6 base orders.
 *
 * Enumerated rather than sampled, and the difference is not pedantry. An earlier
 * version of the audit below drew eight grammars at random and reported the
 * English order at 40.3%, which read as a fifteen-point leak. It was not one: with
 * eight draws from six base orders the sample is lumpy, and the strategy matching
 * the modal drawn order takes every positionally-marked item in those sessions.
 * Sweeping the family exactly removes the sampling variance from a number whose
 * whole purpose is to be compared against a floor.
 */
function roleSystemFamily(seed = 'attack|lexicon') {
  const base = drawGrammar(seed);
  const out = [];
  for (const particleRoles of permutations(ROLES)) {
    for (const baseRoleOrder of permutations(ROLES)) {
      out.push({
        ...base,
        grammarId: `${base.grammarId}|p${particleRoles.join('')}|b${baseRoleOrder.join('')}`,
        particleRoles,
        baseRoleOrder,
      });
    }
  }
  return out;
}

/**
 * THE ORDER-STRATEGY AUDIT, which is the attack that actually matters here.
 *
 * A client — or a child on trial 1 — assumes a fixed mapping from thematic role to
 * surface position. "The first noun is the agent" is the English one. Every such
 * mapping is enumerated and scored over the bank, MARGINALISED OVER THE ROLE
 * SYSTEM, because a client without the session grammar is exactly in that
 * position and the role system is redrawn per session.
 *
 * Where no option matches the assumed reading the strategy guesses uniformly,
 * which is what an honest attacker does rather than scoring zero.
 *
 * WHAT THIS DOES NOT CLAIM. Within ONE session the role system is fixed, so a
 * client that has recovered the base order takes every positionally-marked item
 * in that session. That is not a leak this design can close and it is not one it
 * should: recovering the base order IS the construct. The per-session threat is
 * the one PR #51 put to the owner and §7 of the redesign spec records as still
 * open — per-session keying converts a permanent compromise into a
 * non-transferable one, and nothing that keeps the block learnable does more.
 */
export function auditOrderStrategies(items) {
  const grammars = roleSystemFamily();

  const strategies = [];
  for (const argCount of [2, 3]) {
    for (const roleOrder of permutations(ROLES)) {
      strategies.push({ argCount, roleOrder: roleOrder.slice(0, argCount) });
    }
  }

  const scores = new Map();
  for (const item of items) {
    const argCount = item.content.argCount;
    for (const grammar of grammars) {
      const served = materialise(item, grammar);
      if (served === null) continue;
      const forward = item.content.direction === 'sentence_to_scene';
      const surface = forward
        ? served.content.sentence
        : served.content.options.find((o) => o.key === served.correctKey).sentence;
      const verbForm = grammar.verbs[served.keyReading.predicate];
      const entityOf = {};
      for (const [entity, form] of Object.entries(grammar.nouns)) entityOf[form] = entity;
      const surfaceEntities = surface
        .split(' ')
        .filter((token) => token !== verbForm)
        .map((token) => entityOf[token.split('-').find((part) => part.length === 3)]);

      const optionReadings = served.content.options.map((option) => ({
        key: option.key,
        reading: forward
          ? { predicate: option.scene.predicate, assignment: option.scene.roles }
          : parse(option.sentence, grammar),
      }));

      for (const strategy of strategies) {
        if (strategy.argCount !== argCount) continue;
        const assignment = {};
        strategy.roleOrder.forEach((role, i) => {
          if (surfaceEntities[i] !== undefined) assignment[role] = surfaceEntities[i];
        });
        const guess = readingKey({ predicate: served.keyReading.predicate, assignment });
        const matches = optionReadings.filter(
          (o) => o.reading !== null && readingKey(o.reading) === guess,
        );
        const gain =
          matches.length === 0
            ? 1 / OPTION_COUNT
            : matches.filter((m) => m.key === served.correctKey).length / matches.length;
        // Pooled, per marking, and per role-only count. The last is the one that carries the
        // argument: the derived bound is a function of `roleOnly`, so a slice that sits on its own
        // bound proves the excess is the intrinsic multiple-choice asymmetry rather than a grammar
        // leak, and a slice ABOVE its bound is a real defect.
        const roleOnly = item.provenance.levers.roleOnlyDistractors;
        for (const id of [
          `${strategy.argCount}:${strategy.roleOrder.join('>')}`,
          `${strategy.argCount}:${strategy.roleOrder.join('>')} (${item.content.marking})`,
          `roleOnly=${roleOnly} args=${strategy.argCount}`,
        ]) {
          const row = scores.get(id) ?? {
            hits: 0,
            n: 0,
            bound: orderStrategyBound(strategy.argCount, roleOnly),
          };
          row.n++;
          row.hits += gain;
          scores.set(id, row);
        }
      }
    }
  }
  return [...scores]
    .map(([id, row]) => ({ id, accuracy: row.hits / row.n, n: row.n, bound: row.bound }))
    .sort((a, b) => b.accuracy - a.accuracy);
}

/* ------------------------------------------------------------------ *
 * CLI entrypoint
 * ------------------------------------------------------------------ */
function isMain() {
  return process.argv[1] && resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url));
}

/**
 * Where each arm's templates live. NEITHER is inside `banks/`, because a template
 * has no `content.options` and is therefore not a servable item — see the header.
 * `templates/` is the measurement arm and `control-templates/` the scrambled
 * control, and no application code names either.
 */
export const BANK_PATHS = {
  consistent: '../templates/VER-ROLES-01.jsonl',
  perTrial: '../control-templates/VER-ROLES-01.perTrial.jsonl',
};

if (isMain()) {
  const perRung = Number(process.env.PER_RUNG || 12);
  const modes = ['consistent', 'perTrial'];
  const banks = {};

  for (const mode of modes) {
    const items = buildBank({ systemPersistence: mode, perRung });
    banks[mode] = items;
    const outPath = resolve(__dirname, BANK_PATHS[mode]);
    mkdirSync(dirname(outPath), { recursive: true });
    writeFileSync(outPath, serializeBank(items));
    console.log(`VER-ROLES-01 (${mode}): ${items.length} templates -> ${outPath}`);
  }

  const reference = banks.consistent;
  const grammar = drawGrammar('VER-ROLES-01|v1');

  console.log(
    `\ninventory: ${CVC_FORMS.length} admissible CVC forms and ${CV_FORMS.length} CV particle forms; ` +
      `one grammar spends ${ENTITIES.length + PREDICATES.length} CVC and ${ROLES.length} CV`,
  );
  console.log(
    `sample grammar ${grammar.grammarId}: nouns ${Object.values(grammar.nouns).join('/')}; ` +
      `verbs ${Object.values(grammar.verbs).join('/')}; particles ${grammar.particleForms.join('/')} ` +
      `marking ${grammar.particleRoles.join('/')}; base order ${grammar.baseRoleOrder.join('>')}; ` +
      `particle ${grammar.particlePlacement}; verb ${grammar.verbSlot}`,
  );
  for (const marking of MARKING) {
    const sample = reference.find(
      (it) => it.content.argCount === 3 && it.content.marking === marking,
    );
    if (!sample) continue;
    const served = materialise(sample, grammar);
    console.log(
      `sample (3 args, ${marking}): "${spellPlan(sample.answer.plan, grammar)}" means ` +
        rolesOf(served.keyReading)
          .map((r) => `${r}=${served.keyReading.assignment[r]}`)
          .join(', ') +
        ` [${served.keyReading.predicate}]`,
    );
  }

  const rungCounts = new Map();
  for (const it of reference) {
    const rung = round2(Math.round(it.difficulty * 2) / 2);
    rungCounts.set(rung, (rungCounts.get(rung) ?? 0) + 1);
  }
  const short = [...rungCounts].filter(([, n]) => n < 5).map(([r]) => r);
  const diffs = reference.map((it) => it.difficulty);
  console.log(
    `\ndifficulty span: ${round2(Math.min(...diffs))} .. ${round2(Math.max(...diffs))} ` +
      `over ${rungCounts.size} distinct 0.5-point rungs`,
  );
  console.log(short.length ? `SHORT RUNGS (<5): ${short.join(',')}` : 'all 0.5-point rungs >=5 OK');

  const keyCounts = {};
  for (const it of reference) keyCounts[it.answer.correctKey] = (keyCounts[it.answer.correctKey] ?? 0) + 1;
  console.log(
    `key positions (all items are ${OPTION_COUNT}-option, so one stratum): ` +
      Object.entries(keyCounts)
        .sort()
        .map(([k, n]) => `${k}:${n} (${((100 * n) / reference.length).toFixed(1)}%)`)
        .join('  '),
  );
  const tally = (field, read) => {
    const out = {};
    for (const it of reference) out[read(it)] = (out[read(it)] ?? 0) + 1;
    return `${field}: ${Object.entries(out).sort().map(([k, n]) => `${k}:${n}`).join('  ')}`;
  };
  console.log(tally('directions', (it) => it.content.direction));
  console.log(tally('marking', (it) => it.content.marking));
  console.log(tally('bands', (it) => it.ageBands.join('+')));

  const invariance = auditRedrawInvariance(reference);
  console.log(
    `\nre-draw invariance: ${invariance.materialisations} materialisations over ` +
      `${invariance.grammars} grammars — ` +
      (invariance.failures.length === 0
        ? 'difficulty, option count and key slot NEVER move, every template materialises, and the ' +
          `key option always IS the sentence's reading (mean ${invariance.meanReadings.toFixed(1)} ` +
          'distinct key readings per template across the grammars, so the MEANING moves freely ' +
          'while the difficulty does not)'
        : `${invariance.failures.length} FAILURES: ${invariance.failures.slice(0, 3).join('; ')}`),
  );

  const sampleSize = Number(process.env.LEAK_SAMPLE || 60);
  const strided = reference.filter((_, i) => i % Math.ceil(reference.length / sampleSize) === 0);
  let tier1Bad = 0;
  const tier2Counts = new Map();
  let orderSemantic = 0;
  for (const it of strided) {
    if ((tier1Unreachable(it, grammar) ?? ['?']).length > 0) tier1Bad++;
    const survivors = tier2Survivors(it, grammar);
    const n = survivors === null ? 0 : survivors.size;
    tier2Counts.set(n, (tier2Counts.get(n) ?? 0) + 1);
    if (orderIsSemantic(it, grammar)) orderSemantic++;
  }
  console.log(
    `anti-leak tier 1 (nothing known): ${strided.length - tier1Bad}/${strided.length} templates ` +
      `have ALL ${OPTION_COUNT} options relabelling-reachable, so elimination sits on the ` +
      `${(100 / OPTION_COUNT).toFixed(1)}% floor`,
  );
  console.log(
    `anti-leak tier 2 (vocabulary known, role system not): survivor counts ` +
      [...tier2Counts].sort((a, b) => a[0] - b[0]).map(([n, c]) => `${n}:${c}`).join(' ') +
      ` — minimum ${Math.min(...tier2Counts.keys())}, so a vocabulary-only client tops out at ` +
      `${(100 / Math.min(...tier2Counts.keys())).toFixed(1)}%`,
  );
  console.log(
    `order is semantic: ${orderSemantic}/${strided.length} templates admit a rearrangement of ` +
      'their OWN word forms that denotes a different scene',
  );

  const attacks = auditOrderStrategies(strided);
  const pooled = attacks.filter((a) => !a.id.includes('('));
  console.log(
    `best order strategies, marginalised over all 36 role systems (floor ` +
      `${(100 / OPTION_COUNT).toFixed(1)}%): ` +
      pooled.slice(0, 3).map((a) => `${a.id} ${(100 * a.accuracy).toFixed(1)}%`).join('  ') +
      `  — English reading ("first noun is the agent"): ` +
      `${(100 * pooled.find((a) => a.id === '3:agent>patient>goal').accuracy).toFixed(1)}% at three ` +
      `arguments, ${(100 * pooled.find((a) => a.id === '2:agent>patient').accuracy).toFixed(1)}% at two`,
  );
  const byRoleOnly = attacks.filter((a) => a.id.includes('roleOnly'));
  console.log(
    `  by role-only count, against the derived bound: ` +
      byRoleOnly
        .sort((x, y) => x.id.localeCompare(y.id))
        .map((a) => `${a.id} ${(100 * a.accuracy).toFixed(1)}% (bound ${(100 * a.bound).toFixed(1)}%)`)
        .join('  '),
  );
  const overBound = byRoleOnly.filter((a) => a.accuracy > a.bound + 0.005);
  console.log(
    `  ${overBound.length === 0 ? 'no slice exceeds its derived bound, so the whole excess is the intrinsic multiple-choice asymmetry and nothing about the grammar leaks' : `OVER BOUND: ${overBound.map((a) => a.id).join(', ')}`}`,
  );

  const a = banks.consistent;
  const b = banks.perTrial;
  const strip = (it) => {
    const clone = JSON.parse(JSON.stringify(it));
    delete clone.itemId;
    delete clone.answer.grammarRef;
    delete clone.provenance.levers.systemPersistence;
    return JSON.stringify(clone);
  };
  const mismatches = [];
  if (a.length !== b.length) mismatches.push(`item counts ${a.length} vs ${b.length}`);
  for (let i = 0; i < Math.min(a.length, b.length); i++) {
    if (strip(a[i]) !== strip(b[i])) mismatches.push(`item ${i}: templates differ beyond the arm`);
  }
  console.log(
    `\nequating: ${mismatches.length === 0 ? 'the two banks are IDENTICAL except for the grammar reference and the arm label' : `MISMATCH — ${mismatches.slice(0, 3).join('; ')}`}`,
  );
  console.log(
    `persistence: measurement arm names ${new Set(a.map((it) => it.answer.grammarRef)).size} grammar(s); ` +
      `control arm names ${new Set(b.map((it) => it.answer.grammarRef)).size} (one per item)`,
  );

  console.log(
    '\nNOT GATED, AND GATE A HAS NOT RUN. Gate B needs ~128 real children (§4.1.3) and no synthetic\n' +
      'run substitutes. Both arms live outside banks/, so neither is served and neither has a\n' +
      'renderer. Whether this type loads on verbal rather than fluid reasoning is untested.',
  );
}
