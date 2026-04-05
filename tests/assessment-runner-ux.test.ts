import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import {
  getResumeQuestionIndex,
  shouldShowAssessmentIntro,
} from '@/lib/assessment-runner/runner-ux';

const runnerClientPath = join(
  process.cwd(),
  'app',
  '(user)',
  'app',
  'assessments',
  '[assessmentKey]',
  'attempts',
  '[attemptId]',
  'assessment-runner-client.tsx',
);

test('resume opens on the first unanswered question in canonical order', () => {
  const index = getResumeQuestionIndex([
    { selectedOptionId: 'option-1' },
    { selectedOptionId: 'option-2' },
    { selectedOptionId: null },
    { selectedOptionId: null },
  ]);

  assert.equal(index, 2);
});

test('resume falls back to the first question when nothing is answered yet', () => {
  const index = getResumeQuestionIndex([
    { selectedOptionId: null },
    { selectedOptionId: null },
  ]);

  assert.equal(index, 0);
});

test('resume opens on the last question when every question is already answered', () => {
  const index = getResumeQuestionIndex([
    { selectedOptionId: 'option-1' },
    { selectedOptionId: 'option-2' },
    { selectedOptionId: 'option-3' },
  ]);

  assert.equal(index, 2);
});

test('resume prefers the first unanswered question for sparse response patterns', () => {
  const index = getResumeQuestionIndex([
    { selectedOptionId: 'option-1' },
    { selectedOptionId: null },
    { selectedOptionId: 'option-3' },
  ]);

  assert.equal(index, 1);
});

test('fresh attempts with zero saved responses show the intro when published intro content exists', () => {
  const visible = shouldShowAssessmentIntro({
    answeredQuestions: 0,
    assessmentIntro: {
      introTitle: 'Welcome',
    },
  });

  assert.equal(visible, true);
});

test('resumed attempts bypass the intro once saved responses exist', () => {
  const visible = shouldShowAssessmentIntro({
    answeredQuestions: 1,
    assessmentIntro: {
      introTitle: 'Welcome',
    },
  });

  assert.equal(visible, false);
});

test('runner bypasses the intro safely when no published intro content exists', () => {
  const visible = shouldShowAssessmentIntro({
    answeredQuestions: 0,
    assessmentIntro: null,
  });

  assert.equal(visible, false);
});

test('runner client keeps intro and question phases within the same shell and stable hierarchy', () => {
  const source = readFileSync(runnerClientPath, 'utf8');

  assert.match(source, /data-runner-phase="intro"/);
  assert.match(source, /data-runner-phase=\{activePhase\}/);
  assert.match(source, /sonartra-runner-stage overflow-hidden/);
  assert.match(source, /sonartra-runner-stage min-h-\[34rem\]/);
  assert.match(source, /sonartra-runner-support-card/);
  assert.match(source, /RunnerMetaStat label="Questions" value=\{`\$\{totalQuestions\}`\}/);
  assert.match(source, /RunnerMetaStat label="Answered" value=\{`\$\{answeredQuestions\}\/\$\{totalQuestions\}`\}/);
  assert.match(source, /RunnerMetaStat label="Remaining" value=\{`\$\{unansweredQuestions\}`\}/);
  assert.match(source, /RunnerMetaStat label="Progress" value=\{`\$\{completionPercentage\}%`\}/);
});

test('runner client gives question changes and completion feedback a calmer staged treatment', () => {
  const source = readFileSync(runnerClientPath, 'utf8');

  assert.match(source, /key=\{currentQuestion\.questionId\}/);
  assert.match(source, /sonartra-motion-reveal-soft flex min-h-\[30rem\] flex-col justify-between/);
  assert.match(source, /Selection saved automatically\./);
  assert.match(source, /sonartra-runner-completion-card/);
  assert.match(source, /Finalizing/);
  assert.match(source, /sonartra-runner-map-item/);
});
