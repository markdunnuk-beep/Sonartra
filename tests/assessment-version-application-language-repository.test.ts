import test from 'node:test';
import assert from 'node:assert/strict';

import {
  getAssessmentVersionApplicationLanguage,
  replaceAssessmentVersionApplicationActionPrompts,
  replaceAssessmentVersionApplicationContribution,
  replaceAssessmentVersionApplicationDevelopment,
  replaceAssessmentVersionApplicationRisk,
  replaceAssessmentVersionApplicationThesis,
} from '@/lib/server/assessment-version-application-language';

type ThesisRow = {
  id: string;
  assessmentVersionId: string;
  heroPatternKey: string;
  headline: string;
  summary: string;
  createdAt: string;
  updatedAt: string;
};

type ContributionRow = {
  id: string;
  assessmentVersionId: string;
  sourceType: 'pair' | 'signal';
  sourceKey: string;
  priority: number;
  label: string;
  narrative: string;
  bestWhen: string;
  watchFor: string | null;
  createdAt: string;
  updatedAt: string;
};

type RiskRow = {
  id: string;
  assessmentVersionId: string;
  sourceType: 'pair' | 'signal';
  sourceKey: string;
  priority: number;
  label: string;
  narrative: string;
  impact: string;
  earlyWarning: string | null;
  createdAt: string;
  updatedAt: string;
};

type DevelopmentRow = {
  id: string;
  assessmentVersionId: string;
  sourceType: 'pair' | 'signal';
  sourceKey: string;
  priority: number;
  label: string;
  narrative: string;
  practice: string;
  successMarker: string | null;
  createdAt: string;
  updatedAt: string;
};

type PromptRow = {
  id: string;
  assessmentVersionId: string;
  sourceType: 'hero_pattern';
  sourceKey: string;
  keepDoing: string;
  watchFor: string;
  practiceNext: string;
  askOthers: string;
  createdAt: string;
  updatedAt: string;
};

