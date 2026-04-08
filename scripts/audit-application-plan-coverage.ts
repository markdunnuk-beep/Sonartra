import { getDbPool } from '@/lib/server/db';
import { summarizeApplicationPlanCoverage } from '@/lib/server/application-plan-governance';
import { getAssessmentVersionApplicationLanguage } from '@/lib/server/assessment-version-application-language';

type VersionRow = {
  assessment_key: string;
  assessment_title: string;
  assessment_version_id: string;
  version_tag: string;
  lifecycle_status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
};

async function main() {
  const db = getDbPool();
  const versions = await db.query<VersionRow>(
    `
    SELECT
      a.assessment_key,
      a.title AS assessment_title,
      av.id AS assessment_version_id,
      av.version AS version_tag,
      av.lifecycle_status
    FROM assessments a
    INNER JOIN assessment_versions av ON av.assessment_id = a.id
    WHERE av.lifecycle_status IN ('DRAFT', 'PUBLISHED')
    ORDER BY a.assessment_key ASC, av.updated_at DESC, av.created_at DESC, av.version DESC
    `,
  );

  if (versions.rows.length === 0) {
    console.log('No draft or published assessment versions found.');
    return;
  }

  for (const version of versions.rows) {
    const bundle = await getAssessmentVersionApplicationLanguage(db, version.assessment_version_id);
    const coverage = summarizeApplicationPlanCoverage(bundle);

    console.log(
      [
        `${version.assessment_key} (${version.version_tag}, ${version.lifecycle_status})`,
        `versionId=${version.assessment_version_id}`,
        `thesis=${coverage.thesisCount}`,
        `contribution=${coverage.contributionCount}`,
        `risk=${coverage.riskCount}`,
        `development=${coverage.developmentCount}`,
        `actionPrompts=${coverage.actionPromptsCount}`,
        `thesisComplete=${coverage.missingThesisHeroPatterns.length === 0}`,
        `actionPromptsComplete=${coverage.missingActionPromptHeroPatterns.length === 0}`,
      ].join(' | '),
    );

    if (coverage.missingThesisHeroPatterns.length > 0) {
      console.log(`  missingThesis: ${coverage.missingThesisHeroPatterns.join(', ')}`);
    }

    if (coverage.missingActionPromptHeroPatterns.length > 0) {
      console.log(`  missingActionPrompts: ${coverage.missingActionPromptHeroPatterns.join(', ')}`);
    }
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
