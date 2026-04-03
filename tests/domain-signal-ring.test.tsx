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
    signals: Object.freeze([
      {
        signalKey: 'signal_b',
        signalLabel: 'Signal B',
        withinDomainPercent: 22,
        displayStrength: 0.552,
        rankWithinDomain: 3,
        isTopSignal: false,
        isSecondSignal: false,
      },
      {
        signalKey: 'signal_a',
        signalLabel: 'Signal A',
        withinDomainPercent: 44,
        displayStrength: 0.904,
        rankWithinDomain: 1,
        isTopSignal: true,
        isSecondSignal: false,
      },
      {
        signalKey: 'signal_c',
        signalLabel: 'Signal C',
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
  assert.match(markup, /aria-label="Adaptive Patterns signal bars"/);
  assert.match(markup, /domain-signal-bar-enter/);
  assert.match(markup, /data-bar-track="true"/);
  assert.doesNotMatch(markup, /Domain Ring/);
});

test('domain signal ring renders the correct number of signal rows from input length', () => {
  const markup = renderToStaticMarkup(<DomainSignalRing domain={buildDomain()} />);
  const signalCount = markup.match(/data-signal-index="/g)?.length ?? 0;

  assert.equal(signalCount, 3);
});

test('domain signal ring preserves authored signal order in the rendered listing', () => {
  const markup = renderToStaticMarkup(
    <DomainSignalRing domain={buildDomain()} initialSelectedSignalKey="signal_c" />,
  );
  const signalBIndex = markup.indexOf('data-signal-key="signal_b"');
  const signalAIndex = markup.indexOf('data-signal-key="signal_a"');
  const signalCIndex = markup.indexOf('data-signal-key="signal_c"');

  assert.ok(signalBIndex >= 0);
  assert.ok(signalAIndex >= 0);
  assert.ok(signalCIndex >= 0);
  assert.ok(signalBIndex < signalAIndex);
  assert.ok(signalAIndex < signalCIndex);
});

test('domain signal ring applies top and second emphasis hooks for bars and labels', () => {
  const markup = renderToStaticMarkup(<DomainSignalRing domain={buildDomain()} />);

  assert.match(markup, /data-signal-key="signal_a"/);
  assert.match(markup, /data-signal-emphasis="top"/);
  assert.match(markup, /data-signal-key="signal_c"/);
  assert.match(markup, /data-signal-emphasis="second"/);
  assert.match(markup, /data-signal-state="selected"/);
  assert.match(markup, /data-bar-state="selected"/);
  assert.match(markup, /aria-pressed="true"/);
  assert.match(markup, />Top</);
  assert.match(markup, />2nd</);
});

test('domain signal ring bars reflect within-domain percentages through css width', () => {
  const markup = renderToStaticMarkup(<DomainSignalRing domain={buildDomain()} />);

  assert.match(markup, /data-bar-fill="signal_b"/);
  assert.match(markup, /data-bar-width="22%"/);
  assert.match(markup, /style="width:22%;/);
  assert.match(markup, /--signal-bar-target-width:22%/);
  assert.match(markup, /data-bar-fill="signal_a"/);
  assert.match(markup, /data-bar-width="44%"/);
  assert.match(markup, /style="width:44%;/);
  assert.match(markup, /--signal-bar-target-width:44%/);
  assert.match(markup, /data-bar-fill="signal_c"/);
  assert.match(markup, /data-bar-width="34%"/);
  assert.match(markup, /style="width:34%;/);
  assert.match(markup, /--signal-bar-target-width:34%/);
});

test('domain signal ring exposes distinct entry and interaction hooks without distorting width', () => {
  const markup = renderToStaticMarkup(<DomainSignalRing domain={buildDomain()} />);

  assert.match(markup, /domain-signal-bar-fill h-full rounded-full transition duration-200 ease-out/);
  assert.match(markup, /animation:domain-signal-bar-enter 560ms cubic-bezier\(0\.22, 1, 0\.36, 1\) both/);
  assert.match(markup, /animation-delay:0ms/);
  assert.match(markup, /animation-delay:55ms/);
  assert.match(markup, /animation-delay:110ms/);
});

test('domain signal ring renders the active detail treatment for the selected signal', () => {
  const markup = renderToStaticMarkup(
    <DomainSignalRing domain={buildDomain()} initialSelectedSignalKey="signal_c" />,
  );

  assert.match(markup, /data-active-detail-key="signal_c"/);
  assert.match(markup, /Signal C/);
  assert.match(markup, /34%/);
  assert.doesNotMatch(markup, /Tap or press Enter\/Space to keep a signal active\./);
});

test('domain signal ring active detail stays summary-free and label-led', () => {
  const markup = renderToStaticMarkup(
    <DomainSignalRing
      domain={buildDomain({
        signals: Object.freeze([
          {
            signalKey: 'signal_b',
            signalLabel: 'Signal B',
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

  assert.match(markup, /Signal B/);
  assert.doesNotMatch(markup, /A short descriptor is not available for this signal yet\./);
});

test('domain signal ring keeps the bar stack ahead of the active detail panel in markup', () => {
  const markup = renderToStaticMarkup(<DomainSignalRing domain={buildDomain()} />);
  const firstBarIndex = markup.indexOf('data-bar-fill="signal_b"');
  const activeDetailIndex = markup.indexOf('data-active-detail-key="signal_a"');

  assert.ok(firstBarIndex >= 0);
  assert.ok(activeDetailIndex >= 0);
  assert.ok(firstBarIndex < activeDetailIndex);
});

test('domain signal ring keeps signal labels and badges wrap-safe for narrow layouts', () => {
  const markup = renderToStaticMarkup(<DomainSignalRing domain={buildDomain()} />);

  assert.match(markup, /flex w-full flex-col gap-3 rounded-\[1\.1rem\] border px-4 py-4 text-left/);
  assert.match(markup, /flex min-w-0 items-start justify-between gap-4/);
  assert.match(markup, /w-full overflow-hidden rounded-full bg-\[rgba\(255,255,255,0\.08\)\] transition duration-200 ease-out/);
});

test('domain signal ring distinguishes highlighted and selected bar states in markup hooks', () => {
  const domain = buildDomain();

  assert.equal(
    resolveDomainSignalRingActiveSignal({
      domain,
      selectedSignalKey: 'signal_a',
      highlightedSignalKey: 'signal_b',
    })?.signalKey,
    'signal_b',
  );

  const selectedMarkup = renderToStaticMarkup(<DomainSignalRing domain={domain} />);
  assert.match(selectedMarkup, /data-signal-key="signal_a"[\s\S]*data-bar-state="selected"/);
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
  assert.doesNotMatch(markup, /data-bar-fill="/);
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
            withinDomainPercent: 36,
            displayStrength: 0.936,
            rankWithinDomain: 1,
            isTopSignal: true,
            isSecondSignal: false,
          },
          {
            signalKey: 'eastbound',
            signalLabel: 'Eastbound',
            withinDomainPercent: 28,
            displayStrength: 0.816,
            rankWithinDomain: 2,
            isTopSignal: false,
            isSecondSignal: true,
          },
          {
            signalKey: 'southbound',
            signalLabel: 'Southbound',
            withinDomainPercent: 18,
            displayStrength: 0.64,
            rankWithinDomain: 3,
            isTopSignal: false,
            isSecondSignal: false,
          },
          {
            signalKey: 'westbound',
            signalLabel: 'Westbound',
            withinDomainPercent: 11,
            displayStrength: 0.504,
            rankWithinDomain: 4,
            isTopSignal: false,
            isSecondSignal: false,
          },
          {
            signalKey: 'zenith',
            signalLabel: 'Zenith',
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

  const signalCount = markup.match(/data-signal-index="/g)?.length ?? 0;

  assert.equal(signalCount, 5);
  assert.match(markup, /aria-label="Adaptive Patterns signal bars"/);
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
