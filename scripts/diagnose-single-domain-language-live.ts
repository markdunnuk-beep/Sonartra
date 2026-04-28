import { Pool } from 'pg';

const ASSESSMENT_KEY = process.argv[2] ?? 'sonartra-blueprint-leadership';
const DRIVER_ROLES = [
  'primary_driver',
  'secondary_driver',
  'supporting_context',
  'range_limitation',
] as const;

type VersionRow = {
  assessment_version_id: string;
  version_tag: string;
  lifecycle_status: string;
};

type DomainRow = { domain_key: string };

type SignalRow = {
  signal_key: string;
  order_index: number;
  signal_id: string;
};

type DatasetReport = {
  expectedCount: number;
  actualCount: number;
  isReady: boolean;
  presentKeys: string[];
  missingKeys: string[];
  invalidKeys: string[];
  duplicateKeys: Array<{ key: string; count: number }>;
};

type KeyAnalysis = {
  presentKeys: string[];
  missingKeys: string[];
  invalidKeys: string[];
  duplicateKeys: Array<{ key: string; count: number }>;
};

function buildPairKeys(signalKeys: readonly string[]): string[] {
  const pairs: string[] = [];
  for (let i = 0; i < signalKeys.length; i += 1) {
    for (let j = i + 1; j < signalKeys.length; j += 1) {
      pairs.push(`${signalKeys[i]}_${signalKeys[j]}`);
    }
  }
  return pairs;
}

function uniqueSorted(values: readonly string[]): string[] {
  return [...new Set(values)].sort((a, b) => a.localeCompare(b));
}

function analyzeKeys(params: {
  actualKeys: readonly string[];
  expectedKeys: readonly string[];
  validateKey: (key: string) => boolean;
}): KeyAnalysis {
  const counts = new Map<string, number>();
  params.actualKeys.forEach((key) => {
    counts.set(key, (counts.get(key) ?? 0) + 1);
  });

  const presentKeys = uniqueSorted(params.actualKeys);
  const invalidKeys = presentKeys.filter((key) => !params.validateKey(key));
  const missingKeys = uniqueSorted(params.expectedKeys).filter((key) => !counts.has(key));
  const duplicateKeys = [...counts.entries()]
    .filter(([, count]) => count > 1)
    .map(([key, count]) => ({ key, count }))
    .sort((a, b) => a.key.localeCompare(b.key));

  return {
    presentKeys,
    missingKeys,
    invalidKeys,
    duplicateKeys,
  };
}

