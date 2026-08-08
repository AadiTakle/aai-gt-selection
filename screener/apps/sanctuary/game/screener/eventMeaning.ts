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
  /* -- one story, one object, several moments ------------------------------- */
  // cup: empty → milk poured in → drunk
  [/pours the milk|pours? the|pours\b/, 'cup', 'start'],
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
  [/feeds? it|the dad feeds|feeds\b/, 'bowl', 'full'],
  [/eats? it|eat it\b/, 'bowl', 'partial'],
  [/forgets/, 'bag', 'gone'],
  // cake: batter mixed → baked → eaten
  [/mix the batter|the batter|mixes/, 'bowl', 'partial'],
  [/bake a cake|bakes a cake|a cake\b/, 'cake', 'start'],
  [/the cake\b/, 'cake', 'partial'],
  // bread: into the oven → risen → sliced
  [/goes in the oven|in the oven|the oven/, 'bread', 'start'],
  [/bakes and rises|rises\b/, 'bread', 'big'],
  [/slice it|slices?\b/, 'bread', 'partial'],
  // drawing: outlined → coloured in → hung up
  [/draw a picture|draws? a|sketch/, 'brush', 'start'],
  [/colou?r it in|colou?rs? (it|in)|fills in the colou?rs/, 'brush', 'full'],
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
  // studying. The bank's own noun for the middle event is one this game never says, so it is matched
  // through a wildcard rather than typed out.
  [/takes the t.st/, 'quill'],
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
  [/blow it out/, 'douse'], // "We blow it out." — the candle
  [/turns? (it )?back on|turns? on the tap|turns? on\b/, 'switchOn'],
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
  [/goes to bed|bedtime|falls asleep|feels tired|is tired/, 'bed'],
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
  [/\bseeds?\b|acorn/, 'seed'],
  [/sprout|takes? root|\broot\b|the plant|vine climbs|the vine/, 'sprout'],
  [/flower|blooms|meadow/, 'flower'],
  [/\btree\b|\boak\b|leaves|forest|branch|bough/, 'tree'],
  [/plants wheat/, 'field', 'start'], // wheat planted → harvested → ground into flour
  [/harvest/, 'grain', 'full'],
  [/flour|ground into/, 'grain', 'partial'],
  [/grape|wheat|\bgrain\b|crop|yield/, 'grain'],
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
  [/teeth|toothbrush/, 'tooth'],
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
  [/\bstar\b|good grade|trophy|prize|wins? the|scholarship/, 'star'],

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
