import type { ItemContent } from '@gt/contracts';

/**
 * Renders the declarative content shapes a generator emits.
 *
 * Generators return data rather than markup on purpose. It keeps them testable, it keeps the
 * answer key out of the DOM, and it means a second surface can draw the same item differently
 * without the item library knowing anything about presentation.
 */
export function ContentView({ content, size = 'md' }: { content: ItemContent; size?: 'sm' | 'md' }) {
  switch (content.kind) {
    case 'text':
      return <span className={`content-text ${size}`}>{content.text}</span>;

    case 'glyphSequence':
      return (
        <span className={`content-glyphs ${size}`}>
          {content.glyphs.map((g, i) => (
            <span key={i} className={g === '?' ? 'glyph blank' : 'glyph'}>
              {g}
            </span>
          ))}
        </span>
      );

    case 'grid': {
      const cols = content.cols;
      return (
        <span
          className={`content-grid ${size}`}
          style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}
        >
          {content.cells.map((cell, i) => (
            <span key={i} className={cell === null ? 'cell blank' : 'cell'}>
              {cell ?? '?'}
            </span>
          ))}
        </span>
      );
    }

    case 'shape': {
      const pts = content.path;
      const maxX = Math.max(...pts.map(([x]) => x), 1);
      const maxY = Math.max(...pts.map(([, y]) => y), 1);
      const d = pts.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x} ${y}`).join(' ') + ' Z';
      const px = size === 'sm' ? 54 : 78;
      // Rotate about the figure's centre, then mirror across the vertical axis if asked.
      const cx = maxX / 2;
      const cy = maxY / 2;
      const transform = `rotate(${content.rotation} ${cx} ${cy})${
        content.mirrored ? ` translate(${maxX} 0) scale(-1 1)` : ''
      }`;
      return (
        <svg className="content-shape" width={px} height={px} viewBox={`-0.4 -0.4 ${maxX + 0.8} ${maxY + 0.8}`}>
          <g transform={transform}>
            <path d={d} />
          </g>
        </svg>
      );
    }
  }
}
