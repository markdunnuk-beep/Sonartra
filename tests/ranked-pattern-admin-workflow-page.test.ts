import test from 'node:test';
import assert from 'node:assert/strict';

import { getRankedPatternWorkflowAssessment } from '@/lib/server/ranked-pattern-admin-workflow-page';

type WorkflowRow = {
  assessment_id: string;
  assessment_key: string;
  assessment_mode: string | null;
  assessment_title: string;
  assessment_description: string | null;
  assessment_is_active: boolean;
  assessment_created_at: string;
  assessment_updated_at: string;
  assessment_version_id: string | null;
  version_tag: string | null;
  version_status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED' | null;
  published_at: string | null;
  version_created_at: string | null;
  version_updated_at: string | null;
  question_count: string | number | null;
};

function createDb(rows: readonly WorkflowRow[]) {
  const calls: string[] = [];

  return {
    calls,
    db: {
      async query<T>(text: string, params?: readonly unknown[]) {
        calls.push(text);
        assert.deepEqual(params, ['leadership-approach']);
        return { rows: rows as readonly T[] };
      },
    },
  };
}

test('ranked-pattern workflow read model renders a published version with no draft', async () => {
  const { db, calls } = createDb([
    {
      assessment_id: 'assessment-1',
      assessment_key: 'leadership-approach',
      assessment_mode: 'single_domain',
      assessment_title: 'Leadership Approach',
      assessment_description: 'Leadership ranked-pattern package',
      assessment_is_active: true,
      assessment_created_at: '2026-05-01T00:00:00.000Z',
      assessment_updated_at: '2026-05-02T00:00:00.000Z',
      assessment_version_id: 'version-published',
      version_tag: '2',
      version_status: 'PUBLISHED',
      published_at: '2026-05-03T00:00:00.000Z',
      version_created_at: '2026-05-01T00:00:00.000Z',
      version_updated_at: '2026-05-03T00:00:00.000Z',
      question_count: '16',
    },
  ]);

  const assessment = await getRankedPatternWorkflowAssessment(db, 'leadership-approach');

  assert.equal(assessment?.assessmentKey, 'leadership-approach');
  assert.equal(assessment?.publishedVersion?.assessmentVersionId, 'version-published');
  assert.equal(assessment?.publishedVersion?.versionTag, '2');
  assert.equal(assessment?.latestDraftVersion, null);
  assert.equal(assessment?.versions.length, 1);
  assert.match(calls[0] ?? '', /av\.result_model_key = 'ranked_pattern'/);
  assert.doesNotMatch(calls[0] ?? '', /assessment_version_single_domain_/);
});

test('ranked-pattern workflow read model can represent an assessment with no ranked-pattern versions', async () => {
  const { db } = createDb([
    {
      assessment_id: 'assessment-1',
      assessment_key: 'leadership-approach',
      assessment_mode: 'single_domain',
      assessment_title: 'Leadership Approach',
      assessment_description: 'Legacy shell',
      assessment_is_active: true,
      assessment_created_at: '2026-05-01T00:00:00.000Z',
      assessment_updated_at: '2026-05-02T00:00:00.000Z',
      assessment_version_id: null,
      version_tag: null,
      version_status: null,
      published_at: null,
      version_created_at: null,
      version_updated_at: null,
      question_count: null,
    },
  ]);

  const assessment = await getRankedPatternWorkflowAssessment(db, 'leadership-approach');

  assert.equal(assessment?.assessmentKey, 'leadership-approach');
  assert.deepEqual(assessment?.versions, []);
  assert.equal(assessment?.publishedVersion, null);
  assert.equal(assessment?.latestDraftVersion, null);
});
