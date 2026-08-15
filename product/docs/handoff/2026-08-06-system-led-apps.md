# Handoff: system-and-reward-led stealth screeners (loop B)

> **Historical external-worktree runbook.** The app source is preserved at
> `product/screener/apps/lab-system/`, but the ignored runtime data from `~/gt-loop-b`
> is not in a clean clone. Paths and commands below describe the original worktree;
> use `product/docs/gt/testing-and-demos.md` for currently reproducible surfaces.

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

---

# Second pass: headless consumption, and five apps rebuilt on it

The first pass embedded the catalogue's own HTML renderers in iframes. That was wrong: it makes every
app the same generic exam in a themed border, and it is not what "use the library as a framework" means.
`shared/headless/` now takes the item DATA and normalises it, and the app draws all of it.

## What the second pass established, by measurement

**The engine serves 16 distinct types, not 53**, and only 3 to 7 per age band, measured over 48 sessions
and 312 items. That is what makes headless rendering tractable at all.

**Declining everything undrawable does not work.** Tried first: 33% to 90% of items came back
unscorable and two bands hit `item-cap` without ever satisfying the stop rule. So a headless app has to
draw nearly everything the engine hands it. Three types are declined (`CX-check-01`, `SPA-MAZE-01`,
`SPA-VIEW-01`); at band 6-8 that measured 56 declined against 112 drawn, which costs session length
rather than correctness.

**Correctness is now returned to the app**, reversing the first pass. A right answer lays the next layer
of the house; a wrong one does nothing. Nothing is taken away and no door closes, so progress stalls
rather than reverses.

## The five headless apps

| App | Band | World | The loop | Items served, real play |
| --- | --- | --- | --- | --- |
| Obby Run | K-1 | Roblox | Right answer lands the jump, wrong one springs you back | 4 |
| Pokédex | 2-3 | Pokémon | Right answer catches it, wrong one lets it flee | 7 |
| Build It | 4-5 | Minecraft | Right answer lays the next layer of a build you chose | 8 |
| Smarter Than a 5th Grader | 4-5 | Game show | Right answer climbs a rung, wrong one spends a classmate | 7 |
| Backrooms | 6-8 | Backrooms | Choices are doorways; escape depends on the engine's own decision | 12 |

All four bands covered. Every one played end to end by **clicking its own buttons**, not by posting
synthetic messages, which is what the first pass did and should not have.

## Bugs this pass found that no test would have

**Choices rendering identically.** Hashing facet tokens to visuals collides, and four of seven Minecraft
choices drew as the same green stack, making a good item unanswerable. Found by looking at a screenshot.
`shared/headless/distinct.ts` now allocates a slot unique within a question, so a skin cannot collide by
construction. Four workers independently confirmed the same class of failure in their own skins.

**Eight adapter bugs, all of which silently made items unanswerable.** Reported independently by four
apps and now fixed in `adapt.ts`: `FLU-CARPET-01` keeps its grid under `carpet` rather than `matrix`, so
all 24 K-1 pattern items were losing their stem entirely; `motif` was not read as an identity facet,
which is why 18 of 24 carpet items had duplicate signatures; `QUANT-WORD-01` keeps its story at the top
level rather than under `passage`, so 25% of band 6-8 serves arrived with the story invisible and bare
numbers as options; `shade` was filed under `color`, rendering choices "painted the colour hollow";
`pos` was dropped although `FLU-DEDUCE-01` clues refer to it directly; `load`, `order`, `terms` and
`token` containers were not unwrapped, so around 125 items had empty facet bags; `segments` was not
read, emptying `SPA-XSCAN-01`; and the compare direction was assumed rather than read, which is safe
today because every K-1 dots item is `compare_more` and silently wrong the day `compare_fewer` appears.

## Still open, and worth knowing before the demo

**A library bug outside this loop's remit.** `packages/qbank/src/bank.ts` `scoreResponse` returns null
unless `answer.correctKey` is a string, and all three K-1 verbal banks store it as a number. Every one
is therefore counted unscorable, so the verbal domain contributes nothing to the estimate at that band:
51 of 339 K-1 items. `packages/` is off limits to this loop, so it is reported rather than fixed.

**`FLU-OPCHAIN-01` still drops `orient`, `border` and `pair`**, so several of its candidates remain
facet-identical and are separated only by their slot. They are tappable and distinct, but not
answerable on their merits.

**The iframe-based apps from the first pass are still in the launcher** below the headless ones. They
work, but they are the wrong architecture and should either be rebuilt headlessly or removed.

---

# Provenance: proof the questions are the library's

`npx tsx apps/lab-system/verify-provenance.ts` from `screener/`, with the API up on 5202.

The claim "nothing here is made up" is checkable rather than assertable, so it is checked. Latest run,
42 items traced across all four bands:

| Check | Result |
| --- | --- |
| Every served item found by id in a bank file on disk | yes, 42 of 42 |
| Answer key present anywhere in the served payload | no |
| Submitting the on-disk `correctKey` marked correct by the server | 26 times |
| Submitting a different key marked wrong by the server | 16 times |
| Difficulty range served | 3.6 to 13.0, spread 9.3 |
| Distinct engine selection reasons | 38 |

The last two are what distinguish an adaptive engine from a fixed list. Real reasons the engine gave:
`blueprint minimum for quantitative; information 0.231 at threshold 1.00` and `highest information at
threshold 1.00 (0.220) from 309 remaining`.

A static audit of the five headless apps: **zero** hardcoded questions or answer keys, **zero** direct
`fetch` calls (every one goes through `useQuestionSession`), and correctness only ever arrives from the
server through `onAnswered`. No app grades anything itself.

## What the provenance check caught that nothing else did

**`VER-EVIDENCE-01` keys on a compound answer.** Its `correctKey` is `"A+s5"`, meaning option A **plus
the sentence that supports it**, so the item wants two selections. The apps were submitting the option
alone, which the server marks WRONG every single time. Roughly 8% of serves were therefore being failed
regardless of what a child picked, silently, and no test would have found it because the app behaved
exactly as written.

It is now declined, and the verifier asserts that any type whose key is not one of its own option keys is
declined, so this class of bug cannot come back unnoticed. Supporting it properly means a second
selection phase, pick the answer then pick the line that proves it, which is a good mechanic and real
work rather than a patch.
