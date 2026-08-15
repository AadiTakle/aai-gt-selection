import { useEffect, useMemo, useState } from 'react';

import { ItemFrame } from '../shared/ItemFrame';
import { loadProgress, recordRound, type Progress } from '../shared/progression';
import type { ExperienceMeta, Palette } from '../shared/types';
import { useScreenerSession } from '../shared/useScreenerSession';

import './StickerAlbum.css';

/**
 * Sticker Album, for K-1. A Pokémon-style album page with holes in it, and each finished round fills
 * one.
 *
 * WHY THIS SHAPE FOR FIVE-YEAR-OLDS. Nothing on screen requires reading: the album is pictures, the
 * one control is a single large button, and the state of play is conveyed by how many holes are left.
 * The reward lands immediately, on this round, because a five-year-old will not chase a prize three
 * visits away. The session runs at the shortest step on the precision ladder.
 *
 * See the handoff document for what a short session costs in evidence. It is real and it is written up
 * rather than hidden.
 */

export const meta: ExperienceMeta = {
  id: 'sticker-album',
  title: 'Sticker Album',
  world: 'Pokémon',
  band: 'K-1',
  pull: 'A page with gaps, and every round you finish sticks one in',
  accent: '#ffcb05',
};

/** Retints the item frame so a served item reads as part of the album rather than a form. */
const PALETTE: Palette = {
  '--ink': '#2a2a30',
  '--accent': '#e3350d',
  '--good': '#3c9a4e',
  '--card': '#fffdf3',
  '--bg1': '#fff9e0',
  '--bg2': '#ffeeb8',
  '--line': '#e8d9a0',
  '--paper': '#fffdf3',
  '--socket': '#d9c47a',
};

/** Nine slots, because a 3x3 page is legible at a glance and fills in a plausible number of visits. */
const SLOTS = [
  { id: 'bulba', name: 'Bulbasaur', glyph: '🌱', tint: '#78c850' },
  { id: 'charma', name: 'Charmander', glyph: '🔥', tint: '#f08030' },
  { id: 'squirt', name: 'Squirtle', glyph: '💧', tint: '#6890f0' },
  { id: 'pika', name: 'Pikachu', glyph: '⚡', tint: '#f8d030' },
  { id: 'jiggly', name: 'Jigglypuff', glyph: '🎵', tint: '#f4a6c0' },
  { id: 'meow', name: 'Meowth', glyph: '🪙', tint: '#e5c07b' },
  { id: 'psy', name: 'Psyduck', glyph: '💭', tint: '#f7dc6f' },
  { id: 'gengar', name: 'Gengar', glyph: '👻', tint: '#9b7fc4' },
  { id: 'eevee', name: 'Eevee', glyph: '⭐', tint: '#c9a06a' },
];

export default function StickerAlbum() {
  const [progress, setProgress] = useState<Progress>(() => loadProgress(meta.id));
  const [celebrating, setCelebrating] = useState<string | null>(null);

  const session = useScreenerSession({
    ageBand: 'K-1',
    // Shortest step on the ladder. A five-year-old will not sit through more, and stretching the
    // session to improve the estimate would be optimising the wrong thing.
    precisionIndex: 0,
    palette: PALETTE,
    onFinished: (result) => {
      const outcome = recordRound(meta.id, result.itemsServed);
      setProgress(outcome.progress);
      const next = SLOTS[Math.min(SLOTS.length - 1, outcome.progress.rounds - 1)];
      setCelebrating(next?.id ?? null);
    },
  });

  // Filled slots come from rounds completed, never from answers being right.
  const filled = useMemo(() => SLOTS.slice(0, Math.min(SLOTS.length, progress.rounds)), [progress.rounds]);
  const filledIds = useMemo(() => new Set(filled.map((s) => s.id)), [filled]);

  useEffect(() => {
    if (!celebrating) return;
    const t = setTimeout(() => setCelebrating(null), 2600);
    return () => clearTimeout(t);
  }, [celebrating]);

  const playing = session.phase === 'playing' && session.serve;

  return (
    <div className="sticker">
      <div className="sticker-page" aria-label="Your sticker album">
        {SLOTS.map((slot) => {
          const has = filledIds.has(slot.id);
          return (
            <div
              key={slot.id}
              className={`sticker-slot ${has ? 'has' : ''} ${celebrating === slot.id ? 'pop' : ''}`}
              style={has ? { background: slot.tint } : undefined}
            >
              <span className="sticker-glyph" aria-hidden="true">
                {has ? slot.glyph : '?'}
              </span>
              {/* Named for a screen reader, but never relied on visually: this band cannot read. */}
              <span className="sr-only">{has ? slot.name : 'empty slot'}</span>
            </div>
          );
        })}
      </div>

      {!playing && session.phase !== 'starting' ? (
        <div className="sticker-cta">
          {celebrating ? (
            <p className="sticker-shout" role="status">
              <span aria-hidden="true">✨</span> You got a new sticker!
            </p>
          ) : (
            <p className="sticker-shout">
              {progress.rounds === 0 ? (
                <>
                  <span aria-hidden="true">👋</span> Play a round, get a sticker
                </>
              ) : (
                <>
                  <span aria-hidden="true">🎁</span> {SLOTS.length - filled.length} empty spaces left
                </>
              )}
            </p>
          )}
          <button type="button" className="sticker-play" onClick={() => void session.start()}>
            <span aria-hidden="true">▶</span> Play
          </button>
          {session.error ? <p className="lab-error">{session.error}</p> : null}
        </div>
      ) : null}

      {session.phase === 'starting' ? <p className="sticker-shout">Getting your puzzles…</p> : null}

      {playing && session.serve ? (
        <div className="sticker-play-area">
          {/* Dots rather than a number: this band does not read a progress label. */}
          <div className="sticker-dots" aria-hidden="true">
            {Array.from({ length: Math.max(4, session.expectedItems?.min ?? 4) }).map((_, i) => (
              <span key={i} className={i < (session.state?.itemsServed ?? 0) ? 'dot on' : 'dot'} />
            ))}
          </div>
          <ItemFrame
            serve={session.serve}
            frameRef={session.frameRef}
            onLoad={session.onFrameLoad}
            palette={PALETTE}
            className="sticker-frame"
          />
        </div>
      ) : null}
    </div>
  );
}
