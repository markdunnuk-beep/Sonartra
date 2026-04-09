'use client';

import { useEffect, useState } from 'react';

type UseActiveSectionOptions = {
  sectionIds: readonly string[];
  rootMargin?: string;
  threshold?: number | number[];
  updateHash?: boolean;
};

export function useActiveSection({
  sectionIds,
  rootMargin = '-42% 0px -42% 0px',
  threshold = [0, 0.2, 0.45, 0.7, 1],
  updateHash = false,
}: UseActiveSectionOptions): string | null {
  const [activeSectionId, setActiveSectionId] = useState<string | null>(sectionIds[0] ?? null);

  useEffect(() => {
    if (typeof window === 'undefined' || sectionIds.length === 0) {
      return;
    }

    const elements = sectionIds
      .map((id) => document.getElementById(id))
      .filter((element): element is HTMLElement => Boolean(element));

    if (elements.length === 0) {
      return;
    }

    const ratios = new Map<string, number>();

    const updateFromRatios = () => {
      const nextId = elements
        .map((element) => ({ id: element.id, ratio: ratios.get(element.id) ?? 0 }))
        .sort((a, b) => {
          if (b.ratio !== a.ratio) {
            return b.ratio - a.ratio;
          }

          return sectionIds.indexOf(a.id) - sectionIds.indexOf(b.id);
        })[0]?.id;

      if (!nextId) {
        return;
      }

      setActiveSectionId((current) => {
        if (current === nextId) {
          return current;
        }

        if (updateHash && window.location.hash !== `#${nextId}`) {
          window.history.replaceState(null, '', `#${nextId}`);
        }

        return nextId;
      });
    };

    const observer =
      typeof IntersectionObserver === 'undefined'
        ? null
        : new IntersectionObserver(
            (entries) => {
              for (const entry of entries) {
                ratios.set(entry.target.id, entry.isIntersecting ? entry.intersectionRatio : 0);
              }

              updateFromRatios();
            },
            {
              root: null,
              rootMargin,
              threshold,
            },
          );

    if (observer) {
      for (const element of elements) {
        observer.observe(element);
      }
    }

    return () => {
      observer?.disconnect();
    };
  }, [rootMargin, sectionIds, threshold, updateHash]);

  return activeSectionId;
}
