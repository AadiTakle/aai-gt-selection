import { useCallback, useMemo, useState } from 'react';

import type { Choice, Facets, Question } from '../shared/headless/adapt';
import { visualChoices } from '../shared/headless/distinct';
import { useQuestionSession } from '../shared/headless/useQuestionSession';
import { loadProgress, recordRound, type Progress } from '../shared/progression';
import type { ExperienceMeta } from '../shared/types';
import './MinecraftBuild.css';

/**
 * Minecraft: pick a build, then earn it a layer at a time.
 *
 * THIS IS THE REFERENCE APP for how the library is meant to be consumed. It uses no renderer from the
 * catalogue. It takes the normalised question from `shared/headless` and draws every choice as a
 * Minecraft block, because the facets the bank already carries map straight onto the game's own
 * vocabulary: `shape` is a block type, `color` is its variant, `count` is a stack size, `rot` is which
 * way it faces. The reasoning is the library's; nothing on screen is.
 *
 * The loop, which is the whole point: a correct answer lays the next layer of the house. A wrong answer
 * does nothing at all. There is no punishment, no loss and no failure state, so the only thing a child
 * can do is get closer, and the incentive to answer one more is a building they chose and can see.
 *
 * Length comes from the engine rather than from the house. The blueprint has as many layers as the
 * session has questions to give at this precision, so finishing the build and finishing the session are
 * the same event.
 */

export const meta: ExperienceMeta = {
  id: 'minecraft-build',
  title: 'Build It',
  world: 'Minecraft',
  band: '4-5',
  pull: 'Pick a build. Every right answer lays the next layer',
  accent: '#5d9c3c',
};

/* ---------------------------------------------------------------- the blocks */

/** Block types a facet's `shape` or `glyph` can become. Order is irrelevant; these are identities. */
const BLOCK_BY_TOKEN: Record<string, { label: string; top: string; side: string; face: string }> = {
  grass: { label: 'Grass', top: '#5d9c3c', side: '#7b5a3a', face: '' },
  oak: { label: 'Oak', top: '#b8925a', side: '#9c7846', face: '' },
  stone: { label: 'Stone', top: '#8f8f8f', side: '#767676', face: '' },
  cobble: { label: 'Cobblestone', top: '#8a8a8a', side: '#6f6f6f', face: '▚' },
  diamond: { label: 'Diamond', top: '#5ce0d8', side: '#3fb8b0', face: '◆' },
  gold: { label: 'Gold', top: '#f2c744', side: '#c9a01f', face: '◆' },
  redstone: { label: 'Redstone', top: '#d24a3a', side: '#a63426', face: '●' },
  lapis: { label: 'Lapis', top: '#3b62c4', side: '#2b4a9c', face: '●' },
  emerald: { label: 'Emerald', top: '#2fbf6a', side: '#1f9450', face: '◆' },
  netherrack: { label: 'Netherrack', top: '#7a3236', side: '#5c2428', face: '▚' },
  sand: { label: 'Sand', top: '#e0d29a', side: '#c4b47e', face: '' },
  ice: { label: 'Ice', top: '#a8d8f0', side: '#88b8d4', face: '' },
};

const BLOCK_ORDER = Object.keys(BLOCK_BY_TOKEN);

/**
 * Which block a choice becomes.
 *
 * Driven by the SLOT rather than by hashing the facet token, because hashing collides: the first real
 * playthrough drew four of seven choices as the same green stack, which made the item unanswerable.
 * A slot is unique within a question, so this cannot collide. See shared/headless/distinct.ts.
 */
function blockForSlot(slot: number): string {
  return BLOCK_ORDER[slot % BLOCK_ORDER.length] ?? 'stone';
}

