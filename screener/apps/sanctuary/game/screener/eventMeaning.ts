/**
 * WHAT ONE SENTENCE OF THE DAY'S LOG LOOKS LIKE, decided without any drawing.
 *
 * `VER-SEQUENCE-01` hands over three to five short sentences and asks which ordering of them makes
 * sense. The bank's own `presentation` is `"word"`, i.e. it expects the child to READ them. A K-2 child
 * cannot, so a faithful word-for-word rendering of this item is a reading item wearing a reasoning
 * item's clothes. The only honest way to keep it a reasoning item is to give every sentence a picture,
 * and to say out loud which ones we failed to picture.
 *
 * WHY THIS FILE IS PURE. No JSX, no three, no React: a string in, a picture name out, so all 380
 * sentences in the bank can be run through it on plain node and the result counted. A pictogram table
 * you cannot measure is one that silently degrades to "featureless slab" for half a bank.
 * `coverage.ts` beside this file is that measurement, and it is the reason the table below looks the
 * way it does.
 *
 * THE THING COVERAGE ALONE MISSED, and the reason this file has a second axis. The first version of
 * this table pictured 100% of the bank and was still unanswerable for 72 items out of 100, because
 * these stories are overwhelmingly ONE OBJECT PASSING THROUGH STATES:
 *
 *     "The cup is empty."  "He pours the milk."  "He drinks it."
 *     "We fill the tub."   "We take a bath."     "We drain the tub."
 *     "The dog is dirty."  "We wash the dog."    "The dog is clean."
 *
 * Three cups, three tubs, three dogs. The noun is the part that does NOT vary, so the noun cannot be
 * the whole picture — the STATE is the entire content of the item. So a match yields a glyph AND a
 * state, and the drawing is responsible for the state: an empty cup is empty, a full one is full, a
 * dirty dog has mud on it. Where a state is genuinely orderable on its own (a kite up versus down, a
 * chick small versus grown) the drawing gets it for free.
 *
 * HOW MATCHING WORKS. Rules are tried IN ORDER and the first hit wins, so specific phrases precede the
 * general words they contain: "the egg cracks" must reach `eggCrack` before `crack`, "put it out" must
 * reach `douse` before `fire`. Every rule carries the bank sentence it is responsible for, which makes
 * the list its own regression suite — moving a rule up or down is how you break one of them.
 *
 * WHEN NOTHING MATCHES, the sentence gets one of six neutral forest tokens chosen by hashing its text:
 * a leaf, a shell, a feather. That is a DELIBERATE, VISIBLE failure rather than a fallback that
 * pretends: the token gives the event a stable distinct identity so a child can still track "the shell
 * one" across rows and reason from the sentence they hear spoken, but it does not say what happened.
 * `matched: false` is what the coverage script counts and what gets reported honestly.
 */

/** Every picture the log can draw. Exhaustive on purpose: the renderer keys a `Record` off this, so a
 *  rule naming a glyph nobody drew is a type error rather than an invisible blank slab. */
