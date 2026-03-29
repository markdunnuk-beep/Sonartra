'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { useAdminAssessmentAuthoring } from '@/components/admin/admin-assessment-authoring-context';
import { SurfaceCard, cn } from '@/components/shared/user-app-ui';

const builderSteps = [
  { slug: 'overview', label: 'Overview' },
  { slug: 'domains', label: 'Domains' },
  { slug: 'signals', label: 'Signals' },
  { slug: 'questions', label: 'Questions' },
  { slug: 'responses', label: 'Responses' },
  { slug: 'weights', label: 'Weights' },
  { slug: 'review', label: 'Review' },
] as const;

type BuilderStepStatus = 'complete' | 'active' | 'incomplete';

function getActiveStepSlug(pathname: string, assessmentKey: string): (typeof builderSteps)[number]['slug'] {
  const basePath = `/admin/assessments/${assessmentKey}/`;
  const slug = pathname.startsWith(basePath)
    ? pathname.slice(basePath.length).split('/')[0]
    : '';

  switch (slug) {
    case 'overview':
    case 'domains':
    case 'signals':
    case 'questions':
    case 'responses':
    case 'weights':
    case 'review':
      return slug;
    default:
      return 'overview';
  }
}

function getStepStatus(
  slug: (typeof builderSteps)[number]['slug'],
  activeSlug: (typeof builderSteps)[number]['slug'],
  assessment: ReturnType<typeof useAdminAssessmentAuthoring>,
): BuilderStepStatus {
  if (slug === activeSlug) {
    return 'active';
  }

  switch (slug) {
    case 'overview':
      return 'complete';
    case 'domains':
      return assessment.authoredDomains.length > 0 ? 'complete' : 'incomplete';
    case 'signals':
      return assessment.availableSignals.length > 0 ? 'complete' : 'incomplete';
    case 'questions':
      return assessment.authoredQuestions.length > 0 ? 'complete' : 'incomplete';
    case 'responses':
      return assessment.authoredQuestions.length > 0 &&
        assessment.authoredQuestions.every((question) => question.options.length > 0)
        ? 'complete'
        : 'incomplete';
    case 'weights':
      return assessment.weightingSummary.totalMappings > 0 ? 'complete' : 'incomplete';
    case 'review':
      return assessment.draftValidation.isPublishReady ? 'complete' : 'incomplete';
  }
}

function StepIndicator({
  status,
  index,
}: Readonly<{
  status: BuilderStepStatus;
  index: number;
}>) {
  if (status === 'complete') {
    return (
      <span className="flex h-6 w-6 items-center justify-center rounded-full border border-[rgba(116,209,177,0.28)] bg-[rgba(116,209,177,0.16)] text-[rgba(214,246,233,0.92)]">
        <svg aria-hidden="true" className="h-3.5 w-3.5" fill="none" viewBox="0 0 16 16">
          <path
            d="M3.5 8.5 6.5 11.5 12.5 5.5"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="1.8"
          />
        </svg>
      </span>
    );
  }

  if (status === 'active') {
    return (
      <span className="flex h-6 w-6 items-center justify-center rounded-full border border-[rgba(126,179,255,0.3)] bg-[rgba(126,179,255,0.16)] text-[rgba(228,234,255,0.96)]">
        <span className="h-2.5 w-2.5 rounded-full bg-current" />
      </span>
    );
  }

  return (
    <span className="flex h-6 w-6 items-center justify-center rounded-full border border-white/10 bg-white/[0.03] text-[11px] font-medium text-white/44">
      {index + 1}
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
  const activeIndex = Math.max(
    0,
    steps.findIndex((step) => step.status === 'active'),
  );

  return (
    <SurfaceCard className="space-y-4 p-4 lg:p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-1">
          <p className="sonartra-page-eyebrow">Builder progress</p>
          <p className="text-sm leading-6 text-white/58">
            Step {activeIndex + 1} of {steps.length}
          </p>
        </div>
        <p className="text-xs uppercase tracking-[0.18em] text-white/42">
          {completedCount} of {steps.length} completed
        </p>
      </div>

      <nav aria-label="Assessment builder steps" className="flex flex-wrap gap-2">
        {steps.map((step, index) => {
          const isActive = step.status === 'active';

          return (
            <Link
              aria-current={isActive ? 'page' : undefined}
              className={cn(
                'sonartra-focus-ring flex min-w-[128px] items-center gap-3 rounded-[0.95rem] border px-3 py-2.5 transition',
                isActive
                  ? 'border-[rgba(126,179,255,0.24)] bg-[rgba(126,179,255,0.1)] text-white'
                  : step.status === 'complete'
                    ? 'border-[rgba(116,209,177,0.12)] bg-[rgba(116,209,177,0.04)] text-white/86 hover:border-[rgba(116,209,177,0.2)] hover:bg-[rgba(116,209,177,0.06)]'
                    : 'border-white/8 bg-black/10 text-white/62 hover:border-white/14 hover:bg-white/[0.04] hover:text-white/84',
              )}
              href={step.href}
              key={step.slug}
            >
              <StepIndicator index={index} status={step.status} />
              <span className="block text-sm font-medium">{step.label}</span>
            </Link>
          );
        })}
      </nav>
    </SurfaceCard>
  );
}
