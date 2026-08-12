import { noiseBuffer } from './noise';
import { createChooser, jitter, type Rand } from './variation';
import { resonantGrains, wetComb, wobbleRamp, type CombSpec, type GrainSpec } from './wet';

/**
 * THE ONE-SHOTS. Squish, land, plop, and the two optional rewards.
 *
 * ══ WHAT WAS WRONG, AND IT WAS NOT A MATTER OF TASTE ══════════════════════════════════════════════
 *
 * The previous version of each slime sound was ONE SMOOTH GESTURE: a noise burst under an exponential
 * envelope, a bandpass sweeping cleanly from one frequency to another, and — the actual giveaway — A SINE
 * OSCILLATOR BENDING IN PITCH underneath it, called "the body". Every part of that is a synthesiser. The
 * sine is a tone, the sweep is a filter the ear can hear being turned, and the envelope is smooth, so the
 * whole thing arrives as a single continuous event.
 *
 * That is measurable, and it was measured. The old squish contained FOUR detectable micro-events; the old
 * plop contained three, spaced so evenly that the coefficient of variation of their gaps was 0.06 — a
 * metronome scores 0. Nothing wet has ever done that. Real squelches are a CROWD: dozens of small collapses
 * at uneven sizes and uneven spacings, because that is physically what they are — bubbles giving way and
 * pockets of air escaping, none of them synchronised with any other.
 *
 * ══ WHAT A SQUELCH IS MADE OF NOW ═════════════════════════════════════════════════════════════════
 *
 * Five layers, no oscillators anywhere, and the first one is the one that does the work:
 *
 *   1. A GRAIN CLUSTER for the attack. Dozens of micro-events, each a short noise excitation ringing in its
 *      own resonator at its own frequency, at gaps drawn from a shifted exponential distribution. This is
 *      the squelch. See `resonantGrains` in `wet.ts` for why the distribution matters more than the timbre.
 *   2. A CAVITY: three bandpassed copies of a noise burst, at inharmonic ratios, whose centre frequencies
 *      TRAVEL in uneven wobbling steps rather than gliding. Three resonances rather than one, because one
 *      moving bandpass reads as a filter being swept and three read as a space changing shape. This is what
 *      gives the "gloop" pitch impression with no pitch in it — resonance instead of an oscillator.
 *   3. A SECOND GRAIN CLUSTER afterwards: the bubbles. Longer, gloopier (narrow resonator bandwidths ring),
 *      DECELERATING, so the sound thins out and closes instead of stopping.
 *   4. A PITCHLESS LOW THUD: noise through a lowpass that collapses from a few hundred Hz to under 100 in
 *      about 15 ms. A fast collapse of a filter has the weight of a low note and none of the pitch. The 95 Hz
 *      sine that used to do this job was audibly a note.
 *   5. FINE SPRAY above about 4 kHz: a sparse cluster of very short, very quiet high resonances. Moisture is
 *      largely a high-frequency cue and the old sounds were too dark to have any — the bus lowpass has been
 *      opened from 6.8 to 9.2 kHz to let it through. Quiet enough to be felt rather than heard.
 *
 * All of 1, 2 and 3 then go through A COMB FILTER BANK — short delays with feedback, 1 to 6 ms. That is the
 * hollowness of liquid in a container. The thud and the spray bypass it: combing the low end muddies it, and
 * combing the spray turns moisture into a flanger.
 *
 * ══ THE REFERENCE, AND WHAT IT CHANGED ════════════════════════════════════════════════════════════
 *
 * The target character is Slime Rancher's. NOTHING WAS SAMPLED, RIPPED OR OBTAINED FROM IT — every sound here
 * is still synthesised from scratch out of noise buffers and filters, and the reference informed four numeric
 * decisions rather than supplying any audio. All four were things the first pass had backwards:
 *
 *   · REGISTER. A slime is a SMALL wet thing, and small wet things make HIGH sounds. This family used to live
 *     at 200 Hz to 1.6 kHz, which is the sound of a large volume of mud — and low-and-wet reads as sludge, or
 *     worse as bodily. Everything is up an octave and a half; the measured spectral centroid moved from about
 *     1.1–1.6 kHz to 2.4–2.9 kHz. Only a trace of low weight is kept.
 *   · DURATION. Interaction sounds in the reference are 80–220 ms with the wet detail inside the first 60. The
 *     first pass ran 300–400 ms of evolving tail, and a long evolving tail is precisely what makes a sound read
 *     as a synthesiser rather than as a thing that happened. Dry spans are now 85–145 ms.
 *   · CUTE, NOT GROSS. The slimes go "blop", never "shlurp". So: no long slurping, no low gurgling, and the
 *     comb delays came down from 12 ms (peaks at 83 Hz — a throat) to 2 ms (peaks near 500 Hz — a hollow).
 *     Wet and BOUNCY is the target; wet and visceral is a failure even though the words were "slimy, sticky".
 *   · ELASTICITY IS THE SIGNATURE. See `cavity.f2`: the resonance bends fast and then springs part of the way
 *     BACK, which is what a springy solid does and what mud does not.
 *
 * ══ THE THREE SOUNDS, IN A LINE EACH ══════════════════════════════════════════════════════════════
 *
 *   SQUISH  adhesion tearing loose — an ACCELERATING, SWELLING grain cluster, which is what unsticking sounds
 *           like — then the cavity stretches UP to 3.2 kHz and eases back, with a rising creature chirp over it.
 *   LAND    a blop: a dense bright splat, then the cavity drops to 1.15 kHz on impact and SPRINGS BACK UP as
 *           the jelly recovers. The physics only — no chirp, so the creature does not become a tic.
 *   PLOP    a bubble letting go. The shortest at about 85 ms, a POP rather than a sweep: the cavity collapses
 *           in 28 ms and rebounds, under a falling chirp that mirrors the squish's rising one.
 *
 * ══ NOT BECOMING IRRITATING ═══════════════════════════════════════════════════════════════════════
 *
 * These fire dozens of times in a sitting, and the anti-repeat machinery is unchanged in behaviour:
 *
 *   · Three TIMBRE VARIANTS per sound, drawn by `createChooser`, which cannot repeat consecutively. They are
 *     now expressed as scale factors over one documented base spec (`Scale`) rather than as three hand-typed
 *     tables, so a variant cannot drift out of agreement with the others by a typo.
 *   · Continuous JITTER on top: ±4 % on frequency, ±7 % on time, ±10 % on resonator bandwidth.
 *   · And the largest source of variation is now free and structural: EVERY GRAIN CLUSTER IS RE-SYNTHESISED
 *     PER FIRING from the live `rand`, so the actual arrangement of bubbles is different every single time.
 *     Two firings of the same variant are not the same waveform in any sample.
 *
 * ══ LIFETIME ═════════════════════════════════════════════════════════════════════════════════════
 *
 * Every voice hangs off its own `voiceOut` gain, which is the single edge into the bus. The comb's feedback
 * loops are given a quarter of a second of slack past the last envelope so their ring has died before
 * anything is detached — a comb cut off mid-ring is a click. The longest-lived source disconnects `voiceOut`
 * and the comb nodes, which detaches the whole subtree in one go.
 */

