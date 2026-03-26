import fs from 'node:fs';
import path from 'node:path';
import XLSX from 'xlsx';
import {
  DomainSeed,
  OptionSeed,
  OptionSignalWeightSeed,
  QuestionSeed,
  RuleEngineSeed,
  SentenceLibrarySeed,
  SignalSeed,
  ThresholdSeed,
  ArchetypeSeed,
} from '../db/seed/wplp80/types';

const BASE = path.resolve('db/seed/wplp80/data');
const WORKBOOK_PATH = path.resolve('mnt/data/Sonartra_WPLP80_Full_Report_Model.xlsx');

function readJson<T>(file: string): T {
  return JSON.parse(fs.readFileSync(path.join(BASE, file), 'utf8')) as T;
}

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(message);
  }
}

function uniqueCount(items: string[]): number {
  return new Set(items).size;
}

function main(): void {
  const domains = readJson<DomainSeed[]>('domains.json');
  const signals = readJson<SignalSeed[]>('signals.json');
  const questions = readJson<QuestionSeed[]>('questions.json');
  const options = readJson<OptionSeed[]>('options.json');
  const optionSignalWeights = readJson<OptionSignalWeightSeed[]>('optionSignalWeights.json');
  const thresholds = readJson<ThresholdSeed[]>('thresholds.json');
  const archetypes = readJson<ArchetypeSeed[]>('archetypes.json');
  const sentenceLibrary = readJson<SentenceLibrarySeed[]>('sentenceLibrary.json');
  const ruleEngine = readJson<RuleEngineSeed[]>('ruleEngine.json');

  assert(uniqueCount(questions.map((q) => q.key)) === questions.length, 'Duplicate question keys found');
  assert(uniqueCount(options.map((o) => o.key)) === options.length, 'Duplicate option keys found');

  const optionKeys = new Set(options.map((o) => o.key));
  const signalKeys = new Set(signals.map((s) => s.key));

  const orphanWeights = optionSignalWeights.filter((weight) => !optionKeys.has(weight.optionKey));
  assert(orphanWeights.length === 0, `Found orphan option weights: ${orphanWeights.length}`);

  const missingSignalRefs = optionSignalWeights.filter((weight) => !signalKeys.has(weight.signalKey));
  assert(missingSignalRefs.length === 0, `Found option weights with unknown signals: ${missingSignalRefs.length}`);

  const workbook = XLSX.readFile(WORKBOOK_PATH);
  const workbookQuestions = XLSX.utils.sheet_to_json<Record<string, string | number>>(workbook.Sheets.Questions, {
    defval: null,
  });
  const workbookWeights = XLSX.utils.sheet_to_json<Record<string, string | number>>(workbook.Sheets.Weights, { defval: null });
  const workbookThresholds = XLSX.utils.sheet_to_json(workbook.Sheets.Thresholds, { defval: null });
  const workbookArchetypes = XLSX.utils.sheet_to_json(workbook.Sheets.Archetypes, { defval: null });
  const workbookSentences = XLSX.utils.sheet_to_json(workbook.Sheets['Sentence Library'], { defval: null });
  const workbookRules = XLSX.utils.sheet_to_json(workbook.Sheets['Rule Engine'], { defval: null });

  assert(workbookQuestions.length === questions.length, 'Question count mismatch against workbook');
  assert(workbookQuestions.length * 4 === options.length, 'Option count mismatch against workbook');

  const signalColumns = Object.keys(workbookWeights[0] ?? {}).filter((column) =>
    /^(Style_|Mot_|Lead_|Conflict_|Culture_|Stress_|Decision_|Role_)/.test(column),
  );

  const expectedWeightRows = workbookWeights.reduce((total, row) => {
    let rowCount = 0;
    for (const column of signalColumns) {
      const value = Number(row[column] ?? 0);
      if (Number.isFinite(value) && value !== 0) {
        rowCount += 1;
      }
    }
    return total + rowCount;
  }, 0);

  assert(expectedWeightRows === optionSignalWeights.length, 'Option-signal weight count mismatch against workbook');
  assert(workbookThresholds.length === thresholds.length, 'Threshold count mismatch against workbook');
  assert(workbookArchetypes.length === archetypes.length, 'Archetype count mismatch against workbook');
  assert(workbookSentences.length === sentenceLibrary.length, 'Sentence library count mismatch against workbook');
  assert(workbookRules.length === ruleEngine.length, 'Rule engine count mismatch against workbook');

  const summary = {
    domains: domains.length,
    signals: signals.length,
    questions: questions.length,
    options: options.length,
    optionSignalWeights: optionSignalWeights.length,
    thresholds: thresholds.length,
    archetypes: archetypes.length,
    sentenceLibrary: sentenceLibrary.length,
    ruleEngine: ruleEngine.length,
  };

  console.log('WPLP-80 seed verification passed');
  console.log(JSON.stringify(summary, null, 2));
}

main();
