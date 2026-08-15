import { useState } from 'react';

import type { Progress } from '../../shared/progression';
import { Dialogue } from './Dialogue';
import { DIVISIONS, ROSTER, type Division, type Species } from './roster';
import { Ball, BallDot, Creature, GrassTuft, LeagueCrest, RouteHorizon } from './sprites';

const STEPS: readonly { readonly title: string; readonly body: string }[] = [
  { title: 'Walk into the tall grass. ', body: 'Something is always rustling in there.' },
  { title: 'Read the field note. ', body: 'Work out which one it is describing.' },
  { title: 'Throw your ball. ', body: 'Get it right and the Pokémon is yours to keep.' },
];

/** Three of the roster, in silhouette, half hidden in the grass of the preview strip. */
const PEEKERS: readonly { readonly species: Species; readonly left: number; readonly px: number }[] = [
  { species: ROSTER[0] ?? ROSTER[1] ?? ROSTER[2], left: 21, px: 74 },
  { species: ROSTER[6] ?? ROSTER[0] ?? ROSTER[1], left: 52, px: 62 },
  { species: ROSTER[4] ?? ROSTER[0] ?? ROSTER[1], left: 78, px: 68 },
].flatMap((p) => (p.species ? [{ species: p.species, left: p.left, px: p.px }] : []));

const PREVIEW_TUFTS: readonly number[] = [4, 16, 28, 40, 52, 64, 76, 88, 97];

/** A look at where the route goes, before committing to it. Decoration, and an invitation. */
function RoutePreview() {
  return (
    <section className="pkb-preview">
      <span className="pkb-preview-sky" aria-hidden="true" />
      <RouteHorizon />
      {PEEKERS.map((p) => (
        <span key={p.species.id} className="pkb-peek" style={{ left: `${p.left}%` }} aria-hidden="true">
          <Creature species={p.species} px={p.px} silhouette />
        </span>
      ))}
      <span className="pkb-preview-grass" aria-hidden="true">
        {PREVIEW_TUFTS.map((left) => (
          <span key={left} style={{ left: `${left}%` }}>
            <GrassTuft px={62} />
          </span>
        ))}
      </span>
      <span className="pkb-preview-tag">Route 1 · Tall grass · Three of these are out there now</span>
    </section>
  );
}

/**
 * The front desk. This is the cold start, and it is the only place a child tells us anything.
 *
 * It asks for one thing, the division, and it asks for it the way the franchise would: four balls on a
 * tray, in the order every player already knows them in. Poké, Great, Ultra, Master is a ladder a five
 * year old reads without being taught it, so the youngest and the oldest trainer can both find their
 * own row without the screen ever looking like a form.
 */

interface RegistrationProps {
  readonly chosen: Division | null;
  readonly onChoose: (division: Division) => void;
  readonly onStart: () => void;
  readonly starting: boolean;
  readonly progress: Progress;
  readonly expected: { readonly min: number; readonly max: number } | null;
  readonly error: string | null;
}

