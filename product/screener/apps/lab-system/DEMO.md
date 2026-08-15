# Demo: six systems, four grade bands

```bash
cd ~/gt-loop-b/screener
PORT=5202 GT_SCREENER_DATA=./data/lab-system npx tsx apps/api/src/server.ts   # terminal 1
npm run lab:system                                                            # terminal 2
open http://127.0.0.1:5220
```

Everything is on one page. Click a card, click back, click the next one.

**Before demoing, clear progression** so every experience shows its first-time state, which is the state
that matters:

```js
// in the browser console
Object.keys(localStorage).filter(k => k.startsWith('gt-lab-system')).forEach(k => localStorage.removeItem(k));
```

**The line to open with.** None of these calls itself a test, none shows a wrong answer as wrong, and
none rewards being right. The session hook does not even return correctness to the interface, so an
experience *cannot* pay out on accuracy. Streaks advance by calendar day, currency by round completed.

---

## The one-minute version

If you only have a minute, do Sticker Album then Coin Market. They are the two ends of the range and the
contrast is the argument: the same engine, the same banks, and a five-year-old and a thirteen-year-old
would not recognise each other's screen.

## The full path, youngest first

### 1. Sticker Album · K-1 · Pokémon
*A page with gaps, and every round you finish sticks one in.*

1. Click the card. Point out that **there is not one word a child needs to read**: nine empty slots, one
   enormous button, progress as dots.
2. Click **Play**. The item appears tinted to the album's warm palette.
3. Answer through. It ends after four questions, the shortest the engine offers.
4. A sticker lands with a pop. Point out the reward is immediate, because a five-year-old will not chase
   one three visits away.
5. **Say the honest part:** four items cannot cover four reasoning domains, and in our recorded run one
   domain got nothing at all. It reports a sticker, never an ability. That limit is written up in the
   handoff rather than hidden.

### 2. Streak Keeper · 2-3 · Duolingo
*A daily run you do not want to break.*

1. Click the card. It opens on **day zero**: unlit outline flame at 0, this week as empty circles with
   today ringed.
2. Point at the rarity ladder. Gold Fire is at seven consecutive **days**, not seven right answers.
3. Click **Start today's run**, answer through, and watch the flame ignite at 1.

### 3. Blueprint Build · 4-5 · Minecraft
*A base that grows every time you finish a round.*

1. Click the card. Twelve blueprint plates, each with a wireframe ghost of what will stand there. All CSS
   and inline SVG, no image assets.
2. Click into a shift. The hotbar fills as answers land, keyed to the fact of an answer.
3. Finish. The next structure goes in the ground. Emeralds buy torches and paths, cosmetic only.

### 4. Tower Line · 4-5 · Clash Royale
*Earn elixir, hold the lanes.*

1. Click the card. Three lanes, nine gold deploy pads, a deck of eight cards all showing how much elixir
   you are short by.
2. Hold a push. Elixir arrives per round.
3. Place a defender. Point out it **stays there between visits**, so the arena is the save file rather
   than a results screen.

### 5. Coin Market · 6-8 · Rocket League
*Trade at fair value while the market moves.*

1. Click the card. A dark trading terminal: tabular numerals, sparklines, green and red deltas.
2. Point out the market is **sealed during a session**. Nothing ticks while a child is thinking, so no
   price movement can be misread as a verdict on the answer they just gave.
3. Take a session, then show the board has moved. Prices are a function of rounds completed and nothing
   else, which we verified by holding rounds fixed and varying everything else.

### 6. Speedrun Ladder · 6-8 · Fortnite
*A weekly climb that gets harder the higher you go.*

1. Click the card. Unranked at the bottom, eight divisions, a tier track, a bracket of eighteen rivals.
2. **This is the above-level story.** A ladder that gets harder as you climb needs no explanation for
   serving a twelve-year-old fourteen-year-old material, and the interface says the next division is
   longer and pulls from a harder rotation.
3. Point at the match ID in the HUD. It is the weekly seed, so everyone in a division gets the same
   rotation that week, which is what makes the bracket comparable.
4. Note that the ladder cannot fall. Rank is the count of rivals ahead, which only ever improves by
   playing.

---

## If something goes wrong on stage

**An item frame is blank.** The API on 5202 has probably stopped. Restart it; the web server does not
need restarting.

**Everything 404s.** Check the API is on **5202** and the web on **5220**. Loop A uses 5201 and 5210.

**A session says no items match.** Only reachable by editing the age band in code. Not a demo path.
