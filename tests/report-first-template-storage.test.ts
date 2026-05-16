import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import { compileReportFirstTemplateFromMarkdown } from '@/scripts/authoring/compile-report-first-template';
import {
  replaceActiveReportFirstTemplate,
  ReportFirstTemplateStorageError,
  storeDraftReportFirstTemplate,
  type CompiledReportFirstTemplateForStorage,
  type ReportFirstTemplateStatus,
} from '@/lib/server/report-first-template-storage';

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

type FakeDbSeed = {
  readonly assessmentVersionIds?: readonly string[];
  readonly activePatterns?: readonly {
    readonly assessmentVersionId: string;
    readonly domainKey: string;
    readonly patternKey: string;
  }[];
};

const assessmentVersionId = 'version-report-first-1';
const patternKey = 'process_results_people_vision';

function createCompiledTemplate(overrides: Partial<CompiledReportFirstTemplateForStorage> = {}): CompiledReportFirstTemplateForStorage {
  return {
    report_key: patternKey,
    pattern_key: patternKey,
    domain_key: 'leadership-approach',
    report_contract: 'report_first_canonical_payload_v1',
    content_hash: 'hash-one',
    report_template_json: {
      metadata: {
        contractName: 'report_first_canonical_payload_v1',
      },
      report: {
        reportKey: patternKey,
      },
    },
    ...overrides,
  };
}

