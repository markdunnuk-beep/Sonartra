import test from 'node:test';
import assert from 'node:assert/strict';
import { renderToStaticMarkup } from 'react-dom/server';

import { AdminAssessmentLanguageStep } from '@/components/admin/admin-assessment-language-step';
import type { Queryable } from '@/lib/engine/repository-sql';
import { getAdminAssessmentLanguageStepViewModel } from '@/lib/server/admin-assessment-language-step';
import {
  importHeroHeaderLanguageForAssessmentVersionWithDependencies,
  previewHeroHeaderLanguageForAssessmentVersionWithDependencies,
} from '@/lib/server/admin-hero-header-language-import';

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
  throwMissingLanguageTables?: boolean;
  missingTables?: string[];
  assessment?: Array<{
    assessmentVersionId: string;
    section: 'assessment_description';
    content: string;
  }>;
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
  heroHeaders?: Array<{
    id: string;
    assessmentVersionId: string;
    pairKey: string;
    headline: string;
    createdAt: string;
    updatedAt: string;
  }>;
  pairTraitWeights?: Array<{ assessmentVersionId: string }>;
  heroPatternRules?: Array<{ assessmentVersionId: string }>;
  heroPatternLanguage?: Array<{ assessmentVersionId: string }>;
};

function createFakeDb(fixture: LanguageFixture): Queryable {
  const missingTables = new Set(fixture.missingTables ?? []);

  function throwMissingTable(tableName: string): never {
    const error = new Error(`relation "${tableName}" does not exist`) as Error & {
      code?: string;
    };
    error.code = '42P01';
    throw error;
  }

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
        if (fixture.throwMissingLanguageTables || missingTables.has('assessment_version_language_signals')) {
          throwMissingTable('assessment_version_language_signals');
        }

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

      if (text.includes('FROM assessment_version_language_assessment')) {
        if (fixture.throwMissingLanguageTables || missingTables.has('assessment_version_language_assessment')) {
          throwMissingTable('assessment_version_language_assessment');
        }

        const assessmentVersionId = params?.[0] as string;
        return {
          rows: (fixture.assessment ?? [])
            .filter((row) => row.assessmentVersionId === assessmentVersionId)
            .map((row) => ({
              section: row.section,
              content: row.content,
            })) as T[],
        };
      }

      if (text.includes('FROM assessment_version_language_pairs')) {
        if (fixture.throwMissingLanguageTables || missingTables.has('assessment_version_language_pairs')) {
          throwMissingTable('assessment_version_language_pairs');
        }

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
        if (fixture.throwMissingLanguageTables || missingTables.has('assessment_version_language_domains')) {
          throwMissingTable('assessment_version_language_domains');
        }

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
        if (fixture.throwMissingLanguageTables || missingTables.has('assessment_version_language_overview')) {
          throwMissingTable('assessment_version_language_overview');
        }

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

      if (text.includes('SELECT') && text.includes('FROM assessment_version_language_hero_headers')) {
        if (fixture.throwMissingLanguageTables || missingTables.has('assessment_version_language_hero_headers')) {
          throwMissingTable('assessment_version_language_hero_headers');
        }

        const assessmentVersionId = params?.[0] as string;
        return {
          rows: (fixture.heroHeaders ?? [])
            .filter((row) => row.assessmentVersionId === assessmentVersionId)
            .map((row) => ({
              id: row.id,
              assessment_version_id: row.assessmentVersionId,
              pair_key: row.pairKey,
              headline: row.headline,
              created_at: row.createdAt,
              updated_at: row.updatedAt,
            })) as T[],
        };
      }

      if (text.includes('FROM assessment_version_pair_trait_weights')) {
        if (missingTables.has('assessment_version_pair_trait_weights')) {
          throwMissingTable('assessment_version_pair_trait_weights');
        }

        const assessmentVersionId = params?.[0] as string;
        return {
          rows: (fixture.pairTraitWeights ?? [])
            .filter((row) => row.assessmentVersionId === assessmentVersionId) as T[],
        };
      }

      if (text.includes('FROM assessment_version_hero_pattern_rules')) {
        if (missingTables.has('assessment_version_hero_pattern_rules')) {
          throwMissingTable('assessment_version_hero_pattern_rules');
        }

        const assessmentVersionId = params?.[0] as string;
        return {
          rows: (fixture.heroPatternRules ?? [])
            .filter((row) => row.assessmentVersionId === assessmentVersionId) as T[],
        };
      }

      if (text.includes('FROM assessment_version_hero_pattern_language')) {
        if (missingTables.has('assessment_version_hero_pattern_language')) {
          throwMissingTable('assessment_version_hero_pattern_language');
        }

        const assessmentVersionId = params?.[0] as string;
        return {
          rows: (fixture.heroPatternLanguage ?? [])
            .filter((row) => row.assessmentVersionId === assessmentVersionId) as T[],
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

function createHeroHeaderImportDb(seed?: {
  assessments?: Array<{ id: string; assessmentKey: string }>;
  versions?: Array<{ id: string; assessmentId: string; lifecycleStatus: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED' }>;
  domains?: Array<{ id: string; assessmentVersionId: string; orderIndex: number }>;
  signals?: Array<{ id: string; assessmentVersionId: string; domainId: string; signalKey: string; orderIndex: number }>;
  heroHeaders?: Array<{ id: string; assessmentVersionId: string; pairKey: string; headline: string }>;
}, config?: {
  heroHeaderTableAvailable?: boolean;
}) {
  const state = {
    assessments: [...(seed?.assessments ?? [])],
    versions: [...(seed?.versions ?? [])],
    domains: [...(seed?.domains ?? [])],
    signals: [...(seed?.signals ?? [])],
    heroHeaders: [...(seed?.heroHeaders ?? [])],
  };
  const heroHeaderTableAvailable = config?.heroHeaderTableAvailable ?? true;

  let snapshot: typeof state | null = null;

  const client = {
    async query<T>(text: string, params?: readonly unknown[]) {
      const sql = text.replace(/\s+/g, ' ').trim();

      if (sql === 'BEGIN') {
        snapshot = {
          assessments: state.assessments.map((row) => ({ ...row })),
          versions: state.versions.map((row) => ({ ...row })),
          domains: state.domains.map((row) => ({ ...row })),
          signals: state.signals.map((row) => ({ ...row })),
          heroHeaders: state.heroHeaders.map((row) => ({ ...row })),
        };
        return { rows: [] as T[] };
      }

      if (sql === 'COMMIT') {
        snapshot = null;
        return { rows: [] as T[] };
      }

      if (sql === 'ROLLBACK') {
        if (snapshot) {
          state.assessments = snapshot.assessments;
          state.versions = snapshot.versions;
          state.domains = snapshot.domains;
          state.signals = snapshot.signals;
          state.heroHeaders = snapshot.heroHeaders;
        }
        snapshot = null;
        return { rows: [] as T[] };
      }

      if (sql.includes('FROM assessment_versions av') && sql.includes('INNER JOIN assessments a ON a.id = av.assessment_id')) {
        const assessmentVersionId = params?.[0] as string;
        const version = state.versions.find((row) => row.id === assessmentVersionId) ?? null;
        const assessment = version ? state.assessments.find((row) => row.id === version.assessmentId) ?? null : null;
        return {
          rows: version && assessment
            ? ([{
                assessment_key: assessment.assessmentKey,
                assessment_version_id: version.id,
                lifecycle_status: version.lifecycleStatus,
              }] as unknown as T[])
            : ([] as T[]),
        };
      }

      if (sql.includes('FROM signals s') && sql.includes('INNER JOIN domains d')) {
        const assessmentVersionId = params?.[0] as string;
        const domainOrder = new Map(
          state.domains.filter((row) => row.assessmentVersionId === assessmentVersionId).map((row) => [row.id, row.orderIndex]),
        );
        return {
          rows: state.signals
            .filter((row) => row.assessmentVersionId === assessmentVersionId)
            .sort(
              (left, right) =>
                (domainOrder.get(left.domainId) ?? 0) - (domainOrder.get(right.domainId) ?? 0) ||
                left.orderIndex - right.orderIndex ||
                left.id.localeCompare(right.id),
            )
            .map((row) => ({ signal_key: row.signalKey })) as unknown as T[],
        };
      }

      if (sql.includes('FROM information_schema.tables') && sql.includes('assessment_version_language_hero_headers')) {
        return {
          rows: ([{ present: heroHeaderTableAvailable }] as unknown[]) as T[],
        };
      }

      if (sql.includes('SELECT') && sql.includes('FROM assessment_version_language_hero_headers')) {
        if (!heroHeaderTableAvailable) {
          const error = new Error('relation "assessment_version_language_hero_headers" does not exist') as Error & {
            code?: string;
          };
          error.code = '42P01';
          throw error;
        }

        const assessmentVersionId = params?.[0] as string;
        return {
          rows: state.heroHeaders
            .filter((row) => row.assessmentVersionId === assessmentVersionId)
            .map((row) => ({
              id: row.id,
              assessment_version_id: row.assessmentVersionId,
              pair_key: row.pairKey,
              headline: row.headline,
              created_at: '2026-04-01T00:00:00.000Z',
              updated_at: '2026-04-01T00:00:00.000Z',
            })) as unknown as T[],
        };
      }

      if (sql.startsWith('DELETE FROM assessment_version_language_hero_headers')) {
        if (!heroHeaderTableAvailable) {
          const error = new Error('relation "assessment_version_language_hero_headers" does not exist') as Error & {
            code?: string;
          };
          error.code = '42P01';
          throw error;
        }

        const assessmentVersionId = params?.[0] as string;
        state.heroHeaders = state.heroHeaders.filter((row) => row.assessmentVersionId !== assessmentVersionId);
        return { rows: [] as T[] };
      }

      if (sql.startsWith('INSERT INTO assessment_version_language_hero_headers')) {
        if (!heroHeaderTableAvailable) {
          const error = new Error('relation "assessment_version_language_hero_headers" does not exist') as Error & {
            code?: string;
          };
          error.code = '42P01';
          throw error;
        }

        const [assessmentVersionId, pairKey, headline] = params as [string, string, string];
        state.heroHeaders.push({
          id: `hero-header-${state.heroHeaders.length + 1}`,
          assessmentVersionId,
          pairKey,
          headline,
        });
        return { rows: [] as T[] };
      }

      return { rows: [] as T[] };
    },
    async connect() {
      return {
        query: client.query,
        release() {},
      };
    },
  };

  return { client, state };
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
      assessment: [
        {
          assessmentVersionId: 'version-draft',
          section: 'assessment_description',
          content: 'Assessment introduction copy',
        },
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
      heroHeaders: [
        {
          id: 'hero-header-1',
          assessmentVersionId: 'version-draft',
          pairKey: 'driver_analyst',
          headline: 'Fast, structured, decisive.',
          createdAt: '2026-04-01T00:00:06.000Z',
          updatedAt: '2026-04-01T00:00:06.000Z',
        },
      ],
      pairTraitWeights: [{ assessmentVersionId: 'version-draft' }, { assessmentVersionId: 'version-draft' }],
      heroPatternRules: [{ assessmentVersionId: 'version-draft' }],
      heroPatternLanguage: [{ assessmentVersionId: 'version-draft' }],
    }),
    'wplp80',
  );

  assert.ok(viewModel);
  assert.equal(viewModel?.activeVersion?.assessmentVersionId, 'version-draft');
  assert.equal(viewModel?.activeVersion?.status, 'draft');
  assert.equal(viewModel?.assessmentLanguageDescription, 'Assessment introduction copy');
  assert.deepEqual(viewModel?.counts, {
    assessment: { entryCount: 1 },
    heroHeaders: { entryCount: 1 },
    signals: { entryCount: 2 },
    pairs: { entryCount: 1 },
    domains: { entryCount: 1 },
    pairTraitWeights: { entryCount: 2 },
    heroPatternRules: { entryCount: 1 },
    heroPatternLanguage: { entryCount: 1 },
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
  assert.equal(viewModel?.assessmentLanguageDescription, null);
  assert.equal(viewModel?.counts.heroHeaders.entryCount, 0);
  assert.equal(viewModel?.counts.pairTraitWeights.entryCount, 0);
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
    assessment: { entryCount: 0 },
    heroHeaders: { entryCount: 0 },
    signals: { entryCount: 0 },
    pairs: { entryCount: 0 },
    domains: { entryCount: 0 },
    pairTraitWeights: { entryCount: 0 },
    heroPatternRules: { entryCount: 0 },
    heroPatternLanguage: { entryCount: 0 },
  });
});

test('language step component renders intro, hero header, domain chapters, signals, and pairs in report order', () => {
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
        languageSchemaStatus: 'available',
        languageSchemaMessage: null,
        assessmentLanguageDescription: 'Assessment introduction copy',
        counts: {
          assessment: { entryCount: 1 },
          heroHeaders: { entryCount: 2 },
          signals: { entryCount: 2 },
          pairs: { entryCount: 1 },
          domains: { entryCount: 1 },
          pairTraitWeights: { entryCount: 12 },
          heroPatternRules: { entryCount: 8 },
          heroPatternLanguage: { entryCount: 9 },
        },
      }}
    />,
  );

  assert.match(markup, /Language/);
  assert.match(markup, /Report Introduction/);
  assert.match(markup, /Opening report copy shown in the results experience, separate from the Assessment Intro shown before questions\./);
  assert.match(markup, /Assessment introduction copy/);
  assert.match(markup, /rounded-\[1\.25rem\] border border-white\/10 bg-gradient-to-b from-white\/\[0\.02\] to-transparent p-\[1px\]/);
  assert.match(markup, /rounded-\[1\.25rem\] bg-black\/30/);
  assert.match(markup, /Import report language/);
  assert.match(markup, /Import Hero engine datasets/);
  assert.match(markup, /Pair Trait Weights/);
  assert.match(markup, /Hero Pattern Rules/);
  assert.match(markup, /Hero Pattern Language/);
  assert.match(markup, /Current rows: 12/);
  assert.match(markup, /Dataset type/);
  assert.match(markup, /Hero Header Language/);
  assert.match(markup, /Format: scope \| key \| headline/);
  assert.match(markup, /Paste Hero Header rows/);
  assert.match(markup, /Domain Chapter Language/);
  assert.match(markup, /Domain Chapter Language/);
  assert.match(markup, /Signal Language/);
  assert.match(markup, /Pair Summary Language/);
  assert.match(markup, /pair \| driver_influencer \| Fast-moving, people-driven and energised by momentum/);
  assert.match(markup, /supported authoring path for report language/i);
  assert.doesNotMatch(markup, /Actions<\/h3>/);
  assert.match(markup, /2 entries/);
  assert.match(markup, /1 entry/);
  assert.match(markup, /Current Hero Header rows: 2/);
  assert.match(markup, /Pair Traits/);
  assert.match(markup, /Hero Rules/);
  assert.match(markup, /Hero Language/);
  assert.match(markup, /Report introduction/);
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
        languageSchemaStatus: 'available',
        languageSchemaMessage: null,
        assessmentLanguageDescription: null,
        counts: {
          assessment: { entryCount: 0 },
          heroHeaders: { entryCount: 0 },
          signals: { entryCount: 0 },
          pairs: { entryCount: 0 },
          domains: { entryCount: 0 },
          pairTraitWeights: { entryCount: 0 },
          heroPatternRules: { entryCount: 0 },
          heroPatternLanguage: { entryCount: 0 },
        },
      }}
    />,
  );

  assert.match(markup, /No version context available/);
  assert.match(markup, /Create a draft or publish a version before adding structured language datasets\./);
});

