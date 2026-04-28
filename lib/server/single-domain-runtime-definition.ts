import type { Queryable } from '@/lib/engine/repository-sql';
import {
  DRIVER_CLAIM_ROLES,
  getExpectedDriverClaimTuples,
  getSingleDomainCanonicalPairKeys,
} from '@/lib/assessment-language/single-domain-canonical';
import { resolveSingleDomainPairKey } from '@/lib/assessment-language/single-domain-pair-keys';
import { getSingleDomainLanguageBundle } from '@/lib/server/assessment-version-single-domain-language';
import type {
  SingleDomainDraftReadinessCounts,
  SingleDomainDraftReadinessExpectations,
  SingleDomainDraftReadinessIssue,
  SingleDomainDraftReadinessIssueCode,
  SingleDomainRuntimeDefinition,
  SingleDomainRuntimeDerivedPair,
  SingleDomainRuntimeDiagnostics,
  SingleDomainRuntimeDomain,
  SingleDomainRuntimeLanguageRowCounts,
  SingleDomainRuntimeMetadata,
  SingleDomainRuntimeOption,
  SingleDomainRuntimeOptionSignalWeight,
  SingleDomainRuntimeQuestion,
  SingleDomainRuntimeSignal,
} from '@/lib/types/single-domain-runtime';
import { getSingleDomainExpectedPairCount } from '@/lib/types/single-domain-runtime';

type RuntimeContextRow = {
  assessment_id: string;
  assessment_key: string;
  assessment_title: string;
  assessment_description: string | null;
  assessment_version_id: string;
  assessment_version_tag: string;
  assessment_mode: string | null;
};

type RuntimeDomainRow = {
  domain_id: string;
  domain_key: string;
  domain_label: string;
  domain_description: string | null;
  domain_order_index: number;
};

type RuntimeSignalRow = {
  signal_id: string;
  signal_key: string;
  signal_label: string;
  signal_description: string | null;
  signal_order_index: number;
  domain_id: string;
};

type RuntimeQuestionRow = {
  question_id: string;
  question_key: string;
  prompt: string;
  question_order_index: number;
  domain_id: string;
  domain_key: string;
};

type RuntimeOptionRow = {
  option_id: string;
  option_key: string;
  option_label: string | null;
  option_text: string;
  option_order_index: number;
  question_id: string | null;
};

type RuntimeWeightRow = {
  option_signal_weight_id: string;
  option_id: string;
  signal_id: string | null;
  signal_key: string | null;
  weight: string;
  source_weight_key: string | null;
};

const DRIVER_ROLE_TO_CLAIM_TYPE = {
  primary_driver: 'driver_primary',
  secondary_driver: 'driver_secondary',
  supporting_context: 'driver_supporting_context',
  range_limitation: 'driver_range_limitation',
} as const;

const DRIVER_ROLE_TO_MATERIALITY = {
  primary_driver: 'core',
  secondary_driver: 'core',
  supporting_context: 'supporting',
  range_limitation: 'material_underplay',
} as const;

export class SingleDomainRuntimeDefinitionError extends Error {
  readonly code: SingleDomainDraftReadinessIssueCode;
  readonly issues: readonly SingleDomainDraftReadinessIssue[];

  constructor(issue: SingleDomainDraftReadinessIssue, issues: readonly SingleDomainDraftReadinessIssue[]) {
    super(issue.message);
    this.name = 'SingleDomainRuntimeDefinitionError';
    this.code = issue.code;
    this.issues = issues;
  }
}

export type SingleDomainRuntimeEvaluation = {
  runtimeDefinition: SingleDomainRuntimeDefinition | null;
  issues: readonly SingleDomainDraftReadinessIssue[];
  counts: SingleDomainDraftReadinessCounts;
  expectations: SingleDomainDraftReadinessExpectations;
};

function createLanguageRowCounts(bundle: Awaited<ReturnType<typeof getSingleDomainLanguageBundle>>): SingleDomainRuntimeLanguageRowCounts {
  return {
    DOMAIN_FRAMING: bundle.DOMAIN_FRAMING.length,
    HERO_PAIRS: bundle.HERO_PAIRS.length,
    DRIVER_CLAIMS: bundle.DRIVER_CLAIMS?.length ?? 0,
    BALANCING_SECTIONS: bundle.BALANCING_SECTIONS.length,
    PAIR_SUMMARIES: bundle.PAIR_SUMMARIES.length,
    APPLICATION_STATEMENTS: bundle.APPLICATION_STATEMENTS.length,
  };
}

function createIssue(
  code: SingleDomainDraftReadinessIssueCode,
  section: SingleDomainDraftReadinessIssue['section'],
  message: string,
  relatedKeys?: readonly string[],
  severity: SingleDomainDraftReadinessIssue['severity'] = 'blocking',
): SingleDomainDraftReadinessIssue {
  return {
    code,
    section,
    message,
    severity,
    relatedKeys: relatedKeys ? Object.freeze([...relatedKeys]) : undefined,
  };
}

function compactText(value: string): string {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, ' ');
}

