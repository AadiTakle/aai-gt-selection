# Governance note — real school search in the family application

## What changed
The current-school picker now searches the **real** U.S. public-school directory
(NCES Common Core of Data, via the free Urban Institute Education Data API)
instead of a small synthetic fixture. Families pick their state, then type to find
their actual school.

- Server route: `apps/web/src/app/api/schools/route.ts` (state-scoped, cached,
  trimmed; runs server-side so it is not subject to the browser CSP).
- UI: `apps/web/src/components/family/school-search.tsx`.

## Why this needs review (B-06 / D-013 born-synthetic policy)
The prototype is deliberately **born-synthetic** — no real institutional or
personal data enters storage. This feature introduces **real, public, non-PII
institutional data** (school names/addresses) into the *view* layer.

To stay inside the existing contract, **what is persisted is still synthetic**:
on submit, `draft-mapper.ts` maps the chosen school to an `other` snapshot with
the born-synthetic transform applied (name gets the `Synthetic` prefix, region
becomes a `SYN_REGION_*` code, postal `00000`). The real school name is shown
in-session only and is **never stored verbatim** today.

## Open decision for backend (Aadi)
If we want to **persist the real school name/NCES id** (useful, and school
identity is already excluded from eligibility inputs), the shared
`@gt-selection/contracts` `schoolSnapshotSchema` must be relaxed to allow real
names for the directory case, and a real `school_directory` ingest (or an
`ncessch` reference column) added. That is a contract + schema change in the
backend domain and should be ratified before flipping it on.

Until then: real search in the UI, synthetic-safe snapshot in storage.

## Operational notes
- The upstream API only filters efficiently by **state**; a name query streams
  the full ~100k-row/11MB dump and times out. The route therefore fetches one
  state at a time and caches it in-process (24h TTL); the client type-filters.
- No API key required. If Urban Institute is unreachable, the picker shows
  "no matches" and the family can choose "not listed" and type the school by hand.
