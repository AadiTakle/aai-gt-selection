import type { BallKind, Species } from './roster';
import { Ball, Creature, GrassTuft, RouteHorizon, Sparkle, TrainerBack, TypeBadge } from './sprites';

/**
 * The encounter, drawn as the franchise's own battle screen: horizon, two platforms, the trainer from
 * behind at the near edge and whatever is in the grass on the far one.
 *
 * BOTH PLATFORMS ARE ANCHORS, not decoration. A `.pkb-spot` is a zero-sized point in the scene, and the
 * platform, the creature, the ball and the sparks all hang off it, so a creature stands on its platform
 * at any window height instead of drifting above it when the scene grows.
 *
 * The one liberty taken with the layout is that there is no health bar. A bar that empties is a picture
 * of harm and of running out, and nothing on this route runs out. The box keeps the parts that are pure
 * identity — name, number, level, type — and drops the part that keeps score.
 */

export type Beat = 'walking' | 'encounter' | 'throwing' | 'caught' | 'fled';

interface EncounterProps {
  readonly species: Species | null;
  readonly beat: Beat;
  readonly ball: BallKind;
  /** The wild Pokémon's level, taken straight from what the engine judged the item's difficulty to be. */
  readonly level: number;
  readonly reduced: boolean;
}

const TUFTS: readonly { readonly left: number; readonly px: number; readonly delay: number }[] = [
  { left: -1, px: 78 },
  { left: 11, px: 56 },
  { left: 24, px: 70 },
  { left: 37, px: 52 },
  { left: 49, px: 74 },
  { left: 61, px: 58 },
  { left: 73, px: 80 },
  { left: 86, px: 62 },
  { left: 95, px: 72 },
].map((t, i) => ({ ...t, delay: (i % 4) * 0.45 }));

export function Encounter({ species, beat, ball, level, reduced }: EncounterProps) {
  const showCreature = species !== null && beat !== 'walking' && beat !== 'caught';
  const creatureClass =
    beat === 'throwing' ? 'pkb-wild suck' : beat === 'fled' ? 'pkb-wild flee' : 'pkb-wild in';
  const settled = beat === 'throwing' || beat === 'caught' || beat === 'fled';

  return (
    <div className={`pkb-scene beat-${beat}${reduced ? ' still' : ''}`}>
      <div className="pkb-sky" aria-hidden="true" />
      {/* The horizon carries the ground itself: its last band fills everything below its own curve. A
          separate field rectangle behind it only ever produced a hard horizontal seam. */}
      <RouteHorizon />

      {/* far side: whatever is in the grass */}
      <div className="pkb-spot far">
        <span className="pkb-plat" aria-hidden="true" />

        {showCreature && species ? (
          <div className={creatureClass}>
            <Creature species={species} px={164} />
          </div>
        ) : null}

        {settled ? (
          <span className={`pkb-rest ${beat}`} aria-hidden="true">
            <Ball kind={ball} px={38} open={beat === 'fled'} />
          </span>
        ) : null}

        {beat === 'caught' ? (
          <>
            <span className="pkb-flash" aria-hidden="true" />
            <span className="pkb-sparks" aria-hidden="true">
              <Sparkle px={38} className="s1" />
              <Sparkle px={26} className="s2" />
              <Sparkle px={31} className="s3" />
              <Sparkle px={21} className="s4" />
            </span>
          </>
        ) : null}
      </div>

      {/* near side: you */}
      <div className="pkb-spot near">
        <span className="pkb-plat" aria-hidden="true" />
        <div className={beat === 'throwing' ? 'pkb-trainer lunge' : 'pkb-trainer'} aria-hidden="true">
          <TrainerBack px={146} ball={ball} />
        </div>
      </div>

      {species && beat !== 'walking' ? (
        <div className={beat === 'caught' ? 'pkb-namecard gone' : 'pkb-namecard'}>
          <span className="pkb-namecard-row">
            <strong className="pkb-namecard-name">{species.name}</strong>
            <span className="pkb-namecard-lv">Lv{level}</span>
          </span>
          <span className="pkb-namecard-row">
            <TypeBadge type={species.type} small />
            <span className="pkb-namecard-no">No. {String(species.num).padStart(3, '0')}</span>
          </span>
        </div>
      ) : null}

      {beat === 'throwing' ? (
        <span className="pkb-throw" aria-hidden="true">
          <Ball kind={ball} px={38} />
        </span>
      ) : null}

      <div className="pkb-grassband" aria-hidden="true">
        {TUFTS.map((t) => (
          <span
            key={t.left}
            className="pkb-tuft"
            style={{ left: `${t.left}%`, animationDelay: `${t.delay}s` }}
          >
            <GrassTuft px={t.px} />
          </span>
        ))}
      </div>
    </div>
  );
}
