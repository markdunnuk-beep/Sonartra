import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

import {
  readerFirstRequiredHeaders,
  type ReaderFirstSectionKey,
} from '@/content/authoring/reader-first-schema-manifest';
import {
  premiumFieldMapRequiredColumns,
  validatePremiumFieldMapText,
} from '@/scripts/authoring/validate-premium-field-map';

type FieldMapRow = Record<(typeof premiumFieldMapRequiredColumns)[number], string>;
type FindingSeverity = 'error' | 'warning';

export type PremiumLanguageDriftFinding = {
  readonly severity: FindingSeverity;
  readonly code: string;
  readonly message: string;
  readonly filePath?: string;
  readonly rowNumber?: number;
  readonly sectionKey?: string;
  readonly fieldKey?: string;
  readonly patternKey?: string;
};

export type PremiumLanguageDriftAuditOptions = {
  readonly dossierPath: string;
  readonly fieldMapPath: string;
  readonly generatedDir: string;
  readonly outPath?: string;
};

export type PremiumLanguageDriftAuditResult = {
  readonly overallResult: 'PASS' | 'PASS_WITH_WARNINGS' | 'FAIL';
  readonly findings: readonly PremiumLanguageDriftFinding[];
  readonly report: string;
  readonly counts: {
    readonly fieldMapRowsChecked: number;
    readonly generatedPreviewFilesChecked: number;
    readonly generatedPreviewRowsChecked: number;
    readonly errors: number;
    readonly warnings: number;
  };
  readonly anchorUsage: readonly AnchorUsage[];
};

type AnchorUsage = {
  readonly anchor: string;
  readonly existsInDossier: boolean;
  readonly usageCount: number;
};

type GeneratedFieldValue = {
  readonly filePath: string;
  readonly rowNumber: number;
  readonly sectionKey: ReaderFirstSectionKey;
  readonly fieldKey: string;
  readonly value: string;
  readonly patternKey?: string;
};

const sourceAnchors = [
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
] as const;

const requiredAnchors = new Set<string>(sourceAnchors);
const sourceAnchorSet = new Set<string>(sourceAnchors);

const dossierHeadingAnchors: Record<string, string> = {
  '1. pattern identity': 'pattern_identity',
  '2. core leadership thesis': 'core_leadership_thesis',
  '3. what your leadership naturally pays attention to': 'attention_pattern',
  '4. how your leadership creates value': 'value_creation',
  '5. how your style feels to other people': 'felt_experience',
  '6. decision behaviour': 'decision_behaviour',
  '7. communication behaviour': 'communication_behaviour',
  '8. pressure behaviour': 'pressure_behaviour',
  '9. what your pattern protects': 'protective_function',
  '10. the hidden cost': 'hidden_cost',
  '11. where the pattern narrows': 'narrowing_pattern',
  '12. how rank 3 expands the pattern': 'rank_3_extension',
  '12. how people expands the pattern': 'rank_3_extension',
  '13. how rank 4 expands the pattern': 'rank_4_extension',
  '13. how vision expands the pattern': 'rank_4_extension',
  '14. practical development moves': 'development_moves',
  '15. integrated closing interpretation': 'integrated_closing',
  '16. memorable line': 'memorable_line',
};

const authoringOnlyFields = new Set([
  'source_anchor',
  'source_excerpt',
  'transformation_rule',
  'drift_check',
  'quality_notes',
]);

const relationshipFields = new Set([
  'domain_key',
  'pattern_key',
  'score_shape',
  'rank_1_signal_key',
  'rank_2_signal_key',
  'rank_3_signal_key',
  'rank_4_signal_key',
  'strength_key',
  'narrowing_key',
  'application_key',
  'priority',
  'status',
  'lookup_key',
]);

const genericPhrases = [
  'at its best',
  'this pattern',
  'leadership style',
  'bring balance',
  'unlock potential',
  'lean into',
  'step into',
  'journey',
  'empower',
  'thrive',
  'authentic',
  'holistic',
  'high performance',
  'drive success',
  'game changer',
];

