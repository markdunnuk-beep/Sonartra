import test from 'node:test';
import assert from 'node:assert/strict';

import {
  importReportLanguageForAssessmentVersionWithDependencies,
  previewReportLanguageForAssessmentVersionWithDependencies,
} from '@/lib/server/admin-report-language-import';

type StoredAssessment = {
  id: string;
  assessmentKey: string;
};

type StoredVersion = {
  id: string;
  assessmentId: string;
  lifecycleStatus: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
};

type StoredDomain = {
  id: string;
  assessmentVersionId: string;
  domainKey: string;
  domainType: 'QUESTION_SECTION' | 'SIGNAL_GROUP';
  orderIndex: number;
};

type StoredSignal = {
  id: string;
  assessmentVersionId: string;
  domainId: string;
  signalKey: string;
  orderIndex: number;
};

type StoredOverviewLanguageRow = {
  id: string;
  assessmentVersionId: string;
  patternKey: string;
  section: 'headline' | 'summary' | 'strengths' | 'watchouts' | 'development';
  content: string;
};

type StoredDomainLanguageRow = {
  id: string;
  assessmentVersionId: string;
  domainKey: string;
  section: 'summary' | 'focus' | 'pressure' | 'environment';
  content: string;
};

type StoredSignalLanguageRow = {
  id: string;
  assessmentVersionId: string;
  signalKey: string;
  section: 'summary' | 'strength' | 'watchout' | 'development';
  content: string;
};

type StoredPairLanguageRow = {
  id: string;
  assessmentVersionId: string;
  signalPair: string;
  section: 'summary' | 'strength' | 'watchout';
  content: string;
};

