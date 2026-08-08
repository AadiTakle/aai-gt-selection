import { rampTo } from './bus';
import { noiseBuffer } from './noise';

/**
 * THE SUCTION LOOP. The sound a child hears more than any other in this game, so the whole design is
 * about being bearable for a long time rather than about being convincing for a second.
 *
 * ══ WHY IT IS AIR AND NOT A MOTOR ═════════════════════════════════════════════════════════════════
 *
 * The obvious vacuum sound is a whine: a sawtooth or a narrow resonant peak somewhere around 1–2 kHz.
 * It is instantly recognisable and it is intolerable after four seconds, because a steady narrow-band
 * tone in the region the ear is most sensitive to is the definition of fatiguing. So the balance here is
 * inverted from the obvious one:
 *
 *   · PINK NOISE THROUGH A LOWPASS is 90 % of it. Pink because that is the spectrum of actual moving air
 *     (see `noise.ts`), lowpassed at 1.05 kHz because everything above that is hiss and hiss is the part
 *     that tires you out. Plus a wide bandpass at 520 Hz for the "rush" and a brown-noise bed at 150 Hz
 *     for the mass, so the machine has a size.
 *   · THE MOTOR IS TWO TRIANGLES AT 68 AND 102 Hz, mixed at a tenth, lowpassed to 260 Hz. Low enough to
 *     be felt as "something is running" rather than heard as a pitch, and a perfect fifth apart so that
 *     if it is heard it is not a beating dissonance.
 *   · A 0.55 Hz BREATH LFO adds ±6 % to the level. Nothing mechanical is perfectly steady, and a level
 *     that is perfectly steady is the other thing that makes a held sound turn into tinnitus.
 *
 * ══ WHY IT CANNOT CLICK ══════════════════════════════════════════════════════════════════════════
 *
 * TWO RULES, both structural rather than careful:
 *
 *   1. NOTHING IS EVER STARTED OR STOPPED DURING PLAY. Every source in here is started once, at
 *      construction, with the output gain at zero, and runs until `dispose`. `start` and `stop` only move
 *      a gain. A `BufferSource.stop()` mid-stream cuts the waveform wherever it happens to be, which is a
 *      step discontinuity, which is a click — and it is the single most common way this sound is got wrong.
 *   2. EVERY MOVE GOES THROUGH `rampTo`, which holds the parameter's live value before ramping (see the
 *      note on it in `bus.ts`). So a stop that interrupts a still-rising start ramps down from wherever it
 *      had got to, rather than jumping back to where the start began.
 *
 * The measured proof is in `measure.ts`: the first and last 64-sample windows of an offline render are
 * below −80 dB and no adjacent window's RMS changes by more than a few per cent.
 *
 * ══ "RISES SLIGHTLY WHILE HOLDING" ════════════════════════════════════════════════════════════════
 *
 * Baked into `start` rather than exposed as a third method, so it cannot be forgotten by a caller: the
 * level reaches its base in 90 ms and then creeps up 22 % over the following 1.3 s while the lowpass opens
 * from 1.05 to 1.5 kHz and the motor pitch rises 5 %. It reads as the pack working harder against
 * something. An interrupting `stop` cancels all three, because they are all `rampTo`.
 */

export interface Vacuum {
  /** Begin, or continue, drawing. Idempotent: calling it twice does not stack. */
  start(at: number): void;
  /** Stop cleanly. 160 ms of ramp; nothing is torn down. */
  stop(at: number): void;
  dispose(): void;
}

/** Where the level settles after the initial ramp, before the hold creep. */
const BASE = 0.19;
/** How much louder it gets while held. */
const HELD = BASE * 1.22;
const IN_SECONDS = 0.09;
const OUT_SECONDS = 0.16;
const CREEP_SECONDS = 1.3;

const AIR_CLOSED = 1050;
const AIR_OPEN = 1500;
const MOTOR_HZ = 68;

