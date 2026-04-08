import test from 'node:test';
import assert from 'node:assert/strict';

import { validateLatestDraftAssessmentVersion } from '@/lib/server/admin-assessment-validation';

const REQUIRED_HERO_PATTERNS = [
  'forceful_driver',
  'exacting_controller',
  'delivery_commander',
  'deliberate_craftsperson',
  'grounded_planner',
  'relational_catalyst',
  'adaptive_mobiliser',
  'steady_steward',
  'balanced_operator',
] as const;

function createValidationDb(params?: {
  thesisKeys?: readonly string[];
  promptKeys?: readonly string[];
  contributionCount?: number;
  riskCount?: number;
  developmentCount?: number;
}) {
  const thesisKeys = [...(params?.thesisKeys ?? REQUIRED_HERO_PATTERNS)];
  const promptKeys = [...(params?.promptKeys ?? REQUIRED_HERO_PATTERNS)];
  const contributionCount = params?.contributionCount ?? 24;
  const riskCount = params?.riskCount ?? 24;
  const developmentCount = params?.developmentCount ?? 24;

  return {
    async query<T>(text: string, queryParams?: readonly unknown[]) {
      if (text.includes('LEFT JOIN LATERAL') && text.includes('draft_version_id')) {
        return {
          rows: [{
            assessment_id: 'assessment-1',
            assessment_key: 'wplp80',
            draft_version_id: 'version-draft',
            draft_version_tag: '1.0.1',
          }] as T[],
        };
      }

      if (text.includes('AS domain_count') && text.includes('AS signal_count')) {
        return {
          rows: [{
            domain_count: '1',
            signal_count: '1',
            orphan_signal_count: '0',
            cross_version_signal_count: '0',
          }] as T[],
        };
      }

      if (text.includes('AS question_count') && text.includes('questions_without_options_count')) {
        return {
          rows: [{
            question_count: '1',
            option_count: '1',
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
            weighted_option_count: '1',
            unmapped_option_count: '0',
            weight_mapping_count: '1',
            orphan_weight_option_count: '0',
            orphan_weight_signal_count: '0',
            cross_version_weight_option_count: '0',
            cross_version_weight_signal_count: '0',
          }] as T[],
        };
      }

      if (text.includes('FROM assessment_version_application_thesis')) {
        return {
          rows: thesisKeys.map((heroPatternKey, index) => ({
            id: `thesis-${index + 1}`,
            assessment_version_id: queryParams?.[0] as string,
            hero_pattern_key: heroPatternKey,
            headline: `${heroPatternKey} headline`,
            summary: `${heroPatternKey} summary`,
            created_at: '2026-04-08T00:00:00.000Z',
            updated_at: '2026-04-08T00:00:00.000Z',
          })) as T[],
        };
      }

      if (text.includes('FROM assessment_version_application_contribution')) {
        return {
          rows: Array.from({ length: contributionCount }, (_, index) => ({
            id: `contribution-${index + 1}`,
            assessment_version_id: queryParams?.[0] as string,
            source_type: 'pair',
            source_key: `pair_${index + 1}`,
            priority: index + 1,
            label: `Contribution ${index + 1}`,
            narrative: 'Narrative',
            best_when: 'Best when',
            watch_for: null,
            created_at: '2026-04-08T00:00:00.000Z',
            updated_at: '2026-04-08T00:00:00.000Z',
          })) as T[],
        };
      }

      if (text.includes('FROM assessment_version_application_risk')) {
        return {
          rows: Array.from({ length: riskCount }, (_, index) => ({
            id: `risk-${index + 1}`,
            assessment_version_id: queryParams?.[0] as string,
            source_type: 'pair',
            source_key: `pair_${index + 1}`,
            priority: index + 1,
            label: `Risk ${index + 1}`,
            narrative: 'Narrative',
            impact: 'Impact',
            early_warning: null,
            created_at: '2026-04-08T00:00:00.000Z',
            updated_at: '2026-04-08T00:00:00.000Z',
          })) as T[],
        };
      }

      if (text.includes('FROM assessment_version_application_development')) {
        return {
          rows: Array.from({ length: developmentCount }, (_, index) => ({
            id: `development-${index + 1}`,
            assessment_version_id: queryParams?.[0] as string,
            source_type: 'signal',
            source_key: `signal_${index + 1}`,
            priority: index + 1,
            label: `Development ${index + 1}`,
            narrative: 'Narrative',
            practice: 'Practice',
            success_marker: null,
            created_at: '2026-04-08T00:00:00.000Z',
            updated_at: '2026-04-08T00:00:00.000Z',
          })) as T[],
        };
      }

      if (text.includes('FROM assessment_version_application_action_prompts')) {
        return {
          rows: promptKeys.map((sourceKey, index) => ({
            id: `prompt-${index + 1}`,
            assessment_version_id: queryParams?.[0] as string,
            source_type: 'hero_pattern',
            source_key: sourceKey,
            keep_doing: `${sourceKey} keep`,
            watch_for: `${sourceKey} watch`,
            practice_next: `${sourceKey} practice`,
            ask_others: `${sourceKey} ask`,
            created_at: '2026-04-08T00:00:00.000Z',
            updated_at: '2026-04-08T00:00:00.000Z',
          })) as T[],
        };
      }

      return { rows: [] as T[] };
    },
  };
}

test('publish is blocked when application thesis is missing hero pattern rows', async () => {
  const validation = await validateLatestDraftAssessmentVersion(
    createValidationDb({
      thesisKeys: REQUIRED_HERO_PATTERNS.slice(0, 7),
    }),
    'wplp80',
  );

  assert.equal(validation.isPublishReady, false);
  assert.match(
    validation.blockingErrors.map((issue) => issue.message).join('\n'),
    /Application Thesis is incomplete\./,
  );
  assert.match(
    validation.blockingErrors.map((issue) => issue.message).join('\n'),
    /steady_steward, balanced_operator/,
  );
});

test('publish is blocked when action prompts are missing hero pattern rows', async () => {
  const validation = await validateLatestDraftAssessmentVersion(
    createValidationDb({
      promptKeys: REQUIRED_HERO_PATTERNS.filter((key) => key !== 'relational_catalyst'),
    }),
    'wplp80',
  );

  assert.equal(validation.isPublishReady, false);
  assert.match(
    validation.blockingErrors.map((issue) => issue.message).join('\n'),
    /Application Action Prompts are incomplete\./,
  );
  assert.match(
    validation.blockingErrors.map((issue) => issue.message).join('\n'),
    /relational_catalyst/,
  );
});

test('publish remains allowed with warnings when contribution risk and development coverage are low', async () => {
  const validation = await validateLatestDraftAssessmentVersion(
    createValidationDb({
      contributionCount: 18,
      riskCount: 19,
      developmentCount: 20,
    }),
    'wplp80',
  );

  assert.equal(validation.isPublishReady, true);
  assert.deepEqual(validation.blockingErrors, []);
  assert.match(validation.warnings.map((issue) => issue.message).join('\n'), /Application Contribution coverage is low \(18 rows\)\./);
  assert.match(validation.warnings.map((issue) => issue.message).join('\n'), /Application Risk coverage is low \(19 rows\)\./);
  assert.match(validation.warnings.map((issue) => issue.message).join('\n'), /Application Development coverage is low \(20 rows\)\./);
  assert.equal(validation.counts.applicationThesisCount, 9);
  assert.equal(validation.counts.applicationActionPromptsCount, 9);
});
