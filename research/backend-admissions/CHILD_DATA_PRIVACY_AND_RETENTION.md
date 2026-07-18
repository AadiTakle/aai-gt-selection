# Child Data Privacy, Retention, and Synthetic-Data Safety

## Executive Position

The safe four-week boundary is:

- adult-operated;
- local;
- born-synthetic;
- no real accounts, records, artifacts, images, audio, or identifiers;
- no analytics, telemetry, cloud AI, or external processors;
- no real admissions decision; and
- purgeable after demonstration.

“Synthetic” is provenance, not a privacy guarantee. Records generated from,
fitted to, prompted with, or lightly modified from real children are out of
scope.

This document is compliance-oriented research, not legal advice. A live pilot
requires qualified legal/privacy review.

## Current Legal Context — July 2026

This is a privacy-focused issue inventory, not a complete live-use legal review.
Before live admissions, qualified review must also consider disability and
public-accommodation duties (including ADA Title III, Section 504 where
applicable, and Texas Human Resources Code Chapter 121), 42 U.S.C. §1981,
research/IRB obligations, and then-current Texas youth/AI amendments including
SCOPE/TRAIGA. Listing them does not establish applicability.

### COPPA

The FTC's 2025 COPPA amendments:

- were published April 22, 2025;
- became effective June 23, 2025; and
- reached the general compliance deadline April 22, 2026.

For covered commercial operators collecting personal information online from
children under 13, the amended rule includes:

- separate parental consent for certain third-party disclosures;
- expanded identifiers, including government and biometric identifiers;
- detailed notices;
- a written security program and annual risk assessment;
- service-provider diligence and written assurances; and
- a written retention policy with no indefinite retention.

COPPA generally does not apply to information collected online from a parent
rather than directly from a child. Passive child telemetry can still matter.
Whether school authorization is available for an admissions workflow is not
established; direct parental consent is safer for future live work.

Official sources:

- https://www.federalregister.gov/documents/2025/04/22/2025-05904/childrens-online-privacy-protection-rule
- https://www.ecfr.gov/current/title-16/chapter-I/subchapter-C/part-312

### FERPA and PPRA

FERPA applies to education agencies/institutions receiving qualifying U.S.
Department of Education funds. DOE states private K–12 schools generally do not
receive those funds and generally are not covered. Applicants who never attend
also are not students in attendance.

Applicability still depends on:

- GT's legal entity and funding;
- whether records come from a covered school;
- whether GT/vendor acts for a public district;
- applicant versus enrolled-student status; and
- other service/placement arrangements.

PPRA similarly depends on entity/funding, respondent, and survey purpose.
Parent-completed admissions evidence is not automatically a student survey.

Sources:

- https://www.ecfr.gov/current/title-34/subtitle-A/part-99/section-99.1
- https://studentprivacy.ed.gov/faq/which-educational-agencies-or-institutions-does-ferpa-apply
- https://www.ecfr.gov/current/title-34/subtitle-A/part-98

### Texas

Potentially relevant, applicability-dependent sources include:

- Texas Data Privacy and Security Act, Chapter 541:
  https://tcss.legis.texas.gov/resources/BC/htm/BC.541.htm
- Identity-theft/security duties, Chapter 521:
  https://tcss.legis.texas.gov/resources/BC/htm/BC.521.htm
- Biometric identifier limits, §503.001:
  https://tcss.legis.texas.gov/resources/BC/htm/BC.503.htm
- School-purpose operator provisions, Education Code Chapter 32:
  https://tcss.legis.texas.gov/resources/ED/htm/ED.32.htm#32.151

The school, vendor, nonprofit, small-business, controller/processor, public-
education, Texas-resident, and automation facts are unresolved. Treat these as
legal-review inputs, not project conclusions.

## Privacy Engineering Principles

Privacy risk includes authorized but problematic data use, not just breaches.

For every field:

- purpose;
- authority/permission;
- necessity;
- data class;
- owner;
- permitted roles/recipients;
- decision use;
- correction behavior;
- retention trigger/duration;
- disposition;
- export rule; and
- prohibited reuse.

Use Hoepman's strategies:

