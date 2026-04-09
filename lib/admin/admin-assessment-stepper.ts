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
export type BuilderStepStatus =
  | 'complete'
  | 'in_progress'
  | 'empty'
  | 'blocked'
  | 'unavailable'
  | 'reference';

export type AdminAssessmentStepperState = Pick<
  AdminAssessmentDetailViewModel,
  | 'assessmentKey'
  | 'builderMode'
  | 'authoredDomains'
  | 'questionDomains'
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
  _activeSlug: BuilderStepSlug,
  assessment: AdminAssessmentStepperState,
): BuilderStepStatus {
  if (assessment.builderMode === 'published_no_draft') {
    return 'reference';
  }

  const totalOptions = assessment.authoredQuestions.reduce(
    (sum, question) => sum + question.options.length,
    0,
  );
  const allQuestionsHaveOptions =
    assessment.authoredQuestions.length > 0 &&
    assessment.authoredQuestions.every((question) => question.options.length > 0);

  switch (slug) {
    case 'overview':
      return 'complete';
    case 'assessment-intro':
      return assessment.stepCompletion.assessmentIntro === 'complete'
        ? 'complete'
        : assessment.stepCompletion.assessmentIntro === 'neutral'
          ? 'unavailable'
          : 'empty';
    case 'domains':
      return assessment.authoredDomains.length > 0 ? 'complete' : 'empty';
    case 'signals':
      return assessment.authoredDomains.length === 0
        ? 'blocked'
        : assessment.availableSignals.length > 0
          ? 'complete'
          : 'empty';
    case 'questions':
      return assessment.questionDomains.length === 0
        ? 'blocked'
        : assessment.authoredQuestions.length > 0
          ? 'complete'
          : 'empty';
    case 'responses':
      return assessment.authoredQuestions.length === 0
        ? 'blocked'
        : totalOptions === 0
          ? 'empty'
          : allQuestionsHaveOptions
            ? 'complete'
            : 'in_progress';
    case 'weights':
      return assessment.authoredQuestions.length === 0 || totalOptions === 0 || assessment.availableSignals.length === 0
        ? 'blocked'
        : assessment.weightingSummary.totalMappings === 0
          ? 'empty'
          : assessment.weightingSummary.unmappedOptions > 0
            ? 'in_progress'
            : 'complete';
    case 'language':
      return assessment.stepCompletion.language === 'complete'
        ? 'complete'
        : assessment.stepCompletion.language === 'neutral'
          ? 'unavailable'
          : 'empty';
    case 'review':
      return assessment.draftValidation.status === 'missing_assessment' ||
        assessment.draftValidation.status === 'no_draft'
        ? 'unavailable'
        : assessment.draftValidation.isPublishReady
          ? 'complete'
          : assessment.draftValidation.blockingErrors.length > 0
            ? 'blocked'
            : 'in_progress';
  }
}