const behaviourWords = [
  'organise',
  'organised',
  'organising',
  'decide',
  'decision',
  'communicate',
  'communication',
  'involve',
  'trust',
  'ownership',
  'direction',
  'sequence',
  'progress',
  'route',
  'purpose',
  'pressure',
  'team',
  'work',
  'action',
  'standard',
  'future',
  'shared',
  'delivery',
];

const deficitTerms = ['weak', 'low', 'lacking', 'absent', 'missing', 'failure', 'deficiency'];
const prohibitedReaderTerms = [
  'pattern_key',
  'score calculation',
  'psv',
  'workbook',
  'schema',
  'source_anchor',
  'field map',
  'runtime',
  'payload',
  'canonical_result_payload',
];

const pairedSections = new Set(['06_Orientation', '09_Pattern_Mechanics', '10_Pattern_Synthesis', '14_Closing_Integration']);
const nonProseFieldKeys = new Set(['linked_signal_key', 'missing_range_signal_key']);

function splitPsvLine(line: string): readonly string[] {
  return line.split('|');
}

function normalizeSource(source: string): readonly string[] {
  const normalized = source.replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim();
  return normalized.length > 0 ? normalized.split('\n') : [];
}

function normalizeText(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function words(value: string): string[] {
  return normalizeText(value).split(' ').filter(Boolean);
}

function parseFieldMapRows(source: string, fieldMapPath: string): { rows: FieldMapRow[]; findings: PremiumLanguageDriftFinding[] } {
  const findings: PremiumLanguageDriftFinding[] = [];
  const validation = validatePremiumFieldMapText(source, fieldMapPath);
  findings.push(
    ...validation.findings
      .filter((finding) => finding.severity === 'error')
      .map((finding) => ({
        severity: 'error' as const,
        code: `FIELD_MAP_${finding.code}`,
        message: finding.message,
        filePath: finding.filePath,
        rowNumber: finding.rowNumber,
        sectionKey: finding.sectionKey,
        fieldKey: finding.fieldKey,
        patternKey: finding.patternKey,
      })),
  );

  const lines = normalizeSource(source);
  const header = splitPsvLine(lines[0] ?? '');
  const rows = lines
    .slice(1)
    .filter((line) => line.trim().length > 0)
    .map((line) =>
      Object.fromEntries(
        premiumFieldMapRequiredColumns.map((field) => [field, splitPsvLine(line)[header.indexOf(field)]?.trim() ?? '']),
      ) as FieldMapRow,
    );

  return { rows, findings };
}

function inferDossierAnchors(dossierText: string): Set<string> {
  const anchors = new Set<string>();

  for (const line of dossierText.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n')) {
    const explicit = line.match(/source[_ -]anchor:\s*`?([a-z0-9_]+)`?/i);
    if (explicit?.[1]) {
      anchors.add(explicit[1]);
    }

    const heading = line.match(/^##\s+(.+?)\s*$/);
    if (!heading?.[1]) {
      continue;
    }

    const normalizedHeading = normalizeText(heading[1]).replace(/^(\d+) /, '$1. ');
    const anchor = dossierHeadingAnchors[normalizedHeading];
    if (anchor) {
      anchors.add(anchor);
    }
  }

  return anchors;
}

function addFinding(findings: PremiumLanguageDriftFinding[], finding: PremiumLanguageDriftFinding) {
  findings.push(finding);
}

function checkTraceability(
  rows: readonly FieldMapRow[],
  findings: PremiumLanguageDriftFinding[],
  dossierAnchors: Set<string>,
  fieldMapPath: string,
) {
  rows.forEach((row, index) => {
    const rowNumber = index + 2;
    for (const field of ['source_anchor', 'source_excerpt', 'transformation_rule', 'drift_check'] as const) {
      if (!row[field]) {
        addFinding(findings, {
          severity: 'error',
          code: 'TRACEABILITY_MISSING',
          message: `${field} is required for drift audit traceability.`,
          filePath: fieldMapPath,
          rowNumber,
          sectionKey: row.section_key,
          fieldKey: row.field_key,
          patternKey: row.pattern_key,
        });
      }
    }

    if (['review', 'approved', 'active'].includes(row.status) && !row.final_text) {
      addFinding(findings, {
        severity: 'error',
        code: 'FINAL_TEXT_MISSING',
        message: 'final_text is required for review, approved, and active rows.',
        filePath: fieldMapPath,
        rowNumber,
        sectionKey: row.section_key,
        fieldKey: row.field_key,
        patternKey: row.pattern_key,
      });
    }

    if (!sourceAnchorSet.has(row.source_anchor)) {
      addFinding(findings, {
        severity: 'error',
        code: 'INVALID_SOURCE_ANCHOR',
        message: `source_anchor ${row.source_anchor} is not in the approved anchor list.`,
        filePath: fieldMapPath,
        rowNumber,
        sectionKey: row.section_key,
        fieldKey: row.field_key,
        patternKey: row.pattern_key,
      });
      return;
    }

    if (!dossierAnchors.has(row.source_anchor)) {
      addFinding(findings, {
        severity: 'error',
        code: 'UNRESOLVED_DOSSIER_ANCHOR',
        message: `source_anchor ${row.source_anchor} could not be resolved to a dossier section.`,
        filePath: fieldMapPath,
        rowNumber,
        sectionKey: row.section_key,
        fieldKey: row.field_key,
        patternKey: row.pattern_key,
      });
    }
  });
}

function anchorUsage(rows: readonly FieldMapRow[], dossierAnchors: Set<string>): AnchorUsage[] {
  return sourceAnchors.map((anchor) => ({
    anchor,
    existsInDossier: dossierAnchors.has(anchor),
    usageCount: rows.filter((row) => row.source_anchor === anchor).length,
  }));
}

function checkRequiredAnchorUsage(usage: readonly AnchorUsage[], findings: PremiumLanguageDriftFinding[]) {
  for (const item of usage) {
    if (requiredAnchors.has(item.anchor) && item.usageCount === 0) {
      addFinding(findings, {
        severity: 'warning',
        code: 'ANCHOR_NOT_USED',
        message: `Required benchmark anchor ${item.anchor} is not used by the current field map.`,
      });
    }
  }
}

async function parseGeneratedValues(generatedDir: string, findings: PremiumLanguageDriftFinding[]) {
  const files = (await readdir(generatedDir)).filter((file) => file.endsWith('.psv')).sort();
  const values: GeneratedFieldValue[] = [];
  let generatedRowsChecked = 0;

  for (const file of files) {
    const filePath = path.join(generatedDir, file);
    const lines = normalizeSource(await readFile(filePath, 'utf8'));
    const header = splitPsvLine(lines[0] ?? '');

    for (const field of header) {
      if (authoringOnlyFields.has(field)) {
        addFinding(findings, {
          severity: 'error',
          code: 'AUTHORING_FIELD_LEAK',
          message: `Generated PSV header includes authoring-only field ${field}.`,
          filePath,
          rowNumber: 1,
        });
      }
    }

    const sectionKey = sectionKeyFromGeneratedFile(file);
    if (!sectionKey) {
      continue;
    }

    for (let lineIndex = 1; lineIndex < lines.length; lineIndex += 1) {
      const columns = splitPsvLine(lines[lineIndex]);
      generatedRowsChecked += 1;
      const row = Object.fromEntries(header.map((field, index) => [field, columns[index] ?? '']));

      for (const [field, value] of Object.entries(row)) {
        if (!value || relationshipFields.has(field)) {
          continue;
        }

        values.push({
          filePath,
          rowNumber: lineIndex + 1,
          sectionKey,
          fieldKey: field,
          value,
          patternKey: row.pattern_key,
        });
      }
    }
  }

  return { filesChecked: files.length, rowsChecked: generatedRowsChecked, values };
}

function sectionKeyFromGeneratedFile(fileName: string): ReaderFirstSectionKey | null {
  const mapping: Array<[string, ReaderFirstSectionKey]> = [
    ['06-orientation-', '06_Orientation'],
    ['07-recognition-', '07_Recognition'],
    ['09-pattern-mechanics-', '09_Pattern_Mechanics'],
    ['10-pattern-synthesis-', '10_Pattern_Synthesis'],
    ['11-strengths-', '11_Strengths'],
    ['12-narrowing-', '12_Narrowing'],
    ['13-application-', '13_Application'],
    ['14-closing-integration-', '14_Closing_Integration'],
  ];
  return mapping.find(([prefix]) => fileName.startsWith(prefix))?.[1] ?? null;
}

function checkGeneratedLineage(
  generatedValues: readonly GeneratedFieldValue[],
  rows: readonly FieldMapRow[],
  findings: PremiumLanguageDriftFinding[],
) {
  const mappedFinalTexts = new Set(rows.map((row) => row.final_text).filter(Boolean));

  for (const generated of generatedValues) {
    if (!mappedFinalTexts.has(generated.value)) {
      addFinding(findings, {
        severity: 'error',
        code: 'GENERATED_TEXT_UNTRACED',
        message: `Generated value for ${generated.fieldKey} is not traceable to field-map final_text.`,
        filePath: generated.filePath,
        rowNumber: generated.rowNumber,
        sectionKey: generated.sectionKey,
        fieldKey: generated.fieldKey,
        patternKey: generated.patternKey,
      });
    }

    for (const term of prohibitedReaderTerms) {
      if (normalizeText(generated.value).includes(normalizeText(term))) {
        addFinding(findings, {
          severity: 'error',
          code: 'PROHIBITED_READER_WORDING',
          message: `Generated reader-facing field contains prohibited audit/runtime wording: ${term}.`,
          filePath: generated.filePath,
          rowNumber: generated.rowNumber,
          sectionKey: generated.sectionKey,
          fieldKey: generated.fieldKey,
          patternKey: generated.patternKey,
        });
      }
    }
  }
}

function checkGenericLanguage(rows: readonly FieldMapRow[], findings: PremiumLanguageDriftFinding[], fieldMapPath: string) {
  const phraseLocations = new Map<string, number[]>();

  rows.filter((row) => !nonProseFieldKeys.has(row.field_key)).forEach((row, index) => {
    const text = normalizeText(row.final_text);
    for (const phrase of genericPhrases) {
      const normalizedPhrase = normalizeText(phrase);
      const count = text.split(normalizedPhrase).length - 1;
      if (count > 0) {
        phraseLocations.set(phrase, [...(phraseLocations.get(phrase) ?? []), index + 2]);
      }
    }

    const totalGenericHits = genericPhrases.reduce(
      (total, phrase) => total + (text.split(normalizeText(phrase)).length - 1),
      0,
    );
    if (totalGenericHits >= 2) {
      addFinding(findings, {
        severity: 'warning',
        code: 'GENERIC_DENSITY',
        message: `final_text contains ${totalGenericHits} generic phrase hits.`,
        filePath: fieldMapPath,
        rowNumber: index + 2,
        sectionKey: row.section_key,
        fieldKey: row.field_key,
        patternKey: row.pattern_key,
      });
    }
  });

  for (const [phrase, locations] of phraseLocations) {
    if (locations.length >= 2) {
      addFinding(findings, {
        severity: 'warning',
        code: 'GENERIC_PHRASE_REPETITION',
        message: `Generic phrase "${phrase}" appears in ${locations.length} final_text values at rows ${locations.join(', ')}.`,
        filePath: fieldMapPath,
      });
    }
  }
}

function checkSignalLabelOveruse(rows: readonly FieldMapRow[], findings: PremiumLanguageDriftFinding[], fieldMapPath: string) {
  for (const [index, row] of rows.entries()) {
    if (nonProseFieldKeys.has(row.field_key)) {
      continue;
    }
    const tokens = words(row.final_text);
    const signalMentions = tokens.filter((token) => ['process', 'results', 'people', 'vision'].includes(token));
    if (signalMentions.length === 0) {
      continue;
    }

    if (tokens.length <= 22 && signalMentions.length > 2) {
      addFinding(findings, {
        severity: 'warning',
        code: 'SIGNAL_LABEL_DENSE_SHORT_FIELD',
        message: 'Short final_text uses more than two signal labels.',
        filePath: fieldMapPath,
        rowNumber: index + 2,
        sectionKey: row.section_key,
        fieldKey: row.field_key,
        patternKey: row.pattern_key,
      });
    }

    const hasBehaviourWord = tokens.some((token) => behaviourWords.includes(token));
    if (!hasBehaviourWord) {
      addFinding(findings, {
        severity: 'warning',
        code: 'SIGNAL_LABEL_WITHOUT_BEHAVIOUR',
        message: 'Signal label appears without nearby behavioural vocabulary.',
        filePath: fieldMapPath,
        rowNumber: index + 2,
        sectionKey: row.section_key,
        fieldKey: row.field_key,
        patternKey: row.pattern_key,
      });
    }
  }
}

function jaccardSimilarity(left: string, right: string): number {
  const leftWords = new Set(words(left));
  const rightWords = new Set(words(right));
  const union = new Set([...leftWords, ...rightWords]);
  const intersection = [...leftWords].filter((word) => rightWords.has(word));
  return union.size === 0 ? 0 : intersection.length / union.size;
}

function checkRepetition(rows: readonly FieldMapRow[], findings: PremiumLanguageDriftFinding[], fieldMapPath: string) {
  const textRows = rows.filter((row) => row.final_text && !nonProseFieldKeys.has(row.field_key));
  const normalizedToRows = new Map<string, FieldMapRow[]>();
  const openingMap = new Map<string, FieldMapRow[]>();

  for (const row of textRows) {
    const normalized = normalizeText(row.final_text);
    normalizedToRows.set(normalized, [...(normalizedToRows.get(normalized) ?? []), row]);
    const opening = words(row.final_text).slice(0, 4).join(' ');
    if (opening) {
      openingMap.set(opening, [...(openingMap.get(opening) ?? []), row]);
    }
  }

  for (const [normalized, matches] of normalizedToRows) {
    if (normalized && matches.length > 1) {
      addFinding(findings, {
        severity: 'warning',
        code: 'DUPLICATE_FINAL_TEXT',
        message: `Identical final_text appears ${matches.length} times: "${matches[0]?.final_text}".`,
        filePath: fieldMapPath,
      });
    }
  }

  for (let leftIndex = 0; leftIndex < textRows.length; leftIndex += 1) {
    for (let rightIndex = leftIndex + 1; rightIndex < textRows.length; rightIndex += 1) {
      const left = textRows[leftIndex];
      const right = textRows[rightIndex];
      if (!left || !right || left.final_text === right.final_text) {
        continue;
      }
      if (jaccardSimilarity(left.final_text, right.final_text) >= 0.78) {
        addFinding(findings, {
          severity: 'warning',
          code: 'NEAR_DUPLICATE_FINAL_TEXT',
          message: `Near-identical final_text values detected between ${left.section_key}/${left.field_key} and ${right.section_key}/${right.field_key}.`,
          filePath: fieldMapPath,
        });
      }
    }
  }

  for (const [opening, matches] of openingMap) {
    if (matches.length > 3) {
      addFinding(findings, {
        severity: 'warning',
        code: 'REPEATED_OPENING',
        message: `More than three fields start with "${opening}".`,
        filePath: fieldMapPath,
      });
    }
  }
}

function checkSectionCoherence(rows: readonly FieldMapRow[], findings: PremiumLanguageDriftFinding[], fieldMapPath: string) {
  const orientationText = rows
    .filter((row) => row.section_key === '06_Orientation')
    .map((row) => row.final_text)
    .join(' ');
  const normalizedOrientation = normalizeText(orientationText);

  if (
    !(
      normalizedOrientation.includes('process') &&
      normalizedOrientation.includes('results') &&
      (normalizedOrientation.includes('paired') ||
        normalizedOrientation.includes('together') ||
        normalizedOrientation.includes('strengthened'))
    )
  ) {
    addFinding(findings, {
      severity: 'warning',
      code: 'ORIENTATION_PAIRING_WEAK',
      message: '06_Orientation does not clearly mention Process and Results as a paired or close-working pattern.',
      filePath: fieldMapPath,
      sectionKey: '06_Orientation',
    });
  }

  rows.forEach((row, index) => {
    if (nonProseFieldKeys.has(row.field_key)) {
      return;
    }
    const text = normalizeText(row.final_text);
    const mentionsRangeSignal = text.includes('people') || text.includes('vision');
    if (
      mentionsRangeSignal &&
      deficitTerms.some((term) => new RegExp(`\\b${term}\\b`, 'i').test(row.final_text))
    ) {
      addFinding(findings, {
        severity: 'warning',
        code: 'RANGE_SIGNAL_DEFICIT_FRAMING',
        message: 'People or Vision appears near deficit-style wording.',
        filePath: fieldMapPath,
        rowNumber: index + 2,
        sectionKey: row.section_key,
        fieldKey: row.field_key,
        patternKey: row.pattern_key,
      });
    }
  });
}

function checkScoreShape(rows: readonly FieldMapRow[], findings: PremiumLanguageDriftFinding[], fieldMapPath: string) {
  const scoreShapeSummary = rows.find(
    (row) => row.section_key === '06_Orientation' && row.field_key === 'score_shape_summary',
  )?.final_text ?? '';
  const normalizedSummary = normalizeText(scoreShapeSummary);

  if (
    !(
      normalizedSummary.includes('process') &&
      normalizedSummary.includes('results') &&
      (normalizedSummary.includes('together') || normalizedSummary.includes('pair'))
    )
  ) {
    addFinding(findings, {
      severity: 'warning',
      code: 'PAIRED_SUMMARY_WEAK',
      message: 'score_shape_summary does not clearly interpret Process and Results as a close working pair.',
      filePath: fieldMapPath,
      sectionKey: '06_Orientation',
      fieldKey: 'score_shape_summary',
    });
  }

  for (const sectionKey of pairedSections) {
    const sectionText = normalizeText(rows.filter((row) => row.section_key === sectionKey).map((row) => row.final_text).join(' '));
    if (
      !(
        sectionText.includes('process') &&
        sectionText.includes('results') &&
        (sectionText.includes('paired') || sectionText.includes('together') || sectionText.includes('strengthened'))
      )
    ) {
      addFinding(findings, {
        severity: 'warning',
        code: 'SECTION_PAIRING_ABSENT',
        message: `${sectionKey} does not clearly carry paired Process-and-Results interpretation.`,
        filePath: fieldMapPath,
        sectionKey,
      });
    }
  }
}

function addListSectionWarning(findings: PremiumLanguageDriftFinding[]) {
  addFinding(findings, {
    severity: 'warning',
    code: 'LIST_ITEM_IDENTITY_PREVIEW_ONLY',
    message: '11/12/13 list item identity currently relies on quality_notes markers for preview generation and must be production-hardened before promotion if required.',
  });
}

function reportSection(title: string, lines: readonly string[]): string {
  return [`## ${title}`, '', ...(lines.length > 0 ? lines : ['- none']), ''].join('\n');
}

function formatFindings(findings: readonly PremiumLanguageDriftFinding[], severity: FindingSeverity): string[] {
  const selected = findings.filter((finding) => finding.severity === severity);
  if (selected.length === 0) {
    return ['- none'];
  }
  return selected.map((finding) =>
    `- ${finding.code}: ${finding.message}${finding.filePath ? ` (${finding.filePath}${finding.rowNumber ? `:${finding.rowNumber}` : ''})` : ''}`,
  );
}

function buildReport(
  options: PremiumLanguageDriftAuditOptions,
  result: Omit<PremiumLanguageDriftAuditResult, 'report'>,
): string {
  const anchorTable = [
    '| source_anchor | exists_in_dossier | usage_count |',
    '| --- | ---: | ---: |',
    ...result.anchorUsage.map((item) => `| ${item.anchor} | ${item.existsInDossier ? 'yes' : 'no'} | ${item.usageCount} |`),
  ];
  const errors = result.findings.filter((finding) => finding.severity === 'error');
  const warnings = result.findings.filter((finding) => finding.severity === 'warning');

  return [
    '# Premium Language Drift Audit',
    '',
    `Generated: ${new Date().toISOString()}`,
    '',
    `Overall result: ${result.overallResult}`,
    '',
    '## Input Files',
    '',
    `- Dossier: ${options.dossierPath}`,
    `- Field map: ${options.fieldMapPath}`,
    `- Generated preview directory: ${options.generatedDir}`,
    '',
    '## Counts',
    '',
    `- Field map rows checked: ${result.counts.fieldMapRowsChecked}`,
    `- Generated preview files checked: ${result.counts.generatedPreviewFilesChecked}`,
    `- Generated preview rows checked: ${result.counts.generatedPreviewRowsChecked}`,
    `- Errors: ${errors.length}`,
    `- Warnings: ${warnings.length}`,
    '',
    reportSection('Anchor Usage', anchorTable),
    reportSection('Field Traceability Summary', errors.some((finding) => finding.code.includes('TRACEABILITY') || finding.code.includes('FINAL_TEXT')) ? formatFindings(result.findings, 'error').filter((line) => /TRACEABILITY|FINAL_TEXT/.test(line)) : ['- Traceability fields present for all checked rows.']),
    reportSection('Generated PSV Leakage Check', errors.some((finding) => ['AUTHORING_FIELD_LEAK', 'PROHIBITED_READER_WORDING', 'GENERATED_TEXT_UNTRACED'].includes(finding.code)) ? formatFindings(result.findings, 'error').filter((line) => /AUTHORING_FIELD_LEAK|PROHIBITED_READER_WORDING|GENERATED_TEXT_UNTRACED/.test(line)) : ['- No authoring-only fields or untraced generated text detected.']),
    reportSection('Generic/Modular Language Warnings', warnings.filter((finding) => finding.code.startsWith('GENERIC') || finding.code.startsWith('SIGNAL_LABEL')).map((finding) => `- ${finding.code}: ${finding.message}`)),
    reportSection('Repetition Warnings', warnings.filter((finding) => ['DUPLICATE_FINAL_TEXT', 'NEAR_DUPLICATE_FINAL_TEXT', 'REPEATED_OPENING'].includes(finding.code)).map((finding) => `- ${finding.code}: ${finding.message}`)),
    reportSection('Score-Shape Warnings', warnings.filter((finding) => ['ORIENTATION_PAIRING_WEAK', 'PAIRED_SUMMARY_WEAK', 'SECTION_PAIRING_ABSENT', 'RANGE_SIGNAL_DEFICIT_FRAMING'].includes(finding.code)).map((finding) => `- ${finding.code}: ${finding.message}`)),
    reportSection('List-Section Item Identity Warning', warnings.filter((finding) => finding.code === 'LIST_ITEM_IDENTITY_PREVIEW_ONLY').map((finding) => `- ${finding.message}`)),
    reportSection('Errors', formatFindings(result.findings, 'error')),
    reportSection('Warnings', formatFindings(result.findings, 'warning')),
    '## Recommended Next Actions',
    '',
    errors.length > 0 ? '- Resolve blocking errors before using generated preview output.' : '- No blocking errors found.',
    '- Review warnings for generic wording, repetition, paired-shape clarity, and list-section item identity before Task 7.',
    '- Keep generated preview rows out of production package files until a separate promotion task.',
    '',
  ].join('\n');
}

export async function auditPremiumLanguageDrift(
  options: PremiumLanguageDriftAuditOptions,
): Promise<PremiumLanguageDriftAuditResult> {
  const findings: PremiumLanguageDriftFinding[] = [];
  const [dossierText, fieldMapText] = await Promise.all([
    readFile(options.dossierPath, 'utf8'),
    readFile(options.fieldMapPath, 'utf8'),
  ]);
  const dossierAnchors = inferDossierAnchors(dossierText);
  const parsed = parseFieldMapRows(fieldMapText, options.fieldMapPath);
  findings.push(...parsed.findings);
  const rows = parsed.rows;
  const usage = anchorUsage(rows, dossierAnchors);

  checkTraceability(rows, findings, dossierAnchors, options.fieldMapPath);
  checkRequiredAnchorUsage(usage, findings);
  checkGenericLanguage(rows, findings, options.fieldMapPath);
  checkSignalLabelOveruse(rows, findings, options.fieldMapPath);
  checkRepetition(rows, findings, options.fieldMapPath);
  checkSectionCoherence(rows, findings, options.fieldMapPath);
  checkScoreShape(rows, findings, options.fieldMapPath);
  addListSectionWarning(findings);

  const generated = await parseGeneratedValues(options.generatedDir, findings);
  checkGeneratedLineage(generated.values, rows, findings);

  const errors = findings.filter((finding) => finding.severity === 'error').length;
  const warnings = findings.filter((finding) => finding.severity === 'warning').length;
  const overallResult = errors > 0 ? 'FAIL' : warnings > 0 ? 'PASS_WITH_WARNINGS' : 'PASS';
  const resultWithoutReport = {
    overallResult,
    findings,
    counts: {
      fieldMapRowsChecked: rows.length,
      generatedPreviewFilesChecked: generated.filesChecked,
      generatedPreviewRowsChecked: generated.rowsChecked,
      errors,
      warnings,
    },
    anchorUsage: usage,
  };
  const report = buildReport(options, resultWithoutReport);

  return {
    ...resultWithoutReport,
    report,
  };
}

function parseArgs(argv: readonly string[]): PremiumLanguageDriftAuditOptions {
  const options: Partial<PremiumLanguageDriftAuditOptions> = {};

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const value = argv[index + 1];

    if (arg === '--dossier') {
      options.dossierPath = value;
      index += 1;
      continue;
    }
    if (arg === '--field-map') {
      options.fieldMapPath = value;
      index += 1;
      continue;
    }
    if (arg === '--generated-dir') {
      options.generatedDir = value;
      index += 1;
      continue;
    }
    if (arg === '--out') {
      options.outPath = value;
      index += 1;
      continue;
    }
    throw new Error(`Unsupported argument: ${arg}`);
  }

  if (!options.dossierPath || !options.fieldMapPath || !options.generatedDir) {
    throw new Error('Missing required --dossier, --field-map, or --generated-dir argument.');
  }

  return options as PremiumLanguageDriftAuditOptions;
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const result = await auditPremiumLanguageDrift(options);

  if (options.outPath) {
    await mkdir(path.dirname(options.outPath), { recursive: true });
    await writeFile(options.outPath, result.report, 'utf8');
  }

  console.log(
    `Premium language drift audit: ${result.overallResult} (${result.counts.errors} error(s), ${result.counts.warnings} warning(s))`,
  );

  if (options.outPath) {
    console.log(`Report: ${options.outPath}`);
  }

  if (result.overallResult === 'FAIL') {
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
