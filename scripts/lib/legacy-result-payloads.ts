import type { Queryable } from '@/lib/engine/repository-sql';

export const EXACT_LEGACY_HERO_HEADLINE = 'A clear operating preference is coming through';

export type ReadyResultAuditRow = {
  result_id: string;
  attempt_id: string | null;
  user_id: string | null;
  assessment_id: string;
  assessment_version_id: string;
  assessment_key: string | null;
  assessment_title: string | null;
  version_tag: string | null;
  attempt_lifecycle_status: string | null;
  pipeline_status: string;
  readiness_status: string;
  generated_at: string | null;
  created_at: string;
  response_count: string | number;
  answered_question_count: string | number;
  question_count: string | number;
  overview_language_row_count: string | number;
  version_signal_keys: readonly string[] | null;
  version_domain_keys: readonly string[] | null;
  canonical_result_payload: unknown;
};

export type LegacyPayloadSignatureSet = {
  exactLegacyHeroHeadline: boolean;
  legacyHeroHeadlineVariant: boolean;
  missingOverviewLanguageRows: boolean;
  heroPrimarySignalKey: string | null;
  heroPrimarySignalMissingFromVersion: boolean;
  payloadSignalKeys: readonly string[];
  payloadDomainKeys: readonly string[];
  unexpectedSignalKeys: readonly string[];
  unexpectedDomainKeys: readonly string[];
};

