import { useFrame } from '@react-three/fiber';
import { useMemo, useRef, type JSX } from 'react';
import {
  ConeGeometry,
  CylinderGeometry,
  MeshBasicMaterial,
  MeshStandardMaterial,
  SphereGeometry,
  TorusGeometry,
  type Group,
  type Mesh,
} from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';

import { breath } from '../screener/theme';
import { HONEY, mats, useEase } from './carpentry';
import type { StationSite } from './sites';

/**
 * THE INVITATION. Everything that tells a child, without a word, that a station is a place they can go
 * and that something happens when they get there.
 *
 * THE CONSTRAINT THAT SHAPED ALL OF IT: no reading. A five-year-old is the target and a caption is a
 * caption whether or not it is in 3D, so every cue here has to survive being illiterate. There are three,
 * and they are deliberately three different KINDS of cue, because any one of them alone is a guess:
 *
 *   - A WISP, hovering over the station and drifting down toward it. Visible from anywhere on the ranch
 *     — an emissive teardrop cuts through fog and a low sun where a painted sign does not — and it points
 *     down at the thing it belongs to. This is the "there is something over there" cue.
 *   - A MARK ON THE GROUND at the exact spot the station frames itself from. Rings on the grass are the
 *     oldest "stand here" in games and they need no vocabulary at all. This is the "come to this spot"
 *     cue.
 *   - A PRESS BADGE, which appears only once the keeper is in range and facing: a soft disc with two
 *     rings collapsing inward on it, which is the universal picture of pressing something. Beside it, a
 *     keycap with an E on it — that one IS reading, and it is why it is the third cue on the list rather
 *     than the first. An adult glancing over the child's shoulder can read it; the child does not need to.
 *
 * `prefers-reduced-motion` resolves every one of these to its own resting state rather than to nothing:
 * the wisp hovers still, the ground rings sit at their mid radius, the press badge shows one static ring.
 * A child who asked for less movement still gets the whole invitation.
 */

/* ============================================================================
   the wisp
   ========================================================================== */

/**
 * A hovering will-o'-the-wisp above the station: a soft globe with a downward teardrop under it.
 *
 * Not a floating icon and deliberately not a HUD pin. It is a thing in the hollow that happens to hang
 * where the interesting places are, which is the difference between a game world and a game world with
 * markers stuck on it. When the keeper comes into range it sinks toward the panel and brightens, so the
 * change a child reads is "it noticed me".
 */
export function Wisp({ site, lit, reduced }: { site: StationSite; lit: number; reduced: boolean }): JSX.Element {
  const root = useRef<Group>(null);
  const glow = useRef<MeshBasicMaterial>(null);
  const halo = useRef<Mesh>(null);
  const wash = useEase(lit);
  const { halfH } = site.bay;

  const g = useMemo(
    () => ({
      globe: new SphereGeometry(0.3, 16, 12),
      tail: new ConeGeometry(0.22, 0.6, 14),
      halo: new TorusGeometry(0.54, 0.035, 8, 28),
    }),
    [],
  );

  /**
   * How high it hovers, and it is a framing number rather than a taste one. At `halfH + 1.55` the wisp
   * sits at five metres, which from the standing spot is 30° up — the exact edge of a 62° vertical field,
   * so it was clipped by the top of the screen in every shot taken from where a child actually stands.
   * `halfH + 1.1`, sinking 0.9 as they close, keeps it in frame at both distances. It also hovers 1.5m
   * FORWARD of the panel rather than half a metre: the bay's pent roof oversails by 0.9m, and behind that
   * line the wisp spends the whole approach hidden under its own station's roof.
   */
  const restY = halfH + 1.1;

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    const b = breath(t, 3.1, reduced);
    const lit = wash.current;
    if (root.current) {
      // Sinks toward the panel as the keeper closes, so the wisp is doing the pointing rather than an
      // arrow being drawn over the world.
      root.current.position.y = restY - lit * 0.9 + (reduced ? 0 : Math.sin(t * 1.15) * 0.12);
      root.current.position.x = reduced ? 0 : Math.sin(t * 0.71) * 0.14;
      const s = 1 + lit * 0.32;
      root.current.scale.setScalar(s);
    }
    if (glow.current) glow.current.opacity = 0.62 + b * 0.16 + lit * 0.22;
    if (halo.current) {
      const s = 1 + b * 0.14 + lit * 0.2;
      halo.current.scale.set(s, s, 1);
      (halo.current.material as MeshBasicMaterial).opacity = 0.24 + lit * 0.4;
    }
  });

  return (
    <group ref={root} position={[0, restY, 1.5]}>
      <mesh geometry={g.globe}>
        <meshBasicMaterial ref={glow} color="#ffe3a8" transparent opacity={0.7} toneMapped={false} fog={false} />
      </mesh>
      {/* The teardrop, pointing at the station it belongs to. */}
      <mesh geometry={g.tail} position={[0, -0.4, 0]} rotation={[Math.PI, 0, 0]}>
        <meshBasicMaterial color="#ffd489" transparent opacity={0.5} toneMapped={false} fog={false} />
      </mesh>
      <mesh ref={halo} geometry={g.halo} rotation={[Math.PI / 2.3, 0, 0]}>
        <meshBasicMaterial color={HONEY} transparent opacity={0.3} toneMapped={false} fog={false} />
      </mesh>
    </group>
  );
}

