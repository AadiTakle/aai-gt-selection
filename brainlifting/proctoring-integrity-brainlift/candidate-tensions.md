# Candidate Tensions — Proctoring and Cheat Detection

Raw material for the owner's DOK 3 work. Every line records a place where two sources in the
research base disagree, and names both. Nothing here is a conclusion, a resolution, or a
recommendation — a tension becomes an insight only once the owner has interrogated it.

---

## 1. Whether proctoring changes scores, and by how much

- Steger, Schroeders & Gnambs report a pooled Δ = 0.20 across 49 studies, while Vazquez, Chiang & Sarmiento-Barbieri report unproctored students scoring "over 11% higher on average" in two field experiments.
- Steger, Schroeders & Gnambs report Δ = 0.20 inflation in unproctored ability testing, while Conijn, Kleingeld, Matzat & Snijders find no effect of proctoring on performance across 1,760 students in 105 courses.
- Steger, Schroeders & Gnambs report unproctored score inflation, while Nye et al.'s two-step testing study is cited for finding no evidence of cheating and higher proctored than unproctored scores.
- Steger, Schroeders & Gnambs report a modest mean shift of Δ = 0.20, while the same meta-analysis's five-study subsample reports rank-order correlation of only ρ = .58 between contexts.
- Vazquez, Chiang & Sarmiento-Barbieri find live in-person proctors move scores far more than web-based proctoring, while Harerimana, Mchunu & Mtshali and most policy discussion treat "proctored" as a single condition.
- Karim, Kaminsky & Behrend report increased withdrawal from proctored testing, while no efficacy comparison in Steger, Schroeders & Gnambs or Vazquez et al. accounts for who stopped participating.
- Woldeab & Brothen attribute lower proctored scores substantially to amplified test anxiety, while Alguacil, Herranz-Zarzoso, Pernías & Sabater-Grande test for an anxiety mechanism, find none, and attribute the same direction of effect to suppressed cheating.
- Conijn et al. and Woldeab & Brothen document proctoring's cost as anxiety concentrated on already-anxious examinees, while Steger et al. document its benefit as score integrity, and nothing in the located literature converts between the two currencies.

## 2. What automated detection actually catches, and whether it can be secured

- Bergmans, Bouali, Luttikhuis & Rensink measure automated detection sensitivity at essentially zero against technically capable cheaters, while Proctorio, Proctor360 and Eklavvya advertise 90–98% accuracy and sub-5% false-positive rates without published methods.
- Heinrich reports automated flagging as necessarily over-inclusive and false-positive-heavy by design, while Bergmans et al. measured a 0% false-positive rate in the one controlled trial of a commercial product.
- Dawson & Sutherland-Smith show trained human markers reaching 82% detection sensitivity, while the independent human reviewer in Bergmans et al. caught 1 of 6 instructed cheaters.
- Burgess, Ginsberg, Felten & Cohney argue remote proctoring on test-taker-owned hardware cannot be secured in principle, while proctoring vendors and adopting institutions treat improved feature sets as closing the gap.

## 3. Deterrence, nudges, and belief

- Corrigan-Gibbs, Gupta, Northcutt, Cutrell & Thies find honour codes produce a small non-significant effect and warnings roughly halve cheating, while Mukherjee, Distler, Lenzini & Koenig find the honour-code reminder strongest and the announced-monitoring message non-significant.
- Steger, Schroeders & Gnambs find no measurable moderator effect of standard countermeasures such as honesty contracts, while Corrigan-Gibbs et al. and Mukherjee et al. report significant reductions in cheating from pre-test honour codes and warnings.

## 4. Statistical indices — which works, and how well

