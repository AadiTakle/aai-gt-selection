# Canonicalization, Hashing, and Replay Blueprint

## Status

Candidate v1 for the local synthetic backend. No replay implementation or test
has run. Exact replay claims remain prohibited until the merge-blocking vectors
and cold-replay tests pass.

## Replay Terms

- **Exact re-execution:** Run the retained executable with exact immutable
  inputs, policy, configuration, and relevant environment; reproduce outcome,
  ordered reasons, trace, and commitments.
- **Digest verification:** Recompute a digest over supplied bytes and compare
  with a trusted digest. This proves byte equality only.
- **Record reconstruction:** Display the stored result/trace/provenance without
  executing code.
- **Not replayable:** Required input, executable, or environment artifact is
  unavailable.

Replayability does not establish correctness, fairness, or causal validity.

## Canonical Profile

Profile identifier:

```text
sha256+jcs-rfc8785+gt-v1
```

Every hashed object is a strict JSON tree:

- UTF-8, no BOM;
- unique object names;
- no lone surrogates or noncharacters;
- no NaN, infinity, or negative zero;
- no getters, proxies, `toJSON`, or mutable objects;
- unknown fields rejected;
- arrays preserve protocol-defined order;
- Unicode is not normalized inside canonicalization.

Validate raw bytes before `JSON.parse` or PostgreSQL `jsonb`, because both can
erase duplicate-key evidence.

## Scalar Rules

### Integers

JSON numbers only for integers in:

```text
[-9007199254740991, 9007199254740991]
```

Versions, slots, ordinals, ratings, and trace sequences use these integers.

### Decimals

Scores, thresholds, probabilities, money, and measured quantities use strings:

```text
-?(0|[1-9][0-9]*)(\.[0-9]*[1-9])?
```

No exponent, leading zero, plus sign, trailing fractional zero, or `-0`.

Examples:

- valid: `"90"`, `"89.5"`, `"0.125"`
- invalid: `90.0`, `"090"`, `"89.50"`, `"-0"`

### UUIDs

Lowercase RFC 9562 form:

```text
8-4-4-4-12
```

Parse and re-emit; never regenerate during replay.

### Dates and timestamps

Decision inputs use `YYYY-MM-DD` when time is irrelevant.

Operational timestamps are excluded from decision input/result hashes.

Audit timestamps use uppercase UTC RFC 3339 with six fractional digits:

```text
YYYY-MM-DDTHH:mm:ss.ffffffZ
```

Do not round-trip microsecond audit timestamps through JavaScript `Date`.

## JCS and Hash Envelope

Canonicalize the complete semantic envelope:

```json
{
  "domain": "gt-selection/decision-input",
  "profile": "sha256+jcs-rfc8785+gt-v1",
  "schema": "urn:gt-selection:input-manifest:v1",
  "payload": {}
}
```

Then:

```text
canonical_bytes = RFC8785_JCS(envelope) encoded UTF-8
digest = "sha256:" + lowercase_hex(SHA256(canonical_bytes))
```

Domains are distinct:

- `gt-selection/input-projection`
- `gt-selection/input-manifest`
- `gt-selection/policy-document`
- `gt-selection/policy-bundle`
- `gt-selection/code-manifest`
- `gt-selection/decision-manifest`
- `gt-selection/review-submission`
- `gt-selection/decision-trace`
- `gt-selection/decision-result`
- `gt-selection/supersession`
- `gt-selection/audit-genesis`
- `gt-selection/audit-event`
- `gt-selection/replay-report`

A schema/profile interpretation change requires v2. Historical bytes are never
regenerated under a new profile.

## Storage Rule

TypeScript creates and retains canonical bytes.

PostgreSQL stores:

- `payload jsonb` for querying;
- `canonical_bytes bytea` as authoritative hash input;
- `canonical_profile`;
- `schema_id`;
- `digest_algorithm`;
- `digest bytea`.

Never hash:

- `jsonb::text`;
- unordered SQL aggregates;
- default timestamp output;
- locale/collation-dependent order; or
- floating-point text.

PostgreSQL may verify:

```sql
digest(canonical_bytes, 'sha256')
```

The database does not re-canonicalize historical objects.

## Input Projection

Hash only an allowlisted decision projection, never the whole row.

Example:

```json
{
  "schema": "urn:gt-selection:input-projection:v1",
  "kind": "assessment_version",
  "id": "00000000-0000-4000-8000-000000000201",
  "version": 1,
  "projection": "routing_v1",
  "fields": {
    "composite_score": "89.5",
    "verbal_score": "89",
    "quantitative_score": "89",
    "nonverbal_score": "89",
    "validity": "valid"
  }
}
```

Private/prohibited fields never enter this projection or its hash.

## Input Ordering

References sort by:

1. role rank: application, assessment, snapshot, evidence, review;
2. ordinal;
3. kind;
4. lowercase ID;
5. integer version.

Review submissions sort by assignment slot.

Policy members have fixed order:

1. Track A
2. Track B invitation
3. rubric
4. Track B eligibility

Reason codes follow one locked policy `reason_order`. Database row/insertion
order never determines reasons.

## Code and Environment Manifest

`code_version` is display-only. Replay authority uses:

- source commit and source-tree digest;
- frozen lockfile digest;
- built-artifact digest;
- engine semantic version;
- Node/runtime/platform;
- migration digest;
- PostgreSQL major and extension versions;
- database encoding;
- collation/time-zone settings relevant to execution;
- container digest if retained.

