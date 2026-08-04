# This repository

The GT School selection project ran from mid-2026 and was stopped on 2026-08-03.
All of its work — code, research, governance and the thinking behind it — is in
`archive/`. Start with `archive/README.md`, which indexes what was built, what was
never finished, and the findings worth not rediscovering the hard way.

New work starts in `docs/` — see `docs/README.md` for what has been established since the
reset and what is still open.

## If you want to run the archived project

Everything still works, but it now lives one directory down, so commands run from
`archive/` rather than here:

```bash
cd archive
pnpm install
pnpm test          # 1,288 tests
pnpm dev           # the exam surface at /dev/family-preview/exam
```

Its tooling config moved with it, including `.github/`. Continuous integration is
therefore switched off rather than failing on an archived tree — if you ever want
it back, move `archive/.github/` to the root.
