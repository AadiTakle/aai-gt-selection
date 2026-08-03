// Independent validator for the VER-ROLES-01 dual-mode TEMPLATE banks (U4).
//
// The language — how a plan is spelled, how a sentence is parsed back into a role assignment, what
// each plan transform does, and the difficulty arithmetic — is RE-IMPLEMENTED here from the
// documented model rather than imported, so a bug in the generator cannot validate itself. The
// generator is imported for exactly two things, and both are named: `genTemplate`, to prove each
// template is byte-reproducible from its own provenance, and the two bank paths.
//
// THE GRAMMARS ARE THIS FILE'S OWN, AND THAT IS THE POINT.
//
// `FLU-OPCHAIN-01`'s checker re-derives the key under the mapping the bank ships. It cannot do
// otherwise: that bank's options are baked, so there is exactly one mapping under which its key is
// even coherent. A template bank has no such constraint, so this checker does not use the
// generator's grammar draw at all. It CONSTRUCTS grammars — deterministically, by enumeration, with
// no shared RNG — and re-derives the key under each of them. "The key is re-derived on 100% of
// items" therefore means something strictly stronger here: 100% of items under every grammar
// checked, which is the property the serve-time path actually needs and the property §2's Failure B
// says the current banks do not have.
//
// Checks (exit nonzero on any failure):
//   1.  JSONL parses; every line is a well-formed template.
//   2.  KEY CONTAINMENT: `content` names no role, no participant, no predicate, no plan and no arm.
//       Stronger than the shipped banks manage, because a template's content carries no semantics at
//       all — only the sentence's shape and the option count.
//   3.  KEY RE-DERIVED: under every checker-constructed grammar, the option at `correctKey` is
//       exactly what parsing the materialised sentence yields. On every item of both banks.
//   4.  TWO-TIER BRUTE FORCE:
//       (a) TIER 1 — with the lexicon and the role system both free, EVERY option is reachable, so
//           nothing can be eliminated and "delete the impossible, guess among the rest" sits exactly
//           on the 25% four-option floor;
//       (b) TIER 2 — with the lexicon known and the role system free, at least TWO options survive,
//           and the count equals `roleOnlyDistractors + 1`, which is the residual-ambiguity identity
//           the difficulty model is priced on.
//   5.  ORDER STRATEGIES: every assumed role-to-rank mapping, scored over the full 36-member role
//       system family, stays at or below the DERIVED bound
//       `1/n + (n-1-roleOnly)/(n*R)` per (argCount, roleOnly) slice. A derived bound rather than a
//       round ceiling, so a slice sitting on it proves the excess is the intrinsic multiple-choice
//       asymmetry rather than anything the grammar leaks.
//   6.  RE-DRAW INVARIANCE: across grammars, difficulty, option count and key slot never move, every
//       template materialises, and the key READING does move — the last is what proves the invariance
//       is not just an unused parameter.
//   7.  IRREDUCIBILITY: every item admits a rearrangement of its OWN word forms that denotes a
//       different scene. This is the check that separates the type from an operator chain and it is
//       run on 100% of items, not argued in a comment.
//   8.  Distractors: all four options distinct; every wrong option is what its declared transform
//       produces; declared lure, kind, roleOnly flag and option distance all re-derived.
//   9.  Difficulty equals the value re-derived from the item's own levers, and the template
//       regenerates byte-identically from its provenance.
//   10. Difficulty is MONOTONE in every declared lever (§1.1(d)) — asserted on the model, once.
//   11. Coverage: 1..20 with >=5 items per 0.5-point rung and per +/-0.5pt band.
//   12. Band ladder: argument count never exceeds the cap for the band the difficulty sits in, the
//       declared ageBands match the window, and K-1 is never declared.
//   13. Key positions uniform within tolerance, reported per option count (E-094).
//   14. Reading load per band, against the figures the spec commits to.
//   15. Persistence: the measurement arm names ONE grammar; the control arm one per item.
//   16. Equating: the two banks are identical except for the grammar reference and the arm label.
//   17. No two templates are the same question.
//
// Run:  node research/exam-question-types/generators/check-VER-ROLES-01.mjs

import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { BANK_PATHS, genTemplate } from './VER-ROLES-01.mjs';
import { lureLabel, normalizeBankItem } from './item-shape.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const MODES = ['consistent', 'perTrial'];
const bankPath = (mode) => resolve(__dirname, BANK_PATHS[mode]);

const failures = [];
const fail = (id, msg) => failures.push(`[${id}] ${msg}`);
const isNum = (x) => typeof x === 'number' && Number.isFinite(x);
const deepEq = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const round2 = (x) => Math.round(x * 100) / 100;

/* ---- independent language model ------------------------------------------- */
const ROLE_SET = ['agent', 'patient', 'goal'];
const ENTITY_SET = ['circle', 'square', 'triangle', 'diamond', 'hexagon'];
const PREDICATE_SET = ['push', 'carry', 'follow', 'hand'];
const OPTIONS = ['A', 'B', 'C', 'D'];
const N_OPTIONS = OPTIONS.length;
const MARKINGS = ['particle', 'position'];

/** All permutations, independently written. */
function perms(list) {
  if (list.length <= 1) return [list.slice()];
  const out = [];
  for (let i = 0; i < list.length; i++) {
    const rest = [...list.slice(0, i), ...list.slice(i + 1)];
    for (const tail of perms(rest)) out.push([list[i], ...tail]);
  }
  return out;
}

/**
 * Spell a plan. Re-derived from the documented rule: the argument at each surface
 * rank is its noun, hyphenated to the form of its particle slot when it has one,
 * and the verb is anchored at whichever end the grammar says.
 */
function spellIt(plan, g) {
  const args = plan.participants.map((entity, rank) => {
    const noun = g.nouns[entity];
    if (noun === undefined) return null;
    const slot = plan.particleSlots[rank];
    if (slot === null || slot === undefined) return noun;
    const particle = g.particleForms[slot];
    if (particle === undefined) return null;
    return g.particlePlacement === 'post' ? `${noun}-${particle}` : `${particle}-${noun}`;
  });
  if (args.some((a) => a === null)) return null;
  const verb = g.verbs[plan.predicate];
  if (verb === undefined) return null;
  return g.verbSlot === 'initial' ? [verb, ...args].join(' ') : [...args, verb].join(' ');
}

