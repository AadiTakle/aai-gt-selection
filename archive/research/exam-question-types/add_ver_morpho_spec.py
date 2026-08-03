#!/usr/bin/env python3
"""One-shot insert of the VER-MORPHO-01 spec row (STAGE2_QUESTION_DESIGN §9.2 U2).

Written as a script rather than a hand edit because the row must appear byte-identically in
`specs/types_verbal.jsonl` and `catalog/master_types.jsonl`, in the field order `build_types.py`
emits, and `master_types.jsonl` is a GENERATED file whose committed contents are already stale
against the specs on unrelated rows. Running `build_types.py` would drag that unrelated drift into
this change, so the row is inserted directly, after the last verbal row, exactly where a
regeneration would put it. Delete this script once the catalog drift is reconciled separately.

Same device, and the same reason, as `add_opchain_spec.py`.

Idempotent: re-running it is a no-op.
"""
import json
import os

HERE = os.path.dirname(os.path.abspath(__file__))
SPEC = os.path.join(HERE, "specs", "types_verbal.jsonl")
CAT = os.path.join(HERE, "catalog", "master_types.jsonl")
TYPE_ID = "VER-MORPHO-01"

ROW = {
    "type_id": TYPE_ID,
    "name": "Word Machines",
    "areas": ["verbal"],
    "topics_techniques_covered": [
        "receptive_vocabulary: the child maps a written word to the picture it denotes, but the "
        "entire lexicon is invented, so what is probed is a mapping being built inside the block "
        "rather than one the child arrived with — which is the point, because in verbal the "
        "standing failure mode is that any learning measure collapses into crystallized vocabulary",
        "verbal_classification: the six morphemes fall into two families — three that permute a "
        "three-valued number and three that toggle one separable attribute each — and one whole "
        "distractor class is 'read a morpheme as the other member of its own family', so the "
        "response trace records whether the child has the family structure or only the individual "
        "items",
        "sentence_arrangement: the three number morphemes are the three transpositions of S3 and "
        "therefore do not commute, so the same two morphemes in the other order denote a different "
        "picture; morpheme order is a real thing to induce rather than a convention to memorise",
        "antonyms_synonyms: one morpheme is negation, the antonym relation made morphological, and "
        "it composes with the others rather than replacing them",
    ],
    "one_liner": "A tiny invented morphology: the child is shown one labelled creature, then works "
    "out what each three-letter morpheme does to it by watching the system work, and taps the "
    "picture a new word describes — or the word a new picture needs.",
    "interaction": "Each item shows ONE labelled reference picture ('this is a KIB'), and then "
    "either a derived word and four candidate pictures, or a target picture and four candidate "
    "words. ONE TAP, four options in fixed positions, no drag, no typing and no construction — "
    "deliberately the same response grammar as VER-CLOZE-01 and VER-RELPAIR-01, both of which a "
    "child meets during verbal bracketing, so the interface load is discharged in Stage 1 instead "
    "of landing inside the scored block where it would be indistinguishable from learning. Four "
    "options rather than five is a deliberate trade against §4.6's preference for five or six: "
    "interface absorption is §1.4's strongest mitigation and it requires the S1 partner's grammar, "
    "and E-200 showed §4.6's three pseudo-guessing responses cannot fix the floor problem anyway "
    "since it was isolated with no bank involved. The cost is paid down instead by allocating key "
    "positions round-robin and by making every distractor a plausible system-failure. Before the "
    "first scored trial an UNSCORED interface gate runs degenerate instances — a bare stem with no "
    "affix, where the answer is the reference picture itself — to a criterion of k consecutive "
    "correct; a child who has not got the interface never reaches trial 0. Gate instances are "
    "produced by the renderer and are not bank items. After the child commits, the system resolves "
    "the instance and the right answer simply becomes the next visible state: informational "
    "feedback only, with no verdict, score, streak, praise, points or performance-contingent "
    "animation anywhere. The reveal is supplied by the host AFTER the server has scored the trial "
    "— the renderer never holds the correct option, because the form-to-meaning mapping is "
    "server-only and must not reach the browser.",
    "self_teach": "The ghost-hand taps one of the four options on a bare-stem instance, where the "
    "word carries no affix so the answer is the reference picture unchanged, and the "
    "tap-one-of-four loop is obvious wordlessly. The system then resolves worked single-morpheme "
    "instances in front of the child, which fade on a FIXED schedule rather than a "
    "performance-contingent one: a fading schedule that responded to performance would make trial "
    "index mean something different for each child and the fitted climb would stop being "
    "comparable, which is the only property it currently has.",
    "learning_science": [
        {
            "principle": "Graded induction over a composable morphology, not single-rule insight",
            "why": "A one-rule discovery task produces a step function — chance until insight, "
            "then near-ceiling — and fitting a linear rate to a step recovers only roughly when the "
            "step arrived, wasting most of the trials. A closed morpheme vocabulary whose members "
            "compose makes 'having learned it' a ladder rather than a switch.",
            "concrete_decision": "Six morphemes, composition depth 1 to 4 as the dominant "
            "difficulty lever, with the ladder continuing into morpheme combinations never "
            "demonstrated, so the adaptive target has somewhere to go after the first insight.",
            "source": "Harlow (1949) learning set; Estes (1956) on group vs individual curve form",
        },
        {
            "principle": "Within-session word-referent learning is age-feasible",
            "why": "The design asks a child to acquire form-to-meaning mappings inside one session "
            "from ambiguous exposures, which is exactly the paradigm the developmental literature "
            "has tested; without that evidence the whole type would rest on an assumption.",
            "concrete_decision": "Six morphemes rather than a larger lexicon, and contextual "
            "diversity carried by varying the reference picture every trial, which is the lever "
            "that modulated learning in the source study.",
            "source": "Suanda, Mugwanya & Namy (2014), Journal of Experimental Child Psychology 126",
        },
        {
            "principle": "Transfer across items, because no item may repeat",
            "why": "The block forbids repeats, since a re-served item measures recall of that item. "
            "So whatever is learned has to transfer between items, which rules out teaching and "
            "testing the same word and leaves a hidden generative system as the only workable shape.",
            "concrete_decision": "The form-to-meaning mapping persists across the whole block while "
            "every trial is a fresh reference picture and a fresh word; the system is what carries "
            "forward, never the item.",
            "source": "Lionello-DeNolf, McIlvane, Canovas, de Souza & Barros (2008), The "
            "Psychological Record 58(1)",
        },
        {
            "principle": "Cognitive load — decoding load is EXTRANEOUS here, and D-017 forbids "
            "offloading it",
            "why": "This is the only Stage 2 type whose stimulus is text. A child who decodes slowly "
            "looks like a slow learner, and the instrument is text-only with no audio, so the "
            "demand cannot be moved to a soundtrack. Interface learning is the other extraneous "
            "load and is the design's most likely failure in every type.",
            "concrete_decision": "Every morpheme is a closed-syllable short-vowel CVC — the first "
            "pattern taught in systematic phonics — with no digraphs, clusters, r-controlled "
            "vowels, soft c or g, silent e or doubled letters; morphemes are hyphen-separated, "
            "because segmenting an unfamiliar string is a real skill and is not the construct; the "
            "whole bank runs on ten forms, pairwise at edit distance >=2 so no two morphemes are "
            "told apart by one letter; and the stem is never the discriminator, because all four "
            "options in an item share one kind. Response grammar is reused verbatim from an S1 "
            "verbal type; single tap; fixed option positions; unscored interface gate to criterion "
            "before trial 0.",
            "source": "Sweller, van Merrienboer & Paas (2019), Educational Psychology Review 31(2); "
            "Mayer (2021), Multimedia Learning 3rd ed.; D-017",
        },
        {
            "principle": "Retrieval practice with informational, non-evaluative feedback",
            "why": "A learning block with no feedback has nothing to learn from, but evaluative "
            "feedback degrades performance in about a third of studies and leaks into the ability "
            "estimate; 8-9-year-olds also lose more from negative feedback than adults do, which "
            "would make an error-driven design partly a measure of tolerance for being told you are "
            "wrong, differentially by age.",
            "concrete_decision": "The answer is never revealed before the child commits; the reveal "
            "is the system resolving the instance, shown as a state rather than a verdict, with no "
            "error salience and no error count.",
            "source": "Roediger & Karpicke (2006), Psychological Science 17(3); Kluger & DeNisi "
            "(1996), Psychological Bulletin 119(2); van Duijvenvoorde et al. (2008), Journal of "
            "Neuroscience 28(38)",
        },
        {
            "principle": "Separable dimensions, and no multi-dimensional integration at the young "
            "bands",
            "why": "Imported category-difficulty orderings invert when dimensions are integral "
            "rather than separable, and a wrong difficulty ordering biases the fitted rate rather "
            "than merely adding noise. Separately, 6-7-year-olds were mostly best fit by a "
            "random-response model on an information-integration structure.",
            "concrete_decision": "The four picture attributes a morpheme can touch — how many, how "
            "big, a negation mark, and an agent/patient arrow — are separable and never "
            "colour-coded, so colour vision does not gate the task; and composition depth is capped "
            "by grade band: depth 2 at 2-3, 3 at 4-5, 4 at 6-8.",
            "source": "Nosofsky & Palmeri (1996), Psychonomic Bulletin & Review 3(2); Li, Huang, "
            "Seger & Liu (2024), British Journal of Developmental Psychology 42(4)",
        },
        {
            "principle": "Report per band and exclude where the design floors",
            "why": "A floored child produces a flat block and no rate at all, and a floor that is "
            "specific to decoding would be read as low ability. Grade-1 decoding accuracy is around "
            "34%, so at K-1 this type would largely measure decoding rather than induction.",
            "concrete_decision": "K-1 IS NOT SERVED. No item anywhere in the bank declares it, and "
            "band 2-3 carries the bottom of the difficulty scale — the same treatment the catalog "
            "already gives SPA-SCENE-01 and SPA-VIEW-01 at their developmental floor.",
            "source": "brainlift 6.7 (Grade-1 decoding accuracy); STAGE2_QUESTION_DESIGN §3.3, §4.3",
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
        "M-ERRTYPE",
        "M-RULEID",
        "M-RTFIRST",
        "M-ENGAGE",
        "M-RAPIDGUESS",
    ],
    "new_measurements_proposed": [],
    "tail_precision_rationale": "The headline quantity is M-LEARNRATE fitted over the 30-trial "
    "block, and composition depth is what makes it identifiable: a child who has abstracted the "
    "morpheme meanings AND that they compose in the order written climbs the depth ladder as the "
    "target rises, while a child holding an approximate whole-word association cannot, because "
    "every word is new. The sharpest divergence is at MINIMAL PAIRS — items where a distractor "
    "differs from the right answer in exactly one picture attribute, which is what the continuous "
    "within-rung difficulty lever positions — since only a child holding the decomposition can "
    "separate them. The second quantity is a per-trial STRATEGY TRACE, and it is not a nicety: "
    "every distractor encodes one named incomplete version of the system (two morphemes applied in "
    "the wrong order, one read as the other member of its family, one read as a morpheme from the "
    "other family, or two read wrong at once), so each response is classifiable against a closed "
    "rule set. That gives a falsification test the rate alone cannot give — in a real learner "
    "errors should migrate from spread-out toward wrong-order and same-family, and accuracy rising "
    "while the error distribution stays flat over distractors means the rise is guessing or a "
    "mis-stated difficulty — and it gives an ORDINAL fallback if the rate turns out real but too "
    "small to report. Both item DIRECTIONS are carried and tagged (word-to-picture and "
    "picture-to-word), balanced within every 0.5-point rung, because whether the two diverge is "
    "this design's named failure mode (c) and it cannot be tested on a bank that carries only one. "
    "The trace is carried on answer.strategyTrace and on each option's distractorRationales entry, "
    "and is counted through the existing M-ERRTYPE and M-RULEID; whether it should get a metric id "
    "of its own is an open owner decision this row deliberately does not pre-empt, and no new "
    "measurement is proposed here.",
    "age_bands": ["2-3", "4-5", "6-8"],
    "age_rationale": "K-1 is EXCLUDED, not merely capped. The task requires decoding three-letter "
    "pseudo-words and Grade-1 decoding accuracy is around 34% (brainlift 6.7), so at K-1 this would "
    "largely measure decoding — a construct-irrelevant floor that reads as low ability. §3.3 and "
    "§4.3 both prescribe excluding the band where a design floors, as the catalog already does for "
    "SPA-VIEW-01 and SPA-SCENE-01, so band 2-3 carries the bottom of the scale (difficulty 1-8) and "
    "no item declares K-1. Above that the cap is on composition depth, because depth IS the "
    "dimensionality the developmental evidence constrains: depth 2 at 2-3, depth 3 at 4-5 (8-12), "
    "depth 4 at 6-8 (12-20). The reading demand the design was built to, and the figure to hold it "
    "to: at 2-3 the longest word is three CVC syllables / 11 characters, at 4-5 four / 15, at 6-8 "
    "five / 19; per trial the child reads at most two words in the word-to-picture direction and at "
    "most five in the picture-to-word direction, and in the latter all five are the same length and "
    "differ by one syllable, so the comparison is sub-lexical rather than five separate decodings. "
    "Tap-one-of-four with large fixed targets keeps motor load off the rate.",
    "adaptive": {
        "works_well": "high",
        "content_range": "one morpheme acting on a plain creature (2-3) up to a word of four whose "
        "number morphemes do not commute, so the same morphemes in another order denote another "
        "picture (6-8 and above level)",
        "difficulty_levers": [
            "composition depth: how many morphemes the word carries, 1 to 4 (dominant)",
            "number of NUMBER morphemes in the word, each of which permutes a three-valued count "
            "rather than toggling an attribute, so the child must carry a value rather than a flag",
            "whether two or more number morphemes are in play, which is exactly when reordering the "
            "word changes what it denotes",
            "representational mixing: whether the word interleaves number morphemes with attribute "
            "morphemes, so a running count must be carried through morphemes that do not touch it",
            "minimal-pair distance: how many picture attributes separate each wrong option from the "
            "right one, from one attribute (the minimal pair, hardest) out to as far as the word "
            "admits (the continuous within-rung positioner)",
        ],
        "aig_cloneable": "high",
        "system_persistence": {
            "parameter": "systemPersistence",
            "modes": ["consistent", "perTrial"],
            "consistent": "One form-to-meaning mapping for the whole bank, so what the child learns "
            "on trial 1 is still true on trial 30 and knowledge of the system transfers across "
            "items. This is the measurement arm.",
            "perTrial": "A fresh mapping every item, so nothing carries forward. This is the "
            "SCRAMBLED CONTROL: any climb observed here is the design's contamination floor — "
            "practice, warm-up, residual interface learning, guessing, regression at the handover "
            "and difficulty misspecification, summed.",
            "why_a_mode_and_not_a_second_type": "One generator emits both banks and one renderer "
            "serves both arms. Two generators or two renderers would confound the contrast with the "
            "generator or the renderer and the control would be measuring the wrong difference.",
            "equated_across_arms": "The meaning sequence is drawn from the lever tuple and the "
            "seed, never from the mode, so the reference picture, every option's DENOTATION, the "
            "key, the key slot, the distractor slate, the direction, the age band and the stated "
            "difficulty are identical item-for-item across the two banks. Only which "
            "pseudo-syllables spell the morphemes differs, and the morpheme tray is listed "
            "alphabetically BY FORM in both arms — ordered by meaning it would be the mapping.",
        },
        "notes": "Difficulty is computed from the levers above by a signed, monotone formula and "
        "re-derived independently by check-VER-MORPHO-01.mjs, which asserts monotonicity in every "
        "lever on the model AND checks that the continuous minimal-pair lever is monotone in the "
        "bank, per (depth, scope) cell. Item DIRECTION is deliberately NOT priced: whether "
        "picture-to-word is harder is untested, and a wrong ordering biases the fitted rate rather "
        "than merely adding noise, so instead the two directions are balanced within every "
        "0.5-point rung, which makes any direction effect orthogonal to difficulty and therefore to "
        "trial index. The bank carries 0.5-point grain across the whole 1-20 scale at TWELVE items "
        "per rung rather than the six FLU-OPCHAIN-01 uses, because "
        "STAGE2_BANK_RECOVERY_MEASUREMENT §5 traced that bank falling behind an idealised grid at "
        "45-60 trials to exactly that difference in pool depth per rung and flagged it as an "
        "untested conjecture; twelve removes the difference rather than arguing about it. THE KEY "
        "IS NOT DERIVABLE FROM CONTENT: brute-forcing every form-to-meaning mapping leaves all four "
        "options viable on 468 of 468 items in both arms, so the elimination attack sits exactly on "
        "the 25% four-option chance floor, and the key is never the unique modal option under those "
        "mappings, so the stronger vote-weighted attack cannot prefer it either. STATUS: "
        "GATE-READY, UNGATED, AND GATE A IS NOT CLEARED — A1 and A4 fail on this bank as they do on "
        "an idealised grid with no bank at all, which is an estimator-plus-loop property (E-200) "
        "rather than a bank defect; see docs/product/STAGE2_VER_MORPHO_GATE_A.md. Whether this type "
        "loads on verbal rather than fluid reasoning is A-S2-3 and is UNTESTED. Nothing about this "
        "type has been validated and it is not wired into the live learning block.",
    },
    "demo_path": "demos/VER-MORPHO-01.html",
    "engagement_hook": "Nobody tells you what the little word-parts mean, so every trial is a guess "
    "you get to check — and the moment one clicks into place you can suddenly read words that were "
    "gibberish a minute ago.",
    "construct_irrelevant_risks": "The two dominant risks are DECODING LOAD and INTERFACE LEARNING. "
    "Decoding is specific to this type, because it is the only Stage 2 design whose stimulus is "
    "text and D-017 forbids offloading it to audio: a child who reads slowly would look like a slow "
    "learner. Everything available was spent on it — every morpheme is a closed-syllable "
    "short-vowel CVC with no digraphs, clusters, r-controlled vowels, soft c or g, silent e or "
    "doubled letters and with onset never equal to coda; morphemes are hyphen-separated because "
    "segmenting an unfamiliar string is not the construct; the whole bank runs on ten forms, "
    "pairwise at edit distance >=2; the stem is never the discriminator because all four options in "
    "an item share one kind; and K-1 is excluded outright. Interface learning is mitigated as in "
    "every Stage 2 type: the response grammar is borrowed from an S1 verbal type the child already "
    "completed, one tap with fixed option positions so neither motor sequence nor position search "
    "is learnable, an unscored interface gate to k consecutive correct on bare-stem instances "
    "before trial 0, and the scrambled-control arm, which quantifies whatever residue survives all "
    "three. Pseudo-guessing: four options with correct-key positions allocated round-robin, so the "
    "modal-key advantage sits at the arithmetic floor for a four-option item, and every distractor "
    "is a plausible system-failure rather than a filler, which raises the effective option count "
    "without raising reading load. PRIOR KNOWLEDGE is this design's stated strength and is verified "
    "rather than assumed: no form in play is an entry in the 234,456-word web2 dictionary, none is "
    "an English affix, and none is within edit distance 1 of any English word that names one of the "
    "six meanings, so a strong reader cannot shortcut the induction phonologically. "
    "Content-computable shortcuts are closed explicitly and asserted by the checker: the key is "
    "never the unique option that moved furthest from the reference picture; every option is "
    "reachable by some form-to-meaning relabelling, so brute-forcing the mappings eliminates "
    "nothing; the key is never the unique modal option under those mappings; in the picture-to-word "
    "direction all four candidate words carry the same number of morphemes and the same character "
    "count, so counting syllables reveals nothing; and no word repeats a morpheme, contains a "
    "morpheme that changes nothing, or lets its number morphemes cancel, any of which would make an "
    "item far easier than its stated depth. No points, badges, streaks or performance-contingent "
    "animation anywhere, because performance-contingent rewards crowd out intrinsic motivation and "
    "do so worse in children. The four picture attributes are separable and never colour-coded, so "
    "colour-vision differences do not gate the task. Reading policy (D-017): reading is a REQUIRED "
    "baseline-literacy capability, not a construct-irrelevant risk to mitigate — instructions and "
    "stimuli are on-screen text only (never audio); this type's stimuli ARE text, which is why the "
    "phonotactic restrictions above are as tight as they are and why K-1 is excluded; a child who "
    "cannot read the grade-appropriate text is intentionally screened out (capability-to-benefit "
    "from reading-based Timeback). THE CONSTRUCT CLAIM ITSELF IS OPEN: whether this type loads on "
    "verbal rather than fluid reasoning is A-S2-3, is untested, and §3.3 records it as the design "
    "it is least confident about. The mappings were kept semantic — negation, number, size and "
    "agent/patient role, the categories natural morphology encodes — and the forms readable, which "
    "is a design stance and not a validated construct claim.",
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
insert(CAT, after_area="verbal")
