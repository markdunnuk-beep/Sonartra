import test from 'node:test';
import assert from 'node:assert/strict';
import { renderToStaticMarkup } from 'react-dom/server';

import { AdminAssessmentLanguageStep } from '@/components/admin/admin-assessment-language-step';
import type { Queryable } from '@/lib/engine/repository-sql';
import { getAdminAssessmentLanguageStepViewModel } from '@/lib/server/admin-assessment-language-step';

type AssessmentRow = {
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
  published_at: string | null;
  version_created_at: string | null;
  version_updated_at: string | null;
  question_count: string;
};

type LanguageFixture = {
  baseRows: AssessmentRow[];
  signals?: Array<{
    id: string;
    assessmentVersionId: string;
    signalKey: string;
    section: 'summary' | 'strength' | 'watchout' | 'development';
    content: string;
    createdAt: string;
    updatedAt: string;
  }>;
  pairs?: Array<{
    id: string;
    assessmentVersionId: string;
    signalPair: string;
    section: 'summary' | 'strength' | 'watchout';
    content: string;
    createdAt: string;
    updatedAt: string;
  }>;
  domains?: Array<{
    id: string;
    assessmentVersionId: string;
    domainKey: string;
    section: 'summary' | 'focus' | 'pressure' | 'environment';
    content: string;
    createdAt: string;
    updatedAt: string;
  }>;
  overview?: Array<{
    id: string;
    assessmentVersionId: string;
    patternKey: string;
    section: 'headline' | 'summary' | 'strengths' | 'watchouts' | 'development';
    content: string;
    createdAt: string;
    updatedAt: string;
  }>;
};

function createFakeDb(fixture: LanguageFixture): Queryable {
  return {
    async query<T>(text: string, params?: readonly unknown[]) {
      if (text.includes('FROM assessments a') && text.includes('LEFT JOIN assessment_versions av')) {
        const assessmentKey = params?.[0] as string;
        return {
          rows: fixture.baseRows.filter((row) => row.assessment_key === assessmentKey) as T[],
        };
      }

      if (text.includes('LEFT JOIN LATERAL') && text.includes('draft_version_id')) {
        const assessmentKey = params?.[0] as string;
        const scopedRows = fixture.baseRows.filter((row) => row.assessment_key === assessmentKey);
        const draft = scopedRows.find((row) => row.version_status === 'DRAFT') ?? null;
        const first = scopedRows[0];
        return {
          rows: first
            ? ([{
                assessment_id: first.assessment_id,
                assessment_key: first.assessment_key,
                draft_version_id: draft?.assessment_version_id ?? null,
                draft_version_tag: draft?.version_tag ?? null,
              }] as unknown as T[])
            : ([] as T[]),
        };
      }

      if (text.includes('AS domain_count') && text.includes('AS signal_count')) {
        return {
          rows: [{
            domain_count: '0',
            signal_count: '0',
            orphan_signal_count: '0',
            cross_version_signal_count: '0',
          }] as T[],
        };
      }

      if (text.includes('AS question_count') && text.includes('questions_without_options_count')) {
        return {
          rows: [{
            question_count: '0',
            option_count: '0',
            questions_without_options_count: '0',
            orphan_question_count: '0',
            cross_version_question_count: '0',
            orphan_option_count: '0',
            cross_version_option_count: '0',
          }] as T[],
        };
      }

      if (text.includes('AS weighted_option_count') && text.includes('cross_version_weight_signal_count')) {
        return {
          rows: [{
            weighted_option_count: '0',
            unmapped_option_count: '0',
            weight_mapping_count: '0',
            orphan_weight_option_count: '0',
            orphan_weight_signal_count: '0',
            cross_version_weight_option_count: '0',
            cross_version_weight_signal_count: '0',
          }] as T[],
        };
      }

      if (text.includes("FROM domains") && text.includes("domain_type = 'SIGNAL_GROUP'")) {
        return { rows: [] as T[] };
      }

      if (text.includes('FROM signals') && text.includes('WHERE assessment_version_id = $1') && text.includes('signal_created_at')) {
        return { rows: [] as T[] };
      }

      if (text.includes('FROM domains') && !text.includes("domain_type = 'SIGNAL_GROUP'")) {
        return { rows: [] as T[] };
      }

      if (text.includes('FROM questions q') && text.includes('LEFT JOIN options o ON o.question_id = q.id')) {
        return { rows: [] as T[] };
      }

      if (text.includes('FROM option_signal_weights osw')) {
        return { rows: [] as T[] };
      }

      if (text.includes('FROM signals s') && text.includes('INNER JOIN domains d')) {
        return { rows: [] as T[] };
      }

      if (text.includes('FROM assessment_version_language_signals')) {
        const assessmentVersionId = params?.[0] as string;
        return {
          rows: (fixture.signals ?? [])
            .filter((row) => row.assessmentVersionId === assessmentVersionId)
            .map((row) => ({
              id: row.id,
              assessment_version_id: row.assessmentVersionId,
              signal_key: row.signalKey,
              section: row.section,
              content: row.content,
              created_at: row.createdAt,
              updated_at: row.updatedAt,
            })) as T[],
        };
      }

      if (text.includes('FROM assessment_version_language_pairs')) {
        const assessmentVersionId = params?.[0] as string;
        return {
          rows: (fixture.pairs ?? [])
            .filter((row) => row.assessmentVersionId === assessmentVersionId)
            .map((row) => ({
              id: row.id,
              assessment_version_id: row.assessmentVersionId,
              signal_pair: row.signalPair,
              section: row.section,
              content: row.content,
              created_at: row.createdAt,
              updated_at: row.updatedAt,
            })) as T[],
        };
      }

      if (text.includes('FROM assessment_version_language_domains')) {
        const assessmentVersionId = params?.[0] as string;
        return {
          rows: (fixture.domains ?? [])
            .filter((row) => row.assessmentVersionId === assessmentVersionId)
            .map((row) => ({
              id: row.id,
              assessment_version_id: row.assessmentVersionId,
              domain_key: row.domainKey,
              section: row.section,
              content: row.content,
              created_at: row.createdAt,
              updated_at: row.updatedAt,
            })) as T[],
        };
      }

      if (text.includes('FROM assessment_version_language_overview')) {
        const assessmentVersionId = params?.[0] as string;
        return {
          rows: (fixture.overview ?? [])
            .filter((row) => row.assessmentVersionId === assessmentVersionId)
            .map((row) => ({
              id: row.id,
              assessment_version_id: row.assessmentVersionId,
              pattern_key: row.patternKey,
              section: row.section,
              content: row.content,
              created_at: row.createdAt,
              updated_at: row.updatedAt,
            })) as T[],
        };
      }

      return { rows: [] as T[] };
    },
  };
}