function pairLanguageReferencesPair(params: {
  pairKey: string;
  rowText: string;
}): boolean {
  const [leftSignalKey, rightSignalKey] = params.pairKey.split('_');
  if (!leftSignalKey || !rightSignalKey) {
    return false;
  }

  const normalized = compactText(params.rowText);
  const pairKeyToken = compactText(params.pairKey);
  const reversedPairKeyToken = compactText(`${rightSignalKey}_${leftSignalKey}`);

  if (normalized.includes(pairKeyToken) || normalized.includes(reversedPairKeyToken)) {
    return true;
  }

  return normalized.includes(compactText(leftSignalKey))
    && normalized.includes(compactText(rightSignalKey));
}

async function loadRuntimeContext(
  db: Queryable,
  assessmentVersionId: string,
): Promise<RuntimeContextRow | null> {
  const result = await db.query<RuntimeContextRow>(
    `
    SELECT
      a.id AS assessment_id,
      a.assessment_key,
      a.title AS assessment_title,
      a.description AS assessment_description,
      av.id AS assessment_version_id,
      av.version AS assessment_version_tag,
      COALESCE(av.mode, a.mode) AS assessment_mode
    FROM assessment_versions av
    INNER JOIN assessments a ON a.id = av.assessment_id
    WHERE av.id = $1
    `,
    [assessmentVersionId],
  );

  return result.rows[0] ?? null;
}

async function loadDomains(
  db: Queryable,
  assessmentVersionId: string,
): Promise<readonly RuntimeDomainRow[]> {
  const result = await db.query<RuntimeDomainRow>(
    `
    SELECT
      id AS domain_id,
      domain_key,
      label AS domain_label,
      description AS domain_description,
      order_index AS domain_order_index
    FROM domains
    WHERE assessment_version_id = $1
    ORDER BY order_index ASC, id ASC
    `,
    [assessmentVersionId],
  );

  return Object.freeze(result.rows);
}

async function loadSignals(
  db: Queryable,
  assessmentVersionId: string,
): Promise<readonly RuntimeSignalRow[]> {
  const result = await db.query<RuntimeSignalRow>(
    `
    SELECT
      s.id AS signal_id,
      s.signal_key,
      s.label AS signal_label,
      s.description AS signal_description,
      s.order_index AS signal_order_index,
      s.domain_id
    FROM signals s
    WHERE s.assessment_version_id = $1
    ORDER BY s.order_index ASC, s.id ASC
    `,
    [assessmentVersionId],
  );

  return Object.freeze(result.rows);
}

async function loadQuestions(
  db: Queryable,
  assessmentVersionId: string,
): Promise<readonly RuntimeQuestionRow[]> {
  const result = await db.query<RuntimeQuestionRow>(
    `
    SELECT
      q.id AS question_id,
      q.question_key,
      q.prompt,
      q.order_index AS question_order_index,
      q.domain_id,
      d.domain_key
    FROM questions q
    LEFT JOIN domains d ON d.id = q.domain_id
    WHERE q.assessment_version_id = $1
    ORDER BY q.order_index ASC, q.id ASC
    `,
    [assessmentVersionId],
  );

  return Object.freeze(result.rows);
}

async function loadOptions(
  db: Queryable,
  assessmentVersionId: string,
): Promise<readonly RuntimeOptionRow[]> {
  const result = await db.query<RuntimeOptionRow>(
    `
    SELECT
      o.id AS option_id,
      o.option_key,
      o.option_label,
      o.option_text,
      o.order_index AS option_order_index,
      o.question_id
    FROM options o
    WHERE o.assessment_version_id = $1
    ORDER BY o.order_index ASC, o.id ASC
    `,
    [assessmentVersionId],
  );

  return Object.freeze(result.rows);
}

async function loadWeights(
  db: Queryable,
  assessmentVersionId: string,
): Promise<readonly RuntimeWeightRow[]> {
  const result = await db.query<RuntimeWeightRow>(
    `
    SELECT
      osw.id AS option_signal_weight_id,
      osw.option_id,
      s.id AS signal_id,
      s.signal_key,
      osw.weight::text AS weight,
      osw.source_weight_key
    FROM option_signal_weights osw
    INNER JOIN options o ON o.id = osw.option_id
    LEFT JOIN signals s ON s.id = osw.signal_id
    WHERE o.assessment_version_id = $1
    ORDER BY osw.option_id ASC, osw.signal_id ASC NULLS LAST, osw.id ASC
    `,
    [assessmentVersionId],
  );

  return Object.freeze(result.rows);
}

function buildLanguageExpectations(params: {
  signalCount: number;
  derivedPairCount: number;
  domainKey: string | null;
  signalKeys: readonly string[];
  pairKeys: readonly string[];
}): SingleDomainRuntimeLanguageRowCounts {
  return {
    DOMAIN_FRAMING: 1,
    HERO_PAIRS: params.derivedPairCount,
    DRIVER_CLAIMS: params.domainKey
      ? getExpectedDriverClaimTuples({
          domainKey: params.domainKey,
          signalKeys: params.signalKeys,
          pairKeys: params.pairKeys,
        }).length
      : 0,
    BALANCING_SECTIONS: params.derivedPairCount,
    PAIR_SUMMARIES: params.derivedPairCount,
    APPLICATION_STATEMENTS: params.signalCount,
  };
}

