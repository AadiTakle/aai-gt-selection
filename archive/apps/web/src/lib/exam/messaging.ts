import { z } from 'zod';

import type { ServedItem } from '@gt-selection/exam-engine';

import { injectLegacyBridge } from './legacy-bridge';
import type { ItemReveal } from './reveal';

/**
 * Host side of the demo-embedding postMessage protocol (BUILD_PLAN §2). The
 * runner talks to each demo iframe ONLY through this channel — it never reads the
 * demo DOM.
 *
 *   host → demo: {type:'init', item:ServedItem}, {type:'start'}, {type:'reveal', reveal}
 *   demo → host: {type:'ready'}, {type:'result', result}, {type:'telemetry', event}
 *
 * Every message is source-tagged (`gt-exam-host` / `gt-exam-demo`) and every
 * inbound message is origin- and source-window-checked, then Zod-validated. The
 * refactored (pure-renderer) demos emit this protocol natively; a legacy demo is
 * bridged from its DOM (legacy-bridge.ts) only when explicitly requested.
 */

export const HOST_SOURCE = 'gt-exam-host' as const;
export const DEMO_SOURCE = 'gt-exam-demo' as const;

export type HostMessage =
  | { source: typeof HOST_SOURCE; type: 'init'; item: ServedItem }
  | { source: typeof HOST_SOURCE; type: 'start'; tutorial?: boolean }
  | { source: typeof HOST_SOURCE; type: 'reveal'; reveal: ItemReveal };

/**
 * Inbound result, validated leniently: a demo may omit ids (the runner
 * re-attaches them from the served item), correctness never comes from the
 * client, and `metrics`/`telemetry` are accepted as loose bags (the runner keeps
 * only finite numeric metrics). This tolerates every refactored demo's telemetry
 * shape without dropping a result.
 */
export const inboundResultSchema = z.object({
  itemId: z.string().optional(),
  typeCode: z.string().optional(),
  domain: z.string().optional(),
  response: z.unknown(),
  metrics: z.record(z.string(), z.unknown()).optional(),
  telemetry: z.array(z.unknown()).optional(),
});
export type InboundResult = z.infer<typeof inboundResultSchema>;

/** A telemetry event is accepted as a loose object; the runner stamps the itemId. */
export const inboundTelemetrySchema = z.record(z.string(), z.unknown());
export type InboundTelemetry = z.infer<typeof inboundTelemetrySchema>;

export interface ExamHostHandlers {
  onReady?: () => void;
  onResult: (result: InboundResult) => void;
  onTelemetry?: (event: InboundTelemetry) => void;
  /** Expected demo origin. Defaults to the current window origin (same-origin). */
  origin?: string;
}

/**
 * Wraps a single demo iframe: attaches one message listener, posts init/start,
 * and surfaces validated ready/result/telemetry callbacks. Dispose on unmount.
 */
export class ExamHost {
  private readonly iframe: HTMLIFrameElement;
  private readonly handlers: ExamHostHandlers;
  private readonly origin: string;

  constructor(iframe: HTMLIFrameElement, handlers: ExamHostHandlers) {
    this.iframe = iframe;
    this.handlers = handlers;
    this.origin = handlers.origin ?? window.location.origin;
    window.addEventListener('message', this.handleMessage);
  }

  private handleMessage = (event: MessageEvent): void => {
    // Only accept messages from this iframe's window, same origin, correct tag.
    if (event.source !== this.iframe.contentWindow) return;
    if (event.origin !== this.origin && event.origin !== 'null') return;
    const data = event.data as { source?: unknown; type?: unknown } | null;
    if (!data || data.source !== DEMO_SOURCE) return;

    switch (data.type) {
      case 'ready': {
        this.handlers.onReady?.();
        return;
      }
      case 'result': {
        const parsed = inboundResultSchema.safeParse((data as { result?: unknown }).result);
        if (parsed.success) this.handlers.onResult(parsed.data);
        return;
      }
      case 'telemetry': {
        const parsed = inboundTelemetrySchema.safeParse((data as { event?: unknown }).event);
        if (parsed.success) this.handlers.onTelemetry?.(parsed.data);
        return;
      }
      default:
        return;
    }
  };

  private post(message: HostMessage): void {
    this.iframe.contentWindow?.postMessage(message, this.origin);
  }

  /** Send the served item to render (no answer/scoring — see the served contract). */
  init(item: ServedItem): void {
    this.post({ source: HOST_SOURCE, type: 'init', item });
  }

  /**
   * Tell the demo to begin the scored interaction.
   *
   * `tutorial` opts into the demo's built-in wordless gesture hint — a few seconds of a pointer
   * showing where to tap. It is OFF by default, because a demonstration in front of every item is
   * dead time in a test and most types are explained adequately by their own one-line instruction.
   * Pass it only for a type whose interaction genuinely cannot be conveyed in a sentence.
   *
   * The demo's own "already shown" flag lives in the item's document, and the runner reloads that
   * document per item — so the flag resets every item and the CALLER must track what it has already
   * demonstrated, or the hint replays forever.
   */
  start(tutorial = false): void {
    this.post(
      tutorial
        ? { source: HOST_SOURCE, type: 'start', tutorial: true }
        : { source: HOST_SOURCE, type: 'start' },
    );
  }

  /**
   * Hand the demo the outcome its own mechanism produced, AFTER the server has graded a committed
   * trial. Only a learning-block type asks for one, and only because a block with no observable
   * outcome has nothing to learn from (STAGE2_QUESTION_DESIGN §1.5). It is never a verdict: see
   * `lib/exam/reveal.ts`.
   */
  reveal(reveal: ItemReveal): void {
    this.post({ source: HOST_SOURCE, type: 'reveal', reveal });
  }

  /**
   * Install the temporary DOM→postMessage bridge for a legacy self-rendering
   * demo. The refactored (pure-renderer) demos speak the protocol natively, so
   * the runner only calls this for demos that are NOT in the native set.
   */
  installLegacyBridge(): boolean {
    return injectLegacyBridge(this.iframe);
  }

  dispose(): void {
    window.removeEventListener('message', this.handleMessage);
  }
}
