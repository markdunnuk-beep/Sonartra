import test from 'node:test';
import assert from 'node:assert/strict';

import type { Queryable } from '@/lib/engine/repository-sql';
import { getAdminAssessmentDetailByKey } from '@/lib/server/admin-assessment-detail';

type DetailFixture = {
  baseRows: Array<{
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
    question_count: string;
  }>;
  signalGroupDomains: Array<{
    domain_id: string;
    domain_key: string;
    domain_label: string;
    domain_description: string | null;
    domain_order_index: number;
    domain_created_at: string;
    domain_updated_at: string;
  }>;
  signals: Array<{
    signal_id: string;
    domain_id: string;
    signal_key: string;
    signal_label: string;
    signal_description: string | null;
    signal_order_index: number;
    signal_created_at: string;
    signal_updated_at: string;
  }>;
  questionDomains: Array<{
    domain_id: string;
    domain_key: string;
    domain_label: string;
    domain_type: 'QUESTION_SECTION' | 'SIGNAL_GROUP';
    domain_order_index: number;
  }>;
  questions: Array<{
    question_id: string;
    question_key: string;
    prompt: string;
    question_order_index: number;
    question_created_at: string;
    question_updated_at: string;
    domain_id: string;
    domain_key: string;
    domain_label: string;
    domain_type: 'QUESTION_SECTION' | 'SIGNAL_GROUP';
    option_id: string | null;
    option_key: string | null;
    option_label: string | null;
    option_text: string | null;
    option_order_index: number | null;
    option_created_at: string | null;
    option_updated_at: string | null;
  }>;
  optionSignalWeights: Array<{
    option_id: string;
    option_signal_weight_id: string;
    signal_id: string;
    signal_key: string;
    signal_label: string;
    signal_domain_id: string;
    signal_domain_key: string;
    signal_domain_label: string;
    weight: string;
    weight_created_at: string;
    weight_updated_at: string;
  }>;
  availableSignals: Array<{
    signal_id: string;
    signal_key: string;
    signal_label: string;
    signal_description: string | null;
    signal_order_index: number;
    domain_id: string;
    domain_key: string;
    domain_label: string;
    domain_order_index: number;
  }>;
  introRows?: Array<{
    intro_title: string;
    intro_summary: string;
    intro_how_it_works: string;
  }>;
  languageSignals?: Array<{
    id: string;
    assessment_version_id: string;
    signal_key: string;
    section: string;
    content: string;
    created_at: string;
    updated_at: string;
  }>;
  languagePairs?: Array<{
    id: string;
    assessment_version_id: string;
    signal_pair: string;
    section: string;
    content: string;
    created_at: string;
    updated_at: string;
  }>;
  languageDomains?: Array<{
    id: string;
    assessment_version_id: string;
    domain_key: string;
    section: string;
    content: string;
    created_at: string;
    updated_at: string;
  }>;
  languageOverview?: Array<{
    id: string;
    assessment_version_id: string;
    pattern_key: string;
    section: string;
    content: string;
    created_at: string;
    updated_at: string;
  }>;
  languageHeroHeaders?: Array<{
    id: string;
    assessment_version_id: string;
    pair_key: string;
    headline: string;
    created_at: string;
    updated_at: string;
  }>;
};

