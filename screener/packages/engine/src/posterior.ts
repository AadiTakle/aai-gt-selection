import { pCorrect, type ItemParams } from './irf.js';

const GRID_MIN = -4;
const GRID_MAX = 4;
const GRID_STEP = 0.05;

/**
 * Belief about ability, held as a discrete grid rather than a point estimate.
 *
 * A grid is used deliberately. The quantity the engine actually needs is
 * P(theta > threshold), which is an integral over the posterior, and a grid gives that
 * directly. A point estimate plus a standard error would force a normality assumption that
 * is wrong early in a session, which is exactly when a short screener makes its decision.
 */
export class Posterior {
  readonly grid: readonly number[];
  private density: number[];

  constructor() {
    const grid: number[] = [];
    for (let t = GRID_MIN; t <= GRID_MAX + 1e-9; t += GRID_STEP) grid.push(Number(t.toFixed(4)));
    this.grid = grid;
    // Standard normal prior. Weak, and stated rather than hidden: before any response the
    // engine believes only that the candidate is somewhere in the population.
    this.density = grid.map((t) => Math.exp(-0.5 * t * t));
    this.normalise();
  }

  private normalise(): void {
    const total = this.density.reduce((s, d) => s + d, 0);
    if (total <= 0 || !Number.isFinite(total)) {
      // Degenerate posterior. Fall back to uniform rather than emit NaN downstream.
      this.density = this.grid.map(() => 1 / this.grid.length);
      return;
    }
    this.density = this.density.map((d) => d / total);
  }

  /** Bayes update on one scored response. */
  update(params: ItemParams, correct: boolean): void {
    this.density = this.grid.map((t, i) => {
      const p = pCorrect(t, params);
      const likelihood = correct ? p : 1 - p;
      return (this.density[i] as number) * likelihood;
    });
    this.normalise();
  }

  /** The quantity the decision is actually made on. */
  probabilityAbove(threshold: number): number {
    let mass = 0;
    for (let i = 0; i < this.grid.length; i++) {
      if ((this.grid[i] as number) > threshold) mass += this.density[i] as number;
    }
    return mass;
  }

  mean(): number {
    let m = 0;
    for (let i = 0; i < this.grid.length; i++) m += (this.grid[i] as number) * (this.density[i] as number);
    return m;
  }

  sd(): number {
    const mu = this.mean();
    let v = 0;
    for (let i = 0; i < this.grid.length; i++) {
      const d = (this.grid[i] as number) - mu;
      v += d * d * (this.density[i] as number);
    }
    return Math.sqrt(v);
  }

  /** Central credible interval, for display and for the audit record. */
  interval(mass = 0.9): [number, number] {
    const tail = (1 - mass) / 2;
    return [this.quantile(tail), this.quantile(1 - tail)];
  }

  private quantile(q: number): number {
    let cum = 0;
    for (let i = 0; i < this.grid.length; i++) {
      cum += this.density[i] as number;
      if (cum >= q) return this.grid[i] as number;
    }
    return this.grid[this.grid.length - 1] as number;
  }

  snapshot(): readonly number[] {
    return [...this.density];
  }
}
