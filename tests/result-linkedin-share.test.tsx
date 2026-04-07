import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { renderToStaticMarkup } from 'react-dom/server';

import { ResultLinkedInShare } from '@/components/results/result-linkedin-share';
import type { ResultsLinkedInShareAnalytics } from '@/lib/results/linkedin-share-analytics';

const componentPath = join(
  process.cwd(),
  'components',
  'results',
  'result-linkedin-share.tsx',
);

const pagePath = join(
  process.cwd(),
  'app',
  '(user)',
  'app',
  'results',
  '[resultId]',
  'page.tsx',
);

const ANALYTICS: ResultsLinkedInShareAnalytics = {
  resultId: 'result-1',
  assessmentKey: 'signals-flex',
  assessmentTitle: 'Signals Flex',
  heroPatternKey: 'steady_steward',
  heroHeadlinePresent: true,
  heroSummaryPresent: true,
  heroNarrativePresent: true,
  source: 'results_page',
  surface: 'linkedin_share_panel',
};

test('share control renders a branded linkedin trigger with the panel closed by default', () => {
  const markup = renderToStaticMarkup(
    <ResultLinkedInShare postBody="Deterministic Sonartra share copy." analytics={ANALYTICS} />,
  );

  assert.match(markup, /Share on LinkedIn/);
  assert.match(markup, /aria-label="Share on LinkedIn"/);
  assert.doesNotMatch(markup, /Share your Sonartra result/);
  assert.doesNotMatch(markup, /Copy LinkedIn Post/);
});

test('share component source includes copy feedback and linkedin open behavior', () => {
  const source = readFileSync(componentPath, 'utf8');

  assert.match(source, /const LINKEDIN_SHARE_URL = 'https:\/\/www\.linkedin\.com\/feed\/';/);
  assert.match(source, /clipboard: navigator\.clipboard/);
  assert.match(source, /setCopyFeedback\('Copied to clipboard'\)/);
  assert.match(source, /setCopyFeedback\('Copy failed'\)/);
  assert.match(source, /window\.open\(LINKEDIN_SHARE_URL, '_blank', 'noopener,noreferrer'\)/);
  assert.match(source, /trackResultsLinkedInSharePanelVisibility/);
  assert.match(source, /copyResultsLinkedInSharePost/);
  assert.match(source, /trackResultsLinkedInOpenClicked/);
  assert.match(source, /Share your Sonartra result/);
  assert.match(source, /Copy LinkedIn Post/);
  assert.match(source, /Open LinkedIn/);
  assert.match(source, /readOnly/);
  assert.match(source, /aria-live="polite"/);
});

test('results page wires the share formatter and suppresses the share ui when hero content is unavailable', () => {
  const source = readFileSync(pagePath, 'utf8');

  assert.match(source, /import \{ ResultLinkedInShare \} from '@\/components\/results\/result-linkedin-share';/);
  assert.match(source, /import \{ formatLinkedInSharePost \} from '@\/lib\/results\/linkedin-share';/);
  assert.match(source, /import \{ buildResultsLinkedInShareAnalytics \} from '@\/lib\/results\/linkedin-share-analytics';/);
  assert.match(source, /const linkedinShare = formatLinkedInSharePost\(\{\s*hero: result\.hero,\s*rankedSignals: result\.rankedSignals,\s*\}\);/);
  assert.match(source, /const linkedinShareAnalytics = buildResultsLinkedInShareAnalytics\(result\);/);
  assert.match(source, /linkedinShare\.canShare \? \(/);
  assert.match(source, /analytics=\{linkedinShareAnalytics\}/);
  assert.match(source, /<ResultLinkedInShare/);
});
