import test from 'node:test';
import assert from 'node:assert/strict';

import {
  createDomainRecord,
  createSignalRecord,
  deleteDomainRecord,
  regenerateDomainKey,
  regenerateSignalKey,
  updateDomainRecord,
  updateDomainLabel,
  updateSignalRecord,
  updateSignalLabel,
} from '@/lib/server/admin-domain-signal-authoring';

type StoredDomain = {
  id: string;
  assessmentVersionId: string;
  domainKey: string;
  label: string;
  description: string | null;
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
};

function createFakeDb(seed?: {
  domains?: StoredDomain[];
  signals?: StoredSignal[];
}, config?: {
  failSignalUpdateId?: string;
}) {
  const state = {
    domains: [...(seed?.domains ?? [])],
    signals: [...(seed?.signals ?? [])],
  };
  let transactionSnapshot: { domains: StoredDomain[]; signals: StoredSignal[] } | null = null;

  return {
    db: {
      async query<T>(text: string, params?: readonly unknown[]) {
        if (text === 'BEGIN') {
          transactionSnapshot = {
            domains: state.domains.map((domain) => ({ ...domain })),
            signals: state.signals.map((signal) => ({ ...signal })),
          };
          return { rows: [] as T[] };
        }

        if (text === 'COMMIT') {
          transactionSnapshot = null;
          return { rows: [] as T[] };
        }

        if (text === 'ROLLBACK') {
          if (transactionSnapshot) {
            state.domains = transactionSnapshot.domains;
            state.signals = transactionSnapshot.signals;
          }
          transactionSnapshot = null;
          return { rows: [] as T[] };
        }

        if (text.includes('FROM domains') && text.includes('domain_key = $2')) {
          const [assessmentVersionId, domainKey, excludedDomainId] = params as [string, string, string | null];
          const rows = state.domains
            .filter(
              (domain) =>
                domain.assessmentVersionId === assessmentVersionId &&
                domain.domainKey === domainKey &&
                (excludedDomainId === null || domain.id !== excludedDomainId),
            )
            .map((domain) => ({ id: domain.id }));
          return { rows: rows as T[] };
        }

        if (text.includes('SELECT domain_key') && text.includes('FROM domains')) {
          const [domainId, assessmentVersionId] = params as [string, string];
          const match = state.domains.find(
            (domain) => domain.id === domainId && domain.assessmentVersionId === assessmentVersionId,
          );
          return {
            rows: match ? ([{ domain_key: match.domainKey }] as unknown as T[]) : ([] as T[]),
          };
        }

        if (text.includes('SELECT id, domain_key, label') && text.includes('FROM domains')) {
          const [domainId, assessmentVersionId] = params as [string, string];
          const match = state.domains.find(
            (domain) => domain.id === domainId && domain.assessmentVersionId === assessmentVersionId,
          );
          return {
            rows: match
              ? ([{ id: match.id, domain_key: match.domainKey, label: match.label }] as unknown as T[])
              : ([] as T[]),
          };
        }

        if (text.includes('MAX(order_index)') && text.includes('FROM domains')) {
          const [assessmentVersionId] = params as [string];
          const next =
            Math.max(
              -1,
              ...state.domains
                .filter((domain) => domain.assessmentVersionId === assessmentVersionId)
                .map((domain) => domain.orderIndex),
            ) + 1;
          return { rows: ([{ next_order_index: next }] as unknown) as T[] };
        }

        if (text.includes('INSERT INTO domains')) {
          state.domains.push({
            id: `domain-${state.domains.length + 1}`,
            assessmentVersionId: params?.[0] as string,
            domainKey: params?.[1] as string,
            label: params?.[2] as string,
            description: (params?.[3] as string | null) ?? null,
            orderIndex: params?.[4] as number,
          });
          return { rows: [] as T[] };
        }

        if (text.includes('UPDATE domains') && text.includes('RETURNING id, label, domain_key')) {
          const [domainId, assessmentVersionId, label] = params as [string, string, string];
          const match = state.domains.find(
            (domain) => domain.id === domainId && domain.assessmentVersionId === assessmentVersionId,
          );
          if (!match) {
            return { rows: [] as T[] };
          }
          match.label = label;
          return {
            rows: ([{ id: match.id, label: match.label, domain_key: match.domainKey }] as unknown) as T[],
          };
        }

        if (text.includes('SET') && text.includes('domain_key = $3') && text.includes("domain_type = 'SIGNAL_GROUP'")) {
          const [domainId, assessmentVersionId, domainKey] = params as [string, string, string];
          const match = state.domains.find(
            (domain) => domain.id === domainId && domain.assessmentVersionId === assessmentVersionId,
          );
          if (match) {
            match.domainKey = domainKey;
          }
          return { rows: [] as T[] };
        }

        if (text.includes('UPDATE domains')) {
          const [domainId, assessmentVersionId, domainKey, label, description] = params as [
            string,
            string,
            string,
            string,
            string | null,
          ];
          const match = state.domains.find(
            (domain) => domain.id === domainId && domain.assessmentVersionId === assessmentVersionId,
          );
          if (match) {
            match.domainKey = domainKey;
            match.label = label;
            match.description = description;
          }
          return { rows: [] as T[] };
        }

        if (text.includes('DELETE FROM signals') && text.includes('domain_id = $2')) {
          const [assessmentVersionId, domainId] = params as [string, string];
          state.signals = state.signals.filter(
            (signal) =>
              !(signal.assessmentVersionId === assessmentVersionId && signal.domainId === domainId),
          );
          return { rows: [] as T[] };
        }

        if (text.includes('DELETE FROM domains')) {
          const [domainId, assessmentVersionId] = params as [string, string];
          state.domains = state.domains.filter(
            (domain) => !(domain.id === domainId && domain.assessmentVersionId === assessmentVersionId),
          );
          return { rows: [] as T[] };
        }

        if (text.includes('FROM domains') && text.includes('WHERE id = $1')) {
          const [domainId, assessmentVersionId] = params as [string, string];
          const match = state.domains.find(
            (domain) => domain.id === domainId && domain.assessmentVersionId === assessmentVersionId,
          );
          return { rows: match ? ([{ id: match.id }] as unknown as T[]) : ([] as T[]) };
        }

        if (text.includes('FROM signals') && text.includes('signal_key = $2')) {
          const [assessmentVersionId, signalKey, excludedSignalId] = params as [string, string, string | null];
          const rows = state.signals
            .filter(
              (signal) =>
                signal.assessmentVersionId === assessmentVersionId &&
                signal.signalKey === signalKey &&
                (excludedSignalId === null || signal.id !== excludedSignalId),
            )
            .map((signal) => ({ id: signal.id }));
          return { rows: rows as T[] };
        }

        if (text.includes('SELECT id, label') && text.includes('FROM signals') && text.includes('ORDER BY order_index ASC')) {
          const [assessmentVersionId, domainId] = params as [string, string];
          const rows = state.signals
            .filter(
              (signal) =>
                signal.assessmentVersionId === assessmentVersionId &&
                signal.domainId === domainId,
            )
            .sort((left, right) => left.orderIndex - right.orderIndex || left.id.localeCompare(right.id))
            .map((signal) => ({
              id: signal.id,
              label: signal.label,
            }));
          return { rows: rows as unknown as T[] };
        }

        if (text.includes('MAX(order_index)') && text.includes('FROM signals')) {
          const [assessmentVersionId, domainId] = params as [string, string];
          const next =
            Math.max(
              -1,
              ...state.signals
                .filter(
                  (signal) =>
                    signal.assessmentVersionId === assessmentVersionId &&
                    signal.domainId === domainId,
                )
                .map((signal) => signal.orderIndex),
            ) + 1;
          return { rows: ([{ next_order_index: next }] as unknown) as T[] };
        }

        if (text.includes('FROM signals') && text.includes('WHERE id = $1')) {
          const [signalId, assessmentVersionId, domainId] = params as [string, string, string];
          const match = state.signals.find(
            (signal) =>
              signal.id === signalId &&
              signal.assessmentVersionId === assessmentVersionId &&
              signal.domainId === domainId,
          );
          return { rows: match ? ([{ id: match.id }] as unknown as T[]) : ([] as T[]) };
        }

        if (
          text.includes('SELECT') &&
          text.includes('s.signal_key') &&
          text.includes('d.domain_key') &&
          text.includes('FROM signals s')
        ) {
          const [signalId, assessmentVersionId] = params as [string, string];
          const match = state.signals.find(
            (signal) => signal.id === signalId && signal.assessmentVersionId === assessmentVersionId,
          );
          const domain = match
            ? state.domains.find(
                (candidate) =>
                  candidate.id === match.domainId &&
                  candidate.assessmentVersionId === assessmentVersionId,
              )
            : null;
          return {
            rows:
              match && domain
                ? ([{
                    id: match.id,
                    signal_key: match.signalKey,
                    label: match.label,
                    domain_id: domain.id,
                    domain_key: domain.domainKey,
                  }] as unknown as T[])
                : ([] as T[]),
          };
        }

        if (text.includes('INSERT INTO signals')) {
          state.signals.push({
            id: `signal-${state.signals.length + 1}`,
            assessmentVersionId: params?.[0] as string,
            domainId: params?.[1] as string,
            signalKey: params?.[2] as string,
            label: params?.[3] as string,
            description: (params?.[4] as string | null) ?? null,
            orderIndex: params?.[5] as number,
          });
          return { rows: [] as T[] };
        }

        if (text.includes('UPDATE signals') && text.includes('RETURNING id, label, signal_key')) {
          const [signalId, assessmentVersionId, domainId, label] = params as [
            string,
            string,
            string,
            string,
          ];
          const match = state.signals.find(
            (signal) =>
              signal.id === signalId &&
              signal.assessmentVersionId === assessmentVersionId &&
              signal.domainId === domainId,
          );
          if (!match) {
            return { rows: [] as T[] };
          }
          match.label = label;
          return {
            rows: ([{ id: match.id, label: match.label, signal_key: match.signalKey }] as unknown) as T[],
          };
        }

        if (text.includes('SET') && text.includes('signal_key = $4') && text.includes('domain_id = $3')) {
          const [signalId, assessmentVersionId, domainId, signalKey] = params as [
            string,
            string,
            string,
            string,
          ];
          const match = state.signals.find(
            (signal) =>
              signal.id === signalId &&
              signal.assessmentVersionId === assessmentVersionId &&
              signal.domainId === domainId,
          );
          if (config?.failSignalUpdateId && signalId === config.failSignalUpdateId) {
            throw new Error('SIGNAL_UPDATE_FAILED');
          }
          if (match) {
            match.signalKey = signalKey;
          }
          return { rows: [] as T[] };
        }

        if (text.includes('UPDATE signals')) {
          const [signalId, assessmentVersionId, domainId, signalKey, label, description] = params as [
            string,
            string,
            string,
            string,
            string,
            string | null,
          ];
          const match = state.signals.find(
            (signal) =>
              signal.id === signalId &&
              signal.assessmentVersionId === assessmentVersionId &&
              signal.domainId === domainId,
          );
          if (match) {
            match.signalKey = signalKey;
            match.label = label;
            match.description = description;
          }
          return { rows: [] as T[] };
        }

        return { rows: [] as T[] };
      },
    },
    state,
  };
}

