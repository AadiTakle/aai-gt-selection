import { useEffect, useId, useMemo, useRef, useState } from 'react';

import { ItemFrame } from '../shared/ItemFrame';
import { loadProgress, recordRound, spend, type Progress } from '../shared/progression';
import type { ExperienceMeta, Palette } from '../shared/types';
import { useScreenerSession } from '../shared/useScreenerSession';

import './CoinMarket.css';

/**
 * Coin Market, for grades 6-8. A Rocket League item exchange: a dense trading terminal where prices
 * move between visits and the player trades toward a contract.
 *
 * WHY THIS SHAPE FOR ELEVEN TO FOURTEEN. This band reads condescension instantly and leaves, so the
 * surface is a real instrument: tabular figures, an index, spreads, cost basis, mark-to-market equity.
 * Nothing is explained twice and nothing is decorated. The pull is not a prize, it is a position — you
 * hold something whose value changed while you were away, which is a reason to come back that does not
 * depend on being told you did well.
 *
 * THE MARKET IS SEALED DURING A FLOOR SESSION, and that is a measurement decision rather than a flourish.
 * A ticker moving beside a reasoning item is both a distraction and, worse, something a child will read
 * as a verdict on the answer they just gave. Sealing it removes the distraction, makes the movement
 * impossible to misread as feedback, and turns the re-open into the moment the round pays off.
 *
 * Prices are a deterministic function of `progress.rounds` and nothing else. They cannot be a function of
 * accuracy because nothing in this file is ever told what accuracy was.
 */

export const meta: ExperienceMeta = {
  id: 'coin-market',
  title: 'Coin Market',
  world: 'Rocket League',
  band: '6-8',
  pull: 'Trade at fair value while the market moves',
  accent: '#00a8ff',
};

/**
 * The item palette, and the one compromise in this file, stated plainly.
 *
 * This experience is dark. The served item cannot be. Every renderer in the catalogue hardcodes light
 * surfaces alongside its variables — `.opt`, `.cell` and `#howto` are literal `#ffffff` while their text
 * inherits `var(--ink)` — so darkening `--ink` to suit a dark shell would put pale text on a white answer
 * option, which is an unreadable control rather than an ugly one.
 *
 * So the item stays light-surfaced and is moved wholesale out of the catalogue's warm cream into this
 * terminal's cool slate, and the chrome does the rest: a dark bezel, a desk header and an inset shadow,
 * so it reads as a lit panel on the desk rather than a document pasted onto it.
 *
 * TWO THINGS ABOUT THE VALUES, BOTH LOAD-BEARING.
 *
 * The list is much longer than the ten documented names because the catalogue's real vocabulary is: 52 of
 * the 53 types take their page colour from a variable, but they disagree about which one. `--violet` is
 * read by 33 types, `--blue` by 28, `--indigo` by 18. Covering only the documented ten leaves most of the
 * bank stubbornly peach.
 *
 * And every value here was solved for, not picked: each is the catalogue's own stock colour held at the
 * same relative luminance and rotated into a cool hue. Holding luminance means no contrast relationship
 * an item's author designed can be made worse by retinting it. The two exceptions are deliberate and go
 * the other way — `--dim` and `--key` are text-only roles whose stock values sit at 2.59:1 and 1.75:1 on
 * a white card, well under AA, so they are darkened to 5.61:1 and 6.29:1. Worst pair in the set is 5.17:1.
 */
const PALETTE: Palette = {
  '--ink': '#0a0f14',
  '--accent': '#084e76',
  '--accent2': '#14283e',
  '--good': '#116b4a',
  '--bad': '#ab3e31',
  '--muted': '#4c6276',
  '--card': '#ffffff',
  '--paper': '#ffffff',
  '--bg1': '#f2f6fa',
  '--bg2': '#e4ecf4',
  '--cream': '#e4ecf4',
  '--line': '#d2ddea',
  '--grid': '#d2ddea',
  '--socket': '#b4c7d8',
  '--edge': '#7da6c4',
  // Stock defines this whole family as one orange, so distinct cool hues are a gain, not a loss.
  '--blue': '#79a5cc',
  '--violet': '#a29ad4',
  '--indigo': '#90a0d2',
  '--purple': '#b296c9',
  '--cyan': '#4eadc1',
  '--aqua': '#4cb0aa',
  '--teal': '#27696e',
  '--mint': '#296c55',
  '--coral': '#d4a7ae',
  '--copper': '#98a1b7',
  '--gold': '#c49b39',
  '--dim': '#3f6c8d',
  '--key': '#3b6483',
  '--a': '#0a5d8e',
  '--b': '#a93d31',
  // The item's own dark telemetry strip, snapped to exactly this terminal's colours.
  '--tel': '#0e141d',
  '--tel2': '#16202e',
  '--tel-bg': '#0e141d',
  '--tel-ink': '#e8eef7',
  '--tel-key': '#38bdf8',
  '--tel-dim': '#9fb0c4',
};

