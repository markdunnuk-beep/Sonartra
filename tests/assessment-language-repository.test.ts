import test from 'node:test';
import assert from 'node:assert/strict';

import { getAssessmentLanguage } from '@/lib/server/assessment-language-repository';

type StoredAssessmentLanguageRow = {
  assessmentVersionId: string;
  section: string;
  content: string;
};

function createFakeDb(seed: readonly StoredAssessmentLanguageRow[] = []) {
  return {
    async query<T>(text: string, params?: unknown[]) {
      const sql = text.replace(/\s+/g, ' ').trim();

      if (sql.includes('FROM assessment_version_language_assessment')) {
        const assessmentVersionId = String(params?.[0] ?? '');

        return {
          rows: seed
            .filter((row) => row.assessmentVersionId === assessmentVersionId)
            .sort((left, right) => left.section.localeCompare(right.section))
            .map((row) => ({
              section: row.section,
              content: row.content,
            })) as T[],
        };
      }

      return { rows: [] as T[] };
    },
  };
}

test('getAssessmentLanguage returns null when no assessment language row exists', async () => {
  const result = await getAssessmentLanguage('version-1', createFakeDb());

  assert.deepEqual(result, {
    assessment_description: null,
  });
});

test('getAssessmentLanguage returns assessment_description content when present', async () => {
  const result = await getAssessmentLanguage(
    'version-1',
    createFakeDb([
      {
        assessmentVersionId: 'version-1',
        section: 'assessment_description',
        content: 'This version is tuned for leadership signal analysis.',
      },
    ]),
  );

  assert.deepEqual(result, {
    assessment_description: 'This version is tuned for leadership signal analysis.',
  });
});
