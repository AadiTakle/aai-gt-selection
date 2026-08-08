import { useFrame } from '@react-three/fiber';
import { useEffect, useMemo, useRef, useState } from 'react';
import type * as THREE from 'three';

import { handedFor } from './address';
import { EventGlyph } from './EventGlyph';
import { glyphFor, type EventMark } from './eventMeaning';
import { hushSpeech, speak } from './speak';
import { HUE, MAT, bankColor, breath, useReducedMotion, useSlab } from './theme';

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
 * THE ADDRESS HAZARD, and the single most likely way to break this file silently. `VER-*` options are
 * `{order: [...]}` with NO `key` field, and this type's on-disk `answer.correctKey` is an INTEGER.
 * `scoreResponse` has two paths that never meet: a numeric key is marked against `selectedIndex`, a
 * string one against `key`. So THE POSITION IS THE ANSWER and `onPick` must hand back
 * `String(index)`. Hand back a letter and every verbal item is marked wrong, confidently and without
 * an error anywhere. `prove-marking.mjs` in this directory exists to catch exactly that.
 *
 * WHY THE OPTIONS ARE DRAWN AS ROWS. An option here is not a thing, it is an ARRANGEMENT of the same
 * things. So each one is drawn as a small row of the same slabs in that option's order, and the child
 * picks the row that reads correctly. Nothing else can present an ordering honestly: a single tile per
 * option would be a label for an ordering rather than the ordering itself.
 *
 * NO READING IS REQUIRED. Each event carries a pictogram keyword-matched from its sentence
 * (`eventMeaning.ts` for the matching and why it also needs a state axis, `EventGlyph.tsx` for the
 * drawings), and each event keeps ONE colour across every row so a child can track it even where the
 * picture is only an approximation. Hovering or tapping a slab speaks its sentence, and the whole
 * thing works in silence when speech is unavailable.
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
function Log({ w, h }: { w: number; h: number }) {
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
      {/* Growth rings at each sawn end: this is what makes it a log rather than a beam. */}
      {[-w / 2 + 0.02, w / 2 - 0.02].map((x, i) => (
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

  // Nothing should still be talking when the next item arrives.
  useEffect(() => hushSpeech, []);

  const events = useMemo<EventCell[]>(() => {
    const raw = Array.isArray(content.events) ? (content.events as Record<string, unknown>[]) : [];
    return raw.map((e, i) => {
      const text = typeof e?.text === 'string' ? e.text : '';
      return { text, mark: glyphFor(text), hue: hueFor(i) };
    });
  }, [content]);

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

  const pickedOrder = picked === null ? null : (options.find((o) => o.index === picked)?.order ?? null);

  /** One row of slabs in a given order, reused by the option rows and by the filled groove. */
  const renderRow = (order: readonly number[], scale: number) => (
    <group scale={scale}>
      {order.map((eventIndex, slot) => {
        const cell = events[eventIndex];
        if (!cell) return null;
        return (
          <group key={slot} position={[(slot - (order.length - 1) / 2) * slabPitch, 0, 0]}>
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
        <Log w={rowW + 0.7} h={logH} />
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
              onPointerOver={() => setHover(o.index)}
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

            {renderRow(o.order, lit ? 1.04 : 1)}

            {/* Per-slab hit volumes, in front and tiled edge to edge so there is no gap to fall
                through. These are what say the sentence out loud; a tap on one still picks the row,
                because a child who has decided has decided and should not have to aim twice. */}
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
                    speak(cell.text);
                  }}
                  onPointerOut={(e) => {
                    e.stopPropagation();
                    setHover((h) => (h === o.index ? null : h));
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    speak(cell.text);
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