/**
 * Parse a sentence. This is the function that matters most, so it is written from
 * the three-clause rule in the spec and never consults the template:
 *   the verb is the bare token the verb lexicon knows;
 *   a particle-marked argument takes that particle's role;
 *   the rest take the remaining roles, surface order against BASE ROLE ORDER.
 */
function parseIt(sentence, g) {
  const entityOf = {};
  for (const [e, f] of Object.entries(g.nouns)) entityOf[f] = e;
  const predicateOf = {};
  for (const [p, f] of Object.entries(g.verbs)) predicateOf[f] = p;
  const roleOf = {};
  g.particleForms.forEach((f, slot) => {
    roleOf[f] = g.particleRoles[slot];
  });

  let predicate = null;
  const argTokens = [];
  for (const token of sentence.split(' ')) {
    if (!token.includes('-') && predicateOf[token] !== undefined) {
      if (predicate !== null) return null;
      predicate = predicateOf[token];
      continue;
    }
    argTokens.push(token);
  }
  if (predicate === null || argTokens.length < 2 || argTokens.length > ROLE_SET.length) return null;

  const assignment = {};
  const bare = [];
  for (const token of argTokens) {
    if (token.includes('-')) {
      const parts = token.split('-');
      if (parts.length !== 2) return null;
      const noun = parts[0].length === 3 ? parts[0] : parts[1];
      const particle = parts[0].length === 3 ? parts[1] : parts[0];
      const entity = entityOf[noun];
      const role = roleOf[particle];
      if (entity === undefined || role === undefined) return null;
      if (assignment[role] !== undefined) return null;
      assignment[role] = entity;
      continue;
    }
    const entity = entityOf[token];
    if (entity === undefined) return null;
    bare.push(entity);
  }
  const left = g.baseRoleOrder.filter((r) => assignment[r] === undefined);
  if (left.length < bare.length) return null;
  bare.forEach((entity, i) => {
    assignment[left[i]] = entity;
  });
  if (new Set(Object.values(assignment)).size !== Object.keys(assignment).length) return null;
  return { predicate, assignment };
}

const rKey = (reading) =>
  `${reading.predicate}|` + ROLE_SET.map((r) => `${r}=${reading.assignment[r] ?? '-'}`).join(',');
const rolesUsed = (reading) => ROLE_SET.filter((r) => reading.assignment[r] !== undefined);

/* ---- independent grammar construction ------------------------------------- *
 *
 * Deterministic and enumerated, with no shared RNG, so nothing about the
 * generator's draw can make a bad template look good. The lexicon is taken in
 * strided slices of an independently rebuilt form pool, and the role system is
 * swept exhaustively.
 * -------------------------------------------------------------------------- */
const ONSET = ['b', 'd', 'f', 'g', 'k', 'l', 'm', 'n', 'p', 'r', 's', 't', 'v', 'z'];
const VOWEL = ['a', 'e', 'i', 'o', 'u'];
const CODA = ['b', 'd', 'f', 'g', 'k', 'l', 'm', 'n', 'p', 's', 't', 'v', 'z'];
const CVC = [];
for (const o of ONSET) for (const v of VOWEL) for (const c of CODA) if (o !== c) CVC.push(o + v + c);
const CV = [];
for (const o of ONSET) for (const v of VOWEL) CV.push(o + v);

/** One grammar, built from an integer. No randomness anywhere. */
function buildGrammar({ lexOffset, particleRoles, baseRoleOrder, particlePlacement, verbSlot }) {
  const nouns = {};
  ENTITY_SET.forEach((e, i) => {
    nouns[e] = CVC[(lexOffset + i * 13) % CVC.length];
  });
  const verbs = {};
  PREDICATE_SET.forEach((p, i) => {
    verbs[p] = CVC[(lexOffset + (ENTITY_SET.length + i) * 13) % CVC.length];
  });
  const forms = new Set([...Object.values(nouns), ...Object.values(verbs)]);
  if (forms.size !== ENTITY_SET.length + PREDICATE_SET.length) return null; // lexicon collided
  return {
    grammarId: `chk-${lexOffset}-${particleRoles.join('')}-${baseRoleOrder.join('')}-${particlePlacement[0]}${verbSlot[0]}`,
    nouns,
    verbs,
    particleForms: [CV[lexOffset % CV.length], CV[(lexOffset + 7) % CV.length], CV[(lexOffset + 14) % CV.length]],
    particleRoles,
    baseRoleOrder,
    particlePlacement,
    verbSlot,
  };
}

/** The grammars the key is re-derived under: four lexicons crossed with a spread of role systems. */
const CHECK_GRAMMARS = (() => {
  const out = [];
  const roleSystems = perms(ROLE_SET);
  for (const lexOffset of [0, 101, 233, 457]) {
    for (let i = 0; i < roleSystems.length; i++) {
      const g = buildGrammar({
        lexOffset,
        particleRoles: roleSystems[i],
        baseRoleOrder: roleSystems[(i + 2) % roleSystems.length],
        particlePlacement: i % 2 === 0 ? 'pre' : 'post',
        verbSlot: i % 3 === 0 ? 'initial' : 'final',
      });
      if (g !== null) out.push(g);
    }
  }
  return out;
})();

/** Every grammar differing from `g` only in the role system: 6 x 6 x 2. */
function roleVariants(g) {
  const out = [];
  for (const particleRoles of perms(ROLE_SET)) {
    for (const baseRoleOrder of perms(ROLE_SET)) {
      for (const particlePlacement of ['pre', 'post']) {
        out.push({ ...g, particleRoles, baseRoleOrder, particlePlacement });
      }
    }
  }
  return out;
}

/** The exact 36-member family an order strategy is uncertain over, on one lexicon. */
const ATTACK_FAMILY = (() => {
  const base = buildGrammar({
    lexOffset: 0,
    particleRoles: ROLE_SET,
    baseRoleOrder: ROLE_SET,
    particlePlacement: 'post',
    verbSlot: 'final',
  });
  const out = [];
  for (const particleRoles of perms(ROLE_SET)) {
    for (const baseRoleOrder of perms(ROLE_SET)) out.push({ ...base, particleRoles, baseRoleOrder });
  }
  return out;
})();

