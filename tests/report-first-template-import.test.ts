import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import {
  auditImportedReportFirstTemplateCoverage,
  importReportFirstTemplateRows,
  ReportFirstTemplateImportError,
} from '@/lib/server/report-first-template-import';
import type { ReportFirstTemplateStatus } from '@/lib/server/report-first-template-storage';
import type { LeadershipReportFirstImportArtifact } from '@/lib/server/leadership-report-first-package';

type StoredTemplateRow = {
  id: string;
  assessment_version_id: string;
  domain_key: string;
  pattern_key: string;
  report_key: string;
  report_contract: string;
  score_shape_policy: string;
  score_shape: string | null;
  supported_score_shapes: unknown;
  source_markdown_path: string | null;
  source_content_hash: string | null;
  report_template_json: unknown;
  content_hash: string;
  status: ReportFirstTemplateStatus;
  assessment_key: string | null;
  assessment_version: string | null;
  package_key: string | null;
  package_version: string | null;
  manifest_status: string | null;
  publishable: boolean;
  ready_for_import: boolean;
  created_by: string | null;
  import_batch_id: string | null;
  created_at: string;
  updated_at: string;
};

const assessmentVersionId = 'version-report-first-import';
const availablePatternKeys = [
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
] as const;

function createFakeDb() {
  const state = {
    rows: [] as StoredTemplateRow[],
    nextId: 1,
    queries: [] as string[],
    activePatterns: new Set(availablePatternKeys.map((patternKey) => `${assessmentVersionId}|${patternKey}`)),
  };

  return {
    state,
    db: {
      async query<T>(text: string, params?: unknown[]) {
        const sql = text.replace(/\s+/g, ' ').trim();
        state.queries.push(sql);

        if (sql.includes('FROM assessment_versions')) {
          return { rows: [{ id: params?.[0] }] as T[] };
        }

        if (sql.includes('FROM assessment_ranked_patterns')) {
          const key = `${String(params?.[0] ?? '')}|${String(params?.[1] ?? '')}`;
          return { rows: (state.activePatterns.has(key) ? [{ pattern_key: params?.[1] }] : []) as T[] };
        }

        if (sql.includes('FROM assessment_report_first_templates') && sql.includes("status = 'draft'")) {
          const versionId = String(params?.[0] ?? '');
          const patternKey = String(params?.[1] ?? '');
          const latest = [...state.rows]
            .filter((row) =>
              row.assessment_version_id === versionId &&
              row.pattern_key === patternKey &&
              row.status === 'draft',
            )
            .sort((left, right) => right.updated_at.localeCompare(left.updated_at) || right.id.localeCompare(left.id))[0];
          return { rows: (latest ? [{ id: latest.id }] : []) as T[] };
        }

        if (sql.startsWith('INSERT INTO assessment_report_first_templates')) {
          const row: StoredTemplateRow = {
            id: `template-${state.nextId}`,
            assessment_version_id: String(params?.[0] ?? ''),
            domain_key: String(params?.[1] ?? ''),
            pattern_key: String(params?.[2] ?? ''),
            report_key: String(params?.[3] ?? ''),
            report_contract: String(params?.[4] ?? ''),
            score_shape_policy: String(params?.[5] ?? ''),
            score_shape: (params?.[6] as string | null | undefined) ?? null,
            supported_score_shapes: JSON.parse(String(params?.[7] ?? '[]')) as unknown,
            source_markdown_path: (params?.[8] as string | null | undefined) ?? null,
            source_content_hash: (params?.[9] as string | null | undefined) ?? null,
            report_template_json: JSON.parse(String(params?.[10] ?? '{}')) as unknown,
            content_hash: String(params?.[11] ?? ''),
            status: params?.[12] as ReportFirstTemplateStatus,
            assessment_key: (params?.[13] as string | null | undefined) ?? null,
            assessment_version: (params?.[14] as string | null | undefined) ?? null,
            package_key: (params?.[15] as string | null | undefined) ?? null,
            package_version: (params?.[16] as string | null | undefined) ?? null,
            manifest_status: (params?.[17] as string | null | undefined) ?? null,
            publishable: Boolean(params?.[18]),
            ready_for_import: Boolean(params?.[19]),
            created_by: (params?.[20] as string | null | undefined) ?? null,
            import_batch_id: (params?.[21] as string | null | undefined) ?? null,
            created_at: `2026-05-16T00:00:0${state.nextId}.000Z`,
            updated_at: `2026-05-16T00:00:0${state.nextId}.000Z`,
          };
          state.nextId += 1;
          state.rows.push(row);

          return {
            rows: [{
              id: row.id,
              assessment_version_id: row.assessment_version_id,
              domain_key: row.domain_key,
              pattern_key: row.pattern_key,
              report_key: row.report_key,
              report_contract: row.report_contract,
              content_hash: row.content_hash,
              status: row.status,
            }] as T[],
          };
        }

        if (sql.startsWith('UPDATE assessment_report_first_templates')) {
          const id = String(params?.[0] ?? '');
          const row = state.rows.find((item) => item.id === id && item.status === 'draft');
          if (!row) {
            return { rows: [] as T[] };
          }

          row.domain_key = String(params?.[1] ?? '');
          row.report_key = String(params?.[2] ?? '');
          row.report_contract = String(params?.[3] ?? '');
          row.score_shape_policy = String(params?.[4] ?? '');
          row.score_shape = (params?.[5] as string | null | undefined) ?? null;
          row.supported_score_shapes = JSON.parse(String(params?.[6] ?? '[]')) as unknown;
          row.source_markdown_path = (params?.[7] as string | null | undefined) ?? null;
          row.source_content_hash = (params?.[8] as string | null | undefined) ?? null;
          row.report_template_json = JSON.parse(String(params?.[9] ?? '{}')) as unknown;
          row.content_hash = String(params?.[10] ?? '');
          row.assessment_key = (params?.[11] as string | null | undefined) ?? null;
          row.assessment_version = (params?.[12] as string | null | undefined) ?? null;
          row.package_key = (params?.[13] as string | null | undefined) ?? null;
          row.package_version = (params?.[14] as string | null | undefined) ?? null;
          row.manifest_status = (params?.[15] as string | null | undefined) ?? null;
          row.publishable = Boolean(params?.[16]);
          row.ready_for_import = Boolean(params?.[17]);
          row.created_by = (params?.[18] as string | null | undefined) ?? null;
          row.import_batch_id = (params?.[19] as string | null | undefined) ?? null;
          row.updated_at = '2026-05-16T00:05:00.000Z';

          return {
            rows: [{
              id: row.id,
              assessment_version_id: row.assessment_version_id,
              domain_key: row.domain_key,
              pattern_key: row.pattern_key,
              report_key: row.report_key,
              report_contract: row.report_contract,
              content_hash: row.content_hash,
              status: row.status,
            }] as T[],
          };
        }

        if (
          sql.includes('FROM assessment_report_first_templates') &&
          sql.includes('ORDER BY pattern_key ASC')
        ) {
          const versionId = String(params?.[0] ?? '');
          const status = String(params?.[1] ?? '');
          return {
            rows: state.rows
              .filter((row) => row.assessment_version_id === versionId && row.status === status)
              .sort((left, right) => left.pattern_key.localeCompare(right.pattern_key))
              .map((row) => ({
                pattern_key: row.pattern_key,
                report_key: row.report_key,
                report_contract: row.report_contract,
                report_template_json: row.report_template_json,
                content_hash: row.content_hash,
                status: row.status,
                score_shape_policy: row.score_shape_policy,
                publishable: row.publishable,
                ready_for_import: row.ready_for_import,
              })) as T[],
          };
        }

        return { rows: [] as T[] };
      },
    },
  };
}

