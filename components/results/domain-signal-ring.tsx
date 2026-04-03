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
      markerClassName: 'border-white/25 bg-white/12 text-white',
      rowClassName: 'border-white/16 bg-white/[0.07]',
      labelClassName: 'text-white',
      valueClassName: 'text-white',
      fillClassName: 'bg-[linear-gradient(90deg,rgba(238,245,255,0.96),rgba(198,216,255,0.92))]',
      detailAccentClassName: 'border-white/16 bg-white/[0.06]',
    };
  }

  if (signal.isSecondSignal) {
    return {
      markerLabel: '2nd',
      markerClassName: 'border-[#8eb1ff]/35 bg-[#8eb1ff]/10 text-[#d9e5ff]',
      rowClassName: 'border-[#8eb1ff]/18 bg-[#8eb1ff]/[0.05]',
      labelClassName: 'text-white/92',
      valueClassName: 'text-white/90',
      fillClassName: 'bg-[linear-gradient(90deg,rgba(181,205,255,0.88),rgba(142,177,255,0.8))]',
      detailAccentClassName: 'border-[#8eb1ff]/18 bg-[#8eb1ff]/[0.05]',
    };
  }

  return {
    markerLabel: null,
    markerClassName: 'border-white/10 bg-white/5 text-white/58',
    rowClassName: 'border-white/8 bg-white/[0.03]',
    labelClassName: 'text-white/84',
    valueClassName: 'text-white/82',
    fillClassName: 'bg-[linear-gradient(90deg,rgba(135,158,203,0.72),rgba(112,135,179,0.52))]',
    detailAccentClassName: 'border-white/10 bg-white/[0.03]',
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

  return selectDomainSignalRingSignal(params.domain, params.currentSignalKey, params.requestedSignalKey);
}

