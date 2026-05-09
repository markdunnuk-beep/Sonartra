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

const packageFirstWorkflowRouteSource = readFileSync(
  path.join(
    process.cwd(),
    'app',
    '(admin)',
    'admin',
    'assessments',
    'ranked-pattern',
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

test('ranked-pattern import panel exposes package draft resolution, publish audit, and explicit publish controls', () => {
  assert.match(panelSource, /uploadRankedPatternWorkbookPackageAction/);
  assert.match(panelSource, /createRankedPatternPackageDraftVersionAction/);
  assert.match(panelSource, /auditRankedPatternPublishReadinessAction/);
  assert.match(panelSource, /publishRankedPatternVersionAction/);
  assert.match(panelSource, /Existing package reference or local path/);
  assert.match(panelSource, /Upload assessment workbook/);
  assert.match(panelSource, /Upload workbook/);
  assert.match(panelSource, /Use uploaded workbook/);
  assert.match(panelSource, /Check workbook/);
  assert.match(panelSource, /Preview import/);
  assert.match(panelSource, /Import to draft/);
  assert.match(panelSource, /Create draft/);
  assert.match(panelSource, /Check publish readiness/);
  assert.match(panelSource, /Publish assessment/);
  assert.match(panelSource, /auditRankedPatternPackageAction\.bind/);
  assert.match(panelSource, /dryRunRankedPatternImportAction\.bind/);
  assert.match(panelSource, /applyRankedPatternImportAction\.bind/);
  assert.match(panelSource, /auditRankedPatternPublishReadinessAction\.bind/);
  assert.match(panelSource, /targetAssessmentId/);
  assert.match(panelSource, /targetAssessmentVersionId/);
});

test('ranked-pattern publish control stays disabled until publish audit can publish', () => {
  assert.match(panelSource, /const canPublishFromAudit = publishAuditState\.result\?\.canPublish === true;/);
  assert.match(panelSource, /disabled=\{!hasDraft \|\| !canPublishFromAudit\}/);
  assert.match(panelSource, /Check publish readiness and resolve all blocking findings/);
});

test('existing draft state is passive and does not render create draft as loading control', () => {
  assert.match(panelSource, /function PassiveDraftStatus/);
  assert.match(panelSource, /data-ranked-pattern-existing-draft-status="true"/);
  assert.match(panelSource, /Using draft \{latestDraftVersion\.versionTag\}/);
  assert.match(panelSource, /Draft version already exists/);
  assert.match(panelSource, /This workflow will continue with/);
  assert.match(panelSource, /resolvedDraft \? \(/);
  assert.match(panelSource, /<PassiveDraftStatus latestDraftVersion=\{resolvedDraft\} \/>/);
  assert.match(panelSource, /cursor-not-allowed/);
  assert.match(panelSource, /pending\s+\?\s+'cursor-wait/);
  assert.doesNotMatch(panelSource, /disabled=\{hasDraft\}/);
});

test('workbook source field exposes upload metadata and local fallback affordances', () => {
  assert.match(panelSource, /function WorkbookUploadResultBlock/);
  assert.match(panelSource, /Uploaded/);
  assert.match(panelSource, /Selected workbook/);
  assert.match(panelSource, /No workbook selected/);
  assert.match(panelSource, /formatFileSize/);
  assert.match(panelSource, /shortSourceHash/);
  assert.match(panelSource, /Private storage reference:/);
  assert.match(panelSource, /Private file - no public link is created/);
  assert.match(panelSource, /runtime\s+result pages read database rows after import/);
  assert.match(panelSource, /function SourcePathPreview/);
  assert.match(panelSource, /sourcePathFileName/);
  assert.match(panelSource, /title=\{sourcePath\}/);
  assert.match(panelSource, /Selected package:/);
  assert.match(panelSource, /Advanced: use existing package reference/);
  assert.match(panelSource, /Advanced \/ development only/);
  assert.match(panelSource, /Use existing reference/);
  assert.match(panelSource, /Existing reference selected/);
  assert.match(panelSource, /private storage and never exposes a public workbook URL/);
  assert.doesNotMatch(panelSource, /publicUrl/);
});

test('ranked-pattern upload source can be cleared or replaced without ambiguous active source state', () => {
  assert.match(panelSource, /clearedUploadToken/);
  assert.match(panelSource, /Remove workbook/);
  assert.match(panelSource, /The uploaded workbook was removed from this form/);
  assert.match(panelSource, /To replace the workbook, choose another \.xlsx file/);
  assert.match(panelSource, /uploadedSourceAvailable/);
  assert.match(panelSource, /uploadedSourceSelected/);
  assert.match(panelSource, /manualSourceSelected/);
  assert.match(panelSource, /workflowStorageReferenceToken/);
});

test('ranked-pattern workflow presents a guided stepper and recommended next action', () => {
  assert.match(panelSource, /function WorkflowStepper/);
  assert.match(panelSource, /Import workflow steps/);
  assert.match(panelSource, /Upload workbook/);
  assert.match(panelSource, /Check workbook/);
  assert.match(panelSource, /Create draft/);
  assert.match(panelSource, /Preview import/);
  assert.match(panelSource, /Import/);
  assert.match(panelSource, /Publish/);
  assert.match(panelSource, /Recommended next step/);
  assert.match(panelSource, /Upload a completed assessment workbook/);
  assert.match(panelSource, /Accepted: \.xlsx up to 10 MB/);
  assert.doesNotMatch(panelSource, /storage_object/);
});

test('admin copy keeps versioning and persisted-result boundaries explicit', () => {
  assert.match(panelSource, /Checking and previewing the\s+workbook do not change live assessments/);
  assert.match(panelSource, /Publishing affects new\s+attempts only/);
  assert.match(panelSource, /completed results remain tied to their original assessment version\s+and persisted payload/);
  assert.match(panelSource, /Import writes to draft only/);
  assert.match(panelSource, /Nothing is published until you choose Publish assessment/);
  assert.match(panelSource, /Create the compatible draft version from workbook metadata/);
  assert.match(panelSource, /Completed results continue to render from their persisted payload/);
});

test('ranked-pattern import panel displays counts and diagnostics without workbook contents', () => {
  assert.match(panelSource, /Assessment key/);
  assert.match(panelSource, /Package version/);
  assert.match(panelSource, /Domain key/);
  assert.match(panelSource, /Assessment title/);
  assert.match(panelSource, /Assessment structure preview/);
  assert.match(panelSource, /Result content preview/);
  assert.match(panelSource, /Assessment structure imported/);
  assert.match(panelSource, /Result content imported/);
  assert.match(panelSource, /Blocking diagnostics/);
  assert.match(panelSource, /Warnings/);
  assert.match(panelSource, /sheetKey/);
  assert.match(panelSource, /rowNumber/);
  assert.doesNotMatch(panelSource, /rawValues/);
  assert.doesNotMatch(panelSource, /sourceValues/);
});

test('ranked-pattern import panel is wired into the dedicated workflow route only', () => {
  assert.match(packageFirstWorkflowRouteSource, /<RankedPatternImportPanel latestDraftVersion=\{null\} \/>/);
  assert.match(packageFirstWorkflowRouteSource, /Import ranked-pattern assessment/);
  assert.match(packageFirstWorkflowRouteSource, /No assessment record required/);
  assert.match(dedicatedWorkflowRouteSource, /<RankedPatternImportPanel/);
  assert.match(dedicatedWorkflowRouteSource, /assessmentId=\{assessment\.assessmentId\}/);
  assert.match(dedicatedWorkflowRouteSource, /latestDraftVersion=\{assessment\.latestDraftVersion\}/);
  assert.match(dedicatedWorkflowRouteSource, /Ranked-pattern package workflow/);
  assert.match(dedicatedWorkflowRouteSource, /Active ranked-pattern workflow/);
  assert.match(dedicatedWorkflowRouteSource, /Legacy assessment record/);
  assert.match(dedicatedWorkflowRouteSource, /Start package-first workflow/);
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
