import { noiseBuffer } from './noise';
import { createChooser, jitter, type Rand } from './variation';

/**
 * THE ONE-SHOTS. Squish, land, plop, and the two optional rewards.
 *
 * ══ HOW A SQUELCH IS MADE, since all three of the slime sounds are the same instrument ══════════════
 *
 * A wet sound is not a waveform, it is a MOVING RESONANCE. Anything soft and full of liquid has a cavity
 * in it, the cavity has a formant, and when the thing deforms the formant slides. That slide is the whole
 * effect: the ear hears "wet" because it hears a resonant peak travelling over a short broadband burst.
 * So every squelch here is four things, and only the first one matters:
 *
 *   1. A NOISE BURST THROUGH A HIGH-Q BANDPASS WHOSE FREQUENCY SWEEPS EXPONENTIALLY. Direction is the
 *      difference between the three sounds. Up = something being drawn away from you. Down = something
 *      settling. This is the squelch.
 *   2. A quieter lowpassed copy of the same burst, so the sweep has something to sweep across. A bandpass
 *      at Q 6 passes a narrow slice and on its own sounds thin and whistly.
 *   3. A SINE BODY with a small pitch bend, at a tenth of the level. This is the mass — a slime the size
 *      of a football has a fundamental, and without it the sound is a noise event rather than an object.
 *   4. A low sine THUD on the ones that touch the ground, and a delayed second burst (the "tail") on the
 *      ones that are wet, sweeping the other way. That second burst is the moisture closing behind the
 *      first and it is what stops the sound reading as a dry crunch.
 *
 * WHAT IT IS DELIBERATELY NOT. No cartoon "boing", which means no pitched glide as the dominant element,
 * no sawtooth, no ring, no more than 340 ms of anything, and nothing above 7 kHz (see `voiceTone` in
 * `bus.ts`). A boing is a resonant OSCILLATOR sweep; a squelch is a resonant FILTER sweep. The difference
 * in code is one node and in character it is the whole brief.
 *
 * ══ NOT BECOMING IRRITATING ═══════════════════════════════════════════════════════════════════════
 *
 * These fire dozens of times in a sitting. Three layers of variation, in increasing subtlety:
 *
 *   · Three named TIMBRE VARIANTS per sound, drawn by `createChooser`, which cannot repeat consecutively.
 *   · Continuous JITTER on top of the chosen variant: ±4 % on every frequency, ±10 % on Q, ±8 % on decay.
 *     So two firings of the same variant are still not the same sound.
 *   · A random READ OFFSET into the noise buffer, so even the underlying noise differs. This one is free
 *     and it is the reason two firings never phase-cancel into something recognisable.
 *
 * ══ LIFETIME ═════════════════════════════════════════════════════════════════════════════════════
 *
 * Every voice hangs off its own `voiceOut` gain, which is the single edge into the bus. Sources are given
 * an explicit `stop`, and the last one to finish disconnects that one node — which detaches the whole
 * subtree in one call and lets the garbage collector have all of it. No voice ever needs a registry, and
 * a leaked oscillator is impossible because nothing here is left running.
 */

