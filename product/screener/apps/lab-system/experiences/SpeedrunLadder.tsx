import { useEffect, useId, useMemo, useRef, useState } from 'react';

import { ItemFrame } from '../shared/ItemFrame';
import { loadProgress, recordRound, type Progress } from '../shared/progression';
import type { BankSummary, ExperienceMeta, Palette } from '../shared/types';
import { useScreenerSession } from '../shared/useScreenerSession';

import './SpeedrunLadder.css';

/**
 * Speedrun Ladder, for 6-8. A weekly competitive ladder with a battle-pass tier track.
 *
 * WHY THIS ONE EXISTS. Every other experience in the lab has to find an excuse to serve an eleven year
 * old material above their grade. This one does not need an excuse, because a ladder that gets harder
 * as you climb is the definition of a ladder. The interface therefore says so out loud: each division
 * announces that the next one is longer and pulls from a harder rotation, and the precision index the
 * session runs at climbs with it. The escalation is the reward rather than something to apologise for.
 *
 * THE THREE THINGS THAT ARE MECHANISM RATHER THAN DRESSING.
 *
 * Position on the ladder is a pure function of `progress.rounds`, which `recordRound` increments for
 * finishing a run and for nothing else. There is no path from an answer's correctness to a pixel on
 * this screen, because the hook never reveals it and this file never asks.
 *
 * The leaderboard is flavour, and it is built so that it cannot betray that. The rival board is a
 * fixed set of run counts; the child's rank is the count of rivals strictly ahead of them, plus one.
 * That number is monotonically non-increasing in rounds completed, so the child passes rivals and is
 * never passed. There is no demotion, no lockout and no failure state anywhere in here.
 *
 * The rotation is seeded from the ISO week, so every player gets the same week's run, which is what
 * makes a weekly ladder a ladder rather than a set of unrelated sessions.
 *
 * TONE. This band closes the tab on anything cutesy, so the copy is the register a competitive game
 * actually uses: flat, confident, numeric, and slightly cold. No exclamation marks, no encouragement,
 * no praise for turning up beyond the credits the ladder pays out anyway.
 */

export const meta: ExperienceMeta = {
  id: 'speedrun-ladder',
  title: 'Speedrun Ladder',
  world: 'Fortnite',
  band: '6-8',
  pull: 'A weekly climb that gets harder the higher you go',
  accent: '#f2c744',
};

/**
 * The item iframe's palette.
 *
 * DELIBERATELY A LIGHT ARENA PANEL INSIDE A DARK HUD, which is not a compromise. The shared exam skin
 * pins several controls to dark ink with `!important` (`#go` and friends take `color: #ffffff` on
 * `--gt-navy`; `#nextclue` and `#modelempty` are forced to dark tokens), so a dark `--card` would put
 * dark text on a dark field in item types this file cannot see. The `--gt-*` tokens are ordinary
 * custom properties, though, so they are recoloured here too: the skin's peach-and-teal chrome becomes
 * the ladder's steel-and-yellow, every light-field/dark-ink pairing the skin's contrast audit
 * established is preserved, and the arena reads as part of the world rather than as a form.
 */
const PALETTE: Palette = {
  '--ink': '#101728',
  '--accent': '#1c5fd0',
  '--accent2': '#16203a',
  '--good': '#1b7f4f',
  '--bad': '#b3402c',
  '--card': '#ffffff',
  '--paper': '#ffffff',
  '--bg1': '#eef2fa',
  '--bg2': '#dde5f3',
  '--line': '#c6d2e6',
  '--socket': '#d5deee',
  '--gt-navy': '#16203a',
  '--gt-dark-navy': '#0a1120',
  '--gt-blue': '#1c5fd0',
  '--gt-gold': '#f2c744',
  '--gt-gold-light': '#f7dc8a',
  '--gt-gold-lighter': '#fbeec2',
  '--gt-gold-lightest': '#fdf6e0',
  '--gt-off-white': '#eff3fa',
  '--gt-border': '#c6d2e6',
  '--gt-ink-soft': '#2b3a55',
  '--gt-muted': '#55637d',
};

// ---------------------------------------------------------------------------
// The ladder
// ---------------------------------------------------------------------------