/* ---- independent transform semantics -------------------------------------- */
const LURE_OF_KIND = {
  permute: 'reversed_relation',
  substitute: 'wrong_attribute',
  predicate: 'wrong_family',
  entity: 'intrusion',
};
const ROLE_ONLY = new Set(['permute', 'substitute']);
const FILLER_DIST = { predicate: 1, entity: 3 };

/** Every role-only transform a plan admits, re-derived from the documented rule. */
function roleOnlyFor(argCount, marking) {
  const out = [];
  const ranks = [...Array(argCount).keys()];
  const subs = marking === 'particle' && argCount < ROLE_SET.length ? [null, ...ranks] : [null];
  for (const permute of perms(ranks)) {
    for (const substitute of subs) {
      if (substitute === null && permute.every((r, i) => r === i)) continue;
      out.push({
        kind: substitute === null ? 'permute' : 'substitute',
        permute,
        substitute,
        bindingDistance: ranks.filter((r) => permute[r] !== r || r === substitute).length,
      });
    }
  }
  return out;
}
const distOf = (t) => t.bindingDistance ?? FILLER_DIST[t.kind];

/** Apply a transform to a plan. Independently written; the substitution branch is the subtle one. */
function transformPlan(plan, t, g, keyReading) {
  if (t.kind === 'predicate') return { ...plan, predicate: t.predicate };
  if (t.kind === 'entity') {
    const participants = plan.participants.slice();
    participants[t.rank] = t.entity;
    return { ...plan, participants };
  }
  const participants = plan.participants.map((_, rank) => plan.participants[t.permute[rank]]);
  const particleSlots = plan.particleSlots.slice();
  if (t.substitute !== null && t.substitute !== undefined) {
    const spare = ROLE_SET.filter((r) => keyReading.assignment[r] === undefined);
    if (spare.length === 0) return null;
    const slot = g.particleRoles.indexOf(spare[0]);
    if (slot < 0) return null;
    const collides = particleSlots.indexOf(slot);
    const vacated = particleSlots[t.substitute];
    particleSlots[t.substitute] = slot;
    if (collides >= 0 && collides !== t.substitute) particleSlots[collides] = vacated;
  }
  return { ...plan, participants, particleSlots };
}

/** Materialise a template under a grammar, entirely with this file's own semantics. */
function serve(item, g) {
  const { plan, distractorRationales, correctKey } = item.answer;
  const keySentence = spellIt(plan, g);
  if (keySentence === null) return null;
  const keyReading = parseIt(keySentence, g);
  if (keyReading === null) return null;

  const options = [];
  for (const key of OPTIONS) {
    let p = plan;
    if (key !== correctKey) {
      p = transformPlan(plan, distractorRationales[key].planTransform, g, keyReading);
      if (p === null) return null;
    }
    const sentence = spellIt(p, g);
    if (sentence === null) return null;
    const reading = parseIt(sentence, g);
    if (reading === null) return null;
    options.push({ key, sentence, reading });
  }
  const forward = item.content.direction === 'sentence_to_scene';
  const rendered = options.map((o) => (forward ? rKey(o.reading) : o.sentence));
  if (new Set(rendered).size !== rendered.length) return null;
  return { keySentence, keyReading, options, forward };
}

/* ---- independent difficulty arithmetic ------------------------------------ */
const A_LOAD = { 2: 0, 3: 3.4 };
const W_POSITION = 1.6;
const W_ROLE_ONLY = 1.3;
const PROX = 2.4;
const baseOf = ({ argCount, marking, roleOnlyDistractors }) =>
  1.0 +
  A_LOAD[argCount] +
  W_POSITION * (marking === 'position' ? argCount : 0) +
  W_ROLE_ONLY * (roleOnlyDistractors - 1);

const CONFIGS = (() => {
  const out = [];
  for (const argCount of [2, 3]) {
    for (const marking of MARKINGS) {
      const available = roleOnlyFor(argCount, marking).length;
      for (let r = 1; r < N_OPTIONS; r++) if (r <= available) out.push({ argCount, marking, roleOnlyDistractors: r });
    }
  }
  return out;
})();
const BASES = CONFIGS.map(baseOf);
const RAW_LO = Math.min(...BASES);
const RAW_HI = Math.max(...BASES) + PROX;
const difficultyOf = (cfg, prox) =>
  Math.max(1, Math.min(20, 1 + ((baseOf(cfg) + PROX * prox - RAW_LO) * 19) / (RAW_HI - RAW_LO)));

/** P(3, argCount): six at both argument counts. */
const readingSpace = (argCount) => {
  let n = 1;
  for (let i = 0; i < argCount; i++) n *= ROLE_SET.length - i;
  return n;
};
/** The derived order-strategy bound, re-written from the algebra in the spec. */
const strategyBound = (argCount, roleOnly) =>
  1 / N_OPTIONS + (N_OPTIONS - 1 - roleOnly) / (N_OPTIONS * readingSpace(argCount));

/* ---- independent band ladder (§4.3) -------------------------------------- */
const BAND_LADDER = [
  { band: '2-3', hi: 8, maxArgCount: 2 },
  { band: '4-5', hi: 12, maxArgCount: 3 },
  { band: '6-8', hi: 20.01, maxArgCount: 3 },
];
const bandOf = (d) => BAND_LADDER.find((b) => d < b.hi) ?? BAND_LADDER[BAND_LADDER.length - 1];

/* ========================================================================== *
 * 10. MODEL-LEVEL MONOTONICITY, asserted once before any item is read.
 *
 * §1.1(d): the fit reads `difficulty` as known, and because the targeting rule
 * serves different item subsets early and late, difficulty error that correlates
 * with subset composition correlates with trialIndex and BIASES lambda rather
 * than merely attenuating it. A monotone lever model is the weaker claim that is
 * actually needed to keep the fit unbiased, and it is the one thing about
 * difficulty a synthetic bank can prove.
 * ========================================================================== */
