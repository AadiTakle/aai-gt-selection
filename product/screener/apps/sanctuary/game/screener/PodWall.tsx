import { useMemo, useState } from 'react';
import * as THREE from 'three';

/**
 * `FLU-MATRIX-01` as a thing in the hollow: a wall of slime pods with one empty socket.
 *
 * This is the file that turns the screener from a quiz overlay into a game. Before it, a beat rendered
 * numbered buttons and a child had nothing to reason about; the item's own content was never drawn.
 *
 * WHAT THE ITEM ACTUALLY IS. `matrix.cells` is a rows-by-cols array of `{shape,color,count,rot}` with
 * exactly one `null`, which is the empty socket. `options` are `{key, tile}` with a tile of the same
 * shape. The rule lives in how the cells vary, so the ONLY job here is to draw every cell and every
 * candidate faithfully and let the child see the pattern. Anything that flattens an attribute the item
 * varies on makes the question unanswerable.
 *
 * MEASURED VOCABULARY. This type uses six shapes and no more: star, pentagon, kite, hexagon, triangle,
 * drop. Counts run 1 to 3, rotations are 0, 120 and 240 degrees, and colours are the bank's six names.
 * That is small enough to give each one a distinct solid rather than a stand-in, which matters because
 * two shapes that read alike destroy a shape rule.
 *
 * IT CANNOT KNOW THE ANSWER. `onPick` hands back the option's `key` and nothing here compares anything.
 * The chosen pod is never shown as right or wrong; it simply settles into the socket.
 */

/** Lifted off the bank's own values: these are lit by one soft lamp and must stay readable
 *  against pale pods, so the darkest name is a slate rather than a near-black. */
const INK: Record<string, string> = {
  teal: '#37b3aa',
  ink: '#5d7183',
  violet: '#a074d6',
  blue: '#4f8ee0',
  gold: '#efb445',
  coral: '#f0796a',
};

function inkOf(name: string): string {
  return INK[name] ?? INK.teal!;
}

interface Tile {
  shape: string;
  color: string;
  count: number;
  rot: number;
}

function asTile(v: unknown): Tile | null {
  if (!v || typeof v !== 'object') return null;
  const o = v as Record<string, unknown>;
  return {
    shape: typeof o.shape === 'string' ? o.shape : 'dot',
    color: typeof o.color === 'string' ? o.color : 'teal',
    count: typeof o.count === 'number' ? o.count : 1,
    rot: typeof o.rot === 'number' ? o.rot : 0,
  };
}

/**
 * One solid per shape name. Distinct silhouettes on purpose: a child reads shape before colour, and a
 * near-duplicate would hide the very attribute the item is testing.
 */
function ShapeSolid({ shape, color }: { shape: string; color: string }) {
  const mat = (
    <meshPhysicalMaterial
      color={color}
      roughness={0.24}
      clearcoat={1}
      clearcoatRoughness={0.18}
      transmission={0.22}
      thickness={0.9}
      ior={1.35}
      sheen={0.5}
      sheenColor="#ffffff"
    />
  );
  switch (shape) {
    case 'star':
      // Two crossed tetrahedra read as spiky at a glance, which is what "star" has to communicate.
      return (
        <group>
          <mesh>
            <octahedronGeometry args={[0.5, 0]} />
            {mat}
          </mesh>
          <mesh rotation={[0, Math.PI / 4, Math.PI / 4]}>
            <octahedronGeometry args={[0.42, 0]} />
            {mat}
          </mesh>
        </group>
      );
    case 'pentagon':
      return (
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.5, 0.5, 0.28, 5]} />
          {mat}
        </mesh>
      );
    case 'hexagon':
      return (
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.5, 0.5, 0.28, 6]} />
          {mat}
        </mesh>
      );
    case 'triangle':
      return (
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.52, 0.52, 0.28, 3]} />
          {mat}
        </mesh>
      );
    case 'kite':
      // Pointed and tall: unmistakable against the flat prisms.
      return (
        <mesh>
          <coneGeometry args={[0.44, 1.0, 4]} />
          {mat}
        </mesh>
      );
    case 'drop':
      return (
        <group>
          <mesh position={[0, -0.12, 0]}>
            <sphereGeometry args={[0.42, 24, 18]} />
            {mat}
          </mesh>
          <mesh position={[0, 0.34, 0]}>
            <coneGeometry args={[0.3, 0.55, 20]} />
            {mat}
          </mesh>
        </group>
      );
    default:
      return (
        <mesh>
          <sphereGeometry args={[0.46, 24, 18]} />
          {mat}
        </mesh>
      );
  }
}

/** A tile: `count` copies of one shape, rotated by the item's own `rot` in degrees. */
function TileMesh({ tile, scale = 1 }: { tile: Tile; scale?: number }) {
  const color = inkOf(tile.color);
  const n = Math.max(1, Math.min(3, Math.round(tile.count)));
  const spread = 0.34;
  const offsets: [number, number, number][] =
    n === 1
      ? [[0, 0, 0]]
      : n === 2
        ? [
            [-spread, 0, 0],
            [spread, 0, 0],
          ]
        : [
            [-spread, spread * 0.7, 0],
            [spread, spread * 0.7, 0],
            [0, -spread * 0.8, 0],
          ];
  const s = scale * (n === 1 ? 1 : n === 2 ? 0.72 : 0.6);

  return (
    <group rotation={[0, 0, THREE.MathUtils.degToRad(tile.rot)]}>
      {offsets.map((o, i) => (
        <group key={i} position={o} scale={s}>
          <ShapeSolid shape={tile.shape} color={color} />
        </group>
      ))}
    </group>
  );
}