test('hero header preview and import accept valid pair rows and replace version-scoped rows', async () => {
  const fake = createHeroHeaderImportDb({
    assessments: [{ id: 'assessment-1', assessmentKey: 'wplp80' }],
    versions: [{ id: 'version-draft', assessmentId: 'assessment-1', lifecycleStatus: 'DRAFT' }],
    domains: [{ id: 'domain-1', assessmentVersionId: 'version-draft', orderIndex: 0 }],
    signals: [
      { id: 'signal-1', assessmentVersionId: 'version-draft', domainId: 'domain-1', signalKey: 'style_driver', orderIndex: 0 },
      { id: 'signal-2', assessmentVersionId: 'version-draft', domainId: 'domain-1', signalKey: 'style_influencer', orderIndex: 1 },
    ],
    heroHeaders: [
      { id: 'hero-header-old', assessmentVersionId: 'version-draft', pairKey: 'driver_analyst', headline: 'Old headline' },
    ],
  });

  const preview = await previewHeroHeaderLanguageForAssessmentVersionWithDependencies(
    {
      assessmentVersionId: 'version-draft',
      rawInput: 'pair | driver_influencer | Fast-moving, people-driven and energised by momentum',
    },
    { db: fake.client },
  );

  assert.equal(preview.success, true);
  assert.equal(preview.summary.existingRowCount, 1);
  assert.deepEqual(preview.previewGroups, [
    {
      targetKey: 'driver_influencer',
      targetLabel: 'driver_influencer',
      entries: [
        {
          lineNumber: 1,
          label: 'headline',
          content: 'Fast-moving, people-driven and energised by momentum',
        },
      ],
    },
  ]);

  const result = await importHeroHeaderLanguageForAssessmentVersionWithDependencies(
    {
      assessmentVersionId: 'version-draft',
      rawInput: 'pair | driver_influencer | Fast-moving, people-driven and energised by momentum',
    },
    { db: fake.client, revalidatePath() {} },
  );

  assert.equal(result.success, true);
  assert.deepEqual(fake.state.heroHeaders, [
    {
      id: 'hero-header-1',
      assessmentVersionId: 'version-draft',
      pairKey: 'driver_influencer',
      headline: 'Fast-moving, people-driven and energised by momentum',
    },
  ]);
});

