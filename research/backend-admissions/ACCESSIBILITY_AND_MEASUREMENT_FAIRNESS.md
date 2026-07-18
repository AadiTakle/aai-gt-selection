# Accessibility, Translation, and Measurement Fairness

## Executive Position

The prototype can test whether its software ignores prohibited access metadata and
protects failed routes from automatic rejection. It cannot establish that an
accommodation, translation, or alternate evidence route measures the same
construct.

Four claims must remain separate:

1. **Interface accessibility:** a person can use the product.
2. **Accommodation-use noninterference:** requesting or using support does not
   directly change eligibility.
3. **Construct preservation:** a changed administration still supports the
   intended score interpretation.
4. **Empirical route equivalence:** different language/evidence routes support
   comparable decisions.

Only the first two can be demonstrated in the synthetic MVP.

## Governing Principle

Tests and routes are not valid in the abstract. The intended interpretation and
use require evidence. An accommodation is defensible when it removes a
construct-irrelevant barrier without changing the intended construct.

The interaction or “differential boost” hypothesis is supporting evidence, not
a standalone validity test:

- both groups may benefit;
- affected students are heterogeneous;
- null interactions may be underpowered;
- score gains do not prove construct preservation;
- aggregate effects can hide item- or ability-level differences.

## Construct Map

For every decision-used dimension, version:

- intended interpretation and permitted use;
- observable evidence and counterevidence;
- essential versus irrelevant language, speed, sensory, motor, and technology
  demands;
- allowed presentation, response, timing, translation, and interpreter changes;
- route-specific anchors;
- prohibited privilege proxies;
- conditions that make evidence uninterpretable; and
- expected software invariants.

Rules:

- Parent writing quality and English proficiency are not constructs.
- English may matter only for an explicitly authorized English-language domain.
- Accommodation use never reduces independence; independence concerns authorship
  and substantive contribution.
- A change to an essential construct creates a distinct route requiring separate
  validation.

## Translation and Adaptation

Translation alone does not establish equivalence.

Minimum future process:

1. Define construct and inference first.
2. Use at least two qualified forward translators.
3. Reconcile with construct, cultural, and accessibility reviewers.
4. Treat back-translation as a secondary check only.
5. Conduct cognitive interviews across literacy, dialect, and assistance
   conditions.
6. Pilot instructions, examples, response options, time burden, save/resume,
   interpreter use, and error messages.
7. Preserve source response, translation, route version, and interventions.
8. Test language-specific classification stability, rater severity, and
   route-by-rater interactions.

Likely cultural risks:

- different meanings of independence, originality, adult support, and rarity;
- modesty, acquiescence, extreme response, and social-desirability styles;
- different reference groups for “advanced”;
- unequal artifact documentation, technology, and enrichment;
- reviewer reactions to fluency, style, and domain prestige.

Structured prompts reduce uncontrolled variation; they do not remove these
biases.

## Accommodation Review

Use a private construct–barrier–support record:

- intended construct;
- functional barrier;
- requested support;
- publisher/manual authority;
- timing/presentation/response/content change;
- expected score comparability;
- qualified reviewer;
- rationale and deviations;
- outcome: standard, authorized accommodation, comparability unresolved, or
  administration failure.

Unresolved or failed routes become pending, never negative eligibility.

Do not:

- expose diagnosis, accommodation, language route, or interpreter use to
  eligibility reviewers;
- infer disability;
- automate accommodation approval;
- flag accommodated scores as inferior; or
- assume a nonverbal test is culture-free.

## Measurement Invariance

For a coherent reflective scale:

- **Configural:** same broad factor pattern.
- **Metric:** equal loadings; supports comparing structural relations.
- **Scalar:** equal loadings plus intercepts/ordinal thresholds; required for
  latent-mean comparisons.
- **Strict:** adds equal residual variances for stronger observed-score
  comparisons.
- **Partial:** releases justified constraints while retaining defensible anchors.

Track B is intentionally multidimensional and rater-mediated. Do not force it
into one latent giftedness scale. Reviewer-severity, generalizability, ordinal
mixed-effects, and many-facet analyses may be more appropriate.

For CogAT or fixed items, future DIF options include:

- Mantel–Haenszel for mainly uniform binary-item DIF;
- logistic regression for uniform and nonuniform DIF;
- IRT likelihood-ratio/Wald methods;
- CFA/MACS or MIMIC under defensible latent models; and
- SIBTEST where multidimensionality matters.

DIF is not automatically bias. It becomes bias evidence only when its source is
construct-irrelevant. No detected DIF does not prove fairness.

## Small-Sample Abstention

There is no universal minimum N. Power depends on:

- item/indicator count and quality;
- group imbalance;
- model complexity;
- DIF magnitude;
- item difficulty;
- anchor contamination; and
- missingness.

Future analyses must:

- pre-register simulation-based precision/power;
- publish group-specific N and missingness;
- report effect sizes and uncertainty;
- check balance/anchor sensitivity;
- label underpowered results `insufficient_information`; and
- never say “DIF-free” from a nonsignificant test.

Synthetic data may verify recovery of seeded violations and warning states. It
cannot validate live fairness.