/** How a timbre variant differs from its base: everything is a multiplier, so a variant cannot be invalid. */
export interface Scale {
  /** All frequencies. */
  f: number;
  /** All durations. */
  t: number;
  /** All grain counts. */
  n: number;
  /** All resonator bandwidths. Lower rings more and gloops; higher is a wetter, ticklier texture. */
  bw: number;
}

/** A grain cluster placed at an offset with a level. */
export interface Layer {
  at: number;
  gain: number;
  grains: GrainSpec;
}

/** What one squelch is. Hz, seconds and linear gain throughout. */
export interface SquelchSpec {
  /** The attack: adhesion tearing, or a splat, or a pop. */
  tear: Layer;
  /** The travelling cavity — three resonances, no oscillator. */
  cavity: {
    gain: number;
    gain2: number;
    gain3: number;
    f0: number;
    f1: number;
    seconds: number;
    /**
     * THE ELASTIC RECOVERY, and the signature of jelly.
     *
     * What sells something springy is not the bend, it is the bend COMING BACK: a slime deforms fast under a
     * force and then relaxes part of the way to where it started, because it is elastic. So the resonance
     * travels f0 → f1 fast and then eases f1 → f2 over `seconds2`, with f2 set part of the way back. Landing
     * overshoots downward and rises again; being drawn in stretches up and settles.
     *
     * This is the one place the whole family could have been done with a pitch bend on an oscillator and must
     * not be. Zero to omit the recovery entirely.
     */
    f2: number;
    seconds2: number;
    /** How many uneven steps the travel is broken into. One step would be a glide. */
    segments: number;
    /** How far each step is allowed to miss its trend line. */
    wobble: number;
    q: number;
    /** Inharmonic on purpose: 2.0 and 3.0 would make the three resonances a harmonic series, i.e. a note. */
    ratio2: number;
    ratio3: number;
    attack: number;
    decay: number;
  };
  /** The spread of bubbles afterwards. */
  bubbles: Layer;
  /** Fine high-frequency wetness. */
  spray: Layer;
  /**
   * THE CREATURE, over the top of the physics. Null to omit.
   *
   * In the reference, picking a slime up plays the suction AND the slime's own small vocalisation, and that
   * layering is what makes it feel like moving a living thing rather than an object. It is a narrow-bandwidth
   * grain or two — a resonance narrow enough to ring reads as a little voice — with a strong `glide`, which is
   * the chirp's contour: rising when the creature is drawn in, falling when it is let go.
   *
   * Deliberately only on the pickup and the release, not on the landing. It fires twice per slime that way
   * rather than three times, which is the difference between a character and a tic.
   */
  chirp: Layer | null;
  /** Modest weight only: a lowpass collapsing, not a sine, and not a sub-bass thud. */
  thud: { gain: number; f0: number; f1: number; decay: number };
  /** The gurgle. */
  comb: CombSpec;
  /** How far the comb's delay times drift across the sound. A fixed comb becomes a pitch. */
  combDrift: number;
}

/**
 * An envelope on a fresh gain node. Attack is linear, decay is exponential.
 *
 * Exponential decay because that is what physical things do and because a linear fade to zero has an
 * audible corner at the end. It cannot reach zero, so it aims at a thousandth of the peak and the param
 * is then pinned to a hard zero one sample-block later — inaudible, and it guarantees the node contributes
 * exactly nothing after `at + attack + decay` rather than a hanging DC offset.
 */
function envelope(ctx: BaseAudioContext, at: number, peak: number, attack: number, decay: number): GainNode {
  const g = ctx.createGain();
  const a = Math.max(0.002, attack);
  const end = at + a + decay;
  g.gain.setValueAtTime(0.0001, at);
  g.gain.linearRampToValueAtTime(peak, at + a);
  g.gain.exponentialRampToValueAtTime(Math.max(0.00001, peak * 0.0008), end);
  g.gain.setValueAtTime(0, end + 0.005);
  return g;
}

/** A looping noise source reading from a random place in the buffer, so no two firings share samples. */
function burstSource(ctx: BaseAudioContext, at: number, end: number, rand: Rand): AudioBufferSourceNode {
  const src = ctx.createBufferSource();
  const buffer = noiseBuffer(ctx, 'white', 2);
  src.buffer = buffer;
  src.loop = true;
  src.start(at, rand() * (buffer.duration - 0.5));
  src.stop(end);
  return src;
}