export function createVacuum(ctx: BaseAudioContext, out: AudioNode): Vacuum {
  const level = ctx.createGain();
  level.gain.value = 0;
  level.connect(out);

  /**
   * The breath rides here, one stage BEFORE the level, and that ordering is load-bearing.
   *
   * The obvious thing is to add the LFO straight onto `level.gain`, which an AudioParam happily sums. It
   * is wrong: a param's input is summed whether or not the scheduled value is zero, so a stopped vacuum
   * would still leak ±1 % of pink noise forever — audible in a quiet room, and it would put a permanent
   * floor under the "silent at rest" measurement. As a multiplicative stage in front of the gate, the
   * wobble is 0.94–1.06 of whatever the gate is passing, and zero times anything is zero.
   */
  const wobble = ctx.createGain();
  wobble.gain.value = 1;
  wobble.connect(level);

  /* --- the air ------------------------------------------------------------------------------- */

  const air = ctx.createBufferSource();
  // Four seconds, so the loop point comes round rarely, and pink noise has no features for the ear to
  // latch onto anyway — which is what "must not loop audibly" means for a noise bed.
  air.buffer = noiseBuffer(ctx, 'pink', 4);
  air.loop = true;

  const airLow = ctx.createBiquadFilter();
  airLow.type = 'lowpass';
  airLow.frequency.value = AIR_CLOSED;
  airLow.Q.value = 0.6;

  const airGain = ctx.createGain();
  airGain.gain.value = 0.85;

  const rush = ctx.createBiquadFilter();
  rush.type = 'bandpass';
  rush.frequency.value = 520;
  // Wide on purpose. A high Q here is exactly the whine this design is avoiding.
  rush.Q.value = 0.9;

  const rushGain = ctx.createGain();
  rushGain.gain.value = 0.4;

  air.connect(airLow);
  airLow.connect(airGain);
  airGain.connect(wobble);
  air.connect(rush);
  rush.connect(rushGain);
  rushGain.connect(wobble);

  /* --- the mass ------------------------------------------------------------------------------ */

  const rumble = ctx.createBufferSource();
  rumble.buffer = noiseBuffer(ctx, 'brown', 4);
  rumble.loop = true;

  const rumbleLow = ctx.createBiquadFilter();
  rumbleLow.type = 'lowpass';
  rumbleLow.frequency.value = 150;
  rumbleLow.Q.value = 0.7;

  const rumbleGain = ctx.createGain();
  rumbleGain.gain.value = 0.5;

  rumble.connect(rumbleLow);
  rumbleLow.connect(rumbleGain);
  rumbleGain.connect(wobble);

  /* --- the motor, quiet ---------------------------------------------------------------------- */

  const motorLow = ctx.createBiquadFilter();
  motorLow.type = 'lowpass';
  motorLow.frequency.value = 260;
  motorLow.Q.value = 0.5;

  const motorGain = ctx.createGain();
  motorGain.gain.value = 0.1;
  motorLow.connect(motorGain);
  motorGain.connect(wobble);

  const motorA = ctx.createOscillator();
  motorA.type = 'triangle';
  motorA.frequency.value = MOTOR_HZ;
  motorA.connect(motorLow);

  const motorB = ctx.createOscillator();
  motorB.type = 'triangle';
  motorB.frequency.value = MOTOR_HZ * 1.5;
  const motorBGain = ctx.createGain();
  motorBGain.gain.value = 0.45;
  motorB.connect(motorBGain);
  motorBGain.connect(motorLow);

  /* --- the breath ---------------------------------------------------------------------------- */

  const breath = ctx.createOscillator();
  breath.type = 'sine';
  breath.frequency.value = 0.55;
  const breathDepth = ctx.createGain();
  breathDepth.gain.value = 0.06;
  breath.connect(breathDepth);
  breathDepth.connect(wobble.gain);

  // Everything starts now and never stops. See rule 1 above.
  const startAt = ctx.currentTime;
  air.start(startAt);
  rumble.start(startAt);
  motorA.start(startAt);
  motorB.start(startAt);
  breath.start(startAt);

  let running = false;
  let disposed = false;

  const nodes: AudioNode[] = [
    level, wobble, air, airLow, airGain, rush, rushGain, rumble, rumbleLow, rumbleGain,
    motorLow, motorGain, motorA, motorB, motorBGain, breath, breathDepth,
  ];

  return {
    start(at) {
      if (disposed || running) return;
      running = true;
      rampTo(level.gain, at, BASE, IN_SECONDS);
      // The hold creep. Scheduled as a second ramp from the end of the first, so there is one continuous
      // curve from silence to held level with no scheduling gap in the middle.
      level.gain.linearRampToValueAtTime(HELD, at + IN_SECONDS + CREEP_SECONDS);
      rampTo(airLow.frequency, at, AIR_CLOSED, IN_SECONDS);
      airLow.frequency.linearRampToValueAtTime(AIR_OPEN, at + IN_SECONDS + CREEP_SECONDS);
      rampTo(motorA.frequency, at, MOTOR_HZ, IN_SECONDS);
      motorA.frequency.linearRampToValueAtTime(MOTOR_HZ * 1.05, at + IN_SECONDS + CREEP_SECONDS);
    },
    stop(at) {
      if (disposed || !running) return;
      running = false;
      rampTo(level.gain, at, 0, OUT_SECONDS);
      rampTo(airLow.frequency, at, AIR_CLOSED, OUT_SECONDS * 2);
      rampTo(motorA.frequency, at, MOTOR_HZ, OUT_SECONDS * 2);
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      running = false;
      const now = ctx.currentTime;
      for (const source of [air, rumble, motorA, motorB, breath]) {
        try {
          source.stop(now);
        } catch {
          // Already stopped, or a context that is going away underneath us. Teardown cannot fail.
        }
      }
      for (const n of nodes) {
        try {
          n.disconnect();
        } catch {
          // As above.
        }
      }
    },
  };
}
