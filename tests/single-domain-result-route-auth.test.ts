import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import type { Queryable } from '@/lib/engine/repository-sql';
import { createResultReadModelService } from '@/lib/server/result-read-model';
import { AssessmentResultNotFoundError } from '@/lib/server/result-read-model-types';
import {
  SINGLE_DOMAIN_QA_RESULT_FIXTURE,
  getSingleDomainQaAdminLanguageHref,
  getSingleDomainQaResultHref,
} from '@/lib/server/single-domain-qa-result-fixture';
import type { SingleDomainResultPayload } from '@/lib/types/single-domain-result';

type ResultRowFixture = {
  resultId: string;
  attemptId: string;
  assessmentId: string;
  assessmentVersionId: string;
  assessmentKey: string;
  assessmentTitle: string;
  versionTag: string;
  userId: string;
  readinessStatus: 'READY' | 'FAILED' | 'PROCESSING';
  generatedAt: string | null;
  createdAt: string;
  canonicalResultPayload: unknown;
  mode?: string | null;
};

function buildPayload(attemptId: string): SingleDomainResultPayload {
  return {
    metadata: {
      assessmentKey: 'leadership',
      assessmentTitle: 'Leadership',
      version: '1.0.0',
      attemptId,
      mode: 'single_domain',
      domainKey: 'leadership-style',
      generatedAt: '2026-04-21T14:14:00.000Z',
      completedAt: '2026-04-21T14:14:00.000Z',
    },
    intro: {
      section_title: 'Leadership style',
      intro_paragraph: 'This domain introduces how you lead.',
      meaning_paragraph: 'It explains the practical meaning of the pattern.',
      bridge_to_signals: 'The ranked signals show how the pattern is distributed.',
      blueprint_context_line: 'Use the six-section report to read the result.',
    },
    hero: {
      pair_key: 'delivery_process',
      hero_headline: 'Understand how you lead',
      hero_subheadline: 'Identity line.',
      hero_opening: 'This is the hero opening.',
      hero_strength_paragraph: 'This is the hero strength paragraph.',
      hero_tension_paragraph: 'This is the hero tension paragraph.',
      hero_close_paragraph: 'This is the hero close paragraph.',
    },
    signals: [
      {
        signal_key: 'delivery',
        signal_label: 'Delivery',
        rank: 1,
        normalized_score: 38,
        raw_score: 4,
        position: 'primary',
        position_label: 'Primary',
        chapter_intro: 'Delivery intro',
        chapter_how_it_shows_up: 'Delivery shows up',
        chapter_value_outcome: 'Delivery outcome',
        chapter_value_team_effect: 'Delivery team effect',
        chapter_risk_behaviour: 'Delivery risk behaviour',
        chapter_risk_impact: 'Delivery risk impact',
        chapter_development: 'Delivery development',
      },
      {
        signal_key: 'process',
        signal_label: 'Process',
        rank: 2,
        normalized_score: 31,
        raw_score: 3,
        position: 'secondary',
        position_label: 'Secondary',
        chapter_intro: 'Process intro',
        chapter_how_it_shows_up: 'Process shows up',
        chapter_value_outcome: 'Process outcome',
        chapter_value_team_effect: 'Process team effect',
        chapter_risk_behaviour: 'Process risk behaviour',
        chapter_risk_impact: 'Process risk impact',
        chapter_development: 'Process development',
      },
      {
        signal_key: 'people',
        signal_label: 'People',
        rank: 3,
        normalized_score: 18,
        raw_score: 2,
        position: 'supporting',
        position_label: 'Supporting',
        chapter_intro: 'People intro',
        chapter_how_it_shows_up: 'People shows up',
        chapter_value_outcome: 'People outcome',
        chapter_value_team_effect: 'People team effect',
        chapter_risk_behaviour: 'People risk behaviour',
        chapter_risk_impact: 'People risk impact',
        chapter_development: 'People development',
      },
      {
        signal_key: 'reflective',
        signal_label: 'Reflective',
        rank: 4,
        normalized_score: 13,
        raw_score: 1,
        position: 'underplayed',
        position_label: 'Underplayed',
        chapter_intro: 'Reflective intro',
        chapter_how_it_shows_up: 'Reflective shows up',
        chapter_value_outcome: 'Reflective outcome',
        chapter_value_team_effect: 'Reflective team effect',
        chapter_risk_behaviour: 'Reflective risk behaviour',
        chapter_risk_impact: 'Reflective range gap.',
        chapter_development: 'Reflective development.',
      },
    ],
    balancing: {
      pair_key: 'delivery_process',
      balancing_section_title: 'Balancing your approach',
      current_pattern_paragraph: 'Current pattern paragraph.',
      practical_meaning_paragraph: 'Practical meaning paragraph.',
      system_risk_paragraph: 'System risk paragraph.',
      rebalance_intro: 'Rebalance intro.',
      rebalance_actions: ['Action one', 'Action two', 'Action three'],
    },
    pairSummary: {
      pair_key: 'delivery_process',
      pair_section_title: 'How this shows up',
      pair_headline: 'Combined meaning',
      pair_opening_paragraph: 'Pair opening paragraph.',
      pair_strength_paragraph: 'Pair strength paragraph.',
      pair_tension_paragraph: 'Pair tension paragraph.',
      pair_close_paragraph: 'Pair close paragraph.',
    },
    application: {
      strengths: [
        {
          signal_key: 'delivery',
          signal_label: 'Delivery',
          rank: 1,
          statement: 'Delivery strength',
        },
      ],
      watchouts: [
        {
          signal_key: 'reflective',
          signal_label: 'Reflective',
          rank: 4,
          statement: 'Reflective watchout',
        },
      ],
      developmentFocus: [
        {
          signal_key: 'reflective',
          signal_label: 'Reflective',
          rank: 4,
          statement: 'Reflective development',
        },
      ],
    },
    diagnostics: {
      readinessStatus: 'ready',
      scoringMethod: 'option_signal_weights_only',
      normalizationMethod: 'largest_remainder_integer_percentages',
      answeredQuestionCount: 24,
      totalQuestionCount: 24,
      signalCount: 4,
      derivedPairCount: 6,
      topPair: 'delivery_process',
      counts: {
        domainCount: 1,
        questionCount: 24,
        optionCount: 96,
        weightCount: 192,
      },
      warnings: [],
    },
  };
}

