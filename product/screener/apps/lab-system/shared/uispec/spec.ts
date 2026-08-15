/**
 * The UI structure format: one file that turns the library's abstract question scaffolds into a themed
 * interface, without ever touching what the question measures.
 *
 * THE WORKFLOW THIS SERVES
 *
 *   1. app asks the backend for the next question, passing the session id
 *   2. backend returns a headless scaffold: a frame, some abstract elements, a response method
 *   3. app resolves that scaffold against THIS FILE to produce concrete UI
 *
 * The scaffold is authored by whoever owns the measurement. This file is authored by whoever owns the
 * app. Neither may edit the other, which is the entire point of the split.
 *
 * WHAT THIS FILE MAY AND MAY NOT DO
 *
 * May: decide what things look like, where they sit, what they are called, how they animate, what the
 * surrounding world is, and how the interaction is dressed.
 *
 * May not: change which elements exist, change their variable assignments, change how many choices
 * there are, change which one is correct, or change the response method. A matrix question stays a
 * matrix question answered by choosing one cell, however it is dressed.
 *
 * The invariants are enforced in `validate.ts` rather than trusted, because a theme that breaks one
 * usually still renders and simply produces an item nobody can answer.
 */

/* ------------------------------------------------------------------ dimensions */

/**
 * How a variable's values must behave, which is the one thing a theme is not free to reinterpret.
 *
 * This is the constraint that is easiest to violate and hardest to notice. If a rule says "x increases
 * along the row" and a theme maps x onto three unordered colours, the child is being asked to see a
 * progression in red, blue, green. The item still renders. It is simply unanswerable.
 */
export type Ordering =
  /** Values are merely different. Any distinguishable set works. */
  | 'nominal'
  /** Values run low to high in even steps. The rendering must preserve that reading. */
  | 'ordered'
  /** Values wrap, like orientation. Needs a visibly asymmetric carrier. */
  | 'cyclic';

/** How a theme renders one dimension. */
export type ChannelSpec =
  /**
   * A set of distinguishable things. `values` must be at least as long as the largest cardinality the
   * bank asks for on this dimension, or items will be unservable.
   */
  | {
      readonly render: 'sprite';
      readonly ordering: 'nominal';
      /** Ids resolved by the app's own sprite registry. */
      readonly values: readonly string[];
      readonly label?: string;
    }
  /** Repetition. The natural carrier for a count, and it preserves ordering for free. */
  | {
      readonly render: 'repeat';
      readonly ordering: 'ordered';
      /** What gets repeated. */
      readonly of: string;
      readonly label?: string;
    }
  /** A magnitude ramp: size, height, intensity. Ordered by construction. */
  | {
      readonly render: 'scale';
      readonly ordering: 'ordered';
      readonly from: number;
      readonly to: number;
      readonly unit: 'px' | 'rem' | '%';
      readonly label?: string;
    }
  /** A rotation. The only correct carrier for a cyclic dimension. */
  | {
      readonly render: 'rotate';
      readonly ordering: 'cyclic';
      readonly modulus: number;
      readonly label?: string;
    }
  /**
   * A colour ramp. Legal for `ordered` ONLY when the ramp is monotonic in lightness, because that is
   * the only way a child can say which colour comes next. Validation checks it.
   */
  | {
      readonly render: 'tint';
      readonly ordering: 'nominal' | 'ordered';
      readonly values: readonly string[];
      readonly label?: string;
    }
  /** Words or numbers, rendered as themselves. The carrier for language-bearing items. */
  | {
      readonly render: 'text';
      readonly ordering: 'nominal';
      readonly style?: 'plain' | 'sign' | 'label' | 'speech';
      readonly label?: string;
    };

/* ---------------------------------------------------------------------- frames */

/**
 * How a stem frame is laid out.
 *
 * `kind` is the library's frame and cannot be changed. `as` is the theme's presentation of it, and the
 * list is deliberately short: a frame carries meaning, so it can be dressed but not reinterpreted. A
 * matrix presented as a list stops being a matrix.
 */
export interface FrameSpec {
  readonly as: string;
  /** Where the frame sits relative to the choices. */
  readonly placement?: 'above' | 'beside' | 'behind' | 'overlay';
  /** Free-form styling hints the app's own renderer understands. */
  readonly style?: Readonly<Record<string, string | number>>;
}

/* --------------------------------------------------------------------- methods */

