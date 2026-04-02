import test from 'node:test';
import assert from 'node:assert/strict';
import { renderToStaticMarkup } from 'react-dom/server';

import {
  activateDomainSignalRingSignalByKeyboard,
  DomainSignalRing,
  getDomainSignalRingInitialSelectedSignalKey,
  resolveDomainSignalRingActiveSignal,
  selectDomainSignalRingSignal,
} from '@/components/results/domain-signal-ring';
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
        signalDescriptor: null,
        withinDomainPercent: 22,
        displayStrength: 0.552,
        rankWithinDomain: 3,
        isTopSignal: false,
        isSecondSignal: false,
      },
      {
        signalKey: 'signal_a',
        signalLabel: 'Signal A',
        signalDescriptor: 'Drives action and momentum',
        withinDomainPercent: 44,
        displayStrength: 0.904,
        rankWithinDomain: 1,
        isTopSignal: true,
        isSecondSignal: false,
      },
      {
        signalKey: 'signal_c',
        signalLabel: 'Signal C',
        signalDescriptor: 'Engages and energises others',
        withinDomainPercent: 34,
        displayStrength: 0.776,
        rankWithinDomain: 2,
        isTopSignal: false,
        isSecondSignal: true,
      },
    ]),
    signalCount: 3,
    topSignalKey: 'signal_a',
    maxWithinDomainPercent: 44,
    minWithinDomainPercent: 22,
    ...overrides,
  };
}

test('domain signal ring renders the domain label from props', () => {
  const markup = renderToStaticMarkup(<DomainSignalRing domain={buildDomain()} />);

  assert.match(markup, /Adaptive Patterns/);
  assert.match(markup, /A calm editorial summary for the domain\./);
  assert.match(markup, /domain-signal-ring-enter/);
  assert.match(markup, /max-w-\[14rem\] sm:max-w-\[14\.75rem\] md:max-w-\[15\.25rem\]/);
  assert.match(markup, /xl:grid-cols-\[minmax\(0,16\.25rem\)_minmax\(0,1fr\)\]/);
  assert.doesNotMatch(markup, /Domain Ring/);
});

