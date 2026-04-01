import test from 'node:test';
import assert from 'node:assert/strict';

import {
  importDomainLanguageForAssessmentVersionWithDependencies,
  previewDomainLanguageForAssessmentVersionWithDependencies,
} from '@/lib/server/admin-domain-language-import';

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
  signalLanguage?: StoredSignalLanguageRow[];
  pairLanguage?: StoredPairLanguageRow[];
  domainLanguage?: StoredDomainLanguageRow[];
  overviewLanguage?: StoredOverviewLanguageRow[];
}) {
  const state = {
    assessments: [...(seed?.assessments ?? [])],
    versions: [...(seed?.versions ?? [])],
    domains: [...(seed?.domains ?? [])],
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

      if (text.includes('FROM domains') && text.includes("domain_type = 'SIGNAL_GROUP'")) {
        const assessmentVersionId = params?.[0] as string;
        return {
          rows: state.domains
            .filter(
              (row) =>
                row.assessmentVersionId === assessmentVersionId && row.domainType === 'SIGNAL_GROUP',
            )
            .sort(
              (left, right) => left.orderIndex - right.orderIndex || left.id.localeCompare(right.id),
            )
            .map((row) => ({
              domain_id: row.id,
              domain_key: row.domainKey,
            })) as unknown as T[],
        };
      }

      if (text.includes('DELETE FROM assessment_version_language_domains')) {
        const assessmentVersionId = params?.[0] as string;
        state.domainLanguage = state.domainLanguage.filter(
          (row) => row.assessmentVersionId !== assessmentVersionId,
        );
        return { rows: [] as T[] };
      }

      if (text.includes('INSERT INTO assessment_version_language_domains')) {
        const [assessmentVersionId, domainKey, section, content] = params as [
          string,
          string,
          StoredDomainLanguageRow['section'],
          string,
        ];
        state.domainLanguage.push({
          id: `domain-language-${state.domainLanguage.length + 1}`,
          assessmentVersionId,
          domainKey,
          section,
          content,
        });
        return { rows: [] as T[] };
      }

      if (text.includes('FROM assessment_version_language_domains')) {
        const assessmentVersionId = params?.[0] as string;
        return {
          rows: state.domainLanguage
            .filter((row) => row.assessmentVersionId === assessmentVersionId)
            .sort(
              (left, right) =>
                left.domainKey.localeCompare(right.domainKey) ||
                left.section.localeCompare(right.section) ||
                left.id.localeCompare(right.id),
            )
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
      {
        id: 'domain-a',
        assessmentVersionId: 'version-a',
        domainKey: 'behaviour_style',
        domainType: 'SIGNAL_GROUP',
        orderIndex: 0,
      },
      {
        id: 'domain-b',
        assessmentVersionId: 'version-b',
        domainKey: 'decision_pattern',
        domainType: 'SIGNAL_GROUP',
        orderIndex: 0,
      },
    ],
  });

  const preview = await previewDomainLanguageForAssessmentVersionWithDependencies(
    {
      assessmentVersionId: 'version-a',
      rawInput: 'decision_pattern|summary|Not valid for version A',
    },
    { db: fake.client },
  );

  assert.equal(preview.success, false);
  assert.equal(preview.validationErrors[0]?.code, 'INVALID_DOMAIN_KEY');
});

test('preview ordering follows authored domain order and excludes question-section domains', async () => {
  const fake = createFakeDb({
    assessments: [{ id: 'assessment-1', assessmentKey: 'wplp80' }],
    versions: [{ id: 'version-a', assessmentId: 'assessment-1', lifecycleStatus: 'DRAFT' }],
    domains: [
      {
        id: 'domain-question',
        assessmentVersionId: 'version-a',
        domainKey: 'section_one',
        domainType: 'QUESTION_SECTION',
        orderIndex: 0,
      },
      {
        id: 'domain-style',
        assessmentVersionId: 'version-a',
        domainKey: 'behaviour_style',
        domainType: 'SIGNAL_GROUP',
        orderIndex: 1,
      },
      {
        id: 'domain-decision',
        assessmentVersionId: 'version-a',
        domainKey: 'decision_pattern',
        domainType: 'SIGNAL_GROUP',
        orderIndex: 2,
      },
    ],
  });

  const preview = await previewDomainLanguageForAssessmentVersionWithDependencies(
    {
      assessmentVersionId: 'version-a',
      rawInput: [
        'decision_pattern|pressure|Pressure',
        'behaviour_style|summary|Summary',
        'behaviour_style|environment|Environment',
      ].join('\n'),
    },
    { db: fake.client },
  );

  assert.equal(preview.success, true);
  assert.deepEqual(
    preview.previewGroups.map((group) => group.domainKey),
    ['behaviour_style', 'decision_pattern'],
  );
  assert.deepEqual(
    preview.previewGroups[0]?.entries.map((entry) => entry.section),
    ['summary', 'environment'],
  );
});

