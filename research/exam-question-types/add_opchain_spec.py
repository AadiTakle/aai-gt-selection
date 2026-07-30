#!/usr/bin/env python3
"""One-shot insert of the FLU-OPCHAIN-01 spec row (STAGE2_QUESTION_DESIGN §9.2 U2).

Written as a script rather than a hand edit because the row must appear byte-identically in
`specs/types_fluid_reasoning.jsonl` and `catalog/master_types.jsonl`, in the field order
`build_types.py` emits, and `master_types.jsonl` is a GENERATED file whose current contents are
already stale against the specs on five unrelated rows. Running `build_types.py` would drag that
unrelated drift into this change, so the row is inserted directly, after the last fluid row, exactly
where a regeneration would put it. Delete this script once the catalog drift is reconciled
separately.

Idempotent: re-running it is a no-op.
"""
import json
import os

HERE = os.path.dirname(os.path.abspath(__file__))
SPEC = os.path.join(HERE, "specs", "types_fluid_reasoning.jsonl")
CAT = os.path.join(HERE, "catalog", "master_types.jsonl")
TYPE_ID = "FLU-OPCHAIN-01"

ROW = {
    "type_id": TYPE_ID,
    "name": "Machine Chain",
    "areas": ["fluid_reasoning"],
    "topics_techniques_covered": [
        "visual_rule_discovery: six badges stand for six figural transforms under an arbitrary, "
        "per-block mapping; the child induces what each badge does from the machine's visible "
        "outcomes across trials, because no badge is ever explained",
        "inductive_reasoning: infer a small closed vocabulary of primitives and then the fact that "
        "they COMPOSE in the order shown, which is the deep half of the system and the half that "
        "only shows up on chains of two or more",
        "nonverbal_deduction: apply a chain of two to four transforms to an imagined intermediate "
        "figure and select the machine's output from five candidates",
        "figure_classification: three of the six primitives act on orientation and do not commute, "
        "so the same two badges in the other order give a different figure",
        "sequential_transformation: composition depth is the ladder, from one primitive to four, "
        "and it is what a rising difficulty target has somewhere to go into",
    ],
    "one_liner": "A machine shows the badges it is about to use, in order; the child works out what "
    "each badge does by watching the machine work, then taps the figure it will make.",
    "interaction": "A row of two to four badges shows the operators the machine will apply, in "
    "order, to a small figure. The child taps which of five output figures the machine produces. "
    "ONE TAP, five options in fixed positions, no drag and no construction — deliberately the same "
    "response grammar as FLU-MATRIX-01 and FLU-STACK-01, both of which every child meets during "
    "fluid bracketing, so the interface load is discharged in Stage 1 instead of landing inside the "
    "scored block where it would be indistinguishable from learning. Before the first scored trial "
    "an UNSCORED interface gate runs depth-0 instances, where the machine applies no operator at all "
    "so the answer is visible, to a criterion of k consecutive correct; a child who has not got the "
    "interface never reaches trial 0. Gate instances are produced by the renderer and are not bank "
    "items. After the child commits, the machine completes its action and the correct output simply "
    "becomes the next visible state: informational feedback only, with no verdict, score, streak, "
    "praise, points or performance-contingent animation anywhere. The reveal is supplied by the host "
    "AFTER the server has scored the trial — the renderer never holds the correct output, because the "
    "badge-to-operator mapping is server-only and must not reach the browser.",
    "self_teach": "The ghost-hand taps one of the five outputs on a depth-0 instance where the "
    "machine applies no operator, so the figure comes out unchanged and the tap-one-of-five loop is "
    "obvious wordlessly. The machine then runs worked single-badge instances in front of the child, "
    "which fade on a FIXED schedule rather than a performance-contingent one: a fading schedule that "
    "responded to performance would make trial index mean something different for each child and the "
    "fitted climb would stop being comparable, which is the only property it currently has.",
    "learning_science": [
        {
            "principle": "Graded induction over a composable vocabulary, not single-rule insight",
            "why": "A one-rule discovery task produces a step function — chance until insight, then "
            "near-ceiling — and fitting a linear rate to a step recovers only roughly when the step "
            "arrived, wasting most of the trials. A closed vocabulary whose primitives compose makes "
            "'having learned it' a ladder rather than a switch.",
            "concrete_decision": "Six primitives, composition depth 1 to 4 as the dominant difficulty "
            "lever, so the adaptive target has somewhere to go after the first insight and the rate "
            "summarises successive abstraction rather than the timing of one event.",
            "source": "Harlow (1949) learning set; Estes (1956) on group vs individual curve form",
        },
        {
            "principle": "Transfer across items, because no item may repeat",
            "why": "The block forbids repeats, since a re-served item measures recall of that item. So "
            "whatever is learned has to transfer between items, which rules out teaching and testing "
            "the same instance and leaves a hidden generative system as the only workable shape.",
            "concrete_decision": "The badge-to-operator mapping persists across the whole block while "
            "every trial is a fresh instance; the system is what carries forward, never the item.",
            "source": "Lionello-DeNolf, McIlvane, Canovas, de Souza & Barros (2008), The Psychological Record 58(1)",
        },
        {
            "principle": "Cognitive load — extraneous interface load vs germane induction",
            "why": "A climb produced by a child working out where to tap is indistinguishable, inside "
            "the fit, from a climb produced by learning the system. That is the most likely way this "
            "type fails.",
            "concrete_decision": "Response grammar reused verbatim from an S1 fluid type; single tap; "
            "fixed option positions so position-search is not itself learnable; an unscored interface "
            "gate to criterion before trial 0.",
            "source": "Sweller, van Merrienboer & Paas (2019), Educational Psychology Review 31(2); Mayer (2021), Multimedia Learning 3rd ed.",
        },
        {
            "principle": "Retrieval practice with informational, non-evaluative feedback",
            "why": "A learning block with no feedback has nothing to learn from, but evaluative "
            "feedback degrades performance in about a third of studies and leaks into the ability "
            "estimate; 8-9-year-olds also lose more from negative feedback than adults do, which "
            "would make an error-driven design partly a measure of tolerance for being told you are "
            "wrong, differentially by age.",
            "concrete_decision": "The answer is never revealed before the child commits; the reveal is "
            "the machine's completed action, shown as a state rather than a verdict, with no error "
            "salience and no error count.",
            "source": "Roediger & Karpicke (2006), Psychological Science 17(3); Kluger & DeNisi (1996), Psychological Bulletin 119(2); van Duijvenvoorde et al. (2008), Journal of Neuroscience 28(38)",
        },
        {
            "principle": "Separable dimensions, and no multi-dimensional integration at the young bands",
            "why": "Imported category-difficulty orderings invert when dimensions are integral rather "
            "than separable, and a wrong difficulty ordering biases the fitted rate rather than merely "
            "adding noise. Separately, 6-7-year-olds were mostly best fit by a random-response model on "
            "an information-integration structure.",
            "concrete_decision": "Every attribute the operators touch is separable (orientation, shade, "
            "border, pair count — never hue against saturation), and composition depth is capped by "
            "grade band: depth 1 at K-1, 2 at 2-3, 3 at 4-5, 4 at 6-8.",
            "source": "Nosofsky & Palmeri (1996), Psychonomic Bulletin & Review 3(2); Li, Huang, Seger & Liu (2024), British Journal of Developmental Psychology 42(4)",
        },
        {
            "principle": "Desirable difficulty, and why it belongs only in Stage 2",
            "why": "Aiming above the child's settled standing depresses current performance, which is "
            "exactly why it must not leak back into the standing estimate; inside a block whose job is "
            "to observe a climb it is the mechanism rather than a slogan.",
            "concrete_decision": "The block targets standing + 1 and follows the child up as the fit "
            "projects a climb; the bank therefore carries 0.5-point grain across the whole 1-20 scale "
            "so the target always has an item to land on.",
            "source": "Bjork & Bjork (2011); Soderstrom & Bjork (2015), Perspectives on Psychological Science 10(2)",
        },
    ],
    "measurements": [
        "M-ACC",
        "M-LEARNRATE",
        "M-ERRTYPE",
        "M-RULEID",
        "M-RTFIRST",
        "M-ENGAGE",
        "M-RAPIDGUESS",
    ],
    "new_measurements_proposed": [],
    "tail_precision_rationale": "The headline quantity is M-LEARNRATE fitted over the 30-trial block, "
    "and composition depth is what makes it identifiable: a child who has abstracted 'the badges "
    "compose in order' climbs the depth ladder as the target rises, while a child matching surface "
    "features of the outputs cannot, because every figure is new. The second quantity is a per-trial "
    "STRATEGY TRACE, and it is not a nicety: every distractor encodes one named incomplete version of "
    "the system (an operator skipped, two applied in the wrong order, one applied twice, only the "
    "first applied, none applied, one read as a different operator), so each response is classifiable "
    "against a closed rule set. That gives a falsification test the rate alone cannot give — in a real "
    "learner, errors should migrate from spread-out toward omitted-operator and wrong-order, and "
    "accuracy rising while the error distribution stays flat over distractors means the rise is "
    "guessing or a mis-stated difficulty — and it gives an ORDINAL fallback if the rate turns out real "
    "but too small to report. The trace is carried on answer.strategyTrace and on each option's "
    "distractorRationales entry, and is counted through the existing M-ERRTYPE and M-RULEID; whether it "
    "should get a metric id of its own is an open owner decision this row deliberately does not "
    "pre-empt, and no new measurement is proposed here.",
    "age_bands": ["K-1", "2-3", "4-5", "6-8"],
    "age_rationale": "Composition depth is capped by band, because depth IS the dimensionality the "
    "developmental evidence constrains: depth 1 at K-1 (difficulty 1-4), depth 2 at 2-3 (4-8), depth 3 "
    "at 4-5 (8-12), depth 4 at 6-8 (12-20). The cap at the young end is not caution about difficulty "
    "but about a floor that would misread as low ability — 6-7-year-olds were mostly best fit by a "
    "random-response model on an integration structure, and a floored child produces a flat block and "
    "no rate at all. Reading demand is near-zero (badges are symbols and the figures are drawn), so "
    "unlike the invented-morphology designs this type has no decoding floor at K-1. Tap-one-of-five "
    "with large fixed targets keeps motor load off the rate.",
    "adaptive": {
        "works_well": "high",
        "content_range": "one badge acting on a plain figure (K-1) up to a chain of four whose three "
        "orientation primitives do not commute, so the same badges in another order give another "
        "figure (6-8 and above level)",
        "difficulty_levers": [
            "composition depth: how many badges the machine applies, 1 to 4 (dominant)",
            "number of orientation primitives in the chain, each of which forces an imagined "
            "intermediate figure rather than a toggle",
            "whether two or more DISTINCT orientation primitives are in play, which is exactly when "
            "reordering the chain changes the answer",
            "representational mixing: whether the chain interleaves orientation changes with attribute "
            "toggles, so an imagined figure must be carried through steps that do not touch it",
            "distractor distance: how near the four wrong options sit to the key on a named "
            "partial-rule axis, from 'applied two badges in the wrong order' down to 'applied none' "
            "(the continuous within-rung positioner)",
        ],
        "aig_cloneable": "high",
        "system_persistence": {
            "parameter": "systemPersistence",
            "modes": ["consistent", "perTrial"],
            "consistent": "One badge-to-operator mapping for the whole bank, so what the child learns "
            "on trial 1 is still true on trial 30 and knowledge of the system transfers across items. "
            "This is the measurement arm.",
            "perTrial": "A fresh mapping every item, so nothing carries forward. This is the SCRAMBLED "
            "CONTROL: any climb observed here is the design's contamination floor — practice, warm-up, "
            "residual interface learning, guessing, regression at the handover and difficulty "
            "misspecification, summed.",
            "why_a_mode_and_not_a_second_type": "One generator emits both banks and one renderer serves "
            "both arms. Two generators or two renderers would confound the contrast with the generator "
            "or the renderer and the control would be measuring the wrong difference.",
            "equated_across_arms": "The operator chain is drawn from the lever tuple and the seed, "
            "never from the mode, so the input figure, all five option figures, the key, the key slot, "
            "the distractor slate, the age band and the stated difficulty are identical item-for-item "
            "across the two banks. Only which badge symbols label the chain differs, and the badge tray "
            "is listed in one canonical order in both arms so the tray itself carries no information.",
        },
        "notes": "Difficulty is computed from the levers above by a signed, monotone formula and "
        "re-derived independently by check-FLU-OPCHAIN-01.mjs, which also asserts monotonicity in every "
        "lever. That matters more here than for a standing type: the block serves different item "
        "subsets early and late, so difficulty error that correlates with subset composition correlates "
        "with trial index, and correlated error in difficulty maps straight onto the fitted rate — "
        "random labelling error only attenuates, structured labelling error biases. The bank carries "
        "0.5-point grain across the whole 1-20 scale rather than the usual 1-point bins, because a fast "
        "climber ends the block asking for items several points above where it started and a pool that "
        "thins out saturates the fit. STATUS: GATE-READY, UNGATED. The scrambled control is a binding "
        "acceptance criterion and clearing it needs roughly 128 real children, so nothing about this "
        "type has been validated and it is not wired into the live learning block.",
    },
    "demo_path": "demos/FLU-OPCHAIN-01.html",
    "engagement_hook": "The machine will not tell you what its badges mean, so every trial is a guess "
    "you get to check — and the moment a badge clicks into place you can suddenly read chains that were "
    "gibberish a minute ago.",
    "construct_irrelevant_risks": "The dominant risk is INTERFACE LEARNING masquerading as learning of "
    "the system: a rising score produced by a child working out where to tap is indistinguishable "
    "inside the fit from a rising score produced by induction. Four mitigations, in descending "
    "strength: the response grammar is borrowed from an S1 fluid type the child already completed, so "
    "the interface is paid for during bracketing; one tap with fixed option positions, so neither motor "
    "sequence nor position search is learnable; an unscored interface gate to k consecutive correct on "
    "depth-0 instances before trial 0; and the scrambled-control arm, which quantifies whatever residue "
    "survives all three. Pseudo-guessing: five options with correct-key positions allocated "
    "round-robin, so the modal-key advantage sits at the arithmetic floor for a five-option item, and "
    "every distractor is a plausible system-failure rather than a filler, which raises the effective "
    "option count without raising visual load. Content-computable shortcuts are closed explicitly: the "
    "key is never the unique option that changed the most components from the input, so 'tap whichever "
    "picture changed most' cannot beat chance, and no chain repeats an operator or has its orientation "
    "primitives cancel, either of which would make an item far easier than its stated depth. No points, "
    "badges, streaks or performance-contingent animation anywhere, because performance-contingent "
    "rewards crowd out intrinsic motivation and do so worse in children. Every glyph is chiral and has "
    "no rotational symmetry, so mirroring and turning are visible; attributes are separable (shade, "
    "border, pair count) and never colour-only, so colour-vision differences do not gate the task. "
    "Reading policy (D-017): reading is a REQUIRED baseline-literacy capability, not a "
    "construct-irrelevant risk to mitigate — instructions and stimuli are on-screen text only (never "
    "audio); this type's stimuli are figural, so its reading demand is limited to the instruction line, "
    "which uses very simple, high-frequency words a beginning reader can interpret; a child who cannot "
    "read the grade-appropriate text is intentionally screened out (capability-to-benefit from "
    "reading-based Timeback).",
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
insert(CAT, after_area="fluid_reasoning")
