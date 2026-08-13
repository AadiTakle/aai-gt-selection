/**
 * SELLING THE AIR. Two effects, both cheap, both about making a cone of nothing feel like moving air.
 *
 * ── 1. THE LEAN ───────────────────────────────────────────────────────────────────────────────────────────
 *
 * The brief: "slimes outside the cone lean slightly toward the nozzle, which sells the airflow cheaply."
 *
 * It does, and it is also the one thing the vacpack cannot ask for politely. `herd.ts` is a registry of
 * CIRCLES — x, z, r — with no handle on the object that draws the slime, and `slimes/` belongs to another
 * track, so there is no prop to pass and no transform to write.
 *
 * WHAT THIS DOES INSTEAD, and why it is safe rather than a hack. `Slime.tsx` writes exactly three things to
 * its root group every frame: `position` (from its own wander), `rotation.y` (its heading), and a scale on an
 * inner shell. It never touches `rotation.x` or `rotation.z`. Those two channels are unowned, and tipping a
 * body about them is precisely what a lean is. So:
 *
 *   · Every half second the scene is walked once for groups whose local x and z EXACTLY equal a live collider's
 *     x and z. Exact float equality is the right test, not a tolerance: both numbers are written from the same
 *     `s.x` in the same frame, so a match is bit-identical, and two different slimes agreeing on both
 *     coordinates to the last bit does not happen.
 *   · Only `rotation.x` and `rotation.z` are ever written, and they are always eased back to zero when the
 *     airflow stops — so the moment this file is removed, or fails to find anything, every slime is upright
 *     and nothing is left behind.
 *   · If `slimes/` changes shape and the match stops finding anything, the lean silently does nothing. The
 *     mechanic does not depend on it.
 *
 * THE PROPER FIX, one line in a file this track does not own: a `lean?: readonly [number, number]` prop on
 * `Slime` that it applies to its own root, or a `wind` field on `SlimeCollider` that the slime reads. Either
 * would delete this whole section. It is written up in `identity.ts` alongside the other ask.
 *
 * ── 2. THE MOTES ──────────────────────────────────────────────────────────────────────────────────────────
 *
 * Forty specks of light on one `InstancedMesh`, spiralling into the nozzle. They live in CAMERA space, which
 * is both cheaper and more correct: the air being drawn in is defined relative to the nozzle, not to the
 * ranch, so anchoring them to the world would make them shear sideways every time a child turns their head.
 * One draw call, one matrix write per mote per frame, no allocation.
 */
import * as THREE from 'three';

import type { SlimeCollider } from '../slimes/herd';
import { tug, type Aim } from './suction';

/* ------------------------------------------------------------------ *\
   The lean
\* ------------------------------------------------------------------ */

interface Leaned {
  obj: THREE.Object3D;
  /** Current applied lean, in radians, so it can be eased in and out rather than snapped. */
  x: number;
  z: number;
}

export class LeanRig {
  private readonly found = new Map<number, Leaned>();
  private since = 0;
  /** How often the scene is walked, seconds. A slime cannot enter or leave the herd faster than this matters. */
  private static readonly RESCAN = 0.5;
  /** Hard ceiling on the lean, radians. Beyond about this a gumdrop reads as falling over rather than pulled. */
  private static readonly MAX = 0.16;

  /** Cheap key for the position index. Bit-exact by construction — see the note at the top of the file. */
  private static key(x: number, z: number): string {
    return `${x}|${z}`;
  }

  /**
   * Walk the scene and pair colliders with the groups that draw them. Called on a timer from `update`, never
   * from the caller directly.
   */
  private scan(scene: THREE.Object3D, colliders: readonly SlimeCollider[]): void {
    const index = new Map<string, SlimeCollider>();
    for (const c of colliders) index.set(LeanRig.key(c.x, c.z), c);
    if (index.size === 0) return;

    scene.traverse((o) => {
      // Only ever a group: a slime's root is a group, and refusing meshes keeps this from ever writing rotation
      // on a piece of a building.
      if (!(o as THREE.Group).isGroup) return;
      const hit = index.get(LeanRig.key(o.position.x, o.position.z));
      if (!hit) return;
      const had = this.found.get(hit.id);
      if (had && had.obj === o) return;
      this.found.set(hit.id, { obj: o, x: had?.x ?? 0, z: had?.z ?? 0 });
    });
  }

