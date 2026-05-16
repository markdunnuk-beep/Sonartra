import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';

const planningPath = join(
  process.cwd(),
  'content',
  'authoring',
  'leadership-approach',
  'report-first',
  'planning',
  'remaining-20-report-briefs.md',
);

const missingPatternKeys = [
  'results_process_vision_people',
  'results_vision_process_people',
  'results_vision_people_process',
  'results_people_process_vision',
  'results_people_vision_process',
  'process_results_vision_people',
  'process_vision_results_people',
  'process_vision_people_results',
  'process_people_results_vision',
  'process_people_vision_results',
  'vision_results_process_people',
  'vision_results_people_process',
  'vision_process_results_people',
  'vision_process_people_results',
  'vision_people_results_process',
  'people_results_process_vision',
  'people_results_vision_process',
  'people_process_vision_results',
  'people_vision_results_process',
  'people_vision_process_results',
] as const;

const authoredPatternKeys = [
  'process_results_people_vision',
  'results_process_people_vision',
  'people_process_results_vision',
  'vision_people_process_results',
] as const;

const requiredBriefLabels = [
  'Core leadership move',
  'Primary value',
  'Likely team experience',
  'Decision style',
  'Communication style',
  'Pressure behaviour',
  'Rank 3 expansion',
  'Rank 4 expansion',
  'Main development edge',
  'Distinction from similar patterns',
  'Avoided generic trap',
  'Final line direction',
] as const;

function readPlanningFile(): string {
  return readFileSync(planningPath, 'utf8');
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function sectionForPattern(source: string, patternKey: string): string {
  const pattern = new RegExp(
    `### ${escapeRegex(patternKey)}\\n([\\s\\S]*?)(?=\\n### |\\n## Cross-pattern differentiation notes|$)`,
  );
  const match = source.match(pattern);
  assert.ok(match, `Expected planning section for ${patternKey}`);
  return match[1] ?? '';
}

test('leadership report-first planning file exists', () => {
  assert.equal(existsSync(planningPath), true);
});

test('leadership report-first planning briefs cover exactly the 20 missing pattern keys', () => {
  const source = readPlanningFile();

  for (const patternKey of missingPatternKeys) {
    assert.match(source, new RegExp(`### ${escapeRegex(patternKey)}\\n`));
    assert.match(source, new RegExp(`Pattern key: \`${escapeRegex(patternKey)}\``));
  }

  for (const patternKey of authoredPatternKeys) {
    assert.doesNotMatch(source, new RegExp(`### ${escapeRegex(patternKey)}\\n`));
  }
});

test('each missing leadership report-first brief includes the required planning labels', () => {
  const source = readPlanningFile();

  for (const patternKey of missingPatternKeys) {
    const section = sectionForPattern(source, patternKey);
    for (const label of requiredBriefLabels) {
      assert.match(section, new RegExp(`${escapeRegex(label)}:`), `${patternKey} missing ${label}`);
    }
  }
});

test('leadership report-first planning includes cross-pattern differentiation notes', () => {
  const source = readPlanningFile();

  assert.match(source, /## Cross-pattern differentiation notes/);
  assert.match(source, /Results-led reports versus Process-led reports/);
  assert.match(source, /Vision-led reports versus People-led reports/);
  assert.match(source, /How rank 2 changes the whole pattern/);
  assert.match(source, /How rank 3 should feel like expansion/);
  assert.match(source, /How rank 4 should become the main deliberate growth edge/);
  assert.match(source, /Risks of making the 24 reports feel templated/);
  assert.match(source, /Editorial principles for the next writing batches/);
});
