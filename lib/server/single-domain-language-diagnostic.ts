import type { Queryable } from '@/lib/engine/repository-sql';
import {
  getExpectedDriverClaimTuples,
  getSingleDomainCanonicalPairKeys,
} from '@/lib/assessment-language/single-domain-canonical';
import { getDbPool } from '@/lib/server/db';

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

export type SingleDomainLanguageDatasetReport = {
  expectedCount: number;
  actualCount: number;
  completeCount: number;
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

export type SingleDomainLanguageDiagnosticIssue = {
  code: 'single_domain_driver_claim_matrix_invalid' | 'single_domain_driver_claim_missing_tuple';
  message: string;
  tupleKey?: string;
  pairKey?: string;
};

export type SingleDomainDriverClaimPairDiagnostic = {
  pairKey: string;
  expectedCount: number;
  actualCount: number;
  completeCount: number;
  missingTuples: string[];
};

export type SingleDomainLanguageDiagnosticPayload = {
  assessmentKey: string;
  assessmentVersionId: string;
  versionTag: string;
  lifecycleStatus: string;
  derivedContext: {
    domainKey: string | null;
    signalKeys: string[];
    pairKeys: string[];
    expectedPairCount: number;
  };
  datasets: Record<string, SingleDomainLanguageDatasetReport>;
  driverClaimMatrix: {
    expectedCount: number;
    actualCount: number;
    completeCount: number;
    pairs: SingleDomainDriverClaimPairDiagnostic[];
    issues: SingleDomainLanguageDiagnosticIssue[];
  };
  driverClaimsAdditionalCoverage: {
    signalKeyCoverage: KeyAnalysis;
    domainKeyCoverage: KeyAnalysis;
  };
  overallReady: boolean;
  blockingDatasets: string[];
};

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

export async function runSingleDomainLanguageDiagnostic(
  assessmentKey: string,
  db: Queryable = getDbPool(),
): Promise<SingleDomainLanguageDiagnosticPayload> {
  const versionResult = await db.query<VersionRow>(
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
    [assessmentKey],
  );

  const version = versionResult.rows[0] ?? null;
  if (!version) {
    throw new Error(`No draft assessment version found for assessment key "${assessmentKey}".`);
  }

  const domainResult = await db.query<DomainRow>(
    `
    SELECT domain_key
    FROM domains
    WHERE assessment_version_id = $1
    ORDER BY order_index ASC, id ASC
    `,
    [version.assessment_version_id],
  );

  const signalResult = await db.query<SignalRow>(
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
  const pairKeys = [...getSingleDomainCanonicalPairKeys(signalKeys)];

  const domainFramingResult = await db.query<{ domain_key: string }>(
    `
    SELECT domain_key
    FROM assessment_version_single_domain_framing
    WHERE assessment_version_id = $1
    ORDER BY domain_key ASC
    `,
    [version.assessment_version_id],
  );

  const heroPairsResult = await db.query<{ pair_key: string }>(
    `
    SELECT pair_key
    FROM assessment_version_single_domain_hero_pairs
    WHERE assessment_version_id = $1
    ORDER BY pair_key ASC
    `,
    [version.assessment_version_id],
  );

  const driverClaimsResult = await db.query<{ pair_key: string; driver_role: string; signal_key: string; domain_key: string }>(
    `
    SELECT pair_key, driver_role, signal_key, domain_key
    FROM assessment_version_single_domain_driver_claims
    WHERE assessment_version_id = $1
    ORDER BY pair_key ASC, driver_role ASC, signal_key ASC
    `,
    [version.assessment_version_id],
  );

  const balancingSectionsResult = await db.query<{ pair_key: string }>(
    `
    SELECT pair_key
    FROM assessment_version_single_domain_balancing_sections
    WHERE assessment_version_id = $1
    ORDER BY pair_key ASC
    `,
    [version.assessment_version_id],
  );

  const pairSummariesResult = await db.query<{ pair_key: string }>(
    `
    SELECT pair_key
    FROM assessment_version_single_domain_pair_summaries
    WHERE assessment_version_id = $1
    ORDER BY pair_key ASC
    `,
    [version.assessment_version_id],
  );

  const applicationStatementsResult = await db.query<{ signal_key: string }>(
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
  const expectedDriverKeys = primaryDomainKey
    ? getExpectedDriverClaimTuples({
        domainKey: primaryDomainKey,
        signalKeys,
        pairKeys,
      }).map((tuple) => `${tuple.domainKey}|${tuple.pairKey}|${tuple.signalKey}|${tuple.driverRole}`)
    : [];
  const domainFramingCount = domainFramingResult.rows.length;
  const heroPairsCount = heroPairsResult.rows.length;
  const driverClaimsCount = driverClaimsResult.rows.length;
  const balancingSectionsCount = balancingSectionsResult.rows.length;
  const pairSummariesCount = pairSummariesResult.rows.length;
  const applicationStatementsCount = applicationStatementsResult.rows.length;

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
    actualKeys: driverClaimsResult.rows.map(
      (row) => `${row.domain_key}|${row.pair_key}|${row.signal_key}|${row.driver_role}`,
    ),
    expectedKeys: expectedDriverKeys,
    validateKey: (key) => {
      const [domainKey, pairKey, signalKey, role] = key.split('|');
      return Boolean(
        domainKey
        && pairKey
        && signalKey
        && role
        && primaryDomainKey
        && domainKey === primaryDomainKey
        && pairKeySet.has(pairKey)
        && signalKeySet.has(signalKey),
      );
    },
  });
  const actualDriverClaimTupleCounts = new Map<string, number>();
  driverClaimsResult.rows.forEach((row) => {
    const tupleKey = `${row.domain_key}|${row.pair_key}|${row.signal_key}|${row.driver_role}`;
    actualDriverClaimTupleCounts.set(tupleKey, (actualDriverClaimTupleCounts.get(tupleKey) ?? 0) + 1);
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

  const datasetReports: Record<string, SingleDomainLanguageDatasetReport> = {
    DOMAIN_FRAMING: {
      expectedCount: 1,
      actualCount: domainFramingCount,
      completeCount: domainFramingAnalysis.presentKeys.filter((key) => !domainFramingAnalysis.missingKeys.includes(key)).length,
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
      completeCount: pairKeys.length - heroPairsAnalysis.missingKeys.length,
      isReady: evaluateReadiness({ expectedCount: pairKeys.length, actualCount: heroPairsCount, keyAnalysis: heroPairsAnalysis }),
      ...heroPairsAnalysis,
    },
    DRIVER_CLAIMS: {
      expectedCount: expectedDriverKeys.length,
      actualCount: driverClaimsCount,
      completeCount: expectedDriverKeys.filter((key) => actualDriverClaimTupleCounts.get(key) === 1).length,
      isReady: evaluateReadiness({ expectedCount: expectedDriverKeys.length, actualCount: driverClaimsCount, keyAnalysis: driverClaimsAnalysis }),
      ...driverClaimsAnalysis,
    },
    BALANCING_SECTIONS: {
      expectedCount: pairKeys.length,
      actualCount: balancingSectionsCount,
      completeCount: pairKeys.length - balancingSectionsAnalysis.missingKeys.length,
      isReady: evaluateReadiness({ expectedCount: pairKeys.length, actualCount: balancingSectionsCount, keyAnalysis: balancingSectionsAnalysis }),
      ...balancingSectionsAnalysis,
    },
    PAIR_SUMMARIES: {
      expectedCount: pairKeys.length,
      actualCount: pairSummariesCount,
      completeCount: pairKeys.length - pairSummariesAnalysis.missingKeys.length,
      isReady: evaluateReadiness({ expectedCount: pairKeys.length, actualCount: pairSummariesCount, keyAnalysis: pairSummariesAnalysis }),
      ...pairSummariesAnalysis,
    },
    APPLICATION_STATEMENTS: {
      expectedCount: signalKeys.length,
      actualCount: applicationStatementsCount,
      completeCount: signalKeys.length - applicationStatementsAnalysis.missingKeys.length,
      isReady: evaluateReadiness({ expectedCount: signalKeys.length, actualCount: applicationStatementsCount, keyAnalysis: applicationStatementsAnalysis }),
      ...applicationStatementsAnalysis,
    },
  };

  const driverClaimExpectedByPair = new Map<string, string[]>();
  expectedDriverKeys.forEach((key) => {
    const [, pairKey] = key.split('|');
    if (!pairKey) {
      return;
    }
    const keys = driverClaimExpectedByPair.get(pairKey) ?? [];
    keys.push(key);
    driverClaimExpectedByPair.set(pairKey, keys);
  });
  const driverClaimActualByPair = new Map<string, number>();
  driverClaimsResult.rows.forEach((row) => {
    driverClaimActualByPair.set(row.pair_key, (driverClaimActualByPair.get(row.pair_key) ?? 0) + 1);
  });
  const driverClaimPairDiagnostics = [...driverClaimExpectedByPair.entries()]
    .map(([pairKey, tupleKeys]) => {
      const missingTuples = tupleKeys.filter((key) => !driverClaimsAnalysis.presentKeys.includes(key));
      return {
        pairKey,
        expectedCount: tupleKeys.length,
        actualCount: driverClaimActualByPair.get(pairKey) ?? 0,
        completeCount: tupleKeys.filter((key) => actualDriverClaimTupleCounts.get(key) === 1).length,
        missingTuples,
      };
    })
    .sort((left, right) => left.pairKey.localeCompare(right.pairKey));
  const driverClaimIssues: SingleDomainLanguageDiagnosticIssue[] = [];
  if (
    driverClaimsCount !== expectedDriverKeys.length
    || driverClaimsAnalysis.invalidKeys.length > 0
    || driverClaimsAnalysis.duplicateKeys.length > 0
  ) {
    driverClaimIssues.push({
      code: 'single_domain_driver_claim_matrix_invalid',
      message: `DRIVER_CLAIMS must contain exactly ${expectedDriverKeys.length} valid rows for the current runtime tuple matrix, but found ${driverClaimsCount}.`,
    });
  }
  driverClaimsAnalysis.missingKeys.forEach((tupleKey) => {
    driverClaimIssues.push({
      code: 'single_domain_driver_claim_missing_tuple',
      message: `Missing exact DRIVER_CLAIMS tuple ${tupleKey}.`,
      tupleKey,
      pairKey: tupleKey.split('|')[1],
    });
  });

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

  return {
    assessmentKey,
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
    driverClaimMatrix: {
      expectedCount: expectedDriverKeys.length,
      actualCount: driverClaimsCount,
      completeCount: expectedDriverKeys.filter((key) => actualDriverClaimTupleCounts.get(key) === 1).length,
      pairs: driverClaimPairDiagnostics,
      issues: driverClaimIssues,
    },
    driverClaimsAdditionalCoverage: {
      signalKeyCoverage: driverSignalCoverage,
      domainKeyCoverage: driverDomainCoverage,
    },
    overallReady: Object.values(datasetReports).every((report) => report.isReady),
    blockingDatasets: Object.entries(datasetReports)
      .filter(([, report]) => !report.isReady)
      .map(([datasetKey]) => datasetKey),
  };
}
