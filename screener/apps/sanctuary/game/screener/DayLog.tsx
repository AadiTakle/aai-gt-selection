import { useFrame } from '@react-three/fiber';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type * as THREE from 'three';

import { handedFor } from './address';
import { EventGlyph } from './EventGlyph';
import { glyphFor, type EventMark } from './eventMeaning';
import { canSpeak, hushSpeech, narrate, speak, storyLines, type NarrationState } from './speak';
import { HUE, MAT, bankColor, breath, shade, useReducedMotion, useSlab } from './theme';

/**
 * `VER-SEQUENCE-01` as a thing in the hollow: the day's log, a fallen log with a groove waiting for
 * today's happenings to be laid into it in the order they happened.
 *
 * WHAT WAS WRONG BEFORE THIS FILE. Like the tide-line, this type had no in-world presentation and fell
 * back to a row of numbered buttons. For THIS type that fallback is worse than useless, because the
 * options are orderings: four buttons labelled 1 to 4 hide the only thing the child is being asked
 * about. The owner's description — "it's just pressing random numbers for no reason" — was literally
 * accurate.
 *
 * WHAT WAS WRONG AFTER IT, and what this revision fixes. The words arrived one at a time, on hover: a
 * child had to discover that aiming at a slab made it talk, then aim at every slab in turn, and what
 * they got for it was a pile of disconnected sentences rather than a story. The owner asked for the
 * opposite — the station tells the WHOLE thing out loud, once, and the child picks the row of pictures
 * that answers it. So the log now narrates on arrival, carries a horn that retells it as many times as
 * anyone likes for nothing, and hovering a slab no longer has to be found to hear anything at all.
 *
 * WHAT IS NOT NARRATED, AND WHY IT MATTERS MORE THAN ANY OF THE ABOVE. `content.events` is NOT in story
 * order. Across the whole bank — 100 items, checked — the option the answer names is never the identity
 * ordering, so `events` has already been shuffled and the true order exists only inside the answer,
 * which the server does not send and which nothing here may know. A narration that read `events` as
 * flowing prose would therefore tell every child a story in the wrong order, and a child who then picked
 * the row matching what they heard would be picking the shuffle — silently, on every verbal item, with
 * no error anywhere. `speak.ts`'s `storyLines` is where that is handled: it says out loud that the parts
 * are mixed up, says them, then says the item's own prompt. Read that file's header before touching the
 * wording.
 *
 * THE ADDRESS HAZARD, and the single most likely way to break this file silently. `VER-*` options are
 * `{order: [...]}` with NO `key` field, and this type's on-disk `answer.correctKey` is an INTEGER.
 * `scoreResponse` has two paths that never meet: a numeric key is marked against `selectedIndex`, a
 * string one against `key`. So THE POSITION IS THE ANSWER and `onPick` must hand back
 * `String(index)`. Hand back a letter and every verbal item is marked wrong, confidently and without
 * an error anywhere. `prove-drawn-types.ts` in this directory exists to catch exactly that.
 *
 * WHY THE OPTIONS ARE DRAWN AS ROWS. An option here is not a thing, it is an ARRANGEMENT of the same
 * things. So each one is drawn as a small row of the same slabs in that option's order, and the child
 * picks the row that reads correctly. Nothing else can present an ordering honestly: a single tile per
 * option would be a label for an ordering rather than the ordering itself. This is unchanged, on
 * purpose — the answer mechanic was never the problem.
 *
 * NO READING IS REQUIRED. Each event carries a pictogram keyword-matched from its sentence
 * (`eventMeaning.ts` for the matching and why it also needs a state axis, `EventGlyph.tsx` for the
 * drawings), and each event keeps ONE colour across every row so a child can track it even where the
 * picture is only an approximation. The whole thing still works in silence — see `voiceless` below.
 *
 * IT CANNOT KNOW THE ANSWER. Nothing here compares anything; the chosen row simply settles into the
 * groove.
 */

/** Roughly 8 wide and 6 tall, facing +Z, built around the local origin. */
const SPAN_X = 8.0;
/** Where the log lies. Everything below it is derived from the slab's own height rather than fixed,
 *  because a three-event item gets much taller slabs than a five-event one and hard-coded gaps put the
 *  arrow straight through the top row. */
