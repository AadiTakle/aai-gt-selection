import { Component, Suspense, lazy, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';

import type { Skin } from '../../lab-character/shared/glyphs';
import { NEUTRAL_SKIN } from '../../lab-character/shared/glyphs';
import type { OptionRef, RendererProps, Serve } from './types';

/**
 * The stage an item is drawn on, and the one place a chosen option becomes an answerable reference.
 *
 * NO IFRAME ANYWHERE. Every item is drawn in React from the headless `content`, so this world decides
 * what the parts look like. The eight non-verbal renderers are reused verbatim from
 * `apps/lab-character/renderers/`; the three verbal ones are this app's own.
 *
 * THE KEY-VERSUS-INDEX PROBLEM, which is the whole reason this file is not a one-liner.
 * `scoreResponse` has two paths that never meet: a numeric `correctKey` is marked against
 * `selectedIndex`, a string one against `key`. The renderers were written for lettered options and
 * call `onAnswer(option.key)`. But every `VER-*` option is `{pair}` / `{token}` / `{order}` with NO
 * `key` field at all, so for those types the position IS the answer. `toRef` resolves whichever the
 * item actually uses, and the hook then sends both. Getting this wrong does not fail loudly: it marks
 * every verbal item incorrect, silently and confidently.
 */

const REGISTRY: Record<string, React.LazyExoticComponent<React.ComponentType<RendererProps & { skin?: Skin }>>> = {
  // Reused from lab-character, unchanged.
  'FLU-MATRIX-01': lazy(() => import('../../lab-character/renderers/FluMatrix')),
  'FLU-CARPET-01': lazy(() => import('../../lab-character/renderers/FluCarpet')),
  'FLU-OPCHAIN-01': lazy(() => import('../../lab-character/renderers/FluOpChain')),
  'QUANT-SERIES-01': lazy(() => import('../../lab-character/renderers/QuantSeries')),
  'QUANT-FUNC-01': lazy(() => import('../../lab-character/renderers/QuantFunc')),
  'QUANT-BALANCE-01': lazy(() => import('../../lab-character/renderers/QuantBalance')),
  'QUANT-DOTS-01': lazy(() => import('../../lab-character/renderers/QuantDots')),
  'SPA-XFORM-01': lazy(() => import('../../lab-character/renderers/SpaXform')),
  // This app's own, and the reason `toRef` exists. Registered at M1; until then a verbal sortie
  // shows the gap notice rather than pretending, and `curate-banks.ts` still links the banks so the
  // pool composition is stable across milestones.
  // 'VER-RELPAIR-01': lazy(() => import('../renderers/VerRelpair')),
  // 'VER-SORTBOT-01': lazy(() => import('../renderers/VerSortbot')),
  // 'VER-SEQUENCE-01': lazy(() => import('../renderers/VerSequence')),
};

export const RENDERABLE_TYPES = Object.keys(REGISTRY);

/**
 * Resolve what a renderer handed back into something markable.
 *
 * A renderer passes whatever it treated as the option's identity. If the item's options carry `key`,
 * that is it and the index is looked up. If they do not, the renderer was handed a stringified index,
 * so the index is authoritative and the key is the same string.
 */
export function toRef(content: Record<string, unknown>, handed: string): OptionRef {
  const options = Array.isArray(content.options) ? (content.options as Record<string, unknown>[]) : [];
  const byKey = options.findIndex((o) => typeof o?.key === 'string' && o.key === handed);
  if (byKey >= 0) return { key: handed, index: byKey };

  const asIndex = Number(handed);
  if (Number.isInteger(asIndex) && asIndex >= 0 && asIndex < options.length) {
    return { key: handed, index: asIndex };
  }
  // Unresolvable. Send it anyway rather than silently dropping the child's tap: the server will
  // return null and count it unscorable, which is visible, instead of marking it wrong.
  return { key: handed, index: -1 };
}

export function ItemStage({
  serve,
  band,
  onAnswer,
  answered,
  skin = NEUTRAL_SKIN,
}: {
  serve: Serve;
  band: RendererProps['band'];
  onAnswer: (ref: OptionRef) => void;
  answered: boolean;
  skin?: Skin;
}) {
  const Renderer = REGISTRY[serve.typeCode];
  const key = serve.served.itemId;
  const content = useMemo(() => serve.served.content, [serve]);

  const [entered, setEntered] = useState(false);
  useEffect(() => {
    setEntered(false);
    const t = window.setTimeout(() => setEntered(true), 20);
    return () => window.clearTimeout(t);
  }, [key]);

  if (!Renderer) return <StageGap typeCode={serve.typeCode} />;

  return (
    <div className={`stage${entered ? ' stage-in' : ''}${answered ? ' stage-settled' : ''}`} key={key}>
      <StageBoundary typeCode={serve.typeCode}>
        <Suspense fallback={<div className="stage-wait" aria-hidden="true" />}>
          <Renderer
            content={content}
            onAnswer={(handed: string) => onAnswer(toRef(content, handed))}
            answered={answered}
            band={band}
            skin={skin}
          />
        </Suspense>
      </StageBoundary>
    </div>
  );
}

/**
 * Shown when this app cannot draw what it was handed.
 *
 * It offers no way onward on purpose. A sortie is short and a skipped item would have to be answered
 * to advance, which means guessing on the child's behalf and feeding the posterior evidence nobody
 * produced. Losing the sortie is honest; inventing a response is not.
 */
function StageGap({ typeCode }: { typeCode: string }) {
  return (
    <div className="stage-missing" role="status">
      <p>Nothing to do here just now. Everything you have already done still counts.</p>
      <p className="stage-missing-detail">
        No renderer for <code>{typeCode}</code>. Register one in <code>shared/ItemStage.tsx</code> or
        drop the type from <code>curate-banks.ts</code>.
      </p>
    </div>
  );
}

/** One throwing renderer drops an item rather than killing the sortie. */
class StageBoundary extends Component<{ typeCode: string; children: ReactNode }, { failed: boolean }> {
  override state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  override componentDidCatch(error: unknown) {
    console.error(`[sanctuary] renderer failed for ${this.props.typeCode}`, error);
  }

  override render() {
    return this.state.failed ? <StageGap typeCode={this.props.typeCode} /> : this.props.children;
  }
}
