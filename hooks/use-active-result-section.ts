'use client';

import { useEffect, useRef, useState } from 'react';

import {
  DEFAULT_RESULT_READING_SECTIONS,
  type ResultReadingSectionsConfig,
  RESULT_READING_SECTION_IDS,
} from '@/lib/results/result-reading-sections';

const DEFAULT_ACTIVE_SECTION_ID = RESULT_READING_SECTION_IDS[0] ?? null;
const OBSERVER_THRESHOLDS = [0, 0.08, 0.18, 0.32, 0.5, 0.68, 0.84, 1] as const;
const READING_LINE_VIEWPORT_RATIO = 0.36;
const ANCHOR_SCROLL_OFFSET_PX = 96;

type SectionObservation = {
  id: string;
  isIntersecting: boolean;
  intersectionRatio: number;
  centerDistanceRatio: number;
  readingLineDistanceRatio?: number;
  hasPassedReadingLine?: boolean;
};

type ActiveSectionState = {
  activeSectionId: string;
  activeTopLevelSectionId: string;
  activeDomainSectionId: string | null;
  activeTopLevelIndex: number;
  activeTopLevelCount: number;
  hasActiveDomainSection: boolean;
};

type PickActiveSectionCandidateParams = {
  orderedSectionIds: readonly string[];
  currentActiveSectionId: string | null;
  observations: ReadonlyMap<string, SectionObservation>;
};

function clamp(value: number, min: number, max: number): number {
  if (value < min) {
    return min;
  }

  if (value > max) {
    return max;
  }

  return value;
}

function getSectionScore(observation: SectionObservation, isCurrent: boolean): number {
  const centerWeight = 1 - clamp(observation.centerDistanceRatio, 0, 1);
  const visibilityWeight = clamp(observation.intersectionRatio, 0, 1);
  const readingLineWeight = 1 - clamp(
    observation.readingLineDistanceRatio ?? observation.centerDistanceRatio,
    0,
    1,
  );
  const passedReadingLineBonus = observation.hasPassedReadingLine ? 0.08 : 0;
  const stickinessBonus = isCurrent ? 0.055 : 0;

  return (
    visibilityWeight * 0.38 +
    readingLineWeight * 0.42 +
    centerWeight * 0.12 +
    passedReadingLineBonus +
    stickinessBonus
  );
}

function getSwitchMargin(candidateObservation: SectionObservation): number {
  if (candidateObservation.hasPassedReadingLine && candidateObservation.intersectionRatio >= 0.18) {
    return 0.035;
  }

  if (candidateObservation.intersectionRatio >= 0.58) {
    return 0.045;
  }

  if (candidateObservation.intersectionRatio >= 0.38) {
    return 0.065;
  }

  return 0.105;
}

function isDomainSubsectionInConfig(
  sectionId: string | null,
  sectionsConfig: ResultReadingSectionsConfig,
): boolean {
  if (!sectionId) {
    return false;
  }

  return sectionsConfig.sectionsById[sectionId]?.level === 'subsection';
}

export function getSafeDefaultActiveState(
  orderedSectionIds: readonly string[],
  sectionsConfig: ResultReadingSectionsConfig = DEFAULT_RESULT_READING_SECTIONS,
): ActiveSectionState {
  const firstValidSectionId =
    orderedSectionIds.find(
      (sectionId) => sectionsConfig.sectionsById[sectionId]?.level === 'section',
    ) ??
    DEFAULT_ACTIVE_SECTION_ID ??
    'intro';

  return toActiveResultSectionState(firstValidSectionId, sectionsConfig);
}

export function toActiveResultSectionState(
  activeSectionId: string | null,
  sectionsConfig: ResultReadingSectionsConfig = DEFAULT_RESULT_READING_SECTIONS,
): ActiveSectionState {
  const fallbackSectionId = DEFAULT_ACTIVE_SECTION_ID ?? 'intro';
  const resolvedSectionId =
    (activeSectionId && sectionsConfig.sectionsById[activeSectionId]?.id) || fallbackSectionId;

  const activeDomainSectionId = isDomainSubsectionInConfig(resolvedSectionId, sectionsConfig)
    ? resolvedSectionId
    : null;
  const activeTopLevelSectionId = activeDomainSectionId
    ? (sectionsConfig.sectionsById[activeDomainSectionId]?.parentId ?? fallbackSectionId)
    : (sectionsConfig.sectionsById[resolvedSectionId]?.id ?? fallbackSectionId);

  const activeTopLevelIndex = Math.max(
    0,
    sectionsConfig.topLevelSections.findIndex((section) => section.id === activeTopLevelSectionId),
  );

  return {
    activeSectionId: resolvedSectionId,
    activeTopLevelSectionId,
    activeDomainSectionId,
    activeTopLevelIndex,
    activeTopLevelCount: sectionsConfig.topLevelSections.length,
    hasActiveDomainSection: Boolean(activeDomainSectionId),
  };
}

