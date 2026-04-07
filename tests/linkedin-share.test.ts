import test from 'node:test';
import assert from 'node:assert/strict';

import {
  DEFAULT_SONARTRA_SHARE_LINK,
  formatLinkedInSharePost,
} from '@/lib/results/linkedin-share';

function buildInput(overrides?: Partial<Parameters<typeof formatLinkedInSharePost>[0]>) {
  return {
    hero: {
      headline: 'Brings calm structure to complex work',
      subheadline: 'Subheadline',
      summary: 'Keeps momentum steady without making the work feel rushed.',
      narrative:
        'Creates clarity early, keeps the main line visible, and helps other people stay oriented when the pace increases.',
      pressureOverlay: null,
      environmentOverlay: null,
      primaryPattern: null,
      heroPattern: null,
      domainPairWinners: [],
      traitTotals: [],
      matchedPatterns: [],
      domainHighlights: [],
    },
    rankedSignals: [],
    ...overrides,
  };
}

test('formatter builds deterministic linkedin post copy from persisted hero fields', () => {
  const result = formatLinkedInSharePost(
    buildInput({
      firstName: 'Mark',
      shareLink: 'https://example.com/share',
    }),
  );

  assert.equal(result.canShare, true);
  assert.equal(
    result.postBody,
    [
      'I’ve just completed the Sonartra Signals assessment — do you agree with how my behavioural patterns show up?',
      'Mark Brings calm structure to complex work.',
      'Creates clarity early, keeps the main line visible, and helps other people stay oriented when the pace increases.\n\nKeeps momentum steady without making the work feel rushed.',
      'If you’re curious about your own patterns and want a free Sonartra Signals assessment, take a look here:',
      'https://example.com/share',
    ].join('\n\n'),
  );
});

test('formatter omits the name token cleanly when first name is absent', () => {
  const result = formatLinkedInSharePost(buildInput());

  assert.equal(result.canShare, true);
  assert.match(result.postBody, /^I’ve just completed the Sonartra Signals assessment/);
  assert.match(result.postBody, /\n\nBrings calm structure to complex work\./);
  assert.doesNotMatch(result.postBody, /\[\]/);
  assert.doesNotMatch(result.postBody, /undefined|null/);
  assert.match(result.postBody, new RegExp(`${DEFAULT_SONARTRA_SHARE_LINK.replace(/\./g, '\\.')}$`));
});

test('formatter handles partially absent hero content and still returns concise share text', () => {
  const result = formatLinkedInSharePost(
    buildInput({
      hero: {
        ...buildInput().hero,
        headline: '',
        narrative: '',
        summary: 'Works best when the path ahead is explicit and the pace stays deliberate.',
      },
    }),
  );

  assert.equal(result.canShare, true);
  assert.equal(
    result.postBody,
    [
      'I’ve just completed the Sonartra Signals assessment — do you agree with how my behavioural patterns show up?',
      'Works best when the path ahead is explicit and the pace stays deliberate.',
      'If you’re curious about your own patterns and want a free Sonartra Signals assessment, take a look here:',
      DEFAULT_SONARTRA_SHARE_LINK,
    ].join('\n\n'),
  );
});

test('formatter returns canShare false when required hero content is unavailable', () => {
  const result = formatLinkedInSharePost(
    buildInput({
      hero: {
        ...buildInput().hero,
        headline: '   ',
        summary: '',
        narrative: '',
      },
    }),
  );

  assert.deepEqual(result, {
    postBody: '',
    canShare: false,
  });
});

test('formatter removes duplicate hero body text when summary and narrative overlap heavily', () => {
  const result = formatLinkedInSharePost(
    buildInput({
      hero: {
        ...buildInput().hero,
        headline: 'Brings calm structure to complex work.',
        summary: 'Creates clarity early, keeps the main line visible.',
        narrative: 'Creates clarity early, keeps the main line visible.',
      },
    }),
  );

  const sections = result.postBody.split('\n\n');
  assert.equal(result.canShare, true);
  assert.equal(
    sections.filter((section) => section === 'Creates clarity early, keeps the main line visible.')
      .length,
    1,
  );
});
