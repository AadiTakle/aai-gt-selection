import { Canvas } from '@react-three/fiber';
import { StrictMode, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';

import { BalanceBough } from './BalanceBough';
import { DayLog } from './DayLog';
import { EventGlyph } from './EventGlyph';
import { tokenGlyph } from './eventMeaning';
import { PodWall } from './PodWall';
import { SortingGate, sortingGateServes } from './SortingGate';
import { Sprouter } from './Sprouter';
import { StoneBed } from './StoneBed';
import { HUE } from './theme';
import { TideLine } from './TideLine';
import { Weave } from './Weave';

/**
 * A LOOKING-GLASS for the presentations, served by the sanctuary's own vite on 5230.
 *
 * WHY IT EXISTS. These are 3D things drawn for a five-year-old, and the only way to know whether a
 * child could tell what is being asked is to LOOK at them. Reaching them through the game means
 * walking a keeper across a ranch, clicking a call, and hoping the adaptive engine serves the
 * difficulty you wanted — which is no way to iterate on a silhouette.
 *
 * THE CAMERA IS NOT A CONVENIENCE. It is copied from `Game.tsx`'s `viewing` vantage exactly — position
 * (0, 3.0, -4.6), pitch -0.06, fov 62 — and the item group is placed at (0, 3.6, -13) where the pod
 * wall is placed, with the same lights and the same pale sky. So the framing here is the framing the
 * child gets, not a flattering one. `?tight=1` moves in for detail, which is for judging a berry, not
 * for judging the composition.
 *
 * ITEMS COME OFF DISK, whole. `/@fs/` reaches outside vite's root, which the sanctuary config already
 * widens to the screener root. Hand-written fixtures would let a wrong assumption about the payload
 * survive, which is the specific mistake this whole directory exists to correct.
 *
 * Not part of the game. Nothing imports it.
 */

const BANKS = '/@fs/Users/alphaintern/gt-dev-view/screener/data/sanctuary/banks';

/**
 * Every presentation this directory draws, keyed by the `?show=` name, with the bank it reads.
 *
 * ONE TABLE rather than a chain of ternaries, which is what this was when there were two of them and
 * which is how the third one ended up unreachable from the looking-glass for a while. A presentation
 * that cannot be looked at does not get iterated on, and these are drawings for five-year-olds: looking
 * at them is the only test that matters.
 */
const SHOWS: Record<
  string,
  {
    type: string;
    Component: React.ComponentType<{
      content: Record<string, unknown>;
      onPick: (handed: string) => void;
      disabled?: boolean;
    }>;
    /** Present where a type does not draw its whole bank. Applied under `?served=1`. */
    servedOnly?: (content: Record<string, unknown>) => boolean;
  }
> = {
  tide: { type: 'QUANT-SERIES-01', Component: TideLine },
  log: { type: 'VER-SEQUENCE-01', Component: DayLog },
  pods: { type: 'FLU-MATRIX-01', Component: PodWall },
  stones: { type: 'SPA-XFORM-01', Component: StoneBed },
  sprout: { type: 'QUANT-FUNC-01', Component: Sprouter },
  weave: { type: 'FLU-CARPET-01', Component: Weave },
  balance: { type: 'QUANT-BALANCE-01', Component: BalanceBough },
  /**
   * `served=1` narrows the pool to what `SortingGate` will actually be given in play.
   *
   * Every other entry here can be browsed whole, because every other type draws its whole bank. This one
   * refuses 70 of its 100 items — see `sortingGateServes` for the measurement and the five items it
   * catches that would otherwise lead a picture-reading child to a wrong answer. Looking at a rejected
   * item is occasionally useful (it is how you see WHY it was rejected), so the filter is opt-in rather
   * than forced; but a shot taken without it is not a shot of what ships.
   */
  sortbot: { type: 'VER-SORTBOT-01', Component: SortingGate, servedOnly: sortingGateServes },
};

interface Item {
  itemId: string;
  difficulty: number;
  ageBands: string[];
  content: Record<string, unknown>;
}

async function loadBank(typeCode: string): Promise<Item[]> {
  const res = await fetch(`${BANKS}/${typeCode}.jsonl`);
  const text = await res.text();
  return text
    .split('\n')
    .filter((l) => l.trim())
    .map((l) => JSON.parse(l) as Item);
}

/* ============================================================================
   the contact sheet
   ========================================================================== */

/**
 * EVERY BARE TOKEN, LAID OUT IN A GRID — the pass that had never been possible before `SortingGate`.
 *
 * About forty of the drawings in `EventGlyph.tsx` exist solely for `VER-SORTBOT-01`: the whole menagerie,
 * the kitchen drawer, the tool bag, the fruit bowl, the three colour swatches. They are typechecked and
 * they are exhaustively keyed off `GlyphName`, so a wrong one cannot fail to compile and cannot fail to
 * render — it just draws the wrong object, forever, and no test in the repo can tell. And until now
 * NOTHING DREW A BARE TOKEN: the log draws sentences, so these forty had been written, shipped and never
 * once looked at.
 *
 * A grid rather than one at a time, because the question that matters about this set is not "is the pig
 * good" but "can a child tell the pig from the cow from the goat", and that is a question about the set.
 * Collisions and near-collisions are visible here in one glance and invisible anywhere else.
 *
 * `?show=tokens&set=animals`. The words are printed in the corner in reading order so a shot can be mapped
 * back to the table without counting.
 */
const TOKEN_SETS: Record<string, readonly string[]> = {
  /** The subject of this bank. `farm animals`, `mammals`, `birds`, `fish`, `insects`, `sea animals`. */
  animals: [
    'dog', 'cat', 'cow', 'pig', 'hen', 'horse', 'goat', 'bear',
    'lion', 'frog', 'snake', 'owl', 'hawk', 'crow', 'duck', 'bird',
    'fish', 'whale', 'shark', 'squid', 'crab', 'seal', 'bat', 'spider',
    'ant', 'moth', 'butterfly', 'caterpillar', 'bee', 'egg', 'dragon', 'baby',
  ],
  /** Everything else the small bands sort by: kitchen, tools, body, fruit, shapes, colours. */
  things: [
    'chair', 'sofa', 'table', 'bed', 'plate', 'bowl', 'fork', 'spoon',
    'cup', 'glass', 'hammer', 'nail', 'wrench', 'hand', 'foot', 'nose',
    'apple', 'banana', 'pear', 'plum', 'lime', 'carrot', 'pea', 'tomato',
    'bean', 'bread', 'ring', 'tire', 'triangle', 'corner', 'roll', 'ball',
    'red', 'blue', 'green', 'car', 'bike', 'kite', 'book', 'shoe',
  ],
  /** The words the gate leans on hardest: substitutes, and the neutral tokens that are real words. */
  suspect: [
    'bone', 'hail', 'brick', 'door', 'fern', 'wing', 'stone', 'leaf',
    'feather', 'oven', 'lamp', 'doll', 'box', 'hat', 'mirror', 'desk',
    'robot', 'phone', 'barn', 'nest', 'juice', 'rice', 'wax', 'bus',
  ],
};

function TokenSheet({ words, cols }: { words: readonly string[]; cols: number }) {
  const pitch = 1.3;
  const rows = Math.ceil(words.length / cols);
  return (
    <group>
      {words.map((w, i) => {
        const c = i % cols;
        const r = Math.floor(i / cols);
        const mark = tokenGlyph(w);
        return (
          <group
            key={w}
            position={[(c - (cols - 1) / 2) * pitch, ((rows - 1) / 2 - r) * pitch, 0]}
          >
            {/* Same face colour the gate's cards use, so a drawing that vanishes here vanishes there. */}
            <mesh>
              <boxGeometry args={[1.02, 1.02, 0.14]} />
              <meshStandardMaterial color={HUE.stone} roughness={0.88} metalness={0} />
            </mesh>
            {/* An unmatched word gets a red-brown backing, so a neutral fallback cannot be mistaken for a
                drawing that was chosen on purpose. Nothing in these sets should show one. */}
            {mark.matched ? null : (
              <mesh position={[0, 0, -0.1]}>
                <boxGeometry args={[1.2, 1.2, 0.1]} />
                <meshStandardMaterial color="#b4573f" roughness={0.9} metalness={0} />
              </mesh>
            )}
            <group position={[0, 0.02, 0.12]} scale={0.84}>
              <EventGlyph glyph={mark.glyph} state={mark.state} bg={HUE.stone} />
            </group>
          </group>
        );
      })}
    </group>
  );
}

function App() {
  const params = new URLSearchParams(window.location.search);
  const show = params.get('show') ?? 'tide';
  const pick = Number(params.get('i') ?? '0');
  const tight = params.get('tight') === '1';
  const band = params.get('band');
  const entry = SHOWS[show] ?? SHOWS.tide!;

  const [items, setItems] = useState<Item[] | null>(null);

  useEffect(() => {
    setItems(null);
    void loadBank(entry.type).then(setItems);
  }, [entry.type]);

  /** The contact sheet reads no bank and renders no item — see `TokenSheet`. */
  if (show === 'tokens') {
    const setName = params.get('set') ?? 'animals';
    const words = TOKEN_SETS[setName] ?? TOKEN_SETS.animals!;
    const cols = Number(params.get('cols') ?? '8');
    // Big enough to JUDGE. The first sheet went out at 0.42 and every animal was forty pixels across —
    // which is a picture of the grid, not a look at the drawings, and the whole point of the pass is the
    // look. Sized instead to fill the tight frame: 8 columns at 0.85 is 8.8 units against about 9.6 of
    // visible width.
    const scale = Number(params.get('scale') ?? '0.85');
    return (
      <Stage tight={tight} label={`tokens · ${setName} · ${cols} cols · ${words.join(' ')}`} scale={scale}>
        <TokenSheet words={words} cols={cols} />
      </Stage>
    );
  }

  if (!items) return null;

  const banded = band ? items.filter((it) => it.ageBands.includes(band)) : items;
  const served = params.get('served') === '1' && entry.servedOnly;
  const pool = served ? banded.filter((it) => entry.servedOnly!(it.content)) : banded;
  const item = pool[Math.min(pick, pool.length - 1)];
  if (!item) return null;

  const Shown = entry.Component;
  // Reported in the corner so a screenshot can never be mistaken for a different difficulty. The pool
  // size is here too, because `?served=1` silently changes which item a given `?i=` is.
  const label =
    `${entry.type} · ${item.itemId} · b=${item.difficulty} · ${item.ageBands.join('/')}` +
    ` · ${pick + 1}/${pool.length}${served ? ' served' : ''}`;

  return (
    <Stage tight={tight} label={label}>
      <Shown key={item.itemId} content={item.content} onPick={(h) => console.log('picked', h)} />
    </Stage>
  );
}

/**
 * The vantage, the lights and the ground, in one place.
 *
 * EXTRACTED RATHER THAN DUPLICATED when the contact sheet arrived, because a second copy of the camera is a
 * second copy of the ONE THING this whole file is for: the framing here has to be the framing the child
 * gets, or a shot taken through it proves nothing. Two copies drift, and the drift is invisible — both
 * shots look fine, they just no longer agree about what a child can see.
 *
 * `scale` exists only for the contact sheet, which is not an item and has no bay to fit.
 */
function Stage({
  children,
  tight,
  label,
  scale = 1,
}: {
  children: React.ReactNode;
  tight: boolean;
  label: string;
  scale?: number;
}) {
  return (
    <>
      <Canvas
        shadows
        camera={{ fov: 62, near: 0.1, far: 220, position: [0, 3.0, tight ? -8.0 : -4.6] }}
        dpr={[1, 1.75]}
        onCreated={({ camera }) => {
          camera.rotation.order = 'YXZ';
          camera.rotation.set(-0.06, 0, 0);
        }}
      >
        <color attach="background" args={['#bfe4f2']} />
        <fog attach="fog" args={['#cfe9f4', 40, 130]} />
        <hemisphereLight args={['#dff0ff', '#7fa860', 0.75]} />
        <directionalLight position={[18, 26, 12]} intensity={2.1} color="#fff2d8" castShadow shadow-mapSize={[1024, 1024]} />
        {/* The grass the game stands the keeper on, so nothing floats in a void. */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
          <circleGeometry args={[40, 48]} />
          <meshStandardMaterial color="#8fc46b" roughness={0.95} />
        </mesh>

        <group position={[0, 3.6, -13]} scale={scale}>
          <pointLight position={[0, 1.5, 5]} intensity={22} distance={16} color="#fff4de" />
          {children}
        </group>
      </Canvas>
      <p
        style={{
          position: 'fixed',
          left: 10,
          bottom: 6,
          margin: 0,
          font: '12px ui-monospace, monospace',
          color: '#4b3626',
        }}
      >
        {label}
      </p>
    </>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
