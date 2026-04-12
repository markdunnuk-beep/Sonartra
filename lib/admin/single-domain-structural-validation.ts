import type {
  AdminAssessmentDetailDomain,
  AdminAssessmentDetailQuestion,
  AdminAssessmentDetailSignalWeight,
} from '@/lib/server/admin-assessment-detail';

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
        input.languageReady
          ? 'Single-domain language datasets have draft activity.'
          : 'Language remains a placeholder in this task.',
        [],
      ),
    ]),
  };
}
