import type {
  AdminAssessmentDetailDomain,
  AdminAssessmentDetailQuestion,
  AdminAssessmentDetailSignalWeight,
} from '@/lib/server/admin-assessment-detail';
import { SINGLE_DOMAIN_RESPONSE_OPTION_LABELS } from '@/lib/admin/single-domain-response-import';
import { getSingleDomainLanguageDatasetDefinition } from '@/lib/admin/single-domain-language-datasets';
import type { SingleDomainLanguageBundle } from '@/lib/server/assessment-version-single-domain-language-types';
import { getSingleDomainExpectedPairCount } from '@/lib/types/single-domain-runtime';
import type { SingleDomainLanguageDatasetKey } from '@/lib/types/single-domain-language';
import type { SingleDomainDraftReadinessIssue } from '@/lib/types/single-domain-runtime';

const DRIVER_CLAIM_REQUIRED_ROLES = [
  'primary_driver',
  'secondary_driver',
  'supporting_context',
  'range_limitation',
] as const;

export type SingleDomainStructuralIssueSeverity = 'blocking' | 'warning';

export type SingleDomainStructuralIssue = {
  code: string;
  message: string;
  severity: SingleDomainStructuralIssueSeverity;
};

export type SingleDomainStructuralSectionKey =
  | 'overview'
  | 'domain'
  | 'signals'
  | 'questions'
  | 'responses'
  | 'weightings'
  | 'language';

export type SingleDomainStructuralSection = {
  key: SingleDomainStructuralSectionKey;
  label: string;
  status: 'ready' | 'attention' | 'waiting' | 'not_started';
  detail: string;
  issues: readonly SingleDomainStructuralIssue[];
};

export type SingleDomainStructuralValidation = {
  domainCount: number;
  signalCount: number;
  expectedPairCount: number;
  questionCount: number;
  optionCount: number;
  mappingCount: number;
  questionsWithoutOptionsCount: number;
  optionsWithoutWeightsCount: number;
  orphanQuestionCount: number;
  orphanWeightSignalCount: number;
  issues: readonly SingleDomainStructuralIssue[];
  sections: readonly SingleDomainStructuralSection[];
};

type ValidationInput = {
  authoredDomains: readonly AdminAssessmentDetailDomain[];
  authoredQuestions: readonly AdminAssessmentDetailQuestion[];
  languageReady?: boolean;
  languageValidation?: SingleDomainLanguageValidation;
};

export type SingleDomainLanguageDatasetValidation = {
  datasetKey: SingleDomainLanguageDatasetKey;
  label: string;
  actualRowCount: number;
  expectedRowCount: number;
  countRule: 'at_least' | 'exact';
  status: 'ready' | 'attention' | 'waiting' | 'not_started';
  isReady: boolean;
  detail: string;
  issues: readonly SingleDomainStructuralIssue[];
};

export type SingleDomainLanguageValidation = {
  overallReady: boolean;
  signalCount: number;
  expectedPairCount: number;
  datasets: readonly SingleDomainLanguageDatasetValidation[];
  issues: readonly SingleDomainStructuralIssue[];
};

export type SingleDomainResponseCoverage = {
  complete: boolean;
  completeQuestionCount: number;
  questionCountWithCanonicalGaps: number;
  blankOptionTextCount: number;
};

export type SingleDomainWeightingCoverage = {
  complete: boolean;
  mappedOptionCount: number;
  unmappedOptionCount: number;
};

export function getSingleDomainReadinessIssueSectionKey(
  issue: Pick<SingleDomainDraftReadinessIssue, 'section'>,
): SingleDomainStructuralSectionKey | 'review' {
  switch (issue.section) {
    case 'domain':
      return 'domain';
    case 'signals':
      return 'signals';
    case 'questions':
      return 'questions';
    case 'options':
      return 'responses';
    case 'weights':
      return 'weightings';
    case 'language':
      return 'language';
    case 'metadata':
    case 'runtime':
      return 'review';
  }
}

function isCanonicalResponseOptionLabel(value: string): value is (typeof SINGLE_DOMAIN_RESPONSE_OPTION_LABELS)[number] {
  return (SINGLE_DOMAIN_RESPONSE_OPTION_LABELS as readonly string[]).includes(value);
}

