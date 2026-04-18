'use client';

import { useId } from 'react';

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
      ? 'bg-[rgba(236,241,255,0.9)] shadow-[0_0_0_1px_rgba(236,241,255,0.08)]'
      : 'bg-[rgba(170,184,255,0.94)] shadow-[0_0_0_1px_rgba(142,162,255,0.16)]';
  const haloClassName =
    variant === 'processing'
      ? 'border-white/[0.09] bg-white/[0.02]'
      : 'border-[rgba(142,162,255,0.16)] bg-[rgba(142,162,255,0.05)]';

  return (
    <div aria-hidden="true" className="relative flex h-8 w-[5.25rem] items-center justify-center">
      <span className="absolute left-0 top-1/2 h-px w-[1.7rem] -translate-y-1/2 bg-[linear-gradient(90deg,rgba(207,218,243,0.04),rgba(207,218,243,0.28))]" />
      <span className="absolute right-0 top-1/2 h-px w-[1.7rem] -translate-y-1/2 bg-[linear-gradient(90deg,rgba(207,218,243,0.28),rgba(207,218,243,0.04))]" />
      <span
        className={cn(
          'absolute left-1/2 top-1/2 h-7 w-7 -translate-x-1/2 -translate-y-1/2 rounded-full border',
          haloClassName,
        )}
      />
      <span
        className={cn(
          'absolute left-1/2 top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border motion-safe:animate-[pulse_4.8s_ease-in-out_infinite]',
          haloClassName,
        )}
      />
      <span
        className={cn(
          'absolute left-1/2 top-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full',
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
  const titleId = useId();
  const descriptionId = useId();
  const controlledWidth = clampProgress(progressValue ?? 0);
  const width = progressMode === 'controlled' ? controlledWidth : loaderProgress.progress;
  const announceProgress = progressMode === 'controlled';
  const ariaValueNow = announceProgress ? controlledWidth : undefined;
  const ariaValueText =
    announceProgress
      ? `${controlledWidth}%`
      : isComplete && width >= 100
        ? 'Complete'
        : 'In progress';

  return (
    <section
      role="status"
      aria-live="polite"
      aria-atomic="true"
      aria-busy={!isComplete}
      aria-labelledby={titleId}
      aria-describedby={descriptionId}
      className={cn(
        'sonartra-motion-reveal flex min-h-[calc(100dvh-4rem)] items-center justify-center px-5 py-10 sm:px-6 lg:px-8',
        className,
      )}
    >
      <div className="w-full max-w-[44rem]">
        <div className="border-white/7 relative mx-auto overflow-hidden rounded-[2rem] border bg-[radial-gradient(circle_at_top,rgba(145,168,214,0.11),transparent_30%),radial-gradient(circle_at_top_left,rgba(142,162,255,0.08),transparent_38%),linear-gradient(180deg,rgba(255,255,255,0.03),rgba(255,255,255,0.012))] px-7 py-10 text-center shadow-[0_22px_62px_rgba(0,0,0,0.2)] sm:px-10 sm:py-12 md:px-12 md:py-14">
          <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.02),transparent_22%,transparent_78%,rgba(255,255,255,0.012))]" />
          <div className="relative mx-auto flex w-full max-w-[36rem] flex-col items-center justify-center gap-0">
            <AssessmentLoaderMark variant={variant} />

            <div className="mt-8 max-w-[34rem] space-y-2">
              <h1
                id={titleId}
                className="text-[1.95rem] font-semibold leading-[1.02] tracking-[-0.045em] text-white sm:text-[2.25rem]"
              >
                {title}
              </h1>
              {subtitle ? (
                <p className="mx-auto max-w-[31rem] text-[0.96rem] leading-7 text-white/60">
                  {subtitle}
                </p>
              ) : null}
            </div>

            <div className="mt-8 w-full max-w-[31rem] space-y-3">
              <div
                {...(announceProgress
                  ? {
                      role: 'progressbar',
                      'aria-label':
                        variant === 'processing'
                          ? 'Result processing progress'
                          : 'Assessment preparation progress',
                      'aria-valuemin': 0,
                      'aria-valuemax': 100,
                      'aria-valuenow': ariaValueNow,
                      'aria-valuetext': ariaValueText,
                    }
                  : { 'aria-hidden': true })}
                className="h-1 w-full overflow-hidden rounded-full bg-white/[0.085]"
              >
                <div
                  className={cn(
                    'sonartra-motion-progress h-full rounded-full',
                    variant === 'processing'
                      ? 'bg-[linear-gradient(90deg,rgba(208,218,243,0.72),rgba(241,245,255,0.94))]'
                      : 'bg-[linear-gradient(90deg,rgba(132,150,240,0.68),rgba(224,232,255,0.9))]',
                  )}
                  style={{ width: `${width}%` }}
                />
              </div>
              <p id={descriptionId} className="sr-only">
                {subtitle ? `${title}. ${subtitle}. ${ariaValueText}.` : `${title}. ${ariaValueText}.`}
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
