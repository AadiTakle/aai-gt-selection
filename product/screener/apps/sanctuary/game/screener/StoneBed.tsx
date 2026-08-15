import { useFrame } from '@react-three/fiber';
import { useMemo, useRef, useState } from 'react';
import * as THREE from 'three';

import { handedFor } from './address';
import { INK } from './marks';
import { Motif } from './shapes';
import { HUE, MAT, breath, jitter, shade, useReducedMotion, useSlab } from './theme';

/**
 * `SPA-XFORM-01` as a thing in the hollow: the stone bed, a shallow pan of wet rock where the tide has
 * left stones in a pattern, the marks it worked by carved in the channel beside it, and an empty pan
 * waiting for how the pattern looks afterwards.
 *
 * WHAT WAS WRONG BEFORE THIS FILE. This type had no in-world presentation, so a beat fell back to a row
 * of numbered buttons — "1 2 3 4 5" — drawing NONE of the item's content. The owner's report about the
 * tide-line was exactly that fallback, and it was still true of seven of the ten types in the pool.
 * `TideLine.tsx` and `PodWall.tsx` beside this file are the models, down to the shelf offsets.
 *
 * WHAT THE ITEM ACTUALLY IS. `grid` is `{rows: 4, cols: 4}` on all 234 items. `input.blocks` are the
 * FILLED cell indices, read row-major, 0..15. `chain` is 1 to 3 badge names drawn from a six-name tray,
 * in the order they were applied. `options` are `{key, blocks}` — five of them, every one holding the
 * SAME NUMBER OF STONES as the input, verified over the whole bank.
 *
 * WHICH FIXES WHAT THE HARD PART IS. The candidates cannot be told apart by how many stones they have,
 * how big the stones are, or what colour they are. They differ in exactly one thing: WHICH CELLS ARE
 * FILLED. So filled-versus-empty has to be unmistakable at a glance or the item is a coin toss, and
 * this file spends its whole budget on that one distinction — a filled cell is a PALE, ROUNDED, RAISED
 * stone standing proud of the pan; an empty cell is a DARK, RECESSED dimple. Brightness and depth, two
 * channels, both large. A drawing that distinguished them by hue alone, or by a small outline, would
 * look tidy in a screenshot and be unreadable on a school laptop at arm's length.
 *
 * THE CHAIN IS DRAWN, NOT SUMMARISED. Each badge gets its own silhouette AND its own colour, because a
 * badge's identity is the whole rule and two badges that read alike would collapse two different
 * transformations into one. The badge-to-transformation mapping is not in `content` — it lives in the
 * answer, which this file never sees — so nothing here can or does derive the outcome.
 *
 * IT CANNOT KNOW THE ANSWER. `onPick` hands back the address from `address.ts` and nothing here compares
 * anything. The chosen pattern simply settles into the empty pan.
 */

/* ============================================================================
   layout
   ========================================================================== */

/** Cell pitch in the two big pans, and in the smaller pans on the shelf. */
const CELL = 0.5;
const OPT_CELL = 0.34;
/** Where the two big pans sit. The gap between them is the badge channel. */
const PAN_X = 2.85;
const PAN_Y = 0.55;
/**
 * Fixed offsets, lifted from `PodWall`/`TideLine`, and the HEIGHT here was wrong on the first pass in a
 * way only a screenshot shows: a four-by-four pan is twice the height of a feeding trough, so the plank
 * those two files hang at -0.62 cut straight through the bottom ROW of every candidate. Half a pattern
 * drawn perfectly and then hidden is worse than not drawing it, because nothing about the picture says a
 * row is missing. The shelf sits higher and the candidates are smaller for it.
 */
const SHELF = { y: -1.9, z: 2.3 } as const;
const OPT_PITCH = 2.1;

/**
 * A badge's colour. Six names, six values, fixed — so the same badge is the same colour in every item a
 * child sees in a sitting, which is the only way a badge can accumulate meaning across items.
 *
 * `leaf` takes the world's fern rather than the bank's sixth ink, which is a slate: nothing in this
 * hollow is grey, and a grey badge beside five saturated ones reads as switched off.
 */
const BADGE_HUE: Record<string, string> = {
  crescent: INK.blue!,
  spiral: INK.violet!,
  trefoil: INK.teal!,
  zigzag: INK.gold!,
  teardrop: INK.coral!,
  leaf: HUE.fern,
};

