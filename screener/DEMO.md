# Demo script

Roughly ten minutes. The order matters, because each step sets up the next.

```bash
cd screener && npm install && npm run dev     # http://localhost:5180
```

If you want to prove it works before you present, `npm run verify` runs a typecheck, 93 unit
tests, a synthetic cohort, and 20 end-to-end checks over HTTP.

---

## The one sentence to open with

The library is the product. The screener and the practice tool are two things built on it, and
either could be replaced without touching the library.

---

## 1. Take the screener (2 min)

**Screener** tab. Leave the age band at 3-5, tick **show the engine's internals**, press Start.

Answer honestly and watch the line under each question. `P(above threshold)` moves after every
answer, and the session ends when it is confident rather than after a fixed number of questions.
Answer well and it stops early; answer inconsistently and it uses the full sixteen.

Two things to say while clicking:

- It reports a probability with a band, never a score or a percentile. Ten to sixteen
  uncalibrated questions cannot support a number about a child, and the evidence on short tests
  is clear that a classification is affordable where a score is not.
- There are exactly two outcomes and neither is a rejection. It can only ever open a door.

## 2. The partition, which is the new part (2 min)

**Practice** tab. Before starting, read the table.

Of 13 families in the library, **7 reach the practice tool and 11 reach the screener**. Each
family declares whether it is teachable, assessment-only, or both, and the two tools see
different slices of the same snapshot.

Why it exists, and this is the part worth saying carefully: practising on an item family inflates
later performance on that family, by roughly a third of a standard deviation on a second sitting
and more in younger children, and the inflated score shifts toward memory and away from
reasoning. So a prep course drawing from the screener's own families would be coaching applicants
on the screener. The partition is what prevents that, and it is enforced in the library rather
than trusted to whoever builds the next tool.

Then press **Start practising**, answer one question, and let the explanation come up. The rule,
the working with this item's own numbers in it, and the mistake a learner probably made. The
generator wrote all three, because it built the item from that rule and would otherwise have
thrown it away.

Point out what is absent: no score, no percentile, no decision, no recommendation. This tool
makes no claim about anybody.

## 3. The 52 playable questions, and the theme switch (2 min)

**Question catalogue** tab. This is the existing question library running inside the app.

Pick **Spatial reasoning** and any item. It plays. Nothing in that file was edited to get it here.
Point at the flags above the frame: `ready`, a telemetry count that climbs as the child works, and
`result received` when they answer. The items were already broadcasting all of that to their parent
window, so observing a session cost nothing.

Now change **Theme** from Institutional to Ink on paper, then to Evening. The question re-skins
instantly. The host is setting CSS custom properties on the embedded document, so the visual
identity is a setting rather than a property of the questions, and no file changed.

Scroll to the palette table and drag a colour. It applies live, and the right-hand column says
whether this particular item uses that property. The counts are honest: `--ink` is in all 52 items,
the telemetry colours in 31, so a theme reaches most of the catalogue and not every corner of it.

Two things to say while clicking:

- Spatial and working memory need no reading at all, 17 items in total. That is what lets a child
  whose decoding lags their reasoning show what they can actually do.
- The result panel shows response time, revisions and focus losses, and it shows **no** correctness.
  The items refuse to report that on purpose, so scoring them needs a key held on our side. Say this
  before anyone asks, because it is the obvious question.

## 4. Editing a live library without breaking it (2 min)

**Library studio** tab. This is the architectural claim, and it takes thirty seconds.

1. Find `spatial.mirror`. Press **Deprecate**.
2. Go back to **Screener** and start a session. It still serves, because that session reads a
   snapshot cut before the deprecation.
3. Return to the studio and press **Cut a new snapshot**. `spatial.mirror` is absent from it.

Published versions are immutable and screeners pin a snapshot, so an author can publish, edit or
retire a family at any time and nothing already running changes. Removal is deprecation, which is
why there is no delete button.

While you are here, press **Preview** on any family. Six items from consecutive seeds, plus the
publish-check report. Same seed always renders the same item, which is verified at publish time
rather than assumed, because session replay depends on it.

Worth mentioning: those checks caught four real faults while the seed bank was being written. Two
families were too small to avoid repeating forms, and two could emit a wrong answer identical to
the right one.

## 5. What it records (1 min)

**Statistics** tab. Sessions, item behaviour keyed by generator *version*, and screener
effectiveness split by surface.

The row to point at is effectiveness. It reads **not available** rather than zero, because no
real outcome has been attached to a session yet, and "we do not know" and "it scored zero" are
different statements. Attach one real outcome and the whole column computes.

## 6. The honest close (1 min)

Say this before anyone asks it.

**Nothing is calibrated.** Every difficulty number on screen is an assumption we chose, so the
probability the screener reports is a demonstration of a mechanism rather than a measurement of a
child. The studio marks it on every row and the simulation prints it. Turning on
`requireCalibratedItems` today leaves nothing servable, which is the correct behaviour.

**No real child has taken this.** `npm run sim` runs synthetic candidates whose true ability the
code invents and hides from the engine. It tests an algorithm.

**The item budget is at the low end of the evidence.** Classification research brackets 8 to 16
items for a two-category decision, and one paper asking the question directly advises at least 20
and 40 for individual decisions. Raising the cap is a config change.

---

## Questions you should expect

**"Is this the in-house cognitive test Joe banned?"** The screener measures reasoning and makes a
recommendation, so that question is fair and it needs your answer, not mine. The practice tool is
cleaner: it makes no decision at all, so it is the safest of the two to build first.

**"How accurate is it?"** On synthetic candidates the screener recovers about 73% of those truly
above the threshold at 97% specificity, in a median of 8 questions. Those are simulation numbers
against a hidden truth the code generated, and they say nothing about children.

**"Could Tiffany's CogAT familiarisation run on this?"** Two answers, and show both. The Practice
tab is the generator-driven version: same library, same measurement primitives, none of the
screener's decision machinery. The Question catalogue tab is the hand-built version: her 52 items
already run here and already re-skin to whatever visual identity the course needs. Adding to either
means publishing content, not building a second system.

**"What would you do next?"** Calibrate. Everything else here is downstream of the fact that no
difficulty parameter has ever seen a real response.
