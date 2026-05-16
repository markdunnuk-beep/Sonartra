import assert from 'node:assert/strict';
import test from 'node:test';

import {
  importReportFirstTemplatesActionWithDependencies,
} from '@/lib/server/ranked-pattern-admin-import-workflow-actions';
import type { ReportFirstTemplateImportSummary } from '@/lib/server/report-first-template-import';

const baseSummary: ReportFirstTemplateImportSummary = {
  expectedTemplateCount: 24,
  importedTemplateCount: 14,
  missingTemplateCount: 10,
  skippedTemplateCount: 10,
  publishableFullCoverage: false,
  importedPatternKeys: [
    'people_process_results_vision',
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
  ],
  missingPatternKeys: ['vision_results_process_people'],
  auditFindings: [
    {
      severity: 'blocking',
      code: 'REPORT_FIRST_IMPORT_FULL_COVERAGE_INCOMPLETE',
      message: 'Report-first package coverage is incomplete: 14 of 24 templates are import-ready.',
    },
  ],
  storedTemplates: [],
};

function dependencies(overrides: {
  readonly importReportFirstTemplates?: (input: {
    readonly assessmentKey: string;
    readonly assessmentVersionId: string;
  }) => Promise<ReportFirstTemplateImportSummary>;
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
  assert.equal(result.result?.importedTemplateCount, 14);
  assert.equal(result.result?.missingTemplateCount, 10);
  assert.equal(result.result?.publishableFullCoverage, false);
  assert.match(result.formSuccess ?? '', /Imported 14 report-first template rows/);
  assert.match(result.formSuccess ?? '', /10 report-first templates are still missing/);
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
  assert.equal(first.result?.importedTemplateCount, 14);
  assert.equal(second.result?.importedTemplateCount, 14);
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
