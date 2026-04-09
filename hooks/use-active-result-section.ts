'use client';

import { useEffect, useMemo, useState } from 'react';

import { RESULT_READING_SECTIONS_BY_ID } from '@/lib/results/result-reading-sections';

const TOP_LEVEL_PROGRESS_IDS = ['intro', 'hero', 'domains', 'application'] as const;

type ResultReadingTopLevelSectionId = (typeof TOP_LEVEL_PROGRESS_IDS)[number];

const TOP_LEVEL_PROGRESS_SET = new Set<string>(TOP_LEVEL_PROGRESS_IDS);

type SectionObservation = {
  id: string;
  intersectionRatio: number;
  centerDistanceRatio: number;
  isIntersecting: boolean;
};

type ActiveCandidateSelectionConfig = {
  scoreMargin: number;
  minSwitchScore: number;
  currentSectionStickinessBoost: number;
};

type ActiveCandidateSelectionInput = {
  observations: ReadonlyMap<string, SectionObservation>;
  orderedSectionIds: readonly string[];
  currentActiveSectionId: string | null;
  config?: Partial<ActiveCandidateSelectionConfig>;
};

const DEFAULT_SELECTION_CONFIG: ActiveCandidateSelectionConfig = {
  scoreMargin: 0.08,
  minSwitchScore: 0.16,
  currentSectionStickinessBoost: 0.04,
};

export type UseActiveResultSectionConfig = {
  rootMargin?: string;
  threshold?: readonly number[];
  scoreMargin?: number;
  minSwitchScore?: number;
  currentSectionStickinessBoost?: number;
};

export type ActiveResultSectionState = {
  activeSectionId: string | null;
  activeTopLevelSectionId: string | null;
  activeDomainSectionId: string | null;
  /** Zero-based index into intro, hero, domains, application. */
  activeTopLevelIndex: number;
  activeTopLevelCount: number;
  hasActiveDomainSection: boolean;
};

function getTopLevelIdForSection(sectionId: string | null): string | null {
  if (!sectionId) {
    return null;
  }

  const section = RESULT_READING_SECTIONS_BY_ID[sectionId];
  if (!section) {
    return null;
  }

  if (section.level === 'section') {
    return section.id;
  }

  return section.parentId ?? null;
}

export function getSafeDefaultActiveState(orderedSectionIds: readonly string[]): ActiveResultSectionState {
  const orderedTopLevelIds = orderedSectionIds.filter((id) => TOP_LEVEL_PROGRESS_SET.has(id));
  const firstTopLevelId = orderedTopLevelIds[0] ?? null;
  const introPreferredTopLevel = orderedTopLevelIds.includes('intro') ? 'intro' : firstTopLevelId;
  const activeSectionId = firstTopLevelId;
  const activeTopLevelSectionId = introPreferredTopLevel;
  const activeTopLevelIndex = activeTopLevelSectionId
    ? TOP_LEVEL_PROGRESS_IDS.indexOf(activeTopLevelSectionId as ResultReadingTopLevelSectionId)
    : -1;

  return {
    activeSectionId,
    activeTopLevelSectionId,
    activeDomainSectionId: null,
    activeTopLevelIndex,
    activeTopLevelCount: TOP_LEVEL_PROGRESS_IDS.length,
    hasActiveDomainSection: false,
  };
}

export function toActiveResultSectionState(activeSectionId: string | null): ActiveResultSectionState {
  const activeTopLevelSectionId = getTopLevelIdForSection(activeSectionId);
  const hasActiveDomainSection = Boolean(
    activeSectionId && RESULT_READING_SECTIONS_BY_ID[activeSectionId]?.level === 'subsection',
  );

  return {
    activeSectionId,
    activeTopLevelSectionId,
    activeDomainSectionId: hasActiveDomainSection ? activeSectionId : null,
    activeTopLevelIndex: activeTopLevelSectionId
      ? TOP_LEVEL_PROGRESS_IDS.indexOf(activeTopLevelSectionId as ResultReadingTopLevelSectionId)
      : -1,
    activeTopLevelCount: TOP_LEVEL_PROGRESS_IDS.length,
    hasActiveDomainSection,
  };
}

