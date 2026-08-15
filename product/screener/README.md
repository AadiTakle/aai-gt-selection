# GT Screener and Measurement Library

This project contains the live qbank engine, shared measurement primitives,
Bramblebrook, the prototype screener, and internal library tools.

Start with:

- `../docs/gt/testing-and-demos.md` — open every app, debug surface and test suite.
- `../docs/gt/engine-scoring-and-rescoring.md` — engine, trace and score semantics.
- `../docs/gt/question-library.md` — update, review and publish question content.
- `../docs/gt/http-integration.md` — integrate an application without importing code.

## Quick start

```bash
cd product/screener
npm install
npm run dev
```

- Web application: <http://127.0.0.1:5180>
- Express prototype API: <http://127.0.0.1:5181>

The web application exposes:

- qbank and generator-driven screening
- practice
- the playable question catalogue
- generator-library studio
- session statistics
- an engine-debug tray during a screening session

## Verification

```bash
npm run verify       # typecheck, tests, generator simulation and HTTP smoke
npm run build        # prototype web production build
npx vite build --config vite.sanctuary.config.ts
npm run api:spec     # regenerate the bank OpenAPI document
```

Run focused suites:

```bash
npm test -- packages/qbank/src
npm test -- packages/engine/src/engine.test.ts
npm test -- packages/ui-contract/src
```

Do not copy test totals into documentation. Let the current command output report
the count.

## Which engine is live

`packages/qbank/` is the live adaptive bank engine. It owns:

- bank loading and markability
- grading
- item selection
- posterior updates
- domain and composite estimates
- stopping rules
- recommendation and pass routes
- the HTTP wire contract

`packages/engine/` supplies posterior, item-response and Fisher-information
primitives used by qbank. It also contains the older generator session and the
simulation run by `npm run sim`.

`packages/item-library/` is the generator-based content library paired with that
older session. It remains useful for the prototype, practice and deterministic
generator demonstrations, but it is not the deployed qbank content source.

## Layout

```text
product/screener/
├── apps/
│   ├── sanctuary/       Bramblebrook
│   ├── web/             prototype screener, practice, catalogue and studio
│   ├── api/             Express prototype API
│   ├── bank-review/     internal bank review
│   ├── theme-planner/   UI capability and theme planning
│   ├── lab-character/   character-led experiments
│   └── lab-system/      system-and-reward experiments
├── packages/
│   ├── qbank/           live adaptive bank engine and wire contract
│   ├── engine/          posterior/IRT primitives and older generator session
│   ├── item-library/    generator registry and snapshots
│   ├── contracts/       shared types
│   ├── practice/        practice behavior
│   ├── stats/           session statistics
│   └── ui-contract/     presentation capabilities and CogAT mapping
└── scripts/             smoke, validity, practice and OpenAPI tools
```

## Question-bank path

The fixed item content lives in `../qbank-library/`:

- 53 JSONL bank files
- 7,319 records
- 52 standalone HTML renderers

The current markable and exclusion totals are asserted by
`../platform/packages/catalog/src/catalog.test.ts`. Do not maintain a second
count in prose.

Difficulty is mapped to logits as `(difficulty - 10.5) / 3`. This is a rescaling
of authoring judgement, not calibration against children.

## Applications

### Bramblebrook

```bash
cd product/platform
npm run ddb:start
npm run seed:bramblebrook
npm run dev:local

# Another terminal
cd product/screener
npm run sanctuary
```

Open <http://127.0.0.1:5230>. See `apps/sanctuary/PLATFORM.md`.

Useful adult-only URL modes:

- `?demo=1` — self-contained browser demo; contains answer keys and is not consequential screening.
- `?reset=1` — clear Bramblebrook-owned local state once.
- `?perf=1` — development performance probe.

### Internal tools

```bash
npm run review          # http://127.0.0.1:5191
npm run planner         # http://127.0.0.1:5190
npm run lab:character   # http://127.0.0.1:5210
npm run lab:system      # http://127.0.0.1:5220
```

The lab applications also require their documented prototype API process.

## Security and measurement limits

- Answer keys are stripped before consequential items reach an app.
- Rapid guesses and unperceived responses may be retained as unscorable rather than incorrect.
- The bank is uncalibrated and no real child has validated its difficulty scale.
- `npm run sim` exercises the older generator session; use the platform measurement scripts for the deployed qbank path.
- Bramblebrook `?demo=1` deliberately ships keys for an offline adult demo.

Read `../docs/overnight/README.md` before interpreting or changing measurement
thresholds.
