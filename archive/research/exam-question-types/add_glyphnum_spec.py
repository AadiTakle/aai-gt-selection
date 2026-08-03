#!/usr/bin/env python3
"""One-shot insert of the QUANT-GLYPHNUM-01 spec row (STAGE2_QUESTION_DESIGN §9.2 U2).

Written as a script rather than a hand edit for the same reason `add_opchain_spec.py` was: the row
must appear byte-identically in `specs/types_quantitative.jsonl` and `catalog/master_types.jsonl`,
in the field order `build_types.py` emits, and `master_types.jsonl` is a GENERATED file whose
current contents are already stale against the specs on unrelated rows. Running `build_types.py`
would drag that unrelated drift into this change, so the row is inserted directly, after the last
quantitative row, exactly where a regeneration would put it. Delete this script once the catalog
drift is reconciled separately.

Idempotent: re-running it is a no-op.
"""
import json
import os

HERE = os.path.dirname(os.path.abspath(__file__))
SPEC = os.path.join(HERE, "specs", "types_quantitative.jsonl")
CAT = os.path.join(HERE, "catalog", "master_types.jsonl")
TYPE_ID = "QUANT-GLYPHNUM-01"

ROW = {
    "type_id": TYPE_ID,
    "name": "Alien Numbers",
    "areas": ["quantitative"],
    "topics_techniques_covered": [
        "number_system_induction: five glyphs stand for five roles in an invented base-4 notation "
        "under an arbitrary, per-block mapping; the child induces what each glyph is worth from "
        "where the machine puts expressions on a line, because no glyph is ever explained",
        "inductive_reasoning: infer a small closed vocabulary of glyph values and then the fact "
        "that the notation has TWO composition layers — glyphs add, but a digit glyph immediately "
        "before a scale glyph multiplies it — which is the deep half of the system and the half "
        "that only shows up once an expression contains a binding",
        "magnitude_comparison: convert a written expression to a quantity and place that quantity "
        "against a line whose far end is labelled in the same notation",
        "proportional_reasoning: the response is a position, so the error is continuous and a child "
        "who has the vocabulary but not the binding lands near rather than at random",
        "sequential_transformation: expression length is the ladder, from one glyph to four, and it "
        "is what a rising difficulty target has somewhere to go into",
    ],
    "one_liner": "The machine writes numbers in glyphs nobody has explained; the child works out "
    "what each glyph is worth by watching where expressions land, then taps where the next one goes.",
    "interaction": "A written expression of one to four glyphs sits above a number line whose far "
    "end is labelled with another expression in the same notation. The child taps which of five "
    "marked positions the expression belongs at. ONE TAP, five fixed tap targets, NO DRAG and no "
    "construction — §3.2 specifies fixed tap targets rather than a jumper precisely so no motor "
    "learning curve enters the block, and the response grammar is otherwise the tap-one-of-N "
    "comparison every child meets in QUANT-DOTS-01 and QUANT-SERIES-01 during quantitative "
    "bracketing, so the interface load is discharged in Stage 1 instead of landing inside the "
    "scored block where it would be indistinguishable from learning. Before the first scored trial "
    "an UNSCORED interface gate runs degenerate instances, where the expression is a single glyph "
    "already shown beside its depicted quantity so the answer is visible, to a criterion of k "
    "consecutive correct; a child who has not got the interface never reaches trial 0. Gate "
    "instances are produced by the renderer and are not bank items. After the child commits, the "
    "machine simply puts the expression where it belongs and that becomes the next visible state: "
    "informational feedback only, with no verdict, score, streak, praise, points or "
    "performance-contingent animation anywhere. There is no Arabic numeral anywhere in the "
    "stimulus, and the line's numeric maximum is deliberately NOT served — publishing it would let "
    "a browser brute-force the glyph-to-role mapping against the anchor and recover the key.",
    "self_teach": "The ghost-hand taps one of the five marks on a degenerate instance where the "
    "expression is a single glyph shown beside a depicted quantity, so the tap-one-of-five loop is "
    "obvious wordlessly. Concreteness fading then runs on a FIXED schedule rather than a "
    "performance-contingent one: the opening demonstration trials show each glyph beside the "
    "quantity it stands for, and the depiction is gone by a fixed trial index. A fading schedule "
    "that responded to performance would make trial index mean something different for each child "
    "and the fitted climb would stop being comparable, which is the only property it currently has.",
    "learning_science": [
        {
            "principle": "Graded induction over a two-layer notation, not single-rule insight",
            "why": "A one-rule discovery task produces a step function — chance until insight, then "
            "near-ceiling — and fitting a linear rate to a step recovers only roughly when the step "
            "arrived, wasting most of the trials. A notation whose glyphs both add and multiply "
            "makes 'having learned it' a ladder rather than a switch, because the additive layer "
            "can be held without the multiplicative one.",
            "concrete_decision": "Five roles, expression length 1 to 4 as the dominant difficulty "
            "lever and the count of multiplicative bindings as the second, so the adaptive target "
            "has somewhere to go after the first insight and the rate summarises successive "
            "abstraction rather than the timing of one event.",
            "source": "Harlow (1949) learning set; Estes (1956) on group vs individual curve form",
        },
        {
            "principle": "Novelty by construction is what makes this quantitative and not schooling",
            "why": "A normal quantitative item measures arithmetic the child was taught, so a rate "
            "fitted on it would partly measure schooling. An invented small-base notation with "
            "invented glyphs cannot be pre-known; adults learning one acquired ordinal meaning and "
            "extended it to untrained expressions, and showed a sign-value advantage over "
            "place-value and an additive advantage over multiplicative composition.",
            "concrete_decision": "Base 4 rather than base 10, arbitrary glyphs re-drawn per block, "
            "and both published orderings carried as within-item levers: a pure additive run is "
            "cheaper than one carrying a binding, and the place-value misreading is one of the "
            "named distractors rather than an alternative bank.",
            "source": "Weiers, Gilmore & Inglis (2025), Journal of Numerical Cognition 11 (ADULTS "
            "ONLY); Holt & Barner (2025), Cognitive Science 49(6) (ADULTS ONLY) — that the ordering "
            "holds in children is A-S2-2 and is this design's largest evidential gap",
        },
        {
            "principle": "Concreteness fading",
            "why": "An arbitrary glyph has to be anchored in a depicted quantity before it can be "
            "used symbolically, but leaving the depiction in place lets the child keep reading the "
            "picture instead of the notation.",
            "concrete_decision": "Demonstration trials show each glyph beside its quantity; the "
            "depiction is gone by a fixed trial index, identical for every child.",
            "source": "Fyfe, McNeil, Son & Goldstone (2014), Educational Psychology Review 26(1)",
        },
        {
            "principle": "Cognitive load — extraneous interface load vs germane induction",
            "why": "A climb produced by a child working out where to tap is indistinguishable, "
            "inside the fit, from a climb produced by learning the notation. That is the most "
            "likely way this type fails.",
            "concrete_decision": "Response grammar reused from an S1 quantitative type; a single "
            "tap on one of five FIXED marks rather than the drag or slider a placement task would "
            "normally use; an unscored interface gate to criterion before trial 0.",
            "source": "Sweller, van Merrienboer & Paas (2019), Educational Psychology Review 31(2); "
            "Mayer (2021), Multimedia Learning 3rd ed.",
        },
        {
            "principle": "Retrieval practice with informational, non-evaluative feedback",
            "why": "A learning block with no feedback has nothing to learn from, but evaluative "
            "feedback degrades performance in about a third of studies and leaks into the ability "
            "estimate; 8-9-year-olds also lose more from negative feedback than adults do, which "
            "would make an error-driven design partly a measure of tolerance for being told you are "
            "wrong, differentially by age.",
            "concrete_decision": "The answer is never revealed before the child commits; the reveal "
            "is the expression arriving at its place on the line, shown as a state rather than a "
            "verdict, with no error salience and no error count.",
            "source": "Roediger & Karpicke (2006), Psychological Science 17(3); Kluger & DeNisi "
            "(1996), Psychological Bulletin 119(2); van Duijvenvoorde et al. (2008), Journal of "
            "Neuroscience 28(38)",
        },
        {
            "principle": "No multi-dimensional integration at the young bands",
            "why": "6-7-year-olds were mostly best fit by a random-response model on an "
            "information-integration structure, and a floored child produces a flat block and no "
            "rate at all. Here the integration step is the multiplicative binding, where a digit "
            "and a scale act on one another rather than each contributing on its own.",
            "concrete_decision": "The band ladder caps BOTH expression length and binding count: at "
            "K-1 and 2-3 no item carries a binding at all, so the young bands see pure additive "
            "sign-value composition; one binding from 4-5, two from 6-8.",
            "source": "Li, Huang, Seger & Liu (2024), British Journal of Developmental Psychology "
            "42(4)",
        },
        {
            "principle": "Desirable difficulty, and why it belongs only in Stage 2",
            "why": "Aiming above the child's settled standing depresses current performance, which "
            "is exactly why it must not leak back into the standing estimate; inside a block whose "
            "job is to observe a climb it is the mechanism rather than a slogan.",
            "concrete_decision": "The block targets standing + 1 and follows the child up as the fit "
            "projects a climb; the bank therefore carries 0.5-point grain across the whole 1-20 "
            "scale, at twelve items per rung, so the target always has an unseen item to land on.",
            "source": "Bjork & Bjork (2011); Soderstrom & Bjork (2015), Perspectives on "
            "Psychological Science 10(2)",
        },
    ],
    "measurements": [
        "M-ACC",
        "M-LEARNRATE",
        "M-PAE",
        "M-ERRTYPE",
        "M-RULEID",
        "M-RTFIRST",
        "M-ENGAGE",
        "M-RAPIDGUESS",
    ],
    "new_measurements_proposed": [],
    "tail_precision_rationale": "The headline quantity is M-LEARNRATE fitted over the 30-trial "
    "block, and expression length plus binding count is what makes it identifiable: a child who has "
    "abstracted 'a digit before a scale multiplies it' climbs as the target rises, while a child "
    "holding a lookup table of expressions cannot, because expressions never repeat. The second "
    "quantity is M-PAE, and this type is built to supply it rather than to declare it. D-031 left "
    "M-PAE unenforced in quantitative because retiring QUANT-NUMLINE-01 left it with no placement "
    "supplier; every item here carries scoring.rule = placement_tolerance with answer.targetRatio "
    "and answer.tolerance, which is the contract the SHIPPED generic verifiers already implement in "
    "both tiers, so pae = |placedRatio - targetRatio| is emitted with no new verifier code. It is a "
    "genuine approximate-error signal and not a relabelled 'which wrong tick', because every wrong "
    "mark is the value of one named incomplete reading of the notation — added across a binding, "
    "bound where nothing was written, read as place-value, one glyph mis-valued, repeats ignored, "
    "first part only, biggest glyph only, glyphs counted instead of valued, or the end of the line "
    "tapped — so the distance between the tap and the key is the SIZE of the child's decoding "
    "error. The checker measures that ordering rather than assuming it. The same tagging is the "
    "§4.6 strategy trace, counted through the existing M-ERRTYPE and M-RULEID: in a real learner "
    "errors should migrate from spread-out toward the added-across-the-binding class, and accuracy "
    "rising while the error distribution stays flat means the rise is guessing or a mis-stated "
    "difficulty. Whether the trace should get a metric id of its own is an open owner decision this "
    "row deliberately does not pre-empt, and no new measurement is proposed here.",
    "age_bands": ["K-1", "2-3", "4-5", "6-8"],
    "age_rationale": "Both expression length and binding count are capped by band, because the "
    "binding IS the integration step the developmental evidence constrains: length 2 and no binding "
    "at K-1 (difficulty 1-4), length 3 and no binding at 2-3 (4-8), length 4 and one binding at 4-5 "
    "(8-12), length 4 and two bindings at 6-8 (12-20). So the young bands see only additive "
    "sign-value composition, which is unidimensional. Reading demand is near-zero — the glyphs are "
    "abstract marks and there is no numeral anywhere in the stimulus — so unlike the "
    "invented-morphology designs this type has no decoding floor at K-1. What it does have at K-1 "
    "is a small expression vocabulary: with no bindings and at most two glyphs there are few "
    "distinct expressions, so variety at the floor comes from the line and the option slate rather "
    "than from the expression, and the response is still not recallable because the marks move. "
    "Tap-one-of-five with large fixed targets keeps motor load off the rate.",
    "adaptive": {
        "works_well": "high",
        "content_range": "one glyph against a short line (K-1) up to a four-glyph expression "
        "carrying two multiplicative bindings, where moving a glyph one place changes the value "
        "(6-8 and above level)",
        "difficulty_levers": [
            "expression length: how many glyphs the expression carries, 1 to 4 (dominant)",
            "number of multiplicative bindings, each of which is a product to hold rather than a "
            "term to add",
            "whether ANY binding is present, which is exactly when the notation stops being "
            "order-free and re-arranging the glyphs changes the value",
            "number of distinct glyphs in play, so more of the vocabulary must be held at once",
            "distractor nearness: how near the four wrong marks sit to the key on a named "
            "partial-rule axis, from 'added across the binding' down to 'tapped the end of the "
            "line' (the continuous within-rung positioner, and the thing that sets the grain of the "
            "placement error)",
        ],
        "aig_cloneable": "high",
        "system_persistence": {
            "parameter": "systemPersistence",
            "modes": ["consistent", "perTrial"],
            "consistent": "One glyph-to-role mapping for the whole bank, so what the child works "
            "out on trial 1 is still true on trial 30 and knowledge of the notation transfers "
            "across items. This is the measurement arm.",
            "perTrial": "A fresh mapping every item, so nothing carries forward. This is the "
            "SCRAMBLED CONTROL: any climb observed here is the design's contamination floor — "
            "practice, warm-up, residual interface learning, guessing, regression at the handover "
            "and difficulty misspecification, summed.",
            "why_a_mode_and_not_a_second_type": "One generator emits both banks and one renderer "
            "serves both arms. Two generators or two renderers would confound the contrast with the "
            "generator or the renderer and the control would be measuring the wrong difference.",
            "equated_across_arms": "The role sequence, the line's maximum, every option value, the "
            "key, the key's rank along the line, the distractor slate, the age band and the stated "
            "difficulty are drawn from the lever tuple and the seed and never from the mode, so "
            "they are identical item-for-item across the two banks. Only which glyph symbols spell "
            "the expression and the line's anchor differ, and the glyph tray is listed in one "
            "canonical order in both arms so the tray itself carries no information.",
        },
        "notes": "Difficulty is computed from the levers above by a signed, monotone formula and "
        "re-derived independently by check-QUANT-GLYPHNUM-01.mjs, which also asserts monotonicity "
        "in every lever. That matters more here than for a standing type: the block serves "
        "different item subsets early and late, so difficulty error that correlates with subset "
        "composition correlates with trial index, and correlated error in difficulty maps straight "
        "onto the fitted rate — random labelling error only attenuates, structured labelling error "
        "biases. Base is NOT a per-item lever even though §3.2 lists one: base is a property of the "
        "system and the system is fixed for the block, so varying it per item would re-draw the "
        "system every trial, which is the scrambled control arm rather than a difficulty lever. The "
        "bank carries 0.5-point grain across the whole 1-20 scale at twelve items per rung — twice "
        "FLU-OPCHAIN-01's density, matching the harness's idealised grid — because a fast climber "
        "ends the block asking for items several points above where it started and a pool that "
        "thins out saturates the fit. STATUS: GATE-READY, UNGATED. The scrambled control is a "
        "binding acceptance criterion and clearing it needs roughly 128 real children, so nothing "
        "about this type has been validated and it is not wired into the live learning block.",
    },
    "demo_path": "demos/QUANT-GLYPHNUM-01.html",
    "engagement_hook": "The machine writes numbers in a language nobody has explained, and it will "
    "not tell you what the marks mean — but every time it puts one on the line you learn a little "
    "more, until writing that were gibberish a minute ago suddenly says a number.",
    "construct_irrelevant_risks": "Two dominant risks. The first is INTERFACE LEARNING masquerading "
    "as learning of the notation: a rising score produced by a child working out where to tap is "
    "indistinguishable inside the fit from a rising score produced by induction. Four mitigations, "
    "in descending strength: the response grammar is borrowed from an S1 quantitative type the "
    "child already completed; a single tap on five fixed marks rather than the drag a placement "
    "task would normally use, so neither motor sequence nor position search is learnable; an "
    "unscored interface gate to k consecutive correct on degenerate instances before trial 0; and "
    "the scrambled-control arm, which quantifies whatever residue survives all three. The second is "
    "PRIOR ARITHMETIC KNOWLEDGE, which is this area's standing confound and the reason the design "
    "is invented rather than base-10. It is reduced, not removed, and three residues are named "
    "rather than waved away: (a) a child who recognises that the scale glyphs form a base ladder "
    "can predict the third scale value once they have two, which shortens the vocabulary half of "
    "the induction though not the binding half — the anti-leak measurement bounds this, because an "
    "attacker who knows the base and the composition rule and lacks only the glyph assignment "
    "still cannot beat a five-option guess by much; (b) 'more glyphs means a bigger number' "
    "transfers from decimal, which is why the key's rank along the line is balanced WITHIN each "
    "expression length rather than only across the bank, and why counting the glyphs is one of the "
    "named distractors so a child using it is visible rather than merely wrong; and (c) placing a "
    "known quantity on a line is itself a taught skill, so the response format is the most "
    "prior-knowledge-loaded part of the design — a child who has never met a number line pays a "
    "cost that has nothing to do with the notation, which the interface gate is there to catch and "
    "which should be reported per band. The additive-before-multiplicative difficulty ordering is "
    "imported from adults and may in children partly reproduce the order the two operations are "
    "taught in; that is A-S2-2 and it is stated, not resolved. Pseudo-guessing: five marks with "
    "correct-key ranks allocated round-robin, so the modal-key advantage sits at the arithmetic "
    "floor for a five-option item, and every wrong mark is a plausible misreading rather than a "
    "filler. Content-computable shortcuts are closed explicitly and measured rather than asserted: "
    "the line's numeric maximum is never served, and a brute force over all 120 glyph-to-role "
    "relabellings leaves at least two marks standing on every item, with the best of three "
    "content-only attacks reported per difficulty slice against the five-option chance floor. No "
    "points, badges, streaks or performance-contingent animation anywhere, because "
    "performance-contingent rewards crowd out intrinsic motivation and do so worse in children. "
    "Glyphs are abstract marks distinguished by shape and never by colour alone, so colour-vision "
    "differences do not gate the task. Reading policy (D-017): reading is a REQUIRED "
    "baseline-literacy capability, not a construct-irrelevant risk to mitigate — instructions and "
    "stimuli are on-screen text only (never audio); this type's stimuli are figural and carry no "
    "numerals at all, so its reading demand is limited to the instruction line, which uses very "
    "simple, high-frequency words a beginning reader can interpret; a child who cannot read the "
    "grade-appropriate text is intentionally screened out (capability-to-benefit from reading-based "
    "Timeback).",
}


def insert(path, after_area=None):
    lines = [line for line in open(path, encoding="utf-8").read().split("\n") if line.strip()]
    rows = [json.loads(line) for line in lines]
    if any(r["type_id"] == TYPE_ID for r in rows):
        print(f"{os.path.relpath(path, HERE)}: already present, nothing to do")
        return
    serialized = json.dumps(ROW, ensure_ascii=False)
    if after_area is None:
        lines.append(serialized)
    else:
        last = max(i for i, r in enumerate(rows) if r["areas"][0] == after_area)
        lines.insert(last + 1, serialized)
    open(path, "w", encoding="utf-8").write("\n".join(lines) + "\n")
    print(f"{os.path.relpath(path, HERE)}: inserted {TYPE_ID}")


insert(SPEC)
insert(CAT, after_area="quantitative")
