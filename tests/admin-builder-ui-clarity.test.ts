import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

function readSource(...segments: string[]): string {
  return readFileSync(join(process.cwd(), ...segments), 'utf8');
}

test('create assessment form marks required fields, wires explicit ids, and disables submit until minimum input exists', () => {
  const source = readSource('components', 'admin', 'admin-assessment-create-form.tsx');

  assert.match(source, /htmlFor="assessment-title"/);
  assert.match(source, /htmlFor="assessment-key"/);
  assert.match(source, /id="assessment-title"/);
  assert.match(source, /id="assessment-key"/);
  assert.match(source, /Required/);
  assert.match(source, /const canCreateAssessment = hasMinimumValidState && assessmentKeyLooksValid;/);
  assert.match(source, /<SubmitButton disabled=\{!canCreateAssessment\} \/>/);
});

test('builder dependency copy names exact prerequisites on questions responses and weights surfaces', () => {
  const questionSource = readSource('components', 'admin', 'admin-question-option-authoring.tsx');
  const weightingSource = readSource('components', 'admin', 'admin-weighting-authoring.tsx');

  assert.match(
    questionSource,
    /Questions depend on question-section domains\. Add at least one domain before authoring questions\./,
  );
  assert.match(
    questionSource,
    /Response options depend on authored questions\. Add at least one question before setting responses\./,
  );
  assert.match(
    weightingSource,
    /Response scoring depends on authored questions first\. Add at least one question, then return here to map weights\./,
  );
  assert.match(
    weightingSource,
    /Weighting depends on response options\. Add options to at least one question before setting scoring\./,
  );
  assert.match(
    weightingSource,
    /Weighting depends on authored signals\. Add signals before setting scoring\./,
  );
});