/** Apply a variant's scale factors to a grain spec. Every field that has a unit gets scaled; tilts do not. */
function scaleGrains(base: GrainSpec, k: Scale): GrainSpec {
  return {
    ...base,
    seconds: base.seconds * k.t,
    count: Math.max(2, Math.round(base.count * k.n)),
    fLo: base.fLo * k.f,
    fHi: base.fHi * k.f,
    bw: base.bw * k.bw,
    grainLoMs: base.grainLoMs * k.t,
    grainHiMs: base.grainHiMs * k.t,
  };
}

/** One grain cluster, freshly synthesised, as a one-shot source at a level. */
function playGrains(
  ctx: BaseAudioContext,
  out: AudioNode,
  at: number,
  layer: Layer,
  k: Scale,
  rand: Rand,
): void {
  const src = ctx.createBufferSource();
  src.buffer = resonantGrains(ctx, scaleGrains(layer.grains, k), rand);
  const g = ctx.createGain();
  g.gain.value = layer.gain;
  src.connect(g);
  g.connect(out);
  src.start(at + layer.at * k.t);
  // A one-shot buffer ends on its own; disconnecting its own two nodes keeps the subtree from growing while
  // the comb behind it is still ringing.
  src.onended = () => {
    src.disconnect();
    g.disconnect();
  };
}

/**
 * OUTPUT TRIM PER SOUND, and the one set of numbers in this directory that was not reasoned out but measured.
 *
 * The gains inside a `SquelchSpec` are the internal balance of ONE squelch — how much cavity against how
 * many bubbles — and they are set by reasoning about what the sound is. What they cannot settle is the
 * balance BETWEEN the three sounds, because a cluster of thirty grains and a single filtered burst put out
 * very different total energy for the same nominal gain, and a narrow resonator bandwidth passes far less
 * than a wide one. So specs that look comparably loud are not.
 *
 * These three numbers close that gap and they came from `measure.ts`, not from an opinion. Re-run it after
 * changing any spec below.
 */
const TRIM = { squish: 1.5, land: 1.15, plop: 1.35 } as const;