export function pickActiveSectionCandidate({
  orderedSectionIds,
  currentActiveSectionId,
  observations,
}: PickActiveSectionCandidateParams): string | null {
  const candidateObservations = orderedSectionIds
    .map((sectionId) => observations.get(sectionId))
    .filter((observation): observation is SectionObservation => Boolean(observation));

  if (candidateObservations.length === 0) {
    return currentActiveSectionId ?? orderedSectionIds[0] ?? DEFAULT_ACTIVE_SECTION_ID;
  }

  const sortedCandidates = [...candidateObservations]
    .filter((observation) => observation.isIntersecting)
    .sort((first, second) => {
      const firstScore = getSectionScore(first, first.id === currentActiveSectionId);
      const secondScore = getSectionScore(second, second.id === currentActiveSectionId);

      if (secondScore !== firstScore) {
        return secondScore - firstScore;
      }

      const firstOrder = orderedSectionIds.indexOf(first.id);
      const secondOrder = orderedSectionIds.indexOf(second.id);
      return firstOrder - secondOrder;
    });

  if (sortedCandidates.length === 0) {
    return currentActiveSectionId ?? orderedSectionIds[0] ?? DEFAULT_ACTIVE_SECTION_ID;
  }

  const bestCandidate = sortedCandidates[0];

  if (!currentActiveSectionId || currentActiveSectionId === bestCandidate.id) {
    return bestCandidate.id;
  }

  const currentObservation = observations.get(currentActiveSectionId);
  if (!currentObservation || !currentObservation.isIntersecting) {
    return bestCandidate.id;
  }

  const currentScore = getSectionScore(currentObservation, true);
  const bestScore = getSectionScore(bestCandidate, false);
  const scoreMargin = bestScore - currentScore;

  if (bestCandidate.intersectionRatio < 0.16) {
    return currentActiveSectionId;
  }

  if (
    currentObservation.intersectionRatio >= 0.26 &&
    !bestCandidate.hasPassedReadingLine
  ) {
    const hasMeaningfulVisibilityLead =
      bestCandidate.intersectionRatio >= currentObservation.intersectionRatio + 0.08;

    if (!hasMeaningfulVisibilityLead) {
      return currentActiveSectionId;
    }
  }

  const centerDistanceLead =
    currentObservation.centerDistanceRatio - bestCandidate.centerDistanceRatio;

  if (
    currentObservation.intersectionRatio >= 0.22 &&
    bestCandidate.intersectionRatio < 0.52 &&
    !bestCandidate.hasPassedReadingLine &&
    centerDistanceLead < 0.18
  ) {
    return currentActiveSectionId;
  }

  if (scoreMargin < getSwitchMargin(bestCandidate)) {
    return currentActiveSectionId;
  }

  return bestCandidate.id;
}

function buildSectionObservation(element: HTMLElement): SectionObservation {
  const viewportHeight = Math.max(window.innerHeight || 0, 1);
  const viewportCenter = viewportHeight / 2;
  const readingLine = viewportHeight * READING_LINE_VIEWPORT_RATIO;
  const rect = element.getBoundingClientRect();
  const visibleTop = Math.max(rect.top, 0);
  const visibleBottom = Math.min(rect.bottom, viewportHeight);
  const visibleHeight = Math.max(0, visibleBottom - visibleTop);
  const elementHeight = Math.max(rect.height, 1);
  const elementCenter = rect.top + rect.height / 2;

  return {
    id: element.id,
    isIntersecting: visibleHeight > 0,
    intersectionRatio: clamp(visibleHeight / elementHeight, 0, 1),
    centerDistanceRatio: clamp(Math.abs(elementCenter - viewportCenter) / viewportCenter, 0, 2),
    readingLineDistanceRatio: clamp(Math.abs(rect.top - readingLine) / readingLine, 0, 2),
    hasPassedReadingLine: rect.top <= readingLine && rect.bottom > readingLine * 0.42,
  };
}

export function scrollToResultSection(sectionId: string): boolean {
  if (typeof window === 'undefined') {
    return false;
  }

  const target = document.getElementById(sectionId);
  if (!target) {
    return false;
  }

  const top = target.getBoundingClientRect().top + window.scrollY - ANCHOR_SCROLL_OFFSET_PX;

  window.history.replaceState(null, '', `#${sectionId}`);
  window.scrollTo({
    top: Math.max(top, 0),
    behavior: 'smooth',
  });

  return true;
}

