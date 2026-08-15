# Demo: the character-led worlds

Four worlds, one per grade band, each running the real adaptive engine on the real item banks. Every
question is drawn in React from the bank's headless item content. Nothing is an embedded HTML frame,
which is what lets the same question look like a different thing in each world.

## Start the two servers

Both are needed, in this order, from `~/gt-loop-a/screener`:

```bash
# 1. the API, on the curated eight-type pool. GT_QBANK_BANKS is load-bearing:
#    without it the engine loads all 53 banks and will serve types this lab cannot draw.
GT_QBANK_BANKS="$PWD/data/lab-character/banks" PORT=5201 \
  GT_SCREENER_DATA=./data/lab-character npx tsx apps/api/src/server.ts

# 2. the web app
npm run lab:character
```

Then open **http://127.0.0.1:5210/**. `Esc` leaves any world and returns to the launcher.

## The one-minute version

If you have sixty seconds, show **Hatchling** then **The Rival**, in that order, and say nothing
except what is in the "say this" column. The point lands by contrast: same engine, same item bank,
same question types, two worlds that share no visual language at all.

| Order | Click | Say this |
|---|---|---|
| 1 | The **Hatchling** card | "Five-year-old. Nothing on this screen has to be read." |
| 2 | Tap the egg, wait for it to hatch | "The creature looks at the child before every question. That look is the instruction." |
| 3 | Answer one question | "It reacts warmly to every answer. It never knows which was right, and neither does the child." |
| 4 | `Esc`, then the **The Rival** card | "Thirteen-year-old. Same engine, same bank." |
| 5 | Let the rival's line land, answer one call | "Deferred feedback, dry rival, no praise. At this age encouragement reads as condescension." |

## Per world

| Route | Band | Session | What it is |
|---|---|---|---|
| Launcher → **Hatchling** | K-1 | Taster, 4 items | An egg hatches; the creature looks to the child before it decides anything. No reading required. |
| Launcher → **Night Clinic** | 2-3 | Short, 6 items | Night shift at an animal clinic. Patients arrive one at a time; a recovery row fills as the night passes and dawn ends it. |
| Launcher → **Ship's Navigator** | 4-5 | Standard | The child is the only crew member who can read the console. Feedback per leg of the voyage, not per reading. |
| Launcher → **The Rival** | 6-8 | Standard, 8 items | A rival tamer keeps turning up. Matchup calls, deferred resolution, and the rival concedes respect at the end. |

### Click paths that show each world at its best

**Hatchling** — tap the egg, wait through the hatch (about three seconds, do not skip it, the hatch
is the hook). Answer three questions and watch the sprig at the edge gain a leaf per turn taken. Let
it reach the ending so the sprig flowers.

**Night Clinic** — wait for the first patient to arrive rather than clicking through. Answer, and
watch the animal move to the recovery row. Show the window over the door: it goes moon to sunrise
across the shift. Reach dawn.

**Ship's Navigator** — read the briefing, answer two or three console readings, and wait for the leg
report rather than pushing on: the deferred report is the design point for this band. Show the ship
advancing along the route.

**The Rival** — let the rival's opening line land before touching anything. Make three or four calls
and wait for the stage to resolve. Reach the concession.

## What to say if asked

**"Is this a test?"** Nothing in any world uses the words test, quiz, assessment or score, and no
world shows a number, a level or a verdict. The engine gets the correctness; the child gets the
story.

**"What happens if a child gets them all wrong?"** The same ending. There is no failure state, no
gating, and nothing performance-contingent: progress advances for turning up and finishing, never for
being right. A child playing for a prize stops producing the behaviour the whole design depends on.

**"How long is a session?"** It is not a fixed count. Length is an outcome of the confidence the
engine is asked for, so it stops when it is sure enough. Measured: 4 items at K-1, 6 at 2-3, 8 at
6-8.

**"Can you show me the evidence behind a result?"** Yes, and it is the honest part.
`GET /api/bank/sessions/:id/debug` returns every item served and the spread across domains. For K-1
that is 4 items across three of the four domains, and the ability interval is about 2.75 logits wide,
which is why no K-1 world displays a number. See the handoff for the argument.

## Known rough edges, so they are not discovered on stage

- **Verbal is absent from every world.** The curated pool has no verbal type, so `perDomain.verbal`
  is always 0. At K-1 that is structural: the bank has no scorable verbal item for that band at all.
- **Renderer prompts are the one thing on screen a K-1 child would have to read.** The worlds demote
  that prose to adult weight, but `QuantDots` still gates its exposure behind a labelled button.
- The favicon 404s in the console. It is the only console noise.
