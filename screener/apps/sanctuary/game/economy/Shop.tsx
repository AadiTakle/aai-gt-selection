import { useFrame, useThree, type ComputeFunction } from '@react-three/fiber';
import { useCallback, useEffect, useMemo, useRef, useState, type JSX } from 'react';
import { MeshStandardMaterial, Raycaster, Vector2, Vector3, type Group, type Mesh } from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';

import type { Family } from '../contract';
import { breath } from '../screener/theme';
import { PressBadge, Reticle, StandMark } from '../stations/Beacon';
import type { StationSite } from '../stations/sites';
import { usePrefersReducedMotion } from '../world/motion';
import { HONEY, coinGeometry, coinPile, mats, shopShapes, useEase } from './carpentry';
import { Effigy } from './Effigy';
import { Kiosk } from './Kiosk';
import { STOCK, priceOf, useCoins } from './coins';
import { AT, BAY, DOCK, FACING_DOT, REACH, SHELF, YAW, dockPoint, facing } from './site';

/**
 * THE SHOP. A stall on the ranch you walk up to, press E at, and buy a slime from.
 *
 * ══ ONE VERB FOR THE WHOLE GAME ═══════════════════════════════════════════════════════════════════
 *
 * Every interaction rule in here is copied from `stations/Stations.tsx` rather than re-invented, and that
 * is the single most important decision in this file. A five-year-old is being asked to learn one thing:
 * WALK UP TO A GLOWING THING AND PRESS E. If the shop had its own verb — a click, a menu, a key — the
 * child would have to learn two, and the second one would be the one they never found. So:
 *
 *   - Proximity, with the same 6.8m reach and the same forgiving 56° facing tolerance, and the same rule
 *     that you must be on the FRONT of the thing to be offered it.
 *   - The same three invitation cues, and they are the STATIONS' OWN COMPONENTS rather than lookalikes: a
 *     wisp hovering over it, a mark on the ground where to stand, and the press badge with its inward
 *     rings and its E keycap. See the adapter note on `AS_SITE` below.
 *   - POINTER LOCK IS NEVER RELEASED. While the shop is open, R3F's `compute` is swapped for one that
 *     raycasts from the centre of the screen, so aiming at a slime is the same act as aiming at a walk and
 *     the frozen OS cursor is never consulted. That is `stations/Stations.tsx`'s fix for the owner's note
 *     that "you also have to press esc to click those which i don't think a child will understand", and it
 *     would be perverse to reintroduce the problem in the newest part of the game.
 *   - E or Escape to leave. Space enters, and once inside Space buys whatever the crosshair is on —
 *     dispatched as a real `click` on the canvas so it travels the identical path a mouse click does.
 *
 * ══ NOTHING IS LOCKED, NOTHING IS REFUSED, NOTHING RUNS OUT ═══════════════════════════════════════
 *
 * A slime the child cannot afford yet is shown with a light cloth over its cubby and its price in plain
 * coins in front of the cloth. The cloth LIFTS BY ITSELF the moment the purse reaches the price, which
 * turns saving up into something the child watches happen rather than something they are told about. There
 * is no red, no cross, no padlock, no greyed-out label and no error: the difference between "yours" and
 * "not yet" is a cloth and a pile of coins, both of which a small child already understands.
 *
 * Aiming at a cubby that is still under its cloth does not fail either — the price pile gives one small
 * bob, which points at the thing that is missing. Pressing it is never punished and never says no.
 *
 * The shelves never empty. Buying a waffle slime leaves the waffle cubby exactly as it was, because a shop
 * that runs out is a shop that has taken something away, and this game does not do that.
 */

/* ------------------------------------------------------------------ *\
   Reusing the stations' invitation
\* ------------------------------------------------------------------ */

