# How Bramblebrook presents its questions: a UX review

> **Status, 12 Aug 2026.** Five of the six findings below are fixed on `feat/sanctuary-question-quality`. Each
> section carries a **FIXED** or **LEFT** note saying what happened and why. The two deliberately left are
> recorded at the end with the argument for leaving them.


12 Aug 2026. Scope: what a child actually sees, hears and does when answering one of the seven approved types.
Read against the live code path, which is the in-world 3D renderers in `game/screener/` registered by
`inWorld.ts` — not the 2D `lab-character` renderers, which are fallback infrastructure these seven never reach.

The frame throughout is **construct-irrelevant variance**: a child who answers wrongly because they did not
understand the task, could not perceive the item, or could not work the controls has been measured on
something other than reasoning. In an instrument whose whole purpose is a decision at the 95th percentile,
that variance is not a polish problem — it is measurement error with a child's name on it.

## Severity 1 — a silent machine still scores the child  ·  **FIXED**

> `onPick` now takes optional flags, `KinshipStone` passes `no-audio` when `narration === 'unavailable'`, and
> `markResponse` returns `correct: null` for it — unscorable rather than wrong, the same treatment a rapid guess
> gets. Only an allowlist is honoured, so a caller cannot decline to be scored by inventing a reason, and a test
> asserts that. The shared `AnswerRequest` contract was not widened; the field is read off the body locally.


`VER-RELPAIR-01` is spoken. The stone draws empty bowls; the words exist only in audio. Where speech
synthesis is missing — absent on some embeddings, present but permanently silent on a school image with no
voice packages, blocked until a gesture on others — the item contains, in its own file's words, nothing:

```94:101:screener/apps/sanctuary/game/screener/KinshipStone.tsx
 * A machine with no voice. `speechSynthesis` is absent on some embeddings, present and permanently silent
 * on a school image with no voice packages, and blocked until a user gesture in others — `speak.ts`
 * enumerates them, and `DayLog` survives all of it because its pictures carry the story on their own. HERE
 * THEY DO NOT, because today there are none. On a voiceless machine this item has nothing in it.
```

The renderer detects this and dulls the horn so nobody wastes the round pressing it. **What it does not do is
tell anything downstream.** `voiceless` reaches exactly one place — `<Horn dormant={voiceless} />` at line 736
— and the child's guess travels to the platform as an ordinary response and is scored as ordinary evidence.

The file calls this "a deployment question, not a rendering one." That is half right. Gating deployment would
fix it, but the cheaper fix is already built: a flagged response is treated as **unscorable rather than
wrong**, which is exactly how a rapid guess is handled.

```37:39:platform/functions/score/src/mark.ts
 * `rapidGuessFloorMs` derives a per-item floor from how much there was to read and how many options there
 * ...
 * it, the response is **unscorable rather than wrong** — a tap that fast is evidence about the interface, not
```

**Fix:** have the client send a flag when `narration === 'unavailable'` and mark that response unscorable. The
client currently sends only `latencyMs` (`shared/useSortie.ts:186`) and no flags at all, so this is a small
addition to an existing path rather than a new mechanism. Until then, every silent verbal item is noise the
ability estimate absorbs as though it were signal.

## Severity 2 — five of the seven types never tell the child what to do  ·  **FIXED**

> The beat overlay now renders an instruction under the job title, preferring the bank's own `content.prompt`
> and falling back per battery for the two types that have none authored. The stealth framing is intact: what
> was removed from that panel was the battery *name*, and "Choose the step that comes next" discloses nothing
> about being measured.


When a type has an in-world presentation, the 2D overlay renders **one line: a job title**, and nothing else.

```406:407:screener/apps/sanctuary/game/Game.tsx
      <p className="bh-beat-title">{verbFor(s.serve.typeCode)?.title ?? verb?.title ?? 'Something to do'}</p>
      {inWorld ? null : (
```

The titles are `Coaxing a coat`, `Laying the mossbed`, `The tide-line`, `The Sprouter`, `The weighing bough`,
`The sorting gate`, `The kinship stone`. Every one is a thing on a ranch. **None is an instruction.**