function buildAssessmentRow(overrides?: Partial<AssessmentRow>): AssessmentRow {
  return {
    assessment_id: 'assessment-1',
    assessment_key: 'wplp80',
    assessment_title: 'WPLP-80',
    assessment_description: 'Flagship assessment',
    assessment_is_active: true,
    assessment_created_at: '2026-01-01T00:00:00.000Z',
    assessment_updated_at: '2026-01-05T00:00:00.000Z',
    assessment_version_id: 'version-draft',
    version_tag: '1.1.0',
    version_status: 'DRAFT',
    published_at: null,
    version_created_at: '2026-01-04T00:00:00.000Z',
    version_updated_at: '2026-01-05T00:00:00.000Z',
    question_count: '0',
    ...overrides,
  };
}

test('language step view model resolves the latest draft version and derives counts server-side', async () => {
  const viewModel = await getAdminAssessmentLanguageStepViewModel(
    createFakeDb({
      baseRows: [
        buildAssessmentRow(),
        buildAssessmentRow({
          assessment_version_id: 'version-published',
          version_tag: '1.0.0',
          version_status: 'PUBLISHED',
          published_at: '2026-01-03T00:00:00.000Z',
          version_created_at: '2026-01-02T00:00:00.000Z',
          version_updated_at: '2026-01-03T00:00:00.000Z',
        }),
      ],
      signals: [
        {
          id: 'signal-language-1',
          assessmentVersionId: 'version-draft',
          signalKey: 'driver',
          section: 'summary',
          content: 'Driver summary',
          createdAt: '2026-04-01T00:00:01.000Z',
          updatedAt: '2026-04-01T00:00:01.000Z',
        },
        {
          id: 'signal-language-2',
          assessmentVersionId: 'version-draft',
          signalKey: 'analyst',
          section: 'summary',
          content: 'Analyst summary',
          createdAt: '2026-04-01T00:00:02.000Z',
          updatedAt: '2026-04-01T00:00:02.000Z',
        },
      ],
      pairs: [
        {
          id: 'pair-language-1',
          assessmentVersionId: 'version-draft',
          signalPair: 'driver_analyst',
          section: 'summary',
          content: 'Pair summary',
          createdAt: '2026-04-01T00:00:03.000Z',
          updatedAt: '2026-04-01T00:00:03.000Z',
        },
      ],
      domains: [
        {
          id: 'domain-language-1',
          assessmentVersionId: 'version-draft',
          domainKey: 'leadership',
          section: 'summary',
          content: 'Domain summary',
          createdAt: '2026-04-01T00:00:04.000Z',
          updatedAt: '2026-04-01T00:00:04.000Z',
        },
      ],
      overview: [
        {
          id: 'overview-language-1',
          assessmentVersionId: 'version-draft',
          patternKey: 'pattern-core',
          section: 'headline',
          content: 'Headline',
          createdAt: '2026-04-01T00:00:05.000Z',
          updatedAt: '2026-04-01T00:00:05.000Z',
        },
      ],
    }),
    'wplp80',
  );

  assert.ok(viewModel);
  assert.equal(viewModel?.activeVersion?.assessmentVersionId, 'version-draft');
  assert.equal(viewModel?.activeVersion?.status, 'draft');
  assert.deepEqual(viewModel?.counts, {
    signals: { entryCount: 2 },
    pairs: { entryCount: 1 },
    domains: { entryCount: 1 },
    overview: { entryCount: 1 },
  });
});