/* ============================================================================
   the mark on the ground
   ========================================================================== */

/**
 * Where to stand, drawn on the grass at the station's own standing spot.
 *
 * Two rings and a worn patch, at the exact point the engaged view is framed from — so a child who walks
 * onto the mark is already standing where the panel looks best, and the camera's move on entering is
 * almost nothing. Rings rather than an arrow because an arrow has a direction to get wrong, and rather
 * than a footprint pair because a footprint says which way to face and the facing is checked separately
 * and forgivingly.
 */
export function StandMark({
  site,
  lit,
  reduced,
}: {
  site: StationSite;
  lit: number;
  reduced: boolean;
}): JSX.Element {
  const m = mats();
  const inner = useRef<Mesh>(null);
  const outer = useRef<Mesh>(null);
  const wash = useEase(lit);
  const groundY = -site.at[1];

  const g = useMemo(
    () => ({
      ring: new TorusGeometry(1, 0.05, 6, 40),
      patch: new CylinderGeometry(0.92, 0.98, 0.03, 32),
    }),
    [],
  );

  useFrame(({ clock }) => {
    const b = breath(clock.elapsedTime, 2.4, reduced);
    const lit = wash.current;
    if (inner.current) {
      const s = 0.62 + b * 0.06;
      inner.current.scale.set(s, s, 1);
      (inner.current.material as MeshStandardMaterial).emissiveIntensity = 0.5 + b * 0.7 + lit * 1.4;
    }
    if (outer.current) {
      const s = 0.95 - b * 0.05;
      outer.current.scale.set(s, s, 1);
      (outer.current.material as MeshStandardMaterial).emissiveIntensity = 0.3 + (1 - b) * 0.5 + lit * 1.1;
    }
  });

  return (
    <group position={[0, groundY + 0.03, site.dock]}>
      {/* Trodden ground under the rings, so the mark reads as a place that gets stood on rather than as
          a decal projected onto the meadow. */}
      <mesh geometry={g.patch} material={m.stone} receiveShadow />
      {[outer, inner].map((ref, i) => (
        <mesh key={i} ref={ref} geometry={g.ring} rotation={[-Math.PI / 2, 0, 0]}>
          <meshStandardMaterial
            color={HONEY}
            emissive={HONEY}
            emissiveIntensity={0.5}
            roughness={0.5}
            metalness={0}
            toneMapped={false}
          />
        </mesh>
      ))}
    </group>
  );
}

/* ============================================================================
   the press badge
   ========================================================================== */

/**
 * "Press this." A soft disc with two rings collapsing onto it, and a keycap beside it.
 *
 * The rings run INWARD rather than outward on purpose. Outward rings are the picture of something
 * emitting — a beacon, a sound, a splash. Inward rings are the picture of something being pushed, which
 * is the only thing this badge has to say.
 *
 * Only mounted while the station is in range and faced, so it can never be part of the scenery.
 */
