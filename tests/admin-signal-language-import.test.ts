import test from 'node:test';
import assert from 'node:assert/strict';

import {
  importSignalLanguageForAssessmentVersionWithDependencies,
  previewSignalLanguageForAssessmentVersionWithDependencies,
} from '@/lib/server/admin-signal-language-import';

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
  orderIndex: number;
};

type StoredSignal = {
  id: string;
  assessmentVersionId: string;
  domainId: string;
  signalKey: string;
  orderIndex: number;
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

type StoredDomainLanguageRow = {
  id: string;
  assessmentVersionId: string;
  domainKey: string;
  section: 'summary' | 'focus' | 'pressure' | 'environment';
  content: string;
};

type StoredOverviewLanguageRow = {
  id: string;
  assessmentVersionId: string;
  patternKey: string;
  section: 'headline' | 'summary' | 'strengths' | 'watchouts' | 'development';
  content: string;
};

function createFakeDb(seed?: {
  assessments?: StoredAssessment[];
  versions?: StoredVersion[];
  domains?: StoredDomain[];
  signals?: StoredSignal[];
  signalLanguage?: StoredSignalLanguageRow[];
  pairLanguage?: StoredPairLanguageRow[];
  domainLanguage?: StoredDomainLanguageRow[];
  overviewLanguage?: StoredOverviewLanguageRow[];
}) {
  const state = {
    assessments: [...(seed?.assessments ?? [])],
    versions: [...(seed?.versions ?? [])],
    domains: [...(seed?.domains ?? [])],
    signals: [...(seed?.signals ?? [])],
    signalLanguage: [...(seed?.signalLanguage ?? [])],
    pairLanguage: [...(seed?.pairLanguage ?? [])],
    domainLanguage: [...(seed?.domainLanguage ?? [])],
    overviewLanguage: [...(seed?.overviewLanguage ?? [])],
  };

  let transactionSnapshot: typeof state | null = null;

  function snapshot() {
    return {
      assessments: state.assessments.map((row) => ({ ...row })),
      versions: state.versions.map((row) => ({ ...row })),
      domains: state.domains.map((row) => ({ ...row })),
      signals: state.signals.map((row) => ({ ...row })),
      signalLanguage: state.signalLanguage.map((row) => ({ ...row })),
      pairLanguage: state.pairLanguage.map((row) => ({ ...row })),
      domainLanguage: state.domainLanguage.map((row) => ({ ...row })),
      overviewLanguage: state.overviewLanguage.map((row) => ({ ...row })),
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
          state.signalLanguage = transactionSnapshot.signalLanguage;
          state.pairLanguage = transactionSnapshot.pairLanguage;
          state.domainLanguage = transactionSnapshot.domainLanguage;
          state.overviewLanguage = transactionSnapshot.overviewLanguage;
        }
        transactionSnapshot = null;
        return { rows: [] as T[] };
      }

      if (
        text.includes('FROM assessment_versions av') &&
        text.includes('INNER JOIN assessments a ON a.id = av.assessment_id')
      ) {
        const assessmentVersionId = params?.[0] as string;
        const version = state.versions.find((row) => row.id === assessmentVersionId) ?? null;
        const assessment = version
          ? state.assessments.find((row) => row.id === version.assessmentId) ?? null
          : null;

        return {
          rows:
            version && assessment
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
          state.domains
            .filter((row) => row.assessmentVersionId === assessmentVersionId)
            .map((row) => [row.id, row.orderIndex]),
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
              signal_id: row.id,
              signal_key: row.signalKey,
            })) as unknown as T[],
        };
      }

      if (text.includes('DELETE FROM assessment_version_language_signals')) {
        const assessmentVersionId = params?.[0] as string;
        state.signalLanguage = state.signalLanguage.filter(
          (row) => row.assessmentVersionId !== assessmentVersionId,
        );
        return { rows: [] as T[] };
      }

      if (text.includes('INSERT INTO assessment_version_language_signals')) {
        const [assessmentVersionId, signalKey, section, content] = params as [
          string,
          string,
          StoredSignalLanguageRow['section'],
          string,
        ];
        state.signalLanguage.push({
          id: `signal-language-${state.signalLanguage.length + 1}`,
          assessmentVersionId,
          signalKey,
          section,
          content,
        });
        return { rows: [] as T[] };
      }

      if (text.includes('FROM assessment_version_language_signals')) {
        const assessmentVersionId = params?.[0] as string;
        return {
          rows: state.signalLanguage
            .filter((row) => row.assessmentVersionId === assessmentVersionId)
            .sort(
              (left, right) =>
                left.signalKey.localeCompare(right.signalKey) ||
                left.section.localeCompare(right.section) ||
                left.id.localeCompare(right.id),
            )
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

      return { rows: [] as T[] };
    },
    async connect() {
      return {
        query: client.query,
        release() {},
      };
    },
  };

  return {
    client,
    state,
  };
}

