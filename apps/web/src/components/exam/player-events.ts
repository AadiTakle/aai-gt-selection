/**
 * The runner shows a single "Skip" affordance in its header, but the thing that
 * knows how to finish an item (native form vs same-origin iframe) is the active
 * renderer inside the player. A tiny window event bridges the two without the
 * runner needing an imperative handle into whichever renderer is mounted.
 */
export const EXAM_SKIP_EVENT = 'gt-exam-skip';

export function requestExamSkip(): void {
  if (typeof window !== 'undefined') window.dispatchEvent(new Event(EXAM_SKIP_EVENT));
}