const LOG_Y = 2.4;

/**
 * How long after arriving the log starts talking.
 *
 * A beat rather than immediately, so it does not land on top of the station's own engage sound and turn
 * two clear noises into one muddy one. Long enough to be a separate event, short enough that a child who
 * has just walked up does not conclude that nothing is going to happen.
 */
const ARRIVAL_BEAT_MS = 900;

/**
 * One colour per event, held across every row.
 *
 * This is the safety net under the pictograms, and it is doing real work: where two events of one
 * story get pictures that only approximate them, the child can still see that the third slab is the
 * gold one and track it from row to row. The hues are the bank's own six names as the hollow tells
 * them, so nothing new enters the world's palette.
 */
const EVENT_HUES = ['coral', 'blue', 'gold', 'teal', 'violet'] as const;

/** What a picture is drawn against. See the note in `Slab`: not white, on purpose. */
const FACE = HUE.stone;

/**
 * The horn's mouth radius, and WHERE THE ROOM FOR IT COMES FROM, which took a screenshot to find.
 *
 * The log's face has none. The groove's rim is cut to `rowW + 0.36` against a log of `rowW + 0.7`, so
 * there is 0.17 of wood at each end and a 0.2 band top and bottom — the first version of this horn was
 * 0.34 across, squeezed into that, and it read as a small gold bead stuck to the corner of the socket.
 * Nothing legible to a five-year-old fits on the log itself.
 *
 * The room is BESIDE the log, and it is there because `stations/sites.ts` is height-bound. `fitScale`
 * takes `min(4.7 / width, 3.0 / height)`, and for every shape this bank holds — (3,3), (3,4), (4,4),
 * (5,4) — the height term wins, by a lot: a 3-event 4-option item scales to 0.434 and then occupies
 * 3.30 of its 4.7 units of bay width. The narrowest case still leaves about 1.1 spare units per side in
 * this file's own coordinates. So the horn hangs off the log's sawn end, where nothing is measuring, and
 * grows forward toward the child, where nothing is measuring either. 0.6 puts its mouth at 1.2 across —
 * wider than a slab is tall — and its rings still land inside the bay.
 *
 * `sites.ts` is not ours to edit and is not wrong: its `extentOf` measures the row of choices, which is
 * still the widest thing that must not be cut off. The horn is deliberately outside that measurement and
 * deliberately inside the slack it leaves.
 */
const HORN_R = 0.6;

function hueFor(i: number): string {
  return bankColor(EVENT_HUES[i % EVENT_HUES.length] ?? 'coral');
}

interface EventCell {
  text: string;
  mark: EventMark;
  hue: string;
}

/* ============================================================================
   the parts
   ========================================================================== */

/**
 * One carved slab: a pale face a picture can be read against, banded in that event's own colour.
 *
 * Pale rather than coloured because the picture has to be the readable thing; the colour lives on the
 * rim and the spine, which is enough to identify a slab at a glance without fighting the drawing.
 */
function Slab({
  cell,
  w,
  h,
  glyphScale,
}: {
  cell: EventCell;
  w: number;
  h: number;
  glyphScale: number;
}) {
  const face = useSlab(w, h, 0.2, 0.1);
  const rim = useSlab(w + 0.09, h + 0.09, 0.13, 0.11);
  return (
    <group>
      <mesh geometry={rim} position={[0, 0, -0.06]}>
        <meshStandardMaterial color={cell.hue} roughness={0.7} metalness={0} />
      </mesh>
      {/* A warm mid stone rather than paper white. The pictures are built from primitives and several
          of them have white or cream parts — an egg, a cloud, a tub, a school wall — and against a
          near-white face those parts VANISH and the slab looks half-drawn. Learned from a screenshot. */}
      <mesh geometry={face}>
        <meshStandardMaterial color={FACE} roughness={0.85} metalness={0} />
      </mesh>
      {/* The spine: the colour again, along the bottom, where it survives a picture covering the rim. */}
      <mesh position={[0, -h / 2 + 0.07, 0.1]}>
        <boxGeometry args={[w * 0.82, 0.09, 0.05]} />
        <meshStandardMaterial color={cell.hue} roughness={0.7} metalness={0} />
      </mesh>
      <group position={[0, 0.03, 0.14]} scale={glyphScale}>
        <EventGlyph glyph={cell.mark.glyph} state={cell.mark.state} bg={FACE} />
      </group>
    </group>
  );
}

