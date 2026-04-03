import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { Pool } from 'pg';

type AuditRow = {
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
  canonical_result_payload: unknown;
};

type MalformedAuditFinding = {
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
  validationErrors: readonly string[];
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

function validateCanonicalPayload(value: unknown): readonly string[] {
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
      if (!isNullableString(domain.summary)) {
        errors.push(`domains[${index}].summary must be a string or null`);
      }
      if (!isNullableString(domain.focus)) {
        errors.push(`domains[${index}].focus must be a string or null`);
      }
      if (!isNullableString(domain.pressure)) {
        errors.push(`domains[${index}].pressure must be a string or null`);
      }
      if (!isNullableString(domain.environment)) {
        errors.push(`domains[${index}].environment must be a string or null`);
      }

      errors.push(...validateSignalLanguageNode(domain.primarySignal, `domains[${index}].primarySignal`));
      errors.push(...validateSignalLanguageNode(domain.secondarySignal, `domains[${index}].secondarySignal`));

      if (domain.pairSummary !== null) {
        if (!isRecord(domain.pairSummary)) {
          errors.push(`domains[${index}].pairSummary must be an object or null`);
        } else {
          if (!hasStringField(domain.pairSummary, 'pairKey')) {
            errors.push(`domains[${index}].pairSummary.pairKey must be a non-empty string`);
          }
          if (!isNullableString(domain.pairSummary.text)) {
            errors.push(`domains[${index}].pairSummary.text must be a string or null`);
          }
        }
      }

      if (!Array.isArray(domain.signals)) {
        errors.push(`domains[${index}].signals must be an array`);
      } else {
        domain.signals.forEach((signal, signalIndex) => {
          if (!isRecord(signal)) {
            errors.push(`domains[${index}].signals[${signalIndex}] must be an object`);
            return;
          }

          if (!hasStringField(signal, 'signalKey')) {
            errors.push(`domains[${index}].signals[${signalIndex}].signalKey must be a non-empty string`);
          }
          if (!hasStringField(signal, 'signalLabel')) {
            errors.push(`domains[${index}].signals[${signalIndex}].signalLabel must be a non-empty string`);
          }
          if (!isFiniteNumber(signal.score)) {
            errors.push(`domains[${index}].signals[${signalIndex}].score must be a finite number`);
          }
          if (!isFiniteNumber(signal.withinDomainPercent)) {
            errors.push(`domains[${index}].signals[${signalIndex}].withinDomainPercent must be a finite number`);
          }
          if (!isFiniteNumber(signal.rank)) {
            errors.push(`domains[${index}].signals[${signalIndex}].rank must be a finite number`);
          }
          if (typeof signal.isPrimary !== 'boolean') {
            errors.push(`domains[${index}].signals[${signalIndex}].isPrimary must be a boolean`);
          }
          if (typeof signal.isSecondary !== 'boolean') {
            errors.push(`domains[${index}].signals[${signalIndex}].isSecondary must be a boolean`);
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

function classifyRemediation(row: AuditRow, validationErrors: readonly string[]): {
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
        : 'payload_is_valid',
  };
}

function buildRemediationSteps(finding: MalformedAuditFinding): readonly string[] {
  if (finding.remediationClass === 'rebuildable') {
    return [
      `1. Quarantine result ${finding.resultId} by setting it to FAILED and clearing canonical_result_payload.`,
      `2. Move attempt ${finding.attemptId} to FAILED if it is currently RESULT_READY so completion can rerun cleanly.`,
      `3. Re-run assessment completion for attempt ${finding.attemptId} using the pinned assessment_version_id ${finding.assessmentVersionId}.`,
    ];
  }

  return [
    `1. Quarantine result ${finding.resultId} by setting it to FAILED and clearing canonical_result_payload.`,
    `2. Do not auto-rebuild attempt ${finding.attemptId ?? 'UNKNOWN'} because the required runtime basis is incomplete.`,
    '3. Investigate source data manually before any reconstruction attempt.',
  ];
}

async function main() {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error('DATABASE_URL is not set in .env.local');
  }

  const jsonOutput = process.argv.includes('--json');
  const pool = new Pool({
    connectionString: databaseUrl,
    ssl: { rejectUnauthorized: false },
  });

  try {
    const result = await pool.query<AuditRow>(
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
      WHERE r.readiness_status = 'READY'
        AND r.canonical_result_payload IS NOT NULL
      ORDER BY COALESCE(r.generated_at, r.created_at) DESC, r.id DESC
      `,
    );

    const malformedFindings = result.rows.flatMap<MalformedAuditFinding>((row) => {
      const validationErrors = validateCanonicalPayload(row.canonical_result_payload);
      if (validationErrors.length === 0) {
        return [];
      }

      const remediation = classifyRemediation(row, validationErrors);

      return [{
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
        validationErrors,
        remediationClass: remediation.remediationClass,
        remediationReason: remediation.remediationReason,
      }];
    });

    if (jsonOutput) {
      console.log(JSON.stringify({
        scannedReadyRows: result.rowCount ?? result.rows.length,
        malformedReadyRows: malformedFindings.length,
        rebuildableRows: malformedFindings.filter((row) => row.remediationClass === 'rebuildable').length,
        quarantineOnlyRows: malformedFindings.filter((row) => row.remediationClass === 'quarantine_only').length,
        findings: malformedFindings,
      }, null, 2));
      return;
    }

    console.log(`Scanned READY rows: ${result.rowCount ?? result.rows.length}`);
    console.log(`Malformed READY rows: ${malformedFindings.length}`);
    console.log(`Rebuildable rows: ${malformedFindings.filter((row) => row.remediationClass === 'rebuildable').length}`);
    console.log(`Quarantine-only rows: ${malformedFindings.filter((row) => row.remediationClass === 'quarantine_only').length}`);

    if (malformedFindings.length === 0) {
      console.log('\nNo malformed READY result payloads were found.');
      return;
    }

    console.log('\nMalformed READY result payloads:\n');
    for (const finding of malformedFindings) {
      console.log(`- result_id: ${finding.resultId}`);
      console.log(`  attempt_id: ${finding.attemptId ?? 'NULL'}`);
      console.log(`  user_id: ${finding.userId ?? 'NULL'}`);
      console.log(`  assessment_key: ${finding.assessmentKey ?? 'NULL'} (${finding.versionTag ?? 'NULL'})`);
      console.log(`  generated_at: ${finding.generatedAt ?? 'NULL'}`);
      console.log(`  response_count: ${finding.responseCount}`);
      console.log(`  answered_question_count: ${finding.answeredQuestionCount}`);
      console.log(`  question_count: ${finding.questionCount}`);
      console.log(`  remediation_class: ${finding.remediationClass}`);
      console.log(`  remediation_reason: ${finding.remediationReason}`);
      console.log(`  validation_errors:`);
      finding.validationErrors.forEach((error) => {
        console.log(`    - ${error}`);
      });
      console.log(`  recommended_steps:`);
      buildRemediationSteps(finding).forEach((step) => {
        console.log(`    - ${step}`);
      });
      console.log(`  quarantine_sql:`);
      console.log(`    UPDATE results`);
      console.log(`    SET pipeline_status = 'FAILED', readiness_status = 'FAILED', canonical_result_payload = NULL, failure_reason = 'legacy_malformed_payload_quarantined', generated_at = NULL, updated_at = NOW()`);
      console.log(`    WHERE id = '${finding.resultId}';`);
      if (finding.attemptId) {
        console.log(`    UPDATE attempts`);
        console.log(`    SET lifecycle_status = 'FAILED', completed_at = COALESCE(completed_at, NOW()), last_activity_at = NOW(), updated_at = NOW()`);
        console.log(`    WHERE id = '${finding.attemptId}' AND lifecycle_status = 'RESULT_READY';`);
      }
      console.log('');
    }
  } finally {
    await pool.end();
  }
}

main().catch((error) => {
  console.error('Legacy malformed result payload audit failed.');
  console.error(error);
  process.exit(1);
});
