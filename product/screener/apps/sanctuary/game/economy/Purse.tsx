import { useEffect, useRef, useState, type JSX } from 'react';

import { usePrefersReducedMotion } from '../world/motion';
import { lastEarnedAmount, useCoins } from './coins';
import './economy.css';

/**
 * THE FLAT LAYER: what a coin looks like arriving, and where it lands.
 *
 * Both of these mount OUTSIDE the `<Canvas>`, over the world, and neither takes pointer events — a child
 * is never asked to click the purse, and nothing here may steal a click meant for the ranch.
 *
 * ══ WHY THE FEEDBACK IS A FLYING COIN AND NOT A NUMBER GOING UP ═══════════════════════════════════
 *
 * A five-year-old cannot be relied on to read a numeral, and a numeral that changes from 7 to 8 in the
 * corner of a screen is invisible even to an adult who is looking at something else. What a small child DOES
 * read, instantly and without being taught, is an object moving from the thing that produced it to the
 * place it is kept. So answering something throws a coin, the coin arcs across the screen, and the purse
 * bounces when it lands. That chain — I did a thing → an object came out → it went in my pocket → the
 * pocket got fuller — is the entire economy, and it is legible before language.
 *
 * The purse is deliberately the ONLY thing on screen that pops, so the pop cannot mean anything else.
 */

/* ------------------------------------------------------------------ *\
   Where the coins are flying to
\* ------------------------------------------------------------------ */

/**
 * The purse's live position on screen, published at module scope.
 *
 * `CoinFlight` and `Purse` are separate components mounted separately, and the flight has to END on the
 * indicator or the whole gesture is a coin flying into an empty corner. Rather than hard-coding the same
 * corner in two files — which would silently break the moment either is restyled — the purse measures
 * itself and leaves the answer here. If the purse is not mounted, the flight falls back to the corner the
 * stylesheet puts it in, so the animation is never wrong in a way that looks broken.
 */
let purseAt: { x: number; y: number } | null = null;

function target(): { x: number; y: number } {
  if (purseAt) return purseAt;
  // Matches `.ec-purse`'s own top/left plus roughly half its size, in case a flight happens on the very
  // first frame before the indicator has been measured.
  return { x: 52, y: 40 };
}

/* ------------------------------------------------------------------ *\
   The indicator
\* ------------------------------------------------------------------ */

/**
 * How many coins the child has.
 *
 * A coin picture and a numeral, in that order. The picture is what a child reads and the numeral is what
 * an adult reads over their shoulder — the same division of labour `stations/Beacon.tsx` states for its
 * press badge, where the rings are for the child and the letter E is for the grown-up.
 *
 * The number only ever goes up except when something is deliberately bought. There is no cap, no decay and
 * nothing that expires, so this counter is safe to look at: it cannot ever carry bad news.
 */
export function Purse(): JSX.Element {
  const { coins } = useCoins();
  const root = useRef<HTMLDivElement>(null);
  const previous = useRef(coins);
  const [plink, setPlink] = useState(false);

  /** Publish where the indicator is, so a coin can be thrown at it. */
  useEffect(() => {
    const measure = (): void => {
      const el = root.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      purseAt = { x: r.left + r.width / 2, y: r.top + r.height / 2 };
    };
    measure();
    window.addEventListener('resize', measure);
    return () => {
      window.removeEventListener('resize', measure);
      purseAt = null;
    };
  }, []);

  /** Bounce when it grows. Never when it shrinks: a purchase is not an event that needs celebrating. */
  useEffect(() => {
    const grew = coins > previous.current;
    previous.current = coins;
    if (!grew) return;
    setPlink(true);
    const t = window.setTimeout(() => setPlink(false), 260);
    return () => window.clearTimeout(t);
  }, [coins]);

  return (
    <div ref={root} className={plink ? 'ec-purse is-plink' : 'ec-purse'} aria-live="off">
      <span className="ec-coin" aria-hidden="true" />
      <p className="ec-purse-count">{coins}</p>
    </div>
  );
}

/* ------------------------------------------------------------------ *\
   The flight
\* ------------------------------------------------------------------ */