function createIssue(
  code: string,
  message: string,
  severity: SingleDomainStructuralIssueSeverity = 'blocking',
): SingleDomainStructuralIssue {
  return { code, message, severity };
}

function createSection(
  key: SingleDomainStructuralSectionKey,
  label: string,
  status: SingleDomainStructuralSection['status'],
  detail: string,
  issues: readonly SingleDomainStructuralIssue[],
): SingleDomainStructuralSection {
  return {
    key,
    label,
    status,
    detail,
    issues: Object.freeze([...issues]),
  };
}

function collectWeightMappings(
  questions: readonly AdminAssessmentDetailQuestion[],
): readonly AdminAssessmentDetailSignalWeight[] {
  return questions.flatMap((question) => question.options.flatMap((option) => option.signalWeights));
}

export function getSingleDomainResponseCoverage(
  questions: readonly AdminAssessmentDetailQuestion[],
): SingleDomainResponseCoverage {
  let completeQuestionCount = 0;
  let questionCountWithCanonicalGaps = 0;
  let blankOptionTextCount = 0;

  for (const question of questions) {
    const optionGroups = new Map<string, number>();

    for (const option of question.options) {
      const normalizedLabel = option.optionLabel?.trim().toUpperCase() ?? '';
      if (!isCanonicalResponseOptionLabel(normalizedLabel)) {
        continue;
      }

      optionGroups.set(normalizedLabel, (optionGroups.get(normalizedLabel) ?? 0) + 1);

      if (!option.optionText.trim()) {
        blankOptionTextCount += 1;
      }
    }

    const hasCanonicalSet = SINGLE_DOMAIN_RESPONSE_OPTION_LABELS.every(
      (label) => optionGroups.get(label) === 1,
    );
    const hasBlankOptionText = question.options.some(
      (option) =>
        isCanonicalResponseOptionLabel(option.optionLabel?.trim().toUpperCase() ?? '')
        && !option.optionText.trim(),
    );

    if (hasCanonicalSet && !hasBlankOptionText) {
      completeQuestionCount += 1;
      continue;
    }

    questionCountWithCanonicalGaps += 1;
  }

  return {
    complete: questions.length > 0 && completeQuestionCount === questions.length,
    completeQuestionCount,
    questionCountWithCanonicalGaps,
    blankOptionTextCount,
  };
}

export function getSingleDomainWeightingCoverage(
  questions: readonly AdminAssessmentDetailQuestion[],
): SingleDomainWeightingCoverage {
  const canonicalOptions = questions.flatMap((question) =>
    question.options.filter((option) =>
      isCanonicalResponseOptionLabel(option.optionLabel?.trim().toUpperCase() ?? '')
      && option.optionText.trim().length > 0,
    ),
  );
  const mappedOptionCount = canonicalOptions.filter((option) => option.signalWeights.length > 0).length;

  return {
    complete: canonicalOptions.length > 0 && mappedOptionCount === canonicalOptions.length,
    mappedOptionCount,
    unmappedOptionCount: canonicalOptions.length - mappedOptionCount,
  };
}

export function getExpectedSignalPairCount(signalCount: number): number {
  return getSingleDomainExpectedPairCount(signalCount);
}

function createLanguageDatasetValidation(params: {
  datasetKey: SingleDomainLanguageDatasetKey;
  actualRowCount: number;
  expectedRowCount: number;
  countRule: 'at_least' | 'exact';
  successDetail: string;
  failureMessage: string;
  waitingDetail?: string;
}): SingleDomainLanguageDatasetValidation {
  const isWaiting = typeof params.waitingDetail === 'string';
  const definition = getSingleDomainLanguageDatasetDefinition(params.datasetKey);
  const isReady = !isWaiting && (params.countRule === 'at_least'
    ? params.actualRowCount >= params.expectedRowCount
    : params.actualRowCount === params.expectedRowCount);
  const issues = isReady || isWaiting
    ? []
    : [
        createIssue(
          `language_${params.datasetKey.toLowerCase()}_count_mismatch`,
          params.failureMessage,
        ),
      ];
  const status = isWaiting
    ? 'waiting'
    : isReady
      ? 'ready'
      : params.actualRowCount > 0
        ? 'attention'
        : 'not_started';

  return {
    datasetKey: params.datasetKey,
    label: definition.label,
    actualRowCount: params.actualRowCount,
    expectedRowCount: params.expectedRowCount,
    countRule: params.countRule,
    status,
    isReady,
    detail: isWaiting ? params.waitingDetail ?? params.failureMessage : isReady ? params.successDetail : params.failureMessage,
    issues: Object.freeze(issues),
  };
}