/* ---------------------------------------------------------------- the market */

type Tier = 'Uncommon' | 'Rare' | 'Import' | 'Exotic' | 'Black Market';

interface Instrument {
  readonly ticker: string;
  readonly name: string;
  readonly slot: string;
  readonly tier: Tier;
  readonly base: number;
  /** Multiplier on the shared movement envelope. Rarer things swing harder. */
  readonly vol: number;
  readonly seed: number;
}

const INSTRUMENTS: readonly Instrument[] = [
  { ticker: 'CRT-DCL', name: 'Crimson Tactician', slot: 'Decal', tier: 'Uncommon', base: 32, vol: 0.6, seed: 11 },
  { ticker: 'ION-BST', name: 'Ion Blue', slot: 'Boost', tier: 'Rare', base: 55, vol: 0.8, seed: 27 },
  { ticker: 'CHR-WHL', name: 'Chrono', slot: 'Wheels', tier: 'Rare', base: 88, vol: 0.9, seed: 43 },
  { ticker: 'FNC-BDY', name: 'Fennec', slot: 'Body', tier: 'Import', base: 145, vol: 1.0, seed: 61 },
  { ticker: 'ZMB-TW', name: 'Zomba · Titanium White', slot: 'Wheels', tier: 'Exotic', base: 270, vol: 1.3, seed: 89 },
  { ticker: 'DDR-DCL', name: 'Dueling Dragons', slot: 'Decal', tier: 'Black Market', base: 430, vol: 1.5, seed: 113 },
  { ticker: 'HTW-BST', name: 'Heatwave', slot: 'Boost', tier: 'Black Market', base: 690, vol: 1.6, seed: 149 },
  { ticker: 'ITS-WHL', name: 'Interstellar', slot: 'Wheels', tier: 'Black Market', base: 1020, vol: 1.8, seed: 181 },
];

/** How far the market walks per completed round, and how many prints the sparklines show. */
const TICKS_PER_ROUND = 3;
const HISTORY = 28;

function hashUnit(a: number, b: number): number {
  let t = (Math.imul(a ^ 0x9e3779b9, 0x85ebca6b) ^ Math.imul(b + 0x165667b1, 0xc2b2ae35)) >>> 0;
  t = Math.imul(t ^ (t >>> 15), 0x2545f491) >>> 0;
  t = (t ^ (t >>> 13)) >>> 0;
  return t / 4294967296;
}

/**
 * Price at a tick, before rounding.
 *
 * Three incommensurate waves give trend, and a hashed term gives print-to-print noise, so a sparkline
 * reads as a market rather than as either a sine or a scribble. It is stationary and O(1) in the tick,
 * which matters: a cumulative random walk would need replaying from the origin on every render and would
 * eventually wander somewhere silly.
 */
function rawPriceAt(inst: Instrument, tick: number): number {
  const s = inst.seed;
  const slow = Math.sin(tick / 19.7 + s * 1.31) * 0.062;
  const mid = Math.sin(tick / 7.3 + s * 2.77) * 0.034;
  const fast = Math.sin(tick / 2.9 + s * 0.53) * 0.014;
  const jitter = (hashUnit(s, tick) - 0.5) * 0.042;
  return Math.max(4, inst.base * (1 + (slow + mid + fast + jitter) * inst.vol));
}

/** What a thing actually costs. Credits are whole numbers; only the traded price is rounded. */
function priceAt(inst: Instrument, tick: number): number {
  return Math.round(rawPriceAt(inst, tick));
}

/**
 * Charted history stays unrounded. Rounding first quantises a thirty-credit instrument to four or five
 * distinct values, and a sparkline autoscaled over those draws a staircase that reads as violent
 * volatility on what is really a one-credit drift.
 */
function seriesFor(inst: Instrument, endTick: number): number[] {
  const out: number[] = [];
  for (let i = HISTORY - 1; i >= 0; i -= 1) out.push(rawPriceAt(inst, endTick - i));
  return out;
}

/** A composite of every instrument against its own base, so it sits around 1000 and stays there. */
function indexAt(tick: number): number {
  const total = INSTRUMENTS.reduce((n, inst) => n + rawPriceAt(inst, tick) / inst.base, 0);
  return (total / INSTRUMENTS.length) * 1000;
}

interface Quote {
  readonly inst: Instrument;
  readonly last: number;
  readonly prev: number;
  readonly pct: number;
  readonly series: readonly number[];
}

/* ---------------------------------------------------------------- the book */

/**
 * Holdings live here rather than in `progression`, which stores an unordered set of unlocked ids and so
 * cannot carry a quantity or a cost basis. Currency itself stays in the shared module, always.
 */
const BOOK_KEY = 'gt-lab-system:coin-market:book';

interface Lot {
  readonly qty: number;
  /** Total credits paid for the open quantity. Average cost is this over qty. */
  readonly cost: number;
}