- Karabatsos ranks nonparametric person-fit statistics decisively above parametric ones, while Sinharay's re-analysis of the same simulations finds lz and ECI4z equally powerful and attributes the gap to comparison design.
- Wollack, Cohen & Eckerly report the erasure detection index with continuity correction has high power and controlled Type I error, while Sinharay & Johnson report the continuity-corrected version loses power and Sinharay reports the school-average erasure count many states used has low power.
- Eckerly notes that collusion-cluster probability statements apply only to pairs and are sensitive to the clustering procedure, while Wollack & Maynes designed the method to identify groups.
- Wise & Kong validate rapid-guessing thresholds by requiring flagged responses to be correct at chance rate, while Qian, Staniewska & Reckase use the opposite pattern — fast responses correct at 76.5% — as evidence of item compromise.

## 5. Base rates, thresholds, and what a flag licenses

- Skorupski & Wainer show a nominal 1% Type I error rate yields a positive predictive value of 0.50 at 1% prevalence, while operational testing programs described by Wollack, Cohen & Eckerly continue to flag at conventional α levels of 0.01 or 0.05.
- Severo, Silva-Pereira, Ferreira, Monteiro & Pereira measure true item-preknowledge prevalence at 1.2%–3.7% by statistical modelling, while self-report in the same population gives roughly 25% for preknowledge and 52%–67% for answer copying.
- Sinharay's own response-time statistic performs well against the alternatives it was built for, while Sinharay insists it "should not be used as a sole measure," and the practical appeal of automated data forensics is precisely that it scales without investigators.
- Microsoft states forensic analysis is accurate enough to be the sole evidence for a permanent certification ban, while Caveon, Dwyer & Hecht, and Wollack all hold that corroborating evidence is a necessity and statistics only a trigger.

## 6. From flag to accusation — what was written versus what was done

- The Atlanta special investigation treated a three-standard-deviation erasure excess as almost statistically impossible without an external cause, while Caveon in the same record argued many flagged schools were on the list for reasons unrelated to cheating, including scanner misalignment corrections.
- Georgia's erasure-analysis protocol and the D.C. state superintendent's office both stated erasure statistics alone explain nothing and require follow-up, while the D.C. district skipped classroom investigation after the 2008 flags and a Tampa charter school had roughly 100 tests invalidated after interviews with only a few teachers.

## 7. Demographic error — what was measured, on what task

- NIST (Grother, Ngan & Hanaoka) explicitly refuses to attribute measured recognition differentials to skin tone, while the study that did measure by skin tone — Buolamwini & Gebru — measured gender classification rather than detection or verification.
- Proctorio's response distinguishes face detection from identity recognition to answer the privacy objection, while Yoder-Himes et al. measured the demographic differential in face *detection* output specifically.
- Brown / CDT and the National Disabled Law Students Association articulate a well-developed disability flagging mechanism, while no located study measures flag rates against disability status the way Yoder-Himes et al. measured them against skin tone.
- Srinivas et al. and NIST find children the group with the worst measured biometric performance and Regulation (EU) 2024/1689, GDPR and COPPA give them the strongest legal protection, while no proctoring-specific evaluation on child examinees was located.

## 8. Law and regulation — what has been decided

- The Italian data protection authority found exam-proctoring facial processing to be Article 9 biometric data processed without a lawful basis, while the Amsterdam court expressly found no Article 9 biometric data was involved in comparable software.
- The Amsterdam court accepted public-task processing precisely because a public university cannot rely on legitimate interest, while the Italian authority held student consent could not be freely given at all given the controller–student power imbalance.
- The *Ogletree* court held a room scan an unreasonable Fourth Amendment search and reasoned that students can cheat regardless so the scan is unnecessary, while the test-security literature disputes that same empirical premise.
- Regulation (EU) 2024/1689 prohibits inferring emotions in education institutions outright while classifying test-behaviour monitoring as merely high-risk, and Proctorio's own characterisation of its internal signals draws the behavioural/affective line for itself.

## 9. Consent and the room

