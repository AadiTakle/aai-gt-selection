# UI kits

A **kit** is one JSON file that says what a question's variables look like. Write one and any app can
draw any question the kit covers, without the question knowing anything about Pokémon and without the
Pokémon knowing anything about the question.

```
npm run kit                          # report on the shipped Pokédex
npm run kit -- path/to/your.kit.json # report on yours
```

## The problem a kit solves

A bank item arrives already abstracted: `{identity: 2, category: 0, count: 3}`, plus a manifest saying
identity is nominal with 15 possible values, count is ordered. The numbers mean nothing. A kit decides
that identity 2 is a Charmander.

## The shape of the file

```json
{
  "kit": "gt.uikit/v1",
  "id": "pokedex",
  "name": "Pokédex",

  "art": { "template": "https://.../sprites/pokemon/{dex}.png", "missing": "silhouette" },

  "dimensions": {
    "identity": { "from": "bank", "field": ["type", "line"] },
    "category": { "from": "bank", "field": ["stage", "line"] },
    "count":    { "from": "repeat", "max": 9 },
    "scale":    { "from": "scale", "min": 0.6, "max": 1.5 },
    "rotation": { "from": "rotate", "steps": 4 },
    "fill":     { "from": "tint", "values": ["card", "shadow", "outline"] },
    "text":     { "from": "none", "why": "no sprite can stand in for what a word means" }
  },

  "bank": [
    { "id": "charmander", "label": "Charmander", "dex": 4, "line": "charmander", "type": "fire", "stage": 1 },
    { "id": "charmeleon", "label": "Charmeleon", "dex": 5, "line": "charmander", "type": "fire", "stage": 2 }
  ]
}
```

Two parts. `dimensions` says how each variable is answered. `bank` is the library of things, each
carrying whatever variables it happens to embody. Everything past `id`, `label` and `art` is your own
vocabulary — call the fields whatever you like and point `field` at them.

## Where a variable can come from

| `from` | Means | Costs you |
| --- | --- | --- |
| `bank` | Look it up. Entries carry it under `field`. | Entries |
| `repeat` | Draw the chosen picture N times. | Nothing |
| `rotate` | Turn it. `steps` is how many orientations you have. | Nothing |
| `scale` | Draw it bigger or smaller, between `min` and `max`. | Nothing |
| `tint` | Apply one of `values` on top. Your app decides what the tokens mean. | Nothing |
| `none` | You cannot show this. Say `why`. | Nothing |

Only `bank` needs entries. Three Pikachu is one Pikachu drawn three times, so `count` is free — which
is why a 75-entry Pokédex gets count, rotation, scale and shading thrown in.

`none` is a real answer, not a failure. A sprite kit should refuse `text`, and then be told which
question types it therefore cannot serve, rather than drawing something that looks fine and cannot be
solved.

## The two rules that will bite you

**1. Two variables can only vary independently if their fields cross.**

The natural first draft maps identity onto species. It also silently breaks every matrix, because a
species has one type: ask for three species and three types and eight of the nine cells do not exist.
Nothing about the variables tells you this. The report does:

```
WHAT THE BANK CROSSES
  stage x type    43/45    96%   biggest block 3x13
  line x type     28/420    7%   biggest block 1x1
```

`type × stage` fills a 3×13 block, so identity → `type` and category → `stage` serves any matrix up to
13 wide. `line × type` fills 1×1 and serves nothing. Same 75 entries, and the mapping is the whole
difference — on the shipped Pokédex it moved coverage from 38% to 75%.

**2. An ordered variable needs fields that hold numbers.**

If an item says "one more each time", the concrete values have to carry an order a child can see.
`stage: 1, 2, 3` does. `type: "fire", "water"` does not, and mapping an ordered variable onto it
renders beautifully and cannot be solved. The resolver refuses instead.

## Naming more than one field

`"field": ["stage", "line"]` means best first. `stage` looks better and has three values; an item
needing four gets `line` instead. The resolver picks per item, weighing reach against crossings, and
tells you which it used in `using`. Two variables never share a field, since that would tie them
together.

## What the resolver guarantees

Given elements and a kit, `resolve()` returns a picture for each, and:

- cells the item says **differ** get different entries, always — never `bank[value % length]`, which
  collides and turns a matrix into a question with two defensible answers
- cells the item says **match** get the identical entry
- **ordered** variables come back in order
- when only a transform varies, the picture underneath **stays the same**, so three-then-five is about
  the number rather than about the thing
- when it cannot do any of that, it **fails and says why**, naming the variable to blame

`uikit.test.ts` holds each of those as a test over many seeds. They are the reason a re-themed item
still measures what it measured.

## Writing your own

1. Copy `kits/pokedex.kit.json` and replace the bank.
2. Run `npm run kit -- your.kit.json`.
3. Read **WHAT THE BANK CROSSES** first and map your widest-crossing pair to `identity` and `category`.
4. Read **PROBE**. It resolves real bank items and is the only number that means anything.
5. Set anything you genuinely cannot draw to `none`, with a `why`.

A kit that serves 14 types honestly beats one that claims 30 and quietly breaks 16.