## Prototype Algorithm

```text
evaluate(application, route_version, policy_bundle):
  require locked policy_bundle

  IF route unavailable, denied, failed, or not provisionally approved:
    RETURN pending_accessibility_route

  decision_inputs = allowlisted_inputs(application)
  ASSERT no disability, accommodation, home_language, ELL,
         translation/interpreter, demographic, finance, consent,
         referral, or advocacy fields

  IF evidence invalid, materially incomplete, or uninterpretable:
    RETURN pending_evidence_correction

  ratings = locked_independent_ratings()

  IF artifact and first two disagree:
    RETURN pending_additional_blind_review

  IF required reviews complete and no majority:
    RETURN pending_no_majority

  IF rule or route configuration unresolved:
    RETURN pending_policy_configuration

  RETURN majority_classification
```

Every pending state has:

- reason;
- owner;
- deadline;
- applicant deadline pause;
- correction/equivalent-route option;
- escalation owner; and
- localized notice version.

Time passage never changes pending to rejection.

## Synthetic Acceptance Pack

Matched case families hold intended capability fixed while changing:

- source versus translated language;
- text/audio/screen-reader/scribe presentation;
- accommodation metadata present/absent;
- interpreter-supported/direct route;
- low/high formatting polish;
- successful/failed/denied support;
- prohibited family/demographic/access fields.

Two test classes:

1. **Exact software invariance:** metadata-only mutations must produce identical
   outcomes, reasons, and decision-input hashes.
2. **Construct-matched route consistency:** compare ratings, uninterpretable
   states, decisions, pending, disagreement, burden, and time. Different route
   bytes/hashes are expected.

Matched synthetic cases expose implementation defects; they do not prove
psychometric route equivalence.

## Audit Fields

Private access store:

- requested/offered/delivered support;
- language and route version;
- request, fulfillment, failure, and resolution timestamps;
- translation/interpreter protocol;
- deviations;
- deadline pauses; and
- restricted purpose/authorization.

Decision-visible store:

- sanitized substantive-assistance contribution only;
- evidence provenance/version;
- route/rubric/policy versions;
- independent ratings;
- reasons and pending state;
- exact decision manifest and hashes.

Statistical audit:

- analysis-plan/data-cutoff versions;
- denominators/exclusions/missingness;
- route and subgroup definitions;
- method/model diagnostics;
- effects, intervals, multiplicity, and anchors;
- abstention rule; and
- permitted/prohibited interpretation.

## Interface Target

WCAG 2.2 AA is a planned prototype target, not current verified conformance.
Test:

- keyboard-only operation;
- named screen readers;
- zoom/reflow and focus order;
- errors and correction;
- save/resume;
- timeout extension;
- captions/transcripts;
- low-bandwidth route; and
- applicant and reviewer workflows.

Automated accessibility checks are insufficient.

## Permitted Claims

- Access metadata is excluded from synthetic decision inputs.
- Failed access routes remain pending.
- The configured software applies no route coefficient or numeric deduction.
- Seeded invariance defects are detectable in the test harness.

## Prohibited Claims

- Accommodations or translations are empirically equivalent.
- Narrative and artifact routes have equal validity.
- WCAG conformance is established before testing.
- A nonsignificant subgroup comparison proves fairness.
- Reviewer agreement establishes route validity.
- Nonverbal testing removes language/opportunity effects.

## Key Sources

- WCAG 2.2:
  https://www.w3.org/TR/WCAG22/
- AERA/APA/NCME (2014), *Standards for Educational and Psychological Testing*:
  https://www.aera.net/Standards14
- ITC (2017), *Guidelines for Translating and Adapting Tests*:
  https://doi.org/10.1080/15305058.2017.1398166
- Meredith (1993), measurement invariance:
  https://doi.org/10.1007/BF02294825
- Putnick & Bornstein (2016), invariance reporting:
  https://doi.org/10.1016/j.dr.2016.06.004
- Wu & Estabrook (2016), ordinal invariance:
  https://doi.org/10.1007/s11336-016-9506-0
- Chen (2007), fit-index sensitivity:
  https://doi.org/10.1080/10705510701301834
- Yoon & Lai (2018), unbalanced samples:
  https://doi.org/10.1080/10705511.2017.1387859
- Swaminathan & Rogers (1990), logistic DIF:
  https://doi.org/10.1111/j.1745-3984.1990.tb00754.x
- Woods (2009), DIF anchor contamination:
  https://doi.org/10.1177/0146621607314044
- Sireci, Scarpati, & Li (2005), accommodations review:
  https://doi.org/10.3102/00346543075004457
- Abedi, Hofstetter, & Lord (2004), ELL accommodations:
  https://doi.org/10.3102/00346543074001001
- Lakin (2012), multidimensional ability-test invariance:
  https://doi.org/10.1016/j.lindif.2011.12.003
- Lohman, Korb, & Lakin (2008), nonverbal gifted identification:
  https://doi.org/10.1177/0016986208321808
- Gentry et al. (2021), gifted test evidence audit:
  https://doi.org/10.1080/02783193.2021.1967545
