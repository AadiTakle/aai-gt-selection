import { rampTo } from './bus';
import { noiseBuffer } from './noise';
import { seededRand, type Rand } from './variation';
import { controlBuffer, resonantGrains, wetComb } from './wet';

/**
 * THE SUCTION LOOP. The sound a child hears more than any other in this game, so the whole design is
 * about being bearable for a long time rather than about being convincing for a second.
 *
 * ══ THE MOTOR IS GONE, AND IT WAS THE PROBLEM ═════════════════════════════════════════════════════
 *
 * This used to contain "the motor": TWO TRIANGLE OSCILLATORS at 68 and 102 Hz, a perfect fifth apart,
 * lowpassed to 260 Hz and mixed at a tenth. The reasoning at the time was that it gave the pack a size and
 * that it was too low to be heard as a pitch. Both halves were wrong.
 *
 * A motor is the wrong metaphor from the first line. Nothing about a slime being drawn up a tube is a machine
 * with a rotor: there is no rotation, no blade rate, no bearing. What is actually happening is TURBULENT AIR
 * with wet material intermittently obstructing it, and turbulence has no fundamental. And two oscillators a
 * fifth apart at 68 Hz are not inaudible as pitch — 68 Hz is a low C♯ and it beats against nothing, so the
 * ear locks onto it as the steadiest thing in the mix and hears a tone under everything. That is exactly the
 * "mechanic" quality the owner heard. THERE IS NOW NO OSCILLATOR OF ANY KIND IN THIS FILE.
 *
 * ══ WHAT IT IS MADE OF INSTEAD ════════════════════════════════════════════════════════════════════
 *
 *   · TURBULENT FLUTTERING AIR, and it is BRIGHT: pink noise (the spectrum of actual moving air) lowpassed at
 *     2.6 kHz rather than the 1.05 kHz it began at, with both its level and its cutoff driven by SLOW RANDOM
 *     CONTROL SIGNALS rather than sitting still. That flutter is what replaces the motor's job of saying
 *     "something is happening": an unsteady rush reads as work being done, a steady one reads as a hiss.
 *   · A MODEST LOW BED, brown noise through a wide bandpass at a wandering 190 Hz, mixed at 0.3. It supplies
 *     the presence the motor used to and nothing more — filtered noise has mass without a fundamental. It was
 *     twice this level, which made the pack sound like a shop vacuum rather than a handheld device.
 *   · A HINT OF MECHANISM AT 2.9 kHz, broad and constantly wandering. The vacpack IS a machine and should read
 *     as equipment; the original's mistake was putting that suggestion at 68 Hz, where low plus tonal plus
 *     steady is the exact recipe for "engine". High and unstable reads as airflow through a turbine.
 *   · A GLOOP TRACK: fifteen seconds of sparse, irregularly spaced wet resonances, looping. This is the
 *     material moving through, and see below for why it is a buffer rather than scheduled events.
 *   · A COMB BANK on the air, delays 1.2–4.9 ms, low feedback and continuously drifting. Short delays put the
 *     comb's peaks up around 200–800 Hz, which is hollowness; at 12 ms they sat at 83 Hz, which is gurgling,
 *     and low gurgling is what tips "wet" over into visceral.
 *   · FINE HIGH SPRAY, very quiet, level-modulated by its own random control: moisture up top.
 *
 * Every modulator in here is a random control signal, never a sine LFO. A sine LFO is a steady wobble, and a
 * steady wobble on a held sound is simply a slower machine — the ear finds the rate within about two cycles.
 *
 * ══ WHY THE GLOOPS ARE BAKED INTO A LOOPING BUFFER ════════════════════════════════════════════════
 *
 * The obvious way to get occasional gloops is to schedule a one-shot every few hundred milliseconds while
 * the button is held. That is forbidden here, and for a good reason rather than a stylistic one: the standing
 * guarantee in this file is that NO SOURCE IS EVER STARTED OR STOPPED DURING PLAY, because a `stop()`
 * mid-stream cuts the waveform wherever it happens to be, which is a step, which is a click — and it is the
 * single most common way this sound is got wrong.
 *
 * So the gloops are pre-synthesised into a fifteen-second buffer at irregular spacings, started once at
 * construction with everything else, and looped forever. Nothing is ever scheduled; the gate simply lets
 * through whatever is passing at the time. Fifteen seconds at roughly two gloops a second is long enough
 * that a child holding the button will not hear the pattern come round.
 *
 * ══ WHY IT CANNOT CLICK ══════════════════════════════════════════════════════════════════════════
 *
 * BOTH RULES ARE UNCHANGED, and both are structural rather than careful:
 *
 *   1. NOTHING IS EVER STARTED OR STOPPED DURING PLAY. Every source in here — the air, the bed, the gloop
 *      track, the burble, the spray and every control signal — is started once, at construction, with the gain
 *      at zero, and runs until `dispose`. `start` and `stop` only move a gain.
 *   2. EVERY MOVE GOES THROUGH `rampTo`, which holds the parameter's live value before ramping (see the note
 *      on it in `bus.ts`). So a stop that interrupts a still-rising start ramps down from wherever it had got
 *      to, rather than jumping back to where the start began.
 *
 * There is a third thing the random modulators could have broken and do not: a looping control buffer whose
 * last sample differs from its first has a step at the loop point, once per lap, forever. `controlBuffer` in
 * `wet.ts` detrends its contents so the join is continuous. That bug would have surfaced as a click every few
 * minutes with no way to reproduce it.
 *
 * The measured proof is in `measure.ts`: the first and last 64-sample windows of an offline render are below
 * −80 dB, and the largest sample step across either ramp is no larger than the sound's own steady-state slew.
 *
 * ══ "RISES SLIGHTLY WHILE HOLDING" ════════════════════════════════════════════════════════════════
 *
 * Baked into `start` rather than exposed as a third method, so it cannot be forgotten by a caller: the level
 * reaches its base in 90 ms and then creeps up 22 % over the following 1.3 s while the lowpass opens from
 * 2.6 to 3.8 kHz and the low bed's resonance rises a little. It reads as the pack working harder against
 * something. An interrupting `stop` cancels all of it, because it is all `rampTo`.
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

const AIR_CLOSED = 2600;
const AIR_OPEN = 3800;
/** The low bed's resonance. Where the motor used to be, with no pitch in it. */
const BED_HZ = 190;

