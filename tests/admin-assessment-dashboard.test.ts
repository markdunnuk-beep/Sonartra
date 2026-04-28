import test from 'node:test';
import assert from 'node:assert/strict';

import type { Queryable } from '@/lib/engine/repository-sql';
import { buildAdminAssessmentDashboardViewModel } from '@/lib/server/admin-assessment-dashboard';

type AssessmentDashboardFixture = {
  assessmentId: string;
  assessmentKey: string;
  mode?: string | null;
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
  assessment_mode: string | null;
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

function createFakeDb(
  fixtures: readonly AssessmentDashboardFixture[],
  options?: {
    missingModeColumns?: boolean;
  },
): Queryable {
  return {
    async query<T>(text: string, params?: unknown[]) {
      if (text.includes('FROM assessments a') && text.includes('LEFT JOIN assessment_versions av')) {
        if (text.includes('COALESCE(av.mode, a.mode) AS assessment_mode') && options?.missingModeColumns) {
          throw new Error('column av.mode does not exist');
        }

        const rows: AdminAssessmentDashboardRowFixture[] = [];

        for (const fixture of fixtures) {
          if (fixture.versions.length === 0) {
            rows.push({
                assessment_id: fixture.assessmentId,
                assessment_key: fixture.assessmentKey,
                assessment_title: fixture.title,
                assessment_mode: fixture.mode ?? null,
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
              assessment_mode: fixture.mode ?? null,
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

      if (text.includes('LEFT JOIN LATERAL') && text.includes('draft_version_id')) {
        if (text.includes('COALESCE(dv.mode, a.mode) AS assessment_mode') && options?.missingModeColumns) {
          throw new Error('column dv.mode does not exist');
        }

        const assessmentKey = params?.[0] as string;
        const fixture = fixtures.find((entry) => entry.assessmentKey === assessmentKey);
        const draftVersion = fixture?.versions.find((version) => version.status === 'DRAFT') ?? null;

        if (!fixture) {
          return { rows: [] as T[] };
        }

        return {
          rows: [
            {
              assessment_id: fixture.assessmentId,
              assessment_key: fixture.assessmentKey,
              draft_version_id: draftVersion?.assessmentVersionId ?? null,
              draft_version_tag: draftVersion?.versionTag ?? null,
            },
          ] as T[],
        };
      }

      if (text.includes('AS domain_count') && text.includes('AS signal_count')) {
        const draftVersionId = params?.[0] as string;
        const isReadyDraft = draftVersionId === 'version-2';

        return {
          rows: [
            {
              domain_count: isReadyDraft ? '2' : '1',
              signal_count: isReadyDraft ? '2' : '1',
              orphan_signal_count: '0',
              cross_version_signal_count: '0',
            },
          ] as T[],
        };
      }

      if (text.includes('AS question_count') && text.includes('questions_without_options_count')) {
        const draftVersionId = params?.[0] as string;
        const isReadyDraft = draftVersionId === 'version-2';

        return {
          rows: [
            {
              question_count: isReadyDraft ? '82' : '24',
              option_count: isReadyDraft ? '328' : '24',
              questions_without_options_count: '0',
              orphan_question_count: '0',
              cross_version_question_count: '0',
              orphan_option_count: '0',
              cross_version_option_count: '0',
            },
          ] as T[],
        };
      }

      if (text.includes('AS weighted_option_count') && text.includes('cross_version_weight_signal_count')) {
        const draftVersionId = params?.[0] as string;
        const isReadyDraft = draftVersionId === 'version-2';

        return {
          rows: [
            {
              weighted_option_count: isReadyDraft ? '328' : '12',
              unmapped_option_count: isReadyDraft ? '0' : '12',
              weight_mapping_count: isReadyDraft ? '656' : '12',
              orphan_weight_option_count: '0',
              orphan_weight_signal_count: '0',
              cross_version_weight_option_count: '0',
              cross_version_weight_signal_count: '0',
            },
          ] as T[],
        };
      }

      if (text.includes('FROM assessment_version_application_thesis')) {
        const draftVersionId = params?.[0] as string;
        if (draftVersionId !== 'version-2') {
          return { rows: [] as T[] };
        }

        return {
          rows: [
            'forceful_driver',
            'exacting_controller',
            'delivery_commander',
            'deliberate_craftsperson',
            'grounded_planner',
            'relational_catalyst',
            'adaptive_mobiliser',
            'steady_steward',
            'balanced_operator',
          ].map((heroPatternKey, index) => ({
            id: `thesis-${index + 1}`,
            assessment_version_id: draftVersionId,
            hero_pattern_key: heroPatternKey,
            headline: `${heroPatternKey} headline`,
            summary: `${heroPatternKey} summary`,
            created_at: '2026-01-01T00:00:00.000Z',
            updated_at: '2026-01-01T00:00:00.000Z',
          })) as T[],
        };
      }

      if (text.includes('FROM assessment_version_application_action_prompts')) {
        const draftVersionId = params?.[0] as string;
        if (draftVersionId !== 'version-2') {
          return { rows: [] as T[] };
        }

        return {
          rows: [
            'forceful_driver',
            'exacting_controller',
            'delivery_commander',
            'deliberate_craftsperson',
            'grounded_planner',
            'relational_catalyst',
            'adaptive_mobiliser',
            'steady_steward',
            'balanced_operator',
          ].map((sourceKey, index) => ({
            id: `prompt-${index + 1}`,
            assessment_version_id: draftVersionId,
            source_type: 'hero_pattern',
            source_key: sourceKey,
            keep_doing: `${sourceKey} keep`,
            watch_for: `${sourceKey} watch`,
            practice_next: `${sourceKey} practice`,
            ask_others: `${sourceKey} ask`,
            created_at: '2026-01-01T00:00:00.000Z',
            updated_at: '2026-01-01T00:00:00.000Z',
          })) as T[],
        };
      }

      if (
        text.includes('FROM assessment_version_application_contribution')
        || text.includes('FROM assessment_version_application_risk')
        || text.includes('FROM assessment_version_application_development')
      ) {
        const draftVersionId = params?.[0] as string;
        if (draftVersionId !== 'version-2') {
          return { rows: [] as T[] };
        }

        return {
          rows: Array.from({ length: 24 }, (_, index) => ({
            id: `application-${index + 1}`,
            assessment_version_id: draftVersionId,
            source_type: 'signal',
            source_key: `signal_${index + 1}`,
            priority: index + 1,
            label: `Label ${index + 1}`,
            narrative: `Narrative ${index + 1}`,
            best_when: `Best ${index + 1}`,
            watch_for: `Watch ${index + 1}`,
            impact: `Impact ${index + 1}`,
            early_warning: `Warning ${index + 1}`,
            practice: `Practice ${index + 1}`,
            success_marker: `Success ${index + 1}`,
            created_at: '2026-01-01T00:00:00.000Z',
            updated_at: '2026-01-01T00:00:00.000Z',
          })) as T[],
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
        isActive: false,
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

  assert.equal(viewModel.summary.totalAssessments, 3);
  assert.equal(viewModel.summary.archivedCount, 1);
  assert.equal(viewModel.summary.publishedCount, 1);
  assert.equal(viewModel.summary.publishedAndDraftCount, 1);
  assert.equal(viewModel.summary.draftOnlyCount, 1);
  assert.equal(viewModel.summary.noVersionsCount, 1);
  assert.equal(viewModel.summary.setupIncompleteCount, 0);

  const flagship = viewModel.assessments.find((assessment) => assessment.assessmentKey === 'wplp80');
  assert.equal(flagship?.overallStatus, 'published_and_draft');
  assert.equal(flagship?.mode, 'multi_domain');
  assert.equal(flagship?.modeLabel, 'Multi-Domain');
  assert.equal(flagship?.publishedVersion?.versionTag, '1.0.0');
  assert.equal(flagship?.latestDraftVersion?.versionTag, '1.1.0');
  assert.equal(flagship?.latestDraftReadiness, 'ready');
  assert.equal(flagship?.versions[0]?.versionTag, '1.1.0');
  assert.equal(flagship?.actionHref, '/admin/assessments/wplp80');

  const draftOnly = viewModel.assessments.find(
    (assessment) => assessment.assessmentKey === 'discovery-lite',
  );
  assert.equal(draftOnly?.overallStatus, 'draft_only');
  assert.equal(draftOnly?.latestDraftReadiness, 'not_ready');

  const noVersions = viewModel.assessments.find(
    (assessment) => assessment.assessmentKey === 'team-map',
  );
  assert.equal(noVersions?.overallStatus, 'no_versions');
  assert.equal(noVersions?.latestDraftReadiness, 'no_draft');

  assert.equal(
    viewModel.assessments.some((assessment) => assessment.assessmentKey === 'archive-only'),
    false,
  );
});

test('dashboard can include archived assessments when explicitly requested', async () => {
  const viewModel = await buildAdminAssessmentDashboardViewModel(
    createFakeDb([
      {
        assessmentId: 'assessment-1',
        assessmentKey: 'active-one',
        title: 'Active One',
        description: null,
        versions: [],
      },
      {
        assessmentId: 'assessment-2',
        assessmentKey: 'archive-only',
        title: 'Archive Only',
        description: null,
        isActive: false,
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
    {
      showArchived: true,
    },
  );

  assert.equal(viewModel.showArchived, true);
  assert.equal(viewModel.summary.totalAssessments, 2);
  assert.equal(viewModel.summary.archivedCount, 1);
  assert.equal(
    viewModel.assessments.find((assessment) => assessment.assessmentKey === 'archive-only')?.isActive,
    false,
  );
});

test('undefined and unknown modes resolve safely for dashboard labels', async () => {
  const viewModel = await buildAdminAssessmentDashboardViewModel(
    createFakeDb([
      {
        assessmentId: 'assessment-1',
        assessmentKey: 'default-mode',
        title: 'Default Mode',
        description: null,
        versions: [],
      },
      {
        assessmentId: 'assessment-2',
        assessmentKey: 'custom-mode',
        mode: 'unexpected_mode',
        title: 'Custom Mode',
        description: null,
        versions: [],
      },
      {
        assessmentId: 'assessment-3',
        assessmentKey: 'single-mode',
        mode: 'single_domain',
        title: 'Single Mode',
        description: null,
        versions: [],
      },
    ]),
  );

  assert.equal(
    viewModel.assessments.find((assessment) => assessment.assessmentKey === 'default-mode')?.modeLabel,
    'Multi-Domain',
  );
  assert.equal(
    viewModel.assessments.find((assessment) => assessment.assessmentKey === 'custom-mode')?.modeLabel,
    'Multi-Domain',
  );
  assert.equal(
    viewModel.assessments.find((assessment) => assessment.assessmentKey === 'single-mode')?.modeLabel,
    'Single-Domain',
  );
});

test('dashboard falls back safely when assessment mode columns are not present in the database', async () => {
  const viewModel = await buildAdminAssessmentDashboardViewModel(
    createFakeDb(
      [
        {
          assessmentId: 'assessment-1',
          assessmentKey: 'legacy-mode',
          title: 'Legacy Mode',
          description: null,
          versions: [
            {
              assessmentVersionId: 'version-2',
              versionTag: '1.1.0',
              status: 'DRAFT',
              questionCount: 12,
              updatedAt: '2026-01-04T00:00:00.000Z',
            },
          ],
        },
      ],
      {
        missingModeColumns: true,
      },
    ),
  );

  assert.equal(viewModel.assessments[0]?.assessmentKey, 'legacy-mode');
  assert.equal(viewModel.assessments[0]?.mode, 'multi_domain');
  assert.equal(viewModel.assessments[0]?.modeLabel, 'Multi-Domain');
  assert.equal(viewModel.assessments[0]?.actionHref, '/admin/assessments/legacy-mode');
});
