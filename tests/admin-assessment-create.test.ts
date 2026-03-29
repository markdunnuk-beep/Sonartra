import test from 'node:test';
import assert from 'node:assert/strict';

import { createAdminAssessmentRecords } from '@/lib/server/admin-assessment-create';

type StoredAssessment = {
  id: string;
  assessmentKey: string;
  title: string;
  description: string | null;
  isActive: boolean;
};

type StoredAssessmentVersion = {
  assessmentId: string;
  versionTag: string;
  lifecycleStatus: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
};

function createFakeDb(seed?: {
  assessments?: StoredAssessment[];
  versions?: StoredAssessmentVersion[];
}) {
  const state = {
    assessments: [...(seed?.assessments ?? [])],
    versions: [...(seed?.versions ?? [])],
  };

  return {
    db: {
      async query<T>(text: string, params?: readonly unknown[]) {
        if (text.includes('FROM assessments') && text.includes('assessment_key = $1')) {
          const assessmentKey = params?.[0] as string;
          const match = state.assessments.find(
            (assessment) => assessment.assessmentKey === assessmentKey,
          );

          return {
            rows: match ? ([{ id: match.id }] as unknown as T[]) : ([] as T[]),
          };
        }

        if (text.includes('INSERT INTO assessments')) {
          const assessmentId = `assessment-${state.assessments.length + 1}`;
          const record: StoredAssessment = {
            id: assessmentId,
            assessmentKey: params?.[0] as string,
            title: params?.[1] as string,
            description: (params?.[2] as string | null) ?? null,
            isActive: true,
          };
          state.assessments.push(record);

          return {
            rows: ([{ id: record.id, assessment_key: record.assessmentKey }] as unknown) as T[],
          };
        }

        if (text.includes('INSERT INTO assessment_versions')) {
          state.versions.push({
            assessmentId: params?.[0] as string,
            versionTag: params?.[1] as string,
            lifecycleStatus: 'DRAFT',
          });

          return { rows: [] as T[] };
        }

        return { rows: [] as T[] };
      },
    },
    state,
  };
}

test('creates a new assessment and initial draft version', async () => {
  const fake = createFakeDb();

  const created = await createAdminAssessmentRecords({
    db: fake.db,
    values: {
      title: 'Leadership Signals',
      assessmentKey: 'leadership-signals',
      description: 'Leadership behaviour baseline.',
    },
  });

  assert.equal(created.assessmentKey, 'leadership-signals');
  assert.equal(fake.state.assessments.length, 1);
  assert.equal(fake.state.assessments[0]?.title, 'Leadership Signals');
  assert.equal(fake.state.versions.length, 1);
  assert.equal(fake.state.versions[0]?.versionTag, '1.0.0');
  assert.equal(fake.state.versions[0]?.lifecycleStatus, 'DRAFT');
  assert.equal(fake.state.versions[0]?.assessmentId, created.assessmentId);
});

test('rejects duplicate assessment keys before inserting', async () => {
  const fake = createFakeDb({
    assessments: [
      {
        id: 'assessment-1',
        assessmentKey: 'wplp80',
        title: 'WPLP-80',
        description: null,
        isActive: true,
      },
    ],
  });

  await assert.rejects(
    () =>
      createAdminAssessmentRecords({
        db: fake.db,
        values: {
          title: 'Duplicate',
          assessmentKey: 'wplp80',
          description: '',
        },
      }),
    /ASSESSMENT_KEY_EXISTS/,
  );

  assert.equal(fake.state.assessments.length, 1);
  assert.equal(fake.state.versions.length, 0);
});
