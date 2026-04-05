'use client';

import { useState } from 'react';

import { cn } from '@/components/shared/user-app-ui';
import type { DomainSignalRingViewModel } from '@/lib/server/domain-signal-ring-view-model';

const DOMAIN_SIGNAL_RING_CSS = `
@keyframes domain-signal-bar-enter {
  from {
    width: 0;
    opacity: 0.42;
  }
  to {
    width: var(--signal-bar-target-width, 0%);
    opacity: 1;
  }
}

@media (prefers-reduced-motion: reduce) {
  .domain-signal-ring-button,
  .domain-signal-bar-fill {
    animation: none !important;
    transition: none !important;
  }
}
`;

function formatPercent(value: number | null): string {
  return value === null ? 'N/A' : `${Math.round(value)}%`;
}

function getSignalBarWidth(value: number | null): string {
  if (value === null) {
    return '0%';
  }

  return `${Math.min(100, Math.max(0, value))}%`;
}

function resolveDomainSignalInsightText(
  signal: DomainSignalRingViewModel['signals'][number],
): string | null {
  if ((signal.rankWithinDomain === 1 || signal.rankWithinDomain === 2) && signal.strength) {
    return signal.strength;
  }

  if (signal.watchout) {
    return signal.watchout;
  }

  if (signal.development) {
    return signal.development;
  }

  return signal.summary;
}

function getSignalTone(signal: DomainSignalRingViewModel['signals'][number]): {
  markerLabel: string | null;
  markerClassName: string;
  rowClassName: string;
  labelClassName: string;
  valueClassName: string;
  fillClassName: string;
  detailAccentClassName: string;
} {
  if (signal.isTopSignal) {
    return {
      markerLabel: 'Top',
      markerClassName: 'border-white/12 bg-white/[0.045] text-white/72',
      rowClassName: 'border-white/10 bg-white/[0.03]',
      labelClassName: 'text-white',
      valueClassName: 'text-white/90',
      fillClassName: 'bg-[linear-gradient(90deg,rgba(226,235,248,0.82),rgba(183,200,227,0.68))]',
      detailAccentClassName: 'border-white/8 bg-white/[0.02]',
    };
  }

  if (signal.isSecondSignal) {
    return {
      markerLabel: '2nd',
      markerClassName: 'border-[#8eb1ff]/18 bg-[#8eb1ff]/[0.05] text-[#d4def2]',
      rowClassName: 'border-[#8eb1ff]/10 bg-[#8eb1ff]/[0.028]',
      labelClassName: 'text-white/92',
      valueClassName: 'text-white/84',
      fillClassName: 'bg-[linear-gradient(90deg,rgba(172,191,223,0.72),rgba(134,156,194,0.62))]',
      detailAccentClassName: 'border-[#8eb1ff]/10 bg-[#8eb1ff]/[0.02]',
    };
  }

  return {
    markerLabel: null,
    markerClassName: 'border-white/10 bg-white/5 text-white/58',
    rowClassName: 'border-white/8 bg-white/[0.018]',
    labelClassName: 'text-white/84',
    valueClassName: 'text-white/74',
    fillClassName: 'bg-[linear-gradient(90deg,rgba(132,150,181,0.56),rgba(102,118,146,0.46))]',
    detailAccentClassName: 'border-white/8 bg-white/[0.016]',
  };
}

function getSignalState(params: {
  signalKey: string;
  selectedSignalKey: string | null;
  highlightedSignalKey: string | null;
}): 'selected' | 'highlighted' | 'idle' {
  if (params.highlightedSignalKey === params.signalKey) {
    return 'highlighted';
  }

  if (params.selectedSignalKey === params.signalKey) {
    return 'selected';
  }

  return 'idle';
}

function getSignalByKey(
  domain: DomainSignalRingViewModel,
  signalKey: string | null | undefined,
): DomainSignalRingViewModel['signals'][number] | null {
  if (!signalKey) {
    return null;
  }

  return domain.signals.find((signal) => signal.signalKey === signalKey) ?? null;
}

