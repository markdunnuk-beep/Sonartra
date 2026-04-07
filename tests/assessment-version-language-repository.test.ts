import test from 'node:test';
import assert from 'node:assert/strict';

import {
  getAssessmentVersionLanguageBundle,
  getAssessmentVersionLanguageDomains,
  getAssessmentVersionLanguageHeroHeaders,
  getAssessmentVersionLanguageOverview,
  getAssessmentVersionLanguagePairs,
  getAssessmentVersionLanguageSignals,
  replaceAssessmentVersionLanguageDomains,
  replaceAssessmentVersionLanguageHeroHeaders,
  replaceAssessmentVersionLanguageOverview,
  replaceAssessmentVersionLanguagePairs,
  replaceAssessmentVersionLanguageSignals,
} from '@/lib/server/assessment-version-language';

type StoredSignalRow = {
  id: string;
  assessmentVersionId: string;
  signalKey: string;
  section: 'chapterSummary' | 'summary' | 'strength' | 'watchout' | 'development';
  content: string;
  createdAt: string;
  updatedAt: string;
};

type StoredPairRow = {
  id: string;
  assessmentVersionId: string;
  signalPair: string;
  section: 'summary' | 'strength' | 'watchout';
  content: string;
  createdAt: string;
  updatedAt: string;
};

type StoredDomainRow = {
  id: string;
  assessmentVersionId: string;
  domainKey: string;
  section: 'chapterOpening' | 'summary' | 'focus' | 'pressure' | 'environment';
  content: string;
  createdAt: string;
  updatedAt: string;
};

type StoredOverviewRow = {
  id: string;
  assessmentVersionId: string;
  patternKey: string;
  section: 'summary' | 'strengths' | 'watchouts' | 'development' | 'headline';
  content: string;
  createdAt: string;
  updatedAt: string;
};

type StoredHeroHeaderRow = {
  id: string;
  assessmentVersionId: string;
  pairKey: string;
  headline: string;
  createdAt: string;
  updatedAt: string;
};

