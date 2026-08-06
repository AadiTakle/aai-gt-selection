import { useEffect, useState } from 'react';

import { useReducedMotion } from './motion';

/**
 * The chunky bordered text box the whole franchise runs on: double border, one or two lines of text
 * that type themselves out, and a small arrow blinking in the corner when it has finished.
 *
 * The arrow is decoration, not a control. Nothing here waits for a tap, because a child mid-route
 * should never have to dismiss a box before they can answer.
 */

export type DialogueTone = 'route' | 'good' | 'soft' | 'desk';

interface DialogueProps {
  /** One or two lines. Two is the franchise's own limit and it keeps the writing tight. */
  readonly lines: readonly string[];
  readonly tone?: DialogueTone;
  /** Changes whenever the text should retype from the start. */
  readonly beat: string;
}

const CHAR_MS = 18;

export function Dialogue({ lines, tone = 'route', beat }: DialogueProps) {
  const reduced = useReducedMotion();
  const full = lines.join('\n');
  const [shown, setShown] = useState(reduced ? full.length : 0);

  useEffect(() => {
    if (reduced) {
      setShown(full.length);
      return;
    }
    setShown(0);
    let n = 0;
    const timer = window.setInterval(() => {
      n += 1;
      setShown(n);
      if (n >= full.length) window.clearInterval(timer);
    }, CHAR_MS);
    return () => window.clearInterval(timer);
    // `beat` is the identity of the message; the text itself may repeat between beats.
  }, [beat, full, reduced]);

  const done = shown >= full.length;
  const visible = full.slice(0, shown).split('\n');

  return (
    <div className={`pkb-dialogue tone-${tone}`}>
      <div className="pkb-dialogue-inner">
        <p className="pkb-dtext" aria-hidden="true">
          {lines.map((line, i) => (
            <span className="pkb-dline" key={i}>
              {visible[i] ?? ''}
            </span>
          ))}
        </p>
        {/* The whole message at once for a screen reader, rather than one character at a time. */}
        <p className="sr-only" aria-live="polite">
          {full.replace('\n', ' ')}
        </p>
        <span className={done ? 'pkb-arrow on' : 'pkb-arrow'} aria-hidden="true" />
      </div>
    </div>
  );
}
