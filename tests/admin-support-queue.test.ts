import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import {
  formatAdminSupportStatus,
  parseSupportCategoryFilter,
} from '@/lib/support/support-display';

function readSource(...segments: string[]): string {
  return readFileSync(join(process.cwd(), ...segments), 'utf8');
}

test('admin support queue route uses admin shell protection and support service only', () => {
  const pageSource = readSource('app', '(admin)', 'admin', 'support', 'page.tsx');
  const layoutSource = readSource('app', '(admin)', 'layout.tsx');

  assert.match(pageSource, /listAdminSupportCases/);
  assert.match(pageSource, /AdminSupportPage/);
  assert.match(pageSource, /Support queue/);
  assert.match(pageSource, /Review support requests, check status, and open cases that need a response/);
  assert.match(pageSource, /Queue controls/);
  assert.match(pageSource, /All support cases/);
  assert.match(layoutSource, /requireAdminRequestUserContext/);
  assert.doesNotMatch(pageSource, /@clerk\/nextjs|currentUser\(|auth\(/);
  assert.doesNotMatch(pageSource, /getCurrentUserSupportCase|listCurrentUserSupportCases|createSupportCase/);
  assert.doesNotMatch(pageSource, /addAdminSupportReply|addAdminInternalNote|updateAdminSupportCaseStatus|updateAdminSupportCasePriority/);
});

test('admin support queue renders case metadata and filters without task 07 controls', () => {
  const pageSource = readSource('app', '(admin)', 'admin', 'support', 'page.tsx');
  const displaySource = readSource('lib', 'support', 'support-display.ts');
  const requestStateSource = readSource('lib', 'support', 'support-request-action-state.ts');
  const navSource = readSource('components', 'admin', 'admin-shell-nav.ts');

  assert.match(pageSource, /publicReference/);
  assert.match(pageSource, /subject/);
  assert.match(pageSource, /userEmail/);
  assert.match(pageSource, /userName/);
  assert.match(pageSource, /formatSupportCategory/);
  assert.match(pageSource, /formatAdminSupportStatus/);
  assert.match(pageSource, /formatSupportPriority/);
  assert.match(pageSource, /formatSupportDate\(supportCase\.createdAt\)/);
  assert.match(pageSource, /formatSupportDate\(supportCase\.updatedAt\)/);
  assert.match(pageSource, /latestMessagePreview/);
  assert.match(pageSource, /href=\{buildAdminCaseHref\(supportCase\.publicReference\)\}/);
  assert.match(pageSource, /\/admin\/support\/\$\{publicReference\}/);
  assert.match(pageSource, /name="status"/);
  assert.match(pageSource, /name="category"/);
  assert.match(pageSource, /name="priority"/);
  assert.match(pageSource, /Support cases could not be loaded/);
  assert.match(pageSource, /No support cases yet/);
  assert.match(pageSource, /New customer requests will appear here/);
  assert.match(pageSource, /Scan customer requests and open the cases that need action/);
  assert.match(navSource, /key: 'support'/);
  assert.match(navSource, /href: '\/admin\/support'/);

  for (const label of [
    'Technical issue',
    'Account support',
    'Billing or access',
    'Product feedback',
    'General question',
    'Waiting on user',
    'Urgent',
  ]) {
    assert.match(`${pageSource}\n${displaySource}\n${requestStateSource}`, new RegExp(label));
  }

  assert.doesNotMatch(pageSource, /Send reply|Add a reply|internal note|Change status|Change priority/i);
  assert.doesNotMatch(pageSource, /next support task|without entering the admin reply workflow/i);
  assert.doesNotMatch(pageSource, /sendEmail|smtp|resend|postmark|zendesk|intercom|freshdesk|MCP|SLA/i);
  assert.doesNotMatch(pageSource, /canonical_result_payload|optionSignalWeights|scoreAssessment|normalizeScores/);
});

test('admin support queue filter helpers accept controlled values only', () => {
  assert.equal(formatAdminSupportStatus('waiting_on_user'), 'Waiting on user');
  assert.equal(parseSupportCategoryFilter('technical_issue'), 'technical_issue');
  assert.equal(parseSupportCategoryFilter('not_a_category'), undefined);
});