test('hero header validation rejects invalid pair keys and invalid scopes', async () => {
  const fake = createHeroHeaderImportDb({
    assessments: [{ id: 'assessment-1', assessmentKey: 'wplp80' }],
    versions: [{ id: 'version-draft', assessmentId: 'assessment-1', lifecycleStatus: 'DRAFT' }],
    domains: [{ id: 'domain-1', assessmentVersionId: 'version-draft', orderIndex: 0 }],
    signals: [
      { id: 'signal-1', assessmentVersionId: 'version-draft', domainId: 'domain-1', signalKey: 'style_driver', orderIndex: 0 },
      { id: 'signal-2', assessmentVersionId: 'version-draft', domainId: 'domain-1', signalKey: 'style_influencer', orderIndex: 1 },
    ],
  });

  const invalidKey = await previewHeroHeaderLanguageForAssessmentVersionWithDependencies(
    {
      assessmentVersionId: 'version-draft',
      rawInput: 'pair | driver_unknown | Invalid pair key',
    },
    { db: fake.client },
  );

  const invalidScope = await previewHeroHeaderLanguageForAssessmentVersionWithDependencies(
    {
      assessmentVersionId: 'version-draft',
      rawInput: 'signal | driver_influencer | Invalid scope',
    },
    { db: fake.client },
  );

  assert.equal(invalidKey.success, false);
  assert.equal(invalidKey.validationErrors[0]?.code, 'UNKNOWN_SIGNAL_KEY');
  assert.equal(invalidScope.success, false);
  assert.equal(invalidScope.validationErrors[0]?.code, 'INVALID_SCOPE');
});