function createFakeDb(rows: readonly ResultRowFixture[]): Queryable {
  return {
    async query<T>(text: string, params?: unknown[]) {
      if (text.includes('WHERE r.id = $1') && text.includes('AND t.user_id = $2')) {
        const resultId = params?.[0] as string;
        const userId = params?.[1] as string;
        const row = rows.find(
          (entry) =>
            entry.resultId === resultId &&
            entry.userId === userId &&
            entry.readinessStatus === 'READY' &&
            entry.canonicalResultPayload !== null,
        );

        return {
          rows: row
            ? ([
                {
                  result_id: row.resultId,
                  attempt_id: row.attemptId,
                  assessment_id: row.assessmentId,
                  assessment_key: row.assessmentKey,
                  assessment_mode: row.mode ?? 'single_domain',
                  assessment_title: row.assessmentTitle,
                  version_tag: row.versionTag,
                  readiness_status: row.readinessStatus,
                  generated_at: row.generatedAt,
                  created_at: row.createdAt,
                  canonical_result_payload: row.canonicalResultPayload,
                },
              ] as T[])
            : [],
        };
      }

      if (
        text.includes('WHERE t.user_id = $1') &&
        text.includes('ORDER BY COALESCE(r.generated_at, r.created_at) DESC, r.id DESC')
      ) {
        const userId = params?.[0] as string;
        const filtered = rows
          .filter(
            (entry) =>
              entry.userId === userId &&
              entry.readinessStatus === 'READY' &&
              entry.canonicalResultPayload !== null,
          )
          .map((row) => ({
            result_id: row.resultId,
            attempt_id: row.attemptId,
            assessment_id: row.assessmentId,
            assessment_key: row.assessmentKey,
            assessment_mode: row.mode ?? 'single_domain',
            assessment_title: row.assessmentTitle,
            version_tag: row.versionTag,
            readiness_status: row.readinessStatus,
            generated_at: row.generatedAt,
            created_at: row.createdAt,
            canonical_result_payload: row.canonicalResultPayload,
          }));

        return { rows: filtered as T[] };
      }

      throw new Error(`Unexpected query: ${text}`);
    },
  };
}

