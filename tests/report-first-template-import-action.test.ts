import assert from 'node:assert/strict';
import test from 'node:test';

import {
  importReportFirstTemplatesActionWithDependencies,
  promoteReportFirstTemplatesActionWithDependencies,
} from '@/lib/server/ranked-pattern-admin-import-workflow-actions';
import type {
  ReportFirstTemplateImportSummary,
  ReportFirstTemplatePromotionSummary,
} from '@/lib/server/report-first-template-import';

const baseSummary: ReportFirstTemplateImportSummary = {
  expectedTemplateCount: 24,
  importedTemplateCount: 24,
  missingTemplateCount: 0,
  skippedTemplateCount: 0,
  publishableFullCoverage: true,
  importedPatternKeys: [
    'people_process_results_vision',
    'people_process_vision_results',
    'people_results_process_vision',
    'people_results_vision_process',
    'people_vision_process_results',
    'people_vision_results_process',
    'process_people_results_vision',
    'process_people_vision_results',
    'process_results_people_vision',
    'process_results_vision_people',
    'process_vision_people_results',
    'process_vision_results_people',
    'results_people_process_vision',
    'results_people_vision_process',
    'results_process_people_vision',
    'results_process_vision_people',
    'results_vision_people_process',
    'results_vision_process_people',
    'vision_people_process_results',
    'vision_people_results_process',
    'vision_process_people_results',
    'vision_process_results_people',
    'vision_results_people_process',
    'vision_results_process_people',
  ],
  missingPatternKeys: [],
  auditFindings: [],
  storedTemplates: [],
};

function dependencies(overrides: {
  readonly importReportFirstTemplates?: (input: {
    readonly assessmentKey: string;
    readonly assessmentVersionId: string;
  }) => Promise<ReportFirstTemplateImportSummary>;
  readonly promoteReportFirstTemplates?: (input: {
    readonly assessmentVersionId: string;
  }) => Promise<ReportFirstTemplatePromotionSummary>;
  readonly revalidated?: string[];
} = {}) {
  const revalidated = overrides.revalidated ?? [];
  return {
    requireAdminUser: async () => ({
      userId: 'admin-user-1',
      clerkUserId: 'clerk-admin',
      userEmail: 'admin@example.com',
      userName: 'Admin',
      userRole: 'admin' as const,
      userStatus: 'active' as const,
      isAdmin: true,
    }),
    getDbPool: () => ({ query: async () => ({ rows: [] }) }),
    auditWorkbook: async () => {
      throw new Error('not used');
    },
    dryRunImport: async () => {
      throw new Error('not used');
    },
    applyImport: async () => {
      throw new Error('not used');
    },
    auditPublishReadiness: async () => {
      throw new Error('not used');
    },
    importReportFirstTemplates: async (input: { readonly assessmentKey: string; readonly assessmentVersionId: string }) =>
      overrides.importReportFirstTemplates?.(input) ?? baseSummary,
    promoteReportFirstTemplates: async (input: { readonly assessmentVersionId: string }) =>
      overrides.promoteReportFirstTemplates?.(input) ?? {
        expectedTemplateCount: 24,
        promotedTemplateCount: 24,
        activeTemplateCount: 24,
        missingTemplateCount: 0,
        publishableFullCoverage: true,
        promotedPatternKeys: baseSummary.importedPatternKeys,
        activePatternKeys: baseSummary.importedPatternKeys,
        auditFindings: [],
        status: 'promoted' as const,
      },
    revalidatePath: (path: string) => {
      revalidated.push(path);
    },
  };
}

test('report-first template import action imports rows for selected draft version', async () => {
  const revalidated: string[] = [];
  const seen: { assessmentKey: string; assessmentVersionId: string }[] = [];
  const result = await importReportFirstTemplatesActionWithDependencies(
    {
      assessmentKey: 'leadership-approach',
      targetAssessmentVersionId: 'draft-version-1',
    },
    dependencies({
      revalidated,
      importReportFirstTemplates: async (input) => {
        seen.push(input);
        return baseSummary;
      },
    }),
  );

  assert.equal(result.ok, true);
  assert.equal(result.result?.importedTemplateCount, 24);
  assert.equal(result.result?.missingTemplateCount, 0);
  assert.equal(result.result?.publishableFullCoverage, true);
  assert.match(result.formSuccess ?? '', /Imported 24 report-first template rows/);
  assert.match(result.formSuccess ?? '', /Generated report-first coverage is complete/);
  assert.match(result.formSuccess ?? '', /publish audit still checks active DB template rows/);
  assert.equal(seen[0]?.assessmentKey, 'leadership-approach');
  assert.equal(seen[0]?.assessmentVersionId, 'draft-version-1');
  assert.ok(revalidated.includes('/admin/assessments/ranked-pattern/leadership-approach/workflow'));
});