/** Stem blocks have no slot, so they map by token. Collisions there are harmless: nothing is chosen. */
function blockFor(token: string | undefined): string {
  if (!token) return 'stone';
  if (BLOCK_BY_TOKEN[token]) return token;
  let hash = 0;
  for (let i = 0; i < token.length; i++) hash = (hash * 31 + token.charCodeAt(i)) >>> 0;
  return BLOCK_ORDER[hash % BLOCK_ORDER.length] ?? 'stone';
}

/**
 * One facet bag, drawn as Minecraft.
 *
 * `count` becomes a stack, because a stack size is how Minecraft expresses quantity and it keeps the
 * ordering the item's rule may depend on. `rot` rotates the block. Text and numbers go on a sign, since
 * a sign is the game's own way of showing words.
 */
function BlockThing({
  facets,
  size = 'md',
  slot,
}: {
  facets: Facets;
  size?: 'sm' | 'md' | 'lg';
  /** Supplied for CHOICES, so no two can look alike. Omitted for stem decoration. */
  slot?: number;
}) {
  if (facets.text !== undefined) {
    return (
      <span className={`mc-sign mc-${size}`}>
        <span className="mc-sign-text">{facets.text}</span>
      </span>
    );
  }
  if (facets.value !== undefined && facets.shape === undefined && facets.glyph === undefined) {
    return (
      <span className={`mc-sign mc-${size}`}>
        <span className="mc-sign-num">{facets.value}</span>
      </span>
    );
  }

  const token = facets.shape ?? facets.glyph ?? facets.color;
  const block = slot === undefined ? blockFor(token) : blockForSlot(slot);
  const spec = BLOCK_BY_TOKEN[block] ?? BLOCK_BY_TOKEN.stone!;
  // A colour facet tints the block without replacing its identity, so two options that differ only in
  // colour still look like the same kind of block in two variants.
  const tint = facets.color ? `hue-rotate(${(hashOf(facets.color) % 12) * 30}deg)` : undefined;
  const stack = Math.max(1, Math.min(6, facets.count ?? 1));
  const spin = facets.rot ? `rotate(${facets.rot % 360}deg)` : undefined;
  // `fill` and `tilt` are real distinguishing facets on several types, so they are drawn rather than
  // dropped. Dropping them is what let two different candidates render identically.
  const hollow = facets.fill === 'outline' || facets.fill === 'hollow';
  const leaning = facets.tilt === 'leaning' || facets.tilt === 'tilted';

  return (
    <span
      className={`mc-stackwrap mc-${size}${hollow ? ' hollow' : ''}${leaning ? ' leaning' : ''}`}
      style={{ transform: spin }}
    >
      {Array.from({ length: stack }).map((_, i) => (
        <span
          key={i}
          className="mc-block"
          style={{
            // The slot's colour survives a hollow fill: it moves to the outline instead of vanishing,
            // which is what keeps two hollow choices from looking like the same empty box.
            background: hollow ? 'transparent' : spec.top,
            boxShadow: hollow ? `inset 0 0 0 4px ${spec.top}` : undefined,
            borderBottomColor: hollow ? 'transparent' : spec.side,
            filter: tint,
            marginTop: i === 0 ? 0 : '-38%',
            zIndex: i,
          }}
        >
          {spec.face ? <span className="mc-block-face">{spec.face}</span> : null}
        </span>
      ))}
      {stack > 1 ? <span className="mc-stack-count">{stack}</span> : null}
    </span>
  );
}

function hashOf(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}

/* ------------------------------------------------------------------ the stem */