test('safe handling when no authored domains are available for the active version', async () => {
  const fake = createFakeDb({
    assessments: [{ id: 'assessment-1', assessmentKey: 'wplp80' }],
    versions: [{ id: 'version-a', assessmentId: 'assessment-1', lifecycleStatus: 'DRAFT' }],
    domains: [],
  });

  const preview = await previewDomainLanguageForAssessmentVersionWithDependencies(
    {
      assessmentVersionId: 'version-a',
      rawInput: 'behaviour_style|summary|Summary',
    },
    { db: fake.client },
  );

  assert.equal(preview.success, false);
  assert.equal(preview.planErrors[0]?.code, 'DOMAIN_SET_EMPTY');
  assert.equal(preview.validationErrors[0]?.code, 'INVALID_DOMAIN_KEY');
});

test('import persists rows correctly and reports imported totals', async () => {
  const fake = createFakeDb({
    assessments: [{ id: 'assessment-1', assessmentKey: 'wplp80' }],
    versions: [{ id: 'version-a', assessmentId: 'assessment-1', lifecycleStatus: 'DRAFT' }],
    domains: [
      {
        id: 'domain-style',
        assessmentVersionId: 'version-a',
        domainKey: 'behaviour_style',
        domainType: 'SIGNAL_GROUP',
        orderIndex: 0,
      },
      {
        id: 'domain-decision',
        assessmentVersionId: 'version-a',
        domainKey: 'decision_pattern',
        domainType: 'SIGNAL_GROUP',
        orderIndex: 1,
      },
    ],
  });

  const result = await importDomainLanguageForAssessmentVersionWithDependencies(
    {
      assessmentVersionId: 'version-a',
      rawInput: [
        'behaviour_style|summary|Summary',
        'behaviour_style|focus|Focus',
        'decision_pattern|pressure|Pressure',
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
    domainCount: 2,
    existingRowCount: 0,
    importedRowCount: 3,
    importedDomainCount: 2,
  });
  assert.deepEqual(
    fake.state.domainLanguage.map((row) => ({
      domainKey: row.domainKey,
      section: row.section,
      content: row.content,
    })),
    [
      { domainKey: 'behaviour_style', section: 'summary', content: 'Summary' },
      { domainKey: 'behaviour_style', section: 'focus', content: 'Focus' },
      { domainKey: 'decision_pattern', section: 'pressure', content: 'Pressure' },
    ],
  );
});

test('import replaces prior domain-language rows only and leaves signal/pair/overview datasets untouched', async () => {
  const fake = createFakeDb({
    assessments: [{ id: 'assessment-1', assessmentKey: 'wplp80' }],
    versions: [{ id: 'version-a', assessmentId: 'assessment-1', lifecycleStatus: 'DRAFT' }],
    domains: [
      {
        id: 'domain-style',
        assessmentVersionId: 'version-a',
        domainKey: 'behaviour_style',
        domainType: 'SIGNAL_GROUP',
        orderIndex: 0,
      },
    ],
    signalLanguage: [
      {
        id: 'signal-language-1',
        assessmentVersionId: 'version-a',
        signalKey: 'driver',
        section: 'summary',
        content: 'Signal summary',
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
        id: 'domain-language-old',
        assessmentVersionId: 'version-a',
        domainKey: 'behaviour_style',
        section: 'summary',
        content: 'Old summary',
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

  const result = await importDomainLanguageForAssessmentVersionWithDependencies(
    {
      assessmentVersionId: 'version-a',
      rawInput: 'behaviour_style|environment|New environment guidance',
    },
    {
      db: fake.client,
      revalidatePath() {},
    },
  );

  assert.equal(result.success, true);
  assert.deepEqual(fake.state.domainLanguage, [
    {
      id: 'domain-language-1',
      assessmentVersionId: 'version-a',
      domainKey: 'behaviour_style',
      section: 'environment',
      content: 'New environment guidance',
    },
  ]);
  assert.equal(fake.state.signalLanguage[0]?.content, 'Signal summary');
  assert.equal(fake.state.pairLanguage[0]?.content, 'Pair summary');
  assert.equal(fake.state.overviewLanguage[0]?.content, 'Overview headline');
});