test('hero header preview blocks imports for published versions', async () => {
  const fake = createHeroHeaderImportDb({
    assessments: [{ id: 'assessment-1', assessmentKey: 'wplp80' }],
    versions: [{ id: 'version-published', assessmentId: 'assessment-1', lifecycleStatus: 'PUBLISHED' }],
    domains: [{ id: 'domain-1', assessmentVersionId: 'version-published', orderIndex: 0 }],
    signals: [
      { id: 'signal-1', assessmentVersionId: 'version-published', domainId: 'domain-1', signalKey: 'driver', orderIndex: 0 },
      { id: 'signal-2', assessmentVersionId: 'version-published', domainId: 'domain-1', signalKey: 'influencer', orderIndex: 1 },
    ],
  });

  const result = await previewHeroHeaderLanguageForAssessmentVersionWithDependencies(
    {
      assessmentVersionId: 'version-published',
      rawInput: 'pair | driver_influencer | Published versions should not import',
    },
    { db: fake.client },
  );

  assert.equal(result.success, false);
  assert.equal(result.canImport, false);
  assert.equal(result.planErrors[0]?.code, 'ASSESSMENT_VERSION_NOT_EDITABLE');
  assert.match(result.planErrors[0]?.message ?? '', /draft assessment versions/i);
});