test('domain signal ring renders the correct number of signal segments from input length', () => {
  const markup = renderToStaticMarkup(<DomainSignalRing domain={buildDomain()} />);
  const segmentCount = markup.match(/data-segment-index="/g)?.length ?? 0;

  assert.equal(segmentCount, 3);
});

test('domain signal ring preserves authored signal order in the rendered listing', () => {
  const markup = renderToStaticMarkup(
    <DomainSignalRing domain={buildDomain()} initialSelectedSignalKey="signal_c" />,
  );
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
  assert.match(markup, /stroke-width="2\.6"/);
  assert.match(markup, /stroke-width="2\.1"/);
  assert.match(markup, /data-segment-state="selected"/);
  assert.match(markup, /aria-pressed="true"/);
  assert.match(markup, />Top</);
  assert.match(markup, />2nd</);
});

test('domain signal ring renders the active detail treatment for the selected signal', () => {
  const markup = renderToStaticMarkup(
    <DomainSignalRing domain={buildDomain()} initialSelectedSignalKey="signal_c" />,
  );

  assert.match(markup, /data-active-detail-key="signal_c"/);
  assert.match(markup, /Signal C/);
  assert.match(markup, /34%/);
  assert.match(markup, /Signal C - Engages and energises others/);
  assert.doesNotMatch(markup, /Tap or press Enter\/Space to keep a signal active\./);
});

test('domain signal ring falls back to a generic active detail line when no descriptor is available', () => {
  const markup = renderToStaticMarkup(
    <DomainSignalRing
      domain={buildDomain({
        signals: Object.freeze([
          {
            signalKey: 'signal_b',
            signalLabel: 'Signal B',
            signalDescriptor: null,
            withinDomainPercent: 100,
            displayStrength: 1,
            rankWithinDomain: 1,
            isTopSignal: true,
            isSecondSignal: false,
          },
        ]),
        signalCount: 1,
        topSignalKey: 'signal_b',
        maxWithinDomainPercent: 100,
        minWithinDomainPercent: 100,
      })}
    />,
  );

  assert.match(markup, /A fuller descriptor is not available for this signal yet\./);
});

test('domain signal ring keeps signal labels and badges wrap-safe for narrow layouts', () => {
  const markup = renderToStaticMarkup(<DomainSignalRing domain={buildDomain()} />);

  assert.match(markup, /flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1\.5/);
  assert.match(markup, /min-w-0 flex-1 text-\[0\.95rem\] font-medium leading-6 tracking-\[-0\.02em\] sm:text-\[0\.97rem\]/);
  assert.match(markup, /rounded-\[1\.1rem\] border px-3\.5 py-3\.5 sm:px-4/);
});

test('domain signal ring handles empty signals without crashing', () => {
  const markup = renderToStaticMarkup(
    <DomainSignalRing
      domain={buildDomain({
        signals: Object.freeze([]),
        signalCount: 0,
        topSignalKey: null,
        maxWithinDomainPercent: null,
        minWithinDomainPercent: null,
      })}
    />,
  );

  assert.match(markup, /No signal balance is available for this area yet\./);
  assert.doesNotMatch(markup, /data-segment-index="/);
});

test('domain signal ring removes internal helper labels while keeping signal percentages visible', () => {
  const markup = renderToStaticMarkup(<DomainSignalRing domain={buildDomain()} />);

  assert.match(markup, /22%/);
  assert.match(markup, /44%/);
  assert.match(markup, /34%/);
  assert.doesNotMatch(markup, /Authored position/);
  assert.doesNotMatch(markup, /rank 1/);
  assert.doesNotMatch(markup, /Strength/);
  assert.doesNotMatch(markup, /Equal-angle segments preserve authored order/);
  assert.doesNotMatch(markup, />Signals</);
});

test('domain signal ring handles non-4 signal counts without crashing', () => {
  const markup = renderToStaticMarkup(
    <DomainSignalRing
      domain={buildDomain({
        signals: Object.freeze([
          {
            signalKey: 'northbound',
            signalLabel: 'Northbound',
            signalDescriptor: null,
            withinDomainPercent: 36,
            displayStrength: 0.936,
            rankWithinDomain: 1,
            isTopSignal: true,
            isSecondSignal: false,
          },
          {
            signalKey: 'eastbound',
            signalLabel: 'Eastbound',
            signalDescriptor: null,
            withinDomainPercent: 28,
            displayStrength: 0.816,
            rankWithinDomain: 2,
            isTopSignal: false,
            isSecondSignal: true,
          },
          {
            signalKey: 'southbound',
            signalLabel: 'Southbound',
            signalDescriptor: null,
            withinDomainPercent: 18,
            displayStrength: 0.64,
            rankWithinDomain: 3,
            isTopSignal: false,
            isSecondSignal: false,
          },
          {
            signalKey: 'westbound',
            signalLabel: 'Westbound',
            signalDescriptor: null,
            withinDomainPercent: 11,
            displayStrength: 0.504,
            rankWithinDomain: 4,
            isTopSignal: false,
            isSecondSignal: false,
          },
          {
            signalKey: 'zenith',
            signalLabel: 'Zenith',
            signalDescriptor: null,
            withinDomainPercent: 7,
            displayStrength: 0.368,
            rankWithinDomain: 5,
            isTopSignal: false,
            isSecondSignal: false,
          },
        ]),
        signalCount: 5,
        topSignalKey: 'northbound',
        maxWithinDomainPercent: 36,
        minWithinDomainPercent: 7,
      })}
    />,
  );

  const segmentCount = markup.match(/data-segment-index="/g)?.length ?? 0;

  assert.equal(segmentCount, 5);
  assert.match(markup, /aria-label="Adaptive Patterns ring with 5 signals"/);
});

test('domain signal ring selection helper keeps the requested signal selected', () => {
  const domain = buildDomain();

  assert.equal(getDomainSignalRingInitialSelectedSignalKey(domain), 'signal_a');
  assert.equal(selectDomainSignalRingSignal(domain, 'signal_a', 'signal_c'), 'signal_c');
  assert.equal(selectDomainSignalRingSignal(domain, 'signal_c', 'signal_c'), 'signal_c');
});

test('domain signal ring keyboard helper activates signals on enter and space only', () => {
  const domain = buildDomain();

  assert.equal(
    activateDomainSignalRingSignalByKeyboard({
      domain,
      currentSignalKey: 'signal_a',
      requestedSignalKey: 'signal_b',
      key: 'Enter',
    }),
    'signal_b',
  );
  assert.equal(
    activateDomainSignalRingSignalByKeyboard({
      domain,
      currentSignalKey: 'signal_a',
      requestedSignalKey: 'signal_c',
      key: ' ',
    }),
    'signal_c',
  );
  assert.equal(
    activateDomainSignalRingSignalByKeyboard({
      domain,
      currentSignalKey: 'signal_a',
      requestedSignalKey: 'signal_c',
      key: 'Escape',
    }),
    'signal_a',
  );
});

test('domain signal ring active signal resolver prefers highlighted then selected state', () => {
  const domain = buildDomain();

  assert.equal(
    resolveDomainSignalRingActiveSignal({
      domain,
      selectedSignalKey: 'signal_a',
      highlightedSignalKey: 'signal_c',
    })?.signalKey,
    'signal_c',
  );
  assert.equal(
    resolveDomainSignalRingActiveSignal({
      domain,
      selectedSignalKey: 'signal_a',
      highlightedSignalKey: null,
    })?.signalKey,
    'signal_a',
  );
});
