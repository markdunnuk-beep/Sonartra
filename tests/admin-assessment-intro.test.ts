import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import { AdminAssessmentIntroEditor } from '@/components/admin/admin-assessment-intro-editor';
import { createEmptyAssessmentIntroState } from '@/lib/admin/admin-assessment-intro';
import type { Queryable } from '@/lib/engine/repository-sql';
import {
  saveAssessmentIntroActionWithDependencies,
} from '@/lib/server/admin-assessment-intro';
import { getAdminAssessmentIntroStepViewModel } from '@/lib/server/admin-assessment-intro-step';

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

type AssessmentVersionIntroRow = {
  assessmentVersionId: string;
  introTitle: string;
  introSummary: string;
  introHowItWorks: string;
  estimatedTimeOverride: string | null;
  instructions: string | null;
  confidentialityNote: string | null;
};

type AssessmentVersionRow = {
  assessmentVersionId: string;
  assessmentKey: string;
  lifecycleStatus: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
};

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

function createFakeDb(seed?: {
  assessmentRows?: readonly AssessmentRow[];
  introRows?: readonly AssessmentVersionIntroRow[];
  versionRows?: readonly AssessmentVersionRow[];
}): { db: Queryable; state: { introRows: AssessmentVersionIntroRow[] } } {
  const state = {
    assessmentRows: [...(seed?.assessmentRows ?? [])],
    introRows: [...(seed?.introRows ?? [])],
    versionRows: [...(seed?.versionRows ?? [])],
  };

  return {
    state: { introRows: state.introRows },
    db: {
      async query<T>(text: string, params?: readonly unknown[]) {
        const sql = text.replace(/\s+/g, ' ').trim();

        if (sql.includes('FROM assessments a') && sql.includes('LEFT JOIN assessment_versions av')) {
          const assessmentKey = String(params?.[0] ?? '');
          return {
            rows: state.assessmentRows.filter((row) => row.assessment_key === assessmentKey) as T[],
          };
        }

        if (sql.includes('FROM assessment_versions av') && sql.includes('INNER JOIN assessments a ON a.id = av.assessment_id')) {
          const assessmentVersionId = String(params?.[0] ?? '');
          const version = state.versionRows.find((row) => row.assessmentVersionId === assessmentVersionId);

          return {
            rows: (version
              ? [{
                  assessment_key: version.assessmentKey,
                  lifecycle_status: version.lifecycleStatus,
                }]
              : []) as T[],
          };
        }

        if (sql.includes('FROM assessment_version_intro')) {
          const assessmentVersionId = String(params?.[0] ?? '');

          return {
            rows: state.introRows
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
          const existing = state.introRows.find((row) => row.assessmentVersionId === assessmentVersionId);
          const nextRow: AssessmentVersionIntroRow = {
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
            state.introRows.push(nextRow);
          }

          return { rows: [] as T[] };
        }

        if (sql.includes('FROM domains') && sql.includes("domain_type = 'SIGNAL_GROUP'")) {
          return { rows: [] as T[] };
        }

        if (sql.includes('FROM signals') && sql.includes('signal_created_at')) {
          return { rows: [] as T[] };
        }

        if (sql.includes('FROM domains') && !sql.includes("domain_type = 'SIGNAL_GROUP'")) {
          return { rows: [] as T[] };
        }

        if (sql.includes('FROM questions q') && sql.includes('LEFT JOIN options o ON o.question_id = q.id')) {
          return { rows: [] as T[] };
        }

        if (sql.includes('FROM option_signal_weights osw')) {
          return { rows: [] as T[] };
        }

        if (sql.includes('FROM signals s') && sql.includes('INNER JOIN domains d')) {
          return { rows: [] as T[] };
        }

        if (sql.includes('LEFT JOIN LATERAL') && sql.includes('draft_version_id')) {
          const assessmentKey = String(params?.[0] ?? '');
          const scopedRows = state.assessmentRows.filter((row) => row.assessment_key === assessmentKey);
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

        if (sql.includes('AS domain_count') && sql.includes('AS signal_count')) {
          return {
            rows: [{
              domain_count: '0',
              signal_count: '0',
              orphan_signal_count: '0',
              cross_version_signal_count: '0',
            }] as T[],
          };
        }

        if (sql.includes('AS question_count') && sql.includes('questions_without_options_count')) {
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

        if (sql.includes('AS weighted_option_count') && sql.includes('cross_version_weight_signal_count')) {
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

        return { rows: [] as T[] };
      },
    },
  };
}

function buildFormData(values: Record<string, string>): FormData {
  const formData = new FormData();

  for (const [key, value] of Object.entries(values)) {
    formData.set(key, value);
  }

  return formData;
}

test('saveAssessmentIntroAction saves normalized intro content for draft versions and revalidates the authoring route', async () => {
  const fake = createFakeDb({
    versionRows: [{
      assessmentVersionId: 'version-draft',
      assessmentKey: 'wplp80',
      lifecycleStatus: 'DRAFT',
    }],
  });
  const revalidatedPaths: string[] = [];

  const state = await saveAssessmentIntroActionWithDependencies(
    {
      assessmentKey: 'wplp80',
      assessmentVersionId: 'version-draft',
    },
    createEmptyAssessmentIntroState(),
    buildFormData({
      introTitle: '  Welcome to Signals  ',
      introSummary: '  Measure the patterns that shape how you work.  ',
      introHowItWorks: '  Read each prompt and choose the response that fits best.  ',
      estimatedTimeOverride: '  About 18 minutes  ',
      instructions: '  Answer from your typical behaviour, not your ideal one.  ',
      confidentialityNote: '  Results are shared only with your programme team.  ',
    }),
    {
      db: fake.db,
      revalidatePath: (path) => revalidatedPaths.push(path),
    },
  );

  assert.equal(state.formError, null);
  assert.equal(state.formSuccess, 'Assessment intro saved.');
  assert.deepEqual(state.values, {
    introTitle: 'Welcome to Signals',
    introSummary: 'Measure the patterns that shape how you work.',
    introHowItWorks: 'Read each prompt and choose the response that fits best.',
    estimatedTimeOverride: 'About 18 minutes',
    instructions: 'Answer from your typical behaviour, not your ideal one.',
    confidentialityNote: 'Results are shared only with your programme team.',
  });
  assert.deepEqual(fake.state.introRows, [{
    assessmentVersionId: 'version-draft',
    introTitle: 'Welcome to Signals',
    introSummary: 'Measure the patterns that shape how you work.',
    introHowItWorks: 'Read each prompt and choose the response that fits best.',
    estimatedTimeOverride: 'About 18 minutes',
    instructions: 'Answer from your typical behaviour, not your ideal one.',
    confidentialityNote: 'Results are shared only with your programme team.',
  }]);
  assert.deepEqual(revalidatedPaths, [
    '/admin/assessments',
    '/admin/assessments/wplp80/assessment-intro',
  ]);
});

test('saveAssessmentIntroAction rejects non-draft versions without writes', async () => {
  const fake = createFakeDb({
    versionRows: [{
      assessmentVersionId: 'version-published',
      assessmentKey: 'wplp80',
      lifecycleStatus: 'PUBLISHED',
    }],
  });

  const state = await saveAssessmentIntroActionWithDependencies(
    {
      assessmentKey: 'wplp80',
      assessmentVersionId: 'version-published',
    },
    createEmptyAssessmentIntroState(),
    buildFormData({
      introTitle: 'Published intro',
      introSummary: '',
      introHowItWorks: '',
      estimatedTimeOverride: '',
      instructions: '',
      confidentialityNote: '',
    }),
    {
      db: fake.db,
      revalidatePath() {},
    },
  );

  assert.match(state.formError ?? '', /draft assessment versions/i);
  assert.equal(fake.state.introRows.length, 0);
});

test('assessment intro step view model loads persisted content for the latest draft version and falls back to empty fields when missing', async () => {
  const fakeWithRow = createFakeDb({
    assessmentRows: [buildAssessmentRow()],
    introRows: [{
      assessmentVersionId: 'version-draft',
      introTitle: 'Welcome to Signals',
      introSummary: 'Measure the patterns that shape how you work.',
      introHowItWorks: 'Read each prompt and choose the response that fits best.',
      estimatedTimeOverride: 'About 18 minutes',
      instructions: 'Answer from your typical behaviour, not your ideal one.',
      confidentialityNote: 'Results are shared only with your programme team.',
    }],
  });
  const fakeWithoutRow = createFakeDb({
    assessmentRows: [buildAssessmentRow()],
  });

  const populated = await getAdminAssessmentIntroStepViewModel(fakeWithRow.db, 'wplp80');
  const empty = await getAdminAssessmentIntroStepViewModel(fakeWithoutRow.db, 'wplp80');

  assert.ok(populated);
  assert.equal(populated?.draftVersion?.assessmentVersionId, 'version-draft');
  assert.equal(populated?.intro.introTitle, 'Welcome to Signals');
  assert.equal(populated?.intro.instructions, 'Answer from your typical behaviour, not your ideal one.');

  assert.ok(empty);
  assert.equal(empty?.draftVersion?.assessmentVersionId, 'version-draft');
  assert.deepEqual(empty?.intro, {
    introTitle: '',
    introSummary: '',
    introHowItWorks: '',
    estimatedTimeOverride: '',
    instructions: '',
    confidentialityNote: '',
  });
});

test('assessment intro step view model returns null for an invalid assessment key and preserves a safe empty state when no draft exists', async () => {
  const missingAssessment = await getAdminAssessmentIntroStepViewModel(
    createFakeDb({ assessmentRows: [] }).db,
    'missing-assessment',
  );
  const noDraftAssessment = await getAdminAssessmentIntroStepViewModel(
    createFakeDb({
      assessmentRows: [
        buildAssessmentRow({
          assessment_version_id: 'version-published',
          version_tag: '1.0.0',
          version_status: 'PUBLISHED',
          published_at: '2026-01-03T00:00:00.000Z',
          version_created_at: '2026-01-02T00:00:00.000Z',
          version_updated_at: '2026-01-03T00:00:00.000Z',
        }),
      ],
    }).db,
    'wplp80',
  );

  assert.equal(missingAssessment, null);
  assert.ok(noDraftAssessment);
  assert.equal(noDraftAssessment?.draftVersion, null);
  assert.deepEqual(noDraftAssessment?.intro, {
    introTitle: '',
    introSummary: '',
    introHowItWorks: '',
    estimatedTimeOverride: '',
    instructions: '',
    confidentialityNote: '',
  });
});

test('assessment intro editor renders a guarded empty state when no editable draft version exists', () => {
  const markup = renderToStaticMarkup(
    React.createElement(AdminAssessmentIntroEditor, {
      viewModel: {
        assessmentId: 'assessment-1',
        assessmentKey: 'wplp80',
        assessmentTitle: 'WPLP-80',
        assessmentDescription: 'Flagship assessment',
        draftVersion: null,
        intro: {
          introTitle: '',
          introSummary: '',
          introHowItWorks: '',
          estimatedTimeOverride: '',
          instructions: '',
          confidentialityNote: '',
        },
      },
    }),
  );

  assert.match(markup, /No draft version available/);
  assert.match(markup, /Create a draft version before authoring assessment intro content\./);
});