test('language step view model falls back to the published version when no draft exists', async () => {
  const viewModel = await getAdminAssessmentLanguageStepViewModel(
    createFakeDb({
      baseRows: [
        buildAssessmentRow({
          assessment_version_id: 'version-published',
          version_tag: '1.0.0',
          version_status: 'PUBLISHED',
          published_at: '2026-01-03T00:00:00.000Z',
          version_created_at: '2026-01-02T00:00:00.000Z',
          version_updated_at: '2026-01-03T00:00:00.000Z',
        }),
      ],
      overview: [
        {
          id: 'overview-language-1',
          assessmentVersionId: 'version-published',
          patternKey: 'pattern-core',
          section: 'headline',
          content: 'Headline',
          createdAt: '2026-04-01T00:00:05.000Z',
          updatedAt: '2026-04-01T00:00:05.000Z',
        },
      ],
    }),
    'wplp80',
  );

  assert.ok(viewModel);
  assert.equal(viewModel?.activeVersion?.assessmentVersionId, 'version-published');
  assert.equal(viewModel?.activeVersion?.status, 'published');
  assert.equal(viewModel?.counts.overview.entryCount, 1);
});

test('language step view model returns null for a missing assessment and empty version state when no versions exist', async () => {
  const missingAssessment = await getAdminAssessmentLanguageStepViewModel(
    createFakeDb({ baseRows: [] }),
    'missing-assessment',
  );
  const noVersionAssessment = await getAdminAssessmentLanguageStepViewModel(
    createFakeDb({
      baseRows: [
        buildAssessmentRow({
          assessment_version_id: null,
          version_tag: null,
          version_status: null,
          published_at: null,
          version_created_at: null,
          version_updated_at: null,
        }),
      ],
    }),
    'wplp80',
  );

  assert.equal(missingAssessment, null);
  assert.equal(noVersionAssessment?.activeVersion, null);
  assert.deepEqual(noVersionAssessment?.counts, {
    signals: { entryCount: 0 },
    pairs: { entryCount: 0 },
    domains: { entryCount: 0 },
    overview: { entryCount: 0 },
  });
});

test('language step component renders the signal and pair language panels, placeholder sections, and count summaries', () => {
  const markup = renderToStaticMarkup(
    <AdminAssessmentLanguageStep
      viewModel={{
        assessmentId: 'assessment-1',
        assessmentKey: 'wplp80',
        assessmentTitle: 'WPLP-80',
        assessmentDescription: 'Flagship assessment',
        activeVersion: {
          assessmentVersionId: 'version-draft',
          versionTag: '1.1.0',
          status: 'draft',
        },
        availableVersions: [
          {
            assessmentVersionId: 'version-draft',
            versionTag: '1.1.0',
            status: 'draft',
          },
        ],
        counts: {
          signals: { entryCount: 2 },
          pairs: { entryCount: 1 },
          domains: { entryCount: 1 },
          overview: { entryCount: 3 },
        },
      }}
    />,
  );

  assert.match(markup, /Language/);
  assert.match(markup, /Signal Language/);
  assert.match(markup, /Signal Language import/);
  assert.match(markup, /Pair Language/);
  assert.match(markup, /Pair Language import/);
  assert.match(markup, /Domain Language/);
  assert.match(markup, /Development \/ Pressure \/ Environment/);
  assert.match(markup, /Overview Templates/);
  assert.match(markup, /signal_key \| section \| content/);
  assert.match(markup, /Import replaces all existing Signal Language rows for this assessment version\./);
  assert.match(markup, /signal_pair \| section \| content/);
  assert.match(markup, /Import replaces all existing Pair Language rows for this assessment version\./);
  assert.match(markup, /domain_key \| section \| content/);
  assert.match(markup, /pattern_key \| section \| content/);
  assert.match(markup, /2 entries/);
  assert.match(markup, /1 entry/);
  assert.match(markup, /3 entries/);
});

test('language step component shows a safe empty state when no usable version context exists', () => {
  const markup = renderToStaticMarkup(
    <AdminAssessmentLanguageStep
      viewModel={{
        assessmentId: 'assessment-1',
        assessmentKey: 'wplp80',
        assessmentTitle: 'WPLP-80',
        assessmentDescription: 'Flagship assessment',
        activeVersion: null,
        availableVersions: [],
        counts: {
          signals: { entryCount: 0 },
          pairs: { entryCount: 0 },
          domains: { entryCount: 0 },
          overview: { entryCount: 0 },
        },
      }}
    />,
  );

  assert.match(markup, /No version context available/);
  assert.match(markup, /Create a draft or publish a version before adding structured language datasets\./);
});
