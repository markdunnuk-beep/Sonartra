export type AssessmentSeed = {
  key: string;
  title: string;
  description: string;
  status: 'draft' | 'active' | 'archived';
  estimatedTimeMinutes: number;
  category: string;
  version: string;
};

export type DomainSeed = {
  assessmentKey: string;
  key: string;
  title: string;
  order: number;
  source: 'question_section' | 'signal_group';
  description?: string;
};

export type SignalSeed = {
  assessmentKey: string;
  domainKey: string;
  key: string;
  title: string;
  order: number;
  description?: string;
  sourceColumn: string;
};

export type QuestionSeed = {
  assessmentKey: string;
  domainKey: string;
  key: string;
  text: string;
  order: number;
  sourceQuestionNumber: number;
};

export type OptionSeed = {
  questionKey: string;
  key: string;
  label: 'A' | 'B' | 'C' | 'D';
  text: string;
  order: number;
};

export type OptionSignalWeightSeed = {
  optionKey: string;
  signalKey: string;
  weight: number;
  reverseFlag: boolean;
  sourceWeightKey: string;
};

export type ThresholdSeed = {
  measureKey: string;
  lowMax: number;
  mediumMax: number;
  highMax: number;
  notes: string;
};

export type ArchetypeSeed = {
  key: string;
  primarySignalKey: string;
  secondarySignalKey: string;
  archetypeName: string;
  identitySentence: string;
};

export type SentenceLibrarySeed = {
  key: string;
  category: string;
  signalKey: string;
  band: string;
  sentence: string;
  sourceSheetRow: number;
};

export type RuleEngineSeed = {
  key: string;
  ruleType: string;
  condition: string;
  output: string;
  sourceSheetRow: number;
};