function blocksOf(v: unknown): number[] {
  if (!v || typeof v !== 'object') return [];
  const raw = (v as Record<string, unknown>).blocks;
  if (!Array.isArray(raw)) return [];
  return raw.filter((n): n is number => typeof n === 'number').map((n) => Math.round(n));
}

/* ============================================================================
   the badges
   ========================================================================== */

/**
 * One badge, inside a 1x1 box facing +Z.
 *
 * Built from primitives rather than from outlines because these are read at half the size of a carpet
 * motif and silhouette is everything: an arc, a coil, a clover, a bent line, a drop and a leaf are six
 * things nobody confuses, whereas six extruded outlines at this size start to look like six blobs.
 * `leaf` reuses the carpet's own leaf so the two vocabularies agree where they overlap.
 */
function BadgeGlyph({ badge, color }: { badge: string; color: string }) {
  const mat = (
    <meshPhysicalMaterial
      color={color}
      roughness={0.3}
      clearcoat={0.8}
      clearcoatRoughness={0.25}
      sheen={0.4}
      sheenColor="#ffffff"
    />
  );

  /** A spiral, sampled as a tube. The one badge that has to be a curve to be itself. */
  const spiral = useMemo(() => {
    const pts: THREE.Vector3[] = [];
    for (let i = 0; i <= 40; i += 1) {
      const t = (i / 40) * Math.PI * 2.7;
      const r = 0.07 + 0.055 * t;
      pts.push(new THREE.Vector3(Math.cos(t) * r, Math.sin(t) * r, 0));
    }
    return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 44, 0.055, 7, false);
  }, []);

  switch (badge) {
    case 'crescent':
      // A thick arc, open to the right. Torus rather than two subtracted discs: the same read for a
      // twentieth of the geometry.
      return (
        <mesh rotation={[0, 0, Math.PI * 0.32]}>
          <torusGeometry args={[0.34, 0.13, 8, 24, Math.PI * 1.35]} />
          {mat}
        </mesh>
      );
    case 'spiral':
      return <mesh geometry={spiral}>{mat}</mesh>;
    case 'trefoil':
      return (
        <group>
          {[0, 1, 2].map((i) => {
            const a = -Math.PI / 2 + (i * Math.PI * 2) / 3;
            return (
              <mesh key={i} position={[Math.cos(a) * 0.24, Math.sin(a) * 0.24, 0]}>
                <sphereGeometry args={[0.2, 14, 11]} />
                {mat}
              </mesh>
            );
          })}
          <mesh>
            <sphereGeometry args={[0.14, 12, 9]} />
            {mat}
          </mesh>
        </group>
      );
    case 'zigzag':
      return (
        <group>
          {[
            [-0.28, -0.18, 0.72],
            [0, 0.14, -0.72],
            [0.28, -0.18, 0.72],
          ].map(([x, y, rot], i) => (
            <mesh key={i} position={[x ?? 0, y ?? 0, 0]} rotation={[0, 0, rot ?? 0]}>
              <boxGeometry args={[0.13, 0.46, 0.13]} />
              {mat}
            </mesh>
          ))}
        </group>
      );
    case 'teardrop':
      return (
        <group>
          <mesh position={[0, -0.12, 0]}>
            <sphereGeometry args={[0.26, 18, 14]} />
            {mat}
          </mesh>
          <mesh position={[0, 0.26, 0]}>
            <coneGeometry args={[0.19, 0.44, 16]} />
            {mat}
          </mesh>
        </group>
      );
    default:
      // `leaf`, and the safe landing for any name the bank grows later: a shape is always drawn, so an
      // unknown badge is a mark the child can still tell apart rather than a hole in the item.
      return (
        <group scale={0.92}>
          <Motif motif="leaf" color={color} fill={1} />
        </group>
      );
  }
}

/** A badge on its own carved stone, seated in the channel between the pans. */
function BadgeStone({ badge, at }: { badge: string; at: [number, number, number] }) {
  const slab = useSlab(0.66, 0.66, 0.2, 0.16);
  return (
    <group position={at}>
      <mesh geometry={slab}>
        <meshStandardMaterial {...MAT.stone} />
      </mesh>
      <group position={[0, 0, 0.2]} scale={0.6}>
        <BadgeGlyph badge={badge} color={BADGE_HUE[badge] ?? INK.teal!} />
      </group>
    </group>
  );
}