test('preview and import remain assessment-version scoped', async () => {
  const fake = createFakeDb({
    assessments: [{ id: 'assessment-1', assessmentKey: 'wplp80' }],
    versions: [
      { id: 'version-a', assessmentId: 'assessment-1', lifecycleStatus: 'DRAFT' },
      { id: 'version-b', assessmentId: 'assessment-1', lifecycleStatus: 'DRAFT' },
    ],
    domains: [
      { id: 'domain-a', assessmentVersionId: 'version-a', orderIndex: 0 },
      { id: 'domain-b', assessmentVersionId: 'version-b', orderIndex: 0 },
    ],
    signals: [
      { id: 'signal-driver', assessmentVersionId: 'version-a', domainId: 'domain-a', signalKey: 'driver', orderIndex: 0 },
      { id: 'signal-analyst', assessmentVersionId: 'version-b', domainId: 'domain-b', signalKey: 'analyst', orderIndex: 0 },
    ],
  });

  const preview = await previewSignalLanguageForAssessmentVersionWithDependencies(
    {
      assessmentVersionId: 'version-a',
      rawInput: 'analyst|summary|Not valid for version A',
    },
    { db: fake.client },
  );

  assert.equal(preview.success, false);
  assert.equal(preview.validationErrors[0]?.code, 'INVALID_SIGNAL_KEY');
});

test('import persists rows correctly and reports imported totals', async () => {
  const fake = createFakeDb({
    assessments: [{ id: 'assessment-1', assessmentKey: 'wplp80' }],
    versions: [{ id: 'version-a', assessmentId: 'assessment-1', lifecycleStatus: 'DRAFT' }],
    domains: [{ id: 'domain-a', assessmentVersionId: 'version-a', orderIndex: 0 }],
    signals: [
      { id: 'signal-driver', assessmentVersionId: 'version-a', domainId: 'domain-a', signalKey: 'driver', orderIndex: 0 },
      { id: 'signal-analyst', assessmentVersionId: 'version-a', domainId: 'domain-a', signalKey: 'analyst', orderIndex: 1 },
    ],
  });

  const result = await importSignalLanguageForAssessmentVersionWithDependencies(
    {
      assessmentVersionId: 'version-a',
      rawInput: [
        'driver|summary|Driver summary',
        'driver|strength|Driver strength',
        'analyst|watchout|Analyst watchout',
      ].join('\n'),
    },
    {
      db: fake.client,
      revalidatePath() {},
    },
  );

  assert.equal(result.success, true);
  assert.deepEqual(result.summary, {
    assessmentVersionId: 'version-a',
    rowCount: 3,
    signalCount: 2,
    existingRowCount: 0,
    importedRowCount: 3,
    importedSignalCount: 2,
  });
  assert.deepEqual(
    fake.state.signalLanguage.map((row) => ({
      signalKey: row.signalKey,
      section: row.section,
      content: row.content,
    })),
    [
      { signalKey: 'analyst', section: 'watchout', content: 'Analyst watchout' },
      { signalKey: 'driver', section: 'summary', content: 'Driver summary' },
      { signalKey: 'driver', section: 'strength', content: 'Driver strength' },
    ],
  );
});

test('import replaces prior signal-language rows only and leaves pair/domain/overview datasets untouched', async () => {
  const fake = createFakeDb({
    assessments: [{ id: 'assessment-1', assessmentKey: 'wplp80' }],
    versions: [{ id: 'version-a', assessmentId: 'assessment-1', lifecycleStatus: 'DRAFT' }],
    domains: [{ id: 'domain-a', assessmentVersionId: 'version-a', orderIndex: 0 }],
    signals: [{ id: 'signal-driver', assessmentVersionId: 'version-a', domainId: 'domain-a', signalKey: 'driver', orderIndex: 0 }],
    signalLanguage: [
      {
        id: 'signal-language-old',
        assessmentVersionId: 'version-a',
        signalKey: 'driver',
        section: 'summary',
        content: 'Old summary',
      },
    ],
    pairLanguage: [
      {
        id: 'pair-language-1',
        assessmentVersionId: 'version-a',
        signalPair: 'driver_analyst',
        section: 'summary',
        content: 'Pair summary',
      },
    ],
    domainLanguage: [
      {
        id: 'domain-language-1',
        assessmentVersionId: 'version-a',
        domainKey: 'leadership',
        section: 'summary',
        content: 'Domain summary',
      },
    ],
    overviewLanguage: [
      {
        id: 'overview-language-1',
        assessmentVersionId: 'version-a',
        patternKey: 'core',
        section: 'headline',
        content: 'Overview headline',
      },
    ],
  });

  const result = await importSignalLanguageForAssessmentVersionWithDependencies(
    {
      assessmentVersionId: 'version-a',
      rawInput: 'driver|development|New development guidance',
    },
    {
      db: fake.client,
      revalidatePath() {},
    },
  );

  assert.equal(result.success, true);
  assert.deepEqual(fake.state.signalLanguage, [
    {
      id: 'signal-language-1',
      assessmentVersionId: 'version-a',
      signalKey: 'driver',
      section: 'development',
      content: 'New development guidance',
    },
  ]);
  assert.equal(fake.state.pairLanguage[0]?.content, 'Pair summary');
  assert.equal(fake.state.domainLanguage[0]?.content, 'Domain summary');
  assert.equal(fake.state.overviewLanguage[0]?.content, 'Overview headline');
});