  /**
   * Lean everything in the draught toward the nozzle, and let everything else stand back up.
   *
   * `strength` is 0..1, the overall airflow. `targetId` is the slime actually being drawn in, which leans about
   * three times as hard as a bystander — that difference is what tells a child which one is coming to them.
   */
  update(
    scene: THREE.Object3D,
    colliders: readonly SlimeCollider[],
    aim: Aim,
    strength: number,
    targetId: number | null,
    dt: number,
    motion: number,
  ): void {
    this.since += dt;
    if (this.since >= LeanRig.RESCAN) {
      this.since = 0;
      this.scan(scene, colliders);
    }

    const live = new Set<number>();
    for (const c of colliders) live.add(c.id);

    const ease = Math.min(1, dt * 7);
    for (const [id, l] of this.found) {
      let wantX = 0;
      let wantZ = 0;

      if (live.has(id) && strength > 0.001) {
        const c = colliders.find((k) => k.id === id);
        if (c) {
          const pull = tug(c, aim) * strength * (id === targetId ? 3.1 : 1);
          if (pull > 0.001) {
            // Horizontal direction from the slime toward the nozzle.
            const dx = aim.from.x - c.x;
            const dz = aim.from.z - c.z;
            const d = Math.hypot(dx, dz) || 1;
            const wx = dx / d;
            const wz = dz / d;
            // Into the slime's own frame. `rotation.y` is its heading and local +Z is its face, so the local
            // axes are (cos h, -sin h) for X and (sin h, cos h) for Z, and the lean splits between them.
            const h = l.obj.rotation.y;
            const alongZ = wx * Math.sin(h) + wz * Math.cos(h);
            const alongX = wx * Math.cos(h) - wz * Math.sin(h);
            const amp = Math.min(LeanRig.MAX, LeanRig.MAX * pull) * motion;
            // Tipping the crown toward local +Z is a POSITIVE rotation about X; toward local +X is a NEGATIVE
            // rotation about Z. Getting either sign wrong makes slimes flinch away from the nozzle, which
            // reads as a blower rather than a vacuum and is the funniest bug in this directory's history.
            wantX = alongZ * amp;
            wantZ = -alongX * amp;
            // A shiver on top of the lean for whatever is being drawn in, so it looks like it is losing.
            if (id === targetId) {
              const j = Math.sin(performance.now() * 0.021) * 0.02 * motion * pull;
              wantX += j;
              wantZ += j * 0.7;
            }
          }
        }
      }

      l.x += (wantX - l.x) * ease;
      l.z += (wantZ - l.z) * ease;
      l.obj.rotation.x = l.x;
      l.obj.rotation.z = l.z;

      // Gone from the herd and back upright: stop tracking it. Not before it is upright, or a slime released
      // mid-lean keeps a permanent tilt.
      if (!live.has(id) && Math.abs(l.x) < 1e-4 && Math.abs(l.z) < 1e-4) {
        l.obj.rotation.x = 0;
        l.obj.rotation.z = 0;
        this.found.delete(id);
      }
    }
  }

  /** Put everything back upright at once. Called when the pack is stowed or unmounted. */
  release(): void {
    for (const l of this.found.values()) {
      l.obj.rotation.x = 0;
      l.obj.rotation.z = 0;
    }
    this.found.clear();
  }
}

/* ------------------------------------------------------------------ *\
   The motes
\* ------------------------------------------------------------------ */

export const MOTE_COUNT = 44;

interface Mote {
  x: number;
  y: number;
  z: number;
  /** 0 at the rim of the cone, 1 at the nozzle. */
  a: number;
  /** Seconds to cross. */
  dur: number;
  /** Where it started, so the path can be re-derived rather than integrated. */
  ox: number;
  oy: number;
  oz: number;
  /** Its own twist about the aim axis, so the swarm spirals instead of falling in radially. */
  twist: number;
  size: number;
  live: boolean;
}

/**
 * The swarm. All positions are CAMERA-LOCAL, and the target is the constant nozzle mouth in camera space —
 * which is what makes the motes converge on the bell exactly, with no matrix work and no drift.
 */