export type LegacyPayloadAuditFinding = {
  resultId: string;
  attemptId: string | null;
  userId: string | null;
  assessmentId: string;
  assessmentVersionId: string;
  assessmentKey: string | null;
  assessmentTitle: string | null;
  versionTag: string | null;
  attemptLifecycleStatus: string | null;
  pipelineStatus: string;
  readinessStatus: string;
  generatedAt: string | null;
  createdAt: string;
  responseCount: number;
  answeredQuestionCount: number;
  questionCount: number;
  overviewLanguageRowCount: number;
  validationErrors: readonly string[];
  signatures: LegacyPayloadSignatureSet;
  remediationClass: 'rebuildable' | 'quarantine_only';
  remediationReason: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isNullableString(value: unknown): value is string | null {
  return value === null || typeof value === 'string';
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function hasStringField(record: Record<string, unknown>, key: string): boolean {
  return typeof record[key] === 'string' && record[key]!.length > 0;
}

function toSortedUniqueStrings(values: Iterable<string>): readonly string[] {
  return Object.freeze(Array.from(new Set(values)).sort((left, right) => left.localeCompare(right)));
}

function asStringArray(value: readonly string[] | null | undefined): readonly string[] {
  return Array.isArray(value)
    ? Object.freeze(
        value
          .filter((entry): entry is string => typeof entry === 'string')
          .slice()
          .sort((left, right) => left.localeCompare(right)),
      )
    : Object.freeze([]);
}

function validateSignalLanguageNode(
  value: unknown,
  label: string,
): readonly string[] {
  const errors: string[] = [];

  if (value === null) {
    return errors;
  }

  if (!isRecord(value)) {
    return [`${label} must be an object or null`];
  }

  if (!hasStringField(value, 'signalKey')) {
    errors.push(`${label}.signalKey must be a non-empty string`);
  }
  if (!hasStringField(value, 'signalLabel')) {
    errors.push(`${label}.signalLabel must be a non-empty string`);
  }
  if (!isNullableString(value.summary)) {
    errors.push(`${label}.summary must be a string or null`);
  }
  if (!isNullableString(value.strength)) {
    errors.push(`${label}.strength must be a string or null`);
  }
  if (!isNullableString(value.watchout)) {
    errors.push(`${label}.watchout must be a string or null`);
  }
  if (!isNullableString(value.development)) {
    errors.push(`${label}.development must be a string or null`);
  }

  return errors;
}

export function validateCanonicalPayload(value: unknown): readonly string[] {
  const errors: string[] = [];

  if (!isRecord(value)) {
    return ['payload must be an object'];
  }

  const requiredTopLevelFields = ['metadata', 'intro', 'hero', 'domains', 'actions', 'diagnostics'] as const;
  for (const field of requiredTopLevelFields) {
    if (!(field in value)) {
      errors.push(`missing top-level field: ${field}`);
    }
  }

  const metadata = value.metadata;
  if (!isRecord(metadata)) {
    errors.push('metadata must be an object');
  } else {
    if (!hasStringField(metadata, 'assessmentKey')) {
      errors.push('metadata.assessmentKey must be a non-empty string');
    }
    if (!hasStringField(metadata, 'assessmentTitle')) {
      errors.push('metadata.assessmentTitle must be a non-empty string');
    }
    if (!hasStringField(metadata, 'version')) {
      errors.push('metadata.version must be a non-empty string');
    }
    if (!hasStringField(metadata, 'attemptId')) {
      errors.push('metadata.attemptId must be a non-empty string');
    }
    if (!isNullableString(metadata.completedAt)) {
      errors.push('metadata.completedAt must be a string or null');
    }
    if ('assessmentDescription' in metadata && !isNullableString(metadata.assessmentDescription)) {
      errors.push('metadata.assessmentDescription must be a string or null when present');
    }
  }

  const intro = value.intro;
  if (!isRecord(intro)) {
    errors.push('intro must be an object');
  } else if (!isNullableString(intro.assessmentDescription)) {
    errors.push('intro.assessmentDescription must be a string or null');
  }

  const hero = value.hero;
  if (!isRecord(hero)) {
    errors.push('hero must be an object');
  } else {
    if (!isNullableString(hero.headline)) {
      errors.push('hero.headline must be a string or null');
    }
    if (!isNullableString(hero.narrative)) {
      errors.push('hero.narrative must be a string or null');
    }

    if (hero.primaryPattern !== null) {
      if (!isRecord(hero.primaryPattern)) {
        errors.push('hero.primaryPattern must be an object or null');
      } else {
        if (!isNullableString(hero.primaryPattern.label)) {
          errors.push('hero.primaryPattern.label must be a string or null');
        }
        if (!isNullableString(hero.primaryPattern.signalKey)) {
          errors.push('hero.primaryPattern.signalKey must be a string or null');
        }
        if (!isNullableString(hero.primaryPattern.signalLabel)) {
          errors.push('hero.primaryPattern.signalLabel must be a string or null');
        }
      }
    }

    if (!Array.isArray(hero.domainHighlights)) {
      errors.push('hero.domainHighlights must be an array');
    } else {
      hero.domainHighlights.forEach((item, index) => {
        if (!isRecord(item)) {
          errors.push(`hero.domainHighlights[${index}] must be an object`);
          return;
        }

        if (!hasStringField(item, 'domainKey')) {
          errors.push(`hero.domainHighlights[${index}].domainKey must be a non-empty string`);
        }
        if (!hasStringField(item, 'domainLabel')) {
          errors.push(`hero.domainHighlights[${index}].domainLabel must be a non-empty string`);
        }
        if (!hasStringField(item, 'primarySignalKey')) {
          errors.push(`hero.domainHighlights[${index}].primarySignalKey must be a non-empty string`);
        }
        if (!hasStringField(item, 'primarySignalLabel')) {
          errors.push(`hero.domainHighlights[${index}].primarySignalLabel must be a non-empty string`);
        }
        if (!isNullableString(item.summary)) {
          errors.push(`hero.domainHighlights[${index}].summary must be a string or null`);
        }
      });
    }
  }

  if (!Array.isArray(value.domains)) {
    errors.push('domains must be an array');
  } else {
    value.domains.forEach((domain, index) => {
      if (!isRecord(domain)) {
        errors.push(`domains[${index}] must be an object`);
        return;
      }

      if (!hasStringField(domain, 'domainKey')) {
        errors.push(`domains[${index}].domainKey must be a non-empty string`);
      }
      if (!hasStringField(domain, 'domainLabel')) {
        errors.push(`domains[${index}].domainLabel must be a non-empty string`);
      }
      if (!isNullableString(domain.chapterOpening)) {
        errors.push(`domains[${index}].chapterOpening must be a string or null`);
      }
      if (!isNullableString(domain.pressureFocus)) {
        errors.push(`domains[${index}].pressureFocus must be a string or null`);
      }
      if (!isNullableString(domain.environmentFocus)) {
        errors.push(`domains[${index}].environmentFocus must be a string or null`);
      }
      if (!isRecord(domain.signalBalance)) {
        errors.push(`domains[${index}].signalBalance must be an object`);
      } else if (!Array.isArray(domain.signalBalance.items)) {
        errors.push(`domains[${index}].signalBalance.items must be an array`);
      }

      errors.push(...validateSignalLanguageNode(domain.primarySignal, `domains[${index}].primarySignal`));
      errors.push(...validateSignalLanguageNode(domain.secondarySignal, `domains[${index}].secondarySignal`));

      if (domain.signalPair !== null) {
        if (!isRecord(domain.signalPair)) {
          errors.push(`domains[${index}].signalPair must be an object or null`);
        } else {
          if (!hasStringField(domain.signalPair, 'pairKey')) {
            errors.push(`domains[${index}].signalPair.pairKey must be a non-empty string`);
          }
          if (!hasStringField(domain.signalPair, 'primarySignalKey')) {
            errors.push(`domains[${index}].signalPair.primarySignalKey must be a non-empty string`);
          }
          if (!hasStringField(domain.signalPair, 'primarySignalLabel')) {
            errors.push(`domains[${index}].signalPair.primarySignalLabel must be a non-empty string`);
          }
          if (!hasStringField(domain.signalPair, 'secondarySignalKey')) {
            errors.push(`domains[${index}].signalPair.secondarySignalKey must be a non-empty string`);
          }
          if (!hasStringField(domain.signalPair, 'secondarySignalLabel')) {
            errors.push(`domains[${index}].signalPair.secondarySignalLabel must be a non-empty string`);
          }
          if (!isNullableString(domain.signalPair.summary)) {
            errors.push(`domains[${index}].signalPair.summary must be a string or null`);
          }
        }
      }

      const signalBalanceItems = isRecord(domain.signalBalance) && Array.isArray(domain.signalBalance.items)
        ? domain.signalBalance.items
        : null;

      if (!signalBalanceItems) {
        errors.push(`domains[${index}].signalBalance.items must be an array`);
      } else {
        signalBalanceItems.forEach((signal, signalIndex) => {
          if (!isRecord(signal)) {
            errors.push(`domains[${index}].signalBalance.items[${signalIndex}] must be an object`);
            return;
          }

          if (!hasStringField(signal, 'signalKey')) {
            errors.push(`domains[${index}].signalBalance.items[${signalIndex}].signalKey must be a non-empty string`);
          }
          if (!hasStringField(signal, 'signalLabel')) {
            errors.push(`domains[${index}].signalBalance.items[${signalIndex}].signalLabel must be a non-empty string`);
          }
          if (!isFiniteNumber(signal.withinDomainPercent)) {
            errors.push(`domains[${index}].signalBalance.items[${signalIndex}].withinDomainPercent must be a finite number`);
          }
          if (!isFiniteNumber(signal.rank)) {
            errors.push(`domains[${index}].signalBalance.items[${signalIndex}].rank must be a finite number`);
          }
          if (typeof signal.isPrimary !== 'boolean') {
            errors.push(`domains[${index}].signalBalance.items[${signalIndex}].isPrimary must be a boolean`);
          }
          if (typeof signal.isSecondary !== 'boolean') {
            errors.push(`domains[${index}].signalBalance.items[${signalIndex}].isSecondary must be a boolean`);
          }
          if (!isNullableString(signal.summary)) {
            errors.push(`domains[${index}].signalBalance.items[${signalIndex}].summary must be a string or null`);
          }
        });
      }
    });
  }

  const actions = value.actions;
  if (!isRecord(actions)) {
    errors.push('actions must be an object');
  } else {
    (['strengths', 'watchouts', 'developmentFocus'] as const).forEach((blockKey) => {
      const block = actions[blockKey];
      if (!Array.isArray(block)) {
        errors.push(`actions.${blockKey} must be an array`);
        return;
      }

      block.forEach((item, index) => {
        if (!isRecord(item)) {
          errors.push(`actions.${blockKey}[${index}] must be an object`);
          return;
        }
        if (!hasStringField(item, 'signalKey')) {
          errors.push(`actions.${blockKey}[${index}].signalKey must be a non-empty string`);
        }
        if (!hasStringField(item, 'signalLabel')) {
          errors.push(`actions.${blockKey}[${index}].signalLabel must be a non-empty string`);
        }
        if (!hasStringField(item, 'text')) {
          errors.push(`actions.${blockKey}[${index}].text must be a non-empty string`);
        }
      });
    });
  }

  const diagnostics = value.diagnostics;
  if (!isRecord(diagnostics)) {
    errors.push('diagnostics must be an object');
  } else {
    if (!hasStringField(diagnostics, 'readinessStatus')) {
      errors.push('diagnostics.readinessStatus must be a non-empty string');
    }
    if (!isRecord(diagnostics.scoring)) {
      errors.push('diagnostics.scoring must be an object');
    }
    if (!isRecord(diagnostics.normalization)) {
      errors.push('diagnostics.normalization must be an object');
    }
    if (!isFiniteNumber(diagnostics.answeredQuestionCount)) {
      errors.push('diagnostics.answeredQuestionCount must be a finite number');
    }
    if (!isFiniteNumber(diagnostics.totalQuestionCount)) {
      errors.push('diagnostics.totalQuestionCount must be a finite number');
    }
    if (!Array.isArray(diagnostics.missingQuestionIds)) {
      errors.push('diagnostics.missingQuestionIds must be an array');
    }
    if (!hasStringField(diagnostics, 'topSignalSelectionBasis')) {
      errors.push('diagnostics.topSignalSelectionBasis must be a non-empty string');
    }
    if (!isFiniteNumber(diagnostics.rankedSignalCount)) {
      errors.push('diagnostics.rankedSignalCount must be a finite number');
    }
    if (!isFiniteNumber(diagnostics.domainCount)) {
      errors.push('diagnostics.domainCount must be a finite number');
    }
    if (typeof diagnostics.zeroMass !== 'boolean') {
      errors.push('diagnostics.zeroMass must be a boolean');
    }
    if (typeof diagnostics.zeroMassTopSignalFallbackApplied !== 'boolean') {
      errors.push('diagnostics.zeroMassTopSignalFallbackApplied must be a boolean');
    }
    if (!Array.isArray(diagnostics.warnings)) {
      errors.push('diagnostics.warnings must be an array');
    }
    if (!hasStringField(diagnostics, 'generatedAt')) {
      errors.push('diagnostics.generatedAt must be a non-empty string');
    }
  }

  return errors;
}

function extractPayloadDomainKeys(payload: unknown): readonly string[] {
  if (!isRecord(payload) || !Array.isArray(payload.domains)) {
    return Object.freeze([]);
  }

  return toSortedUniqueStrings(
    payload.domains.flatMap((domain) => {
      if (!isRecord(domain) || typeof domain.domainKey !== 'string' || domain.domainKey.trim().length === 0) {
        return [];
      }
      return [domain.domainKey.trim()];
    }),
  );
}

function extractPayloadSignalKeys(payload: unknown): readonly string[] {
  if (!isRecord(payload) || !Array.isArray(payload.domains)) {
    return Object.freeze([]);
  }

  return toSortedUniqueStrings(
    payload.domains.flatMap((domain) => {
      if (!isRecord(domain) || !isRecord(domain.signalBalance) || !Array.isArray(domain.signalBalance.items)) {
        return [];
      }

      return domain.signalBalance.items.flatMap((signal) => {
        if (!isRecord(signal) || typeof signal.signalKey !== 'string' || signal.signalKey.trim().length === 0) {
          return [];
        }
        return [signal.signalKey.trim()];
      });
    }),
  );
}

function extractHeroPrimarySignalKey(payload: unknown): string | null {
  if (!isRecord(payload) || !isRecord(payload.hero) || !isRecord(payload.hero.primaryPattern)) {
    return null;
  }

  return typeof payload.hero.primaryPattern.signalKey === 'string' && payload.hero.primaryPattern.signalKey.trim().length > 0
    ? payload.hero.primaryPattern.signalKey.trim()
    : null;
}

function extractHeroHeadline(payload: unknown): string | null {
  if (!isRecord(payload) || !isRecord(payload.hero)) {
    return null;
  }

  return typeof payload.hero.headline === 'string' ? payload.hero.headline.trim() : null;
}

function classifyRemediation(row: ReadyResultAuditRow, validationErrors: readonly string[]): {
  remediationClass: 'rebuildable' | 'quarantine_only';
  remediationReason: string;
} {
  const questionCount = Number(row.question_count);

  if (!row.attempt_id) {
    return {
      remediationClass: 'quarantine_only',
      remediationReason: 'missing_attempt_reference',
    };
  }

  if (!row.user_id) {
    return {
      remediationClass: 'quarantine_only',
      remediationReason: 'missing_user_reference',
    };
  }

  if (!row.assessment_version_id || !row.version_tag) {
    return {
      remediationClass: 'quarantine_only',
      remediationReason: 'missing_assessment_version_reference',
    };
  }

  if (!(questionCount > 0)) {
    return {
      remediationClass: 'quarantine_only',
      remediationReason: 'assessment_version_has_no_questions',
    };
  }

  return {
    remediationClass: 'rebuildable',
    remediationReason:
      validationErrors.length > 0
        ? 'attempt_and_version_basis_still_present'
        : 'attempt_and_version_basis_still_present_for_legacy_payload',
  };
}

export function analyzeReadyResultRow(row: ReadyResultAuditRow): LegacyPayloadAuditFinding | null {
  const validationErrors = validateCanonicalPayload(row.canonical_result_payload);
  const payloadSignalKeys = extractPayloadSignalKeys(row.canonical_result_payload);
  const payloadDomainKeys = extractPayloadDomainKeys(row.canonical_result_payload);
  const heroPrimarySignalKey = extractHeroPrimarySignalKey(row.canonical_result_payload);
  const heroHeadline = extractHeroHeadline(row.canonical_result_payload);

  const versionSignalKeys = new Set(asStringArray(row.version_signal_keys));
  const versionDomainKeys = new Set(asStringArray(row.version_domain_keys));
  const unexpectedSignalKeys = payloadSignalKeys.filter((signalKey) => !versionSignalKeys.has(signalKey));
  const unexpectedDomainKeys = payloadDomainKeys.filter((domainKey) => !versionDomainKeys.has(domainKey));
  const overviewLanguageRowCount = Number(row.overview_language_row_count);

  const signatures: LegacyPayloadSignatureSet = {
    exactLegacyHeroHeadline: heroHeadline === EXACT_LEGACY_HERO_HEADLINE,
    legacyHeroHeadlineVariant:
      typeof heroHeadline === 'string' &&
      heroHeadline.length > 0 &&
      heroHeadline !== EXACT_LEGACY_HERO_HEADLINE &&
      heroHeadline.toLowerCase().includes('operating preference'),
    missingOverviewLanguageRows: !(overviewLanguageRowCount > 0),
    heroPrimarySignalKey,
    heroPrimarySignalMissingFromVersion:
      heroPrimarySignalKey !== null &&
      heroPrimarySignalKey.length > 0 &&
      !versionSignalKeys.has(heroPrimarySignalKey),
    payloadSignalKeys,
    payloadDomainKeys,
    unexpectedSignalKeys: Object.freeze(unexpectedSignalKeys),
    unexpectedDomainKeys: Object.freeze(unexpectedDomainKeys),
  };

  const hasLegacySignature =
    signatures.exactLegacyHeroHeadline ||
    signatures.legacyHeroHeadlineVariant ||
    signatures.heroPrimarySignalMissingFromVersion ||
    signatures.unexpectedSignalKeys.length > 0 ||
    signatures.unexpectedDomainKeys.length > 0;

  if (!hasLegacySignature && validationErrors.length === 0) {
    return null;
  }

  const remediation = classifyRemediation(row, validationErrors);

  return {
    resultId: row.result_id,
    attemptId: row.attempt_id,
    userId: row.user_id,
    assessmentId: row.assessment_id,
    assessmentVersionId: row.assessment_version_id,
    assessmentKey: row.assessment_key,
    assessmentTitle: row.assessment_title,
    versionTag: row.version_tag,
    attemptLifecycleStatus: row.attempt_lifecycle_status,
    pipelineStatus: row.pipeline_status,
    readinessStatus: row.readiness_status,
    generatedAt: row.generated_at,
    createdAt: row.created_at,
    responseCount: Number(row.response_count),
    answeredQuestionCount: Number(row.answered_question_count),
    questionCount: Number(row.question_count),
    overviewLanguageRowCount,
    validationErrors,
    signatures,
    remediationClass: remediation.remediationClass,
    remediationReason: remediation.remediationReason,
  };
}

export async function queryReadyResultAuditRows(
  db: Queryable,
  params?: {
    resultIds?: readonly string[];
  },
): Promise<readonly ReadyResultAuditRow[]> {
  const filterByIds = Array.isArray(params?.resultIds) && params.resultIds.length > 0;
  const queryParams: unknown[] = [];

  let idFilterSql = '';
  if (filterByIds) {
    queryParams.push(params?.resultIds);
    idFilterSql = `
      AND r.id = ANY($1::uuid[])
    `;
  }

  const result = await db.query<ReadyResultAuditRow>(
    `
    SELECT
      r.id AS result_id,
      r.attempt_id,
      t.user_id,
      r.assessment_id,
      r.assessment_version_id,
      a.assessment_key,
      a.title AS assessment_title,
      av.version AS version_tag,
      t.lifecycle_status AS attempt_lifecycle_status,
      r.pipeline_status,
      r.readiness_status,
      r.generated_at,
      r.created_at,
      COALESCE(response_stats.response_count, 0) AS response_count,
      COALESCE(response_stats.answered_question_count, 0) AS answered_question_count,
      COALESCE(question_stats.question_count, 0) AS question_count,
      COALESCE(overview_stats.overview_language_row_count, 0) AS overview_language_row_count,
      signal_stats.version_signal_keys,
      domain_stats.version_domain_keys,
      r.canonical_result_payload
    FROM results r
    LEFT JOIN attempts t ON t.id = r.attempt_id
    LEFT JOIN assessments a ON a.id = r.assessment_id
    LEFT JOIN assessment_versions av ON av.id = r.assessment_version_id
    LEFT JOIN LATERAL (
      SELECT
        COUNT(*) AS response_count,
        COUNT(DISTINCT question_id) AS answered_question_count
      FROM responses resp
      WHERE resp.attempt_id = r.attempt_id
    ) response_stats ON TRUE
    LEFT JOIN LATERAL (
      SELECT COUNT(*) AS question_count
      FROM questions q
      WHERE q.assessment_version_id = r.assessment_version_id
    ) question_stats ON TRUE
    LEFT JOIN LATERAL (
      SELECT COUNT(*) AS overview_language_row_count
      FROM assessment_version_language_overview overview
      WHERE overview.assessment_version_id = r.assessment_version_id
    ) overview_stats ON TRUE
    LEFT JOIN LATERAL (
      SELECT COALESCE(array_agg(DISTINCT s.signal_key ORDER BY s.signal_key), ARRAY[]::text[]) AS version_signal_keys
      FROM signals s
      WHERE s.assessment_version_id = r.assessment_version_id
    ) signal_stats ON TRUE
    LEFT JOIN LATERAL (
      SELECT COALESCE(array_agg(DISTINCT d.domain_key ORDER BY d.domain_key), ARRAY[]::text[]) AS version_domain_keys
      FROM domains d
      WHERE d.assessment_version_id = r.assessment_version_id
    ) domain_stats ON TRUE
    WHERE r.readiness_status = 'READY'
      AND r.canonical_result_payload IS NOT NULL
      ${idFilterSql}
    ORDER BY COALESCE(r.generated_at, r.created_at) DESC, r.id DESC
    `,
    queryParams,
  );

  return Object.freeze(result.rows);
}

export async function findLegacyReadyResultPayloads(
  db: Queryable,
  params?: {
    resultIds?: readonly string[];
  },
): Promise<readonly LegacyPayloadAuditFinding[]> {
  const rows = await queryReadyResultAuditRows(db, params);

  return Object.freeze(
    rows
      .map((row) => analyzeReadyResultRow(row))
      .filter((row): row is LegacyPayloadAuditFinding => row !== null),
  );
}
