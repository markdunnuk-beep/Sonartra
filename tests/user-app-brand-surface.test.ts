import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const userRouteFiles = [
  'app/(user)/app/workspace/page.tsx',
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

test('workspace guard labels stay removed while brand cockpit headings remain', () => {
  const workspaceSource = readSource('app/(user)/app/workspace/page.tsx');

  assert.match(workspaceSource, /Recommended next action/);
  assert.match(workspaceSource, /Your current signal pattern/);
  assert.match(workspaceSource, /Assessment index/);
  assert.doesNotMatch(workspaceSource, /Workspace session/);
  assert.doesNotMatch(workspaceSource, /Latest result:/);
  assert.doesNotMatch(workspaceSource, /Your dominant signals/);
});
