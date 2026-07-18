# Paper Deep Dive 1

## Bui, Craig, and Imberman (2014)

**Title:** Is Gifted Education a Bright Idea? Assessing the Impact of Gifted and Talented Programs on Students  
**Venue:** American Economic Journal: Economic Policy, 6(3), 30–62  
**DOI:** https://doi.org/10.1257/pol.6.3.30  
**Evidence grade:** A  

## Why This Paper Matters

This is the closest direct analogue to GT School because it estimates:

1. the effect of ordinary gifted services near an eligibility boundary; and
2. the effect of attending elite gifted magnet schools through randomized admission offers.

The results are mostly null. That makes the paper especially valuable: it shows that gifted selection, strong peers, and advanced placement do not automatically generate program effects.

## Designs

### Fuzzy Regression Discontinuity

- Eligibility changes sharply at a multidimensional admissions-matrix boundary.
- Program enrollment does not move from zero to one, so cutoff eligibility instruments for actual participation.
- The estimand is a local effect for students whose gifted enrollment changes because they cross the boundary.

### Magnet Lottery Instrumental Variables

- Eligible applicants were offered places through oversubscription lotteries.
- Offer assignment instruments for magnet attendance.
- The estimand is a complier effect among applicants whose attendance responds to the offer.

## Quantitative Evidence

### Ordinary gifted services

Published article preferred controlled 2SLS estimates were approximately:

- Math: −0.037 SD, SE 0.074
- Reading: +0.049 SD, SE 0.068
- Language: −0.015 SD, SE 0.066
- Social studies: +0.003 SD, SE 0.084
- Science: −0.025 SD, SE 0.084
- Approximately 4,018–4,025 observations by outcome

These are consistent with negligible short-run effects near the eligibility margin.

The earlier NBER working paper reported the −0.035/−0.002/+0.010/−0.016/+0.017 sequence on a smaller sample. Those values should not be paired with the journal DOI without explicit version labeling.

### Gifted magnet lottery

- 542 eligible applicants
- 394 offered
- 148 not offered
- Weighted first stage approximately 0.47, SE 0.11
- Preferred attendance-IV/LATE science effect approximately +0.28 SD
- Other subject effects were small

Attrition was material and differed by offer status. Bounds for science included zero, weakening the positive interpretation.

## Implementation Lessons

### Backend records required

- Raw eligibility matrix and every component
- Exact boundary and policy version
- Offer assignment and probability
- Enrollment and attendance
- Baseline outcomes before offer
- Fixed follow-up outcomes for all applicants
- Attrition and missingness reasons
- Alternative gifted-service participation

### Statistical requirements

- Separate eligibility, offer, enrollment, and outcome
- Preserve raw running variables
- Analyze offer ITT before attendance effects
- For fuzzy RD or lottery IV, report first stage and LATE separately
- Run manipulation, balance, bandwidth, attrition, and sensitivity checks
- Do not pool RD and lottery estimates as though they answer the same question

## Direct Implications for GT

1. Track A versus Track B outcomes do not estimate program effect.
2. Better peer composition is not sufficient evidence of value added.
3. Subject-specific effects may exist even when broad effects are null.
4. Differential attrition can invalidate an apparently positive result.
5. A future Track B lottery would estimate an offer effect for eligible applicants, not a universal GT effect.

## Limits

- The intervention differs from GT’s software-paced model.
- Outcomes are short-run district tests.
- RD applies only near the boundary.
- Lottery comparison applicants often received other gifted services.
- The study does not address long-term elite STEM readiness.

## Product-Support Claim

This paper supports building a backend that can preserve:

- immutable cutoffs and running variables;
- randomized offers;
- first-stage participation;
- comparison-group outcomes;
- attrition reasons; and
- bounded claim labels.

It does not validate any particular Track B Snapshot criterion.
