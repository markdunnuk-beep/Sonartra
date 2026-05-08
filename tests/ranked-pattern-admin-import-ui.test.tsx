import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const panelSource = readFileSync(
  path.join(process.cwd(), 'components/admin/ranked-pattern-import-panel.tsx'),
  'utf8',
);

const reviewSource = readFileSync(
  path.join(process.cwd(), 'components/admin/single-domain-structural-authoring.tsx'),
  'utf8',
);

const dedicatedWorkflowRouteSource = readFileSync(
  path.join(
    process.cwd(),
    'app',
    '(admin)',
    'admin',
    'assessments',
    'ranked-pattern',
    '[assessmentKey]',
    'workflow',
    'page.tsx',
  ),
  'utf8',
);

const genericReviewSource = readFileSync(
  path.join(
    process.cwd(),
    'app',
    '(admin)',
    'admin',
    'assessments',
    '[assessmentKey]',
    'review',
    'page.tsx',
  ),
  'utf8',
);

test('ranked-pattern import panel exposes draft creation, publish audit, and explicit publish controls', () => {
  assert.match(panelSource, /createRankedPatternDraftVersionAction/);
  assert.match(panelSource, /auditRankedPatternPublishReadinessAction/);
  assert.match(panelSource, /publishRankedPatternVersionAction/);
  assert.match(panelSource, /Workbook file path or package reference/);
  assert.match(panelSource, /Audit package/);
  assert.match(panelSource, /Dry-run import/);
  assert.match(panelSource, /Apply import/);
  assert.match(panelSource, /Create draft version/);
  assert.match(panelSource, /Run publish audit/);
  assert.match(panelSource, /Publish audited draft/);
  assert.match(panelSource, /auditRankedPatternPackageAction\.bind/);
  assert.match(panelSource, /dryRunRankedPatternImportAction\.bind/);
  assert.match(panelSource, /applyRankedPatternImportAction\.bind/);
  assert.match(panelSource, /auditRankedPatternPublishReadinessAction\.bind/);
});

test('ranked-pattern publish control stays disabled until publish audit can publish', () => {
  assert.match(panelSource, /const canPublishFromAudit = publishAuditState\.result\?\.canPublish === true;/);
  assert.match(panelSource, /disabled=\{!hasDraft \|\| !canPublishFromAudit\}/);
  assert.match(panelSource, /Run publish audit and resolve all blocking findings/);
});

test('admin copy keeps versioning and persisted-result boundaries explicit', () => {
  assert.match(panelSource, /Audit and dry-run do not write to the database/);
  assert.match(panelSource, /Publishing affects new attempts only/);
  assert.match(panelSource, /Existing completed results remain tied to their\s+original assessment version and persisted payload/);
  assert.match(panelSource, /Apply import writes package data but does\s+not publish/);
  assert.match(panelSource, /Publish audit is read-only/);
  assert.match(panelSource, /publishing remains a separate explicit action/);
  assert.match(panelSource, /Create or open the next draft version/);
  assert.match(panelSource, /Completed results continue to render from their persisted payload/);
});

test('ranked-pattern import panel displays counts and diagnostics without workbook contents', () => {
  assert.match(panelSource, /Runtime definition planned counts/);
  assert.match(panelSource, /Result-language planned counts/);
  assert.match(panelSource, /Runtime definition applied counts/);
  assert.match(panelSource, /Result-language applied counts/);
  assert.match(panelSource, /Blocking diagnostics/);
  assert.match(panelSource, /Warnings/);
  assert.match(panelSource, /sheetKey/);
  assert.match(panelSource, /rowNumber/);
  assert.doesNotMatch(panelSource, /rawValues/);
  assert.doesNotMatch(panelSource, /sourceValues/);
});

test('ranked-pattern import panel is wired into the dedicated workflow route only', () => {
  assert.match(dedicatedWorkflowRouteSource, /<RankedPatternImportPanel/);
  assert.match(dedicatedWorkflowRouteSource, /assessmentId=\{assessment\.assessmentId\}/);
  assert.match(dedicatedWorkflowRouteSource, /latestDraftVersion=\{assessment\.latestDraftVersion\}/);
  assert.match(dedicatedWorkflowRouteSource, /Ranked-pattern package workflow/);
  assert.match(dedicatedWorkflowRouteSource, /Active ranked-pattern workflow/);
  assert.match(dedicatedWorkflowRouteSource, /does not include the\s+legacy single-domain builder stages/);
  assert.doesNotMatch(reviewSource, /<RankedPatternImportPanel/);
  assert.match(reviewSource, /Open ranked-pattern workflow/);
  assert.match(reviewSource, /Legacy builder page/);
  assert.doesNotMatch(genericReviewSource, /RankedPatternImportPanel/);
});

test('dedicated ranked-pattern workflow route does not render legacy builder scaffold labels', () => {
  assert.doesNotMatch(dedicatedWorkflowRouteSource, /SingleDomainReviewPageContent/);
  assert.doesNotMatch(dedicatedWorkflowRouteSource, /SingleDomainReviewAuthoring/);
  assert.doesNotMatch(dedicatedWorkflowRouteSource, /SingleDomainBuilderStepper/);
  assert.doesNotMatch(dedicatedWorkflowRouteSource, /Review authoring readiness/);
  assert.doesNotMatch(dedicatedWorkflowRouteSource, /Expected pairs/);
  assert.doesNotMatch(dedicatedWorkflowRouteSource, /Derived pairs/);
  assert.doesNotMatch(dedicatedWorkflowRouteSource, /AdminAssessmentPublishForm/);
});

test('ranked-pattern import UI stays assessment agnostic', () => {
  assert.doesNotMatch(panelSource, /flow state/i);
  assert.doesNotMatch(panelSource, /flow_state/i);
  assert.doesNotMatch(panelSource, /operating-style/i);
  assert.doesNotMatch(panelSource, /results_vision/i);
});

test('legacy generic single-domain publish form is not rendered as a ranked-pattern bypass', () => {
  assert.doesNotMatch(reviewSource, /<AdminAssessmentPublishForm/);
  assert.match(reviewSource, /Use the dedicated ranked-pattern workflow page to run publish audit and explicitly publish this draft/);
  assert.doesNotMatch(dedicatedWorkflowRouteSource, /AdminAssessmentPublishForm/);
});
