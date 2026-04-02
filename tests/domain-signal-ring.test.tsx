import test from 'node:test';
import assert from 'node:assert/strict';
import { renderToStaticMarkup } from 'react-dom/server';

import { DomainSignalRing } from '@/components/results/domain-signal-ring';
import type { DomainSignalRingViewModel } from '@/lib/server/domain-signal-ring-view-model';

function buildDomain(overrides?: Partial<DomainSignalRingViewModel>): DomainSignalRingViewModel {
  return {
    domainKey: 'adaptive_patterns',
    domainLabel: 'Adaptive Patterns',
    domainSummary: 'A calm editorial summary for the domain.',
    signals: Object.freeze([
      {
        signalKey: 'signal_b',
        signalLabel: 'Signal B',
        scorePercent: 44,
        displayStrength: 0.552,
        rankWithinDomain: 3,
        isTopSignal: false,
        isSecondSignal: false,
      },
      {
        signalKey: 'signal_a',
        signalLabel: 'Signal A',
        scorePercent: 88,
        displayStrength: 0.904,
        rankWithinDomain: 1,
        isTopSignal: true,
        isSecondSignal: false,
      },
      {
        signalKey: 'signal_c',
        signalLabel: 'Signal C',
        scorePercent: 72,
        displayStrength: 0.776,
        rankWithinDomain: 2,
        isTopSignal: false,
        isSecondSignal: true,
      },
    ]),
    signalCount: 3,
    topSignalKey: 'signal_a',
    maxSignalPercent: 88,
    minSignalPercent: 44,
    ...overrides,
  };
}

test('domain signal ring renders the domain label from props', () => {
  const markup = renderToStaticMarkup(<DomainSignalRing domain={buildDomain()} />);

  assert.match(markup, /Adaptive Patterns/);
  assert.match(markup, /A calm editorial summary for the domain\./);
});

test('domain signal ring renders the correct number of signal segments from input length', () => {
  const markup = renderToStaticMarkup(<DomainSignalRing domain={buildDomain()} />);
  const segmentCount = markup.match(/data-segment-index="/g)?.length ?? 0;

  assert.equal(segmentCount, 3);
});

test('domain signal ring preserves authored signal order in the rendered listing', () => {
  const markup = renderToStaticMarkup(<DomainSignalRing domain={buildDomain()} />);
  const signalBIndex = markup.indexOf('Signal B');
  const signalAIndex = markup.indexOf('Signal A');
  const signalCIndex = markup.indexOf('Signal C');

  assert.ok(signalBIndex >= 0);
  assert.ok(signalAIndex >= 0);
  assert.ok(signalCIndex >= 0);
  assert.ok(signalBIndex < signalAIndex);
  assert.ok(signalAIndex < signalCIndex);
});

test('domain signal ring applies top and second emphasis hooks for segments and labels', () => {
  const markup = renderToStaticMarkup(<DomainSignalRing domain={buildDomain()} />);

  assert.match(markup, /data-segment-key="signal_a"/);
  assert.match(markup, /data-segment-emphasis="top"/);
  assert.match(markup, /data-segment-key="signal_c"/);
  assert.match(markup, /data-segment-emphasis="second"/);
  assert.match(markup, /data-signal-key="signal_a"/);
  assert.match(markup, /data-signal-emphasis="top"/);
  assert.match(markup, /data-signal-key="signal_c"/);
  assert.match(markup, /data-signal-emphasis="second"/);
  assert.match(markup, />Top</);
  assert.match(markup, />2nd</);
});

test('domain signal ring handles empty signals without crashing', () => {
  const markup = renderToStaticMarkup(
    <DomainSignalRing
      domain={buildDomain({
        signals: Object.freeze([]),
        signalCount: 0,
        topSignalKey: null,
        maxSignalPercent: null,
        minSignalPercent: null,
      })}
    />,
  );

  assert.match(markup, /No persisted signals are available for this domain yet\./);
  assert.doesNotMatch(markup, /data-segment-index="/);
});

test('domain signal ring handles non-4 signal counts without crashing', () => {
  const markup = renderToStaticMarkup(
    <DomainSignalRing
      domain={buildDomain({
        signals: Object.freeze([
          {
            signalKey: 'northbound',
            signalLabel: 'Northbound',
            scorePercent: 92,
            displayStrength: 0.936,
            rankWithinDomain: 1,
            isTopSignal: true,
            isSecondSignal: false,
          },
          {
            signalKey: 'eastbound',
            signalLabel: 'Eastbound',
            scorePercent: 77,
            displayStrength: 0.816,
            rankWithinDomain: 2,
            isTopSignal: false,
            isSecondSignal: true,
          },
          {
            signalKey: 'southbound',
            signalLabel: 'Southbound',
            scorePercent: 55,
            displayStrength: 0.64,
            rankWithinDomain: 3,
            isTopSignal: false,
            isSecondSignal: false,
          },
          {
            signalKey: 'westbound',
            signalLabel: 'Westbound',
            scorePercent: 38,
            displayStrength: 0.504,
            rankWithinDomain: 4,
            isTopSignal: false,
            isSecondSignal: false,
          },
          {
            signalKey: 'zenith',
            signalLabel: 'Zenith',
            scorePercent: 21,
            displayStrength: 0.368,
            rankWithinDomain: 5,
            isTopSignal: false,
            isSecondSignal: false,
          },
        ]),
        signalCount: 5,
        topSignalKey: 'northbound',
        maxSignalPercent: 92,
        minSignalPercent: 21,
      })}
    />,
  );

  const segmentCount = markup.match(/data-segment-index="/g)?.length ?? 0;

  assert.equal(segmentCount, 5);
  assert.match(markup, /aria-label="Adaptive Patterns ring with 5 signals"/);
});
