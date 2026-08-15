import type { JSX } from 'react';

import { summarise } from './stats';
import { useReading } from './store';

import './perf.css';

/**
 * The panel. Flat DOM, outside the Canvas, deliberately ugly — it is a workshop instrument and
 * looking like the game would be a way to forget it is on.
 *
 * The colouring is the whole point of showing p99 next to the median: green under 16.7ms is one
 * frame at 60fps, amber under 33.4 is one frame at 30, red past that is a visible stall. A number
 * with no budget beside it is a number nobody acts on.
 */
function band(ms: number): string {
  if (ms <= 16.7) return 'ok';
  if (ms <= 33.4) return 'warn';
  return 'bad';
}

export function Hud(): JSX.Element | null {
  const reading = useReading();
  if (!reading) return null;
  const s = summarise(reading.frames);
  const fps = s.median > 0 ? Math.round(1000 / s.median) : 0;
  return (
    <div className="bh-perf">
      <div className="bh-perf-row">
        <span className={`bh-perf-n bh-perf-${band(s.median)}`}>{s.median.toFixed(1)}</span>
        <span className="bh-perf-k">ms median</span>
        <span className="bh-perf-k">{fps} fps</span>
      </div>
      <div className="bh-perf-row">
        <span className={`bh-perf-n bh-perf-${band(s.p99)}`}>{s.p99.toFixed(1)}</span>
        <span className="bh-perf-k">p99</span>
        <span className="bh-perf-k">{s.max.toFixed(0)} max</span>
      </div>
      <div className="bh-perf-row">
        <span className="bh-perf-n">{reading.calls}</span>
        <span className="bh-perf-k">draw calls</span>
      </div>
      <div className="bh-perf-row">
        <span className="bh-perf-n">{(reading.triangles / 1000).toFixed(0)}k</span>
        <span className="bh-perf-k">tris</span>
        <span className="bh-perf-k">{reading.programs} programs</span>
      </div>
      <div className="bh-perf-row bh-perf-quiet">
        {reading.geometries} geometries · {reading.textures} textures
      </div>
    </div>
  );
}
