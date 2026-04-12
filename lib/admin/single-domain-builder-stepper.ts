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

export type SingleDomainBuilderStepStatus =
  | 'complete'
  | 'in_progress'
  | 'empty'
  | 'waiting'
  | 'reference';

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
  | 'singleDomainLanguageValidation'
>;

export function getSingleDomainBuilderStepStatus(
  slug: SingleDomainBuilderStepSlug,
  assessment: SingleDomainBuilderStepperState,
  activeStep?: SingleDomainBuilderStepSlug,
): SingleDomainBuilderStepStatus {
  if (assessment.builderMode === 'published_no_draft') {
    return 'reference';
  }

  const isCurrentStep = activeStep === slug;
  const domainCount = assessment.authoredDomains.length;
  const signalCount = assessment.availableSignals.length;
  const questionCount = assessment.authoredQuestions.length;
  const optionCount = assessment.weightingSummary.totalOptions;
  const hasAnyMappings = assessment.weightingSummary.totalMappings > 0;
  const hasAnyLanguageRows = assessment.singleDomainLanguageValidation.datasets.some(
    (dataset) => dataset.actualRowCount > 0,
  );
  const allQuestionsHaveOptions =
    questionCount > 0 &&
    assessment.authoredQuestions.every((question) => question.options.length > 0);

  switch (slug) {
    case 'overview':
      return 'complete';
    case 'domain':
      return domainCount === 1 ? 'complete' : isCurrentStep || domainCount > 1 ? 'in_progress' : 'empty';
    case 'signals':
      if (signalCount > 0) {
        return 'complete';
      }
      if (isCurrentStep) {
        return 'in_progress';
      }
      return domainCount === 0 ? 'waiting' : 'empty';
    case 'questions':
      if (questionCount > 0) {
        return 'complete';
      }
      if (isCurrentStep) {
        return 'in_progress';
      }
      return signalCount === 0 ? 'waiting' : 'empty';
    case 'responses':
      if (allQuestionsHaveOptions) {
        return 'complete';
      }
      if (isCurrentStep) {
        return 'in_progress';
      }
      if (questionCount === 0) {
        return 'waiting';
      }
      return optionCount > 0 ? 'in_progress' : 'empty';
    case 'weightings':
      if (optionCount > 0 && signalCount > 0 && assessment.weightingSummary.unmappedOptions === 0) {
        return 'complete';
      }
      if (isCurrentStep) {
        return 'in_progress';
      }
      if (signalCount === 0 || optionCount === 0) {
        return 'waiting';
      }
      return hasAnyMappings ? 'in_progress' : 'empty';
    case 'language':
      if (assessment.stepCompletion.language === 'complete') {
        return 'complete';
      }
      if (isCurrentStep) {
        return 'in_progress';
      }
      if (signalCount === 0) {
        return 'waiting';
      }
      return hasAnyLanguageRows ? 'in_progress' : 'empty';
    case 'review':
      if (!assessment.latestDraftVersion) {
        return 'empty';
      }
      if (assessment.draftValidation.isPublishReady) {
        return 'complete';
      }
      if (isCurrentStep) {
        return 'in_progress';
      }
      return domainCount === 0 &&
        signalCount === 0 &&
        questionCount === 0 &&
        optionCount === 0 &&
        !hasAnyMappings &&
        !hasAnyLanguageRows
        ? 'waiting'
        : 'in_progress';
  }
}
