import type {
  AdminAssessmentDetailDomain,
  AdminAssessmentDetailQuestion,
  AdminAssessmentDetailSignalWeight,
} from '@/lib/server/admin-assessment-detail';
import { getSingleDomainLanguageDatasetDefinition } from '@/lib/admin/single-domain-language-datasets';
import type { SingleDomainLanguageBundle } from '@/lib/server/assessment-version-single-domain-language-types';
import type { SingleDomainLanguageDatasetKey } from '@/lib/types/single-domain-language';

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
  status: 'ready' | 'attention';
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
  detail: string,
  issues: readonly SingleDomainStructuralIssue[],
): SingleDomainStructuralSection {
  return {
    key,
    label,
    status: issues.some((issue) => issue.severity === 'blocking') ? 'attention' : 'ready',
    detail,
    issues: Object.freeze([...issues]),
  };
}

function collectWeightMappings(
  questions: readonly AdminAssessmentDetailQuestion[],
): readonly AdminAssessmentDetailSignalWeight[] {
  return questions.flatMap((question) => question.options.flatMap((option) => option.signalWeights));
}

export function getExpectedSignalPairCount(signalCount: number): number {
  if (signalCount < 2) {
    return 0;
  }

  return (signalCount * (signalCount - 1)) / 2;
}

function createLanguageDatasetValidation(params: {
  datasetKey: SingleDomainLanguageDatasetKey;
  actualRowCount: number;
  expectedRowCount: number;
  countRule: 'at_least' | 'exact';
  successDetail: string;
  failureMessage: string;
}): SingleDomainLanguageDatasetValidation {
  const definition = getSingleDomainLanguageDatasetDefinition(params.datasetKey);
  const isReady = params.countRule === 'at_least'
    ? params.actualRowCount >= params.expectedRowCount
    : params.actualRowCount === params.expectedRowCount;
  const issues = isReady
    ? []
    : [
        createIssue(
          `language_${params.datasetKey.toLowerCase()}_count_mismatch`,
          params.failureMessage,
        ),
      ];

  return {
    datasetKey: params.datasetKey,
    label: definition.label,
    actualRowCount: params.actualRowCount,
    expectedRowCount: params.expectedRowCount,
    countRule: params.countRule,
    isReady,
    detail: isReady ? params.successDetail : params.failureMessage,
    issues: Object.freeze(issues),
  };
}

export function buildSingleDomainLanguageValidation(params: {
  authoredDomains: readonly AdminAssessmentDetailDomain[];
  languageBundle: SingleDomainLanguageBundle;
}): SingleDomainLanguageValidation {
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
    }),
    createLanguageDatasetValidation({
      datasetKey: 'HERO_PAIRS',
      actualRowCount: params.languageBundle.HERO_PAIRS.length,
      expectedRowCount: expectedPairCount,
      countRule: 'exact',
      successDetail: `HERO_PAIRS matches the current derived pair count (${expectedPairCount}).`,
      failureMessage: `HERO_PAIRS must contain exactly ${expectedPairCount} row${expectedPairCount === 1 ? '' : 's'} to match the current signal-derived pair count.`,
    }),
    createLanguageDatasetValidation({
      datasetKey: 'SIGNAL_CHAPTERS',
      actualRowCount: params.languageBundle.SIGNAL_CHAPTERS.length,
      expectedRowCount: signalCount,
      countRule: 'exact',
      successDetail: `SIGNAL_CHAPTERS matches the current authored signal count (${signalCount}).`,
      failureMessage: `SIGNAL_CHAPTERS must contain exactly ${signalCount} row${signalCount === 1 ? '' : 's'} to match the current authored signal count.`,
    }),
    createLanguageDatasetValidation({
      datasetKey: 'BALANCING_SECTIONS',
      actualRowCount: params.languageBundle.BALANCING_SECTIONS.length,
      expectedRowCount: expectedPairCount,
      countRule: 'exact',
      successDetail: `BALANCING_SECTIONS matches the current derived pair count (${expectedPairCount}).`,
      failureMessage: `BALANCING_SECTIONS must contain exactly ${expectedPairCount} row${expectedPairCount === 1 ? '' : 's'} to match the current signal-derived pair count.`,
    }),
    createLanguageDatasetValidation({
      datasetKey: 'PAIR_SUMMARIES',
      actualRowCount: params.languageBundle.PAIR_SUMMARIES.length,
      expectedRowCount: expectedPairCount,
      countRule: 'exact',
      successDetail: `PAIR_SUMMARIES matches the current derived pair count (${expectedPairCount}).`,
      failureMessage: `PAIR_SUMMARIES must contain exactly ${expectedPairCount} row${expectedPairCount === 1 ? '' : 's'} to match the current signal-derived pair count.`,
    }),
    createLanguageDatasetValidation({
      datasetKey: 'APPLICATION_STATEMENTS',
      actualRowCount: params.languageBundle.APPLICATION_STATEMENTS.length,
      expectedRowCount: signalCount,
      countRule: 'exact',
      successDetail: `APPLICATION_STATEMENTS matches the current authored signal count (${signalCount}).`,
      failureMessage: `APPLICATION_STATEMENTS must contain exactly ${signalCount} row${signalCount === 1 ? '' : 's'} to match the current authored signal count.`,
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
      createSection('overview', 'Overview', 'Assessment identity and draft scope are available.', []),
      createSection(
        'domain',
        'Domain',
        domainCount === 1 ? 'Exactly one domain is in place.' : 'This builder supports one domain only.',
        domainIssues,
      ),
      createSection(
        'signals',
        'Signals',
        signalCount > 0
          ? `${signalCount} signal${signalCount === 1 ? '' : 's'} authored. Expected pairs derive from the current signal set.`
          : 'Signal count is flexible, but at least one signal is required.',
        signalIssues,
      ),
      createSection(
        'questions',
        'Questions',
        questionCount > 0
          ? `${questionCount} question${questionCount === 1 ? '' : 's'} authored in deterministic order.`
          : 'Questions must attach to the single domain.',
        questionIssues,
      ),
      createSection(
        'responses',
        'Responses',
        optionCount > 0
          ? `${optionCount} response option${optionCount === 1 ? '' : 's'} grouped under authored questions.`
          : 'Each question needs at least one response option.',
        responseIssues,
      ),
      createSection(
        'weightings',
        'Weightings',
        mappingCount > 0
          ? `${mappingCount} option-to-signal weight row${mappingCount === 1 ? '' : 's'} authored.`
          : 'Weight rows must resolve against existing options and signals only.',
        weightingIssues,
      ),
      createSection(
        'language',
        'Language',
        languageValidation
          ? languageValidation.overallReady
            ? 'All six locked single-domain language datasets meet the current completeness contract.'
            : 'Language completeness is evaluated from the authored signals and current dataset row counts.'
          : input.languageReady
            ? 'Single-domain language datasets have draft activity.'
            : 'Language remains a placeholder in this task.',
        languageValidation ? languageIssues : [],
      ),
    ]),
  };
}