function squelch(
  ctx: BaseAudioContext,
  out: AudioNode,
  at: number,
  spec: SquelchSpec,
  variant: Scale,
  rand: Rand,
  trim: number,
): void {
  const voiceOut = ctx.createGain();
  voiceOut.gain.value = trim;
  voiceOut.connect(out);

  // The variant's scale factors, with continuous jitter folded straight into them, so there is exactly one
  // set of multipliers in play rather than two applied at different depths.
  const k: Scale = {
    f: variant.f * jitter(rand, 0.04),
    t: variant.t * jitter(rand, 0.07),
    n: variant.n * jitter(rand, 0.12),
    bw: variant.bw * jitter(rand, 0.1),
  };

  const c = spec.cavity;
  const cavitySeconds = c.seconds * k.t;
  const cavityDecay = c.decay * k.t;

  // A grain cluster's buffer runs one whole grain past its nominal span — see the note in `resonantGrains` — so
  // a layer's real length has to include `grainHiMs`. Leaving it out would put `end` before the last grain had
  // finished and detach the subtree from underneath it, which is the click this pass is trying to remove.
  const layerEnd = (layer: Layer): number =>
    at + (layer.at + layer.grains.seconds + layer.grains.grainHiMs / 1000 + 0.01) * k.t;

  const tearEnd = layerEnd(spec.tear);
  const bubbleEnd = layerEnd(spec.bubbles);
  const sprayEnd = layerEnd(spec.spray);
  const chirpEnd = spec.chirp ? layerEnd(spec.chirp) : at;
  const cavityEnd = at + c.attack + cavityDecay;
  const thudEnd = at + 0.012 + spec.thud.decay * k.t;
  // 120 ms of slack past everything, for the comb's feedback to finish ringing — detaching a comb that is
  // still ringing is a step, and a step is a click. It was 260 ms when the combs were long and resonant; these
  // are short and lightly fed back, so they are inaudible within about 50 ms and the rest was dead air holding
  // the whole subtree alive.
  const end = Math.max(tearEnd, bubbleEnd, sprayEnd, chirpEnd, cavityEnd, thudEnd) + 0.12;

  /* --- the gurgle, which everything wet passes through ----------------------------------------- */

  const comb = wetComb(ctx, spec.comb);
  comb.output.connect(voiceOut);
  for (const delay of comb.delays) {
    const base = delay.delayTime.value;
    /**
     * Drifting, and each tap drifts by a different amount. Identical drift on every tap would move the whole
     * comb together, which preserves the ratios between its peaks — and the ratios are what read as a pitch.
     *
     * TWELVE SHALLOW SEGMENTS RATHER THAN FOUR DEEP ONES, and this is a click fix rather than a taste one.
     * A `DelayNode` whose `delayTime` is ramping is resampling its buffer, so the SLOPE of the ramp is a pitch
     * shift; at a segment boundary the slope changes instantly, and inside a feedback loop that lands as an
     * amplitude discontinuity. With four segments over ~90 ms the boundaries fell at roughly 23, 46, 69 and
     * 92 ms — and the sharpest arrivals left in the family sat on top of them, at full height, on the draws
     * where the slope change happened to be large. Same total drift, same wander, a third of the depth per
     * step and three times as many of them: the boundaries stop being events.
     */
    wobbleRamp(delay.delayTime, at, base, base * spec.combDrift * jitter(rand, 0.25), cavitySeconds * 2.2, 12, 0.05, rand);
  }

  /* --- 1: the attack cluster — adhesion, splat or pop ------------------------------------------ */

  playGrains(ctx, comb.input, at, spec.tear, k, rand);

  /* --- 2: the cavity — three travelling resonances over one noise burst ------------------------ */

  const noise = burstSource(ctx, at, end, rand);
  const cavityEnv = envelope(ctx, at, 1, c.attack, cavityDecay);
  cavityEnv.connect(comb.input);

  const ratios = [1, c.ratio2, c.ratio3] as const;
  const gains = [c.gain, c.gain2, c.gain3] as const;
  for (let i = 0; i < 3; i += 1) {
    const band = ctx.createBiquadFilter();
    band.type = 'bandpass';
    // The upper resonances are broader. A cavity's higher modes are always more damped than its fundamental,
    // and three equally narrow peaks sound like three filters rather than one space.
    band.Q.value = (c.q / (1 + i * 0.55)) * jitter(rand, 0.1);
    const bend = wobbleRamp(
      band.frequency,
      at,
      c.f0 * (ratios[i] as number) * k.f,
      c.f1 * (ratios[i] as number) * k.f,
      cavitySeconds,
      Math.round(c.segments),
      // The upper resonances wobble more, so the three do not move in lockstep. Lockstep is a filter bank.
      c.wobble * (1 + i * 0.4),
      rand,
    );
    /**
     * The elastic recovery: having deformed, it springs part of the way back.
     *
     * CHAINED FROM WHERE THE FIRST BEND ACTUALLY ENDED, which is not where it was aimed. This used to start at
     * `at + cavitySeconds` from `c.f1`, and both were wrong by a little: the wobble leaves the parameter up to
     * 16 % off `f1`, and the jittered segment boundaries can leave the first ramp still running. The opening
     * `setValueAtTime` therefore STEPPED the bandpass centre, and a step in a filter's centre frequency is a
     * step in its output.
     *
     * It measured as a 2.4–2.9 ms arrival at full height in the middle of every squelch, on every variant —
     * the last hard edge in the family and the least visible of them, because nothing in the spec mentions it.
     * It is not a wrong number anywhere; it is a property of how two individually correct calls meet.
     */
    if (c.f2 > 0) {
      wobbleRamp(
        band.frequency,
        bend.endTime,
        bend.endValue,
        c.f2 * (ratios[i] as number) * k.f,
        c.seconds2 * k.t,
        Math.max(2, Math.round(c.segments * 0.5)),
        c.wobble * 0.7 * (1 + i * 0.4),
        rand,
        true,
      );
    }
    const g = ctx.createGain();
    g.gain.value = gains[i] as number;
    noise.connect(band);
    band.connect(g);
    g.connect(cavityEnv);
  }

  /* --- 3: the bubbles afterwards --------------------------------------------------------------- */

  playGrains(ctx, comb.input, at, spec.bubbles, k, rand);

  /* --- 3b: the creature ------------------------------------------------------------------------ */

  // Straight to `voiceOut`, not through the comb. The chirp is the slime, not the tube it is going up, and
  // combing a voice is the one thing that would make it sound like an effect.
  if (spec.chirp) playGrains(ctx, voiceOut, at, spec.chirp, k, rand);

  /* --- 4: pitchless weight — a lowpass collapsing, bypassing the comb -------------------------- */

  const thudLow = ctx.createBiquadFilter();
  thudLow.type = 'lowpass';
  thudLow.Q.value = 1.4;
  thudLow.frequency.setValueAtTime(spec.thud.f0 * k.f, at);
  // Fast, and to a frequency low enough that what is left has no identifiable pitch — only weight.
  thudLow.frequency.exponentialRampToValueAtTime(spec.thud.f1 * k.f, at + 0.016 * k.t);
  // 26 ms of rise, not 6. A low layer with a fast attack is a KICK DRUM, and it was the single most percussive
  // thing left in the family — a slime touching down should yield, not land. Slow enough that the weight arrives
  // after the wet detail rather than punching underneath it, and now slower than the tear cluster's own 9 ms
  // rise, so the order the ear hears is wet-then-weight rather than the two together.
  const thudEnv = envelope(ctx, at, spec.thud.gain, 0.026, spec.thud.decay * k.t);
  noise.connect(thudLow);
  thudLow.connect(thudEnv);
  thudEnv.connect(voiceOut);

  /* --- 5: fine spray, also bypassing the comb -------------------------------------------------- */

  playGrains(ctx, voiceOut, at, spec.spray, k, rand);

  // One teardown for the whole subtree, on the source that outlives the others. The comb nodes are named
  // explicitly because a feedback loop is a reference cycle and there is no reason to make the collector
  // reason about it.
  noise.onended = () => {
    voiceOut.disconnect();
    for (const n of comb.nodes) {
      try {
        n.disconnect();
      } catch {
        // Already detached. Teardown cannot fail.
      }
    }
  };
}

/** A soft sine partial with an envelope. The chime and the hatch are made of these and nothing else. */
function partial(
  ctx: BaseAudioContext,
  out: AudioNode,
  at: number,
  hz: number,
  peak: number,
  attack: number,
  decay: number,
): void {
  const osc = ctx.createOscillator();
  osc.type = 'sine';
  osc.frequency.value = hz;
  const env = envelope(ctx, at, peak, attack, decay);
  osc.connect(env);
  env.connect(out);
  const end = at + attack + decay + 0.02;
  osc.start(at);
  osc.stop(end);
  osc.onended = () => {
    env.disconnect();
    osc.disconnect();
  };
}

/* ------------------------------------------------------------------ *\
   The three slime sounds
\* ------------------------------------------------------------------ */

