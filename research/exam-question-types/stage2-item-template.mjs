// THE STAGE 2 ITEM TEMPLATE CONTRACT — what a bank record is once the mapping is drawn per session.
//
// STATUS: this is the contract STAGE2_REDESIGN_SPEC.md §2.1 requires, defined here once for all four
// Stage 2 types. A change here is a change to every type's interface: say so loudly rather than
// diverging.
//
// ---------------------------------------------------------------------------
// WHO IMPLEMENTS THIS, AND WHERE IT HAS ALREADY DIVERGED
//
// `FLU-OPCHAIN-01` implements it, and is the type the serve-time materialisation path runs.
//
// `VER-ROLES-01` (D-209) also writes to `templates/`, arrived first, and does NOT satisfy
// {@link templateProblems} — deliberately reported here rather than quietly accommodated, because the
// two workstreams reached the same directory from different readings of §2.1 and only one of them can
// be the contract. Its records keep two fields this rejects:
//
//   `difficulty`  a stored design rung. §2.1 says in as many words that "item difficulty can no
//                 longer be a number in a file", because §3 prices it partly on the child's evidence
//                 so far. VER-ROLES-01 needs SOMETHING before a session exists, because the engine's
//                 selection index carries a difficulty — which is a real problem this contract does
//                 not solve for it, and which FLU-OPCHAIN-01 solves by re-pricing the index per trial.
//   `answer`      with a `correctKey`. That type re-derives the true key from the materialised
//                 sentence under the drawn grammar, so the stored key is a build-time reference and
//                 not the served key — a defensible design, and still a key in a file.
//
// Neither is a defect in that type on its own terms and NOTHING here changes it: reconciling them is
// an owner call about which reading of §2.1 stands, and the cost of each direction is stated in the
// serve-time materialisation PR rather than decided by whichever branch merges second.
//
// ---------------------------------------------------------------------------
// WHY A TEMPLATE AND NOT AN ITEM
//
// Every Stage 2 type hides a bijection from visible symbols to invisible meanings, and the owner's
// remedy for a bank-wide permanent compromise is to draw that bijection PER SESSION, server-side
// (§1 rule 1). PR #51 measured what that does to the shipped banks and found the blocking defect:
// the OPTIONS are baked at build time while the MAPPING is drawn at serve time, and nothing
// reconciles them. So the correct answer is on screen only by luck — 78.2% of mappings at chain
// depth 1, and **13.8% at depth 4**, which is what the top of the ladder is made of.
//
// A template fixes that by refusing to commit to any option until the mapping is known. It carries
// four things and no others:
//
//   1. THE INPUT STATE — what the mechanism starts from. Type-specific and opaque here.
//   2. THE CHAIN, as references to SYMBOL SLOTS rather than to meanings. A slot is an index into the
//      hidden vocabulary. `[0, 3, 1]` says "the machine applies slot 0, then slot 3, then slot 1";
//      WHAT those slots do, and which badge symbol the child sees for each, are both session facts.
//   3. DISTRACTOR RATIONALES — how to CONSTRUCT each wrong option, in priority order, expressed as
//      transformations of the chain. "Apply the chain but drop step 2." "Apply the steps in reverse
//      order." The server materialises them under the drawn mapping, so every option — the key
//      included — is a figure the drawn mapping actually produces. **The key is then on screen by
//      construction, at every depth, for every mapping.** That is the whole point of the format.
//   4. STRUCTURAL FACTS that price difficulty, every one of them relabelling-invariant.
//
// And it carries one thing by its ABSENCE: there is no `difficulty` field and no `answer` field. A
// template has no key, because which figure is correct is not a fact about the template. It has no
// difficulty, because §3 prices difficulty partly on the child's evidence so far, which no file can
// know. Both are computed at serve time and RECORDED with the session, which is what moves
// determinism from "the bank is fixed" to "the session seed is fixed" (R7).
//
// ---------------------------------------------------------------------------
// THE ONE RULE THAT MAKES DIFFICULTY SURVIVE RE-KEYING
//
// **No template field may name a meaning.** Not an operator, not an operator CLASS, not a count of
// either. PR #51's Failure A is that all four shipped types price difficulty on a count of one
// operator sub-class (`geom`/`turns`/`binds`/`scope`), and class membership belongs to the operator
// rather than to the symbol — so a free relabelling moves the count on 21.4% to 50.3% of
// (item, mapping) pairs. On `FLU-OPCHAIN-01` that is mean 0.83 points against a bank granularity of
// 0.5 and a selection tolerance of 0.25.
//
// {@link assertNoMeaningNames} is that rule as an executable check, run by the emitter over every
// template it writes. A type whose template mentions `turn` anywhere has re-introduced Failure A,
// and it will fail at build time rather than three measurements later.