test('report-first template import action remains idempotent through service result', async () => {
  let calls = 0;
  const deps = dependencies({
    importReportFirstTemplates: async () => {
      calls += 1;
      return baseSummary;
    },
  });

  const first = await importReportFirstTemplatesActionWithDependencies(
    { assessmentKey: 'leadership-approach', targetAssessmentVersionId: 'draft-version-1' },
    deps,
  );
  const second = await importReportFirstTemplatesActionWithDependencies(
    { assessmentKey: 'leadership-approach', targetAssessmentVersionId: 'draft-version-1' },
    deps,
  );

  assert.equal(calls, 2);
  assert.equal(first.result?.importedTemplateCount, 24);
  assert.equal(second.result?.importedTemplateCount, 24);
});

test('report-first template import action blocks when draft version is missing', async () => {
  const result = await importReportFirstTemplatesActionWithDependencies(
    { assessmentKey: 'leadership-approach' },
    dependencies(),
  );

  assert.equal(result.ok, false);
  assert.match(result.formError ?? '', /Create or open a draft version/);
  assert.match(result.fieldErrors.targetAssessmentVersionId ?? '', /editable draft version/);
});

test('report-first template import action returns artifact/service errors as admin-readable form errors', async () => {
  const result = await importReportFirstTemplatesActionWithDependencies(
    {
      assessmentKey: 'leadership-approach',
      targetAssessmentVersionId: 'draft-version-1',
    },
    dependencies({
      importReportFirstTemplates: async () => {
        throw new Error('Report-first import artifact could not be read at missing.json');
      },
    }),
  );

  assert.equal(result.ok, false);
  assert.match(result.formError ?? '', /could not be read/);
});

test('report-first template promotion action prepares selected draft rows without publishing assessment', async () => {
  const revalidated: string[] = [];
  const seen: { assessmentVersionId: string }[] = [];
  const result = await promoteReportFirstTemplatesActionWithDependencies(
    {
      assessmentKey: 'leadership-approach',
      targetAssessmentVersionId: 'draft-version-1',
    },
    dependencies({
      revalidated,
      promoteReportFirstTemplates: async (input) => {
        seen.push(input);
        return {
          expectedTemplateCount: 24,
          promotedTemplateCount: 24,
          activeTemplateCount: 24,
          missingTemplateCount: 0,
          publishableFullCoverage: true,
          promotedPatternKeys: baseSummary.importedPatternKeys,
          activePatternKeys: baseSummary.importedPatternKeys,
          auditFindings: [],
          status: 'promoted',
        };
      },
    }),
  );

  assert.equal(result.ok, true);
  assert.equal(result.result?.activeTemplateCount, 24);
  assert.match(result.formSuccess ?? '', /Prepared 24 report-first templates for publish audit/);
  assert.match(result.formSuccess ?? '', /does not publish the assessment/);
  assert.equal(seen[0]?.assessmentVersionId, 'draft-version-1');
  assert.ok(revalidated.includes('/admin/assessments/ranked-pattern/leadership-approach/workflow'));
});

test('report-first template promotion action is idempotent when rows are already active', async () => {
  const result = await promoteReportFirstTemplatesActionWithDependencies(
    {
      assessmentKey: 'leadership-approach',
      targetAssessmentVersionId: 'draft-version-1',
    },
    dependencies({
      promoteReportFirstTemplates: async () => ({
        expectedTemplateCount: 24,
        promotedTemplateCount: 0,
        activeTemplateCount: 24,
        missingTemplateCount: 0,
        publishableFullCoverage: true,
        promotedPatternKeys: [],
        activePatternKeys: baseSummary.importedPatternKeys,
        auditFindings: [],
        status: 'already_active',
      }),
    }),
  );

  assert.equal(result.ok, true);
  assert.match(result.formSuccess ?? '', /already prepared for publish/);
});

test('report-first template promotion action returns validation blockers clearly', async () => {
  const result = await promoteReportFirstTemplatesActionWithDependencies(
    {
      assessmentKey: 'leadership-approach',
      targetAssessmentVersionId: 'draft-version-1',
    },
    dependencies({
      promoteReportFirstTemplates: async () => ({
        expectedTemplateCount: 24,
        promotedTemplateCount: 0,
        activeTemplateCount: 0,
        missingTemplateCount: 1,
        publishableFullCoverage: false,
        promotedPatternKeys: [],
        activePatternKeys: [],
        auditFindings: [{
          severity: 'blocking',
          code: 'REPORT_FIRST_PROMOTION_COUNT_INVALID',
          message: 'Report-first promotion requires exactly 24 draft template rows; found 23.',
        }],
        status: 'blocked',
      }),
    }),
  );

  assert.equal(result.ok, false);
  assert.match(result.formError ?? '', /requires exactly 24 draft template rows/);
});

test('report-first template promotion action blocks when draft version is missing', async () => {
  const result = await promoteReportFirstTemplatesActionWithDependencies(
    { assessmentKey: 'leadership-approach' },
    dependencies(),
  );

  assert.equal(result.ok, false);
  assert.match(result.formError ?? '', /Create or open a draft version/);
  assert.match(result.fieldErrors.targetAssessmentVersionId ?? '', /publish prep requires an editable draft version/);
});