/**
 * The groove in the log: the one place in this presentation where something is missing.
 *
 * Same convention as the tide-line's empty stone and every other dressing in this directory — the
 * missing place is the only thing that moves on its own, and under `prefers-reduced-motion` it rests at
 * a steady medium glow rather than going dark.
 */
function Groove({ w, h, filled }: { w: number; h: number; filled: boolean }) {
  const mat = useRef<THREE.MeshStandardMaterial>(null);
  const reduced = useReducedMotion();
  const rim = useSlab(w + 0.2, h + 0.2, 0.24, 0.12);
  const bed = useSlab(w, h, 0.26, 0.1);

  useFrame(({ clock }) => {
    if (!mat.current) return;
    const b = filled ? 0.25 : breath(clock.elapsedTime, 2.8, reduced);
    mat.current.emissiveIntensity = 0.3 + b * 0.9;
  });

  return (
    <group>
      {/* Rim behind and larger, bed in front and smaller — the same socket the tide-line's empty trough
          uses, deliberately, so a child who has met one has met both. Two thin honey lines top and
          bottom, which is what this was first, read as a drawer rather than as a lit place to fill. */}
      <mesh geometry={rim} position={[0, 0, 0.16]}>
        <meshStandardMaterial
          ref={mat}
          color={HUE.honey}
          emissive={HUE.honey}
          emissiveIntensity={0.7}
          roughness={0.45}
          metalness={0}
        />
      </mesh>
      <mesh geometry={bed} position={[0, 0, 0.22]}>
        <meshStandardMaterial {...MAT.cut} />
      </mesh>
    </group>
  );
}

/** The fallen log the groove is cut into. Sized to the row it holds, not to the whole panel. */
function Log({ w, h, rings }: { w: number; h: number; rings: boolean }) {
  return (
    <group>
      {/* Radius exactly half the face and pushed back by its own radius, so the round body's front
          lands at z=0 and everything cut into the face stays in front of it. The first version used a
          fatter cylinder sitting at z=-0.42 and it swallowed the groove whole. */}
      <mesh rotation={[0, 0, Math.PI / 2]} position={[0, 0, -h * 0.5]}>
        <cylinderGeometry args={[h * 0.5, h * 0.5, w, 18]} />
        <meshStandardMaterial {...MAT.barkDeep} />
      </mesh>
      {/* The cut face, flattened toward the child so the groove is square-on. */}
      <mesh position={[0, 0, 0.12]}>
        <boxGeometry args={[w, h, 0.3]} />
        <meshStandardMaterial {...MAT.bark} />
      </mesh>
      {/* Growth rings at each sawn end: this is what makes it a log rather than a beam. Only at the end
          the horn is NOT on — rings behind a horn read as clutter, and one plain sawn end and one end
          with something growing out of it is what makes the horn look put there on purpose. */}
      {(rings ? [-w / 2 + 0.02, w / 2 - 0.02] : [w / 2 - 0.02]).map((x, i) => (
        <group key={i} position={[x, 0, -h * 0.5]} rotation={[0, Math.PI / 2, 0]}>
          {[h * 0.4, h * 0.27, h * 0.14].map((r, j) => (
            <mesh key={j} position={[0, 0, 0.02]}>
              <torusGeometry args={[r, 0.04, 6, 20]} />
              <meshStandardMaterial {...MAT.stoneDeep} />
            </mesh>
          ))}
        </group>
      ))}
    </group>
  );
}

/** A carved arrow in the wood above the groove: which way the day runs. No words, no numbers. */
function TimeArrow({ w }: { w: number }) {
  return (
    <group>
      <mesh>
        <boxGeometry args={[w, 0.09, 0.14]} />
        <meshStandardMaterial {...MAT.bark} />
      </mesh>
      <mesh position={[w / 2 + 0.13, 0, 0]} rotation={[0, 0, -Math.PI / 2]}>
        <coneGeometry args={[0.17, 0.34, 14]} />
        <meshStandardMaterial {...MAT.bark} />
      </mesh>
      <mesh position={[-w / 2 - 0.1, 0, 0]}>
        <sphereGeometry args={[0.11, 12, 10]} />
        <meshStandardMaterial {...MAT.bark} />
      </mesh>
    </group>
  );
}

