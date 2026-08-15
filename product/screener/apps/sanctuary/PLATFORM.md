# Running Bramblebrook on the question platform

From a clean clone, in this order. Four terminals, or four commands and two background processes.

```bash
# 1. Storage. DynamoDB Local in Docker, on 8456.
cd product/platform && npm install && npm run ddb:start

# 2. A catalogue and the Bramblebrook app. Prints an api key once and writes it to
#    product/screener/data/sanctuary/platform-app.json, which is the only copy — the platform keeps a digest.
npm run seed:bramblebrook

# 3. The platform, on 5210. Runs the real Lambda handlers; no AWS, no credentials.
npm run dev:local

# 4. The game, on 5230.
cd ../screener && npm install && npm run sanctuary
```

Then set the game's two environment variables. Vite reads them at build time, so put them in
`product/screener/.env.local`:

```
VITE_GT_PLATFORM_URL=/platform
VITE_GT_APP_KEY=<the apiKey from product/screener/data/sanctuary/platform-app.json>
```

`product/screener/.env.local` and not `apps/sanctuary/.env.local`, which needs saying because Vite's `envDir` defaults
to `root` and this config's root is the app directory. `vite.sanctuary.config.ts` sets `envDir` back to the
screener root to make the path above the true one. If you move the file, the game will load, walk and draw a
station perfectly well, and then be refused for a missing `x-api-key` the moment it asks for a question —
the failure lands a long way from the cause.

Vite reads env files once at startup, so **restart the game after writing the file**, not just reload.

`/platform` is proxied to `http://127.0.0.1:5210` by `vite.sanctuary.config.ts`, which strips the prefix. The
client's paths are therefore exactly the wire contract's, and pointing at a deployed stack means changing
`VITE_GT_PLATFORM_URL` to its base URL and nothing else.

## Open it

- Local platform-backed game: <http://127.0.0.1:5230>
- Live sandbox game: <https://d14xlnxxtsczg9.cloudfront.net>
- Offline adult demo: <https://d14xlnxxtsczg9.cloudfront.net/?demo=1>

Adult-only local modes:

- `?demo=1` runs a self-contained browser session and touches no platform data. It contains answer keys.
- `?reset=1` clears Bramblebrook-owned local state once and removes the flag from the URL.
- `?perf=1` enables the development performance probe.

See `../../../docs/gt/testing-and-demos.md` for the complete app and test matrix.

## What changed, and what did not

**Not changed:** the world, the slimes, the vacpack, the economy, the audio engine, and every 3D item
presentation. They receive `content` and call `onPick(handed)`, exactly as before, and none of them can see
whether an answer was right.

**Changed:** where questions come from.

| Before | Now |
|---|---|
| `curate-banks.ts` symlinked ten banks into `GT_QBANK_BANKS` | The app is approved for seven types; the platform serves nothing else |
| `keepers.jsonl` held one theta per keeper | Four domain posteriors and a composite, replayed from the trace |
| `ledger.jsonl` held attempts for a future replay | The response trace, which the platform already replays from |
| The plugin computed `excludeItemIds` | The persona index does it |
| A burst was a session; theta was carried between them | One session per keeper across every visit |
| `/sanctuary/chunk` steered the next burst's difficulty | The platform is server-authoritative on measurement config |
| `delete raw.correct` in the client | Still there, and still the guarantee |

`curate-banks.ts` is deleted. Its own header explained why it existed — "`QbankSessionConfig` has no
allow-list for item types, so the only way to guarantee the engine never serves a type this app cannot draw is
to constrain the pool the API loads" — and per-app approved types are that allow-list.

## What is outstanding

Two things this integration did not carry over, both deliberate and both recorded rather than quietly dropped.

**The sortbot pool gate.** The old plugin excluded ten of thirty-seven `VER-SORTBOT-01` items in the K-1 and
2-3 bands as unsuitable. That is app configuration now — item-level `validated`, or approval at a finer grain
than a type — and it is not reimplemented in a dev server, because hiding it in one is how it came to be
invisible. Until it is expressed as data, those ten items can be served.

**`/sanctuary/record` cannot report a number.** The adult view now reads the platform rather than a local
ledger, but there is no route exposing a keeper's session history: `sessionsForPersona` exists in the store
and is tested, and nothing has needed an HTTP route for it until this view did. It reports the gap rather
than a stale local number.

## The budget, and why it is 24

`maxItems` is 24 per keeper, not the four questions a burst asks. A burst is pacing; the session is the whole
screening across every visit.

24 rather than 16 because of the single-domain pass route — the thing that lets a keeper who loves the tide
ledge and ignores the log be recognised for it. That route requires six scored items in the clearing domain
before the platform will act on it, and a 16-item session over three batteries leaves each about five. The
route the game is shaped around could never have fired, and every keeper would have been judged on the
composite alone.