export function PressBadge({ site, reduced }: { site: StationSite; reduced: boolean }): JSX.Element {
  const rings = useRef<Mesh[]>([]);
  const root = useRef<Group>(null);
  const m = mats();

  const g = useMemo(
    () => ({
      disc: new CylinderGeometry(0.22, 0.22, 0.06, 24),
      ring: new TorusGeometry(0.22, 0.03, 8, 30),
      cap: new RoundedBoxGeometry(0.56, 0.56, 0.16, 3, 0.12),
      barV: new RoundedBoxGeometry(0.07, 0.33, 0.06, 1, 0.025),
      barH: new RoundedBoxGeometry(0.21, 0.065, 0.06, 1, 0.025),
      plate: new RoundedBoxGeometry(2.05, 0.86, 0.12, 3, 0.26),
    }),
    [],
  );

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    if (root.current) {
      // A small settle on appearing plus the gentlest bob, so the badge reads as hanging in the air in
      // front of the station rather than pasted to the screen.
      root.current.position.y = 0.02 + (reduced ? 0 : Math.sin(t * 1.6) * 0.025);
    }
    rings.current.forEach((mesh, i) => {
      if (!mesh) return;
      const mat = mesh.material as MeshBasicMaterial;
      if (reduced) {
        // Resting state: one ring out, one ring in, both steady. The picture still reads.
        const s = i === 0 ? 2.0 : 1.2;
        mesh.scale.set(s, s, 1);
        mat.opacity = 0.5;
        return;
      }
      const phase = ((t / 1.5 + i * 0.5) % 1 + 1) % 1;
      // 2.3 down to 1.0: the ring arrives ON the disc, which is where a finger would land.
      const s = 2.3 - phase * 1.3;
      mesh.scale.set(s, s, 1);
      mat.opacity = 0.1 + (1 - Math.abs(phase - 0.55) * 2) * 0.75;
    });
  });

  return (
    <group ref={root}>
      {/* A pale plaque behind both marks, so they read against a red barn wall as well as against sky. */}
      <mesh geometry={g.plate} material={m.cream} position={[0, 0, -0.07]} />

      {/* The press mark. */}
      <group position={[-0.56, 0, 0.02]}>
        <mesh geometry={g.disc} rotation={[Math.PI / 2, 0, 0]}>
          <meshBasicMaterial color={HONEY} toneMapped={false} fog={false} />
        </mesh>
        {[0, 1].map((i) => (
          <mesh
            key={i}
            ref={(el) => {
              if (el) rings.current[i] = el;
            }}
            geometry={g.ring}
            position={[0, 0, 0.01]}
          >
            <meshBasicMaterial color={HONEY} transparent opacity={0.6} toneMapped={false} fog={false} />
          </mesh>
        ))}
      </group>

      {/* The keycap. An adult reads the letter; the child has already read the rings. */}
      <group position={[0.56, 0, 0.05]}>
        <mesh geometry={g.cap} castShadow>
          <meshStandardMaterial color="#fffaf0" roughness={0.55} metalness={0} />
        </mesh>
        <group position={[0, 0, 0.1]}>
          <mesh geometry={g.barV} position={[-0.08, 0, 0]}>
            <meshBasicMaterial color="#6b4a2c" toneMapped={false} fog={false} />
          </mesh>
          {[0.13, 0, -0.13].map((y) => (
            <mesh key={y} geometry={g.barH} position={[0.02, y, 0]}>
              <meshBasicMaterial color="#6b4a2c" toneMapped={false} fog={false} />
            </mesh>
          ))}
        </group>
      </group>
    </group>
  );
}

/* ============================================================================
   the crosshair
   ========================================================================== */

/**
 * The reticle, and the reason the whole interaction can happen without ever leaving pointer lock.
 *
 * WHAT WAS WRONG BEFORE. Choosing an option meant pressing Escape to get the mouse cursor back, then
 * clicking a 3D tile with it. The owner's note is exact: "you also have to press esc to click those which
 * i don't think a child will understand those game mechanics". Escape is a mode switch with no
 * on-screen existence; it is not discoverable and it is not teachable to a five-year-old.
 *
 * WHAT IT IS INSTEAD. While a station is engaged, every pointer event the canvas receives is raycast from
 * the CENTRE of the screen rather than from the frozen cursor (see `Stations.tsx`, which swaps R3F's
 * `compute` for the duration). So the child aims by looking, exactly as they already aim to walk, and
 * clicks with the mouse they are already holding. This ring is where they are looking. It swells and
 * fills when it is over something choosable, which is the only feedback that makes an invisible
 * raycast honest.
 *
 * Drawn with `depthTest` off and a late `renderOrder` so it is never swallowed by the thing it is aimed
 * at, and parked in front of the camera each frame rather than parented to it — the default camera is not
 * in the scene graph, so its children would never render.
 */
export function Reticle({ hot }: { hot: boolean }): JSX.Element {
  const root = useRef<Group>(null);
  const ring = useRef<Mesh>(null);
  const dot = useRef<Mesh>(null);
  const grown = useRef(0);

  const g = useMemo(
    () => ({
      ring: new TorusGeometry(0.014, 0.0028, 8, 28),
      dot: new SphereGeometry(0.0045, 10, 8),
    }),
    [],
  );

  useFrame(({ camera }, dt) => {
    const root3 = root.current;
    if (root3) {
      root3.position.copy(camera.position);
      root3.quaternion.copy(camera.quaternion);
      root3.translateZ(-0.7);
    }
    grown.current += ((hot ? 1 : 0) - grown.current) * (1 - Math.exp(-14 * dt));
    const k = grown.current;
    if (ring.current) {
      const s = 1 + k * 0.75;
      ring.current.scale.setScalar(s);
      (ring.current.material as MeshBasicMaterial).opacity = 0.55 + k * 0.45;
      (ring.current.material as MeshBasicMaterial).color.set(k > 0.5 ? HONEY : '#fff6e2');
    }
    if (dot.current) dot.current.scale.setScalar(1 + k * 2.6);
  });

  return (
    <group ref={root} renderOrder={998}>
      <mesh ref={ring} geometry={g.ring} renderOrder={998}>
        <meshBasicMaterial
          color="#fff6e2"
          transparent
          opacity={0.6}
          depthTest={false}
          depthWrite={false}
          toneMapped={false}
          fog={false}
        />
      </mesh>
      <mesh ref={dot} geometry={g.dot} renderOrder={999}>
        <meshBasicMaterial
          color={HONEY}
          transparent
          opacity={0.9}
          depthTest={false}
          depthWrite={false}
          toneMapped={false}
          fog={false}
        />
      </mesh>
    </group>
  );
}
