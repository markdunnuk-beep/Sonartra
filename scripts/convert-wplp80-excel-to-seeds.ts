import fs from 'node:fs';
import path from 'node:path';
import XLSX from 'xlsx';
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
} from '../db/seed/wplp80/types';

type RawRecord = Record<string, string | number | null | undefined>;

const ASSESSMENT_KEY = 'wplp80';
const WORKBOOK_PATH = path.resolve('mnt/data/Sonartra_WPLP80_Full_Report_Model.xlsx');
const OUTPUT_DIR = path.resolve('db/seed/wplp80/data');

const SIGNAL_DOMAIN_TITLE: Record<string, string> = {
  style: 'Style',
  mot: 'Motivators',
  lead: 'Leadership',
  conflict: 'Conflict',
  culture: 'Culture',
  stress: 'Stress',
  decision: 'Decision',
  role: 'Role Fit',
};

const SIGNAL_DOMAIN_ORDER = ['style', 'mot', 'lead', 'conflict', 'culture', 'stress', 'decision', 'role'];

function slugify(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

function toRows(sheet: XLSX.WorkSheet): RawRecord[] {
  return XLSX.utils.sheet_to_json<RawRecord>(sheet, { defval: null });
}

function normalizeText(value: string | number | null | undefined): string {
  return String(value ?? '').replace(/\s+/g, ' ').trim();
}

function getSignalDomainFromColumn(columnName: string): string {
  const prefix = columnName.split('_')[0]?.toLowerCase();
  if (!prefix || !(prefix in SIGNAL_DOMAIN_TITLE)) {
    throw new Error(`Unsupported signal column prefix in Weights: ${columnName}`);
  }
  return prefix;
}

function writeJson<T>(fileName: string, payload: T): void {
  const outPath = path.join(OUTPUT_DIR, fileName);
  fs.writeFileSync(outPath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
}

function main(): void {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  const workbook = XLSX.readFile(WORKBOOK_PATH);
  const readMeSheet = workbook.Sheets['Read Me'];
  const questionRows = toRows(workbook.Sheets.Questions);
  const weightRows = toRows(workbook.Sheets.Weights);
  const thresholdRows = toRows(workbook.Sheets.Thresholds);
  const archetypeRows = toRows(workbook.Sheets.Archetypes);
  const sentenceRows = toRows(workbook.Sheets['Sentence Library']);
  const ruleRows = toRows(workbook.Sheets['Rule Engine']);

  const assessment: AssessmentSeed = {
    key: ASSESSMENT_KEY,
    title: normalizeText(readMeSheet.A1?.v) || 'WPLP-80',
    description: normalizeText(readMeSheet.B3?.v),
    status: 'draft',
    estimatedTimeMinutes: 29,
    category: 'leadership_and_personality',
    version: '1.0.0',
  };

  const sectionTitles = Array.from(
    new Set(questionRows.map((row) => normalizeText(row.Section)).filter((value) => value.length > 0)),
  );

  const sectionDomains: DomainSeed[] = sectionTitles.map((title, index) => ({
    assessmentKey: ASSESSMENT_KEY,
    key: `section_${slugify(title)}`,
    title,
    order: index + 1,
    source: 'question_section',
  }));

  const signalColumns = Object.keys(weightRows[0]).filter((key) =>
    /^(Style_|Mot_|Lead_|Conflict_|Culture_|Stress_|Decision_|Role_)/.test(key),
  );

  const seenSignalColumns = new Set<string>();
  const signalDomains: DomainSeed[] = SIGNAL_DOMAIN_ORDER.map((domainKey, index) => ({
    assessmentKey: ASSESSMENT_KEY,
    key: `signal_${domainKey}`,
    title: SIGNAL_DOMAIN_TITLE[domainKey],
    order: sectionDomains.length + index + 1,
    source: 'signal_group',
  }));

  const signalOrderWithinDomain = new Map<string, number>();
  const signals: SignalSeed[] = signalColumns.map((columnName) => {
    const domainPrefix = getSignalDomainFromColumn(columnName);
    const domainKey = `signal_${domainPrefix}`;
    const currentOrder = (signalOrderWithinDomain.get(domainKey) ?? 0) + 1;
    signalOrderWithinDomain.set(domainKey, currentOrder);
    seenSignalColumns.add(columnName);

    return {
      assessmentKey: ASSESSMENT_KEY,
      domainKey,
      key: slugify(columnName),
      title: normalizeText(columnName.replace(/^[^_]+_/, '')).replace(/_/g, ' '),
      order: currentOrder,
      sourceColumn: columnName,
    };
  });

  const domains = [...sectionDomains, ...signalDomains];

  const sectionByTitle = new Map(sectionDomains.map((domain) => [domain.title, domain.key]));

  const questions: QuestionSeed[] = questionRows.map((row) => {
    const number = Number(row['Q#']);
    const section = normalizeText(row.Section);
    const text = normalizeText(row.Question);
    if (!number || !section || !text) {
      throw new Error(`Question row is missing required values: ${JSON.stringify(row)}`);
    }

    const domainKey = sectionByTitle.get(section);
    if (!domainKey) {
      throw new Error(`No domain found for question section: ${section}`);
    }

    return {
      assessmentKey: ASSESSMENT_KEY,
      domainKey,
      key: `${ASSESSMENT_KEY}_q${String(number).padStart(2, '0')}`,
      text,
      order: number,
      sourceQuestionNumber: number,
    };
  });

  const options: OptionSeed[] = [];
  const optionKeyByQuestionAnswer = new Map<string, string>();

  for (const row of questionRows) {
    const number = Number(row['Q#']);
    const questionKey = `${ASSESSMENT_KEY}_q${String(number).padStart(2, '0')}`;
    const optionTuples: Array<{ label: 'A' | 'B' | 'C' | 'D'; text: string; order: number }> = [
      { label: 'A', text: normalizeText(row['A Option']), order: 1 },
      { label: 'B', text: normalizeText(row['B Option']), order: 2 },
      { label: 'C', text: normalizeText(row['C Option']), order: 3 },
      { label: 'D', text: normalizeText(row['D Option']), order: 4 },
    ];

    for (const tuple of optionTuples) {
      if (!tuple.text) {
        throw new Error(`Missing option text for question ${number} option ${tuple.label}`);
      }
      const optionKey = `${questionKey}_${tuple.label.toLowerCase()}`;
      optionKeyByQuestionAnswer.set(`${number}|${tuple.label}`, optionKey);
      options.push({
        questionKey,
        key: optionKey,
        label: tuple.label,
        text: tuple.text,
        order: tuple.order,
      });
    }
  }

  const signalKeyByColumn = new Map(signals.map((signal) => [signal.sourceColumn, signal.key]));

  const optionSignalWeights: OptionSignalWeightSeed[] = [];
  for (const row of weightRows) {
    const question = Number(row.Question);
    const answer = normalizeText(row.Answer) as 'A' | 'B' | 'C' | 'D';
    const sourceWeightKey = normalizeText(row.Key) || `${question}|${answer}`;
    const optionKey = optionKeyByQuestionAnswer.get(`${question}|${answer}`);

    if (!optionKey) {
      throw new Error(`Weights row references unknown option: ${sourceWeightKey}`);
    }

    const reverseFlag = Number(row.Reverse_Flag) === 1;

    for (const columnName of signalColumns) {
      const value = row[columnName];
      const numeric = typeof value === 'number' ? value : Number(value ?? 0);
      if (!Number.isFinite(numeric) || numeric === 0) {
        continue;
      }
      const signalKey = signalKeyByColumn.get(columnName);
      if (!signalKey) {
        throw new Error(`Missing signal for weight column ${columnName}`);
      }
      optionSignalWeights.push({
        optionKey,
        signalKey,
        weight: numeric,
        reverseFlag,
        sourceWeightKey,
      });
    }
  }

  const thresholds: ThresholdSeed[] = thresholdRows.map((row) => ({
    measureKey: slugify(normalizeText(row.Measure)),
    lowMax: Number(row['Low Max'] ?? 0),
    mediumMax: Number(row['Medium Max'] ?? 0),
    highMax: Number(row['High Max'] ?? 0),
    notes: normalizeText(row.Notes),
  }));

  const styleSignalKey = (value: string): string => `style_${slugify(value)}`;
  const sentenceSignalLookup = new Map(signals.map((signal) => [slugify(signal.title), signal.key]));

  const archetypes: ArchetypeSeed[] = archetypeRows.map((row) => ({
    key: normalizeText(row.Key) ? slugify(normalizeText(row.Key)) : `${styleSignalKey(normalizeText(row.Primary))}_${styleSignalKey(normalizeText(row.Secondary))}`,
    primarySignalKey: styleSignalKey(normalizeText(row.Primary)),
    secondarySignalKey: styleSignalKey(normalizeText(row.Secondary)),
    archetypeName: normalizeText(row.Archetype),
    identitySentence: normalizeText(row['Identity Sentence']),
  }));

  const sentenceLibrary: SentenceLibrarySeed[] = sentenceRows.map((row, index) => {
    const rawSignal = normalizeText(row.Signal);
    const mappedSignal =
      sentenceSignalLookup.get(slugify(rawSignal)) ??
      sentenceSignalLookup.get(slugify(`stress_${rawSignal}`)) ??
      sentenceSignalLookup.get(slugify(`lead_${rawSignal}`)) ??
      sentenceSignalLookup.get(slugify(`mot_${rawSignal}`)) ??
      sentenceSignalLookup.get(slugify(`conflict_${rawSignal}`)) ??
      sentenceSignalLookup.get(slugify(`culture_${rawSignal}`)) ??
      sentenceSignalLookup.get(slugify(`style_${rawSignal}`));

    if (!mappedSignal) {
      throw new Error(`Could not map sentence library signal '${rawSignal}' to a signal key.`);
    }

    return {
      key: normalizeText(row.Key) ? slugify(normalizeText(row.Key)) : `sentence_${index + 2}`,
      category: normalizeText(row.Category),
      signalKey: mappedSignal,
      band: normalizeText(row.Band),
      sentence: normalizeText(row.Sentence),
      sourceSheetRow: index + 2,
    };
  });

  const ruleEngine: RuleEngineSeed[] = ruleRows.map((row, index) => ({
    key: `rule_${String(index + 1).padStart(2, '0')}`,
    ruleType: normalizeText(row['Rule Type']),
    condition: normalizeText(row.Condition),
    output: normalizeText(row.Output),
    sourceSheetRow: index + 2,
  }));

  writeJson('assessment.json', assessment);
  writeJson('domains.json', domains);
  writeJson('signals.json', signals);
  writeJson('questions.json', questions);
  writeJson('options.json', options);
  writeJson('optionSignalWeights.json', optionSignalWeights);
  writeJson('thresholds.json', thresholds);
  writeJson('archetypes.json', archetypes);
  writeJson('sentenceLibrary.json', sentenceLibrary);
  writeJson('ruleEngine.json', ruleEngine);

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
    signalColumnsRead: seenSignalColumns.size,
  };

  console.log('WPLP-80 conversion complete');
  console.log(JSON.stringify(summary, null, 2));
}

main();