/**
 * The stall, described as a `StationSite` so it can be handed to the stations' own cue components.
 *
 * AN ADAPTER, DELIBERATELY, AND HERE IS EXACTLY WHAT IS AND IS NOT REAL ABOUT IT. `StandMark` and
 * `PressBadge` in `stations/Beacon.tsx` are the invitation a child has already learned on the three
 * question stations, and reusing them is the only way to guarantee the shop's invitation is identical
 * rather than merely similar. Between them they read exactly two fields — `at[1]` and `dock` — both of
 * which are true of the stall. `verbId`, `typeCode`, `battery`, `build`, `families` and
 * `seed` are structurally required by the type and are never looked at by any of the three; they are
 * filled with honest-but-unused values rather than lies about what this object is.
 *
 * This record is NOT in `stations/sites.ts`'s `SITES` array, so the stations' own proximity loop cannot see
 * it and the shop can never be mistaken for a place to answer a question.
 */
const AS_SITE: StationSite = {
  verbId: 'shop',
  typeCode: 'none',
  battery: 'Nonverbal',
  build: 'tideledge',
  at: AT,
  yaw: YAW,
  dock: DOCK,
  bay: BAY,
  families: STOCK,
  seed: 4409,
};

/** Screen centre, in normalised device coordinates. The crosshair, and the only pointer this file uses. */
const CENTRE = new Vector2(0, 0);

/**
 * How close before the stock grows FACES.
 *
 * THE STOCK ITSELF IS ALWAYS BUILT, and that reversal is the most useful thing a screenshot produced. The
 * first pass gated the whole shelf on being within sixteen metres, on a perfectly reasonable frame-budget
 * argument — and from the arrival point, which is 21.6m away and where every child stands on their first
 * frame, the shop had EMPTY SHELVES. A stall with nothing on it reads as shut. Whatever it costs, a child
 * has to be able to see from across the meadow that this building is full of creatures, because that is the
 * entire reason to walk to it.
 *
 * So the budget comes out of the faces instead. Six of a portrait's nine meshes are its eyes, and at twenty
 * metres they are under a pixel; past eleven metres they are simply not built, which takes a full shelf from
 * about 170 draw calls to about 57 and costs nothing anybody could see. Hysteresis of two metres, so standing
 * exactly on the line does not flicker.
 */
const FACES_IN = 11;
const FACES_OUT = 13;

/* ------------------------------------------------------------------ *\
   One cubby
\* ------------------------------------------------------------------ */

interface CubbyProps {
  family: Family;
  /** Cubby centre in the stall's local frame. */
  at: [number, number];
  halfW: number;
  halfH: number;
  /** True when the purse can pay for this one. Drives the cloth, and nothing else. */
  afford: boolean;
  /** True when the crosshair is on it. */
  aimed: boolean;
  /** Bumped when a child pressed this one while it was still under its cloth. */
  nudge: number;
  /**
   * Whether this cubby may be pressed at all, which is true only while the shop is open.
   *
   * A REAL BUG RATHER THAN A TIDINESS PROP. The shelves are built as soon as a child is within sixteen
   * metres, because stock you cannot see from outside is not an invitation — but the vacuum pack is also
   * live out there, and it fires on a plain `click` on the canvas. With the handler always attached, a child
   * hoovering a slime while standing near the stall would raycast into a cubby and buy something they never
   * asked for. So the hit volume only exists while the counter is actually open, which is also the only time
   * the crosshair is pointing where the child is looking.
   */
  active: boolean;
  /** Whether the slime gets a face. Distance-gated; see `FACES_IN`. */
  eyes: boolean;
  reduced: boolean;
  seed: number;
  onPick: (family: Family) => void;
}