/**
 * SQUISH — a slime drawn up the nozzle.
 *
 * STICKINESS IS A RELEASE, NOT AN ATTACK. Peeling something wet off a surface resists in fits, faster and
 * faster, and then lets go all at once, so the attack cluster has `ampTilt` −0.85 (each successive micro-event
 * is LOUDER than the last) and `gapTilt` 0.95 (the gaps SHRINK): a ragged accelerating rise that simply stops.
 *
 * THE REGISTER IS THE BIG CORRECTION HERE, and it went the wrong way first. This lived at 340 Hz to 1.6 kHz
 * with bubbles down at 200 Hz, which is the sound of a large volume of mud — and a slime is a SMALL wet thing,
 * which makes a HIGH sound. Everything is up roughly an octave and a half: the cavity now climbs 780 Hz to
 * 3.2 kHz and the bubbles sit between 700 Hz and 2.8 kHz. Low and wet reads as sludge or worse as bodily; high
 * and wet reads as jelly. The low layer is kept only as a trace of weight.
 *
 * DURATION TOO. It ran 440 ms of active sound; a long evolving tail is exactly what makes a sound read as a
 * synthesiser rather than an event. It is now about 150 ms with all the wet detail inside the first 60.
 */
const SQUISH: SquelchSpec = {
  tear: {
    at: 0,
    gain: 0.26,
    grains: {
      // Grains 18–34 ms against a mean gap of 3.5 ms: four or five are always sounding, so the "tear" is a
      // continuous rush rather than five separate ticks. `fSweep` 1.35 carries it upward — away up the tube.
      //
      // This layer was never the problem and the measurement says so: `ampTilt` −0.85 means it SWELLS, so its
      // loudest grains arrive in the middle of the cluster with four others on top of them, and no exposed
      // transient is ever formed. It is the shape the other two sounds have now been given. Left alone but for
      // a slightly longer rise and a few more grains.
      seconds: 0.042, count: 11, fLo: 900, fHi: 3200, bw: 420,
      ampTilt: -0.85, gapTilt: 0.95, grainLoMs: 18, grainHiMs: 34, glide: 0.9, damp: 2.5,
      attackMs: 10, sustain: 0.9, fSweep: 1.35,
    },
  },
  cavity: {
    gain: 0.3, gain2: 0.16, gain3: 0.075,
    // Up fast as it is drawn away and stretches, then easing back down: elastic, not a sweep. The 16 ms attack
    // is the body's own soft onset — at 5 ms the whole sound started with an edge on it.
    f0: 780, f1: 3200, seconds: 0.048, f2: 2400, seconds2: 0.055, segments: 9, wobble: 0.10,
    q: 4.5, ratio2: 2.42, ratio3: 4.13, attack: 0.02, decay: 0.1,
  },
  bubbles: {
    at: 0.028,
    gain: 0.2,
    grains: {
      seconds: 0.085, count: 13, fLo: 700, fHi: 2800, bw: 150,
      ampTilt: 1.5, gapTilt: -0.45, grainLoMs: 20, grainHiMs: 36, glide: 1.15, damp: 2.5,
      attackMs: 11, sustain: 0.9, fSweep: 1.25,
    },
  },
  // Rising: the creature being drawn in. Narrow bandwidth so the resonance rings enough to read as a voice, and
  // a lower `sustain` than the wet layers precisely so it DOES ring — a voice has pitch where a swish does not.
  chirp: {
    at: 0.03,
    gain: 0.15,
    grains: {
      seconds: 0.05, count: 2, fLo: 1150, fHi: 1900, bw: 70,
      ampTilt: 0.4, gapTilt: 0, grainLoMs: 26, grainHiMs: 42, glide: 1.45, damp: 4.5,
      attackMs: 13, sustain: 0.35,
    },
  },
  /**
   * THE SPRAY IS NOW AIR, NOT CRACKLE, and this was a real contributor to "hard".
   *
   * It used to be sub-2 ms grains at `damp` 15, which is by definition a crackle — dozens of tiny sharp edges in
   * the brightest part of the spectrum, where the ear is most sensitive to sharpness. Moisture up top is right;
   * making it out of tiny clicks was not. Grains are now 15–26 ms with `damp` 3 and near-full sustain, so the
   * same frequency band arrives as a soft airy hiss that swishes instead of spitting.
   *
   * The `ampTilt` came down from 1.2 to 0.65 with the rest of the family. Up here it matters twice over: this
   * is the brightest layer in the sound AND it starts at 3 ms, which is before the tear cluster has built, so
   * a front-loaded spray puts its loudest and sharpest grain into the most exposed moment there is.
   */
  spray: {
    at: 0.003,
    gain: 0.06,
    grains: {
      seconds: 0.045, count: 10, fLo: 4200, fHi: 8400, bw: 950,
      ampTilt: 0.65, gapTilt: 0.4, grainLoMs: 15, grainHiMs: 26, glide: 0.9, damp: 3,
      attackMs: 9, sustain: 0.95, fSweep: 1.3,
    },
  },
  // A trace of weight, and no more — felt, not heard.
  thud: { gain: 0.03, f0: 520, f1: 240, decay: 0.055 },
  /**
   * SHORT AND BRIGHT DELAYS, 1.9 to 4.7 ms rather than 4.7 to 11.9.
   *
   * A comb's peaks sit at the reciprocal of its delay, so 12 ms put resonances at 83 Hz and its multiples —
   * which is exactly the low gurgling the reference does not have and which is what tips "wet" over into
   * visceral. At 2 ms the peaks are up at 500 Hz and read as hollowness rather than as a throat. Feedback
   * stays low so the comb never fills the silences between the grains, which is what makes them separate
   * events at all.
   */
  comb: { delaysMs: [1.9, 3.1, 4.7], feedback: 0.3, damp: 4200, wet: 0.4, dry: 0.9 },
  combDrift: 0.85,
};