Meanwhile the banks carry instructions, and Bramblebrook discards them:

| type | `content.prompt` in the bank | shown or spoken? |
|---|---|---|
| QUANT-SERIES-01 | "Choose the step that comes next." | **discarded** |
| QUANT-FUNC-01 | "Choose the amount the machine makes for the new input." | **discarded** |
| QUANT-BALANCE-01 | "Choose the group of shapes that balances the left pan." | **discarded** |
| FLU-MATRIX-01 | *none exists* | — |
| FLU-CARPET-01 | *none exists* | — |
| VER-SORTBOT-01 | "The robot sorted these words. Tap the new word that also goes IN." | spoken |
| VER-RELPAIR-01 | *none exists*; renderer hardcodes its own | spoken |

For `FLU-MATRIX-01` the convention is arguably discoverable: a grid with one glowing gap and a shelf of tiles
is a widely-met puzzle. For `QUANT-FUNC-01` it is not. A stump that takes seed clusters in and puts shoot
clusters out, with worked-example channels and an empty output dish, is a *function machine* — and the one
sentence that would tell a child that is sitting in the bank, unused.

The design principle at stake: let each element do exactly one job. Here the only text slot is spent on
flavour and the instructional job goes unfilled by anything.

**The stealth-screener reasoning is sound and should not be undone.** The comment at `Game.tsx:427–442`
records why the battery label had to go — "these are supposed to be stealth screeners" — and it is right that
printing "Quantitative" over a child's head gives the game away. But that argument covers *category names*,
not *task instructions*. "Choose the step that comes next" discloses nothing about batteries, scoring, or
being measured. The two were removed together and only one of them had to be.

**Fix:** render `content.prompt` in the slim overlay beneath the title, or speak it the way Sortbot does. The
two FLU types need a prompt authored, since none exists. Nan is the natural voice for it — an instruction from
the rancher who asked for help is not a test rubric.

## Severity 3 — the one spoken instruction contradicts its own presentation, twice  ·  **FIXED**

> `SortingGate` no longer speaks the bank's prompt. It says "The robot sorted these. Point at the one that also
> goes in." — naming the gesture this surface actually has, and true whether the cards show words or pictures.


`SortingGate` speaks `content.prompt` verbatim (`SortingGate.tsx:446–449`). For the first bank item that is:

> "The robot sorted these words. Tap the new word that also goes IN."

Both halves are wrong for this surface:

- **"words"** — the presentation is deliberately pictorial. The category is never served, and every token is
  drawn through `tokenGlyph` as a glyph rather than text, precisely so the rule "can only be shown, never
  stated" (`SortingGate.tsx:27–35`). A child hears *words* and sees *pictures*.
- **"Tap"** — nothing taps. The child aims a crosshair under pointer lock and clicks, or presses Enter
  (`Stations.tsx:200–233`, `279–284`).

The prompt was written for a 2D, tappable, text-bearing presentation and is being read aloud in a 3D,
click-to-aim, pictorial one. An instruction that names a gesture the interface does not have is worse than no
instruction, because a child who trusts it looks for something to tap.

**Fix:** the prompt a type speaks should belong to the presentation, not the bank, or the bank's prompt needs a
per-surface variant. "Point at the one that also goes in" is true here and false nowhere.

## Severity 4 — `maxReadingBand: 'none'` is true of the items and false of the game  ·  **FIXED**

> The app now declares `'2-3'`, which is honest, and that declaration does real work rather than merely being
> accurate: `SortingGate` reads it from `/v1/catalog/app` and sets words as words when it allows, which is what
> rescued 73 of that type's 100 items. See `sortbot-for-grades-3-5.md`. The HUD's movement instructions are
> still English text, which `'2-3'` now covers truthfully.


The app declares that it requires no reading, and the item presentations genuinely honour it — the non-verbal
five draw no words and refuse numerals outright. But to *reach* an item a child must read:

