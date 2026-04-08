import test from 'node:test';
import assert from 'node:assert/strict';

import {
  importApplicationLanguageForAssessmentVersionWithDependencies,
} from '@/lib/server/admin-application-language-import';

type VersionRow = {
  assessmentId: string;
  assessmentKey: string;
  assessmentVersionId: string;
  lifecycleStatus: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
  createdAt: string;
};

function createFakeDb(seed?: {
  versions?: VersionRow[];
}) {
  const versions = [...(seed?.versions ?? [{
    assessmentId: 'assessment-1',
    assessmentKey: 'wplp80',
    assessmentVersionId: 'version-draft',
    lifecycleStatus: 'DRAFT' as const,
    createdAt: '2026-04-08T00:00:01.000Z',
  }])];

  const writes: Array<{ table: string; assessmentVersionId: string; values: readonly unknown[] }> = [];

  const client = {
    async query<T>(text: string, params?: readonly unknown[]) {
      const sql = text.replace(/\s+/g, ' ').trim();

      if (sql === 'BEGIN' || sql === 'COMMIT' || sql === 'ROLLBACK') {
        return { rows: [] as T[] };
      }

      if (sql.includes('FROM assessment_versions av INNER JOIN assessments a ON a.id = av.assessment_id WHERE av.id = $1')) {
        const versionId = params?.[0] as string;
        const version = versions.find((row) => row.assessmentVersionId === versionId) ?? null;
        return {
          rows: version
            ? ([{
              assessment_id: version.assessmentId,
              assessment_key: version.assessmentKey,
              assessment_version_id: version.assessmentVersionId,
              lifecycle_status: version.lifecycleStatus,
            }] as unknown as T[])
            : ([] as T[]),
        };
      }

      if (sql.includes("FROM assessment_versions WHERE assessment_id = $1 AND lifecycle_status = 'DRAFT'")) {
        const assessmentId = params?.[0] as string;
        const latestDraft = versions
          .filter((row) => row.assessmentId === assessmentId && row.lifecycleStatus === 'DRAFT')
          .sort((left, right) => right.createdAt.localeCompare(left.createdAt) || right.assessmentVersionId.localeCompare(left.assessmentVersionId))[0] ?? null;

        return {
          rows: latestDraft
            ? ([{ assessment_version_id: latestDraft.assessmentVersionId }] as unknown as T[])
            : ([] as T[]),
        };
      }

      if (sql.includes('FROM assessment_version_application_thesis')) {
        return { rows: [] as T[] };
      }

      if (sql.includes('FROM assessment_version_application_contribution')) {
        return { rows: [] as T[] };
      }

      if (sql.includes('FROM assessment_version_application_risk')) {
        return { rows: [] as T[] };
      }

      if (sql.includes('FROM assessment_version_application_development')) {
        return { rows: [] as T[] };
      }

      if (sql.includes('FROM assessment_version_application_action_prompts')) {
        return { rows: [] as T[] };
      }

      if (sql.startsWith('DELETE FROM assessment_version_application_thesis')) {
        writes.push({ table: 'thesis-delete', assessmentVersionId: params?.[0] as string, values: params ?? [] });
        return { rows: [] as T[] };
      }

      if (sql.startsWith('INSERT INTO assessment_version_application_thesis')) {
        writes.push({ table: 'thesis-insert', assessmentVersionId: params?.[0] as string, values: params ?? [] });
        return { rows: [] as T[] };
      }

      return { rows: [] as T[] };
    },
    async connect() {
      return client;
    },
    release() {},
  };

  return { db: client, writes };
}

test('imports target latest draft version only', async () => {
  const fake = createFakeDb({
    versions: [
      {
        assessmentId: 'assessment-1',
        assessmentKey: 'wplp80',
        assessmentVersionId: 'version-published',
        lifecycleStatus: 'PUBLISHED',
        createdAt: '2026-04-01T00:00:00.000Z',
      },
      {
        assessmentId: 'assessment-1',
        assessmentKey: 'wplp80',
        assessmentVersionId: 'version-draft',
        lifecycleStatus: 'DRAFT',
        createdAt: '2026-04-08T00:00:00.000Z',
      },
    ],
  });

  const paths: string[] = [];
  const result = await importApplicationLanguageForAssessmentVersionWithDependencies({
    assessmentVersionId: 'version-published',
    dataset: 'applicationThesis',
    rawInput: [
      'hero_pattern_key|headline|summary',
      'steady_steward|Calm structured value|Brings steadier follow-through to the work.',
    ].join('\n'),
  }, {
    db: fake.db,
    revalidatePath(path) {
      paths.push(path);
    },
  });

  assert.equal(result.success, true);
  assert.equal(result.summary.assessmentVersionId, 'version-draft');
  assert.ok(fake.writes.some((write) => write.assessmentVersionId === 'version-draft'));
  assert.ok(paths.includes('/admin/assessments/wplp80/language'));
});

test('row counts are returned correctly after import', async () => {
  const fake = createFakeDb();

  const result = await importApplicationLanguageForAssessmentVersionWithDependencies({
    assessmentVersionId: 'version-draft',
    dataset: 'applicationThesis',
    rawInput: [
      'hero_pattern_key|headline|summary',
      'steady_steward|Headline A|Summary A',
      'adaptive_mobiliser|Headline B|Summary B',
    ].join('\n'),
  }, {
    db: fake.db,
    revalidatePath() {},
  });

  assert.equal(result.summary.rowCount, 2);
  assert.equal(result.summary.importedRowCount, 2);
  assert.equal(result.summary.importedTargetCount, 2);
});

test('validation errors are returned for invalid imports', async () => {
  const fake = createFakeDb();

  const result = await importApplicationLanguageForAssessmentVersionWithDependencies({
    assessmentVersionId: 'version-draft',
    dataset: 'applicationContribution',
    rawInput: [
      'source_type|source_key|priority|label|narrative|best_when|watch_for',
      'hero_pattern|steady_steward|1|Label|Narrative|Best when|Watch for',
    ].join('\n'),
  }, {
    db: fake.db,
    revalidatePath() {},
  });

  assert.equal(result.success, false);
  assert.equal(result.parseErrors.length, 1);
  assert.match(result.parseErrors[0]?.message ?? '', /source_type/i);
});