/**
 * LAND — a slime touching down at the end of its arc. The wettest of the three, and a BLOP.
 *
 * A splat: the densest attack cluster over the shortest span, spanning a wide resonance band so the
 * micro-events run from a soft slap to a bright spatter. Then the elastic recovery, which is the whole
 * character of the sound: the cavity drops hard from 3 kHz to 1.15 kHz on impact and SPRINGS BACK UP to
 * 1.5 kHz as the jelly recovers its shape. Down-then-up is what a bouncy solid does; down-and-stay is what mud
 * does, and this used to do the latter over 150 ms.
 *
 * It was "the fattest" of the three, with a lowpass collapsing to 68 Hz and a 400 ms bubble tail. Both are
 * gone. A small slime landing is bright and quick — the weight now stops at 210 Hz and the whole event is
 * about 190 ms, because in the reference these are impacts and not events with an aftermath.
 */
const LAND: SquelchSpec = {
  /**
   * THE AMPLITUDE TILT WAS THE TAP, and finding it is what this pass is actually for.
   *
   * At `ampTilt` 1.3 the grain amplitudes ran (1 − i/n)^1.3, which makes the FIRST micro-event the LOUDEST —
   * and the first micro-event is also the only one that arrives out of silence with nothing overlapping it.
   * So the loudest and the most exposed grain in the sound were the same grain, and it opened over a 3.5 ms
   * raised cosine whose 10 %–90 % rise is 2.1 ms. Measured: 2.2 ms, on every one of the three timbre variants.
   * That is a click, and it was the hardness in the landing however soft everything after it was.
   *
   * NO AMOUNT OF BLENDING FURTHER IN CAN FIX THIS, which is why the previous pass did not. Overlap is what
   * smooths a cluster and the first grain has nothing to overlap with by definition, so a front-loaded cluster
   * always ends in an exposed transient however dense it is. The tilt itself has to come down. At 0.5 the
   * cluster still settles — a landing should — but the opening grain no longer stands 10 dB above its
   * neighbours, and with eleven grains of 18–34 ms against a 2.3 ms mean gap it has three or four companions
   * by the time it reaches full height.
   */
  tear: {
    at: 0,
    gain: 0.28,
    grains: {
      seconds: 0.028, count: 11, fLo: 1400, fHi: 4800, bw: 620,
      ampTilt: 0.5, gapTilt: -0.5, grainLoMs: 18, grainHiMs: 34, glide: 0.82, damp: 2.2,
      // Falling, because the thing has arrived and is spreading out downward and away from the ear.
      // 9 ms of rise: a yielding contact rather than a contact.
      attackMs: 12, sustain: 0.9, fSweep: 0.78,
    },
  },
  cavity: {
    gain: 0.3, gain2: 0.16, gain3: 0.07,
    // Down on the impact, then back up as it recovers. The bounce is in the f2.
    f0: 3000, f1: 1150, seconds: 0.042, f2: 1500, seconds2: 0.05, segments: 9, wobble: 0.11,
    q: 5, ratio2: 2.24, ratio3: 3.71, attack: 0.024, decay: 0.12,
  },
  bubbles: {
    at: 0.024,
    gain: 0.22,
    grains: {
      seconds: 0.095, count: 14, fLo: 600, fHi: 2400, bw: 130,
      ampTilt: 1.6, gapTilt: -0.5, grainLoMs: 20, grainHiMs: 40, glide: 1.1, damp: 2.5,
      attackMs: 11, sustain: 0.9, fSweep: 0.85,
    },
  },
  // No chirp on the landing: this one is the physics, and chirping all three would make the creature a tic.
  chirp: null,
  /**
   * The spray needed the same tilt correction as the tear, and needed it MORE rather than less. It sits at
   * 4.6–9 kHz, where the ear is most sensitive to sharpness, so a front-loaded cluster up here contributes far
   * more hardness per unit of level than the same shape would lower down — while at gain 0.06 it is quiet
   * enough that nobody thinks to look at it when hunting for a tap.
   */
  spray: {
    at: 0.002,
    gain: 0.06,
    grains: {
      seconds: 0.04, count: 11, fLo: 4600, fHi: 9000, bw: 1150,
      ampTilt: 0.6, gapTilt: 0.3, grainLoMs: 15, grainHiMs: 28, glide: 0.85, damp: 3,
      attackMs: 11, sustain: 0.95, fSweep: 0.85,
    },
  },
  /**
   * THE THUD, CUT FROM 0.16 TO 0.045, AND THIS IS THE MOST LIKELY SINGLE CAUSE OF "HARD".
   *
   * A low layer with a fast attack under a bright transient is the construction of a kick drum, and that is what
   * this was: at 0.16 it was the loudest single element in the landing and it arrived first. A slime hitting the
   * ground should YIELD — the weight should be the thing you notice afterwards, not the thing that hits you. Now
   * a sixth of the level, with a 26 ms rise (see `thudEnv`) so it swells in behind the wet detail instead of
   * punching under it. Felt rather than heard, as asked.
   *
   * Cut again this pass, 0.045 → 0.028. The sharpest-arrival measurement clears the thud of being the actual
   * click — it rises far too slowly to be one — but "hard" and "percussive" are not the same complaint and the
   * brief asks for both to go. A landing that is FELT wants the low layer under the audibility threshold on a
   * laptop speaker and present only on something with a woofer, which is about where this now sits.
   */
  thud: { gain: 0.028, f0: 620, f1: 210, decay: 0.07 },
  comb: { delaysMs: [1.3, 2.6, 4.1, 6.3], feedback: 0.27, damp: 3800, wet: 0.42, dry: 0.9 },
  combDrift: 1.2,
};