/** A pod: a rounded socket that either holds a tile or waits for one. */
function Pod({
  tile,
  empty,
  filled,
  position,
}: {
  tile: Tile | null;
  empty: boolean;
  filled: Tile | null;
  position: [number, number, number];
}) {
  const shown = tile ?? filled;
  return (
    <group position={position}>
      <mesh>
        <torusGeometry args={[0.82, 0.1, 12, 32]} />
        <meshStandardMaterial color={empty && !filled ? '#f2c96b' : '#c8a882'} roughness={0.6} />
      </mesh>
      <mesh position={[0, 0, -0.14]}>
        <circleGeometry args={[0.8, 32]} />
        <meshStandardMaterial
          color={empty && !filled ? '#fff6df' : '#fffaf0'}
          roughness={0.9}
          transparent
          opacity={empty && !filled ? 0.65 : 0.95}
        />
      </mesh>
      {shown ? (
        <group position={[0, 0, 0.2]} scale={0.86}>
          <TileMesh tile={shown} />
        </group>
      ) : null}
    </group>
  );
}

export function PodWall({
  content,
  onPick,
  disabled = false,
}: {
  content: Record<string, unknown>;
  onPick: (key: string) => void;
  disabled?: boolean;
}) {
  const [picked, setPicked] = useState<string | null>(null);
  const [hover, setHover] = useState<string | null>(null);

  const { cells, rows, cols } = useMemo(() => {
    const m = (content.matrix ?? {}) as Record<string, unknown>;
    const raw = Array.isArray(m.cells) ? (m.cells as unknown[][]) : [];
    return {
      cells: raw.map((r) => (Array.isArray(r) ? r.map(asTile) : [])),
      rows: typeof m.rows === 'number' ? m.rows : raw.length,
      cols: typeof m.cols === 'number' ? m.cols : (raw[0]?.length ?? 0),
    };
  }, [content]);

  const options = useMemo(() => {
    const raw = Array.isArray(content.options) ? (content.options as Record<string, unknown>[]) : [];
    return raw.map((o, i) => ({
      key: typeof o.key === 'string' ? o.key : String(i),
      tile: asTile(o.tile),
    }));
  }, [content]);

  const pickedTile = options.find((o) => o.key === picked)?.tile ?? null;
  const gap = 1.9;
  const originX = -((cols - 1) * gap) / 2;
  const originY = ((rows - 1) * gap) / 2;

  return (
    <group>
      {/* The frame the pods sit in. Rounded, warm, no hard edges. */}
      <mesh position={[0, originY - ((rows - 1) * gap) / 2, -0.45]}>
        <boxGeometry args={[cols * gap + 0.9, rows * gap + 0.9, 0.5]} />
        <meshStandardMaterial color="#b98c62" roughness={0.75} />
      </mesh>

      {cells.map((row, r) =>
        row.map((tile, c) => (
          <Pod
            key={`${r}-${c}`}
            tile={tile}
            empty={tile === null}
            filled={tile === null ? pickedTile : null}
            position={[originX + c * gap, originY - r * gap, 0]}
          />
        )),
      )}

      {/* The shelf of candidates. Generous colliders: a small child aiming a mouse is imprecise. */}
      {/* The shelf sits at a child's chest height in front of the frame, not on the floor: the wall
          group is lifted, so a shelf derived from the grid's own bottom row lands in the grass and the
          candidates half-bury themselves. Fixed offsets, deliberately. */}
      <group position={[0, -2.4, 3.4]}>
        <mesh position={[0, -0.75, -0.3]}>
          <boxGeometry args={[options.length * 2.25 + 1.0, 0.34, 1.7]} />
          <meshStandardMaterial color="#a9784f" roughness={0.8} />
        </mesh>
        {options.map((o, i) => {
          const x = (i - (options.length - 1) / 2) * 2.25;
          const taken = picked === o.key;
          const lift = hover === o.key && !disabled && !picked ? 0.16 : 0;
          return (
            <group key={o.key} position={[x, lift, 0]}>
              {/* Invisible, oversized hit volume. */}
              <mesh
                visible={false}
                onPointerOver={() => setHover(o.key)}
                onPointerOut={() => setHover((h) => (h === o.key ? null : h))}
                onClick={(e) => {
                  e.stopPropagation();
                  if (disabled || picked) return;
                  setPicked(o.key);
                  onPick(o.key);
                }}
              >
                <boxGeometry args={[2.1, 2.1, 1.6]} />
              </mesh>
              {!taken && o.tile ? (
                <group scale={1.05}>
                  <TileMesh tile={o.tile} />
                </group>
              ) : null}
              {/* A quiet plinth so an empty slot still reads as a slot. */}
              <mesh position={[0, -0.55, 0]}>
                <cylinderGeometry args={[0.5, 0.55, 0.12, 24]} />
                <meshStandardMaterial
                  color={hover === o.key && !picked ? '#ffd76b' : '#d9bb92'}
                  roughness={0.7}
                />
              </mesh>
            </group>
          );
        })}
      </group>
    </group>
  );
}