/** The question's setup, in Minecraft terms. Every branch here is a stem shape from the adapter. */
function Stem({ question }: { question: Question }) {
  const s = question.stem;

  if (s.kind === 'compare') {
    return (
      <div className="mc-compare">
        <div className="mc-chest">
          <span className="mc-chest-lid">Left chest</span>
          <div className="mc-chest-body">
            {Array.from({ length: Math.min(24, s.left.count ?? 0) }).map((_, i) => (
              <span key={i} className="mc-pip" />
            ))}
          </div>
        </div>
        <span className="mc-vs">or</span>
        <div className="mc-chest">
          <span className="mc-chest-lid">Right chest</span>
          <div className="mc-chest-body">
            {Array.from({ length: Math.min(24, s.right.count ?? 0) }).map((_, i) => (
              <span key={i} className="mc-pip" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (s.kind === 'matrix') {
    return (
      <div className="mc-matrix" style={{ gridTemplateColumns: `repeat(${s.cols}, 1fr)` }}>
        {s.cells.map((cell, i) => (
          <div key={i} className={cell === null ? 'mc-cell empty' : 'mc-cell'}>
            {cell === null ? <span className="mc-ghost">?</span> : <BlockThing facets={cell} size="sm" />}
          </div>
        ))}
      </div>
    );
  }

  if (s.kind === 'transform') {
    return (
      <div className="mc-transform">
        <div className="mc-hopperside">
          <span className="mc-label">In</span>
          <BlockThing facets={s.input} />
        </div>
        <div className="mc-chain">
          {s.chain.map((op, i) => (
            <span key={i} className="mc-op">
              {op}
            </span>
          ))}
          <span className="mc-arrow">→</span>
        </div>
        <div className="mc-hopperside">
          <span className="mc-label">Out</span>
          <span className="mc-outghost">?</span>
        </div>
      </div>
    );
  }

  if (s.kind === 'constraints') {
    return (
      <ul className="mc-clues">
        {s.clues.map((clue, i) => (
          <li key={i}>
            <span className="mc-clue-icon">📜</span> {clue}
          </li>
        ))}
      </ul>
    );
  }

  if (s.kind === 'passage') {
    return (
      <div className="mc-book">
        {s.title ? <h4>{s.title}</h4> : null}
        {s.sentences.map((line, i) => (
          <p key={i}>{line}</p>
        ))}
        {s.question ? <p className="mc-book-q">{s.question}</p> : null}
      </div>
    );
  }

  if (s.kind === 'pairs') {
    return (
      <p className="mc-hint">
        One of these pairs was crafted by a different recipe. Tap the odd one out.
      </p>
    );
  }

  if (s.kind === 'target') {
    return (
      <div className="mc-target">
        <span className="mc-label">Match this</span>
        <div className="mc-targetrow">
          {s.target.map((f, i) => (
            <BlockThing key={i} facets={f} size="sm" />
          ))}
        </div>
      </div>
    );
  }

  return null;
}

/* ------------------------------------------------------------------ the app */

interface Build {
  readonly id: string;
  readonly name: string;
  readonly blurb: string;
  /** Bottom layer first. Each entry is one layer of the build. */
  readonly layers: readonly { readonly block: string; readonly width: number; readonly label: string }[];
}

const BUILDS: readonly Build[] = [
  {
    id: 'cottage',
    name: 'Oak Cottage',
    blurb: 'Cosy, quick, and it keeps the mobs out',
    layers: [
      { block: 'cobble', width: 5, label: 'Foundation' },
      { block: 'oak', width: 5, label: 'Walls' },
      { block: 'oak', width: 5, label: 'Upper walls' },
      { block: 'lapis', width: 3, label: 'Windows' },
      { block: 'stone', width: 5, label: 'Roof beam' },
      { block: 'redstone', width: 3, label: 'Lamps' },
      { block: 'gold', width: 1, label: 'Weathervane' },
      { block: 'emerald', width: 1, label: 'Trophy' },
    ],
  },
  {
    id: 'keep',
    name: 'Stone Keep',
    blurb: 'A tower with a view and a very solid door',
    layers: [
      { block: 'stone', width: 5, label: 'Bedrock base' },
      { block: 'cobble', width: 5, label: 'Lower wall' },
      { block: 'cobble', width: 4, label: 'Mid wall' },
      { block: 'stone', width: 4, label: 'Upper wall' },
      { block: 'ice', width: 3, label: 'Arrow slits' },
      { block: 'stone', width: 5, label: 'Battlements' },
      { block: 'redstone', width: 2, label: 'Beacon wiring' },
      { block: 'diamond', width: 1, label: 'Beacon' },
    ],
  },
  {
    id: 'nether',
    name: 'Nether Outpost',
    blurb: 'Built where nothing should be built',
    layers: [
      { block: 'netherrack', width: 5, label: 'Blasted floor' },
      { block: 'netherrack', width: 5, label: 'Shield wall' },
      { block: 'stone', width: 4, label: 'Blast plating' },
      { block: 'gold', width: 3, label: 'Portal frame' },
      { block: 'lapis', width: 3, label: 'Portal' },
      { block: 'redstone', width: 4, label: 'Alarm circuit' },
      { block: 'diamond', width: 2, label: 'Reinforcement' },
      { block: 'emerald', width: 1, label: 'Banner' },
    ],
  },
];

export default function MinecraftBuild() {
  const [build, setBuild] = useState<Build | null>(null);
  const [progress, setProgress] = useState<Progress>(() => loadProgress(meta.id));
  const [layersBuilt, setLayersBuilt] = useState(0);
  const [flash, setFlash] = useState<'placed' | 'nothing' | null>(null);
  const [picked, setPicked] = useState<string | null>(null);

  const session = useQuestionSession({
    ageBand: '4-5',
    // Standard: 8 to 16 questions, which is the length that fits a build of eight layers and stays
    // under twelve minutes for this band.
    precisionIndex: 2,
    onAnswered: ({ correct }) => {
      if (correct === true) {
        setLayersBuilt((n) => n + 1);
        setFlash('placed');
      } else {
        // Nothing happens. Not a penalty, just no progress, which is the softest loop that still makes
        // a right answer worth wanting.
        setFlash('nothing');
      }
      setTimeout(() => setFlash(null), 900);
      setPicked(null);
    },
    onFinished: (result) => {
      setProgress(recordRound(meta.id, result.itemsServed).progress);
    },
  });

  const choose = useCallback(
    async (choice: Choice) => {
      if (session.busy) return;
      setPicked(choice.key);
      await session.answer(choice);
    },
    [session],
  );

  const layers = build?.layers ?? [];
  const done = Math.min(layersBuilt, layers.length);
  const finished = session.phase === 'finished';

  const choiceLabel = useMemo(() => {
    const s = session.question?.stem;
    if (s?.kind === 'compare') return 'Which chest holds more?';
    if (s?.kind === 'matrix') return 'Which block finishes the pattern?';
    if (s?.kind === 'transform') return 'What comes out of the machine?';
    if (s?.kind === 'constraints') return 'Which block matches every note?';
    if (s?.kind === 'passage') return 'Pick the answer from the book';
    if (s?.kind === 'pairs') return 'Tap the odd pair out';
    return 'Pick the block that fits';
  }, [session.question]);

  /* ---- build picker ---- */
  if (!build) {
    return (
      <div className="mc">
        <div className="mc-pickerhead">
          <h2>What are we building?</h2>
          <p>
            Pick a build. Every question you get right lays the next layer. Get one wrong and nothing
            happens, so there is nothing to lose by trying.
          </p>
          {progress.rounds > 0 ? (
            <p className="mc-sofar">
              {progress.rounds} builds finished so far · {progress.items} questions answered
            </p>
          ) : null}
        </div>
        <div className="mc-builds">
          {BUILDS.map((b) => (
            <button key={b.id} type="button" className="mc-buildcard" onClick={() => setBuild(b)}>
              <div className="mc-preview">
                {[...b.layers].reverse().map((layer, i) => (
                  <div key={i} className="mc-previewrow">
                    {Array.from({ length: layer.width }).map((_, j) => {
                      const spec = BLOCK_BY_TOKEN[layer.block] ?? BLOCK_BY_TOKEN.stone!;
                      return (
                        <span
                          key={j}
                          className="mc-previewblock"
                          style={{ background: spec.top, borderBottomColor: spec.side }}
                        />
                      );
                    })}
                  </div>
                ))}
              </div>
              <strong>{b.name}</strong>
              <span>{b.blurb}</span>
              <span className="mc-layercount">{b.layers.length} layers</span>
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="mc">
      <div className="mc-site">
        {/* The build. Ghost layers are the blueprint; solid ones are earned. */}
        <div className={`mc-house ${flash === 'placed' ? 'placed' : ''}`}>
          {[...layers].reverse().map((layer, revIndex) => {
            const index = layers.length - 1 - revIndex;
            const built = index < done;
            const spec = BLOCK_BY_TOKEN[layer.block] ?? BLOCK_BY_TOKEN.stone!;
            return (
              <div key={index} className={built ? 'mc-layer built' : 'mc-layer ghost'}>
                <span className="mc-layerlabel">{layer.label}</span>
                <div className="mc-layerrow">
                  {Array.from({ length: layer.width }).map((_, j) => (
                    <span
                      key={j}
                      className="mc-houseblock"
                      style={
                        built
                          ? { background: spec.top, borderBottomColor: spec.side }
                          : undefined
                      }
                    />
                  ))}
                </div>
              </div>
            );
          })}
          <div className="mc-ground" />
        </div>

        <div className="mc-hud">
          <div className="mc-hudrow">
            <strong>{build.name}</strong>
            <span className="mc-progress">
              {done} of {layers.length} layers
            </span>
          </div>
          <div className="mc-bar">
            <div className="mc-barfill" style={{ width: `${(done / layers.length) * 100}%` }} />
          </div>
          {flash === 'placed' ? <p className="mc-flash good">Block placed</p> : null}
          {flash === 'nothing' ? <p className="mc-flash idle">Nothing placed. Next one.</p> : null}
        </div>
      </div>

      <div className="mc-work">
        {session.phase === 'idle' ? (
          <div className="mc-start">
            <p>Ready to start the build?</p>
            <button type="button" className="mc-go" onClick={() => void session.start()}>
              Start building
            </button>
          </div>
        ) : null}

        {session.phase === 'starting' ? <p className="mc-loading">Loading the site…</p> : null}

        {session.error ? <p className="mc-error">{session.error}</p> : null}

        {session.phase === 'asking' && session.question ? (
          <div className="mc-question">
            <p className="mc-ask">{choiceLabel}</p>
            <Stem question={session.question} />
            <div className="mc-choices">
              {visualChoices(session.question.choices).map((vc, i) => (
                <button
                  key={vc.choice.key}
                  type="button"
                  className={`mc-choice ${picked === vc.choice.key ? 'picked' : ''}`}
                  disabled={session.busy}
                  onClick={() => void choose(vc.choice)}
                  aria-label={`Option ${i + 1}`}
                >
                  {session.question?.choicesAreStemRows ? (
                    <span className="mc-rowlabel">Pair {i + 1}</span>
                  ) : (
                    <BlockThing facets={vc.facets} slot={vc.slot} />
                  )}
                </button>
              ))}
            </div>
          </div>
        ) : null}

        {finished && session.result ? (
          <div className="mc-done">
            <h3>{done >= layers.length ? `${build.name} finished` : `${build.name}, for now`}</h3>
            <p>
              You laid {done} {done === 1 ? 'layer' : 'layers'} from {session.result.asked} questions.
            </p>
            <div className="mc-donerow">
              <button
                type="button"
                className="mc-go"
                onClick={() => {
                  setLayersBuilt(0);
                  session.reset();
                }}
              >
                Build it again
              </button>
              <button type="button" className="mc-ghostbtn" onClick={() => {
                setBuild(null);
                setLayersBuilt(0);
                session.reset();
              }}>
                Pick another build
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