function createFakeDb(seed?: {
  assessments?: StoredAssessment[];
  versions?: StoredVersion[];
  domains?: StoredDomain[];
  signals?: StoredSignal[];
  overviewLanguage?: StoredOverviewLanguageRow[];
  domainLanguage?: StoredDomainLanguageRow[];
  signalLanguage?: StoredSignalLanguageRow[];
  pairLanguage?: StoredPairLanguageRow[];
}) {
  const state = {
    assessments: [...(seed?.assessments ?? [])],
    versions: [...(seed?.versions ?? [])],
    domains: [...(seed?.domains ?? [])],
    signals: [...(seed?.signals ?? [])],
    overviewLanguage: [...(seed?.overviewLanguage ?? [])],
    domainLanguage: [...(seed?.domainLanguage ?? [])],
    signalLanguage: [...(seed?.signalLanguage ?? [])],
    pairLanguage: [...(seed?.pairLanguage ?? [])],
  };

  let transactionSnapshot: typeof state | null = null;

  function snapshot() {
    return {
      assessments: state.assessments.map((row) => ({ ...row })),
      versions: state.versions.map((row) => ({ ...row })),
      domains: state.domains.map((row) => ({ ...row })),
      signals: state.signals.map((row) => ({ ...row })),
      overviewLanguage: state.overviewLanguage.map((row) => ({ ...row })),
      domainLanguage: state.domainLanguage.map((row) => ({ ...row })),
      signalLanguage: state.signalLanguage.map((row) => ({ ...row })),
      pairLanguage: state.pairLanguage.map((row) => ({ ...row })),
    };
  }

  const client = {
    async query<T>(text: string, params?: readonly unknown[]) {
      if (text === 'BEGIN') {
        transactionSnapshot = snapshot();
        return { rows: [] as T[] };
      }

      if (text === 'COMMIT') {
        transactionSnapshot = null;
        return { rows: [] as T[] };
      }

      if (text === 'ROLLBACK') {
        if (transactionSnapshot) {
          state.assessments = transactionSnapshot.assessments;
          state.versions = transactionSnapshot.versions;
          state.domains = transactionSnapshot.domains;
          state.signals = transactionSnapshot.signals;
          state.overviewLanguage = transactionSnapshot.overviewLanguage;
          state.domainLanguage = transactionSnapshot.domainLanguage;
          state.signalLanguage = transactionSnapshot.signalLanguage;
          state.pairLanguage = transactionSnapshot.pairLanguage;
        }
        transactionSnapshot = null;
        return { rows: [] as T[] };
      }

      if (text.includes('FROM assessment_versions av') && text.includes('INNER JOIN assessments a ON a.id = av.assessment_id')) {
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

      if (text.includes('FROM signals s') && text.includes('INNER JOIN domains d')) {
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
            .map((row) => ({
              signal_key: row.signalKey,
            })) as unknown as T[],
        };
      }

      if (text.includes('FROM domains') && text.includes("domain_type = 'SIGNAL_GROUP'")) {
        const assessmentVersionId = params?.[0] as string;
        return {
          rows: state.domains
            .filter((row) => row.assessmentVersionId === assessmentVersionId && row.domainType === 'SIGNAL_GROUP')
            .sort((left, right) => left.orderIndex - right.orderIndex || left.id.localeCompare(right.id))
            .map((row) => ({
              domain_key: row.domainKey,
            })) as unknown as T[],
        };
      }

      if (text.includes('FROM assessment_version_language_overview')) {
        const assessmentVersionId = params?.[0] as string;
        return {
          rows: state.overviewLanguage
            .filter((row) => row.assessmentVersionId === assessmentVersionId)
            .map((row) => ({
              id: row.id,
              assessment_version_id: row.assessmentVersionId,
              pattern_key: row.patternKey,
              section: row.section,
              content: row.content,
              created_at: '2026-04-01T00:00:00.000Z',
              updated_at: '2026-04-01T00:00:00.000Z',
            })) as unknown as T[],
        };
      }

      if (text.includes('FROM assessment_version_language_domains')) {
        const assessmentVersionId = params?.[0] as string;
        return {
          rows: state.domainLanguage
            .filter((row) => row.assessmentVersionId === assessmentVersionId)
            .map((row) => ({
              id: row.id,
              assessment_version_id: row.assessmentVersionId,
              domain_key: row.domainKey,
              section: row.section,
              content: row.content,
              created_at: '2026-04-01T00:00:00.000Z',
              updated_at: '2026-04-01T00:00:00.000Z',
            })) as unknown as T[],
        };
      }

      if (text.includes('FROM assessment_version_language_signals')) {
        const assessmentVersionId = params?.[0] as string;
        return {
          rows: state.signalLanguage
            .filter((row) => row.assessmentVersionId === assessmentVersionId)
            .map((row) => ({
              id: row.id,
              assessment_version_id: row.assessmentVersionId,
              signal_key: row.signalKey,
              section: row.section,
              content: row.content,
              created_at: '2026-04-01T00:00:00.000Z',
              updated_at: '2026-04-01T00:00:00.000Z',
            })) as unknown as T[],
        };
      }

      if (text.includes('FROM assessment_version_language_pairs')) {
        const assessmentVersionId = params?.[0] as string;
        return {
          rows: state.pairLanguage
            .filter((row) => row.assessmentVersionId === assessmentVersionId)
            .map((row) => ({
              id: row.id,
              assessment_version_id: row.assessmentVersionId,
              signal_pair: row.signalPair,
              section: row.section,
              content: row.content,
              created_at: '2026-04-01T00:00:00.000Z',
              updated_at: '2026-04-01T00:00:00.000Z',
            })) as unknown as T[],
        };
      }

      if (text.includes('DELETE FROM assessment_version_language_overview')) {
        const assessmentVersionId = params?.[0] as string;
        state.overviewLanguage = state.overviewLanguage.filter((row) => row.assessmentVersionId !== assessmentVersionId);
        return { rows: [] as T[] };
      }

      if (text.includes('INSERT INTO assessment_version_language_overview')) {
        const [assessmentVersionId, patternKey, section, content] = params as [string, string, StoredOverviewLanguageRow['section'], string];
        state.overviewLanguage.push({
          id: `overview-${state.overviewLanguage.length + 1}`,
          assessmentVersionId,
          patternKey,
          section,
          content,
        });
        return { rows: [] as T[] };
      }

      if (text.includes('DELETE FROM assessment_version_language_domains')) {
        const assessmentVersionId = params?.[0] as string;
        state.domainLanguage = state.domainLanguage.filter((row) => row.assessmentVersionId !== assessmentVersionId);
        return { rows: [] as T[] };
      }

      if (text.includes('INSERT INTO assessment_version_language_domains')) {
        const [assessmentVersionId, domainKey, section, content] = params as [string, string, StoredDomainLanguageRow['section'], string];
        state.domainLanguage.push({
          id: `domain-${state.domainLanguage.length + 1}`,
          assessmentVersionId,
          domainKey,
          section,
          content,
        });
        return { rows: [] as T[] };
      }

      if (text.includes('DELETE FROM assessment_version_language_signals')) {
        const assessmentVersionId = params?.[0] as string;
        state.signalLanguage = state.signalLanguage.filter((row) => row.assessmentVersionId !== assessmentVersionId);
        return { rows: [] as T[] };
      }

      if (text.includes('INSERT INTO assessment_version_language_signals')) {
        const [assessmentVersionId, signalKey, section, content] = params as [string, string, StoredSignalLanguageRow['section'], string];
        state.signalLanguage.push({
          id: `signal-${state.signalLanguage.length + 1}`,
          assessmentVersionId,
          signalKey,
          section,
          content,
        });
        return { rows: [] as T[] };
      }

      if (text.includes('DELETE FROM assessment_version_language_pairs')) {
        const assessmentVersionId = params?.[0] as string;
        state.pairLanguage = state.pairLanguage.filter((row) => row.assessmentVersionId !== assessmentVersionId);
        return { rows: [] as T[] };
      }

      if (text.includes('INSERT INTO assessment_version_language_pairs')) {
        const [assessmentVersionId, signalPair, section, content] = params as [string, string, StoredPairLanguageRow['section'], string];
        state.pairLanguage.push({
          id: `pair-${state.pairLanguage.length + 1}`,
          assessmentVersionId,
          signalPair,
          section,
          content,
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

test('hero report-language preview and import route through the compatibility layer into overview storage', async () => {
  const fake = createFakeDb({
    assessments: [{ id: 'assessment-1', assessmentKey: 'wplp80' }],
    versions: [{ id: 'version-a', assessmentId: 'assessment-1', lifecycleStatus: 'DRAFT' }],
    domains: [{ id: 'domain-a', assessmentVersionId: 'version-a', domainKey: 'signal_style', domainType: 'SIGNAL_GROUP', orderIndex: 0 }],
    signals: [
      { id: 'signal-driver', assessmentVersionId: 'version-a', domainId: 'domain-a', signalKey: 'style_driver', orderIndex: 0 },
      { id: 'signal-analyst', assessmentVersionId: 'version-a', domainId: 'domain-a', signalKey: 'style_analyst', orderIndex: 1 },
    ],
  });

  const preview = await previewReportLanguageForAssessmentVersionWithDependencies(
    {
      assessmentVersionId: 'version-a',
      reportSection: 'hero',
      rawInput: [
        'hero|driver_analyst|headline|Fast, structured, decisive.',
        'hero|driver_analyst|narrative|You combine pace with logic.',
      ].join('\n'),
    },
    { db: fake.client },
  );

  assert.equal(preview.success, true);
  assert.equal(preview.previewGroups[0]?.targetKey, 'analyst_driver');

  const result = await importReportLanguageForAssessmentVersionWithDependencies(
    {
      assessmentVersionId: 'version-a',
      reportSection: 'hero',
      rawInput: [
        'hero|driver_analyst|headline|Fast, structured, decisive.',
        'hero|driver_analyst|narrative|You combine pace with logic.',
      ].join('\n'),
    },
    { db: fake.client, revalidatePath() {} },
  );

  assert.equal(result.success, true);
  assert.deepEqual(
    fake.state.overviewLanguage.map((row) => ({
      patternKey: row.patternKey,
      section: row.section,
      content: row.content,
    })),
    [
      { patternKey: 'analyst_driver', section: 'headline', content: 'Fast, structured, decisive.' },
      { patternKey: 'analyst_driver', section: 'summary', content: 'You combine pace with logic.' },
    ],
  );
});

test('pair report-language import accepts summary only and preserves canonical pair storage', async () => {
  const fake = createFakeDb({
    assessments: [{ id: 'assessment-1', assessmentKey: 'wplp80' }],
    versions: [{ id: 'version-a', assessmentId: 'assessment-1', lifecycleStatus: 'DRAFT' }],
    domains: [{ id: 'domain-a', assessmentVersionId: 'version-a', domainKey: 'signal_style', domainType: 'SIGNAL_GROUP', orderIndex: 0 }],
    signals: [
      { id: 'signal-driver', assessmentVersionId: 'version-a', domainId: 'domain-a', signalKey: 'style_driver', orderIndex: 0 },
      { id: 'signal-analyst', assessmentVersionId: 'version-a', domainId: 'domain-a', signalKey: 'style_analyst', orderIndex: 1 },
    ],
  });

  const result = await importReportLanguageForAssessmentVersionWithDependencies(
    {
      assessmentVersionId: 'version-a',
      reportSection: 'pair',
      rawInput: 'pair|driver_analyst|summary|You combine forward momentum with structured thinking.',
    },
    { db: fake.client, revalidatePath() {} },
  );

  assert.equal(result.success, true);
  assert.deepEqual(fake.state.pairLanguage, [
    {
      id: 'pair-1',
      assessmentVersionId: 'version-a',
      signalPair: 'analyst_driver',
      section: 'summary',
      content: 'You combine forward momentum with structured thinking.',
    },
  ]);
});

test('report-language section imports reject rows for the wrong report section', async () => {
  const fake = createFakeDb({
    assessments: [{ id: 'assessment-1', assessmentKey: 'wplp80' }],
    versions: [{ id: 'version-a', assessmentId: 'assessment-1', lifecycleStatus: 'DRAFT' }],
    domains: [{ id: 'domain-a', assessmentVersionId: 'version-a', domainKey: 'signal_style', domainType: 'SIGNAL_GROUP', orderIndex: 0 }],
    signals: [
      { id: 'signal-driver', assessmentVersionId: 'version-a', domainId: 'domain-a', signalKey: 'style_driver', orderIndex: 0 },
      { id: 'signal-analyst', assessmentVersionId: 'version-a', domainId: 'domain-a', signalKey: 'style_analyst', orderIndex: 1 },
    ],
  });

  const preview = await previewReportLanguageForAssessmentVersionWithDependencies(
    {
      assessmentVersionId: 'version-a',
      reportSection: 'hero',
      rawInput: 'pair|driver_analyst|summary|Wrong section for this panel.',
    },
    { db: fake.client },
  );

  assert.equal(preview.success, false);
  assert.equal(preview.planErrors[0]?.code, 'WRONG_REPORT_SECTION');
});
