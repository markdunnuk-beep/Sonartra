import fs from 'node:fs';
import path from 'node:path';

type OptionRecord = {
  questionKey: string;
  key?: string;
  label: string;
  text: string;
  order: number;
};

const INPUT_PATH = path.resolve('data/options.json');
const OUTPUT_PATH = path.resolve('exports/wplp80-options-flat.txt');
const EXPECTED_RECORDS = 320;
const EXPECTED_OPTIONS_PER_QUESTION = 4;
const EXPECTED_LABELS = ['A', 'B', 'C', 'D'];

function fail(message: string): never {
  throw new Error(message);
}

function requireNonBlankString(value: unknown, fieldName: string, index: number): string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    fail(`Record ${index}: "${fieldName}" is required and must be a non-blank string.`);
  }
  return value.trim();
}

function requireFiniteNumber(value: unknown, fieldName: string, index: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    fail(`Record ${index}: "${fieldName}" is required and must be a finite number.`);
  }
  return value;
}

function parseQuestionSequence(questionKey: string): number {
  const match = questionKey.match(/_q(\d+)$/i);
  if (!match) {
    fail(`Invalid questionKey format: "${questionKey}". Expected format like "wplp80_q01".`);
  }

  const sequence = Number.parseInt(match[1], 10);
  if (!Number.isFinite(sequence)) {
    fail(`Could not parse question sequence from questionKey: "${questionKey}".`);
  }

  return sequence;
}

function main(): void {
  if (!fs.existsSync(INPUT_PATH)) {
    fail(`Input file not found: ${INPUT_PATH}`);
  }

  let raw: string;
  try {
    raw = fs.readFileSync(INPUT_PATH, 'utf8');
  } catch (error) {
    fail(`Could not read input file: ${INPUT_PATH}. ${(error as Error).message}`);
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (error) {
    fail(`Input file is not valid JSON: ${INPUT_PATH}. ${(error as Error).message}`);
  }

  if (!Array.isArray(parsed)) {
    fail('Input JSON must be an array of option records.');
  }

  const records: OptionRecord[] = parsed.map((item, index) => {
    if (item === null || typeof item !== 'object') {
      fail(`Record ${index}: expected an object.`);
    }

    const option = item as Record<string, unknown>;
    return {
      questionKey: requireNonBlankString(option.questionKey, 'questionKey', index),
      key: typeof option.key === 'string' ? option.key : undefined,
      label: requireNonBlankString(option.label, 'label', index),
      text: requireNonBlankString(option.text, 'text', index),
      order: requireFiniteNumber(option.order, 'order', index),
    };
  });

  if (records.length !== EXPECTED_RECORDS) {
    fail(`Expected exactly ${EXPECTED_RECORDS} records, found ${records.length}.`);
  }

  const grouped = new Map<string, OptionRecord[]>();
  for (const record of records) {
    const group = grouped.get(record.questionKey);
    if (group) {
      group.push(record);
    } else {
      grouped.set(record.questionKey, [record]);
    }
  }

  for (const [questionKey, options] of grouped.entries()) {
    if (options.length !== EXPECTED_OPTIONS_PER_QUESTION) {
      fail(
        `Question ${questionKey} must contain exactly ${EXPECTED_OPTIONS_PER_QUESTION} responses, found ${options.length}.`,
      );
    }

    const labels = options.map((option) => option.label);
    const uniqueLabelCount = new Set(labels).size;
    if (uniqueLabelCount !== options.length) {
      fail(`Question ${questionKey} has duplicate labels.`);
    }

    const sortedLabels = [...labels].sort();
    const expectedSorted = [...EXPECTED_LABELS].sort();
    if (JSON.stringify(sortedLabels) !== JSON.stringify(expectedSorted)) {
      fail(`Question ${questionKey} must contain labels A, B, C, and D exactly once.`);
    }
  }

  const sorted = [...records].sort((a, b) => {
    const qDiff = parseQuestionSequence(a.questionKey) - parseQuestionSequence(b.questionKey);
    if (qDiff !== 0) {
      return qDiff;
    }

    return a.order - b.order;
  });

  const lines = sorted.map((record) => `${record.questionKey} ${record.label} ${record.text}`);

  fs.mkdirSync(path.dirname(OUTPUT_PATH), { recursive: true });
  fs.writeFileSync(OUTPUT_PATH, lines.join('\n'), 'utf8');

  console.log('WPLP-80 options export complete');
  console.log(`Input path: ${INPUT_PATH}`);
  console.log(`Output path: ${OUTPUT_PATH}`);
  console.log(`Total records exported: ${lines.length}`);
  console.log(`Total questions exported: ${grouped.size}`);
}

try {
  main();
} catch (error) {
  console.error(`Export failed: ${(error as Error).message}`);
  process.exit(1);
}