function createFakeDb(fixture: DetailFixture): Queryable {
  return {
    async query<T>(text: string) {
      if (text.includes('FROM assessments a') && text.includes('LEFT JOIN assessment_versions av')) {
        return { rows: fixture.baseRows as T[] };
      }

      if (text.includes('LEFT JOIN LATERAL') && text.includes('draft_version_id')) {
        const draft = fixture.baseRows.find((row) => row.version_status === 'DRAFT') ?? null;
        const first = fixture.baseRows[0];
        return {
          rows: first
            ? ([
                {
                  assessment_id: first.assessment_id,
                  assessment_key: first.assessment_key,
                  draft_version_id: draft?.assessment_version_id ?? null,
                  draft_version_tag: draft?.version_tag ?? null,
                },
              ] as T[])
            : ([] as T[]),
        };
      }

      if (text.includes('AS domain_count') && text.includes('AS signal_count')) {
        return {
          rows: [
            {
              domain_count: '2',
              signal_count: '2',
              orphan_signal_count: '0',
              cross_version_signal_count: '0',
            },
          ] as T[],
        };
      }

      if (text.includes('AS question_count') && text.includes('questions_without_options_count')) {
        return {
          rows: [
            {
              question_count: '1',
              option_count: '2',
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
        return {
          rows: [
            {
              weighted_option_count: '1',
              unmapped_option_count: '1',
              weight_mapping_count: '1',
              orphan_weight_option_count: '0',
              orphan_weight_signal_count: '0',
              cross_version_weight_option_count: '0',
              cross_version_weight_signal_count: '0',
            },
          ] as T[],
        };
      }

      if (text.includes("FROM domains") && text.includes("domain_type = 'SIGNAL_GROUP'")) {
        return { rows: fixture.signalGroupDomains as T[] };
      }

      if (text.includes('FROM signals') && text.includes('WHERE assessment_version_id = $1') && text.includes('signal_created_at')) {
        return { rows: fixture.signals as T[] };
      }

      if (text.includes('FROM domains') && !text.includes("domain_type = 'SIGNAL_GROUP'")) {
        return { rows: fixture.questionDomains as T[] };
      }

      if (text.includes('FROM questions q') && text.includes('LEFT JOIN options o ON o.question_id = q.id')) {
        return { rows: fixture.questions as T[] };
      }

      if (text.includes('FROM option_signal_weights osw')) {
        return { rows: fixture.optionSignalWeights as T[] };
      }

      if (text.includes('FROM signals s') && text.includes('INNER JOIN domains d')) {
        return { rows: fixture.availableSignals as T[] };
      }

      if (text.includes('FROM assessment_version_intro')) {
        return { rows: (fixture.introRows ?? []) as T[] };
      }

      if (text.includes('FROM assessment_version_language_signals')) {
        return { rows: (fixture.languageSignals ?? []) as T[] };
      }

      if (text.includes('FROM assessment_version_language_pairs')) {
        return { rows: (fixture.languagePairs ?? []) as T[] };
      }

      if (text.includes('FROM assessment_version_language_domains')) {
        return { rows: (fixture.languageDomains ?? []) as T[] };
      }

      if (text.includes('FROM assessment_version_language_overview')) {
        return { rows: (fixture.languageOverview ?? []) as T[] };
      }

      if (text.includes('FROM assessment_version_language_hero_headers')) {
        return { rows: (fixture.languageHeroHeaders ?? []) as T[] };
      }

      return { rows: [] as T[] };
    },
  };
}

test('loads latest draft weighting data and coverage for admin assessment detail', async () => {
  const detail = await getAdminAssessmentDetailByKey(
    createFakeDb({
      baseRows: [
        {
          assessment_id: 'assessment-1',
          assessment_key: 'wplp80',
          assessment_mode: 'multi_domain',
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
          question_count: '2',
        },
        {
          assessment_id: 'assessment-1',
          assessment_key: 'wplp80',
          assessment_mode: 'multi_domain',
          assessment_title: 'WPLP-80',
          assessment_description: 'Flagship assessment',
          assessment_is_active: true,
          assessment_created_at: '2026-01-01T00:00:00.000Z',
          assessment_updated_at: '2026-01-05T00:00:00.000Z',
          assessment_version_id: 'version-published',
          version_tag: '1.0.0',
          version_status: 'PUBLISHED',
          published_at: '2026-01-03T00:00:00.000Z',
          version_created_at: '2026-01-02T00:00:00.000Z',
          version_updated_at: '2026-01-03T00:00:00.000Z',
          question_count: '80',
        },
      ],
      signalGroupDomains: [
        {
          domain_id: 'domain-signal-1',
          domain_key: 'leadership',
          domain_label: 'Leadership',
          domain_description: null,
          domain_order_index: 0,
          domain_created_at: '2026-01-04T00:00:00.000Z',
          domain_updated_at: '2026-01-05T00:00:00.000Z',
        },
      ],
      signals: [
        {
          signal_id: 'signal-1',
          domain_id: 'domain-signal-1',
          signal_key: 'directive',
          signal_label: 'Directive',
          signal_description: null,
          signal_order_index: 0,
          signal_created_at: '2026-01-04T00:00:00.000Z',
          signal_updated_at: '2026-01-05T00:00:00.000Z',
        },
        {
          signal_id: 'signal-2',
          domain_id: 'domain-signal-1',
          signal_key: 'supportive',
          signal_label: 'Supportive',
          signal_description: null,
          signal_order_index: 1,
          signal_created_at: '2026-01-04T00:00:00.000Z',
          signal_updated_at: '2026-01-05T00:00:00.000Z',
        },
      ],
      questionDomains: [
        {
          domain_id: 'domain-question-1',
          domain_key: 'section-one',
          domain_label: 'Section One',
          domain_type: 'QUESTION_SECTION',
          domain_order_index: 0,
        },
        {
          domain_id: 'domain-signal-1',
          domain_key: 'leadership',
          domain_label: 'Leadership',
          domain_type: 'SIGNAL_GROUP',
          domain_order_index: 0,
        },
      ],
      questions: [
        {
          question_id: 'question-1',
          question_key: 'decision-speed',
          prompt: 'I make decisions quickly when direction is clear.',
          question_order_index: 0,
          question_created_at: '2026-01-04T00:00:00.000Z',
          question_updated_at: '2026-01-05T00:00:00.000Z',
          domain_id: 'domain-question-1',
          domain_key: 'section-one',
          domain_label: 'Section One',
          domain_type: 'QUESTION_SECTION',
          option_id: 'option-1',
          option_key: 'agree',
          option_label: 'A',
          option_text: 'Agree',
          option_order_index: 0,
          option_created_at: '2026-01-04T00:00:00.000Z',
          option_updated_at: '2026-01-05T00:00:00.000Z',
        },
        {
          question_id: 'question-1',
          question_key: 'decision-speed',
          prompt: 'I make decisions quickly when direction is clear.',
          question_order_index: 0,
          question_created_at: '2026-01-04T00:00:00.000Z',
          question_updated_at: '2026-01-05T00:00:00.000Z',
          domain_id: 'domain-question-1',
          domain_key: 'section-one',
          domain_label: 'Section One',
          domain_type: 'QUESTION_SECTION',
          option_id: 'option-2',
          option_key: 'disagree',
          option_label: 'B',
          option_text: 'Disagree',
          option_order_index: 1,
          option_created_at: '2026-01-04T00:00:00.000Z',
          option_updated_at: '2026-01-05T00:00:00.000Z',
        },
      ],
      optionSignalWeights: [
        {
          option_id: 'option-1',
          option_signal_weight_id: 'weight-1',
          signal_id: 'signal-1',
          signal_key: 'directive',
          signal_label: 'Directive',
          signal_domain_id: 'domain-signal-1',
          signal_domain_key: 'leadership',
          signal_domain_label: 'Leadership',
          weight: '1.2500',
          weight_created_at: '2026-01-05T00:00:00.000Z',
          weight_updated_at: '2026-01-05T00:00:00.000Z',
        },
      ],
      availableSignals: [
        {
          signal_id: 'signal-1',
          signal_key: 'directive',
          signal_label: 'Directive',
          signal_description: null,
          signal_order_index: 0,
          domain_id: 'domain-signal-1',
          domain_key: 'leadership',
          domain_label: 'Leadership',
          domain_order_index: 0,
        },
        {
          signal_id: 'signal-2',
          signal_key: 'supportive',
          signal_label: 'Supportive',
          signal_description: null,
          signal_order_index: 1,
          domain_id: 'domain-signal-1',
          domain_key: 'leadership',
          domain_label: 'Leadership',
          domain_order_index: 0,
        },
      ],
    }),
    'wplp80',
  );

  assert.ok(detail);
  assert.equal(detail?.publishedVersion?.versionTag, '1.0.0');
  assert.equal(detail?.latestDraftVersion?.versionTag, '1.1.0');
  assert.equal(detail?.builderMode, 'draft');
  assert.equal(detail?.authoredDomains.length, 1);
  assert.equal(detail?.questionDomains.length, 2);
  assert.equal(detail?.authoredQuestions.length, 1);
  assert.equal(detail?.authoredQuestions[0]?.options.length, 2);
  assert.equal(detail?.authoredQuestions[0]?.options[0]?.weightingStatus, 'weighted');
  assert.equal(detail?.authoredQuestions[0]?.options[0]?.signalWeights[0]?.weight, '1.2500');
  assert.equal(detail?.authoredQuestions[0]?.options[1]?.weightingStatus, 'unmapped');
  assert.equal(detail?.availableSignals.length, 2);
  assert.deepEqual(detail?.weightingSummary, {
    totalOptions: 2,
    weightedOptions: 1,
    unmappedOptions: 1,
    totalMappings: 1,
  });
  assert.equal(detail?.draftValidation.status, 'not_ready');
  assert.equal(detail?.draftValidation.isPublishReady, false);
  assert.equal(detail?.draftValidation.blockingErrors[0]?.code, 'options_without_weights');
  assert.deepEqual(detail?.stepCompletion, {
    assessmentIntro: 'incomplete',
    language: 'incomplete',
  });
});

test('derives trustworthy intro and language step completion from persisted draft content', async () => {
  const detail = await getAdminAssessmentDetailByKey(
    createFakeDb({
      baseRows: [
        {
          assessment_id: 'assessment-1',
          assessment_key: 'wplp80',
          assessment_mode: 'multi_domain',
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
        },
      ],
      signalGroupDomains: [],
      signals: [],
      questionDomains: [],
      questions: [],
      optionSignalWeights: [],
      availableSignals: [],
      introRows: [
        {
          intro_title: '',
          intro_summary: 'Measure the patterns that shape how you work.',
          intro_how_it_works: '',
        },
      ],
      languageSignals: [
        {
          id: 'signal-language-1',
          assessment_version_id: 'version-draft',
          signal_key: 'driver',
          section: 'summary',
          content: 'Driver summary',
          created_at: '2026-04-01T00:00:01.000Z',
          updated_at: '2026-04-01T00:00:01.000Z',
        },
      ],
      languagePairs: [],
      languageDomains: [],
      languageOverview: [],
      languageHeroHeaders: [],
    }),
    'wplp80',
  );

  assert.deepEqual(detail?.stepCompletion, {
    assessmentIntro: 'complete',
    language: 'complete',
  });
});

test('marks published assessments without an editable draft as published_no_draft builder mode', async () => {
  const detail = await getAdminAssessmentDetailByKey(
    createFakeDb({
      baseRows: [
        {
          assessment_id: 'assessment-1',
          assessment_key: 'wplp80',
          assessment_mode: 'multi_domain',
          assessment_title: 'WPLP-80',
          assessment_description: 'Flagship assessment',
          assessment_is_active: true,
          assessment_created_at: '2026-01-01T00:00:00.000Z',
          assessment_updated_at: '2026-01-05T00:00:00.000Z',
          assessment_version_id: 'version-published',
          version_tag: '1.0.0',
          version_status: 'PUBLISHED',
          published_at: '2026-01-03T00:00:00.000Z',
          version_created_at: '2026-01-02T00:00:00.000Z',
          version_updated_at: '2026-01-03T00:00:00.000Z',
          question_count: '80',
        },
      ],
      signalGroupDomains: [],
      signals: [],
      questionDomains: [],
      questions: [],
      optionSignalWeights: [],
      availableSignals: [],
    }),
    'wplp80',
  );

  assert.ok(detail);
  assert.equal(detail?.publishedVersion?.versionTag, '1.0.0');
  assert.equal(detail?.latestDraftVersion, null);
  assert.equal(detail?.builderMode, 'published_no_draft');
});