export function getDomainSignalRingInitialSelectedSignalKey(
  domain: DomainSignalRingViewModel,
  requestedSignalKey?: string | null,
): string | null {
  if (requestedSignalKey && getSignalByKey(domain, requestedSignalKey)) {
    return requestedSignalKey;
  }

  if (domain.topSignalKey && getSignalByKey(domain, domain.topSignalKey)) {
    return domain.topSignalKey;
  }

  return domain.signals[0]?.signalKey ?? null;
}

export function selectDomainSignalRingSignal(
  domain: DomainSignalRingViewModel,
  currentSignalKey: string | null,
  requestedSignalKey: string,
): string | null {
  if (!getSignalByKey(domain, requestedSignalKey)) {
    return currentSignalKey;
  }

  return requestedSignalKey;
}

export function activateDomainSignalRingSignalByKeyboard(params: {
  domain: DomainSignalRingViewModel;
  currentSignalKey: string | null;
  requestedSignalKey: string;
  key: string;
}): string | null {
  if (params.key !== 'Enter' && params.key !== ' ' && params.key !== 'Spacebar') {
    return params.currentSignalKey;
  }

  return selectDomainSignalRingSignal(
    params.domain,
    params.currentSignalKey,
    params.requestedSignalKey,
  );
}

export function resolveDomainSignalRingActiveSignal(params: {
  domain: DomainSignalRingViewModel;
  selectedSignalKey: string | null;
  highlightedSignalKey: string | null;
}): DomainSignalRingViewModel['signals'][number] | null {
  return (
    getSignalByKey(params.domain, params.highlightedSignalKey) ??
    getSignalByKey(params.domain, params.selectedSignalKey) ??
    getSignalByKey(params.domain, getDomainSignalRingInitialSelectedSignalKey(params.domain))
  );
}