function Cubby({
  family,
  at,
  halfW,
  halfH,
  afford,
  aimed,
  nudge,
  active,
  eyes,
  reduced,
  seed,
  onPick,
}: CubbyProps): JSX.Element {
  const m = mats();
  const coin = coinGeometry();
  const price = priceOf(family);

  const lift = useEase(afford ? 1 : 0, 5);
  const glowAt = useEase(aimed ? 1 : 0, 10);
  const cloth = useRef<Mesh>(null);
  const hem = useRef<Mesh>(null);
  const pile = useRef<Group>(null);

  /**
   * Three materials this cubby owns rather than shares, and the reason is the same in all three cases: each
   * one changes PER CUBBY. `mats()` hands out single shared instances, so animating one of those would lift
   * every cloth in the shop at once and light every recess at once — the exact class of bug `Effigy.tsx`
   * refuses to risk with the slime materials. Nineteen cubbies times three clones is fifty-seven materials
   * with identical shader parameters, which three's program cache serves from one compiled program.
   */
  const gauze = useMemo(() => mats().gauze.clone(), []);
  const recess = useMemo(() => {
    const c = mats().cubby.clone();
    c.emissive.set(HONEY);
    c.emissiveIntensity = 0;
    return c;
  }, []);
  const ledge = useMemo(() => {
    const c = mats().timber.clone();
    c.emissive.set(HONEY);
    c.emissiveIntensity = 0;
    return c;
  }, []);
  useEffect(
    () => () => {
      gauze.dispose();
      recess.dispose();
      ledge.dispose();
    },
    [gauze, recess, ledge],
  );

  /**
   * How the cubby divides up, and the one measurement that decided it.
   *
   * The price has to be countable, which means the coins cannot be smaller than about an eighth of the
   * cubby's width, which means a price of ten needs two rows of five and roughly a third of the cubby's
   * height. So the bottom third is the price shelf and the slime gets the rest. Derived rather than typed,
   * so a six-family shelf with big cubbies and a nineteen-family shelf with small ones both work out.
   */
  const band = Math.min(0.34, halfH * 0.74);
  // Two constraints on the coin, whichever bites first: five across the cubby's width, and two rows up
  // the price shelf.
  const coinR = Math.min((halfW * 1.78) / (5 * 2.24), band / (2 * 2.24 * 0.92));
  const pileAt = useMemo(() => coinPile(price, coinR), [price, coinR]);
  /** The slime's share: everything above the price shelf, less a little air. */
  const bodyH = Math.max(0.2, (halfH * 2 - band) * 0.82);
  const bodyY = -halfH + band + bodyH / 2 - bodyH * 0.42;

  const g = useMemo(
    () => ({
      // The recess. A back board set behind the shelf face, so a cubby reads as a hole with something in
      // it rather than as a picture stuck on a wall.
      back: new RoundedBoxGeometry(halfW * 2, halfH * 2, 0.1, 3, 0.08),
      cloth: new RoundedBoxGeometry(halfW * 2 - 0.03, halfH * 2 - 0.03, 0.035, 2, 0.06),
      /** The cloth's weighted hem. One bar along the bottom edge is what turns a pale panel into fabric. */
      hem: new RoundedBoxGeometry(halfW * 2 - 0.03, 0.055, 0.05, 2, 0.022),
      plinth: new RoundedBoxGeometry(halfW * 1.5, 0.055, 0.34, 2, 0.025),
      /** A dark strip behind the coins, so a brass pile is never read against a lit board. */
      strip: new RoundedBoxGeometry(halfW * 1.94, band * 0.94, 0.05, 2, 0.03),
      // Generous, and deliberately deeper than the cubby: a five-year-old aiming a crosshair by turning
      // their head is imprecise, and `PodWall` makes exactly the same allowance for the same reason.
      hit: new RoundedBoxGeometry(halfW * 2.02, halfH * 2.02, 0.62, 1, 0.02),
    }),
    [halfW, halfH],
  );

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    const up = lift.current;
    const k = glowAt.current;

    // The cloth rises into the top of the cubby and fades as it goes. At rest it covers the slime softly;
    // fully lifted it is gone. Nothing about this reads as a shutter closing, because it only ever runs
    // one way in play — the purse does not go down except when the child spends it.
    if (cloth.current) {
      const y = up * (halfH * 1.9);
      cloth.current.position.y = y;
      cloth.current.visible = up < 0.985;
      gauze.opacity = 0.74 * (1 - up);
      if (hem.current) {
        hem.current.position.y = y - halfH + 0.03;
        hem.current.visible = cloth.current.visible;
        (hem.current.material as MeshStandardMaterial).opacity = 0.9 * (1 - up);
      }
    }

    /**
     * WHAT REPLACED THE HALO RING, and why. The first pass drew a honey torus round each cubby scaled to the
     * cubby's own bounding box. On a shelf of nineteen with only eleven centimetres between them, nineteen
     * rings overlap into a thicket of gold hoops — a screenshot of a full purse looked like a fairground,
     * and worse, the ring said nothing about WHICH cubby it belonged to.
     *
     * A recess that is LIT says the same thing without adding a shape: the back board of an affordable cubby
     * glows warm, so a child reads a row of lit alcoves and a row of dark ones. The shelf lip under the
     * aimed one brightens on top of that, which is the "this one" signal, and it cannot be confused with the
     * "you can have this" signal because they are different surfaces. Both breathe, per
     * `screener/theme.ts`'s convention that the thing which moves on its own is the place something happens.
     */
    const b = breath(t, 2.6, reduced);
    recess.emissiveIntensity = up * (0.16 + b * 0.1 + k * 0.2);
    ledge.emissiveIntensity = up * (0.1 + b * 0.06) + k * 0.85;

    // The nudge: one small bob of the price pile when a child presses something they have not saved up for
    // yet. It points at what is missing. It is not a shake, not a flash and not a sound of refusal.
    if (pile.current) {
      const since = (performance.now() - nudge) / 1000;
      const bob = nudge > 0 && since < 0.6 && !reduced ? Math.sin(since * 14) * (1 - since / 0.6) * 0.035 : 0;
      pile.current.position.y = -halfH + band / 2 + bob;
      pile.current.scale.setScalar(1 + (nudge > 0 && since < 0.6 && !reduced ? (1 - since / 0.6) * 0.12 : 0));
    }
  });

  return (
    <group position={[at[0], at[1], 0]}>
      {/* The recess. Dark timber, and warmly lit when the purse can pay for what is in it. */}
      <mesh geometry={g.back} material={recess} position={[0, 0, -0.16]} receiveShadow />

      {/* The slime. Always here, whatever the purse says: a child has to be able to see what they are
          saving up for, and a hidden reward is not a reward. */}
      <group position={[0, bodyY, 0.06]}>
        <Effigy family={family} height={bodyH} reduced={reduced} seed={seed} lift={aimed ? 1 : 0} eyes={eyes} />
      </group>

      {/* The cloth, with its hem. In front of the slime, behind the price. */}
      <mesh ref={cloth} geometry={g.cloth} material={gauze} position={[0, 0, 0.19]} renderOrder={2} />
      <mesh ref={hem} geometry={g.hem} position={[0, -halfH + 0.03, 0.2]} renderOrder={3}>
        <meshStandardMaterial color="#e6cfa4" roughness={0.9} metalness={0} transparent opacity={0.9} depthWrite={false} />
      </mesh>

      {/* The shelf lip the slime stands on, which is also the "this one" light when it is aimed at. */}
      <mesh geometry={g.plinth} material={ledge} position={[0, -halfH + band, 0.02]} receiveShadow />

      {/* The price, in coins, on a dark strip and in front of everything else — so it is legible whether or
          not the cloth is up. This is the one thing in the cubby that is never dimmed and never hidden. */}
      <mesh geometry={g.strip} material={m.timberDeep} position={[0, -halfH + band / 2, 0.21]} />
      <group ref={pile} position={[0, -halfH + band / 2, 0.26]}>
        {pileAt.at.map((p, i) => (
          <group key={i} position={[p[0], p[1], 0]} rotation={[Math.PI / 2, 0, 0]} scale={coinR}>
            <mesh geometry={coin.disc} material={m.brass} />
            <mesh geometry={coin.rim} material={m.brassDeep} rotation={[Math.PI / 2, 0, 0]} />
          </group>
        ))}
      </group>

      {/* The hit volume. Invisible but solid to a raycast, which is how all three question presentations
          do it, so the crosshair behaves identically here. Only mounted while the counter is open — see
          `active`. */}
      {active ? (
        <mesh
          visible={false}
          geometry={g.hit}
          position={[0, 0, 0.2]}
          onClick={(e) => {
            e.stopPropagation();
            onPick(family);
          }}
        />
      ) : null}
    </group>
  );
}