function createFakeDb(seed?: {
  thesis?: ThesisRow[];
  contribution?: ContributionRow[];
  risk?: RiskRow[];
  development?: DevelopmentRow[];
  prompts?: PromptRow[];
}) {
  const state = {
    thesis: [...(seed?.thesis ?? [])],
    contribution: [...(seed?.contribution ?? [])],
    risk: [...(seed?.risk ?? [])],
    development: [...(seed?.development ?? [])],
    prompts: [...(seed?.prompts ?? [])],
  };

  let idCounter = 0;
  let snapshot: typeof state | null = null;

  const nextId = (prefix: string) => `${prefix}-${++idCounter}`;
  const timestamp = '2026-04-08T00:00:00.000Z';

  const client = {
    async query<T>(text: string, params?: readonly unknown[]) {
      const sql = text.replace(/\s+/g, ' ').trim();

      if (sql === 'BEGIN') {
        snapshot = {
          thesis: state.thesis.map((row) => ({ ...row })),
          contribution: state.contribution.map((row) => ({ ...row })),
          risk: state.risk.map((row) => ({ ...row })),
          development: state.development.map((row) => ({ ...row })),
          prompts: state.prompts.map((row) => ({ ...row })),
        };
        return { rows: [] as T[] };
      }

      if (sql === 'COMMIT') {
        snapshot = null;
        return { rows: [] as T[] };
      }

      if (sql === 'ROLLBACK') {
        if (snapshot) {
          state.thesis = snapshot.thesis;
          state.contribution = snapshot.contribution;
          state.risk = snapshot.risk;
          state.development = snapshot.development;
          state.prompts = snapshot.prompts;
        }
        snapshot = null;
        return { rows: [] as T[] };
      }

      if (sql.startsWith('DELETE FROM assessment_version_application_thesis')) {
        const assessmentVersionId = params?.[0] as string;
        state.thesis = state.thesis.filter((row) => row.assessmentVersionId !== assessmentVersionId);
        return { rows: [] as T[] };
      }

      if (sql.startsWith('DELETE FROM assessment_version_application_contribution')) {
        const assessmentVersionId = params?.[0] as string;
        state.contribution = state.contribution.filter((row) => row.assessmentVersionId !== assessmentVersionId);
        return { rows: [] as T[] };
      }

      if (sql.startsWith('DELETE FROM assessment_version_application_risk')) {
        const assessmentVersionId = params?.[0] as string;
        state.risk = state.risk.filter((row) => row.assessmentVersionId !== assessmentVersionId);
        return { rows: [] as T[] };
      }

      if (sql.startsWith('DELETE FROM assessment_version_application_development')) {
        const assessmentVersionId = params?.[0] as string;
        state.development = state.development.filter((row) => row.assessmentVersionId !== assessmentVersionId);
        return { rows: [] as T[] };
      }

      if (sql.startsWith('DELETE FROM assessment_version_application_action_prompts')) {
        const assessmentVersionId = params?.[0] as string;
        state.prompts = state.prompts.filter((row) => row.assessmentVersionId !== assessmentVersionId);
        return { rows: [] as T[] };
      }

      if (sql.includes('FROM assessment_version_application_thesis')) {
        const assessmentVersionId = params?.[0] as string;
        return {
          rows: state.thesis
            .filter((row) => row.assessmentVersionId === assessmentVersionId)
            .sort((left, right) => left.heroPatternKey.localeCompare(right.heroPatternKey))
            .map((row) => ({
              id: row.id,
              assessment_version_id: row.assessmentVersionId,
              hero_pattern_key: row.heroPatternKey,
              headline: row.headline,
              summary: row.summary,
              created_at: row.createdAt,
              updated_at: row.updatedAt,
            })) as T[],
        };
      }

      if (sql.includes('FROM assessment_version_application_contribution')) {
        const assessmentVersionId = params?.[0] as string;
        return {
          rows: state.contribution
            .filter((row) => row.assessmentVersionId === assessmentVersionId)
            .sort((left, right) => left.priority - right.priority || left.sourceKey.localeCompare(right.sourceKey))
            .map((row) => ({
              id: row.id,
              assessment_version_id: row.assessmentVersionId,
              source_type: row.sourceType,
              source_key: row.sourceKey,
              priority: row.priority,
              label: row.label,
              narrative: row.narrative,
              best_when: row.bestWhen,
              watch_for: row.watchFor,
              created_at: row.createdAt,
              updated_at: row.updatedAt,
            })) as T[],
        };
      }

      if (sql.includes('FROM assessment_version_application_risk')) {
        const assessmentVersionId = params?.[0] as string;
        return {
          rows: state.risk
            .filter((row) => row.assessmentVersionId === assessmentVersionId)
            .sort((left, right) => left.priority - right.priority || left.sourceKey.localeCompare(right.sourceKey))
            .map((row) => ({
              id: row.id,
              assessment_version_id: row.assessmentVersionId,
              source_type: row.sourceType,
              source_key: row.sourceKey,
              priority: row.priority,
              label: row.label,
              narrative: row.narrative,
              impact: row.impact,
              early_warning: row.earlyWarning,
              created_at: row.createdAt,
              updated_at: row.updatedAt,
            })) as T[],
        };
      }

      if (sql.includes('FROM assessment_version_application_development')) {
        const assessmentVersionId = params?.[0] as string;
        return {
          rows: state.development
            .filter((row) => row.assessmentVersionId === assessmentVersionId)
            .sort((left, right) => left.priority - right.priority || left.sourceKey.localeCompare(right.sourceKey))
            .map((row) => ({
              id: row.id,
              assessment_version_id: row.assessmentVersionId,
              source_type: row.sourceType,
              source_key: row.sourceKey,
              priority: row.priority,
              label: row.label,
              narrative: row.narrative,
              practice: row.practice,
              success_marker: row.successMarker,
              created_at: row.createdAt,
              updated_at: row.updatedAt,
            })) as T[],
        };
      }

      if (sql.includes('FROM assessment_version_application_action_prompts')) {
        const assessmentVersionId = params?.[0] as string;
        return {
          rows: state.prompts
            .filter((row) => row.assessmentVersionId === assessmentVersionId)
            .sort((left, right) => left.sourceKey.localeCompare(right.sourceKey))
            .map((row) => ({
              id: row.id,
              assessment_version_id: row.assessmentVersionId,
              source_type: row.sourceType,
              source_key: row.sourceKey,
              keep_doing: row.keepDoing,
              watch_for: row.watchFor,
              practice_next: row.practiceNext,
              ask_others: row.askOthers,
              created_at: row.createdAt,
              updated_at: row.updatedAt,
            })) as T[],
        };
      }

      if (sql.startsWith('INSERT INTO assessment_version_application_thesis')) {
        const [assessmentVersionId, heroPatternKey, headline, summary] = params as [string, string, string, string];
        state.thesis.push({
          id: nextId('thesis'),
          assessmentVersionId,
          heroPatternKey,
          headline,
          summary,
          createdAt: timestamp,
          updatedAt: timestamp,
        });
        return { rows: [] as T[] };
      }

      if (sql.startsWith('INSERT INTO assessment_version_application_contribution')) {
        const [assessmentVersionId, sourceType, sourceKey, priority, label, narrative, bestWhen, watchFor] =
          params as [string, 'pair' | 'signal', string, number, string, string, string, string | null];
        state.contribution.push({
          id: nextId('contribution'),
          assessmentVersionId,
          sourceType,
          sourceKey,
          priority,
          label,
          narrative,
          bestWhen,
          watchFor,
          createdAt: timestamp,
          updatedAt: timestamp,
        });
        return { rows: [] as T[] };
      }

      if (sql.startsWith('INSERT INTO assessment_version_application_risk')) {
        const [assessmentVersionId, sourceType, sourceKey, priority, label, narrative, impact, earlyWarning] =
          params as [string, 'pair' | 'signal', string, number, string, string, string, string | null];
        state.risk.push({
          id: nextId('risk'),
          assessmentVersionId,
          sourceType,
          sourceKey,
          priority,
          label,
          narrative,
          impact,
          earlyWarning,
          createdAt: timestamp,
          updatedAt: timestamp,
        });
        return { rows: [] as T[] };
      }

      if (sql.startsWith('INSERT INTO assessment_version_application_development')) {
        const [assessmentVersionId, sourceType, sourceKey, priority, label, narrative, practice, successMarker] =
          params as [string, 'pair' | 'signal', string, number, string, string, string, string | null];
        state.development.push({
          id: nextId('development'),
          assessmentVersionId,
          sourceType,
          sourceKey,
          priority,
          label,
          narrative,
          practice,
          successMarker,
          createdAt: timestamp,
          updatedAt: timestamp,
        });
        return { rows: [] as T[] };
      }

      if (sql.startsWith('INSERT INTO assessment_version_application_action_prompts')) {
        const [assessmentVersionId, sourceType, sourceKey, keepDoing, watchFor, practiceNext, askOthers] =
          params as [string, 'hero_pattern', string, string, string, string, string];
        state.prompts.push({
          id: nextId('prompt'),
          assessmentVersionId,
          sourceType,
          sourceKey,
          keepDoing,
          watchFor,
          practiceNext,
          askOthers,
          createdAt: timestamp,
          updatedAt: timestamp,
        });
        return { rows: [] as T[] };
      }

      return { rows: [] as T[] };
    },
    async connect() {
      return client;
    },
    release() {},
  };

  return { db: client, state };
}

