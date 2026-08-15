import type { MutableRefObject } from 'react';

import type { Palette, Serve } from './types';

/**
 * The item, in an iframe, tinted to match the world around it.
 *
 * Three things here are mechanism rather than taste.
 *
 * The `key` is the type code, so React replaces the frame when the type changes instead of reusing it.
 * A reused frame keeps the previous item's script state and the handshake never completes.
 *
 * The src must be same-origin (`/qbank/items/...` proxied through this dev server), because a
 * cross-origin frame's document cannot have CSS properties set on it from the host, and setting those
 * properties IS the theming mechanism.
 *
 * The palette is applied on load as well as on handover, since the frame can finish loading either
 * side of the item being handed to it.
 */
export function ItemFrame({
  serve,
  frameRef,
  onLoad,
  palette,
  className,
  title,
}: {
  serve: Serve;
  frameRef: MutableRefObject<HTMLIFrameElement | null>;
  onLoad: () => void;
  palette?: Palette;
  className?: string;
  title?: string;
}) {
  return (
    <iframe
      ref={frameRef}
      key={serve.typeCode}
      src={`/qbank/items/${serve.typeCode}.html`}
      title={title ?? serve.typeCode}
      onLoad={() => {
        onLoad();
        const frame = frameRef.current;
        const doc = frame?.contentDocument;
        if (!doc || !palette) return;
        for (const [name, value] of Object.entries(palette)) {
          doc.documentElement.style.setProperty(name, value);
        }
      }}
      className={className ?? 'itemframe'}
    />
  );
}