/* ------------------------------------------------------------------ *\
   What a purchase looks like
\* ------------------------------------------------------------------ */

interface Bought {
  family: Family;
  /** The cubby it came out of, in the stall's local frame. */
  from: [number, number];
  startedAt: number;
  height: number;
}

/** How long the flourish runs, and where the slime is along it. */
const FLOURISH = 1.5;

/**
 * The slime a child just bought, hopping out of its cubby into the brass tray.
 *
 * It exists because a purchase has to have a MOMENT. Without one, pressing a cubby makes a number in the
 * corner go down and a creature appear somewhere else on the ranch, and a five-year-old will not connect
 * those two events. So the thing they chose visibly comes out of the machine and lands in the dish under
 * the slot — which is also the whole reason the stall has a slot and a dish.
 *
 * The real slime is added to the ranch by `onBuy` the instant the coins are taken; this is a copy, purely
 * for the eye, and it cannot fail or be interrupted into an inconsistent state.
 */
function Flourish({ bought, reduced }: { bought: Bought; reduced: boolean }): JSX.Element {
  const root = useRef<Group>(null);
  const ring = useRef<Mesh>(null);
  const shapes = shopShapes();
  const tray: [number, number] = [0, -1.12];

  useFrame(() => {
    const t = Math.min(1, (performance.now() - bought.startedAt) / (FLOURISH * 1000));
    const g = root.current;
    if (g) {
      // Out of the cubby, forward, and down into the dish. The arc peaks early so it reads as a hop rather
      // than as a slide.
      const ease = 1 - Math.pow(1 - Math.min(1, t / 0.62), 2);
      g.position.x = bought.from[0] + (tray[0] - bought.from[0]) * ease;
      g.position.y = bought.from[1] + (tray[1] - bought.from[1]) * ease + Math.sin(ease * Math.PI) * 0.34;
      g.position.z = 0.1 + ease * 0.55;
      // Settles, then shrinks away as it heads off to the ranch. Reduced motion holds it in the dish for
      // the same length of time instead of animating the departure.
      const out = t < 0.78 ? 1 : 1 - (t - 0.78) / 0.22;
      g.scale.setScalar(reduced ? 1 : Math.max(0.001, out));
    }
    if (ring.current) {
      // A honey ring opening on the dish as it lands: the only "yes" in the shop, and it is a shape rather
      // than a word.
      const r = Math.max(0, (t - 0.55) / 0.45);
      ring.current.visible = r > 0 && r < 1;
      const s = 0.12 + r * 0.5;
      ring.current.scale.set(s, s, 1);
      (ring.current.material as MeshStandardMaterial).emissiveIntensity = (1 - r) * 3.2;
    }
  });

  return (
    <group>
      <group ref={root} position={[bought.from[0], bought.from[1], 0.1]}>
        <Effigy family={bought.family} height={bought.height} reduced={reduced} seed={7} />
      </group>
      <mesh ref={ring} geometry={shapes.ring} position={[tray[0], tray[1] + 0.08, 0.72]} rotation={[-Math.PI / 2.1, 0, 0]}>
        <meshStandardMaterial
          color={HONEY}
          emissive={HONEY}
          emissiveIntensity={2}
          roughness={0.4}
          metalness={0}
          toneMapped={false}
          transparent
          opacity={0.85}
        />
      </mesh>
    </group>
  );
}