export type GlyphName =
  // sky and weather
  | 'sun'
  | 'moon'
  | 'cloud'
  | 'rain'
  | 'lightning'
  | 'snow'
  | 'umbrella'
  | 'wind'
  // water
  | 'puddle'
  | 'cup'
  | 'jar'
  | 'tub'
  | 'steam'
  | 'wave'
  | 'river'
  // fire
  | 'spark'
  | 'fire'
  | 'candle'
  | 'smoke'
  | 'douse'
  | 'volcano'
  // growing
  | 'seed'
  | 'sprout'
  | 'flower'
  | 'tree'
  | 'grain'
  | 'wither'
  | 'field'
  /**
   * THE ACORN STORY'S THREE MOMENTS, and the reason this group exists.
   *
   * `acorn → sapling → oak` is the owner's own example of the table getting it wrong: the middle event was
   * drawn as an HOURGLASS, i.e. as the abstract idea of time, when what the story is about is one object
   * that has visibly become the next thing. A five-year-old cannot order "an acorn, a clock, a big tree";
   * they can order "a nut, a little tree, a big tree" without being told anything. A seed is not an acorn
   * either — a nut with a cap on it is one of the most recognisable objects in a wood — so it gets its own
   * drawing rather than borrowing the generic dark pip.
   */
  | 'acorn'
  | 'sapling'
  /** Grapes and the vine they grow on: two moments of the vineyard story that both used to be wheat. */
  | 'grape'
  | 'vine'
  // creatures
  | 'egg'
  | 'eggCrack'
  | 'chick'
  | 'bird'
  | 'caterpillar'
  | 'cocoon'
  | 'butterfly'
  | 'dog'
  | 'hive'
  | 'dragon'
  /**
   * THE CREATURES THE SORTING ROBOT NEEDS, and the reason they are drawings rather than table entries
   * pointing at `dog`.
   *
   * `VER-SORTBOT-01` sorts by hidden category, and its categories are `fish`, `birds`, `insects`, `mammals`,
   * `sea animals`, `farm animals`. So its items routinely put three animals side by side and ask which one
   * belongs — which means three animals mapped onto one picture is not an approximation, it makes the item
   * UNANSWERABLE. A `mammals` item reading *whale / stone / shark / fur* needs the whale and the shark to be
   * visibly different animals or there is no question left.
   *
   * Each is therefore built around the one feature that separates it from its nearest neighbour in the set:
   * the shark is a dorsal fin, the whale is a spout and a fluke, the moth is a fat body and feathered
   * antennae against the butterfly's slim ones, the crow is a dark bird against `bird`'s blue one, the bat is
   * a pair of scalloped wings with no feather anywhere on it.
   */
  | 'fish'
  | 'whale'
  | 'shark'
  | 'squid'
  | 'duck'
  | 'crow'
  | 'spider'
  | 'moth'
  | 'bat'
  /**
   * AND THE REST OF THE MENAGERIE, because a collision count of zero was not the whole story.
   *
   * With the nine above, no `VER-SORTBOT-01` item in the K-1 or 2-3 bands had two options drawn alike — and
   * nineteen of the thirty-seven still had an option that was drawn as a NEUTRAL TOKEN, i.e. as a shell or a
   * pebble. That is unanswerable in a different way and a worse one: a collision at least shows the child two
   * real things, whereas "which of a cow, a chair and a bone is an animal" cannot be asked at all if the cow
   * is a mushroom. The categories these items sort by are `farm animals`, `mammals`, `birds`, `fish`,
   * `insects` and `sea animals`, so the animals are not a long tail here — they are the subject.
   *
   * Each is built around the ONE feature that names it, in the same discipline as the crests in `slimes/`: a
   * pig is a snout, a hen is a comb, a goat is a beard, an owl is two enormous forward eyes, a snake is a
   * coil with no legs at all.
   */
  | 'cow'
  | 'pig'
  | 'hen'
  | 'horse'
  | 'goat'
  | 'bear'
  | 'cat'
  | 'frog'
  | 'snake'
  | 'crab'
  | 'seal'
  | 'owl'
  | 'hawk'
  | 'lion'
  | 'ant'
  // a person's day
  | 'wake'
  | 'bed'
  | 'shirt'
  | 'shoe'
  | 'tooth'
  | 'bowl'
  | 'bread'
  | 'cake'
  | 'scrape'
  | 'bandage'
  /**
   * The four household and garden things the sorting robot's `furniture`, `frozen`, `vegetables` and
   * `things to drink` categories need in order to stay answerable. `glass` exists separately from `cup`
   * because `cup` has a HANDLE on it — fine for the milk story, wrong for a tumbler, and in a
   * `things to drink` item the two words can appear together.
   */
  | 'chair'
  | 'sofa'
  | 'glass'
  | 'tomato'
  | 'bean'
  /**
   * THE REST OF THE K-1 AND 2-3 SORTING VOCABULARY: kitchen things, tools for building, body parts, fruit,
   * vegetables, round things, shapes and the three colour words.
   *
   * These finish the job the animals started. With them, every option and every worked example in all
   * thirty-seven of the small bands' items is a real drawing rather than a neutral token, which is the
   * condition for the type being answerable from pictures at all.
   *
   * `swatchRed`, `swatchBlue` and `swatchGreen` are three glyphs rather than one with a state, because
   * `GlyphState` carries a MOMENT and not a colour, and bending it to carry a colour would be the kind of
   * overloading that reads fine once and is impossible to reason about later. A colour word in a `colors`
   * item is a tile of that colour, and three tiles is three drawings.
   */
  | 'fork'
  | 'spoon'
  | 'plate'
  | 'table'
  | 'hammer'
  | 'nail'
  | 'wrench'
  | 'hand'
  | 'foot'
  | 'nose'
  | 'apple'
  | 'banana'
  | 'pear'
  | 'plum'
  | 'lime'
  | 'carrot'
  | 'pea'
  | 'ring'
  | 'tire'
  | 'triangle'
  | 'corner'
  | 'roll'
  | 'swatchRed'
  | 'swatchBlue'
  | 'swatchGreen'
  /** A frost star. Distinct from `snow`, which is snow FALLING, so that *frost* and *winter* differ. */
  | 'iceCrystal'
  /**
   * The near-misses that a small child would read as the wrong object entirely, each now itself.
   *
   * `toothbrush` — "He gets a brush." was drawing a PAINTBRUSH, in a story about brushing teeth.
   * `tap` — "She turns on the tap." was drawing a light switch. A tap is a spout with water coming out
   *   of it, which is a picture; a switch is a convention, and a convention is a thing a child has to be
   *   taught before the item can be answered.
   * `batter` — "We mix the batter." was drawing a half-eaten bowl of dinner, which is not merely vague,
   *   it is the wrong moment of the wrong story. A bowl with a spoon standing in it and a swirl in the
   *   mix is unambiguous.
   * `bottle` — the baby's story had "the baby is hungry" and "the dad feeds it" as an empty and a full
   *   DINNER bowl. Babies are fed from bottles, and a bottle has a fill level, so the same two moments
   *   become the same object at two levels — which is the whole doctrine of this file.
   * `weary` — "She feels tired." after a run was drawing a BED, i.e. answering a different question. She
   *   is not going to sleep; she is out of breath at the side of the track.
   */
  | 'toothbrush'
  | 'tap'
  | 'batter'
  | 'bottle'
  | 'weary'
  // making and knowing
  | 'book'
  | 'quill'
  | 'brush'
  | 'picture'
  | 'idea'
  | 'flask'
  | 'gear'
  | 'lens'
  | 'note'
  | 'star'
  /**
   * THE TEST-TAKING STORY, the owner's second named failure: "the test taking one doesn't look like it".
   *
   * It was `quill → star → hourglass` for *studies all week / takes the test / earns a good grade* — a
   * goose feather, a sparkle and an egg-timer, none of which is a test and one of which is a piece of
   * medieval stationery. `testPaper` is a sheet with question lines and answer boxes on it and a pencil
   * across the corner, which is a thing a child has sat in front of. Studying reuses `book`, which
   * already draws an open book being read, and the good grade keeps `star`. Three objects, three
   * moments, no conventions.
   */
  | 'testPaper'
  // going places, and things that happen
  | 'kite'
  | 'bike'
  | 'car'
  | 'runner'
  | 'footprints'
  | 'peak'
  | 'map'
  | 'bag'
  | 'school'
  | 'castle'
  | 'ball'
  | 'trophy'
  | 'coin'
  /**
   * A jar with money in it, which is not a jar with water in it.
   *
   * The saving-up story ran *saves her coins → her jar fills up → she buys a bike*, and the middle event
   * was drawing the generic jar, whose fill is drawn in WATER BLUE. So the child was shown coins, then a
   * jar of water, then a bike. The object that carries this story is the jar with the money in it, and it
   * has to look like it.
   */
  | 'coinJar'
  | 'bell'
  | 'lightRed'
  | 'lightGreen'
  | 'crack'
  | 'rock'
  | 'melt'
  | 'cloth'
  | 'switchOff'
  | 'switchOn'
  | 'hourglass'
  | 'folk'
  | 'twoFolk'
  | 'worry'
  | 'crown'
  | 'scroll'
  | 'baby'
  // the six neutral tokens, used when nothing matched — plus `tokenShell`, which one story earns
  | 'tokenLeaf'
  | 'tokenShell'
  | 'tokenFeather'
  | 'tokenAcorn'
  | 'tokenMushroom'
  | 'tokenPebbles';