/* ============================================================================
   the horn
   ========================================================================== */

/**
 * TELL IT AGAIN. A wooden horn grown out of the log's sawn end, mouth turned toward the child.
 *
 * WHY A HORN AND NOT A BUTTON. A child who missed a word needs to ask for it again without being told
 * how, and without being charged for it — so the thing has to be an OBJECT that obviously makes noise
 * rather than a control that has to be learned. A horn is the only shape in the hollow's vocabulary that
 * reads as "sound comes out of here" from across a meadow, at three centimetres on a school laptop, to
 * somebody who cannot read. It costs nothing, it can be pressed forever, and it says the same thing
 * every time.
 *
 * THREE STATES, AND ALL THREE ARE HONEST:
 *   speaking — the lip pulses on the beat and rings travel out of the mouth. It is talking, and you can
 *              see which thing is talking.
 *   ready    — the lip holds a low honey glow and the rings sit nested at rest, so it looks like a thing
 *              that WOULD make a noise. Brighter while the crosshair is on it.
 *   dormant  — no glow and no rings, a plain carved horn. This is what a machine with no voice looks
 *              like, and it is deliberately dull so a child does not spend the round pressing it. It
 *              stays pressable anyway: voices load late on some platforms, and a press is how it finds
 *              out. See the `voiceless` note in `DayLog`.
 *
 * `prefers-reduced-motion` pins both the pulse and the rings to their midpoints — a still horn that is
 * plainly lit, rather than a horn that stops existing.
 */