/**
 * PLOP — the release. A BLOP: a bubble letting go, and the shortest of the three at about 120 ms.
 *
 * A SUCTION POP RATHER THAN A SWEEP. The cavity collapses over 28 ms, which is short enough that the whole
 * thing arrives as one round event instead of a movement the ear can follow, and every micro-event in the
 * attack cluster is itself collapsing (`glide` 0.7). Then it opens slightly back up — f2 above f1 — because a
 * released bubble rebounds, and that rebound is what stops a pop sounding like a click.
 *
 * STILL LOWER THAN THE LANDING, but both are now high: this sits around 950 Hz to 2.2 kHz where `LAND` runs
 * 1.15 to 3 kHz. It used to sit at 262–820 Hz, which was muffled and heavy in a way a small slime being shot
 * out of a nozzle is not. Nothing in the directory depends on the ordering if it is ever wanted reversed.
 */
const PLOP: SquelchSpec = {
  /**
   * The same front-loaded cluster as the landing had, and it measured even sharper: 1.2–2.2 ms across the
   * variants, against a metric whose own floor is about 1.5 ms. `attackMs` was 3, whose 10 %–90 % rise is
   * 1.8 ms, and `ampTilt` 1.2 put the loudest grain first and alone. Same correction, and a little further,
   * because a plop is the smallest and softest of the three and had the hardest edge on it.
   *
   * Note what did NOT need to change: the collapse. `glide` 0.7 per grain and the cavity's 28 ms fall are the
   * pop, and a pop is a shape rather than an edge. Softening the onset leaves it entirely intact — which is
   * the general lesson of this pass, that "short and bright" and "hard" were never the same property.
   */
  tear: {
    at: 0,
    gain: 0.24,
    grains: {
      seconds: 0.02, count: 9, fLo: 1000, fHi: 3000, bw: 380,
      ampTilt: 0.45, gapTilt: -0.4, grainLoMs: 16, grainHiMs: 30, glide: 0.7, damp: 2.2,
      attackMs: 9, sustain: 0.88, fSweep: 0.8,
    },
  },
  cavity: {
    gain: 0.28, gain2: 0.14, gain3: 0.062,
    f0: 2200, f1: 950, seconds: 0.028, f2: 1250, seconds2: 0.03, segments: 7, wobble: 0.12,
    q: 4, ratio2: 2.13, ratio3: 3.44, attack: 0.02, decay: 0.07,
  },
  bubbles: {
    at: 0.014,
    gain: 0.18,
    grains: {
      seconds: 0.058, count: 10, fLo: 650, fHi: 2200, bw: 140,
      ampTilt: 1.5, gapTilt: -0.35, grainLoMs: 17, grainHiMs: 30, glide: 1.18, damp: 2.5,
      attackMs: 10, sustain: 0.9, fSweep: 0.88,
    },
  },
  // Falling: the creature being let go. The mirror of the squish's rising chirp, which is what makes the pair
  // read as one action with two ends rather than as two unrelated noises.
  chirp: {
    at: 0.016,
    gain: 0.14,
    grains: {
      seconds: 0.042, count: 2, fLo: 980, fHi: 1600, bw: 75,
      ampTilt: 0.4, gapTilt: 0, grainLoMs: 20, grainHiMs: 34, glide: 0.7, damp: 5,
      attackMs: 12, sustain: 0.35,
    },
  },
  spray: {
    at: 0.001,
    gain: 0.045,
    grains: {
      seconds: 0.028, count: 8, fLo: 4000, fHi: 7800, bw: 950,
      ampTilt: 0.55, gapTilt: 0.2, grainLoMs: 13, grainHiMs: 24, glide: 0.9, damp: 3,
      attackMs: 8, sustain: 0.95, fSweep: 0.9,
    },
  },
  thud: { gain: 0.026, f0: 480, f1: 225, decay: 0.045 },
  comb: { delaysMs: [1.1, 2.3, 3.7], feedback: 0.28, damp: 3600, wet: 0.42, dry: 0.9 },
  combDrift: 0.9,
};

/**
 * THE THREE TIMBRE VARIANTS, as scale factors rather than as three hand-typed tables.
 *
 * The old file had three full spec objects per sound, which is nine sets of twenty numbers, and the failure
 * mode of that arrangement is a variant quietly disagreeing with its siblings because one field was not
 * updated with the others. Expressed as multipliers there is one spec to reason about per sound and the
 * variants cannot be internally inconsistent — while still being three genuinely different timbres, because
 * scaling frequency, time, grain count and resonator bandwidth together changes the character rather than
 * just the tuning.
 */
export const VARIANTS: readonly Scale[] = [
  { f: 1, t: 1, n: 1, bw: 1 },
  // Brighter, tighter, more of them, and wetter-sounding because wider resonator bandwidths tick rather
  // than ring.
  { f: 1.13, t: 0.88, n: 1.15, bw: 1.28 },
  // Deeper, slower, fewer and gloopier: narrow bandwidths ring, which is what a big slow bubble is.
  { f: 0.87, t: 1.15, n: 0.85, bw: 0.78 },
];

/**
 * THE SPECS, EXPORTED SO THE LAYERS CAN BE MEASURED ONE AT A TIME.
 *
 * Not part of the game's interface — nothing outside `measure.ts` should read this, and the game plays sounds
 * through `createVoices` as it always has. It exists because of how the hardness in `land` and `plop` was
 * eventually found, which is worth stating plainly: for three passes the only thing anyone could measure was
 * the FINISHED sound, and a finished squelch is six layers on top of each other. A 2 ms edge inside it is two
 * percent of the render and it does not move any average enough to notice.
 *
 * What located it was rendering one layer at a time and timing each one's own sharpest arrival, at which point
 * the answer was immediate and unambiguous. Keeping the specs reachable makes that a repeatable measurement
 * rather than a thing someone has to rediscover by temporarily deleting code.
 */
