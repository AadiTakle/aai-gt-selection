import type { BallKind, Species } from './roster';
import { Ball, Creature } from './sprites';

/**
 * The party panel: six slots, filled left to right, with everything past the sixth sent to the Box.
 *
 * It only ever gains. There is no state of this panel that shows something being taken away, because
 * nothing on this route can be.
 */

interface PartyProps {
  readonly caught: readonly Species[];
  readonly ball: BallKind;
}

const SLOTS = 6;

export function Party({ caught, ball }: PartyProps) {
  const inParty = caught.slice(0, SLOTS);
  const boxed = Math.max(0, caught.length - SLOTS);

  return (
    <section className="pkb-party" aria-label={`Party: ${caught.length} caught`}>
      <header className="pkb-party-head">
        <span className="pkb-party-title">Party</span>
        <span className="pkb-party-count">
          {caught.length} caught{boxed > 0 ? ` · ${boxed} in the Box` : ''}
        </span>
      </header>

      <ol className="pkb-party-grid">
        {Array.from({ length: SLOTS }, (_, i) => {
          const species = inParty[i];
          const newest = species !== undefined && i === inParty.length - 1;
          return (
            <li key={i} className={species ? (newest ? 'pkb-pslot on fresh' : 'pkb-pslot on') : 'pkb-pslot'}>
              {species ? (
                <>
                  <Creature species={species} px={40} />
                  <span className="pkb-pname">{species.name}</span>
                </>
              ) : (
                <>
                  <span className="pkb-pempty" aria-hidden="true">
                    <Ball kind={ball} px={26} />
                  </span>
                  <span className="pkb-pname dim">Empty</span>
                </>
              )}
            </li>
          );
        })}
      </ol>
    </section>
  );
}
