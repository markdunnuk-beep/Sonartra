import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { Pool } from 'pg';

import {
  findLegacyReadyResultPayloads,
} from './lib/legacy-result-payloads';

function buildRemediationSteps(
  finding: Awaited<ReturnType<typeof findLegacyReadyResultPayloads>>[number],
): readonly string[] {
  if (finding.remediationClass === 'rebuildable') {
    return [
      `1. Mark result ${finding.resultId} as FAILED and clear canonical_result_payload via the maintenance script.`,
      `2. Move attempt ${finding.attemptId} to FAILED so the canonical completion service can rerun safely.`,
      `3. Re-run assessment completion for attempt ${finding.attemptId} using assessment_version_id ${finding.assessmentVersionId}.`,
    ];
  }

  return [
    `1. Quarantine result ${finding.resultId} by clearing canonical_result_payload and marking it FAILED.`,
    `2. Do not auto-rebuild attempt ${finding.attemptId ?? 'UNKNOWN'} because the runtime basis is incomplete.`,
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
    const findings = await findLegacyReadyResultPayloads(pool);
    const rebuildableRows = findings.filter((row) => row.remediationClass === 'rebuildable');
    const quarantineOnlyRows = findings.filter((row) => row.remediationClass === 'quarantine_only');

    if (jsonOutput) {
      console.log(JSON.stringify({
        affectedReadyRows: findings.length,
        rebuildableRows: rebuildableRows.length,
        quarantineOnlyRows: quarantineOnlyRows.length,
        findings,
      }, null, 2));
      return;
    }

    console.log(`Affected READY rows: ${findings.length}`);
    console.log(`Rebuildable rows: ${rebuildableRows.length}`);
    console.log(`Quarantine-only rows: ${quarantineOnlyRows.length}`);

    if (findings.length === 0) {
      console.log('\nNo legacy or malformed READY result payloads were found.');
      return;
    }

    console.log('\nAffected READY result payloads:\n');
    for (const finding of findings) {
      console.log(`- result_id: ${finding.resultId}`);
      console.log(`  attempt_id: ${finding.attemptId ?? 'NULL'}`);
      console.log(`  user_id: ${finding.userId ?? 'NULL'}`);
      console.log(`  assessment_key: ${finding.assessmentKey ?? 'NULL'} (${finding.versionTag ?? 'NULL'})`);
      console.log(`  generated_at: ${finding.generatedAt ?? 'NULL'}`);
      console.log(`  response_count: ${finding.responseCount}`);
      console.log(`  answered_question_count: ${finding.answeredQuestionCount}`);
      console.log(`  question_count: ${finding.questionCount}`);
      console.log(`  overview_language_row_count: ${finding.overviewLanguageRowCount}`);
      console.log(`  remediation_class: ${finding.remediationClass}`);
      console.log(`  remediation_reason: ${finding.remediationReason}`);
      console.log('  legacy_signatures:');
      console.log(`    - exact_legacy_hero_headline: ${finding.signatures.exactLegacyHeroHeadline}`);
      console.log(`    - legacy_hero_headline_variant: ${finding.signatures.legacyHeroHeadlineVariant}`);
      console.log(`    - missing_overview_language_rows: ${finding.signatures.missingOverviewLanguageRows}`);
      console.log(`    - hero_primary_signal_key: ${finding.signatures.heroPrimarySignalKey ?? 'NULL'}`);
      console.log(`    - hero_primary_signal_missing_from_version: ${finding.signatures.heroPrimarySignalMissingFromVersion}`);
      console.log(`    - unexpected_signal_keys: ${finding.signatures.unexpectedSignalKeys.join(', ') || 'none'}`);
      console.log(`    - unexpected_domain_keys: ${finding.signatures.unexpectedDomainKeys.join(', ') || 'none'}`);

      if (finding.validationErrors.length > 0) {
        console.log('  validation_errors:');
        finding.validationErrors.forEach((error) => {
          console.log(`    - ${error}`);
        });
      }

      console.log('  recommended_steps:');
      buildRemediationSteps(finding).forEach((step) => {
        console.log(`    - ${step}`);
      });
      console.log('');
    }
  } finally {
    await pool.end();
  }
}

main().catch((error) => {
  console.error('Legacy result payload audit failed.');
  console.error(error);
  process.exit(1);
});

