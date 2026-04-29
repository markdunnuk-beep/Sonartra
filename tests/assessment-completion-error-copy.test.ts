import test from 'node:test';
import assert from 'node:assert/strict';

import {
  ASSESSMENT_COMPLETION_SAFE_ERROR_MESSAGE,
  getAssessmentCompletionSafeErrorMessage,
} from '@/lib/assessment/completion-error-copy';

test('assessment completion error copy does not expose internal diagnostics', () => {
  const unsafeDiagnostics = [
    'Missing canonical HERO_PAIRS row for pair "results_vision" (row missing for canonical pair_key).',
    'single_domain_application_full_pattern_missing; assessment_version_id=version-1; pattern_key=results_vision_people_process',
    'assessment_version_single_domain_application_statements unique constraint failed',
  ];

  unsafeDiagnostics.forEach((diagnostic) => {
    const message = getAssessmentCompletionSafeErrorMessage(diagnostic);

    assert.equal(message, ASSESSMENT_COMPLETION_SAFE_ERROR_MESSAGE);
    assert.doesNotMatch(message, /Missing canonical|row missing|assessment_version|pattern_key|pair_key/i);
  });
});
