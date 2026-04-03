import test from 'node:test';
import assert from 'node:assert/strict';

import { upsertAssessmentLanguageWithDependencies } from '@/lib/server/admin-assessment-language';

type AssessmentVersionRow = {
  assessmentVersionId: string;
  assessmentKey: string;
  lifecycleStatus: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
};

type AssessmentLanguageRow = {
  assessmentVersionId: string;
  section: 'assessment_description';
  content: string;
};

function createFakeDb(seed?: {
  versions?: readonly AssessmentVersionRow[];
  assessment?: readonly AssessmentLanguageRow[];
}) {
  const state = {
    versions: [...(seed?.versions ?? [])],
    assessment: [...(seed?.assessment ?? [])],
  };

  return {
    state,
    db: {
      async query<T>(text: string, params?: readonly unknown[]) {
        const sql = text.replace(/\s+/g, ' ').trim();

        if (sql.includes('FROM assessment_versions av') && sql.includes('INNER JOIN assessments a')) {
          const assessmentVersionId = String(params?.[0] ?? '');
          const version = state.versions.find((row) => row.assessmentVersionId === assessmentVersionId);

          return {
            rows: (version
              ? [{
                  assessment_key: version.assessmentKey,
                  lifecycle_status: version.lifecycleStatus,
                }]
              : []) as T[],
          };
        }

        if (sql.startsWith('DELETE FROM assessment_version_language_assessment')) {
          const assessmentVersionId = String(params?.[0] ?? '');
          const section = String(params?.[1] ?? '') as 'assessment_description';
          state.assessment = state.assessment.filter(
            (row) => !(row.assessmentVersionId === assessmentVersionId && row.section === section),
          );
          return { rows: [] as T[] };
        }

        if (sql.startsWith('INSERT INTO assessment_version_language_assessment')) {
          const assessmentVersionId = String(params?.[0] ?? '');
          const section = String(params?.[1] ?? '') as 'assessment_description';
          const content = String(params?.[2] ?? '');
          const existing = state.assessment.find(
            (row) => row.assessmentVersionId === assessmentVersionId && row.section === section,
          );

          if (existing) {
            existing.content = content;
          } else {
            state.assessment.push({
              assessmentVersionId,
              section,
              content,
            });
          }

          return { rows: [] as T[] };
        }

        return { rows: [] as T[] };
      },
    },
  };
}

test('upsertAssessmentLanguage trims and upserts assessment description for draft versions', async () => {
  const fake = createFakeDb({
    versions: [{
      assessmentVersionId: 'version-1',
      assessmentKey: 'wplp80',
      lifecycleStatus: 'DRAFT',
    }],
  });
  const revalidatedPaths: string[] = [];

  const result = await upsertAssessmentLanguageWithDependencies(
    {
      assessmentVersionId: 'version-1',
      section: 'assessment_description',
      content: '  Introductory copy for the report.  ',
    },
    {
      db: fake.db,
      revalidatePath: (path) => revalidatedPaths.push(path),
    },
  );

  assert.deepEqual(result, {
    ok: true,
    value: 'Introductory copy for the report.',
    error: null,
  });
  assert.deepEqual(fake.state.assessment, [{
    assessmentVersionId: 'version-1',
    section: 'assessment_description',
    content: 'Introductory copy for the report.',
  }]);
  assert.deepEqual(revalidatedPaths, [
    '/admin/assessments',
    '/admin/assessments/wplp80/language',
  ]);
});

test('upsertAssessmentLanguage removes the row when the textarea is cleared', async () => {
  const fake = createFakeDb({
    versions: [{
      assessmentVersionId: 'version-1',
      assessmentKey: 'wplp80',
      lifecycleStatus: 'DRAFT',
    }],
    assessment: [{
      assessmentVersionId: 'version-1',
      section: 'assessment_description',
      content: 'Existing copy',
    }],
  });

  const result = await upsertAssessmentLanguageWithDependencies(
    {
      assessmentVersionId: 'version-1',
      section: 'assessment_description',
      content: '   ',
    },
    {
      db: fake.db,
      revalidatePath() {},
    },
  );

  assert.deepEqual(result, {
    ok: true,
    value: null,
    error: null,
  });
  assert.deepEqual(fake.state.assessment, []);
});

test('upsertAssessmentLanguage rejects published versions', async () => {
  const fake = createFakeDb({
    versions: [{
      assessmentVersionId: 'version-1',
      assessmentKey: 'wplp80',
      lifecycleStatus: 'PUBLISHED',
    }],
  });

  const result = await upsertAssessmentLanguageWithDependencies(
    {
      assessmentVersionId: 'version-1',
      section: 'assessment_description',
      content: 'Published copy',
    },
    {
      db: fake.db,
      revalidatePath() {},
    },
  );

  assert.equal(result.ok, false);
  assert.match(result.error ?? '', /draft assessment versions/i);
  assert.deepEqual(fake.state.assessment, []);
});
