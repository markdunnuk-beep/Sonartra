'use client';

import { useEffect, useState } from 'react';

import { RESULT_READING_SECTION_IDS } from '@/lib/results/result-reading-sections';

const DEFAULT_ACTIVE_SECTION_ID = RESULT_READING_SECTION_IDS[0] ?? null;

export function useActiveResultSection(): string | null {
  const [activeSectionId, setActiveSectionId] = useState<string | null>(DEFAULT_ACTIVE_SECTION_ID);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const trackedElements = RESULT_READING_SECTION_IDS.map((sectionId) =>
      document.getElementById(sectionId),
    ).filter((element): element is HTMLElement => Boolean(element));

    if (trackedElements.length === 0) {
      return;
    }

    const byTopOffset = [...trackedElements].sort((first, second) => first.offsetTop - second.offsetTop);

    const resolveActiveByScrollY = () => {
      const readingLine = window.scrollY + 180;
      let nextActiveSectionId = byTopOffset[0]?.id ?? DEFAULT_ACTIVE_SECTION_ID;

      for (const sectionElement of byTopOffset) {
        if (sectionElement.offsetTop <= readingLine) {
          nextActiveSectionId = sectionElement.id;
        } else {
          break;
        }
      }

      setActiveSectionId(nextActiveSectionId);
    };

    resolveActiveByScrollY();

    if (typeof IntersectionObserver === 'undefined') {
      window.addEventListener('scroll', resolveActiveByScrollY, { passive: true });
      window.addEventListener('resize', resolveActiveByScrollY);

      return () => {
        window.removeEventListener('scroll', resolveActiveByScrollY);
        window.removeEventListener('resize', resolveActiveByScrollY);
      };
    }

    const observer = new IntersectionObserver(resolveActiveByScrollY, {
      root: null,
      rootMargin: '-24% 0px -58% 0px',
      threshold: [0, 0.15, 0.5, 1],
    });

    for (const sectionElement of byTopOffset) {
      observer.observe(sectionElement);
    }

    window.addEventListener('scroll', resolveActiveByScrollY, { passive: true });
    window.addEventListener('resize', resolveActiveByScrollY);

    return () => {
      observer.disconnect();
      window.removeEventListener('scroll', resolveActiveByScrollY);
      window.removeEventListener('resize', resolveActiveByScrollY);
    };
  }, []);

  return activeSectionId;
}