- minimize;
- hide;
- separate;
- aggregate;
- inform;
- control;
- enforce; and
- demonstrate.

## Born-Synthetic Rule

Allowed:

- invented distributions and constraints;
- obvious fictional identifiers;
- template-generated text;
- PRNG seeds unrelated to people;
- fixed fixtures with provenance/license manifests.

Prohibited:

- real or lightly modified child records;
- real narratives, schoolwork, images, audio, video, or metadata;
- a real child record used as a “representative seed”;
- prompting an external model with child data;
- fitting a generator to GT records;
- screenshots or logs containing real applicants.

Synthetic datasets trained on real data can leak:

- source membership;
- rare/outlier attributes;
- exact or near-exact records;
- subgroup information.

Differential privacy can bound individual contribution only when the entire
mechanism—including preprocessing and tuning—is correctly accounted for. It
does not authorize collection or guarantee utility for small rare groups.

## Purpose-Separated Schemas

- `iam_private`: ownership/auth mapping
- `privacy_private`: access support, rights, lifecycle, export, hold placeholders
- `consent_private`: synthetic optional-choice sentinel only
- `admissions`: pseudonymous applications/assessments
- `evidence`: provenance and fixed synthetic fixture references
- `review`: assignments and ratings
- `policy`: rules, messages, retention policies
- `decision`: manifests, results, traces, notices
- `audit`: minimized typed events and disposition receipts
- `api`: narrow security-invoker views/RPCs

Finance, allocation, evaluation, live storage, and evaluator exports remain
inaccessible/unimplemented.

## Field Registry

```text
field_registry(
  field_id,
  schema_name,
  object_name,
  field_name,
  purpose_code,
  data_class,
  synthetic_only,
  source,
  subject_type,
  required,
  decision_use,
  export_rule,
  correction_rule,
  retention_policy_id,
  prohibited_uses,
  owner_role,
  lineage_ref,
  registry_version
)
```

Migration/fixture verification fails when a stored field lacks a registry entry.

Data classes:

- C0 approved public synthetic
- C1 internal pseudonymous
- C2 restricted private
- C3 integrity-critical
- C4 secrets outside application tables

## Retention Lifecycle

Live periods are unresolved. Synthetic tests use virtual clocks and duration
codes that cannot be promoted to production.

Backup deletion-ledger replay, content-free receipts, and the end-of-demo purge
are project engineering controls derived from lifecycle standards; NIST does not
mandate these exact procedures.

```text
retention_policy(
  policy_id,
  record_type,
  purpose_code,
  trigger_event,
  duration_code,
  disposition_action,
  backup_expiry_code,
  tombstone_policy_id,
  owner,
  approver,
  synthetic_only,
  version
)
```

States:

```text
retained
  -> disposition_due
  -> hold_suspended | primary_deleted
  -> backup_pending_expiry
  -> destroyed_verified
```

Immutability and retention are separate dimensions. Append-only does not mean
retain forever.

After allowed disposition:

- remove payloads, private links, caches, signed URLs, exports, and object
  associations;
- preserve shared public policies/code/fixture catalog;
- leave only a content-free disposition receipt;
- mark affected decisions `not_replayable_inputs_disposed`; and
- never report successful exact replay after inputs are gone.

Content-free receipt:

- disposition ID;
- record class;
- policy version;
- timestamps;
- result code;
- actor role.

Do not retain deleted payload hashes, applicant IDs, evidence, or reasons in the
receipt.

## Hold Placeholder

```text
retention_hold(
  hold_id,
  synthetic_only,
  scope_type,
  scope_selector,
  authority_reference,
  reason_code,
  requested_by,
  approved_by,
  starts_at,
  review_at,
  ends_at,
  state
)
```

The prototype does not determine legal validity. Holds pause disposition only;
they do not expand access, revive consent, or authorize new purposes.

## Consent Boundary

The repository currently promises a consent firewall while excluding consent
from the minimum contract.

MVP reconciliation:

- implement a synthetic optional-choice sentinel in `consent_private`;
- prove grant/refusal/withdrawal changes zero admissions inputs/results;
- do not call it legally effective consent management;
- keep evaluation datasets/exports disabled.

