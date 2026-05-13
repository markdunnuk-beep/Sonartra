import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

export const premiumFieldMapRequiredColumns = [
  'section_key',
  'field_key',
  'pattern_key',
  'score_shape',
  'rank_1_signal_key',
  'rank_2_signal_key',
  'rank_3_signal_key',
  'rank_4_signal_key',
  'source_anchor',
  'source_excerpt',
  'transformation_rule',
  'final_text',
  'drift_check',
  'quality_notes',
  'status',
] as const;

const fieldKeysBySection = {
  '06_Orientation': [
    'orientation_title',
    'rank_1_phrase',
    'rank_2_phrase',
    'rank_3_phrase',
    'rank_4_phrase',
    'orientation_summary',
    'score_shape_summary',
  ],
  '07_Recognition': ['headline', 'recognition_statement', 'recognition_expansion'],
  '09_Pattern_Mechanics': [
    'mechanics_title',
    'core_mechanism',
    'why_it_shows_up',
    'what_it_protects',
  ],
  '10_Pattern_Synthesis': ['synthesis_title', 'gift', 'trap', 'takeaway', 'synthesis_text'],
  '11_Strengths': ['strength_title', 'strength_text', 'linked_signal_key'],
  '12_Narrowing': ['narrowing_title', 'narrowing_text', 'missing_range_signal_key'],
  '13_Application': ['application_title', 'application_text', 'linked_signal_key'],
  '14_Closing_Integration': [
    'closing_summary',
    'core_gift',
    'core_trap',
    'development_edge',
    'memorable_line',
  ],
} as const;

type SectionKey = keyof typeof fieldKeysBySection;
type FieldMapRow = Record<(typeof premiumFieldMapRequiredColumns)[number], string>;

export type PremiumFieldMapSeverity = 'error' | 'warning';

export type PremiumFieldMapFinding = {
  readonly filePath: string;
  readonly rowNumber: number;
  readonly severity: PremiumFieldMapSeverity;
  readonly code: string;
  readonly message: string;
  readonly sectionKey?: string;
  readonly fieldKey?: string;
  readonly patternKey?: string;
};

export type PremiumFieldMapValidationResult = {
  readonly pass: boolean;
  readonly findings: readonly PremiumFieldMapFinding[];
  readonly filesChecked: number;
  readonly rowsChecked: number;
};

const scoreShapeDependentSections = new Set<SectionKey>([
  '06_Orientation',
  '07_Recognition',
  '09_Pattern_Mechanics',
  '10_Pattern_Synthesis',
  '14_Closing_Integration',
]);
const patternLevelSections = new Set<SectionKey>(['11_Strengths', '12_Narrowing', '13_Application']);
const allowedSections = new Set<string>(Object.keys(fieldKeysBySection));
const allowedScoreShapes = new Set(['concentrated', 'paired', 'graduated', 'balanced']);
const allowedSignalKeys = new Set(['process', 'results', 'people', 'vision']);
const allowedSourceAnchors = new Set([
  'pattern_identity',
  'core_leadership_thesis',
  'attention_pattern',
  'value_creation',
  'felt_experience',
  'decision_behaviour',
  'communication_behaviour',
  'pressure_behaviour',
  'protective_function',
  'hidden_cost',
  'narrowing_pattern',
  'rank_3_extension',
  'rank_4_extension',
  'development_moves',
  'integrated_closing',
  'memorable_line',
]);
const allowedStatuses = new Set(['draft', 'review', 'approved', 'active', 'rejected', 'needs_revision']);
const statusesRequiringFinalText = new Set(['review', 'approved', 'active']);
const listSectionDuplicateWarning =
  'List section duplicate field rows are allowed for now because the matrix has no item_key or priority column. Add item identity before production PSV generation if multiple list items are mapped.';

function isSectionKey(value: string): value is SectionKey {
  return allowedSections.has(value);
}

function splitPsvLine(line: string): readonly string[] {
  return line.split('|');
}

function normalizeSource(source: string): readonly string[] {
  const normalized = source.replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim();
  return normalized.length > 0 ? normalized.split('\n') : [];
}

