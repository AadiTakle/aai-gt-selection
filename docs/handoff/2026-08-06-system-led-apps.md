# Handoff: system-and-reward-led stealth screeners (loop B)

Branch `feat/apps-system-led`, worktree `~/gt-loop-b`, app at `screener/apps/lab-system/`.

```bash
cd ~/gt-loop-b/screener
PORT=5202 GT_SCREENER_DATA=./data/lab-system npx tsx apps/api/src/server.ts   # API
npm run lab:system                                                            # web, 127.0.0.1:5220
```

Six experiences, all four grade bands covered, all six played end to end from a cold start. Click paths
are in `screener/apps/lab-system/DEMO.md`.

---

## What I built

Item counts are what a real session actually served during the final pass, taken from
`GET /api/bank/sessions/:id/debug`, not from the configured range. Domain spread is
`state.perDomain`, and it is the column to look at hardest.

| Experience | Band | World | `precisionIndex` | Items served | Domain spread (Q/V/S/F) | Concluded | Final pass |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Sticker Album | K-1 | Pokémon | 0 Taster | **4** | 2 / **0** / 1 / 1 | yes | pass |
| Streak Keeper | 2-3 | Duolingo | 1 Short | 6 | 3 / 1 / 1 / 1 | yes | pass |
| Blueprint Build | 4-5 | Minecraft | 2 Standard | 8 | 1 / 1 / 3 / 3 | yes | pass |
| Tower Line | 4-5 | Clash Royale | 2 Standard | 8 | 1 / 1 / 3 / 3 | yes | pass |
| Coin Market | 6-8 | Rocket League | 2 Standard | 8 | 2 / 1 / 2 / 3 | yes | pass |
| Speedrun Ladder | 6-8 | Fortnite | 1 → 3 by division | 6 | 1 / 1 / 1 / 3 | yes | pass |

Every one: entered from the launcher cold with `localStorage` cleared, every item answered through to
the engine's own stop, an ability result produced, zero console errors, and no occurrence of test, quiz,
assessment or score anywhere in the rendered copy.

**Sticker Album** (K-1) is wordless. Nine album slots, one enormous Play button, progress as dots rather
than a counter, and a sticker lands the moment a round ends. It is the only one whose evidence is thin
enough to be a problem, which is the first entry below.

**Streak Keeper** (2-3) opens on day zero deliberately: an unlit outline flame at 0, this week as a row
with today ringed, and a rarity ladder topping out at seven consecutive days.

**Blueprint Build** (4-5) draws an isometric plot of twelve blueprint plates in CSS and inline SVG, and
each completed shift puts the next structure in the ground. Emeralds buy cosmetic upgrades only.

**Tower Line** (4-5) is a three-lane arena where elixir earned per round buys defenders that stay on the
board between visits, so the arena is the save file.

**Coin Market** (6-8) is a dark trading terminal whose prices are a deterministic function of rounds
completed and nothing else. The market is sealed during a session, so no price movement can be misread
as a verdict on the answer just given.

**Speedrun Ladder** (6-8) climbs `precisionIndex` 1 → 2 → 3 across eight divisions, so a higher division
really is a longer, harder run, and the interface says so. The weekly seed is
`((isoYear * 100 + isoWeek) * 16) + divisionIndex`, so everyone in a division gets the same week's
rotation and a promotion hands over genuinely new material.

---

## Where the library stopped me

### The catalogue's shared stylesheet was never copied into it

**Hit while building:** the very first session, and it affects all six.
**What I wanted:** items to render with the styling their authors wrote.
**What stopped me:** every one of the 52 renderers in `qbank-library/items/` opens with
`<link href="../exam-skin.css">`, and that file does not exist anywhere in `qbank-library`. It lives in
`archive/apps/web/public/exam-skin.css` and `archive/research/exam-question-types/exam-skin.css` and was
not copied across when the items were. The API only serves `/qbank/items` (`apps/api/src/server.ts:43`),
one level below where the link points, so the request 404s and the browser refuses the stylesheet.
**What I did instead:** a middleware in my own `vite.lab-system.config.ts` serves it from the archive
copy. Flagged in a comment there as a workaround.
**Is the workaround throwaway?** Yes, and it should be deleted the moment the real fix lands.
**What the library would need:** copy `exam-skin.css` into `qbank-library/` and serve it from the API
alongside `/qbank/items`. **This affects the shared screener app too, not just this lab** — every item
in `apps/web`'s BankScreener has been loading a broken stylesheet link as well.

### A four-item session cannot cover four domains, and K-1 has nowhere to go

