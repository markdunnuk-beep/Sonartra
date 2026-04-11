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
  const index = getResumeQuestionIndex([{ selectedOptionId: null }, { selectedOptionId: null }]);

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
  assert.match(source, /data-runner-state=\{runnerState\}/);
  assert.match(source, /sonartra-runner-stage overflow-hidden/);
  assert.match(source, /sonartra-runner-stage min-h-\[34rem\]/);
  assert.match(source, /sonartra-runner-support-card/);
  assert.match(source, /RunnerMetaStat label="Questions" value=\{`\$\{totalQuestions\}`\}/);
  assert.match(
    source,
    /\{modeCopy\.navigationLabel\} \{currentQuestionNumber\} of \{totalQuestions\}/,
  );
  assert.match(source, /autosaveStateLabel/);
  assert.match(source, /style=\{\{ width: `\$\{completionPercentage\}%` \}\}/);
  assert.doesNotMatch(source, /RunnerMetaStat label="Answered"/);
  assert.doesNotMatch(source, /RunnerMetaStat label="Remaining"/);
  assert.doesNotMatch(source, /RunnerMetaStat label="Progress"/);
});

test('runner client gives question changes and completion feedback a calmer staged treatment', () => {
  const source = readFileSync(runnerClientPath, 'utf8');

  assert.match(source, /key=\{currentQuestion\.questionId\}/);
  assert.match(
    source,
    /sonartra-motion-reveal-soft flex min-h-\[30rem\] flex-col justify-between space-y-5/,
  );
  assert.match(source, /text-\[2rem\] leading-\[1\.02\] sm:text-\[2\.25rem\] lg:text-\[2\.7rem\]/);
  assert.match(source, /sonartra-runner-completion-card/);
  assert.match(source, /Finalizing/);
  assert.match(source, /sonartra-runner-map-item/);
  assert.doesNotMatch(source, /Selection saved automatically\./);
  assert.doesNotMatch(source, /Every question now has a saved response\./);
  assert.doesNotMatch(source, /Selections save automatically\./);
});

test('runner client derives and logs canonical runner state transitions for development verification', () => {
  const source = readFileSync(runnerClientPath, 'utf8');

  assert.match(source, /const runnerState = getRunnerState\(/);
  assert.match(source, /console\.debug\('\[runner-state\]'/);
  assert.match(source, /runnerState,/);
  assert.match(source, /lifecycleStatus: runner\.status/);
});

test('runner client renders explicit in-progress and review mode messaging from canonical runner state', () => {
  const source = readFileSync(runnerClientPath, 'utf8');

  assert.match(source, /runnerState === 'ANSWERED_AWAITING_SUBMIT'/);
  assert.match(source, /modeLabel: 'Review Mode'/);
  assert.match(source, /modeTitle: 'All questions answered'/);
  assert.match(
    source,
    /Everything is answered\. Review any response before you complete the assessment\./,
  );
  assert.match(source, /You can move through your answers before submitting the assessment\./);
  assert.match(source, /modeLabel: 'In Progress'/);
  assert.match(source, /Answer the current question to keep moving through the assessment\./);
});

test('runner client renders a dedicated completion handoff only for answered-awaiting-submit mode', () => {
  const source = readFileSync(runnerClientPath, 'utf8');

  assert.match(source, /const showReviewHandoff = runnerState === 'ANSWERED_AWAITING_SUBMIT';/);
  assert.match(source, /showReviewHandoff \? \(/);
  assert.match(source, /sonartra-runner-review-handoff/);
  assert.match(source, /Completion checkpoint/);
  assert.match(source, /Ready to complete/);
  assert.match(source, /All questions answered/);
  assert.match(source, /Response set complete/);
  assert.match(source, /Assessment ready to complete/);
  assert.match(source, /Completing the assessment finalises your responses and moves Sonartra/);
  assert.match(source, /moves Sonartra into\s+results preparation\./);
  assert.doesNotMatch(
    source,
    /runnerState === 'IN_PROGRESS'[\s\S]{0,120}sonartra-runner-review-handoff/,
  );
});

test('runner client adjusts navigation and CTA hierarchy for review mode without changing submit action', () => {
  const source = readFileSync(runnerClientPath, 'utf8');

  assert.match(
    source,
    /runnerState === 'ANSWERED_AWAITING_SUBMIT' \? 'Previous Response' : 'Back'/,
  );
  assert.match(
    source,
    /variant:\s+runnerState === 'ANSWERED_AWAITING_SUBMIT' \? 'secondary' : 'primary'/,
  );
  assert.match(source, /modeCopy\.nextLabel/);
  assert.match(
    source,
    /const showFooterCompleteAction = showCompleteAction && !showReviewHandoff;/,
  );
  assert.match(source, /showFooterCompleteAction \? \(/);
  assert.match(source, /'Responses ready for review'/);
  assert.match(source, /'Ready to submit'/);
  assert.match(source, /Review remains available until you choose to complete\./);
  assert.match(source, /'Complete Assessment'/);
  assert.match(source, /onClick=\{handleSubmit\}/);
});

test('runner client adds compact orientation controls for tablet and mobile layouts', () => {
  const source = readFileSync(runnerClientPath, 'utf8');

  assert.match(
    source,
    /const \[compactNavigatorOpen, setCompactNavigatorOpen\] = useState\(false\);/,
  );
  assert.match(source, /data-runner-mobile-nav/);
  assert.match(source, /sticky top-3 z-20 xl:hidden/);
  assert.match(source, /Question Navigator/);
  assert.match(source, /Hide Navigator/);
  assert.match(source, /id="runner-compact-navigator"/);
  assert.match(source, /Jump to any question without leaving the runner\./);
  assert.match(source, /sm:grid-cols-6 md:grid-cols-8/);
  assert.match(source, /setCompactNavigatorOpen\(false\);/);
  assert.match(source, /hidden xl:sticky xl:top-6 xl:block/);
});

test('runner client keeps review completion accessible on smaller screens', () => {
  const source = readFileSync(runnerClientPath, 'utf8');

  assert.match(source, /data-runner-mobile-review-bar/);
  assert.match(source, /sticky bottom-3 z-20 xl:hidden/);
  assert.match(source, /sonartra-runner-mobile-review-bar/);
  assert.match(source, /onClick=\{\(\) => setCompactNavigatorOpen\(true\)\}/);
  assert.match(
    source,
    /<p className="sonartra-type-nav text-white\/82 mt-1">Ready to complete<\/p>/,
  );
  assert.match(source, /Review/);
  assert.match(source, /Complete Assessment/);
});
