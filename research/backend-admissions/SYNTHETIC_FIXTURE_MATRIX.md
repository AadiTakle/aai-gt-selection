# Synthetic Fixture and Acceptance Matrix

## Frozen Test Policy

`PB-SYN-01`, fictional only:

- Track A: valid composite ≥90
- Track B invitation below A:
  - composite 70–<90; or
  - any battery ≥90
- Artifact: two reviews, third on disagreement
- Narrative: three reviews
- Majority requires two matching classifications
- Three-way split: `pending_no_majority`
- Invalid/inaccessible evidence: pending

Rubric `RB-SYN-01`:

- DE domain expertise
- LR learning rate
- TA transfer/abstraction
- IN independence
- RE recurrence, diagnostic only
- SP specificity

Qualifies when:

- DE=2;
- max(LR,TA)=2;
- IN≥1;
- SP≥1;
- no decision-critical uninterpretable dimension.

## Assessment Fixtures

| ID | Composite/V/Q/N | Expected |
|---|---|---|
| SC-A95 | 95/94/96/95 | Track A |
| SC-A90 | 90/88/91/89 | Track A exact boundary |
| SC-B89 | 89/88/89/88 | Track B composite invitation |
| SC-B70 | 70/65/69/68 | Track B lower boundary |
| SC-BAT | 65/58/90/61 | Track B battery invitation |
| SC-BOTH | 85/91/88/87 | Both B reasons |
| SC-OUT | 69/89/89/89 | Not invited |
| SC-DEC | 89.5/89/89/89 | No rounding to A |
| SC-MISS | missing composite | Pending assessment |
| SC-INV | invalid score | Pending assessment |
| SC-CORR | v1=89, v2=90 | Successor changes route |
| SC-RETEST | original 88, retest 92 | Decision uses pinned version |

## Review Fixtures

| ID | DE/LR/TA/IN/RE/SP | Result |
|---|---|---|
| RV-Q | 2/2/1/1/1/2 | qualifies |
| RV-N-DE | 1/2/2/2/2/2 | does not currently qualify |
| RV-N-CAP | 2/1/1/2/2/2 | does not currently qualify |
| RV-N-IN | 2/2/2/0/2/2 | does not currently qualify |
| RV-P | 2/2/2/1/1/U | pending |

## Routing

| ID | Action | Expected |
|---|---|---|
| TA-01 | SC-A95 | A eligible; B not applicable |
| TA-02 | SC-A90 | Inclusive A boundary |
| TA-03 | SC-DEC | A not eligible; B invited |
| TA-04 | All scores B off/on | Track A result/reasons identical |
| TA-05 | SC-MISS | Pending |
| TA-06 | SC-INV | Pending |
| TA-07 | SC-CORR v1/v2 | Historical v1 unchanged; successor A |
| TA-08 | SC-RETEST pinned original | Remains B until explicit successor |
| TB-01 | SC-B70 | Invited by composite |
| TB-02 | 89.999 | Invited, no rounding |
| TB-03 | SC-BAT | Invited by battery |
| TB-04 | SC-BOTH | Both ordered reasons |
| TB-05 | SC-OUT | Not invited |
| TB-06 | Track A plus high battery | B not applicable |
| TB-07 | Newly invited | Snapshot required, not eligible |
| TB-08 | Unlocked policy | pending_policy_configuration |

## Review Aggregation

| ID | Route/votes | Expected |
|---|---|---|
| AR-01 | Artifact Q,Q | qualifies; no third |
| AR-02 | Artifact N,N | does not currently qualify |
| AR-03 | Artifact Q,N | pending additional blind review |
| AR-04 | Q,N then Q | qualifies |
| AR-05 | Q,N then N | does not currently qualify |
| AR-06 | Q,N then P | pending no majority |
| AR-07 | Missing provenance | pending evidence correction |
| AR-08 | Inaccessible fixture | pending accessibility route |
| NR-01 | Narrative Q,Q,N | qualifies |
| NR-02 | Narrative N,N,Q | does not currently qualify |
| NR-03 | Narrative Q,N,P | pending no majority |
| NR-04 | Narrative first two agree | Third still required |
| NR-05 | Narrative finalizes after two | Rejected |

## Corrections and Pending

| ID | Action | Expected |
|---|---|---|
| PN-01 | Create pending | Owner/reason/deadline/route required |
| PN-02 | Deadline passes | Pending/escalated, never DNQ |
| PN-03 | DNQ from invalid evidence | Rejected |
| PN-04 | No accessible route | Pending and protected deadline pause |
| CR-01 | Correct submitted evidence | New immutable successor |
| CR-02 | Decision-used correction | New decision run |
| CR-03 | Score correction 89→90 | Successor changes B→A |
| CR-04 | Prohibited field correction | Decision unchanged |
| CR-05 | Replay old/new | Both reproduce |
| CR-06 | New later-cycle evidence | New case, no prior penalty |

## Prohibited-Field Invariance

Mutate individually and jointly:

- prose/formatting/enthusiasm;
- income/W-2/aid/household/ZIP;
- school/recommender prestige;
- paid enrichment/material polish;
- awards;
- disability/accommodation;
- referral/advocacy;
- recommender availability;
- demographics;
- research consent.

Expected:

- identical routing, eligibility, ordered reasons, and canonical decision-input hash.

## Replay and Concurrency

| ID | Test | Expected |
|---|---|---|
| RP-01 | Replay completed run | Exact output/reasons/hashes |
| RP-02 | Alter input bytes | Input-hash failure |
| RP-03 | Alter policy bytes | Policy-hash failure |
| RP-04 | Code unavailable | Fail closed |
| CC-01 | Duplicate submission | One lock; conflict |
| CC-02 | Simultaneous Q/N artifact votes | Exactly one third assignment |
| CC-03 | Simultaneous matching artifact votes | No third assignment |
| CC-04 | Duplicate third creation | Unique slot permits one |
| CC-05 | Three narrative votes | One aggregate transition |
| CC-06 | Finalization retry | Idempotent |
| CC-07 | Correction during run | Old/new manifests never mix |
| CC-08 | Policy lock during run | One complete bundle |

## RLS

Minimum denial/allow matrix:

- Family: own draft/status only
- Admissions: pseudonymous applications/assessments
- Reviewer: assigned evidence and own submission only
- Supervisor: assigned third review, prior ratings hidden
- Policy admin: draft/lock policy, no decision edits
- Auditor: read/replay only
- Privacy steward: private access, no eligibility mutation
- Anonymous: no application data
- All MVP roles: no future finance/allocation/evaluation

Test direct REST/RPC access, not only UI.

## Property Invariants

1. Deterministic replay
2. Track A noninterference
3. Prohibited-field noninterference
4. Consent firewall
5. Accommodation equivalence
6. Invitation does not imply eligibility
7. Track B requires invitation and majority
8. Third artifact review iff initial votes differ
9. Narrative requires three votes
10. Pending never silently rejects
11. Submitted versions immutable
12. Corrections create successors
13. Reviewer blindness
14. RLS isolation
15. Missing/unlocked inputs fail closed
16. Applicant notices avoid admission/program-effect claims
