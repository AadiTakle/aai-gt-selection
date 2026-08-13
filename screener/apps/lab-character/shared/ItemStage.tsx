import { Component, Suspense, lazy, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';

import type { Skin } from './glyphs';
import { NEUTRAL_SKIN } from './glyphs';
import type { AgeBand, RendererProps, Serve } from './types';

/**
 * A renderer takes the item contract plus an optional skin. The skin is how a world reaches inside
 * the question: the item says `{shape:'star'}` and the world decides that a star is a dragon egg.
 * Without this passthrough each world would be a frame around a question drawn in someone else's
 * house style, which is the exact limitation this lab exists to escape.
 */
type ItemRenderer = React.ComponentType<RendererProps & { skin?: Skin }>;

/**
 * The stage an item is drawn on, and the registry that decides which renderer draws it.
 *
 * NO IFRAME. This is the deliberate departure from `apps/web/src/BankScreener.tsx`, which mounts
 * `/qbank/items/<typeCode>.html` and themes it by setting CSS custom properties on its document.
 * That path can only ever retint what the prebuilt renderer chose to draw. Everything here is drawn
 * in React from the item's headless `content`, so each world decides what the parts look like.
 *
 * THE REGISTRY IS THE CONTRACT. The engine may serve any type in its pool and the session config
 * cannot restrict which (see the handoff). The pool is therefore constrained upstream, by pointing
 * the lab's API at a curated bank directory. If a type still arrives with no renderer, that is a
 * configuration mistake rather than a child's problem, so the stage says so plainly and offers a way
 * onward rather than trapping the session on a blank panel.
 */

const REGISTRY: Record<string, React.LazyExoticComponent<ItemRenderer>> = {
  'FLU-MATRIX-01': lazy(() => import('../renderers/FluMatrix')),
  'FLU-CARPET-01': lazy(() => import('../renderers/FluCarpet')),
  'FLU-OPCHAIN-01': lazy(() => import('../renderers/FluOpChain')),
  'QUANT-SERIES-01': lazy(() => import('../renderers/QuantSeries')),
  'QUANT-FUNC-01': lazy(() => import('../renderers/QuantFunc')),
  'QUANT-BALANCE-01': lazy(() => import('../renderers/QuantBalance')),
  'QUANT-DOTS-01': lazy(() => import('../renderers/QuantDots')),
  'SPA-XFORM-01': lazy(() => import('../renderers/SpaXform')),
};

export const RENDERABLE_TYPES = Object.keys(REGISTRY);

export function ItemStage({
  serve,
  band,
  onAnswer,
  answered,
  skin = NEUTRAL_SKIN,
}: {
  serve: Serve;
  band: AgeBand;
  onAnswer: (key: string) => void;
  answered: boolean;
  /** The world's art direction, handed down into the question itself. */
  skin?: Skin;
}) {
  const Renderer = REGISTRY[serve.typeCode];

  // Remount on item change so a renderer never carries the previous item's local state, which is
  // how a child ends up looking at question five with question four's selection still lit.
  const key = serve.served.itemId;

  const [entered, setEntered] = useState(false);
  useEffect(() => {
    setEntered(false);
    const t = window.setTimeout(() => setEntered(true), 20);
    return () => window.clearTimeout(t);
  }, [key]);

  const content = useMemo(() => serve.served.content, [serve]);

  if (!Renderer) {
    return <StageGap typeCode={serve.typeCode} onAnswer={onAnswer} />;
  }

  return (
    <div className={`stage${entered ? ' stage-in' : ''}${answered ? ' stage-settled' : ''}`} key={key}>
      <StageBoundary typeCode={serve.typeCode} onAnswer={onAnswer}>
        <Suspense fallback={<div className="stage-wait" aria-hidden="true" />}>
          <Renderer content={content} onAnswer={onAnswer} answered={answered} band={band} skin={skin} />
        </Suspense>
      </StageBoundary>
    </div>
  );
}

/**
 * What a child sees when this lab cannot draw the item it was handed.
 *
 * Two rules govern the copy. It never says or implies anything was wrong, because nothing was: the
 * gap is ours. And it always offers a way onward, because a session that cannot advance is worse
 * than one that loses an item. The engineering detail is present but demoted, since the person who
 * needs it is reading a console rather than sitting with a child.
 *
 * The class names are intentionally the shared ones. A world with a dark surface will want to
 * re-skin these, and every world that does so is duplicating work that belongs here.
 */
function StageGap({ typeCode, onAnswer }: { typeCode: string; onAnswer: (key: string) => void }) {
  return (
    <div className="stage-missing" role="status">
      <p>This one is still being built. Everything you have done so far still counts.</p>
      <button type="button" className="btn-quiet" onClick={() => onAnswer('A')}>
        Keep going
      </button>
      <p className="stage-missing-detail">
        No renderer for <code>{typeCode}</code>. Add one under <code>renderers/</code> and register it
        in <code>shared/ItemStage.tsx</code>, or drop the type from{' '}
        <code>data/lab-character/banks/</code>.
      </p>
    </div>
  );
}

/**
 * Catches a renderer that throws, or a lazy chunk that fails to load.
 *
 * Without this, one bad renderer takes the whole session down: the throw escapes Suspense, unmounts
 * the world, and the child loses a run that was otherwise fine. A dropped item is recoverable and a
 * dead session is not, so this converts the first into the second's opposite.
 */
class StageBoundary extends Component<
  { typeCode: string; onAnswer: (key: string) => void; children: ReactNode },
  { failed: boolean }
> {
  override state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  override componentDidCatch(error: unknown) {
    // Left visible on purpose: this is a bug in a renderer and somebody has to be able to find it.
    console.error(`[lab-character] renderer failed for ${this.props.typeCode}`, error);
  }

  override render() {
    if (this.state.failed) {
      return <StageGap typeCode={this.props.typeCode} onAnswer={this.props.onAnswer} />;
    }
    return this.props.children;
  }
}
