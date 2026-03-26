import fs from 'node:fs';
import path from 'node:path';
import {
  ArchetypeSeed,
  AssessmentSeed,
  DomainSeed,
  OptionSeed,
  OptionSignalWeightSeed,
  QuestionSeed,
  RuleEngineSeed,
  SentenceLibrarySeed,
  SignalSeed,
  ThresholdSeed,
} from './types';

const BASE_DIR = path.resolve(__dirname, 'data');

function loadJson<T>(fileName: string): T {
  return JSON.parse(fs.readFileSync(path.join(BASE_DIR, fileName), 'utf8')) as T;
}

export function loadWplp80Seeds(): {
  assessment: AssessmentSeed;
  domains: DomainSeed[];
  signals: SignalSeed[];
  questions: QuestionSeed[];
  options: OptionSeed[];
  optionSignalWeights: OptionSignalWeightSeed[];
  thresholds: ThresholdSeed[];
  archetypes: ArchetypeSeed[];
  sentenceLibrary: SentenceLibrarySeed[];
  ruleEngine: RuleEngineSeed[];
} {
  return {
    assessment: loadJson<AssessmentSeed>('assessment.json'),
    domains: loadJson<DomainSeed[]>('domains.json'),
    signals: loadJson<SignalSeed[]>('signals.json'),
    questions: loadJson<QuestionSeed[]>('questions.json'),
    options: loadJson<OptionSeed[]>('options.json'),
    optionSignalWeights: loadJson<OptionSignalWeightSeed[]>('optionSignalWeights.json'),
    thresholds: loadJson<ThresholdSeed[]>('thresholds.json'),
    archetypes: loadJson<ArchetypeSeed[]>('archetypes.json'),
    sentenceLibrary: loadJson<SentenceLibrarySeed[]>('sentenceLibrary.json'),
    ruleEngine: loadJson<RuleEngineSeed[]>('ruleEngine.json'),
  };
}
