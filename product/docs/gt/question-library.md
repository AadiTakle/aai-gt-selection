# Question-Library Maintenance

## Locations

- Bank records: `product/qbank-library/banks/*.jsonl`
- Standalone HTML renderers: `product/qbank-library/items/*.html`
- Loader and grading modes: `product/screener/packages/qbank/src/bank.ts`
- Retired types: `product/screener/packages/qbank/src/retired.ts`
- CogAT mapping: `product/screener/packages/ui-contract/src/cogat.ts`
- Catalogue compiler: `product/platform/packages/catalog/src/compile.ts`
- Catalogue publisher: `product/platform/functions/admin/src/publish.ts`
- Bank-review application: `product/screener/apps/bank-review/`
- Deployed review application: `product/deployed-apps/question-type-review/`

The catalogue currently contains 53 bank files and 7,319 records. The catalogue
golden test determines the current markable and excluded totals; do not maintain
those totals manually in documentation.

## Change an existing item

1. Identify the bank, item id, current scoring mode, renderer, and any deployed app using the type.
2. Classify the change:
   - Presentation only: copy, layout, styling, or renderer behavior that does not alter the response.
   - Content: prompt or distractor changes with the same intended key and construct.
   - Key or marking: any change to what counts as correct.
   - Parameter: difficulty, discrimination, option count, age band, or calibration status.
3. Preserve the old item and revision long enough to interpret existing traces.
4. Run the qbank tests, catalogue compiler tests, and renderer verification.
5. Review the changed type in the bank-review and deployed question-type review surfaces.
6. Publish a new catalogue snapshot.
7. For key or parameter changes, follow the rescore process rather than silently replacing prior results.

The administrative item-revision route currently supports registry revisions and
affected-session rescoring. Answer-key-only correction is not a separate
first-class workflow; treat such changes as high risk and document exactly how
the correction was represented.

## Add a question type

1. Add `product/qbank-library/banks/{TYPE-CODE}.jsonl`.
2. Add or identify a renderer.
3. Define the type's UI requirements.
4. Add its CogAT alignment decision, including an explicit `none` where it does not align.
5. Ensure at least one response can be marked server-side before approving the type for a consequential app.
6. Add validation and marking fixtures.
7. Review difficulty coverage and age-band behavior.
8. Compile and inspect the catalogue diff.
9. Publish a new snapshot.
10. Approve the type separately for each application that can render it.

Type records are treated as write-once definitions. A materially different
construct should receive a new versioned type code rather than mutating the
meaning of an existing type.

## Retire or withhold content

- Retire a defective type through `product/screener/packages/qbank/src/retired.ts`.
- Withhold an item for one app through that app's configuration.
- Do not delete historical records that appear in stored traces.
- Publish a new snapshot and pin or promote applications deliberately.

Retirement affects future selection. It does not erase the evidence or
parameters recorded when an older item was served.

## Validate

From `product/screener/`:

```bash
npm run typecheck
npm test
npm run smoke
npm run api:spec
```

From `product/platform/` with DynamoDB Local available:

```bash
npm test
npm run typecheck
npm run synth
```

From `product/qbank-library/`:

```bash
python3 build-index.py
python3 verify.py
```

Relevant focused checks include:

- `product/platform/packages/catalog/src/catalog.test.ts`
- `product/screener/packages/qbank/src/qbank.test.ts`
- `product/screener/packages/qbank/src/cogat-alignment.test.ts`
- `product/screener/packages/qbank/src/numeric-key.test.ts`
- `product/screener/packages/qbank/src/openapi.test.ts`
- `product/screener/scripts/audit-item-validity.py`

## Publish and roll back

Publishing compiles bank records into registry items, revisioned answer keys, and
an immutable selection-index snapshot. A session records its snapshot id when it
starts.

Before publishing:

1. Record the previous snapshot id.
2. Review the compiler's added, revised, retired, and excluded counts.
3. Run the full platform path against local storage.
4. Verify every approved app can render its approved types.

To roll back future sessions, set the app's `pinnedSnapshotId` to the previous
snapshot through maintainer store tooling. There is currently no HTTP route for
updating that field. Existing sessions remain pinned to the snapshot and
resolved configuration they started with.

## Calibration warning

Current difficulty values are authoring judgements transformed by:

```text
b = (difficulty - 10.5) / 3
```

That is a rescaling, not calibration against children. The compiler marks items
as uncalibrated, and no production claim should imply otherwise. Read
`product/docs/overnight/README.md` before changing thresholds or describing the
scores externally.