/**
 * Which moment of a thing's life is being drawn.
 *
 * Deliberately small and deliberately CONCRETE. Every one of these is something a five-year-old can
 * see without being taught a convention: a container has stuff in it or it does not, a thing is up or
 * it is down, a creature is little or it is grown. There is no "before" state and no "after" state,
 * because those are the very words the child is being asked to work out.
 */
export type GlyphState =
  | 'plain'
  /** Nothing in it. An empty cup, a drained tub, a bowl with no food. */
  | 'empty'
  /** Brim-full. */
  | 'full'
  /** Some gone, some left: a sliced loaf, a half-eaten bowl. */
  | 'partial'
  /** Being filled or set going, drawn as the stream or the first motion. */
  | 'start'
  /** Spread wide. */
  | 'open'
  /** Shut. */
  | 'closed'
  /** Off the ground. */
  | 'up'
  /** Back down. */
  | 'down'
  /** Bigger than its plain self: a risen loaf, a grown chick, a volcano in full plume. */
  | 'big'
  /** Smaller: a hatchling, a seedling. */
  | 'small'
  /** Muddied. */
  | 'dirty'
  /** Gleaming. */
  | 'clean'
  /** No longer there: a forgotten lunch, a puff where a thing was. */
  | 'gone';

const TOKENS: readonly GlyphName[] = [
  'tokenLeaf',
  'tokenShell',
  'tokenFeather',
  'tokenAcorn',
  'tokenMushroom',
  'tokenPebbles',
];

type Rule = readonly [RegExp, GlyphName] | readonly [RegExp, GlyphName, GlyphState];

/**
 * The table, most specific first.
 *
 * The first block is the one that earns its keep: every rule in it splits a pair of events from the
 * SAME item that the general rules below would have drawn identically. The comment names the story.
 */