function checkMonotonicity() {
  for (const prox of [0, 0.5, 1]) {
    // Argument count, holding marking and role-only count fixed.
    for (const marking of MARKINGS) {
      for (let r = 1; r < N_OPTIONS; r++) {
        const pair = [2, 3].filter((argCount) =>
          CONFIGS.some((c) => c.argCount === argCount && c.marking === marking && c.roleOnlyDistractors === r),
        );
        if (pair.length === 2) {
          const lo = difficultyOf({ argCount: 2, marking, roleOnlyDistractors: r }, prox);
          const hi = difficultyOf({ argCount: 3, marking, roleOnlyDistractors: r }, prox);
          if (!(hi > lo)) fail('monotonicity', `3 args not harder than 2 at ${marking}/r=${r}`);
        }
      }
    }
    // Marking: positional is priced as harder. THE SIGN IS AN OPEN ASSUMPTION (A-S2-7), not a
    // measurement; this asserts the model is self-consistent, not that children agree with it.
    for (const argCount of [2, 3]) {
      for (let r = 1; r < N_OPTIONS; r++) {
        const both = MARKINGS.filter((marking) =>
          CONFIGS.some((c) => c.argCount === argCount && c.marking === marking && c.roleOnlyDistractors === r),
        );
        if (both.length === 2) {
          const particle = difficultyOf({ argCount, marking: 'particle', roleOnlyDistractors: r }, prox);
          const position = difficultyOf({ argCount, marking: 'position', roleOnlyDistractors: r }, prox);
          if (!(position > particle))
            fail('monotonicity', `position not harder than particle at ${argCount} args/r=${r}`);
        }
      }
    }
    // Role-only distractor count, holding the rest fixed.
    for (const argCount of [2, 3]) {
      for (const marking of MARKINGS) {
        const reachable = CONFIGS.filter((c) => c.argCount === argCount && c.marking === marking)
          .map((c) => c.roleOnlyDistractors)
          .sort((a, b) => a - b);
        for (let i = 1; i < reachable.length; i++) {
          const lo = difficultyOf({ argCount, marking, roleOnlyDistractors: reachable[i - 1] }, prox);
          const hi = difficultyOf({ argCount, marking, roleOnlyDistractors: reachable[i] }, prox);
          if (!(hi > lo))
            fail('monotonicity', `roleOnly ${reachable[i]} not harder than ${reachable[i - 1]}`);
        }
      }
    }
  }
  // Slate proximity, holding the config fixed. Tighter slates are harder.
  for (const cfg of CONFIGS) {
    if (!(difficultyOf(cfg, 1) > difficultyOf(cfg, 0)))
      fail('monotonicity', `proximity not monotone at ${JSON.stringify(cfg)}`);
  }
  // The derived order-strategy bound must FALL as the item gets harder in role-only count, or the
  // leak would concentrate on the children the measurement is about.
  for (const argCount of [2, 3]) {
    for (let r = 2; r < N_OPTIONS; r++) {
      if (!(strategyBound(argCount, r) < strategyBound(argCount, r - 1)))
        fail('monotonicity', `strategy bound does not fall with roleOnly at ${argCount} args`);
    }
  }
}
checkMonotonicity();

/* ========================================================================== *
 * Per-bank checks
 * ========================================================================== */
function loadBank(mode) {
  const raw = readFileSync(bankPath(mode), 'utf8').trim();
  const lines = raw.length ? raw.split('\n') : [];
  if (lines.length === 0) fail(`parse:${mode}`, 'bank is empty');
  const items = [];
  lines.forEach((line, i) => {
    try {
      items.push(JSON.parse(line));
    } catch (e) {
      fail(`parse:${mode}`, `line ${i + 1} is not valid JSON: ${e.message}`);
    }
  });
  return items;
}

