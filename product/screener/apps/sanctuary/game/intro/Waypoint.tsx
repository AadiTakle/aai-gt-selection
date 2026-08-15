import { useFrame } from '@react-three/fiber';
import { useMemo, useRef, type JSX } from 'react';
import {
  ConeGeometry,
  CylinderGeometry,
  type Group,
  type Mesh,
  type MeshBasicMaterial,
  type MeshStandardMaterial,
  SphereGeometry,
  TorusGeometry,
} from 'three';

import { HONEY } from '../stations/carpentry';
import { breath } from '../screener/theme';

/**
 * WHERE TO GO, drawn on the ground.
 *
 * ══ A MARKER IN THE WORLD BEATS A SENTENCE ════════════════════════════════════════════════════════
 *
 * This is the only channel in the tour that answers "where". The voice can say "the stall is down the
 * track" and the adult can read it, but a five-year-old who has been playing for ninety seconds does not
 * yet know what a stall is or which way is down. A light on the grass needs no vocabulary at all.
 *
 * IT IS THE STATIONS' OWN VOCABULARY, deliberately. Two rings breathing on a worn patch is exactly what
 * `stations/Beacon.tsx`'s `StandMark` puts at every station's standing spot, and an emissive teardrop
 * hovering over the spot is its `Wisp`. Neither component is reused directly, and the reason is a frame
 * rather than a preference: both are authored in a station's LOCAL frame and read `site.dock` and
 * `site.bay.halfH` to place themselves, so pointing one at an arbitrary patch of meadow would mean
 * inventing a fake station whose numbers happen to land where the light is wanted. What is shared is the
 * language — the same honey, the same breath, the same two rings — not the code.
 *
 * A COLUMN RATHER THAN ONLY A DISC, because half the places this points at are behind something. From
 * the arrival the stall is twenty-two metres away with a stand of trees between; rings on the ground at
 * that range are two pixels and occluded. A soft shaft of light is visible over a fence and through a
 * gap, which is the whole job.
 *
 * `prefers-reduced-motion` resolves every part of this to its resting state rather than to nothing: the
 * rings sit at their mid radius, the teardrop hovers still, the column stops shimmering. A child who
 * asked for less movement is still shown where to go.
 */
export function Waypoint({ at, reduced }: { at: readonly [number, number]; reduced: boolean }): JSX.Element {
  const rings = useRef<Mesh[]>([]);
  const column = useRef<Mesh>(null);
  const drop = useRef<Group>(null);
  const globe = useRef<MeshBasicMaterial>(null);
  const patch = useRef<Mesh>(null);
  /**
   * Fades up over about half a second on mount.
   *
   * It is deliberately asymmetric: it fades IN, and it disappears the instant the step is satisfied,
   * because a marker that lingers after the child has done the thing is ambiguous about whether they
   * did it. Vanishing on the frame it is earned is the feedback.
   */
  const shown = useRef(0);

  const g = useMemo(
    () => ({
      ring: new TorusGeometry(1, 0.055, 6, 40),
      patch: new CylinderGeometry(0.95, 1.02, 0.03, 32),
      // Open-ended, so the shaft is a curtain of light rather than a lit drum with a cap on it.
      column: new CylinderGeometry(0.86, 1.12, 5.2, 22, 1, true),
      globe: new SphereGeometry(0.26, 16, 12),
      tail: new ConeGeometry(0.2, 0.54, 14),
    }),
    [],
  );

  useFrame(({ clock }, dt) => {
    const t = clock.elapsedTime;
    const b = breath(t, 2.4, reduced);
    shown.current += (1 - shown.current) * (1 - Math.exp(-6 * Math.min(dt, 0.05)));
    const k = shown.current;

    if (patch.current) {
      const mat = patch.current.material as MeshStandardMaterial;
      mat.opacity = 0.55 * k;
    }

    rings.current.forEach((mesh, i) => {
      if (!mesh) return;
      const s = i === 0 ? 0.95 - b * 0.06 : 0.6 + b * 0.08;
      mesh.scale.set(s, s, 1);
      const mat = mesh.material as MeshStandardMaterial;
      mat.emissiveIntensity = (i === 0 ? 0.9 + (1 - b) * 0.8 : 1.1 + b * 1.0) * k;
      mat.opacity = 0.85 * k;
    });

    if (column.current) {
      const mat = column.current.material as MeshBasicMaterial;
      mat.opacity = (0.1 + b * 0.06) * k;
      column.current.scale.setScalar(1 + b * 0.03);
    }

    if (drop.current) {
      drop.current.position.y = 2.5 + (reduced ? 0 : Math.sin(t * 1.25) * 0.16);
      drop.current.scale.setScalar(Math.max(0.001, k));
    }
    if (globe.current) globe.current.opacity = (0.6 + b * 0.22) * k;
  });

  return (
    <group position={[at[0], 0, at[1]]}>
      {/* Trodden ground under the rings, so the mark reads as a place rather than as a decal. */}
      <mesh ref={patch} geometry={g.patch} position={[0, 0.035, 0]} receiveShadow>
        <meshStandardMaterial color="#c9ad7e" roughness={0.95} metalness={0} transparent opacity={0} />
      </mesh>
      {[0, 1].map((i) => (
        <mesh
          key={i}
          ref={(el) => {
            if (el) rings.current[i] = el;
          }}
          geometry={g.ring}
          position={[0, 0.06, 0]}
          rotation={[-Math.PI / 2, 0, 0]}
        >
          <meshStandardMaterial
            color={HONEY}
            emissive={HONEY}
            emissiveIntensity={1}
            roughness={0.5}
            metalness={0}
            transparent
            toneMapped={false}
          />
        </mesh>
      ))}

      {/* The shaft. Depth-writing off so it never punches a hole in the fence behind it. */}
      <mesh ref={column} geometry={g.column} position={[0, 2.6, 0]}>
        <meshBasicMaterial
          color={HONEY}
          transparent
          opacity={0.12}
          depthWrite={false}
          side={2}
          toneMapped={false}
          fog={false}
        />
      </mesh>

      {/* And the teardrop at the top of it, pointing back down at the spot. */}
      <group ref={drop} position={[0, 2.5, 0]}>
        <mesh geometry={g.globe}>
          <meshBasicMaterial ref={globe} color="#ffe3a8" transparent opacity={0.7} toneMapped={false} fog={false} />
        </mesh>
        <mesh geometry={g.tail} position={[0, -0.36, 0]} rotation={[Math.PI, 0, 0]}>
          <meshBasicMaterial color="#ffd489" transparent opacity={0.5} toneMapped={false} fog={false} />
        </mesh>
      </group>
    </group>
  );
}