export class Motes {
  private readonly all: Mote[] = [];
  private readonly m = new THREE.Matrix4();
  private readonly q = new THREE.Quaternion();
  private readonly s = new THREE.Vector3();
  private readonly p = new THREE.Vector3();

  constructor(private readonly muzzle: THREE.Vector3) {
    for (let i = 0; i < MOTE_COUNT; i += 1) {
      this.all.push({ x: 0, y: 0, z: 0, a: 0, dur: 1, ox: 0, oy: 0, oz: 0, twist: 0, size: 0, live: false });
    }
  }

  /** Put a mote back on the rim of the cone, somewhere ahead, ready to be drawn in. */
  private respawn(k: Mote, halfAngle: number, range: number): void {
    const dist = 1.6 + Math.random() * (range - 1.6);
    // Inside the cone but biased outward, because motes born on the axis travel straight at the camera and
    // read as dust on the lens rather than as air moving past.
    const spread = Math.tan(halfAngle) * dist * (0.35 + Math.random() * 0.65);
    const a = Math.random() * Math.PI * 2;
    k.ox = this.muzzle.x + Math.cos(a) * spread;
    k.oy = this.muzzle.y + Math.sin(a) * spread;
    k.oz = this.muzzle.z - dist;
    k.a = 0;
    k.dur = 0.35 + Math.random() * 0.5;
    k.twist = (Math.random() < 0.5 ? -1 : 1) * (1.2 + Math.random() * 2.4);
    k.size = 0.004 + Math.random() * 0.009;
    k.live = true;
  }

  /**
   * Advance and write the instance matrices. `strength` 0..1 gates both how many motes are alive and how
   * bright they are; at 0 nothing is respawned and the swarm empties itself out within a second.
   */
  update(
    mesh: THREE.InstancedMesh,
    material: THREE.MeshBasicMaterial,
    dt: number,
    strength: number,
    halfAngle: number,
    range: number,
    motion: number,
  ): void {
    material.opacity = strength * 0.85;
    mesh.visible = strength > 0.02;
    if (!mesh.visible) return;

    // Fewer, shorter-lived motes under reduced motion: the airflow still reads, with less crossing the view.
    const budget = Math.round(MOTE_COUNT * (0.35 + 0.65 * strength) * motion);

    for (let i = 0; i < this.all.length; i += 1) {
      const k = this.all[i];
      if (!k) continue;
      if (!k.live) {
        if (i < budget && strength > 0.05) this.respawn(k, halfAngle, range);
        else {
          // Parked far behind the eye, which is off screen and costs nothing.
          this.m.makeScale(0, 0, 0);
          mesh.setMatrixAt(i, this.m);
          continue;
        }
      }

      k.a += dt / (k.dur * Math.max(0.4, motion));
      if (k.a >= 1) {
        k.live = false;
        if (i < budget && strength > 0.05) this.respawn(k, halfAngle, range);
        else {
          this.m.makeScale(0, 0, 0);
          mesh.setMatrixAt(i, this.m);
          continue;
        }
      }

      // Accelerating in, like everything else in this mechanic.
      const e = Math.pow(k.a, 2.1);
      const bx = k.ox + (this.muzzle.x - k.ox) * e;
      const by = k.oy + (this.muzzle.y - k.oy) * e;
      const bz = k.oz + (this.muzzle.z - k.oz) * e;
      // Spiral: swing about the aim axis by an angle that grows as it closes, shrinking with the radius so the
      // path is a tightening helix rather than a wobble.
      const rx = bx - this.muzzle.x;
      const ry = by - this.muzzle.y;
      const th = k.twist * e * 2.2;
      const c = Math.cos(th);
      const sn = Math.sin(th);
      this.p.set(this.muzzle.x + rx * c - ry * sn, this.muzzle.y + rx * sn + ry * c, bz);

      // Stretched along its travel as it speeds up, which is a streak for the price of a scale.
      const stretch = 1 + e * 3.5;
      const size = k.size * (0.5 + 0.5 * (1 - e));
      this.s.set(size, size, size * stretch);
      this.m.compose(this.p, this.q, this.s);
      mesh.setMatrixAt(i, this.m);
    }
    mesh.instanceMatrix.needsUpdate = true;
  }
}
