import test from 'node:test';
import assert from 'node:assert/strict';

import type { Queryable } from '@/lib/engine/repository-sql';
import { getAdminAssessmentDetailByKey } from '@/lib/server/admin-assessment-detail';

type DetailFixture = {
  baseRows: Array<{
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
};

function createFakeDb(fixture: DetailFixture): Queryable {
  return {
    async query<T>(text: string) {
      if (text.includes('FROM assessments a') && text.includes('LEFT JOIN assessment_versions av')) {
        return { rows: fixture.baseRows as T[] };
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
  assert.equal(detail?.latestDraftVersion?.versionTag, '1.1.0');
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
});