function rowFromColumns(header: readonly string[], columns: readonly string[]): FieldMapRow {
  return Object.fromEntries(
    premiumFieldMapRequiredColumns.map((field) => [field, columns[header.indexOf(field)]?.trim() ?? '']),
  ) as FieldMapRow;
}

function createFinding(
  filePath: string,
  rowNumber: number,
  severity: PremiumFieldMapSeverity,
  code: string,
  message: string,
  row?: Partial<FieldMapRow>,
): PremiumFieldMapFinding {
  return {
    filePath,
    rowNumber,
    severity,
    code,
    message,
    sectionKey: row?.section_key,
    fieldKey: row?.field_key,
    patternKey: row?.pattern_key,
  };
}

function requireValue(
  findings: PremiumFieldMapFinding[],
  filePath: string,
  rowNumber: number,
  row: FieldMapRow,
  field: keyof FieldMapRow,
) {
  if (!row[field]) {
    findings.push(
      createFinding(filePath, rowNumber, 'error', 'REQUIRED_VALUE_MISSING', `${field} is required.`, row),
    );
  }
}

function validateHeader(
  filePath: string,
  header: readonly string[],
  findings: PremiumFieldMapFinding[],
) {
  const expected = premiumFieldMapRequiredColumns.join('|');
  const actual = header.join('|');

  if (actual === expected) {
    return;
  }

  const missing = premiumFieldMapRequiredColumns.filter((field) => !header.includes(field));
  const extra = header.filter((field) => !premiumFieldMapRequiredColumns.includes(field as never));

  findings.push(
    createFinding(
      filePath,
      1,
      'error',
      'HEADER_MISMATCH',
      [
        `Header must exactly match: ${expected}.`,
        missing.length > 0 ? `Missing: ${missing.join(', ')}.` : '',
        extra.length > 0 ? `Unexpected: ${extra.join(', ')}.` : '',
      ]
        .filter(Boolean)
        .join(' '),
    ),
  );
}

function validateRankSignals(
  findings: PremiumFieldMapFinding[],
  filePath: string,
  rowNumber: number,
  row: FieldMapRow,
) {
  const rankFields = [
    'rank_1_signal_key',
    'rank_2_signal_key',
    'rank_3_signal_key',
    'rank_4_signal_key',
  ] as const;
  const signals = rankFields.map((field) => row[field]);

  for (const field of rankFields) {
    requireValue(findings, filePath, rowNumber, row, field);

    if (row[field] && !allowedSignalKeys.has(row[field])) {
      findings.push(
        createFinding(
          filePath,
          rowNumber,
          'error',
          'INVALID_SIGNAL_KEY',
          `${field} has invalid Leadership Approach signal key "${row[field]}".`,
          row,
        ),
      );
    }
  }

  const presentSignals = signals.filter(Boolean);
  if (presentSignals.length === 4 && new Set(presentSignals).size !== 4) {
    findings.push(
      createFinding(
        filePath,
        rowNumber,
        'error',
        'DUPLICATE_RANK_SIGNAL',
        'rank_1_signal_key through rank_4_signal_key must use each valid signal exactly once.',
        row,
      ),
    );
  }

  if (
    presentSignals.length === 4 &&
    (presentSignals.some((signal) => !allowedSignalKeys.has(signal)) ||
      [...allowedSignalKeys].some((signal) => !presentSignals.includes(signal)))
  ) {
    findings.push(
      createFinding(
        filePath,
        rowNumber,
        'error',
        'RANK_SIGNAL_SET_MISMATCH',
        'rank_1_signal_key through rank_4_signal_key must contain process, results, people, and vision exactly once.',
        row,
      ),
    );
  }

  if (row.pattern_key && presentSignals.length === 4) {
    const expectedPatternKey = signals.join('_');
    if (row.pattern_key !== expectedPatternKey) {
      findings.push(
        createFinding(
          filePath,
          rowNumber,
          'error',
          'PATTERN_KEY_RANK_MISMATCH',
          `pattern_key must equal ranked signals: ${expectedPatternKey}.`,
          row,
        ),
      );
    }
  }
}