function createFakeDb(seed: FakeDbSeed = {}) {
  const state = {
    rows: [] as StoredTemplateRow[],
    nextId: 1,
    began: 0,
    committed: 0,
    rolledBack: 0,
    queries: [] as string[],
    assessmentVersionIds: new Set(seed.assessmentVersionIds ?? [assessmentVersionId]),
    activePatterns: new Set(
      (seed.activePatterns ?? [{
        assessmentVersionId,
        domainKey: 'leadership-approach',
        patternKey,
      }]).map((item) => `${item.assessmentVersionId}|${item.domainKey}|${item.patternKey}`),
    ),
  };

  return {
    state,
    db: {
      async query<T>(text: string, params?: unknown[]) {
        const sql = text.replace(/\s+/g, ' ').trim();
        state.queries.push(sql);

        if (sql === 'BEGIN') {
          state.began += 1;
          return { rows: [] as T[] };
        }

        if (sql === 'COMMIT') {
          state.committed += 1;
          return { rows: [] as T[] };
        }

        if (sql === 'ROLLBACK') {
          state.rolledBack += 1;
          return { rows: [] as T[] };
        }

        if (sql.includes('FROM assessment_versions')) {
          const versionId = String(params?.[0] ?? '');
          return {
            rows: (state.assessmentVersionIds.has(versionId) ? [{ id: versionId }] : []) as T[],
          };
        }

        if (sql.includes('FROM assessment_ranked_patterns')) {
          const key = `${String(params?.[0] ?? '')}|${String(params?.[1] ?? '')}|${String(params?.[2] ?? '')}`;
          return {
            rows: (state.activePatterns.has(key) ? [{ pattern_key: params?.[2] }] : []) as T[],
          };
        }

        if (sql.includes('FROM assessment_report_first_templates') && sql.includes("status = 'draft'")) {
          const versionId = String(params?.[0] ?? '');
          const requestedPatternKey = String(params?.[1] ?? '');
          const latest = [...state.rows]
            .filter((row) =>
              row.assessment_version_id === versionId &&
              row.pattern_key === requestedPatternKey &&
              row.status === 'draft',
            )
            .sort((left, right) => right.updated_at.localeCompare(left.updated_at) || right.id.localeCompare(left.id))[0];
          return { rows: (latest ? [{ id: latest.id }] : []) as T[] };
        }

        if (sql.startsWith('INSERT INTO assessment_report_first_templates')) {
          const status = params?.[12] as ReportFirstTemplateStatus;
          const versionId = String(params?.[0] ?? '');
          const requestedPatternKey = String(params?.[2] ?? '');

          if (
            status === 'active' &&
            state.rows.some((row) =>
              row.assessment_version_id === versionId &&
              row.pattern_key === requestedPatternKey &&
              row.status === 'active',
            )
          ) {
            throw new Error('duplicate active report-first template');
          }

          const row: StoredTemplateRow = {
            id: `template-${state.nextId}`,
            assessment_version_id: versionId,
            domain_key: String(params?.[1] ?? ''),
            pattern_key: requestedPatternKey,
            report_key: String(params?.[3] ?? ''),
            report_contract: String(params?.[4] ?? ''),
            score_shape_policy: String(params?.[5] ?? ''),
            score_shape: (params?.[6] as string | null | undefined) ?? null,
            supported_score_shapes: JSON.parse(String(params?.[7] ?? '[]')) as unknown,
            source_markdown_path: (params?.[8] as string | null | undefined) ?? null,
            source_content_hash: (params?.[9] as string | null | undefined) ?? null,
            report_template_json: JSON.parse(String(params?.[10] ?? '{}')) as unknown,
            content_hash: String(params?.[11] ?? ''),
            status,
            assessment_key: (params?.[13] as string | null | undefined) ?? null,
            assessment_version: (params?.[14] as string | null | undefined) ?? null,
            package_key: (params?.[15] as string | null | undefined) ?? null,
            package_version: (params?.[16] as string | null | undefined) ?? null,
            manifest_status: (params?.[17] as string | null | undefined) ?? null,
            publishable: Boolean(params?.[18]),
            ready_for_import: Boolean(params?.[19]),
            created_by: (params?.[20] as string | null | undefined) ?? null,
            import_batch_id: (params?.[21] as string | null | undefined) ?? null,
            created_at: `2026-05-15T00:00:0${state.nextId}.000Z`,
            updated_at: `2026-05-15T00:00:0${state.nextId}.000Z`,
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

        if (sql.startsWith('UPDATE assessment_report_first_templates') && sql.includes("status = 'inactive'")) {
          const versionId = String(params?.[0] ?? '');
          const requestedPatternKey = String(params?.[1] ?? '');
          for (const row of state.rows) {
            if (
              row.assessment_version_id === versionId &&
              row.pattern_key === requestedPatternKey &&
              row.status === 'active'
            ) {
              row.status = 'inactive';
              row.updated_at = '2026-05-15T00:10:00.000Z';
            }
          }
          return { rows: [] as T[] };
        }

        if (sql.startsWith('UPDATE assessment_report_first_templates')) {
          const id = String(params?.[0] ?? '');
          const existing = state.rows.find((row) => row.id === id && row.status === 'draft');
          if (!existing) {
            return { rows: [] as T[] };
          }

          existing.domain_key = String(params?.[1] ?? '');
          existing.report_key = String(params?.[2] ?? '');
          existing.report_contract = String(params?.[3] ?? '');
          existing.score_shape_policy = String(params?.[4] ?? '');
          existing.score_shape = (params?.[5] as string | null | undefined) ?? null;
          existing.supported_score_shapes = JSON.parse(String(params?.[6] ?? '[]')) as unknown;
          existing.source_markdown_path = (params?.[7] as string | null | undefined) ?? null;
          existing.source_content_hash = (params?.[8] as string | null | undefined) ?? null;
          existing.report_template_json = JSON.parse(String(params?.[9] ?? '{}')) as unknown;
          existing.content_hash = String(params?.[10] ?? '');
          existing.assessment_key = (params?.[11] as string | null | undefined) ?? null;
          existing.assessment_version = (params?.[12] as string | null | undefined) ?? null;
          existing.package_key = (params?.[13] as string | null | undefined) ?? null;
          existing.package_version = (params?.[14] as string | null | undefined) ?? null;
          existing.manifest_status = (params?.[15] as string | null | undefined) ?? null;
          existing.publishable = Boolean(params?.[16]);
          existing.ready_for_import = Boolean(params?.[17]);
          existing.created_by = (params?.[18] as string | null | undefined) ?? null;
          existing.import_batch_id = (params?.[19] as string | null | undefined) ?? null;
          existing.updated_at = '2026-05-15T00:05:00.000Z';

          return {
            rows: [{
              id: existing.id,
              assessment_version_id: existing.assessment_version_id,
              domain_key: existing.domain_key,
              pattern_key: existing.pattern_key,
              report_key: existing.report_key,
              report_contract: existing.report_contract,
              content_hash: existing.content_hash,
              status: existing.status,
            }] as T[],
          };
        }

        return { rows: [] as T[] };
      },
    },
  };
}

test('draft template can be stored for an assessment version and ranked pattern', async () => {
  const fake = createFakeDb();
  const stored = await storeDraftReportFirstTemplate({
    db: fake.db,
    assessmentVersionId,
    template: createCompiledTemplate(),
    createdBy: 'admin-user-1',
    importBatchId: 'batch-1',
  });

  assert.equal(stored.status, 'draft');
  assert.equal(stored.assessmentVersionId, assessmentVersionId);
  assert.equal(stored.patternKey, patternKey);
  assert.equal(stored.reportContract, 'report_first_canonical_payload_v1');
  assert.equal(stored.contentHash, 'hash-one');
  assert.equal(fake.state.rows[0]?.created_by, 'admin-user-1');
  assert.equal(fake.state.rows[0]?.import_batch_id, 'batch-1');
});

test('duplicate draft storage updates the latest draft deterministically', async () => {
  const fake = createFakeDb();
  const first = await storeDraftReportFirstTemplate({
    db: fake.db,
    assessmentVersionId,
    template: createCompiledTemplate(),
  });
  const second = await storeDraftReportFirstTemplate({
    db: fake.db,
    assessmentVersionId,
    template: createCompiledTemplate({
      content_hash: 'hash-two',
      report_template_json: { changed: true },
    }),
  });

  assert.equal(second.id, first.id);
  assert.equal(fake.state.rows.length, 1);
  assert.equal(fake.state.rows[0]?.content_hash, 'hash-two');
  assert.deepEqual(fake.state.rows[0]?.report_template_json, { changed: true });
});

test('active replacement keeps only one active template per assessment version and pattern', async () => {
  const fake = createFakeDb();
  const first = await replaceActiveReportFirstTemplate({
    db: fake.db,
    assessmentVersionId,
    template: createCompiledTemplate({ content_hash: 'active-one' }),
  });
  const second = await replaceActiveReportFirstTemplate({
    db: fake.db,
    assessmentVersionId,
    template: createCompiledTemplate({ content_hash: 'active-two' }),
  });

  assert.notEqual(second.id, first.id);
  assert.equal(fake.state.rows.filter((row) => row.status === 'active').length, 1);
  assert.equal(fake.state.rows.filter((row) => row.status === 'inactive').length, 1);
  assert.equal(fake.state.rows.find((row) => row.status === 'active')?.content_hash, 'active-two');
  assert.equal(fake.state.began, 2);
  assert.equal(fake.state.committed, 2);
  assert.equal(fake.state.rolledBack, 0);
});

test('invalid report contract is rejected before storage', async () => {
  const fake = createFakeDb();

  await assert.rejects(
    () => storeDraftReportFirstTemplate({
      db: fake.db,
      assessmentVersionId,
      template: createCompiledTemplate({ report_contract: 'unexpected_contract' }),
    }),
    {
      name: 'ReportFirstTemplateStorageError',
      message: /Unsupported report-first template contract/,
    },
  );
  assert.equal(fake.state.rows.length, 0);
  assert.equal(fake.state.queries.length, 0);
});

test('missing or empty report template JSON is rejected before storage', async () => {
  const fake = createFakeDb();

  await assert.rejects(
    () => storeDraftReportFirstTemplate({
      db: fake.db,
      assessmentVersionId,
      template: createCompiledTemplate({ report_template_json: {} }),
    }),
    {
      name: 'ReportFirstTemplateStorageError',
      message: /report_template_json must be a non-empty object/,
    },
  );
  assert.equal(fake.state.rows.length, 0);
  assert.equal(fake.state.queries.length, 0);
});

test('unresolved ranked pattern key is rejected when ranked-pattern lookup is available', async () => {
  const fake = createFakeDb({ activePatterns: [] });

  await assert.rejects(
    () => storeDraftReportFirstTemplate({
      db: fake.db,
      assessmentVersionId,
      template: createCompiledTemplate(),
    }),
    {
      name: 'ReportFirstTemplateStorageError',
      message: /does not resolve to an active ranked pattern/,
    },
  );
  assert.equal(fake.state.rows.length, 0);
  assert.ok(fake.state.queries.some((query) => query.includes('FROM assessment_ranked_patterns')));
});

test('missing assessment version is rejected before pattern storage', async () => {
  const fake = createFakeDb({ assessmentVersionIds: [] });

  await assert.rejects(
    () => storeDraftReportFirstTemplate({
      db: fake.db,
      assessmentVersionId,
      template: createCompiledTemplate(),
    }),
    {
      name: 'ReportFirstTemplateStorageError',
      message: /does not exist/,
    },
  );
  assert.equal(fake.state.rows.length, 0);
});

test('compiled P2 template can be accepted by the storage path', async () => {
  const source = await readFile(
    'content/authoring/leadership-approach/report-first/canonical-reports/process_results_people_vision.md',
    'utf8',
  );
  const compiled = compileReportFirstTemplateFromMarkdown(source, {
    inputPath: 'content/authoring/leadership-approach/report-first/canonical-reports/process_results_people_vision.md',
  });
  const fake = createFakeDb();

  const stored = await storeDraftReportFirstTemplate({
    db: fake.db,
    assessmentVersionId,
    template: compiled,
  });

  assert.equal(stored.patternKey, 'process_results_people_vision');
  assert.equal(stored.contentHash, compiled.content_hash);
  assert.deepEqual(fake.state.rows[0]?.report_template_json, compiled.report_template_json);
});

test('storage path stays separate from compiler and runtime result readers', async () => {
  const storageSource = await readFile('lib/server/report-first-template-storage.ts', 'utf8');
  const compilerSource = await readFile('scripts/authoring/compile-report-first-template.ts', 'utf8');

  assert.doesNotMatch(storageSource, /compileReportFirstTemplate|compile-report-first-template/);
  assert.doesNotMatch(storageSource, /canonical_result_payload|FROM results|INSERT INTO results/i);
  assert.doesNotMatch(storageSource, /FROM attempts|FROM responses|option_signal_weights/i);
  assert.doesNotMatch(storageSource, /result-read-model|results-service|workspace-service|single-domain-completion|assessment-completion/i);
  assert.doesNotMatch(storageSource, /app\/|components\//);
  assert.doesNotMatch(compilerSource, /report-first-template-storage|assessment_report_first_templates/);
});

test('storage errors use the report-first storage error type', async () => {
  assert.ok(new ReportFirstTemplateStorageError('x') instanceof Error);
});
