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

type StepStatus = 'complete' | 'in_progress' | 'empty' | 'blocked';

function getStepStatus(
  slug: (typeof singleDomainBuilderSteps)[number]['slug'],
  assessment: ReturnType<typeof useAdminAssessmentAuthoring>,
): StepStatus {
  const domainCount = assessment.authoredDomains.length;
  const signalCount = assessment.availableSignals.length;
  const questionCount = assessment.authoredQuestions.length;
  const optionCount = assessment.weightingSummary.totalOptions;
  const mappingCount = assessment.weightingSummary.totalMappings;

  switch (slug) {
    case 'overview':
      return 'complete';
    case 'domain':
      return domainCount === 1 ? 'complete' : domainCount > 1 ? 'blocked' : 'empty';
    case 'signals':
      return domainCount !== 1 ? 'blocked' : signalCount > 0 ? 'complete' : 'empty';
    case 'questions':
      return signalCount === 0 ? 'blocked' : questionCount > 0 ? 'complete' : 'empty';
    case 'responses':
      return questionCount === 0
        ? 'blocked'
        : optionCount > 0
          ? 'complete'
          : 'in_progress';
    case 'weightings':
      return optionCount === 0 || signalCount === 0
        ? 'blocked'
        : mappingCount > 0
          ? 'complete'
          : 'in_progress';
    case 'language':
      return assessment.stepCompletion.language === 'complete'
        ? 'complete'
        : assessment.latestDraftVersion
          ? 'in_progress'
          : 'blocked';
    case 'review':
      return assessment.draftValidation.isPublishReady
        ? 'complete'
        : assessment.draftValidation.blockingErrors.length > 0
          ? 'blocked'
          : 'in_progress';
  }
}

function StepIndicator({
  status,
  index,
  isActive,
}: Readonly<{
  status: StepStatus;
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
              : status === 'blocked'
                ? 'border-[rgba(255,184,107,0.2)] bg-[rgba(255,184,107,0.08)] text-[rgba(255,227,187,0.9)]'
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
  status: StepStatus;
}>) {
  const label =
    status === 'complete'
      ? 'Complete'
      : status === 'in_progress'
        ? 'In progress'
        : status === 'blocked'
          ? 'Blocked'
          : 'Empty';

  return (
    <span
      className={cn(
        'rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em]',
        status === 'complete'
          ? 'border-[rgba(116,209,177,0.18)] bg-[rgba(116,209,177,0.08)] text-[rgba(214,246,233,0.84)]'
          : status === 'in_progress'
            ? 'border-[rgba(126,179,255,0.18)] bg-[rgba(126,179,255,0.08)] text-[rgba(214,232,255,0.82)]'
            : status === 'blocked'
              ? 'border-[rgba(255,184,107,0.18)] bg-[rgba(255,184,107,0.08)] text-[rgba(255,227,187,0.88)]'
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
    status: getStepStatus(step.slug, assessment),
  }));

  return (
    <SurfaceCard className="space-y-4 overflow-hidden p-3 sm:p-4 lg:p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <p className="sonartra-page-eyebrow">Single-domain builder progress</p>
          <p className="text-sm leading-6 text-white/58">
            Step {activeIndex + 1} of {steps.length}. One domain only, variable signals, and full
            assessment authoring follow the same draft.
          </p>
        </div>
        <p className="text-xs uppercase tracking-[0.18em] text-white/42">
          {steps.filter((step) => step.status === 'complete').length} of {steps.length} completed
        </p>
      </div>

      <nav
        aria-label="Single-domain builder steps"
        className="-mx-3 flex gap-2 overflow-x-auto px-3 pb-1 sonartra-scrollbar sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0"
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
                    : step.status === 'blocked'
                      ? 'border-[rgba(255,184,107,0.14)] bg-[rgba(255,184,107,0.04)] text-white/72 hover:border-[rgba(255,184,107,0.22)] hover:bg-[rgba(255,184,107,0.06)]'
                      : step.status === 'in_progress'
                        ? 'border-[rgba(126,179,255,0.14)] bg-[rgba(126,179,255,0.05)] text-white/72 hover:border-[rgba(126,179,255,0.22)] hover:bg-[rgba(126,179,255,0.07)]'
                        : 'border-white/8 bg-black/10 text-white/62 hover:border-white/14 hover:bg-white/[0.04] hover:text-white/84',
              )}
              href={step.href}
              key={step.key}
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
