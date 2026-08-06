import { useEffect, useState } from 'react';

/**
 * Whether the machine has asked for less movement.
 *
 * Read as a value rather than left to CSS alone, because some of the motion here is a timeline in
 * JavaScript (a ball arcs, then wobbles, then clicks) and a media query cannot shorten that.
 */
export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false;
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  });

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    const onChange = () => setReduced(query.matches);
    query.addEventListener('change', onChange);
    return () => query.removeEventListener('change', onChange);
  }, []);

  return reduced;
}
