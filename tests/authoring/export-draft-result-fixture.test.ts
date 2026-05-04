import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';

import {
  exportDraftResultFixture,
} from '@/scripts/authoring/export-draft-result-fixture';

const fixtureDir = path.join(process.cwd(), 'tests', 'authoring', 'fixtures');
const tempFixtureDir = path.join(process.cwd(), '.codex-temp', 'authoring-export-fixtures');
const inputPath = path.join(fixtureDir, 'valid-reader-first-import.psv');
const outputPath = path.join(fixtureDir, 'exported-draft-result-fixture.ts');
const dryRunOutputPath = path.join(fixtureDir, 'dry-run-draft-result-fixture.ts');
const draftResultFixturePath = path.join(
  process.cwd(),
  'content',
  'draft-result',
  'ranked-pattern-example.ts',
);
const patternKey = 'deep_focus_creative_movement_physical_rhythm_social_exchange';
const scoreShape = 'concentrated';

async function fileHash(filePath: string): Promise<string> {
  const content = await readFile(filePath);
  return createHash('sha256').update(content).digest('hex');
}

async function writeFixtureVariant(fileName: string, transform: (source: string) => string): Promise<string> {
  const source = await readFile(inputPath, 'utf8');
  const targetPath = path.join(tempFixtureDir, fileName);

  await mkdir(tempFixtureDir, { recursive: true });
  await writeFile(targetPath, transform(source), 'utf8');

  return targetPath;
}

test('valid sectioned PSV exports a draft-result fixture to a test output path', async () => {
  const summary = await exportDraftResultFixture({
    input: inputPath,
    output: outputPath,
    pattern: patternKey,
    shape: scoreShape,
    dryRun: false,
    skipValidation: false,
  });
  const output = await readFile(outputPath, 'utf8');

  assert.equal(summary.pass, true);
  assert.match(output, /export const rankedPatternSectionOrder/);
  assert.match(output, /export const rankedPatternExample/);
  assert.match(output, /export function validateRankedPatternExample/);
});

test('exported fixture contains the requested pattern_key and score_shape', async () => {
  const output = await readFile(outputPath, 'utf8');

  assert.match(output, new RegExp(patternKey));
  assert.match(output, new RegExp(scoreShape));
});

test('exported fixture contains known selected fixture text', async () => {
  const output = await readFile(outputPath, 'utf8');

  assert.match(output, /Draft line/);
});

test('missing pattern_key fails', async () => {
  const summary = await exportDraftResultFixture({
    input: inputPath,
    output: outputPath,
    pattern: 'missing_pattern',
    shape: scoreShape,
    dryRun: true,
    skipValidation: false,
  });

  assert.equal(summary.pass, false);
  assert.ok(summary.errors.some((error) => error.includes('Selected pattern_key is invalid')));
});

test('missing score_shape fails', async () => {
  const summary = await exportDraftResultFixture({
    input: inputPath,
    output: outputPath,
    pattern: patternKey,
    shape: 'missing_shape',
    dryRun: true,
    skipValidation: false,
  });

  assert.equal(summary.pass, false);
  assert.ok(summary.errors.some((error) => error.includes('Selected score_shape is invalid')));
});

test('missing selected 06_Orientation row fails', async () => {
  const missingOrientationPath = await writeFixtureVariant(
    'invalid-reader-first-import-missing-orientation.psv',
    (source) =>
      source
        .split('\n')
        .filter(
          (line) =>
            !line.startsWith(
              `flow-state|${patternKey}|${scoreShape}|deep_focus|creative_movement|physical_rhythm|social_exchange|`,
            ),
        )
        .join('\n'),
  );

  const summary = await exportDraftResultFixture({
    input: missingOrientationPath,
    output: outputPath,
    pattern: patternKey,
    shape: scoreShape,
    dryRun: true,
    skipValidation: true,
  });

  assert.equal(summary.pass, false);
  assert.ok(summary.errors.some((error) => error.includes('06_Orientation: selected row is missing')));
});

test('missing signal role row fails', async () => {
  const missingSignalRolePath = await writeFixtureVariant(
    'invalid-reader-first-import-missing-signal-role.psv',
    (source) =>
      source
        .split('\n')
        .filter((line) => !line.startsWith('flow-state|deep_focus|deep_focus|1|dominant|'))
        .join('\n'),
  );

  const summary = await exportDraftResultFixture({
    input: missingSignalRolePath,
    output: outputPath,
    pattern: patternKey,
    shape: scoreShape,
    dryRun: true,
    skipValidation: true,
  });

  assert.equal(summary.pass, false);
  assert.ok(summary.errors.some((error) => error.includes('08_Signal_Roles: selected row is missing')));
});

test('duplicate selected row fails', async () => {
  const duplicateOrientationPath = await writeFixtureVariant(
    'invalid-reader-first-import-duplicate-orientation.psv',
    (source) => {
      const lines = source.split('\n');
      const targetLine = lines.find((line) =>
        line.startsWith(
          `flow-state|${patternKey}|${scoreShape}|deep_focus|creative_movement|physical_rhythm|social_exchange|`,
        ),
      );

      assert.ok(targetLine);
      const orientationIndex = lines.findIndex((line) => line === '07_Recognition');
      return [
        ...lines.slice(0, orientationIndex),
        targetLine,
        ...lines.slice(orientationIndex),
      ].join('\n');
    },
  );

  const summary = await exportDraftResultFixture({
    input: duplicateOrientationPath,
    output: outputPath,
    pattern: patternKey,
    shape: scoreShape,
    dryRun: true,
    skipValidation: true,
  });

  assert.equal(summary.pass, false);
  assert.ok(summary.errors.some((error) => error.includes('06_Orientation: selected row is duplicated')));
});

test('--dry-run does not write the output file', async () => {
  await rm(dryRunOutputPath, { force: true });

  const summary = await exportDraftResultFixture({
    input: inputPath,
    output: dryRunOutputPath,
    pattern: patternKey,
    shape: scoreShape,
    dryRun: true,
    skipValidation: false,
  });

  assert.equal(summary.pass, true);

  await assert.rejects(readFile(dryRunOutputPath, 'utf8'), /ENOENT/);
});

test('existing /draft-result fixture is not modified during exporter tests', async () => {
  const before = await fileHash(draftResultFixturePath);

  await exportDraftResultFixture({
    input: inputPath,
    output: outputPath,
    pattern: patternKey,
    shape: scoreShape,
    dryRun: false,
    skipValidation: false,
  });

  const after = await fileHash(draftResultFixturePath);
  assert.equal(after, before);
});
