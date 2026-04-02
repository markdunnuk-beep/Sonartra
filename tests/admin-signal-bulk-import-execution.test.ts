import test from 'node:test';
import assert from 'node:assert/strict';

import { executeSignalBulkImportWithDependencies } from '@/lib/server/admin-signal-bulk-import';

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
  label: string;
  domainType: 'QUESTION_SECTION' | 'SIGNAL_GROUP';
  orderIndex: number;
};

type StoredSignal = {
  id: string;
  assessmentVersionId: string;
  domainId: string;
  signalKey: string;
  label: string;
  description: string | null;
  orderIndex: number;
  isOverlay: boolean;
};

function createFakeDb(
  seed?: {
    assessments?: StoredAssessment[];
    versions?: StoredVersion[];
    domains?: StoredDomain[];
    signals?: StoredSignal[];
  },
  config?: {
    failInsertForSignalKey?: string;
  },
) {
  const state = {
    assessments: [...(seed?.assessments ?? [])],
    versions: [...(seed?.versions ?? [])],
    domains: [...(seed?.domains ?? [])],
    signals: [...(seed?.signals ?? [])],
  };
  let transactionSnapshot: typeof state | null = null;
  let nextSignalId = state.signals.length + 1;

  function snapshot() {
    return {
      assessments: state.assessments.map((row) => ({ ...row })),
      versions: state.versions.map((row) => ({ ...row })),
      domains: state.domains.map((row) => ({ ...row })),
      signals: state.signals.map((row) => ({ ...row })),
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
        }
        transactionSnapshot = null;
        return { rows: [] as T[] };
      }

      if (text.includes('FROM assessment_versions av') && text.includes('INNER JOIN assessments a ON a.id = av.assessment_id')) {
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

      if (text.includes('FROM domains') && text.includes('WHERE assessment_version_id = $1')) {
        const assessmentVersionId = params?.[0] as string;
        return {
          rows: state.domains
            .filter((row) => row.assessmentVersionId === assessmentVersionId)
            .sort((left, right) => left.orderIndex - right.orderIndex || left.id.localeCompare(right.id))
            .map((row) => ({
              domain_id: row.id,
              domain_key: row.domainKey,
              label: row.label,
              order_index: row.orderIndex,
              domain_type: row.domainType,
            })) as unknown as T[],
        };
      }

      if (text.includes('FROM signals') && text.includes('WHERE assessment_version_id = $1')) {
        const assessmentVersionId = params?.[0] as string;
        return {
          rows: state.signals
            .filter((row) => row.assessmentVersionId === assessmentVersionId)
            .sort((left, right) => left.domainId.localeCompare(right.domainId) || left.orderIndex - right.orderIndex || left.id.localeCompare(right.id))
            .map((row) => ({
              signal_id: row.id,
              domain_id: row.domainId,
              signal_key: row.signalKey,
              label: row.label,
              order_index: row.orderIndex,
            })) as unknown as T[],
        };
      }

      if (text.includes('INSERT INTO signals') && text.includes('VALUES ($1, $2, $3, $4, $5, $6, FALSE)')) {
        const [assessmentVersionId, domainId, signalKey, label, description, orderIndex] = params as [
          string,
          string,
          string,
          string,
          string | null,
          number,
        ];

        if (config?.failInsertForSignalKey === signalKey) {
          throw new Error('SIGNAL_INSERT_FAILED');
        }

        const inserted = {
          id: `signal-${nextSignalId++}`,
          assessmentVersionId,
          domainId,
          signalKey,
          label,
          description,
          orderIndex,
          isOverlay: false,
        };
        state.signals.push(inserted);
        return {
          rows: ([{
            id: inserted.id,
            signal_key: inserted.signalKey,
            label: inserted.label,
            description: inserted.description,
            order_index: inserted.orderIndex,
          }] as unknown as T[]),
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

  return { client, state };
}

test('valid batch imports signals into correct domains with per-domain append order and grouped summary', async () => {
  const fake = createFakeDb({
    assessments: [{ id: 'assessment-1', assessmentKey: 'signals' }],
    versions: [{ id: 'version-1', assessmentId: 'assessment-1', lifecycleStatus: 'DRAFT' }],
    domains: [
      { id: 'domain-1', assessmentVersionId: 'version-1', domainKey: 'leadership-style', label: 'Leadership Style', domainType: 'SIGNAL_GROUP', orderIndex: 0 },
      { id: 'domain-2', assessmentVersionId: 'version-1', domainKey: 'core-drivers', label: 'Core Drivers', domainType: 'SIGNAL_GROUP', orderIndex: 1 },
    ],
    signals: [
      { id: 'signal-existing-1', assessmentVersionId: 'version-1', domainId: 'domain-1', signalKey: 'existing-one', label: 'Existing One', description: null, orderIndex: 2, isOverlay: false },
      { id: 'signal-existing-2', assessmentVersionId: 'version-1', domainId: 'domain-2', signalKey: 'existing-two', label: 'Existing Two', description: null, orderIndex: 5, isOverlay: false },
    ],
  });
  const revalidatedPaths: string[] = [];

  const result = await executeSignalBulkImportWithDependencies(
    {
      assessmentVersionId: 'version-1',
      rawInput: [
        'leadership-style|Directive|Drives momentum.',
        'leadership-style|Supportive',
        'core-drivers|Achiever|Delivers outcomes.',
      ].join('\n'),
    },
    {
      db: fake.client,
      connect: () => fake.client.connect(),
      revalidatePath: (path) => revalidatedPaths.push(path),
    },
  );

  assert.equal(result.ok, true);
  assert.equal(result.didImport, true);
  assert.equal(result.importedCount, 3);
  assert.deepEqual(
    fake.state.signals
      .filter((row) => row.assessmentVersionId === 'version-1')
      .sort((left, right) => left.domainId.localeCompare(right.domainId) || left.orderIndex - right.orderIndex)
      .map((row) => ({
        domainId: row.domainId,
        key: row.signalKey,
        label: row.label,
        description: row.description,
        orderIndex: row.orderIndex,
      })),
    [
      { domainId: 'domain-1', key: 'existing-one', label: 'Existing One', description: null, orderIndex: 2 },
      { domainId: 'domain-1', key: 'directive', label: 'Directive', description: 'Drives momentum.', orderIndex: 3 },
      { domainId: 'domain-1', key: 'supportive', label: 'Supportive', description: null, orderIndex: 4 },
      { domainId: 'domain-2', key: 'existing-two', label: 'Existing Two', description: null, orderIndex: 5 },
      { domainId: 'domain-2', key: 'achiever', label: 'Achiever', description: 'Delivers outcomes.', orderIndex: 6 },
    ],
  );
  assert.deepEqual(
    result.createdByDomain.map((group) => ({ domainKey: group.domainKey, count: group.createdCount })),
    [
      { domainKey: 'core-drivers', count: 1 },
      { domainKey: 'leadership-style', count: 2 },
    ],
  );
  assert.deepEqual(revalidatedPaths, ['/admin/assessments/signals']);
});

test('non-draft version is blocked without writes', async () => {
  const fake = createFakeDb({
    assessments: [{ id: 'assessment-1', assessmentKey: 'signals' }],
    versions: [{ id: 'version-1', assessmentId: 'assessment-1', lifecycleStatus: 'PUBLISHED' }],
    domains: [
      { id: 'domain-1', assessmentVersionId: 'version-1', domainKey: 'leadership-style', label: 'Leadership Style', domainType: 'SIGNAL_GROUP', orderIndex: 0 },
    ],
    signals: [],
  });

  const result = await executeSignalBulkImportWithDependencies(
    {
      assessmentVersionId: 'version-1',
      rawInput: 'leadership-style|Directive',
    },
    {
      db: fake.client,
      connect: () => fake.client.connect(),
      revalidatePath() {},
    },
  );

  assert.equal(result.ok, false);
  assert.equal(result.didImport, false);
  assert.equal(result.rejected[0]?.reasonCode, 'VERSION_NOT_DRAFT');
  assert.equal(fake.state.signals.length, 0);
});

test('unknown or conflicting rows do not write when nothing is importable', async () => {
  const fake = createFakeDb({
    assessments: [{ id: 'assessment-1', assessmentKey: 'signals' }],
    versions: [{ id: 'version-1', assessmentId: 'assessment-1', lifecycleStatus: 'DRAFT' }],
    domains: [
      { id: 'domain-1', assessmentVersionId: 'version-1', domainKey: 'leadership-style', label: 'Leadership Style', domainType: 'SIGNAL_GROUP', orderIndex: 0 },
    ],
    signals: [
      { id: 'signal-1', assessmentVersionId: 'version-1', domainId: 'domain-1', signalKey: 'directive', label: 'Directive', description: null, orderIndex: 0, isOverlay: false },
    ],
  });

  const result = await executeSignalBulkImportWithDependencies(
    {
      assessmentVersionId: 'version-1',
      rawInput: ['missing-domain|Supportive', 'leadership-style|Directive'].join('\n'),
    },
    {
      db: fake.client,
      connect: () => fake.client.connect(),
      revalidatePath() {},
    },
  );

  assert.equal(result.ok, false);
  assert.equal(result.didImport, false);
  assert.deepEqual(result.rejected.map((row) => row.reasonCode), [
    'UNKNOWN_DOMAIN',
    'SIGNAL_KEY_CONFLICT',
    'SIGNAL_LABEL_CONFLICT',
  ]);
  assert.equal(fake.state.signals.length, 1);
});

test('transaction rolls back fully on unexpected insert failure', async () => {
  const fake = createFakeDb(
    {
      assessments: [{ id: 'assessment-1', assessmentKey: 'signals' }],
      versions: [{ id: 'version-1', assessmentId: 'assessment-1', lifecycleStatus: 'DRAFT' }],
      domains: [
        { id: 'domain-1', assessmentVersionId: 'version-1', domainKey: 'leadership-style', label: 'Leadership Style', domainType: 'SIGNAL_GROUP', orderIndex: 0 },
      ],
      signals: [],
    },
    {
      failInsertForSignalKey: 'supportive',
    },
  );

  const result = await executeSignalBulkImportWithDependencies(
    {
      assessmentVersionId: 'version-1',
      rawInput: ['leadership-style|Directive', 'leadership-style|Supportive'].join('\n'),
    },
    {
      db: fake.client,
      connect: () => fake.client.connect(),
      revalidatePath() {},
    },
  );

  assert.equal(result.ok, false);
  assert.equal(result.didImport, false);
  assert.equal(result.executionError, 'Signal bulk import could not be saved. Try again.');
  assert.equal(fake.state.signals.length, 0);
});
