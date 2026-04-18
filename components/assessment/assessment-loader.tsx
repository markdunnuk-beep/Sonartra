'use client';

import { cn } from '@/components/shared/user-app-ui';
import { clampProgress, useAssessmentLoaderProgress } from '@/lib/assessment/loader-progress';

export type AssessmentLoaderProps = {
  title: string;
  subtitle?: string;
  variant?: 'initialising' | 'processing';
  progressMode?: 'simulated' | 'controlled';
  progressValue?: number;
  isComplete?: boolean;
  className?: string;
};

function AssessmentLoaderMark({
  variant,
}: {
  variant: NonNullable<AssessmentLoaderProps['variant']>;
}) {
  const accentClassName =
    variant === 'processing'
      ? 'bg-[rgba(236,241,255,0.92)] shadow-[0_0_0_1px_rgba(236,241,255,0.08),0_0_24px_rgba(236,241,255,0.16)]'
      : 'bg-[var(--sonartra-accent)] shadow-[0_0_0_1px_rgba(142,162,255,0.12),0_0_22px_rgba(142,162,255,0.18)]';

  return (
    <div
      aria-hidden="true"
      className="relative flex h-7 w-7 items-center justify-center"
    >
      <span className="absolute inset-0 rounded-full border border-white/8 bg-white/[0.02]" />
      <span className="absolute inset-[5px] rounded-full border border-white/10 bg-white/[0.03]" />
      <span
        className={cn(
          'absolute left-1/2 top-1/2 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full motion-safe:animate-[pulse_3.4s_ease-in-out_infinite]',
          accentClassName,
        )}
      />
    </div>
  );
}

export function AssessmentLoader({
  title,
  subtitle,
  variant = 'initialising',
  progressMode = 'simulated',
  progressValue,
  isComplete = false,
  className,
}: AssessmentLoaderProps) {
  const loaderProgress = useAssessmentLoaderProgress({
    variant,
    progressMode,
    isComplete,
  });
  const controlledWidth = clampProgress(progressValue ?? 0);
  const width = progressMode === 'controlled' ? controlledWidth : loaderProgress.progress;
  const ariaValueNow = progressMode === 'controlled' ? controlledWidth : undefined;
  const ariaValueText =
    progressMode === 'controlled'
      ? `${controlledWidth}%`
      : isComplete && width >= 100
        ? 'Complete'
        : 'In progress';

  return (
    <section
      role="status"
      aria-live="polite"
      aria-atomic="true"
      aria-busy="true"
      className={cn(
        'flex min-h-[calc(100dvh-4rem)] items-center justify-center px-5 py-10 sm:px-6 lg:px-8',
        className,
      )}
    >
      <div className="w-full max-w-[40rem]">
        <div className="sonartra-card sonartra-card-hero mx-auto flex w-full flex-col items-center justify-center gap-8 px-7 py-10 text-center sm:px-10 sm:py-12">
          <AssessmentLoaderMark variant={variant} />

          <div className="max-w-[34rem] space-y-2.5">
            <h1 className="text-[1.55rem] font-semibold leading-[1.08] tracking-[-0.03em] text-white sm:text-[1.85rem]">
              {title}
            </h1>
            {subtitle ? (
              <p className="mx-auto max-w-[30rem] text-sm leading-7 text-white/58 sm:text-[0.95rem]">
                {subtitle}
              </p>
            ) : null}
          </div>

          <div className="w-full max-w-[30rem] space-y-3">
            <div
              role="progressbar"
              aria-label={variant === 'processing' ? 'Result processing progress' : 'Assessment preparation progress'}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={ariaValueNow}
              aria-valuetext={ariaValueText}
              className="h-1 w-full overflow-hidden rounded-full bg-white/10"
            >
              <div
                className={cn(
                  'sonartra-motion-progress h-full rounded-full',
                  variant === 'processing'
                    ? 'bg-[linear-gradient(90deg,rgba(226,232,255,0.76),rgba(255,255,255,0.96))]'
                    : 'bg-[linear-gradient(90deg,rgba(142,162,255,0.64),rgba(236,241,255,0.94))]',
                )}
                style={{ width: `${width}%` }}
              />
            </div>
            <p className="sr-only">
              {subtitle ? `${title}. ${subtitle}.` : `${title}.`}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
