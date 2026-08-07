# Question-type review

The Stage-1 review harness, restored as an app, with one addition: you can redraw any question in a
different UI design without changing the question.

```bash
cd screener
npm install
npm run type-review     # http://127.0.0.1:5192
```

Nothing else needs to be running. The dev server reads the catalogue and the banks straight from their
real homes, so there is no copy to keep in sync and no API to start.

## What is the same as before

Everything. The stylesheet is lifted verbatim from
`archive/research/exam-question-types/review.html`, and so is the layout, the sidebar, the filters, the
difficulty explorer, the five comment categories and the export format. Even the browser storage key is
unchanged (`gt-type-review-v1`), so comments saved from the old tool are already here when you open it.

An export from this tool and an export from the old one can sit in the same document without a seam.

Two differences worth knowing about, both deliberate:

- **No play gate.** The catalogue copies of the renderers carry the autostart patch, so a question is
  ready immediately instead of behind a `Play` button and the line of broken copy that used to sit above
  it. The original still shows the gate; this does not.
- **Types with no bank are marked.** The catalogue lists 66 types and 49 of them have a bank on disk. The
  sidebar says `no bank` on the rest rather than letting you find out by clicking.

## The UI design selector

Top of the demo panel. Three designs, all shown the *same* item at the same difficulty:

| Design | What draws it | Coverage |
| --- | --- | --- |
| **Default — shapes, colours, counts** | The catalogue's own renderer for that type, embedded unchanged | all 49 banked types |
| **Pokédex — real Pokémon sprites** | One generic renderer, dressed from `kits/pokedex.kit.json` | 11 types drawn, 38 refused with a reason |
| **Hatchling garden — flowers** | The same generic renderer, dressed from `kits/hatchling.kit.json` | 11 types drawn, 38 refused with a reason |

The default is the reference. It is a hand-built design per question and it looks it; the two themed
designs are one renderer serving everything, and they have to earn their place against it.

**The refusals are the point, not a gap.** A themed design that quietly drew an approximation would leave
an item looking answerable when it is not — a child would answer, the engine would score it, and nothing
on screen would say anything was wrong. So when the resolver cannot guarantee that cells the item says
differ get different pictures, the panel prints why instead. Reading those messages is a fast way to see
which question types are genuinely re-skinnable and which are tied to their own artwork.

## The kits

A kit is a hand-editable JSON file: a list of things, each carrying the variables it embodies, plus a
block saying which variable is answered by which field. Format reference and the rules that make a kit
work are in `../lab-system/shared/uikit/README.md`.

- `kits/pokedex.kit.json` — 188 real Pokémon across 17 types and 78 evolution lines. Sprites come from
  the public PokeAPI sprite repository, keyed by National Pokédex number.
- `kits/hatchling.kit.json` — 12 species × 4 growth stages, drawn as inline vector art in
  `art/hatchling.tsx`, following the palette of the Hatchling theme in `apps/lab-character`.

Check either one, or one of your own, with:

```bash
npx tsx apps/lab-system/shared/uikit/cli.ts apps/type-review/kits/hatchling.kit.json
```

That prints any problems in the file, which pairs of fields cross (the thing that decides whether a kit
can serve a grid at all), and a probe that resolves real bank items. Both shipped kits report no problems
and draw 79% of probed items.

The Pokédex crosses `type × stage` at 97% in a 9×3 block. The garden crosses `species × stage`
**completely**, 48 of 48, in a 12×4 block, because every species was given every stage on purpose — which
is why it can serve grids the Pokédex cannot.

## Adding a fourth design

1. Write `kits/<name>.kit.json`. Copy an existing one; the format reference is linked above.
2. If it needs vector art rather than image URLs, add `art/<name>.tsx` exporting `<Name>Sprite`. The
   `size` prop is a **relative** scale where 1 is the default, not a pixel count.
3. Add an entry to `designs.ts`.

Both the kit and the art module are picked up by `import.meta.glob`, so a missing file shows a message in
the panel rather than breaking the build.

One thing to check before you ship art: look at it at ~50px, in a grid, next to its siblings. Two plants
that are obviously different at 200px can be the same green blob in a matrix cell, and a matrix whose
cells are not clearly different is not a hard question, it is an impossible one.
