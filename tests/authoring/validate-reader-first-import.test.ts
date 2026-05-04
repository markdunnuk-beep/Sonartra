import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';

import {
  flowStateAuthoringConstants,
  readerFirstAllowedApplicationAreas,
  readerFirstAllowedRankRoles,
  readerFirstAllowedScoreShapes,
  readerFirstAllowedSignalKeys,
  readerFirstRequiredHeaders,
  type ReaderFirstSectionKey,
} from '@/content/authoring/reader-first-schema-manifest';
import {
  generateFlowOrientationRows,
  serializeFlowOrientationRows,
} from '@/scripts/authoring/generate-flow-orientation-rows';
import {
  validateReaderFirstImportFile,
  validateReaderFirstImportText,
} from '@/scripts/authoring/validate-reader-first-import';

type Row = Record<string, string>;

const fixtureDir = path.join(process.cwd(), 'tests', 'authoring', 'fixtures');
const validFixturePath = path.join(fixtureDir, 'valid-reader-first-import.psv');

function permuteSignals(signals: readonly string[]): string[][] {
  if (signals.length === 0) {
    return [[]];
  }

  return signals.flatMap((signal, index) => {
    const remaining = [...signals.slice(0, index), ...signals.slice(index + 1)];
    return permuteSignals(remaining).map((permutation) => [signal, ...permutation]);
  });
}

function serializeSection(sectionKey: ReaderFirstSectionKey, rows: readonly Row[]): string {
  const header = readerFirstRequiredHeaders[sectionKey];

  return [
    sectionKey,
    header.join('|'),
    ...rows.map((row) => header.map((field) => row[field]).join('|')),
  ].join('\n');
}

function patternRows(sectionKey: ReaderFirstSectionKey): Row[] {
  return permuteSignals(readerFirstAllowedSignalKeys).flatMap((signals) => {
    const patternKey = signals.join('_');

    return readerFirstAllowedScoreShapes.map((scoreShape) => ({
      domain_key: flowStateAuthoringConstants.domainKey,
      pattern_key: patternKey,
      score_shape: scoreShape,
      rank_1_signal_key: signals[0],
      rank_2_signal_key: signals[1],
      rank_3_signal_key: signals[2],
      rank_4_signal_key: signals[3],
      headline: 'Draft headline',
      recognition_statement: 'Draft recognition',
      recognition_expansion: 'Draft expansion',
      mechanics_title: 'Draft mechanics',
      core_mechanism: 'Draft mechanism',
      why_it_shows_up: 'Draft reason',
      what_it_protects: 'Draft protection',
      synthesis_title: 'Draft synthesis',
      gift: 'Draft gift',
      trap: 'Draft trap',
      takeaway: 'Draft takeaway',
      synthesis_text: 'Draft synthesis text',
      closing_summary: 'Draft closing',
      core_gift: 'Draft gift',
      core_trap: 'Draft trap',
      development_edge: 'Draft edge',
      memorable_line: 'Draft line',
      status: 'draft',
      lookup_key: `${flowStateAuthoringConstants.domainKey}::${patternKey}::${scoreShape}`,
    }));
  });
}

function signalRoleRows(): Row[] {
  return readerFirstAllowedSignalKeys.flatMap((signalKey) =>
    readerFirstAllowedRankRoles.map((rankRole, index) => ({
      domain_key: flowStateAuthoringConstants.domainKey,
      signal_key: signalKey,
      signal_label: signalKey,
      rank_position: String(index + 1),
      rank_role: rankRole,
      title: 'Draft role',
      description: 'Draft description',
      productive_expression: 'Draft productive expression',
      risk_pattern: 'Draft risk',
      development_note: 'Draft development note',
      status: 'draft',
      lookup_key: `${flowStateAuthoringConstants.domainKey}::${signalKey}::${index + 1}`,
    })),
  );
}

