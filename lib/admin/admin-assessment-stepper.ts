import type { AdminAssessmentDetailViewModel } from '@/lib/server/admin-assessment-detail';

export const builderSteps = [
  { slug: 'overview', label: 'Overview' },
  { slug: 'assessment-intro', label: 'Assessment Intro' },
  { slug: 'domains', label: 'Domains' },
  { slug: 'signals', label: 'Signals' },
  { slug: 'questions', label: 'Questions' },
  { slug: 'responses', label: 'Responses' },
  { slug: 'weights', label: 'Weights' },
  { slug: 'language', label: 'Language' },
  { slug: 'review', label: 'Review' },
] as const;

export type BuilderStepSlug = (typeof builderSteps)[number]['slug'];
export type BuilderStepStatus = 'complete' | 'active' | 'incomplete' | 'neutral';

export type AdminAssessmentStepperState = Pick<
  AdminAssessmentDetailViewModel,
  | 'assessmentKey'
  | 'authoredDomains'
  | 'availableSignals'
  | 'authoredQuestions'
  | 'weightingSummary'
  | 'draftValidation'
  | 'stepCompletion'
>;

export function getActiveStepSlug(pathname: string, assessmentKey: string): BuilderStepSlug {
  const basePath = `/admin/assessments/${assessmentKey}/`;
  const slug = pathname.startsWith(basePath) ? pathname.slice(basePath.length).split('/')[0] : '';

  switch (slug) {
    case 'overview':
    case 'assessment-intro':
    case 'domains':
    case 'signals':
    case 'questions':
    case 'responses':
    case 'weights':
    case 'language':
    case 'review':
      return slug;
    default:
      return 'overview';
  }
}

export function getStepStatus(
  slug: BuilderStepSlug,
  activeSlug: BuilderStepSlug,
  assessment: AdminAssessmentStepperState,
): BuilderStepStatus {
  if (slug === activeSlug) {
    return 'active';
  }

  switch (slug) {
    case 'overview':
      return 'complete';
    case 'assessment-intro':
      return assessment.stepCompletion.assessmentIntro;
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
    case 'language':
      return assessment.stepCompletion.language;
    case 'review':
      return assessment.draftValidation.isPublishReady ? 'complete' : 'incomplete';
  }
}
