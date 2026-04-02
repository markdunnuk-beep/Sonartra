'use client';

import { useState } from 'react';

import { cn } from '@/components/shared/user-app-ui';
import type { DomainSignalRingViewModel } from '@/lib/server/domain-signal-ring-view-model';

type Point = {
  x: number;
  y: number;
};

const VIEWBOX_SIZE = 240;
const VIEWBOX_CENTER = VIEWBOX_SIZE / 2;
const INNER_RADIUS = 46;
const OUTER_RADIUS_MIN = 78;
const OUTER_RADIUS_RANGE = 30;
const SEGMENT_GAP_DEGREES = 3;
const MIN_VISIBLE_DISPLAY_STRENGTH = 0.2;

const DOMAIN_SIGNAL_RING_CSS = `
@keyframes domain-signal-ring-enter {
  from {
    transform: scale(var(--ring-entry-scale, 0.86));
    opacity: 0.58;
  }
  to {
    transform: scale(1);
    opacity: 1;
  }
}

@media (prefers-reduced-motion: reduce) {
  .domain-signal-ring-segment {
    animation: none !important;
    transition: none !important;
  }

  .domain-signal-ring-button {
    transition: none !important;
  }
}
`;

function polarToCartesian(radius: number, angleDegrees: number): Point {
  const angleRadians = ((angleDegrees - 90) * Math.PI) / 180;

  return {
    x: VIEWBOX_CENTER + radius * Math.cos(angleRadians),
    y: VIEWBOX_CENTER + radius * Math.sin(angleRadians),
  };
}

function describeRingSegment(params: {
  startAngle: number;
  endAngle: number;
  innerRadius: number;
  outerRadius: number;
}): string {
  const outerStart = polarToCartesian(params.outerRadius, params.startAngle);
  const outerEnd = polarToCartesian(params.outerRadius, params.endAngle);
  const innerEnd = polarToCartesian(params.innerRadius, params.endAngle);
  const innerStart = polarToCartesian(params.innerRadius, params.startAngle);
  const largeArcFlag = params.endAngle - params.startAngle > 180 ? 1 : 0;

  return [
    `M ${outerStart.x} ${outerStart.y}`,
    `A ${params.outerRadius} ${params.outerRadius} 0 ${largeArcFlag} 1 ${outerEnd.x} ${outerEnd.y}`,
    `L ${innerEnd.x} ${innerEnd.y}`,
    `A ${params.innerRadius} ${params.innerRadius} 0 ${largeArcFlag} 0 ${innerStart.x} ${innerStart.y}`,
    'Z',
  ].join(' ');
}

function formatPercent(value: number | null): string {
  return value === null ? 'N/A' : `${Math.round(value)}%`;
}

function getSignalTone(signal: DomainSignalRingViewModel['signals'][number]): {
  segmentClassName: string;
  markerLabel: string | null;
  markerClassName: string;
  segmentOpacity: number;
  segmentStrokeWidth: number;
  labelClassName: string;
  valueClassName: string;
  detailAccentClassName: string;
} {
  if (signal.isTopSignal) {
    return {
      segmentClassName: 'fill-[rgba(238,245,255,0.92)] stroke-[rgba(238,245,255,0.96)]',
      markerLabel: 'Top',
      markerClassName: 'border-white/25 bg-white/12 text-white',
      segmentOpacity: 1,
      segmentStrokeWidth: 2.6,
      labelClassName: 'text-white',
      valueClassName: 'text-white',
      detailAccentClassName: 'border-white/16 bg-white/[0.06]',
    };
  }

  if (signal.isSecondSignal) {
    return {
      segmentClassName: 'fill-[rgba(166,193,255,0.68)] stroke-[rgba(198,216,255,0.86)]',
      markerLabel: '2nd',
      markerClassName: 'border-[#8eb1ff]/35 bg-[#8eb1ff]/10 text-[#d9e5ff]',
      segmentOpacity: 0.92,
      segmentStrokeWidth: 2.1,
      labelClassName: 'text-white/92',
      valueClassName: 'text-white/90',
      detailAccentClassName: 'border-[#8eb1ff]/18 bg-[#8eb1ff]/[0.05]',
    };
  }

  return {
    segmentClassName: 'fill-[rgba(126,150,196,0.32)] stroke-[rgba(151,174,221,0.52)]',
    markerLabel: null,
    markerClassName: 'border-white/10 bg-white/5 text-white/58',
    segmentOpacity: 0.78,
    segmentStrokeWidth: 1.55,
    labelClassName: 'text-white/84',
    valueClassName: 'text-white/82',
    detailAccentClassName: 'border-white/10 bg-white/[0.03]',
  };
}