interface Flying {
  id: number;
  /** Start and end, in viewport pixels. */
  x0: number;
  y0: number;
  x1: number;
  dy: number;
  delay: number;
  duration: number;
}

let nextId = 1;

/**
 * Coins spinning out of the world and into the purse.
 *
 * ══ HOW `trigger` IS MEANT TO BE USED, AND WHY IT IS ENOUGH ════════════════════════════════════════
 *
 * Mount this once and hand it any number that goes UP whenever something has been earned — the count of
 * questions answered, or `earnTicks()` from `purse.ts`, or a plain counter. Every increase throws coins.
 *
 * How MANY coins is not read off `trigger`, because `trigger` cannot carry it: it is read from the purse's
 * own record of what the last `earn` paid. So a one-coin answer throws one coin and the four-coin round
 * bonus throws four, in a little spray, and the payout is legible without a second prop to thread through
 * `Game.tsx`. A decrease or an equal value throws nothing, so spending is never dressed up as an event.
 *
 * The cap is twelve. Beyond that the screen is confetti rather than coins, and the count stops being
 * something a child can see at a glance — which is the only reason to draw them one at a time.
 */
export function CoinFlight({ trigger }: { trigger: number }): JSX.Element {
  const reduced = usePrefersReducedMotion();
  const [flying, setFlying] = useState<Flying[]>([]);
  const previous = useRef(trigger);
  const timers = useRef<number[]>([]);

  useEffect(
    () => () => {
      timers.current.forEach((t) => window.clearTimeout(t));
      timers.current = [];
    },
    [],
  );

  useEffect(() => {
    const was = previous.current;
    previous.current = trigger;
    if (reduced) return;
    if (!(trigger > was)) return;

    const paid = Math.max(1, Math.min(12, lastEarnedAmount() || trigger - was));
    const to = target();
    // Coins come out of the middle of the screen, a little low: that is where the thing being answered is
    // drawn, whether it is in the world on a station panel or on the flat card above it. A coin that
    // appears out of the corner it is flying to would be telling the child nothing.
    const cx = window.innerWidth / 2;
    const cy = window.innerHeight * 0.62;

    const born: Flying[] = Array.from({ length: paid }, (_, i) => {
      // A fan, so several coins never overlap into one blob. Deterministic in `i` rather than random,
      // because a spray that is different every time reads as noise.
      const spread = paid === 1 ? 0 : (i / (paid - 1) - 0.5) * Math.min(360, paid * 54);
      return {
        id: nextId++,
        x0: cx + spread,
        y0: cy + Math.abs(spread) * 0.12,
        x1: to.x,
        dy: to.y - (cy + Math.abs(spread) * 0.12),
        delay: i * 0.07,
        // Slightly different durations, so the coins arrive as a run of small events rather than as one
        // thud. Long enough at 0.72s that the eye can follow a single coin all the way.
        duration: 0.72 + (i % 3) * 0.06,
      };
    });

    setFlying((f) => [...f, ...born]);
    const last = born[born.length - 1];
    const clearAfter = ((last?.delay ?? 0) + (last?.duration ?? 0.8) + 0.1) * 1000;
    const ids = new Set(born.map((b) => b.id));
    timers.current.push(
      window.setTimeout(() => setFlying((f) => f.filter((c) => !ids.has(c.id))), clearAfter),
    );
  }, [trigger, reduced]);

  // Under reduced motion the layer is not rendered at all, rather than rendered empty: the stylesheet
  // hides it too, and agreeing in both places means neither can be the thing that was forgotten.
  if (reduced) return <div className="ec-flight" aria-hidden="true" />;

  return (
    <div className="ec-flight" aria-hidden="true">
      {flying.map((c) => (
        <div
          key={c.id}
          className="ec-fly"
          style={
            {
              '--ec-x0': `${c.x0}px`,
              '--ec-x1': `${c.x1}px`,
              '--ec-y0': `${c.y0}px`,
              '--ec-dy': `${c.dy}px`,
              '--ec-delay': `${c.delay}s`,
              '--ec-dur': `${c.duration}s`,
            } as React.CSSProperties
          }
        >
          <div className="ec-fly-inner">
            <div className="ec-fly-spin">
              <span className="ec-coin" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