function Horn({ r, speaking, dormant, lit }: { r: number; speaking: boolean; dormant: boolean; lit: boolean }) {
  const reduced = useReducedMotion();
  /** The mouth and its lip: one brightness, two surfaces, because a lit ring around a dark hole reads as
   *  a ring and a lit ring around a lit hole reads as a thing that is on. */
  const glow = useRef<(THREE.MeshStandardMaterial | null)[]>([null, null]);
  const rings = useRef<(THREE.Group | null)[]>([null, null, null]);
  /** Lighter than the log so the horn is a separate object rather than a lump of it. */
  const timber = useMemo(() => shade(HUE.barkSoft, 0.2), []);
  /**
   * Dormant is a COLOUR change, not only an unlit one.
   *
   * Killing `emissiveIntensity` alone leaves a honey-coloured disc that the scene's own warm lamp lights
   * to very nearly the same gold — a screenshot of the two states side by side was almost impossible to
   * tell apart, which defeats the whole point of looking dull. So a horn with no voice is carved wood all
   * the way through.
   */
  const mouth = dormant ? shade(HUE.barkSoft, -0.1) : HUE.honey;

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;

    /**
     * One number, three states, and `lit` on top of all of them — including while speaking, which the
     * first version got wrong: a child whose crosshair lands on the horn mid-sentence got no answer at
     * all, so there was no way to learn that the horn was the thing you pressed.
     */
    /**
     * The ceiling is about 1.55, and it is measured rather than chosen: the groove's own honey rim runs
     * to 1.2 and reads as lit wood. The first pass here went to 3.7 and the screenshot came back with a
     * white disc where the horn had been — brighter stopped meaning "louder" and started meaning
     * "featureless". A horn that has lost its mouth and its lip is no longer a horn.
     */
    const brightness = dormant
      ? 0
      : (speaking ? 0.7 + breath(t, 0.85, reduced) * 0.5 : 0.4 + breath(t, 3.4, reduced) * 0.2) +
        (lit ? 0.35 : 0);
    for (const m of glow.current) if (m) m.emissiveIntensity = brightness;

    for (let i = 0; i < rings.current.length; i += 1) {
      const g = rings.current[i];
      if (!g) continue;
      if (dormant) {
        g.visible = false;
        continue;
      }
      g.visible = true;
      /**
       * 0 just inside the mouth, 1 out in the air in front of it. Travelling while speaking, parked as a
       * widening cone otherwise.
       *
       * THE RANGE IS NARROW ON PURPOSE, and three wrong versions found the edges of it. Rings barely wider
       * than the mouth merge into one gold halo on the lip. Rings that travel a long way forward drift
       * sideways too, because the horn is yawed outward, and the widest one ends up hanging off the bell
       * like a carrying handle. Rings SMALLER than the mouth vanish against the lit disc inside it. What
       * reads is a ripple that starts at the lip, widens past it by about a third, and fades — the
       * ordinary picture of sound leaving a thing, which is legible without a word of explanation. The
       * outer limit is set by how much bay the widest item leaves over; see `HORN_R`.
       */
      const phase = speaking && !reduced ? ((t / 1.4 + i / 3) % 1) : 0.25 + i * 0.3;
      g.scale.setScalar(0.95 + phase * 0.65);
      g.position.z = phase * 0.45;
      const mesh = g.children[0] as THREE.Mesh | undefined;
      const mat = mesh?.material as THREE.MeshStandardMaterial | undefined;
      // Brightest as it clears the lip, gone by the time it is out in the open.
      if (mat) {
        const fade = speaking ? Math.min(1, phase * 6) * (1 - phase) : 0.34 * (1 - phase * 0.5);
        mat.opacity = Math.min(1, fade * (lit ? 1.5 : 1.15));
      }
    }
  });

  return (
    <group>
      {/* The collar, where the horn is let into the sawn end. Without it the bell floats. */}
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0, -0.1]}>
        <cylinderGeometry args={[r * 0.32, r * 0.28, 0.3, 16]} />
        <meshStandardMaterial {...MAT.barkDeep} />
      </mesh>
      {/* A torus ALREADY lies in the XY plane facing +Z, unlike a cylinder or a cone, whose axis is Y.
          Rotating this one by a quarter turn — which is right for the bell above it — stood it up into a
          horizontal hoop, and the same mistake on the lip and the sound rings put a wide flat gold band
          lying across the horn that read as a carrying handle. It cost two rounds of screenshots. Every
          ring in this component is deliberately UNROTATED. */}
      <mesh position={[0, 0, 0.04]}>
        <torusGeometry args={[r * 0.3, r * 0.075, 8, 18]} />
        <meshStandardMaterial color={timber} roughness={0.85} metalness={0} />
      </mesh>
      {/* The bell: a truncated cone, open at both ends, wide end at +Z so the mouth faces the child.
          Two-sided, because a horn a child is looking INTO shows its far inner wall and a single-sided
          cone shows a hole in the world instead. */}
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0, 0.42]}>
        <cylinderGeometry args={[r, r * 0.3, 0.86, 26, 1, true]} />
        <meshStandardMaterial color={timber} roughness={0.86} metalness={0} side={2} />
      </mesh>
      {/* The mouth itself, lit. This is the part that is visible from across a meadow. */}
      <mesh position={[0, 0, 0.8]}>
        <circleGeometry args={[r * 0.93, 26]} />
        <meshStandardMaterial
          ref={(m) => {
            glow.current[0] = m;
          }}
          color={mouth}
          emissive={HUE.honey}
          emissiveIntensity={0.85}
          roughness={0.55}
          metalness={0}
        />
      </mesh>
      {/* The lip around it, so the mouth has an edge and is not a flat coin. */}
      <mesh position={[0, 0, 0.84]}>
        <torusGeometry args={[r, r * 0.1, 10, 28]} />
        <meshStandardMaterial
          ref={(m) => {
            glow.current[1] = m;
          }}
          color={mouth}
          emissive={HUE.honey}
          emissiveIntensity={0.85}
          roughness={0.45}
          metalness={0}
        />
      </mesh>
      {/* Sound, leaving. Three rings, nested at rest and travelling out while it talks. */}
      {[0, 1, 2].map((i) => (
        <group
          key={i}
          position={[0, 0, 0.86]}
          ref={(g) => {
            rings.current[i] = g;
          }}
        >
          <mesh>
            <torusGeometry args={[r * 0.86, r * 0.075, 8, 28]} />
            <meshStandardMaterial
              color={HUE.honey}
              emissive={HUE.honey}
              emissiveIntensity={1.0}
              roughness={0.5}
              metalness={0}
              transparent
              opacity={0.3}
              depthWrite={false}
            />
          </mesh>
        </group>
      ))}
    </group>
  );
}