/**
 * A looping random control source in a stated frequency band.
 *
 * `corner` is the top of the band in Hz — 0.7 is breathing, 6 is wandering, 14 is flutter — and `depth` is
 * how far it swings its target. Twelve seconds at playback rate 1.0: long enough that the lap is not a
 * pattern the ear can hold on to.
 */
function control(ctx: BaseAudioContext, corner: number, depth: number, rand: Rand): {
  source: AudioBufferSourceNode;
  depth: GainNode;
} {
  const source = ctx.createBufferSource();
  source.buffer = controlBuffer(ctx, 12, corner, rand);
  source.loop = true;
  const g = ctx.createGain();
  g.gain.value = depth;
  source.connect(g);
  return { source, depth: g };
}

export function createVacuum(ctx: BaseAudioContext, out: AudioNode): Vacuum {
  // Seeded rather than `Math.random`, for the same reason `noise.ts` is: the offline measurements in
  // `measure.ts` have to be reproducible, and a flutter that differs between renders would make the
  // discontinuity test's numbers wander on their own.
  const rand = seededRand(0x5c0f7ab1);

  const level = ctx.createGain();
  level.gain.value = 0;
  level.connect(out);

  /**
   * The flutter rides here, one stage BEFORE the level, and that ordering is load-bearing.
   *
   * The obvious thing is to add the modulation straight onto `level.gain`, which an AudioParam happily sums.
   * It is wrong: a param's input is summed whether or not the scheduled value is zero, so a stopped vacuum
   * would still leak a percent or two of pink noise forever — audible in a quiet room, and it would put a
   * permanent floor under the "silent at rest" measurement. As a multiplicative stage in front of the gate,
   * the wobble is a factor on whatever the gate is passing, and zero times anything is zero.
   */
  const wobble = ctx.createGain();
  wobble.gain.value = 1;
  wobble.connect(level);

  /* --- the turbulent air ---------------------------------------------------------------------- */

  const air = ctx.createBufferSource();
  // Four seconds, so the loop point comes round rarely, and pink noise has no features for the ear to
  // latch onto anyway — which is what "must not loop audibly" means for a noise bed.
  air.buffer = noiseBuffer(ctx, 'pink', 4);
  air.loop = true;

  const airLow = ctx.createBiquadFilter();
  airLow.type = 'lowpass';
  airLow.frequency.value = AIR_CLOSED;
  airLow.Q.value = 0.6;

  /**
   * THE AIR IS NO LONGER THE WHOLE SOUND, and that reweighting is the difference between a vacuum cleaner and
   * a wet vacuum cleaner. At 0.8 the smooth pink bed simply masked everything textured that was put under it:
   * the gloops and the burble measured as present in the graph and inaudible in the render, which is the most
   * expensive kind of wrong — it looks finished. Air is a bed here, not the subject.
   */
  const airGain = ctx.createGain();
  airGain.gain.value = 0.44;

  // The rush, wide on purpose: a high Q here is the whine this design exists to avoid.
  const rush = ctx.createBiquadFilter();
  rush.type = 'bandpass';
  rush.frequency.value = 1400;
  rush.Q.value = 0.9;

  const rushGain = ctx.createGain();
  rushGain.gain.value = 0.3;

  /* --- the gurgle: a drifting comb on the air ------------------------------------------------- */

  const comb = wetComb(ctx, {
    // Mutually inharmonic, and low feedback. Over a sound held for ten seconds a resonant comb would be
    // found by the ear and heard as a note, which is the failure mode the triangles just got removed for.
    delaysMs: [1.2, 2.1, 3.3, 4.9],
    feedback: 0.3,
    damp: 4200,
    wet: 0.32,
    dry: 1,
  });
  comb.output.connect(wobble);

  air.connect(airLow);
  airLow.connect(airGain);
  airGain.connect(comb.input);
  air.connect(rush);
  rush.connect(rushGain);
  rushGain.connect(comb.input);

  /* --- the low bed: body and presence, where the motor was ------------------------------------ */

  const bed = ctx.createBufferSource();
  bed.buffer = noiseBuffer(ctx, 'brown', 4);
  bed.loop = true;

  // A bandpass rather than the old lowpass, so there is a definite low centre of mass — the thing the motor
  // was actually contributing — without a fundamental to hear. Q is low: this is a region, not a note.
  const bedBand = ctx.createBiquadFilter();
  bedBand.type = 'bandpass';
  bedBand.frequency.value = BED_HZ;
  bedBand.Q.value = 1.1;

  const bedGain = ctx.createGain();
  bedGain.gain.value = 0.3;

  bed.connect(bedBand);
  bedBand.connect(bedGain);
  bedGain.connect(wobble);

  /* --- the gloop track: material moving through ---------------------------------------------- */

  /**
   * GRAIN LENGTH IS WHAT MAKES A GLOOP AN EVENT, and the first version of this got it wrong in a way worth
   * recording. The grains were 22–70 ms long with a slow ring (`damp` 5), which sounds reasonable written
   * down — a gloop is not a click — but a long grain with a soft ring has almost no ATTACK, and an event with
   * no attack does not register as an arrival at all. Measured, the whole track produced zero detectable
   * onsets: it was adding a vague wetness to the bed rather than the "occasional gloops as material moves
   * through" it was supposed to be. Shorter grains with a faster decay have the same pitch content and
   * actually arrive.
   */
  const gloop = ctx.createBufferSource();
  gloop.buffer = resonantGrains(
    ctx,
    {
      seconds: 15,
      count: 46,
      // Wet and mid-low, and a wide span of sizes so no two gloops are the same object going past.
      fLo: 500,
      fHi: 1900,
      bw: 85,
      // Flat: these are not decaying, they are events in a continuing process.
      ampTilt: 0,
      gapTilt: 0,
      grainLoMs: 9,
      grainHiMs: 34,
      glide: 1.18,
      damp: 7,
    },
    rand,
  );
  gloop.loop = true;

  // Softened, because a gloop is a detail and not an event the child has to react to. Through the comb, so
  // the gloops are in the same tube as the air rather than beside it.
  const gloopLow = ctx.createBiquadFilter();
  gloopLow.type = 'lowpass';
  gloopLow.frequency.value = 3600;
  gloopLow.Q.value = 0.5;

  const gloopGain = ctx.createGain();
  gloopGain.gain.value = 0.88;

  gloop.connect(gloopLow);
  gloopLow.connect(gloopGain);
  gloopGain.connect(comb.input);

  /* --- the burble: the air's own micro-texture ------------------------------------------------ */

  /**
   * WHAT ACTUALLY MAKES THE HELD SOUND WET rather than merely soft, and the layer the first attempt was
   * missing entirely.
   *
   * Flutter LFOs move the whole bed up and down, and that is worth having — it is why the sound is alive
   * instead of a hiss — but all of it happens below about 14 Hz, which the ear reads as the sound BREATHING.
   * It does not read as wet. Wetness at close range is a continuous fine crackle of tiny air pockets giving
   * way, which is dozens of tiny events per second, and no amount of level modulation produces one.
   *
   * So this is a second looping grain track: short, soft resonances scattered by the same shifted-exponential
   * distribution as everything else.
   *
   * THE DENSITY IS A TUNED COMPROMISE AND IT WAS TUNED THE WRONG WAY FIRST. The initial version ran 460 grains
   * over fifteen seconds — thirty a second — on the theory that more texture is more wetness. It is not: at
   * thirty a second the events overlap into an unbroken fizz, which reads as noise colour rather than as
   * things happening, and measured as literally zero detectable onsets because a texture with no gaps has no
   * arrivals in it. Roughly a dozen a second leaves audible space between events, which is where the wetness
   * actually lives — the silence between two bubbles is as much of the cue as the bubbles.
   */
  const burble = ctx.createBufferSource();
  burble.buffer = resonantGrains(
    ctx,
    {
      seconds: 15,
      count: 170,
      fLo: 900,
      fHi: 3600,
      bw: 340,
      ampTilt: 0,
      gapTilt: 0,
      grainLoMs: 3,
      grainHiMs: 14,
      glide: 0.88,
      damp: 10,
    },
    rand,
  );
  burble.loop = true;

  const burbleGain = ctx.createGain();
  burbleGain.gain.value = 0.78;

  burble.connect(burbleGain);
  burbleGain.connect(comb.input);

  /* --- the hint of mechanism, high and unstable ------------------------------------------------ */

  /**
   * THE VACPACK IS A PIECE OF TECHNOLOGY, so "no machine at all" was too strong a rule. It should read as
   * equipment. The mistake in the original was never that it had a mechanical component — it was WHERE that
   * component sat: two oscillators at 68 and 102 Hz, and LOW plus TONAL plus STEADY is precisely the
   * combination the ear labels "engine".
   *
   * The same suggestion put up at 2.9 kHz reads completely differently — as airflow through a turbine, which is
   * what a suction device actually sounds like. Three things keep it from becoming a whine:
   *
   *   · IT IS NOISE, not an oscillator. A resonant peak on noise has a centre without having a frequency.
   *   · Q IS 2.4, which is a broad hump rather than a line. A high Q at 3 kHz is the single most fatiguing
   *     thing that could be put in a sound a child holds down for ten seconds at a time.
   *   · ITS CENTRE NEVER STOPS MOVING, driven by its own random control at ±600 Hz. A steady resonance is
   *     found by the ear within a couple of seconds; one that wanders is heard as turbulence.
   */
  const whine = ctx.createBiquadFilter();
  whine.type = 'bandpass';
  whine.frequency.value = 2900;
  whine.Q.value = 2.4;

  const whineGain = ctx.createGain();
  whineGain.gain.value = 0.17;

  air.connect(whine);
  whine.connect(whineGain);
  whineGain.connect(wobble);

  /* --- fine high spray ------------------------------------------------------------------------ */

  const spray = ctx.createBufferSource();
  spray.buffer = noiseBuffer(ctx, 'pink', 4);
  spray.loop = true;

  const sprayHigh = ctx.createBiquadFilter();
  sprayHigh.type = 'highpass';
  sprayHigh.frequency.value = 4200;
  sprayHigh.Q.value = 0.5;

  // Very quiet. Moisture up top is a cue, and a cue that is audible as a layer is hiss — which is the thing
  // that makes a held sound tiring.
  const sprayGain = ctx.createGain();
  sprayGain.gain.value = 0.055;

  spray.connect(sprayHigh);
  sprayHigh.connect(sprayGain);
  sprayGain.connect(wobble);

  /* --- the modulators, all random, none of them an oscillator --------------------------------- */

  // The breath: ±7 % on the whole thing, multiplicatively, in front of the gate.
  const breath = control(ctx, 0.7, 0.07, rand);
  breath.depth.connect(wobble.gain);

  // The flutter proper: the air's own level, moving faster and deeper than the breath. This is what turns a
  // rush into turbulence. 14 Hz is the top of the band, so it swings anywhere from a slow surge to a shudder.
  const flutter = control(ctx, 14, 0.34, rand);
  flutter.depth.connect(airGain.gain);

  // The air's cutoff wanders a few hundred Hz, so the flutter has a timbre change in it and not only a level
  // change. Level-only modulation reads as a hand over the speaker.
  const airWander = control(ctx, 6, 280, rand);
  airWander.depth.connect(airLow.frequency);

  // And the low bed's resonance drifts, so even the body has nothing fixed in it.
  const bedWander = control(ctx, 2, 22, rand);
  bedWander.depth.connect(bedBand.frequency);

  // The spray breathes on its own schedule. Modulators sharing a band would sync into one pulse.
  const sprayWander = control(ctx, 10, 0.032, rand);
  sprayWander.depth.connect(sprayGain.gain);

  // The turbine hump wanders ±600 Hz around 2.9 kHz, faster than anything else in here. This is the modulator
  // that keeps the one deliberately resonant layer from ever settling into a note.
  const whineWander = control(ctx, 8, 600, rand);
  whineWander.depth.connect(whine.frequency);

  // Each comb tap drifts independently and slowly. Identical drift would move the whole comb together and
  // preserve the ratios between its peaks, and the ratios are what read as a pitch.
  const combWanders = comb.delays.map((delay, i) => {
    const base = delay.delayTime.value;
    const c = control(ctx, 1.2 + i * 0.4, base * 0.22, rand);
    c.depth.connect(delay.delayTime);
    return c;
  });

  const controls = [breath, flutter, airWander, bedWander, sprayWander, whineWander, ...combWanders];

  // Everything starts now and never stops. See rule 1 above.
  const startAt = ctx.currentTime;
  const sources: AudioBufferSourceNode[] = [
    air, bed, gloop, burble, spray, ...controls.map((c) => c.source),
  ];
  for (const source of sources) source.start(startAt);

  let running = false;
  let disposed = false;

  const nodes: AudioNode[] = [
    level, wobble, air, airLow, airGain, rush, rushGain, bed, bedBand, bedGain,
    gloop, gloopLow, gloopGain, burble, burbleGain, whine, whineGain, spray, sprayHigh, sprayGain,
    ...comb.nodes,
    ...controls.flatMap((c) => [c.source, c.depth]),
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
      rampTo(bedBand.frequency, at, BED_HZ, IN_SECONDS);
      bedBand.frequency.linearRampToValueAtTime(BED_HZ * 1.06, at + IN_SECONDS + CREEP_SECONDS);
    },
    stop(at) {
      if (disposed || !running) return;
      running = false;
      rampTo(level.gain, at, 0, OUT_SECONDS);
      rampTo(airLow.frequency, at, AIR_CLOSED, OUT_SECONDS * 2);
      rampTo(bedBand.frequency, at, BED_HZ, OUT_SECONDS * 2);
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      running = false;
      const now = ctx.currentTime;
      for (const source of sources) {
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