A digest does not guarantee the artifact remains available. Retain the exact
artifact/package required for replay.

Replay execution prohibits:

- network access;
- current time;
- randomness;
- mutable external state;
- undeclared locale/collation;
- volatile database functions.

## Decision Root Commitment

Decision manifest binds:

- decision kind;
- input-manifest hash;
- policy-bundle hash;
- code-manifest hash;
- engine flags.

Decision result binds:

- decision-manifest hash;
- outcome;
- ordered reason codes;
- trace hash.

The result hash is the single decision-root commitment. Mutating/swapping any
input, policy, code artifact, engine flag, outcome, reason ordinal, or trace
step changes it.

Run IDs, operational timestamps, notice delivery, and supersession links are
excluded from the deterministic result.

## Trace

Executed steps are contiguous and ordered:

```json
{
  "seq": 1,
  "rule_node_id": "TA-001",
  "predicate_code": "ASSESSMENT_VALID",
  "input_ref_ordinals": [0],
  "predicate_result": true,
  "status": "evaluated",
  "emitted_reason_codes": []
}
```

No free text, actor identity, copied private fields, or operational timestamp.

## Correction and Supersession

- Original input/result remains immutable.
- Decision-used correction creates a new input projection, manifest, trace, and
  result.
- One predecessor has at most one active successor.
- Private/prohibited correction creates no decision and leaves decision hashes
  unchanged.
- Finalization/correction race cannot mix versions: the old run uses its frozen
  manifest; a successor runs afterward.

## Audit Chain

One v1 ledger uses:

- one genesis;
- unique contiguous sequence;
- explicit previous hash;
- serialized append transaction;
- semantic-object hash;
- domain-separated event hash.

Sequence allocation and event insertion occur in the same serialized
transaction. Concurrency tests verify no fork/gap.

The internal chain constrains application-role mutation. Database-owner tamper
detection requires a prior externally retained signed checkpoint, which is
outside the two-week MVP.

## Replay Statuses

- `reexecuted_exact`
- `record_reconstructed`
- `digest_verified`
- `not_replayable_missing_artifact`
- `not_replayable_inputs_disposed`
- `failed_integrity_check`
- `failed_execution_mismatch`

Do not report exact replay when only hashes remain.

Failure precedence:

1. unsupported schema/profile;
2. invalid canonical bytes;
3. missing reference;
4. input projection/hash mismatch;
5. policy missing/hash mismatch;
6. executable unavailable/hash mismatch;
7. environment unavailable/mismatch;
8. engine error;
9. outcome mismatch;
10. reason-order mismatch;
11. trace mismatch;
12. result-root mismatch;
13. audit-chain mismatch.

## Pseudocode

```text
replay(run):
  validate stored canonical profile/schema
  verify canonical bytes and all projection hashes
  verify input manifest and policy bundle
  verify retained code/environment artifact

  if input payload disposed:
    return not_replayable_inputs_disposed
  if executable unavailable:
    return not_replayable_missing_artifact

  execute offline from frozen manifest
  compare outcome
  compare ordered reasons byte-for-byte
  compare trace
  compare decision-root commitment
  append replay audit event
  return reexecuted_exact
```

## Merge-Blocking Tests

1. `CAN-01`: RFC 8785 vectors plus duplicate keys, Unicode, unsafe numbers,
   decimals, timestamps, UUIDs, absent/null, and domain/schema vectors.
2. `HASH-01`: Every committed component mutation invalidates decision root.
3. `RP-01`: Network-disabled cold replay in a clean retained environment.
4. `RP-02`: Missing artifact and disposed input refuse exact replay.
5. `AUD-01`: Concurrent append yields one chain with no fork/gap.
6. `AUD-02`: Owner rewrite can defeat internal chain; external checkpoint
   detects covered-history change.
7. `IDEM-01`: Concurrent same-key/same-payload gives one effect/same response;
   different payload gives stable conflict.
8. `CC-01`: Vote/third, abstention/replacement, double finalization,
   correction/finalization, and double-correction races yield one valid
   transition.
9. `DBOWN-01`: Owner, executor, authenticated, service-role, and superuser
   bypass behavior is explicitly tested/reported.

## Official Sources

- RFC 8785 JCS: https://www.rfc-editor.org/rfc/rfc8785
- RFC 8785 errata: https://www.rfc-editor.org/errata/rfc8785
- RFC 8259 JSON: https://www.rfc-editor.org/rfc/rfc8259
- RFC 7493 I-JSON: https://www.rfc-editor.org/rfc/rfc7493
- RFC 9562 UUIDs: https://www.rfc-editor.org/rfc/rfc9562
- FIPS 180-4 SHA-256:
  https://csrc.nist.gov/pubs/fips/180-4/upd1/final
- PostgreSQL JSON:
  https://www.postgresql.org/docs/18/datatype-json.html
- PostgreSQL numeric:
  https://www.postgresql.org/docs/18/datatype-numeric.html
- PostgreSQL ordering:
  https://www.postgresql.org/docs/18/queries-order.html
- PostgreSQL pgcrypto:
  https://www.postgresql.org/docs/18/pgcrypto.html
- W3C PROV-DM: https://www.w3.org/TR/prov-dm/
- SLSA build provenance: https://slsa.dev/spec/v1.2/build-provenance