test('empty-safe load returns empty datasets', async () => {
  const fake = createFakeDb();

  const rows = await getAssessmentVersionApplicationLanguage(fake.db, 'version-1');

  assert.deepEqual(rows, {
    thesis: [],
    contribution: [],
    risk: [],
    development: [],
    prompts: [],
  });
});

test('version-scoped load returns only requested rows', async () => {
  const fake = createFakeDb({
    thesis: [
      {
        id: 't1',
        assessmentVersionId: 'version-1',
        heroPatternKey: 'steady_steward',
        headline: 'Headline',
        summary: 'Summary',
        createdAt: '2026-04-08T00:00:00.000Z',
        updatedAt: '2026-04-08T00:00:00.000Z',
      },
      {
        id: 't2',
        assessmentVersionId: 'version-2',
        heroPatternKey: 'adaptive_mobiliser',
        headline: 'Other',
        summary: 'Other',
        createdAt: '2026-04-08T00:00:00.000Z',
        updatedAt: '2026-04-08T00:00:00.000Z',
      },
    ],
  });

  const rows = await getAssessmentVersionApplicationLanguage(fake.db, 'version-1');

  assert.equal(rows.thesis.length, 1);
  assert.equal(rows.thesis[0]?.heroPatternKey, 'steady_steward');
});

