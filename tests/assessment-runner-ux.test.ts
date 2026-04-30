import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import {
  getDistinctSecondaryPromptText,
  normalizePromptText,
} from '@/lib/assessment-runner/runner-prompt-copy';
import { getResumeQuestionIndex } from '@/lib/assessment-runner/runner-ux';

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

test('runner client keeps the question and completion phases within the same shell and stable hierarchy', () => {
  const source = readFileSync(runnerClientPath, 'utf8');

  assert.match(source, /data-runner-phase=\{completionState !== 'idle' \? 'completion' : 'question'\}/);
  assert.match(source, /data-runner-state=\{runnerState\}/);
  assert.match(source, /sonartra-type-section-title max-w-\[34rem\]/);
  assert.match(source, /xl:whitespace-nowrap/);
  assert.match(source, /\{runner\.assessmentTitle\}/);
  assert.doesNotMatch(source, /<p className="sonartra-type-eyebrow text-white\/42">Assessment runner<\/p>/);
  assert.match(source, /sonartra-runner-stage min-h-\[34rem\]/);
  assert.match(source, /sonartra-runner-support-card/);
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
  assert.match(source, /Completion status/);
  assert.match(source, /sonartra-runner-map-item/);
  assert.match(
    source,
    /Choose the response that best reflects your usual approach\. Your answers save automatically\./,
  );
  assert.doesNotMatch(source, /Work through each question in order\. Responses save automatically as you go\./);
  assert.doesNotMatch(source, /Answer the current question to keep moving through the assessment\./);
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

test('runner client uses canonical autosave and completion status messaging', () => {
  const source = readFileSync(runnerClientPath, 'utf8');

  assert.match(source, /return 'Submitting responses';/);
  assert.match(source, /return 'Needs attention';/);
  assert.match(source, /return 'Saving response';/);
  assert.match(source, /return 'Responses saved';/);
  assert.match(source, /Completion status/);
  assert.doesNotMatch(source, /return 'Locked';/);
  assert.doesNotMatch(source, /return 'Save issue';/);
  assert.doesNotMatch(source, /return 'Saving';/);
  assert.doesNotMatch(source, /return 'Saved';/);
});

test('runner prompt helper suppresses duplicate and punctuation-only repeated question text', () => {
  const heading = 'When leading a team, what do you focus on most?';

  assert.equal(
    normalizePromptText('  When leading a team,\nwhat do you focus on most???  '),
    'when leading a team, what do you focus on most',
  );
  assert.equal(
    getDistinctSecondaryPromptText({
      heading,
      secondary: 'when leading a team, what do you focus on most.',
    }),
    null,
  );
});

test('runner prompt helper keeps distinct authored guidance and explanations', () => {
  assert.equal(
    getDistinctSecondaryPromptText({
      heading: 'When leading a team, what do you focus on most?',
      secondary: 'Choose the response that best reflects your usual approach.',
    }),
    'Choose the response that best reflects your usual approach.',
  );
  assert.equal(
    getDistinctSecondaryPromptText({
      heading: 'When leading a team, what do you focus on most?',
      secondary: 'Think about the pattern you return to when pressure rises.',
    }),
    'Think about the pattern you return to when pressure rises.',
  );
});

test('runner client keeps the question area focused without hiding options or status', () => {
  const source = readFileSync(runnerClientPath, 'utf8');

  assert.match(source, /<legend className="sr-only">Response options<\/legend>/);
  assert.doesNotMatch(source, /<legend className="sr-only">\{currentQuestion\.prompt\}<\/legend>/);
  assert.doesNotMatch(source, /const questionHelperText = getDistinctSecondaryPromptText\(/);
  assert.match(source, /currentQuestion\.options\.map/);
  assert.match(source, /autosaveStateLabel/);
  assert.match(source, /completionPercentage/);
});

test('runner client renders explicit in-progress and review mode messaging from canonical runner state', () => {
  const source = readFileSync(runnerClientPath, 'utf8');

  assert.match(source, /runnerState === 'ANSWERED_AWAITING_SUBMIT'/);
  assert.match(source, /modeLabel: 'Review Mode'/);
  assert.match(source, /modeTitle: 'Review your answers'/);
  assert.match(
    source,
    /Every response is saved\. Review anything you want to change before completing\./,
  );
  assert.match(source, /Review anything you want to change before completing\./);
  assert.match(source, /modeLabel: 'In Progress'/);
  assert.match(source, /RUNNER_GUIDANCE_COPY/);
});

test('runner client removes repeated chrome from the page header and progress card', () => {
  const source = readFileSync(runnerClientPath, 'utf8');

  assert.doesNotMatch(source, /<span>Assessment Runner<\/span>/);
  assert.doesNotMatch(source, /<span className="text-white\/22">\/<\/span>/);
  assert.doesNotMatch(source, /<span>\{runner\.assessmentTitle\}<\/span>/);
  assert.match(source, /<h1[\s\S]*\{runner\.assessmentTitle\}[\s\S]*<\/h1>/);
  assert.match(source, /modeCopy\.modeLabel/);
  assert.match(source, /modeCopy\.navigationLabel/);
  assert.match(source, /autosaveStateLabel/);
  assert.match(source, /completionPercentage/);
});

test('runner client renders a simplified completion handoff only for answered-awaiting-submit mode', () => {
  const source = readFileSync(runnerClientPath, 'utf8');

  assert.match(source, /const showReviewHandoff = runnerState === 'ANSWERED_AWAITING_SUBMIT';/);
  assert.match(source, /showReviewHandoff \? \(/);
  assert.match(source, /sonartra-runner-review-handoff/);
  assert.match(source, /Ready to complete/);
  assert.match(
    source,
    /All \{totalQuestions\} responses are saved\. You can still review any answer\s+before submitting\./,
  );
  assert.match(source, /Your result will be generated after submission\./);
  assert.match(source, /Complete Assessment/);
  assert.match(source, /disabled=\{!canSubmit\}/);
  assert.doesNotMatch(source, /Completion checkpoint/);
  assert.doesNotMatch(source, /All questions answered/);
  assert.doesNotMatch(source, /Response set complete/);
  assert.doesNotMatch(source, /Assessment ready to complete/);
  assert.doesNotMatch(source, /Completing the assessment finalises/);
  assert.doesNotMatch(source, /Review remains available until/);
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
  assert.match(source, /Previous Response/);
  assert.match(source, /Complete Assessment/);
  assert.match(source, /onClick=\{handleSubmit\}/);
});

test('runner client hardens semantic structure and navigator accessibility labels', () => {
  const source = readFileSync(runnerClientPath, 'utf8');

  assert.match(source, /aria-labelledby="runner-question-title"/);
  assert.match(source, /id="runner-question-title"/);
  assert.match(source, /<fieldset className="grid gap-3">/);
  assert.match(source, /<legend className="sr-only">Response options<\/legend>/);
  assert.doesNotMatch(source, /<legend className="sr-only">\{currentQuestion\.prompt\}<\/legend>/);
  assert.match(source, /type="radio"/);
  assert.match(source, /name=\{`question-\$\{currentQuestion\.questionId\}`\}/);
  assert.match(source, /checked=\{selected\}/);
  assert.match(source, /onChange=\{\(\) => handleSelect\(currentQuestion\.questionId, option\.optionId\)\}/);
  assert.match(source, /className="peer sr-only"/);
  assert.doesNotMatch(source, /role="radiogroup"/);
  assert.doesNotMatch(source, /role="radio"/);
  assert.doesNotMatch(source, /aria-checked=\{selected\}/);
  assert.match(source, /aria-label="Question navigator"/);
  assert.match(source, /aria-label="Question navigator sheet"/);
  assert.match(source, /aria-label="Review completion actions"/);
  assert.match(source, /Jump to question/);
  assert.match(source, /aria-live="polite"/);
});

test('runner client preserves premium answer-card treatment around hidden native radios', () => {
  const source = readFileSync(runnerClientPath, 'utf8');

  assert.match(source, /<label key=\{option\.optionId\} htmlFor=\{optionInputId\} className="block">/);
  assert.match(
    source,
    /sonartra-motion-choice sonartra-runner-option block rounded-\[1\.15rem\] border px-5 py-4 text-left transition peer-focus-visible:ring-2 peer-focus-visible:ring-white\/55 peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-neutral-950/,
  );
  assert.match(
    source,
    /ring-white\/12 border-white\/85 bg-\[linear-gradient\(180deg,rgba\(255,255,255,0\.98\),rgba\(244,247,255,0\.94\)\)\] text-neutral-950 shadow-\[0_18px_38px_rgba\(255,255,255,0\.08\)\] ring-1/,
  );
  assert.match(source, /hover:border-white\/24 border-white\/10 bg-white\/\[0\.03\] text-white hover:bg-white\/\[0\.055\]/);
  assert.match(source, /interactionLocked && 'cursor-not-allowed opacity-70'/);
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
  assert.match(source, /Open question navigator/);
  assert.match(source, /Hide question navigator/);
  assert.match(source, /Jump to any question without leaving the runner\./);
  assert.match(source, /sm:grid-cols-6 md:grid-cols-8/);
  assert.match(source, /rounded-\[1\.15rem\] border border-white\/8 bg-neutral-950\/72/);
  assert.match(source, /rounded-lg border px-2 py-2 text-center/);
  assert.match(source, /setCompactNavigatorOpen\(false\);/);
  assert.match(source, /hidden xl:sticky xl:top-6 xl:block/);
});

test('runner client keeps review completion accessible on smaller screens', () => {
  const source = readFileSync(runnerClientPath, 'utf8');

  assert.match(source, /data-runner-mobile-review-bar/);
  assert.match(source, /sticky bottom-3 z-20 xl:hidden/);
  assert.match(source, /sonartra-runner-mobile-review-bar/);
  assert.match(source, /onClick=\{\(\) => setCompactNavigatorOpen\(true\)\}/);
  assert.match(source, /Open question navigator to review responses/);
  assert.match(
    source,
    /<p className="sonartra-type-nav text-white\/82 mt-1">Ready to complete<\/p>/,
  );
  assert.match(source, /Review/);
  assert.match(source, /Complete Assessment/);
});
