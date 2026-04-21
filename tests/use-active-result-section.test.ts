import assert from 'node:assert/strict';
import test from 'node:test';

import {
  getSafeDefaultActiveState,
  pickActiveSectionCandidate,
  toActiveResultSectionState,
} from '@/hooks/use-active-result-section';
import { RESULT_READING_SECTION_IDS } from '@/lib/results/result-reading-sections';

function buildObservationMap(
  items: Array<{
    id: string;
    intersectionRatio: number;
    centerDistanceRatio: number;
    isIntersecting?: boolean;
  }>,
) {
  return new Map(
    items.map((item) => [
      item.id,
      {
        ...item,
        isIntersecting: item.isIntersecting ?? true,
      },
    ]),
  );
}

test('canonical hierarchy maps domain subsection to top-level domains', () => {
  const state = toActiveResultSectionState('domain-core-drivers');

  assert.equal(state.activeSectionId, 'domain-core-drivers');
  assert.equal(state.activeTopLevelSectionId, 'domains');
  assert.equal(state.activeDomainSectionId, 'domain-core-drivers');
  assert.equal(state.activeTopLevelCount, 4);
});

test('safe defaults handle missing elements and preserve top-level fallback', () => {
  const state = getSafeDefaultActiveState(['domain-operating-style', 'hero']);

  assert.equal(state.activeSectionId, 'hero');
  assert.equal(state.activeTopLevelSectionId, 'hero');
  assert.equal(state.activeDomainSectionId, null);
  assert.equal(state.hasActiveDomainSection, false);
  assert.equal(state.activeTopLevelCount, 4);
});

test('candidate selection supports observer-driven reading progression', () => {
  let activeSectionId: string | null = 'intro';

  activeSectionId = pickActiveSectionCandidate({
    orderedSectionIds: RESULT_READING_SECTION_IDS,
    currentActiveSectionId: activeSectionId,
    observations: buildObservationMap([
      { id: 'intro', intersectionRatio: 0.18, centerDistanceRatio: 0.62 },
      { id: 'hero', intersectionRatio: 0.72, centerDistanceRatio: 0.18 },
    ]),
  });
  assert.equal(activeSectionId, 'hero');

  activeSectionId = pickActiveSectionCandidate({
    orderedSectionIds: RESULT_READING_SECTION_IDS,
    currentActiveSectionId: activeSectionId,
    observations: buildObservationMap([
      { id: 'hero', intersectionRatio: 0.2, centerDistanceRatio: 0.55 },
      { id: 'domains', intersectionRatio: 0.71, centerDistanceRatio: 0.2 },
    ]),
  });
  assert.equal(activeSectionId, 'domains');

  activeSectionId = pickActiveSectionCandidate({
    orderedSectionIds: RESULT_READING_SECTION_IDS,
    currentActiveSectionId: activeSectionId,
    observations: buildObservationMap([
      { id: 'domains', intersectionRatio: 0.2, centerDistanceRatio: 0.6 },
      { id: 'domain-operating-style', intersectionRatio: 0.7, centerDistanceRatio: 0.16 },
    ]),
  });
  assert.equal(activeSectionId, 'domain-operating-style');

  activeSectionId = pickActiveSectionCandidate({
    orderedSectionIds: RESULT_READING_SECTION_IDS,
    currentActiveSectionId: activeSectionId,
    observations: buildObservationMap([
      { id: 'domain-operating-style', intersectionRatio: 0.15, centerDistanceRatio: 0.82 },
      { id: 'application', intersectionRatio: 0.75, centerDistanceRatio: 0.16 },
    ]),
  });
  assert.equal(activeSectionId, 'application');
});

test('final application section overtakes lingering domain sections only when clearly in view', () => {
  const staysOnDomain = pickActiveSectionCandidate({
    orderedSectionIds: ['domains', 'domain-pressure-response', 'application'],
    currentActiveSectionId: 'domain-pressure-response',
    observations: buildObservationMap([
      { id: 'domains', intersectionRatio: 0.12, centerDistanceRatio: 0.88 },
      { id: 'domain-pressure-response', intersectionRatio: 0.34, centerDistanceRatio: 0.26 },
      { id: 'application', intersectionRatio: 0.29, centerDistanceRatio: 0.24 },
    ]),
  });

  assert.equal(staysOnDomain, 'domain-pressure-response');

  const switchesToApplication = pickActiveSectionCandidate({
    orderedSectionIds: ['domains', 'domain-pressure-response', 'application'],
    currentActiveSectionId: 'domain-pressure-response',
    observations: buildObservationMap([
      { id: 'domains', intersectionRatio: 0.08, centerDistanceRatio: 0.94 },
      { id: 'domain-pressure-response', intersectionRatio: 0.18, centerDistanceRatio: 0.79 },
      { id: 'application', intersectionRatio: 0.62, centerDistanceRatio: 0.16 },
    ]),
  });

  assert.equal(switchesToApplication, 'application');
});

