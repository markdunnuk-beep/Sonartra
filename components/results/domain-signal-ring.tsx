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
} {
  if (signal.isTopSignal) {
    return {
      segmentClassName: 'fill-[rgba(238,245,255,0.92)] stroke-[rgba(238,245,255,0.96)]',
      markerLabel: 'Top',
      markerClassName: 'border-white/25 bg-white/12 text-white',
      segmentOpacity: 1,
    };
  }

  if (signal.isSecondSignal) {
    return {
      segmentClassName: 'fill-[rgba(166,193,255,0.68)] stroke-[rgba(198,216,255,0.86)]',
      markerLabel: '2nd',
      markerClassName: 'border-[#8eb1ff]/35 bg-[#8eb1ff]/10 text-[#d9e5ff]',
      segmentOpacity: 0.92,
    };
  }

  return {
    segmentClassName: 'fill-[rgba(126,150,196,0.32)] stroke-[rgba(151,174,221,0.52)]',
    markerLabel: null,
    markerClassName: 'border-white/10 bg-white/5 text-white/58',
    segmentOpacity: 0.78,
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

function SignalLegend({
  signal,
  index,
}: Readonly<{
  signal: DomainSignalRingViewModel['signals'][number];
  index: number;
}>) {
  const tone = getSignalTone(signal);

  return (
    <li
      className={cn(
        'flex items-start justify-between gap-4 rounded-[1.1rem] border px-4 py-3',
        signal.isTopSignal
          ? 'border-white/18 bg-white/[0.075]'
          : signal.isSecondSignal
            ? 'border-[#8eb1ff]/20 bg-[#8eb1ff]/[0.06]'
            : 'border-white/8 bg-white/[0.035]',
      )}
      data-signal-index={index}
      data-signal-emphasis={signal.isTopSignal ? 'top' : signal.isSecondSignal ? 'second' : 'base'}
      data-signal-key={signal.signalKey}
    >
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <span className="text-[0.97rem] font-medium tracking-[-0.02em] text-white/88">{signal.signalLabel}</span>
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
        <p className="text-[0.82rem] leading-6 text-white/48">
          Authored position {index + 1}
          {signal.rankWithinDomain ? `, rank ${signal.rankWithinDomain}` : ''}
        </p>
      </div>
      <div className="text-right">
        <p className="text-[1rem] font-semibold tracking-[-0.02em] text-white/86">{formatPercent(signal.scorePercent)}</p>
        <p className="text-[0.75rem] uppercase tracking-[0.18em] text-white/38">Strength</p>
      </div>
    </li>
  );
}

export function DomainSignalRing({
  domain,
  className,
}: Readonly<{
  domain: DomainSignalRingViewModel;
  className?: string;
}>) {
  const signals = domain.signals;

  return (
    <section
      className={cn(
        'overflow-hidden rounded-[1.6rem] border border-white/10 bg-[linear-gradient(180deg,rgba(15,24,40,0.78),rgba(8,13,24,0.94))] p-6 shadow-[0_24px_80px_rgba(3,8,20,0.32)] sm:p-7',
        className,
      )}
      aria-label={`${domain.domainLabel} signal ring`}
      data-domain-key={domain.domainKey}
    >
      <div className="space-y-6">
        <div className="space-y-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-white/40">Domain Ring</p>
          <div className="space-y-2">
            <h3 className="text-[1.42rem] font-semibold tracking-[-0.04em] text-white">{domain.domainLabel}</h3>
            {domain.domainSummary ? (
              <p className="max-w-[34rem] text-[0.95rem] leading-7 text-white/60">{domain.domainSummary}</p>
            ) : null}
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,18rem)_minmax(0,1fr)] lg:items-start">
          <div className="mx-auto flex w-full max-w-[18rem] flex-col items-center gap-4">
            <svg
              viewBox={`0 0 ${VIEWBOX_SIZE} ${VIEWBOX_SIZE}`}
              role="img"
              aria-label={`${domain.domainLabel} ring with ${signals.length} signals`}
              className="h-auto w-full max-w-[15.5rem]"
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

                  return (
                    <path
                      key={signal.signalKey}
                      d={buildSegmentPath({
                        signalCount: signals.length,
                        index,
                        displayStrength: signal.displayStrength,
                      })}
                      className={tone.segmentClassName}
                      strokeWidth="1.5"
                      fillRule="evenodd"
                      opacity={tone.segmentOpacity}
                      data-segment-index={index}
                      data-segment-key={signal.signalKey}
                      data-segment-emphasis={signal.isTopSignal ? 'top' : signal.isSecondSignal ? 'second' : 'base'}
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

            <p className="text-center text-[0.78rem] leading-6 text-white/42">
              Equal-angle segments preserve authored order. Radial depth indicates relative signal strength.
            </p>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/36">Signals</p>
              <p className="text-[0.78rem] text-white/40">{domain.signalCount} total</p>
            </div>

            {signals.length > 0 ? (
              <ol className="space-y-3">
                {signals.map((signal, index) => (
                  <SignalLegend key={signal.signalKey} signal={signal} index={index} />
                ))}
              </ol>
            ) : (
              <div className="rounded-[1.1rem] border border-dashed border-white/10 bg-white/[0.03] px-4 py-5 text-[0.92rem] leading-7 text-white/48">
                No persisted signals are available for this domain yet.
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
