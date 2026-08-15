# GT Selection — live demo instance

## Open this

**http://localhost:4100**

## How to get in

Go to <http://localhost:4100/login> and click **“Continue as guest”**. That is the whole login.

If you'd rather type credentials, both work:

- email: `family@example.test`
- password: `Synthetic-Only-2026!`

## Go straight to the exam

**http://localhost:4100/family/exam?telemetry=1**

(the route is `/family/exam`, not `/exam`. You must be signed in first — otherwise it
bounces you to `/login`.)

`?telemetry=1` turns on debug mode: each question gets an **Emulate (θ …) →** button that
answers the item at the current ability estimate. Clicking Emulate ~40 times walks the whole
Phase 1 exam in under a minute. **Verified working on this build.** Drop `?telemetry=1` for
the clean parent-facing view.

## Pinned commit

`54bd73668a9b3ec7fac69fa8a6a80c08cd41154b` — detached HEAD, deliberately not on a branch.

It is the most recent `origin/dev` commit with a green CI run (run `30529382022`, Monorepo CI,
conclusion `success`, 2026-07-30T09:06:46Z — "Merge PR #21: scorer-input hash parity with
Postgres, and declared item-bank shipping with loud failure"). Detached HEAD means no other
agent pushing to `dev` can move this instance under you.

## What works (verified by actually clicking it, not by inspection)

| Check | Result |
| --- | --- |
| `GET /` | 200 |
| `GET /login` | 200 |
| `GET /api/health` | 200 — `{"application":"ready","databaseApi":"ready","examItemBank":"ready","status":"ready","syntheticOnly":true}` |
| `GET /api/exam-items?index=1` | 200 — **5,638 items across 48 type codes** |
| `GET /api/exam-items?itemId=…` | 200 — full stimulus content, no answer keys leaked |
| `GET /family/exam` unauthenticated | 307 → `/login?redirect=%2Ffamily%2Fexam` (correct) |
| Guest sign-in → `/family` | works, real `family`-role JWT (`user_role: family`, `synthetic_only: true`) |
| Question renders | yes — Q1 `QUANT-MIX-01` "Fair Share", 27 interactive elements in the item frame |
| Adaptive selection | yes — walked Q1–Q7 across quantitative, spatial, verbal, fluid reasoning |
| Full Phase 1 run | yes — 40 emulated items → per-area results screen, then offers the Phase 2 learning block |
| Console / failed requests | none |

## Known issues

1. **Guest sign-in was broken; fixed here as an UNCOMMITTED local edit.** See below. Needs a
   proper fix on a real branch.
2. Node is v25.9.0 but the repo wants 24.x, so `pnpm` prints an "Unsupported engine" warning on
   every command. Harmless for the app, but it **breaks `pnpm db:users`**: that script does
   `JSON.parse` on `pnpm exec supabase status -o json`, and the warning pollutes stdout. Work
   around it by passing the values directly (see "If sign-in stops working").
3. Phase 2 (the learning block) was reachable and offered but not run to completion here.

## The one uncommitted local change

`apps/web/src/lib/csp.ts` — `buildContentSecurityPolicy()` only widened `connect-src` beyond
`'self'` when `GT_DEPLOY_MODE === 'hosted'`. In local dev that leaves `connect-src 'self'`,
but local Supabase listens on **:65421** while the app is on **:4100** — a different origin.
So the browser's `signInWithPassword` POST to `http://127.0.0.1:65421/auth/v1/token` was
blocked by CSP, every browser-side sign-in failed (guest, password, magic link, sign-up), and
`/family/exam` therefore always 307'd back to `/login`. **This is the guest-access bug.**

The credentials themselves were never wrong — a server-side `curl` password grant returned 200
the whole time. It was purely the browser being blocked.

The local edit also widens `connect-src` when the Supabase URL is loopback. Header is now:

```
connect-src 'self' http://127.0.0.1:65421 ws://127.0.0.1:65421
```

This is a real bug affecting all local dev, not just this instance. It should be fixed properly
on a `feat/*` branch. **Nothing has been committed.**

Also uncommitted, and both are throwaway scratch files you can delete:
`apps/web/gt-verify-exam.mjs`, `apps/web/gt-verify-guest.mjs` (the Playwright checks above).

## Restart / stop

```bash
cd "../gt-live-demo"
./stop.sh     # stop it
./start.sh    # start it again on 4100
tail -f dev-server.log
PORT=4200 ./start.sh   # different port if 4100 is ever taken
```

`start.sh` detaches into its own session, so it survives closing the terminal. Plain `nohup … &`
does **not** — it still dies with the parent shell's process group, which is why the first
attempt went down.

## Dependencies

- Local Supabase must be up. This instance **reuses** the already-running
  `supabase_*_gt-selection-capstone` stack (Kong :65421, DB :65422, Studio :65423). No second
  stack was started. Check: `curl http://127.0.0.1:65421/auth/v1/health`.
- Env lives in `apps/web/.env.local`, copied from the main checkout (points at :65421, enables
  the local synthetic adapter and `GT_EXAM_EMULATE_ENABLED=true`).
- Item banks are committed in the repo at `research/exam-question-types/banks/*.jsonl`
  (51 files) — no seeding needed.

## If sign-in stops working

The synthetic Auth users live in the shared local Supabase; if something wipes them, re-seed
(env vars passed directly to dodge issue #2 above):

```bash
cd "../gt-live-demo"
SUPABASE_URL="http://127.0.0.1:65421" \
SUPABASE_SECRET_KEY="$(pnpm exec supabase status -o json 2>/dev/null | python3 -c 'import json,sys;print(json.loads(sys.stdin.read()[sys.stdin.read().find("{"):] if False else open("/dev/stdin").read())["SERVICE_ROLE_KEY"])' 2>/dev/null)" \
  pnpm db:users
```

Simplest reliable version — grab `SERVICE_ROLE_KEY` from `pnpm exec supabase status -o json`
by eye, then:

```bash
SUPABASE_URL="http://127.0.0.1:65421" SUPABASE_SECRET_KEY="<paste SERVICE_ROLE_KEY>" pnpm db:users
```

Expected output: `Local synthetic Auth users ready: 7`. It is idempotent and only creates
fictional `@example.test` accounts, all with password `Synthetic-Only-2026!`
(`family@example.test`, `admissions@example.test`, `reviewer@example.test`,
`supervisor@example.test`, `auditor@example.test`, `privacy@example.test`,
`family-two@example.test`).

All data here is synthetic; every result is `validated=false` and is a screening signal only.
