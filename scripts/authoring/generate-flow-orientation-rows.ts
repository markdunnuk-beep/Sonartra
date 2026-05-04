import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import {
  flowStateAuthoringConstants,
  readerFirstLookupKeyRecommendation,
  readerFirstRequiredHeaders,
  readerFirstRowCountRules,
  type readerFirstAllowedScoreShapes,
  type readerFirstAllowedSignalKeys,
} from '@/content/authoring/reader-first-schema-manifest';
import {
  flowOrientationForbiddenPhrases,
  flowOrientationScoreShapeSummaries,
  flowOrientationSignalPhrases,
  type FlowSignalKey,
} from '@/content/authoring/flow-state/flow-orientation-phrase-library';

type FlowScoreShape = (typeof readerFirstAllowedScoreShapes)[number];
type OrientationHeader = (typeof readerFirstRequiredHeaders)['06_Orientation'][number];
type OrientationRow = Record<OrientationHeader, string>;

export const flowOrientationOutputPath = path.join(
  process.cwd(),
  'content',
  'authoring',
  'generated',
  '06-orientation-flow-state.psv',
);

const orientationHeaders = readerFirstRequiredHeaders['06_Orientation'];

function permuteSignals(signals: readonly FlowSignalKey[]): FlowSignalKey[][] {
  if (signals.length === 0) {
    return [[]];
  }

  return signals.flatMap((signal, index) => {
    const remaining = [...signals.slice(0, index), ...signals.slice(index + 1)];
    return permuteSignals(remaining).map((permutation) => [signal, ...permutation]);
  });
}

function replaceTemplateLabels(
  template: string,
  rankedSignals: readonly FlowSignalKey[],
): string {
  return template
    .replaceAll('{rank_1_label}', flowOrientationSignalPhrases[rankedSignals[0]].label)
    .replaceAll('{rank_2_label}', flowOrientationSignalPhrases[rankedSignals[1]].label);
}

function getSignalRolePhrase(signal: FlowSignalKey, rankIndex: number): string {
  const phrases = flowOrientationSignalPhrases[signal];

  if (rankIndex === 0) {
    return `Your main route is ${phrases.mainRoute}.`;
  }

  if (rankIndex === 3) {
    return `What to use deliberately: ${phrases.deliberate}.`;
  }

  if (signal === 'deep_focus') {
    return `What gives it depth: ${phrases.depth}.`;
  }

  if (signal === 'creative_movement') {
    return `What adds energy: ${phrases.energy}.`;
  }

  if (signal === 'physical_rhythm') {
    return rankIndex === 1
      ? `What gives it momentum: ${phrases.momentum}.`
      : `What helps you reset: ${phrases.reset}.`;
  }

  return `What helps you test it: ${phrases.test}.`;
}

function buildOrientationSummary(rankedSignals: readonly FlowSignalKey[]): string {
  const [rank1, rank2] = rankedSignals;
  const rank1Label = flowOrientationSignalPhrases[rank1].label;
  const rank2Support = flowOrientationSignalPhrases[rank2].support;

  return `Start by looking at ${rank1Label}. Bring in ${rank2Support} when the work needs more range.`;
}

function buildOrientationRow(
  rankedSignals: readonly FlowSignalKey[],
  scoreShape: FlowScoreShape,
): OrientationRow {
  const patternKey = rankedSignals.join('_');
  const rank1Label = flowOrientationSignalPhrases[rankedSignals[0]].label;

  return {
    domain_key: flowStateAuthoringConstants.domainKey,
    pattern_key: patternKey,
    score_shape: scoreShape,
    rank_1_signal_key: rankedSignals[0],
    rank_2_signal_key: rankedSignals[1],
    rank_3_signal_key: rankedSignals[2],
    rank_4_signal_key: rankedSignals[3],
    orientation_title: `${rank1Label} first`,
    orientation_summary: buildOrientationSummary(rankedSignals),
    score_shape_summary: replaceTemplateLabels(
      flowOrientationScoreShapeSummaries[scoreShape],
      rankedSignals,
    ),
    rank_1_phrase: getSignalRolePhrase(rankedSignals[0], 0),
    rank_2_phrase: getSignalRolePhrase(rankedSignals[1], 1),
    rank_3_phrase: getSignalRolePhrase(rankedSignals[2], 2),
    rank_4_phrase: getSignalRolePhrase(rankedSignals[3], 3),
    status: 'draft',
    lookup_key: [
      flowStateAuthoringConstants.domainKey,
      patternKey,
      scoreShape,
    ].join(readerFirstLookupKeyRecommendation.delimiter),
  };
}

export function generateFlowOrientationRows(): OrientationRow[] {
  const patterns = permuteSignals([...flowStateAuthoringConstants.signals]);

  return patterns.flatMap((pattern) =>
    flowStateAuthoringConstants.scoreShapes.map((scoreShape) =>
      buildOrientationRow(pattern, scoreShape),
    ),
  );
}

function serializeRow(row: OrientationRow): string {
  return orientationHeaders.map((header) => row[header]).join('|');
}

export function serializeFlowOrientationRows(rows: readonly OrientationRow[]): string {
  return [orientationHeaders.join('|'), ...rows.map(serializeRow)].join('\n');
}