**Hit while building:** Sticker Album.
**What I wanted:** a session a five-year-old will sit through that still says something.
**What stopped me:** the shortest step on the ladder, "Taster", is `minItems: 4`. With four reasoning
domains and `perDomainMinimum: 1`, a four-item session can at best touch each domain once, and in the
run I recorded it served **2 quantitative, 1 spatial, 1 fluid and no verbal items at all**. The estimate
that came out rests on one item in two domains and nothing in a third. The band is also the thinnest
pool in the bank: 312 scorable items for K-1 against 2,022 for 6-8.
**What I did instead:** nothing. I did not lengthen the session, because stretching a five-year-old past
what they will sit through to make the number look better is optimising the wrong thing. The experience
reports a sticker, never an ability.
**Is the workaround throwaway?** Not applicable. This is a finding rather than a blocker.
**What the library would need:** either an explicit stance that K-1 results are indicative only and
should not be reported per domain, or a shorter per-domain blueprint for the youngest band, or more K-1
items. It cannot be solved by configuration as it stands.

### Sessions cannot be resumed, which is fatal for every streak mechanic

**Hit while building:** Streak Keeper, and it constrains all six.
**What I wanted:** a child returning tomorrow to continue where they were.
**What stopped me:** live sessions are held in an in-process `Map` in `apps/api/src/server.ts:26`, and a
finished session is deleted from it (`:438`). Nothing is rehydrated from the JSON Lines store, so a
session does not survive a page reload, let alone a server restart. There is no resume endpoint.
**What I did instead:** all progression lives in `localStorage` via `shared/progression.ts` and is
completely separate from the session. A streak is a client-side fact.
**Is the workaway throwaway?** No, `localStorage` is the right home for a streak. But it means the
streak and the measurement know nothing about each other, so we cannot say "this child's day-nine
estimate rests on their day-one through day-eight answers".
**What the library would need:** a way to reopen a session id, or a stable participant id that ties many
short sessions into one accumulating posterior. The second is the more valuable of the two.

### Exposure is not tracked across sessions, so repeat play may be noise

**Hit while building:** Streak Keeper and Speedrun Ladder, the two built for repetition.
**What I wanted:** a child on day nine not being shown day two's items.
**What stopped me:** `packages/qbank/src/session.ts` has no notion of items seen previously. There is no
`excludeItemIds`, no seen-set, no exposure ledger. Search finds nothing.
**What I did instead:** nothing available. Speedrun Ladder mixes the division index into its weekly seed
so a promotion draws a different rotation, which reduces repeats between divisions but does nothing
within one.
**Is the workaround throwaway?** It is not really a workaround.
**What the library would need:** a per-participant exposure ledger the session can be handed, so already
seen ids are excluded. **This is the entry I would act on first.** Every reward mechanic in this loop
exists to produce repeat play, and without exposure control repeat play produces re-measurement of the
same items rather than more evidence.

### The shortest session is four items, and a daily round wants three

**Hit while building:** Streak Keeper.
**What I wanted:** a sub-minute daily round, the length a streak app actually uses.
**What stopped me:** `PRECISION_STEPS[0]` is `minItems: 4, maxItems: 6`. There is no shorter step and
`precisionIndex` only indexes that ladder.
**What I did instead:** used index 0 and dressed it as a short run. It is defensible at 2-3 but it is not
the fifteen-second daily a streak mechanic is built around.
**Is the workaround throwaway?** No, but it caps how habitual this can get.
**What the library would need:** either a shorter step, or accumulation across sessions (see resume
above), which would make a three-item round coherent because the estimate would keep building.

### Above-level items can be asked for, but not the way I expected

**Hit while building:** Speedrun Ladder, which needs the climb to get genuinely harder.
**What I wanted:** "serve me items above this child's grade".
**What stopped me:** nothing, in the end, but the lever is not obvious. There is no `targetDifficulty`
or `aboveLevel` flag. What exists is `abilityThreshold` (default 1.0), and because selection maximises
information *at the threshold*, raising it pulls harder items. **Confirming for the record: above-level
serving is possible via `abilityThreshold`, and it is not documented as the way to do it.**
**What I did instead:** Speedrun Ladder climbs `precisionIndex` instead, which makes runs longer rather
than harder. That is the weaker choice and I would change it.
**What the library would need:** one line of documentation on `abilityThreshold` as the above-level
lever, and ideally a named alias so the intent is legible at the call site.

### Themes retint items but cannot change what an item depicts

**Hit while building:** Coin Market most severely, as predicted.
**What I wanted:** items that look like currency inside an economy.
**What stopped me:** theming sets CSS custom properties on the item's document. That is all it can do,
so an item that draws a star draws a star, in whatever colour you like. Worse, measured on this branch:
applying a palette repaints 13 to 16% of pixels on items that read the variables, and about 0.5% on
`CX-check-01` and `QUANT-GRAPH-01`, which hardcode literals. `CX-check-01` hardcodes warm values in 23
of its 76 rules including `body`, and it is the item the engine serves **first** to every 6-8 child, so
the first thing a child sees in a dark trading terminal is partly peach.
**What I did instead:** bezelled the frame so the edge reads as a join between a screen and its housing,
and kept the surrounding chrome carrying the world's identity.
**Is the workaround throwaway?** No, but it is a ceiling on how deep any theming can go.
**What the library would need:** route the hardcoded literals in the renderers through the palette
variables, starting with `CX-check-01` since it is served first.

