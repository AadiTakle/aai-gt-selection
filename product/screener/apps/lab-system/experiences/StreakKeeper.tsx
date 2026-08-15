import { useEffect, useId, useMemo, useState } from 'react';

import { ItemFrame } from '../shared/ItemFrame';
import {
  clearProgress,
  FRESH,
  loadProgress,
  RARITY_STREAK,
  recordRound,
  type Progress,
} from '../shared/progression';
import type { ExperienceMeta, Palette } from '../shared/types';
import { useScreenerSession } from '../shared/useScreenerSession';

import './StreakKeeper.css';

/**
 * Streak Keeper, for grades 2-3. A Duolingo-shaped daily run: one flame, one week row, one green
 * button, and a rarity that climbs the longer the run survives.
 *
 * WHY A STREAK FOR SEVEN-YEAR-OLDS. This band will come back tomorrow for a thing they own and would
 * lose, which is exactly the return schedule a longitudinal measure needs. The streak is the pull, so
 * the streak has to be the biggest thing on the screen, and it advances on calendar days rather than
 * on anything the child does well.
 *
 * WHAT IS DELIBERATELY MISSING. Duolingo's lesson chrome has hearts in the corner; hearts are a
 * failure currency and there is nothing here for a child to run out of. There is no wrong state, no
 * lockout and no way to lose the streak mid-run. The only things that move are the count of answers
 * given and the number of days attended.
 */

export const meta: ExperienceMeta = {
  id: 'streak-keeper',
  title: 'Streak Keeper',
  world: 'Duolingo',
  band: '2-3',
  pull: 'A daily run you do not want to break',
  accent: '#58cc02',
};

/**
 * Duolingo's own palette, pushed into the item frame so a served item reads as a lesson card.
 *
 * `--bad` is the one considered departure. An item may tint something with it, and a red tint is read
 * by a seven-year-old as "you got that wrong". Theming is the only lever this experience has over the
 * inside of the frame, so it is spent neutralising that: `--bad` is Duolingo's Swan grey, the same
 * family as the ordinary borders.
 */
const PALETTE: Palette = {
  '--ink': '#3c3c3c',
  '--accent': '#58cc02',
  '--good': '#58cc02',
  '--bad': '#d7d7d7',
  '--card': '#ffffff',
  '--bg1': '#ffffff',
  '--bg2': '#f7f7f7',
  '--line': '#e5e5e5',
  '--paper': '#ffffff',
  '--socket': '#e5e5e5',
};

interface Tier {
  /** Consecutive days at which this tier starts. */
  readonly at: number;
  readonly name: string;
  /** Top of the flame, the lighter colour. */
  readonly inner: string;
  /** Base of the flame, the deeper colour. */
  readonly outer: string;
  readonly glow: string;
}

/** Day zero, and the state the screen is designed around. Drawn as an outline rather than filled. */
const UNLIT: Tier = {
  at: 0,
  name: 'Unlit',
  inner: '#dcdcdc',
  outer: '#afafaf',
  glow: 'rgba(0, 0, 0, 0.07)',
};

/**
 * The ladder. Real flames run orange, then gold, then blue, and a child of this age already half knows
 * that blue is the hot one, so the rarity order carries a fact rather than an arbitrary colour swap.
 * Gold sits on RARITY_STREAK because that is where the shared progression grants rarity.
 */
const TIERS: readonly Tier[] = [
  UNLIT,
  { at: 1, name: 'Spark', inner: '#ffd84d', outer: '#ff9600', glow: 'rgba(255, 150, 0, 0.34)' },
  { at: 3, name: 'Fire', inner: '#ffa41b', outer: '#ff4b4b', glow: 'rgba(255, 105, 40, 0.36)' },
  { at: RARITY_STREAK, name: 'Gold Fire', inner: '#fff3b0', outer: '#f0a500', glow: 'rgba(255, 200, 0, 0.44)' },
  { at: 14, name: 'Blue Fire', inner: '#a9e8ff', outer: '#1cb0f6', glow: 'rgba(28, 176, 246, 0.38)' },
  { at: 30, name: 'Legend', inner: '#f4c2ff', outer: '#ce82ff', glow: 'rgba(206, 130, 255, 0.38)' },
];

function tierFor(streak: number): Tier {
  let found = UNLIT;
  for (const tier of TIERS) if (streak >= tier.at) found = tier;
  return found;
}

function nextTier(streak: number): Tier | null {
  for (const tier of TIERS) if (tier.at > streak) return tier;
  return null;
}

/**
 * Local calendar date, in the same shape progression stores.
 *
 * Copied rather than imported because `progression.ts` keeps its `today()` private. Both must agree or
 * the week row will disagree with the streak it is drawing, so this is the one duplication in the file
 * and it is flagged in the handoff.
 */