function validateLanguageKeys(params: {
  domainKey: string | null;
  signalKeys: readonly string[];
  pairKeys: readonly string[];
  languageBundle: Awaited<ReturnType<typeof getSingleDomainLanguageBundle>>;
  issues: SingleDomainDraftReadinessIssue[];
}): void {
  const signalKeySet = new Set(params.signalKeys);
  const domainKey = params.domainKey;
  const strictDriverTupleCoverage = Boolean(domainKey) && params.pairKeys.length > 0;

  const framingKeys = [...new Set(params.languageBundle.DOMAIN_FRAMING.map((row) => row.domain_key))];
  if (domainKey && framingKeys.some((key) => key !== domainKey)) {
    params.issues.push(
      createIssue(
        'domain_framing_key_mismatch',
        'language',
        'DOMAIN_FRAMING rows must reference the current authored domain key only.',
        framingKeys,
      ),
    );
  }

  const applicationSignalKeys = [...new Set(params.languageBundle.APPLICATION_STATEMENTS.map((row) => row.signal_key))];
  const invalidApplicationSignalKeys = applicationSignalKeys.filter((key) => !signalKeySet.has(key));
  if (invalidApplicationSignalKeys.length > 0) {
    params.issues.push(
      createIssue(
        'application_statements_key_mismatch',
        'language',
        'APPLICATION_STATEMENTS rows must resolve against the current authored signal keys.',
        invalidApplicationSignalKeys,
      ),
    );
  }

  const heroPairKeys = [...new Set(params.languageBundle.HERO_PAIRS.map((row) => row.pair_key))];
  const invalidHeroPairKeys = heroPairKeys.filter((key) => !params.pairKeys.includes(key));
  if (invalidHeroPairKeys.length > 0) {
    params.issues.push(
      createIssue(
        'hero_pairs_key_mismatch',
        'language',
        'HERO_PAIRS pair_key values must match the canonical pair keys exactly.',
        invalidHeroPairKeys,
      ),
    );
  }
  const heroContentMismatches = params.languageBundle.HERO_PAIRS
    .filter((row) => params.pairKeys.includes(row.pair_key))
    .filter((row) => !pairLanguageReferencesPair({
      pairKey: row.pair_key,
      rowText: [
        row.hero_headline,
        row.hero_subheadline,
        row.hero_opening,
        row.hero_strength_paragraph,
        row.hero_tension_paragraph,
        row.hero_close_paragraph,
      ].join(' '),
    }))
    .map((row) => row.pair_key);
  if (heroContentMismatches.length > 0) {
    params.issues.push(
      createIssue(
        'hero_pairs_content_mismatch',
        'language',
        'HERO_PAIRS rows must reference the active pair signals or pair key in their visible text.',
        heroContentMismatches,
      ),
    );
  }

  const balancingPairKeys = [...new Set(params.languageBundle.BALANCING_SECTIONS.map((row) => row.pair_key))];
  const invalidBalancingPairKeys = balancingPairKeys.filter((key) => !params.pairKeys.includes(key));
  if (invalidBalancingPairKeys.length > 0) {
    params.issues.push(
      createIssue(
        'balancing_sections_key_mismatch',
        'language',
        'BALANCING_SECTIONS pair_key values must match the canonical pair keys exactly.',
        invalidBalancingPairKeys,
      ),
    );
  }

  const pairSummaryKeys = [...new Set(params.languageBundle.PAIR_SUMMARIES.map((row) => row.pair_key))];
  const invalidPairSummaryKeys = pairSummaryKeys.filter((key) => !params.pairKeys.includes(key));
  if (invalidPairSummaryKeys.length > 0) {
    params.issues.push(
      createIssue(
        'pair_summaries_key_mismatch',
        'language',
        'PAIR_SUMMARIES pair_key values must match the canonical pair keys exactly.',
        invalidPairSummaryKeys,
      ),
    );
  }
  const pairSummaryContentMismatches = params.languageBundle.PAIR_SUMMARIES
    .filter((row) => params.pairKeys.includes(row.pair_key))
    .filter((row) => !pairLanguageReferencesPair({
      pairKey: row.pair_key,
      rowText: [
        row.pair_section_title,
        row.pair_headline,
        row.pair_opening_paragraph,
        row.pair_strength_paragraph,
        row.pair_tension_paragraph,
        row.pair_close_paragraph,
      ].join(' '),
    }))
    .map((row) => row.pair_key);
  if (pairSummaryContentMismatches.length > 0) {
    params.issues.push(
      createIssue(
        'pair_summaries_content_mismatch',
        'language',
        'PAIR_SUMMARIES rows must reference the active pair signals or pair key in their visible text.',
        pairSummaryContentMismatches,
      ),
    );
  }

  const driverClaimRows = params.languageBundle.DRIVER_CLAIMS ?? [];
  const driverDomainKeys = [...new Set(driverClaimRows.map((row) => row.domain_key))];
  const invalidDriverDomainKeys = domainKey
    ? driverDomainKeys.filter((key) => key !== domainKey)
    : driverDomainKeys;
  if (invalidDriverDomainKeys.length > 0) {
    params.issues.push(
      createIssue(
        'driver_claims_key_mismatch',
        'language',
        'DRIVER_CLAIMS rows must reference the current single-domain key only.',
        invalidDriverDomainKeys,
      ),
    );
  }

  const driverSignalKeys = [...new Set(driverClaimRows.map((row) => row.signal_key))];
  const invalidDriverSignalKeys = driverSignalKeys.filter((key) => !signalKeySet.has(key));
  if (invalidDriverSignalKeys.length > 0) {
    params.issues.push(
      createIssue(
        'driver_claims_key_mismatch',
        'language',
        'DRIVER_CLAIMS signal_key values must resolve against the current authored signal keys.',
        invalidDriverSignalKeys,
      ),
    );
  }

  const driverPairKeys = [...new Set(driverClaimRows.map((row) => row.pair_key))];
  const invalidDriverPairKeys = strictDriverTupleCoverage
    ? driverPairKeys.filter((key) => !params.pairKeys.includes(key))
    : driverPairKeys.filter((key) => !resolveSingleDomainPairKey(params.pairKeys, key).success);
  if (invalidDriverPairKeys.length > 0) {
    params.issues.push(
      createIssue(
        'driver_claims_key_mismatch',
        'language',
        strictDriverTupleCoverage
          ? 'DRIVER_CLAIMS pair_key values must match the canonical pair keys exactly.'
          : 'DRIVER_CLAIMS pair_key values must resolve against the current signal-derived pair set.',
        invalidDriverPairKeys,
        strictDriverTupleCoverage ? 'blocking' : 'warning',
      ),
    );
  }

  const roleMappingMismatches = driverClaimRows
    .filter((row) => {
      const driverRole = row.driver_role as keyof typeof DRIVER_ROLE_TO_CLAIM_TYPE;
      return !DRIVER_CLAIM_ROLES.includes(driverRole)
        || row.claim_type !== DRIVER_ROLE_TO_CLAIM_TYPE[driverRole]
        || row.materiality !== DRIVER_ROLE_TO_MATERIALITY[driverRole];
    })
    .map((row) => `${row.pair_key}:${row.signal_key}:${row.driver_role}`);
  if (roleMappingMismatches.length > 0) {
    params.issues.push(
      createIssue(
        'driver_claims_role_mapping_mismatch',
        'language',
        'DRIVER_CLAIMS rows must preserve the required driver_role, claim_type, and materiality mapping.',
        roleMappingMismatches,
        'blocking',
      ),
    );
  }

  const coverageKeys = new Map<string, number>();
  driverClaimRows.forEach((row) => {
    if (!strictDriverTupleCoverage) {
      const resolvedPairKey = resolveSingleDomainPairKey(params.pairKeys, row.pair_key);
      if (!resolvedPairKey.success) {
        return;
      }

      const key = `${resolvedPairKey.canonicalPairKey}:${row.driver_role}`;
      coverageKeys.set(key, (coverageKeys.get(key) ?? 0) + 1);
      return;
    }

    const key = `${row.domain_key}:${row.pair_key}:${row.signal_key}:${row.driver_role}`;
    coverageKeys.set(key, (coverageKeys.get(key) ?? 0) + 1);
  });

  const expectedDriverClaimTuples = strictDriverTupleCoverage && domainKey
    ? getExpectedDriverClaimTuples({
        domainKey,
        signalKeys: params.signalKeys,
        pairKeys: params.pairKeys,
      })
    : [];
  if (strictDriverTupleCoverage) {
    const expectedTupleKeys = new Set(
      expectedDriverClaimTuples.map((tuple) => `${tuple.domainKey}:${tuple.pairKey}:${tuple.signalKey}:${tuple.driverRole}`),
    );
    const unexpectedCoverageKeys = [...coverageKeys.keys()].filter((key) => !expectedTupleKeys.has(key));
    if (unexpectedCoverageKeys.length > 0) {
      params.issues.push(
        createIssue(
          'driver_claims_key_mismatch',
          'language',
          'DRIVER_CLAIMS rows must match the exact runtime lookup tuple domain_key + pair_key + signal_key + driver_role.',
          unexpectedCoverageKeys,
        ),
      );
    }
  }

  const coverageFindings = strictDriverTupleCoverage
    ? expectedDriverClaimTuples
      .map((tuple) => {
        const key = `${tuple.domainKey}:${tuple.pairKey}:${tuple.signalKey}:${tuple.driverRole}`;
        const count = coverageKeys.get(key) ?? 0;
        return count === 1 ? null : `${key}:${count}`;
      })
      .filter((key): key is string => Boolean(key))
    : params.pairKeys.flatMap((pairKey) =>
      DRIVER_CLAIM_ROLES
        .map((driverRole) => {
          const key = `${pairKey}:${driverRole}`;
          const count = coverageKeys.get(key) ?? 0;
          return count === 1 ? null : `${key}:${count}`;
        })
        .filter((key): key is string => Boolean(key)),
    );
  if (coverageFindings.length > 0) {
    params.issues.push(
      createIssue(
        'driver_claims_coverage_incomplete',
        'language',
        strictDriverTupleCoverage
          ? 'DRIVER_CLAIMS should contain exactly one row for each exact runtime lookup tuple.'
          : 'DRIVER_CLAIMS should contain exactly one row for each expected pair and driver role.',
        coverageFindings,
        strictDriverTupleCoverage ? 'blocking' : 'warning',
      ),
    );
  }
}