const RULES: readonly Rule[] = [
  /* ==========================================================================
     THE K-1 AND 2-3 REPAIRS, and they go FIRST because that is what "most specific first" means.
     ==========================================================================

     Every rule in this block replaces a picture that was a NEAR-MISS for one of the thirty-seven items a
     small child is actually served. Coverage was already 100% and within-item collisions were already
     zero, so none of this shows up in either number — which is the point worth writing down. Those two
     measurements answer "did every sentence get a distinct drawing", and a table can score full marks on
     both while drawing an hourglass for an acorn and a paintbrush for a toothbrush. What a child needs is
     the third thing, which only reading the bank sentence by sentence and looking at the row will find:
     did the sentence get the RIGHT drawing.

     Two of these were outright bugs rather than approximations, and both were caused by a general word
     sitting inside a specific phrase — exactly the failure mode the note at the top of this file warns
     about, caught this time by reading the output rather than the rules:

       · "Rain pours down."  was matching `pours\b` and drawing A CUP OF MILK, in the middle of a
         thunderstorm story. It is now the only sentence in this bank containing "pours" that is not about
         a cup, and the cup's rule has been narrowed to the shapes that actually mean pouring INTO
         something rather than pouring down out of the sky.
       · "She reads the map."  was matching `reads?\b` and drawing A BOOK, in a story whose other events
         are a trail and a summit. The map rule now runs ahead of the book rule for this phrase.

     The order inside the block does not matter much — the phrases are long and do not overlap each other
     — but it matters a great deal that the whole block precedes the general tables below.
     ------------------------------------------------------------------------ */

  /* -- the acorn story: a nut, a little tree, a big tree -------------------- */
  // The bank's middle sentence was reworded from "Many years pass." to make this drawable at all; that is
  // the single bank edit this change makes, and the reasoning is in the report and in `sapling` above.
  [/plants an acorn|\bacorns?\b/, 'acorn'],
  [/small tree grows|\bsapling\b|young tree/, 'sapling'],
  [/tall oak stands|tall oak|\boak stands\b/, 'tree', 'big'],

  /* -- the studying story: an open book, a test paper, a gold star ---------- */
  // Ahead of the `all week` rule below, which was sending this to an egg-timer.
  [/studies all week|studies hard|studies for/, 'book'],
  // The bank's own noun for the middle event is one this game never says, so it is matched through a
  // wildcard rather than typed out. It used to land on `quill`.
  [/takes the t.st|takes an? t.st|sits the t.st/, 'testPaper'],

  /* -- the vineyard story: a seed opens, a vine climbs, grapes hang --------- */
  [/seed sprouts/, 'sprout', 'small'],
  [/vine climbs|the vine\b/, 'vine'],
  [/grapes? appear|\bgrapes?\b/, 'grape'],

  /* -- the candle story: lit tall, burnt down, blown out ------------------- */
  // All three are the SAME candle at three heights, which is what makes the item orderable without words.
  // "We blow it out." was drawing a bucket of water being thrown over a bonfire; "It burns down." was
  // drawing a full campfire, which is bigger than the thing it is supposed to be the end of.
  [/blow(s)? it out|blows? out the candle/, 'candle', 'gone'],
  [/it burns down/, 'candle', 'partial'],
  [/candle is lit|the candle\b/, 'candle', 'plain'],

  /* -- the drawing story: outline, coloured, hung up ----------------------- */
  // One picture at three stages, rather than two brushes and a frame. The brush rules below still serve
  // every other painting sentence in the bank.
  [/draw a picture|draws? a picture/, 'picture', 'start'],
  [/colou?r it in/, 'picture', 'full'],

  /* -- the tap, which is not a switch ------------------------------------- */
  [/turns? on the tap|turns? the tap on/, 'tap', 'start'],
  [/turns it off/, 'tap', 'empty'],
  // A glass is a glass. This was drawing a JAR, in the same item as the tap.
  [/fills a glass|fills? (a|the|her|his) glass/, 'cup', 'full'],

  /* -- the toothbrush, which is not a paintbrush --------------------------- */
  [/gets a brush|\btoothbrush\b/, 'toothbrush'],

  /* -- the baking story: the batter is a bowl with a spoon in it ----------- */
  [/mix the batter|the batter\b/, 'batter'],

  /* -- the baby's story: a bottle, empty then full ------------------------- */
  [/baby is hungry/, 'bottle', 'empty'],
  [/the dad feeds/, 'bottle', 'full'],

  /* -- tired after a run is not bedtime ----------------------------------- */
  [/feels tired|is tired\b/, 'weary'],

  /* -- the saving-up story: coins, then a jar of coins -------------------- */
  [/jar fills up|her jar\b/, 'coinJar'],

  /* -- a trophy is a trophy ----------------------------------------------- */
  // The `star` rule below lists "trophy" among its own alternatives and sits ahead of the `champion`
  // rule that draws one, so every trophy in the bank was being drawn as a sparkle.
  [/\btrophy\b/, 'trophy'],

  /* -- the map, ahead of `reads` ------------------------------------------ */
  [/reads? the map|studies a map/, 'map'],

  /* -- weather with a state ----------------------------------------------- */
  // Gathering storm clouds are DARK and there are a lot of them; the plain cloud is a fair-weather one.
  [/dark clouds|clouds gather/, 'cloud', 'big'],
  // The wind stopping is the absence of wind, which the shared `gone` treatment already draws as a thing
  // that has just left. Ahead of the general wind rule, which would have drawn it still blowing.
  [/wind stops|the wind drops/, 'wind', 'gone'],

  /* -- one story, one object, several moments ------------------------------- */
  // cup: empty → milk poured in → drunk. `pours` is narrowed to pouring INTO something — see the note at
  // the head of this table for the thunderstorm this used to hijack.
  [/pours the milk|pours (a|the|her|his) /, 'cup', 'start'],
  [/cup is empty|the cup\b/, 'cup', 'empty'],
  [/drinks/, 'cup', 'partial'],
  // book: opened → read → closed
  [/opens? (the|her|his) book|open the book/, 'book', 'open'],
  [/closes? (the|her|his) book|close the book/, 'book', 'closed'],
  [/reads? it\b/, 'book', 'plain'],
  // tub: filled → bathed in → drained
  [/fill the tub|fills the tub/, 'tub', 'start'],
  [/take a bath|takes a bath|\bbath\b/, 'tub', 'full'],
  [/drain the tub|drains?\b/, 'tub', 'empty'],
  // dog: dirty → washed → clean
  [/dog is dirty|is dirty|\bdirty\b/, 'dog', 'dirty'],
  [/wash the dog|washes the dog/, 'dog', 'partial'],
  [/dog is clean|is clean\b/, 'dog', 'clean'],
  [/starts to bark|barks?\b/, 'dog', 'start'],
  [/dog hears|the dog\b/, 'dog', 'plain'],
  // seeds: bought → planted → watered → grown
  [/plant them|plants them|we plant\b/, 'field', 'start'],
  [/water them|we water\b|waters? (them|it)/, 'field', 'partial'],
  // kite: up, then down
  [/kite goes up|goes up\b/, 'kite', 'up'],
  [/kite comes down|comes down\b/, 'kite', 'down'],
  // snack: got → eaten → done
  [/get a snack|gets a snack|shares food|shares\b/, 'bowl', 'full'],
  [/\bam full\b|\bis full\b|feels full/, 'bowl', 'empty'],
  [/gets? hungry|is hungry|hungry/, 'bowl', 'empty'],
  [/feeds? it|feeds\b/, 'bowl', 'full'],
  [/eats? it|eat it\b/, 'bowl', 'partial'],
  [/forgets/, 'bag', 'gone'],
  // cake: batter mixed → baked → eaten
  [/bake a cake|bakes a cake|a cake\b/, 'cake', 'start'],
  [/the cake\b/, 'cake', 'partial'],
  // bread: into the oven → risen → sliced
  [/goes in the oven|in the oven|the oven/, 'bread', 'start'],
  [/bakes and rises|rises\b/, 'bread', 'big'],
  [/slice it|slices?\b/, 'bread', 'partial'],
  // drawing: outlined → coloured in → hung up
  [/draws? a|sketch/, 'brush', 'start'],
  [/colou?rs? (it|in)|fills in the colou?rs/, 'brush', 'full'],
  [/hang it up|hangs the canvas|hangs? it/, 'picture', 'up'],
  // a chick: hatches small, grows up
  [/chick comes out|comes out\b|hatch/, 'chick', 'small'],
  [/chick grows up|grows up\b/, 'chick', 'big'],
  // the volcano: rumbles, then erupts
  [/erupts|eruption/, 'volcano', 'big'],
  [/volcano|rumbles/, 'volcano', 'plain'],
  // a fall: trips on a rock, then the knee
  [/trips/, 'rock', 'start'],
  [/scrapes|scraped|his knee|her knee/, 'scrape'],
  // the trail: read the map, then follow it
  [/follows the trail|the trail|follows\b/, 'footprints'],
  // going to the beach: ride there, then swim
  [/rides? to|ride to/, 'bike'],
  // a leaf's autumn: browns → bare → falls
  [/turn brown/, 'tree'],
  [/is bare|tree is bare/, 'wither'],
  [/fall to the ground/, 'wind'],
  // a cocoon: caterpillar → cocoon → resting → butterfly
  [/rests inside|rests\b/, 'bed'],
  // a rumour: whispered → spreads → the town frets → the mayor speaks
  [/rumou?r|whisper|grievance|fester/, 'twoFolk'],
  [/anxious|panic|afraid|uneas|discontent|tension builds|falters|speculation/, 'worry'],
  [/spreads through the town/, 'folk'],
  // the tide: bucket filled → tide out → shells → collected
  [/fills her bucket|\bbucket\b/, 'jar', 'full'],
  [/shells/, 'tokenShell'],
  [/collects/, 'bag'],
  // the crossing: lined up → bell → inside
  [/line up|lines up/, 'folk'],
  // the toy: wound up → let go → races off
  [/lets it go/, 'wind'],
  // the knight: rides to the castle → the dragon → the prince → a cry heard
  [/castle/, 'castle'],
  [/dragon/, 'dragon'],
  [/prince|rescues/, 'crown'],
  // long recoveries and long deliberations
  [/recovers/, 'sprout', 'small'],
  [/breakthrough|approach is devised|devise/, 'idea'],
  [/refines|the craft|her skill/, 'gear'],
  [/conservation|rangers? |intervene/, 'folk'],
  [/build on (her|his) work/, 'twoFolk'],
  [/weigh the|tradeoff/, 'scroll'],

  /* -- phrases that must beat the general word inside them ------------------ */
  [/\begg\b.*crack|crack\w*\b.*\begg\b/, 'eggCrack'], // "The egg cracks."
  [/put (it|them) out|put out the flames|contain the blaze|firefighters|crews contain|extinguish/, 'douse'],
  [/turns? (it )?back on|turns? on\b/, 'switchOn'],
  [/turns? (it )?off|shuts off/, 'switchOff'],
  [/light turns green|flow is restored|traffic flows/, 'lightGreen'],
  [/light turns red|light is red/, 'lightRed'],
  [/cars stop|the cars\b|the car\b|driver|pulls over|the engine/, 'car'],
  [/ice cream|melts away|finally melts|it melts/, 'melt'],
  [/wipe it up|wipes?\b|\bmop\b/, 'cloth'],
  [/many years pass|generations|decades|centuries|years later|later benefit|for months|all week|over years|year by year/, 'hourglass'],
  [/reaches the top|the summit|climbs? the|mountain/, 'peak'],

  /* -- weather and sky ------------------------------------------------------ */
  [/umbrella/, 'umbrella'],
  [/thunder|lightning|shockwave/, 'lightning'],
  [/\brain\b|rains|raining|pours down|drizzl/, 'rain'],
  [/snow|turns? white|glacier|\bice\b|freez|temperature drops/, 'snow'],
  [/cloud/, 'cloud'],
  [/\bwind\b|breeze|carried by wind/, 'wind'],
  [/morning|dawn|sunrise|the sun\b|sun dries|sunny/, 'sun'],
  [/night|moonlight|\bmoon\b|evening/, 'moon'],
  [/goes to bed|bedtime|falls asleep/, 'bed'],
  [/wakes? up|wake up|alarm sounds|the alarm/, 'wake'],

  /* -- water ---------------------------------------------------------------- */
  [/water is heated|is heated/, 'steam', 'start'], // heated → turns to steam → cools into cloud
  [/turns to steam|steam|boil/, 'steam', 'big'],
  [/cools into clouds/, 'cloud'],
  [/\btub\b/, 'tub'],
  [/\bjar\b|fills? up|fills? (a|her|his)/, 'jar', 'full'],
  [/\bcup\b|\bglass\b|the milk/, 'cup'],
  [/puddle|drips|\bleak\b|streets get wet|get wet|seeps|spoil|salt water/, 'puddle'],
  [/\bsea\b|beach|swim|ocean|shore|\btide\b|coastline/, 'wave'],
  [/join a river|reaches the sea/, 'river', 'big'], // rain on hills → streams → they join a river
  [/river|stream|\blake\b|\bdam\b|dammed|flows? downhill|wetland|deep valley|basin/, 'river'],

  /* -- fire ----------------------------------------------------------------- */
  [/candle|is lit\b/, 'candle'],
  [/\bspark\b/, 'spark'],
  [/smoke|\bash\b|on the ridge/, 'smoke'],
  [/roast/, 'bowl', 'full'], // "We roast our food." — over the campfire that was just lit
  [/fire|flame|blaze|burns? down|\bburn\b|campfire/, 'fire', 'big'],

  /* -- growing things ------------------------------------------------------- */
  [/\bseeds?\b/, 'seed'],
  [/sprout|takes? root|\broot\b|the plant/, 'sprout'],
  [/flower|blooms|meadow/, 'flower'],
  [/\btree\b|\boak\b|leaves|forest|branch|bough/, 'tree'],
  [/plants wheat/, 'field', 'start'], // wheat planted → harvested → ground into flour
  [/harvest/, 'grain', 'full'],
  [/flour|ground into/, 'grain', 'partial'],
  [/wheat|\bgrain\b|crop|yield/, 'grain'],
  [/wither|parche|drought|dwindle|declines|depleted|dry out|lose their habitat/, 'wither'],
  [/farmer|\bfield\b|\bsoil\b|\bwells?\b|rotate|plants? an?\b/, 'field'],

  /* -- creatures ------------------------------------------------------------ */
  [/\begg\b/, 'egg'],
  [/chick/, 'chick'],
  [/butterfly/, 'butterfly'],
  [/caterpillar/, 'caterpillar'],
  [/cocoon/, 'cocoon'],
  [/\bdog\b|puppy/, 'dog'],
  [/\bhive\b|\bbees?\b|swarm|colony/, 'hive'],
  [/\bbird\b|\bnest\b|scouts search/, 'bird'],

  /* -- a person's day ------------------------------------------------------- */
  [/gets? dressed|clothes|shirt|\bcoat\b/, 'shirt'],
  [/\bshoes?\b|laces/, 'shoe'],
  [/teeth\b/, 'tooth'],
  [/bandage|band-aid/, 'bandage'],
  [/\bbread\b|dough|baker/, 'bread'],
  [/\bcake\b|frosting/, 'cake'],
  [/\beats?\b|\bfood\b|snack|\bmeal\b|lunch|vegetable|stew|serves the guests|\bchef\b|recipe|chops/, 'bowl'],

  /* -- making and knowing --------------------------------------------------- */
  [/\bbook\b|manuscript|novel|textbook|publish|chapter|shelves|translated|the text|scholar|reads?\b/, 'book'],
  [/writes?|draft|scribble|\bnotes\b|edits?|outlines? the plot|author|records the results/, 'quill'],
  [/paint|colou?r|\bbrush\b|artist|draws?\b/, 'brush'],
  [/canvas|\bpicture\b|the pages/, 'picture'],
  [/\bidea\b|curiosity|hypothes|question|puzzl|paradox|wonder|inspir|hears a melody|spots? a|notices/, 'idea'],
  [
    /experiment|\blabs?\b|research|scientist|\bdata\b|results|verify|replicat|vaccine|diagnos|doctor|patient|treatment|unwell|runs tests|pathogen|mutation|outbreak|cases multiply|crosses into humans|through the population|species adapts|new trait|advantage|evidence|theory|theorem|proof|scrutiny|\bmodel\b|framework|paradigm|discovery|anomal|astronom|signal|planet|calculate/,
    'flask',
  ],
  [
    /engineer|mechanic|repair|assembl|prototype|machine|device|tinker|factor(y|ies)|iterate|design|gathers materials|patent|inventor|winds up|\btoy\b|beams|bridge|rebuild|\bpipe\b|garage|computer|technology|product|launch/,
    'gear',
  ],
  [/detective|\bclue\b|suspect|mystery|culprit|interviews|solve/, 'lens'],
  [/music|melody|symphony|orchestra|compos|premiere|rehears|sings?/, 'note'],
  [/\bstar\b|good grade|prize|wins? the|scholarship/, 'star'],

  /* -- going places, and things that happen -------------------------------- */
  [/\bkite\b/, 'kite'],
  [/\bbike\b|bicycle/, 'bike'],
  [/\bruns?\b|runner|\brace|marathon|finish line|practices|trains?\b|stretches/, 'runner'],
  [/\bmap\b|explorer|ruins|jungle|travels/, 'map'],
  [/\bbags?\b|packs?\b|supplies|migrate|relocat|settlements/, 'bag'],
  [/school|\bclass\b|classroom|goes? inside|we go inside/, 'school'],
  [/\bgame\b|plays?\b|\bball\b/, 'ball'],
  [/champion/, 'trophy'],
  [/coins?|money|saves|budget|\bfund\b|invest|endowment|compounds|market|bubble|patrons|funding|buys|\bshop\b|earns|price/, 'coin'],
  [/\bbell\b|rings|sounds? the alarm/, 'bell'],
  [/crack|widen|erosion|wears the cliff|\bfault\b|tectonic|breaks free|stress accumulates|collapse|signs of wear|sputters|fails/, 'crack'],
  [/\brock\b|\bstone\b|tumbles to the shore/, 'rock'],
  [/washes?|cleans?/, 'cloth'],
  [/\bbaby\b|cries|crying|\bcry\b/, 'baby'],
  [/hears|listens/, 'bell'],
  [/king|monarch|throne|empire|ruler|\bheir\b|leader|crown|dynasty|civilization|succession|advisors|rival|allianc|mayor/, 'crown'],
  [/treaty|talks|\bvote|ballot|\blaw\b|reform|petition|compromise|proposal|committee|candidate|promises|concede|peace|apolog/, 'scroll'],
  [/friend|misunderstand|avoid each other|mends|understanding fades|apprentice|\bmaster\b|observes/, 'twoFolk'],
  [
    /people|crowd|public|protest|rebellion|strife|movement|communit|voters|consensus|debate|\bteam\b|gathers?|gather\b|rush to the scene|they test|save the building|tastes|speakers|dialect|language|vocabulary|dismiss|critics|momentum|mainstream|\bera\b|convention|flourishes|takes hold|new order|restored|enacted|rewritten|transform|reshape|reframed|multiply|historians|calms/,
    'folk',
  ],
];

