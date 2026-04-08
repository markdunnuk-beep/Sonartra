import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const importComponentPath = join(process.cwd(), 'components', 'admin', 'admin-language-dataset-import.tsx');
const languageStepPath = join(process.cwd(), 'components', 'admin', 'admin-assessment-language-step.tsx');
const actionPath = join(process.cwd(), 'lib', 'server', 'admin-language-dataset-import-actions.ts');

function read(path: string): string {
  return readFileSync(path, 'utf8');
}

test('Stage 9 Application Plan appears in the builder', () => {
  const source = read(languageStepPath);

  assert.match(source, /eyebrow="Stage 9"/);
  assert.match(source, /title="Application Plan"/);
  assert.match(source, /const \[activeApplicationTab, setActiveApplicationTab\] = useState<ApplicationPlanTab>\('applicationThesis'\);/);
  assert.match(source, /label: 'Thesis'/);
  assert.match(source, /label: 'Contribution'/);
  assert.match(source, /label: 'Risk'/);
  assert.match(source, /label: 'Development'/);
  assert.match(source, /label: 'Action Prompts'/);
});

test('all five application datasets render with the expected headers and helper copy', () => {
  const source = read(importComponentPath);

  assert.match(source, /key: 'applicationThesis'/);
  assert.match(source, /Application Thesis/);
  assert.match(source, /opening bridge into the final application chapter/i);
  assert.match(source, /hero_pattern_key\|headline\|summary/);

  assert.match(source, /key: 'applicationContribution'/);
  assert.match(source, /Contribution Language/);
  assert.match(source, /how the person creates value at their best/i);
  assert.match(source, /source_type\|source_key\|priority\|label\|narrative\|best_when\|watch_for/);

  assert.match(source, /key: 'applicationRisk'/);
  assert.match(source, /Risk Language/);
  assert.match(source, /where strengths can become limiting patterns/i);
  assert.match(source, /source_type\|source_key\|priority\|label\|narrative\|impact\|early_warning/);

  assert.match(source, /key: 'applicationDevelopment'/);
  assert.match(source, /Development Language/);
  assert.match(source, /where to build more range/i);
  assert.match(source, /source_type\|source_key\|priority\|label\|narrative\|practice\|success_marker/);

  assert.match(source, /key: 'applicationActionPrompts'/);
  assert.match(source, /Action Prompt Language/);
  assert.match(source, /30-day action guidance and feedback prompts/i);
  assert.match(source, /source_type\|source_key\|keep_doing\|watch_for\|practice_next\|ask_others/);
});

test('switching datasets drives the selected application import surface', () => {
  const source = read(languageStepPath);

  assert.match(source, /onClick=\{\(\) => setActiveApplicationTab\(tab\.key\)\}/);
  assert.match(source, /dataset=\{activeApplicationTab\}/);
  assert.match(source, /APPLICATION_PLAN_TABS\.find\(\(tab\) => tab\.key === activeApplicationTab\)\?\.title/);
  assert.match(source, /APPLICATION_PLAN_TABS\.find\(\(tab\) => tab\.key === activeApplicationTab\)\?\.description/);
});

test('import action routes application datasets to the correct handler', () => {
  const source = read(actionPath);

  assert.match(source, /importApplicationLanguageForAssessmentVersion/);
  assert.match(source, /values\.dataset === 'applicationThesis'/);
  assert.match(source, /values\.dataset === 'applicationContribution'/);
  assert.match(source, /values\.dataset === 'applicationRisk'/);
  assert.match(source, /values\.dataset === 'applicationDevelopment'/);
  assert.match(source, /values\.dataset === 'applicationActionPrompts'/);
});