- GDPR Article 8 and COPPA require parental consent, and Kansas and Oklahoma remote-testing manuals require parental setup and device provision, while Viñas-Guasch et al. name the same adult as a source of possible active help.
- The ATP/ITC guidelines and the Kansas manual specify a private quiet room and 100 Mb connectivity as a security control, while Pew Research Center data show roughly half of the lowest-income US households do not subscribe to home broadband, and the Oklahoma program's stated remedy is to send those students to test in person.
- The ATP/ITC *Guidelines for Technology-Based Assessment* are the professional guidance most often cited to justify remote proctoring, while they are co-authored by a trade association of the test publishers whose products they govern.

## 10. AI capability, and what institutions did about it

- ARC Prize's verified 92.5% on ARC-AGI-2 stands against roughly 28% near-chance performance on image-delivered abstract puzzles measured by Khezresmaeilzadeh et al.
- Khezresmaeilzadeh et al. attribute 55.4% of model failures to perception, while Du, Zou & Cheng find decomposition rather than perception the dominant failure for closed-source models.
- ARC Prize reports a 66% average human baseline for ARC-AGI-2, while an independent commentary reinterprets it at 53% or lower.
- Bloemers, Oud & van Dam found figural and analogical items immune to cheating with human help, while Yan et al. and Khezresmaeilzadeh et al. imply a human who describes the item to a model supplies exactly the missing capability.
- ACCA and LSAC withdrew remote delivery in 2026 on integrity grounds, while Stanford Graduate School of Education survey data show high-school cheating rates unchanged after ChatGPT's release.

## 11. Adult presence and remote equivalence

- Hamner et al., Manning et al. and Ruffini et al. report teleassessment equivalence in clinician-supervised clinical samples, while Moreau et al. report a significant fluid-reasoning discrepancy and Harder et al. report that performance validity was never tested in any included study.
- Yantz et al., Kehrer et al. and Pearson's facilitator guidance treat adult presence as a validity threat, while Viñas-Guasch et al. and the state remote-testing manuals treat adult presence as a practical necessity for young children testing at home.
- Walker et al. and Hamner et al. report equivalence for remotely administered children's cognitive testing with an examiner present and supervising, while Steger et al. and Bloemers et al. report substantial score inflation when supervision is absent, and nothing published connects the two bodies of evidence for young children at home.

## 12. Operating cost and the review that does not happen

- A leading provider withdrew AI-only proctoring in 2021 on the grounds that unreviewed flags are worthless, while the automated-only tier continues to be sold across the industry at $3–$10 per exam in 2026. *(ProctorU/Meazure 2021 vs. industry pricing guidance 2026.)*
- Vendors selling hybrid review report automated flag rates of 15–50 per cent, and no independent measurement of flag rates at scale exists because flag data are not published in any standardised form. *(Integrity Advocate / Proctor360 / Meazure vs. the absence of any independent audit.)*
- Industry guidance prices automated proctoring as the low-cost option while separately conceding hidden costs of 30–50 per cent, and other sources put downstream review labour at roughly 78 staff hours per 100 exams — a cost absent from every per-exam comparison. *(Industry pricing guidance vs. Meazure operational figures.)*
- A ratio of one live proctor to eight candidates is asserted in industry material without observational support, yet it determines whether live proctoring is affordable at any volume. *(Industry comparison vs. no primary source.)*
- The 47-minute-per-session review figure originates with a provider whose business depends on institutions concluding they cannot do that review themselves. *(Meazure operational figure vs. its own commercial interest.)*
- The stated remedy — two people verifying every flag before it reaches a decision-maker — multiplies the cost of exactly the step the same company’s data showed institutions were already skipping. *(ProctorU replacement model vs. ProctorU’s 11 per cent finding.)*
- Institutions reviewed 11 and 14 per cent of flagged sessions in two independent measurements, while the hybrid model sold as the fix assumes review approaching 100 per cent. *(ProctorU and University of Iowa audit vs. hybrid vendor positioning.)*
