# Paper Deep Dive 3

## Abdulkadiroğlu, Angrist, Narita, and Pathak (2017)

**Title:** Research Design Meets Market Design: Using Centralized Assignment for Impact Evaluation  
**Venue:** Econometrica, 85(5), 1373–1432  
**DOI:** https://doi.org/10.3982/ECTA13925  
**Evidence grade:** A  

## Why This Paper Matters

If GT later allocates seats using grades, income blocks, priorities, preferences, aid constraints, or waitlists, a raw offer indicator may not be unconditionally random.

This paper shows how to reconstruct each applicant’s offer probability from the complete assignment mechanism and use that probability in causal evaluation.

## Denver Sample

- District grades 3–9 population: 51,325
- SchoolChoice applicants: 22,311
- Applicants ranking at least one charter: 10,203
- Charter applicants with nondegenerate simulated offer propensity: 3,466
- Preferred outcome-analysis sample: roughly 2,058–2,308
- A saturated exact-type balance specification retained about 462 observations; the preferred formula-score outcome model used 2,058

## Assignment-Propensity Method

Applicant type contains:

- full ordered school preferences; and
- priority at every school.

Deferred acceptance with random lottery tie-breakers treats applicants with identical types equally.

The researchers:

1. fixed applicants, preferences, priorities, eligibility, capacities, and family-link rules;
2. redrew lottery numbers;
3. reran the exact assignment mechanism;
4. recorded each applicant’s assignment;
5. repeated one million lottery draws per application year; and
6. estimated offer propensity as the assignment frequency.

They also developed analytic/formula scores based on marginal priority and the most informative disqualification at more-preferred schools.

## Quantitative Evidence

Preferred formula-score 2SLS estimates:

- First stage: +0.435 charter attendance, SE 0.024
- Math: +0.409 SD, SE 0.051
- Reading: +0.166 SD, SE 0.052
- Writing: +0.315 SD, SE 0.058
- \(N=2,058\)

Simulated-score estimates were similar.

## Bias from Ignoring the Mechanism

Without propensity controls:

- First stage: 0.561 instead of 0.435
- Math effect: 0.231 instead of 0.409
- Reading: 0.066 instead of 0.166
- Writing: 0.141 instead of 0.315

The bias attenuated estimated effects by roughly 44%–60% for these outcomes. Bias was not guaranteed to point upward.

## GT Implementation Lessons

### A simple fixed block lottery

If each Track B applicant belongs to one frozen block and competes for one seat type:

\[
p_b=\frac{\text{seats in block }b}{\text{eligible applicants in block }b}
\]

Store the exact block and probability.

### A complex assignment mechanism

If GT adds:

- ordered program preferences;
- priority tiers;
- aid-budget dependencies;
- reserved seats;
- linked siblings;
- multiple campuses;
- waitlist cascades; or
- adaptive seat transfers,

then evaluation must replay the full mechanism or calculate the exact local propensity.

### Required backend data

- Full preference list and revisions
- Priority at every pool/program
- Capacity and aid state
- Every lottery number and tie rule
- Every assignment round
- Initial and later offers
- Waitlist movement
- Accept/decline/nonresponse
- Final enrollment and exposure
- Mechanism version and source hash

## Maximum Defensible Claim

A propensity-controlled offer instrument can identify a local average effect for applicants whose attendance changed because of the centralized offer mechanism.

It does not identify effects for every applicant or for policies outside the represented assignment support.

## Limits

- Denver charter context
- Complete mechanism data required
- Exclusion and monotonicity required for attendance LATE
- Preferences and priorities may differ from GT’s process
- A complex algorithm does not improve validity if outcomes or follow-up are weak

## Product-Support Claim

This paper provides direct quantitative evidence that faithfully storing and replaying the assignment mechanism can change causal effect estimates by roughly a factor of two. Backend mechanism provenance is therefore part of statistical validity, not merely engineering hygiene.