function validateRow(
  findings: PremiumFieldMapFinding[],
  filePath: string,
  rowNumber: number,
  row: FieldMapRow,
  duplicateKeys: Set<string>,
  warnedListDuplicateKeys: Set<string>,
) {
  requireValue(findings, filePath, rowNumber, row, 'section_key');
  requireValue(findings, filePath, rowNumber, row, 'field_key');
  requireValue(findings, filePath, rowNumber, row, 'pattern_key');
  requireValue(findings, filePath, rowNumber, row, 'source_anchor');
  requireValue(findings, filePath, rowNumber, row, 'source_excerpt');
  requireValue(findings, filePath, rowNumber, row, 'transformation_rule');
  requireValue(findings, filePath, rowNumber, row, 'drift_check');
  requireValue(findings, filePath, rowNumber, row, 'status');
  validateRankSignals(findings, filePath, rowNumber, row);

  if (row.section_key && !isSectionKey(row.section_key)) {
    findings.push(
      createFinding(
        filePath,
        rowNumber,
        'error',
        'INVALID_SECTION_KEY',
        `section_key has unsupported value "${row.section_key}".`,
        row,
      ),
    );
  }

  if (isSectionKey(row.section_key)) {
    const allowedFields = new Set<string>(fieldKeysBySection[row.section_key]);
    if (row.field_key && !allowedFields.has(row.field_key)) {
      findings.push(
        createFinding(
          filePath,
          rowNumber,
          'error',
          'INVALID_FIELD_KEY',
          `field_key "${row.field_key}" is not valid for ${row.section_key}.`,
          row,
        ),
      );
    }

    if (scoreShapeDependentSections.has(row.section_key)) {
      requireValue(findings, filePath, rowNumber, row, 'score_shape');
    }

    if (patternLevelSections.has(row.section_key) && row.score_shape) {
      findings.push(
        createFinding(
          filePath,
          rowNumber,
          'warning',
          'PATTERN_LEVEL_SCORE_SHAPE_IGNORED',
          `${row.section_key} is pattern-level; score_shape is ignored until a later schema requires it.`,
          row,
        ),
      );
    }
  }

  if (row.score_shape && !allowedScoreShapes.has(row.score_shape)) {
    findings.push(
      createFinding(
        filePath,
        rowNumber,
        'error',
        'INVALID_SCORE_SHAPE',
        `score_shape has unsupported value "${row.score_shape}".`,
        row,
      ),
    );
  }

  if (row.source_anchor && !allowedSourceAnchors.has(row.source_anchor)) {
    findings.push(
      createFinding(
        filePath,
        rowNumber,
        'error',
        'INVALID_SOURCE_ANCHOR',
        `source_anchor has unsupported value "${row.source_anchor}".`,
        row,
      ),
    );
  }

  if (row.status && !allowedStatuses.has(row.status)) {
    findings.push(
      createFinding(
        filePath,
        rowNumber,
        'error',
        'INVALID_STATUS',
        `status has unsupported value "${row.status}".`,
        row,
      ),
    );
  }

  if (statusesRequiringFinalText.has(row.status) && !row.final_text) {
    findings.push(
      createFinding(
        filePath,
        rowNumber,
        'error',
        'FINAL_TEXT_REQUIRED',
        `final_text is required when status is ${row.status}.`,
        row,
      ),
    );
  }

  if (!isSectionKey(row.section_key) || !row.field_key || !row.pattern_key) {
    return;
  }

  if (scoreShapeDependentSections.has(row.section_key)) {
    const duplicateKey = [
      row.section_key,
      row.field_key,
      row.pattern_key,
      row.score_shape,
    ].join('|');

    if (row.score_shape && duplicateKeys.has(duplicateKey)) {
      findings.push(
        createFinding(
          filePath,
          rowNumber,
          'error',
          'DUPLICATE_SCORE_SHAPE_FIELD_ROW',
          'Duplicate field row for section_key + field_key + pattern_key + score_shape.',
          row,
        ),
      );
    }

    if (row.score_shape) {
      duplicateKeys.add(duplicateKey);
    }
    return;
  }

  if (patternLevelSections.has(row.section_key)) {
    const duplicateKey = [row.section_key, row.field_key, row.pattern_key].join('|');

    if (duplicateKeys.has(duplicateKey) && !warnedListDuplicateKeys.has(duplicateKey)) {
      findings.push(
        createFinding(
          filePath,
          rowNumber,
          'warning',
          'LIST_SECTION_DUPLICATE_FIELD_ROW',
          listSectionDuplicateWarning,
          row,
        ),
      );
      warnedListDuplicateKeys.add(duplicateKey);
    }

    duplicateKeys.add(duplicateKey);
  }
}

