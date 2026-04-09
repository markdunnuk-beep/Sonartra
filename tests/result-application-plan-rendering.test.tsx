import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { renderToStaticMarkup } from 'react-dom/server';

import { ApplicationPlan } from '@/components/results/application-plan';
import type { ApplicationSection } from '@/lib/types/result';

const componentPath = join(
  process.cwd(),
  'components',
  'results',
  'application-plan.tsx',
);

function buildApplication(overrides?: Partial<ApplicationSection>): ApplicationSection {
  return {
    thesis: {
      headline: 'A steady pattern with practical leverage',
      summary: 'You create the most impact when clear structure and consistency turn into dependable traction.',
      sourceKeys: {
        heroPatternKey: 'steady_steward',
      },
    },
    signatureContribution: {
      title: 'Where you create the most value',
      summary: '',
      items: [
        {
          label: 'Stability under load',
          narrative: 'You help work stay coherent when demands increase.',
          bestWhen: 'Works best when the team needs steadiness and follow-through.',
          watchFor: 'over-carrying responsibility',
          sourceKey: 'signal_pair_a',
          sourceType: 'pair',
        },
      ],
    },
    patternRisks: {
      title: 'Where this pattern can work against you',
      summary: '',
      items: [
        {
          label: 'Over-holding the centre',
          narrative: 'You can end up containing too much rather than redistributing load.',
          impact: 'Others rely on you instead of owning more themselves.',
          earlyWarning: 'You are stepping in before others have fully engaged.',
          sourceKey: 'signal_pair_b',
          sourceType: 'pair',
        },
      ],
    },
    rangeBuilder: {
      title: 'Where to build more range',
      summary: '',
      items: [
        {
          label: 'Sharpened escalation',
          narrative: 'Developing clearer escalation helps protect pace and ownership.',
          practice: 'Try this: Name the decision point earlier and ask who owns the next move.',
          successMarker: 'You intervene later and more precisely.',
          sourceKey: 'signal_c',
          sourceType: 'signal',
        },
      ],
    },
    actionPlan30: {
      keepDoing: 'Keep anchoring the work in clear expectations.',
      watchFor: 'Watch for taking on too much before others step up.',
      practiceNext: 'Ask for explicit ownership earlier in the work.',
      askOthers: 'Where do I create clarity, and where do I create dependence?',
    },
    ...overrides,
  };
}

test('renders thesis headline and summary', () => {
  const markup = renderToStaticMarkup(<ApplicationPlan application={buildApplication()} />);

  assert.match(markup, /A steady pattern with practical leverage/);
  assert.match(
    markup,
    /You create the most impact when clear structure and consistency turn into dependable traction\./,
  );
});

test('renders contribution items', () => {
  const markup = renderToStaticMarkup(<ApplicationPlan application={buildApplication()} />);

  assert.match(markup, /Where you create the most value/);
  assert.match(markup, /Stability under load/);
  assert.match(markup, /You help work stay coherent when demands increase\./);
  assert.match(markup, /Works best when the team needs steadiness and follow-through/);
});

test('renders risk items', () => {
  const markup = renderToStaticMarkup(<ApplicationPlan application={buildApplication()} />);

  assert.match(markup, /Where this pattern can work against you/);
  assert.match(markup, /Over-holding the centre/);
  assert.match(markup, /You can end up containing too much rather than redistributing load\./);
  assert.match(markup, /You are stepping in before others have fully engaged\./);
});

test('renders development items', () => {
  const markup = renderToStaticMarkup(<ApplicationPlan application={buildApplication()} />);

  assert.match(markup, /Where to build more range/);
  assert.match(markup, /Sharpened escalation/);
  assert.match(markup, /Developing clearer escalation helps protect pace and ownership\./);
  assert.match(markup, /Try this: Name the decision point earlier and ask who owns the next move\./);
});

test('renders action prompts', () => {
  const markup = renderToStaticMarkup(<ApplicationPlan application={buildApplication()} />);

  assert.match(markup, /What to do next/);
  assert.match(markup, /Keep doing/);
  assert.match(markup, /Keep anchoring the work in clear expectations\./);
  assert.match(markup, /Watch for/);
  assert.match(markup, /Watch for taking on too much before others step up\./);
  assert.match(markup, /Try this/);
  assert.match(markup, /Ask for explicit ownership earlier in the work\./);
  assert.match(markup, /Ask others/);
  assert.match(markup, /Where do I create clarity, and where do I create dependence\?/);
});

test('does not render old action section labels', () => {
  const source = readFileSync(componentPath, 'utf8');

  assert.doesNotMatch(source, /What to keep doing/);
  assert.doesNotMatch(source, /Where to be careful/);
  assert.doesNotMatch(source, /Where to focus next/);
  assert.doesNotMatch(source, /actions\.strengths/);
  assert.doesNotMatch(source, /actions\.watchouts/);
  assert.doesNotMatch(source, /actions\.developmentFocus/);
});

test('does not recompute any values', () => {
  const source = readFileSync(componentPath, 'utf8');

  assert.match(source, /application\.thesis\.headline/);
  assert.match(source, /application\.signatureContribution\.items\.map/);
  assert.match(source, /application\.patternRisks\.items\.map/);
  assert.match(source, /application\.rangeBuilder\.items\.map/);
  assert.match(source, /application\.actionPlan30\.keepDoing/);
  assert.doesNotMatch(source, /result\./);
  assert.doesNotMatch(source, /sort\(/);
  assert.doesNotMatch(source, /slice\(/);
  assert.doesNotMatch(source, /reduce\(/);
  assert.doesNotMatch(source, /application\.[a-zA-Z0-9_]+\.(filter|sort|slice|reduce)\(/);
});

test('returns nothing when application is missing', () => {
  assert.equal(renderToStaticMarkup(<ApplicationPlan application={null} />), '');
});
