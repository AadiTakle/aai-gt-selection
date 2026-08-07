/// <reference types="vite/client" />
import { useEffect, useMemo, useState, type JSX } from 'react';

import { checkKit, type Kit } from '../lab-system/shared/uikit/kit';

/**
 * Load and validate a kit, plus whichever sprite renderer it needs.
 *
 * Kits are validated on the way in rather than trusted, because a kit is a hand-written JSON file and
 * `checkKit` reports its problems in the author's own terms. A kit that fails is reported to the screen
 * instead of half-rendering, since a silently degraded theme is exactly the failure this whole system
 * exists to make visible.
 *
 * The sprite renderer is only fetched for kits that actually use `sprite:` art, so the Pokédex path
 * never pays for vector art it does not draw.
 */

export type SpriteFn = (a: { sprite: string; size?: number; turns?: number; tint?: string }) => JSX.Element;

/** Every art module that happens to exist. Empty is a valid state, not an error. */
const artModules = import.meta.glob<Record<string, unknown>>('./art/*.tsx');

/** Every kit file present, resolved the same tolerant way. */
const kitModules = import.meta.glob<{ default: unknown }>('./kits/*.kit.json');

/** Art modules name their component after the kit, e.g. `hatchling` -> `HatchlingSprite`. */
function spriteExportFor(kitId: string): string {
  return `${kitId.charAt(0).toUpperCase()}${kitId.slice(1)}Sprite`;
}

const kitCache = new Map<string, Kit>();

export function useKit(kitId: string): { kit: Kit | null; sprite: SpriteFn | undefined; error: string | null } {
  const [kit, setKit] = useState<Kit | null>(() => kitCache.get(kitId) ?? null);
  const [sprite, setSprite] = useState<SpriteFn | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    const cached = kitCache.get(kitId);
    if (cached) {
      setKit(cached);
      setError(null);
    } else {
      setKit(null);
      setError(null);
      const loader = kitModules[`./kits/${kitId}.kit.json`];
      if (!loader) {
        setError(`no kit file at kits/${kitId}.kit.json`);
        return () => {
          live = false;
        };
      }
      loader()
        .then((mod: { default: unknown }) => {
          if (!live) return;
          const { kit: checked, problems } = checkKit(mod.default);
          if (!checked) {
            setError(problems.map((p) => `${p.where}: ${p.says}`).join('  ·  '));
            return;
          }
          kitCache.set(kitId, checked);
          setKit(checked);
        })
        .catch((e: unknown) => {
          if (live) setError(e instanceof Error ? e.message : String(e));
        });
    }

    // Vector-art kits bring their own drawing module. Resolved through `import.meta.glob` so that an
    // absent art module degrades to the entry's label rather than failing the build.
    const art = artModules[`./art/${kitId}.tsx`];
    if (art) {
      art()
        .then((mod) => {
          const fn = (mod as Record<string, unknown>)[spriteExportFor(kitId)] as SpriteFn | undefined;
          if (live && fn) setSprite(() => fn);
        })
        .catch(() => {
          // Falls back to the entry label, which is legible if plain.
        });
    } else {
      setSprite(undefined);
    }

    return () => {
      live = false;
    };
  }, [kitId]);

  return useMemo(() => ({ kit, sprite, error }), [kit, sprite, error]);
}