export type FlowOrientationValidationSummary = {
  readonly rowCount: number;
  readonly patternCount: number;
  readonly scoreShapeCount: number;
  readonly lineCount: number;
  readonly pass: boolean;
  readonly errors: readonly string[];
};

export function validateFlowOrientationRows(
  rows: readonly OrientationRow[],
  serialized = serializeFlowOrientationRows(rows),
): FlowOrientationValidationSummary {
  const errors: string[] = [];
  const expectedHeader = readerFirstRequiredHeaders['06_Orientation'].join('|');
  const lines = serialized.split('\n');
  const header = lines[0];
  const dataLines = lines.slice(1);

  if (header !== expectedHeader) {
    errors.push('Header does not match the 06_Orientation manifest headers.');
  }

  if (rows.length !== readerFirstRowCountRules['06_Orientation'].expectedRows) {
    errors.push(`Expected 96 data rows but found ${rows.length}.`);
  }

  if (lines.length !== 97) {
    errors.push(`Expected 97 output lines including header but found ${lines.length}.`);
  }

  const patternKeys = new Set(rows.map((row) => row.pattern_key));
  if (patternKeys.size !== flowStateAuthoringConstants.requiredPatternCount) {
    errors.push(`Expected 24 unique pattern keys but found ${patternKeys.size}.`);
  }

  const scoreShapes = new Set(rows.map((row) => row.score_shape));
  if (scoreShapes.size !== flowStateAuthoringConstants.requiredScoreShapeCount) {
    errors.push(`Expected 4 score shapes but found ${scoreShapes.size}.`);
  }

  const lookupKeys = new Set<string>();
  const forbiddenPattern = new RegExp(
    flowOrientationForbiddenPhrases
      .map((phrase) => phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
      .join('|'),
    'i',
  );

  for (const row of rows) {
    const rankedSignals = [
      row.rank_1_signal_key,
      row.rank_2_signal_key,
      row.rank_3_signal_key,
      row.rank_4_signal_key,
    ];
    const uniqueSignals = new Set(rankedSignals);

    if (
      uniqueSignals.size !== flowStateAuthoringConstants.signals.length ||
      rankedSignals.some(
        (signal) => !flowStateAuthoringConstants.signals.includes(signal as FlowSignalKey),
      )
    ) {
      errors.push(`${row.lookup_key} does not contain all four Flow State signals exactly once.`);
    }

    if (lookupKeys.has(row.lookup_key)) {
      errors.push(`Duplicate lookup_key found: ${row.lookup_key}.`);
    }
    lookupKeys.add(row.lookup_key);

    for (const headerName of orientationHeaders) {
      const value = row[headerName];

      if (value.includes('|')) {
        errors.push(`${row.lookup_key} contains a pipe in ${headerName}.`);
      }

      if (forbiddenPattern.test(value)) {
        errors.push(`${row.lookup_key} contains a forbidden phrase in ${headerName}.`);
      }
    }

    if (row.lookup_key.includes('|')) {
      errors.push(`${row.lookup_key} is not pipe-safe.`);
    }
  }

  for (const [index, line] of dataLines.entries()) {
    const columnCount = line.split('|').length;

    if (columnCount !== orientationHeaders.length) {
      errors.push(`Data line ${index + 2} has ${columnCount} columns instead of 16.`);
    }
  }

  for (const patternKey of patternKeys) {
    const shapesForPattern = new Set(
      rows
        .filter((row) => row.pattern_key === patternKey)
        .map((row) => row.score_shape),
    );

    if (shapesForPattern.size !== flowStateAuthoringConstants.requiredScoreShapeCount) {
      errors.push(`${patternKey} does not have all four score shapes.`);
    }
  }

  return {
    rowCount: rows.length,
    patternCount: patternKeys.size,
    scoreShapeCount: scoreShapes.size,
    lineCount: lines.length,
    pass: errors.length === 0,
    errors,
  };
}

export async function writeFlowOrientationRows(): Promise<FlowOrientationValidationSummary> {
  const rows = generateFlowOrientationRows();
  const serialized = serializeFlowOrientationRows(rows);
  const summary = validateFlowOrientationRows(rows, serialized);

  if (!summary.pass) {
    return summary;
  }

  await mkdir(path.dirname(flowOrientationOutputPath), { recursive: true });
  await writeFile(flowOrientationOutputPath, `${serialized}\n`, 'utf8');

  return summary;
}

async function main() {
  const summary = await writeFlowOrientationRows();

  console.log(`row count: ${summary.rowCount}`);
  console.log(`pattern count: ${summary.patternCount}`);
  console.log(`score shape count: ${summary.scoreShapeCount}`);
  console.log(`validation: ${summary.pass ? 'PASS' : 'FAIL'}`);

  if (!summary.pass) {
    for (const error of summary.errors) {
      console.error(`- ${error}`);
    }
    process.exitCode = 1;
  }
}

const invokedPath = process.argv[1] ? pathToFileURL(path.resolve(process.argv[1])).href : '';

if (import.meta.url === invokedPath) {
  main().catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  });
}