/**
 * How a response method is presented.
 *
 * The method itself is invariant: a `chooseOne` stays a single selection from the same set. What varies
 * is what the child is looking at when they choose. Corridors in a Backrooms game and podia on a game
 * show are both `chooseOne`, and both are legal.
 */
export interface MethodSpec {
  readonly as: string;
  /** Does a selection commit immediately, or does it need a confirm step? */
  readonly commit?: 'immediate' | 'confirm';
  readonly style?: Readonly<Record<string, string | number>>;
}

/* ---------------------------------------------------------------- explanations */

/**
 * How to play this kind of question.
 *
 * Every type must have one. The library ships defaults; a theme may override them and MUST override
 * them when its presentation deviates far enough that the default would mislead. "Tap the tile that
 * completes the grid" is wrong advice in a game where the tiles are corridors.
 */
export interface ExplanationSpec {
  /** One line, shown before the first item of this kind. */
  readonly how: string;
  /** Optional worked walkthrough for the first encounter. */
  readonly walkthrough?: readonly string[];
  /** Shown if the child stalls. Never a hint at the answer, only at the interaction. */
  readonly nudge?: string;
}

/* ------------------------------------------------------------ the spec itself */

/**
 * What the surface can present.
 *
 * Declared so the BACKEND can filter, rather than the app receiving something it cannot draw and having
 * to decline it mid-session. Declining measured out at 33% to 90% unscorable on this bank, which made
 * sessions unusable, so filtering has to happen before selection rather than after.
 */
export interface Capabilities {
  readonly methods: readonly string[];
  readonly frames: readonly string[];
  /** Highest reading band this surface can carry, or null when it can carry no text at all. */
  readonly readingBand: 'none' | 'K-1' | '2-3' | '4-5' | '6-8';
  /** Can the surface control stimulus timing? Paced items need this. */
  readonly timed: boolean;
  /** Can it show depth? Fold and cross-section items need it. */
  readonly depth: boolean;
  /** How many elements it can show at once. */
  readonly maxCoPresent: number;
}

export interface UiSpec {
  readonly spec: 'gt.uispec/v1';
  readonly id: string;
  readonly title: string;
  readonly describes: string;

  readonly capabilities: Capabilities;

  /**
   * One entry per dimension the bank uses. A dimension with no entry makes every item that uses it
   * unservable on this surface, which validation reports rather than discovering at runtime.
   */
  readonly channels: Readonly<Record<string, ChannelSpec>>;

  /** Keyed by the library's frame kind. */
  readonly frames: Readonly<Record<string, FrameSpec>>;

  /** Keyed by the library's response method. */
  readonly methods: Readonly<Record<string, MethodSpec>>;

  /**
   * Keyed by question type code, or by response method as a fallback.
   *
   * Per TYPE rather than only per method, because two types sharing a method still need different
   * advice: a matrix and a number series are both `chooseOne` and are not explained the same way.
   */
  readonly explanations: Readonly<Record<string, ExplanationSpec>>;

  /** World-level tokens the app's own components read. Not interpreted here. */
  readonly theme?: Readonly<Record<string, string>>;
}

/* -------------------------------------------------------------- render plan */

/** One resolved element: an abstract element, plus everything needed to draw it. */
export interface ResolvedElement {
  readonly id: string;
  /** Dimension name to the channel instruction and the concrete value chosen for it. */
  readonly channels: readonly {
    readonly dimension: string;
    readonly spec: ChannelSpec;
    /** The abstract value from the scaffold, unchanged. */
    readonly value: number | string;
    /** What the theme resolved it to. */
    readonly resolved: string | number;
  }[];
}

export interface ResolvedChoice extends ResolvedElement {
  /** The key the backend marks against. The app passes it back untouched. */
  readonly key: string;
}

/**
 * Everything an app needs to draw one question, with nothing left abstract and nothing invented.
 *
 * Note what is absent: which choice is correct. That stays on the server.
 */
export interface RenderPlan {
  readonly itemId: string;
  readonly typeCode: string;
  readonly frame: { readonly kind: string; readonly spec: FrameSpec; readonly slots: readonly (ResolvedElement | null)[]; readonly rows: number; readonly cols: number };
  readonly method: { readonly kind: string; readonly spec: MethodSpec };
  readonly choices: readonly ResolvedChoice[];
  readonly explanation: ExplanationSpec;
  /** Populated when the spec could not fully resolve the scaffold. Non-empty means do not serve it. */
  readonly problems: readonly string[];
}