export interface EventMark {
  /** Which drawing to put on the slab. */
  glyph: GlyphName;
  /** Which moment of that thing's life. */
  state: GlyphState;
  /** False when no rule matched and a neutral token was substituted. Reported honestly. */
  matched: boolean;
}

/** A stable hash, so the same unpictured sentence always gets the same token across reloads. */
function hash(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i += 1) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** One sentence in, one picture out. Case and punctuation insensitive. */
export function glyphFor(text: string): EventMark {
  const s = text.toLowerCase();
  for (const rule of RULES) {
    if (rule[0].test(s)) return { glyph: rule[1], state: rule[2] ?? 'plain', matched: true };
  }
  const token = TOKENS[hash(s) % TOKENS.length] ?? 'tokenLeaf';
  return { glyph: token, state: 'plain', matched: false };
}

/* ============================================================================
   BARE TOKENS — a second entry point, for the sorting robot
   ========================================================================== */

/**
 * WHY `glyphFor` CANNOT SERVE `VER-SORTBOT-01`, and why this is a separate function rather than a few more
 * rules in the table above.
 *
 * That type hands over SINGLE WORDS — `cow`, `chair`, `bone` — and asks which of them belongs in the same
 * box as the examples. Everything above this line is built for SENTENCES: the rules are ordered so that
 * long phrases beat the general words inside them, and several of them match on verbs and on fragments
 * because that is what a sentence gives you. Run a bare noun through it and the results are not merely
 * thin, they are wrong in a way that is hard to see:
 *
 *     "ring"    hits  /\bbell\b|rings|sounds? the alarm/     -> a BELL
 *     "pour"    hits  /pours (a|the|her|his) /-ish shapes    -> a CUP OF MILK
 *     "play"    hits  /\bgame\b|plays?\b|\bball\b/           -> a BALL
 *     "cold"    hits  /snow|turns? white|...|freez/          -> SNOWFALL
 *     "spring"  hits  /sprout|takes? root|.../               -> a SEEDLING
 *
 * A sorting item whose three options are a bell, a cup and a ball when the words were `ring`, `pour` and
 * `play` is not a hard item, it is a broken one. And the failure is silent, because each picture on its own
 * looks deliberate.
 *
 * So bare tokens get an EXACT-MATCH table instead of an ordered regex list. No partial matches, no word
 * boundaries, no precedence to reason about: a noun is either in the table and drawn as itself, or it is
 * not in the table and says so. That is a different and much stronger guarantee than the sentence path can
 * offer, and it is the right one here because the input is a closed vocabulary of nouns rather than open
 * prose.
 *
 * WHAT IS DELIBERATELY NOT COVERED. The 6-8 band's vocabulary is abstract — `abate`, `ad hominem`,
 * `ephemeral` — and no drawing of any quality depicts it. Those tokens fall through to a neutral token with
 * `matched: false`, exactly as an unpictured sentence does, and the narration has to carry them. This table
 * is aimed at the K-1 and 2-3 bands, whose vocabulary is concrete nouns a five-year-old can point at.
 */