### The documented palette vocabulary is a small subset of the real one

**Hit while building:** Coin Market and Speedrun Ladder independently.
**What I wanted:** to know which properties actually matter.
**What stopped me:** `shared/types.ts` and `THEMABLE_VARS` name about ten. The catalogue reads more than
sixty: `--violet` in 33 of 53 types, `--blue` in 28, `--indigo` in 18. The exam skin also exposes a
second `--gt-*` family, and several of its controls are pinned with `!important` to dark ink on light
fields, which means **a dark `--card` produces dark-on-dark text in item types you will not see unless
you look for them.**
**What I did instead:** Coin Market sets 36 properties rather than ten. Speedrun Ladder keeps its item
panel light inside a dark HUD, deliberately, to preserve the skin's light-field pairings.
**What the library would need:** the full list in `THEMABLE_VARS` with usage counts, and a warning that
inverting to dark is not safe.

### Two stock palette values fail contrast

**Hit while building:** Coin Market.
**What stopped me:** `--dim` measures 2.59:1 and `--key` 1.75:1 on a white card, and both are text
roles. Below AA at any size.
**What I did instead:** overrode them to 5.61:1 and 6.29:1 locally.
**What the library would need:** fix the defaults, since anyone who does not override them ships
failing contrast.

### `Serve.domain` is typed `string` and disagrees with the bank summary

**Hit while building:** Coin Market.
**What stopped me:** a serve reports `fluid`; `GET /api/bank` reports `fluid_reasoning`. Both are typed
as `string`, so writing the wrong one is not a compile error and only shows up as a silently empty
lookup.
**What the library would need:** a union type, `'quantitative' | 'verbal' | 'spatial' | 'fluid'`.

### `progression.ts` cannot hold structured per-experience state

**Hit while building:** Tower Line, Coin Market and Blueprint Build all hit this independently.
**What I wanted:** to persist a board, an inventory, a set of placements.
**What stopped me:** the only open field is `unlocked: readonly string[]`. Tower Line encoded
`slot:cardId` tokens into it and wrote a defensive parser; Coin Market gave up and wrote its own
localStorage key, which means the shared reset path does not cover it.
**What the library would need:** an opaque per-experience JSON blob, so a child's state is in one place
and one reset clears all of it. Three of six experiences needed this, which makes it the most-requested
gap of the night.

### Smaller things, worth one line each

- `useScreenerSession` has no duplicate-response guard. Two `result` messages in quick succession would
  post two answers and could call `onFinished` twice, double-counting a round. Not reachable from any
  current UI, because the frame unmounts when a session ends, but the hook does not defend itself.
- `progression.ts` keeps `today()` private, so Streak Keeper duplicated the local-date logic to decide
  which week cells are filled. If the two ever disagree the calendar will contradict the streak beside it.
- `Progress` records `streak` and `lastDay` but not which days were attended, so a calendar is derived
  from the definition of a streak rather than from fact.
- `PER_ROUND` and `PER_ITEM` are not exported, so Tower Line's "worth 26 to 42 elixir" label duplicates
  arithmetic that will go stale silently.
- `spend()` has no inverse and no transactional pairing with `unlock()`, so a placement is permanent and
  a throw between the two calls would take currency without placing anything.
- Ordering-style responses: **not confirmed either way.** Tier List was the experience that would have
  tested it and I did not build it, so whether the protocol supports an ordering response is still open.

---

## What I would do next with another night

**Exposure control first.** Every mechanic here is built to produce repeat play, and without an exposure
ledger repeat play re-measures the same items. It is the single change that decides whether this whole
category is measurement or theatre.

**Then accumulation across sessions.** A participant id whose posterior keeps building would fix the
K-1 evidence problem, make a three-item daily round coherent, and let a streak mean something to the
measurement rather than only to the child.

**Then Tier List**, because ordering is the one response shape nothing in the set exercises and I cannot
tell you whether it works.

## Notes for the morning merge

Loop A is on `feat/apps-character-led`. The only file we both had licence to touch is
`screener/package.json`, where I added exactly one line, the `lab:system` script. Expect a one-line
conflict there and keep both scripts; it is the same trivial conflict the planner and review apps had.
Nothing else of mine is outside `screener/apps/lab-system/`, `screener/vite.lab-system.config.ts` and
this document.
