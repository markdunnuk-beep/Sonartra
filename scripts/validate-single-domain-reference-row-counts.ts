import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

type Expectation = {
  key: string;
  file: string;
  expected: number;
};

const expectations: Expectation[] = [
  { key: 'intro', file: 'single_domain_intro_reference.txt', expected: 1 },
  { key: 'hero', file: 'single_domain_hero_pairs_reference.txt', expected: 6 },
  { key: 'drivers', file: 'single_domain_drivers_reference.txt', expected: 48 },
  { key: 'pair', file: 'single_domain_pair_summaries_reference.txt', expected: 6 },
  { key: 'limitations', file: 'single_domain_limitations_reference.txt', expected: 6 },
  { key: 'application', file: 'single_domain_application_reference.txt', expected: 24 },
];

function countRows(filePath: string): number {
  const content = readFileSync(filePath, 'utf8');
  const lines = content.split(/\r?\n/).map((line) => line.trimEnd());
  const headerIndex = lines.findIndex((line) => line.startsWith('domain_key|'));
  if (headerIndex < 0) {
    throw new Error(`${filePath}: missing contract header row.`);
  }

  return lines.slice(headerIndex + 1).filter((line) => line.trim().length > 0).length;
}

const base = resolve(process.cwd(), 'docs/results/reference-language');
const failures: string[] = [];

for (const expectation of expectations) {
  const filePath = resolve(base, expectation.file);
  const actual = countRows(filePath);
  if (actual !== expectation.expected) {
    failures.push(
      `${expectation.key}: expected ${expectation.expected} row(s), found ${actual} in ${expectation.file}`,
    );
  } else {
    console.log(`PASS ${expectation.key}: ${actual}`);
  }
}

if (failures.length > 0) {
  console.error('\nReference row count validation failed:');
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log('\nAll single-domain reference row counts match expected import contracts.');
