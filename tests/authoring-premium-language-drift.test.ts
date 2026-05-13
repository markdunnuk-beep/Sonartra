import assert from 'node:assert/strict';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';

import { auditPremiumLanguageDrift } from '@/scripts/authoring/audit-premium-language-drift';
import { premiumFieldMapRequiredColumns } from '@/scripts/authoring/validate-premium-field-map';

type Row = Record<string, string>;

const header = premiumFieldMapRequiredColumns.join('|');

const allDossierHeadings = `# Dossier

## 1. Pattern identity
Source.
## 2. Core leadership thesis
Source.
## 3. What your leadership naturally pays attention to
Source.
## 4. How your leadership creates value
Source.
## 5. How your style feels to other people
Source.
## 6. Decision behaviour
Source.
## 7. Communication behaviour
Source.
## 8. Pressure behaviour
Source.
## 9. What your pattern protects
Source.
## 10. The hidden cost
Source.
## 11. Where the pattern narrows
Source.
## 12. How rank 3 expands the pattern
Source.
## 13. How rank 4 expands the pattern
Source.
## 14. Practical development moves
Source.
## 15. Integrated closing interpretation
Source.
## 16. Memorable line
Source.
`;

function baseRow(overrides: Partial<Row> = {}): Row {
  return {
    section_key: '06_Orientation',
    field_key: 'score_shape_summary',
    pattern_key: 'process_results_people_vision',
    score_shape: 'paired',
    rank_1_signal_key: 'process',
    rank_2_signal_key: 'results',
    rank_3_signal_key: 'people',
    rank_4_signal_key: 'vision',
    source_anchor: 'pattern_identity',
    source_excerpt: 'Process and Results work together.',
    transformation_rule: 'Map source to field.',
    final_text: 'Process and Results work together as a close pair to organise work and create progress.',
    drift_check: 'Preserves paired meaning.',
    quality_notes: 'score_shape_summary',
    status: 'review',
    ...overrides,
  };
}

function serializeFieldMap(rows: readonly Row[]): string {
  return [
    header,
    ...rows.map((row) => premiumFieldMapRequiredColumns.map((field) => row[field] ?? '').join('|')),
  ].join('\n');
}

function generatedOrientation(text: string, extraHeader = ''): string {
  const baseHeader = 'domain_key|pattern_key|score_shape|rank_1_signal_key|rank_2_signal_key|rank_3_signal_key|rank_4_signal_key|orientation_title|orientation_summary|score_shape_summary|rank_1_phrase|rank_2_phrase|rank_3_phrase|rank_4_phrase|status|lookup_key';
  const headerLine = extraHeader ? `${baseHeader}|${extraHeader}` : baseHeader;
  const baseRow = `leadership_approach|process_results_people_vision|paired|process|results|people|vision||||${text}||||review|leadership_approach::process_results_people_vision::paired`;
  return `${headerLine}\n${extraHeader ? `${baseRow}|leaked` : baseRow}\n`;
}