/** Chain transforms a distractor rationale may use. All are over POSITIONS, never over meanings. */
export const RATIONALE_TRANSFORMS = Object.freeze({
  /** Apply positions `at` and `at+1` the other way round. */
  reorder: ['at'],
  /** Skip position `at` entirely. */
  drop: ['at'],
  /** Apply position `at` twice. */
  repeat: ['at'],
  /** Read position `at` as whatever slot `withSlot` means — a wrong-operator reading, stated in slots. */
  substitute: ['at', 'withSlot'],
  /** Apply only the first `length` positions. `length: 0` is "did nothing at all". */
  prefix: ['length'],
  /** Apply every position, last one first. */
  reverse: [],
});

/**
 * Resolve one rationale's transform into a chain of SLOTS.
 *
 * Returns slots rather than meanings on purpose: the caller substitutes the session mapping
 * afterwards, so this function — the part that defines what "drop step 2" means — cannot depend on
 * which operator was drawn. That is what makes the same rationale produce a valid wrong option under
 * every one of the 720 mappings instead of under 13.8% of them.
 */
export function applyRationaleTransform(chain, transform) {
  const { kind } = transform;
  switch (kind) {
    case 'reorder': {
      const out = chain.slice();
      const i = transform.at;
      if (i + 1 >= out.length) return null;
      [out[i], out[i + 1]] = [out[i + 1], out[i]];
      return out;
    }
    case 'drop':
      if (transform.at >= chain.length) return null;
      return chain.filter((_, i) => i !== transform.at);
    case 'repeat': {
      const i = transform.at;
      if (i >= chain.length) return null;
      return [...chain.slice(0, i + 1), chain[i], ...chain.slice(i + 1)];
    }
    case 'substitute': {
      const out = chain.slice();
      if (transform.at >= out.length) return null;
      out[transform.at] = transform.withSlot;
      return out;
    }
    case 'prefix':
      if (transform.length > chain.length) return null;
      return chain.slice(0, transform.length);
    case 'reverse':
      return chain.slice().reverse();
    default:
      throw new Error(`unknown rationale transform "${String(kind)}"`);
  }
}

/**
 * Throw if any value anywhere in `template` spells one of the hidden meanings.
 *
 * A template is allowed to say "position 2", "slot 4" and "six slots". It is not allowed to say
 * "turn" — see the header. Checked over the SERIALISED template rather than over a field list,
 * because the failure mode this exists to catch is a new field nobody thought to check.
 */
export function assertNoMeaningNames(template, meanings) {
  const serialised = JSON.stringify(template);
  const named = meanings.filter((meaning) =>
    new RegExp(`"[^"]*\\b${meaning}\\b[^"]*"`).test(serialised),
  );
  if (named.length > 0) {
    throw new Error(
      `template ${String(template.templateId)} names the hidden meaning(s) ${named.join(', ')}. ` +
        'A template may reference symbol SLOTS and chain POSITIONS only: naming a meaning re-opens ' +
        "PR #51's Failure A, where difficulty is priced on a property a free relabelling moves.",
    );
  }
}

