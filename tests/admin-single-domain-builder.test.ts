import test from 'node:test';
import assert from 'node:assert/strict';

import { getSingleDomainBuilderAssessment } from '@/lib/server/admin-single-domain-builder';

type DetailRow = {
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
};

function createFakeDb(row: DetailRow | null) {
  return {
    async query<T>(text: string) {
      if (text.includes('FROM assessments a') && text.includes('LEFT JOIN assessment_versions av')) {
        return {
          rows: row ? ([row] as unknown as T[]) : ([] as T[]),
        };
      }

      if (text.includes('FROM domains') || text.includes('FROM questions q') || text.includes('FROM signals s') || text.includes('FROM option_signal_weights osw')) {
        return { rows: [] as T[] };
      }

      if (text.includes('FROM assessment_version_intro')) {
        return { rows: [] as T[] };
      }

      if (text.includes('FROM assessment_version_language_')) {
        const error = new Error('relation "assessment_version_language_signals" does not exist') as Error & {
          code?: string;
        };
        error.code = '42P01';
        throw error;
      }

      if (text.includes('AS domain_count') || text.includes('AS question_count') || text.includes('AS weighted_option_count')) {
        return {
          rows: [
            {
              domain_count: '0',
              signal_count: '0',
              orphan_signal_count: '0',
              cross_version_signal_count: '0',
              question_count: '0',
              option_count: '0',
              questions_without_options_count: '0',
              orphan_question_count: '0',
              cross_version_question_count: '0',
              orphan_option_count: '0',
              cross_version_option_count: '0',
              weighted_option_count: '0',
              unmapped_option_count: '0',
              weight_mapping_count: '0',
              orphan_weight_option_count: '0',
              orphan_weight_signal_count: '0',
              cross_version_weight_option_count: '0',
              cross_version_weight_signal_count: '0',
            },
          ] as T[],
        };
      }

      return { rows: [] as T[] };
    },
  };
}

function buildRow(overrides?: Partial<DetailRow>): DetailRow {
  return {
    assessment_id: 'assessment-1',
    assessment_key: 'role-focus',
    assessment_mode: 'single_domain',
    assessment_title: 'Role Focus',
    assessment_description: 'Single-domain assessment',
    assessment_is_active: true,
    assessment_created_at: '2026-04-12T09:00:00.000Z',
    assessment_updated_at: '2026-04-12T09:00:00.000Z',
    assessment_version_id: 'version-1',
    version_tag: '1.0.0',
    version_status: 'DRAFT',
    published_at: null,
    version_created_at: '2026-04-12T09:00:00.000Z',
    version_updated_at: '2026-04-12T09:00:00.000Z',
    question_count: '0',
    ...overrides,
  };
}

test('single-domain builder helper allows single-domain assessments to load', async () => {
  const result = await getSingleDomainBuilderAssessment(createFakeDb(buildRow()), 'role-focus');

  assert.equal(result.redirectTo, null);
  assert.equal(result.assessment?.assessmentKey, 'role-focus');
  assert.equal(result.assessment?.mode, 'single_domain');
});

test('single-domain builder helper rejects multi-domain assessments with a safe redirect', async () => {
  const result = await getSingleDomainBuilderAssessment(
    createFakeDb(
      buildRow({
        assessment_key: 'wplp80',
        assessment_mode: 'multi_domain',
      }),
    ),
    'wplp80',
  );

  assert.equal(result.assessment, null);
  assert.equal(result.redirectTo, '/admin/assessments/wplp80/overview');
});

test('single-domain builder helper rejects unknown mode values instead of treating them as single-domain', async () => {
  const result = await getSingleDomainBuilderAssessment(
    createFakeDb(
      buildRow({
        assessment_key: 'experimental',
        assessment_mode: 'experimental_mode',
      }),
    ),
    'experimental',
  );

  assert.equal(result.assessment, null);
  assert.equal(result.redirectTo, '/admin/assessments/experimental/overview');
});