function createRuntimeDefinition(params: {
  metadata: SingleDomainRuntimeMetadata;
  domain: SingleDomainRuntimeDomain;
  signals: readonly SingleDomainRuntimeSignal[];
  derivedPairs: readonly SingleDomainRuntimeDerivedPair[];
  questions: readonly SingleDomainRuntimeQuestion[];
  optionSignalWeights: readonly SingleDomainRuntimeOptionSignalWeight[];
  languageBundle: Awaited<ReturnType<typeof getSingleDomainLanguageBundle>>;
  counts: SingleDomainDraftReadinessCounts;
  expectations: SingleDomainDraftReadinessExpectations;
  issues: readonly SingleDomainDraftReadinessIssue[];
}): SingleDomainRuntimeDefinition | null {
  if (params.issues.some((issue) => issue.severity === 'blocking')) {
    return null;
  }

  const diagnostics: SingleDomainRuntimeDiagnostics = {
    counts: {
      domainCount: params.counts.domainCount,
      signalCount: params.counts.signalCount,
      derivedPairCount: params.counts.derivedPairCount,
      questionCount: params.counts.questionCount,
      optionCount: params.counts.optionCount,
      weightCount: params.counts.weightCount,
      languageRowCounts: params.counts.languageRowCounts,
    },
    expectations: {
      requiredDomainCount: 1,
      minimumSignalCount: 1,
      minimumQuestionCount: 1,
      expectedDerivedPairCount: params.expectations.expectedDerivedPairCount,
      expectedLanguageRowCounts: params.expectations.expectedLanguageRowCounts,
    },
    invariants: {
      exactSingleDomain: params.counts.domainCount === 1,
      derivedPairCountMatchesSignals:
        params.counts.derivedPairCount === params.expectations.expectedDerivedPairCount,
      questionsBoundToDomain: params.counts.questionCount > 0 && params.counts.orphanOptionCount === 0,
      optionsBoundToQuestions:
        params.counts.optionCount > 0
        && params.counts.questionsWithoutOptionsCount === 0
        && params.counts.orphanOptionCount === 0,
      weightsBoundToOptions:
        params.counts.weightCount > 0 && params.counts.optionsWithoutWeightsCount === 0,
      weightsBoundToSignals: params.counts.unresolvedWeightSignalCount === 0,
      languageKeysMatchRuntime: true,
    },
  };

  return Object.freeze({
    metadata: Object.freeze(params.metadata),
    domain: Object.freeze(params.domain),
    signals: Object.freeze([...params.signals]),
    derivedPairs: Object.freeze([...params.derivedPairs]),
    questions: Object.freeze([...params.questions]),
    optionSignalWeights: Object.freeze([...params.optionSignalWeights]),
    languageBundle: Object.freeze({
      DOMAIN_FRAMING: Object.freeze([...params.languageBundle.DOMAIN_FRAMING]),
      HERO_PAIRS: Object.freeze([...params.languageBundle.HERO_PAIRS]),
      DRIVER_CLAIMS: Object.freeze([...(params.languageBundle.DRIVER_CLAIMS ?? [])]),
      SIGNAL_CHAPTERS: Object.freeze([]),
      BALANCING_SECTIONS: Object.freeze([...params.languageBundle.BALANCING_SECTIONS]),
      PAIR_SUMMARIES: Object.freeze([...params.languageBundle.PAIR_SUMMARIES]),
      APPLICATION_STATEMENTS: Object.freeze([...params.languageBundle.APPLICATION_STATEMENTS]),
    }),
    diagnostics: Object.freeze(diagnostics),
  });
}

