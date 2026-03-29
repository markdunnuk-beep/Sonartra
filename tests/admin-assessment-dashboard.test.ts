import test from 'node:test';
import assert from 'node:assert/strict';

import type { Queryable } from '@/lib/engine/repository-sql';
import { buildAdminAssessmentDashboardViewModel } from '@/lib/server/admin-assessment-dashboard';

type AssessmentDashboardFixture = {
  assessmentId: string;
  assessmentKey: string;
  title: string;
  description: string | null;
  isActive?: boolean;
  assessmentUpdatedAt?: string;
  versions: Array<{
    assessmentVersionId: string;
    versionTag: string;
    status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
    questionCount: number;
    publishedAt?: string | null;
    createdAt?: string;
    updatedAt?: string;
  }>;
};

type AdminAssessmentDashboardRowFixture = {
  assessment_id: string;
  assessment_key: string;
  assessment_title: string;
  assessment_description: string | null;
  assessment_is_active: boolean;
  assessment_created_at: string;
  assessment_updated_at: string;
  assessment_version_id: string | null;
  version_tag: string | null;
  version_status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED' | null;
  title_override: string | null;
  description_override: string | null;
  published_at: string | null;
  version_created_at: string | null;
  version_updated_at: string | null;
  question_count: string;
};

function createFakeDb(fixtures: readonly AssessmentDashboardFixture[]): Queryable {
  return {
    async query<T>(text: string) {
      if (text.includes('FROM assessments a') && text.includes('LEFT JOIN assessment_versions av')) {
        const rows: AdminAssessmentDashboardRowFixture[] = [];

        for (const fixture of fixtures) {
          if (fixture.versions.length === 0) {
            rows.push({
                assessment_id: fixture.assessmentId,
                assessment_key: fixture.assessmentKey,
                assessment_title: fixture.title,
                assessment_description: fixture.description,
                assessment_is_active: fixture.isActive ?? true,
                assessment_created_at: '2026-01-01T00:00:00.000Z',
                assessment_updated_at:
                  fixture.assessmentUpdatedAt ?? '2026-01-01T00:00:00.000Z',
                assessment_version_id: null,
                version_tag: null,
                version_status: null,
                title_override: null,
                description_override: null,
                published_at: null,
                version_created_at: null,
                version_updated_at: null,
                question_count: '0',
              });
            continue;
          }

          for (const version of fixture.versions) {
            rows.push({
              assessment_id: fixture.assessmentId,
              assessment_key: fixture.assessmentKey,
              assessment_title: fixture.title,
              assessment_description: fixture.description,
              assessment_is_active: fixture.isActive ?? true,
              assessment_created_at: '2026-01-01T00:00:00.000Z',
              assessment_updated_at:
                fixture.assessmentUpdatedAt ?? '2026-01-01T00:00:00.000Z',
              assessment_version_id: version.assessmentVersionId,
              version_tag: version.versionTag,
              version_status: version.status,
              title_override: null,
              description_override: null,
              published_at: version.publishedAt ?? null,
              version_created_at: version.createdAt ?? '2026-01-01T00:00:00.000Z',
              version_updated_at: version.updatedAt ?? '2026-01-01T00:00:00.000Z',
              question_count: String(version.questionCount),
            });
          }
        }

        return {
          rows: rows as T[],
        };
      }

      return { rows: [] as T[] };
    },
  };
}

test('builds admin assessment dashboard states from persisted version lifecycle data', async () => {
  const viewModel = await buildAdminAssessmentDashboardViewModel(
    createFakeDb([
      {
        assessmentId: 'assessment-1',
        assessmentKey: 'wplp80',
        title: 'WPLP-80',
        description: 'Flagship signals assessment',
        versions: [
          {
            assessmentVersionId: 'version-2',
            versionTag: '1.1.0',
            status: 'DRAFT',
            questionCount: 82,
            updatedAt: '2026-01-04T00:00:00.000Z',
          },
          {
            assessmentVersionId: 'version-1',
            versionTag: '1.0.0',
            status: 'PUBLISHED',
            questionCount: 80,
            publishedAt: '2026-01-03T00:00:00.000Z',
            updatedAt: '2026-01-03T00:00:00.000Z',
          },
        ],
      },
      {
        assessmentId: 'assessment-2',
        assessmentKey: 'discovery-lite',
        title: 'Discovery Lite',
        description: null,
        versions: [
          {
            assessmentVersionId: 'version-3',
            versionTag: '0.9.0',
            status: 'DRAFT',
            questionCount: 24,
            updatedAt: '2026-01-05T00:00:00.000Z',
          },
        ],
      },
      {
        assessmentId: 'assessment-3',
        assessmentKey: 'team-map',
        title: 'Team Map',
        description: null,
        versions: [],
      },
      {
        assessmentId: 'assessment-4',
        assessmentKey: 'archive-only',
        title: 'Archive Only',
        description: null,
        versions: [
          {
            assessmentVersionId: 'version-4',
            versionTag: '0.8.0',
            status: 'ARCHIVED',
            questionCount: 12,
            updatedAt: '2026-01-02T00:00:00.000Z',
          },
        ],
      },
    ]),
  );

  assert.equal(viewModel.summary.totalAssessments, 4);
  assert.equal(viewModel.summary.publishedCount, 1);
  assert.equal(viewModel.summary.publishedAndDraftCount, 1);
  assert.equal(viewModel.summary.draftOnlyCount, 1);
  assert.equal(viewModel.summary.noVersionsCount, 1);
  assert.equal(viewModel.summary.setupIncompleteCount, 1);

  const flagship = viewModel.assessments.find((assessment) => assessment.assessmentKey === 'wplp80');
  assert.equal(flagship?.overallStatus, 'published_and_draft');
  assert.equal(flagship?.publishedVersion?.versionTag, '1.0.0');
  assert.equal(flagship?.latestDraftVersion?.versionTag, '1.1.0');
  assert.equal(flagship?.versions[0]?.versionTag, '1.1.0');
  assert.equal(flagship?.actionHref, '/admin/assessments/wplp80');

  const draftOnly = viewModel.assessments.find(
    (assessment) => assessment.assessmentKey === 'discovery-lite',
  );
  assert.equal(draftOnly?.overallStatus, 'draft_only');

  const noVersions = viewModel.assessments.find(
    (assessment) => assessment.assessmentKey === 'team-map',
  );
  assert.equal(noVersions?.overallStatus, 'no_versions');

  const setupIncomplete = viewModel.assessments.find(
    (assessment) => assessment.assessmentKey === 'archive-only',
  );
  assert.equal(setupIncomplete?.overallStatus, 'setup_incomplete');
});
