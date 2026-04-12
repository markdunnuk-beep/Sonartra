'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { useAdminAssessmentAuthoring } from '@/components/admin/admin-assessment-authoring-context';
import { SurfaceCard, cn } from '@/components/shared/user-app-ui';
import {
  getSingleDomainBuilderActiveStep,
  singleDomainBuilderSteps,
} from '@/lib/admin/single-domain-builder-steps';
import { getAssessmentBuilderStepPath } from '@/lib/admin/assessment-builder-paths';
import {
  getSingleDomainBuilderStepStatus,
  type SingleDomainBuilderStepStatus,
} from '@/lib/admin/single-domain-builder-stepper';

function StepIndicator({
  status,
  index,
  isActive,
}: Readonly<{
  status: SingleDomainBuilderStepStatus;
  index: number;
  isActive: boolean;
}>) {
  return (
    <span
      className={cn(
        'flex h-6 w-6 items-center justify-center rounded-full border text-[11px] font-medium',
        isActive
          ? 'border-[rgba(126,179,255,0.3)] bg-[rgba(126,179,255,0.16)] text-[rgba(228,234,255,0.96)]'
          : status === 'complete'
            ? 'border-[rgba(116,209,177,0.28)] bg-[rgba(116,209,177,0.16)] text-[rgba(214,246,233,0.92)]'
            : status === 'in_progress'
              ? 'border-[rgba(126,179,255,0.2)] bg-[rgba(126,179,255,0.08)] text-[rgba(214,232,255,0.82)]'
              : status === 'reference'
                ? 'border-[rgba(201,204,218,0.18)] bg-[rgba(201,204,218,0.08)] text-[rgba(232,235,245,0.86)]'
                : 'border-white/10 bg-white/[0.03] text-white/56',
      )}
    >
      {index + 1}
    </span>
  );
}

function StepStatusBadge({
  status,
}: Readonly<{
  status: SingleDomainBuilderStepStatus;
}>) {
  const label =
    status === 'complete'
      ? 'Complete'
      : status === 'in_progress'
        ? 'In progress'
        : status === 'reference'
          ? 'Reference'
          : 'Empty';

  return (
    <span
      className={cn(
        'rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em]',
        status === 'complete'
          ? 'border-[rgba(116,209,177,0.18)] bg-[rgba(116,209,177,0.08)] text-[rgba(214,246,233,0.84)]'
          : status === 'in_progress'
            ? 'border-[rgba(126,179,255,0.18)] bg-[rgba(126,179,255,0.08)] text-[rgba(214,232,255,0.82)]'
            : status === 'reference'
              ? 'border-[rgba(201,204,218,0.18)] bg-[rgba(201,204,218,0.08)] text-[rgba(232,235,245,0.82)]'
              : 'border-white/10 bg-white/[0.03] text-white/54',
      )}
    >
      {label}
    </span>
  );
}