function calculateObservationScore(observation: SectionObservation): number {
  const ratioScore = observation.intersectionRatio;
  const centerScore = 1 - observation.centerDistanceRatio;
  return ratioScore * 0.7 + Math.max(0, centerScore) * 0.3;
}

export function pickActiveSectionCandidate({
  observations,
  orderedSectionIds,
  currentActiveSectionId,
  config,
}: ActiveCandidateSelectionInput): string | null {
  const resolvedConfig: ActiveCandidateSelectionConfig = {
    ...DEFAULT_SELECTION_CONFIG,
    ...config,
  };

  let bestCandidateId: string | null = null;
  let bestCandidateScore = Number.NEGATIVE_INFINITY;
  let currentScore = Number.NEGATIVE_INFINITY;

  for (const id of orderedSectionIds) {
    const observation = observations.get(id);
    if (!observation || !observation.isIntersecting) {
      continue;
    }

    let score = calculateObservationScore(observation);
    if (id === currentActiveSectionId) {
      score += resolvedConfig.currentSectionStickinessBoost;
      currentScore = score;
    }

    if (score > bestCandidateScore) {
      bestCandidateScore = score;
      bestCandidateId = id;
    }
  }

  if (!bestCandidateId) {
    return currentActiveSectionId;
  }

  if (!currentActiveSectionId) {
    return bestCandidateScore >= resolvedConfig.minSwitchScore ? bestCandidateId : null;
  }

  if (bestCandidateId === currentActiveSectionId) {
    return currentActiveSectionId;
  }

  if (bestCandidateScore < resolvedConfig.minSwitchScore) {
    return currentActiveSectionId;
  }

  if (
    currentScore !== Number.NEGATIVE_INFINITY &&
    bestCandidateScore < currentScore + resolvedConfig.scoreMargin
  ) {
    return currentActiveSectionId;
  }

  return bestCandidateId;
}

export function useActiveResultSection(
  orderedSectionIds: readonly string[],
  config?: UseActiveResultSectionConfig,
): ActiveResultSectionState {
  const safeDefaultState = useMemo(() => getSafeDefaultActiveState(orderedSectionIds), [orderedSectionIds]);
  const [activeSectionId, setActiveSectionId] = useState<string | null>(safeDefaultState.activeSectionId);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof document === 'undefined') {
      return;
    }

    if (typeof IntersectionObserver === 'undefined') {
      return;
    }

    const observations = new Map<string, SectionObservation>();
    const observedElements = new Set<Element>();

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const id = entry.target.id;
          if (!id) {
            continue;
          }

          const viewportCenter = window.innerHeight / 2;
          const elementCenter = entry.boundingClientRect.top + entry.boundingClientRect.height / 2;
          const centerDistance = Math.abs(elementCenter - viewportCenter);
          const centerDistanceRatio = Math.min(centerDistance / Math.max(window.innerHeight, 1), 1);

          observations.set(id, {
            id,
            intersectionRatio: entry.intersectionRatio,
            centerDistanceRatio,
            isIntersecting: entry.isIntersecting,
          });
        }

        setActiveSectionId((currentActiveId) =>
          pickActiveSectionCandidate({
            observations,
            orderedSectionIds,
            currentActiveSectionId: currentActiveId,
            config,
          }),
        );
      },
      {
        root: null,
        rootMargin: config?.rootMargin ?? '-12% 0px -38% 0px',
        threshold: config?.threshold ? [...config.threshold] : [0, 0.15, 0.3, 0.5, 0.7, 1],
      },
    );

    for (const id of orderedSectionIds) {
      const element = document.getElementById(id);
      if (!element || observedElements.has(element)) {
        continue;
      }

      observedElements.add(element);
      observer.observe(element);
    }

    return () => {
      observer.disconnect();
      observedElements.clear();
      observations.clear();
    };
  }, [config, orderedSectionIds, safeDefaultState.activeSectionId]);

  return activeSectionId ? toActiveResultSectionState(activeSectionId) : safeDefaultState;
}