export function useActiveResultSection(): string | null {
  return useActiveResultSectionWithConfig(DEFAULT_RESULT_READING_SECTIONS);
}

export function useActiveResultSectionWithConfig(
  sectionsConfig: ResultReadingSectionsConfig,
): string | null {
  const [activeSectionId, setActiveSectionId] = useState<string | null>(DEFAULT_ACTIVE_SECTION_ID);
  const activeSectionIdRef = useRef<string | null>(DEFAULT_ACTIVE_SECTION_ID);

  useEffect(() => {
    activeSectionIdRef.current = activeSectionId;
  }, [activeSectionId]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const trackedElements = Array.from(
      document.querySelectorAll<HTMLElement>('.results-anchor-target[id]'),
    ).reduce<HTMLElement[]>((elements, element) => {
      if (!sectionsConfig.sectionsById[element.id]) {
        return elements;
      }

      if (elements.some((trackedElement) => trackedElement.id === element.id)) {
        return elements;
      }

      elements.push(element);
      return elements;
    }, []);

    if (trackedElements.length === 0) {
      return;
    }

    const byTopOffset = [...trackedElements].sort(
      (first, second) => first.offsetTop - second.offsetTop,
    );
    const orderedTrackedSectionIds = byTopOffset.map((element) => element.id);
    const observations = new Map<string, SectionObservation>();
    let frameId: number | null = null;

    const resolveActiveSection = () => {
      for (const sectionElement of byTopOffset) {
        observations.set(sectionElement.id, buildSectionObservation(sectionElement));
      }

      const nextActiveSectionId = pickActiveSectionCandidate({
        orderedSectionIds: orderedTrackedSectionIds,
        currentActiveSectionId: activeSectionIdRef.current,
        observations,
      });

      if (nextActiveSectionId && nextActiveSectionId !== activeSectionIdRef.current) {
        activeSectionIdRef.current = nextActiveSectionId;
        setActiveSectionId(nextActiveSectionId);
      }
    };

    const scheduleResolveActiveSection = () => {
      if (frameId !== null) {
        window.cancelAnimationFrame(frameId);
      }

      frameId = window.requestAnimationFrame(() => {
        frameId = null;
        resolveActiveSection();
      });
    };

    resolveActiveSection();

    const observer =
      typeof IntersectionObserver === 'undefined'
        ? null
        : new IntersectionObserver(
            (entries) => {
              for (const entry of entries) {
                const element = entry.target as HTMLElement;
                const viewportHeight = Math.max(window.innerHeight || 0, 1);
                const viewportCenter = viewportHeight / 2;
                const rect = entry.boundingClientRect;
                const elementCenter = rect.top + rect.height / 2;

                observations.set(element.id, {
                  id: element.id,
                  isIntersecting: entry.isIntersecting,
                  intersectionRatio: clamp(entry.intersectionRatio, 0, 1),
                  centerDistanceRatio: clamp(
                    Math.abs(elementCenter - viewportCenter) / viewportCenter,
                    0,
                    2,
                  ),
                  readingLineDistanceRatio: clamp(
                    Math.abs(rect.top - viewportHeight * READING_LINE_VIEWPORT_RATIO) /
                      (viewportHeight * READING_LINE_VIEWPORT_RATIO),
                    0,
                    2,
                  ),
                  hasPassedReadingLine:
                    rect.top <= viewportHeight * READING_LINE_VIEWPORT_RATIO &&
                    rect.bottom > viewportHeight * READING_LINE_VIEWPORT_RATIO * 0.42,
                });
              }

              scheduleResolveActiveSection();
            },
            {
              root: null,
              rootMargin: '-8% 0px -18% 0px',
              threshold: OBSERVER_THRESHOLDS as unknown as number[],
            },
          );

    if (observer) {
      for (const sectionElement of byTopOffset) {
        observer.observe(sectionElement);
      }
    }

    window.addEventListener('scroll', scheduleResolveActiveSection, { passive: true });
    window.addEventListener('resize', scheduleResolveActiveSection);

    return () => {
      if (frameId !== null) {
        window.cancelAnimationFrame(frameId);
      }

      observer?.disconnect();
      window.removeEventListener('scroll', scheduleResolveActiveSection);
      window.removeEventListener('resize', scheduleResolveActiveSection);
    };
  }, [sectionsConfig]);

  return activeSectionId;
}
