import path from 'node:path';
import { pathToFileURL } from 'node:url';

import { auditRankedPatternAssessmentVersion } from '@/content/assessment-packages/import-contract/ranked-pattern-publish-audit';
import type { RankedPatternPublishAuditFinding } from '@/content/assessment-packages/import-contract/ranked-pattern-publish-audit';
import { getDbPool } from '@/lib/server/db';

function usage(): string {
  return 'Usage: npx tsx scripts/assessment-packages/audit-ranked-pattern-publish.ts --assessment-version-id <id>';
}

function assessmentVersionIdFromArgs(argv: readonly string[]): string | null {
  const index = argv.indexOf('--assessment-version-id');
  return index >= 0 ? (argv[index + 1] ?? null) : null;
}

function formatFinding(finding: RankedPatternPublishAuditFinding): string {
  const location = [
    finding.tableName,
    finding.rowKey,
    finding.lookupKey ? `lookup ${finding.lookupKey}` : null,
  ]
    .filter(Boolean)
    .join(' / ');
  const related =
    finding.relatedKeys && finding.relatedKeys.length > 0
      ? ` (${finding.relatedKeys.join(', ')})`
      : '';
  return `- [${finding.code}] ${location.length > 0 ? `${location}: ` : ''}${finding.message}${related}`;
}

export async function runRankedPatternPublishAuditCli(argv: readonly string[]): Promise<number> {
  const assessmentVersionId = assessmentVersionIdFromArgs(argv);
  if (!assessmentVersionId) {
    console.error(usage());
    return 1;
  }

  const result = await auditRankedPatternAssessmentVersion({
    assessmentVersionId,
    db: getDbPool(),
  });
  const categoryLines = Object.entries(result.summaryCountsByCategory)
    .filter(([, counts]) => counts.blocking > 0 || counts.warning > 0 || counts.info > 0)
    .map(
      ([category, counts]) =>
        `- ${category}: blocking ${counts.blocking}, warnings ${counts.warning}, info ${counts.info}`,
    );
  const blockingFindings = result.findings.filter((finding) => finding.severity === 'blocking');
  const warnings = result.findings.filter((finding) => finding.severity === 'warning');

  console.log(
    [
      'Ranked-pattern publish audit',
      '',
      `Assessment version id: ${result.assessmentVersionId}`,
      `canPublish: ${result.canPublish}`,
      `blockingCount: ${result.blockingCount}`,
      `warningCount: ${result.warningCount}`,
      '',
      'Category counts',
      ...(categoryLines.length === 0 ? ['- none'] : categoryLines),
      '',
      'Blocking findings',
      ...(blockingFindings.length === 0 ? ['- none'] : blockingFindings.map(formatFinding)),
      '',
      'Warnings',
      ...(warnings.length === 0 ? ['- none'] : warnings.map(formatFinding)),
    ].join('\n'),
  );

  return result.canPublish ? 0 : 1;
}

const invokedPath = process.argv[1] ? pathToFileURL(path.resolve(process.argv[1])).href : '';

if (import.meta.url === invokedPath) {
  runRankedPatternPublishAuditCli(process.argv.slice(2))
    .then((exitCode) => {
      process.exitCode = exitCode;
    })
    .catch((error: unknown) => {
      console.error(error);
      process.exitCode = 1;
    });
}