/**
 * Structural check on one template. Returns the problems found, so a caller can report all of them.
 *
 * Deliberately not a Zod schema: the four types' `input` shapes have nothing in common, and a schema
 * that admitted all of them would assert almost nothing. What IS common is the slot discipline, and
 * that is what this checks.
 */
export function templateProblems(template) {
  const problems = [];
  const say = (message) => problems.push(message);

  if (typeof template.templateId !== 'string' || template.templateId.length === 0) {
    say('templateId must be a non-empty string');
  }
  if (typeof template.typeCode !== 'string') say('typeCode must be a string');
  if ('difficulty' in template) {
    say(
      'a template must NOT carry `difficulty`: §3 prices it partly on the evidence so far, so it is ' +
        'computed at serve time and recorded with the session, never stored in the bank',
    );
  }
  if ('answer' in template) {
    say('a template must NOT carry `answer`: which option is correct is a session fact, not a file fact');
  }

  const structure = template.structure;
  if (typeof structure !== 'object' || structure === null) {
    say('structure is required');
    return problems;
  }
  const { slotCount } = structure;
  if (!Number.isInteger(slotCount) || slotCount < 2) say('structure.slotCount must be an integer >= 2');

  if (!Array.isArray(template.chain) || template.chain.length === 0) {
    say('chain must be a non-empty array of slot indices');
  } else {
    for (const slot of template.chain) {
      if (!Number.isInteger(slot) || slot < 0 || slot >= slotCount) {
        say(`chain references slot ${String(slot)}, which is not an index into ${String(slotCount)} slots`);
      }
    }
    if (new Set(template.chain).size !== template.chain.length) {
      say('chain repeats a slot: five of six operators are involutions, so a repeat would silently ' +
        'shorten the chain below its stated length');
    }
    if (structure.chainLength !== template.chain.length) {
      say('structure.chainLength disagrees with chain.length');
    }
  }

  if (!Array.isArray(template.rationales) || template.rationales.length < 4) {
    say('rationales must list at least 4 entries: the slate is chosen from them at serve time, and ' +
      'a mapping under which two collide has to have somewhere to fall back to');
  } else {
    const ids = new Set();
    for (const rationale of template.rationales) {
      if (typeof rationale.rationaleId !== 'string' || ids.has(rationale.rationaleId)) {
        say(`rationale id ${String(rationale.rationaleId)} is missing or duplicated`);
      }
      ids.add(rationale.rationaleId);
      const transform = rationale.transform;
      if (typeof transform !== 'object' || transform === null) {
        say(`rationale ${String(rationale.rationaleId)} has no transform`);
        continue;
      }
      const required = RATIONALE_TRANSFORMS[transform.kind];
      if (required === undefined) {
        say(`rationale ${String(rationale.rationaleId)} uses unknown transform "${String(transform.kind)}"`);
        continue;
      }
      for (const field of required) {
        if (!Number.isInteger(transform[field])) {
          say(`rationale ${String(rationale.rationaleId)} transform.${field} must be an integer`);
        }
      }
      if (transform.kind === 'substitute') {
        if (transform.withSlot >= slotCount) {
          say(`rationale ${String(rationale.rationaleId)} substitutes slot ${String(transform.withSlot)}, out of range`);
        }
        if (template.chain?.includes?.(transform.withSlot)) {
          say(
            `rationale ${String(rationale.rationaleId)} substitutes slot ${String(transform.withSlot)}, ` +
              'which the chain already uses — the misreading would be a reorder, not a wrong operator',
          );
        }
      }
      if (typeof rationale.lure !== 'string') {
        say(`rationale ${String(rationale.rationaleId)} carries no lure class, so M-ERRTYPE cannot bucket it`);
      }
    }
  }

  if (template.syntheticOnly !== true) say('syntheticOnly must be true');
  if (template.validated !== false) say('validated must be false');
  return problems;
}
