# Future Allocation, Aid, and Auditable Lottery Research

## Status

Future research design only. Allocation remains PRD blocker B-08 and is outside the MVP.

## 1. Capability, Aid, Allocation, and Evaluation Must Be Separate

1. **Capability eligibility**
   - CogAT and Snapshot evidence only
   - No income, aid, ZIP code, deposit, or research-consent input

2. **Aid and affordability**
   - Restricted finance workflow
   - Income/household verification, formula version, net price, deposit, transportation, and technology

3. **Seat allocation**
   - Eligible-pool snapshot
   - Approved operational block
   - Seats, assignment probability, random rank, and waitlist

4. **Evaluation**
   - Pseudonymous assignment, treatment package, enrollment/exposure, outcomes, and attrition

Research refusal must not flow back into the first three processes.

## 2. Treatment Bundle

A randomized offer identifies the effect of the package assigned:

> GT offer + net tuition + aid certainty + deposit terms + transportation + technology + related services.

It is not a pure instructional effect when these components vary with assignment.

Primary estimand:

\[
ITT=E[Y\mid Z=1]-E[Y\mid Z=0]
\]

where \(Z\) is initial assignment to the complete offer package.

Enrollment LATE additionally requires:

- offer relevance;
- exclusion;
- monotonicity;
- stable treatment version; and
- defensible interference assumptions.

When aid or technology has direct effects outside enrollment, exclusion is doubtful. Retain the package ITT.

## 3. Recommended Assignment Protocol

Use a batch-based, capacity-constrained blocked lottery.

### Preconditions

- Final Track B eligibility and correction deadline
- Genuine demand exceeding seats
- No manufactured scarcity
- Ethical equipoise
- Complete usable offer package
- Independent protocol and outcome approval
- Research refusal independent of ordinary rights

### Freeze

- Eligible roster
- Capacity by genuine operational block
- Package version
- Baseline data
- Block definitions
- Seat counts and offer probabilities
- Waitlist/capacity-transfer rule
- Protocol/code hash

### Block conservatively

Use:

1. Real operational capacity cells
2. At most a few strong prognostic baseline strata
3. Prespecified sparse-cell collapse

Every analysis block needs offer and non-offer probability. Certainty cells do not contribute to the randomized contrast.

### Draw

- Assign exact seat counts within blocks.
- Use uniform complete randomization by default.
- Generate one immutable random priority order for all non-offerees.
- Never rerandomize after declines.
- Promote from the same locked order.

Rerandomization may be studied only if:

- accepted assignment space remains large;
- every probability is known and nonzero;
- equal-chance commitments are preserved or explicitly approved; and
- inference reproduces the constrained assignment space.

## 4. Income-Stratified Allocation

Income may define an allocation block only under separately approved policy/legal objectives. It cannot define capability.

If used:

- Freeze household-size-adjusted brackets before the draw.
- Freeze seats and complete offer packages by bracket.
- Maintain nonzero offer and non-offer probabilities.
- Estimate bracket-specific ITT.
- Aggregate with target eligible-population weights, not seat shares.
- Report actual probabilities.

Funding Track A first and assigning only residual aid/seats to Track B makes route, income, aid, and offer value interdependent. It is not causally neutral and requires a separate decision.

## 5. Cryptographically Auditable Draw

### Freeze manifest

Include:

- pseudonymous lottery tokens;
- block IDs;
- capacities;
- eligibility/policy hash;
- target future randomness source;
- schema and verifier version.

Canonicalize with RFC 8785, sign, and timestamp before randomness is knowable.

Pin the JCS implementation/version and current RFC errata, including negative-zero handling.

### Randomness

Preferred future design:

- fixed future drand beacon round;
- pinned drand network, chain hash, round, and verification algorithm;
- independently verified beacon proof;
- optional operator secret committed and independently escrowed before the beacon.

### Rank

Derive a fixed 256-bit key with explicit HKDF parameters:

```text
salt = SHA256(frozen_manifest_bytes)
IKM  = fixed_32_byte_beacon_randomness ||
       fixed_32_byte_operator_secret
info = UTF8("gt-allocation/key/v1") ||
       fixed_width(draw_id) ||
       SHA256(frozen_manifest_bytes)
key  = HKDF-SHA256(salt, IKM, info, 32)
```