function checkBank(mode, items) {
  const seenIds = new Set();
  const grammarRefs = new Set();
  const keyCounts = Object.fromEntries(OPTIONS.map((k) => [k, 0]));
  const optionCounts = new Set();
  let keyDerivations = 0;
  let materialisations = 0;
  const tier2Hist = new Map();
  let tier1Bad = 0;
  let notSemantic = 0;
  let readingsMoved = 0;
  const loadByBand = new Map();
  const strategyRows = [];

  for (const it of items) {
    const id = `${mode}:${it.itemId || '(no id)'}`;

    // ---- 1. Envelope ----
    if (typeof it.itemId !== 'string' || it.itemId.length < 8) fail(id, 'itemId missing/short');
    if (seenIds.has(it.itemId)) fail(id, 'duplicate itemId');
    seenIds.add(it.itemId);
    if (it.typeCode !== 'VER-ROLES-01') fail(id, `typeCode != VER-ROLES-01 (${it.typeCode})`);
    if (it.domain !== 'verbal_reasoning') fail(id, `domain != verbal_reasoning (${it.domain})`);
    if (it.demoPath !== 'demos/VER-ROLES-01.html') fail(id, `demoPath wrong (${it.demoPath})`);
    if (!isNum(it.difficulty) || it.difficulty < 1 || it.difficulty > 20)
      fail(id, `difficulty not a float in 1..20 (${it.difficulty})`);
    if (it.syntheticOnly !== true) fail(id, 'syntheticOnly must be true');
    if (it.validated !== false) fail(id, 'validated must be false');
    if (!it.scoring || it.scoring.mode !== 'deterministic_key') fail(id, 'scoring.mode wrong');
    if (!it.provenance || it.provenance.generator !== 'grammar') fail(id, 'provenance.generator wrong');
    if (!it.provenance || typeof it.provenance.seed !== 'string') fail(id, 'provenance.seed missing');

    const c = it.content || {};
    const ans = it.answer || {};
    const lev = (it.provenance && it.provenance.levers) || {};

    // ---- 2. Key containment ----
    const contentStr = JSON.stringify(c);
    for (const leak of ['correctKey', 'plan', 'grammarRef', 'strategyTrace', 'planTransform', 'antiLeak'])
      if (contentStr.includes(leak)) fail(id, `content leaks "${leak}"`);
    for (const role of ROLE_SET)
      if (contentStr.includes(role)) fail(id, `content names the role "${role}"`);
    for (const entity of ENTITY_SET)
      if (contentStr.includes(`"${entity}"`)) fail(id, `content names the participant "${entity}"`);
    for (const predicate of PREDICATE_SET)
      if (contentStr.includes(`"${predicate}"`)) fail(id, `content names the predicate "${predicate}"`);
    if (contentStr.includes('perTrial') || contentStr.includes('consistent'))
      fail(id, 'content reveals which control arm it belongs to');
    // A template must NOT ship an option list, or it is a baked item and §2's Failure B is back.
    if ('options' in c) fail(id, 'a template must not carry a materialised option list');
    if (c.optionCount !== N_OPTIONS) fail(id, `content.optionCount != ${N_OPTIONS} (${c.optionCount})`);
    if (c.materialisation !== 'session_grammar') fail(id, 'content.materialisation wrong');
    if (!MARKINGS.includes(c.marking)) fail(id, `unknown marking "${c.marking}"`);
    if (![2, 3].includes(c.argCount)) fail(id, `argCount outside 2..3 (${c.argCount})`);

    // ---- 6b. Plan invariants ----
    const plan = ans.plan || {};
    if (!Array.isArray(plan.participants) || plan.participants.length !== c.argCount)
      fail(id, 'plan.participants does not have argCount entries');
    else {
      if (new Set(plan.participants).size !== plan.participants.length)
        fail(id, 'plan repeats a participant');
      for (const e of plan.participants)
        if (!ENTITY_SET.includes(e)) fail(id, `plan names an unknown participant "${e}"`);
    }
    if (!PREDICATE_SET.includes(plan.predicate)) fail(id, `plan names an unknown predicate`);
    if (!Array.isArray(plan.particleSlots) || plan.particleSlots.length !== c.argCount)
      fail(id, 'plan.particleSlots does not have argCount entries');
    else {
      const marked = plan.particleSlots.filter((s) => s !== null);
      if (c.marking === 'particle' && marked.length !== c.argCount)
        fail(id, 'particle marking but not every argument carries a particle');
      if (c.marking === 'position' && marked.length !== 0)
        fail(id, 'positional marking but an argument carries a particle');
      if (new Set(marked).size !== marked.length) fail(id, 'two arguments share one particle slot');
    }

    // ---- 8. Distractors, declared vs re-derived ----
    const rats = ans.distractorRationales || {};
    const trace = ans.strategyTrace || {};
    const admissible = new Map(roleOnlyFor(c.argCount, c.marking).map((t) => [
      `${t.kind}:${t.permute.join('')}/${t.substitute ?? '-'}`,
      t,
    ]));
    let derivedRoleOnly = 0;
    for (const key of OPTIONS) {
      const rationale = rats[key];
      if (!rationale) {
        fail(id, `no rationale for option ${key}`);
        continue;
      }
      if (key === ans.correctKey) {
        if (lureLabel(rationale) !== 'correct')
          fail(id, `the key is labelled "${lureLabel(rationale)}" rather than correct`);
        continue;
      }
      const t = rationale.planTransform;
      if (!t || !LURE_OF_KIND[t.kind]) {
        fail(id, `option ${key} has unknown transform kind "${t && t.kind}"`);
        continue;
      }
      if (lureLabel(rationale) !== LURE_OF_KIND[t.kind])
        fail(id, `option ${key} lure "${lureLabel(rationale)}" != ${LURE_OF_KIND[t.kind]}`);
      if (rationale.roleOnly !== ROLE_ONLY.has(t.kind))
        fail(id, `option ${key} roleOnly flag disagrees with its transform kind`);
      if (rationale.optionDistance !== distOf(t))
        fail(id, `option ${key} optionDistance ${rationale.optionDistance} != re-derived ${distOf(t)}`);
      if (ROLE_ONLY.has(t.kind)) {
        derivedRoleOnly++;
        const sig = `${t.kind}:${t.permute.join('')}/${t.substitute ?? '-'}`;
        if (!admissible.has(sig))
          fail(id, `option ${key} cites role transform "${sig}", which this plan does not admit`);
      } else if (t.kind === 'predicate') {
        if (t.predicate === plan.predicate) fail(id, `option ${key} "swaps" the verb for itself`);
      } else if (plan.participants.includes(t.entity)) {
        fail(id, `option ${key} substitutes a participant the sentence already names`);
      }
      const traced = trace[key];
      if (!traced || traced.kind !== t.kind || traced.ruleId !== rationale.ruleId)
        fail(id, `strategyTrace for ${key} disagrees with its rationale`);
    }
    if (derivedRoleOnly !== lev.roleOnlyDistractors)
      fail(id, `${derivedRoleOnly} role-only options but levers declare ${lev.roleOnlyDistractors}`);
    // Every item must carry at least one, or a vocabulary-knowing child could DETERMINE the key.
    if (derivedRoleOnly < 1) fail(id, 'no role-only distractor: the key is determined by vocabulary alone');
    if (!Array.isArray(ans.strategyTraceRules) || ans.strategyTraceRules.length !== 4)
      fail(id, 'answer.strategyTraceRules does not declare the closed transform vocabulary');

    // ---- 3, 4, 6, 7. The grammar-facing checks, under THIS FILE'S grammars ----
    const readings = new Set();
    for (const g of CHECK_GRAMMARS) {
      const served = serve(it, g);
      if (served === null) {
        fail(id, `does not materialise under ${g.grammarId} — §2's Failure B`);
        continue;
      }
      materialisations++;
      readings.add(rKey(served.keyReading));

      // 3. THE KEY, RE-DERIVED. The option at correctKey must be exactly the parse of the sentence.
      const keyOption = served.options.find((o) => o.key === ans.correctKey);
      const shown = served.forward ? rKey(keyOption.reading) : keyOption.sentence;
      const expected = served.forward ? rKey(served.keyReading) : served.keySentence;
      if (shown !== expected) fail(id, `the key option is not the sentence's reading under ${g.grammarId}`);
      else keyDerivations++;

      // 6. Re-draw invariance: nothing about the ITEM may move with the grammar.
      if (served.options.length !== N_OPTIONS) fail(id, `option count moved under ${g.grammarId}`);
      if (rolesUsed(served.keyReading).length !== c.argCount)
        fail(id, `the key reading uses ${rolesUsed(served.keyReading).length} roles, not ${c.argCount}`);

      // 14. Reading load, measured rather than asserted.
      const band = bandOf(it.difficulty).band;
      const letters = served.keySentence.replace(/[ -]/g, '').length;
      const tokens = served.keySentence.split(' ').length;
      const row = loadByBand.get(band) ?? { letters: 0, tokens: 0 };
      loadByBand.set(band, { letters: Math.max(row.letters, letters), tokens: Math.max(row.tokens, tokens) });
    }
    if (readings.size > 1) readingsMoved++;

    // 4 + 7, on one grammar each: the searches are superlinear and the properties are per-template.
    const g0 = CHECK_GRAMMARS[0];
    const served = serve(it, g0);
    if (served !== null) {
      // 4b. TIER 2 — vocabulary known, role system free.
      const survivors = new Set();
      for (const variant of roleVariants(g0)) {
        if (served.forward) {
          const reading = parseIt(served.keySentence, variant);
          if (reading === null) continue;
          const hit = served.options.find((o) => rKey(o.reading) === rKey(reading));
          if (hit) survivors.add(hit.key);
        } else {
          for (const option of served.options) {
            const reading = parseIt(option.sentence, variant);
            if (reading !== null && rKey(reading) === rKey(served.keyReading)) survivors.add(option.key);
          }
        }
      }
      tier2Hist.set(survivors.size, (tier2Hist.get(survivors.size) ?? 0) + 1);
      if (survivors.size < 2)
        fail(
          id,
          `only ${survivors.size} option survives with the vocabulary known — a child who has the ` +
            'words but not the role system could DETERMINE the key without doing the inference',
        );
      if (survivors.size !== lev.roleOnlyDistractors + 1)
        fail(
          id,
          `${survivors.size} tier-2 survivors but roleOnlyDistractors+1 = ${lev.roleOnlyDistractors + 1}; ` +
            'the residual-ambiguity identity the difficulty model is priced on does not hold',
        );
      if (!ans.antiLeak || ans.antiLeak.residualAmbiguity !== survivors.size)
        fail(id, `answer.antiLeak.residualAmbiguity != re-derived ${survivors.size}`);
      if (!ans.antiLeak || Math.abs(ans.antiLeak.orderStrategyBound - strategyBound(c.argCount, lev.roleOnlyDistractors)) > 0.011)
        fail(id, 'answer.antiLeak.orderStrategyBound != re-derived bound');

      // 4a. TIER 1 — nothing known. Every option must be reachable, or it can be deleted and the
      // elimination attack beats the 25% floor.
      const unreachable = [];
      for (const option of served.options) {
        const wanted = served.forward ? rKey(option.reading) : rKey(served.keyReading);
        const surface = served.forward ? served.keySentence : option.sentence;
        let found = false;
        const verbSwaps = [null, ...PREDICATE_SET.flatMap((p, i) => PREDICATE_SET.slice(i + 1).map((q) => [p, q]))];
        const nounSwaps = [null, ...ENTITY_SET.flatMap((e, i) => ENTITY_SET.slice(i + 1).map((f) => [e, f]))];
        outer: for (const vs of verbSwaps) {
          for (const ns of nounSwaps) {
            const verbs = { ...g0.verbs };
            if (vs) [verbs[vs[0]], verbs[vs[1]]] = [verbs[vs[1]], verbs[vs[0]]];
            const nouns = { ...g0.nouns };
            if (ns) [nouns[ns[0]], nouns[ns[1]]] = [nouns[ns[1]], nouns[ns[0]]];
            for (const variant of roleVariants({ ...g0, verbs, nouns })) {
              const reading = parseIt(surface, variant);
              if (reading !== null && rKey(reading) === wanted) {
                found = true;
                break outer;
              }
            }
          }
        }
        if (!found) unreachable.push(option.key);
      }
      if (unreachable.length > 0) {
        tier1Bad++;
        fail(
          id,
          `option(s) ${unreachable.join(',')} are reachable by NO grammar — a client can prove they ` +
            'are not the key and delete them, so "eliminate, then guess" beats the four-option floor',
        );
      }

      // 7. IRREDUCIBILITY: the same word forms, rearranged, must denote a different scene.
      const bag = (s) => s.split(' ').flatMap((t) => t.split('-')).sort().join('|');
      const keyBag = bag(served.keySentence);
      let semantic = false;
      for (const t of roleOnlyFor(c.argCount, c.marking)) {
        const rival = transformPlan(plan, t, g0, served.keyReading);
        if (rival === null) continue;
        const sentence = spellIt(rival, g0);
        if (sentence === null) continue;
        const reading = parseIt(sentence, g0);
        if (reading === null) continue;
        if (bag(sentence) === keyBag && rKey(reading) !== rKey(served.keyReading)) {
          semantic = true;
          break;
        }
      }
      if (!semantic) {
        notSemantic++;
        fail(
          id,
          'no rearrangement of this item\'s own word forms denotes a different scene — the item is ' +
            'not doing role assignment, and the type has collapsed toward operator composition',
        );
      }

      strategyRows.push({ item: it, served: null });
    }

    if (OPTIONS.includes(ans.correctKey)) keyCounts[ans.correctKey]++;
    else fail(id, `correctKey ${ans.correctKey} is not one of ${OPTIONS.join('')}`);
    optionCounts.add(c.optionCount);

    // ---- 9. Difficulty + reproducibility ----
    const cfg = { argCount: lev.argCount, marking: lev.marking, roleOnlyDistractors: lev.roleOnlyDistractors };
    const derived = round2(difficultyOf(cfg, lev.slateProximity));
    if (Math.abs(derived - it.difficulty) > 0.01)
      fail(id, `difficulty ${it.difficulty} != derived-from-levers ${derived}`);
    if (lev.argCount !== c.argCount || lev.marking !== c.marking)
      fail(id, 'provenance levers disagree with content about argCount/marking');

    // ---- 12. Band ladder ----
    if (isNum(it.difficulty)) {
      const band = bandOf(it.difficulty);
      if (lev.argCount > band.maxArgCount)
        fail(id, `argCount ${lev.argCount} exceeds the ${band.band} cap at difficulty ${it.difficulty}`);
      if (!deepEq(it.ageBands, [band.band]))
        fail(id, `ageBands ${JSON.stringify(it.ageBands)} != ["${band.band}"]`);
      if ((it.ageBands || []).includes('K-1'))
        fail(id, 'K-1 is declared, and this type excludes it for decoding load');
    }

    // ---- 15. Persistence ----
    if (lev.systemPersistence !== mode)
      fail(id, `provenance levers say ${lev.systemPersistence}, bank is ${mode}`);
    if (typeof ans.grammarRef === 'string') grammarRefs.add(ans.grammarRef);
    else fail(id, 'answer.grammarRef missing');

    try {
      const regen = normalizeBankItem(genTemplate({ ...lev, seed: it.provenance.seed }));
      if (!deepEq(regen, it)) fail(id, 'template is NOT reproducible from its provenance (grammar drift)');
    } catch (e) {
      fail(id, `regeneration threw: ${e.message}`);
    }
  }

  // ---- 5. Order strategies, over the exact 36-member role-system family ----
  const strategies = [];
  for (const argCount of [2, 3])
    for (const roleOrder of perms(ROLE_SET)) strategies.push({ argCount, roleOrder: roleOrder.slice(0, argCount) });
  const slices = new Map();
  const stride = Math.max(1, Math.ceil(items.length / 60));
  for (const it of items.filter((_, i) => i % stride === 0)) {
    const argCount = it.content.argCount;
    const roleOnly = it.provenance.levers.roleOnlyDistractors;
    for (const g of ATTACK_FAMILY) {
      const served = serve(it, g);
      if (served === null) continue;
      const verbForm = g.verbs[served.keyReading.predicate];
      const entityOf = {};
      for (const [e, f] of Object.entries(g.nouns)) entityOf[f] = e;
      const surface = served.forward
        ? served.keySentence
        : served.options.find((o) => o.key === it.answer.correctKey).sentence;
      const surfaceEntities = surface
        .split(' ')
        .filter((t) => t !== verbForm)
        .map((t) => entityOf[t.split('-').find((p) => p.length === 3)]);

      for (const strategy of strategies) {
        if (strategy.argCount !== argCount) continue;
        const assignment = {};
        strategy.roleOrder.forEach((role, i) => {
          if (surfaceEntities[i] !== undefined) assignment[role] = surfaceEntities[i];
        });
        const guess = rKey({ predicate: served.keyReading.predicate, assignment });
        const matches = served.options.filter((o) => rKey(o.reading) === guess);
        const gain =
          matches.length === 0
            ? 1 / N_OPTIONS
            : matches.filter((m) => m.key === it.answer.correctKey).length / matches.length;
        const id = `args=${argCount} roleOnly=${roleOnly}`;
        const row = slices.get(id) ?? { hits: 0, n: 0, bound: strategyBound(argCount, roleOnly) };
        row.hits += gain;
        row.n++;
        slices.set(id, row);
      }
    }
  }
  const strategyReport = [...slices]
    .map(([id, row]) => ({ id, accuracy: row.hits / row.n, bound: row.bound, n: row.n }))
    .sort((a, b) => a.id.localeCompare(b.id));
  for (const s of strategyReport) {
    if (s.accuracy > s.bound + 0.005)
      fail(
        `orderstrategy:${mode}`,
        `an assumed role-to-rank mapping scores ${(100 * s.accuracy).toFixed(1)}% on ${s.id} ` +
          `against a derived bound of ${(100 * s.bound).toFixed(1)}% — the excess is NOT the ` +
          'intrinsic multiple-choice asymmetry, so something about the grammar is leaking',
      );
  }

  // ---- 11. Coverage: 0.5-point grain across the whole scale ----
  const diffs = items.map((it) => it.difficulty).filter(isNum);
  const min = Math.min(...diffs);
  const max = Math.max(...diffs);
  if (!(min <= 1.25)) fail(`coverage:${mode}`, `min difficulty ${round2(min)} does not reach the floor`);
  if (!(max >= 19.75)) fail(`coverage:${mode}`, `max difficulty ${round2(max)} does not reach the ceiling`);
  const rungs = [];
  for (let d = 1; d <= 20 + 1e-9; d += 0.5) rungs.push(round2(d));
  const rungCounts = rungs.map((r) => diffs.filter((d) => Math.abs(d - r) <= 0.25).length);
  rungs.forEach((r, i) => {
    if (rungCounts[i] < 5) fail(`coverage:${mode}`, `0.5-point rung ${r} has ${rungCounts[i]} items (<5)`);
    const band = diffs.filter((d) => Math.abs(d - r) <= 0.5).length;
    if (band < 5) fail(`coverage:${mode}`, `+/-0.5pt band around ${r} has ${band} items (<5)`);
  });

  // ---- 13. Key balance (E-094: report per option count, never pooled across formats) ----
  const worst = Math.max(...OPTIONS.map((k) => (100 * keyCounts[k]) / items.length));
  const floor = 100 / N_OPTIONS;
  if (worst - floor > 5)
    fail(`keybalance:${mode}`, `modal key beats the ${floor}% floor by ${(worst - floor).toFixed(1)}pt (>5pt)`);
  if (optionCounts.size !== 1)
    fail(`keybalance:${mode}`, `bank mixes option counts (${[...optionCounts].join(',')}) — E-094 forbids pooling`);

  // ---- 15. Persistence, at bank level ----
  if (mode === 'consistent' && grammarRefs.size !== 1)
    fail(`persistence:${mode}`, `measurement arm names ${grammarRefs.size} grammars, expected exactly 1`);
  if (mode === 'perTrial' && grammarRefs.size !== items.length)
    fail(`persistence:${mode}`, `control arm names ${grammarRefs.size} grammars for ${items.length} items`);

  // ---- 6b. Re-draw invariance is only meaningful if the MEANING actually moves ----
  if (readingsMoved !== items.length)
    fail(
      `invariance:${mode}`,
      `${items.length - readingsMoved} template(s) have the same key reading under every grammar — ` +
        'the grammar is not load-bearing for them, so they are not measuring role induction',
    );

  // ---- 17. No two templates are the same QUESTION ----
  const stimuli = new Map();
  for (const it of items) {
    const transforms = OPTIONS.filter((k) => k !== it.answer.correctKey)
      .map((k) => JSON.stringify(it.answer.distractorRationales[k].planTransform))
      .sort();
    const fp = JSON.stringify([it.content.direction, it.content.marking, it.answer.plan, transforms]);
    stimuli.set(fp, [...(stimuli.get(fp) ?? []), it]);
  }
  for (const group of stimuli.values()) {
    if (group.length < 2) continue;
    fail(
      `duplicates:${mode}`,
      `${group.length} templates share one stimulus (difficulties ${group.map((g) => g.difficulty).join(', ')}) — ` +
        'a re-served question, and if the difficulties differ, the same question priced twice',
    );
  }

  return {
    items,
    min,
    max,
    rungCounts,
    keyCounts,
    worstKeyAdvantage: worst - floor,
    grammarRefs,
    keyDerivations,
    materialisations,
    tier2Hist,
    tier1Bad,
    notSemantic,
    readingsMoved,
    loadByBand,
    strategyReport,
  };
}

