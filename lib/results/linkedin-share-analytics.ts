import { trackClientEvent, type ClientAnalyticsPayload } from '@/lib/analytics/client';
import type { AssessmentResultDetailViewModel } from '@/lib/server/result-read-model-types';

export const RESULTS_LINKEDIN_SHARE_OPENED_EVENT = 'results_linkedin_share_opened';
export const RESULTS_LINKEDIN_SHARE_COPIED_EVENT = 'results_linkedin_share_copied';
export const RESULTS_LINKEDIN_SHARE_OPEN_LINKEDIN_CLICKED_EVENT =
  'results_linkedin_share_open_linkedin_clicked';
export const RESULTS_LINKEDIN_SHARE_CLOSED_EVENT = 'results_linkedin_share_closed';

export type ResultsLinkedInShareAnalytics = Readonly<{
  resultId: string;
  assessmentKey: string | null;
  assessmentTitle: string | null;
  heroPatternKey: string | null;
  heroHeadlinePresent: boolean;
  heroSummaryPresent: boolean;
  heroNarrativePresent: boolean;
  source: 'results_page';
  surface: 'linkedin_share_panel';
}>;

export type ClipboardTarget = Pick<Clipboard, 'writeText'>;
export type TrackClientEventFn = typeof trackClientEvent;

function normalizeText(value: string | null | undefined): string {
  return typeof value === 'string' ? value.trim() : '';
}

export function buildResultsLinkedInShareAnalytics(
  result: Pick<
    AssessmentResultDetailViewModel,
    'resultId' | 'assessmentKey' | 'assessmentTitle' | 'hero'
  >,
): ResultsLinkedInShareAnalytics {
  return {
    resultId: result.resultId,
    assessmentKey: normalizeText(result.assessmentKey) || null,
    assessmentTitle: normalizeText(result.assessmentTitle) || null,
    heroPatternKey: normalizeText(result.hero.heroPattern?.patternKey) || null,
    heroHeadlinePresent: normalizeText(result.hero.headline).length > 0,
    heroSummaryPresent: normalizeText(result.hero.summary).length > 0,
    heroNarrativePresent: normalizeText(result.hero.narrative).length > 0,
    source: 'results_page',
    surface: 'linkedin_share_panel',
  };
}

export function trackResultsLinkedInSharePanelVisibility(params: {
  nextOpen: boolean;
  analytics: ResultsLinkedInShareAnalytics;
  trackEvent?: TrackClientEventFn;
}): void {
  const event = params.nextOpen
    ? RESULTS_LINKEDIN_SHARE_OPENED_EVENT
    : RESULTS_LINKEDIN_SHARE_CLOSED_EVENT;

  (params.trackEvent ?? trackClientEvent)(event, params.analytics);
}

export async function copyResultsLinkedInSharePost(params: {
  postBody: string;
  analytics: ResultsLinkedInShareAnalytics;
  clipboard: ClipboardTarget;
  trackEvent?: TrackClientEventFn;
}): Promise<boolean> {
  try {
    await params.clipboard.writeText(params.postBody);
    (params.trackEvent ?? trackClientEvent)(RESULTS_LINKEDIN_SHARE_COPIED_EVENT, params.analytics);
    return true;
  } catch {
    return false;
  }
}

export function trackResultsLinkedInOpenClicked(params: {
  analytics: ResultsLinkedInShareAnalytics;
  trackEvent?: TrackClientEventFn;
}): void {
  (params.trackEvent ?? trackClientEvent)(
    RESULTS_LINKEDIN_SHARE_OPEN_LINKEDIN_CLICKED_EVENT,
    params.analytics,
  );
}

export function toAnalyticsPayload(
  analytics: ResultsLinkedInShareAnalytics,
): ClientAnalyticsPayload {
  return analytics;
}