interface Division {
  readonly key: string;
  readonly name: string;
  /** Completed runs needed to enter. The gaps widen on purpose: the climb gets steeper. */
  readonly entry: number;
  /** Index into the bank's precision ladder. A higher division runs longer and stops later. */
  readonly precisionIndex: number;
  readonly reward: string;
  readonly tint: string;
  readonly deep: string;
}

/**
 * Eight divisions, and the run gets materially longer three times on the way up.
 *
 * `precisionIndex` is the honest half of the theme. Bronze and Silver run at step 1 ("Short", 6-10
 * items), Gold and Platinum at step 2 ("Standard", 8-16), and everything from Diamond upward at step 3
 * ("Careful", 12-24). Step 3 is the top of the range this experience will use: 24 items is roughly
 * twelve minutes of an eleven year old's time, which keeps even the Unreal run inside the fifteen
 * minute ceiling, and step 4 ("Thorough", 20-40) would not.
 */
const BRONZE: Division = {
  key: 'bronze',
  name: 'Bronze',
  entry: 1,
  precisionIndex: 1,
  reward: 'Contrail · Emberline',
  tint: '#cd8149',
  deep: '#69391a',
};
const SILVER: Division = {
  key: 'silver',
  name: 'Silver',
  entry: 3,
  precisionIndex: 1,
  reward: 'Banner · Split Second',
  tint: '#bcc7d8',
  deep: '#5a6679',
};
const GOLD: Division = {
  key: 'gold',
  name: 'Gold',
  entry: 5,
  precisionIndex: 2,
  reward: 'Wrap · Goldleaf',
  tint: '#f2c744',
  deep: '#846309',
};
const PLATINUM: Division = {
  key: 'platinum',
  name: 'Platinum',
  entry: 8,
  precisionIndex: 2,
  reward: 'Emote · Hard Reset',
  tint: '#5fe3cf',
  deep: '#0f6a60',
};
const DIAMOND: Division = {
  key: 'diamond',
  name: 'Diamond',
  entry: 11,
  precisionIndex: 3,
  reward: 'Glider · Nightfall',
  tint: '#5aa8ff',
  deep: '#12457f',
};
const ELITE: Division = {
  key: 'elite',
  name: 'Elite',
  entry: 15,
  precisionIndex: 3,
  reward: 'Pickaxe · Meridian',
  tint: '#a37bff',
  deep: '#432688',
};
const CHAMPION: Division = {
  key: 'champion',
  name: 'Champion',
  entry: 19,
  precisionIndex: 3,
  reward: 'Outfit · Vantage',
  tint: '#ff6f91',
  deep: '#821c3c',
};
const UNREAL: Division = {
  key: 'unreal',
  name: 'Unreal',
  entry: 24,
  precisionIndex: 3,
  reward: 'Aura · Unreal',
  tint: '#f6f2ff',
  deep: '#3b2c74',
};

const LADDER: readonly Division[] = [
  BRONZE,
  SILVER,
  GOLD,
  PLATINUM,
  DIAMOND,
  ELITE,
  CHAMPION,
  UNREAL,
];

interface Standing {
  /** Index into LADDER, or -1 before the placement run has been finished. */
  readonly index: number;
  /** The division being played. Before placement this is Bronze, which is what a placement run runs. */
  readonly division: Division;
  readonly ranked: boolean;
  readonly next: Division | null;
  readonly runsToNext: number;
  /** 0..1 of the way through the current division. */
  readonly fraction: number;
}

/** Position on the ladder, derived from completed runs and from nothing else. */
function standingFor(rounds: number): Standing {
  let index = -1;
  for (let i = 0; i < LADDER.length; i += 1) {
    const division = LADDER[i];
    if (division && rounds >= division.entry) index = i;
  }

  const division = LADDER[Math.max(0, index)] ?? BRONZE;
  const next = index + 1 < LADDER.length ? (LADDER[index + 1] ?? null) : null;
  const from = index < 0 ? 0 : division.entry;
  const span = Math.max(1, (next ? next.entry : division.entry) - from);

  return {
    index,
    division,
    ranked: index >= 0,
    next,
    runsToNext: next ? Math.max(0, next.entry - rounds) : 0,
    fraction: next ? Math.min(1, Math.max(0, (rounds - from) / span)) : 1,
  };
}

// ---------------------------------------------------------------------------
// The week
// ---------------------------------------------------------------------------

