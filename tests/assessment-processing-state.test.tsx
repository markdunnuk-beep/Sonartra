import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const processingStatePath = join(
  process.cwd(),
  'components',
  'assessment',
  'assessment-processing-state.tsx',
);
const processingPolicyPath = join(
  process.cwd(),
  'lib',
  'assessment',
  'processing-state-policy.ts',
);

test('assessment processing transition uses premium result-preparation copy', () => {
  const source = readFileSync(processingStatePath, 'utf8');

  assert.match(source, /Result preparation/);
  assert.match(source, /Preparing your result/);
  assert.match(source, /Submitting your responses/);
  assert.match(source, /Opening your report/);
  assert.match(source, /Analysing response pattern/);
  assert.match(source, /Building your leadership profile/);
  assert.match(source, /This usually takes a few seconds\./);
  assert.doesNotMatch(source, /Analysing your response patterns/);
  assert.doesNotMatch(source, /Building your behavioural profile/);
});

test('assessment processing transition keeps truthful accessible status semantics', () => {
  const source = readFileSync(processingStatePath, 'utf8');

  assert.match(source, /role="status"/);
  assert.match(source, /aria-live="polite"/);
  assert.match(source, /aria-atomic="true"/);
  assert.match(source, /aria-busy=\{!resolvedReadyHref\}/);
  assert.doesNotMatch(source, /role="progressbar"/);
  assert.doesNotMatch(source, /progressMode="simulated"/);
  assert.doesNotMatch(source, /import \{ AssessmentLoader \}/);
  assert.doesNotMatch(source, /<AssessmentLoader/);
});

test('assessment processing transition uses the decorative Sonartra logo asset', () => {
  const source = readFileSync(processingStatePath, 'utf8');

  assert.match(source, /import Image from 'next\/image';/);
  assert.match(source, /function ResultTransitionLogo\(\)/);
  assert.match(source, /aria-hidden="true"/);
  assert.match(source, /src="\/images\/brand\/sonartra-logo-white\.svg"/);
  assert.match(source, /alt=""/);
  assert.match(source, /width=\{6259\}/);
  assert.match(source, /height=\{1529\}/);
  assert.match(source, /<ResultTransitionLogo \/>/);
  assert.doesNotMatch(source, /function ResultTransitionMark\(\)/);
  assert.doesNotMatch(source, /h-2\.5 w-2\.5 rounded-full/);
});

test('assessment processing long-wait state remains explicit and real-status based', () => {
  const source = readFileSync(processingStatePath, 'utf8');
  const policySource = readFileSync(processingPolicyPath, 'utf8');

  assert.match(policySource, /ASSESSMENT_PROCESSING_LONG_WAIT_MS = 15000/);
  assert.match(source, /This is taking longer than expected/);
  assert.match(source, /Your result is still being prepared/);
  assert.match(source, /real persisted status/);
  assert.match(source, /Back to workspace/);
});
