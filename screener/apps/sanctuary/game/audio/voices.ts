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
 * All of 1, 2 and 3 then go through A COMB FILTER BANK — short delays with feedback, 2 to 15 ms. That is the
 * gurgle and the hollowness of liquid in a container, and per the brief it is the highest-value single
 * addition here. The thud and the spray bypass it: combing the low end muddies it, and combing the spray
 * turns moisture into a flanger.
 *
 * ══ THE THREE SOUNDS, IN A LINE EACH ══════════════════════════════════════════════════════════════
 *
 *   SQUISH  adhesion tearing loose — an ACCELERATING, SWELLING grain cluster, which is what unsticking
 *           sounds like — and then travelling up a wet tube, so the cavity resonances climb and the bubbles
 *           after it open upward as air escapes past the slime.
 *   LAND    the fattest and wettest of the three: a dense splat, a cavity that settles downward, the widest
 *           spread of bubbles afterwards, and the real low end. This one has hit something.
 *   PLOP    a bubble letting go. The shortest, and a POP rather than a sweep: the cavity collapses in 45 ms
 *           instead of sweeping over 150, which is the difference between a release and a gesture.
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
interface Scale {
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
interface Layer {
  at: number;
  gain: number;
  grains: GrainSpec;
}

/** What one squelch is. Hz, seconds and linear gain throughout. */
interface SquelchSpec {
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
  /** Pitchless weight: a lowpass collapsing, not a sine. */
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

  const tearEnd = at + (spec.tear.at + spec.tear.grains.seconds) * k.t;
  const bubbleEnd = at + (spec.bubbles.at + spec.bubbles.grains.seconds) * k.t;
  const sprayEnd = at + (spec.spray.at + spec.spray.grains.seconds) * k.t;
  const cavityEnd = at + c.attack + cavityDecay;
  const thudEnd = at + 0.012 + spec.thud.decay * k.t;
  // A quarter of a second of slack past everything, for the comb's feedback to finish ringing. Detaching a
  // comb that is still ringing is a step, and a step is a click.
  const end = Math.max(tearEnd, bubbleEnd, sprayEnd, cavityEnd, thudEnd) + 0.26;

  /* --- the gurgle, which everything wet passes through ----------------------------------------- */