/** Which way the channel runs. Drawn twice, so the run reads left to right without a word of text. */
function Arrow({ at }: { at: [number, number, number] }) {
  return (
    <mesh position={at} rotation={[0, 0, -Math.PI / 2]}>
      <coneGeometry args={[0.15, 0.28, 14]} />
      <meshStandardMaterial color={HUE.honey} roughness={0.6} metalness={0} />
    </mesh>
  );
}

/* ============================================================================
   the pans
   ========================================================================== */

/**
 * One cell of a pan: either a stone or the dimple it would sit in.
 *
 * THE TWO STATES ARE DELIBERATELY OVERBUILT. A stone is pale, round and stands a third of a cell proud
 * of the pan; a dimple is the darkest value in the picture and sits behind the pan's face. That is a
 * luminance difference of about three to one plus a depth difference, and it is the only thing telling
 * five candidates apart.
 */
function Cell({ filled, cell, at }: { filled: boolean; cell: number; at: [number, number, number] }) {
  if (!filled) {
    return (
      <group position={at}>
        <mesh position={[0, 0, -0.06]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[cell * 0.36, cell * 0.3, 0.16, 16]} />
          <meshStandardMaterial color={shade(HUE.stoneDeep, -0.44)} roughness={1} metalness={0} />
        </mesh>
      </group>
    );
  }
  return (
    <group position={at}>
      {/* The wet ring the stone sits in, so a stone reads as SET INTO the pan rather than stuck on. */}
      <mesh position={[0, 0, -0.02]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[cell * 0.41, cell * 0.41, 0.1, 18]} />
        <meshStandardMaterial color={shade(HUE.stoneDeep, -0.24)} roughness={1} metalness={0} />
      </mesh>
      <mesh position={[0, 0, cell * 0.22]} scale={[1, 1, 0.72]}>
        <sphereGeometry args={[cell * 0.4, 18, 14]} />
        <meshStandardMaterial color="#fdf1d6" roughness={0.5} metalness={0} />
      </mesh>
    </group>
  );
}

/**
 * A pan: the grid, with a stone in every cell the item names.
 *
 * `socket` turns it into the hollow's one convention — the recessed place ringed in breathing honey
 * light, the only thing in the world that moves on its own. Under `prefers-reduced-motion` the breath
 * resolves to its MIDPOINT rather than to nothing, so the rim still glows and a child whose parent set
 * that flag can still find the missing place.
 */
function Pan({
  blocks,
  rows,
  cols,
  cell,
  socket = false,
  at,
}: {
  blocks: readonly number[];
  rows: number;
  cols: number;
  cell: number;
  socket?: boolean;
  at: [number, number, number];
}) {
  const w = cols * cell + 0.36;
  const h = rows * cell + 0.36;
  const slab = useSlab(w, h, 0.26, 0.14);
  const ring = useSlab(w + 0.2, h + 0.2, 0.22, 0.16);
  const mat = useRef<THREE.MeshStandardMaterial>(null);
  const frame = useRef<THREE.Group>(null);
  const reduced = useReducedMotion();

  useFrame(({ clock }) => {
    if (!socket) return;
    const b = breath(clock.elapsedTime, 2.6, reduced);
    if (mat.current) mat.current.emissiveIntensity = 0.5 + b * 0.9;
    if (frame.current) {
      const s = 1 + b * 0.02;
      frame.current.scale.set(s, s, 1);
    }
  });

  const filled = useMemo(() => new Set(blocks), [blocks]);
  const originX = -((cols - 1) * cell) / 2;
  const originY = ((rows - 1) * cell) / 2;

  return (
    <group position={at}>
      {/* The block the pan is cut from, kept well behind so nothing can stand in front of a stone. */}
      <mesh position={[0, -0.03, -0.34]}>
        <boxGeometry args={[w * 0.9, h * 0.88, 0.4]} />
        <meshStandardMaterial {...MAT.stoneDeep} />
      </mesh>
      {socket ? (
        <group ref={frame}>
          <mesh geometry={ring} position={[0, 0, -0.16]}>
            <meshStandardMaterial
              ref={mat}
              color={HUE.honey}
              emissive={HUE.honey}
              emissiveIntensity={0.8}
              roughness={0.45}
              metalness={0}
            />
          </mesh>
        </group>
      ) : (
        <mesh geometry={ring} position={[0, 0, -0.16]}>
          <meshStandardMaterial {...MAT.stone} />
        </mesh>
      )}
      {/* The wet bed, mid-toned: the pale stones read against it and the dark dimples read into it, and
          it is the only surface in the picture that has to do both. */}
      <mesh geometry={slab}>
        <meshStandardMaterial color={shade(HUE.stoneDeep, -0.02)} roughness={0.7} metalness={0} />
      </mesh>
      {Array.from({ length: rows * cols }, (_, i) => (
        <Cell
          key={i}
          filled={filled.has(i)}
          cell={cell}
          at={[originX + (i % cols) * cell, originY - Math.floor(i / cols) * cell, 0.14]}
        />
      ))}
    </group>
  );
}

