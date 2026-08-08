import { warmImpulse } from './noise';

/**
 * THE MIX. One place where every sound in the game meets, and the only place a level is decided.
 *
 *     one-shots ─┐                      ┌─ tone ──────────────┐
 *     vacuum ────┴─ voices ─────────────┤                     ├─ trim ─ safety ─ master ─ out
 *     pad ────────── pad ───────────────┤  ┌ send ─ room ─ ret ┘
 *                                       └──┘
 *
 * WHY A BUS AND NOT `connect(ctx.destination)` EVERYWHERE. Three promises in the brief are properties of
 * the mix rather than of any one sound, and each of them is one node here instead of a rule every voice
 * has to remember:
 *
 *   · "NOTHING SUDDEN OR LOUD." `safety` is a compressor with a low threshold and a fast attack. It is
 *     not there to be heard — at the levels these voices run it is barely touching them — it is there so
 *     that a coincidence (a slime lands as another is caught while the vacuum is running and a pad note
 *     is at its peak) cannot add up to something that startles a child. Four soft things arriving at once
 *     is exactly the case nobody tests and the ear notices immediately.
 *   · "NEVER COMPETE WITH THE EFFECTS." The pad has its own input with its own lowpass, so it can be
 *     shaded and trimmed independently and cannot be made loud by accident from `pad.ts`.
 *   · "A VISIBLE MUTE CONTROL." `master` is AFTER the compressor, so muting is absolute. If the mute gain
 *     sat before a compressor, fading to zero would push the compressor's own makeup behaviour around on
 *     the way down; after it, zero is silence and nothing can undo it.
 *
 * HIGHPASS AT 32 Hz on the trim. The landing thud is a 90 Hz sine and its envelope alone puts energy well
 * below that. Inaudible on a laptop speaker, but it eats headroom and, on anything with a woofer, it is
 * felt rather than heard — which is not what a soft landing should do.
 *
 * EVERY NODE IS CREATED FROM A `BaseAudioContext`, never from a global. That is what lets the identical
 * graph be built inside an `OfflineAudioContext` and measured — see `measure.ts`. There is no separate
 * "test version" of the mix; the thing that gets verified is the thing that ships.
 */

/** The level the game plays at when unmuted. Gentle by policy, not by accident. See `engine.ts`. */
export const GENTLE_LEVEL = 0.5;

export interface Bus {
  readonly ctx: BaseAudioContext;
  /** Where every one-shot and the vacuum connect. */
  readonly voices: GainNode;
  /** Where the ambient pad connects. Darker, and further into the room. */
  readonly pad: GainNode;
  /** The mute and level control. Ramp it; never set it. */
  readonly master: GainNode;
  dispose(): void;
}

export function createBus(ctx: BaseAudioContext, level = 0): Bus {
  const voices = ctx.createGain();
  voices.gain.value = 1;

  const pad = ctx.createGain();
  // The pad is mixed at a fifth of the effects and then darkened. "Very soft" was the request and this is
  // where it is enforced, once, rather than in every note's envelope.
  pad.gain.value = 0.2;

  const trim = ctx.createGain();
  trim.gain.value = 0.9;

  const highpass = ctx.createBiquadFilter();
  highpass.type = 'highpass';
  highpass.frequency.value = 32;
  highpass.Q.value = 0.5;

  // Takes the fizz off the noise bursts. A squelch wants to sound wet, and wet means it has no top end:
  // above about 7 kHz filtered noise stops reading as moisture and starts reading as static.
  const voiceTone = ctx.createBiquadFilter();
  voiceTone.type = 'lowpass';
  voiceTone.frequency.value = 6800;
  voiceTone.Q.value = 0.4;

  const padTone = ctx.createBiquadFilter();
  padTone.type = 'lowpass';
  padTone.frequency.value = 1150;
  padTone.Q.value = 0.3;

  const room = ctx.createConvolver();
  room.buffer = warmImpulse(ctx);
  room.normalize = true;

  const voiceSend = ctx.createGain();
  // Enough that a squelch has a room around it; not enough to smear the next one.
  voiceSend.gain.value = 0.16;

  const padSend = ctx.createGain();
  // The pad is mostly room. That is what makes it read as distance rather than as an instrument.
  padSend.gain.value = 0.55;

  const roomReturn = ctx.createGain();
  roomReturn.gain.value = 0.9;

  const safety = ctx.createDynamicsCompressor();
  safety.threshold.value = -14;
  safety.knee.value = 12;
  safety.ratio.value = 6;
  safety.attack.value = 0.004;
  safety.release.value = 0.25;

  const master = ctx.createGain();
  // Starts silent ALWAYS, whatever the level argument, and is ramped up by the engine once there has been
  // a gesture. A graph that is audible the instant it is built is a graph that can pop on the first frame.
  master.gain.value = 0;

  voices.connect(voiceTone);
  voiceTone.connect(trim);
  voices.connect(voiceSend);
  voiceSend.connect(room);

  pad.connect(padTone);
  padTone.connect(trim);
  pad.connect(padSend);
  padSend.connect(room);

  room.connect(roomReturn);
  roomReturn.connect(trim);

  trim.connect(highpass);
  highpass.connect(safety);
  safety.connect(master);
  master.connect(ctx.destination);

  if (level > 0) master.gain.value = level;

  let disposed = false;
  const all: AudioNode[] = [
    voices,
    voiceTone,
    voiceSend,
    pad,
    padTone,
    padSend,
    room,
    roomReturn,
    trim,
    highpass,
    safety,
    master,
  ];

  return {
    ctx,
    voices,
    pad,
    master,
    dispose() {
      if (disposed) return;
      disposed = true;
      for (const n of all) {
        try {
          n.disconnect();
        } catch {
          // A node disconnected twice throws in some engines and means nothing. Teardown must not be
          // able to fail: this runs on unmount, after which nobody is listening for the error.
        }
      }
    },
  };
}

/**
 * Ramp a param to a value, continuously, from wherever it actually is at `at`.
 *
 * THE SINGLE MOST IMPORTANT FUNCTION IN THIS DIRECTORY, which is a strange thing to say about six lines.
 * Every click and pop in Web Audio comes from a parameter jumping, and a parameter jumps whenever you
 * `setValueAtTime` on top of a ramp that is still running — `cancelScheduledValues` alone removes the
 * ramp and drops the value back to the last scheduled point, which is a discontinuity, which is a click.
 *
 * `cancelAndHoldAtTime` is the one call that says "stop what you are doing but stay where you are". It is
 * in the spec and in every current browser; the fallback for an old Safari reads `.value`, which is the
 * live value and therefore right for the common case where `at` is now.
 */
export function rampTo(param: AudioParam, at: number, target: number, seconds: number): void {
  const hold = param as AudioParam & { cancelAndHoldAtTime?: (t: number) => AudioParam };
  if (typeof hold.cancelAndHoldAtTime === 'function') {
    hold.cancelAndHoldAtTime(at);
  } else {
    param.cancelScheduledValues(at);
    param.setValueAtTime(param.value, at);
  }
  if (seconds <= 0) {
    param.setValueAtTime(target, at);
    return;
  }
  param.linearRampToValueAtTime(target, at + seconds);
}