/** A token's entry: the drawing, and optionally which moment of it. */
type TokenEntry = readonly [GlyphName] | readonly [GlyphName, GlyphState];

/**
 * NOUN IN, PICTURE OUT. Grouped by the sorting categories the bank actually uses, because that is the axis
 * that decides whether the table is good enough: an item is answerable only if its options are drawn
 * DIFFERENTLY, so what matters is not how many nouns are covered but whether the nouns that appear
 * together are told apart. A `farm animals` item with a cow, a hen and a pig in it needs three animals.
 */
const TOKEN: Record<string, TokenEntry> = {
  /* -- things that were already drawn for the day's log --------------------- */
  ball: ['ball'],
  bed: ['bed'],
  bike: ['bike'],
  bird: ['bird'],
  book: ['book', 'closed'],
  bread: ['bread'],
  candle: ['candle'],
  car: ['car'],
  cloud: ['cloud'],
  coin: ['coin'],
  cup: ['cup'],
  dog: ['dog'],
  dragon: ['dragon'],
  egg: ['egg'],
  fire: ['fire'],
  flower: ['flower'],
  kite: ['kite'],
  river: ['river'],
  rock: ['rock'],
  seed: ['seed'],
  shoe: ['shoe'],
  snow: ['snow'],
  star: ['star'],
  steam: ['steam'],
  sun: ['sun'],
  tree: ['tree'],
  wave: ['wave'],
  leaf: ['tokenLeaf'],
  feather: ['tokenFeather'],
  acorn: ['acorn'],
  grape: ['grape'],
  vine: ['vine'],
  butterfly: ['butterfly'],
  caterpillar: ['caterpillar'],
  clock: ['hourglass'],
  crayon: ['brush'],
  paint: ['brush', 'full'],
  drum: ['note'],
  song: ['note'],
  crown: ['crown'],
  flag: ['peak'],
  map: ['map'],
  box: ['bag'],
  hat: ['crown'],
  coat: ['shirt'],
  glove: ['cloth'],
  sock: ['cloth', 'clean'],
  ice: ['melt'],
  wax: ['candle', 'partial'],
  water: ['puddle'],
  milk: ['cup', 'full'],
  juice: ['jar', 'full'],
  soup: ['bowl', 'full'],
  salad: ['bowl', 'partial'],
  rice: ['grain', 'partial'],
  salt: ['grain'],
  butter: ['batter'],
  oven: ['bread', 'start'],
  pot: ['batter'],
  plant: ['sprout'],
  bush: ['wither'],
  fern: ['tokenLeaf'],
  rose: ['flower'],
  sand: ['field'],
  stone: ['tokenPebbles'],
  brick: ['crack'],
  tile: ['crack'],
  mirror: ['picture'],
  lamp: ['idea'],
  robot: ['gear'],
  drill: ['gear'],
  phone: ['lens'],
  desk: ['testPaper'],
  doll: ['baby'],
  balloon: ['ball'],
  child: ['folk'],
  boat: ['wave'],
  bus: ['car'],
  truck: ['car'],
  road: ['footprints'],
  barn: ['school'],
  door: ['school'],
  nest: ['hive'],
  hail: ['tokenPebbles'],
  spring: ['sprout', 'small'],
  winter: ['snow'],
  bone: ['tokenShell'],
  fur: ['cloth'],
  wing: ['tokenFeather'],

  /* -- creatures, which is where the sorting robot lives -------------------- */
  fish: ['fish'],
  whale: ['whale'],
  shark: ['shark'],
  squid: ['squid'],
  duck: ['duck'],
  crow: ['crow'],
  spider: ['spider'],
  moth: ['moth'],
  bat: ['bat'],
  bee: ['hive'],
  /**
   * ONLY WHERE THE WORD REALLY IS A MEMBER OF THE DRAWN CATEGORY.
   *
   * A tuna is a fish and a robin is a bird, so these share a drawing honestly. What is NOT here, and was
   * deleted from a first draft of this table, is `cow`, `pig`, `goat`, `horse`, `bear` and `cat` all pointing
   * at `dog` with a different `state` each. That passes the collision count — six distinct signatures — and
   * it is exactly the failure this whole change is supposed to be undoing: a child would be shown a row of
   * near-identical dogs and asked which one is a farm animal. Gaming a measurement is worse than failing it,
   * because the measurement then stops telling anybody the truth. They are left unpictured and reported.
   */
  tuna: ['fish'],
  trout: ['fish'],
  robin: ['bird'],
  cow: ['cow'],
  pig: ['pig'],
  hen: ['hen'],
  horse: ['horse'],
  goat: ['goat'],
  bear: ['bear'],
  cat: ['cat'],
  frog: ['frog'],
  snake: ['snake'],
  crab: ['crab'],
  seal: ['seal'],
  owl: ['owl'],
  ant: ['ant'],
  hawk: ['hawk'],
  lion: ['lion'],

  /* -- household and garden ------------------------------------------------- */
  chair: ['chair'],
  sofa: ['sofa'],
  glass: ['glass'],
  tomato: ['tomato'],
  bean: ['bean'],
  table: ['table'],
  fork: ['fork'],
  spoon: ['spoon'],
  plate: ['plate'],
  hammer: ['hammer'],
  nail: ['nail'],
  wrench: ['wrench'],
  hand: ['hand'],
  foot: ['foot'],
  nose: ['nose'],
  apple: ['apple'],
  banana: ['banana'],
  pear: ['pear'],
  plum: ['plum'],
  lime: ['lime'],
  carrot: ['carrot'],
  pea: ['pea'],
  ring: ['ring'],
  tire: ['tire'],
  triangle: ['triangle'],
  corner: ['corner'],
  roll: ['roll'],
  red: ['swatchRed'],
  blue: ['swatchBlue'],
  green: ['swatchGreen'],

  /* -- the words that are not nouns at all ---------------------------------
     The bank uses these as `associate` distractors — thematically linked to the hidden category but not a
     member of it — so they have to be drawn as SOMETHING distinct or the item loses an option. Each is
     mapped to the concrete thing a child would picture if you said the word on its own: swimming is water,
     crawling is the thing that crawls, warm is a fire, cold is frost. None of them pretends to be the
     abstraction; each is the nearest picturable neighbour, which is all a distractor needs to be. */
  swim: ['wave'],
  crawl: ['caterpillar'],
  jump: ['runner'],
  walk: ['footprints'],
  play: ['ball'],
  pour: ['tap', 'start'],
  cook: ['batter'],
  burn: ['fire'],
  warm: ['fire', 'small'],
  cold: ['iceCrystal'],
  frost: ['iceCrystal'],
  heat: ['steam'],
  bright: ['sun'],
  tall: ['peak'],
  color: ['brush', 'full'],
};

/** Case, spacing and a plural `s` are all the normalisation a one-word token needs. */
function normalise(text: string): string {
  return text.trim().toLowerCase().replace(/^(a|an|the)\s+/, '');
}

/**
 * ONE BARE TOKEN IN, ONE PICTURE OUT.
 *
 * Exact match first, then the same word with a trailing plural `s` removed, and nothing else — no substring
 * search, because a substring search over one-word input is how `ring` became a bell. Unlisted words get a
 * neutral token by the same stable hash the sentence path uses, and report `matched: false` so the gap is
 * countable rather than invisible.
 */
export function tokenGlyph(text: string): EventMark {
  const key = normalise(text);
  const hit = TOKEN[key] ?? (key.endsWith('s') ? TOKEN[key.slice(0, -1)] : undefined);
  if (hit) return { glyph: hit[0], state: hit[1] ?? 'plain', matched: true };
  const token = TOKENS[hash(key) % TOKENS.length] ?? 'tokenLeaf';
  return { glyph: token, state: 'plain', matched: false };
}