```656:656:screener/apps/sanctuary/game/Game.tsx
          Click to look around · WASD to walk · Space to hop
```

```715:715:screener/apps/sanctuary/game/Game.tsx
          <p className="bh-cares">Walk up to the barn wall, the spring or the log</p>
```

Plus "Headphones on, please" (`audio/useAudio.tsx:377`) and Nan's entire spoken-and-captioned tour. A
pre-reader cannot get to the first question unaided, so the declared capability describes the items while the
product around them assumes fluent English.

This matters beyond tidiness: `maxReadingBand` is what the platform intersects against item requirements to
decide what may be served. A declaration that is true of one layer and false of another will eventually be
trusted by something.

**Fix:** either state the reading assumption honestly (items require none; the shell requires basic English or
an adult present), or carry the movement instructions in Nan's voice and glyphs, which the intro already does
well — `Glyphs.tsx` draws keycaps with `aria-label`s like "Press W, A, S and D to walk".

## Severity 5 — a pick cannot be undone  ·  **LEFT**

> Left deliberately. Hit volumes are already generous, so this is a changed mind rather than a misaim, and the
> counter-argument is real: a withdraw window invites dithering and a settled answer is cleaner evidence. It
> also interacts badly with the new correctness feedback — a child who sees "Not that one" and can still change
> their answer is being scored on their second thought, which is a different measurement. Worth revisiting only
> with a decision about which of those to measure.


First touch is final. Every renderer latches on the first click (`if (disabled || picked) return;`,
`PodWall.tsx:288–290`), there is no confirm step, and the item remounts only when the next `itemId` arrives.

To be fair to the implementation, the obvious version of this concern does not apply: hit volumes are
deliberately generous, and the code says why.

```266:266:screener/apps/sanctuary/game/screener/PodWall.tsx
      {/* The shelf of candidates. Generous colliders: a small child aiming a mouse is imprecise. */}
```

So the risk is not a misaim; it is a **changed mind**. A child who commits, then sees the tile settle into the
socket and realises another was better, has no route back. On items now deliberately above grade level, where
being unsure is the intended experience, that is the wrong moment to make irreversible.

Worth weighing against the counter-argument: allowing changes invites dithering, and a settled answer is
cleaner evidence. A middle option is a brief window — the pick animates into place over a beat, and a second
click during that beat withdraws it.

## Severity 6 — nothing tells a child how much is left  ·  **FIXED**

> A visit now asks exactly as many questions as the cradle post has pips, so the lights fill and the round ends.
> `PIPS` is the round length, exported so the two cannot drift, and `visitOver()` keeps "the platform has
> finished measuring" distinct from "this visit asked what it came to ask".


The counter was removed deliberately, and for two good reasons: it announced a section length, and a visible
progress bar makes a child rush the last one, "which corrupts the estimate this exists to produce"
(`Game.tsx:439–442`). Both correct.

But removal left nothing in its place, and a session is now 12 to 24 items spanning several visits. A child
with no sense of an ending has no basis to pace effort, and the cost lands on the last items — the ones the
adaptive engine chose most carefully.

**Fix, if any:** an in-world completion signal that is not a test length. The cradle pips already count picks
(`Stations.tsx:338–347`); a round that visibly *fills* something on the ranch would pace without ever naming
a quantity of questions.

## Still outstanding, and why

- **No keyboard route to an answer.** Enter dispatches a click at the crosshair, so aiming is still required,
  and 3D picks are invisible meshes rather than focusable DOM. A real fix is a candidate-cycling mode, which is
  a feature rather than a correction, and it would need its own design pass on how selection is shown.
- **The nonverbal bay is too small.** Width is capped by the barn wall it is bolted to; the three ways out are
  named in `sites.ts` and all of them move a building.
- **`E` means four things.** Contextual and probably fine; recorded because it is the one key a child must
  understand.
- **A second screening begins silently** once a decision is reached and the child keeps playing. That is a
  product decision — stop offering questions, keep serving without scoring, or treat it as legitimately new —
  and it should be chosen rather than inherited.