export function validatePremiumFieldMapText(
  source: string,
  filePath = '<inline>',
): PremiumFieldMapValidationResult {
  const findings: PremiumFieldMapFinding[] = [];
  const lines = normalizeSource(source);
  const header = splitPsvLine(lines[0] ?? '');
  const duplicateKeys = new Set<string>();
  const warnedListDuplicateKeys = new Set<string>();
  let rowsChecked = 0;

  if (lines.length === 0) {
    findings.push(createFinding(filePath, 1, 'error', 'EMPTY_FILE', 'Field map file is empty.'));
    return { pass: false, findings, filesChecked: 1, rowsChecked };
  }

  validateHeader(filePath, header, findings);

  for (let index = 1; index < lines.length; index += 1) {
    const line = lines[index];
    if (line.trim().length === 0) {
      continue;
    }

    const rowNumber = index + 1;
    const columns = splitPsvLine(line);
    rowsChecked += 1;

    if (columns.length !== header.length) {
      findings.push(
        createFinding(
          filePath,
          rowNumber,
          'error',
          'COLUMN_COUNT_MISMATCH',
          `Expected ${header.length} columns but found ${columns.length}.`,
        ),
      );
      continue;
    }

    const row = rowFromColumns(header, columns);
    validateRow(findings, filePath, rowNumber, row, duplicateKeys, warnedListDuplicateKeys);
  }

  return {
    pass: findings.every((finding) => finding.severity !== 'error'),
    findings,
    filesChecked: 1,
    rowsChecked,
  };
}

export async function validatePremiumFieldMapFile(
  filePath: string,
): Promise<PremiumFieldMapValidationResult> {
  const source = await readFile(filePath, 'utf8');
  return validatePremiumFieldMapText(source, filePath);
}

export async function validatePremiumFieldMapFiles(
  filePaths: readonly string[],
): Promise<PremiumFieldMapValidationResult> {
  const results = await Promise.all(filePaths.map((filePath) => validatePremiumFieldMapFile(filePath)));
  const findings = results.flatMap((result) => result.findings);

  return {
    pass: findings.every((finding) => finding.severity !== 'error'),
    findings,
    filesChecked: results.length,
    rowsChecked: results.reduce((total, result) => total + result.rowsChecked, 0),
  };
}

function parseArgs(argv: readonly string[]): readonly string[] {
  const files: string[] = [];

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === '--input') {
      const value = argv[index + 1];
      if (!value) {
        throw new Error('Missing value after --input.');
      }
      files.push(value);
      index += 1;
      continue;
    }

    files.push(arg);
  }

  return files;
}

function printResult(result: PremiumFieldMapValidationResult) {
  const errors = result.findings.filter((finding) => finding.severity === 'error');
  const warnings = result.findings.filter((finding) => finding.severity === 'warning');

  console.log(
    `Premium field map validation: ${result.pass ? 'PASS' : 'FAIL'} (${result.filesChecked} file(s), ${result.rowsChecked} row(s), ${errors.length} error(s), ${warnings.length} warning(s))`,
  );

  if (result.findings.length === 0) {
    console.log('Findings: none');
    return;
  }

  console.log('Findings:');
  for (const finding of result.findings) {
    console.log(
      [
        `- ${finding.severity.toUpperCase()}`,
        finding.code,
        `${finding.filePath}:${finding.rowNumber}`,
        finding.message,
        `section_key=${finding.sectionKey ?? ''}`,
        `field_key=${finding.fieldKey ?? ''}`,
        `pattern_key=${finding.patternKey ?? ''}`,
      ].join(' | '),
    );
  }
}

async function main() {
  const files = parseArgs(process.argv.slice(2));

  if (files.length === 0) {
    throw new Error('Provide one or more field map PSV paths, or use --input <path>.');
  }

  const result = await validatePremiumFieldMapFiles(files);
  printResult(result);

  if (!result.pass) {
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