export function buildSingleDomainLanguageValidation(params: {
  authoredDomains: readonly AdminAssessmentDetailDomain[];
  languageBundle: SingleDomainLanguageBundle;
}): SingleDomainLanguageValidation {
  const domainCount = params.authoredDomains.length;
  const signalCount = params.authoredDomains.reduce((sum, domain) => sum + domain.signals.length, 0);
  const expectedPairCount = getExpectedSignalPairCount(signalCount);
  const datasets: SingleDomainLanguageDatasetValidation[] = [
    createLanguageDatasetValidation({
      datasetKey: 'DOMAIN_FRAMING',
      actualRowCount: params.languageBundle.DOMAIN_FRAMING.length,
      expectedRowCount: 1,
      countRule: 'at_least',
      successDetail: 'Domain framing includes the required opening coverage for this single-domain builder.',
      failureMessage: 'DOMAIN_FRAMING must contain at least 1 row for the domain framing section.',
      waitingDetail: domainCount === 0 ? 'Waiting on the single authored domain before domain framing can be assessed.' : undefined,
    }),
    createLanguageDatasetValidation({
      datasetKey: 'HERO_PAIRS',
      actualRowCount: params.languageBundle.HERO_PAIRS.length,
      expectedRowCount: expectedPairCount,
      countRule: 'exact',
      successDetail: `HERO_PAIRS matches the current derived pair count (${expectedPairCount}).`,
      failureMessage: `HERO_PAIRS must contain exactly ${expectedPairCount} row${expectedPairCount === 1 ? '' : 's'} to match the current signal-derived pair count.`,
      waitingDetail: signalCount === 0
        ? 'Waiting on authored signals before hero pairs can be derived.'
        : expectedPairCount === 0
          ? 'Waiting on at least two authored signals before hero pairs can be derived.'
          : undefined,
    }),
    createLanguageDatasetValidation({
      datasetKey: 'DRIVER_CLAIMS',
      actualRowCount: (params.languageBundle.DRIVER_CLAIMS ?? []).length,
      expectedRowCount: expectedPairCount * DRIVER_CLAIM_REQUIRED_ROLES.length,
      countRule: 'exact',
      successDetail: `DRIVER_CLAIMS matches the current derived pair count (${expectedPairCount}) with all required driver roles.`,
      failureMessage: `DRIVER_CLAIMS must contain exactly ${expectedPairCount * DRIVER_CLAIM_REQUIRED_ROLES.length} row${expectedPairCount * DRIVER_CLAIM_REQUIRED_ROLES.length === 1 ? '' : 's'} (${expectedPairCount} pair${expectedPairCount === 1 ? '' : 's'} × ${DRIVER_CLAIM_REQUIRED_ROLES.length} required driver roles).`,
      waitingDetail: signalCount === 0
        ? 'Waiting on authored signals before driver claims can be derived.'
        : expectedPairCount === 0
          ? 'Waiting on at least two authored signals before driver claims can be derived.'
          : undefined,
    }),
    createLanguageDatasetValidation({
      datasetKey: 'SIGNAL_CHAPTERS',
      actualRowCount: params.languageBundle.SIGNAL_CHAPTERS.length,
      expectedRowCount: signalCount,
      countRule: 'exact',
      successDetail: `SIGNAL_CHAPTERS matches the current authored signal count (${signalCount}).`,
      failureMessage: `SIGNAL_CHAPTERS must contain exactly ${signalCount} row${signalCount === 1 ? '' : 's'} to match the current authored signal count.`,
      waitingDetail: signalCount === 0 ? 'Waiting on authored signals before signal chapters can be assessed.' : undefined,
    }),
    createLanguageDatasetValidation({
      datasetKey: 'BALANCING_SECTIONS',
      actualRowCount: params.languageBundle.BALANCING_SECTIONS.length,
      expectedRowCount: expectedPairCount,
      countRule: 'exact',
      successDetail: `BALANCING_SECTIONS matches the current derived pair count (${expectedPairCount}).`,
      failureMessage: `BALANCING_SECTIONS must contain exactly ${expectedPairCount} row${expectedPairCount === 1 ? '' : 's'} to match the current signal-derived pair count.`,
      waitingDetail: signalCount === 0
        ? 'Waiting on authored signals before balancing sections can be derived.'
        : expectedPairCount === 0
          ? 'Waiting on at least two authored signals before balancing sections can be derived.'
          : undefined,
    }),
    createLanguageDatasetValidation({
      datasetKey: 'PAIR_SUMMARIES',
      actualRowCount: params.languageBundle.PAIR_SUMMARIES.length,
      expectedRowCount: expectedPairCount,
      countRule: 'exact',
      successDetail: `PAIR_SUMMARIES matches the current derived pair count (${expectedPairCount}).`,
      failureMessage: `PAIR_SUMMARIES must contain exactly ${expectedPairCount} row${expectedPairCount === 1 ? '' : 's'} to match the current signal-derived pair count.`,
      waitingDetail: signalCount === 0
        ? 'Waiting on authored signals before pair summaries can be derived.'
        : expectedPairCount === 0
          ? 'Waiting on at least two authored signals before pair summaries can be derived.'
          : undefined,
    }),
    createLanguageDatasetValidation({
      datasetKey: 'APPLICATION_STATEMENTS',
      actualRowCount: params.languageBundle.APPLICATION_STATEMENTS.length,
      expectedRowCount: signalCount,
      countRule: 'exact',
      successDetail: `APPLICATION_STATEMENTS matches the current authored signal count (${signalCount}).`,
      failureMessage: `APPLICATION_STATEMENTS must contain exactly ${signalCount} row${signalCount === 1 ? '' : 's'} to match the current authored signal count.`,
      waitingDetail: signalCount === 0 ? 'Waiting on authored signals before application statements can be assessed.' : undefined,
    }),
  ];
  const issues = Object.freeze(datasets.flatMap((dataset) => dataset.issues));

  return {
    overallReady: datasets.every((dataset) => dataset.isReady),
    signalCount,
    expectedPairCount,
    datasets: Object.freeze(datasets),
    issues,
  };
}