interface VaultPiece {
  readonly id: string;
  readonly name: string;
  readonly kind: string;
  /** Cost basis carried across on completion, so an equity figure never appears to lose value. */
  readonly booked: number;
}

interface Book {
  readonly lots: Record<string, Lot>;
  readonly vault: readonly VaultPiece[];
  readonly done: number;
}

const EMPTY_BOOK: Book = { lots: {}, vault: [], done: 0 };

function loadBook(): Book {
  try {
    const raw = window.localStorage.getItem(BOOK_KEY);
    if (!raw) return EMPTY_BOOK;
    const parsed = JSON.parse(raw) as Partial<Book>;
    return { ...EMPTY_BOOK, ...parsed, lots: parsed.lots ?? {}, vault: parsed.vault ?? [] };
  } catch {
    return EMPTY_BOOK;
  }
}

function saveBook(book: Book): void {
  try {
    window.localStorage.setItem(BOOK_KEY, JSON.stringify(book));
  } catch {
    // A blocked or full storage should cost the player this visit's holdings, not the visit.
  }
}

/* ---------------------------------------------------------------- contracts */

interface Contract {
  readonly id: string;
  readonly award: string;
  readonly kind: string;
  readonly needs: readonly string[];
}

/**
 * Trade-ups, the way the game does them: hold the listed pieces at once and they convert into something
 * that does not trade. Deliberately reachable first — two of the cheapest instruments is roughly three
 * rounds' commission — and deliberately longer later.
 */
const FIRST_CONTRACT: Contract = {
  id: 'tu-1',
  award: 'Hexed',
  kind: 'Black Market Decal',
  needs: ['CRT-DCL', 'ION-BST'],
};

const CONTRACTS: readonly Contract[] = [
  FIRST_CONTRACT,
  { id: 'tu-2', award: 'Fire God', kind: 'Black Market Decal', needs: ['CHR-WHL', 'FNC-BDY'] },
  { id: 'tu-3', award: 'Dissolver', kind: 'Black Market Decal', needs: ['ION-BST', 'ZMB-TW', 'DDR-DCL'] },
  { id: 'tu-4', award: 'Nitronic', kind: 'Black Market Wheels', needs: ['CHR-WHL', 'FNC-BDY', 'HTW-BST'] },
  { id: 'tu-5', award: 'Encryption', kind: 'Black Market Explosion', needs: ['ZMB-TW', 'ITS-WHL'] },
];

/* ---------------------------------------------------------------- formatting */

const NUM = new Intl.NumberFormat('en-US');

function cr(n: number): string {
  return NUM.format(Math.round(n));
}

function pct(n: number): string {
  return `${Math.abs(n).toFixed(2)}%`;
}

/** Below this a move is noise, and painting it green with an up arrow would be a small lie. */
const FLAT = 0.005;

type Tone = 'up' | 'down' | 'flat';

function toneOf(value: number): Tone {
  if (Math.abs(value) < FLAT) return 'flat';
  return value > 0 ? 'up' : 'down';
}

function instrumentFor(ticker: string): Instrument | undefined {
  return INSTRUMENTS.find((i) => i.ticker === ticker);
}

/** A stable-looking desk reference for an item, so the frame has provenance and reveals nothing. */
function ticketRef(itemId: string): string {
  let h = 0;
  for (let i = 0; i < itemId.length; i += 1) h = (Math.imul(h, 31) + itemId.charCodeAt(i)) >>> 0;
  return `RLX-${String(h % 9000 + 1000)}`;
}

/**
 * The four domains a serve can carry, dressed as the desks they clear for. Note `fluid` rather than
 * `fluid_reasoning`: the latter is the bank's own metadata label, and a serve reports the shorter one.
 * Nothing evaluative rides on this — it is a name over a door.
 */
const DESK_NAMES: Record<string, string> = {
  spatial: 'Bodies & Wheels',
  verbal: 'Decals',
  quantitative: 'Boosts',
  fluid: 'Black Market',
};

/* ---------------------------------------------------------------- motion */

