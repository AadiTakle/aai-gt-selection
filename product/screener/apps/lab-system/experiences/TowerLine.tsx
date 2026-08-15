import { useCallback, useEffect, useMemo, useState, type CSSProperties, type ReactNode } from 'react';

import { ItemFrame } from '../shared/ItemFrame';
import { loadProgress, recordRound, spend, unlock, type Progress } from '../shared/progression';
import type { ExperienceMeta, Palette } from '../shared/types';
import { useScreenerSession } from '../shared/useScreenerSession';

import './TowerLine.css';

/**
 * Tower Line, for 4-5. A three-lane arena. Every push you hold pays out elixir, and elixir buys
 * defenders that stay posted on the board across visits.
 *
 * WHY THIS SHAPE FOR NINE TO ELEVEN YEAR OLDS. This band wants to feel competent and strategic, so the
 * loop is deliberately a resource decision rather than a reveal: the payout is known in advance, the
 * costs are on the cards, and the interesting part is where you spend. The board is the save file. A
 * child returning on day four sees six defenders they chose and placed, which is a far stronger reason
 * to come back than a message telling them they did well.
 *
 * WHAT THE ELIXIR IS PAID FOR. Holding a push to the end. Not accuracy, which this component is never
 * told and never tries to infer. `onAnswer` fires on every answer whatever the outcome and only moves
 * the advance meter; `onFinished` is the single place currency is minted, via `recordRound`. There is
 * no failure state anywhere: an unaffordable card is a goal with a number attached, not a lock, and a
 * lane left open is a choice rather than a punishment.
 */

export const meta: ExperienceMeta = {
  id: 'tower-line',
  title: 'Tower Line',
  world: 'Clash Royale',
  band: '4-5',
  pull: 'Earn elixir, hold the lanes',
  accent: '#7b3fbf',
};

/**
 * Retints the served item so it reads as an arena card rather than a form.
 *
 * The surfaces stay LIGHT on purpose. Several items in the catalogue hardcode white cells and grey
 * captions that no custom property reaches, so a dark `--card` produces light text on white tiles. The
 * world is therefore carried by the chrome around the frame, which is entirely under this file's
 * control, and the item itself gets a lavender arena haze, parchment card and royal purple accent. The
 * telemetry panel is dark by default, so that one can go full deep purple safely.
 */
const PALETTE: Palette = {
  '--ink': '#241042',
  '--accent': '#5f2ba8',
  '--good': '#1f7a4d',
  '--bad': '#9c3535',
  '--card': '#fffaf2',
  '--paper': '#fffdf8',
  '--bg1': '#f2ebff',
  '--bg2': '#ddcdf7',
  '--line': '#d9c9f2',
  '--socket': '#d8a93a',
  '--tel-bg': '#2c1155',
  '--tel-ink': '#f4ecff',
  '--tel-key': '#f7c948',
  '--tel-dim': '#b79ae0',
};

type Rarity = 'common' | 'rare' | 'epic' | 'legendary';
type GlyphKind = 'knight' | 'archers' | 'cannon' | 'bomber' | 'valkyrie' | 'musketeer' | 'wizard' | 'golem';

interface Defender {
  readonly id: GlyphKind;
  readonly name: string;
  /** Priced against the payout of a round, so one push buys roughly one common defender. */
  readonly cost: number;
  readonly rarity: Rarity;
  readonly note: string;
}

/**
 * Costs are tuned to the payout in `progression.ts`: ten a round plus two an item, so a standard push
 * pays 26 to 42. One push therefore buys a common, two buy a rare, and the golem is something to save
 * for. That ladder is the whole strategy layer.
 */
const DECK: readonly Defender[] = [
  { id: 'knight', name: 'Knight', cost: 24, rarity: 'common', note: 'Holds the front. Nothing walks past him in a hurry.' },
  { id: 'archers', name: 'Archers', cost: 26, rarity: 'common', note: 'Two of them, hitting from safely behind the line.' },
  { id: 'cannon', name: 'Cannon', cost: 28, rarity: 'common', note: 'Stays where you put it and covers the whole lane.' },
  { id: 'bomber', name: 'Bomber', cost: 32, rarity: 'rare', note: 'Lobs over your front rank and clears a crowd.' },
  { id: 'valkyrie', name: 'Valkyrie', cost: 36, rarity: 'rare', note: 'Spins through an entire group in one pass.' },
  { id: 'musketeer', name: 'Musketeer', cost: 40, rarity: 'rare', note: 'Long range. From the centre she covers two lanes.' },
  { id: 'wizard', name: 'Wizard', cost: 48, rarity: 'epic', note: 'Expensive, and worth it the moment a crowd arrives.' },
  { id: 'golem', name: 'Golem', cost: 64, rarity: 'legendary', note: 'Slow, enormous, and very hard to stop.' },
];