async function loadArtifact(): Promise<LeadershipReportFirstImportArtifact> {
  return JSON.parse(
    await readFile('content/assessment-packages/leadership-approach/generated/report-first-template-import-rows.json', 'utf8'),
  ) as LeadershipReportFirstImportArtifact;
}

test('report-first importer persists exactly the import-ready templates', async () => {
  const fake = createFakeDb();
  const summary = await importReportFirstTemplateRows({
    db: fake.db,
    assessmentKey: 'leadership-approach',
    assessmentVersionId,
    actorId: '11111111-1111-1111-1111-111111111111',
    importBatchId: null,
  });

  assert.equal(summary.expectedTemplateCount, 24);
  assert.equal(summary.importedTemplateCount, 14);
  assert.equal(summary.missingTemplateCount, 10);
  assert.equal(summary.publishableFullCoverage, false);
  assert.deepEqual(summary.importedPatternKeys, [...availablePatternKeys].sort());
  assert.equal(fake.state.rows.length, 14);
  assert.ok(fake.state.rows.every((row) => row.status === 'draft'));
  assert.ok(fake.state.rows.every((row) => row.publishable === true));
  assert.ok(fake.state.rows.every((row) => row.ready_for_import === true));
});

test('report-first importer stores full structured body and package metadata', async () => {
  const fake = createFakeDb();
  await importReportFirstTemplateRows({
    db: fake.db,
    assessmentKey: 'leadership-approach',
    assessmentVersionId,
  });

  const row = fake.state.rows.find((item) => item.pattern_key === 'process_results_people_vision');
  assert.ok(row);
  assert.equal(row.assessment_key, 'leadership-approach');
  assert.equal(row.package_key, 'leadership-approach-report-first');
  assert.equal(row.score_shape_policy, 'pattern_level_score_shape_neutral');
  assert.equal(row.score_shape, null);
  assert.deepEqual(row.supported_score_shapes, ['concentrated', 'paired', 'graduated', 'balanced']);
  assert.match(row.source_markdown_path ?? '', /process_results_people_vision\.md$/);
  assert.equal(row.source_content_hash, row.content_hash);
  const template = row.report_template_json as { report?: { chapters?: unknown[] }; evidenceTemplate?: { blocks?: unknown[] } };
  assert.equal(template.report?.chapters?.length, 10);
  assert.ok((template.evidenceTemplate?.blocks?.length ?? 0) > 0);
});

