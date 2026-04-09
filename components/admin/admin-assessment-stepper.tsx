'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import {
  builderSteps,
  getActiveStepSlug,
  getStepStatus,
  type BuilderStepStatus,
} from '@/lib/admin/admin-assessment-stepper';
import { useAdminAssessmentAuthoring } from '@/components/admin/admin-assessment-authoring-context';
import { SurfaceCard, cn } from '@/components/shared/user-app-ui';

function StepIndicator({
  status,
  index,
  isActive,
}: Readonly<{
  status: BuilderStepStatus;
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
                : status === 'unavailable'
                  ? 'border-white/8 bg-white/[0.02] text-white/44'
                  : status === 'reference'
                    ? 'border-white/10 bg-white/[0.02] text-white/52'
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
  status: BuilderStepStatus;
}>) {
  const label =
    status === 'complete'
      ? 'Complete'
      : status === 'in_progress'
        ? 'In progress'
        : status === 'blocked'
          ? 'Blocked'
          : status === 'unavailable'
            ? 'Unavailable'
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
            : status === 'blocked'
              ? 'border-[rgba(255,184,107,0.18)] bg-[rgba(255,184,107,0.08)] text-[rgba(255,227,187,0.88)]'
              : status === 'unavailable'
                ? 'border-white/8 bg-white/[0.03] text-white/46'
                : status === 'reference'
                  ? 'border-white/10 bg-black/10 text-white/48'
                  : 'border-white/10 bg-white/[0.03] text-white/54',
      )}
    >
      {label}
    </span>
  );
}

export function AdminAssessmentStepper() {
  const assessment = useAdminAssessmentAuthoring();
  const pathname = usePathname();
  const activeSlug = getActiveStepSlug(pathname, assessment.assessmentKey);
  const steps = builderSteps.map((step) => ({
    ...step,
    href: `/admin/assessments/${assessment.assessmentKey}/${step.slug}`,
    status: getStepStatus(step.slug, activeSlug, assessment),
  }));
  const completedCount = steps.filter((step) => step.status === 'complete').length;
  const activeIndex = Math.max(0, steps.findIndex((step) => step.slug === activeSlug));
  const isReferenceMode = assessment.builderMode === 'published_no_draft';

  return (
    <SurfaceCard className="space-y-4 overflow-hidden p-3 sm:p-4 lg:p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <p className="sonartra-page-eyebrow">
            {isReferenceMode ? 'Published version reference' : 'Builder progress'}
          </p>
          <p className="text-sm leading-6 text-white/58">
            {isReferenceMode
              ? 'Browse each stage in read-only mode. Create a draft to continue authoring.'
              : `Step ${activeIndex + 1} of ${steps.length}`}
          </p>
        </div>
        {!isReferenceMode ? (
          <p className="text-xs uppercase tracking-[0.18em] text-white/42">
            {completedCount} of {steps.length} completed
          </p>
        ) : null}
      </div>

      <nav
        aria-label="Assessment builder steps"
        className="-mx-3 flex gap-2 overflow-x-auto px-3 pb-1 sonartra-scrollbar sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0"
      >
        {steps.map((step, index) => {
          const isActive = step.slug === activeSlug;

          return (
            <Link
              aria-current={isActive ? 'page' : undefined}
              className={cn(
                'sonartra-focus-ring flex min-w-[11rem] shrink-0 items-center gap-3 rounded-[0.95rem] border px-3 py-2.5 transition sm:min-w-0 sm:flex-1 lg:flex-none',
                isActive
                  ? 'border-[rgba(126,179,255,0.24)] bg-[rgba(126,179,255,0.1)] text-white'
                  : step.status === 'reference'
                    ? 'border-white/8 bg-black/10 text-white/58 hover:border-white/12 hover:bg-white/[0.03] hover:text-white/78'
                  : step.status === 'complete'
                    ? 'border-[rgba(116,209,177,0.12)] bg-[rgba(116,209,177,0.04)] text-white/86 hover:border-[rgba(116,209,177,0.2)] hover:bg-[rgba(116,209,177,0.06)]'
                    : step.status === 'blocked'
                      ? 'border-[rgba(255,184,107,0.14)] bg-[rgba(255,184,107,0.04)] text-white/72 hover:border-[rgba(255,184,107,0.22)] hover:bg-[rgba(255,184,107,0.06)]'
                      : step.status === 'in_progress'
                        ? 'border-[rgba(126,179,255,0.14)] bg-[rgba(126,179,255,0.05)] text-white/72 hover:border-[rgba(126,179,255,0.22)] hover:bg-[rgba(126,179,255,0.07)]'
                        : step.status === 'unavailable'
                          ? 'border-white/6 bg-black/10 text-white/46 hover:border-white/10 hover:bg-white/[0.03] hover:text-white/58'
                          : 'border-white/8 bg-black/10 text-white/62 hover:border-white/14 hover:bg-white/[0.04] hover:text-white/84',
              )}
              href={step.href}
              key={step.slug}
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
