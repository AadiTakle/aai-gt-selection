import { useFrame } from '@react-three/fiber';
import { useMemo, useRef, type JSX } from 'react';
import {
  CylinderGeometry,
  MeshStandardMaterial,
  SphereGeometry,
  TorusGeometry,
  type Mesh,
  type PointLight,
} from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';

import { breath } from '../screener/theme';
import { HONEY, coinGeometry, mats, useEase } from './carpentry';
import { AT, BAY, CEILING, shelfOuter, type Shelf } from './site';

/**
 * THE COIN STALL — the carpentry, with nothing interactive in it.
 *
 * ══ WHAT THE OWNER ASKED FOR, AND WHAT THIS IS ════════════════════════════════════════════════════
 *
 * "perhaps we can have an atm of sorts". An ATM is exactly the right idea and exactly the wrong object: a
 * grey plastic box with a screen on it belongs to a world of banks and cards, and there is not one of those
 * in the hollow. What a child recognises as the same THING — put your coins in, get something out — and
 * which belongs on a ranch is a MARKET STALL: a counter you lean on, a striped awning, a scalloped valance,
 * a brass slot in the counter front, a tray under the slot, and shelves of stock behind it. So that is what
 * this is, and the two pieces that carry the ATM read are the slot and the tray, both in brass and both
 * lit, dead centre where a child's hands would go.
 *
 * ══ THE SAME BUILDING SEQUENCE AS EVERYTHING ELSE ON THE RANCH ═════════════════════════════════════
 *
 * `world/Buildings.tsx` sets the rule its own barn and hut follow: a stone footing, then the structure,
 * then a roof that lands on the wall head and oversails it, then boards over the joins. That sequence is
 * what the eye reads as "built" — and its converse is what the owner spotted when a cone was standing in
 * for a roof. So the stall gets a stone footing under the counter, posts up to a head beam, and an awning
 * that oversails the counter by two thirds of a metre. Everything is `RoundedBoxGeometry`; nothing in a
 * child's world has a razor edge.
 *
 * ══ THE SIGN IS A COIN ═══════════════════════════════════════════════════════════════════════════
 *
 * The one thing on the stall visible from across the meadow, and the only way a child works out what this
 * place is FOR without being told: a single enormous brass coin on the sign board, the same coin that flies
 * into their purse when they answer something and the same coin that prices every slime. Three sizes of one
 * picture, doing all the explaining that the rules of this app allow.
 *
 * `lit` runs 0..1 off the proximity check. Same signal the stations use in their woodwork: the head beam
 * and the counter take an emissive honey wash, which at a distance reads as the lanterns having come up.
 */

/** Ground, in the local frame. `AT[1]` is the stall's reference height. */
const GROUND = -AT[1];
/** Top of the counter, local. World 1.02m — a five-year-old's chest, an adult's hip. */
const COUNTER_TOP = -1.18;
/** The head beam's thickness. Named because the beam's UNDERSIDE is the number that matters now. */
const BEAM_T = 0.32;
/**
 * THE HEAD BEAM'S CENTRE, local — AND IT ROSE BY 457mm, WHICH IS THE TOP-ROW OCCLUSION FIX.
 *
 * It used to be a typed 1.98, which put the beam's underside at 1.820: on the shelf band's own ceiling,
 * 18mm above a top-row body, and IN FRONT OF IT — the beam's box runs from z -0.33 to +0.29 and a portrait
 * stands at z +0.06, so the beam does not merely sit above the top row, it encloses it. Everything a
 * top-row slime wore on its head was inside the woodwork. Seventeen of the nineteen families lost their
 * crest there; `bunny` was a bare dome and `wood` kept two leaf tips out of a whole branch.
 *
 * It is now derived: `site.ts`'s `CEILING` is where the shelf lip of a fourth row would be, so the beam's
 * underside lands exactly there and the top row gets the same crest sky the two rows below it always had.
 * Nothing about the shelf, the cubbies or the slimes changed to achieve it — see `CREST_SKY` for why that
 * matters — and the beam, the braces, the awning, the lanterns and the sign all rise together, so the
 * stall is 46cm taller and is otherwise the same building.
 */
const HEAD = CEILING + BEAM_T / 2;
/**
 * The bottom of the shelf's back board, local. Unchanged; its TOP now follows `HEAD`.
 *
 * A crest that clears the beam has to be read against something, and the interior rows already answer
 * that: their crests rise out of their own dark recess and are read against this board. The top row's
 * tallest — `wood` at 2.210, `ice` at 2.127, `frost` at 2.114 — used to reach past the board's old top of
 * 2.130 and be read against the sky, which is the one background a pale rime spire disappears into. The
 * board now runs all the way up behind the beam, so every row is backed the same way.
 */
