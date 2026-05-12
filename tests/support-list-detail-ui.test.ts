import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import {
  formatSupportAuthorType,
  formatSupportCategory,
  formatSupportPriority,
  formatSupportStatus,
  parseSupportPriorityFilter,
  parseSupportStatusFilter,
} from '@/lib/support/support-display';

function readSource(relativePath: string): string {
  return readFileSync(join(process.cwd(), relativePath), 'utf8');
}

test('/app/support lists current user cases through the support service', () => {
  const pageSource = readSource('app/(user)/app/support/page.tsx');

  assert.match(pageSource, /listCurrentUserSupportCases/);
  assert.match(pageSource, /CaseList/);
  assert.match(pageSource, /publicReference/);
  assert.match(pageSource, /latestMessagePreview/);
  assert.match(pageSource, /href=\{`\/app\/support\/\$\{supportCase\.publicReference\}`\}/);
  assert.match(pageSource, /formatSupportCategory/);
  assert.match(pageSource, /formatSupportStatus/);
  assert.match(pageSource, /formatSupportPriority/);
  assert.match(pageSource, /formatSupportDate/);
  assert.match(pageSource, /Apply filters/);
  assert.match(pageSource, /No support cases yet/);
  assert.match(pageSource, /Support cases could not be loaded/);

  assert.doesNotMatch(pageSource, /caseId|supportCase\.id|raw database/i);
  assert.doesNotMatch(pageSource, /addCurrentUserSupportMessage|reply composer/i);
  assert.doesNotMatch(pageSource, /Status model|Lifecycle|Request categories|Support category cards/);
  assert.doesNotMatch(pageSource, /Search support cases/);
  assert.doesNotMatch(pageSource, /listAdminSupportCases|getAdminSupportCase|addAdminSupportReply|addAdminInternalNote/);
  assert.doesNotMatch(pageSource, /sendEmail|smtp|resend|postmark|zendesk|intercom|freshdesk|MCP|SLA/i);
  assert.doesNotMatch(pageSource, /canonical_result_payload|optionSignalWeights|scoreAssessment|normalizeScores/);
});

test('/app/support/[caseReference] renders detail metadata and public message thread only', () => {
  const detailSource = readSource('app/(user)/app/support/[caseReference]/page.tsx');
  const errorSource = readSource('app/(user)/app/support/error.tsx');
  const replyFormSource = readSource('components/user/support-reply-form.tsx');

  assert.match(detailSource, /getCurrentUserSupportCase/);
  assert.match(detailSource, /caseReference/);
  assert.match(detailSource, /notFound\(\)/);
  assert.match(detailSource, /supportCase\.publicReference/);
  assert.match(detailSource, /supportCase\.subject/);
  assert.match(detailSource, /formatSupportCategory/);
  assert.match(detailSource, /formatSupportStatus/);
  assert.match(detailSource, /formatSupportPriority/);
  assert.match(detailSource, /supportCase\.resolvedAt/);
  assert.match(detailSource, /supportCase\.closedAt/);
  assert.match(detailSource, /Support case public message thread/);
  assert.match(detailSource, /formatSupportAuthorType\(message\.authorType\)/);
  assert.match(detailSource, /message\.body/);
  assert.match(detailSource, /Back to support/);
  assert.match(detailSource, /SupportReplyForm/);
  assert.match(detailSource, /supportCase\.status === 'closed'/);
  assert.match(detailSource, /This support request is closed/);
  assert.match(detailSource, /Create a new request if you need more help/);
  assert.match(replyFormSource, /Add a reply/);
  assert.match(replyFormSource, /Send reply/);
  assert.match(replyFormSource, /caseReference/);
  assert.match(replyFormSource, /addSupportReplyAction/);
  assert.match(errorSource, /Support case could not be loaded/);
  assert.match(errorSource, /No technical error details\s+are shown here/);

  assert.doesNotMatch(detailSource, /isInternalNote|includeInternalNotes|addCurrentUserSupportMessage/);
  assert.doesNotMatch(replyFormSource, /isInternalNote|includeInternalNotes|admin/i);
  assert.doesNotMatch(errorSource, /error\.message|error\.stack|digest/);
  assert.doesNotMatch(detailSource, /listAdminSupportCases|getAdminSupportCase|addAdminSupportReply|addAdminInternalNote/);
  assert.doesNotMatch(detailSource, /sendEmail|smtp|resend|postmark|zendesk|intercom|freshdesk|MCP|SLA/i);
  assert.doesNotMatch(detailSource, /canonical_result_payload|optionSignalWeights|scoreAssessment|normalizeScores/);
});

test('support display helpers map controlled values for list and detail views', () => {
  assert.equal(formatSupportCategory('technical_issue'), 'Technical issue');
  assert.equal(formatSupportCategory('feedback'), 'Product feedback');
  assert.equal(formatSupportStatus('waiting_on_user'), 'Waiting on you');
  assert.equal(formatSupportPriority('urgent'), 'Urgent');
  assert.equal(formatSupportAuthorType('user'), 'You');
  assert.equal(formatSupportAuthorType('admin'), 'Sonartra support');
  assert.equal(formatSupportAuthorType('system'), 'System');
  assert.equal(parseSupportStatusFilter('closed'), 'closed');
  assert.equal(parseSupportStatusFilter('not_a_status'), undefined);
  assert.equal(parseSupportPriorityFilter('high'), 'high');
  assert.equal(parseSupportPriorityFilter('not_a_priority'), undefined);
});