/** ISO 8601 week number. Thursday decides which year a boundary week belongs to. */
function isoWeek(now: Date): { readonly year: number; readonly week: number } {
  const d = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
  const weekday = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - weekday);
  const yearStart = Date.UTC(d.getUTCFullYear(), 0, 1);
  return {
    year: d.getUTCFullYear(),
    week: Math.ceil(((d.getTime() - yearStart) / 86_400_000 + 1) / 7),
  };
}

/** Milliseconds until the rotation turns over, which is local Monday 00:00. */
function msToRotation(now: Date): number {
  const next = new Date(now.getTime());
  next.setHours(0, 0, 0, 0);
  next.setDate(next.getDate() + ((8 - (now.getDay() || 7)) % 7 || 7));
  return next.getTime() - now.getTime();
}

function formatCountdown(ms: number): string {
  const minutes = Math.max(0, Math.floor(ms / 60_000));
  const days = Math.floor(minutes / 1440);
  const hours = Math.floor((minutes % 1440) / 60);
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes % 60}m`;
  return `${minutes % 60}m`;
}

// ---------------------------------------------------------------------------
// The bracket
// ---------------------------------------------------------------------------

/** mulberry32, so the week's bracket is the same board for everyone and stable across reloads. */
function seededRandom(seed: number): () => number {
  let a = (seed ^ 0x9e3779b9) >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4_294_967_296;
  };
}

const RIVAL_TAGS: readonly string[] = [
  'ORBITAL',
  'kite_9',
  'HALFPIPE',
  'nullcast',
  'Vantage',
  'mox__',
  'SLATEGREY',
  'quiet.storm',
  'ARCWELD',
  'penumbra',
  'TILT_SHIFT',
  'nova_ct',
  'GRAVELPIT',
  'ember.',
  'LONGSHOT',
  'mercury7',
  'BRIGHTSIDE',
  'zeph.',
];

/** Fixed run counts, so the bracket is a stable shape and only the names rotate each week. */
const RIVAL_RUNS: readonly number[] = [
  31, 28, 26, 24, 22, 20, 18, 16, 14, 12, 10, 8, 7, 5, 4, 3, 2, 1,
];

interface Rival {
  readonly tag: string;
  readonly runs: number;
}

function buildBracket(weekKey: number): readonly Rival[] {
  const random = seededRandom(weekKey);
  const tags = [...RIVAL_TAGS];
  for (let i = tags.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    const a = tags[i];
    const b = tags[j];
    if (a !== undefined && b !== undefined) {
      tags[i] = b;
      tags[j] = a;
    }
  }
  return RIVAL_RUNS.map((runs, i) => ({ tag: tags[i] ?? `player_${i}`, runs }));
}

/**
 * Rank is one plus the number of rivals strictly ahead. Rivals never gain runs, so this can only fall
 * as the child completes runs: they pass people and are never passed.
 */
function rankFor(bracket: readonly Rival[], rounds: number): number {
  return bracket.filter((r) => r.runs > rounds).length + 1;
}

// ---------------------------------------------------------------------------
// Bits of the bank, read rather than hardcoded
// ---------------------------------------------------------------------------

function splitRange(summary: BankSummary | null, precisionIndex: number): string | null {
  const step = summary?.precisionSteps[precisionIndex];
  return step ? `${step.minItems}\u2013${step.maxItems}` : null;
}

function splitCap(summary: BankSummary | null, precisionIndex: number, fallback: number): number {
  return summary?.precisionSteps[precisionIndex]?.maxItems ?? fallback;
}

// ---------------------------------------------------------------------------
// Pieces
// ---------------------------------------------------------------------------

function DivisionBadge({
  division,
  ranked,
  promoted = false,
}: {
  division: Division;
  ranked: boolean;
  promoted?: boolean;
}) {
  const gradientId = `sr-badge-${useId().replace(/:/g, '')}`;
  const numeral = ranked ? String(LADDER.indexOf(division) + 1) : '\u2013';

  return (
    <svg
      className={`sr-badge ${ranked ? 'is-ranked' : 'is-unranked'} ${promoted ? 'is-promoted' : ''}`}
      viewBox="0 0 120 136"
      role="img"
      aria-label={ranked ? `${division.name} division badge` : 'Unranked'}
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0.35" y2="1">
          <stop offset="0%" stopColor={division.tint} />
          <stop offset="100%" stopColor={division.deep} />
        </linearGradient>
      </defs>

      <path
        className="sr-badge-plate"
        d="M60 3 115 27 115 83 60 133 5 83 5 27Z"
        fill={ranked ? `url(#${gradientId})` : 'rgba(255,255,255,0.03)'}
        stroke={ranked ? division.tint : 'rgba(160,178,206,0.55)'}
        strokeWidth="2.5"
        strokeDasharray={ranked ? undefined : '7 6'}
        strokeLinejoin="round"
      />
      {ranked ? (
        <path d="M60 3 115 27 60 51 5 27Z" fill="rgba(255,255,255,0.16)" />
      ) : null}
      <path
        d="M60 16 104 35 104 78 60 118 16 78 16 35Z"
        fill="none"
        stroke={ranked ? 'rgba(10,15,26,0.32)' : 'rgba(160,178,206,0.18)'}
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <text
        x="60"
        y="86"
        textAnchor="middle"
        className="sr-badge-numeral"
        fill={ranked ? 'rgba(10,15,26,0.86)' : 'rgba(160,178,206,0.7)'}
      >
        {numeral}
      </text>
    </svg>
  );
}