test('creates domains and signals with deterministic appended order indexes', async () => {
  const fake = createFakeDb({
    domains: [
      {
        id: 'domain-1',
        assessmentVersionId: 'version-1',
        domainKey: 'style',
        label: 'Style',
        description: null,
        orderIndex: 0,
      },
    ],
    signals: [
      {
        id: 'signal-1',
        assessmentVersionId: 'version-1',
        domainId: 'domain-1',
        signalKey: 'directive',
        label: 'Directive',
        description: null,
        orderIndex: 0,
      },
    ],
  });

  await createDomainRecord({
    db: fake.db,
    assessmentVersionId: 'version-1',
    values: { label: 'Motivation', key: 'motivation', description: '' },
  });

  await createSignalRecord({
    db: fake.db,
    assessmentVersionId: 'version-1',
    domainId: 'domain-1',
    values: { label: 'Supportive', key: 'supportive', description: '' },
  });

  assert.equal(fake.state.domains[1]?.orderIndex, 1);
  assert.equal(fake.state.signals[1]?.orderIndex, 1);
  assert.equal(fake.state.domains[1]?.domainKey, 'motivation');
  assert.equal(fake.state.signals[1]?.signalKey, 'supportive');
});

test('createSignalRecord persists a manual signal key override for new signals', async () => {
  const fake = createFakeDb({
    domains: [
      {
        id: 'domain-1',
        assessmentVersionId: 'version-1',
        domainKey: 'style',
        label: 'Style',
        description: null,
        orderIndex: 0,
      },
    ],
  });

  await createSignalRecord({
    db: fake.db,
    assessmentVersionId: 'version-1',
    domainId: 'domain-1',
    values: { label: 'Directive', key: 'directive-v2', description: '' },
  });

  assert.equal(fake.state.signals[0]?.signalKey, 'directive-v2');
  assert.equal(fake.state.signals[0]?.label, 'Directive');
});