function buildSegmentPath(params: {
  signalCount: number;
  index: number;
  displayStrength: number;
}): string {
  const anglePerSegment = 360 / params.signalCount;
  const startAngle = params.index * anglePerSegment + SEGMENT_GAP_DEGREES / 2;
  const endAngle = (params.index + 1) * anglePerSegment - SEGMENT_GAP_DEGREES / 2;
  const outerRadius = OUTER_RADIUS_MIN + OUTER_RADIUS_RANGE * params.displayStrength;

  return describeRingSegment({
    startAngle,
    endAngle,
    innerRadius: INNER_RADIUS,
    outerRadius,
  });
}

function getEntryScale(displayStrength: number): number {
  const baselineRadius = OUTER_RADIUS_MIN + OUTER_RADIUS_RANGE * MIN_VISIBLE_DISPLAY_STRENGTH;
  const fullRadius = OUTER_RADIUS_MIN + OUTER_RADIUS_RANGE * displayStrength;

  return Number((baselineRadius / fullRadius).toFixed(4));
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

function SignalLegendButton({
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

  return (
    <li data-signal-index={index} data-signal-key={signal.signalKey} data-signal-emphasis={signal.isTopSignal ? 'top' : signal.isSecondSignal ? 'second' : 'base'}>
      <button
        type="button"
        className={cn(
          'domain-signal-ring-button flex w-full items-start justify-between gap-4 rounded-[1.1rem] border px-4 py-3 text-left transition duration-200 ease-out focus:outline-none focus-visible:ring-2 focus-visible:ring-white/45 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0b1220]',
          signalState === 'selected'
            ? 'border-white/18 bg-white/[0.085] shadow-[0_14px_36px_rgba(4,10,24,0.22)]'
            : signalState === 'highlighted'
              ? 'border-[#b7cbff]/28 bg-[#8eb1ff]/[0.08] shadow-[0_10px_26px_rgba(10,20,42,0.2)]'
              : signal.isTopSignal
                ? 'border-white/16 bg-white/[0.07] shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] hover:border-white/24 hover:bg-white/[0.085]'
                : signal.isSecondSignal
                  ? 'border-[#8eb1ff]/20 bg-[#8eb1ff]/[0.06] shadow-[inset_0_1px_0_rgba(180,206,255,0.06)] hover:border-[#8eb1ff]/28 hover:bg-[#8eb1ff]/[0.08]'
                  : 'border-white/8 bg-white/[0.035] hover:border-white/14 hover:bg-white/[0.05]',
        )}
        aria-pressed={isSelected}
        aria-label={`${signal.signalLabel}, ${formatPercent(signal.withinDomainPercent)}${signal.isTopSignal ? ', top signal' : signal.isSecondSignal ? ', second signal' : ''}`}
        data-signal-state={signalState}
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
              domainSummary: null,
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
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span
              aria-hidden="true"
              className={cn(
                'h-8 w-1 rounded-full transition duration-200 ease-out',
                signal.isTopSignal
                  ? 'bg-white/80'
                  : signal.isSecondSignal
                    ? 'bg-[#b4cbff]/70'
                    : 'bg-white/18',
                signalState === 'selected'
                  ? 'opacity-100'
                  : signalState === 'highlighted'
                    ? 'opacity-85'
                    : signal.isTopSignal
                      ? 'opacity-90'
                      : signal.isSecondSignal
                        ? 'opacity-70'
                        : 'opacity-45',
              )}
            />
            <span
              className={cn(
                'text-[0.97rem] font-medium tracking-[-0.02em]',
                signalState === 'selected' || signalState === 'highlighted'
                  ? 'text-white'
                  : tone.labelClassName,
                signal.isTopSignal ? 'font-semibold' : signal.isSecondSignal ? 'font-medium' : null,
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
        <div className="text-right">
          <p
            className={cn(
              'text-[1rem] font-semibold tracking-[-0.02em]',
              signalState === 'selected' || signalState === 'highlighted' ? 'text-white' : tone.valueClassName,
            )}
          >
            {formatPercent(signal.withinDomainPercent)}
          </p>
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
      aria-label={`${domain.domainLabel} signal ring`}
      data-domain-key={domain.domainKey}
      data-selected-signal-key={selectedSignalKey ?? ''}
      data-active-signal-key={activeSignal?.signalKey ?? ''}
    >
      <style>{DOMAIN_SIGNAL_RING_CSS}</style>

      <div className="space-y-6">
        <div className="space-y-3">
          <div className="space-y-2">
            <h3 className="text-[1.2rem] font-semibold tracking-[-0.04em] text-white sm:text-[1.32rem]">{domain.domainLabel}</h3>
            {domain.domainSummary ? (
              <p className="max-w-[32rem] text-[0.92rem] leading-7 text-white/60 sm:text-[0.95rem]">{domain.domainSummary}</p>
            ) : null}
          </div>
        </div>

        <div className="grid gap-5 md:gap-6 lg:grid-cols-[minmax(0,16.5rem)_minmax(0,1fr)] lg:items-start">
          <div className="mx-auto flex w-full max-w-[16.5rem] flex-col items-center gap-3.5 sm:max-w-[17rem] md:max-w-[18rem] md:gap-4">
            <svg
              viewBox={`0 0 ${VIEWBOX_SIZE} ${VIEWBOX_SIZE}`}
              role="img"
              aria-label={`${domain.domainLabel} ring with ${signals.length} signals`}
              className="h-auto w-full max-w-[14.25rem] sm:max-w-[15rem] md:max-w-[15.5rem]"
            >
              <circle
                cx={VIEWBOX_CENTER}
                cy={VIEWBOX_CENTER}
                r={OUTER_RADIUS_MIN + OUTER_RADIUS_RANGE + 6}
                className="fill-[rgba(255,255,255,0.02)]"
              />
              <circle
                cx={VIEWBOX_CENTER}
                cy={VIEWBOX_CENTER}
                r={INNER_RADIUS - 8}
                className="fill-[rgba(7,12,22,0.94)] stroke-white/10"
                strokeWidth="1.5"
              />
              {signals.length > 0 ? (
                signals.map((signal, index) => {
                  const tone = getSignalTone(signal);
                  const signalState = getSignalState({
                    signalKey: signal.signalKey,
                    selectedSignalKey,
                    highlightedSignalKey,
                  });
                  const entryScale = getEntryScale(signal.displayStrength);
                  const idleScaleMultiplier = signal.isTopSignal ? 1.008 : signal.isSecondSignal ? 1.004 : 1;
                  const scaleMultiplier = signalState === 'selected'
                    ? 1.038
                    : signalState === 'highlighted'
                      ? 1.024
                      : idleScaleMultiplier;
                  const brightness = signalState === 'selected' ? 1.18 : signalState === 'highlighted' ? 1.08 : 1;
                  const opacityMultiplier = signalState === 'selected' ? 1 : signalState === 'highlighted' ? 1 : 0.96;

                  return (
                    <path
                      key={signal.signalKey}
                      d={buildSegmentPath({
                        signalCount: signals.length,
                        index,
                        displayStrength: signal.displayStrength,
                      })}
                      role="button"
                      tabIndex={0}
                      aria-label={`${signal.signalLabel}, ${formatPercent(signal.withinDomainPercent)}${signal.isTopSignal ? ', top signal' : signal.isSecondSignal ? ', second signal' : ''}`}
                      aria-pressed={selectedSignalKey === signal.signalKey}
                      className={cn(
                        'domain-signal-ring-segment cursor-pointer origin-center transition duration-200 ease-out focus:outline-none',
                        tone.segmentClassName,
                      )}
                      strokeWidth={tone.segmentStrokeWidth}
                      fillRule="evenodd"
                      opacity={Math.min(1, tone.segmentOpacity * opacityMultiplier)}
                      data-segment-index={index}
                      data-segment-key={signal.signalKey}
                      data-segment-emphasis={signal.isTopSignal ? 'top' : signal.isSecondSignal ? 'second' : 'base'}
                      data-segment-state={signalState}
                      style={{
                        transformBox: 'fill-box',
                        transformOrigin: `${VIEWBOX_CENTER}px ${VIEWBOX_CENTER}px`,
                        transform: `scale(${scaleMultiplier})`,
                        filter: signalState === 'selected'
                          ? 'drop-shadow(0 0 12px rgba(225,235,255,0.24)) brightness(1.18)'
                          : signalState === 'highlighted'
                            ? 'drop-shadow(0 0 9px rgba(157,186,255,0.18)) brightness(1.08)'
                            : `brightness(${brightness})`,
                        ['--ring-entry-scale' as string]: String(entryScale),
                        animation: 'domain-signal-ring-enter 440ms cubic-bezier(0.22, 1, 0.36, 1) both',
                        animationDelay: `${index * 45}ms`,
                      }}
                      onClick={() => {
                        setSelectedSignalKey((currentSignalKey) =>
                          selectDomainSignalRingSignal(domain, currentSignalKey, signal.signalKey));
                      }}
                      onFocus={() => setHighlightedSignalKey(signal.signalKey)}
                      onBlur={() => setHighlightedSignalKey((currentSignalKey) =>
                        currentSignalKey === signal.signalKey ? null : currentSignalKey)}
                      onMouseEnter={() => setHighlightedSignalKey(signal.signalKey)}
                      onMouseLeave={() => setHighlightedSignalKey((currentSignalKey) =>
                        currentSignalKey === signal.signalKey ? null : currentSignalKey)}
                      onKeyDown={(event) => {
                        const nextSelection = activateDomainSignalRingSignalByKeyboard({
                          domain,
                          currentSignalKey: selectedSignalKey,
                          requestedSignalKey: signal.signalKey,
                          key: event.key,
                        });

                        if (nextSelection !== selectedSignalKey) {
                          event.preventDefault();
                          setSelectedSignalKey(nextSelection);
                        } else if (event.key === 'Enter' || event.key === ' ' || event.key === 'Spacebar') {
                          event.preventDefault();
                        }
                      }}
                    />
                  );
                })
              ) : (
                <circle
                  cx={VIEWBOX_CENTER}
                  cy={VIEWBOX_CENTER}
                  r={(INNER_RADIUS + OUTER_RADIUS_MIN) / 2}
                  className="fill-transparent stroke-white/14"
                  strokeWidth="16"
                  strokeDasharray="8 8"
                />
              )}
              <g aria-hidden="true">
                <circle
                  cx={VIEWBOX_CENTER}
                  cy={VIEWBOX_CENTER}
                  r={INNER_RADIUS - 15}
                  className="fill-[rgba(11,18,31,0.96)] stroke-[rgba(255,255,255,0.08)]"
                  strokeWidth="1.5"
                />
                <text
                  x={VIEWBOX_CENTER}
                  y={VIEWBOX_CENTER + 7}
                  textAnchor="middle"
                  className="fill-white/85 text-[34px] font-semibold tracking-[-0.08em]"
                >
                  S
                </text>
              </g>
            </svg>

            <div
              className={cn(
                'w-full rounded-[1.1rem] border px-3.5 py-3 sm:px-4',
                activeSignal ? getSignalTone(activeSignal).detailAccentClassName : 'border-white/10 bg-white/[0.03]',
              )}
              aria-live="polite"
              data-active-detail-key={activeSignal?.signalKey ?? ''}
            >
              {activeSignal ? (
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2.5">
                    <div className="flex min-w-0 items-center gap-2">
                      <p className="truncate text-[0.93rem] font-semibold tracking-[-0.02em] text-white sm:text-[0.96rem]">{activeSignal.signalLabel}</p>
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
                    <p className="text-[0.96rem] font-semibold tracking-[-0.03em] text-white/88 sm:text-[1rem]">{formatPercent(activeSignal.withinDomainPercent)}</p>
                  </div>
                  <p className="text-[0.88rem] leading-6 text-white/64 sm:text-[0.9rem]">
                    {activeSignal.signalDescriptor
                      ? `${activeSignal.signalLabel} - ${activeSignal.signalDescriptor}`
                      : 'This signal is active in this area.'}
                  </p>
                </div>
              ) : (
                <p className="text-[0.82rem] leading-6 text-white/46">No signal reading is available for this area yet.</p>
              )}
            </div>
          </div>

          <div className="space-y-3">
            {signals.length > 0 ? (
              <ol className="space-y-3">
                {signals.map((signal, index) => {
                  const signalState = getSignalState({
                    signalKey: signal.signalKey,
                    selectedSignalKey,
                    highlightedSignalKey,
                  });

                  return (
                    <SignalLegendButton
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
        </div>
      </div>
    </section>
  );
}