/** What one squelch is. Every field is in Hz, seconds, or linear gain. */
interface SquelchSpec {
  /** Bandpass sweep: from, to, and how long the sweep takes. Direction is the character. */
  f0: number;
  f1: number;
  sweep: number;
  q: number;
  /** The broadband burst. */
  burst: number;
  burstDecay: number;
  attack: number;
  /** Sine body, with its bend. */
  bodyF0: number;
  bodyF1: number;
  body: number;
  bodyDecay: number;
  /** Low sine thud for the ones that touch down. Zero to omit. */
  thudF: number;
  thud: number;
  thudDecay: number;
  /** Delayed second burst, sweeping the other way. Zero to omit. */
  tail: number;
  tailF0: number;
  tailF1: number;
  tailAt: number;
  tailDecay: number;
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

/**
 * OUTPUT TRIM PER SOUND, and the one set of numbers in this directory that was not reasoned out but measured.
 *
 * The gains inside a `SquelchSpec` are the internal balance of ONE squelch — how much body against how much
 * burst — and they are set by ear-shaped reasoning. What they cannot settle is the balance BETWEEN the three
 * sounds, because a high-Q bandpass passes less total energy than a low-Q one and a thud contributes a peak
 * a formant sweep does not, so specs that look comparably loud are not. The first offline render measured
 * squish at −22 dBFS and land at −17: audibly a different family, and the squish — the sound of the actual
 * mechanic — was the quietest thing in the game and 6 dB under the vacuum it has to cut through.
 *
 * These four numbers close that gap, and they came from `measure.ts` rather than from an opinion. Re-run it
 * after changing any spec above.
 */
const TRIM = { squish: 2.4, land: 1.6, plop: 2.0 } as const;

function squelch(
  ctx: BaseAudioContext,
  out: AudioNode,
  at: number,
  spec: SquelchSpec,
  rand: Rand,
  trim: number,
): void {
  const voiceOut = ctx.createGain();
  voiceOut.gain.value = trim;
  voiceOut.connect(out);

  const jf = jitter(rand, 0.04);
  const jq = jitter(rand, 0.1);
  const jd = jitter(rand, 0.08);

  const burstEnd = at + spec.attack + spec.burstDecay * jd;
  const tailEnd = spec.tail > 0 ? at + spec.tailAt + 0.006 + spec.tailDecay * jd : at;
  const bodyEnd = at + 0.01 + spec.bodyDecay * jd;
  const thudEnd = spec.thud > 0 ? at + 0.012 + spec.thudDecay * jd : at;
  const end = Math.max(burstEnd, tailEnd, bodyEnd, thudEnd) + 0.02;

  /* --- 1 and 2: the burst, split into a sweeping resonance and a broadband bed ---------------- */

  const noise = burstSource(ctx, at, end, rand);

  const formant = ctx.createBiquadFilter();
  formant.type = 'bandpass';
  formant.Q.value = spec.q * jq;
  formant.frequency.setValueAtTime(spec.f0 * jf, at);
  // Exponential, not linear. A linear frequency sweep sounds like a machine changing speed; an exponential
  // one sounds like a shape changing, because pitch perception is logarithmic.
  formant.frequency.exponentialRampToValueAtTime(spec.f1 * jf, at + spec.sweep);

  const formantGain = ctx.createGain();
  formantGain.gain.value = 0.85;

  const bed = ctx.createBiquadFilter();
  bed.type = 'lowpass';
  bed.frequency.setValueAtTime(2400 * jf, at);
  bed.frequency.exponentialRampToValueAtTime(760 * jf, at + spec.sweep * 1.6);
  bed.Q.value = 0.7;

  const bedGain = ctx.createGain();
  bedGain.gain.value = 0.3;

  const burstEnv = envelope(ctx, at, spec.burst, spec.attack, spec.burstDecay * jd);

  noise.connect(formant);
  formant.connect(formantGain);
  formantGain.connect(burstEnv);
  noise.connect(bed);
  bed.connect(bedGain);
  bedGain.connect(burstEnv);
  burstEnv.connect(voiceOut);

  /* --- 3: the body ---------------------------------------------------------------------------- */

  const body = ctx.createOscillator();
  body.type = 'sine';
  body.frequency.setValueAtTime(spec.bodyF0 * jf, at);
  body.frequency.exponentialRampToValueAtTime(spec.bodyF1 * jf, at + spec.bodyDecay * 0.8);
  const bodyEnv = envelope(ctx, at, spec.body, 0.01, spec.bodyDecay * jd);
  body.connect(bodyEnv);
  bodyEnv.connect(voiceOut);
  body.start(at);
  body.stop(end);

  /* --- 4a: the thud --------------------------------------------------------------------------- */

  let thud: OscillatorNode | null = null;
  if (spec.thud > 0) {
    thud = ctx.createOscillator();
    thud.type = 'sine';
    thud.frequency.setValueAtTime(spec.thudF * jf, at);
    thud.frequency.exponentialRampToValueAtTime(spec.thudF * 0.72 * jf, at + spec.thudDecay);
    const thudEnv = envelope(ctx, at, spec.thud, 0.012, spec.thudDecay * jd);
    thud.connect(thudEnv);
    thudEnv.connect(voiceOut);
    thud.start(at);
    thud.stop(end);
  }

  /* --- 4b: the wet tail ----------------------------------------------------------------------- */

  let tail: AudioBufferSourceNode | null = null;
  if (spec.tail > 0) {
    const tailAt = at + spec.tailAt;
    tail = burstSource(ctx, tailAt, end, rand);
    const tf = ctx.createBiquadFilter();
    tf.type = 'bandpass';
    tf.Q.value = spec.q * 0.75 * jq;
    tf.frequency.setValueAtTime(spec.tailF0 * jf, tailAt);
    tf.frequency.exponentialRampToValueAtTime(spec.tailF1 * jf, tailAt + spec.tailDecay * 0.9);
    const tailEnv = envelope(ctx, tailAt, spec.tail, 0.006, spec.tailDecay * jd);
    tail.connect(tf);
    tf.connect(tailEnv);
    tailEnv.connect(voiceOut);
  }

  // One teardown for the whole subtree, on the source that outlives the others.
  noise.onended = () => {
    voiceOut.disconnect();
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
   The three variants of each slime sound
\* ------------------------------------------------------------------ */

/**
 * SQUISH — a slime drawn up the nozzle. The formant sweeps UP, hard, because the thing is being pulled
 * away and deforming as it goes, and the body bends up with it. Wet tail sweeping back down, so the sound
 * closes rather than stopping.
 */
const SQUISH: readonly SquelchSpec[] = [
  {
    f0: 380, f1: 1520, sweep: 0.11, q: 6,
    burst: 0.5, burstDecay: 0.16, attack: 0.008,
    bodyF0: 150, bodyF1: 245, body: 0.1, bodyDecay: 0.14,
    thudF: 0, thud: 0, thudDecay: 0,
    tail: 0.2, tailF0: 760, tailF1: 400, tailAt: 0.09, tailDecay: 0.1,
  },
  {
    f0: 430, f1: 1780, sweep: 0.09, q: 7.5,
    burst: 0.46, burstDecay: 0.14, attack: 0.007,
    bodyF0: 168, bodyF1: 272, body: 0.09, bodyDecay: 0.12,
    thudF: 0, thud: 0, thudDecay: 0,
    tail: 0.22, tailF0: 840, tailF1: 430, tailAt: 0.08, tailDecay: 0.09,
  },
  {
    f0: 330, f1: 1280, sweep: 0.13, q: 5,
    burst: 0.52, burstDecay: 0.18, attack: 0.01,
    bodyF0: 136, bodyF1: 218, body: 0.11, bodyDecay: 0.16,
    thudF: 0, thud: 0, thudDecay: 0,
    tail: 0.18, tailF0: 690, tailF1: 370, tailAt: 0.1, tailDecay: 0.11,
  },
];

/**
 * LAND — a slime touching down at the end of its arc. The formant sweeps DOWN (settling), the body bends
 * down, and there is a soft 95 Hz thud under it because this one has hit something. Brighter than the
 * plop that launched it, so the pair reads as a release followed by an arrival.
 */
const LAND: readonly SquelchSpec[] = [
  {
    f0: 1250, f1: 420, sweep: 0.13, q: 5.5,
    burst: 0.48, burstDecay: 0.18, attack: 0.006,
    bodyF0: 232, bodyF1: 142, body: 0.11, bodyDecay: 0.16,
    thudF: 95, thud: 0.16, thudDecay: 0.1,
    tail: 0.16, tailF0: 520, tailF1: 900, tailAt: 0.1, tailDecay: 0.09,
  },
  {
    f0: 1420, f1: 470, sweep: 0.11, q: 6.5,
    burst: 0.45, burstDecay: 0.16, attack: 0.005,
    bodyF0: 258, bodyF1: 158, body: 0.1, bodyDecay: 0.14,
    thudF: 104, thud: 0.15, thudDecay: 0.09,
    tail: 0.18, tailF0: 580, tailF1: 980, tailAt: 0.09, tailDecay: 0.08,
  },
  {
    f0: 1080, f1: 370, sweep: 0.15, q: 4.5,
    burst: 0.5, burstDecay: 0.2, attack: 0.007,
    bodyF0: 208, bodyF1: 128, body: 0.12, bodyDecay: 0.18,
    thudF: 88, thud: 0.17, thudDecay: 0.11,
    tail: 0.15, tailF0: 470, tailF1: 820, tailAt: 0.11, tailDecay: 0.1,
  },
];

/**
 * PLOP — the release. The shortest of the three and, as the brief asks, A TOUCH LOWER-PITCHED THAN THE
 * LANDING SQUELCH: its formant lives around 300–900 Hz where `LAND` lives around 400–1400, and its body
 * sits at 130 Hz against the landing's 230.
 *
 * The reasoning that makes that ordering right: the release happens INSIDE a tank, muffled, a round
 * bubble of a sound like a stone going into water — so its body bends slightly UP, which is what a bubble
 * does. The landing happens in the open against the ground, so it is brighter and it falls. Deep-then-
 * bright, out-then-down.
 *
 * If it is ever wanted the other way round, it is these numbers and nothing else: nothing in the
 * directory depends on the relationship.
 */
const PLOP: readonly SquelchSpec[] = [
  {
    f0: 900, f1: 300, sweep: 0.07, q: 4.5,
    burst: 0.34, burstDecay: 0.1, attack: 0.005,
    bodyF0: 130, bodyF1: 178, body: 0.16, bodyDecay: 0.13,
    thudF: 78, thud: 0.1, thudDecay: 0.08,
    tail: 0.1, tailF0: 1400, tailF1: 820, tailAt: 0.008, tailDecay: 0.05,
  },
  {
    f0: 980, f1: 330, sweep: 0.06, q: 5.5,
    burst: 0.32, burstDecay: 0.09, attack: 0.004,
    bodyF0: 142, bodyF1: 196, body: 0.15, bodyDecay: 0.11,
    thudF: 84, thud: 0.09, thudDecay: 0.07,
    tail: 0.11, tailF0: 1550, tailF1: 900, tailAt: 0.007, tailDecay: 0.045,
  },
  {
    f0: 820, f1: 270, sweep: 0.08, q: 3.8,
    burst: 0.36, burstDecay: 0.12, attack: 0.006,
    bodyF0: 118, bodyF1: 162, body: 0.17, bodyDecay: 0.15,
    thudF: 72, thud: 0.11, thudDecay: 0.09,
    tail: 0.09, tailF0: 1280, tailF1: 760, tailAt: 0.009, tailDecay: 0.055,
  },
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
 * The chime and the hatch, in a sentence each.
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
  const squishPick = createChooser(SQUISH.length, rand);
  const landPick = createChooser(LAND.length, rand);
  const plopPick = createChooser(PLOP.length, rand);

  return {
    squish(ctx, out, at) {
      squelch(ctx, out, at, SQUISH[squishPick()] as SquelchSpec, rand, TRIM.squish);
    },
    land(ctx, out, at) {
      squelch(ctx, out, at, LAND[landPick()] as SquelchSpec, rand, TRIM.land);
    },
    plop(ctx, out, at) {
      squelch(ctx, out, at, PLOP[plopPick()] as SquelchSpec, rand, TRIM.plop);
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