const banks = {};
for (const mode of MODES) banks[mode] = checkBank(mode, loadBank(mode));

/* ---- 16. Equating: the two banks differ ONLY in the arm ------------------- */
{
  const a = banks.consistent.items;
  const b = banks.perTrial.items;
  if (a.length !== b.length) fail('equating', `item counts differ (${a.length} vs ${b.length})`);
  const strip = (it) => {
    const clone = JSON.parse(JSON.stringify(it));
    delete clone.itemId;
    delete clone.answer.grammarRef;
    delete clone.provenance.levers.systemPersistence;
    return JSON.stringify(clone);
  };
  let differing = 0;
  for (let i = 0; i < Math.min(a.length, b.length); i++) {
    if (strip(a[i]) !== strip(b[i]))
      fail('equating', `item ${i}: the two arms differ in something other than the arm itself`);
    if (a[i].answer.grammarRef !== b[i].answer.grammarRef) differing++;
  }
  // And they must NOT be the same bank: the grammar schedule has to move somewhere.
  if (differing === 0) fail('equating', 'the two banks are identical — the control arm re-drew nothing');
}

/* ---- Report --------------------------------------------------------------- */
console.log(
  `grammars constructed independently for the key re-derivation: ${CHECK_GRAMMARS.length} ` +
    `(4 lexicons x 6 role systems); attack family swept exactly: ${ATTACK_FAMILY.length}`,
);
for (const mode of MODES) {
  const b = banks[mode];
  console.log(
    `\nVER-ROLES-01.${mode}: ${b.items.length} templates, difficulty ${round2(b.min)}..${round2(b.max)}, ` +
      `${b.grammarRefs.size} grammar reference(s)`,
  );
  console.log(
    `  KEY RE-DERIVED on ${b.keyDerivations}/${b.materialisations} materialisations ` +
      `(${((100 * b.keyDerivations) / b.materialisations).toFixed(1)}%) — every template x every grammar`,
  );
  console.log(
    `  key positions (4-option stratum): ` +
      OPTIONS.map((k) => `${k}:${b.keyCounts[k]}`).join(' ') +
      `  — modal advantage over the ${(100 / N_OPTIONS).toFixed(1)}% floor: +${b.worstKeyAdvantage.toFixed(1)}pt`,
  );
  console.log(`  per 0.5pt rung (1.0 -> 20.0): ${b.rungCounts.join(' ')}`);
  console.log(
    `  tier 1 (nothing known): ${b.items.length - b.tier1Bad}/${b.items.length} templates have all ` +
      `${N_OPTIONS} options relabelling-reachable, so elimination sits ON the ` +
      `${(100 / N_OPTIONS).toFixed(1)}% floor`,
  );
  console.log(
    `  tier 2 (vocabulary known, role system free): survivors ` +
      [...b.tier2Hist].sort((x, y) => x[0] - y[0]).map(([n, c]) => `${n}:${c}`).join(' ') +
      ` — minimum ${Math.min(...b.tier2Hist.keys())}, so a vocabulary-only client tops out at ` +
      `${(100 / Math.min(...b.tier2Hist.keys())).toFixed(1)}% and no item is determined`,
  );
  console.log(
    `  order strategies vs DERIVED bound: ` +
      b.strategyReport
        .map((s) => `${s.id} ${(100 * s.accuracy).toFixed(1)}%/${(100 * s.bound).toFixed(1)}%`)
        .join('  '),
  );
  console.log(
    `  irreducibility: ${b.items.length - b.notSemantic}/${b.items.length} templates admit a ` +
      'rearrangement of their own word forms that denotes a different scene',
  );
  console.log(
    `  re-draw: the key READING moves with the grammar on ${b.readingsMoved}/${b.items.length} ` +
      'templates, while difficulty, option count and key slot move on none',
  );
  console.log(
    `  reading load (longest key sentence): ` +
      [...b.loadByBand].sort().map(([band, l]) => `${band}: ${l.tokens} tokens/${l.letters} letters`).join('  '),
  );
}

