import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { Pool } from 'pg';

import {
  markAttemptFailed,
  upsertFailedResult,
} from '@/lib/server/assessment-completion-queries';
import { createAssessmentCompletionService } from '@/lib/server/assessment-completion-service';

import {
  EXACT_LEGACY_HERO_HEADLINE,
  findLegacyReadyResultPayloads,
} from './lib/legacy-result-payloads';

type ScriptArgs = {
  apply: boolean;
  json: boolean;
  resultIds: readonly string[];
};

type RemediationOutcome = {
  resultId: string;
  attemptId: string | null;
  userId: string | null;
  remediationClass: 'rebuildable' | 'quarantine_only';
  action: 'dry_run' | 'rebuilt' | 'quarantined_only' | 'skipped';
  beforeHeadline: string | null;
  afterHeadline: string | null;
  changed: boolean;
  error: string | null;
};

function parseArgs(argv: readonly string[]): ScriptArgs {
  const resultIds: string[] = [];

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--result-id') {
      const value = argv[index + 1];
      if (value) {
        resultIds.push(value);
        index += 1;
      }
      continue;
    }

    if (arg.startsWith('--result-id=')) {
      resultIds.push(arg.slice('--result-id='.length));
    }
  }

  return {
    apply: argv.includes('--apply'),
    json: argv.includes('--json'),
    resultIds: Object.freeze(resultIds),
  };
}

function toFailureReason(resultId: string): string {
  return `legacy_result_payload_rebuild_pending:${resultId}`;
}

async function quarantineLegacyResult(params: {
  db: Pool;
  resultId: string;
  attemptId: string | null;
  assessmentId: string;
  assessmentVersionId: string;
  failureReason: string;
}): Promise<void> {
  if (params.attemptId) {
    await upsertFailedResult(params.db, {
      attemptId: params.attemptId,
      assessmentId: params.assessmentId,
      assessmentVersionId: params.assessmentVersionId,
      failureReason: params.failureReason,
    });
    await markAttemptFailed(params.db, params.attemptId);
    return;
  }

  await params.db.query(
    `
    UPDATE results
    SET
      pipeline_status = 'FAILED',
      readiness_status = 'FAILED',
      canonical_result_payload = NULL,
      failure_reason = $2,
      generated_at = NULL,
      updated_at = NOW()
    WHERE id = $1
    `,
    [params.resultId, params.failureReason],
  );
}

async function main() {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error('DATABASE_URL is not set in .env.local');
  }

  const args = parseArgs(process.argv.slice(2));
  const pool = new Pool({
    connectionString: databaseUrl,
    ssl: { rejectUnauthorized: false },
  });

  try {
    const findings = await findLegacyReadyResultPayloads(pool, {
      resultIds: args.resultIds.length > 0 ? args.resultIds : undefined,
    });
    const completionService = createAssessmentCompletionService({ db: pool });
    const outcomes: RemediationOutcome[] = [];

    for (const finding of findings) {
      const beforeHeadline = finding.signatures.exactLegacyHeroHeadline
        ? EXACT_LEGACY_HERO_HEADLINE
        : null;

      if (!args.apply) {
        outcomes.push({
          resultId: finding.resultId,
          attemptId: finding.attemptId,
          userId: finding.userId,
          remediationClass: finding.remediationClass,
          action: 'dry_run',
          beforeHeadline,
          afterHeadline: beforeHeadline,
          changed: false,
          error: null,
        });
        continue;
      }

      if (
        finding.remediationClass !== 'rebuildable' ||
        !finding.attemptId ||
        !finding.userId
      ) {
        if (args.apply) {
          await quarantineLegacyResult({
            db: pool,
            resultId: finding.resultId,
            attemptId: finding.attemptId,
            assessmentId: finding.assessmentId,
            assessmentVersionId: finding.assessmentVersionId,
            failureReason: toFailureReason(finding.resultId),
          });
        }

        outcomes.push({
          resultId: finding.resultId,
          attemptId: finding.attemptId,
          userId: finding.userId,
          remediationClass: finding.remediationClass,
          action: 'quarantined_only',
          beforeHeadline,
          afterHeadline: null,
          changed: false,
          error: 'auto_rebuild_not_safe',
        });
        continue;
      }

      try {
        await quarantineLegacyResult({
          db: pool,
          resultId: finding.resultId,
          attemptId: finding.attemptId,
          assessmentId: finding.assessmentId,
          assessmentVersionId: finding.assessmentVersionId,
          failureReason: toFailureReason(finding.resultId),
        });

        await completionService.completeAssessmentAttempt({
          attemptId: finding.attemptId,
          userId: finding.userId,
        });

        const [afterFinding] = await findLegacyReadyResultPayloads(pool, {
          resultIds: [finding.resultId],
        });

        outcomes.push({
          resultId: finding.resultId,
          attemptId: finding.attemptId,
          userId: finding.userId,
          remediationClass: finding.remediationClass,
          action: 'rebuilt',
          beforeHeadline,
          afterHeadline: afterFinding?.signatures.exactLegacyHeroHeadline ? EXACT_LEGACY_HERO_HEADLINE : null,
          changed: true,
          error: afterFinding ? 'legacy_signature_still_present_after_rebuild' : null,
        });
      } catch (error) {
        outcomes.push({
          resultId: finding.resultId,
          attemptId: finding.attemptId,
          userId: finding.userId,
          remediationClass: finding.remediationClass,
          action: 'skipped',
          beforeHeadline,
          afterHeadline: null,
          changed: false,
          error: error instanceof Error ? error.message : 'legacy_payload_remediation_failed',
        });
      }
    }

    if (args.json) {
      console.log(JSON.stringify({
        mode: args.apply ? 'apply' : 'dry_run',
        targetedRows: findings.length,
        outcomes,
      }, null, 2));
      return;
    }

    console.log(`Mode: ${args.apply ? 'apply' : 'dry-run'}`);
    console.log(`Targeted rows: ${findings.length}`);
    if (findings.length === 0) {
      console.log('No targeted legacy READY result payloads found.');
      return;
    }

    for (const outcome of outcomes) {
      console.log(`- result_id: ${outcome.resultId}`);
      console.log(`  attempt_id: ${outcome.attemptId ?? 'NULL'}`);
      console.log(`  action: ${outcome.action}`);
      console.log(`  changed: ${outcome.changed}`);
      console.log(`  before_exact_legacy_headline: ${outcome.beforeHeadline === EXACT_LEGACY_HERO_HEADLINE}`);
      console.log(`  after_exact_legacy_headline: ${outcome.afterHeadline === EXACT_LEGACY_HERO_HEADLINE}`);
      if (outcome.error) {
        console.log(`  error: ${outcome.error}`);
      }
    }
  } finally {
    await pool.end();
  }
}

main().catch((error) => {
  console.error('Legacy result payload remediation failed.');
  console.error(error);
  process.exit(1);
});