export function Registration({
  chosen,
  onChoose,
  onStart,
  starting,
  progress,
  expected,
  error,
}: RegistrationProps) {
  // Decoration, fixed for the visit so the card does not reshuffle its own ID while being looked at.
  const [idNo] = useState(() => String(Math.floor(Math.random() * 90000) + 10000));

  const clerk: readonly string[] = error
    ? ['The desk radio is crackling.', error]
    : chosen === null
      ? ['Welcome to Trainer Bootcamp!', 'Which division are you registering in?']
      : [`One ${chosen.ballName}, issued. ${chosen.name}.`, chosen.motto];

  return (
    <div className="pkb-desk">
      <div className="pkb-desk-stripes" aria-hidden="true" />

      <header className="pkb-desk-head">
        <LeagueCrest px={62} />
        <div>
          <p className="pkb-kicker">Pokémon League · Field Division</p>
          <h1>Trainer Bootcamp</h1>
          <p className="pkb-lede">
            Do you have what it takes to be a Pokémon Trainer? Walk one route, meet what lives in the
            grass, and find out how many you would catch.
          </p>
        </div>
      </header>

      <div className="pkb-desk-body">
        <section className="pkb-tray" aria-labelledby="pkb-tray-h">
          <h2 id="pkb-tray-h" className="pkb-tray-h">
            Take the ball for your division
          </h2>
          <div className="pkb-tray-grid">
            {DIVISIONS.map((division) => {
              const on = chosen?.band === division.band;
              return (
                <button
                  key={division.band}
                  type="button"
                  className={on ? 'pkb-divcard on' : 'pkb-divcard'}
                  aria-pressed={on}
                  onClick={() => onChoose(division)}
                >
                  <span className="pkb-divball">
                    <Ball kind={division.ball} px={66} />
                  </span>
                  <strong className="pkb-divname">{division.name}</strong>
                  <span className="pkb-divgrades">{division.grades}</span>
                  <span className="pkb-divball-name">{division.ballName}</span>
                </button>
              );
            })}
          </div>
        </section>

        <aside className="pkb-cardwrap">
          <div className={chosen ? 'pkb-tcard filled' : 'pkb-tcard'}>
            <div className="pkb-tcard-top">
              <span className="pkb-tcard-title">Trainer Card</span>
              <span className="pkb-tcard-id">IDNo. {idNo}</span>
            </div>
            <div className="pkb-tcard-mid">
              <span className="pkb-tcard-ball">
                <Ball kind={chosen?.ball ?? 'poke'} px={54} />
              </span>
              <dl className="pkb-tcard-rows">
                <div>
                  <dt>Division</dt>
                  <dd>{chosen?.name ?? '— — —'}</dd>
                </div>
                <div>
                  <dt>Money</dt>
                  <dd>₽{progress.currency.toLocaleString()}</dd>
                </div>
                <div>
                  <dt>Routes walked</dt>
                  <dd>{progress.rounds}</dd>
                </div>
                <div>
                  <dt>Days running</dt>
                  <dd>{progress.streak}</dd>
                </div>
              </dl>
            </div>
            <div className="pkb-tcard-badges" aria-label={`${progress.rounds} routes walked`}>
              {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
                <BallDot key={i} filled={i < progress.rounds} px={17} />
              ))}
            </div>
          </div>
        </aside>
      </div>

      <section className="pkb-how" aria-labelledby="pkb-how-h">
        <h2 id="pkb-how-h">How a route works</h2>
        <ol>
          {STEPS.map((step, i) => (
            <li key={step.title}>
              <span className="pkb-how-n" aria-hidden="true">
                {i + 1}
              </span>
              <span className="pkb-how-text">
                <strong>{step.title}</strong>
                {step.body}
              </span>
            </li>
          ))}
        </ol>
        <p className="pkb-how-note">
          <GrassTuft px={34} />
          Nothing on a route can be failed and nothing can be lost. A Pokémon that gets away just goes
          back into the grass, and the next one is already there.
        </p>
      </section>

      <RoutePreview />

      <div className="pkb-desk-foot">
        <Dialogue lines={clerk} tone="desk" beat={`${chosen?.band ?? 'none'}-${error ?? 'ok'}`} />
        <div className="pkb-desk-go">
          <button
            type="button"
            className="pkb-primary"
            disabled={chosen === null || starting}
            onClick={onStart}
          >
            <Ball kind={chosen?.ball ?? 'poke'} px={22} />
            {starting ? 'Heading out…' : chosen === null ? 'Pick a division first' : 'Head out to Route 1'}
          </button>
          <p className="pkb-fine">
            {expected
              ? `About ${expected.min} to ${expected.max} encounters. Every one you catch is yours to keep.`
              : 'Every Pokémon you catch is yours to keep.'}
          </p>
        </div>
      </div>
    </div>
  );
}