function createFakeLanguageDb(seed?: {
  signals?: StoredSignalRow[];
  pairs?: StoredPairRow[];
  domains?: StoredDomainRow[];
  overview?: StoredOverviewRow[];
  heroHeaders?: StoredHeroHeaderRow[];
}, config?: {
  failInsertTable?: 'signals' | 'pairs' | 'domains' | 'overview';
}) {
  const state = {
    signals: [...(seed?.signals ?? [])],
    pairs: [...(seed?.pairs ?? [])],
    domains: [...(seed?.domains ?? [])],
    overview: [...(seed?.overview ?? [])],
    heroHeaders: [...(seed?.heroHeaders ?? [])],
  };

  let idCounter = 0;
  let timestampCounter = 0;
  let snapshot: typeof state | null = null;

  const nextId = (prefix: string) => `${prefix}-${++idCounter}`;
  const nextTimestamp = () => `2026-04-01T00:00:${String(++timestampCounter).padStart(2, '0')}.000Z`;
  const cloneState = () => ({
    signals: state.signals.map((row) => ({ ...row })),
    pairs: state.pairs.map((row) => ({ ...row })),
    domains: state.domains.map((row) => ({ ...row })),
    overview: state.overview.map((row) => ({ ...row })),
    heroHeaders: state.heroHeaders.map((row) => ({ ...row })),
  });

  const sortSignals = (rows: StoredSignalRow[]) =>
    [...rows].sort(
      (left, right) =>
        left.signalKey.localeCompare(right.signalKey)
        || ['chapterSummary', 'summary', 'strength', 'watchout', 'development'].indexOf(left.section)
          - ['chapterSummary', 'summary', 'strength', 'watchout', 'development'].indexOf(right.section)
        || left.id.localeCompare(right.id),
    );
  const sortPairs = (rows: StoredPairRow[]) =>
    [...rows].sort(
      (left, right) =>
        left.signalPair.localeCompare(right.signalPair)
        || ['summary', 'strength', 'watchout'].indexOf(left.section)
          - ['summary', 'strength', 'watchout'].indexOf(right.section)
        || left.id.localeCompare(right.id),
    );
  const sortDomains = (rows: StoredDomainRow[]) =>
    [...rows].sort(
      (left, right) =>
        left.domainKey.localeCompare(right.domainKey)
        || ['chapterOpening', 'summary', 'focus', 'pressure', 'environment'].indexOf(left.section)
          - ['chapterOpening', 'summary', 'focus', 'pressure', 'environment'].indexOf(right.section)
        || left.id.localeCompare(right.id),
    );
  const sortOverview = (rows: StoredOverviewRow[]) =>
    [...rows].sort(
      (left, right) =>
        left.patternKey.localeCompare(right.patternKey)
        || ['headline', 'summary', 'strengths', 'watchouts', 'development'].indexOf(left.section)
          - ['headline', 'summary', 'strengths', 'watchouts', 'development'].indexOf(right.section)
        || left.id.localeCompare(right.id),
    );

  const client = {
    async query<T>(text: string, params?: readonly unknown[]) {
      const sql = text.replace(/\s+/g, ' ').trim();

      if (sql === 'BEGIN') {
        snapshot = cloneState();
        return { rows: [] as T[] };
      }

      if (sql === 'COMMIT') {
        snapshot = null;
        return { rows: [] as T[] };
      }

      if (sql === 'ROLLBACK') {
        if (snapshot) {
          state.signals = snapshot.signals;
          state.pairs = snapshot.pairs;
          state.domains = snapshot.domains;
          state.overview = snapshot.overview;
          state.heroHeaders = snapshot.heroHeaders;
        }
        snapshot = null;
        return { rows: [] as T[] };
      }

      if (sql.startsWith('DELETE FROM assessment_version_language_signals')) {
        const assessmentVersionId = params?.[0] as string;
        state.signals = state.signals.filter((row) => row.assessmentVersionId !== assessmentVersionId);
        return { rows: [] as T[] };
      }

      if (sql.startsWith('DELETE FROM assessment_version_language_pairs')) {
        const assessmentVersionId = params?.[0] as string;
        state.pairs = state.pairs.filter((row) => row.assessmentVersionId !== assessmentVersionId);
        return { rows: [] as T[] };
      }

      if (sql.startsWith('DELETE FROM assessment_version_language_domains')) {
        const assessmentVersionId = params?.[0] as string;
        state.domains = state.domains.filter((row) => row.assessmentVersionId !== assessmentVersionId);
        return { rows: [] as T[] };
      }

      if (sql.startsWith('DELETE FROM assessment_version_language_overview')) {
        const assessmentVersionId = params?.[0] as string;
        state.overview = state.overview.filter((row) => row.assessmentVersionId !== assessmentVersionId);
        return { rows: [] as T[] };
      }

      if (sql.startsWith('DELETE FROM assessment_version_language_hero_headers')) {
        const assessmentVersionId = params?.[0] as string;
        state.heroHeaders = state.heroHeaders.filter((row) => row.assessmentVersionId !== assessmentVersionId);
        return { rows: [] as T[] };
      }

      if (sql.includes('FROM assessment_version_language_signals')) {
        const assessmentVersionId = params?.[0] as string;
        return {
          rows: sortSignals(state.signals)
            .filter((row) => row.assessmentVersionId === assessmentVersionId)
            .map((row) => ({
              id: row.id,
              assessment_version_id: row.assessmentVersionId,
              signal_key: row.signalKey,
              section: row.section,
              content: row.content,
              created_at: row.createdAt,
              updated_at: row.updatedAt,
            })) as T[],
        };
      }

      if (sql.includes('FROM assessment_version_language_pairs')) {
        const assessmentVersionId = params?.[0] as string;
        return {
          rows: sortPairs(state.pairs)
            .filter((row) => row.assessmentVersionId === assessmentVersionId)
            .map((row) => ({
              id: row.id,
              assessment_version_id: row.assessmentVersionId,
              signal_pair: row.signalPair,
              section: row.section,
              content: row.content,
              created_at: row.createdAt,
              updated_at: row.updatedAt,
            })) as T[],
        };
      }

      if (sql.includes('FROM assessment_version_language_domains')) {
        const assessmentVersionId = params?.[0] as string;
        return {
          rows: sortDomains(state.domains)
            .filter((row) => row.assessmentVersionId === assessmentVersionId)
            .map((row) => ({
              id: row.id,
              assessment_version_id: row.assessmentVersionId,
              domain_key: row.domainKey,
              section: row.section,
              content: row.content,
              created_at: row.createdAt,
              updated_at: row.updatedAt,
            })) as T[],
        };
      }

      if (sql.includes('FROM assessment_version_language_overview')) {
        const assessmentVersionId = params?.[0] as string;
        return {
          rows: sortOverview(state.overview)
            .filter((row) => row.assessmentVersionId === assessmentVersionId)
            .map((row) => ({
              id: row.id,
              assessment_version_id: row.assessmentVersionId,
              pattern_key: row.patternKey,
              section: row.section,
              content: row.content,
              created_at: row.createdAt,
              updated_at: row.updatedAt,
            })) as T[],
        };
      }

      if (sql.includes('SELECT') && sql.includes('FROM assessment_version_language_hero_headers')) {
        const assessmentVersionId = params?.[0] as string;
        return {
          rows: [...state.heroHeaders]
            .sort((left, right) => left.pairKey.localeCompare(right.pairKey) || left.id.localeCompare(right.id))
            .filter((row) => row.assessmentVersionId === assessmentVersionId)
            .map((row) => ({
              id: row.id,
              assessment_version_id: row.assessmentVersionId,
              pair_key: row.pairKey,
              headline: row.headline,
              created_at: row.createdAt,
              updated_at: row.updatedAt,
            })) as T[],
        };
      }

      if (sql.startsWith('INSERT INTO assessment_version_language_signals')) {
        if (config?.failInsertTable === 'signals') {
          throw new Error('SIGNAL_INSERT_FAILED');
        }

        const [assessmentVersionId, signalKey, section, content] = params as [
          string,
          string,
          StoredSignalRow['section'],
          string,
        ];
        const timestamp = nextTimestamp();
        state.signals.push({
          id: nextId('signal-language'),
          assessmentVersionId,
          signalKey,
          section,
          content,
          createdAt: timestamp,
          updatedAt: timestamp,
        });
        return { rows: [] as T[] };
      }

      if (sql.startsWith('INSERT INTO assessment_version_language_pairs')) {
        if (config?.failInsertTable === 'pairs') {
          throw new Error('PAIR_INSERT_FAILED');
        }

        const [assessmentVersionId, signalPair, section, content] = params as [
          string,
          string,
          StoredPairRow['section'],
          string,
        ];
        const timestamp = nextTimestamp();
        state.pairs.push({
          id: nextId('pair-language'),
          assessmentVersionId,
          signalPair,
          section,
          content,
          createdAt: timestamp,
          updatedAt: timestamp,
        });
        return { rows: [] as T[] };
      }

      if (sql.startsWith('INSERT INTO assessment_version_language_domains')) {
        if (config?.failInsertTable === 'domains') {
          throw new Error('DOMAIN_INSERT_FAILED');
        }

        const [assessmentVersionId, domainKey, section, content] = params as [
          string,
          string,
          StoredDomainRow['section'],
          string,
        ];
        const timestamp = nextTimestamp();
        state.domains.push({
          id: nextId('domain-language'),
          assessmentVersionId,
          domainKey,
          section,
          content,
          createdAt: timestamp,
          updatedAt: timestamp,
        });
        return { rows: [] as T[] };
      }

      if (sql.startsWith('INSERT INTO assessment_version_language_overview')) {
        if (config?.failInsertTable === 'overview') {
          throw new Error('OVERVIEW_INSERT_FAILED');
        }

        const [assessmentVersionId, patternKey, section, content] = params as [
          string,
          string,
          StoredOverviewRow['section'],
          string,
        ];
        const timestamp = nextTimestamp();
        state.overview.push({
          id: nextId('overview-language'),
          assessmentVersionId,
          patternKey,
          section,
          content,
          createdAt: timestamp,
          updatedAt: timestamp,
        });
        return { rows: [] as T[] };
      }

      if (sql.startsWith('INSERT INTO assessment_version_language_hero_headers')) {
        const [assessmentVersionId, pairKey, headline] = params as [string, string, string];
        const timestamp = nextTimestamp();
        state.heroHeaders.push({
          id: nextId('hero-header-language'),
          assessmentVersionId,
          pairKey,
          headline,
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

  return {
    db: client,
    state,
  };
}

test('reading empty language datasets returns empty collections cleanly', async () => {
  const fake = createFakeLanguageDb();

  const [signals, pairs, domains, overview, heroHeaders, bundle] = await Promise.all([
    getAssessmentVersionLanguageSignals(fake.db, 'version-1'),
    getAssessmentVersionLanguagePairs(fake.db, 'version-1'),
    getAssessmentVersionLanguageDomains(fake.db, 'version-1'),
    getAssessmentVersionLanguageOverview(fake.db, 'version-1'),
    getAssessmentVersionLanguageHeroHeaders(fake.db, 'version-1'),
    getAssessmentVersionLanguageBundle(fake.db, 'version-1'),
  ]);

  assert.deepEqual(signals, []);
  assert.deepEqual(pairs, []);
  assert.deepEqual(domains, []);
  assert.deepEqual(overview, []);
  assert.deepEqual(heroHeaders, []);
  assert.deepEqual(bundle, {
    signals: {},
    pairs: {},
    domains: {},
    overview: {},
    heroHeaders: {},
  });
});

test('writing and then reading signal language round-trips correctly', async () => {
  const fake = createFakeLanguageDb();

  await replaceAssessmentVersionLanguageSignals(fake.db, {
    assessmentVersionId: 'version-1',
    inputs: [
      { signalKey: ' signal_b ', section: 'watchout', content: ' watch out ' },
      { signalKey: 'signal_a', section: 'chapterSummary', content: 'summary a' },
      { signalKey: 'signal_b', section: 'chapterSummary', content: 'summary b' },
    ],
  });

  const rows = await getAssessmentVersionLanguageSignals(fake.db, 'version-1');

  assert.deepEqual(
    rows.map((row) => ({
      signalKey: row.signalKey,
      section: row.section,
      content: row.content,
    })),
    [
      { signalKey: 'signal_a', section: 'chapterSummary', content: 'summary a' },
      { signalKey: 'signal_b', section: 'chapterSummary', content: 'summary b' },
      { signalKey: 'signal_b', section: 'watchout', content: 'watch out' },
    ],
  );
});

test('writing and then reading pair language round-trips correctly', async () => {
  const fake = createFakeLanguageDb();

  await replaceAssessmentVersionLanguagePairs(fake.db, {
    assessmentVersionId: 'version-1',
    inputs: [
      { signalPair: 'driver_operator', section: 'strength', content: 'stable execution' },
      { signalPair: 'driver_operator', section: 'summary', content: 'pair summary' },
    ],
  });

  const rows = await getAssessmentVersionLanguagePairs(fake.db, 'version-1');

  assert.deepEqual(
    rows.map((row) => ({
      signalPair: row.signalPair,
      section: row.section,
      content: row.content,
    })),
    [
      { signalPair: 'driver_operator', section: 'summary', content: 'pair summary' },
      { signalPair: 'driver_operator', section: 'strength', content: 'stable execution' },
    ],
  );
});

test('writing and then reading domain language round-trips correctly', async () => {
  const fake = createFakeLanguageDb();

  await replaceAssessmentVersionLanguageDomains(fake.db, {
    assessmentVersionId: 'version-1',
    inputs: [
      { domainKey: 'signal_conflict', section: 'chapterOpening', content: 'conflict summary' },
    ],
  });

  const rows = await getAssessmentVersionLanguageDomains(fake.db, 'version-1');

  assert.deepEqual(
    rows.map((row) => ({
      domainKey: row.domainKey,
      section: row.section,
      content: row.content,
    })),
    [
      { domainKey: 'signal_conflict', section: 'chapterOpening', content: 'conflict summary' },
    ],
  );
});

test('writing and then reading overview language round-trips correctly', async () => {
  const fake = createFakeLanguageDb();

  await replaceAssessmentVersionLanguageOverview(fake.db, {
    assessmentVersionId: 'version-1',
    inputs: [
      { patternKey: 'pattern_core', section: 'development', content: 'improve follow-through' },
      { patternKey: 'pattern_core', section: 'headline', content: 'Core pattern' },
    ],
  });

  const rows = await getAssessmentVersionLanguageOverview(fake.db, 'version-1');

  assert.deepEqual(
    rows.map((row) => ({
      patternKey: row.patternKey,
      section: row.section,
      content: row.content,
    })),
    [
      { patternKey: 'pattern_core', section: 'headline', content: 'Core pattern' },
      { patternKey: 'pattern_core', section: 'development', content: 'improve follow-through' },
    ],
  );
});

test('writing and then reading hero header language round-trips correctly', async () => {
  const fake = createFakeLanguageDb();

  await replaceAssessmentVersionLanguageHeroHeaders(fake.db, {
    assessmentVersionId: 'version-1',
    inputs: [
      { pairKey: ' driver_operator ', headline: ' Fast, steady, and dependable ' },
    ],
  });

  const rows = await getAssessmentVersionLanguageHeroHeaders(fake.db, 'version-1');

  assert.deepEqual(
    rows.map((row) => ({
      pairKey: row.pairKey,
      headline: row.headline,
    })),
    [
      { pairKey: 'driver_operator', headline: 'Fast, steady, and dependable' },
    ],
  );
});

test('bundle loader groups content correctly by key and section', async () => {
  const fake = createFakeLanguageDb({
    signals: [
      {
        id: 's1',
        assessmentVersionId: 'version-1',
        signalKey: 'signal_style',
        section: 'chapterSummary',
        content: 'style summary',
        createdAt: '2026-04-01T00:00:01.000Z',
        updatedAt: '2026-04-01T00:00:01.000Z',
      },
      {
        id: 's2',
        assessmentVersionId: 'version-1',
        signalKey: 'signal_style',
        section: 'strength',
        content: 'style strength',
        createdAt: '2026-04-01T00:00:02.000Z',
        updatedAt: '2026-04-01T00:00:02.000Z',
      },
    ],
    pairs: [
      {
        id: 'p1',
        assessmentVersionId: 'version-1',
        signalPair: 'driver_analyst',
        section: 'summary',
        content: 'pair summary',
        createdAt: '2026-04-01T00:00:03.000Z',
        updatedAt: '2026-04-01T00:00:03.000Z',
      },
    ],
    domains: [
      {
        id: 'd1',
        assessmentVersionId: 'version-1',
        domainKey: 'signal_style',
        section: 'chapterOpening',
        content: 'best fit',
        createdAt: '2026-04-01T00:00:04.000Z',
        updatedAt: '2026-04-01T00:00:04.000Z',
      },
    ],
    overview: [
      {
        id: 'o1',
        assessmentVersionId: 'version-1',
        patternKey: 'pattern_primary',
        section: 'headline',
        content: 'headline',
        createdAt: '2026-04-01T00:00:05.000Z',
        updatedAt: '2026-04-01T00:00:05.000Z',
      },
    ],
    heroHeaders: [
      {
        id: 'h1',
        assessmentVersionId: 'version-1',
        pairKey: 'driver_analyst',
        headline: 'Fast, structured, decisive.',
        createdAt: '2026-04-01T00:00:06.000Z',
        updatedAt: '2026-04-01T00:00:06.000Z',
      },
    ],
  });

  const bundle = await getAssessmentVersionLanguageBundle(fake.db, 'version-1');

  assert.deepEqual(bundle, {
    signals: {
      signal_style: {
        chapterSummary: 'style summary',
        strength: 'style strength',
      },
    },
    pairs: {
      driver_analyst: {
        summary: 'pair summary',
      },
    },
    domains: {
      signal_style: {
        chapterOpening: 'best fit',
      },
    },
    overview: {
      pattern_primary: {
        headline: 'headline',
      },
    },
    heroHeaders: {
      driver_analyst: {
        headline: 'Fast, structured, decisive.',
      },
    },
  });
});

test('replace operations only affect their own table and dataset type', async () => {
  const fake = createFakeLanguageDb({
    signals: [
      {
        id: 's1',
        assessmentVersionId: 'version-1',
        signalKey: 'signal_a',
        section: 'chapterSummary',
        content: 'signal old',
        createdAt: '2026-04-01T00:00:01.000Z',
        updatedAt: '2026-04-01T00:00:01.000Z',
      },
    ],
    pairs: [
      {
        id: 'p1',
        assessmentVersionId: 'version-1',
        signalPair: 'pair_a',
        section: 'summary',
        content: 'pair old',
        createdAt: '2026-04-01T00:00:02.000Z',
        updatedAt: '2026-04-01T00:00:02.000Z',
      },
    ],
    domains: [
      {
        id: 'd1',
        assessmentVersionId: 'version-1',
        domainKey: 'domain_a',
        section: 'chapterOpening',
        content: 'domain old',
        createdAt: '2026-04-01T00:00:03.000Z',
        updatedAt: '2026-04-01T00:00:03.000Z',
      },
    ],
    overview: [
      {
        id: 'o1',
        assessmentVersionId: 'version-1',
        patternKey: 'overview_a',
        section: 'headline',
        content: 'overview old',
        createdAt: '2026-04-01T00:00:04.000Z',
        updatedAt: '2026-04-01T00:00:04.000Z',
      },
    ],
  });

  await replaceAssessmentVersionLanguageSignals(fake.db, {
    assessmentVersionId: 'version-1',
    inputs: [{ signalKey: 'signal_b', section: 'chapterSummary', content: 'signal new' }],
  });

  assert.deepEqual(fake.state.signals.map((row) => row.signalKey), ['signal_b']);
  assert.deepEqual(fake.state.pairs.map((row) => row.signalPair), ['pair_a']);
  assert.deepEqual(fake.state.domains.map((row) => row.domainKey), ['domain_a']);
  assert.deepEqual(fake.state.overview.map((row) => row.patternKey), ['overview_a']);
});

test('legacy domain summary rows read back as chapterOpening for bundle consumers', async () => {
  const fake = createFakeLanguageDb({
    domains: [
      {
        id: 'd1',
        assessmentVersionId: 'version-1',
        domainKey: 'signal_style',
        section: 'summary',
        content: 'legacy domain summary',
        createdAt: '2026-04-01T00:00:04.000Z',
        updatedAt: '2026-04-01T00:00:04.000Z',
      },
    ],
  });

  const bundle = await getAssessmentVersionLanguageBundle(fake.db, 'version-1');

  assert.deepEqual(bundle.domains, {
    signal_style: {
      chapterOpening: 'legacy domain summary',
    },
  });
});

test('stored chapterOpening rows take precedence over legacy domain summary rows', async () => {
  const fake = createFakeLanguageDb({
    domains: [
      {
        id: 'd1',
        assessmentVersionId: 'version-1',
        domainKey: 'signal_style',
        section: 'summary',
        content: 'legacy domain summary',
        createdAt: '2026-04-01T00:00:04.000Z',
        updatedAt: '2026-04-01T00:00:04.000Z',
      },
      {
        id: 'd2',
        assessmentVersionId: 'version-1',
        domainKey: 'signal_style',
        section: 'chapterOpening',
        content: 'canonical chapter opening',
        createdAt: '2026-04-01T00:00:05.000Z',
        updatedAt: '2026-04-01T00:00:05.000Z',
      },
    ],
  });

  const bundle = await getAssessmentVersionLanguageBundle(fake.db, 'version-1');

  assert.deepEqual(bundle.domains, {
    signal_style: {
      chapterOpening: 'canonical chapter opening',
    },
  });
});

test('stable ordering and grouping are preserved', async () => {
  const fake = createFakeLanguageDb();

  await replaceAssessmentVersionLanguageOverview(fake.db, {
    assessmentVersionId: 'version-1',
    inputs: [
      { patternKey: 'pattern_b', section: 'development', content: 'dev b' },
      { patternKey: 'pattern_a', section: 'watchouts', content: 'watchout a' },
      { patternKey: 'pattern_a', section: 'headline', content: 'headline a' },
      { patternKey: 'pattern_b', section: 'summary', content: 'summary b' },
    ],
  });

  const rows = await getAssessmentVersionLanguageOverview(fake.db, 'version-1');
  const bundle = await getAssessmentVersionLanguageBundle(fake.db, 'version-1');

  assert.deepEqual(
    rows.map((row) => `${row.patternKey}:${row.section}`),
    [
      'pattern_a:headline',
      'pattern_a:watchouts',
      'pattern_b:summary',
      'pattern_b:development',
    ],
  );
  assert.deepEqual(Object.keys(bundle.overview), ['pattern_a', 'pattern_b']);
});

test('replace operations roll back on failure with no partial dataset replacement', async () => {
  const fake = createFakeLanguageDb(
    {
      pairs: [
        {
          id: 'p1',
          assessmentVersionId: 'version-1',
          signalPair: 'driver_operator',
          section: 'summary',
          content: 'existing pair summary',
          createdAt: '2026-04-01T00:00:01.000Z',
          updatedAt: '2026-04-01T00:00:01.000Z',
        },
      ],
    },
    { failInsertTable: 'pairs' },
  );

  await assert.rejects(
    () =>
      replaceAssessmentVersionLanguagePairs(fake.db, {
        assessmentVersionId: 'version-1',
        inputs: [{ signalPair: 'driver_operator', section: 'strength', content: 'new strength' }],
      }),
    /PAIR_INSERT_FAILED/,
  );

  assert.deepEqual(
    fake.state.pairs.map((row) => ({
      signalPair: row.signalPair,
      section: row.section,
      content: row.content,
    })),
    [
      {
        signalPair: 'driver_operator',
        section: 'summary',
        content: 'existing pair summary',
      },
    ],
  );
});
