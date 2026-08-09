/**
 * TEMPORARY. The harness that made it possible to hear each sound on its own, and — more usefully — the
 * place the offline measurements are run from.
 *
 * It uses THE SHIPPED PATH and nothing else: `AudioProvider`, `useAudio`, `MuteButton`. The buttons call the
 * same five functions `Game.tsx` will call, through the same gesture gate, so a sound that works here works
 * there. Nothing in this file reaches into the engine except `audioState()`, which is a read.
 *
 * The MEASURE button runs `measure.ts` in the page and prints its table. `verify.mjs` calls the same function
 * in headless Chrome and reads the same text out, so the numbers in the terminal are the numbers a human sees
 * here — there is no second implementation of the check.
 *
 * `?quiet=1` fakes prefers-reduced-motion. It is handled by an inline script in `preview.html` and it has to
 * be: imports are hoisted, so `mute.ts` has already read the media query before any line of this file runs.
 */
import { StrictMode, useCallback, useEffect, useRef, useState, type JSX } from 'react';
import { createRoot } from 'react-dom/client';

import { audioState } from './engine';
import { formatReport, measureAll, type Report } from './measure';
import { AudioProvider, MuteButton, useAudio } from './index';
import { useMuted } from './mute';

/**
 * The measurement, at module scope and touching no React state, so it stays callable when the board is
 * unmounted for the teardown check. The button below wraps it to also put the table on the page.
 */
async function runMeasure(): Promise<string> {
  const w = window as unknown as { __audioReport?: Report; __audioText?: string };
  try {
    const report = await measureAll();
    const text = formatReport(report);
    w.__audioReport = report;
    w.__audioText = text;
    console.log(text);
    return text;
  } catch (e) {
    const text = `MEASUREMENT THREW: ${e instanceof Error ? e.message : String(e)}`;
    w.__audioText = text;
    console.error(e);
    return text;
  }
}

// Registered once, and deliberately not from inside a component: `verify.mjs` reads the engine's state after
// unmounting the provider, which is precisely when no component is left to have registered it.
(window as unknown as { __audio: { measure: () => Promise<string>; state: () => ReturnType<typeof audioState> } }).__audio =
  { measure: runMeasure, state: audioState };

