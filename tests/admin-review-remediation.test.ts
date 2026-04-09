import test from 'node:test';
import assert from 'node:assert/strict';

import { getReviewRemediationAction } from '@/lib/admin/admin-review-remediation';

test('review remediation routes question structure issues to the questions stage', () => {
  assert.deepEqual(
    getReviewRemediationAction('questionsOptions', {
      code: 'missing_questions',
      message: 'Missing questions',
      severity: 'blocking',
    }),
    { label: 'Fix in Questions', slug: 'questions' },
  );
});

test('review remediation routes response option issues to the responses stage', () => {
  assert.deepEqual(
    getReviewRemediationAction('questionsOptions', {
      code: 'questions_without_options',
      message: 'Questions need options',
      severity: 'blocking',
    }),
    { label: 'Fix in Responses', slug: 'responses' },
  );
});

test('review remediation routes application-plan issues to the language stage', () => {
  assert.deepEqual(
    getReviewRemediationAction('applicationPlan', {
      code: 'application_thesis_incomplete',
      message: 'Missing thesis rows',
      severity: 'blocking',
    }),
    { label: 'Fix in Language', slug: 'language' },
  );
});

test('review remediation avoids fake links for non-remediable missing-assessment context', () => {
  assert.equal(
    getReviewRemediationAction('assessmentVersionContext', {
      code: 'assessment_not_found',
      message: 'Missing assessment',
      severity: 'blocking',
    }),
    null,
  );
});
