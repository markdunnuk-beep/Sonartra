import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

function readWorkspaceFile(relativePath: string): string {
  return readFileSync(join(process.cwd(), relativePath), 'utf8');
}

function getImportSpecifiers(source: string): string[] {
  return [...source.matchAll(/from\s+['"]([^'"]+)['"]/g)].map((match) => match[1] ?? '');
}

test('workspace UI does not import scoring, normalization, engine runtime, or response-derived score sources', () => {
  const pageSource = readWorkspaceFile('app/(user)/app/workspace/page.tsx');
  const sharedUiSource = readWorkspaceFile('components/shared/user-app-ui.tsx');
  const imports = [
    ...getImportSpecifiers(pageSource),
    ...getImportSpecifiers(sharedUiSource),
  ];

  const blockedImportPattern = /(?:^|\/)(?:engine-runner|scoring|normalization|result-builder|result-builder-helpers|result-interpretation|domain-interpretation|responses?|option-signal-weights?)(?:$|\/|-)/i;

  assert.deepEqual(
    imports.filter((specifier) => blockedImportPattern.test(specifier)),
    [],
  );
  assert.doesNotMatch(pageSource, /scoreAssessment|normalizeScores|normalizeSignal|rawScore|optionSignalWeights/);
  assert.doesNotMatch(sharedUiSource, /scoreAssessment|normalizeScores|normalizeSignal|rawScore|optionSignalWeights/);
});

test('workspace server projection only uses response rows through lifecycle progress services', () => {
  const serviceSource = readWorkspaceFile('lib/server/workspace-service.ts');
  const lifecycleSource = readWorkspaceFile('lib/server/assessment-attempt-lifecycle.ts');
  const lifecycleQueriesSource = readWorkspaceFile('lib/server/assessment-attempt-lifecycle-queries.ts');

  assert.doesNotMatch(serviceSource, /FROM\s+responses|scoreAssessment|normalizeScores|normalizeSignal|optionSignalWeights/i);
  assert.match(lifecycleSource, /countAnsweredQuestionsForAttempt/);
  assert.match(lifecycleQueriesSource, /COUNT\(DISTINCT question_id\) AS answered_questions/);
  assert.doesNotMatch(lifecycleSource, /scoreAssessment|normalizeScores|normalizeSignal|optionSignalWeights/i);
  assert.doesNotMatch(lifecycleQueriesSource, /scoreAssessment|normalizeScores|normalizeSignal|optionSignalWeights/i);
});

test('workspace UI preserves accessible action and signal-meter contract', () => {
  const pageSource = readWorkspaceFile('app/(user)/app/workspace/page.tsx');
  const sharedUiSource = readWorkspaceFile('components/shared/user-app-ui.tsx');

  assert.match(sharedUiSource, /aria-label=\{ariaLabel\}/);
  assert.match(pageSource, /accessibleLabel=\{`\$\{assessment\.actionLabel\} for \$\{assessment\.assessmentTitle\}`\}/);
  assert.match(pageSource, /<button\s+[\s\S]*disabled[\s\S]*aria-label=\{accessibleLabel\}/);
  assert.match(pageSource, /role="meter"/);
  assert.match(pageSource, /aria-valuenow=\{percentage\}/);
  assert.match(pageSource, /aria-label=\{`\$\{signal\.displayRole\} signal, \$\{signal\.signalLabel\}, \$\{percentageLabel\}`\}/);
});