test('dataset replacement overwrites only the targeted dataset', async () => {
  const fake = createFakeDb({
    thesis: [{
      id: 't1',
      assessmentVersionId: 'version-1',
      heroPatternKey: 'old',
      headline: 'Old',
      summary: 'Old',
      createdAt: '2026-04-08T00:00:00.000Z',
      updatedAt: '2026-04-08T00:00:00.000Z',
    }],
    prompts: [{
      id: 'p1',
      assessmentVersionId: 'version-1',
      sourceType: 'hero_pattern',
      sourceKey: 'steady_steward',
      keepDoing: 'Keep',
      watchFor: 'Watch',
      practiceNext: 'Practice',
      askOthers: 'Ask',
      createdAt: '2026-04-08T00:00:00.000Z',
      updatedAt: '2026-04-08T00:00:00.000Z',
    }],
  });

  await replaceAssessmentVersionApplicationThesis(fake.db, {
    assessmentVersionId: 'version-1',
    rows: [{
      heroPatternKey: 'steady_steward',
      headline: '  New headline  ',
      summary: '  New summary  ',
    }],
  });

  assert.deepEqual(fake.state.thesis.map((row) => row.heroPatternKey), ['steady_steward']);
  assert.equal(fake.state.thesis[0]?.headline, 'New headline');
  assert.equal(fake.state.prompts.length, 1);
});

test('duplicate protection rejects invalid batches before insert', async () => {
  const fake = createFakeDb();

  await assert.rejects(
    () => replaceAssessmentVersionApplicationContribution(fake.db, {
      assessmentVersionId: 'version-1',
      rows: [
        {
          sourceType: 'pair',
          sourceKey: 'driver_analyst',
          priority: 1,
          label: 'A',
          narrative: 'A',
          bestWhen: 'A',
          watchFor: null,
        },
        {
          sourceType: 'pair',
          sourceKey: 'driver_analyst',
          priority: 1,
          label: 'B',
          narrative: 'B',
          bestWhen: 'B',
          watchFor: null,
        },
      ],
    }),
    /Duplicate contribution row detected/i,
  );
});

test('all dataset replace methods round-trip correctly', async () => {
  const fake = createFakeDb();

  await replaceAssessmentVersionApplicationContribution(fake.db, {
    assessmentVersionId: 'version-1',
    rows: [{
      sourceType: 'pair',
      sourceKey: 'driver_analyst',
      priority: 1,
      label: 'Structured pace',
      narrative: 'Creates traction through structured pace.',
      bestWhen: 'When direction is clear.',
      watchFor: 'Can over-tighten the plan.',
    }],
  });

  await replaceAssessmentVersionApplicationRisk(fake.db, {
    assessmentVersionId: 'version-1',
    rows: [{
      sourceType: 'pair',
      sourceKey: 'driver_analyst',
      priority: 1,
      label: 'Over-control',
      narrative: 'Can narrow too early.',
      impact: 'Other options get filtered out too soon.',
      earlyWarning: 'Discussion becomes one-track.',
    }],
  });

  await replaceAssessmentVersionApplicationDevelopment(fake.db, {
    assessmentVersionId: 'version-1',
    rows: [{
      sourceType: 'signal',
      sourceKey: 'decision_evidence',
      priority: 1,
      label: 'Sharpen evidence',
      narrative: 'Support instinct with clearer proof points.',
      practice: 'Bring two pieces of evidence.',
      successMarker: 'Others can see the reasoning.',
    }],
  });

  await replaceAssessmentVersionApplicationActionPrompts(fake.db, {
    assessmentVersionId: 'version-1',
    rows: [{
      sourceType: 'hero_pattern',
      sourceKey: 'steady_steward',
      keepDoing: 'Keep',
      watchFor: 'Watch',
      practiceNext: 'Practice',
      askOthers: 'Ask',
    }],
  });

  const rows = await getAssessmentVersionApplicationLanguage(fake.db, 'version-1');

  assert.equal(rows.contribution[0]?.priority, 1);
  assert.equal(rows.risk[0]?.impact, 'Other options get filtered out too soon.');
  assert.equal(rows.development[0]?.successMarker, 'Others can see the reasoning.');
  assert.equal(rows.prompts[0]?.sourceType, 'hero_pattern');
});
