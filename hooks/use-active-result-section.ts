'use client';

import { useEffect, useRef, useState } from 'react';

import {
  DEFAULT_RESULT_READING_SECTIONS,
  type ResultReadingSectionsConfig,
  RESULT_READING_SECTION_IDS,
} from '@/lib/results/result-reading-sections';

const DEFAULT_ACTIVE_SECTION_ID = RESULT_READING_SECTION_IDS[0] ?? null;
const READING_LINE_VIEWPORT_RATIO = 0.36;
const MIN_READING_LINE_OFFSET_PX = 180;
const MAX_READING_LINE_OFFSET_PX = 420;
const READING_LINE_ACTIVATION_TOLERANCE_PX = 8;
const PAGE_BOTTOM_ACTIVATION_THRESHOLD_PX = 32;
const ANCHOR_SCROLL_OFFSET_PX = 96;
const ANCHOR_ACTIVE_LOCK_MS = 900;
export const RESULT_SECTION_JUMP_EVENT = 'sonartra:result-section-jump';

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

export type SectionScrollPosition = {
  id: string;
  top: number;
  bottom: number;
};

type PickActiveSectionFromScrollPositionParams = {
  orderedSectionIds: readonly string[];
  currentActiveSectionId: string | null;
  sectionPositions: readonly SectionScrollPosition[];
  scrollY: number;
  viewportHeight: number;
  documentHeight: number;
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

  const readingLineCandidates = candidateObservations.filter(
    (observation) => observation.isIntersecting && observation.hasPassedReadingLine,
  );

  if (readingLineCandidates.length > 0) {
    const latestReadingLineCandidate = readingLineCandidates.sort((first, second) => {
      const firstOrder = orderedSectionIds.indexOf(first.id);
      const secondOrder = orderedSectionIds.indexOf(second.id);
      return secondOrder - firstOrder;
    })[0];

    if (latestReadingLineCandidate) {
      return latestReadingLineCandidate.id;
    }
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

function getReadingLineOffset(viewportHeight: number): number {
  return clamp(
    viewportHeight * READING_LINE_VIEWPORT_RATIO,
    MIN_READING_LINE_OFFSET_PX,
    MAX_READING_LINE_OFFSET_PX,
  );
}

export function pickActiveSectionIdFromScrollPosition({
  orderedSectionIds,
  currentActiveSectionId,
  sectionPositions,
  scrollY,
  viewportHeight,
  documentHeight,
}: PickActiveSectionFromScrollPositionParams): string | null {
  const orderedPositions = orderedSectionIds
    .map((sectionId) => sectionPositions.find((position) => position.id === sectionId))
    .filter((position): position is SectionScrollPosition => Boolean(position))
    .sort((first, second) => first.top - second.top);

  if (orderedPositions.length === 0) {
    return currentActiveSectionId ?? orderedSectionIds[0] ?? DEFAULT_ACTIVE_SECTION_ID;
  }

  const lastPosition = orderedPositions.at(-1);
  if (
    lastPosition &&
    scrollY + viewportHeight >= documentHeight - PAGE_BOTTOM_ACTIVATION_THRESHOLD_PX
  ) {
    return lastPosition.id;
  }

  const readingLineY = scrollY + getReadingLineOffset(viewportHeight);
  const activePosition = orderedPositions.reduce<SectionScrollPosition | null>(
    (active, position) =>
      position.top <= readingLineY + READING_LINE_ACTIVATION_TOLERANCE_PX ? position : active,
    null,
  );

  return activePosition?.id ?? orderedPositions[0]?.id ?? currentActiveSectionId ?? null;
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
  window.dispatchEvent(
    new CustomEvent(RESULT_SECTION_JUMP_EVENT, {
      detail: { sectionId },
    }),
  );
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
  const anchorJumpLockRef = useRef<{ sectionId: string; expiresAt: number } | null>(null);

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

    let frameId: number | null = null;

    const resolveActiveSection = () => {
      const sectionPositions = trackedElements
        .map((sectionElement) => {
          const rect = sectionElement.getBoundingClientRect();
          const top = rect.top + window.scrollY;

          return {
            id: sectionElement.id,
            top,
            bottom: rect.bottom + window.scrollY,
          };
        })
        .sort((first, second) => first.top - second.top);
      const orderedTrackedSectionIds = sectionPositions.map((position) => position.id);

      const anchorJumpLock = anchorJumpLockRef.current;
      if (anchorJumpLock) {
        if (Date.now() < anchorJumpLock.expiresAt) {
          if (activeSectionIdRef.current !== anchorJumpLock.sectionId) {
            activeSectionIdRef.current = anchorJumpLock.sectionId;
            setActiveSectionId(anchorJumpLock.sectionId);
          }
          return;
        }

        anchorJumpLockRef.current = null;
      }

      const nextActiveSectionId = pickActiveSectionIdFromScrollPosition({
        orderedSectionIds: orderedTrackedSectionIds,
        currentActiveSectionId: activeSectionIdRef.current,
        sectionPositions,
        scrollY: window.scrollY,
        viewportHeight: Math.max(window.innerHeight || 0, 1),
        documentHeight: Math.max(
          document.documentElement.scrollHeight,
          document.body.scrollHeight,
          window.innerHeight || 0,
        ),
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

    window.addEventListener('scroll', scheduleResolveActiveSection, { passive: true });
    window.addEventListener('resize', scheduleResolveActiveSection);
    const handleAnchorJump = (event: Event) => {
      const sectionId = (event as CustomEvent<{ sectionId?: string }>).detail?.sectionId;
      if (!sectionId || !sectionsConfig.sectionsById[sectionId]) {
        return;
      }

      anchorJumpLockRef.current = {
        sectionId,
        expiresAt: Date.now() + ANCHOR_ACTIVE_LOCK_MS,
      };
      activeSectionIdRef.current = sectionId;
      setActiveSectionId(sectionId);
    };

    window.addEventListener(RESULT_SECTION_JUMP_EVENT, handleAnchorJump);

    return () => {
      if (frameId !== null) {
        window.cancelAnimationFrame(frameId);
      }

      window.removeEventListener('scroll', scheduleResolveActiveSection);
      window.removeEventListener('resize', scheduleResolveActiveSection);
      window.removeEventListener(RESULT_SECTION_JUMP_EVENT, handleAnchorJump);
    };
  }, [sectionsConfig]);

  return activeSectionId;
}
