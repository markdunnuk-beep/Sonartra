import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

function readSource(relativePath: string): string {
  return readFileSync(join(process.cwd(), relativePath), 'utf8');
}

test('/app/support wires the create support request form without admin support surfaces', () => {
  const pageSource = readSource('app/(user)/app/support/page.tsx');

  assert.match(pageSource, /SupportRequestForm/);
  assert.match(pageSource, /Create a support case for a technical issue/);
  assert.match(pageSource, /SUPPORT_REQUEST_CATEGORY_OPTIONS/);
  assert.match(pageSource, /Your support cases/);
  assert.match(pageSource, /No support cases/);
  assert.match(pageSource, /product feedback/i);

  assert.doesNotMatch(pageSource, /listAdminSupportCases|getAdminSupportCase|addAdminSupportReply|addAdminInternalNote/);
  assert.doesNotMatch(pageSource, /sendEmail|smtp|resend|postmark|zendesk|intercom|freshdesk|MCP|SLA/i);
  assert.doesNotMatch(pageSource, /canonical_result_payload|optionSignalWeights|scoreAssessment|normalizeScores/);
});

test('support request form exposes category options, labels, validation, and success state', () => {
  const formSource = readSource('components/user/support-request-form.tsx');
  const actionSource = readSource('lib/server/support-request-actions.ts');
  const stateSource = readSource('lib/support/support-request-action-state.ts');

  assert.match(formSource, /useActionState/);
  assert.match(formSource, /createSupportRequestAction/);
  assert.match(formSource, /htmlFor="support-category"/);
  assert.match(formSource, /htmlFor="support-subject"/);
  assert.match(formSource, /htmlFor="support-description"/);
  assert.match(formSource, /aria-invalid/);
  assert.match(formSource, /aria-describedby/);
  assert.match(formSource, /role="alert"/);
  assert.match(formSource, /role="status"/);
  assert.match(formSource, /This is not live chat/);

  for (const label of [
    'Technical issue',
    'Account support',
    'Billing or access',
    'Product feedback',
    'General question',
  ]) {
    assert.match(stateSource, new RegExp(label));
  }

  assert.match(actionSource, /createSupportCase/);
  assert.match(actionSource, /Choose a support category/);
  assert.match(actionSource, /Choose a valid support category/);
  assert.match(actionSource, /Add a short subject/);
  assert.match(actionSource, /Describe what you need help with/);
  assert.match(actionSource, /Support request \$\{createdCase\.publicReference\} created\./);

  assert.doesNotMatch(formSource, /listAdminSupportCases|getAdminSupportCase|addAdminSupportReply|addAdminInternalNote/);
  assert.doesNotMatch(actionSource, /sendEmail|smtp|resend|postmark|zendesk|intercom|freshdesk|MCP|SLA/i);
});