export const SPECS: Readonly<Record<'squish' | 'land' | 'plop', SquelchSpec>> = {
  squish: SQUISH,
  land: LAND,
  plop: PLOP,
};

/* ------------------------------------------------------------------ *\
   The five voices, bound to their own choosers
\* ------------------------------------------------------------------ */

export interface Voices {
  squish(ctx: BaseAudioContext, out: AudioNode, at: number): void;
  land(ctx: BaseAudioContext, out: AudioNode, at: number): void;
  plop(ctx: BaseAudioContext, out: AudioNode, at: number): void;
  coin(ctx: BaseAudioContext, out: AudioNode, at: number): void;
  hatch(ctx: BaseAudioContext, out: AudioNode, at: number): void;
  right(ctx: BaseAudioContext, out: AudioNode, at: number): void;
  wrong(ctx: BaseAudioContext, out: AudioNode, at: number): void;
}

/**
 * The chime and the hatch, in a sentence each. These are the only oscillators left in the file, and they are
 * meant to be tonal: a reward is a musical event, and a squelch is not.
 *
 * COIN: two sine partials a fifth apart, then the same pair a fourth higher 110 ms later. Sines only, no
 * harmonics above the fifth, fundamental at 784 Hz rather than up at 2 kHz — a chime is easy to make
 * piercing and a five-year-old is sitting 60 cm from the speaker. Soft, two notes, over in 700 ms.
 *
 * HATCH: an F major triad in sines with the entries staggered 70 ms apart and a slow 30 ms attack, over a
 * quiet sub at the root. Warm because it is a major triad in the lower middle of the register with no
 * attack transient at all — nothing about a hatching egg should have an edge on it.
 *
 * RIGHT: a C major arpeggio climbing C-E-G-C over 210 ms, each note a sine with a fifth above it, then the
 * octave held a little longer than the rest. It has to be audibly better than `coin` without becoming the
 * biggest sound in the game, which `hatch` still is — so it is brighter and longer than the coin's two notes
 * and quieter and thinner than the hatch's triad. Rising, because the one thing every listener reads as
 * "yes" regardless of musical training is a rising line.
 *
 * WRONG: two soft sines a whole tone apart, the lower entering 90 ms later, at a third of the right-answer
 * gain and with a 25 ms attack so it has no click on it. Deliberately NOT a buzzer, NOT dissonant and NOT
 * low: it is an acknowledgement that a turn was taken, pitched so it cannot be mistaken for the rising one.
 * A five-year-old meeting deliberately above-grade material will hear this more often than the other, and a
 * sound that punishes would be teaching them something false about themselves five times a visit.
 */
export function createVoices(rand: Rand = Math.random): Voices {
  const squishPick = createChooser(VARIANTS.length, rand);
  const landPick = createChooser(VARIANTS.length, rand);
  const plopPick = createChooser(VARIANTS.length, rand);

  return {
    squish(ctx, out, at) {
      squelch(ctx, out, at, SQUISH, VARIANTS[squishPick()] as Scale, rand, TRIM.squish);
    },
    land(ctx, out, at) {
      squelch(ctx, out, at, LAND, VARIANTS[landPick()] as Scale, rand, TRIM.land);
    },
    plop(ctx, out, at) {
      squelch(ctx, out, at, PLOP, VARIANTS[plopPick()] as Scale, rand, TRIM.plop);
    },
    coin(ctx, out, at) {
      const j = jitter(rand, 0.012);
      partial(ctx, out, at, 784 * j, 0.3, 0.005, 0.5);
      partial(ctx, out, at, 1176 * j, 0.1, 0.005, 0.34);
      partial(ctx, out, at + 0.11, 1046.5 * j, 0.2, 0.005, 0.42);
      partial(ctx, out, at + 0.11, 1568 * j, 0.064, 0.005, 0.3);
    },
    hatch(ctx, out, at) {
      const j = jitter(rand, 0.008);
      partial(ctx, out, at, 174.61 * j, 0.16, 0.04, 0.95);
      partial(ctx, out, at, 349.23 * j, 0.21, 0.03, 1.2);
      partial(ctx, out, at + 0.07, 440 * j, 0.16, 0.03, 1.1);
      partial(ctx, out, at + 0.14, 523.25 * j, 0.13, 0.03, 1.0);
    },
    right(ctx, out, at) {
      const j = jitter(rand, 0.01);
      // C5 E5 G5 C6, 70 ms apart, each with a quiet fifth above it for body.
      partial(ctx, out, at, 523.25 * j, 0.2, 0.005, 0.34);
      partial(ctx, out, at, 784 * j, 0.055, 0.005, 0.26);
      partial(ctx, out, at + 0.07, 659.25 * j, 0.2, 0.005, 0.34);
      partial(ctx, out, at + 0.14, 784 * j, 0.2, 0.005, 0.38);
      partial(ctx, out, at + 0.21, 1046.5 * j, 0.22, 0.006, 0.62);
      partial(ctx, out, at + 0.21, 1568 * j, 0.05, 0.006, 0.5);
    },
    wrong(ctx, out, at) {
      const j = jitter(rand, 0.01);
      partial(ctx, out, at, 587.33 * j, 0.075, 0.025, 0.34);
      partial(ctx, out, at + 0.09, 523.25 * j, 0.065, 0.025, 0.42);
    },
  };
}