function SignalBarRow({
  signal,
  index,
  signalState,
  isSelected,
  onSelect,
  onHighlight,
  onClearHighlight,
}: Readonly<{
  signal: DomainSignalRingViewModel['signals'][number];
  index: number;
  signalState: 'selected' | 'highlighted' | 'idle';
  isSelected: boolean;
  onSelect: (signalKey: string) => void;
  onHighlight: (signalKey: string) => void;
  onClearHighlight: (signalKey: string) => void;
}>) {
  const tone = getSignalTone(signal);
  const barWidth = getSignalBarWidth(signal.withinDomainPercent);
  const isHighlighted = signalState === 'highlighted';
  const isSelectedState = signalState === 'selected';

  return (
    <li
      data-signal-index={index}
      data-signal-key={signal.signalKey}
      data-signal-emphasis={signal.isTopSignal ? 'top' : signal.isSecondSignal ? 'second' : 'base'}
    >
      <button
        type="button"
        className={cn(
          'domain-signal-ring-button flex w-full flex-col gap-2.5 rounded-[0.95rem] border px-0 py-2 text-left transition duration-200 ease-out focus:outline-none focus-visible:ring-2 focus-visible:ring-white/35 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0b1220]',
          isSelectedState
            ? 'border-white/12 bg-white/[0.03]'
            : isHighlighted
              ? 'border-[#b7cbff]/14 bg-[#8eb1ff]/[0.028]'
              : tone.rowClassName,
        )}
        aria-pressed={isSelected}
        aria-label={`${signal.signalLabel}, ${formatPercent(signal.withinDomainPercent)}${signal.isTopSignal ? ', top signal' : signal.isSecondSignal ? ', second signal' : ''}`}
        data-signal-state={signalState}
        data-bar-state={signalState}
        onClick={() => onSelect(signal.signalKey)}
        onFocus={() => onHighlight(signal.signalKey)}
        onBlur={() => onClearHighlight(signal.signalKey)}
        onMouseEnter={() => onHighlight(signal.signalKey)}
        onMouseLeave={() => onClearHighlight(signal.signalKey)}
        onKeyDown={(event) => {
          const nextSelection = activateDomainSignalRingSignalByKeyboard({
            domain: {
              domainKey: '',
              domainLabel: '',
              signals: [signal],
              signalCount: 1,
              topSignalKey: signal.signalKey,
              maxWithinDomainPercent: signal.withinDomainPercent,
              minWithinDomainPercent: signal.withinDomainPercent,
            },
            currentSignalKey: isSelected ? signal.signalKey : null,
            requestedSignalKey: signal.signalKey,
            key: event.key,
          });

          if (nextSelection === signal.signalKey) {
            event.preventDefault();
            onSelect(signal.signalKey);
          }
        }}
      >
        <div className="flex min-w-0 items-start justify-between gap-4 px-0.5">
          <div className="min-w-0 flex-1 space-y-1">
            <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1.5">
              <span
                className={cn(
                  'sonartra-type-nav min-w-0 flex-1 text-[0.97rem] leading-6',
                  isSelectedState || isHighlighted ? 'text-white' : tone.labelClassName,
                  signal.isTopSignal ? 'font-semibold' : null,
                )}
              >
                {signal.signalLabel}
              </span>
              {tone.markerLabel ? (
                <span
                  className={cn(
                    'sonartra-type-utility inline-flex rounded-full border px-1.5 py-0.5 text-[9px]',
                    tone.markerClassName,
                  )}
                >
                  {tone.markerLabel}
                </span>
              ) : null}
            </div>
          </div>

          <div className="shrink-0 text-right">
            <p
              className={cn(
                'sonartra-type-nav text-[0.94rem] sm:text-[0.98rem]',
                isSelectedState || isHighlighted ? 'text-white' : tone.valueClassName,
              )}
            >
              {formatPercent(signal.withinDomainPercent)}
            </p>
          </div>
        </div>

        <div className="mx-auto w-full max-w-[88%] px-0.5">
          <div
            className={cn(
              'w-full overflow-hidden rounded-full bg-[rgba(255,255,255,0.05)] transition duration-200 ease-out',
              isSelectedState
                ? 'h-[0.68rem] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.05)]'
                : isHighlighted
                  ? 'h-[0.64rem] shadow-[inset_0_0_0_1px_rgba(180,206,255,0.05)]'
                  : 'h-[0.52rem]',
            )}
            aria-hidden="true"
            data-bar-track="true"
          >
            <div
              className={cn(
                'domain-signal-bar-fill h-full rounded-full transition duration-200 ease-out',
                tone.fillClassName,
                isSelectedState
                  ? 'opacity-100 brightness-[1.01]'
                  : isHighlighted
                    ? 'opacity-100 brightness-[1.01]'
                    : signal.isTopSignal
                      ? 'opacity-100'
                      : signal.isSecondSignal
                        ? 'opacity-90'
                        : 'opacity-72',
              )}
              data-bar-fill={signal.signalKey}
              data-bar-width={barWidth}
              style={{
                width: barWidth,
                ['--signal-bar-target-width' as string]: barWidth,
                animation: 'domain-signal-bar-enter 560ms cubic-bezier(0.22, 1, 0.36, 1) both',
                animationDelay: `${index * 55}ms`,
              }}
            />
          </div>
        </div>
      </button>
    </li>
  );
}