function Board(): JSX.Element {
  const audio = useAudio();
  const off = useMuted();
  const [report, setReport] = useState<string>('');
  const [running, setRunning] = useState(false);
  const [state, setState] = useState(() => audioState());
  const holding = useRef(false);

  useEffect(() => {
    const id = window.setInterval(() => setState(audioState()), 250);
    return () => window.clearInterval(id);
  }, []);

  const measure = useCallback(async () => {
    setRunning(true);
    setReport('rendering…');
    setReport(await runMeasure());
    setRunning(false);
  }, []);

  const holdOn = useCallback(() => {
    if (holding.current) return;
    holding.current = true;
    audio.suckStart();
  }, [audio]);

  const holdOff = useCallback(() => {
    if (!holding.current) return;
    holding.current = false;
    audio.suckStop();
  }, [audio]);

  useEffect(() => {
    // A pointer released outside the pad must still stop the loop, exactly as a window blur must in the game.
    window.addEventListener('pointerup', holdOff);
    window.addEventListener('blur', holdOff);
    return () => {
      window.removeEventListener('pointerup', holdOff);
      window.removeEventListener('blur', holdOff);
    };
  }, [holdOff]);

  return (
    <>
      <MuteButton />
      <p className="lead">
        Everything here is synthesised: oscillators, noise buffers filled in <code>noise.ts</code>, biquad
        filters, and one hand-built convolution impulse. No audio files. Press a button to hear one sound on
        its own. Sound is {off ? <b>off — press the speaker or M</b> : <b>on</b>}.
      </p>

      <div className="row">
        <button type="button" className="snd" data-role="squish" onClick={() => audio.squish()}>
          squish · drawn in
        </button>
        <button type="button" className="snd" data-role="plop" onClick={() => audio.plop()}>
          plop · release
        </button>
        <button type="button" className="snd" data-role="land" onClick={() => audio.land()}>
          land · touches down
        </button>
        <button type="button" className="snd" data-role="coin" onClick={() => audio.coin?.()}>
          coin
        </button>
        <button type="button" className="snd" data-role="hatch" onClick={() => audio.hatch?.()}>
          hatch
        </button>
      </div>

      <div className="row">
        <button
          type="button"
          className="snd hold"
          data-role="suck"
          onPointerDown={holdOn}
          onPointerUp={holdOff}
          onPointerLeave={holdOff}
        >
          HOLD to vacuum
        </button>
        <button
          type="button"
          className="snd"
          onClick={() => {
            // The full cycle at the spacing the game produces it: draw, release, arrive.
            audio.suckStart();
            window.setTimeout(() => {
              audio.suckStop();
              audio.squish();
            }, 900);
            window.setTimeout(() => audio.plop(), 1900);
            window.setTimeout(() => audio.land(), 2600);
          }}
        >
          the whole cycle
        </button>
        <button
          type="button"
          className="snd"
          onClick={() => {
            for (let i = 0; i < 8; i += 1) window.setTimeout(() => audio.squish(), i * 260);
          }}
        >
          eight squishes · is it irritating yet
        </button>
      </div>

      <div className="card state">
        <h2>engine</h2>
        <div>
          AudioContext: <b>{state.context}</b> · vacuum built: <b>{state.hasVacuum ? 'yes' : 'no'}</b> ·
          drawing: <b>{state.sucking ? 'yes' : 'no'}</b> · pad scheduling:{' '}
          <b>{state.padRunning ? 'yes' : 'no'}</b> · providers: <b>{state.refs}</b>
        </div>
        <div style={{ color: '#7a5c3f', marginTop: '0.35rem' }}>
          "none" before the first click is correct: no context is constructed until a gesture. The ambient pad
          fades in over twelve seconds and its first swell is six to eleven seconds after that, so give it a
          moment before deciding it is not there.
        </div>
      </div>

      <div className="row">
        <button type="button" className="snd wide" disabled={running} onClick={() => void measure()}>
          {running ? 'rendering…' : 'MEASURE · offline render of every graph'}
        </button>
      </div>

      {report ? (
        <div className="card">
          <h2>measurements</h2>
          <pre>{report}</pre>
        </div>
      ) : null}
    </>
  );
}

/**
 * The provider can be unmounted from here, which is the only way to see the teardown happen: it should stop
 * every source, disconnect every node and CLOSE the context. `verify.mjs` presses this and then reads
 * `state().disposed`, which is the closed context's own state string.
 */
function Preview(): JSX.Element {
  const [mounted, setMounted] = useState(true);
  const [disposed, setDisposed] = useState<string | null>(null);

  useEffect(() => {
    if (mounted) return;
    // The teardown is deferred by a tick, so read it after one.
    const id = window.setTimeout(() => setDisposed(audioState().disposed), 60);
    return () => window.clearTimeout(id);
  }, [mounted]);

  return (
    <>
      <h1>Bramblebrook · audio</h1>
      <div className="row">
        <button type="button" className="snd" data-role="mount" onClick={() => setMounted((m) => !m)}>
          {mounted ? 'unmount the provider · check teardown' : 'mount it again'}
        </button>
      </div>
      {mounted ? (
        <AudioProvider>
          <Board />
        </AudioProvider>
      ) : (
        <div className="card">
          <h2>unmounted</h2>
          <div>
            disposed context state: <b>{disposed ?? '(nothing had been built)'}</b> — should be
            <code> closed</code>.
          </div>
        </div>
      )}
    </>
  );
}

const host = document.getElementById('root')!;
const store = window as unknown as { __audioRoot?: ReturnType<typeof createRoot> };
// One root per container, kept across hot updates: Vite re-executes this module on a hot update and a second
// `createRoot` on the same node is two reconcilers on one tree.
store.__audioRoot ??= createRoot(host);
store.__audioRoot.render(
  <StrictMode>
    <Preview />
  </StrictMode>,
);
