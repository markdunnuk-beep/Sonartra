import test from 'node:test';
import assert from 'node:assert/strict';

import { executeDomainBulkImportWithDependencies } from '@/lib/server/admin-domain-bulk-import';

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
  description: string | null;
  domainType: 'QUESTION_SECTION' | 'SIGNAL_GROUP';
  orderIndex: number;
};

function createFakeDb(
  seed?: {
    assessments?: StoredAssessment[];
    versions?: StoredVersion[];
    domains?: StoredDomain[];
  },
  config?: {
    failInsertForDomainKey?: string;
    onBegin?: (state: { versions: StoredVersion[]; domains: StoredDomain[] }) => void;
  },
) {
  const state = {
    assessments: [...(seed?.assessments ?? [])],
    versions: [...(seed?.versions ?? [])],
    domains: [...(seed?.domains ?? [])],
  };
  let transactionSnapshot: typeof state | null = null;
  let nextDomainId = state.domains.length + 1;

  function snapshot() {
    return {
      assessments: state.assessments.map((row) => ({ ...row })),
      versions: state.versions.map((row) => ({ ...row })),
      domains: state.domains.map((row) => ({ ...row })),
    };
  }

  const client = {
    async query<T>(text: string, params?: readonly unknown[]) {
      if (text === 'BEGIN') {
        transactionSnapshot = snapshot();
        config?.onBegin?.(state);
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

      if (text.includes('INSERT INTO domains') && text.includes("VALUES ($1, $2, $3, $4, 'SIGNAL_GROUP', $5)")) {
        const [assessmentVersionId, domainKey, label, description, orderIndex] = params as [
          string,
          string,
          string,
          string | null,
          number,
        ];

        if (config?.failInsertForDomainKey === domainKey) {
          throw new Error('DOMAIN_INSERT_FAILED');
        }

        const inserted = {
          id: `domain-${nextDomainId++}`,
          assessmentVersionId,
          domainKey,
          label,
          description,
          domainType: 'SIGNAL_GROUP' as const,
          orderIndex,
        };
        state.domains.push(inserted);
        return {
          rows: ([{
            id: inserted.id,
            domain_key: inserted.domainKey,
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

test('valid batch imports domains into a draft version with append ordering and revalidation', async () => {
  const fake = createFakeDb({
    assessments: [{ id: 'assessment-1', assessmentKey: 'signals' }],
    versions: [{ id: 'version-1', assessmentId: 'assessment-1', lifecycleStatus: 'DRAFT' }],
    domains: [
      {
        id: 'domain-existing',
        assessmentVersionId: 'version-1',
        domainKey: 'existing-domain',
        label: 'Existing Domain',
        description: null,
        domainType: 'SIGNAL_GROUP',
        orderIndex: 2,
      },
    ],
  });
  const revalidatedPaths: string[] = [];

  const result = await executeDomainBulkImportWithDependencies(
    {
      assessmentVersionId: 'version-1',
      rawInput: ['Leadership Style', 'Core Drivers|Groups the primary drivers.'].join('\n'),
    },
    {
      db: fake.client,
      connect: () => fake.client.connect(),
      revalidatePath: (path) => revalidatedPaths.push(path),
    },
  );

  assert.equal(result.ok, true);
  assert.equal(result.didImport, true);
  assert.equal(result.importedCount, 2);
  assert.deepEqual(
    fake.state.domains
      .filter((row) => row.assessmentVersionId === 'version-1' && row.domainType === 'SIGNAL_GROUP')
      .sort((left, right) => left.orderIndex - right.orderIndex)
      .map((row) => ({
        key: row.domainKey,
        label: row.label,
        description: row.description,
        orderIndex: row.orderIndex,
      })),
    [
      { key: 'existing-domain', label: 'Existing Domain', description: null, orderIndex: 2 },
      { key: 'leadership-style', label: 'Leadership Style', description: null, orderIndex: 3 },
      { key: 'core-drivers', label: 'Core Drivers', description: 'Groups the primary drivers.', orderIndex: 4 },
    ],
  );
  assert.deepEqual(revalidatedPaths, ['/admin/assessments/signals']);
});

test('non-draft version is blocked without writes', async () => {
  const fake = createFakeDb({
    assessments: [{ id: 'assessment-1', assessmentKey: 'signals' }],
    versions: [{ id: 'version-1', assessmentId: 'assessment-1', lifecycleStatus: 'PUBLISHED' }],
    domains: [],
  });

  const result = await executeDomainBulkImportWithDependencies(
    {
      assessmentVersionId: 'version-1',
      rawInput: 'Leadership Style',
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
  assert.equal(fake.state.domains.length, 0);
});

test('live conflict prevents import cleanly when current state changes before write', async () => {
  const fake = createFakeDb(
    {
      assessments: [{ id: 'assessment-1', assessmentKey: 'signals' }],
      versions: [{ id: 'version-1', assessmentId: 'assessment-1', lifecycleStatus: 'DRAFT' }],
      domains: [],
    },
    {
      onBegin: (state) => {
        state.domains.push({
          id: 'domain-live',
          assessmentVersionId: 'version-1',
          domainKey: 'leadership-style',
          label: 'Existing Now',
          description: null,
          domainType: 'SIGNAL_GROUP',
          orderIndex: 0,
        });
      },
    },
  );

  const result = await executeDomainBulkImportWithDependencies(
    {
      assessmentVersionId: 'version-1',
      rawInput: 'Leadership Style',
    },
    {
      db: fake.client,
      connect: () => fake.client.connect(),
      revalidatePath() {},
    },
  );

  assert.equal(result.ok, false);
  assert.equal(result.didImport, false);
  assert.equal(result.rejected[0]?.reasonCode, 'DOMAIN_KEY_CONFLICT');
  assert.equal(fake.state.domains.filter((row) => row.assessmentVersionId === 'version-1').length, 0);
});

test('transaction rolls back fully on unexpected insert failure', async () => {
  const fake = createFakeDb(
    {
      assessments: [{ id: 'assessment-1', assessmentKey: 'signals' }],
      versions: [{ id: 'version-1', assessmentId: 'assessment-1', lifecycleStatus: 'DRAFT' }],
      domains: [],
    },
    {
      failInsertForDomainKey: 'core-drivers',
    },
  );

  const result = await executeDomainBulkImportWithDependencies(
    {
      assessmentVersionId: 'version-1',
      rawInput: ['Leadership Style', 'Core Drivers'].join('\n'),
    },
    {
      db: fake.client,
      connect: () => fake.client.connect(),
      revalidatePath() {},
    },
  );

  assert.equal(result.ok, false);
  assert.equal(result.didImport, false);
  assert.equal(result.executionError, 'Domain bulk import could not be saved. Try again.');
  assert.equal(fake.state.domains.length, 0);
});
