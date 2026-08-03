#!/usr/bin/env python3
"""One-shot insert of the VER-ROLES-01 spec row (STAGE2_QUESTION_DESIGN §9.2 U2).

Written as a script rather than a hand edit because the row must appear byte-identically in
`specs/types_verbal.jsonl` and `catalog/master_types.jsonl`, in the field order `build_types.py`
emits, and `master_types.jsonl` is a GENERATED file whose committed contents are already stale
against the specs on unrelated rows. Running `build_types.py` would drag that unrelated drift into
this change, so the row is inserted directly, after the last verbal row, exactly where a
regeneration would put it. Delete this script once the catalog drift is reconciled separately.

Same device, and the same reason, as `add_opchain_spec.py` and `add_ver_morpho_spec.py`.

Idempotent: re-running it is a no-op.
"""
import json
import os

HERE = os.path.dirname(os.path.abspath(__file__))
SPEC = os.path.join(HERE, "specs", "types_verbal.jsonl")
CAT = os.path.join(HERE, "catalog", "master_types.jsonl")
TYPE_ID = "VER-ROLES-01"

ROW = {
    "type_id": TYPE_ID,
    "name": "Who Did What",
    "areas": ["verbal"],
    "topics_techniques_covered": [
        "sentence_arrangement: the language marks who did what to whom either by case particles or "
        "by word order, so the SAME words in a different arrangement denote a different scene — "
        "which is the property that makes this syntactic inference rather than symbol composition, "
        "and it is asserted on every item rather than claimed",
        "verbal_classification: the three thematic roles — agent, patient, goal — are a closed "
        "relational inventory, and one whole distractor class is 'the right participants in the "
        "wrong roles', so the response trace records whether the child has the role system or only "
        "the vocabulary",
        "receptive_vocabulary: the child maps invented noun and verb forms to the participants and "
        "actions of a schematic scene, but the entire lexicon is invented and re-drawn per session, "
        "so what is probed is a mapping being built inside the block rather than one the child "
        "arrived with — and the design measures exactly how little that mapping alone buys them "
        "(residual ambiguity >= 2 on every item)",
        "antonyms_synonyms: not covered, deliberately. This type carries no lexical-relation "
        "content at all, because a relation between invented words would have to be taught inside "
        "the block and would compete with the role system for the child's induction budget",
    ],
    "one_liner": "Nobody tells you how the alien language says who did what to whom, so you work it "
    "out by watching sentences line up with scenes — and then the same three words in a different "
    "order stop meaning what you thought.",
    "interaction": "Each item shows either a SENTENCE in an invented language and four candidate "
    "SCENES, or a scene and four candidate sentences. A scene is a predicate plus role-labelled "
    "participants, drawn as schematic labelled outlines — text-only per D-017, never a picture and "
    "never a word the child must already know. ONE TAP, four options in fixed positions, no drag, "
    "no typing and no construction — deliberately the same response grammar as VER-CLOZE-01 and "
    "VER-RELPAIR-01, both of which a child meets during verbal bracketing, so the interface load is "
    "discharged in Stage 1 instead of landing inside the scored block where it would be "
    "indistinguishable from learning. Four options rather than five is the same trade "
    "VER-MORPHO-01 made and for the same reason: interface absorption is the strongest available "
    "mitigation and it requires the S1 partner's grammar. The cost is paid down by allocating key "
    "positions round-robin — measured at exactly 25.0% per position, zero modal advantage — and by "
    "making every distractor a named misreading. Before the first scored trial an UNSCORED "
    "interface gate runs degenerate instances to a criterion of k consecutive correct; a child who "
    "has not got the interface never reaches trial 0. Gate instances are produced by the renderer "
    "and are not bank items. After the child commits, the scene the sentence actually describes is "
    "revealed: informational feedback only, with no verdict, score, streak, praise, points or "
    "performance-contingent animation anywhere. The reveal is supplied by the host AFTER the server "
    "has scored the trial — the renderer never holds the correct option, because the grammar is "
    "server-only and must not reach the browser.",
    "self_teach": "The ghost-hand taps one of the four options on a degenerate instance where the "
    "sentence names only one participant, so the tap-one-of-four loop is obvious wordlessly. "
    "Sentence-scene pairs are then resolved in front of the child, fading on a FIXED schedule "
    "rather than a performance-contingent one: a fading schedule that responded to performance "
    "would make trial index mean something different for each child and the fitted climb would stop "
    "being comparable, which is the only property it currently has.",
    "learning_science": [
        {
            "principle": "Graded induction over a role system, not single-rule insight",
            "why": "A one-rule discovery task produces a step function — chance until insight, then "
            "near-ceiling — and fitting a linear rate to a step recovers only roughly when the step "
            "arrived, wasting most of the trials. A role inventory whose members must all be placed "
            "at once makes 'having learned it' a ladder rather than a switch.",
            "concrete_decision": "Two argument counts, two marking regimes and one to three "
            "role-only distractors, so the ladder runs from 'one particle to read and one binding "
            "to place' up to 'three bindings from word order alone, against three wrong options "
            "that differ ONLY in the assignment'.",
            "source": "Harlow (1949) learning set; Estes (1956) on group vs individual curve form",
        },
        {
            "principle": "Artificial-grammar learning is the paradigm, and it is age-feasible",
            "why": "The design asks a child to induce a grammatical marking system inside one "
            "session from sentence-scene pairs, which is the artificial-grammar-learning paradigm "
            "and the Linguistics-Olympiad genre; without that precedent the whole type would rest "
            "on an assumption about within-session grammar acquisition.",
            "concrete_decision": "Three roles rather than four — the smallest inventory in which "
            "pinning one role does not pin the reading — and a lexicon of five participants and "
            "four predicates, so the vocabulary tier is small and the induction budget goes to the "
            "role system.",
            "source": "Suanda, Mugwanya & Namy (2014), Journal of Experimental Child Psychology "
            "126, for within-session form-to-meaning acquisition in 5-7-year-olds",
        },
        {
            "principle": "Transfer across items, because no item may repeat",
            "why": "The block forbids repeats, since a re-served item measures recall of that item. "
            "So whatever is learned has to transfer between items, which rules out teaching and "
            "testing the same sentence and leaves a hidden generative system as the only workable "
            "shape.",
            "concrete_decision": "The grammar persists across the whole block while every trial is "
            "a fresh scene and a fresh sentence; the SYSTEM carries forward, never the item. No two "
            "templates in the bank are the same question, checked by fingerprint.",
            "source": "Lionello-DeNolf, McIlvane, Canovas, de Souza & Barros (2008), The "
            "Psychological Record 58(1)",
        },
        {
            "principle": "Cognitive load — decoding load is EXTRANEOUS here, and D-017 forbids "
            "offloading it",
            "why": "This type's stimulus is text and the instrument is text-only with no audio, so "
            "the demand cannot be moved to a soundtrack and a child who decodes slowly would look "
            "like a slow learner.",
            "concrete_decision": "Every noun and verb form is a closed-syllable short-vowel CVC and "
            "every particle a CV, with no digraphs, clusters, r-controlled vowels, soft c or g, "
            "silent e or doubled letters, and onset never equal to coda. PARTICLES ARE HYPHENATED "
            "TO THEIR HOST NOUN, because working out which noun a floating particle marks is a "
            "segmentation puzzle and is not the construct — attachment is given away and the ROLE "
            "is not. That also makes particle-vs-noun decidable by length, two letters against "
            "three. Longest sentence at the youngest band served is three tokens and thirteen "
            "letters. K-1 is excluded outright.",
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
            "is the scene the sentence describes, shown as a state rather than a verdict, with no "
            "error salience and no error count.",
            "source": "Roediger & Karpicke (2006), Psychological Science 17(3); Kluger & DeNisi "
            "(1996), Psychological Bulletin 119(2); van Duijvenvoorde et al. (2008), Journal of "
            "Neuroscience 28(38)",
        },
        {
            "principle": "No multi-dimensional integration at the young bands",
            "why": "6-7-year-olds were mostly best fit by a random-response model on an "
            "information-integration structure, and holding three simultaneous role bindings is "
            "exactly that structure.",
            "concrete_decision": "Argument count is capped by band: two arguments at 2-3, three at "
            "4-5 and 6-8. Participants are semantically inert schematic outlines and are never "
            "colour-coded, so neither world knowledge nor colour vision gates the task.",
            "source": "Li, Huang, Seger & Liu (2024), British Journal of Developmental Psychology "
            "42(4)",
        },
        {
            "principle": "Report per band and exclude where the design floors",
            "why": "A floored child produces a flat block and no rate at all, and a floor specific "
            "to decoding would be read as low ability. Grade-1 decoding accuracy is around 34%, so "
            "at K-1 this type would largely measure decoding rather than induction.",
            "concrete_decision": "K-1 IS NOT SERVED. No template anywhere declares it, and band 2-3 "
            "carries the bottom of the difficulty scale — the same treatment the catalog already "
            "gives SPA-SCENE-01, SPA-VIEW-01 and VER-MORPHO-01 at their developmental floor.",
            "source": "gifted-assessment BrainLift 6.7 (Grade-1 decoding accuracy); "
            "STAGE2_QUESTION_DESIGN §4.3",
        },
        {
            "principle": "Desirable difficulty, and why it belongs only in Stage 2",
            "why": "Aiming above the child's settled standing depresses current performance, which "
            "is exactly why it must not leak back into the standing estimate; inside a block whose "
            "job is to observe a climb it is the mechanism rather than a slogan.",
            "concrete_decision": "The block targets standing + 1 and follows the child up as the "
            "fit projects a climb; the bank therefore carries 0.5-point grain across the whole 1-20 "
            "scale at twelve templates per rung — measured at 12 in every one of the 39 rungs — so "
            "the target always has an unseen item to land on.",
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
    "tail_precision_rationale": "The headline quantity is M-LEARNRATE fitted over the block, and "
    "what makes it identifiable is that the role system unlocks a ladder the vocabulary cannot "
    "climb: a child who has the nouns and verbs but not the marking system is pinned at "
    "1/(roleOnlyDistractors + 1) — 50% at one role-only distractor, 25% at three — while a child "
    "who has the marking system scores 1.0 at every rung. That gap is measured rather than assumed: "
    "brute-forcing every role system with the vocabulary held fixed leaves at least two options "
    "standing on 468 of 468 templates in both arms, and the surviving count equals "
    "roleOnlyDistractors + 1 on every one, so the residual ambiguity the difficulty model is priced "
    "on is a verified identity rather than a label. The sharpest divergence is at three role-only "
    "distractors, where all four options show the SAME participants and the SAME predicate and "
    "differ only in who fills which role, so nothing can be eliminated on surface content at all. "
    "The second quantity is a per-trial STRATEGY TRACE, and it is not a nicety: every distractor "
    "encodes one named plan transform (the participants exchanged, one given the role none of them "
    "holds, the verb read as another predicate, or a participant the sentence never names), so each "
    "response is classifiable against a closed set. That gives a falsification test the rate alone "
    "cannot — in a real learner errors should concentrate on the reversed-relation class, and "
    "accuracy rising while the error distribution stays flat over distractors means the rise is "
    "guessing or mis-stated difficulty — and it gives an ORDINAL fallback if the rate turns out real "
    "but too small to report. Both item DIRECTIONS are carried and balanced (234/234), because "
    "whether comprehension and production diverge is this design's named failure mode (c) and it "
    "cannot be tested on a bank carrying only one.",
    "age_bands": ["2-3", "4-5", "6-8"],
    "age_rationale": "K-1 is EXCLUDED, not merely capped. The task requires decoding three-letter "
    "pseudo-words and Grade-1 decoding accuracy is around 34% (gifted-assessment BrainLift 6.7), so "
    "at K-1 this would largely measure decoding — a construct-irrelevant floor that reads as low "
    "ability. §4.3 prescribes excluding the band where a design floors, as the catalog already does "
    "for SPA-VIEW-01, SPA-SCENE-01 and VER-MORPHO-01, so band 2-3 carries the bottom of the scale "
    "(difficulty 1-8) and no template declares K-1. Above that the cap is on ARGUMENT COUNT, "
    "because argument count IS the dimensionality the developmental evidence constrains: two "
    "arguments at 2-3, three at 4-5 (8-12) and 6-8 (12-20). The reading demand the design was built "
    "to, and the figure to hold it to, measured off the longest key sentence in the bank: at band "
    "2-3 three whitespace tokens and thirteen letters, at 4-5 and 6-8 four tokens and eighteen "
    "letters. Per trial the child reads at most one sentence plus four schematic scenes in the "
    "sentence-to-scene direction, and at most four sentences in the other — and in the latter all "
    "four are the same word forms rearranged, so the comparison is structural rather than four "
    "separate decodings. Tap-one-of-four with large fixed targets keeps motor load off the rate.",
    "adaptive": {
        "works_well": "high",
        "content_range": "a two-argument particle-marked sentence with one role-only distractor "
        "(2-3) up to a three-argument sentence with no particles at all, where every wrong option "
        "shows the same three participants in a different set of roles (6-8 and above level)",
        "difficulty_levers": [
            "argument count: how many participants the sentence names, 2 or 3 (dominant)",
            "marking regime: whether roles come from case particles or from word order — priced as "
            "positional-is-harder, WHICH IS AN OPEN ASSUMPTION (A-S2-7) and not a measurement",
            "role-only distractors: how many wrong options show the same participants and the same "
            "predicate as the key and differ ONLY in the role assignment, 1 to 3 — this is also the "
            "residual-ambiguity lever, since surviving options under a vocabulary-only brute force "
            "are exactly the role-only ones",
            "slate proximity: the mean number of participants whose role differs between each wrong "
            "option and the key, from one binding (the minimal role pair, hardest) out to as far as "
            "the reading space admits (the continuous within-rung positioner)",
        ],
        "aig_cloneable": "high",
        "system_persistence": {
            "parameter": "systemPersistence",
            "modes": ["consistent", "perTrial"],
            "consistent": "One grammar for the whole bank, so what the child learns on trial 1 is "
            "still true on trial 30 and knowledge of the system transfers across items. This is the "
            "measurement arm.",
            "perTrial": "A fresh grammar every item, so nothing carries forward. This is the "
            "SCRAMBLED CONTROL: any climb observed here is the design's contamination floor — "
            "practice, warm-up, residual interface learning, guessing, regression at the handover "
            "and difficulty misspecification, summed.",
            "why_a_mode_and_not_a_second_type": "One generator emits both banks and one renderer "
            "will serve both arms. Two generators or two renderers would confound the contrast with "
            "the generator or the renderer and the control would be measuring the wrong difference.",
            "equated_across_arms": "The two arms are IDENTICAL except for `answer.grammarRef` and "
            "the arm label, which is a stronger equating than any bank of finished items can reach: "
            "a template mentions no word and no role, so there is nothing left over that could "
            "differ. §4.1.1 requires the arms to differ only in whether the system persists, and "
            "here that is literally the only field that does.",
        },
        "notes": "THE BANK STORES TEMPLATES, NOT ITEMS, and that is the load-bearing design "
        "decision. A record is a surface plan plus distractor RATIONALES — 'the participants at "
        "ranks 0 and 1 exchanged' — and the correct answer is what the parser says the materialised "
        "sentence MEANS under the drawn grammar, not a stated fact the grammar must agree with. "
        "That inversion makes the two failures STAGE2_REDESIGN_SPEC §2 measured unconstructible "
        "rather than smaller: over 468 templates x 24 grammars the checker constructs itself, the "
        "key option is the sentence's reading on 11,232 of 11,232 materialisations (100.0%), and "
        "the stated difficulty, option count and key slot move on ZERO templates while the key "
        "READING moves on all 468. Difficulty is computed from the levers above by a signed, "
        "monotone formula and re-derived independently by check-VER-ROLES-01.mjs. Item DIRECTION, "
        "key position and role-to-surface-rank layout are deliberately NOT priced but BALANCED, "
        "because a lever balanced across every rung is orthogonal to trial index and therefore to "
        "lambda, while a lever priced on an untested ordering biases it. THE KEY IS NOT DERIVABLE "
        "FROM CONTENT, in two tiers: with nothing known all four options are relabelling-reachable "
        "on 468/468 templates so elimination sits exactly on the 25% four-option floor, and with "
        "the vocabulary known at least two options survive on every item. Every assumed "
        "role-to-surface-rank strategy — the English 'first noun is the agent' included — sits "
        "EXACTLY on the derived bound 1/n + (n-1-roleOnly)/(n*R), so the whole excess over the "
        "floor is the intrinsic multiple-choice asymmetry and none of it is the grammar; it is 8.3 "
        "points at one role-only distractor and ZERO at three, i.e. largest on the easiest items. "
        "NOT REDUCIBLE TO OPERATOR COMPOSITION, and this is checked rather than argued: 468/468 "
        "templates admit a rearrangement of their own word forms that denotes a different scene, "
        "which no operator chain does because it has no participants to reassign. STATUS: SPECCED, "
        "GENERATED AND CHECKED THROUGH U4; UNEXAMINED BY ANY GATE. Gate A has not been run on this "
        "type at all and Gate B needs ~128 real children. Both arms live in templates/ and "
        "control-templates/, outside the served banks/ directory, because a template has no "
        "content.options and is not a servable item; the serve-time materialisation path does not "
        "yet exist. There is no renderer and no verifier. Whether this type loads on verbal rather "
        "than fluid reasoning is UNTESTED. See docs/product/STAGE2_VER_ROLES_01_SPEC.md and D-209.",
    },
    "demo_path": "demos/VER-ROLES-01.html",
    "engagement_hook": "The alien sentence looks like nonsense until the moment it clicks — and then "
    "you notice that swapping two of the same words turns the whole scene around, which is the bit "
    "that makes you want the next one.",
    "construct_irrelevant_risks": "The three dominant risks are DECODING LOAD, THE ENGLISH "
    "WORD-ORDER PRIOR and INTERFACE LEARNING. Decoding is specific to this type because its "
    "stimulus is text and D-017 forbids offloading it to audio: a child who reads slowly would look "
    "like a slow learner. Everything available was spent on it — every noun and verb form is a "
    "closed-syllable short-vowel CVC and every particle a CV, with no digraphs, clusters, "
    "r-controlled vowels, soft c or g, silent e or doubled letters and onset never equal to coda; "
    "particles are HYPHENATED to their host noun, because segmenting which noun a particle marks is "
    "not the construct while which ROLE it marks is; the length difference makes particle-vs-noun "
    "decidable without decoding either; the longest sentence at the youngest band served is three "
    "tokens and thirteen letters; and K-1 is excluded outright. The English word-order prior is the "
    "risk specific to a thematic-role task, and it is handled by making no order right more often "
    "than chance: the base role order is drawn uniformly per session, and the role-to-surface-rank "
    "layout is allocated round-robin, so every assumed mapping including the English one sits on "
    "the derived multiple-choice bound rather than above it. That equalises the ITEM and not the "
    "child — a child whose first language marks roles by case arrives with a different prior again, "
    "and whether lambda still correlates with verbal standing is untested (§4.7). Interface "
    "learning is mitigated as in every Stage 2 type: the response grammar is borrowed from an S1 "
    "verbal type the child already completed, one tap with fixed option positions so neither motor "
    "sequence nor position search is learnable, an unscored interface gate to k consecutive correct "
    "before trial 0, and the scrambled-control arm, which quantifies whatever residue survives all "
    "three. Pseudo-guessing: four options with key positions allocated round-robin, measured at "
    "exactly 25.0% each with zero modal advantage, and every distractor a named misreading rather "
    "than a filler. PRIOR KNOWLEDGE is this design's stated strength and the reason it exists: the "
    "language is invented and re-drawn per session, so there is no vocabulary to have been exposed "
    "to — which is the property gifted-assessment BrainLift 2.4 and 9.2 show 'culture-fair' "
    "nonverbal tests do NOT deliver, English-language learners scoring 0.5-0.67 SD lower on "
    "Raven's, the NNAT and CogAT-Nonverbal. The participants are also semantically inert schematic "
    "outlines: nothing makes a square a likelier agent than a circle, so no reading is favoured by "
    "plausibility and a child cannot answer from world knowledge — which is the standing failure of "
    "thematic-role items built from real nouns. Content-computable shortcuts are closed explicitly "
    "and asserted by the checker: content names no role, participant, predicate, plan or arm and "
    "carries no option list at all; every option is reachable by some grammar so brute-forcing "
    "eliminates nothing; at least two options survive with the vocabulary known so no item is "
    "determined without the role system; and in the scene-to-sentence direction all four candidate "
    "sentences are the same word forms rearranged, so counting tokens or letters reveals nothing. "
    "No points, badges, streaks or performance-contingent animation anywhere. Colour is never "
    "load-bearing, so colour-vision differences do not gate the task. Reading policy (D-017): "
    "reading is a REQUIRED baseline-literacy capability, not a construct-irrelevant risk to "
    "mitigate — instructions and stimuli are on-screen text only, never audio; this type's stimuli "
    "ARE text, which is why the phonotactic restrictions are as tight as they are and why K-1 is "
    "excluded; a child who cannot read the grade-appropriate text is intentionally screened out. "
    "THE CONSTRUCT CLAIM ITSELF IS OPEN: whether this type loads on verbal rather than fluid "
    "reasoning is untested, exactly as A-S2-3 records for VER-MORPHO-01. The argument that it does "
    "is that assigning agent and patient from grammatical marking is syntactic and semantic "
    "inference and that the same words rearranged mean something different — a property no operator "
    "chain has — but that is a design stance backed by a structural check, not a correlational "
    "result. A SECOND OPEN ASSUMPTION, A-S2-7: the marking lever prices positional as harder than "
    "particle, which is untested, and a wrong sign biases lambda rather than merely attenuating it.",
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