test('hero header validation rejects duplicate canonical pair rows', async () => {
  const fake = createHeroHeaderImportDb({
    assessments: [{ id: 'assessment-1', assessmentKey: 'wplp80' }],
    versions: [{ id: 'version-draft', assessmentId: 'assessment-1', lifecycleStatus: 'DRAFT' }],
    domains: [{ id: 'domain-1', assessmentVersionId: 'version-draft', orderIndex: 0 }],
    signals: [
      { id: 'signal-1', assessmentVersionId: 'version-draft', domainId: 'domain-1', signalKey: 'driver', orderIndex: 0 },
      { id: 'signal-2', assessmentVersionId: 'version-draft', domainId: 'domain-1', signalKey: 'influencer', orderIndex: 1 },
    ],
  });

  const result = await previewHeroHeaderLanguageForAssessmentVersionWithDependencies(
    {
      assessmentVersionId: 'version-draft',
      rawInput: [
        'pair | driver_influencer | First headline',
        'pair | influencer_driver | Duplicate canonical headline',
      ].join('\n'),
    },
    { db: fake.client },
  );

  assert.equal(result.success, false);
  assert.equal(result.validationErrors[0]?.code, 'DUPLICATE_ENTRY');
  assert.match(result.validationErrors[0]?.message ?? '', /Duplicate hero header entry detected for pair driver_influencer/i);
});