## Smaller notes

**Coins reward volume.** Paid per answer, never per correct answer, and documented: paying on accuracy would
leak correctness (`Game.tsx:370–372`). Right call. The residual it does not address is that paying per answer
rewards *quantity*, so the incentive still points at answering more and faster. Rapid-guess detection catches
sub-floor latencies only; careless-but-not-instant answering is not caught.

**The nonverbal bay is too small.** Width is stuck at 2.55 m against the 3.24 m `FLU-MATRIX-01` wants, capped
by the barn wall it is bolted to (`sites.ts:218–226`). Documented as pre-existing, with three named ways out.
Matrix items therefore render smaller than the sizing rule asks for — the type where fine visual detail
carries the reasoning.

**No keyboard route to an answer.** Enter dispatches a click at the crosshair, so aiming is still required;
there is no way to cycle candidates and choose. 3D picks are invisible meshes rather than focusable DOM, so
there are no focus states either. A child who cannot aim cannot answer.

**`E` is overloaded** — engage a station, leave a station, use the shop counter, open the challenge board.
Contextual and probably fine, but it is the one key a child must understand and it means four things.

## What is right, and should not be traded away

Worth stating plainly, because most of the above is fixable copy and the hard parts are already done well.

- **Correctness never reaches the client.** Stripped before the UI, so no renderer can leak it by accident,
  and every "did I get it right" affordance is absent by construction rather than by discipline.
- **No numerals in the quantitative items.** `TideLine`'s "NO NUMERALS, EVER" keeps a reasoning item from
  becoming an arithmetic item.
- **Identical card size, depth and arrangement** between stem and candidates on `KinshipStone`, because
  analogy items carry reversal lures and a size difference would be a false signal.
- **Matte surfaces throughout**, so the station lamp cannot mirror onto one card and make it read as chosen.
- **Reduced motion honoured** across every renderer.
- **Shape *and* colour** on the balance items rather than colour alone.
- The whole stealth framing: a child is doing a job the ranch needs, not sitting a section.

## Learning Science Rationale

**Goal & learner:** a 3rd–5th grader, playing unsupervised, whose reasoning must be measured accurately enough
to decide a 95th-percentile cut. This is a measurement instrument, not a learning product, so the usual
retention principles (spacing, retrieval practice) do not apply — but the load and channel principles bear
directly on whether the measurement is valid.

| Principle | Why it applies | Concrete decision | Source |
|---|---|---|---|
| Cognitive load — cut extraneous load | Working memory spent inferring *what the task is* is not available for the reasoning being measured, and above-level items already consume most of it | Render the bank's `content.prompt` for the three QUANT types; author one for the two FLU types | Sweller, van Merriënboer & Paas (2019) |
| Dual coding / multimedia redundancy | An item carried on one channel fails completely when that channel fails, which is exactly the voiceless `VER-RELPAIR-01` case | Flag audio-unavailable responses unscorable rather than scoring a guess at an unperceivable item | Mayer (2021) |
| Coherence — words and pictures must agree | A spoken instruction naming "words" and "tap" over a pictorial, click-to-aim presentation actively misdirects | Make the spoken prompt a property of the presentation, not the bank | Mayer (2021) |
| Feedback is double-edged | Correctness feedback would both leak the key and reshape effort mid-measurement | Keep correctness off the client entirely; keep coins on participation | Kluger & DeNisi (1996); Hattie & Timperley (2007) |

**Tradeoffs to watch.** Adding instructions moves toward disclosure, and the stealth framing is load-bearing
for this product — the mitigation is that task instructions and battery names are different things, and only
the latter reveals that abilities are being sorted. Adding a progress signal risks reintroducing the rushing
the counter's removal was meant to stop, which is why an in-world fill is safer than a count.

I have not verified the Mayer (2021) edition details or the exact Kluger & DeNisi effect proportion against
the primary sources; the principles are standard and widely reported, and the specific numbers should be
checked before quoting them anywhere external.