async function withFixture(
  options: {
    dossier?: string;
    fieldMapRows?: readonly Row[];
    generatedText?: string;
    generatedExtraHeader?: string;
  },
  callback: (paths: { dossier: string; fieldMap: string; generatedDir: string; out: string }) => Promise<void>,
) {
  const tempDir = await mkdtemp(path.join(tmpdir(), 'premium-drift-'));
  const generatedDir = path.join(tempDir, 'generated');
  const dossier = path.join(tempDir, 'dossier.md');
  const fieldMap = path.join(tempDir, 'field-map.psv');
  const out = path.join(tempDir, 'audit.md');

  await mkdir(generatedDir, { recursive: true });
  await writeFile(dossier, options.dossier ?? allDossierHeadings, 'utf8');
  await writeFile(fieldMap, serializeFieldMap(options.fieldMapRows ?? [baseRow()]), 'utf8');
  await writeFile(
    path.join(generatedDir, '06-orientation-leadership-approach.preview.psv'),
    generatedOrientation(options.generatedText ?? baseRow().final_text, options.generatedExtraHeader),
    'utf8',
  );

  try {
    await callback({ dossier, fieldMap, generatedDir, out });
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
}

test('audit passes on a valid minimal dossier field map and generated PSV', async () => {
  await withFixture({}, async (paths) => {
    const result = await auditPremiumLanguageDrift({
      dossierPath: paths.dossier,
      fieldMapPath: paths.fieldMap,
      generatedDir: paths.generatedDir,
    });

    assert.equal(result.counts.errors, 0);
    assert.notEqual(result.overallResult, 'FAIL');
  });
});

test('audit fails when source_anchor is invalid', async () => {
  await withFixture({ fieldMapRows: [baseRow({ source_anchor: 'bad_anchor' })] }, async (paths) => {
    const result = await auditPremiumLanguageDrift({
      dossierPath: paths.dossier,
      fieldMapPath: paths.fieldMap,
      generatedDir: paths.generatedDir,
    });

    assert.equal(result.overallResult, 'FAIL');
    assert.ok(result.findings.some((finding) => finding.code.includes('INVALID_SOURCE_ANCHOR')));
  });
});

test('audit fails when referenced source_anchor cannot resolve to dossier section', async () => {
  await withFixture({
    dossier: '# Dossier\n\n## 1. Pattern identity\nOnly one source.',
    fieldMapRows: [baseRow({ source_anchor: 'core_leadership_thesis' })],
  }, async (paths) => {
    const result = await auditPremiumLanguageDrift({
      dossierPath: paths.dossier,
      fieldMapPath: paths.fieldMap,
      generatedDir: paths.generatedDir,
    });

    assert.equal(result.overallResult, 'FAIL');
    assert.ok(result.findings.some((finding) => finding.code === 'UNRESOLVED_DOSSIER_ANCHOR'));
  });
});

test('audit fails when source_excerpt is missing', async () => {
  await withFixture({ fieldMapRows: [baseRow({ source_excerpt: '' })] }, async (paths) => {
    const result = await auditPremiumLanguageDrift({
      dossierPath: paths.dossier,
      fieldMapPath: paths.fieldMap,
      generatedDir: paths.generatedDir,
    });

    assert.ok(result.findings.some((finding) => finding.code === 'TRACEABILITY_MISSING'));
  });
});

test('audit fails when transformation_rule is missing', async () => {
  await withFixture({ fieldMapRows: [baseRow({ transformation_rule: '' })] }, async (paths) => {
    const result = await auditPremiumLanguageDrift({
      dossierPath: paths.dossier,
      fieldMapPath: paths.fieldMap,
      generatedDir: paths.generatedDir,
    });

    assert.ok(result.findings.some((finding) => finding.code === 'TRACEABILITY_MISSING'));
  });
});

test('audit fails when drift_check is missing', async () => {
  await withFixture({ fieldMapRows: [baseRow({ drift_check: '' })] }, async (paths) => {
    const result = await auditPremiumLanguageDrift({
      dossierPath: paths.dossier,
      fieldMapPath: paths.fieldMap,
      generatedDir: paths.generatedDir,
    });

    assert.ok(result.findings.some((finding) => finding.code === 'TRACEABILITY_MISSING'));
  });
});

test('audit fails when generated PSV contains authoring-only fields', async () => {
  await withFixture({ generatedExtraHeader: 'source_anchor' }, async (paths) => {
    const result = await auditPremiumLanguageDrift({
      dossierPath: paths.dossier,
      fieldMapPath: paths.fieldMap,
      generatedDir: paths.generatedDir,
    });

    assert.ok(result.findings.some((finding) => finding.code === 'AUTHORING_FIELD_LEAK'));
  });
});

test('audit fails when generated PSV text cannot trace to field map final_text', async () => {
  await withFixture({ generatedText: 'Unmapped generated prose.' }, async (paths) => {
    const result = await auditPremiumLanguageDrift({
      dossierPath: paths.dossier,
      fieldMapPath: paths.fieldMap,
      generatedDir: paths.generatedDir,
    });

    assert.ok(result.findings.some((finding) => finding.code === 'GENERATED_TEXT_UNTRACED'));
  });
});

test('audit warns on duplicate or near-duplicate final_text', async () => {
  await withFixture({
    fieldMapRows: [
      baseRow({ field_key: 'orientation_title', final_text: 'Clear structure creates practical progress.' }),
      baseRow({ field_key: 'rank_1_phrase', final_text: 'Clear structure creates practical progress.' }),
      baseRow({ field_key: 'rank_2_phrase', final_text: 'Clear structure creates practical progress quickly.' }),
    ],
    generatedText: 'Clear structure creates practical progress.',
  }, async (paths) => {
    const result = await auditPremiumLanguageDrift({
      dossierPath: paths.dossier,
      fieldMapPath: paths.fieldMap,
      generatedDir: paths.generatedDir,
    });

    assert.ok(result.findings.some((finding) => finding.code === 'DUPLICATE_FINAL_TEXT'));
    assert.ok(result.findings.some((finding) => finding.code === 'NEAR_DUPLICATE_FINAL_TEXT'));
  });
});

test('audit warns on repeated opening phrases', async () => {
  await withFixture({
    fieldMapRows: [
      baseRow({ field_key: 'orientation_title', final_text: 'Your leadership approach creates structure.' }),
      baseRow({ field_key: 'rank_1_phrase', final_text: 'Your leadership approach creates progress.' }),
      baseRow({ field_key: 'rank_2_phrase', final_text: 'Your leadership approach creates ownership.' }),
      baseRow({ field_key: 'rank_3_phrase', final_text: 'Your leadership approach creates direction.' }),
    ],
    generatedText: 'Your leadership approach creates structure.',
  }, async (paths) => {
    const result = await auditPremiumLanguageDrift({
      dossierPath: paths.dossier,
      fieldMapPath: paths.fieldMap,
      generatedDir: paths.generatedDir,
    });

    assert.ok(result.findings.some((finding) => finding.code === 'REPEATED_OPENING'));
  });
});

test('audit warns on generic phrase density', async () => {
  await withFixture({
    fieldMapRows: [baseRow({ final_text: 'This pattern can unlock potential, empower teams, and drive success.' })],
    generatedText: 'This pattern can unlock potential, empower teams, and drive success.',
  }, async (paths) => {
    const result = await auditPremiumLanguageDrift({
      dossierPath: paths.dossier,
      fieldMapPath: paths.fieldMap,
      generatedDir: paths.generatedDir,
    });

    assert.ok(result.findings.some((finding) => finding.code === 'GENERIC_DENSITY'));
  });
});

test('audit warns when People or Vision are framed with deficit terms', async () => {
  await withFixture({
    fieldMapRows: [baseRow({ final_text: 'People is missing and Vision is weak in this field.' })],
    generatedText: 'People is missing and Vision is weak in this field.',
  }, async (paths) => {
    const result = await auditPremiumLanguageDrift({
      dossierPath: paths.dossier,
      fieldMapPath: paths.fieldMap,
      generatedDir: paths.generatedDir,
    });

    assert.ok(result.findings.some((finding) => finding.code === 'RANGE_SIGNAL_DEFICIT_FRAMING'));
  });
});

test('audit warns if paired score-shape interpretation is weak', async () => {
  await withFixture({
    fieldMapRows: [baseRow({ final_text: 'The shape explains the result clearly.' })],
    generatedText: 'The shape explains the result clearly.',
  }, async (paths) => {
    const result = await auditPremiumLanguageDrift({
      dossierPath: paths.dossier,
      fieldMapPath: paths.fieldMap,
      generatedDir: paths.generatedDir,
    });

    assert.ok(result.findings.some((finding) => finding.code === 'PAIRED_SUMMARY_WEAK'));
  });
});

test('audit exits zero equivalent on warnings only', async () => {
  await withFixture({
    fieldMapRows: [baseRow({ final_text: 'This pattern can unlock potential and drive success.' })],
    generatedText: 'This pattern can unlock potential and drive success.',
  }, async (paths) => {
    const result = await auditPremiumLanguageDrift({
      dossierPath: paths.dossier,
      fieldMapPath: paths.fieldMap,
      generatedDir: paths.generatedDir,
    });

    assert.equal(result.counts.errors, 0);
    assert.equal(result.overallResult, 'PASS_WITH_WARNINGS');
  });
});

test('audit exits non-zero equivalent on errors', async () => {
  await withFixture({ generatedText: 'Unmapped generated prose.' }, async (paths) => {
    const result = await auditPremiumLanguageDrift({
      dossierPath: paths.dossier,
      fieldMapPath: paths.fieldMap,
      generatedDir: paths.generatedDir,
    });

    assert.ok(result.counts.errors > 0);
    assert.equal(result.overallResult, 'FAIL');
  });
});