  const comb = wetComb(ctx, spec.comb);
  comb.output.connect(voiceOut);
  for (const delay of comb.delays) {
    const base = delay.delayTime.value;
    // Drifting, and each tap drifts by a different amount. Identical drift on every tap would move the whole
    // comb together, which preserves the ratios between its peaks — and the ratios are what read as a pitch.
    wobbleRamp(delay.delayTime, at, base, base * spec.combDrift * jitter(rand, 0.25), cavitySeconds * 2.2, 4, 0.12, rand);
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
    wobbleRamp(
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
    const g = ctx.createGain();
    g.gain.value = gains[i] as number;
    noise.connect(band);
    band.connect(g);
    g.connect(cavityEnv);
  }

  /* --- 3: the bubbles afterwards --------------------------------------------------------------- */

  playGrains(ctx, comb.input, at, spec.bubbles, k, rand);

  /* --- 4: pitchless weight — a lowpass collapsing, bypassing the comb -------------------------- */

  const thudLow = ctx.createBiquadFilter();
  thudLow.type = 'lowpass';
  thudLow.Q.value = 1.4;
  thudLow.frequency.setValueAtTime(spec.thud.f0 * k.f, at);
  // Fast, and to a frequency low enough that what is left has no identifiable pitch — only weight.
  thudLow.frequency.exponentialRampToValueAtTime(spec.thud.f1 * k.f, at + 0.016 * k.t);
  const thudEnv = envelope(ctx, at, spec.thud.gain, 0.006, spec.thud.decay * k.t);
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
 * STICKINESS IS A RELEASE, NOT AN ATTACK, which is the one thing the previous version had backwards: it led
 * with a transient and then swept away. Peeling something wet off a surface does the opposite — it resists
 * in fits, faster and faster, and then lets go all at once. So the attack cluster here has `ampTilt` −0.85
 * (each successive micro-event is LOUDER than the last) and `gapTilt` 0.95 (the gaps SHRINK), which is a
 * ragged accelerating rise, and then it simply stops. That is adhesion breaking.
 *
 * After the tear it travels: the cavity resonances climb from 340 Hz to 1.6 kHz and the bubbles afterwards
 * have `glide` above 1, so each one opens upward — air escaping past a slime going up a tube.
 */
const SQUISH: SquelchSpec = {
  tear: {
    at: 0,
    gain: 0.34,
    grains: {
      seconds: 0.105, count: 8, fLo: 270, fHi: 1180, bw: 260,
      ampTilt: -0.85, gapTilt: 0.95, grainLoMs: 3, grainHiMs: 9, glide: 0.86, damp: 9,
    },
  },
  cavity: {
    gain: 0.3, gain2: 0.16, gain3: 0.075,
    f0: 340, f1: 1620, seconds: 0.13, segments: 11, wobble: 0.17,
    q: 5, ratio2: 2.42, ratio3: 4.13, attack: 0.007, decay: 0.19,
  },
  bubbles: {
    at: 0.076,
    gain: 0.24,
    grains: {
      seconds: 0.3, count: 18, fLo: 200, fHi: 900, bw: 92,
      ampTilt: 1.5, gapTilt: -1, grainLoMs: 5, grainHiMs: 16, glide: 1.12, damp: 6,
    },
  },
  spray: {
    at: 0.004,
    gain: 0.08,
    grains: {
      seconds: 0.095, count: 13, fLo: 3800, fHi: 7600, bw: 900,
      ampTilt: 1.2, gapTilt: 0.4, grainLoMs: 1.2, grainHiMs: 3.5, glide: 0.9, damp: 14,
    },
  },
  thud: { gain: 0.1, f0: 270, f1: 118, decay: 0.1 },
  // Feedback moderated from 0.42: a comb dense enough to fill the gaps BETWEEN the grains defeats the point
  // of scattering them, because what the ear (and the onset measurement) reads as separate events is the
  // silence in between. The gurgle has to sit under the crowd, not smear it.
  comb: { delaysMs: [4.7, 7.3, 11.9], feedback: 0.34, damp: 2600, wet: 0.48, dry: 0.85 },
  combDrift: 0.82,
};

/**
 * LAND — a slime touching down at the end of its arc. The fattest, wettest impact of the three.
 *
 * A splat: the densest attack cluster, over the shortest span, with the widest resonance band, so the
 * micro-events span from a low slap to a bright spatter. The cavity settles DOWNWARD because the thing has
 * arrived and is spreading out. The bubble spread afterwards is the longest and most decelerating of the
 * three — a third of a second of the sound thinning out, which is what stops it reading as a dry crunch.
 *
 * And this is where the real low end lives: a lowpass collapsing from 340 Hz to 68 in 16 ms. Weight with no
 * pitch, where the old version had an audible 95 Hz sine.
 */
const LAND: SquelchSpec = {
  tear: {
    at: 0,
    gain: 0.42,
    grains: {
      seconds: 0.062, count: 6, fLo: 420, fHi: 2400, bw: 420,
      ampTilt: 1.4, gapTilt: -0.6, grainLoMs: 2, grainHiMs: 7, glide: 0.8, damp: 11,
    },
  },
  cavity: {
    gain: 0.3, gain2: 0.16, gain3: 0.07,
    f0: 1480, f1: 380, seconds: 0.15, segments: 12, wobble: 0.19,
    q: 5.5, ratio2: 2.24, ratio3: 3.71, attack: 0.005, decay: 0.24,
  },
  bubbles: {
    at: 0.05,
    gain: 0.28,
    grains: {
      seconds: 0.4, count: 24, fLo: 170, fHi: 820, bw: 80,
      ampTilt: 1.6, gapTilt: -1.3, grainLoMs: 6, grainHiMs: 20, glide: 1.08, damp: 5.5,
    },
  },
  spray: {
    at: 0.002,
    gain: 0.095,
    grains: {
      seconds: 0.078, count: 15, fLo: 4200, fHi: 8200, bw: 1100,
      ampTilt: 1.5, gapTilt: 0.3, grainLoMs: 1, grainHiMs: 3, glide: 0.85, damp: 16,
    },
  },
  thud: { gain: 0.3, f0: 340, f1: 68, decay: 0.13 },
  comb: { delaysMs: [3.1, 6.7, 10.3, 14.1], feedback: 0.36, damp: 2300, wet: 0.52, dry: 0.85 },
  combDrift: 1.24,
};

/**
 * PLOP — the release, as a bubble letting go.
 *
 * A SUCTION POP RATHER THAN A SWEEP, which is the specific correction here. The old plop swept its formant
 * from 900 Hz down to 300 over 70 ms, and 70 ms is long enough for the ear to follow the movement and hear a
 * gesture. This one collapses over 45 ms, which is short enough that the whole thing arrives as a single
 * round event — and the attack cluster's grains each have `glide` 0.7, so every micro-event is itself
 * collapsing. A cavity closing is what a bubble letting go actually is.
 *
 * Kept LOWER than the landing, as it always was: it happens inside a tank, muffled, a round bubble of a
 * sound. Its resonances live around 260–820 Hz where `LAND` lives around 380–1500. Deep-then-bright,
 * out-then-down. Nothing in the directory depends on that ordering if it is ever wanted the other way.
 */
const PLOP: SquelchSpec = {
  tear: {
    at: 0,
    gain: 0.36,
    grains: {
      seconds: 0.036, count: 4, fLo: 300, fHi: 1100, bw: 200,
      ampTilt: 1.2, gapTilt: -0.4, grainLoMs: 3, grainHiMs: 8, glide: 0.7, damp: 8,
    },
  },
  cavity: {
    gain: 0.28, gain2: 0.14, gain3: 0.062,
    f0: 820, f1: 262, seconds: 0.045, segments: 6, wobble: 0.2,
    q: 4.2, ratio2: 2.13, ratio3: 3.44, attack: 0.004, decay: 0.12,
  },
  bubbles: {
    at: 0.02,
    gain: 0.22,
    grains: {
      seconds: 0.19, count: 12, fLo: 190, fHi: 700, bw: 85,
      ampTilt: 1.3, gapTilt: -0.8, grainLoMs: 6, grainHiMs: 18, glide: 1.15, damp: 6,
    },
  },
  spray: {
    at: 0.001,
    gain: 0.06,
    grains: {
      seconds: 0.042, count: 8, fLo: 3600, fHi: 6800, bw: 900,
      ampTilt: 1.4, gapTilt: 0.2, grainLoMs: 1, grainHiMs: 2.5, glide: 0.9, damp: 15,
    },
  },
  thud: { gain: 0.15, f0: 300, f1: 82, decay: 0.09 },
  comb: { delaysMs: [2.3, 5.9, 9.7], feedback: 0.32, damp: 2100, wet: 0.52, dry: 0.85 },
  combDrift: 0.88,
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
const VARIANTS: readonly Scale[] = [
  { f: 1, t: 1, n: 1, bw: 1 },
  // Brighter, tighter, more of them, and wetter-sounding because wider resonator bandwidths tick rather
  // than ring.
  { f: 1.13, t: 0.88, n: 1.15, bw: 1.28 },
  // Deeper, slower, fewer and gloopier: narrow bandwidths ring, which is what a big slow bubble is.
  { f: 0.87, t: 1.15, n: 0.85, bw: 0.78 },
];

/* ------------------------------------------------------------------ *\
   The five voices, bound to their own choosers
\* ------------------------------------------------------------------ */

export interface Voices {
  squish(ctx: BaseAudioContext, out: AudioNode, at: number): void;
  land(ctx: BaseAudioContext, out: AudioNode, at: number): void;
  plop(ctx: BaseAudioContext, out: AudioNode, at: number): void;
  coin(ctx: BaseAudioContext, out: AudioNode, at: number): void;
  hatch(ctx: BaseAudioContext, out: AudioNode, at: number): void;
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
  };
}
