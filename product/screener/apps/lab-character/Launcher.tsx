import { Suspense, useCallback, useEffect, useState } from 'react';

import { EXPERIENCES } from './experiences/registry';

/**
 * The front door: one grid, one card per world.
 *
 * Deliberately quiet. Everything inside a world is loud, saturated and animated, so the launcher
 * earns its keep by being the one calm surface. It is also the only screen an adult reads, which is
 * why the band and the length are stated plainly here and never inside a world.
 *
 * Worlds are lazy, so opening one does not pay for the other three, and a world that fails to
 * compile cannot take the launcher down with it.
 */
export function Launcher() {
  const [openId, setOpenId] = useState<string | null>(null);
  const entry = EXPERIENCES.find((e) => e.meta.id === openId) ?? null;

  const exit = useCallback(() => setOpenId(null), []);

  // Escape leaves a world. A child will not use it; the person demoing this will use it constantly.
  useEffect(() => {
    if (!entry) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') exit();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [entry, exit]);

  if (entry) {
    const { Component, meta } = entry;
    return (
      <Suspense
        fallback={
          <div className="world-loading" style={{ background: meta.accent[0] }}>
            <span>{meta.title}</span>
          </div>
        }
      >
        <Component onExit={exit} />
      </Suspense>
    );
  }

  return (
    <main className="launcher">
      <header className="launcher-head">
        <p className="launcher-kicker">Character led</p>
        <h1 className="launcher-title">Four worlds</h1>
        <p className="launcher-lede">
          Each one is a thing to do rather than a set of questions, and each is built for one age
          band. Pick a band and play it the way a child of that age would.
        </p>
      </header>

      <ul className="grid">
        {EXPERIENCES.map(({ meta }, i) => (
          <li key={meta.id} style={{ ['--i' as string]: String(i) }}>
            <button
              type="button"
              className="card"
              onClick={() => setOpenId(meta.id)}
              style={{
                ['--a' as string]: meta.accent[0],
                ['--b' as string]: meta.accent[1],
              }}
            >
              <span className="card-art" aria-hidden="true">
                <span className="card-orb" />
              </span>
              <span className="card-body">
                <span className="card-band">{meta.band}</span>
                <span className="card-title">{meta.title}</span>
                <span className="card-interest">{meta.interest}</span>
                <span className="card-blurb">{meta.blurb}</span>
                <span className="card-foot">{meta.minutes}</span>
              </span>
            </button>
          </li>
        ))}
      </ul>

      <p className="launcher-note">
        Every world draws its own questions from the item bank rather than embedding a prebuilt
        renderer, which is what lets each one look like itself.
      </p>
    </main>
  );
}
