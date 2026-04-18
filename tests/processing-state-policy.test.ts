import test from 'node:test';
import assert from 'node:assert/strict';

import {
  ASSESSMENT_PROCESSING_LONG_WAIT_MS,
  ASSESSMENT_PROCESSING_STATUS_FAILURE_RETRY_LIMIT,
  hasAssessmentProcessingStatusCheckFailed,
  isAssessmentProcessingLongWait,
} from '@/lib/assessment/processing-state-policy';

test('processing long-wait notice stays hidden before the threshold and appears at the threshold', () => {
  assert.equal(isAssessmentProcessingLongWait(ASSESSMENT_PROCESSING_LONG_WAIT_MS - 1), false);
  assert.equal(isAssessmentProcessingLongWait(ASSESSMENT_PROCESSING_LONG_WAIT_MS), true);
});

test('processing status failures only become terminal after the retry limit is reached', () => {
  assert.equal(
    hasAssessmentProcessingStatusCheckFailed(
      ASSESSMENT_PROCESSING_STATUS_FAILURE_RETRY_LIMIT - 1,
    ),
    false,
  );
  assert.equal(
    hasAssessmentProcessingStatusCheckFailed(
      ASSESSMENT_PROCESSING_STATUS_FAILURE_RETRY_LIMIT,
    ),
    true,
  );
});