test('stability logic keeps current section for weak neighbouring visibility', () => {
  const nextSection = pickActiveSectionCandidate({
    orderedSectionIds: RESULT_READING_SECTION_IDS,
    currentActiveSectionId: 'domain-leadership-approach',
    observations: buildObservationMap([
      { id: 'domain-leadership-approach', intersectionRatio: 0.51, centerDistanceRatio: 0.28 },
      { id: 'domain-tension-response', intersectionRatio: 0.54, centerDistanceRatio: 0.25 },
    ]),
  });

  assert.equal(nextSection, 'domain-leadership-approach');
});

test('stability logic keeps current section when centre shift is still marginal', () => {
  const nextSection = pickActiveSectionCandidate({
    orderedSectionIds: RESULT_READING_SECTION_IDS,
    currentActiveSectionId: 'hero',
    observations: buildObservationMap([
      { id: 'hero', intersectionRatio: 0.31, centerDistanceRatio: 0.34 },
      { id: 'domains', intersectionRatio: 0.44, centerDistanceRatio: 0.22 },
    ]),
  });

  assert.equal(nextSection, 'hero');
});

test('progress state remains top-level domains while a domain subsection is active', () => {
  const state = toActiveResultSectionState('domain-pressure-response');

  assert.equal(state.activeTopLevelSectionId, 'domains');
  assert.equal(state.activeTopLevelIndex, 2);
  assert.equal(state.activeTopLevelCount, 4);
  assert.equal(state.hasActiveDomainSection, true);
});

test('unknown active section ids fall back safely to intro defaults', () => {
  const state = toActiveResultSectionState('not-a-real-section');

  assert.equal(state.activeSectionId, 'intro');
  assert.equal(state.activeTopLevelSectionId, 'intro');
  assert.equal(state.activeDomainSectionId, null);
  assert.equal(state.activeTopLevelIndex, 0);
});

test('candidate selection is not a simplistic top-edge-only tracker', () => {
  const nextSection = pickActiveSectionCandidate({
    orderedSectionIds: RESULT_READING_SECTION_IDS,
    currentActiveSectionId: null,
    observations: buildObservationMap([
      // Tall intro block near the viewport edge remains visible but far from reading center.
      { id: 'intro', intersectionRatio: 0.56, centerDistanceRatio: 0.96 },
      // Hero is more central to reading position and should take focus.
      { id: 'hero', intersectionRatio: 0.58, centerDistanceRatio: 0.12 },
    ]),
  });

  assert.equal(nextSection, 'hero');
});

test('candidate selection stabilizes after anchor navigation until the target section is clearly dominant', () => {
  const orderedSectionIds = ['intro', 'hero', 'drivers', 'pair', 'limitation', 'application'];

  const duringSmoothScroll = pickActiveSectionCandidate({
    orderedSectionIds,
    currentActiveSectionId: 'hero',
    observations: buildObservationMap([
      { id: 'hero', intersectionRatio: 0.42, centerDistanceRatio: 0.31 },
      { id: 'drivers', intersectionRatio: 0.45, centerDistanceRatio: 0.24 },
    ]),
  });

  assert.equal(duringSmoothScroll, 'hero');

  const afterSmoothScrollSettles = pickActiveSectionCandidate({
    orderedSectionIds,
    currentActiveSectionId: duringSmoothScroll,
    observations: buildObservationMap([
      { id: 'hero', intersectionRatio: 0.11, centerDistanceRatio: 0.92 },
      { id: 'drivers', intersectionRatio: 0.68, centerDistanceRatio: 0.14 },
    ]),
  });

  assert.equal(afterSmoothScrollSettles, 'drivers');
});
