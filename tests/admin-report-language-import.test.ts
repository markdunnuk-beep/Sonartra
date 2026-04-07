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

type StoredDomainLanguageRow = {
  id: string;
  assessmentVersionId: string;
  domainKey: string;
  section: 'chapterOpening' | 'summary' | 'focus' | 'pressure' | 'environment';
  content: string;
};

type StoredSignalLanguageRow = {
  id: string;
  assessmentVersionId: string;
  signalKey: string;
  section: 'chapterSummary' | 'summary' | 'strength' | 'watchout' | 'development';
  content: string;
};

type StoredPairLanguageRow = {
  id: string;
  assessmentVersionId: string;
  signalPair: string;
  section: 'chapterSummary' | 'pressureFocus' | 'environmentFocus' | 'summary' | 'strength' | 'watchout';
  content: string;
};

function createFakeDb(seed?: {
  assessments?: StoredAssessment[];
  versions?: StoredVersion[];
  domains?: StoredDomain[];
  signals?: StoredSignal[];
  domainLanguage?: StoredDomainLanguageRow[];
  signalLanguage?: StoredSignalLanguageRow[];
  pairLanguage?: StoredPairLanguageRow[];
}, config?: {
  failInsertTable?: 'domains' | 'signals' | 'pairs';
}) {
  const state = {
    assessments: [...(seed?.assessments ?? [])],
    versions: [...(seed?.versions ?? [])],
    domains: [...(seed?.domains ?? [])],
    signals: [...(seed?.signals ?? [])],
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
            .map((row) => ({ signal_key: row.signalKey })) as unknown as T[],
        };
      }

      if (text.includes('FROM domains') && text.includes("domain_type = 'SIGNAL_GROUP'")) {
        const assessmentVersionId = params?.[0] as string;
        return {
          rows: state.domains
            .filter((row) => row.assessmentVersionId === assessmentVersionId && row.domainType === 'SIGNAL_GROUP')
            .sort((left, right) => left.orderIndex - right.orderIndex || left.id.localeCompare(right.id))
            .map((row) => ({ domain_key: row.domainKey })) as unknown as T[],
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

      if (text.includes('FROM assessment_version_language_overview')) {
        return { rows: [] as T[] };
      }

      if (text.includes('DELETE FROM assessment_version_language_domains')) {
        const assessmentVersionId = params?.[0] as string;
        state.domainLanguage = state.domainLanguage.filter((row) => row.assessmentVersionId !== assessmentVersionId);
        return { rows: [] as T[] };
      }

      if (text.includes('INSERT INTO assessment_version_language_domains')) {
        if (config?.failInsertTable === 'domains') {
          throw new Error('DOMAIN_INSERT_FAILED');
        }

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
        if (config?.failInsertTable === 'signals') {
          throw new Error('SIGNAL_INSERT_FAILED');
        }

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
        if (config?.failInsertTable === 'pairs') {
          throw new Error('PAIR_INSERT_FAILED');
        }

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

function buildSeed() {
  return {
    assessments: [{ id: 'assessment-1', assessmentKey: 'wplp80' }],
    versions: [{ id: 'version-a', assessmentId: 'assessment-1', lifecycleStatus: 'DRAFT' as const }],
    domains: [{ id: 'domain-a', assessmentVersionId: 'version-a', domainKey: 'operating-style', domainType: 'SIGNAL_GROUP' as const, orderIndex: 0 }],
    signals: [
      { id: 'signal-driver', assessmentVersionId: 'version-a', domainId: 'domain-a', signalKey: 'driver', orderIndex: 0 },
      { id: 'signal-analyst', assessmentVersionId: 'version-a', domainId: 'domain-a', signalKey: 'analyst', orderIndex: 1 },
    ],
  };
}

test('pair report-language import accepts canonical pair chapter rows and preserves canonical pair storage', async () => {
  const fake = createFakeDb(buildSeed());

  const result = await importReportLanguageForAssessmentVersionWithDependencies(
    {
      assessmentVersionId: 'version-a',
      reportSection: 'pair',
      rawInput: [
        'pair|driver_analyst|chapterSummary|You combine forward momentum with structured thinking.',
        'pair|driver_analyst|pressureFocus|Under strain, pace can outrun reflection.',
        'pair|driver_analyst|environmentFocus|Best in environments that reward momentum with structure.',
      ].join('\n'),
    },
    { db: fake.client, revalidatePath() {} },
  );

  assert.equal(result.success, true);
  assert.deepEqual(fake.state.pairLanguage, [
    {
      id: 'pair-1',
      assessmentVersionId: 'version-a',
      signalPair: 'driver_analyst',
      section: 'chapterSummary',
      content: 'You combine forward momentum with structured thinking.',
    },
    {
      id: 'pair-2',
      assessmentVersionId: 'version-a',
      signalPair: 'driver_analyst',
      section: 'pressureFocus',
      content: 'Under strain, pace can outrun reflection.',
    },
    {
      id: 'pair-3',
      assessmentVersionId: 'version-a',
      signalPair: 'driver_analyst',
      section: 'environmentFocus',
      content: 'Best in environments that reward momentum with structure.',
    },
  ]);
});

test('pair report-language import rejects non-canonical pair key order explicitly', async () => {
  const fake = createFakeDb(buildSeed());

  const preview = await previewReportLanguageForAssessmentVersionWithDependencies(
    {
      assessmentVersionId: 'version-a',
      reportSection: 'pair',
      rawInput: 'pair|analyst_driver|chapterSummary|Wrong order.',
    },
    { db: fake.client },
  );

  assert.equal(preview.success, false);
  assert.equal(preview.validationErrors[0]?.code, 'NON_CANONICAL_PAIR_KEY');
  assert.match(preview.validationErrors[0]?.message ?? '', /Use driver_analyst\./);
});

test('signal report-language import accepts canonical signal keys only', async () => {
  const fake = createFakeDb(buildSeed());

  const result = await importReportLanguageForAssessmentVersionWithDependencies(
    {
      assessmentVersionId: 'version-a',
      reportSection: 'signal',
      rawInput: 'signal|driver|chapterSummary|Driver summary.',
    },
    { db: fake.client, revalidatePath() {} },
  );

  assert.equal(result.success, true);
  assert.deepEqual(fake.state.signalLanguage, [
    {
      id: 'signal-1',
      assessmentVersionId: 'version-a',
      signalKey: 'driver',
      section: 'chapterSummary',
      content: 'Driver summary.',
    },
  ]);
});

test('signal report-language import rejects legacy prefixed signal keys in active validation', async () => {
  const fake = createFakeDb(buildSeed());

  const preview = await previewReportLanguageForAssessmentVersionWithDependencies(
    {
      assessmentVersionId: 'version-a',
      reportSection: 'signal',
      rawInput: 'signal|style_driver|chapterSummary|Legacy key.',
    },
    { db: fake.client },
  );

  assert.equal(preview.success, false);
  assert.equal(preview.validationErrors[0]?.code, 'UNKNOWN_SIGNAL_KEY');
});

test('domain report-language import accepts canonical domain keys only and persists chapterOpening', async () => {
  const fake = createFakeDb(buildSeed());

  const result = await importReportLanguageForAssessmentVersionWithDependencies(
    {
      assessmentVersionId: 'version-a',
      reportSection: 'domain',
      rawInput: 'domain|operating-style|chapterOpening|Custom domain chapter opening.',
    },
    { db: fake.client, revalidatePath() {} },
  );

  assert.equal(result.success, true);
  assert.deepEqual(fake.state.domainLanguage, [
    {
      id: 'domain-1',
      assessmentVersionId: 'version-a',
      domainKey: 'operating-style',
      section: 'chapterOpening',
      content: 'Custom domain chapter opening.',
    },
  ]);
});

test('domain report-language import rejects unsupported legacy fields with row-specific errors', async () => {
  const fake = createFakeDb(buildSeed());

  const result = await previewReportLanguageForAssessmentVersionWithDependencies(
    {
      assessmentVersionId: 'version-a',
      reportSection: 'domain',
      rawInput: [
        'domain|operating-style|focus|Legacy focus row.',
        'domain|operating-style|pressure|Legacy pressure row.',
        'domain|operating-style|environment|Legacy environment row.',
      ].join('\n'),
    },
    { db: fake.client },
  );

  assert.equal(result.success, false);
  assert.deepEqual(
    result.validationErrors.map((error) => error.message),
    [
      'Domain field focus is no longer supported. Domain chapter language supports chapterOpening only.',
      'Domain field pressure is no longer supported. Domain chapter language supports chapterOpening only.',
      'Domain field environment is no longer supported. Domain chapter language supports chapterOpening only.',
    ],
  );
});

test('report-language import surfaces the underlying write error instead of a generic save failure', async () => {
  const fake = createFakeDb(buildSeed(), { failInsertTable: 'pairs' });

  const result = await importReportLanguageForAssessmentVersionWithDependencies(
    {
      assessmentVersionId: 'version-a',
      reportSection: 'pair',
      rawInput: 'pair|driver_analyst|chapterSummary|Write should fail.',
    },
    { db: fake.client, revalidatePath() {} },
  );

  assert.equal(result.success, false);
  assert.equal(result.executionError, 'Pairs import could not be saved: PAIR_INSERT_FAILED');
});