function reducedMotion(): boolean {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/** Eases a number toward a target so a credit balance is seen to change rather than just being different. */
function useTween(target: number, ms = 640): number {
  const [value, setValue] = useState(target);
  const from = useRef(target);
  useEffect(() => {
    if (reducedMotion()) {
      from.current = target;
      setValue(target);
      return;
    }
    const start = performance.now();
    const origin = from.current;
    let raf = 0;
    const step = (now: number) => {
      const t = Math.min(1, (now - start) / ms);
      const v = origin + (target - origin) * (1 - (1 - t) ** 3);
      from.current = v;
      setValue(v);
      if (t < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target, ms]);
  return value;
}

/** Its own component so a ticking second does not re-render the market or the item frame beneath it. */
function DeskClock() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  const p = (n: number) => String(n).padStart(2, '0');
  return (
    <span className="cm-clock" aria-hidden="true">
      {p(now.getHours())}:{p(now.getMinutes())}
      <i>:{p(now.getSeconds())}</i>
    </span>
  );
}

/* ---------------------------------------------------------------- charts */

const STROKE: Record<Tone, string> = {
  up: 'var(--cm-up)',
  down: 'var(--cm-down)',
  flat: 'var(--cm-faint)',
};

/**
 * The change across a drawn window.
 *
 * A chart is tinted by its own first-to-last move rather than by the row's headline change, because the
 * two cover different spans: the headline is three prints, the line is twenty-eight. Tinting a visibly
 * rising line red because the last three prints dipped is a chart arguing with itself.
 */
function windowPct(points: readonly number[]): number {
  const first = points[0];
  const last = points.at(-1);
  if (first === undefined || last === undefined || first === 0) return 0;
  return ((last - first) / first) * 100;
}

/**
 * Plot geometry, shared by both charts.
 *
 * The vertical span has a floor under it, expressed as a fraction of the price rather than an absolute,
 * because a sparkline autoscaled to a genuinely quiet instrument magnifies a rounding wobble into a
 * mountain range. The inset on the right is so the last-print marker is not sliced in half by the edge.
 */
function plot(points: readonly number[], w: number, h: number, inset: number, floorFrac: number) {
  if (points.length < 2) return null;
  let min = Infinity;
  let max = -Infinity;
  let sum = 0;
  for (const p of points) {
    if (p < min) min = p;
    if (p > max) max = p;
    sum += p;
  }
  const mid = (max + min) / 2;
  const span = Math.max(max - min, (sum / points.length) * floorFrac, 1e-6);
  const lo = mid - span / 2;
  const iw = w - inset;
  const step = iw / (points.length - 1);
  const pts = points.map((p, i) => [i * step, h - 1 - ((p - lo) / span) * (h - 2)] as const);
  const line = pts.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(1)} ${y.toFixed(1)}`).join(' ');
  return { line, area: `${line} L${iw.toFixed(1)} ${h} L0 ${h} Z`, tail: pts.at(-1), step };
}

function Spark({ points, tone }: { points: readonly number[]; tone: Tone }) {
  const gid = useId();
  const w = 92;
  const h = 26;
  const geom = useMemo(() => plot(points, w, h, 4, 0.05), [points]);
  if (!geom) return null;
  const stroke = STROKE[tone];
  return (
    <svg className="cm-spark" viewBox={`0 0 ${w} ${h}`} width={w} height={h} aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={stroke} stopOpacity="0.30" />
          <stop offset="100%" stopColor={stroke} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={geom.area} fill={`url(#${gid})`} />
      <path className="cm-spark-line" d={geom.line} fill="none" stroke={stroke} strokeWidth="1.5" strokeLinejoin="round" />
      {geom.tail ? <circle cx={geom.tail[0]} cy={geom.tail[1]} r="2" fill={stroke} /> : null}
    </svg>
  );
}

/**
 * The composite runs in the house colour rather than in green or red. Green and red mean one thing on
 * this screen — a move against a stated reference — and the hero chart spans a different window from the
 * figure beside it, so painting it a verdict colour would put two conflicting claims side by side.
 */
function IndexChart({ points }: { points: readonly number[] }) {
  const gid = useId();
  const w = 640;
  const h = 96;
  const geom = useMemo(() => plot(points, w, h, 8, 0.06), [points]);
  if (!geom) return null;
  const stroke = 'var(--cm-accent)';
  const markX = w - 8 - TICKS_PER_ROUND * geom.step;
  return (
    <svg className="cm-chart" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={stroke} stopOpacity="0.26" />
          <stop offset="100%" stopColor={stroke} stopOpacity="0" />
        </linearGradient>
      </defs>
      {[0.25, 0.5, 0.75].map((f) => (
        <line key={f} x1="0" y1={h * f} x2={w} y2={h * f} className="cm-chart-grid" />
      ))}
      <line x1={markX} y1="0" x2={markX} y2={h} className="cm-chart-mark" />
      <path d={geom.area} fill={`url(#${gid})`} />
      <path className="cm-chart-line" d={geom.line} fill="none" stroke={stroke} strokeWidth="2" strokeLinejoin="round" />
      {/* A vertical tick rather than a dot: this chart stretches horizontally, and a dot becomes an egg. */}
      {geom.tail ? (
        <line x1={geom.tail[0]} y1={geom.tail[1] - 5} x2={geom.tail[0]} y2={geom.tail[1] + 5} stroke={stroke} strokeWidth="2.5" />
      ) : null}
    </svg>
  );
}

function Delta({ value, big }: { value: number; big?: boolean }) {
  const tone = toneOf(value);
  return (
    <span className={`cm-delta ${tone} ${big ? 'big' : ''}`}>
      <span className="sr-only">{tone === 'flat' ? 'unchanged ' : tone === 'up' ? 'up ' : 'down '}</span>
      <span className="cm-arrow" aria-hidden="true">
        {tone === 'flat' ? '–' : tone === 'up' ? '▲' : '▼'}
      </span>
      {pct(value)}
    </span>
  );
}

/** A signed credit figure that goes quiet at zero instead of claiming a gain of nothing. */
function Signed({ value }: { value: number }) {
  const n = Math.round(value);
  const tone = n === 0 ? 'cm-flat' : n > 0 ? 'cm-pos' : 'cm-neg';
  return (
    <span className={tone}>
      {n === 0 ? '' : n > 0 ? '+' : '−'}
      {cr(Math.abs(n))}
    </span>
  );
}

function LockIcon() {
  return (
    <svg viewBox="0 0 24 24" className="cm-lock" aria-hidden="true" focusable="false">
      <path d="M7 10V7a5 5 0 0 1 10 0v3" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <rect x="4" y="10" width="16" height="10" rx="2" fill="none" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}

/* ---------------------------------------------------------------- experience */

interface Report {
  readonly calls: number;
  readonly credited: number;
  readonly streak: number;
  readonly streakAdvanced: boolean;
  readonly rarity: boolean;
  readonly movers: readonly { readonly ticker: string; readonly name: string; readonly pct: number }[];
}

export default function CoinMarket() {
  const [progress, setProgress] = useState<Progress>(() => loadProgress(meta.id));
  const [book, setBook] = useState<Book>(() => loadBook());
  const [report, setReport] = useState<Report | null>(null);
  const [flash, setFlash] = useState(false);

  const session = useScreenerSession({
    ageBand: '6-8',
    // Standard. Eight to sixteen items lands inside the fifteen minutes this band will give it, and the
    // longer step would push a single sitting past that for a marginal gain in the estimate.
    precisionIndex: 2,
    palette: PALETTE,
    onFinished: (result) => {
      const outcome = recordRound(meta.id, result.itemsServed);
      // The whole report is derived from the outcome rather than from state closed over at mount, so it
      // cannot go stale, and the only thing about the round that reaches it is how many items ran.
      const after = outcome.progress.rounds * TICKS_PER_ROUND;
      const before = after - TICKS_PER_ROUND;
      const movers = INSTRUMENTS.map((inst) => {
        const was = priceAt(inst, before);
        return { ticker: inst.ticker, name: inst.name, pct: ((priceAt(inst, after) - was) / was) * 100 };
      })
        .sort((a, b) => Math.abs(b.pct) - Math.abs(a.pct))
        .slice(0, 3);
      setProgress(outcome.progress);
      setReport({
        calls: result.itemsServed,
        credited: outcome.currencyEarned,
        streak: outcome.progress.streak,
        streakAdvanced: outcome.streakAdvanced,
        rarity: outcome.rarityEarned,
        movers,
      });
      setFlash(true);
    },
  });

  /**
   * A wiped `Progress` with a surviving book would show holdings bought with credits that no longer
   * exist. `progression` documents this reset path, so it is reconciled rather than assumed away.
   */
  useEffect(() => {
    if (progress.rounds === 0 && progress.currency === 0 && (book.vault.length > 0 || Object.keys(book.lots).length > 0)) {
      setBook(EMPTY_BOOK);
      saveBook(EMPTY_BOOK);
    }
  }, [progress.rounds, progress.currency, book]);

  useEffect(() => {
    if (!flash) return;
    const t = setTimeout(() => setFlash(false), 1400);
    return () => clearTimeout(t);
  }, [flash]);

  const tick = progress.rounds * TICKS_PER_ROUND;

  const quotes = useMemo<readonly Quote[]>(
    () =>
      INSTRUMENTS.map((inst) => {
        // Traded prices are the rounded ones, and the change is computed from those rather than from the
        // underlying, so the percentage always explains the two numbers a player can actually see.
        const last = priceAt(inst, tick);
        const prev = priceAt(inst, tick - TICKS_PER_ROUND);
        return { inst, last, prev, pct: ((last - prev) / prev) * 100, series: seriesFor(inst, tick) };
      }),
    [tick],
  );

  const indexSeries = useMemo(() => {
    const out: number[] = [];
    for (let i = HISTORY - 1; i >= 0; i -= 1) out.push(indexAt(tick - i));
    return out;
  }, [tick]);

  const indexNow = indexSeries.at(-1) ?? 1000;
  const indexPrev = indexAt(tick - TICKS_PER_ROUND);
  const indexPct = ((indexNow - indexPrev) / indexPrev) * 100;

  const positionValue = quotes.reduce((n, q) => n + (book.lots[q.inst.ticker]?.qty ?? 0) * q.last, 0);
  const positionCost = quotes.reduce((n, q) => n + (book.lots[q.inst.ticker]?.cost ?? 0), 0);
  const vaultValue = book.vault.reduce((n, v) => n + v.booked, 0);
  const equity = progress.currency + positionValue + vaultValue;
  const openPnl = positionValue - positionCost;

  const shownEquity = useTween(equity);
  const shownCredits = useTween(progress.currency);

  const contract = CONTRACTS[book.done % CONTRACTS.length] ?? FIRST_CONTRACT;
  const contractReady = contract.needs.every((t) => (book.lots[t]?.qty ?? 0) > 0);

  const buy = (q: Quote) => {
    const next = spend(meta.id, q.last);
    if (!next) return;
    const held = book.lots[q.inst.ticker];
    const lots: Record<string, Lot> = {
      ...book.lots,
      [q.inst.ticker]: { qty: (held?.qty ?? 0) + 1, cost: (held?.cost ?? 0) + q.last },
    };
    const nextBook: Book = { ...book, lots };
    setProgress(next);
    setBook(nextBook);
    saveBook(nextBook);
  };

  const sell = (q: Quote) => {
    const held = book.lots[q.inst.ticker];
    if (!held || held.qty < 1) return;
    // `spend` is the only route back into the shared balance, and a negative amount is the sale: the
    // guard reads `currency < amount`, which a negative can never trip, so the balance goes up by the
    // proceeds. Noted in the handoff as the one thing `progression` is missing.
    const next = spend(meta.id, -q.last);
    if (!next) return;
    const avg = held.cost / held.qty;
    const lots: Record<string, Lot> = { ...book.lots };
    if (held.qty === 1) delete lots[q.inst.ticker];
    else lots[q.inst.ticker] = { qty: held.qty - 1, cost: Math.max(0, held.cost - avg) };
    const nextBook: Book = { ...book, lots };
    setProgress(next);
    setBook(nextBook);
    saveBook(nextBook);
  };

  const settleContract = () => {
    if (!contractReady) return;
    const lots: Record<string, Lot> = { ...book.lots };
    let booked = 0;
    for (const ticker of contract.needs) {
      const held = lots[ticker];
      if (!held || held.qty < 1) return;
      const avg = held.cost / held.qty;
      booked += avg;
      if (held.qty === 1) delete lots[ticker];
      else lots[ticker] = { qty: held.qty - 1, cost: Math.max(0, held.cost - avg) };
    }
    const piece: VaultPiece = {
      id: `${contract.id}-${book.done}`,
      name: contract.award,
      kind: contract.kind,
      booked: Math.round(booked),
    };
    const nextBook: Book = { lots, vault: [...book.vault, piece], done: book.done + 1 };
    setBook(nextBook);
    saveBook(nextBook);
  };

  const playing = session.phase === 'playing' && session.serve;
  const coldStart = progress.rounds === 0 && progress.currency === 0 && book.vault.length === 0;

  /* ---------------------------------------------------------------- floor session */

  if (playing && session.serve) {
    const desk = DESK_NAMES[session.serve.domain] ?? 'General';
    const expected = session.expectedItems;
    const minMark = expected ? (expected.min / expected.max) * 100 : 50;

    return (
      <div className="cm cm-floor">
        <TopBar
          equity={shownEquity}
          credits={shownCredits}
          streak={progress.streak}
          vault={book.vault.length}
          live
        />
        <div className="cm-body">
          <main className="cm-main">
            <div className="cm-desk">
              <header className="cm-desk-head">
                <span className="cm-desk-tag">Clearing</span>
                <strong>{desk} desk</strong>
                <span className="cm-desk-ref">{ticketRef(session.serve.served.itemId)}</span>
                <span className="cm-desk-no">
                  Ticket <b>{String(session.itemNumber).padStart(2, '0')}</b>
                </span>
              </header>
              {/* A housing around the screen. See the note on `.cm-screen` for why it is not decoration. */}
              <div className="cm-screen">
                <ItemFrame
                  serve={session.serve}
                  frameRef={session.frameRef}
                  onLoad={session.onFrameLoad}
                  palette={PALETTE}
                  className="cm-frame"
                />
              </div>
            </div>
          </main>

          <aside className="cm-rail">
            <section className="cm-card cm-live">
              <span className="cm-eyebrow">
                <i className="cm-pip" aria-hidden="true" /> Floor session
              </span>
              <p className="cm-logged" role="status">
                <b>{String(session.answerCount).padStart(2, '0')}</b>
                <span>calls logged</span>
              </p>
              <div className="cm-bar" aria-hidden="true">
                <span className="cm-bar-fill" style={{ width: `${Math.round(session.progress * 100)}%` }} />
                <span className="cm-bar-mark" style={{ left: `${minMark}%` }} />
              </div>
              <p className="cm-note">
                {expected ? `${expected.min}–${expected.max} calls in a session.` : 'Session running.'} The desk closes
                itself when the book is clear.
              </p>
            </section>

            <section className="cm-card cm-sealed">
              <span className="cm-eyebrow">
                <LockIcon /> Market sealed
              </span>
              <ul className="cm-sealed-list">
                {INSTRUMENTS.slice(0, 5).map((inst) => (
                  <li key={inst.ticker}>
                    <span className="cm-tick">{inst.ticker}</span>
                    <span className="cm-redact" aria-hidden="true" />
                  </li>
                ))}
              </ul>
              <p className="cm-note">Prices are held until you step off the floor. They will have moved.</p>
            </section>
          </aside>
        </div>
      </div>
    );
  }

  /* ---------------------------------------------------------------- market */

  return (
    <div className="cm">
      <TopBar
        equity={shownEquity}
        credits={shownCredits}
        streak={progress.streak}
        vault={book.vault.length}
        live={false}
      />

      <div className="cm-body">
        <main className="cm-main">
          {report ? (
            <section className="cm-tape" role="status">
              <div className="cm-tape-head">
                <span className="cm-eyebrow">Session closed</span>
                <button type="button" className="cm-ghost" onClick={() => { setReport(null); session.reset(); }}>
                  Clear tape
                </button>
              </div>
              <div className="cm-tape-figs">
                <p>
                  <b className="cm-pos">+{cr(report.credited)}</b>
                  <span>credits commissioned</span>
                </p>
                <p>
                  <b>{report.calls}</b>
                  <span>calls logged</span>
                </p>
                <p>
                  <b>
                    {report.streak}
                    <i>d</i>
                  </b>
                  <span>{report.streakAdvanced ? 'streak extended' : 'streak held'}</span>
                </p>
              </div>
              <div className="cm-tape-movers">
                <span className="cm-eyebrow">Moved while you were off the board</span>
                <ul>
                  {report.movers.map((m) => (
                    <li key={m.ticker}>
                      <span className="cm-tick">{m.ticker}</span>
                      <span className="cm-mover-name">{m.name}</span>
                      <Delta value={m.pct} />
                    </li>
                  ))}
                </ul>
              </div>
              {report.rarity ? <p className="cm-tape-rare">Seven days running. The vault opens a black market slot.</p> : null}
            </section>
          ) : null}

          <section className="cm-index">
            <div className="cm-index-head">
              <div>
                <span className="cm-eyebrow">RLX composite</span>
                <p className="cm-index-val">
                  {cr(indexNow)}
                  <Delta value={indexPct} big />
                </p>
              </div>
              <dl className="cm-index-stats">
                <div>
                  <dt>Prints</dt>
                  <dd>{HISTORY}</dd>
                </div>
                <div>
                  <dt>Open P/L</dt>
                  <dd>
                    <Signed value={openPnl} />
                  </dd>
                </div>
                <div>
                  <dt>Rounds</dt>
                  <dd>{progress.rounds}</dd>
                </div>
              </dl>
            </div>
            <IndexChart points={indexSeries} />
            <p className="cm-index-foot">
              Dashed marker is your last floor session. The board walks three prints every session you run.
            </p>
          </section>

          <section className={`cm-board ${flash ? 'repriced' : ''}`}>
            <table>
              <caption className="sr-only">Rocket League item exchange, live prices and your holdings</caption>
              <thead>
                <tr>
                  <th scope="col">Instrument</th>
                  <th scope="col">Tier</th>
                  <th scope="col" className="cm-r">
                    Last
                  </th>
                  <th scope="col" className="cm-r">
                    Chg
                  </th>
                  <th scope="col" className="cm-c">
                    28 print
                  </th>
                  <th scope="col" className="cm-r">
                    Hold
                  </th>
                  <th scope="col" className="cm-r">
                    Trade
                  </th>
                </tr>
              </thead>
              <tbody>
                {quotes.map((q) => {
                  const held = book.lots[q.inst.ticker];
                  const qty = held?.qty ?? 0;
                  const pnl = qty > 0 ? qty * q.last - (held?.cost ?? 0) : 0;
                  const short = q.last - progress.currency;
                  const wanted = contract.needs.includes(q.inst.ticker);
                  return (
                    <tr key={q.inst.ticker} className={wanted ? 'cm-wanted' : ''}>
                      <th scope="row">
                        <span className="cm-tick">{q.inst.ticker}</span>
                        <span className="cm-name">{q.inst.name}</span>
                        <span className="cm-slot">{q.inst.slot}</span>
                      </th>
                      <td>
                        <span className={`cm-tier t-${q.inst.tier.replace(' ', '-').toLowerCase()}`}>{q.inst.tier}</span>
                      </td>
                      <td className="cm-r cm-last">{cr(q.last)}</td>
                      <td className="cm-r">
                        <Delta value={q.pct} />
                      </td>
                      <td className="cm-c">
                        <Spark key={`${q.inst.ticker}-${tick}`} points={q.series} tone={toneOf(windowPct(q.series))} />
                      </td>
                      <td className="cm-r cm-hold">
                        {qty > 0 ? (
                          <>
                            <b>{qty}</b>
                            <span>
                              <Signed value={pnl} />
                            </span>
                          </>
                        ) : (
                          <span className="cm-none" aria-hidden="true">
                            —
                          </span>
                        )}
                      </td>
                      <td className="cm-r cm-trade">
                        <button
                          type="button"
                          className="cm-buy"
                          disabled={short > 0}
                          onClick={() => buy(q)}
                          aria-label={`Buy ${q.inst.name} at ${cr(q.last)} credits`}
                        >
                          {short > 0 ? `Need ${cr(short)}` : 'Buy'}
                        </button>
                        <button
                          type="button"
                          className="cm-sell"
                          disabled={qty < 1}
                          onClick={() => sell(q)}
                          aria-label={`Sell one ${q.inst.name} at ${cr(q.last)} credits`}
                        >
                          Sell
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </section>
        </main>

        <aside className="cm-rail">
          <section className={`cm-card cm-cta ${coldStart ? 'cold' : ''}`}>
            <span className="cm-eyebrow">The floor</span>
            <p className="cm-cta-line">
              {coldStart
                ? 'Every credit on this exchange is commissioned on the floor. Take a session and the desk pays out on the calls you log, whichever way they go.'
                : 'Commission is paid per session, not per call. The board walks three prints while you are down there.'}
            </p>
            <button
              type="button"
              className="cm-open"
              onClick={() => {
                setReport(null);
                void session.start();
              }}
              disabled={session.phase === 'starting'}
            >
              {session.phase === 'starting' ? 'Opening the desk…' : coldStart ? 'Open the floor' : 'Back to the floor'}
              <span className="cm-open-arrow" aria-hidden="true">
                →
              </span>
            </button>
            {session.error ? (
              <p className="cm-error" role="alert">
                <b>Desk unavailable.</b> {session.error}
              </p>
            ) : null}
          </section>

          <section className="cm-card cm-contract">
            <span className="cm-eyebrow">Trade-up contract</span>
            <p className="cm-contract-award">
              {contract.award}
              <i>{contract.kind}</i>
            </p>
            <ul className="cm-needs">
              {contract.needs.map((ticker) => {
                const inst = instrumentFor(ticker);
                const has = (book.lots[ticker]?.qty ?? 0) > 0;
                return (
                  <li key={ticker} className={has ? 'has' : ''}>
                    <span className="cm-check" aria-hidden="true">
                      {has ? '✓' : ''}
                    </span>
                    <span className="cm-tick">{ticker}</span>
                    <span className="cm-need-name">{inst?.name ?? ticker}</span>
                    <span className="sr-only">{has ? 'held' : 'not yet held'}</span>
                  </li>
                );
              })}
            </ul>
            <button type="button" className="cm-settle" disabled={!contractReady} onClick={settleContract}>
              {contractReady ? 'Settle contract' : `Hold all ${contract.needs.length} to settle`}
            </button>
            <p className="cm-note">Settling consumes the pieces. Cost basis carries into the vault.</p>
          </section>

          <section className="cm-card cm-vault">
            <span className="cm-eyebrow">
              Vault <b>{book.vault.length}</b>
            </span>
            {book.vault.length > 0 ? (
              <ul className="cm-vault-list">
                {book.vault.map((v) => (
                  <li key={v.id}>
                    <span className="cm-gem" aria-hidden="true" />
                    <span className="cm-vault-name">{v.name}</span>
                    <span className="cm-vault-kind">{v.kind}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <ul className="cm-vault-list empty" aria-hidden="true">
                <li />
                <li />
                <li />
              </ul>
            )}
            {book.vault.length === 0 ? (
              <p className="cm-note">Nothing vaulted yet. Settled contracts land here and never trade again.</p>
            ) : null}
          </section>
        </aside>
      </div>
    </div>
  );
}

function TopBar({
  equity,
  credits,
  streak,
  vault,
  live,
}: {
  equity: number;
  credits: number;
  streak: number;
  vault: number;
  live: boolean;
}) {
  return (
    <header className="cm-top">
      <span className="cm-brand">
        <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
          <path d="M12 2 22 8v8l-10 6L2 16V8z" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
          <path d="M7 14l4-5 3 3 3-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        RLX <i>Item Exchange</i>
      </span>
      <span className={`cm-state ${live ? 'live' : ''}`}>
        <i className="cm-pip" aria-hidden="true" />
        {live ? 'On the floor' : 'Market open'}
      </span>
      <DeskClock />
      <dl className="cm-figs">
        <div>
          <dt>Equity</dt>
          <dd>{cr(equity)}</dd>
        </div>
        <div className="cm-figs-credit">
          <dt>Credits</dt>
          <dd>{cr(credits)}</dd>
        </div>
        <div>
          <dt>Streak</dt>
          <dd>
            {streak}
            <i>d</i>
          </dd>
        </div>
        <div>
          <dt>Vault</dt>
          <dd>{vault}</dd>
        </div>
      </dl>
    </header>
  );
}