export function buildSingleDomainStructuralValidation(
  input: ValidationInput,
): SingleDomainStructuralValidation {
  const domainCount = input.authoredDomains.length;
  const singleDomain = input.authoredDomains[0] ?? null;
  const signalCount = input.authoredDomains.reduce((sum, domain) => sum + domain.signals.length, 0);
  const expectedPairCount = getExpectedSignalPairCount(signalCount);
  const questionCount = input.authoredQuestions.length;
  const optionCount = input.authoredQuestions.reduce(
    (sum, question) => sum + question.options.length,
    0,
  );
  const mappingCount = input.authoredQuestions.reduce(
    (sum, question) =>
      sum + question.options.reduce((optionSum, option) => optionSum + option.signalWeights.length, 0),
    0,
  );
  const questionsWithoutOptionsCount = input.authoredQuestions.filter(
    (question) => question.options.length === 0,
  ).length;
  const optionsWithoutWeightsCount = input.authoredQuestions.reduce(
    (sum, question) =>
      sum + question.options.filter((option) => option.signalWeights.length === 0).length,
    0,
  );
  const orphanQuestionCount = singleDomain
    ? input.authoredQuestions.filter((question) => question.domainId !== singleDomain.domainId).length
    : input.authoredQuestions.length;

  const validSignalIds = new Set(
    input.authoredDomains.flatMap((domain) => domain.signals.map((signal) => signal.signalId)),
  );
  const orphanWeightSignalCount = collectWeightMappings(input.authoredQuestions).filter(
    (mapping) => !validSignalIds.has(mapping.signalId),
  ).length;

  const domainIssues: SingleDomainStructuralIssue[] = [];
  const signalIssues: SingleDomainStructuralIssue[] = [];
  const questionIssues: SingleDomainStructuralIssue[] = [];
  const responseIssues: SingleDomainStructuralIssue[] = [];
  const weightingIssues: SingleDomainStructuralIssue[] = [];
  const languageValidation = input.languageValidation;
  const languageIssues = languageValidation ? [...languageValidation.issues] : [];
  const responseCoverage = getSingleDomainResponseCoverage(input.authoredQuestions);
  const weightingCoverage = getSingleDomainWeightingCoverage(input.authoredQuestions);

  if (domainCount === 0) {
    domainIssues.push(createIssue('missing_domain', 'Add the one authored domain required by this builder.'));
  } else if (domainCount > 1) {
    domainIssues.push(
      createIssue(
        'multiple_domains',
        `This builder supports one domain only, but ${domainCount} domains currently exist.`,
      ),
    );
  }

  if (signalCount === 0) {
    signalIssues.push(
      createIssue('missing_signals', 'Author at least one signal for the single domain.'),
    );
  }

  if (questionCount === 0) {
    questionIssues.push(
      createIssue('missing_questions', 'Author at least one question for the single domain.'),
    );
  }

  if (orphanQuestionCount > 0) {
    questionIssues.push(
      createIssue(
        'orphan_questions',
        `${orphanQuestionCount} question${orphanQuestionCount === 1 ? '' : 's'} do not belong to the single authored domain.`,
      ),
    );
  }

  if (questionsWithoutOptionsCount > 0) {
    responseIssues.push(
      createIssue(
        'questions_without_options',
        `${questionsWithoutOptionsCount} question${questionsWithoutOptionsCount === 1 ? '' : 's'} have no response options.`,
      ),
    );
  }

  if (optionCount === 0 && questionCount > 0) {
    responseIssues.push(
      createIssue('missing_options', 'Questions exist, but no response options have been authored.'),
    );
  }

  if (responseCoverage.questionCountWithCanonicalGaps > 0 && optionCount > 0) {
    responseIssues.push(
      createIssue(
        'incomplete_responses',
        `${responseCoverage.questionCountWithCanonicalGaps} question${responseCoverage.questionCountWithCanonicalGaps === 1 ? '' : 's'} are missing a complete persisted A-D response set with text.`,
      ),
    );
  }

  if (responseCoverage.blankOptionTextCount > 0) {
    responseIssues.push(
      createIssue(
        'blank_response_text',
        `${responseCoverage.blankOptionTextCount} response option${responseCoverage.blankOptionTextCount === 1 ? '' : 's'} still have blank text.`,
      ),
    );
  }

  if (mappingCount === 0 && optionCount > 0) {
    weightingIssues.push(
      createIssue('missing_weights', 'Response options exist, but no option-to-signal weights have been authored.'),
    );
  }

  if (optionsWithoutWeightsCount > 0) {
    weightingIssues.push(
      createIssue(
        'options_without_weights',
        `${optionsWithoutWeightsCount} option${optionsWithoutWeightsCount === 1 ? '' : 's'} have no option-to-signal weights.`,
      ),
    );
  }

  if (orphanWeightSignalCount > 0) {
    weightingIssues.push(
      createIssue(
        'orphan_weight_signals',
        `${orphanWeightSignalCount} weight row${orphanWeightSignalCount === 1 ? '' : 's'} reference a signal that no longer exists.`,
      ),
    );
  }

  if (responseCoverage.complete && weightingCoverage.unmappedOptionCount > 0) {
    weightingIssues.push(
      createIssue(
        'incomplete_weightings',
        `${weightingCoverage.unmappedOptionCount} authored response option${weightingCoverage.unmappedOptionCount === 1 ? '' : 's'} still have no persisted weight rows.`,
      ),
    );
  }

  const issues = Object.freeze([
    ...domainIssues,
    ...signalIssues,
    ...questionIssues,
    ...responseIssues,
    ...weightingIssues,
    ...languageIssues,
  ]);

  return {
    domainCount,
    signalCount,
    expectedPairCount,
    questionCount,
    optionCount,
    mappingCount,
    questionsWithoutOptionsCount,
    optionsWithoutWeightsCount,
    orphanQuestionCount,
    orphanWeightSignalCount,
    issues,
    sections: Object.freeze([
      createSection('overview', 'Overview', 'ready', 'Assessment identity and draft scope are available.', []),
      createSection(
        'domain',
        'Domain',
        domainCount === 1 ? 'ready' : 'attention',
        domainCount === 1 ? 'Exactly one domain is in place.' : 'This builder supports one domain only.',
        domainIssues,
      ),
      createSection(
        'signals',
        'Signals',
        domainCount === 0 ? 'waiting' : signalCount > 0 ? 'ready' : 'not_started',
        signalCount > 0
          ? `${signalCount} signal${signalCount === 1 ? '' : 's'} authored. Expected pairs derive from the current signal set.`
          : domainCount === 0
            ? 'Waiting on the single domain before signals can be assessed.'
            : 'Signal count is flexible, but at least one signal is required.',
        signalIssues,
      ),
      createSection(
        'questions',
        'Questions',
        domainCount === 0 ? 'waiting' : questionCount > 0 ? 'ready' : 'not_started',
        questionCount > 0
          ? `${questionCount} question${questionCount === 1 ? '' : 's'} authored in deterministic order.`
          : domainCount === 0
            ? 'Waiting on the single domain before questions can be assessed.'
            : 'Questions must attach to the single domain.',
        questionIssues,
      ),
      createSection(
        'responses',
        'Responses',
        questionCount === 0
          ? 'waiting'
          : responseCoverage.complete
            ? 'ready'
            : optionCount > 0
              ? 'attention'
              : 'not_started',
        optionCount > 0
          ? `${responseCoverage.completeQuestionCount} of ${questionCount} question${questionCount === 1 ? '' : 's'} have a complete persisted A-D response set with text.`
          : questionCount === 0
            ? 'Waiting on authored questions before responses can be assessed.'
            : 'Each question needs a complete persisted A-D response set.',
        responseIssues,
      ),
      createSection(
        'weightings',
        'Weightings',
        signalCount === 0
          ? 'waiting'
          : optionCount === 0 || !responseCoverage.complete
            ? 'waiting'
            : weightingCoverage.complete && orphanWeightSignalCount === 0
              ? 'ready'
            : mappingCount > 0
                ? 'attention'
                : 'not_started',
        mappingCount > 0
          ? `${weightingCoverage.mappedOptionCount} of ${weightingCoverage.mappedOptionCount + weightingCoverage.unmappedOptionCount} authored response option${weightingCoverage.mappedOptionCount + weightingCoverage.unmappedOptionCount === 1 ? '' : 's'} have persisted weight rows.`
          : signalCount === 0
            ? 'Waiting on authored signals before weightings can be assessed.'
            : optionCount === 0 || !responseCoverage.complete
              ? 'Waiting on authored responses before weightings can be assessed.'
              : 'Weight rows must resolve against existing options and signals only.',
        weightingIssues,
      ),
      createSection(
        'language',
        'Language',
        languageValidation
          ? languageValidation.overallReady
            ? 'ready'
            : languageValidation.datasets.some((dataset) => dataset.status === 'waiting')
              ? 'waiting'
            : languageValidation.datasets.some((dataset) => dataset.status === 'attention')
              ? 'attention'
                : 'not_started'
          : input.languageReady
            ? 'attention'
            : 'waiting',
        languageValidation
          ? languageValidation.overallReady
            ? 'All six locked single-domain language datasets meet the current completeness contract.'
            : languageValidation.datasets.some((dataset) => dataset.status === 'waiting')
              ? 'Language datasets are still waiting on the current authored signal and pair structure before readiness can be fully assessed.'
              : 'Language completeness is evaluated from the authored signals, derived pairs, and current dataset row counts.'
          : input.languageReady
            ? 'Single-domain language datasets have draft activity.'
            : 'Language remains a placeholder in this task.',
        languageValidation ? languageIssues : [],
      ),
    ]),
  };
}