test('hero header preview reports when the hero header table is missing in the environment', async () => {
  const fake = createHeroHeaderImportDb(
    {
      assessments: [{ id: 'assessment-1', assessmentKey: 'wplp80' }],
      versions: [{ id: 'version-draft', assessmentId: 'assessment-1', lifecycleStatus: 'DRAFT' }],
      domains: [{ id: 'domain-1', assessmentVersionId: 'version-draft', orderIndex: 0 }],
      signals: [
        { id: 'signal-1', assessmentVersionId: 'version-draft', domainId: 'domain-1', signalKey: 'driver', orderIndex: 0 },
        { id: 'signal-2', assessmentVersionId: 'version-draft', domainId: 'domain-1', signalKey: 'influencer', orderIndex: 1 },
      ],
    },
    { heroHeaderTableAvailable: false },
  );

  const result = await previewHeroHeaderLanguageForAssessmentVersionWithDependencies(
    {
      assessmentVersionId: 'version-draft',
      rawInput: 'pair | driver_influencer | Missing table should block import',
    },
    { db: fake.client },
  );

  assert.equal(result.success, false);
  assert.equal(result.canImport, false);
  assert.equal(result.planErrors[0]?.code, 'HERO_HEADER_TABLE_UNAVAILABLE');
  assert.match(result.planErrors[0]?.message ?? '', /Hero Header table is missing in this environment/i);
});

test('hero header import returns a specific execution error when the table is missing at write time', async () => {
  const fake = createHeroHeaderImportDb(
    {
      assessments: [{ id: 'assessment-1', assessmentKey: 'wplp80' }],
      versions: [{ id: 'version-draft', assessmentId: 'assessment-1', lifecycleStatus: 'DRAFT' }],
      domains: [{ id: 'domain-1', assessmentVersionId: 'version-draft', orderIndex: 0 }],
      signals: [
        { id: 'signal-1', assessmentVersionId: 'version-draft', domainId: 'domain-1', signalKey: 'driver', orderIndex: 0 },
        { id: 'signal-2', assessmentVersionId: 'version-draft', domainId: 'domain-1', signalKey: 'influencer', orderIndex: 1 },
      ],
    },
    { heroHeaderTableAvailable: false },
  );

  const result = await importHeroHeaderLanguageForAssessmentVersionWithDependencies(
    {
      assessmentVersionId: 'version-draft',
      rawInput: 'pair | driver_influencer | Missing table should surface a useful error',
    },
    { db: fake.client, revalidatePath() {} },
  );

  assert.equal(result.success, false);
  assert.equal(result.canImport, false);
  assert.equal(result.executionError, null);
  assert.equal(result.planErrors[0]?.code, 'HERO_HEADER_TABLE_UNAVAILABLE');
  assert.match(result.planErrors[0]?.message ?? '', /Run the hero header migration before importing/i);
});