If no operator secret is used, define that variant as a separate protocol version rather than concatenating an absent field ambiguously.

Encode the HMAC message as RFC-8785 canonical JSON or fixed-width/length-prefixed fields; raw variable-length concatenation is prohibited.

```text
rank_digest = HMAC-SHA-256(
  key,
  JCS({
    "v": "gt-allocation/rank/v1",
    "draw_id": draw_id,
    "block_id": block_id,
    "lottery_token": lottery_token
  })
)
```

Sort full digests ascending within each block. First \(k\) receive initial offers; the rest form the waitlist.

Avoid:

- PostgreSQL `random()`
- `ORDER BY random()`
- JavaScript `Math.random()`
- operator-selected post-hoc seeds
- mutable rosters after randomness is available

## 6. Supabase/PostgreSQL Record Design

Schemas:

- `allocation_private`: identity-token linkage and restricted eligibility snapshot
- `allocation_core`: draws, blocks, commitments, randomness, ranks, assignments, offer events, audit
- `allocation_public`: sanitized signed artifacts and applicant status

Core tables:

- draws
- draw_entrants
- draw_blocks
- entropy_commitments
- beacon_pulses
- rankings
- initial_assignments
- offer_events
- signed_artifacts
- audit_events

Execution:

- one `SERIALIZABLE` transaction;
- advisory transaction lock by draw ID;
- retry full transaction on serialization failure;
- unique constraints for one draw/result;
- append-only offer and waitlist events;
- external signed publication because a database owner can bypass internal controls.

## 7. Verification

- Cross-runtime reproduction in TypeScript, PostgreSQL, and independent Python
- RFC test vectors for HMAC/HKDF/signatures/canonicalization
- Tamper tests for roster, policy, capacity, randomness, and result
- Input-order invariance
- Exactly \(k\) offers per block
- Equal inclusion under simple blocks
- Tie/collision handling
- One result under concurrent execution
- Idempotent retries and webhooks
- Waitlist promotes exact next rank
- No event overwrites initial assignment
- Public artifacts contain no PII
- Analysis reproduces blocked assignment probabilities

## 8. Analysis

Primary:

- initial-offer ITT
- block-weighted or design-weighted estimator
- randomization inference reproducing actual assignment
- prespecified covariate adjustment
- full randomized denominator

Secondary:

- first-stage enrollment/take-up
- IV/LATE only when assumptions hold
- stratum/package heterogeneity with multiplicity control
- missing-data and attrition bounds

Do not use:

- ever-offered naïve mean comparison;
- enrolled-versus-declined as-treated comparison;
- post-assignment financial variables as controls;
- rebalanced or manually swapped assignments; or
- Track A-versus-Track B outcomes as program effect.

## 9. Anchor Sources

- Morgan & Rubin rerandomization: https://doi.org/10.1214/12-AOS1008
- Bruhn & McKenzie small randomization: https://doi.org/10.1257/app.1.4.200
- Bugni, Canay, & Shaikh covariate-adaptive inference: https://doi.org/10.1080/01621459.2017.1375934
- de Chaisemartin & Behaghel randomized waitlists: https://doi.org/10.3982/ECTA16032
- Abdulkadiroğlu et al. market design: https://doi.org/10.3982/ECTA13925
- Angrist, Imbens, & Rubin IV/LATE: https://doi.org/10.1080/01621459.1996.10476902
- Frangakis & Rubin principal stratification: https://doi.org/10.1111/j.0006-341X.2002.00021.x
- Hernán & VanderWeele compound treatments: https://doi.org/10.1097/EDE.0b013e3182109296
- Dynarski et al. HAIL aid guarantee: https://doi.org/10.1257/aer.20200451
- Bettinger et al. FAFSA assistance: https://doi.org/10.1093/qje/qjs017
- Fairlie & Robinson technology experiment: https://doi.org/10.1257/app.5.3.211
- RFC 8785 JCS: https://www.rfc-editor.org/rfc/rfc8785.html
- RFC 5869 HKDF: https://www.rfc-editor.org/rfc/rfc5869
- RFC 8032 Ed25519: https://www.rfc-editor.org/rfc/rfc8032
- drand documentation: https://docs.drand.love/developer/
