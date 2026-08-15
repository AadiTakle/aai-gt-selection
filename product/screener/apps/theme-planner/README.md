# Theme planner

Describe a theme, get the development plan, edit it, save it.

```bash
npm run planner        # from the repo root or from screener/
# http://127.0.0.1:5190
```

## What it does

Every asset it lists is there because a question type you selected cannot be presented without it. So
the type selection is the real control and the plan is downstream of it. Dropping a type is what
removes work, and the brief list says which types depend on each piece, so you can see the difference
between shared infrastructure and a line item one type is costing you.

It reports four numbers that a producer can plan against: pieces of art, interactions to build, prompts
to re-voice, and types needing new questions written. That last one is the expensive column, and it is
separated from re-voicing on purpose. Re-voicing rewrites an instruction, once per type, and cannot
change what is measured. Re-authoring writes material per item, because for Sentence Completion the
sentence *is* the item, so a themed version is a new question at a new difficulty.

The legend is section 5 and it is the reused part: one variable serves many question types, so editing
it once changes all of them. Validation runs as you type, and the check that earns its keep is the
ordering one, because mapping a progression rule onto unordered values produces an item that looks
completely finished and cannot be solved.

Saving writes a theme pack into `packages/ui-contract/themes/`, where the command line tool reads it:

```bash
npm run ui -- --theme <your-theme-name>
```

## Edits

Brief edits and the theme pack are held in `localStorage`, keyed per brief, so changing the type
selection re-derives the plan without discarding anything you have written. "Reset to the generated
version" is per brief.

## Shape

`server-plugin.ts` is the back end, as a Vite dev-server plugin rather than a service, because the
requirement derivation reads 35MB of banks and none of that belongs in a browser. Four endpoints:
`/api/catalogue`, `/api/plan`, `/api/validate`, `/api/save-theme`. The asset briefs themselves come from
`packages/ui-contract/src/assets.ts`, which is the translation from `nominalChannel: 4` into something
an illustrator can act on.