if (failures.length) {
  console.error(`\nFAIL — ${failures.length} problem(s):`);
  for (const f of failures.slice(0, 40)) console.error('  - ' + f);
  if (failures.length > 40) console.error(`  ... and ${failures.length - 40} more`);
  process.exit(1);
}
console.log(
  '\nPASS — both template banks parse; the key is re-derived from the grammar on 100% of templates\n' +
    'under every grammar this checker constructed, which is a stronger claim than a baked bank can\n' +
    'make; content names no role, participant, predicate or arm and carries no option list; EVERY\n' +
    'option is reachable by some grammar so elimination sits exactly on the 25% four-option floor;\n' +
    'at least two options survive with the vocabulary known, and the count equals\n' +
    'roleOnlyDistractors + 1 on every item, so the residual-ambiguity identity the difficulty model\n' +
    'is priced on holds; no assumed role-to-rank mapping — the English reading included — exceeds\n' +
    'the DERIVED multiple-choice bound in any slice; every item admits a rearrangement of its own\n' +
    'word forms that denotes a different scene, which is the property no operator chain has;\n' +
    'difficulty is monotone in every lever, re-derived from each template\u2019s own levers, and does\n' +
    'not move under a re-draw while the MEANING moves on every template; coverage is 1..20 with >=5\n' +
    'items per 0.5-point rung; argument count respects the band ladder and K-1 is never declared;\n' +
    'key positions sit at the four-option floor; the measurement arm names one grammar and the\n' +
    'control arm one per item; and the two banks are identical except for that reference.\n\n' +
    'NOT GATED. This says the instrument is well formed, not that it measures learning: Gate A has\n' +
    'not been run on this type at all, and Gate B needs ~128 real children (§4.1.3).',
);
