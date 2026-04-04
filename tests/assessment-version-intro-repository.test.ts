import test from 'node:test';
import assert from 'node:assert/strict';

import {
  getAssessmentVersionIntro,
  upsertAssessmentVersionIntro,
} from '@/lib/server/assessment-version-intro-repository';

type StoredAssessmentVersionIntroRow = {
  assessmentVersionId: string;
  introTitle: string;
  introSummary: string;
  introHowItWorks: string;
  estimatedTimeOverride: string | null;
  instructions: string | null;
  confidentialityNote: string | null;
};

function createFakeDb(seed: readonly StoredAssessmentVersionIntroRow[] = []) {
  const state = {
    rows: [...seed],
  };

  return {
    state,
    db: {
      async query<T>(text: string, params?: unknown[]) {
        const sql = text.replace(/\s+/g, ' ').trim();

        if (sql.includes('FROM assessment_version_intro')) {
          const assessmentVersionId = String(params?.[0] ?? '');

          return {
            rows: state.rows
              .filter((row) => row.assessmentVersionId === assessmentVersionId)
              .map((row) => ({
                intro_title: row.introTitle,
                intro_summary: row.introSummary,
                intro_how_it_works: row.introHowItWorks,
                estimated_time_override: row.estimatedTimeOverride,
                instructions: row.instructions,
                confidentiality_note: row.confidentialityNote,
              })) as T[],
          };
        }

        if (sql.startsWith('INSERT INTO assessment_version_intro')) {
          const assessmentVersionId = String(params?.[0] ?? '');
          const existing = state.rows.find((row) => row.assessmentVersionId === assessmentVersionId);
          const nextRow: StoredAssessmentVersionIntroRow = {
            assessmentVersionId,
            introTitle: String(params?.[1] ?? ''),
            introSummary: String(params?.[2] ?? ''),
            introHowItWorks: String(params?.[3] ?? ''),
            estimatedTimeOverride: (params?.[4] as string | null | undefined) ?? null,
            instructions: (params?.[5] as string | null | undefined) ?? null,
            confidentialityNote: (params?.[6] as string | null | undefined) ?? null,
          };

          if (existing) {
            Object.assign(existing, nextRow);
          } else {
            state.rows.push(nextRow);
          }

          return { rows: [] as T[] };
        }

        return { rows: [] as T[] };
      },
    },
  };
}

test('getAssessmentVersionIntro returns null when no version-scoped intro exists', async () => {
  const result = await getAssessmentVersionIntro('version-1', createFakeDb().db);

  assert.equal(result, null);
});

test('getAssessmentVersionIntro returns null when the intro schema is unavailable', async () => {
  const db = {
    async query<T>() {
      const error = new Error('relation "assessment_version_intro" does not exist') as Error & {
        code?: string;
      };
      error.code = '42P01';
      throw error;
    },
  };

  const result = await getAssessmentVersionIntro('version-1', db);

  assert.equal(result, null);
});

test('upsertAssessmentVersionIntro creates and then updates the row for the same assessment version', async () => {
  const fake = createFakeDb();

  await upsertAssessmentVersionIntro(fake.db, {
    assessmentVersionId: 'version-1',
    values: {
      introTitle: 'Welcome',
      introSummary: 'Summary',
      introHowItWorks: 'How it works',
      estimatedTimeOverride: '20 minutes',
      instructions: 'Answer honestly.',
      confidentialityNote: 'Responses stay confidential.',
    },
  });

  let stored = await getAssessmentVersionIntro('version-1', fake.db);
  assert.deepEqual(stored, {
    introTitle: 'Welcome',
    introSummary: 'Summary',
    introHowItWorks: 'How it works',
    estimatedTimeOverride: '20 minutes',
    instructions: 'Answer honestly.',
    confidentialityNote: 'Responses stay confidential.',
  });

  await upsertAssessmentVersionIntro(fake.db, {
    assessmentVersionId: 'version-1',
    values: {
      introTitle: 'Updated welcome',
      introSummary: 'Updated summary',
      introHowItWorks: 'Updated how it works',
      estimatedTimeOverride: null,
      instructions: null,
      confidentialityNote: 'Updated confidentiality note.',
    },
  });

  stored = await getAssessmentVersionIntro('version-1', fake.db);
  assert.deepEqual(stored, {
    introTitle: 'Updated welcome',
    introSummary: 'Updated summary',
    introHowItWorks: 'Updated how it works',
    estimatedTimeOverride: null,
    instructions: null,
    confidentialityNote: 'Updated confidentiality note.',
  });
  assert.equal(fake.state.rows.length, 1);
});