const BACK_BOTTOM = -1.29;

export function Kiosk({
  lit,
  reduced,
  shelf,
}: {
  lit: number;
  reduced: boolean;
  shelf: Shelf;
}): JSX.Element {
  const m = mats();
  const wash = useEase(lit);
  const head = useRef<MeshStandardMaterial>(null);
  const counter = useRef<MeshStandardMaterial>(null);
  const slot = useRef<MeshStandardMaterial>(null);
  const signCoin = useRef<Mesh>(null);
  const lamp = useRef<PointLight>(null);
  const globes = useRef<Mesh[]>([]);

  const W = BAY.halfW;
  const coin = coinGeometry();

  const g = useMemo(() => {
    const postH = HEAD - GROUND;
    const backH = HEAD - BACK_BOTTOM;
    /**
     * THE HEAD-BEAM BRACKET, RE-CUT SO IT CANNOT STAND IN A CUBBY.
     *
     * The old brace was a fixed 0.72m knee at `HEAD - 0.42`, and its box reached from x 2.44 to 3.28 while
     * the outermost cubby runs 2.27 to 3.05 — so it stood 60cm INSIDE the outer cubby, in front of that
     * cubby's back board and behind the slime's face. That did not show while the beam was hiding
     * everything above 1.82 anyway; the moment the beam rose it would have become the new occluder for the
     * outermost family in the top row, which is the same bug with a different piece of timber.
     *
     * So it is now solved from the shelf rather than typed: it fills the clear span between the edge of the
     * stock and the end of the beam's own oversail, and it hangs tight up under the beam. On the nineteen
     * shelf that is x 3.045 to 3.550 and y 2.024 to 2.277 — springing off the post, under the oversail it
     * actually supports, which is where a bracket belongs, and nowhere near a slime. A six-family shelf has
     * wider cubbies and less spare width, and the bracket shrinks to match without a second number.
     */
    const braceLo = shelfOuter(shelf);
    const braceHi = W + 0.25;
    const braceHalf = Math.max(0.1, (braceHi - braceLo) / 2);
    // A 0.16-square bar turned 45° covers (len + 0.16)/√2 either side of its centre, so this is the length
    // whose box is exactly the span — the bracket touches the beam and the stock's edge and crosses neither.
    const braceLen = Math.max(0.12, braceHalf * 2 * Math.SQRT2 - 0.16);
    return {
      braceAt: [(braceLo + braceHi) / 2, CEILING - braceHalf] as [number, number],
      footing: new RoundedBoxGeometry(W * 2 + 0.6, 0.34, 1.9, 2, 0.09),
      stoop: new RoundedBoxGeometry(W * 1.7, 0.12, 0.9, 2, 0.05),
      post: new RoundedBoxGeometry(0.3, 1, 0.3, 2, 0.09),
      counter: new RoundedBoxGeometry(W * 2 + 0.34, 0.26, 0.95, 3, 0.1),
      apron: new RoundedBoxGeometry(W * 2 + 0.1, 0.62, 0.17, 2, 0.07),
      back: new RoundedBoxGeometry(W * 2, backH, 0.2, 3, 0.1),
      backY: BACK_BOTTOM + backH / 2,
      slat: new RoundedBoxGeometry(W * 2 - 0.18, 0.1, 0.52, 2, 0.045),
      head: new RoundedBoxGeometry(W * 2 + 0.5, BEAM_T, 0.62, 2, 0.1),
      brace: new RoundedBoxGeometry(braceLen, 0.16, 0.16, 1, 0.06),
      stripe: new RoundedBoxGeometry(0.62, 0.11, 1.44, 2, 0.05),
      // The valance. A scalloped edge hanging off the awning's front lip, which is the single most
      // recognisable thing about a market stall and costs one flat disc per stripe.
      scallop: new CylinderGeometry(0.15, 0.15, 0.055, 14),
      signBoard: new RoundedBoxGeometry(1.9, 1.05, 0.13, 3, 0.15),
      signPost: new CylinderGeometry(0.075, 0.095, 1, 9),
      plate: new RoundedBoxGeometry(0.92, 1.02, 0.08, 3, 0.11),
      slotMouth: new RoundedBoxGeometry(0.58, 0.095, 0.11, 1, 0.035),
      tray: new CylinderGeometry(0.34, 0.27, 0.075, 18),
      hook: new CylinderGeometry(0.035, 0.035, 0.3, 8),
      cap: new CylinderGeometry(0.19, 0.13, 0.12, 10),
      globe: new SphereGeometry(0.17, 16, 12),
      base: new CylinderGeometry(0.13, 0.17, 0.1, 10),
      churn: new CylinderGeometry(0.3, 0.36, 0.86, 14),
      churnLid: new CylinderGeometry(0.33, 0.29, 0.1, 14),
      sack: new RoundedBoxGeometry(0.58, 0.8, 0.46, 4, 0.2),
      coinPost: new CylinderGeometry(0.1, 0.13, 1, 9),
      halo: new TorusGeometry(0.58, 0.05, 8, 26),
      postH,
    };
  }, [W, shelf]);

  /** Where each row's shelf board sits, so the stock stands ON something. */
  const boards = useMemo(() => {
    const out: number[] = [];
    for (let r = 0; r < shelf.rows; r += 1) {
      out.push(shelf.cell(r * shelf.cols)[1] - shelf.halfH - 0.03);
    }
    return out;
  }, [shelf]);

  /** Stripes across the awning, alternating cream and honey. Odd count, so the middle stripe is pale. */
  const stripes = useMemo(() => {
    const span = W * 2 + 0.8;
    const n = Math.max(7, Math.round(span / 0.68) | 1);
    const pitch = span / n;
    return Array.from({ length: n }, (_, i) => ({
      x: (i - (n - 1) / 2) * pitch,
      warm: i % 2 === 1,
      scale: pitch / 0.62,
    }));
  }, [W]);

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    const k = wash.current;
    const b = breath(t, 3.2, reduced);
    if (head.current) head.current.emissiveIntensity = k * 0.5;
    if (counter.current) counter.current.emissiveIntensity = k * 0.2;
    // The slot breathes whether or not anybody is near, because it is the one thing on the stall that has
    // to say "put something in here" from a distance. `screener/theme.ts` establishes the convention: the
    // only thing in the world that moves on its own is the place where something is missing.
    if (slot.current) slot.current.emissiveIntensity = 0.22 + b * 0.18 + k * 0.5;
    if (signCoin.current) {
      signCoin.current.rotation.y = reduced ? 0.5 : t * 0.42;
    }
    for (const globe of globes.current) {
      if (!globe) continue;
      (globe.material as MeshStandardMaterial).emissiveIntensity = 1.1 + b * 0.5 + k * 3.2;
    }
    if (lamp.current) lamp.current.intensity = 7 + k * 11;
  });

  return (
    <group>
      {/* ── footing and the trodden board in front of it ───────────────────────────────────────────
          Same move `Buildings.tsx` makes under both its buildings: a thing that meets the grass on a
          stone course looks planted, one that does not looks dropped. */}
      <mesh
        geometry={g.footing}
        material={m.stone}
        position={[0, GROUND + 0.17, 0.15]}
        castShadow
        receiveShadow
      />
      <mesh geometry={g.stoop} material={m.stoneDeep} position={[0, GROUND + 0.06, 1.25]} receiveShadow />

      {/* ── posts and the head beam they carry ─────────────────────────────────────────────────── */}
      {([-1, 1] as const).map((side) => (
        <group key={side} position={[side * W, 0, 0]}>
          <mesh
            geometry={g.post}
            material={m.timber}
            position={[0, GROUND + g.postH / 2, -0.05]}
            scale={[1, g.postH, 1]}
            castShadow
            receiveShadow
          />
        </group>
      ))}

      {/* One bracket per post under the beam's oversail. The cheapest shape there is that says "this was
          framed" rather than "this was placed" — and, since the beam rose, cut to the clear span beside the
          stock so it can never be the thing a child cannot see past. See `braceAt` in the geometry above. */}
      {([-1, 1] as const).map((side) => (
        <mesh
          key={side}
          geometry={g.brace}
          material={m.timberDeep}
          position={[side * g.braceAt[0], g.braceAt[1], -0.05]}
          rotation={[0, 0, side * (Math.PI / 4)]}
          castShadow
        />
      ))}
      <mesh geometry={g.head} material={m.timberDeep} position={[0, HEAD, -0.02]} castShadow>
        <meshStandardMaterial
          ref={head}
          color="#684d34"
          emissive={HONEY}
          emissiveIntensity={0}
          roughness={0.76}
          metalness={0}
        />
      </mesh>

      {/* ── the shelf carcass, and a board under every row ─────────────────────────────────────── */}
      <mesh
        geometry={g.back}
        material={m.paintDeep}
        position={[0, g.backY, -0.62]}
        castShadow
        receiveShadow
      />
      {boards.map((y) => (
        <mesh
          key={y}
          geometry={g.slat}
          material={m.timber}
          position={[0, y, -0.28]}
          castShadow
          receiveShadow
        />
      ))}

      {/* ── the counter ────────────────────────────────────────────────────────────────────────
          The one thing on the stall a child's eye lands on when they walk up, so it carries the same
          honey wash the head beam does. Solid to the player: see `SHOP_SOLIDS`. */}
      <mesh geometry={g.counter} position={[0, COUNTER_TOP - 0.13, 0.32]} castShadow receiveShadow>
        <meshStandardMaterial
          ref={counter}
          color="#8a6a49"
          emissive={HONEY}
          emissiveIntensity={0}
          roughness={0.78}
          metalness={0}
        />
      </mesh>
      <mesh
        geometry={g.apron}
        material={m.paint}
        position={[0, COUNTER_TOP - 0.57, 0.72]}
        castShadow
        receiveShadow
      />

      {/* ── THE SLOT AND THE TRAY. The ATM, in brass. ──────────────────────────────────────────
          Dead centre and at the child's own height, because this is the part of the object that says what
          the object does. The slot glows honey on its own rhythm; the tray under it is where a bought
          slime lands (see the flourish in `Shop.tsx`), which is what makes the pair read as a machine
          that gives something back rather than as a money box. */}
      <group position={[0, COUNTER_TOP - 0.55, 0.83]}>
        <mesh geometry={g.plate} material={m.brass} castShadow />
        <mesh geometry={g.slotMouth} position={[0, 0.25, 0.06]}>
          <meshStandardMaterial
            ref={slot}
            color="#5f4223"
            emissive={HONEY}
            emissiveIntensity={0.25}
            roughness={0.62}
            metalness={0.1}
          />
        </mesh>
        {/* A coin sitting in the slot, half in. Nothing explains a slot faster than a coin already in it. */}
        <group position={[0, 0.315, 0.12]} scale={0.095} rotation={[Math.PI / 2, 0, 0]}>
          <mesh geometry={coin.disc} material={m.brass} />
          <mesh geometry={coin.rim} material={m.brassDeep} rotation={[Math.PI / 2, 0, 0]} />
        </group>
        {/* The chute mouth, and the dish it delivers into. */}
<mesh geometry={g.slotMouth} position={[0, -0.28, 0.055]} scale={[1.02, 2.2, 1]} material={m.timberDeep} />
        <mesh geometry={g.slotMouth} position={[0, -0.12, 0.075]} scale={[1.1, 0.45, 1]} material={m.brassDeep} />
      </group>
      <mesh
        geometry={g.tray}
        material={m.brass}
        position={[0, COUNTER_TOP + 0.06, 0.62]}
        castShadow
        receiveShadow
      />

      {/* ── the awning, striped, with a scalloped valance ───────────────────────────────────────── */}
      <group position={[0, HEAD + 0.4, 0.4]} rotation={[0.32, 0, 0]}>
        {stripes.map((s) => (
          <mesh
            key={s.x}
            geometry={g.stripe}
            material={s.warm ? m.canvasWarm : m.canvasPale}
            position={[s.x, 0, 0]}
            scale={[s.scale, 1, 1]}
            castShadow
            receiveShadow
          />
        ))}
        {stripes.map((s) => (
          <mesh
            key={`v${s.x}`}
            geometry={g.scallop}
            material={s.warm ? m.canvasWarm : m.canvasPale}
            position={[s.x, -0.05, 0.74]}
            rotation={[Math.PI / 2, 0, 0]}
            scale={[s.scale, 1, 1]}
            castShadow
          />
        ))}
      </group>

      {/* ── the sign: one enormous coin, ON A POST ABOVE THE AWNING ────────────────────────────
          THIS MOVED, AND A SCREENSHOT IS WHY. The first pass hung it on two chains off the head beam, where
          a pub sign goes — which put a 1.9m board squarely in front of the top row. Three of the nineteen
          slimes were behind their own shop sign, and the middle of the shelf, which is the best part of it,
          was the part a child could not see. A stall's sign belongs ABOVE its awning on a post, which is
          also where every real market stall puts it: from the arrival at 21.6m it is 10.6° up and
          comfortably in frame, and from the counter it is over the child's head, which is exactly when they
          have stopped needing it. Nothing is covered from either place.

          The coin turns slowly, which is the only reason a flat disc catches the eye across a meadow. */}
      <group position={[0, HEAD + 0.62, 0.2]}>
        <mesh
          geometry={g.signPost}
          material={m.timber}
          position={[0, 0.62, 0]}
          scale={[1, 1.24, 1]}
          castShadow
        />
        <group position={[0, 1.72, 0]}>
          <mesh geometry={g.signBoard} material={m.paint} castShadow receiveShadow />
          <group ref={signCoin} position={[0, 0, 0.12]} scale={0.4} rotation={[Math.PI / 2, 0, 0]}>
            <mesh geometry={coin.disc} material={m.brass} castShadow />
            <mesh geometry={coin.rim} material={m.brassDeep} rotation={[Math.PI / 2, 0, 0]} />
            {/* The star pressed into the face, on both sides, so the coin reads as a coin at any phase
                of its turn. */}
            {([1, -1] as const).map((face) => (
              <group key={face} position={[0, face * 0.12, 0]}>
                {[0, 1, 2, 3, 4].map((i) => {
                  const a = (i / 5) * Math.PI * 2;
                  return (
                    <mesh
                      key={i}
                      geometry={coin.pip}
                      material={m.brassDeep}
                      position={[Math.sin(a) * 0.42, 0, Math.cos(a) * 0.42]}
                    />
                  );
                })}
              </group>
            ))}
          </group>
          <mesh geometry={g.halo} position={[0, 0, 0.06]} rotation={[0, 0, 0]}>
            <meshStandardMaterial
              color={HONEY}
              emissive={HONEY}
              emissiveIntensity={0.7}
              roughness={0.45}
              metalness={0}
              toneMapped={false}
            />
          </mesh>
        </group>
      </group>

      {/* ── a lantern at each end of the beam, and ONE light for the pair ────────────────────────
          Copied in intent from `stations/carpentry.tsx`, whose argument holds here without change: a
          point light per lantern is a second shadow-free light for nothing, and the light's real job is
          not to look like a lantern but to keep the shelves legible at golden hour. */}
      {([-1, 1] as const).map((side, i) => (
        <group key={side} position={[side * (W + 0.16), HEAD - 0.18, 0.28]}>
          <mesh geometry={g.hook} material={m.timberDeep} position={[0, 0.4, 0]} />
          <mesh geometry={g.cap} material={m.timberDeep} position={[0, 0.24, 0]} castShadow />
          <mesh
            ref={(el) => {
              if (el) globes.current[i] = el;
            }}
            geometry={g.globe}
          >
            <meshStandardMaterial
              color="#ffe6b4"
              emissive={HONEY}
              emissiveIntensity={1.3}
              roughness={0.35}
              metalness={0}
              toneMapped={false}
            />
          </mesh>
          <mesh geometry={g.base} material={m.timberDeep} position={[0, -0.2, 0]} />
        </group>
      ))}
      <pointLight
        ref={lamp}
        position={[0, 0.55, 1.85]}
        color="#ffdca6"
        intensity={8}
        distance={9}
        decay={2}
      />

      {/* ── dressing. Two or three objects nobody put there on purpose is what makes a corner of a yard
          look worked in rather than dressed. Each of these has a collider in `SHOP_SOLIDS`. ───────── */}
      <group position={[-W - 0.72, 0, 1.15]}>
        <mesh
          geometry={g.churn}
          material={m.timber}
          position={[0, GROUND + 0.43, 0]}
          castShadow
          receiveShadow
        />
        <mesh geometry={g.churnLid} material={m.timberDeep} position={[0, GROUND + 0.9, 0]} castShadow />
      </group>
      {[
        [-W - 1.32, 0.55, 0.24],
        [-W - 1.24, 1.36, -0.4],
      ].map((s) => (
        <mesh
          key={s[0]! * 10 + s[1]!}
          geometry={g.sack}
          material={m.burlap}
          position={[s[0]!, GROUND + 0.41, s[1]!]}
          rotation={[0, s[2]!, 0]}
          castShadow
          receiveShadow
        />
      ))}
      {/* A coin on a post on the other flank, at a five-year-old's own eye height. The one piece of the
          vocabulary a child can walk right up to and look at closely. */}
      <group position={[W + 0.66, 0, 0.95]}>
        <mesh
          geometry={g.coinPost}
          material={m.timber}
          position={[0, GROUND + 0.6, 0]}
          scale={[1, 1.2, 1]}
          castShadow
          receiveShadow
        />
        <group position={[0, GROUND + 1.32, 0]} scale={0.24} rotation={[Math.PI / 2, 0, 0.2]}>
          <mesh geometry={coin.disc} material={m.brass} castShadow />
          <mesh geometry={coin.rim} material={m.brassDeep} rotation={[Math.PI / 2, 0, 0]} />
        </group>
      </group>
    </group>
  );
}