/* ============================================================================
   the log
   ========================================================================== */

export function DayLog({
  content,
  onPick,
  disabled = false,
}: {
  content: Record<string, unknown>;
  onPick: (handed: string) => void;
  disabled?: boolean;
}) {
  const [picked, setPicked] = useState<number | null>(null);
  const [hover, setHover] = useState<number | null>(null);
  /** Which single happening the crosshair is studying. The fallback's whole channel — see `voiceless`. */
  const [peek, setPeek] = useState<{ row: number; slot: number } | null>(null);
  /** Whether the crosshair is on the horn or the log, which is the same question. */
  const [onHorn, setOnHorn] = useState(false);
  const [narration, setNarration] = useState<NarrationState>('idle');

  const events = useMemo<EventCell[]>(() => {
    const raw = Array.isArray(content.events) ? (content.events as Record<string, unknown>[]) : [];
    return raw.map((e, i) => {
      const text = typeof e?.text === 'string' ? e.text : '';
      return { text, mark: glyphFor(text), hue: hueFor(i) };
    });
  }, [content]);

  /** Everything the log says, composed in `speak.ts` for the reasons its header gives. */
  const lines = useMemo(() => storyLines(content), [content]);

  const retell = useCallback(() => {
    if (lines.length === 0) return;
    narrate(lines, setNarration);
  }, [lines]);

  /**
   * Told once on arrival, after a beat, and then left alone.
   *
   * Automatic rather than waiting for a press because a child should not have to discover the horn to
   * find out what they are being asked; the horn is for the second and third time. Nothing is left
   * talking when the item changes — this component is keyed on the item, so unmount is per question.
   */
  useEffect(() => {
    if (lines.length === 0) return;
    if (!canSpeak()) {
      setNarration('unavailable');
      return;
    }
    const t = setTimeout(retell, ARRIVAL_BEAT_MS);
    return () => {
      clearTimeout(t);
      hushSpeech();
    };
  }, [lines, retell]);

  /**
   * VOICELESS: what happens when this machine cannot talk.
   *
   * Reached when `speechSynthesis` is absent, or present and never actually starts a first word within
   * `FIRST_WORD_MS` — a Linux box with no voice packages, a locked-down school image, a muted tab, a
   * headless screenshot. It is a real state on real hardware, so the item has to remain answerable
   * without a sound, and it does:
   *
   *   - the pictures already carry the story. That is why `eventMeaning.ts` exists and why `coverage.ts`
   *     measures per-item picture clashes rather than only bank-wide coverage.
   *   - the previous behaviour comes back: ONE HAPPENING AT A TIME. Aiming at a slab lifts it well clear
   *     of the row and enlarges it, so a child can study each picture on its own, and taps still speak
   *     in case a voice turned up late.
   *   - the horn goes dull, so nobody spends the round pressing a thing that does not answer, but stays
   *     pressable, because a press is how a late-loading voice gets discovered.
   */
  const voiceless = narration === 'unavailable';
  const speaking = narration === 'speaking';
  /**
   * How far a studied slab comes out of the row.
   *
   * ONLY WHEN THERE IS NO VOICE, which a screenshot argued for: a row is an ORDERING, and pulling one of
   * its slabs forward and enlarging it deforms the very thing the child is being asked to read. That is a
   * fair price for the only way in when the station cannot speak, and a bad one when it can — where the
   * shelf lighting up already says exactly where the aim landed.
   */
  const peekScale = 1.32;

  /**
   * The orderings on offer.
   *
   * `handed` is the address, and for this type it is the POSITION — see the note at the top of the
   * file. The `o.key` branch is kept only so this component behaves if the bank ever grows lettered
   * options; it does not fire today, and `toRef` resolves either.
   */
  const options = useMemo(() => {
    const raw = Array.isArray(content.options) ? (content.options as Record<string, unknown>[]) : [];
    return raw.map((o, i) => {
      const order = Array.isArray(o?.order) ? (o.order as unknown[]) : [];
      return {
        index: i,
        handed: handedFor(o, i),
        order: order
          .map((v) => (typeof v === 'number' ? Math.round(v) : -1))
          .filter((v) => v >= 0 && v < events.length),
      };
    });
  }, [content, events.length]);

  const n = Math.max(1, events.length);
  const rows = Math.max(1, options.length);

  const rowPitch = rows >= 4 ? 1.14 : 1.44;
  /** As wide as the panel allows: three big slabs beat three small ones for a five-year-old, and a
   *  three-event item has room to spare. */
  const slabPitch = Math.min(2.2, (SPAN_X - 0.4) / n);
  const slabW = slabPitch * 0.9;
  const slabH = Math.min(1.0, rowPitch * 0.76);
  const glyphScale = Math.min(slabW, slabH) * 0.84;
  /** The log carries the groove, a band of wood above it for the arrow, and a band below. */
  const logH = slabH + 0.95;
  const firstRowY = LOG_Y - logH / 2 - 0.3 - slabH / 2;
  /** How wide one ordering actually is. Every shelf, the log and the groove are cut to this rather
   *  than to the panel, so a three-event item does not sit on furniture built for five. */
  const rowW = n * slabPitch;
  /** Just past the log's left sawn end — the start of the day, and the only room there is. See `HORN_R`. */
  const hornX = -(rowW / 2 + 0.5);

  const pickedOrder = picked === null ? null : (options.find((o) => o.index === picked)?.order ?? null);

  /** One row of slabs in a given order, reused by the option rows and by the filled groove. */
  const renderRow = (order: readonly number[], scale: number, peekSlot: number | null = null) => (
    <group scale={scale}>
      {order.map((eventIndex, slot) => {
        const cell = events[eventIndex];
        if (!cell) return null;
        const out = peekSlot === slot;
        return (
          <group
            key={slot}
            position={[(slot - (order.length - 1) / 2) * slabPitch, out ? 0.05 : 0, out ? 0.36 : 0]}
            scale={out ? peekScale : 1}
          >
            <Slab cell={cell} w={slabW} h={slabH} glyphScale={glyphScale} />
          </group>
        );
      })}
    </group>
  );

  return (
    <group>
      {/* The log, and the groove waiting in it. Both are sized to the row that goes in, so the log
          never reads as a piece of furniture parked above the question. */}
      <group position={[0, LOG_Y, -0.2]}>
        <Log w={rowW + 0.7} h={logH} rings={false} />
        <group position={[0, -0.12, 0.06]}>
          <Groove w={rowW + 0.16} h={slabH + 0.08} filled={pickedOrder !== null} />
        </group>
        {pickedOrder ? <group position={[0, -0.12, 0.5]}>{renderRow(pickedOrder, 0.9)}</group> : null}
        {/* Which way the day runs, carved in the wood above the groove. It lives INSIDE the log rather
            than on its own line because a separate band of it cost 0.5 units of height and the first
            version of that band ran straight through the top row's slabs. */}
        <group position={[0, logH / 2 - 0.26, 0.3]}>
          <TimeArrow w={rowW * 0.5} />
        </group>

        {/* TELL IT AGAIN. Off the left end, which is where a day starts and which the time arrow already
            points away from, turned a little outward so it reads as let into the sawn end rather than
            growing out of the face. `HORN_R` has the arithmetic for why here and nowhere else. */}
        <group position={[hornX, -0.04, 0.05]} rotation={[0, -0.2, 0]}>
          <Horn r={HORN_R} speaking={speaking} dormant={voiceless} lit={onHorn} />
        </group>

        {/* THE WHOLE LOG IS THE PRESS, which is the point of it.
            A five-year-old aiming a crosshair in three dimensions does not hit a horn. So the horn is
            the thing that SAYS "sound", and the entire log — every bit of wood a child could plausibly
            be pointing at when they mean "again" — is what actually takes the press. Two volumes, the
            near one over the horn so a deliberate aim gets a deliberate hit, the wide one behind it
            catching everything else. Nothing else on the log wants a click: the groove is where the
            answer settles, and settling is not something you press. */}
        <mesh
          visible={false}
          position={[hornX, 0, 0.55]}
          onPointerOver={(e) => {
            e.stopPropagation();
            setOnHorn(true);
          }}
          onPointerOut={(e) => {
            e.stopPropagation();
            setOnHorn(false);
          }}
          onClick={(e) => {
            e.stopPropagation();
            retell();
          }}
        >
          <boxGeometry args={[HORN_R * 2.9, Math.max(logH, 1.8), 2.4]} />
        </mesh>
        <mesh
          visible={false}
          position={[0, 0, 0.34]}
          onPointerOver={(e) => {
            e.stopPropagation();
            setOnHorn(true);
          }}
          onPointerOut={(e) => {
            e.stopPropagation();
            setOnHorn(false);
          }}
          onClick={(e) => {
            e.stopPropagation();
            retell();
          }}
        >
          <boxGeometry args={[rowW + 0.7, logH, 0.5]} />
        </mesh>
      </group>

      {/* The orderings. Each is a whole row, and the row is what gets chosen. */}
      {options.map((o) => {
        const y = firstRowY - o.index * rowPitch;
        const live = !disabled && picked === null;
        const lit = hover === o.index && live;
        const taken = picked === o.index;
        return (
          <group key={o.index} position={[0, y + (lit ? 0.12 : 0), taken ? 0.3 : 0]}>
            {/* The shelf. Also the hover tell: a whole plank of honey light is unmissable to a child
                who is not sure whether their aim landed. */}
            <mesh position={[0, -slabH / 2 - 0.16, -0.12]}>
              <boxGeometry args={[rowW + 0.4, 0.2, 0.9]} />
              <meshStandardMaterial
                color={lit || taken ? HUE.honey : HUE.barkSoft}
                emissive={lit || taken ? HUE.honey : '#000000'}
                emissiveIntensity={lit ? 0.55 : taken ? 0.35 : 0}
                roughness={0.75}
                metalness={0}
              />
            </mesh>

            {/* The row's own hit volume, behind the slabs, catching everything they do not. */}
            <mesh
              visible={false}
              position={[0, 0, -0.2]}
              onPointerOver={() => {
                setHover(o.index);
                setPeek(null);
              }}
              onPointerOut={() => setHover((h) => (h === o.index ? null : h))}
              onClick={(e) => {
                e.stopPropagation();
                if (!live) return;
                setPicked(o.index);
                onPick(o.handed);
              }}
            >
              <boxGeometry args={[rowW + 1.0, rowPitch * 0.94, 1.2]} />
            </mesh>

            {renderRow(o.order, lit ? 1.04 : 1, voiceless && peek?.row === o.index ? peek.slot : null)}

            {/* Per-slab hit volumes, in front and tiled edge to edge so there is no gap to fall
                through. A tap on one still picks the row, because a child who has decided has decided
                and should not have to aim twice.

                THESE NO LONGER HAVE TO BE FOUND FOR THE ITEM TO MAKE SENSE. Speaking one sentence on
                hover was the whole voice of this presentation and it is not any more — the log tells the
                story by itself. What is left here is a magnifier: the slab under the crosshair lifts out
                of the row so its picture can be studied on its own. That is also the voiceless
                fallback's only channel, which is why it lifts further when there is no voice, and why a
                tap still tries to say the sentence in case one arrived late. */}
            {o.order.map((eventIndex, slot) => {
              const cell = events[eventIndex];
              if (!cell) return null;
              return (
                <mesh
                  key={slot}
                  visible={false}
                  position={[(slot - (o.order.length - 1) / 2) * slabPitch, 0, 0.5]}
                  onPointerOver={(e) => {
                    e.stopPropagation();
                    setHover(o.index);
                    setPeek({ row: o.index, slot });
                  }}
                  onPointerOut={(e) => {
                    e.stopPropagation();
                    setHover((h) => (h === o.index ? null : h));
                    setPeek((p) => (p && p.row === o.index && p.slot === slot ? null : p));
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (voiceless) speak(cell.text);
                    if (!live) return;
                    setPicked(o.index);
                    onPick(o.handed);
                  }}
                >
                  <boxGeometry args={[slabPitch, rowPitch * 0.94, 1.4]} />
                </mesh>
              );
            })}
          </group>
        );
      })}
    </group>
  );
}
