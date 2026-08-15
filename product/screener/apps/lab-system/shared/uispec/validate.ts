import type { ChannelSpec, Ordering, UiSpec } from './spec';

/**
 * The invariants, enforced rather than trusted.
 *
 * Every rule here exists because breaking it produces an item that RENDERS FINE and cannot be answered.
 * That failure mode is why this file exists at all: a theme author gets no feedback from the screen, so
 * the feedback has to come from a check.
 */

export interface SpecIssue {
  readonly severity: 'error' | 'warning';
  readonly where: string;
  readonly message: string;
}

/** What the bank actually demands of each dimension, supplied by whoever owns the measurement. */
export interface BankDemands {
  /** Dimension name to the ordering the bank's rules rely on. */
  readonly ordering: Readonly<Record<string, Ordering>>;
  /** Dimension name to the largest number of distinct values any item needs. */
  readonly cardinality: Readonly<Record<string, number>>;
  /** Frame kinds that appear in the bank. */
  readonly frames: readonly string[];
  /** Response methods that appear in the bank. */
  readonly methods: readonly string[];
  /** Type codes that appear in the bank, for explanation coverage. */
  readonly types: readonly string[];
}

/** Whether a channel can carry an ordering. This is the load-bearing rule of the whole format. */
function carries(channel: ChannelSpec, ordering: Ordering): boolean {
  if (ordering === 'nominal') return true;
  if (ordering === 'cyclic') return channel.render === 'rotate';
  // ordered
  if (channel.render === 'repeat' || channel.render === 'scale') return true;
  // A tint can carry an order only if the author declared it as ordered, and even then it is the
  // weakest legal carrier, so it warns.
  return channel.render === 'tint' && channel.ordering === 'ordered';
}

function distinctValues(channel: ChannelSpec): number | null {
  if (channel.render === 'sprite' || channel.render === 'tint') return channel.values.length;
  if (channel.render === 'rotate') return channel.modulus;
  // repeat, scale and text are unbounded in principle.
  return null;
}

export function validateSpec(spec: UiSpec, demands: BankDemands): SpecIssue[] {
  const issues: SpecIssue[] = [];

  /* --- every dimension the bank uses must have a channel --- */
  for (const [dimension, ordering] of Object.entries(demands.ordering)) {
    const channel = spec.channels[dimension];
    if (!channel) {
      issues.push({
        severity: 'error',
        where: `channels.${dimension}`,
        message: `the bank uses "${dimension}" and this spec defines no channel for it, so every item using it is unservable here`,
      });
      continue;
    }

    /* --- the ordering must survive the mapping --- */
    if (!carries(channel, ordering)) {
      issues.push({
        severity: 'error',
        where: `channels.${dimension}`,
        message:
          `"${dimension}" is ${ordering} in the bank but rendered as "${channel.render}", which cannot carry that. ` +
          (ordering === 'ordered'
            ? 'An ordered rule on an unordered carrier gives the child nothing to see: the item renders and cannot be solved.'
            : 'A cyclic dimension needs a rotation, or a quarter turn is invisible.'),
      });
    } else if (ordering === 'ordered' && channel.render === 'tint') {
      issues.push({
        severity: 'warning',
        where: `channels.${dimension}`,
        message:
          `"${dimension}" is ordered and carried by a colour ramp. Legal only if the ramp is monotonic in ` +
          'lightness; check it against a greyscale conversion, because hue alone has no order.',
      });
    }

    /* --- there must be enough distinct values --- */
    const need = demands.cardinality[dimension] ?? 0;
    const have = distinctValues(channel);
    if (have !== null && have < need) {
      issues.push({
        severity: 'error',
        where: `channels.${dimension}`,
        message: `the bank needs ${need} distinct values of "${dimension}" and this spec supplies ${have}`,
      });
    }
  }

  /* --- frames and methods the bank uses must be presentable --- */
  for (const frame of demands.frames) {
    if (!spec.frames[frame]) {
      issues.push({
        severity: 'error',
        where: `frames.${frame}`,
        message: `the bank contains "${frame}" frames and this spec does not present them`,
      });
    } else if (!spec.capabilities.frames.includes(frame)) {
      issues.push({
        severity: 'warning',
        where: `capabilities.frames`,
        message: `"${frame}" is styled but not declared in capabilities, so the backend will not send it`,
      });
    }
  }

  for (const method of demands.methods) {
    if (!spec.methods[method]) {
      issues.push({
        severity: 'error',
        where: `methods.${method}`,
        message: `the bank contains "${method}" responses and this spec does not present them`,
      });
    }
  }

  /* --- declaring a capability you have not styled is worse than not declaring it --- */
  for (const method of spec.capabilities.methods) {
    if (!spec.methods[method]) {
      issues.push({
        severity: 'error',
        where: `capabilities.methods`,
        message: `"${method}" is declared supported but has no presentation, so the backend will send items this surface cannot draw`,
      });
    }
  }

  /* --- every type must be explainable --- */
  for (const type of demands.types) {
    const byType = spec.explanations[type];
    if (byType) continue;
    // A method-level fallback is acceptable, but only if one exists.
    const anyMethodFallback = demands.methods.some((m) => spec.explanations[m]);
    if (!anyMethodFallback) {
      issues.push({
        severity: 'error',
        where: `explanations.${type}`,
        message: `no explanation for "${type}" and no method-level fallback, so a child meets it with no idea how to answer`,
      });
    } else {
      issues.push({
        severity: 'warning',
        where: `explanations.${type}`,
        message: `"${type}" falls back to a method-level explanation. Check the wording still describes THIS presentation`,
      });
    }
  }

  /* --- a surface with no text cannot carry reading --- */
  if (spec.capabilities.readingBand === 'none') {
    const textChannels = Object.entries(spec.channels).filter(([, c]) => c.render === 'text');
    if (textChannels.length > 0) {
      issues.push({
        severity: 'warning',
        where: 'capabilities.readingBand',
        message:
          `this surface declares it carries no reading but renders ${String(textChannels.length)} dimension(s) as text; ` +
          'those items will be shown to a child who cannot read them',
      });
    }
  }

  return issues;
}

export function isServable(issues: readonly SpecIssue[]): boolean {
  return !issues.some((i) => i.severity === 'error');
}