test('language step view model degrades safely when language tables are unavailable at runtime', async () => {
  const viewModel = await getAdminAssessmentLanguageStepViewModel(
    createFakeDb({
      baseRows: [buildAssessmentRow()],
      throwMissingLanguageTables: true,
    }),
    'wplp80',
  );

  assert.ok(viewModel);
  assert.equal(viewModel?.activeVersion?.assessmentVersionId, 'version-draft');
  assert.equal(viewModel?.languageSchemaStatus, 'unavailable');
  assert.match(viewModel?.languageSchemaMessage ?? '', /Language datasets are unavailable/);
  assert.deepEqual(viewModel?.counts, {
    assessment: { entryCount: 0 },
    heroHeaders: { entryCount: 0 },
    signals: { entryCount: 0 },
    pairs: { entryCount: 0 },
    domains: { entryCount: 0 },
    pairTraitWeights: { entryCount: 0 },
    heroPatternRules: { entryCount: 0 },
    heroPatternLanguage: { entryCount: 0 },
  });
});

test('language step view model degrades safely when hero tables are unavailable at runtime', async () => {
  const viewModel = await getAdminAssessmentLanguageStepViewModel(
    createFakeDb({
      baseRows: [buildAssessmentRow()],
      missingTables: ['assessment_version_pair_trait_weights'],
    }),
    'wplp80',
  );

  assert.ok(viewModel);
  assert.equal(viewModel?.activeVersion?.assessmentVersionId, 'version-draft');
  assert.equal(viewModel?.languageSchemaStatus, 'unavailable');
  assert.match(viewModel?.languageSchemaMessage ?? '', /Language datasets are unavailable/);
  assert.deepEqual(viewModel?.counts, {
    assessment: { entryCount: 0 },
    heroHeaders: { entryCount: 0 },
    signals: { entryCount: 0 },
    pairs: { entryCount: 0 },
    domains: { entryCount: 0 },
    pairTraitWeights: { entryCount: 0 },
    heroPatternRules: { entryCount: 0 },
    heroPatternLanguage: { entryCount: 0 },
  });
});

test('brand-new assessment with zero dataset rows still loads the language step', async () => {
  const viewModel = await getAdminAssessmentLanguageStepViewModel(
    createFakeDb({
      baseRows: [buildAssessmentRow()],
    }),
    'wplp80',
  );

  assert.ok(viewModel);
  assert.equal(viewModel?.languageSchemaStatus, 'available');
  assert.equal(viewModel?.assessmentLanguageDescription, null);
  assert.deepEqual(viewModel?.counts, {
    assessment: { entryCount: 0 },
    heroHeaders: { entryCount: 0 },
    signals: { entryCount: 0 },
    pairs: { entryCount: 0 },
    domains: { entryCount: 0 },
    pairTraitWeights: { entryCount: 0 },
    heroPatternRules: { entryCount: 0 },
    heroPatternLanguage: { entryCount: 0 },
  });
});

test('language step component shows a safe schema-unavailable state instead of rendering live panels', () => {
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
        languageSchemaStatus: 'unavailable',
        languageSchemaMessage:
          'Language datasets are unavailable for this environment. Apply the assessment version language migration before using this step.',
        assessmentLanguageDescription: null,
        counts: {
          assessment: { entryCount: 0 },
          heroHeaders: { entryCount: 0 },
          signals: { entryCount: 0 },
          pairs: { entryCount: 0 },
          domains: { entryCount: 0 },
          pairTraitWeights: { entryCount: 0 },
          heroPatternRules: { entryCount: 0 },
          heroPatternLanguage: { entryCount: 0 },
        },
      }}
    />,
  );

  assert.match(markup, /Language datasets unavailable/);
  assert.match(markup, /Apply the assessment version language migration before using this step\./);
  assert.doesNotMatch(markup, /Hero Header Language/);
  assert.doesNotMatch(markup, /Domain Chapter Language/);
  assert.doesNotMatch(markup, /Signal Language/);
  assert.doesNotMatch(markup, /Pair Summary Language/);
});