test('createDomainRecord persists a manual domain key override for new domains', async () => {
  const fake = createFakeDb({
    domains: [
      {
        id: 'domain-1',
        assessmentVersionId: 'version-1',
        domainKey: 'style',
        label: 'Style',
        description: null,
        orderIndex: 0,
      },
    ],
  });

  await createDomainRecord({
    db: fake.db,
    assessmentVersionId: 'version-1',
    values: { label: 'Core Drivers', key: 'core-drivers-v2', description: '' },
  });

  assert.equal(fake.state.domains[1]?.domainKey, 'core-drivers-v2');
  assert.equal(fake.state.domains[1]?.label, 'Core Drivers');
});

test('updates domain and signal metadata in place', async () => {
  const fake = createFakeDb({
    domains: [
      {
        id: 'domain-1',
        assessmentVersionId: 'version-1',
        domainKey: 'style',
        label: 'Style',
        description: null,
        orderIndex: 0,
      },
    ],
    signals: [
      {
        id: 'signal-1',
        assessmentVersionId: 'version-1',
        domainId: 'domain-1',
        signalKey: 'directive',
        label: 'Directive',
        description: null,
        orderIndex: 0,
      },
    ],
  });

  await updateDomainRecord({
    db: fake.db,
    assessmentVersionId: 'version-1',
    domainId: 'domain-1',
    values: { label: 'Leadership style', key: 'leadership-style', description: 'Updated domain' },
  });

  await updateSignalRecord({
    db: fake.db,
    assessmentVersionId: 'version-1',
    domainId: 'domain-1',
    signalId: 'signal-1',
    values: { label: 'Decisive', key: ' Decisive / Plus ', description: 'Updated signal' },
  });

  assert.equal(fake.state.domains[0]?.domainKey, 'leadership-style');
  assert.equal(fake.state.signals[0]?.signalKey, 'decisive-plus');
});