export function SingleDomainBuilderStepper() {
  const assessment = useAdminAssessmentAuthoring();
  const pathname = usePathname();
  const activeStep = getSingleDomainBuilderActiveStep(pathname, assessment.assessmentKey);
  const activeIndex = Math.max(
    0,
    singleDomainBuilderSteps.findIndex((step) => step.key === activeStep),
  );
  const steps = singleDomainBuilderSteps.map((step) => ({
    ...step,
    href: getAssessmentBuilderStepPath(assessment.assessmentKey, step.slug, assessment.mode),
    status: getSingleDomainBuilderStepStatus(step.slug, assessment),
  }));
  const activeStepModel = steps[activeIndex] ?? steps[0];
  const completeCount = steps.filter((step) => step.status === 'complete').length;

  return (
    <SurfaceCard className="space-y-4 overflow-hidden p-3 sm:p-4 lg:p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <p className="sonartra-page-eyebrow">Single-domain builder progress</p>
          <p className="text-sm leading-6 text-white/58">
            Step {activeIndex + 1} of {steps.length}. Every stage stays viewable so readiness can
            be checked without contradictory blocked states.
          </p>
        </div>
        <p className="text-xs uppercase tracking-[0.18em] text-white/42">
          {completeCount} of {steps.length} completed
        </p>
      </div>

      <div className="sm:hidden">
        <div className="space-y-3 rounded-[1rem] border border-[rgba(126,179,255,0.16)] bg-[rgba(126,179,255,0.06)] p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-1">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[rgba(214,232,255,0.72)]">
                Current step
              </p>
              <p className="text-base font-semibold text-white">{activeStepModel.label}</p>
              <p className="text-sm leading-6 text-white/60">
                {completeCount} complete, {steps.length - completeCount} still to finish.
              </p>
            </div>
            <StepStatusBadge status={activeStepModel.status} />
          </div>

          <details className="group rounded-[0.95rem] border border-white/10 bg-black/10">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-sm font-medium text-white/86">
              <span>View all steps</span>
              <span className="text-xs uppercase tracking-[0.18em] text-white/46 transition group-open:rotate-45">
                +
              </span>
            </summary>
            <div className="space-y-2 border-t border-white/8 px-3 py-3">
              {steps.map((step, index) => {
                const isActive = step.key === activeStep;

                return (
                  <Link
                    aria-current={isActive ? 'page' : undefined}
                    className={cn(
                      'flex items-center justify-between gap-3 rounded-[0.9rem] border px-3 py-3 transition',
                      isActive
                        ? 'border-[rgba(126,179,255,0.24)] bg-[rgba(126,179,255,0.1)] text-white'
                        : step.status === 'complete'
                          ? 'border-[rgba(116,209,177,0.12)] bg-[rgba(116,209,177,0.04)] text-white/86'
                          : step.status === 'reference'
                            ? 'border-[rgba(201,204,218,0.14)] bg-[rgba(201,204,218,0.05)] text-white/76'
                            : step.status === 'in_progress'
                              ? 'border-[rgba(126,179,255,0.14)] bg-[rgba(126,179,255,0.05)] text-white/78'
                              : 'border-white/8 bg-black/10 text-white/66',
                    )}
                    href={step.href}
                    key={step.key}
                    prefetch={false}
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <StepIndicator index={index} isActive={isActive} status={step.status} />
                      <span className="min-w-0 text-sm font-medium">{step.label}</span>
                    </div>
                    <StepStatusBadge status={step.status} />
                  </Link>
                );
              })}
            </div>
          </details>
        </div>
      </div>

      <nav
        aria-label="Single-domain builder steps"
        className="hidden gap-2 overflow-x-auto pb-1 sonartra-scrollbar sm:flex sm:flex-wrap sm:overflow-visible"
      >
        {steps.map((step, index) => {
          const isActive = step.key === activeStep;

          return (
            <Link
              aria-current={isActive ? 'page' : undefined}
              className={cn(
                'sonartra-focus-ring flex min-w-[11rem] shrink-0 items-center gap-3 rounded-[0.95rem] border px-3 py-2.5 transition sm:min-w-0 sm:flex-1 lg:flex-none',
                isActive
                  ? 'border-[rgba(126,179,255,0.24)] bg-[rgba(126,179,255,0.1)] text-white'
                  : step.status === 'complete'
                    ? 'border-[rgba(116,209,177,0.12)] bg-[rgba(116,209,177,0.04)] text-white/86 hover:border-[rgba(116,209,177,0.2)] hover:bg-[rgba(116,209,177,0.06)]'
                    : step.status === 'reference'
                      ? 'border-[rgba(201,204,218,0.14)] bg-[rgba(201,204,218,0.05)] text-white/74 hover:border-[rgba(201,204,218,0.22)] hover:bg-[rgba(201,204,218,0.07)]'
                      : step.status === 'in_progress'
                        ? 'border-[rgba(126,179,255,0.14)] bg-[rgba(126,179,255,0.05)] text-white/72 hover:border-[rgba(126,179,255,0.22)] hover:bg-[rgba(126,179,255,0.07)]'
                        : 'border-white/8 bg-black/10 text-white/62 hover:border-white/14 hover:bg-white/[0.04] hover:text-white/84',
              )}
              href={step.href}
              key={step.key}
              prefetch={false}
            >
              <div className="flex min-w-0 items-center gap-3">
                <StepIndicator index={index} isActive={isActive} status={step.status} />
                <span className="block min-w-0 text-sm font-medium leading-5">{step.label}</span>
              </div>
              <StepStatusBadge status={step.status} />
            </Link>
          );
        })}
      </nav>
    </SurfaceCard>
  );
}