test('report-first importer is idempotent for draft rows', async () => {
  const fake = createFakeDb();
  const first = await importReportFirstTemplateRows({
    db: fake.db,
    assessmentKey: 'leadership-approach',
    assessmentVersionId,
  });
  const second = await importReportFirstTemplateRows({
    db: fake.db,
    assessmentKey: 'leadership-approach',
    assessmentVersionId,
  });

  assert.equal(first.importedTemplateCount, 14);
  assert.equal(second.importedTemplateCount, 14);
  assert.equal(fake.state.rows.length, 14);
  assert.ok(fake.state.rows.every((row) => row.updated_at === '2026-05-16T00:05:00.000Z'));
});

test('report-first imported coverage helper blocks incomplete coverage', async () => {
  const fake = createFakeDb();
  await importReportFirstTemplateRows({
    db: fake.db,
    assessmentKey: 'leadership-approach',
    assessmentVersionId,
  });

  const coverage = await auditImportedReportFirstTemplateCoverage({
    db: fake.db,
    assessmentVersionId,
    status: 'draft',
  });

  assert.equal(coverage.expectedPatternCount, 24);
  assert.equal(coverage.importedTemplateCount, 14);
  assert.equal(coverage.missingPatternKeys.length, 10);
  assert.equal(coverage.coverageComplete, false);
  assert.equal(coverage.blockingFindings[0]?.code, 'REPORT_FIRST_IMPORTED_COVERAGE_INCOMPLETE');
});

test('report-first importer reports incomplete package coverage as blocking finding without importing placeholders', async () => {
  const fake = createFakeDb();
  const summary = await importReportFirstTemplateRows({
    db: fake.db,
    assessmentKey: 'leadership-approach',
    assessmentVersionId,
  });

  assert.ok(summary.auditFindings.some((finding) => finding.code === 'REPORT_FIRST_IMPORT_FULL_COVERAGE_INCOMPLETE'));
  assert.equal(fake.state.rows.some((row) => row.pattern_key === 'vision_results_process_people'), false);
});

test('report-first importer rejects missing artifact path clearly', async () => {
  const fake = createFakeDb();

  await assert.rejects(
    () => importReportFirstTemplateRows({
      db: fake.db,
      assessmentKey: 'leadership-approach',
      assessmentVersionId,
      artifactPath: 'content/assessment-packages/leadership-approach/generated/missing-report-first.json',
    }),
    {
      name: 'ReportFirstTemplateImportError',
      message: /could not be read/,
    },
  );
});

test('report-first importer rejects malformed artifact clearly', async () => {
  const fake = createFakeDb();

  await assert.rejects(
    () => importReportFirstTemplateRows(
      {
        db: fake.db,
        assessmentKey: 'leadership-approach',
        assessmentVersionId,
        artifactPath: 'malformed.json',
      },
      async () => '{not-json',
    ),
    {
      name: 'ReportFirstTemplateImportError',
      message: /could not be parsed/,
    },
  );
});

test('report-first importer rejects malformed artifact shape clearly', async () => {
  const fake = createFakeDb();

  await assert.rejects(
    () => importReportFirstTemplateRows(
      {
        db: fake.db,
        assessmentKey: 'leadership-approach',
        assessmentVersionId,
        artifactPath: 'malformed-shape.json',
      },
      async () => JSON.stringify({ artifact_contract: 'leadership_report_first_template_import_rows_v1' }),
    ),
    {
      name: 'ReportFirstTemplateImportError',
      message: /coverage, import_rows, and missing_templates/,
    },
  );
});

test('report-first importer blocks duplicate artifact pattern rows', async () => {
  const fake = createFakeDb();
  const artifact = await loadArtifact();
  const duplicateArtifact: LeadershipReportFirstImportArtifact = {
    ...artifact,
    import_rows: [artifact.import_rows[0]!, artifact.import_rows[0]!, ...artifact.import_rows.slice(1)],
  };

  await assert.rejects(
    () => importReportFirstTemplateRows(
      {
        db: fake.db,
        assessmentKey: 'leadership-approach',
        assessmentVersionId,
        artifactPath: 'duplicate.json',
      },
      async () => JSON.stringify(duplicateArtifact),
    ),
    {
      name: 'ReportFirstTemplateImportError',
      message: /duplicate import rows/,
    },
  );
  assert.equal(fake.state.rows.length, 0);
});

test('report-first importer blocks unsupported score-shape policy', async () => {
  const fake = createFakeDb();
  const artifact = await loadArtifact();
  const invalidArtifact = {
    ...artifact,
    import_rows: [
      {
        ...artifact.import_rows[0]!,
        score_shape_policy: 'score_shape_specific',
      },
      ...artifact.import_rows.slice(1),
    ],
  };

  await assert.rejects(
    () => importReportFirstTemplateRows(
      {
        db: fake.db,
        assessmentKey: 'leadership-approach',
        assessmentVersionId,
        artifactPath: 'invalid-score-shape.json',
      },
      async () => JSON.stringify(invalidArtifact),
    ),
    {
      name: 'ReportFirstTemplateImportError',
      message: /score-shape-neutral/,
    },
  );
});
