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

export type SingleDomainBuilderNextAction = {
  step: Exclude<SingleDomainBuilderStepSlug, 'overview'>;
  title: string;
  description: string;
  ctaLabel: string;
};

function hasMeaningfulSingleDomainDraftData(assessment: SingleDomainBuilderStepperState): boolean {
  return assessment.authoredDomains.length > 0 ||
    assessment.availableSignals.length > 0 ||
    assessment.authoredQuestions.length > 0 ||
    assessment.weightingSummary.totalOptions > 0 ||
    assessment.weightingSummary.totalMappings > 0 ||
    assessment.singleDomainLanguageValidation.datasets.some((dataset) => dataset.actualRowCount > 0);
}

export function getSingleDomainBuilderProgress(assessment: SingleDomainBuilderStepperState): {
  completeCount: number;
  actionableCompleteCount: number;
  actionableTotalCount: number;
} {
  const steps = ([
    'overview',
    'domain',
    'signals',
    'questions',
    'responses',
    'weightings',
    'language',
    'review',
  ] as const).map((slug) => getSingleDomainBuilderStepStatus(slug, assessment));
  const completeCount = steps.filter((status) => status === 'complete').length;
  const actionableStatuses = steps.filter((status) => status !== 'reference');

  return {
    completeCount,
    actionableCompleteCount: actionableStatuses.filter((status) => status === 'complete').length,
    actionableTotalCount: actionableStatuses.length,
  };
}

export function getSingleDomainBuilderNextAction(
  assessment: SingleDomainBuilderStepperState,
): SingleDomainBuilderNextAction {
  const domainCount = assessment.authoredDomains.length;
  const signalCount = assessment.availableSignals.length;
  const questionCount = assessment.authoredQuestions.length;
  const optionCount = assessment.weightingSummary.totalOptions;
  const mappingCount = assessment.weightingSummary.totalMappings;
  const expectedPairCount = assessment.singleDomainLanguageValidation.expectedPairCount;
  const hasAnyLanguageRows = assessment.singleDomainLanguageValidation.datasets.some(
    (dataset) => dataset.actualRowCount > 0,
  );

  if (domainCount === 0) {
    return {
      step: 'domain',
      title: 'Define the one allowed domain',
      description: 'Start in Domain to lock the assessment to a single domain record before authoring downstream structure.',
      ctaLabel: 'Continue to Domain',
    };
  }

  if (signalCount === 0) {
    return {
      step: 'signals',
      title: 'Add the first signal',
      description: 'Signals create the scoring structure the rest of the builder depends on.',
      ctaLabel: 'Continue to Signals',
    };
  }

  if (questionCount === 0) {
    return {
      step: 'questions',
      title: 'Author the first question',
      description: 'Questions turn the domain and signal structure into something the runtime can actually serve.',
      ctaLabel: 'Continue to Questions',
    };
  }

  if (optionCount === 0) {
    return {
      step: 'responses',
      title: 'Define response options',
      description: 'Response options must exist before weightings and review can reflect real assessment structure.',
      ctaLabel: 'Continue to Responses',
    };
  }

  if (mappingCount === 0 || assessment.weightingSummary.unmappedOptions > 0) {
    return {
      step: 'weightings',
      title: 'Finish option-to-signal weightings',
      description: 'Weightings are only complete when every authored option resolves to the current authored signal set.',
      ctaLabel: 'Continue to Weightings',
    };
  }

  if (!assessment.singleDomainLanguageValidation.overallReady) {
    if (expectedPairCount === 0) {
      return {
        step: 'signals',
        title: 'Add enough signals to derive pairs',
        description: 'Language stays waiting until the authored signal set can produce the pair-based datasets it depends on.',
        ctaLabel: 'Return to Signals',
      };
    }

    return {
      step: 'language',
      title: hasAnyLanguageRows ? 'Finish the language datasets' : 'Author the language datasets',
      description: 'Language readiness is derived from the current signal set, expected pairs, and persisted dataset row counts.',
      ctaLabel: 'Continue to Language',
    };
  }

  if (!assessment.draftValidation.isPublishReady) {
    return {
      step: 'review',
      title: 'Review remaining readiness issues',
      description: 'Use Review to resolve the remaining authored-data gaps before treating the draft as publishable.',
      ctaLabel: 'Continue to Review',
    };
  }

  return {
    step: 'review',
    title: 'Review the ready draft',
    description: 'The authored structure is complete. Review the final summary before publishing.',
    ctaLabel: 'Open Review',
  };
}

export function getSingleDomainBuilderStepStatus(
  slug: SingleDomainBuilderStepSlug,
  assessment: SingleDomainBuilderStepperState,
  _activeStep?: SingleDomainBuilderStepSlug,
): SingleDomainBuilderStepStatus {
  if (assessment.builderMode === 'published_no_draft') {
    return 'reference';
  }

  const domainCount = assessment.authoredDomains.length;
  const signalCount = assessment.availableSignals.length;
  const questionCount = assessment.authoredQuestions.length;
  const optionCount = assessment.weightingSummary.totalOptions;
  const hasAnyMappings = assessment.weightingSummary.totalMappings > 0;
  const expectedPairCount = assessment.singleDomainLanguageValidation.expectedPairCount;
  const hasAnyLanguageRows = assessment.singleDomainLanguageValidation.datasets.some(
    (dataset) => dataset.actualRowCount > 0,
  );
  const allQuestionsHaveOptions =
    questionCount > 0 &&
    assessment.authoredQuestions.every((question) => question.options.length > 0);

  switch (slug) {
    case 'overview':
      return 'reference';
    case 'domain':
      return domainCount === 1 ? 'complete' : domainCount > 1 ? 'in_progress' : 'empty';
    case 'signals':
      if (signalCount > 0) {
        return 'complete';
      }
      return domainCount === 0 ? 'waiting' : 'empty';
    case 'questions':
      if (questionCount > 0) {
        return 'complete';
      }
      return signalCount === 0 ? 'waiting' : 'empty';
    case 'responses':
      if (questionCount === 0) {
        return 'waiting';
      }
      if (allQuestionsHaveOptions) {
        return 'complete';
      }
      return optionCount > 0 ? 'in_progress' : 'empty';
    case 'weightings':
      if (signalCount === 0 || optionCount === 0) {
        return 'waiting';
      }
      if (optionCount > 0 && signalCount > 0 && assessment.weightingSummary.unmappedOptions === 0) {
        return 'complete';
      }
      return hasAnyMappings ? 'in_progress' : 'empty';
    case 'language':
      if (assessment.singleDomainLanguageValidation.overallReady) {
        return 'complete';
      }
      if (signalCount === 0 || expectedPairCount === 0) {
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
      return hasMeaningfulSingleDomainDraftData(assessment) &&
        domainCount > 0 &&
        signalCount > 0 &&
        questionCount > 0 &&
        optionCount > 0 &&
        hasAnyMappings
        ? 'in_progress'
        : 'waiting';
  }
}