test('single-domain QA result helper exposes stable local QA routes', () => {
  assert.equal(
    getSingleDomainQaResultHref(),
    `/app/results/single-domain/${SINGLE_DOMAIN_QA_RESULT_FIXTURE.resultId}`,
  );
  assert.equal(
    getSingleDomainQaAdminLanguageHref(),
    `/admin/assessments/single-domain/${SINGLE_DOMAIN_QA_RESULT_FIXTURE.preferredAssessmentKey}/language`,
  );
});

test('single-domain result detail remains reachable only for the QA-owned fixture user', async () => {
  const qaUserId = 'user-qa';
  const otherUserId = 'user-other';
  const service = createResultReadModelService({
    db: createFakeDb([
      {
        resultId: SINGLE_DOMAIN_QA_RESULT_FIXTURE.resultId,
        attemptId: SINGLE_DOMAIN_QA_RESULT_FIXTURE.attemptId,
        assessmentId: 'assessment-1',
        assessmentVersionId: 'version-1',
        assessmentKey: 'leadership',
        assessmentTitle: 'Leadership',
        versionTag: '1.0.0',
        userId: qaUserId,
        readinessStatus: 'READY',
        generatedAt: '2026-04-21T14:14:00.000Z',
        createdAt: '2026-04-21T14:14:00.000Z',
        canonicalResultPayload: buildPayload(SINGLE_DOMAIN_QA_RESULT_FIXTURE.attemptId),
        mode: 'single_domain',
      },
    ]),
  });

  const detail = await service.getAssessmentResultDetail({
    userId: qaUserId,
    resultId: SINGLE_DOMAIN_QA_RESULT_FIXTURE.resultId,
  });

  assert.equal(detail.mode, 'single_domain');
  assert.equal(
    detail.singleDomainResult?.metadata.attemptId,
    SINGLE_DOMAIN_QA_RESULT_FIXTURE.attemptId,
  );

  await assert.rejects(
    () =>
      service.getAssessmentResultDetail({
        userId: otherUserId,
        resultId: SINGLE_DOMAIN_QA_RESULT_FIXTURE.resultId,
      }),
    AssessmentResultNotFoundError,
  );
});

test('single-domain result route stays tied to persisted result retrieval and notFound ownership checks', () => {
  const source = readFileSync(
    join(
      process.cwd(),
      'app',
      '(user)',
      'app',
      'results',
      'single-domain',
      '[resultId]',
      'page.tsx',
    ),
    'utf8',
  );

  assert.match(source, /getAssessmentResultDetail/);
  assert.match(source, /AssessmentResultNotFoundError/);
  assert.match(source, /if \(detail\.mode !== 'single_domain' \|\| !detail\.singleDomainResult\)/);
  assert.match(source, /notFound\(\)/);
});

test('generic result route redirects single-domain results to the canonical report route', () => {
  const source = readFileSync(
    join(
      process.cwd(),
      'app',
      '(user)',
      'app',
      'results',
      '[resultId]',
      'page.tsx',
    ),
    'utf8',
  );

  assert.match(source, /import \{ notFound, redirect \} from 'next\/navigation';/);
  assert.match(source, /getAssessmentResultDetail/);
  assert.match(source, /if \(result\.mode === 'single_domain' && result\.singleDomainResult\)/);
  assert.match(source, /redirect\(`\/app\/results\/single-domain\/\$\{resultId\}`\)/);
  assert.match(source, /buildDomainSignalRingViewModel/);
  assert.match(source, /No persisted domain summaries are available for this result/);
});