function evaluateReadiness(params: {
  expectedCount: number;
  actualCount: number;
  atLeast?: boolean;
  keyAnalysis: KeyAnalysis;
}): boolean {
  const countOk = params.atLeast
    ? params.actualCount >= params.expectedCount
    : params.actualCount === params.expectedCount;

  return countOk
    && params.keyAnalysis.missingKeys.length === 0
    && params.keyAnalysis.invalidKeys.length === 0
    && params.keyAnalysis.duplicateKeys.length === 0;
}

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error('DATABASE_URL is not set. Export DATABASE_URL and rerun this diagnostic.');
  }

  const pool = new Pool({ connectionString: databaseUrl });

  try {
    const versionResult = await pool.query<VersionRow>(
      `
      SELECT
        av.id AS assessment_version_id,
        av.version AS version_tag,
        av.lifecycle_status
      FROM assessment_versions av
      INNER JOIN assessments a ON a.id = av.assessment_id
      WHERE a.assessment_key = $1
        AND av.lifecycle_status = 'draft'
      ORDER BY av.updated_at DESC, av.created_at DESC, av.id DESC
      LIMIT 1
      `,
      [ASSESSMENT_KEY],
    );

    const version = versionResult.rows[0] ?? null;
    if (!version) {
      throw new Error(`No draft assessment version found for assessment key "${ASSESSMENT_KEY}".`);
    }

    const domainResult = await pool.query<DomainRow>(
      `
      SELECT domain_key
      FROM domains
      WHERE assessment_version_id = $1
      ORDER BY order_index ASC, id ASC
      `,
      [version.assessment_version_id],
    );

    const signalResult = await pool.query<SignalRow>(
      `
      SELECT signal_key, order_index, id AS signal_id
      FROM signals
      WHERE assessment_version_id = $1
      ORDER BY order_index ASC, id ASC
      `,
      [version.assessment_version_id],
    );

    const primaryDomainKey = domainResult.rows[0]?.domain_key ?? null;
    const signalKeys = signalResult.rows.map((row) => row.signal_key);
    const pairKeys = buildPairKeys(signalKeys);

    const domainFramingResult = await pool.query<{ domain_key: string }>(
      `
      SELECT domain_key
      FROM assessment_version_single_domain_framing
      WHERE assessment_version_id = $1
      ORDER BY domain_key ASC
      `,
      [version.assessment_version_id],
    );

    const heroPairsResult = await pool.query<{ pair_key: string }>(
      `
      SELECT pair_key
      FROM assessment_version_single_domain_hero_pairs
      WHERE assessment_version_id = $1
      ORDER BY pair_key ASC
      `,
      [version.assessment_version_id],
    );

    const driverClaimsResult = await pool.query<{ pair_key: string; driver_role: string; signal_key: string; domain_key: string }>(
      `
      SELECT pair_key, driver_role, signal_key, domain_key
      FROM assessment_version_single_domain_driver_claims
      WHERE assessment_version_id = $1
      ORDER BY pair_key ASC, driver_role ASC, signal_key ASC
      `,
      [version.assessment_version_id],
    );

    const signalChaptersResult = await pool.query<{ signal_key: string }>(
      `
      SELECT signal_key
      FROM assessment_version_single_domain_signal_chapters
      WHERE assessment_version_id = $1
      ORDER BY signal_key ASC
      `,
      [version.assessment_version_id],
    );

    const balancingSectionsResult = await pool.query<{ pair_key: string }>(
      `
      SELECT pair_key
      FROM assessment_version_single_domain_balancing_sections
      WHERE assessment_version_id = $1
      ORDER BY pair_key ASC
      `,
      [version.assessment_version_id],
    );

    const pairSummariesResult = await pool.query<{ pair_key: string }>(
      `
      SELECT pair_key
      FROM assessment_version_single_domain_pair_summaries
      WHERE assessment_version_id = $1
      ORDER BY pair_key ASC
      `,
      [version.assessment_version_id],
    );

    const applicationStatementsResult = await pool.query<{ signal_key: string }>(
      `
      SELECT signal_key
      FROM assessment_version_single_domain_application_statements
      WHERE assessment_version_id = $1
      ORDER BY signal_key ASC
      `,
      [version.assessment_version_id],
    );

    const pairKeySet = new Set(pairKeys);
    const signalKeySet = new Set(signalKeys);
    const expectedDriverKeys = pairKeys.flatMap((pairKey) => DRIVER_ROLES.map((role) => `${pairKey}|${role}`));
    const domainFramingCount = domainFramingResult.rowCount ?? 0;
    const heroPairsCount = heroPairsResult.rowCount ?? 0;
    const driverClaimsCount = driverClaimsResult.rowCount ?? 0;
    const signalChaptersCount = signalChaptersResult.rowCount ?? 0;
    const balancingSectionsCount = balancingSectionsResult.rowCount ?? 0;
    const pairSummariesCount = pairSummariesResult.rowCount ?? 0;
    const applicationStatementsCount = applicationStatementsResult.rowCount ?? 0;

    const domainFramingAnalysis = analyzeKeys({
      actualKeys: domainFramingResult.rows.map((row) => row.domain_key),
      expectedKeys: primaryDomainKey ? [primaryDomainKey] : [],
      validateKey: (key) => primaryDomainKey ? key === primaryDomainKey : false,
    });

    const heroPairsAnalysis = analyzeKeys({
      actualKeys: heroPairsResult.rows.map((row) => row.pair_key),
      expectedKeys: pairKeys,
      validateKey: (key) => pairKeySet.has(key),
    });

    const driverClaimsAnalysis = analyzeKeys({
      actualKeys: driverClaimsResult.rows.map((row) => `${row.pair_key}|${row.driver_role}`),
      expectedKeys: expectedDriverKeys,
      validateKey: (key) => {
        const [pairKey, role] = key.split('|');
        return Boolean(pairKey && role && pairKeySet.has(pairKey) && DRIVER_ROLES.includes(role as (typeof DRIVER_ROLES)[number]));
      },
    });

    const signalChaptersAnalysis = analyzeKeys({
      actualKeys: signalChaptersResult.rows.map((row) => row.signal_key),
      expectedKeys: signalKeys,
      validateKey: (key) => signalKeySet.has(key),
    });

    const balancingSectionsAnalysis = analyzeKeys({
      actualKeys: balancingSectionsResult.rows.map((row) => row.pair_key),
      expectedKeys: pairKeys,
      validateKey: (key) => pairKeySet.has(key),
    });

    const pairSummariesAnalysis = analyzeKeys({
      actualKeys: pairSummariesResult.rows.map((row) => row.pair_key),
      expectedKeys: pairKeys,
      validateKey: (key) => pairKeySet.has(key),
    });

    const applicationStatementsAnalysis = analyzeKeys({
      actualKeys: applicationStatementsResult.rows.map((row) => row.signal_key),
      expectedKeys: signalKeys,
      validateKey: (key) => signalKeySet.has(key),
    });

    const datasetReports: Record<string, DatasetReport> = {
      DOMAIN_FRAMING: {
        expectedCount: 1,
        actualCount: domainFramingCount,
        isReady: evaluateReadiness({
          expectedCount: 1,
          actualCount: domainFramingCount,
          atLeast: true,
          keyAnalysis: domainFramingAnalysis,
        }),
        ...domainFramingAnalysis,
      },
      HERO_PAIRS: {
        expectedCount: pairKeys.length,
        actualCount: heroPairsCount,
        isReady: evaluateReadiness({ expectedCount: pairKeys.length, actualCount: heroPairsCount, keyAnalysis: heroPairsAnalysis }),
        ...heroPairsAnalysis,
      },
      DRIVER_CLAIMS: {
        expectedCount: expectedDriverKeys.length,
        actualCount: driverClaimsCount,
        isReady: evaluateReadiness({ expectedCount: expectedDriverKeys.length, actualCount: driverClaimsCount, keyAnalysis: driverClaimsAnalysis }),
        ...driverClaimsAnalysis,
      },
      SIGNAL_CHAPTERS: {
        expectedCount: signalKeys.length,
        actualCount: signalChaptersCount,
        isReady: evaluateReadiness({ expectedCount: signalKeys.length, actualCount: signalChaptersCount, keyAnalysis: signalChaptersAnalysis }),
        ...signalChaptersAnalysis,
      },
      BALANCING_SECTIONS: {
        expectedCount: pairKeys.length,
        actualCount: balancingSectionsCount,
        isReady: evaluateReadiness({ expectedCount: pairKeys.length, actualCount: balancingSectionsCount, keyAnalysis: balancingSectionsAnalysis }),
        ...balancingSectionsAnalysis,
      },
      PAIR_SUMMARIES: {
        expectedCount: pairKeys.length,
        actualCount: pairSummariesCount,
        isReady: evaluateReadiness({ expectedCount: pairKeys.length, actualCount: pairSummariesCount, keyAnalysis: pairSummariesAnalysis }),
        ...pairSummariesAnalysis,
      },
      APPLICATION_STATEMENTS: {
        expectedCount: signalKeys.length,
        actualCount: applicationStatementsCount,
        isReady: evaluateReadiness({ expectedCount: signalKeys.length, actualCount: applicationStatementsCount, keyAnalysis: applicationStatementsAnalysis }),
        ...applicationStatementsAnalysis,
      },
    };

    const driverSignalCoverage = analyzeKeys({
      actualKeys: driverClaimsResult.rows.map((row) => row.signal_key),
      expectedKeys: signalKeys,
      validateKey: (key) => signalKeySet.has(key),
    });

    const driverDomainCoverage = analyzeKeys({
      actualKeys: driverClaimsResult.rows.map((row) => row.domain_key),
      expectedKeys: primaryDomainKey ? [primaryDomainKey] : [],
      validateKey: (key) => primaryDomainKey ? key === primaryDomainKey : false,
    });

    const payload = {
      assessmentKey: ASSESSMENT_KEY,
      assessmentVersionId: version.assessment_version_id,
      versionTag: version.version_tag,
      lifecycleStatus: version.lifecycle_status,
      derivedContext: {
        domainKey: primaryDomainKey,
        signalKeys,
        pairKeys,
        expectedPairCount: pairKeys.length,
      },
      datasets: datasetReports,
      driverClaimsAdditionalCoverage: {
        signalKeyCoverage: driverSignalCoverage,
        domainKeyCoverage: driverDomainCoverage,
      },
      overallReady: Object.values(datasetReports).every((report) => report.isReady),
      blockingDatasets: Object.entries(datasetReports)
        .filter(([, report]) => !report.isReady)
        .map(([datasetKey]) => datasetKey),
    };

    console.log(JSON.stringify(payload, null, 2));
  } finally {
    await pool.end();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
