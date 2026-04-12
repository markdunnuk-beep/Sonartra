import type { AdminAssessmentDetailViewModel } from '@/lib/server/admin-assessment-detail';

export type SingleDomainBuilderStepSlug =
  | 'overview'
  | 'domain'
  | 'signals'
  | 'questions'
  | 'responses'
  | 'weightings'
  | 'language'
  | 'review';

export type SingleDomainBuilderStepStatus = 'complete' | 'in_progress' | 'empty' | 'reference';

export type SingleDomainBuilderStepperState = Pick<
  AdminAssessmentDetailViewModel,
  | 'builderMode'
  | 'latestDraftVersion'
  | 'authoredDomains'
  | 'availableSignals'
  | 'authoredQuestions'
  | 'weightingSummary'
  | 'draftValidation'
  | 'stepCompletion'
>;

export function getSingleDomainBuilderStepStatus(
  slug: SingleDomainBuilderStepSlug,
  assessment: SingleDomainBuilderStepperState,
): SingleDomainBuilderStepStatus {
  if (assessment.builderMode === 'published_no_draft') {
    return 'reference';
  }

  const domainCount = assessment.authoredDomains.length;
  const signalCount = assessment.availableSignals.length;
  const questionCount = assessment.authoredQuestions.length;
  const optionCount = assessment.weightingSummary.totalOptions;
  const allQuestionsHaveOptions =
    questionCount > 0 &&
    assessment.authoredQuestions.every((question) => question.options.length > 0);

  switch (slug) {
    case 'overview':
      return 'complete';
    case 'domain':
      return domainCount === 1 ? 'complete' : domainCount > 1 ? 'in_progress' : 'empty';
    case 'signals':
      return signalCount > 0 ? 'complete' : domainCount > 1 ? 'in_progress' : 'empty';
    case 'questions':
      return questionCount > 0 ? 'complete' : signalCount > 0 ? 'in_progress' : 'empty';
    case 'responses':
      return allQuestionsHaveOptions
        ? 'complete'
        : optionCount > 0 || questionCount > 0
          ? 'in_progress'
          : 'empty';
    case 'weightings':
      return optionCount > 0 && signalCount > 0 && assessment.weightingSummary.unmappedOptions === 0
        ? 'complete'
        : assessment.weightingSummary.totalMappings > 0
          || optionCount > 0
          || signalCount > 0
          ? 'in_progress'
          : 'empty';
    case 'language':
      return assessment.stepCompletion.language === 'complete'
        ? 'complete'
        : assessment.latestDraftVersion
          ? 'in_progress'
          : 'empty';
    case 'review':
      return !assessment.latestDraftVersion
        ? 'empty'
        : assessment.draftValidation.isPublishReady
          ? 'complete'
          : 'in_progress';
  }
}
