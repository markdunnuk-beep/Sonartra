import test from 'node:test';
import assert from 'node:assert/strict';

import {
  createDomainRecord,
  createSignalRecord,
  deleteDomainRecord,
  updateDomainRecord,
  updateSignalRecord,
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
}) {
  const state = {
    domains: [...(seed?.domains ?? [])],
    signals: [...(seed?.signals ?? [])],
  };

  return {
    db: {
      async query<T>(text: string, params?: readonly unknown[]) {
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
  assert.equal(fake.state.signals[1]?.signalKey, 'style_supportive');
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
    values: { label: 'Decisive', key: 'decisive', description: 'Updated signal' },
  });

  assert.equal(fake.state.domains[0]?.domainKey, 'leadership-style');
  assert.equal(fake.state.signals[0]?.signalKey, 'decisive');
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