function TrackNode({
  division,
  state,
  position,
}: {
  division: Division;
  state: 'claimed' | 'current' | 'next' | 'locked';
  position: number;
}) {
  return (
    <li className={`sr-node is-${state}`} style={{ ['--node' as string]: division.tint }}>
      <span className="sr-node-chip" aria-hidden="true">
        <span className="sr-node-num">{position}</span>
      </span>
      <span className="sr-node-name">{division.name}</span>
      <span className="sr-node-reward">{division.reward}</span>
      {state === 'next' ? <span className="sr-node-tag">Harder</span> : null}
      {state === 'claimed' || state === 'current' ? (
        <span className="sr-node-tag is-claimed">Claimed</span>
      ) : null}
      {/* Only the state without a visible tag needs saying; the rest is already read out. */}
      {state === 'locked' ? <span className="sr-only">Locked</span> : null}
    </li>
  );
}

interface RunLog {
  readonly splits: number;
  readonly credits: number;
  readonly roundsBefore: number;
  readonly roundsAfter: number;
  readonly streak: number;
  readonly streakAdvanced: boolean;
  readonly rarity: boolean;
}

// ---------------------------------------------------------------------------

export default function SpeedrunLadder() {
  const [progress, setProgress] = useState<Progress>(() => loadProgress(meta.id));
  const [lastRun, setLastRun] = useState<RunLog | null>(null);
  const [now, setNow] = useState<Date>(() => new Date());

  // Captured on queue, so the results panel can show the climb rather than only the destination.
  const roundsAtQueue = useRef(progress.rounds);

  const standing = standingFor(progress.rounds);
  const week = isoWeek(now);
  const weekKey = week.year * 100 + week.week;

  /**
   * THE WEEKLY SEED. `weekKey` is the ISO year and week, so every player who queues in the same week
   * gets the same rotation and the ladder is comparable across the bracket, which is the whole premise
   * of a weekly ladder. The division is mixed in below it so each division owns a distinct rotation:
   * still identical for every player in that division that week, and climbing genuinely changes what
   * you are handed rather than replaying the tier below with more items.
   */
  const rotationSeed = weekKey * 16 + Math.max(0, standing.index);

  const bracket = useMemo(() => buildBracket(weekKey), [weekKey]);

  const session = useScreenerSession({
    ageBand: '6-8',
    precisionIndex: standing.division.precisionIndex,
    palette: PALETTE,
    seed: rotationSeed,
    onFinished: (result) => {
      const outcome = recordRound(meta.id, result.itemsServed);
      setProgress(outcome.progress);
      setLastRun({
        splits: result.itemsServed,
        credits: outcome.currencyEarned,
        roundsBefore: roundsAtQueue.current,
        roundsAfter: outcome.progress.rounds,
        streak: outcome.progress.streak,
        streakAdvanced: outcome.streakAdvanced,
        rarity: outcome.rarityEarned,
      });
    },
  });

  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(id);
  }, []);

  const queue = () => {
    roundsAtQueue.current = progress.rounds;
    setLastRun(null);
    void session.start();
  };

  const nextRange = standing.next ? splitRange(session.summary, standing.next.precisionIndex) : null;
  const thisRange = splitRange(session.summary, standing.division.precisionIndex);
  const stepsUp = standing.next
    ? standing.next.precisionIndex > standing.division.precisionIndex
    : false;

  const rank = rankFor(bracket, progress.rounds);
  const railFill = Math.min(
    100,
    ((standing.ranked ? standing.index + 0.5 + standing.fraction : standing.fraction * 0.5) /
      LADDER.length) *
      100,
  );

  const playing = session.phase === 'playing' && session.serve;

  return (
    <div className="sr">
      <header className="sr-hud">
        <div className="sr-hud-id">
          <span className="sr-hud-mark">Speedrun Ladder</span>
          <span className="sr-hud-sub">
            Season 4 · Week {week.week} rotation
            <span className="sr-hud-seed"> · seed {rotationSeed}</span>
          </span>
        </div>
        <dl className="sr-hud-stats">
          <div className="sr-stat">
            <dt>Credits</dt>
            <dd>{progress.currency}</dd>
          </div>
          <div className="sr-stat">
            <dt>Day streak</dt>
            <dd>{progress.streak}</dd>
          </div>
          <div className="sr-stat">
            <dt>Rotation ends</dt>
            <dd>{formatCountdown(msToRotation(now))}</dd>
          </div>
        </dl>
      </header>

      {playing && session.serve ? (
        <RunView
          division={standing.division}
          cleared={session.answerCount}
          cap={splitCap(session.summary, standing.division.precisionIndex, 10)}
          floor={session.expectedItems?.min ?? 6}
          range={thisRange}
          serve={session.serve}
          frameRef={session.frameRef}
          onFrameLoad={session.onFrameLoad}
        />
      ) : session.phase === 'finished' && lastRun ? (
        <ResultsView
          log={lastRun}
          bracket={bracket}
          summary={session.summary}
          onQueue={queue}
          onBack={() => {
            setLastRun(null);
            session.reset();
          }}
        />
      ) : (
        <main className="sr-ladder">
          <section
            className="sr-standing"
            aria-label="Your division"
            data-ranked={String(standing.ranked)}
            style={{ ['--node' as string]: standing.division.tint }}
          >
            <div className="sr-standing-badge">
              <DivisionBadge division={standing.division} ranked={standing.ranked} />
            </div>

            <p className="sr-kicker">{standing.ranked ? 'Current division' : 'No placement yet'}</p>
            <h2 className="sr-division">{standing.ranked ? standing.division.name : 'Unranked'}</h2>

            {standing.ranked ? (
              <p className="sr-standing-line">
                <span className="sr-num">{progress.rounds}</span> runs banked ·{' '}
                <span className="sr-num">#{rank}</span> in bracket 7-C
              </p>
            ) : (
              <p className="sr-standing-line">
                One run puts you on the board. Nothing on this ladder ever moves you back down.
              </p>
            )}

            <div className="sr-meter" aria-hidden="true">
              <div className="sr-meter-fill" style={{ width: `${standing.fraction * 100}%` }} />
            </div>
            <p className="sr-meter-label">
              {standing.next ? (
                <>
                  <b>{standing.runsToNext}</b>{' '}
                  {standing.runsToNext === 1 ? 'run' : 'runs'} to {standing.next.name}
                </>
              ) : (
                <>Top of the ladder. Unreal runs stay at full length.</>
              )}
            </p>

            {standing.next ? (
              <p className="sr-harder">
                <span className="sr-harder-tag">Next</span>
                <span>
                  <b>{standing.next.name}</b>{' '}
                  {stepsUp ? 'runs longer and pulls from a harder rotation' : 'pulls from a harder rotation'}
                  {nextRange && stepsUp ? <> · {nextRange} splits</> : null}.
                </span>
              </p>
            ) : null}

            {session.phase === 'starting' ? (
              <div className="sr-queueing" role="status">
                <span className="sr-queue-bar" aria-hidden="true" />
                Loading week {week.week} rotation · {standing.division.name}
              </div>
            ) : (
              <button type="button" className="sr-cta" onClick={queue}>
                <span>{standing.ranked ? 'Queue run' : 'Run placement'}</span>
              </button>
            )}

            <p className="sr-cta-note">
              {standing.division.name} rotation
              {thisRange ? <> · {thisRange} splits</> : null} · finish it and the run banks, however it
              goes.
            </p>

            {session.error ? (
              <p className="sr-fault" role="status">
                <b>Ladder unreachable.</b> <code>{session.error}</code>
              </p>
            ) : null}
          </section>

          <section className="sr-board" aria-label="Bracket standings">
            <header className="sr-board-head">
              <span className="sr-kicker">Bracket 7-C</span>
              <span className="sr-board-count">{bracket.length + 1} players</span>
            </header>
            <BracketTable bracket={bracket} rounds={progress.rounds} ranked={standing.ranked} />
            <p className="sr-board-note">
              Standings move on runs banked this season. Other players are shown for pace only.
            </p>
          </section>
        </main>
      )}

      {/* The track is the reason to be here, but not while the child is mid-problem: a competitive
          client hides the pass during a match, and this band does not need the reminder on screen. */}
      {playing ? null : (
        <section className="sr-track" aria-label="Season track">
          <header className="sr-track-head">
            <span className="sr-kicker">Season track</span>
            <span className="sr-track-note">
              Every run you finish moves the marker. Nothing moves it back.
            </span>
          </header>
          <div className="sr-track-rail">
            <div className="sr-rail" aria-hidden="true">
              <div className="sr-rail-fill" style={{ width: `${railFill}%` }} />
            </div>
            <ol className="sr-nodes">
              {LADDER.map((division, i) => (
                <TrackNode
                  key={division.key}
                  division={division}
                  position={i + 1}
                  state={
                    i < standing.index
                      ? 'claimed'
                      : i === standing.index
                        ? 'current'
                        : i === standing.index + 1
                          ? 'next'
                          : 'locked'
                  }
                />
              ))}
            </ol>
          </div>
        </section>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------

function BracketTable({
  bracket,
  rounds,
  ranked,
}: {
  bracket: readonly Rival[];
  rounds: number;
  ranked: boolean;
}) {
  const ahead = bracket.filter((r) => r.runs > rounds);
  const behind = bracket.filter((r) => r.runs <= rounds);
  const rows: readonly (Rival & { readonly you: boolean })[] = [
    ...ahead.map((r) => ({ ...r, you: false })),
    { tag: 'You', runs: rounds, you: true },
    ...behind.map((r) => ({ ...r, you: false })),
  ];

  const youIndex = ahead.length;
  const start = Math.min(Math.max(0, youIndex - 2), Math.max(0, rows.length - 5));
  const slice = rows.slice(start, start + 5);
  const leader = rows[0];

  return (
    <div className="sr-rows">
      {start > 1 && leader ? (
        <>
          <BracketRow row={leader} rank={1} ranked={ranked} />
          <div className="sr-row-gap" aria-hidden="true">
            ⋯
          </div>
        </>
      ) : null}
      {slice.map((row, i) => (
        <BracketRow key={row.you ? 'you' : row.tag} row={row} rank={start + i + 1} ranked={ranked} />
      ))}
    </div>
  );
}

function BracketRow({
  row,
  rank,
  ranked,
}: {
  row: Rival & { readonly you: boolean };
  rank: number;
  ranked: boolean;
}) {
  const division = standingFor(row.runs).division;
  const isRanked = row.you ? ranked : true;

  return (
    <div className={`sr-row ${row.you ? 'is-you' : ''}`}>
      <span className="sr-row-rank">{row.you && !ranked ? '—' : rank}</span>
      <span className="sr-row-tag">{row.tag}</span>
      <span
        className={`sr-row-div ${isRanked ? '' : 'is-unranked'}`}
        style={{ ['--node' as string]: division.tint }}
      >
        {isRanked ? division.name : 'Unranked'}
      </span>
      <span className="sr-row-runs">{row.runs}</span>
    </div>
  );
}

// ---------------------------------------------------------------------------

function RunView({
  division,
  cleared,
  cap,
  floor,
  range,
  serve,
  frameRef,
  onFrameLoad,
}: {
  division: Division;
  cleared: number;
  cap: number;
  floor: number;
  range: string | null;
  serve: NonNullable<ReturnType<typeof useScreenerSession>['serve']>;
  frameRef: ReturnType<typeof useScreenerSession>['frameRef'];
  onFrameLoad: () => void;
}) {
  return (
    <main className="sr-run">
      <div className="sr-run-bar" style={{ ['--node' as string]: division.tint }}>
        <span className="sr-run-div">{division.name}</span>
        <span className="sr-run-label">Division run</span>

        {/* Splits react to the fact of an answer landing. Nothing here knows how it went. */}
        <ol className="sr-splits" aria-hidden="true">
          {Array.from({ length: cap }, (_, i) => (
            <li
              key={i}
              className={`sr-split ${i >= floor ? 'is-window' : ''} ${i === cleared ? 'is-live' : ''} ${
                i < cleared ? 'is-done' : ''
              }`}
            />
          ))}
        </ol>

        <span className="sr-run-count" key={cleared}>
          <b aria-hidden="true">{String(Math.min(cleared + 1, cap)).padStart(2, '0')}</b>
          <em aria-hidden="true">/ {range ?? cap}</em>
          <span className="sr-only">
            Split {Math.min(cleared + 1, cap)} of {range ?? cap}
          </span>
        </span>
      </div>

      <div className="sr-arena">
        <ItemFrame
          serve={serve}
          frameRef={frameRef}
          onLoad={onFrameLoad}
          palette={PALETTE}
          className="sr-frame"
          title={`Split ${cleared + 1}`}
        />
      </div>
    </main>
  );
}

// ---------------------------------------------------------------------------

function ResultsView({
  log,
  bracket,
  summary,
  onQueue,
  onBack,
}: {
  log: RunLog;
  bracket: readonly Rival[];
  summary: BankSummary | null;
  onQueue: () => void;
  onBack: () => void;
}) {
  const before = standingFor(log.roundsBefore);
  const after = standingFor(log.roundsAfter);
  const promoted = after.index > before.index;

  const rankBefore = rankFor(bracket, log.roundsBefore);
  const rankAfter = rankFor(bracket, log.roundsAfter);
  const passed = Math.max(0, rankBefore - rankAfter);

  const nextRange = after.next ? splitRange(summary, after.next.precisionIndex) : null;
  const stepsUp = after.next ? after.next.precisionIndex > after.division.precisionIndex : false;

  return (
    <main
      className="sr-results"
      data-ranked={String(after.ranked)}
      style={{ ['--node' as string]: after.division.tint }}
    >
      <div className="sr-results-badge">
        <DivisionBadge division={after.division} ranked={after.ranked} promoted={promoted} />
      </div>

      {/* The one live region in the experience, and it fires once, at the end of the run. Feedback for
          this band is deferred by design: nothing announces itself between splits. */}
      <div role="status">
        <p className="sr-kicker">{promoted ? 'Division up' : 'Run banked'}</p>
        <h2 className="sr-division">{after.ranked ? after.division.name : 'Unranked'}</h2>
        {promoted ? (
          <p className="sr-results-lede">
            {before.ranked
              ? `${before.division.name} → ${after.division.name}.`
              : 'Placement complete.'}{' '}
            {after.division.reward} unlocked.
          </p>
        ) : (
          <p className="sr-results-lede">
            {after.runsToNext} more {after.runsToNext === 1 ? 'run' : 'runs'} to{' '}
            {after.next?.name ?? 'the top'}.
          </p>
        )}
      </div>

      <dl className="sr-tally">
        <div>
          <dt>Splits cleared</dt>
          <dd>{log.splits}</dd>
        </div>
        <div>
          <dt>Credits</dt>
          <dd>+{log.credits}</dd>
        </div>
        <div>
          <dt>Bracket</dt>
          <dd>
            #{rankAfter}
            {passed > 0 ? <span className="sr-delta"> ▲{passed}</span> : null}
          </dd>
        </div>
        <div>
          <dt>Day streak</dt>
          <dd>{log.streak}</dd>
        </div>
      </dl>

      {log.rarity ? (
        <p className="sr-drop">
          <b>Seven days running.</b> Rare drop added to your locker.
        </p>
      ) : null}

      {after.next ? (
        <p className="sr-harder">
          <span className="sr-harder-tag">Next</span>
          <span>
            <b>{after.next.name}</b>{' '}
            {stepsUp
              ? 'is a longer run against a harder rotation'
              : 'pulls from a harder rotation at the same length'}
            {nextRange && stepsUp ? <> · {nextRange} splits</> : null}. That is what climbing costs.
          </span>
        </p>
      ) : null}

      <div className="sr-results-actions">
        <button type="button" className="sr-cta" onClick={onQueue}>
          <span>Queue next run</span>
        </button>
        <button type="button" className="sr-ghost" onClick={onBack}>
          Back to ladder
        </button>
      </div>
    </main>
  );
}