function isoOf(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

const DAY_LETTER = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const DAY_NAME = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

interface WeekDay {
  readonly iso: string;
  readonly letter: string;
  readonly name: string;
  readonly isToday: boolean;
  readonly isFuture: boolean;
  readonly done: boolean;
}

/**
 * The current Sunday-to-Saturday week, with the attended days filled in.
 *
 * Which days were attended is derived rather than stored: a streak of N ending on `lastDay` means the
 * N days up to and including `lastDay`, by the definition of a streak. Days outside this week simply
 * fall off the row.
 */
function buildWeek(progress: Progress, now: Date): readonly WeekDay[] {
  const todayIso = isoOf(now);

  const attended = new Set<string>();
  if (progress.lastDay && progress.streak > 0) {
    const last = new Date(`${progress.lastDay}T00:00:00`);
    const span = Math.min(progress.streak, 366);
    for (let i = 0; i < span; i += 1) {
      const day = new Date(last);
      day.setDate(last.getDate() - i);
      attended.add(isoOf(day));
    }
  }

  const sunday = new Date(now);
  sunday.setHours(0, 0, 0, 0);
  sunday.setDate(sunday.getDate() - sunday.getDay());

  return DAY_LETTER.map((letter, i) => {
    const day = new Date(sunday);
    day.setDate(sunday.getDate() + i);
    const iso = isoOf(day);
    return {
      iso,
      letter,
      name: DAY_NAME[i] ?? iso,
      isToday: iso === todayIso,
      isFuture: iso > todayIso,
      done: attended.has(iso),
    };
  });
}

/** What a finished round is worth, held separately so the panel can survive `session.reset()`. */
interface Reward {
  readonly streak: number;
  readonly advanced: boolean;
  readonly rarity: boolean;
  readonly gems: number;
  readonly puzzles: number;
}

/** Lab affordance. Day zero is the real default; these only change what is drawn. */
const PREVIEW_DAYS = [1, 3, 7, 14, 30];

function previewOf(days: number, now: Date): Progress {
  // Dated to yesterday deliberately. A streak that is already safe for today is the dull half of the
  // state space; the one worth showing is a live streak with today still open, which is the tension
  // the whole screen exists to create.
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  return {
    streak: days,
    bestStreak: days,
    lastDay: isoOf(yesterday),
    rounds: days,
    items: days * 8,
    currency: days * 26,
    unlocked: [],
  };
}

/**
 * Two tongues, not one.
 *
 * The obvious path here is a teardrop, and a teardrop renders as a water droplet at every size. What
 * makes a shape read as fire is the smaller lick breaking away from the main tip, so the notch between
 * them is the load-bearing part of this curve. It survives down to the eighteen pixels the header
 * chip draws it at, which is why the same path serves every size in the file.
 */
const FLAME_PATH =
  'M69 3 C67 25 60 37 52 47 C49 38 48 29 51 20 C38 32 29 48 27 64 C18 74 14 87 14 101 C14 127 35 147 60 147 C85 147 106 127 106 101 C106 84 98 71 89 61 C88 43 79 24 69 3 Z';

function Flame({ tier, lit, className }: { tier: Tier; lit: boolean; className?: string }) {
  // Colons from useId are not safe inside a url(#…) reference.
  const uid = useId().replace(/:/g, '');

  // Unlit is drawn, not tinted: a hard outline over an almost-empty interior, which reads as a slot
  // waiting to be filled rather than as a flame someone greyed out. A dashed version of this was tried
  // first and the dashes ate the notch between the two tongues, so the silhouette stopped being fire.
  if (!lit) {
    return (
      <svg className={className} viewBox="0 0 120 150" aria-hidden="true" focusable="false">
        <path
          d={FLAME_PATH}
          fill="#ececec"
          stroke="#c8c8c8"
          strokeWidth={5}
          strokeLinejoin="round"
        />
      </svg>
    );
  }

  return (
    <svg className={className} viewBox="0 0 120 150" aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id={`${uid}-body`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={tier.inner} />
          <stop offset="100%" stopColor={tier.outer} />
        </linearGradient>
        <radialGradient id={`${uid}-hot`} cx="42%" cy="32%" r="48%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.5" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
        </radialGradient>
      </defs>
      <path d={FLAME_PATH} fill={`url(#${uid}-body)`} />
      <path d={FLAME_PATH} fill={`url(#${uid}-hot)`} />
    </svg>
  );
}

function Gem({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M6 3h12l4 6-10 12L2 9Z" fill="#ff4b4b" />
      <path d="M6 3h6l-2 6H2Z" fill="#ff8080" />
      <path d="M2 9h20l-10 12Z" fill="#e02f2f" />
    </svg>
  );
}

export default function StreakKeeper() {
  const [saved, setSaved] = useState<Progress>(() => loadProgress(meta.id));
  const [preview, setPreview] = useState<Progress | null>(null);
  const [reward, setReward] = useState<Reward | null>(null);
  // Holds the answer number rather than incrementing, so a repeated call cannot double-count.
  const [tick, setTick] = useState(0);

  const session = useScreenerSession({
    ageBand: '2-3',
    // "Short" on the precision ladder: 6-10 items, which lands well under eight minutes for this band.
    precisionIndex: 1,
    palette: PALETTE,
    onAnswer: (count) => setTick(count),
    onFinished: (result) => {
      const outcome = recordRound(meta.id, result.itemsServed);
      setSaved(outcome.progress);
      setPreview(null);
      setReward({
        streak: outcome.progress.streak,
        advanced: outcome.streakAdvanced,
        rarity: outcome.rarityEarned,
        gems: outcome.currencyEarned,
        puzzles: result.itemsServed,
      });
    },
  });

  const shown = preview ?? saved;
  const tier = tierFor(shown.streak);
  const upcoming = nextTier(shown.streak);
  const lit = shown.streak > 0;
  const week = useMemo(() => buildWeek(shown, new Date()), [shown]);
  const doneToday = shown.lastDay === isoOf(new Date());

  useEffect(() => {
    if (tick === 0) return;
    const timer = setTimeout(() => setTick(0), 900);
    return () => clearTimeout(timer);
  }, [tick]);

  const flameVars = {
    ['--flame-inner' as string]: tier.inner,
    ['--flame-outer' as string]: tier.outer,
    ['--flame-glow' as string]: tier.glow,
  };

  const playing = session.phase === 'playing' && session.serve;
  const answers = session.answerCount;
  const least = session.expectedItems?.min ?? 6;

  let runLine = 'Here we go.';
  if (answers === 1) runLine = 'One down.';
  else if (answers >= least - 1) runLine = 'Nearly there.';
  else if (answers > 1) runLine = `${answers} done.`;

  // The run takes the whole screen. Nothing from the home view competes with the item.
  if (playing && session.serve) {
    return (
      <div className="streak is-running" style={flameVars}>
        <div className="streak-runbar">
          <span className="streak-chip">
            <Flame tier={tier} lit={lit} className="streak-chip-flame" />
            <b>{shown.streak}</b>
          </span>
          <div className="streak-track">
            <div
              className="streak-track-fill"
              style={{ width: `${Math.round(Math.max(0.04, session.progress) * 100)}%` }}
            />
            {tick > 0 ? (
              <span className="streak-tick" key={tick}>
                +1
              </span>
            ) : null}
          </div>
          <span className="streak-chip">
            <Gem className="streak-chip-gem" />
            <b>{shown.currency}</b>
          </span>
        </div>
        <p className="streak-runline" role="status">
          {runLine}
        </p>
        <ItemFrame
          serve={session.serve}
          frameRef={session.frameRef}
          onLoad={session.onFrameLoad}
          palette={PALETTE}
          className="streak-frame"
        />
      </div>
    );
  }

  return (
    <div className="streak" style={flameVars}>
      <div className="streak-hud">
        <span className="streak-chip">
          <Flame tier={tier} lit={lit} className="streak-chip-flame" />
          <b>{shown.streak}</b>
        </span>
        <span className="streak-chip">
          <Gem className="streak-chip-gem" />
          <b>{shown.currency}</b>
        </span>
      </div>

      <div className="streak-stage">
        {session.phase === 'finished' && reward ? (
          <section className="streak-done" aria-live="polite">
            <div
              className={`streak-hero ${reward.streak > 0 ? 'is-lit' : ''} ${
                reward.advanced ? 'just-lit' : ''
              }`}
            >
              <Flame tier={tierFor(reward.streak)} lit={reward.streak > 0} className="streak-flame" />
              <span className="streak-flame-num" aria-hidden="true">
                {reward.streak}
              </span>
            </div>
            <h2 className="streak-shout">{reward.rarity ? 'Gold Fire!' : 'Run complete'}</h2>
            <p className="streak-sub">
              {reward.rarity
                ? `${RARITY_STREAK} days in a row. Your flame turned gold.`
                : reward.advanced
                  ? `Day ${reward.streak} of your streak is safe.`
                  : 'Extra run today. Your streak was already safe.'}
            </p>

            <ul className="streak-tiles">
              <li className="streak-tile is-streak">
                <span>Day streak</span>
                <b>{reward.streak}</b>
              </li>
              <li className="streak-tile is-gems">
                <span>Gems</span>
                <b>+{reward.gems}</b>
              </li>
              <li className="streak-tile is-puzzles">
                <span>Puzzles</span>
                <b>{reward.puzzles}</b>
              </li>
            </ul>

            <button type="button" className="streak-go" onClick={() => session.reset()}>
              Continue
            </button>
          </section>
        ) : (
          <>
            <div className={`streak-hero ${lit ? 'is-lit' : ''}`}>
              {lit ? (
                <div className="streak-embers" aria-hidden="true">
                  {[0, 1, 2, 3, 4].map((i) => (
                    <span key={i} style={{ ['--i' as string]: String(i) }} />
                  ))}
                </div>
              ) : null}
              <Flame tier={tier} lit={lit} className="streak-flame" />
              <span className="streak-flame-num" aria-hidden="true">
                {shown.streak}
              </span>
            </div>

            <p className="streak-hero-label">
              <span className="sr-only">{`${shown.streak} day streak.`}</span>
              <span aria-hidden="true">day streak</span>
            </p>
            <p className="streak-sub">
              {shown.streak === 0
                ? 'No flame yet. One run lights it.'
                : doneToday
                  ? 'Safe for today. Come back tomorrow.'
                  : 'Run today or the flame goes out.'}
            </p>

            <section className="streak-card streak-week" aria-label="This week">
              <h3>This week</h3>
              <ol className="streak-days">
                {week.map((day, i) => {
                  const prev = week[i - 1];
                  const linked = day.done && prev?.done === true;
                  return (
                    <li
                      key={day.iso}
                      className={`streak-day ${day.done ? 'is-done' : ''} ${
                        day.isToday ? 'is-today' : ''
                      } ${day.isFuture ? 'is-future' : ''} ${linked ? 'is-linked' : ''}`}
                    >
                      <span className="streak-day-letter" aria-hidden="true">
                        {day.letter}
                      </span>
                      <span className="streak-day-dot">
                        <span className="sr-only">
                          {day.name}
                          {day.isToday ? ', today' : ''}
                          {day.done ? ', run done' : ''}
                        </span>
                      </span>
                    </li>
                  );
                })}
              </ol>
            </section>

            <section className="streak-card streak-ladder">
              <div className="streak-ladder-head">
                <h3>
                  <Flame tier={tier} lit={lit} className="streak-tier-flame" />
                  {lit ? tier.name : 'No flame yet'}
                  {shown.streak >= RARITY_STREAK ? <em className="streak-rare">rare</em> : null}
                </h3>
                <p>
                  {upcoming
                    ? `${upcoming.at - shown.streak} ${
                        upcoming.at - shown.streak === 1 ? 'day' : 'days'
                      } to ${upcoming.name}`
                    : 'Top of the ladder'}
                </p>
              </div>

              <ol className="streak-rungs">
                {TIERS.map((rung) => {
                  const reached = shown.streak >= rung.at;
                  const isNow = rung.at === tier.at;
                  return (
                    <li
                      key={rung.name}
                      className={`streak-rung ${reached ? 'is-reached' : ''} ${isNow ? 'is-now' : ''}`}
                      style={{
                        ['--rung-inner' as string]: rung.inner,
                        ['--rung-outer' as string]: rung.outer,
                      }}
                    >
                      <span className="streak-rung-pip" aria-hidden="true" />
                      <span className="streak-rung-name">{rung.at === 0 ? 'Start' : rung.name}</span>
                      <span className="streak-rung-day">{rung.at === 0 ? '—' : `${rung.at}d`}</span>
                    </li>
                  );
                })}
              </ol>
            </section>

            {session.phase === 'error' ? (
              <p className="streak-oops" role="alert">
                Today&rsquo;s run could not load. Tap the button to try again.
                <small>{session.error}</small>
              </p>
            ) : null}

            <button
              type="button"
              className="streak-go"
              disabled={session.phase === 'starting'}
              onClick={() => {
                setPreview(null);
                setReward(null);
                void session.start();
              }}
            >
              {session.phase === 'starting'
                ? 'Getting it ready…'
                : doneToday
                  ? 'Run it again'
                  : "Start today's run"}
            </button>
            <p className="streak-note">About 5 minutes. {shown.rounds} runs so far.</p>
          </>
        )}
      </div>

      {session.phase === 'idle' || session.phase === 'error' ? (
        <div className="streak-lab">
          <span className="streak-lab-tag">Lab preview</span>
          <button
            type="button"
            className={preview === null ? 'on' : ''}
            onClick={() => setPreview(null)}
          >
            saved
          </button>
          {PREVIEW_DAYS.map((days) => (
            <button
              key={days}
              type="button"
              className={preview?.streak === days ? 'on' : ''}
              onClick={() => setPreview(previewOf(days, new Date()))}
            >
              day {days}
            </button>
          ))}
          <button
            type="button"
            onClick={() => {
              clearProgress(meta.id);
              setSaved(FRESH);
              setPreview(null);
              setReward(null);
            }}
          >
            wipe saved
          </button>
        </div>
      ) : null}
    </div>
  );
}
