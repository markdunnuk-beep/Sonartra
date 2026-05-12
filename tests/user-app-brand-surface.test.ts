import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const userRouteFiles = [
  'app/(user)/app/workspace/page.tsx',
  'app/(user)/app/library/page.tsx',
  'app/(user)/app/support/page.tsx',
  'app/(user)/app/assessments/page.tsx',
  'app/(user)/app/results/page.tsx',
  'app/(user)/app/settings/page.tsx',
] as const;

function readSource(relativePath: string): string {
  return readFileSync(join(process.cwd(), relativePath), 'utf8');
}

function getImportSpecifiers(source: string): string[] {
  return [...source.matchAll(/from\s+['"]([^'"]+)['"]/g)].map((match) => match[1] ?? '');
}

test('user app shared surfaces use the public Sonartra brand foundation', () => {
  const shellSource = readSource('components/user/user-app-shell.tsx');
  const globalsSource = readSource('app/globals.css');

  assert.match(globalsSource, /--sonartra-bg: #080a0d;/);
  assert.match(globalsSource, /--sonartra-bg-elevated: #101318;/);
  assert.match(globalsSource, /--sonartra-accent: #32d6b0;/);
  assert.match(globalsSource, /--sonartra-text: rgba\(245, 241, 234, 0\.94\);/);
  assert.match(globalsSource, /radial-gradient\(circle at 18% 7%, rgba\(50, 214, 176, 0\.13\)/);
  assert.match(
    shellSource,
    /bg-\[linear-gradient\(180deg,#090B0F_0%,#080A0D_46rem,#080A0D_100%\)\]/,
  );
  assert.match(shellSource, /rgba\(16,19,24,0\.9\),rgba\(8,10,13,0\.96\)/);
  assert.doesNotMatch(shellSource, /rgba\(9,17,31|rgba\(13,21,37|rgba\(9,15,29/);
});

test('target user pages remain presentation-only and do not import result computation paths', () => {
  const blockedImportPattern =
    /(?:^|\/)(?:engine-runner|scoring|normalization|result-builder|result-builder-helpers|responses?|option-signal-weights?)(?:$|\/|-)/i;

  for (const relativePath of userRouteFiles) {
    const source = readSource(relativePath);
    const imports = getImportSpecifiers(source);

    assert.deepEqual(
      imports.filter((specifier) => blockedImportPattern.test(specifier)),
      [],
      `${relativePath} must not import scoring or response-derived computation`,
    );
    assert.doesNotMatch(
      source,
      /scoreAssessment|normalizeScores|normalizeSignal|rawScore|optionSignalWeights/,
      `${relativePath} must stay out of scoring and normalization`,
    );
  }
});

test('workspace guard labels stay removed while published chapter dashboard headings remain', () => {
  const workspaceSource = readSource('app/(user)/app/workspace/page.tsx');

  assert.match(workspaceSource, /Your Personal Operating Profile/);
  assert.match(workspaceSource, /Recommended next chapter/);
  assert.match(workspaceSource, /Profile progress/);
  assert.match(workspaceSource, /Published chapters/);
  assert.match(workspaceSource, /Completed reports/);
  assert.match(workspaceSource, /Review report/);
  assert.match(workspaceSource, /Pattern takeaway/);
  assert.match(workspaceSource, /Your profile grows chapter by chapter/);
  assert.match(workspaceSource, /Use it as reference/);
  assert.doesNotMatch(workspaceSource, /Workspace session/);
  assert.doesNotMatch(workspaceSource, /Assessment index/);
  assert.doesNotMatch(workspaceSource, /Your current signal pattern/);
  assert.doesNotMatch(workspaceSource, /Latest result:/);
  assert.doesNotMatch(workspaceSource, /Your dominant signals/);
  assert.doesNotMatch(workspaceSource, /combined profile summary/i);
  assert.doesNotMatch(workspaceSource, /of 6 available chapters complete/);
  assert.doesNotMatch(workspaceSource, /unpublished future/i);
});

test('authenticated library route shell stays content-only', () => {
  const librarySource = readSource('app/(user)/app/library/page.tsx');

  assert.match(librarySource, /Library/);
  assert.match(
    librarySource,
    /Guides, case studies, and reading material to help you go deeper into the/,
  );
  assert.match(librarySource, /Flow State/);
  assert.match(librarySource, /Leadership/);
  assert.match(librarySource, /Decision Making/);
  assert.match(librarySource, /Communication/);
  assert.match(librarySource, /Work Energy/);
  assert.match(librarySource, /Conflict/);
  assert.match(librarySource, /Case Studies/);
  assert.match(librarySource, /Guides/);
  assert.match(librarySource, /Content coming soon/);
  assert.match(librarySource, /PageFrame/);
  assert.match(librarySource, /SurfaceCard/);

  assert.doesNotMatch(librarySource, /canonical_result_payload|canonicalResultPayload/);
  assert.doesNotMatch(librarySource, /createWorkspaceService|getDbPool|db:/);
  assert.doesNotMatch(librarySource, /scoreAssessment|normalizeScores|optionSignalWeights/);
  assert.doesNotMatch(librarySource, /TODO|lorem ipsum|dummy|test content/i);
});

test('authenticated support route shell stays support-only', () => {
  const supportSource = readSource('app/(user)/app/support/page.tsx');
  const supportRequestStateSource = readSource('lib/support/support-request-action-state.ts');
  const supportDisplaySource = readSource('lib/support/support-display.ts');
  const combinedSupportSource = `${supportSource}\n${supportRequestStateSource}\n${supportDisplaySource}`;

  assert.match(supportSource, /Support/);
  assert.match(
    supportSource,
    /Get help with technical issues, account questions, billing, or general/,
  );
  assert.match(supportSource, /Create a support case for a technical issue/);
  assert.match(supportSource, /Your support cases/);
  assert.match(supportSource, /Search support cases\.\.\./);
  assert.match(supportSource, /All statuses/);
  assert.match(supportSource, /All priorities/);
  assert.match(supportSource, /No support cases/);
  assert.match(combinedSupportSource, /Open/);
  assert.match(combinedSupportSource, /Waiting on Sonartra/);
  assert.match(combinedSupportSource, /Waiting on you/);
  assert.match(combinedSupportSource, /Resolved/);
  assert.match(combinedSupportSource, /Technical issue/);
  assert.match(combinedSupportSource, /Account support/);
  assert.match(combinedSupportSource, /Billing or access/);
  assert.match(combinedSupportSource, /Product feedback/);
  assert.match(combinedSupportSource, /General question/);
  assert.match(supportSource, /Choose the closest category when creating a support request/);
  assert.match(supportSource, /PageFrame/);
  assert.match(supportSource, /SurfaceCard/);

  assert.doesNotMatch(supportSource, /canonical_result_payload|canonicalResultPayload/);
  assert.doesNotMatch(
    supportSource,
    /createWorkspaceService|getDbPool|db:|support_cases|support_case_messages|support_case_attachments|support_case_events|support_case_status|support_case_category|support_case_priority/,
  );
  assert.doesNotMatch(
    supportSource,
    /scoreAssessment|normalizeScores|optionSignalWeights|result-builder|assessment-packages|compile-assessment/,
  );
  assert.doesNotMatch(
    supportSource,
    /'use server'|useActionState|formAction|onSubmit|sendEmail|smtp|resend|postmark|SLA|third-party|helpdesk|zendesk|intercom/i,
  );
  assert.doesNotMatch(supportSource, /TODO|lorem ipsum|dummy|test content/i);
});