export async function evaluateSingleDomainRuntimeDefinition(
  db: Queryable,
  assessmentVersionId: string,
): Promise<SingleDomainRuntimeEvaluation> {
  const context = await loadRuntimeContext(db, assessmentVersionId);
  const emptyLanguageCounts = buildLanguageExpectations({
    signalCount: 0,
    derivedPairCount: 0,
    domainKey: null,
    signalKeys: [],
    pairKeys: [],
  });

  if (!context) {
    return {
      runtimeDefinition: null,
      issues: Object.freeze([
        createIssue(
          'assessment_version_not_found',
          'metadata',
          'The requested assessment version does not exist.',
        ),
      ]),
      counts: {
        domainCount: 0,
        signalCount: 0,
        derivedPairCount: 0,
        questionCount: 0,
        optionCount: 0,
        weightCount: 0,
        questionsWithoutOptionsCount: 0,
        optionsWithoutWeightsCount: 0,
        orphanOptionCount: 0,
        unresolvedWeightSignalCount: 0,
        languageRowCounts: emptyLanguageCounts,
      },
      expectations: {
        requiredDomainCount: 1,
        minimumSignalCount: 1,
        minimumQuestionCount: 1,
        expectedDerivedPairCount: 0,
        expectedLanguageRowCounts: emptyLanguageCounts,
      },
    };
  }

  const [domainRows, signalRows, questionRows, optionRows, weightRows, languageBundle] = await Promise.all([
    loadDomains(db, assessmentVersionId),
    loadSignals(db, assessmentVersionId),
    loadQuestions(db, assessmentVersionId),
    loadOptions(db, assessmentVersionId),
    loadWeights(db, assessmentVersionId),
    getSingleDomainLanguageBundle(db, assessmentVersionId, { includeSignalChapters: false }),
  ]);

  const issues: SingleDomainDraftReadinessIssue[] = [];

  if (context.assessment_mode !== 'single_domain') {
    issues.push(
      createIssue(
        'single_domain_mode_required',
        'metadata',
        `Single-domain runtime loading requires mode "single_domain". Received "${context.assessment_mode ?? 'undefined'}".`,
      ),
    );
  }

  if (domainRows.length === 0) {
    issues.push(
      createIssue('missing_domain', 'domain', 'Exactly one authored domain is required for single-domain runtime loading.'),
    );
  } else if (domainRows.length > 1) {
    issues.push(
      createIssue(
        'multiple_domains',
        'domain',
        `Single-domain runtime loading requires exactly one authored domain, but ${domainRows.length} domains were found.`,
        domainRows.map((row) => row.domain_key),
      ),
    );
  }

  const runtimeDomainRow = domainRows[0] ?? null;
  const signalCount = signalRows.length;
  const derivedPairCount = getSingleDomainExpectedPairCount(signalCount);
  const expectedSignalKeys = signalRows.map((row) => row.signal_key);
  const expectedPairKeys = [...getSingleDomainCanonicalPairKeys(expectedSignalKeys)];
  const expectedLanguageRowCounts = buildLanguageExpectations({
    signalCount,
    derivedPairCount,
    domainKey: runtimeDomainRow?.domain_key ?? null,
    signalKeys: expectedSignalKeys,
    pairKeys: expectedPairKeys,
  });
  const languageRowCounts = createLanguageRowCounts(languageBundle);

  if (signalCount === 0) {
    issues.push(createIssue('missing_signals', 'signals', 'At least one authored signal is required.'));
  }

  if (questionRows.length === 0) {
    issues.push(createIssue('missing_questions', 'questions', 'At least one authored question is required.'));
  }

  const signalDomainMismatches = runtimeDomainRow
    ? signalRows.filter((row) => row.domain_id !== runtimeDomainRow.domain_id)
    : [];
  if (signalDomainMismatches.length > 0) {
    issues.push(
      createIssue(
        'runtime_definition_incomplete',
        'runtime',
        'All authored signals must belong to the single authored domain.',
        signalDomainMismatches.map((row) => row.signal_key),
      ),
    );
  }

  const questionDomainMismatches = runtimeDomainRow
    ? questionRows.filter((row) => row.domain_id !== runtimeDomainRow.domain_id)
    : [];
  if (questionDomainMismatches.length > 0) {
    issues.push(
      createIssue(
        'question_domain_mismatch',
        'questions',
        'All authored questions must belong to the single authored domain.',
        questionDomainMismatches.map((row) => row.question_key),
      ),
    );
  }

  const signals: readonly SingleDomainRuntimeSignal[] = Object.freeze(
    signalRows.map((row) => Object.freeze({
      id: row.signal_id,
      key: row.signal_key,
      title: row.signal_label,
      description: row.signal_description,
      domainId: row.domain_id,
      orderIndex: row.signal_order_index,
    })),
  );
  const signalById = new Map(signals.map((signal) => [signal.id, signal]));

  const signalByKey = new Map(signals.map((signal) => [signal.key, signal]));
  const derivedPairKeys = [...getSingleDomainCanonicalPairKeys(signals.map((signal) => signal.key))];
  const derivedPairs: readonly SingleDomainRuntimeDerivedPair[] = Object.freeze(
    derivedPairKeys.flatMap((pairKey, index) => {
      const [leftSignalKey, rightSignalKey] = pairKey.split('_');
      const leftSignal = leftSignalKey ? signalByKey.get(leftSignalKey) : null;
      const rightSignal = rightSignalKey ? signalByKey.get(rightSignalKey) : null;
      if (!leftSignal || !rightSignal) {
        return [];
      }

      return [Object.freeze({
        pairKey,
        leftSignalId: leftSignal.id,
        leftSignalKey: leftSignal.key,
        leftSignalTitle: leftSignal.title,
        rightSignalId: rightSignal.id,
        rightSignalKey: rightSignal.key,
        rightSignalTitle: rightSignal.title,
        orderIndex: index,
      })];
    }),
  );

  const optionWeightsByOptionId = new Map<string, SingleDomainRuntimeOptionSignalWeight[]>();
  for (const row of weightRows) {
    if (!row.signal_id || !row.signal_key || !signalById.has(row.signal_id)) {
      issues.push(
        createIssue(
          'weight_signal_unresolved',
          'weights',
          'Every option-to-signal weight must resolve to a current authored signal.',
          row.signal_key ? [row.signal_key] : undefined,
        ),
      );
      continue;
    }

    const weights = optionWeightsByOptionId.get(row.option_id) ?? [];
    weights.push(Object.freeze({
      id: row.option_signal_weight_id,
      optionId: row.option_id,
      signalId: row.signal_id,
      signalKey: row.signal_key,
      weight: Number(row.weight),
      reverseFlag: false,
      sourceWeightKey: row.source_weight_key,
    }));
    optionWeightsByOptionId.set(row.option_id, weights);
  }

  const questionsById = new Map<string, SingleDomainRuntimeQuestion>();
  for (const row of questionRows) {
    questionsById.set(row.question_id, {
      id: row.question_id,
      key: row.question_key,
      prompt: row.prompt,
      domainId: row.domain_id,
      domainKey: row.domain_key,
      orderIndex: row.question_order_index,
      options: Object.freeze([]),
    });
  }

  const optionsByQuestionId = new Map<string, SingleDomainRuntimeOption[]>();
  let orphanOptionCount = 0;

  for (const row of optionRows) {
    if (!row.question_id || !questionsById.has(row.question_id)) {
      orphanOptionCount += 1;
      issues.push(
        createIssue(
          'orphan_option',
          'options',
          'Every authored option must resolve to an authored question in the same draft.',
          [row.option_key],
        ),
      );
      continue;
    }

    const option: SingleDomainRuntimeOption = Object.freeze({
      id: row.option_id,
      key: row.option_key,
      label: row.option_text,
      description: row.option_label,
      questionId: row.question_id,
      orderIndex: row.option_order_index,
      signalWeights: Object.freeze([...(optionWeightsByOptionId.get(row.option_id) ?? [])]),
    });
    const current = optionsByQuestionId.get(row.question_id) ?? [];
    current.push(option);
    optionsByQuestionId.set(row.question_id, current);
  }

  const questions: readonly SingleDomainRuntimeQuestion[] = Object.freeze(
    questionRows.map((row) => {
      const options = Object.freeze(
        [...(optionsByQuestionId.get(row.question_id) ?? [])].sort(
          (left, right) => left.orderIndex - right.orderIndex || left.id.localeCompare(right.id),
        ),
      );

      return Object.freeze({
        id: row.question_id,
        key: row.question_key,
        prompt: row.prompt,
        domainId: row.domain_id,
        domainKey: row.domain_key,
        orderIndex: row.question_order_index,
        options,
      });
    }),
  );

  const allOptions = questions.flatMap((question) => question.options);
  const allWeights = allOptions.flatMap((option) => option.signalWeights);
  const blankOptionTextOptions = allOptions.filter((option) => option.label.trim().length === 0);

  const questionsWithoutOptions = questions.filter((question) => question.options.length === 0);
  if (questionsWithoutOptions.length > 0) {
    issues.push(
      createIssue(
        questions.length === 0 ? 'missing_options' : 'question_without_options',
        'options',
        questions.length === 0
          ? 'Questions exist, but no authored options were found.'
          : 'Every authored question must include at least one option.',
        questionsWithoutOptions.map((question) => question.key),
      ),
    );
  }

  const optionsWithoutWeights = allOptions.filter((option) => option.signalWeights.length === 0);
  if (allOptions.length === 0 && questions.length > 0) {
    issues.push(createIssue('missing_options', 'options', 'Questions exist, but no authored options were found.'));
  }
  if (allWeights.length === 0 && allOptions.length > 0) {
    issues.push(createIssue('missing_weights', 'weights', 'Options exist, but no option-to-signal weights were found.'));
  }
  if (blankOptionTextOptions.length > 0) {
    issues.push(
      createIssue(
        'runtime_definition_incomplete',
        'options',
        'Every authored option must include non-empty response text.',
        blankOptionTextOptions.map((option) => option.key),
      ),
    );
  }
  if (optionsWithoutWeights.length > 0) {
    issues.push(
      createIssue(
        'option_without_weights',
        'weights',
        'Every authored option must include at least one option-to-signal weight.',
        optionsWithoutWeights.map((option) => option.key),
      ),
    );
  }

  validateLanguageKeys({
    domainKey: runtimeDomainRow?.domain_key ?? null,
    signalKeys: expectedSignalKeys,
    pairKeys: derivedPairKeys,
    languageBundle,
    issues,
  });

  if (languageRowCounts.DOMAIN_FRAMING < expectedLanguageRowCounts.DOMAIN_FRAMING) {
    issues.push(
      createIssue(
        'domain_framing_count_mismatch',
        'language',
        'DOMAIN_FRAMING must contain at least 1 row for the single authored domain.',
      ),
    );
  }
  if (languageRowCounts.HERO_PAIRS > expectedLanguageRowCounts.HERO_PAIRS) {
    issues.push(
      createIssue(
        'hero_pairs_count_mismatch',
        'language',
        `HERO_PAIRS must contain no more than ${expectedLanguageRowCounts.HERO_PAIRS} signal-derived pair row${expectedLanguageRowCounts.HERO_PAIRS === 1 ? '' : 's'}. Missing pairs use runtime fallback language.`,
      ),
    );
  }
  if (languageRowCounts.DRIVER_CLAIMS !== expectedLanguageRowCounts.DRIVER_CLAIMS) {
    issues.push(
      createIssue(
        'driver_claims_count_mismatch',
        'language',
        `DRIVER_CLAIMS should contain exactly ${expectedLanguageRowCounts.DRIVER_CLAIMS} exact runtime tuple row${expectedLanguageRowCounts.DRIVER_CLAIMS === 1 ? '' : 's'}.`,
      ),
    );
  }
  if (languageRowCounts.BALANCING_SECTIONS > expectedLanguageRowCounts.BALANCING_SECTIONS) {
    issues.push(
      createIssue(
        'balancing_sections_count_mismatch',
        'language',
        `BALANCING_SECTIONS must contain no more than ${expectedLanguageRowCounts.BALANCING_SECTIONS} signal-derived pair row${expectedLanguageRowCounts.BALANCING_SECTIONS === 1 ? '' : 's'}. Missing pairs use runtime fallback language.`,
      ),
    );
  }
  if (languageRowCounts.PAIR_SUMMARIES > expectedLanguageRowCounts.PAIR_SUMMARIES) {
    issues.push(
      createIssue(
        'pair_summaries_count_mismatch',
        'language',
        `PAIR_SUMMARIES must contain no more than ${expectedLanguageRowCounts.PAIR_SUMMARIES} signal-derived pair row${expectedLanguageRowCounts.PAIR_SUMMARIES === 1 ? '' : 's'}. Missing pairs use runtime fallback language.`,
      ),
    );
  }
  if (languageRowCounts.APPLICATION_STATEMENTS !== expectedLanguageRowCounts.APPLICATION_STATEMENTS) {
    issues.push(
      createIssue(
        'application_statements_count_mismatch',
        'language',
        `APPLICATION_STATEMENTS must contain exactly ${expectedLanguageRowCounts.APPLICATION_STATEMENTS} row${expectedLanguageRowCounts.APPLICATION_STATEMENTS === 1 ? '' : 's'}.`,
      ),
    );
  }

  const counts: SingleDomainDraftReadinessCounts = {
    domainCount: domainRows.length,
    signalCount,
    derivedPairCount: derivedPairs.length,
    questionCount: questions.length,
    optionCount: allOptions.length,
    weightCount: allWeights.length,
    questionsWithoutOptionsCount: questionsWithoutOptions.length,
    optionsWithoutWeightsCount: optionsWithoutWeights.length,
    orphanOptionCount,
    unresolvedWeightSignalCount: weightRows.length - allWeights.length,
    languageRowCounts,
  };

  const expectations: SingleDomainDraftReadinessExpectations = {
    requiredDomainCount: 1,
    minimumSignalCount: 1,
    minimumQuestionCount: 1,
    expectedDerivedPairCount: getSingleDomainExpectedPairCount(signalCount),
    expectedLanguageRowCounts,
  };

  if (
    counts.domainCount === 1
    && counts.derivedPairCount !== expectations.expectedDerivedPairCount
  ) {
    issues.push(
      createIssue(
        'runtime_definition_incomplete',
        'runtime',
        'Derived pair count does not match the current authored signal count.',
        [...expectedPairKeys],
      ),
    );
  }

  const metadata: SingleDomainRuntimeMetadata = {
    assessmentId: context.assessment_id,
    assessmentKey: context.assessment_key,
    assessmentTitle: context.assessment_title,
    assessmentVersionId: context.assessment_version_id,
    assessmentVersionTag: context.assessment_version_tag,
    mode: 'single_domain',
    assessmentDescription: context.assessment_description,
  };

  const domain: SingleDomainRuntimeDomain | null = runtimeDomainRow
    ? {
        id: runtimeDomainRow.domain_id,
        key: runtimeDomainRow.domain_key,
        title: runtimeDomainRow.domain_label,
        description: runtimeDomainRow.domain_description,
        orderIndex: runtimeDomainRow.domain_order_index,
      }
    : null;

  const runtimeDefinition = domain
    ? createRuntimeDefinition({
        metadata,
        domain,
        signals,
        derivedPairs,
        questions,
        optionSignalWeights: allWeights,
        languageBundle,
        counts,
        expectations,
        issues,
      })
    : null;

  return {
    runtimeDefinition,
    issues: Object.freeze(issues),
    counts,
    expectations,
  };
}

export async function loadSingleDomainRuntimeDefinition(
  db: Queryable,
  assessmentVersionId: string,
): Promise<SingleDomainRuntimeDefinition> {
  const evaluation = await evaluateSingleDomainRuntimeDefinition(db, assessmentVersionId);

  if (!evaluation.runtimeDefinition) {
    throw new SingleDomainRuntimeDefinitionError(
      evaluation.issues[0]
        ?? createIssue(
          'runtime_definition_incomplete',
          'runtime',
          'Single-domain runtime definition could not be assembled.',
        ),
      evaluation.issues,
    );
  }

  return evaluation.runtimeDefinition;
}
