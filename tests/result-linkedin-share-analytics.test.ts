import test from 'node:test';
import assert from 'node:assert/strict';

import {
  RESULTS_LINKEDIN_SHARE_CLOSED_EVENT,
  RESULTS_LINKEDIN_SHARE_COPIED_EVENT,
  RESULTS_LINKEDIN_SHARE_OPENED_EVENT,
  RESULTS_LINKEDIN_SHARE_OPEN_LINKEDIN_CLICKED_EVENT,
  buildResultsLinkedInShareAnalytics,
  copyResultsLinkedInSharePost,
  trackResultsLinkedInOpenClicked,
  trackResultsLinkedInSharePanelVisibility,
  type ResultsLinkedInShareAnalytics,
} from '@/lib/results/linkedin-share-analytics';

const ANALYTICS: ResultsLinkedInShareAnalytics = {
  resultId: 'result-123',
  assessmentKey: 'signals-flex',
  assessmentTitle: 'Signals Flex',
  heroPatternKey: 'steady_steward',
  heroHeadlinePresent: true,
  heroSummaryPresent: true,
  heroNarrativePresent: false,
  source: 'results_page',
  surface: 'linkedin_share_panel',
};

test('open event fires when the share panel is opened', () => {
  const calls: Array<{ event: string; payload: unknown }> = [];

  trackResultsLinkedInSharePanelVisibility({
    nextOpen: true,
    analytics: ANALYTICS,
    trackEvent(event, payload) {
      calls.push({ event, payload });
    },
  });

  assert.deepEqual(calls, [
    {
      event: RESULTS_LINKEDIN_SHARE_OPENED_EVENT,
      payload: ANALYTICS,
    },
  ]);
});

test('closing the panel fires the optional close event only on an explicit close action', () => {
  const calls: Array<{ event: string; payload: unknown }> = [];

  trackResultsLinkedInSharePanelVisibility({
    nextOpen: false,
    analytics: ANALYTICS,
    trackEvent(event, payload) {
      calls.push({ event, payload });
    },
  });

  assert.deepEqual(calls, [
    {
      event: RESULTS_LINKEDIN_SHARE_CLOSED_EVENT,
      payload: ANALYTICS,
    },
  ]);
});

test('copy event fires when the clipboard write succeeds', async () => {
  const events: Array<{ event: string; payload: unknown }> = [];
  const writes: string[] = [];

  const copied = await copyResultsLinkedInSharePost({
    postBody: 'LinkedIn body',
    analytics: ANALYTICS,
    clipboard: {
      async writeText(value) {
        writes.push(value);
      },
    },
    trackEvent(event, payload) {
      events.push({ event, payload });
    },
  });

  assert.equal(copied, true);
  assert.deepEqual(writes, ['LinkedIn body']);
  assert.deepEqual(events, [
    {
      event: RESULTS_LINKEDIN_SHARE_COPIED_EVENT,
      payload: ANALYTICS,
    },
  ]);
});

test('copy event does not fire when the clipboard write fails', async () => {
  const events: Array<{ event: string; payload: unknown }> = [];

  const copied = await copyResultsLinkedInSharePost({
    postBody: 'LinkedIn body',
    analytics: ANALYTICS,
    clipboard: {
      async writeText() {
        throw new Error('clipboard blocked');
      },
    },
    trackEvent(event, payload) {
      events.push({ event, payload });
    },
  });

  assert.equal(copied, false);
  assert.deepEqual(events, []);
});

test('open linkedin click event fires once per click', () => {
  const events: Array<{ event: string; payload: unknown }> = [];

  trackResultsLinkedInOpenClicked({
    analytics: ANALYTICS,
    trackEvent(event, payload) {
      events.push({ event, payload });
    },
  });

  assert.deepEqual(events, [
    {
      event: RESULTS_LINKEDIN_SHARE_OPEN_LINKEDIN_CLICKED_EVENT,
      payload: ANALYTICS,
    },
  ]);
});

test('analytics metadata includes only safe results-page context fields', () => {
  const metadata = buildResultsLinkedInShareAnalytics({
    resultId: 'result-456',
    assessmentKey: 'signals-flex',
    assessmentTitle: 'Signals Flex',
    hero: {
      headline: 'Calm, structured, deliberate',
      subheadline: null,
      summary: 'Summary text',
      narrative: '',
      pressureOverlay: null,
      environmentOverlay: null,
      primaryPattern: null,
      heroPattern: {
        patternKey: 'steady_steward',
        label: 'Steady Steward',
        priority: 10,
        isFallback: false,
      },
      domainPairWinners: [],
      traitTotals: [],
      matchedPatterns: [],
      domainHighlights: [],
    },
  });

  assert.deepEqual(metadata, {
    resultId: 'result-456',
    assessmentKey: 'signals-flex',
    assessmentTitle: 'Signals Flex',
    heroPatternKey: 'steady_steward',
    heroHeadlinePresent: true,
    heroSummaryPresent: true,
    heroNarrativePresent: false,
    source: 'results_page',
    surface: 'linkedin_share_panel',
  });
  assert.ok(!('postBody' in metadata));
  assert.ok(!('email' in metadata));
});

test('no duplicate open event is emitted on passive rerender because visibility tracking is action-driven', () => {
  const events: Array<{ event: string; payload: unknown }> = [];

  trackResultsLinkedInSharePanelVisibility({
    nextOpen: true,
    analytics: ANALYTICS,
    trackEvent(event, payload) {
      events.push({ event, payload });
    },
  });

  assert.equal(events.length, 1);
  assert.equal(events[0]?.event, RESULTS_LINKEDIN_SHARE_OPENED_EVENT);
});