function patternItemRows(sectionKey: '11_Strengths' | '12_Narrowing'): Row[] {
  return permuteSignals(readerFirstAllowedSignalKeys).flatMap((signals) => {
    const patternKey = signals.join('_');

    return ['1', '2', '3'].map((priority) => {
      const itemKey = `${sectionKey === '11_Strengths' ? 'strength' : 'narrowing'}_${priority}`;

      return {
        domain_key: flowStateAuthoringConstants.domainKey,
        pattern_key: patternKey,
        strength_key: itemKey,
        narrowing_key: itemKey,
        priority,
        strength_title: 'Draft strength',
        strength_text: 'Draft strength text',
        narrowing_title: 'Draft narrowing',
        narrowing_text: 'Draft narrowing text',
        linked_signal_key: signals[Number(priority) - 1],
        missing_range_signal_key: signals[Number(priority)],
        status: 'draft',
        lookup_key: `${flowStateAuthoringConstants.domainKey}::${patternKey}::${itemKey}`,
      };
    });
  });
}

function applicationRows(): Row[] {
  return permuteSignals(readerFirstAllowedSignalKeys).flatMap((signals) => {
    const patternKey = signals.join('_');

    return readerFirstAllowedApplicationAreas.map((applicationArea, index) => ({
      domain_key: flowStateAuthoringConstants.domainKey,
      pattern_key: patternKey,
      application_area: applicationArea,
      guidance_type: applicationArea,
      priority: String(index + 1),
      guidance_text: 'Draft guidance',
      linked_signal_key: signals[index],
      status: 'draft',
      lookup_key: `${flowStateAuthoringConstants.domainKey}::${patternKey}::${applicationArea}`,
    }));
  });
}

function buildValidFullImport(): string {
  const contextRows = [
    {
      domain_key: flowStateAuthoringConstants.domainKey,
      section_key: '05_Context',
      domain_title: 'Flow State',
      domain_definition: 'Draft definition',
      domain_scope: 'Draft scope',
      interpretation_guidance: 'Draft guidance',
      intro_note: 'Draft intro',
      status: 'draft',
      lookup_key: `${flowStateAuthoringConstants.domainKey}::intro`,
    },
  ];

  return [
    serializeSection('05_Context', contextRows),
    serializeSection('06_Orientation', generateFlowOrientationRows()),
    serializeSection('07_Recognition', patternRows('07_Recognition')),
    serializeSection('08_Signal_Roles', signalRoleRows()),
    serializeSection('09_Pattern_Mechanics', patternRows('09_Pattern_Mechanics')),
    serializeSection('10_Pattern_Synthesis', patternRows('10_Pattern_Synthesis')),
    serializeSection('11_Strengths', patternItemRows('11_Strengths')),
    serializeSection('12_Narrowing', patternItemRows('12_Narrowing')),
    serializeSection('13_Application', applicationRows()),
    serializeSection('14_Closing_Integration', patternRows('14_Closing_Integration')),
  ].join('\n');
}

async function writeValidFixture() {
  await mkdir(fixtureDir, { recursive: true });
  await writeFile(validFixturePath, `${buildValidFullImport()}\n`, 'utf8');
}

test('valid sectioned PSV passes', async () => {
  await writeValidFixture();

  const result = await validateReaderFirstImportFile(validFixturePath);

  assert.equal(result.pass, true);
  assert.deepEqual(result.errors, []);
});

test('generated 06_Orientation file passes in individual section mode', () => {
  const result = validateReaderFirstImportText(serializeFlowOrientationRows(generateFlowOrientationRows()), {
    type: 'section',
    sectionKey: '06_Orientation',
  });

  assert.equal(result.pass, true);
  assert.equal(result.rowCounts['06_Orientation'], 96);
});

test('missing section fails', () => {
  const source = buildValidFullImport().replace(/^14_Closing_Integration[\s\S]*$/m, '');
  const result = validateReaderFirstImportText(source);

  assert.equal(result.pass, false);
  assert.ok(result.errors.some((error) => error.includes('Missing required section 14_Closing_Integration')));
});

test('bad header fails', () => {
  const source = buildValidFullImport().replace(
    'domain_key|pattern_key|score_shape',
    'domain_key|score_shape|pattern_key',
  );
  const result = validateReaderFirstImportText(source);

  assert.equal(result.pass, false);
  assert.ok(result.errors.some((error) => error.includes('header does not exactly match manifest')));
});