export function resolveDomainSignalRingActiveSignal(params: {
  domain: DomainSignalRingViewModel;
  selectedSignalKey: string | null;
  highlightedSignalKey: string | null;
}): DomainSignalRingViewModel['signals'][number] | null {
  return (
    getSignalByKey(params.domain, params.highlightedSignalKey)
    ?? getSignalByKey(params.domain, params.selectedSignalKey)
    ?? getSignalByKey(params.domain, getDomainSignalRingInitialSelectedSignalKey(params.domain))
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
          'domain-signal-ring-button flex w-full flex-col gap-3 rounded-[1.1rem] border px-4 py-4 text-left transition duration-200 ease-out focus:outline-none focus-visible:ring-2 focus-visible:ring-white/45 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0b1220]',
          isSelectedState
            ? 'border-white/18 bg-white/[0.09] shadow-[0_16px_38px_rgba(4,10,24,0.24)]'
            : isHighlighted
              ? 'border-[#b7cbff]/28 bg-[#8eb1ff]/[0.08] shadow-[0_12px_28px_rgba(10,20,42,0.22)]'
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
        <div className="flex min-w-0 items-start justify-between gap-4">
          <div className="min-w-0 flex-1 space-y-1">
            <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1.5">
              <span
                className={cn(
                  'min-w-0 flex-1 text-[0.97rem] font-medium leading-6 tracking-[-0.02em]',
                  isSelectedState || isHighlighted ? 'text-white' : tone.labelClassName,
                  signal.isTopSignal ? 'font-semibold' : null,
                )}
              >
                {signal.signalLabel}
              </span>
              {tone.markerLabel ? (
                <span
                  className={cn(
                    'inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.16em]',
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
                'text-[0.97rem] font-semibold tracking-[-0.02em] sm:text-[1rem]',
                isSelectedState || isHighlighted ? 'text-white' : tone.valueClassName,
              )}
            >
              {formatPercent(signal.withinDomainPercent)}
            </p>
          </div>
        </div>

        <div
          className={cn(
            'w-full overflow-hidden rounded-full bg-[rgba(255,255,255,0.08)] transition duration-200 ease-out',
            isSelectedState ? 'h-4 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.08)]' : isHighlighted ? 'h-[0.92rem] shadow-[inset_0_0_0_1px_rgba(180,206,255,0.08)]' : 'h-3',
          )}
          aria-hidden="true"
          data-bar-track="true"
        >
          <div
            className={cn(
              'domain-signal-bar-fill h-full rounded-full transition duration-200 ease-out',
              tone.fillClassName,
              isSelectedState
                ? 'opacity-100 shadow-[0_0_18px_rgba(228,237,255,0.28)] brightness-[1.06]'
                : isHighlighted
                  ? 'opacity-100 shadow-[0_0_14px_rgba(157,186,255,0.2)] brightness-[1.03]'
                  : signal.isTopSignal
                    ? 'opacity-100'
                    : signal.isSecondSignal
                      ? 'opacity-92'
                      : 'opacity-78',
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
  const initialSelection = getDomainSignalRingInitialSelectedSignalKey(domain, initialSelectedSignalKey);
  const [selectedSignalKey, setSelectedSignalKey] = useState<string | null>(initialSelection);
  const [highlightedSignalKey, setHighlightedSignalKey] = useState<string | null>(null);
  const activeSignal = resolveDomainSignalRingActiveSignal({
    domain,
    selectedSignalKey,
    highlightedSignalKey,
  });

  return (
    <section
      className={cn(
        'overflow-hidden rounded-[1.6rem] border border-white/10 bg-[linear-gradient(180deg,rgba(15,24,40,0.78),rgba(8,13,24,0.94))] p-6 shadow-[0_24px_80px_rgba(3,8,20,0.32)] sm:p-7',
        className,
      )}
      aria-label={`${domain.domainLabel} signal bars`}
      data-domain-key={domain.domainKey}
      data-selected-signal-key={selectedSignalKey ?? ''}
      data-active-signal-key={activeSignal?.signalKey ?? ''}
    >
      <style>{DOMAIN_SIGNAL_RING_CSS}</style>

      <div className="space-y-6">
        <div className="space-y-3.5">
          {signals.length > 0 ? (
            <ol className="space-y-3">
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
                        selectDomainSignalRingSignal(domain, currentSignalKey, signalKey));
                    }}
                    onHighlight={(signalKey) => setHighlightedSignalKey(signalKey)}
                    onClearHighlight={(signalKey) => setHighlightedSignalKey((currentSignalKey) =>
                      currentSignalKey === signalKey ? null : currentSignalKey)}
                  />
                );
              })}
            </ol>
          ) : (
            <div className="rounded-[1.1rem] border border-dashed border-white/10 bg-white/[0.03] px-4 py-5 text-[0.92rem] leading-7 text-white/48">
              No signal balance is available for this area yet.
            </div>
          )}
        </div>

        {activeSignal ? (
          <div
            className={cn(
              'rounded-[1.1rem] border px-4 py-3.5',
              getSignalTone(activeSignal).detailAccentClassName,
            )}
            aria-live="polite"
            data-active-detail-key={activeSignal.signalKey}
          >
            <div className="space-y-2.5">
              <div className="flex flex-wrap items-start justify-between gap-2.5">
                <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-2 gap-y-1.5">
                  <p className="min-w-0 flex-1 text-[0.93rem] font-semibold leading-6 tracking-[-0.02em] text-white sm:text-[0.96rem]">
                    {activeSignal.signalLabel}
                  </p>
                  {activeSignal.isTopSignal ? (
                    <span className="inline-flex rounded-full border border-white/22 bg-white/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-white">
                      Top
                    </span>
                  ) : activeSignal.isSecondSignal ? (
                    <span className="inline-flex rounded-full border border-[#8eb1ff]/35 bg-[#8eb1ff]/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#d9e5ff]">
                      2nd
                    </span>
                  ) : null}
                </div>
                <p className="shrink-0 pt-0.5 text-[0.96rem] font-semibold tracking-[-0.03em] text-white/88 sm:text-[1rem]">
                  {formatPercent(activeSignal.withinDomainPercent)}
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div
            className="rounded-[1.1rem] border border-white/10 bg-white/[0.03] px-4 py-3.5"
            aria-live="polite"
            data-active-detail-key=""
          >
            <p className="text-[0.82rem] leading-6 text-white/46">No signal reading is available for this area yet.</p>
          </div>
        )}
      </div>
    </section>
  );
}
