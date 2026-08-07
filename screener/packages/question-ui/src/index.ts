/**
 * One renderer that can draw any bank item, dressed from a swappable UI kit.
 *
 * WHY THIS IS A PACKAGE. It started inside the review harness, which is where you WANT to look at a
 * question in three different skins side by side. But the screener needs the same thing for a different
 * reason — to actually run a session in a chosen look — and a product surface should not depend on a
 * review tool's internals, because the day the review tool is deleted the screener should not break.
 * So the renderer, the kits, the art and the design registry live here and both apps import them.
 *
 * WHAT A CALLER HAS TO KNOW. `ThemedQuestion` never receives an answer key: `adapt-item` strips
 * `answer`, `scoring` and `provenance`, and they are not on the `BankItem` type it accepts, so reaching
 * for the key does not compile. It reports the chosen option through `onAnswer` and the host decides
 * correctness, which keeps marking on the server where it belongs.
 *
 * AND THE ONE THING IT DELIBERATELY WILL NOT DO. When the resolver cannot guarantee that cells the item
 * says differ get different pictures, this draws nothing and says why. A near-miss substitution leaves
 * an item looking answerable when it is not, and that failure is invisible from the outside: the child
 * answers, the engine scores it, and nothing reports that the item had two defensible answers.
 */

export { ThemedQuestion } from './ThemedQuestion';
export { planFor, askableContent, type BankItem, type Plan } from './adapt-item';
export { DESIGNS, DEFAULT_DESIGN, designById, loadDesign, saveDesign, type Design, type DesignKind } from './designs';
export { useKit, type SpriteFn } from './useKit';