/** Rendered when storage holds a placement for a defender this build no longer ships. */
const RETIRED: Defender = {
  id: 'knight',
  name: 'Veteran',
  cost: 0,
  rarity: 'common',
  note: 'Posted here in an earlier season.',
};

interface Lane {
  readonly id: string;
  readonly name: string;
}

const LANES: readonly Lane[] = [
  { id: 'L', name: 'Left' },
  { id: 'C', name: 'Centre' },
  { id: 'R', name: 'Right' },
];

/** Top to bottom: the post nearest the bridge is the most forward. */
const POSTS: readonly string[] = ['Bridge', 'Mid', 'Home'];

/** Neutral descriptions of a lane. An open lane is a decision, never a warning. */
const LANE_READ: readonly string[] = ['Open', 'Thin', 'Solid', 'Locked'];

const CHEAPEST = DECK.reduce((low, d) => Math.min(low, d.cost), Number.POSITIVE_INFINITY);

function slotId(lane: string, index: number): string {
  return `${lane}${index + 1}`;
}

const SLOT_IDS: ReadonlySet<string> = new Set(
  LANES.flatMap((lane) => POSTS.map((_, i) => slotId(lane.id, i))),
);

/* ---------------------------------------------------------------- emblems */

/** Flat, chunky emblems. All inline SVG: nothing here loads over the network. */
const GLYPHS: Record<GlyphKind, ReactNode> = {
  knight: (
    <>
      <path d="M12 2c-4.1 0-7 2.7-7 6.6V13c0 3.6 3.1 6.4 7 6.4s7-2.8 7-6.4V8.6C19 4.7 16.1 2 12 2Z" />
      <rect x="5" y="9.6" width="14" height="3.2" rx="1.2" fill="var(--cut)" />
      <path d="M9.4 19h5.2l1.2 3H8.2Z" />
    </>
  ),
  archers: (
    <>
      <path d="M7 2.8a12.4 12.4 0 0 1 0 18.4" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
      <path d="M7 3v18" fill="none" stroke="var(--cut)" strokeWidth="1.5" />
      <path d="M5.6 12h12.8" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
      <path d="M14.8 8.4 19.4 12l-4.6 3.6" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </>
  ),
  cannon: (
    <>
      <rect x="3.4" y="10.6" width="11.4" height="5.6" rx="2.4" />
      <path d="M14.4 9.8 21 7v10l-6.6-2.8Z" />
      <circle cx="7" cy="19" r="2.9" />
      <circle cx="7" cy="19" r="1.1" fill="var(--cut)" />
    </>
  ),
  bomber: (
    <>
      <circle cx="10.6" cy="15" r="6.4" />
      <circle cx="8.4" cy="13" r="1.7" fill="var(--cut)" />
      <path d="M14.8 9.6 17.2 7.2" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" />
      <path d="M18 3.6c1.7.7 2.3 2 1.8 3.6" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </>
  ),
  valkyrie: (
    <>
      <rect x="10.9" y="2.6" width="2.2" height="18.8" rx="1.1" />
      <path d="M13.1 4.2c4.5 0 7.5 2 7.5 4.9s-3 4.9-7.5 4.9Z" />
      <path d="M10.9 4.2c-4.5 0-7.5 2-7.5 4.9s3 4.9 7.5 4.9Z" />
      <rect x="10.4" y="7.8" width="3.2" height="2.4" rx="1" fill="var(--cut)" />
    </>
  ),
  musketeer: (
    <>
      <path d="M19.4 2.8 21.2 4.6 8.8 17 7 15.2Z" />
      <path d="M7.6 15.4 9.4 17.2l-3.6 3.6a1.3 1.3 0 0 1-1.8-1.8Z" />
      <rect x="11.2" y="11.4" width="3.4" height="2.4" rx="1" fill="var(--cut)" transform="rotate(-45 12.9 12.6)" />
    </>
  ),
  wizard: (
    <>
      <path d="M12 1.8 6 15.4h12Z" />
      <ellipse cx="12" cy="17" rx="9" ry="2.7" />
      <circle cx="12" cy="11.6" r="2" fill="var(--cut)" />
    </>
  ),
  golem: (
    <>
      <rect x="8" y="2.4" width="8" height="5.4" rx="1.6" />
      <rect x="4.2" y="8.6" width="15.6" height="8.2" rx="2.2" />
      <rect x="5.8" y="17.4" width="4.8" height="4.4" rx="1.4" />
      <rect x="13.4" y="17.4" width="4.8" height="4.4" rx="1.4" />
      <rect x="9.4" y="4.2" width="1.9" height="1.9" rx="0.5" fill="var(--cut)" />
      <rect x="12.7" y="4.2" width="1.9" height="1.9" rx="0.5" fill="var(--cut)" />
    </>
  ),
};

