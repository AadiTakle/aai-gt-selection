# Paper Deep Dive 2

## Card and Giuliano (2016)

**Title:** Can Tracking Raise the Test Scores of High-Ability Minority Students?  
**Venue:** American Economic Review, 106(10), 2783–2816  
**DOI:** https://doi.org/10.1257/aer.20150484  
**Evidence grade:** A  

## Why This Paper Matters

This is the strongest direct support for the possibility behind the Track B hypothesis: a differentiated high-achiever classroom produced meaningful gains for a specific prior-achievement-selected population, with especially large effects among underserved Black and Hispanic students. It does not validate the Track B Snapshot rule.

It does not show that every gifted program works. The same broader research context contains null effects for students marginal to formal IQ-based gifted eligibility.

## Program and Identification Design

- Schools created a gifted/high-achiever fourth-grade classroom.
- Formally gifted students entered first.
- Remaining seats were filled using prior-test-score rank within school.
- The discontinuity in classroom placement at the rank boundary identifies a local program effect.

## Quantitative Evidence

### Sample

- Administrative data: 70,058 third-grade students from 2008–2011 across 140 non-charter elementary schools
- Main high-achiever RD sample: 4,144 students near the within-school rank cutoff

### First stage

- Jump in gifted/high-achiever classroom placement: approximately 0.319
- Standard error: 0.026

### Reduced-form effects

- Reading: approximately +0.093 SD, SE 0.031
- Math: approximately +0.087 SD, SE 0.035

### Implied local fuzzy-RD treatment effects

- Reading: approximately +0.29 SD for compliers near within-school cutoffs
- Math: approximately +0.28 SD for compliers near within-school cutoffs
- Local effects among Black and Hispanic compliers were approximately +0.4 to +0.5 SD
- Math gains persisted into fifth grade; science outcomes also improved

Separate IQ-threshold regression discontinuities for formally gifted students produced essentially null reading and math effects.

## Interpretation

The evidence supports a narrower proposition:

> Differentiated instruction targeted to high-achieving students who were not already formally gifted can produce meaningful achievement gains in a specific program.

The study does not establish:

- a universal effect of gifted education;
- the effect of GT School’s model;
- that every below-CogAT applicant will benefit;
- that demographic identity should be a capability input; or
- that post-enrollment growth without a control group is causal.

## Implementation Lessons

### Candidate-selection lesson

Selection on domain-relevant prior achievement may identify a population that benefits from differentiated services differently than selection on an IQ threshold.

Track B should therefore preserve:

- the distinction between CogAT profile and other readiness evidence;
- the specific route by which a student qualified;
- service-aligned evidence rather than one global score; and
- future outcomes by route without claiming route differences are causal.

### Evaluation lesson

If GT later creates a protected Track B eligibility score or rank:

- store the raw continuous value;
- lock the threshold before outcomes;
- prohibit undocumented overrides;
- preserve applicants on both sides;
- collect the same outcomes;
- test manipulation and covariate continuity; and
- label the estimate local to the threshold.

## Direct Implications for GT

1. Track B’s capable-but-underserved hypothesis has credible external precedent.
2. Program design and population both matter; the result cannot be transferred mechanically.
3. A transparent criterion can enable causal evaluation if it is protected.
4. Positive effects for one underserved group do not justify using demographic identity in capability eligibility.
5. A synthetic prototype should model selection route, service version, and outcome separately.

## Limits

- One anonymous district
- Elementary grades
- Prior-achievement rank rather than CogAT-plus-evidence eligibility
- Tracked classroom rather than GT’s adaptive software model
- Local threshold effect
- Mechanisms inferred rather than randomized

## Product-Support Claim

This paper provides quantifiable evidence that a differentiated high-achiever service can generate roughly 0.3 SD gains in a specific underserved population under a credible design. It supports Track B as a researchable hypothesis, not as a proven GT policy.