/* ------------------------------------------------------------------ *\
   The shop
\* ------------------------------------------------------------------ */

export function Shop({
  engaged,
  onEngage,
  onLeave,
  onBuy,
}: {
  engaged: boolean;
  onEngage: () => void;
  onLeave: () => void;
  onBuy: (family: Family) => void;
}): JSX.Element {
  const reduced = usePrefersReducedMotion();
  const camera = useThree((s) => s.camera);
  const setEvents = useThree((s) => s.setEvents);
  const events = useThree((s) => s.events);
  const { coins, spend } = useCoins();

  /** In range and roughly faced. Changes rarely, so state rather than a ref. */
  const [near, setNear] = useState(false);
  /** Close enough for the stock to be worth giving faces to. */
  const [faces, setFaces] = useState(false);
  /** Whether the crosshair is on a cubby. Drives the reticle only. */
  const [hot, setHot] = useState(false);
  /** Which cubby the crosshair is on, so it can lean forward and light up. */
  const [aimed, setAimed] = useState<Family | null>(null);
  const [bought, setBought] = useState<Bought | null>(null);
  const [nudges, setNudges] = useState<Record<string, number>>({});

  const shelf = useRef<Group>(null);
  const ray = useRef(new Raycaster());
  const forward = useRef(new Vector3());
  const dockTo = useRef(new Vector3());
  const timers = useRef<number[]>([]);

  useEffect(
    () => () => {
      timers.current.forEach((t) => window.clearTimeout(t));
      timers.current = [];
    },
    [],
  );

  /* ---------------------------------------------------------------- *\
     Proximity
  \* ---------------------------------------------------------------- */

  /**
   * Whether the stall is on offer, on the stations' own three conditions: within reach, on the FRONT of
   * it, and looking roughly at it. The facing tolerance is loose on purpose — a five-year-old walking up
   * to something does not aim first, and a prompt that requires aim is a prompt that flickers.
   */
  useFrame(() => {
    const dx = AT[0] - camera.position.x;
    const dz = AT[2] - camera.position.z;
    const d = Math.hypot(dx, dz);

    const wantFaces = faces ? d < FACES_OUT : d < FACES_IN;
    if (wantFaces !== faces) setFaces(wantFaces);

    if (engaged) {
      if (near) setNear(false);
      return;
    }

    let offer = false;
    if (d > 0.3 && d <= REACH) {
      const f = facing();
      // (keeper - stall) · facing > 0: standing in front of the counter, not round the back of it.
      if (-(dx * f[0] + dz * f[1]) > 0.25) {
        camera.getWorldDirection(forward.current);
        const flat = Math.hypot(forward.current.x, forward.current.z) || 1;
        const look = (forward.current.x * dx + forward.current.z * dz) / (flat * d);
        offer = look >= FACING_DOT;
      }
    }
    if (offer !== near) setNear(offer);
  });

  /* ---------------------------------------------------------------- *\
     Looking is aiming
  \* ---------------------------------------------------------------- */

  /**
   * R3F's pointer, moved to the centre of the screen for as long as the shop is open.
   *
   * Verbatim in mechanism from `stations/Stations.tsx`, which explains it at length: under pointer lock the
   * OS cursor is frozen wherever it was when the lock was taken, so `event.offsetX/offsetY` — what R3F's
   * default `compute` reads — is a fixed wrong place. Replacing `compute` makes every pointer event a
   * crosshair event instead, so hovering and clicking both resolve against whatever the child is LOOKING
   * at, and Escape is never on the path to buying something.
   *
   * The stations swap the same function for the same reason, and the two can never be engaged at once —
   * `Game.tsx` owns both flags — so there is no contest over it. Restored on leaving and on unmount.
   */
  const original = useRef<ComputeFunction | undefined>(undefined);
  const captured = useRef(false);
  if (!captured.current) {
    original.current = events.compute;
    captured.current = true;
  }

  const crosshair = useCallback<ComputeFunction>((_event, state) => {
    state.pointer.set(0, 0);
    state.raycaster.setFromCamera(CENTRE, state.camera);
  }, []);

  useEffect(() => {
    const restore = original.current;
    if (engaged) setEvents({ compute: crosshair });
    else if (restore) setEvents({ compute: restore });
    return () => {
      if (restore) setEvents({ compute: restore });
    };
  }, [engaged, setEvents, crosshair]);

  /**
   * What the crosshair is on.
   *
   * Asked here rather than through `onPointerOver` on each cubby, because pointer lock delivers
   * `pointermove` only while the mouse is actually moving — a child who turns their head with the mouse
   * still and then stops would keep a stale highlight. One raycast a frame against the shelf group is
   * cheaper than nineteen hover subscriptions and cannot go stale.
   */
  useFrame(() => {
    if (!engaged || !shelf.current) {
      if (hot) setHot(false);
      if (aimed) setAimed(null);
      return;
    }
    ray.current.setFromCamera(CENTRE, camera);
    const hits = ray.current.intersectObject(shelf.current, true);
    const pick = hits.find((h) => h.object.visible === false);
    const next = pick ? ((pick.object.userData.family as Family | undefined) ?? null) : null;
    if (next !== aimed) setAimed(next);
    if (!!next !== hot) setHot(!!next);
  });

  /* ---------------------------------------------------------------- *\
     Buying
  \* ---------------------------------------------------------------- */

  const buy = useCallback(
    (family: Family): void => {
      const price = priceOf(family);
      if (!spend(price)) {
        // Not enough yet. The price pile bobs, which points at the thing that is missing. Nothing is
        // refused, nothing is said, and the child may press it as often as they like.
        setNudges((n) => ({ ...n, [family]: performance.now() }));
        return;
      }
      onBuy(family);

      const index = STOCK.indexOf(family);
      const cell = SHELF.cell(Math.max(0, index));
      const band = Math.min(0.34, SHELF.halfH * 0.74);
      setBought({
        family,
        from: cell,
        startedAt: performance.now(),
        height: Math.max(0.2, (SHELF.halfH * 2 - band) * 0.82),
      });
      timers.current.push(
        window.setTimeout(() => {
          setBought((b) => (b && b.family === family ? null : b));
        }, FLOURISH * 1000),
      );
    },
    [onBuy, spend],
  );

  /* ---------------------------------------------------------------- *\
     Keys
  \* ---------------------------------------------------------------- */

  /**
   * E to go in, E again or Escape to come out. E ONLY.
   *
   * Space used to work too, on the theory that a child who has been told nothing will press the key
   * they have been hopping with. The owner ruled against it, and they are right: Space was doing three
   * jobs at once. It jumped, it opened things, and once inside it chose. A key that means three
   * different things depending on where you are standing is not a shortcut, it is a trap. Space is now
   * only ever jump, and E is the one and only interact key in the game.
   *
   * Space is not a convenience, it is a prediction about the player: a child who has been told nothing
   * presses Space, because Space is what they have been pressing to hop since they arrived. So Space opens
   * the stall, and once inside it buys whatever the crosshair is on.
   *
   * ══ SPACE CALLS `buy` DIRECTLY, AND IT HAS TO ══════════════════════════════════════════
   *
   * `stations/Stations.tsx` implements its Space by dispatching a synthetic `click` on the canvas, on the
   * reasonable argument that this makes the key travel the identical path a mouse click does. That was
   * copied here first AND IT DID NOT WORK — found by driving the shop in a real browser, which is the only
   * way it was ever going to be found. R3F records which objects were hit on `pointerdown` and fires
   * `onClick` only for objects in that set; a synthetic click has no `pointerdown` before it, so the set is
   * whatever the last REAL press hit. Pressing Space while looking at a cubby therefore bought nothing at
   * all — or, worse, would have bought whatever the child had clicked several seconds earlier and was no
   * longer looking at.
   *
   * So Space reads `aimed`, which is the family under the crosshair as of this frame, and calls the same
   * `buy` the mouse path ends in. The two routes now agree by construction rather than by coincidence,
   * because the highlight and the key are driven by the same single raycast. Nothing is dispatched and
   * nothing is faked.
   */
  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      if (e.repeat) return;
      if (engaged) {
        if (e.code === 'KeyE' || e.code === 'Escape') {
          onLeave();
          return;
        }
        if (e.code === 'Enter' || e.code === 'NumpadEnter') {
          e.preventDefault();
          if (aimed) buy(aimed);
        }
        return;
      }
      if (!near) return;
      if (e.code === 'KeyE') {
        e.preventDefault();
        onEngage();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [engaged, near, onEngage, onLeave, aimed, buy]);

  /**
   * Escape also releases pointer lock, which no page can prevent. Caught from the other side so a child who
   * finds Escape leaves the stall cleanly rather than ending up locked out of a shelf that is still open.
   * Only armed if the lock was held on entering, because engaged-without-a-lock is a legitimate state — a
   * preview, or a child who has not clicked to look around yet — and must not self-close.
   */
  useEffect(() => {
    if (!engaged) return;
    if (!document.pointerLockElement) return;
    const onChange = (): void => {
      if (!document.pointerLockElement) onLeave();
    };
    document.addEventListener('pointerlockchange', onChange);
    return () => document.removeEventListener('pointerlockchange', onChange);
  }, [engaged, onLeave]);

  /* ---------------------------------------------------------------- *\
     Docking
  \* ---------------------------------------------------------------- */

  /**
   * While the shop is open, hold the keeper at the counter. POSITION ONLY: the keeper controller keeps
   * writing `camera.rotation` every frame from the mouse, which is exactly what is wanted, and touching
   * the rotation here would fight it to a locked stare.
   */
  useFrame((_, dt) => {
    if (!engaged) return;
    const p = dockPoint();
    dockTo.current.set(p[0], p[1], p[2]);
    camera.position.lerp(dockTo.current, 1 - Math.exp(-5 * dt));
  });

  /* ---------------------------------------------------------------- *\
     Draw
  \* ---------------------------------------------------------------- */

  const lit = engaged || near ? 1 : 0;

  return (
    <group>
      <group position={[AT[0], AT[1], AT[2]]} rotation={[0, YAW, 0]}>
        <Kiosk lit={lit} reduced={reduced} shelf={SHELF} />

        {/*
          The stations' own cues, on the stations' own components — the ground mark and the press badge.

          THE WISP IS DELIBERATELY NOT HERE, and it is the one place this file departs from
          `stations/Beacon.tsx`. `Wisp` hovers 1.5m IN FRONT of the thing it points at, which is right for a
          noticeboard and wrong for a shop: from the counter it floated dead centre over the middle of the
          shelf, and a screenshot showed it sitting on top of the stock like a thumbprint on a shop window.
          Its job — "there is something over there, visible from anywhere on the ranch" — is already done
          better and more specifically by the enormous turning coin on a post above the awning, which says
          what the place IS as well as that it is there. Two hovering beacons on one small building was one
          too many, and the one that occluded the merchandise is the one that went.
        */}
        <StandMark site={AS_SITE} lit={lit} reduced={reduced} />

        {/* The prompt. Only in range, only while not already inside, and low and forward so it sits in
            front of the counter rather than over the stock. */}
        {lit === 1 && !engaged ? (
          <group position={[0, -1.98, 2.55]}>
            <PressBadge site={AS_SITE} reduced={reduced} />
          </group>
        ) : null}

        {/* The stock. ALWAYS built — see `FACES_IN` for what is dropped at distance instead. */}
        <group ref={shelf}>
            {STOCK.map((family, i) => {
              const cell = SHELF.cell(i);
              return (
                <group key={family} userData={{ family }}>
                  <CubbyHost
                    family={family}
                    at={cell}
                    halfW={SHELF.halfW}
                    halfH={SHELF.halfH}
                    afford={coins >= priceOf(family)}
                    aimed={aimed === family}
                    nudge={nudges[family] ?? 0}
                    active={engaged}
                    eyes={faces}
                    reduced={reduced}
                    seed={131 + i * 197}
                    onPick={buy}
                  />
              </group>
              );
            })}
        </group>

        {bought ? <Flourish bought={bought} reduced={reduced} /> : null}
      </group>

      {engaged ? <Reticle hot={hot} /> : null}
    </group>
  );
}

/**
 * A cubby, with its family stamped onto every mesh in it.
 *
 * The crosshair check finds the invisible hit volume and then has to say WHICH slime it belongs to. R3F puts
 * `userData` on the object it creates, but a raycast returns the mesh rather than the group, so the group's
 * `userData` is not on the hit. Stamping it onto the hit volume itself is the whole of this wrapper's job,
 * and doing it in a `useLayoutEffect` on a ref rather than as a prop means the cubby stays a plain component
 * that knows nothing about how it is being aimed at.
 */
function CubbyHost(props: CubbyProps): JSX.Element {
  const holder = useRef<Group>(null);
  useEffect(() => {
    const g = holder.current;
    if (!g) return;
    g.traverse((o) => {
      o.userData.family = props.family;
    });
  }, [props.family]);
  return (
    <group ref={holder}>
      <Cubby {...props} />
    </group>
  );
}