/* ============================================================================
   the stone bed
   ========================================================================== */

export function StoneBed({
  content,
  onPick,
  disabled = false,
}: {
  content: Record<string, unknown>;
  onPick: (handed: string) => void;
  disabled?: boolean;
}) {
  const [picked, setPicked] = useState<string | null>(null);
  const [hover, setHover] = useState<string | null>(null);

  const { rows, cols } = useMemo(() => {
    const g = (content.grid ?? {}) as Record<string, unknown>;
    return {
      rows: typeof g.rows === 'number' ? Math.max(1, Math.round(g.rows)) : 4,
      cols: typeof g.cols === 'number' ? Math.max(1, Math.round(g.cols)) : 4,
    };
  }, [content]);

  const input = useMemo(() => blocksOf(content.input), [content]);

  const chain = useMemo(() => {
    const raw = Array.isArray(content.chain) ? (content.chain as unknown[]) : [];
    return raw.filter((s): s is string => typeof s === 'string');
  }, [content]);

  /**
   * Candidates.
   *
   * The address comes from `handedFor` rather than from a local expression, because it is the one line
   * in this file that can be wrong without anything failing. These options are lettered, so it resolves
   * to the letter; `prove-drawn-types.ts` drives that same function against the live API and is the
   * standing check that it still does.
   */
  const options = useMemo(() => {
    const raw = Array.isArray(content.options) ? (content.options as Record<string, unknown>[]) : [];
    return raw.map((o, i) => ({ handed: handedFor(o, i), blocks: blocksOf(o) }));
  }, [content]);

  const pickedBlocks = options.find((o) => o.handed === picked)?.blocks ?? null;

  const panW = cols * CELL + 0.36;
  const panH = rows * CELL + 0.36;
  const optPanH = rows * OPT_CELL + 0.36;
  /** The badges sit in the channel between the pans, and the channel is what is left over. */
  const channel = 2 * PAN_X - panW;
  const badgePitch = Math.min(0.78, (channel - 0.9) / Math.max(1, chain.length));

  return (
    <group>
      {/* The tidal shelf the pans are cut into: one wet slab, mossy along its top, with a lip along the
          front for the loose stones to gather on. It HUGS the pans — the first pass gave it two extra
          units of height below them and the item then read as two small trays on a large blank wall. */}
      <mesh position={[0, PAN_Y, -0.9]}>
        <boxGeometry args={[2 * PAN_X + panW + 1.0, panH + 1.0, 0.6]} />
        <meshStandardMaterial color={shade(HUE.stone, -0.06)} roughness={0.94} metalness={0} />
      </mesh>
      <mesh position={[0, PAN_Y + panH / 2 + 0.4, -0.82]}>
        <boxGeometry args={[2 * PAN_X + panW + 1.0, 0.3, 0.72]} />
        <meshStandardMaterial {...MAT.moss} />
      </mesh>
      {/* The lip. Everything below the pans lives on this, so nothing looks stuck to a wall. */}
      <mesh position={[0, PAN_Y - panH / 2 - 0.44, -0.42]}>
        <boxGeometry args={[2 * PAN_X + panW + 1.0, 0.34, 1.0]} />
        <meshStandardMaterial {...MAT.stone} />
      </mesh>
      <mesh position={[0, PAN_Y - panH / 2 - 0.26, 0.02]}>
        <boxGeometry args={[2 * PAN_X + panW + 1.0, 0.12, 0.12]} />
        <meshStandardMaterial {...MAT.mossDeep} />
      </mesh>
      {/* The tide, caught on its way out, and the stones it has left loose. Quiet: the water is scenery,
          the pattern is the item. Scattered from a stable seed so nothing jitters per frame. */}
      {[-2.4, 0.6, 3.2].map((x, i) => (
        <mesh key={i} position={[x, PAN_Y - panH / 2 - 0.2, 0.32]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.3 + i * 0.1, 0.028, 6, 20, 2.1]} />
          <meshStandardMaterial color={HUE.mist} roughness={0.5} metalness={0} transparent opacity={0.55} />
        </mesh>
      ))}
      {Array.from({ length: 7 }, (_, i) => {
        const x = (jitter('pebble', i) - 0.5) * (2 * PAN_X + panW);
        const y = PAN_Y - panH / 2 - 0.36 + jitter('pebbleY', i) * 0.1;
        return (
          <mesh key={i} position={[x, y, 0.24]} scale={[1, 0.72, 0.72]}>
            <sphereGeometry args={[0.09 + jitter('pebbleR', i) * 0.06, 10, 8]} />
            <meshStandardMaterial color={shade(HUE.stone, -0.12)} roughness={1} metalness={0} />
          </mesh>
        );
      })}

      {/* What the tide left. */}
      <Pan blocks={input} rows={rows} cols={cols} cell={CELL} at={[-PAN_X, PAN_Y, 0]} />

      {/* The marks it worked by, in order, in a carved channel. */}
      <mesh position={[0, PAN_Y, -0.28]}>
        <boxGeometry args={[channel + 0.2, 0.86, 0.22]} />
        <meshStandardMaterial {...MAT.cut} />
      </mesh>
      <Arrow at={[-channel / 2 + 0.24, PAN_Y, 0.1]} />
      <Arrow at={[channel / 2 - 0.24, PAN_Y, 0.1]} />
      {chain.map((badge, i) => (
        <BadgeStone
          key={`${badge}-${i}`}
          badge={badge}
          at={[(i - (chain.length - 1) / 2) * badgePitch, PAN_Y, 0.06]}
        />
      ))}

      {/* And how it looks afterwards — empty until the child says. */}
      <Pan
        blocks={pickedBlocks ?? []}
        rows={rows}
        cols={cols}
        cell={CELL}
        socket
        at={[PAN_X, PAN_Y, 0]}
      />

      {/* The shelf of patterns to choose from. The plank clears the whole pan — see `SHELF`. */}
      <group position={[0, SHELF.y, SHELF.z]}>
        <mesh position={[0, -optPanH / 2 - 0.38, -0.62]}>
          <boxGeometry args={[options.length * OPT_PITCH + 0.8, 0.28, 1.2]} />
          <meshStandardMaterial {...MAT.bark} />
        </mesh>
        {options.map((o, i) => {
          const x = (i - (options.length - 1) / 2) * OPT_PITCH;
          const taken = picked === o.handed;
          const live = !disabled && !picked;
          const lit = hover === o.handed && live;
          return (
            <group key={o.handed} position={[x, lit ? 0.18 : 0, 0]}>
              {/* Invisible, oversized hit volume: over two units on a side, because a small child
                  aiming a crosshair in three dimensions is imprecise and a missed tap reads as a
                  broken game. */}
              <mesh
                visible={false}
                onPointerOver={() => setHover(o.handed)}
                onPointerOut={() => setHover((h) => (h === o.handed ? null : h))}
                onClick={(e) => {
                  e.stopPropagation();
                  if (disabled || picked) return;
                  setPicked(o.handed);
                  onPick(o.handed);
                }}
              >
                <boxGeometry args={[2.05, 2.4, 1.8]} />
              </mesh>
              {!taken ? (
                <group scale={lit ? 1.06 : 1}>
                  <Pan blocks={o.blocks} rows={rows} cols={cols} cell={OPT_CELL} at={[0, 0, 0]} />
                </group>
              ) : null}
              {/* A plinth, so a taken slot still reads as a slot. It is also the hover tell. */}
              <mesh position={[0, -optPanH / 2 - 0.16, 0]}>
                <cylinderGeometry args={[0.4, 0.48, 0.14, 24]} />
                <meshStandardMaterial
                  color={lit ? HUE.honey : HUE.stone}
                  emissive={lit ? HUE.honey : '#000000'}
                  emissiveIntensity={lit ? 0.6 : 0}
                  roughness={0.7}
                  metalness={0}
                />
              </mesh>
            </group>
          );
        })}
      </group>
    </group>
  );
}
