import type { SessionResult } from '../../shared/headless/useQuestionSession';
import type { Progress } from '../../shared/progression';
import { rankFor, type Division, type Species } from './roster';
import { Ball, BallDot, Creature, LeagueCrest, Sparkle, TypeBadge } from './sprites';

/**
 * The verdict: how many you would have caught, and what that makes you.
 *
 * The count comes from the session result, which is the server's tally and not this app's. The ones
 * that got away are named as still being out there rather than as anything lost, because they are: the
 * route restocks, and the next walk is free.
 */

interface VerdictProps {
  readonly caught: readonly Species[];
  readonly result: SessionResult;
  readonly division: Division;
  readonly progress: Progress;
  readonly earned: number;
  readonly onAgain: () => void;
  readonly onDesk: () => void;
}

export function Verdict({ caught, result, division, progress, earned, onAgain, onDesk }: VerdictProps) {
  const total = result.correct;
  const rank = rankFor(total);
  const away = Math.max(0, result.asked - total);

  return (
    <div className="pkb-verdict">
      <div className="pkb-verdict-rays" aria-hidden="true" />

      <div className="pkb-cert" style={{ ['--ribbon' as string]: rank.ribbon }}>
        <div className="pkb-cert-head">
          <LeagueCrest px={54} />
          <div>
            <p className="pkb-kicker">Route 1 · {division.name}</p>
            <h2>Bootcamp complete</h2>
          </div>
          <span className="pkb-cert-stamp" aria-hidden="true">
            <Ball kind={division.ball} px={40} />
          </span>
        </div>

        <div className="pkb-tally">
          <span className="pkb-tally-sparks" aria-hidden="true">
            <Sparkle px={20} />
          </span>
          <strong className="pkb-tally-n">{total}</strong>
          <span className="pkb-tally-cap">
            {total === 1 ? 'Pokémon caught' : 'Pokémon caught'}
            <em>as a trainer on this route</em>
          </span>
        </div>

        <div className="pkb-rank">
          <span className="pkb-rank-ribbon">{rank.title}</span>
          <p>{rank.line}</p>
        </div>

        {caught.length > 0 ? (
          <div className="pkb-dexrow">
            <h3>On your belt</h3>
            <ul>
              {caught.map((species, i) => (
                <li key={`${species.id}-${i}`}>
                  <span className="pkb-dexart">
                    <Creature species={species} px={54} />
                  </span>
                  <span className="pkb-dexmeta">
                    <strong>{species.name}</strong>
                    <TypeBadge type={species.type} small />
                    <em>{species.entry}</em>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <p className="pkb-empty">
            Nothing came home this time, and nothing was lost either. The grass is full again tomorrow.
          </p>
        )}

        {away > 0 ? (
          <p className="pkb-away">
            {away} slipped back into the grass. They are still out there, on the same route, tomorrow.
          </p>
        ) : null}

        <div className="pkb-earn">
          <span>
            <BallDot filled px={16} /> {result.itemsServed} encounters walked
          </span>
          <span>₽{earned.toLocaleString()} earned for the walk</span>
          <span>
            {progress.streak} {progress.streak === 1 ? 'day' : 'days'} running · {progress.rounds}{' '}
            {progress.rounds === 1 ? 'route' : 'routes'} total
          </span>
        </div>

        <div className="pkb-verdict-go">
          <button type="button" className="pkb-primary" onClick={onAgain}>
            <Ball kind={division.ball} px={22} />
            Walk the route again
          </button>
          <button type="button" className="pkb-ghost" onClick={onDesk}>
            Back to the desk
          </button>
        </div>
      </div>
    </div>
  );
}