test('deleting a domain removes its nested signals from the same draft version', async () => {
  const fake = createFakeDb({
    domains: [
      {
        id: 'domain-1',
        assessmentVersionId: 'version-1',
        domainKey: 'style',
        label: 'Style',
        description: null,
        orderIndex: 0,
      },
    ],
    signals: [
      {
        id: 'signal-1',
        assessmentVersionId: 'version-1',
        domainId: 'domain-1',
        signalKey: 'directive',
        label: 'Directive',
        description: null,
        orderIndex: 0,
      },
    ],
  });

  await deleteDomainRecord({
    db: fake.db,
    assessmentVersionId: 'version-1',
    domainId: 'domain-1',
  });

  assert.equal(fake.state.domains.length, 0);
  assert.equal(fake.state.signals.length, 0);
});

test('updates domain label inline without changing the domain key', async () => {
  const fake = createFakeDb({
    domains: [
      {
        id: 'domain-1',
        assessmentVersionId: 'version-1',
        domainKey: 'style',
        label: 'Style',
        description: null,
        orderIndex: 0,
      },
    ],
  });

  const updated = await updateDomainLabel({
    db: fake.db,
    assessmentVersionId: 'version-1',
    domainId: 'domain-1',
    label: '  Leadership style  ',
  });

  assert.equal(updated.label, 'Leadership style');
  assert.equal(updated.domainKey, 'style');
  assert.equal(fake.state.domains[0]?.label, 'Leadership style');
  assert.equal(fake.state.domains[0]?.domainKey, 'style');
});