test('duplicate lookup key fails', () => {
  const rows = generateFlowOrientationRows();
  rows[1].lookup_key = rows[0].lookup_key;
  const result = validateReaderFirstImportText(serializeFlowOrientationRows(rows), {
    type: 'section',
    sectionKey: '06_Orientation',
  });

  assert.equal(result.pass, false);
  assert.ok(result.errors.some((error) => error.includes('duplicate lookup_key')));
});

test('invalid signal key fails', () => {
  const rows = generateFlowOrientationRows();
  rows[0].rank_1_signal_key = 'invalid_signal';
  const result = validateReaderFirstImportText(serializeFlowOrientationRows(rows), {
    type: 'section',
    sectionKey: '06_Orientation',
  });

  assert.equal(result.pass, false);
  assert.ok(result.errors.some((error) => error.includes('invalid signal key')));
});

test('invalid score shape fails', () => {
  const rows = generateFlowOrientationRows();
  rows[0].score_shape = 'flat';
  const result = validateReaderFirstImportText(serializeFlowOrientationRows(rows), {
    type: 'section',
    sectionKey: '06_Orientation',
  });

  assert.equal(result.pass, false);
  assert.ok(result.errors.some((error) => error.includes('invalid value flat')));
});

test('internal pipe or bad column count fails', () => {
  const source = serializeFlowOrientationRows(generateFlowOrientationRows()).replace(
    'Deep focus first',
    'Deep focus|first',
  );
  const result = validateReaderFirstImportText(source, {
    type: 'section',
    sectionKey: '06_Orientation',
  });

  assert.equal(result.pass, false);
  assert.ok(result.errors.some((error) => error.includes('expected 16 columns')));
});

test('lookup_key containing pipe fails through pipe-safe column validation', () => {
  const source = serializeFlowOrientationRows(generateFlowOrientationRows()).replace(
    'flow-state::deep_focus_creative_movement_physical_rhythm_social_exchange::concentrated',
    'flow-state|deep_focus_creative_movement_physical_rhythm_social_exchange::concentrated',
  );
  const result = validateReaderFirstImportText(source, {
    type: 'section',
    sectionKey: '06_Orientation',
  });

  assert.equal(result.pass, false);
  assert.ok(result.errors.some((error) => error.includes('expected 16 columns')));
});

test('pattern_key order mismatch fails', () => {
  const rows = generateFlowOrientationRows();
  rows[0].rank_1_signal_key = 'creative_movement';
  rows[0].rank_2_signal_key = 'deep_focus';
  const result = validateReaderFirstImportText(serializeFlowOrientationRows(rows), {
    type: 'section',
    sectionKey: '06_Orientation',
  });

  assert.equal(result.pass, false);
  assert.ok(result.errors.some((error) => error.includes('do not match pattern_key')));
});

test('missing score shape variant fails for score-shape-specific section', () => {
  const rows = generateFlowOrientationRows().filter(
    (row) =>
      row.lookup_key !==
      'flow-state::deep_focus_creative_movement_physical_rhythm_social_exchange::balanced',
  );
  const result = validateReaderFirstImportText(serializeFlowOrientationRows(rows), {
    type: 'section',
    sectionKey: '06_Orientation',
  });

  assert.equal(result.pass, false);
  assert.ok(result.errors.some((error) => error.includes('missing score_shape balanced')));
});

test('duplicate application_area within a pattern fails', () => {
  const source = serializeSection('13_Application', applicationRows().map((row, index) => {
    if (index === 1) {
      return {
        ...row,
        application_area: 'use_this_when',
        guidance_type: 'use_this_when',
        lookup_key: `${flowStateAuthoringConstants.domainKey}::${row.pattern_key}::watch_for`,
      };
    }

    return row;
  }));
  const result = validateReaderFirstImportText(source, {
    type: 'section',
    sectionKey: '13_Application',
  });

  assert.equal(result.pass, false);
  assert.ok(result.errors.some((error) => error.includes('duplicate application_area')));
});