export function DomainSignalRing({
  domain,
  className,
  initialSelectedSignalKey,
}: Readonly<{
  domain: DomainSignalRingViewModel;
  className?: string;
  initialSelectedSignalKey?: string | null;
}>) {
  const signals = domain.signals;
  const initialSelection = getDomainSignalRingInitialSelectedSignalKey(
    domain,
    initialSelectedSignalKey,
  );
  const [selectedSignalKey, setSelectedSignalKey] = useState<string | null>(initialSelection);
  const [highlightedSignalKey, setHighlightedSignalKey] = useState<string | null>(null);
  const activeSignal = resolveDomainSignalRingActiveSignal({
    domain,
    selectedSignalKey,
    highlightedSignalKey,
  });
  const activeSignalInsight = activeSignal ? resolveDomainSignalInsightText(activeSignal) : null;

  return (
    <section
      className={cn(
        'sonartra-report-utility-surface border-white/7 overflow-hidden rounded-[1.2rem] border p-4 sm:p-5',
        className,
      )}
      aria-label={`${domain.domainLabel} signal bars`}
      data-domain-key={domain.domainKey}
      data-selected-signal-key={selectedSignalKey ?? ''}
      data-active-signal-key={activeSignal?.signalKey ?? ''}
    >
      <style>{DOMAIN_SIGNAL_RING_CSS}</style>

      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="sonartra-report-kicker">Within this domain</p>
          <p className="sonartra-type-caption text-white/42">{signals.length} signals</p>
        </div>

        <div className="space-y-2.5">
          {signals.length > 0 ? (
            <ol className="space-y-2.5">
              {signals.map((signal, index) => {
                const signalState = getSignalState({
                  signalKey: signal.signalKey,
                  selectedSignalKey,
                  highlightedSignalKey,
                });

                return (
                  <SignalBarRow
                    key={signal.signalKey}
                    signal={signal}
                    index={index}
                    signalState={signalState}
                    isSelected={selectedSignalKey === signal.signalKey}
                    onSelect={(signalKey) => {
                      setSelectedSignalKey((currentSignalKey) =>
                        selectDomainSignalRingSignal(domain, currentSignalKey, signalKey),
                      );
                    }}
                    onHighlight={(signalKey) => setHighlightedSignalKey(signalKey)}
                    onClearHighlight={(signalKey) =>
                      setHighlightedSignalKey((currentSignalKey) =>
                        currentSignalKey === signalKey ? null : currentSignalKey,
                      )
                    }
                  />
                );
              })}
            </ol>
          ) : (
            <div className="sonartra-type-body-secondary border-white/8 text-white/48 rounded-[1rem] border border-dashed bg-white/[0.018] px-4 py-5">
              No signal balance is available for this area yet.
            </div>
          )}
        </div>

        {activeSignal ? (
          <div
            className={cn(
              'rounded-[0.95rem] border px-4 py-3',
              getSignalTone(activeSignal).detailAccentClassName,
            )}
            aria-live="polite"
            data-active-detail-key={activeSignal.signalKey}
          >
            <div className="space-y-3">
              <div className="flex flex-wrap items-start justify-between gap-2.5">
                <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-2 gap-y-1.5">
                  <p className="sonartra-type-nav text-white/88 min-w-0 flex-1 sm:text-[0.95rem]">
                    {activeSignal.signalLabel}
                  </p>
                  {activeSignal.isTopSignal ? (
                    <span className="sonartra-type-utility border-white/12 text-white/72 inline-flex rounded-full border bg-white/[0.04] px-1.5 py-0.5 text-[9px]">
                      Top
                    </span>
                  ) : activeSignal.isSecondSignal ? (
                    <span className="sonartra-type-utility border-[#8eb1ff]/18 inline-flex rounded-full border bg-[#8eb1ff]/[0.05] px-1.5 py-0.5 text-[9px] text-[#d4def2]">
                      2nd
                    </span>
                  ) : null}
                </div>
                <p className="sonartra-type-nav text-white/76 shrink-0 pt-0.5 sm:text-[0.98rem]">
                  {formatPercent(activeSignal.withinDomainPercent)}
                </p>
              </div>

              {activeSignalInsight ? (
                <p className="sonartra-type-body-secondary text-white/66 max-w-[42rem]">
                  {activeSignalInsight}
                </p>
              ) : null}
            </div>
          </div>
        ) : (
          <div
            className="border-white/8 rounded-[1rem] border bg-white/[0.018] px-4 py-3.5"
            aria-live="polite"
            data-active-detail-key=""
          >
            <p className="sonartra-type-caption text-white/46">
              No signal reading is available for this area yet.
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
