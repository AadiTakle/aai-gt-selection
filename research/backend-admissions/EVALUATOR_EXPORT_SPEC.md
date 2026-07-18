# Evaluator Export and Reproducibility Specification

## Release Tiers

1. **Restricted replay package**
   - Pseudonymous microdata in controlled workspace
   - Exact analysis replay

2. **Disclosure-reviewed report**
   - Approved tables/figures
   - No unnecessary microdata

3. **Public package**
   - Protocol, code, dictionaries, provenance, approved aggregates
   - Differential privacy only if separately designed

One public ZIP should not attempt both exact microdata replay and strong disclosure protection.

## Export Control Tables

Track:

- protocol/version/hash and lock time;
- export ID, purpose, access tier, source cutoff;
- PostgreSQL/migration/query/code/environment hashes;
- pseudonym scheme;
- file/row counts;
- variable dictionary;
- disclosure review;
- replay attempts and deviations.

## Pseudonymization

```text
study_token = base32(
  HMAC_SHA256(
    secret_study_key,
    domain || internal_student_uuid
  )
)
```

- Never hash low-entropy PII directly.
- Keys remain outside database/package.
- Use study-specific tokens only when longitudinal linking is needed.
- Use release-specific tokens otherwise.
- Pseudonymization is not anonymization.

Default exclusions:

- names/contact/auth IDs;
- exact birth dates/addresses/ZIP;
- IP/user-agent logs;
- financial documents;
- free text;
- raw narratives/artifacts;
- rare combinations unless analytically essential.

## Snapshot Workflow

1. Approve purpose, population, datasets, access, retention, and reviewer.
2. Lock canonical protocol before outcome access.
3. Externally sign/timestamp protocol hash.
4. Approve variable allowlist and dictionary.
5. Export from one PostgreSQL `REPEATABLE READ` snapshot.
6. Use explicit columns, deterministic formatting, and total sort order.
7. Generate pseudonyms in controlled process.
8. Run locked code against same snapshot.
9. Build package and checksums.
10. Conduct disclosure review.
11. Sign final package.
12. Replay in clean, network-disabled environment.
13. Record release, access, replay, revocation, and destruction.

## Package

```text
evaluator-export/
  bagit.txt
  bag-info.txt
  manifest-sha256.txt
  tagmanifest-sha256.txt
  tagmanifest-sha256.txt.sig
  ro-crate-metadata.json
  README.md
  data/
    analysis_population.csv
    assignment.csv
    outcomes.csv
  metadata/
    export-manifest.json
    protocol.json
    data-dictionary.csv
    provenance.jsonld
    disclosure-review.json
    environment.lock.json
    schema.sql
    query-set.sql
  code/
  results/
  replay/
```

BagIt verifies file fixity, not authorship. Sign the tag manifest with an independently held key.

## Data Dictionary Fields

For every column:

- definition;
- unit of analysis and measurement;
- physical/logical type;
- allowed/missing values;
- analytic role;
- source lineage and transformation;
- population/time window;
- sensitivity/identifiability;
- inclusion rationale;
- disclosure action;
- prohibited use;
- owner/version/retention.

## Environment Lock

Capture:

- Git commit and clean/dirty state;
- migration hashes/head;
- Supabase CLI and PostgreSQL versions;
- extension versions;
- locale/collation/time zone/architecture;
- Node/Python/R versions;
- lockfiles;
- OCI image digest;
- SBOM;
- random seeds and numerical tolerances.

## Differential Privacy

Do not use DP for restricted exact replay by default.

For public aggregates, preregister:

- protected unit;
- neighboring-data definition;
- contribution limits;
- mechanism;
- epsilon/delta;
- composition ledger;
- clipping/postprocessing;
- subgroup utility.

DP does not authorize collection/sharing and can destroy utility in small cohorts.

## Replay Acceptance

Evaluator must:

1. Verify checksums and signatures.
2. Load immutable environment without producer credentials.
3. Load package data only.
4. Run offline without producer caches.
5. Reproduce population, exclusions, missingness, probabilities, and estimands.
6. Match deterministic outputs exactly.
7. Match floating-point outputs within preregistered tolerance.
8. Regenerate tables/figures.
9. Produce signed replay attestation.
10. Independently implement the primary estimator or critical invariant.

## Tests

- Same snapshot/code produces byte-identical exports.
- Concurrent source changes do not create inconsistent tables.
- Input row order does not change output.
- No unapproved columns.
- No direct identifiers/free text/artifacts/linkage keys.
- One-byte mutation fails validation.
- Manifest substitution fails signature.
- Export role cannot access auth, storage, contact, finance, or linkage.
- Lockfile/environment rebuild works from clean machine.
- Null/harmful/inconclusive fixtures remain reportable.

## Sources

- NIST SP 800-188: https://csrc.nist.gov/pubs/sp/800/188/final
- NIST SP 800-226: https://csrc.nist.gov/pubs/sp/800/226/final
- RFC 8493 BagIt: https://www.rfc-editor.org/rfc/rfc8493
- RFC 8785 JCS: https://www.rfc-editor.org/rfc/rfc8785
- RFC 8032 Ed25519: https://www.rfc-editor.org/info/rfc8032/
- W3C PROV: https://www.w3.org/TR/prov-o/
- RO-Crate 1.3.0: https://www.researchobject.org/ro-crate/specification/1.3/index.html
- PostgreSQL snapshot sync: https://www.postgresql.org/docs/17/functions-admin.html#FUNCTIONS-SNAPSHOT-SYNCHRONIZATION
- National Academies reproducibility: https://www.nationalacademies.org/read/25303/chapter/2