function Glyph({ kind, className }: { kind: GlyphKind; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={`tl-glyph ${className ?? ''}`} aria-hidden="true" focusable="false">
      {GLYPHS[kind]}
    </svg>
  );
}

function Droplet({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={`tl-drop ${className ?? ''}`} aria-hidden="true" focusable="false">
      <path d="M12 1.6c4.6 5.2 7.4 9 7.4 12.4A7.4 7.4 0 0 1 4.6 14C4.6 10.6 7.4 6.8 12 1.6Z" />
      <path d="M9.2 13.4a3.4 3.4 0 0 0 3.2 3.6" fill="none" stroke="var(--drop-shine)" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}

function Tower({ variant }: { variant: 'enemy' | 'home' | 'king' }) {
  return (
    <svg viewBox="0 0 44 52" className={`tl-tower tl-tower-${variant}`} aria-hidden="true" focusable="false">
      {variant === 'king' ? (
        <path className="tl-t-crown" d="M12 4.6 16.4 9 22 1.8 27.6 9 32 4.6v5.2H12Z" />
      ) : null}
      <path className="tl-t-base" d="M2.5 50h39l-5-7.5h-29Z" />
      <rect className="tl-t-body" x="9" y="15" width="26" height="28" rx="2.5" />
      <rect className="tl-t-crenel" x="9" y="10" width="7" height="7" rx="1.4" />
      <rect className="tl-t-crenel" x="18.5" y="10" width="7" height="7" rx="1.4" />
      <rect className="tl-t-crenel" x="28" y="10" width="7" height="7" rx="1.4" />
      <rect className="tl-t-window" x="18" y="23" width="8" height="12" rx="4" />
      <path className="tl-t-shade" d="M28 15h7v28h-7Z" />
    </svg>
  );
}

/* ---------------------------------------------------------------- helpers */

function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Eases a displayed number toward its target so a payout lands as motion rather than a jump.
 *
 * The last painted value lives in a ref, so an animation interrupted by a second payout resumes from
 * what is actually on screen instead of snapping.
 */
function useCountUp(target: number, durationMs = 780): number {
  const [display, setDisplay] = useState(target);
  const [shown] = useState(() => ({ value: target }));

  useEffect(() => {
    const from = shown.value;
    if (prefersReducedMotion() || from === target) {
      shown.value = target;
      setDisplay(target);
      return;
    }
    let raf = 0;
    const startedAt = performance.now();
    const tick = (now: number) => {
      const p = Math.min(1, (now - startedAt) / durationMs);
      const eased = 1 - (1 - p) ** 3;
      const value = Math.round(from + (target - from) * eased);
      shown.value = value;
      setDisplay(value);
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, durationMs, shown]);

  return display;
}

interface Reward {
  readonly elixir: number;
  readonly advances: number;
  readonly streak: number;
  readonly streakAdvanced: boolean;
  readonly rarityEarned: boolean;
}

/* ---------------------------------------------------------------- the experience */

export default function TowerLine() {
  const [progress, setProgress] = useState<Progress>(() => loadProgress(meta.id));
  const [selected, setSelected] = useState<GlyphKind | null>(null);
  const [justPlaced, setJustPlaced] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [reward, setReward] = useState<Reward | null>(null);

  const session = useScreenerSession({
    ageBand: '4-5',
    // Standard on the precision ladder: 8 to 16 items, comfortably inside twelve minutes for this band.
    precisionIndex: 2,
    palette: PALETTE,
    // Fires on every answer whatever the outcome, which is exactly why the copy is identical each time.
    onAnswer: (n) => setNote(`Advance ${n} met. The line is holding.`),
    onFinished: (result) => {
      const outcome = recordRound(meta.id, result.itemsServed);
      setProgress(outcome.progress);
      setReward({
        elixir: outcome.currencyEarned,
        advances: result.itemsServed,
        streak: outcome.progress.streak,
        streakAdvanced: outcome.streakAdvanced,
        rarityEarned: outcome.rarityEarned,
      });
    },
  });

  /**
   * The board, read back out of `unlocked`. A token is `slot:defender`, one per slot. An id this build
   * no longer ships still renders as a held post, so elixir can never be spent on a slot that then
   * refuses to show anything.
   */
  const placements = useMemo(() => {
    const map = new Map<string, Defender>();
    for (const token of progress.unlocked) {
      const [slot, card] = token.split(':');
      if (!slot || !card || !SLOT_IDS.has(slot) || map.has(slot)) continue;
      map.set(slot, DECK.find((d) => d.id === card) ?? RETIRED);
    }
    return map;
  }, [progress.unlocked]);

  const posted = placements.size;
  const elixir = useCountUp(progress.currency);
  const selectedCard = useMemo(() => DECK.find((d) => d.id === selected) ?? null, [selected]);
  const affordable = useMemo(() => DECK.filter((d) => d.cost <= progress.currency).length, [progress.currency]);

  useEffect(() => {
    if (!justPlaced) return;
    const t = setTimeout(() => setJustPlaced(null), 900);
    return () => clearTimeout(t);
  }, [justPlaced]);

  const placeAt = useCallback(
    (slot: string, laneName: string, postName: string) => {
      const card = DECK.find((d) => d.id === selected);
      if (!card) {
        setNote('Pick a defender from your deck, then tap the post you want it on.');
        return;
      }
      if (placements.has(slot)) {
        setNote(`The ${laneName} lane already holds that post. Choose an empty one.`);
        return;
      }
      const paid = spend(meta.id, card.cost);
      if (!paid) {
        const short = card.cost - progress.currency;
        setNote(`${card.name} costs ${card.cost} elixir and you are ${short} short. Every push you hold pays out more.`);
        return;
      }
      setProgress(unlock(meta.id, `${slot}:${card.id}`));
      setSelected(null);
      setJustPlaced(slot);
      setNote(`${card.name} deployed to the ${laneName} lane, ${postName.toLowerCase()} post.`);
    },
    [selected, placements, progress.currency],
  );

  const beginPush = useCallback(() => {
    setReward(null);
    setNote(null);
    void session.start();
  }, [session]);

  const backToBoard = useCallback(() => {
    setReward(null);
    setNote('Elixir collected. Spend it on the lane you think needs it.');
    session.reset();
  }, [session]);

  // The payout panel covers the board, so it takes the keyboard with it and gives Escape back.
  useEffect(() => {
    if (!reward) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') backToBoard();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [reward, backToBoard]);

  const inBattle = session.phase === 'playing' || session.phase === 'starting';
  const target = session.expectedItems?.min ?? 8;
  const advances = session.answerCount;
  const held = Math.min(advances, target);
  const extra = Math.max(0, advances - target);
  const toNext = Math.max(0, CHEAPEST - progress.currency);
  const fill = Math.min(1, progress.currency / CHEAPEST);

  /* -------------------------------------------------------------- battle */

  if (inBattle) {
    return (
      <div className="tl tl-battle">
        <div className="tl-battlebar">
          <div className="tl-bb-id">
            <span className="tl-kicker">Push in progress</span>
            <strong className="tl-stroke">Hold the line</strong>
          </div>

          <div className="tl-meter" style={{ ['--tl-adv' as string]: String(held / target) } as CSSProperties}>
            <div className="tl-meter-track">
              <div className="tl-meter-fill" />
              <div className="tl-meter-pips" aria-hidden="true">
                {Array.from({ length: target }, (_, i) => (
                  <span key={i} className={i < held ? 'tl-pip on' : 'tl-pip'} />
                ))}
              </div>
              {/* The outer node keeps its identity so `left` can transition; the inner one is keyed on
                  the answer count so its impact animation replays on every answer. */}
              <span className="tl-marcher" aria-hidden="true">
                <span key={advances} className="tl-marcher-pop">
                  <svg viewBox="0 0 24 24" focusable="false">
                    <path d="M4 3.4 19.4 12 4 20.6Z" />
                  </svg>
                </span>
              </span>
            </div>
            <span className="tl-meter-label">Ground taken</span>
          </div>

          <div className="tl-bb-count">
            <strong className="tl-num">{advances}</strong>
            <span>
              advances met
              {extra > 0 ? <em className="tl-extra"> +{extra} extra ground</em> : null}
            </span>
          </div>
        </div>

        <p className="tl-log" role="status" aria-live="polite">
          {note ?? 'Every advance you meet is ground taken. Take your time with each one.'}
        </p>

        {session.phase === 'starting' || !session.serve ? (
          <div className="tl-forming">
            <div className="tl-forming-bar" aria-hidden="true">
              <span />
              <span />
              <span />
            </div>
            <p>The lanes are forming…</p>
          </div>
        ) : (
          <ItemFrame
            serve={session.serve}
            frameRef={session.frameRef}
            onLoad={session.onFrameLoad}
            palette={PALETTE}
            className="tl-frame"
            title="Arena challenge"
          />
        )}

        <div className="tl-holdline">
          <span className="tl-kicker">Holding the line</span>
          {posted === 0 ? (
            <p className="tl-holdline-empty">
              No defenders posted yet. Hold this push and you will have elixir to deploy your first.
            </p>
          ) : (
            <ul className="tl-holdline-list">
              {LANES.map((lane) => {
                const inLane = POSTS.map((_, i) => placements.get(slotId(lane.id, i))).filter(
                  (d): d is Defender => Boolean(d),
                );
                return (
                  <li key={lane.id} className="tl-holdline-lane">
                    <span className="tl-holdline-name">{lane.name}</span>
                    {inLane.length === 0 ? (
                      <span className="tl-holdline-none">open</span>
                    ) : (
                      inLane.map((d, i) => (
                        <span key={`${lane.id}-${i}`} className={`tl-chip tl-r-${d.rarity}`}>
                          <Glyph kind={d.id} />
                          {d.name}
                        </span>
                      ))
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    );
  }

  /* -------------------------------------------------------------- deploy */

  return (
    <div className="tl">
      <div className="tl-layout">
        <section className="tl-arena" aria-label="Your arena">
          <div className="tl-arena-inner">
            <div className="tl-row tl-row-enemy" aria-hidden="true">
              {LANES.map((lane) => (
                <Tower key={lane.id} variant="enemy" />
              ))}
            </div>

            <div className="tl-river" aria-hidden="true">
              <div className="tl-water" />
              <div className="tl-row tl-bridges">
                {LANES.map((lane) => (
                  <span key={lane.id} className="tl-bridge" />
                ))}
              </div>
            </div>

            <div className="tl-row tl-lanes">
              {LANES.map((lane) => {
                const count = POSTS.reduce(
                  (n, _, i) => n + (placements.has(slotId(lane.id, i)) ? 1 : 0),
                  0,
                );
                return (
                  <div key={lane.id} className="tl-lane">
                    <div className="tl-lane-plate">
                      <span className="tl-lane-name">{lane.name}</span>
                      <span className="tl-lane-read">{LANE_READ[count] ?? LANE_READ[0]}</span>
                      <span className="tl-lane-pips" aria-hidden="true">
                        {POSTS.map((_, i) => (
                          <i key={i} className={i < count ? 'on' : ''} />
                        ))}
                      </span>
                    </div>

                    {POSTS.map((post, i) => {
                      const id = slotId(lane.id, i);
                      const occupant = placements.get(id);
                      const label = occupant
                        ? `${lane.name} lane, ${post} post, held by ${occupant.name}`
                        : `${lane.name} lane, ${post} post, empty${selectedCard ? `. Deploy ${selectedCard.name} here for ${selectedCard.cost} elixir` : ''}`;
                      return (
                        <button
                          key={id}
                          type="button"
                          className={[
                            'tl-slot',
                            occupant ? `filled tl-r-${occupant.rarity}` : 'empty',
                            selectedCard && !occupant ? 'targetable' : '',
                            justPlaced === id ? 'landed' : '',
                          ]
                            .filter(Boolean)
                            .join(' ')}
                          onClick={() => placeAt(id, lane.name, post)}
                          aria-label={label}
                        >
                          {occupant ? (
                            <>
                              <Glyph kind={occupant.id} />
                              <span className="tl-slot-name">{occupant.name}</span>
                              <span className="tl-shock" aria-hidden="true" />
                            </>
                          ) : (
                            <>
                              <span className="tl-slot-plus" aria-hidden="true">
                                +
                              </span>
                              <span className="tl-slot-post" aria-hidden="true">
                                {post}
                              </span>
                            </>
                          )}
                        </button>
                      );
                    })}
                  </div>
                );
              })}
            </div>

            <div className="tl-row tl-row-home" aria-hidden="true">
              <Tower variant="home" />
              <Tower variant="king" />
              <Tower variant="home" />
            </div>
          </div>
        </section>

        <aside className="tl-rail">
          <div className="tl-hud">
            <div className="tl-elixir">
              <Droplet />
              <strong className="tl-num">{elixir}</strong>
              <span className="tl-kicker">elixir</span>
            </div>
            <div
              className="tl-elixir-bar"
              style={{ ['--tl-fill' as string]: String(fill) } as CSSProperties}
              aria-hidden="true"
            >
              <span />
            </div>
            <p className="tl-elixir-hint">
              {toNext > 0
                ? `${toNext} more elixir and you can deploy a Knight.`
                : `Enough for ${affordable} of your ${DECK.length} defenders.`}
            </p>

            <dl className="tl-stats">
              <div>
                <dt>Pushes held</dt>
                <dd>{progress.rounds}</dd>
              </div>
              <div>
                <dt>Days in a row</dt>
                <dd>{progress.streak}</dd>
              </div>
              <div>
                <dt>Line</dt>
                <dd>
                  {posted}
                  <span className="tl-of">/{SLOT_IDS.size}</span>
                </dd>
              </div>
            </dl>
          </div>

          <button type="button" className="tl-go" onClick={beginPush}>
            <span className="tl-go-label">{progress.rounds === 0 ? 'Start the first push' : 'Start the next push'}</span>
            <span className="tl-go-sub">
              {progress.rounds === 0 ? 'Hold it and collect your elixir' : 'Worth 26 to 42 elixir'}
            </span>
          </button>

          {session.phase === 'error' ? (
            // The child gets a calm line and the button back. The raw text stays on screen underneath
            // because whoever is watching the demo needs to see what actually broke.
            <div className="tl-fault" role="status">
              <p>The arena went quiet just then. Nothing is lost — start the push again when you are ready.</p>
              <code>{session.error}</code>
            </div>
          ) : null}

          <p className="tl-log" role="status" aria-live="polite">
            {note ??
              (progress.rounds === 0
                ? 'Your lanes are clear. Hold a push, collect elixir, then choose where your first defender stands.'
                : 'Pick a defender, then tap the post you want it on.')}
          </p>

          <div className="tl-deck">
            <div className="tl-deck-head">
              <span className="tl-kicker">Your deck</span>
              <span className="tl-deck-hint">Tap a card, then tap a post</span>
            </div>
            <div className="tl-cards">
              {DECK.map((card) => {
                const can = progress.currency >= card.cost;
                return (
                  <button
                    key={card.id}
                    type="button"
                    className={`tl-card tl-r-${card.rarity} ${selected === card.id ? 'picked' : ''} ${can ? '' : 'short'}`}
                    aria-pressed={selected === card.id}
                    onClick={() => {
                      setSelected((prev) => (prev === card.id ? null : card.id));
                      setNote(
                        can
                          ? `${card.name} ready. ${card.note} Tap an empty post to deploy.`
                          : `${card.name} costs ${card.cost} elixir. You have ${progress.currency}. Hold another push to close the gap.`,
                      );
                    }}
                  >
                    <span className="tl-card-art">
                      <Glyph kind={card.id} />
                    </span>
                    <span className="tl-card-name">{card.name}</span>
                    <span className="tl-cost">
                      <Droplet />
                      {card.cost}
                    </span>
                    {can ? null : <span className="tl-card-short">need {card.cost - progress.currency}</span>}
                  </button>
                );
              })}
            </div>
          </div>
        </aside>
      </div>

      {reward ? (
        <div className="tl-reward-wrap">
          <div className="tl-reward" role="status">
            <span className="tl-kicker">Push complete</span>
            <h2 className="tl-stroke">Lane held</h2>
            <p className="tl-reward-sub">
              You met {reward.advances} advances without giving ground.
            </p>
            <div className="tl-reward-pay">
              <Droplet />
              <strong className="tl-num">+{reward.elixir}</strong>
              <span>elixir</span>
            </div>
            <div className="tl-reward-chips">
              {reward.streakAdvanced ? (
                <span className="tl-badge">Day {reward.streak} in a row</span>
              ) : (
                <span className="tl-badge quiet">Back again today</span>
              )}
              {reward.rarityEarned ? <span className="tl-badge gold">Legendary crest earned</span> : null}
            </div>
            <div className="tl-reward-actions">
              <button
                type="button"
                className="tl-go compact"
                ref={(el) => el?.focus()}
                onClick={backToBoard}
              >
                <span className="tl-go-label">Deploy your elixir</span>
              </button>
              <button type="button" className="tl-again" onClick={beginPush}>
                Push again
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
