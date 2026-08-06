# Question library

A browsable catalogue of 52 playable item types across seven areas of reasoning. Built for showing
breadth in a live demo, so everything runs in a browser with no build step and no dependencies.

## Open it

```bash
cd qbank-library
python3 -m http.server 8000
```

Then go to http://localhost:8000.

Opening `index.html` directly by double-clicking also works, but browsers block embedded local files,
so the in-page preview will be blank and you have to use the "Open in new tab" button on each item.
Serving it is one command and avoids that entirely, so serve it.

## What is in it

| Area | Items | What it probes |
| --- | --- | --- |
| Spatial reasoning | 14 | Mental rotation, folding, perspective, cross-sections. No reading. |
| Fluid reasoning | 11 | Working out a rule that was never taught, then applying it. |
| Quantitative reasoning | 9 | Number sense, rules and relationships. Several need no reading. |
| Verbal reasoning | 8 | Meaning, relations between words, sense-making in language. |
| Interactive tasks | 6 | Longer tasks where the process is observed, not just the answer. |
| Working memory | 3 | How much a child can hold and manipulate at once. |
| Consistency check | 1 | Serves the same problem twice to test whether an answer was stable. |

## Using it in a demo

The catalogue answers "how much can you actually measure," and the three things worth pointing at are:

**Breadth without reading.** Everything in spatial, most of quantitative and much of fluid needs no
reading at all. That matters because a child with grade-eight vocabulary and grade-four decoding looks
weak on any test delivered as text, and separating those two is a stated requirement.

**The interactive tasks measure something a multiple-choice item cannot.** In the six under
"Interactive tasks," what a child does on the way to an answer is visible, not just which option they
picked.

**The consistency check is the honest one.** It serves the same problem twice. If a child answers
differently, that is information about how much to trust the rest of the session, and most screeners
have nothing equivalent.

## What this is and is not

This is the **catalogue**. It shows what can be asked.

It is not the screener. Deciding which question to ask next, how hard each item type actually is, when
to stop, and what the result means all live in the screening engine under `../screener/`, which is a
separate thing and under active development. Difficulty, discrimination and how well an item type
behaves are properties of the item type rather than of any single question, and they belong there
rather than here.

Several of these families generate a fresh version of the question each time they run, so no two
children see the same item. That is deliberate: sitting the same reasoning test twice raises the score
by about a third of a standard deviation with nobody teaching anything, and the effect is larger in
younger children, so a public-facing screener needs forms that never repeat.

## Each page shows the question and nothing else

Two patches strip these catalogue copies down to the item itself. Both are idempotent and reversible,
and neither touches the live screener.

**`patch-autostart.py`** removes the "press play to start" gate, which put a click and a piece of
broken copy ("Press play when you are, and it starts then") between the viewer and the question. It
does not reimplement anything: each demo already has a `#play` button whose handler is the page's own
start path, so the injected script clicks that, which is exactly what a person clicking it would do.
It watches the gate rather than firing once, because several demos reopen it between rounds.

**`patch-presentation.py`** hides the developer chrome that was left around every question:

| Hidden | What it was |
| --- | --- |
| `#playgate` | An unstyled div holding the Play button. Carrying no CSS of its own, it never left the layout when the gate was dismissed, so the button stayed parked at the bottom of all 52 pages. |
| `#telemetry` | A 320px dark sidebar with the item id, difficulty meters and a live event log. Useful when building an item, noise when showing one. |

Both are hidden rather than deleted, because the pages' own scripts still write into those nodes and
removing them from the DOM would throw. Hiding also keeps the autostart patch working, since `.click()`
fires on a hidden button.

```bash
python3 patch-autostart.py && python3 patch-presentation.py   # strip it down
python3 patch-presentation.py --revert                        # put the chrome back
python3 patch-autostart.py --revert                           # put the gate back
```

### The explanation at the top was already there

Each item leads with its own `#howto` header — "How to use — Machine Matrix", then how to answer it —
and that text is written in all 52 files already, so nothing was authored here. The presentation patch
only widens it a little, now that it is the first thing a viewer reads.

### Press `t` if someone asks what an item measures

The telemetry panel is one keypress away rather than gone, since the item id, difficulty meters and
event log are the most direct answer to "what are you actually capturing." Hidden by default because
it is not part of the question.

### Verifying

```bash
python3 verify.py
```

Renders all 52 in headless Chromium and checks that the gate is dismissed, the Play button and
telemetry sidebar are not visible, the how-to text is showing, and the question itself rendered.
Currently 52/52 clean. Note that the memory and matrix families play a demonstration sequence first,
so their prompt appears a few seconds in rather than immediately. That is the item working.

Whether the live screener should keep its gate is a separate question and has not been touched here.
There is a real argument for keeping it there, since a child who has not started paying attention
produces a bad first response, and the gate is what makes the start deliberate.

## Regenerating the index

`index.html` is generated from the files in `items/`, so it cannot drift out of sync with what is
actually on disk. After adding or removing anything:

```bash
python3 build-index.py
```

It reads each file's own title, groups by prefix, and rewrites the page. Adding a new item type means
dropping an HTML file into `items/` and rerunning it.

## Provenance

These item types were built earlier in this project and were sitting in `archive/`. They are copied
here rather than referenced there, so this directory stands on its own. Nothing here has been
calibrated against real children, and none of these demos reports a score.