## Privacy-Safe Audit

Log:

- event code;
- pseudonymous actor;
- role;
- purpose;
- object class;
- operation result;
- correlation/causation IDs;
- policy version;
- timestamp.

Do not log:

- narratives/artifacts;
- raw scores;
- contact/access rationale;
- consent text;
- tokens, signed URLs, secrets;
- query strings;
- generic untyped payload blobs.

Audit logs are sensitive records with their own access/retention policy.

## Backups and Restore

- Govern backups as separate copies.
- Do not promise immediate selective deletion from immutable backups.
- Use `backup_pending_expiry`.
- A restore remains inaccessible until the deletion ledger is replayed.
- Verify backup expiry/sanitization separately.

## Service-Role Boundary

Supabase `service_role` bypasses RLS. “Server-only” is not least privilege.

For this MVP:

- prohibit `service_role` in ordinary Next.js requests and decision execution;
- reserve it for local seed/reset only;
- use user JWTs or dedicated non-bypass roles/RPCs;
- audit every privileged invocation;
- fail if a service key appears in source, logs, browser output, or request
  handlers.

## Fixture Provenance

Each fixed artifact has:

- synthetic declaration;
- author/source;
- creation method;
- license/use status;
- checksum;
- MIME type;
- metadata inspection;
- confirmation of no real name, face, voice, location, schoolwork, or embedded
  identifier.

No upload endpoint exists.

## Acceptance Fixtures

| ID | Test | Expected |
|---|---|---|
| FI-01 | Stored field missing registry entry | Migration/test fails |
| BD-01 | Any row synthetic flag false | Insert/config fails |
| FW-01 | Identity/access/consent/remedy mutations | Decision invariant |
| SR-01 | Service key scan | No client/log/source/request-handler occurrence |
| SR-02 | Ordinary request uses service role | Test fails |
| RT-01 | Virtual-clock expiry | One `disposition_due` transition |
| HD-01 | Hold pauses deletion | Access unchanged; authority ref required |
| DL-01 | Delete synthetic subject | Payloads removed; content-free receipt |
| DL-02 | Repeat deletion | Idempotent |
| RP-DEL-01 | Replay disposed decision | `not_replayable_inputs_disposed` |
| BK-01 | Restore backup | Deletion ledger applied before access |
| LG-01 | Forbidden canary strings | Absent from logs |
| EV-01 | Non-allowlisted fixture | Rejected |
| EX-01 | Family synthetic export | Own allowlisted fields/checksums only |
| EX-02 | Expired export | Unavailable |
| CN-01 | Choice grant/refusal/withdrawal | Admissions invariant |
| CN-02 | Evaluation/export access | Fail closed |
| LC-01 | Non-loopback/public tunnel/remote project | Startup fails |

## End-of-Demo Purge

Purge:

- local database and Auth users;
- Storage objects and signed links;
- generated exports;
- application logs;
- screenshots containing fixtures;
- Docker volumes;
- temporary files.

Retain only source-controlled, verified born-synthetic fixtures and code.
Record purge evidence. This is a demo lifecycle, not a production retention
policy.

## Key Sources

- NIST Privacy Framework 1.0:
  https://doi.org/10.6028/NIST.CSWP.01162020
- NISTIR 8062 privacy engineering:
  https://doi.org/10.6028/NIST.IR.8062
- NIST SP 800-188 deidentification:
  https://doi.org/10.6028/NIST.SP.800-188
- NIST SP 800-226 differential privacy:
  https://doi.org/10.6028/NIST.SP.800-226
- NIST SP 800-88 Rev. 2 sanitization:
  https://doi.org/10.6028/NIST.SP.800-88r2
- LINDDUN:
  https://doi.org/10.1007/s00766-010-0115-7
- Hoepman privacy design strategies:
  https://doi.org/10.1007/978-3-642-55415-5_38
- Stadler, Oprisanu, & Troncoso synthetic-data privacy:
  https://www.usenix.org/conference/usenixsecurity22/presentation/stadler
- GAN-Leaks:
  https://doi.org/10.1145/3372297.3417238
- Data copying:
  https://proceedings.mlr.press/v108/meehan20a.html
