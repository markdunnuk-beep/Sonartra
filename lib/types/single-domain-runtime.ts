import type { SingleDomainLanguageBundle } from '@/lib/server/assessment-version-single-domain-language-types';

export type SingleDomainRuntimeMetadata = {
  assessmentId: string;
  assessmentKey: string;
  assessmentTitle: string;
  assessmentVersionId: string;
  assessmentVersionTag: string;
  mode: 'single_domain';
  assessmentDescription: string | null;
};

export type SingleDomainRuntimeDomain = {
  id: string;
  key: string;
  title: string;
  description: string | null;
  orderIndex: number;
};

export type SingleDomainRuntimeSignal = {
  id: string;
  key: string;
  title: string;
  description: string | null;
  domainId: string;
  orderIndex: number;
};

export type SingleDomainRuntimeDerivedPair = {
  pairKey: string;
  leftSignalId: string;
  leftSignalKey: string;
  leftSignalTitle: string;
  rightSignalId: string;
  rightSignalKey: string;
  rightSignalTitle: string;
  orderIndex: number;
};

export type SingleDomainRuntimeOptionSignalWeight = {
  id: string;
  optionId: string;
  signalId: string;
  signalKey: string;
  weight: number;
  reverseFlag: boolean;
  sourceWeightKey: string | null;
};

export type SingleDomainRuntimeOption = {
  id: string;
  key: string;
  label: string;
  description: string | null;
  questionId: string;
  orderIndex: number;
  signalWeights: readonly SingleDomainRuntimeOptionSignalWeight[];
};

export type SingleDomainRuntimeQuestion = {
  id: string;
  key: string;
  prompt: string;
  domainId: string;
  domainKey: string;
  orderIndex: number;
  options: readonly SingleDomainRuntimeOption[];
};

export type SingleDomainRuntimeLanguageRowCounts = {
  DOMAIN_FRAMING: number;
  HERO_PAIRS: number;
  DRIVER_CLAIMS: number;
  SIGNAL_CHAPTERS: number;
  BALANCING_SECTIONS: number;
  PAIR_SUMMARIES: number;
  APPLICATION_STATEMENTS: number;
};

export type SingleDomainRuntimeDiagnostics = {
  counts: {
    domainCount: number;
    signalCount: number;
    derivedPairCount: number;
    questionCount: number;
    optionCount: number;
    weightCount: number;
    languageRowCounts: SingleDomainRuntimeLanguageRowCounts;
  };
  expectations: {
    requiredDomainCount: 1;
    minimumSignalCount: 1;
    minimumQuestionCount: 1;
    expectedDerivedPairCount: number;
    expectedLanguageRowCounts: SingleDomainRuntimeLanguageRowCounts;
  };
  invariants: {
    exactSingleDomain: boolean;
    derivedPairCountMatchesSignals: boolean;
    questionsBoundToDomain: boolean;
    optionsBoundToQuestions: boolean;
    weightsBoundToOptions: boolean;
    weightsBoundToSignals: boolean;
    languageKeysMatchRuntime: boolean;
  };
};

export type SingleDomainRuntimeDefinition = {
  metadata: SingleDomainRuntimeMetadata;
  domain: SingleDomainRuntimeDomain;
  signals: readonly SingleDomainRuntimeSignal[];
  derivedPairs: readonly SingleDomainRuntimeDerivedPair[];
  questions: readonly SingleDomainRuntimeQuestion[];
  optionSignalWeights: readonly SingleDomainRuntimeOptionSignalWeight[];
  languageBundle: SingleDomainLanguageBundle;
  diagnostics: SingleDomainRuntimeDiagnostics;
};

export type SingleDomainDraftReadinessSection =
  | 'metadata'
  | 'domain'
  | 'signals'
  | 'questions'
  | 'options'
  | 'weights'
  | 'language'
  | 'runtime';

export type SingleDomainDraftReadinessIssueCode =
  | 'assessment_version_not_found'
  | 'single_domain_mode_required'
  | 'missing_domain'
  | 'multiple_domains'
  | 'missing_signals'
  | 'missing_questions'
  | 'question_domain_mismatch'
  | 'orphan_option'
  | 'question_without_options'
  | 'missing_options'
  | 'missing_weights'
  | 'option_without_weights'
  | 'weight_signal_unresolved'
  | 'domain_framing_count_mismatch'
  | 'domain_framing_key_mismatch'
  | 'hero_pairs_count_mismatch'
  | 'hero_pairs_key_mismatch'
  | 'signal_chapters_count_mismatch'
  | 'signal_chapters_key_mismatch'
  | 'balancing_sections_count_mismatch'
  | 'balancing_sections_key_mismatch'
  | 'pair_summaries_count_mismatch'
  | 'pair_summaries_key_mismatch'
  | 'application_statements_count_mismatch'
  | 'application_statements_key_mismatch'
  | 'runtime_definition_incomplete';

export type SingleDomainDraftReadinessIssue = {
  code: SingleDomainDraftReadinessIssueCode;
  section: SingleDomainDraftReadinessSection;
  message: string;
  severity: 'blocking';
  relatedKeys?: readonly string[];
};

export type SingleDomainDraftReadinessCounts = {
  domainCount: number;
  signalCount: number;
  derivedPairCount: number;
  questionCount: number;
  optionCount: number;
  weightCount: number;
  questionsWithoutOptionsCount: number;
  optionsWithoutWeightsCount: number;
  orphanOptionCount: number;
  unresolvedWeightSignalCount: number;
  languageRowCounts: SingleDomainRuntimeLanguageRowCounts;
};

export type SingleDomainDraftReadinessExpectations = {
  requiredDomainCount: 1;
  minimumSignalCount: 1;
  minimumQuestionCount: 1;
  expectedDerivedPairCount: number;
  expectedLanguageRowCounts: SingleDomainRuntimeLanguageRowCounts;
};

export type SingleDomainDraftReadiness = {
  isReady: boolean;
  issues: readonly SingleDomainDraftReadinessIssue[];
  counts: SingleDomainDraftReadinessCounts;
  expectations: SingleDomainDraftReadinessExpectations;
  runtimeDefinition: SingleDomainRuntimeDefinition | null;
};

export function getSingleDomainExpectedPairCount(signalCount: number): number {
  if (signalCount < 2) {
    return 0;
  }

  return (signalCount * (signalCount - 1)) / 2;
}

export function buildSingleDomainPairKey(leftSignalKey: string, rightSignalKey: string): string {
  return `${leftSignalKey}_${rightSignalKey}`;
}
