import { useEffect, useState } from 'react';

/**
 * Whether the child has asked the operating system for less movement.
 *
 * Honoured everywhere in the ranch, and worth being specific about what it does and does not turn
 * off. It stops *ambient, uncommanded* motion: head bob, drifting clouds, pollen, water ripples,
 * chimney smoke. It never touches motion the child caused — walking, looking and jumping work
 * identically — because taking those away would not be a comfort setting, it would be a broken game.
 */
export function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return false;
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  });

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    const onChange = (event: MediaQueryListEvent) => setReduced(event.matches);
    query.addEventListener('change', onChange);
    return () => query.removeEventListener('change', onChange);
  }, []);

  return reduced;
}
