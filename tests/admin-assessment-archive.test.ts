import test from 'node:test';
import assert from 'node:assert/strict';

import { initialAdminAssessmentArchiveActionState } from '@/lib/admin/admin-assessment-archive';
import {
  archiveAssessmentActionWithDependencies,
  archiveAssessmentRecord,
} from '@/lib/server/admin-assessment-archive';

type StoredAssessment = {
  id: string;
  assessmentKey: string;
  isActive: boolean;
};

type StoredVersion = {
  id: string;
  assessmentId: string;
  lifecycleStatus: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
};

type StoredAssignment = {
  id: string;
  assessmentId: string;
};

type StoredAttempt = {
  id: string;
  assessmentId: string;
};

type StoredResult = {
  id: string;
  assessmentId: string;
};

function createFakeDb(seed?: {
  assessments?: StoredAssessment[];
  versions?: StoredVersion[];
  assignments?: StoredAssignment[];
  attempts?: StoredAttempt[];
  results?: StoredResult[];
}) {
  const state = {
    assessments: [...(seed?.assessments ?? [])],
    versions: [...(seed?.versions ?? [])],
    assignments: [...(seed?.assignments ?? [])],
    attempts: [...(seed?.attempts ?? [])],
    results: [...(seed?.results ?? [])],
  };

  return {
    db: {
      async query<T>(text: string, params?: readonly unknown[]) {
        const sql = text.replace(/\s+/g, ' ').trim();

        if (sql === 'BEGIN' || sql === 'COMMIT' || sql === 'ROLLBACK') {
          return { rows: [] as T[] };
        }

        if (sql.includes('FROM assessments') && sql.includes('assessment_key = $1')) {
          const assessment = state.assessments.find((entry) => entry.assessmentKey === params?.[0]);
          return {
            rows: assessment
              ? ([{
                  assessment_id: assessment.id,
                  assessment_key: assessment.assessmentKey,
                  assessment_is_active: assessment.isActive,
                }] as unknown as T[])
              : ([] as T[]),
          };
        }

        if (sql.includes('AS published_version_count') && sql.includes('AS assignment_count')) {
          const assessmentId = params?.[0] as string;
          return {
            rows: [{
              published_version_count: String(
                state.versions.filter(
                  (version) => version.assessmentId === assessmentId && version.lifecycleStatus === 'PUBLISHED',
                ).length,
              ),
              assignment_count: String(
                state.assignments.filter((assignment) => assignment.assessmentId === assessmentId).length,
              ),
            }] as T[],
          };
        }

        if (sql.startsWith('UPDATE assessments SET')) {
          const [assessmentId, assessmentKey] = params as [string, string];
          state.assessments = state.assessments.map((assessment) => (
            assessment.id === assessmentId && assessment.assessmentKey === assessmentKey
              ? { ...assessment, isActive: false }
              : assessment
          ));
          return { rows: [] as T[] };
        }

        throw new Error(`Unhandled SQL: ${sql}`);
      },
    },
    state,
  };
}

function buildArchiveFormData(confirmed = true): FormData {
  const formData = new FormData();
  if (confirmed) {
    formData.set('confirmArchive', 'on');
  }
  return formData;
}

test('archive action hides the assessment without deleting attempts or results', async () => {
  const fake = createFakeDb({
    assessments: [{ id: 'assessment-1', assessmentKey: 'wplp80', isActive: true }],
    versions: [{ id: 'version-1', assessmentId: 'assessment-1', lifecycleStatus: 'DRAFT' }],
    attempts: [{ id: 'attempt-1', assessmentId: 'assessment-1' }],
    results: [{ id: 'result-1', assessmentId: 'assessment-1' }],
  });

  const revalidatedPaths: string[] = [];
  const result = await archiveAssessmentActionWithDependencies(
    'wplp80',
    initialAdminAssessmentArchiveActionState,
    buildArchiveFormData(true),
    {
      getDbPool: () => ({
        async connect() {
          return {
            async query<T>(text: string, params?: readonly unknown[]) {
              return fake.db.query<T>(text, params);
            },
            release() {},
          };
        },
      }),
      revalidatePath(path: string) {
        revalidatedPaths.push(path);
      },
    },
  );

  assert.equal(result.formError, null);
  assert.equal(fake.state.assessments[0]?.isActive, false);
  assert.equal(fake.state.attempts.length, 1);
  assert.equal(fake.state.results.length, 1);
  assert.deepEqual(revalidatedPaths, [
    '/admin/assessments',
    '/admin/assessments/wplp80',
    '/app/assessments',
    '/app/workspace',
    '/admin/users',
  ]);
});

test('archive action blocks published assessments that are still assigned', async () => {
  const fake = createFakeDb({
    assessments: [{ id: 'assessment-1', assessmentKey: 'wplp80', isActive: true }],
    versions: [{ id: 'version-1', assessmentId: 'assessment-1', lifecycleStatus: 'PUBLISHED' }],
    assignments: [{ id: 'assignment-1', assessmentId: 'assessment-1' }],
  });

  const result = await archiveAssessmentActionWithDependencies(
    'wplp80',
    initialAdminAssessmentArchiveActionState,
    buildArchiveFormData(true),
    {
      getDbPool: () => ({
        async connect() {
          return {
            async query<T>(text: string, params?: readonly unknown[]) {
              return fake.db.query<T>(text, params);
            },
            release() {},
          };
        },
      }),
      revalidatePath() {},
    },
  );

  assert.equal(
    result.formError,
    'This published assessment is still assigned to users. Remove those assignments before archiving it.',
  );
  assert.equal(fake.state.assessments[0]?.isActive, true);
});

test('archive action requires explicit confirmation', async () => {
  let connectCalls = 0;

  const result = await archiveAssessmentActionWithDependencies(
    'wplp80',
    initialAdminAssessmentArchiveActionState,
    buildArchiveFormData(false),
    {
      getDbPool: () => ({
        async connect() {
          connectCalls += 1;
          throw new Error('connect should not be called');
        },
      }),
      revalidatePath() {},
    },
  );

  assert.equal(connectCalls, 0);
  assert.equal(result.formError, 'Confirm archive before continuing.');
});

test('archive record treats an already inactive assessment as already archived', async () => {
  const fake = createFakeDb({
    assessments: [{ id: 'assessment-1', assessmentKey: 'wplp80', isActive: false }],
  });

  const outcome = await archiveAssessmentRecord({
    db: fake.db,
    assessmentKey: 'wplp80',
  });

  assert.equal(outcome, 'already_archived');
});