test('updates signal label inline without changing the signal key', async () => {
  const fake = createFakeDb({
    domains: [
      {
        id: 'domain-1',
        assessmentVersionId: 'version-1',
        domainKey: 'style',
        label: 'Style',
        description: null,
        orderIndex: 0,
      },
    ],
    signals: [
      {
        id: 'signal-1',
        assessmentVersionId: 'version-1',
        domainId: 'domain-1',
        signalKey: 'style_directive',
        label: 'Directive',
        description: null,
        orderIndex: 0,
      },
    ],
  });

  const updated = await updateSignalLabel({
    db: fake.db,
    assessmentVersionId: 'version-1',
    domainId: 'domain-1',
    signalId: 'signal-1',
    label: '  Decisive  ',
  });

  assert.equal(updated.label, 'Decisive');
  assert.equal(updated.signalKey, 'style_directive');
  assert.equal(fake.state.signals[0]?.label, 'Decisive');
  assert.equal(fake.state.signals[0]?.signalKey, 'style_directive');
});

test('inline domain and signal label updates reject empty values', async () => {
  const fake = createFakeDb({
    domains: [
      {
        id: 'domain-1',
        assessmentVersionId: 'version-1',
        domainKey: 'style',
        label: 'Style',
        description: null,
        orderIndex: 0,
      },
    ],
    signals: [
      {
        id: 'signal-1',
        assessmentVersionId: 'version-1',
        domainId: 'domain-1',
        signalKey: 'style_directive',
        label: 'Directive',
        description: null,
        orderIndex: 0,
      },
    ],
  });

  await assert.rejects(
    () =>
      updateDomainLabel({
        db: fake.db,
        assessmentVersionId: 'version-1',
        domainId: 'domain-1',
        label: '   ',
      }),
    /DOMAIN_LABEL_REQUIRED/,
  );

  await assert.rejects(
    () =>
      updateSignalLabel({
        db: fake.db,
        assessmentVersionId: 'version-1',
        domainId: 'domain-1',
        signalId: 'signal-1',
        label: '   ',
      }),
    /SIGNAL_LABEL_REQUIRED/,
  );
});

test('regenerates a domain key from the latest label and cascades to child signal keys', async () => {
  const fake = createFakeDb({
    domains: [
      {
        id: 'domain-1',
        assessmentVersionId: 'version-1',
        domainKey: 'style',
        label: 'Leadership Style',
        description: null,
        orderIndex: 0,
      },
      {
        id: 'domain-2',
        assessmentVersionId: 'version-2',
        domainKey: 'style',
        label: 'Other version',
        description: null,
        orderIndex: 0,
      },
    ],
    signals: [
      {
        id: 'signal-1',
        assessmentVersionId: 'version-1',
        domainId: 'domain-1',
        signalKey: 'style_directive',
        label: 'Directive',
        description: null,
        orderIndex: 0,
      },
      {
        id: 'signal-2',
        assessmentVersionId: 'version-1',
        domainId: 'domain-1',
        signalKey: 'style_supportive',
        label: 'Supportive',
        description: null,
        orderIndex: 1,
      },
      {
        id: 'signal-3',
        assessmentVersionId: 'version-2',
        domainId: 'domain-2',
        signalKey: 'style_directive',
        label: 'Directive',
        description: null,
        orderIndex: 0,
      },
    ],
  });

  const updated = await regenerateDomainKey({
    db: fake.db,
    assessmentVersionId: 'version-1',
    domainId: 'domain-1',
  });

  assert.equal(updated.domainKey, 'leadership_style');
  assert.equal(fake.state.domains[0]?.domainKey, 'leadership_style');
  assert.equal(fake.state.signals[0]?.signalKey, 'leadership_style_directive');
  assert.equal(fake.state.signals[1]?.signalKey, 'leadership_style_supportive');
  assert.equal(fake.state.signals[2]?.signalKey, 'style_directive');
});

