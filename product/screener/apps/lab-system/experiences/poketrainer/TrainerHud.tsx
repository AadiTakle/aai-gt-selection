import type { Division } from './roster';
import { Ball, BallDot } from './sprites';

/**
 * The bar across the top: which division's ball you are throwing, how far along the route you are, and
 * how many are on the belt.
 *
 * The bar measures the walk, not the catching. It fills whether or not anything was caught, because
 * turning up is the part this surface is allowed to reward.
 */

interface TrainerHudProps {
  readonly division: Division;
  readonly caughtCount: number;
  readonly encounterNo: number;
  readonly expected: { readonly min: number; readonly max: number } | null;
}

export function TrainerHud({ division, caughtCount, encounterNo, expected }: TrainerHudProps) {
  const target = expected ? expected.max : 12;
  const walked = target === 0 ? 0 : Math.min(1, (encounterNo - 1) / target);

  return (
    <div className="pkb-hud">
      <div className="pkb-hud-div">
        <Ball kind={division.ball} px={28} />
        <span>
          <strong>{division.name}</strong>
          <em>Route 1 · {division.ballName}s</em>
        </span>
      </div>

      <div className="pkb-hud-walk">
        <span className="pkb-hud-walk-label">Encounter {encounterNo}</span>
        <span className="pkb-hud-walk-track">
          <span className="pkb-hud-walk-fill" style={{ width: `${Math.round(walked * 100)}%` }} />
        </span>
      </div>

      <div className="pkb-hud-caught">
        <BallDot filled={caughtCount > 0} px={19} />
        <strong>{caughtCount}</strong>
        <em>caught</em>
      </div>
    </div>
  );
}