test('regenerates a signal key from the latest signal label and current parent domain key', async () => {
  const fake = createFakeDb({
    domains: [
      {
        id: 'domain-1',
        assessmentVersionId: 'version-1',
        domainKey: 'leadership_style',
        label: 'Leadership Style',
        description: null,
        orderIndex: 0,
      },
    ],
    signals: [
      {
        id: 'signal-1',
        assessmentVersionId: 'version-1',
        domainId: 'domain-1',
        signalKey: 'style_directive',
        label: 'Clear Direction',
        description: null,
        orderIndex: 0,
      },
    ],
  });

  const updated = await regenerateSignalKey({
    db: fake.db,
    assessmentVersionId: 'version-1',
    signalId: 'signal-1',
  });

  assert.equal(updated.signalKey, 'leadership_style_clear_direction');
  assert.equal(fake.state.signals[0]?.signalKey, 'leadership_style_clear_direction');
});

test('regenerate key rejects uniqueness conflicts safely', async () => {
  const fake = createFakeDb({
    domains: [
      {
        id: 'domain-1',
        assessmentVersionId: 'version-1',
        domainKey: 'style',
        label: 'Leadership Style',
        description: null,
        orderIndex: 0,
      },
      {
        id: 'domain-2',
        assessmentVersionId: 'version-1',
        domainKey: 'leadership_style',
        label: 'Leadership Style Existing',
        description: null,
        orderIndex: 1,
      },
    ],
    signals: [
      {
        id: 'signal-1',
        assessmentVersionId: 'version-1',
        domainId: 'domain-1',
        signalKey: 'style_directive',
        label: 'Directive',
        description: null,
        orderIndex: 0,
      },
      {
        id: 'signal-2',
        assessmentVersionId: 'version-1',
        domainId: 'domain-1',
        signalKey: 'style_supportive',
        label: 'Supportive',
        description: null,
        orderIndex: 1,
      },
      {
        id: 'signal-3',
        assessmentVersionId: 'version-1',
        domainId: 'domain-2',
        signalKey: 'leadership_style_supportive',
        label: 'Supportive',
        description: null,
        orderIndex: 0,
      },
    ],
  });

  await assert.rejects(
    () =>
      regenerateDomainKey({
        db: fake.db,
        assessmentVersionId: 'version-1',
        domainId: 'domain-1',
      }),
    /DOMAIN_KEY_EXISTS/,
  );

  fake.state.domains[1]!.domainKey = 'another_domain';

  await assert.rejects(
    () =>
      regenerateDomainKey({
        db: fake.db,
        assessmentVersionId: 'version-1',
        domainId: 'domain-1',
      }),
    /SIGNAL_KEY_EXISTS/,
  );

  fake.state.domains[0]!.domainKey = 'leadership_style';

  await assert.rejects(
    () =>
      regenerateSignalKey({
        db: fake.db,
        assessmentVersionId: 'version-1',
        signalId: 'signal-2',
      }),
    /SIGNAL_KEY_EXISTS/,
  );
});

test('domain key regeneration rolls back when cascading signal updates fail', async () => {
  const fake = createFakeDb(
    {
      domains: [
        {
          id: 'domain-1',
          assessmentVersionId: 'version-1',
          domainKey: 'style',
          label: 'Leadership Style',
          description: null,
          orderIndex: 0,
        },
      ],
      signals: [
        {
          id: 'signal-1',
          assessmentVersionId: 'version-1',
          domainId: 'domain-1',
          signalKey: 'style_directive',
          label: 'Directive',
          description: null,
          orderIndex: 0,
        },
        {
          id: 'signal-2',
          assessmentVersionId: 'version-1',
          domainId: 'domain-1',
          signalKey: 'style_supportive',
          label: 'Supportive',
          description: null,
          orderIndex: 1,
        },
      ],
    },
    {
      failSignalUpdateId: 'signal-2',
    },
  );

  await fake.db.query('BEGIN');
  await assert.rejects(
    () =>
      regenerateDomainKey({
        db: fake.db,
        assessmentVersionId: 'version-1',
        domainId: 'domain-1',
      }),
    /SIGNAL_UPDATE_FAILED/,
  );
  await fake.db.query('ROLLBACK');

  assert.equal(fake.state.domains[0]?.domainKey, 'style');
  assert.equal(fake.state.signals[0]?.signalKey, 'style_directive');
  assert.equal(fake.state.signals[1]?.signalKey, 'style_supportive');
});
