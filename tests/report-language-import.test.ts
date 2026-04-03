import test from 'node:test';
import assert from 'node:assert/strict';

import { canonicalizeSignalPairKey } from '@/lib/admin/pair-language-import';
import {
  buildReportAlignedLanguageStoragePlan,
  parseReportLanguageRows,
  validateReportLanguageRows,
} from '@/lib/admin/report-language-import';

test('report-aligned rows parse correctly', () => {
  const result = parseReportLanguageRows(
    'hero | analyst_driver | headline | Fast, structured, decisive.',
  );

  assert.equal(result.success, true);
  assert.deepEqual(result.records, [{
    lineNumber: 1,
    rawLine: 'hero | analyst_driver | headline | Fast, structured, decisive.',
    section: 'hero',
    target: 'analyst_driver',
    field: 'headline',
    content: 'Fast, structured, decisive.',
  }]);
});

test('blank lines are ignored in report-aligned input', () => {
  const result = parseReportLanguageRows(
    [
      'intro|assessment|assessmentDescription|Intro copy',
      '',
      ' ',
      'signal|style_driver|summary|Driver summary',
    ].join('\n'),
  );

  assert.equal(result.success, true);
  assert.deepEqual(result.records.map((row) => row.lineNumber), [1, 4]);
});

test('report-aligned validation maps intro, hero, domain, signal, and pair rows into current storage DTOs', () => {
  const parsed = parseReportLanguageRows(
    [
      'intro|assessment|assessmentDescription|Assessment-owned description.',
      'hero|analyst_driver|headline|Fast, structured, decisive.',
      'hero|driver_analyst|narrative|You combine pace with logic.',
      'domain|signal_style|summary|Custom domain summary.',
      'domain|signal_style|focus|Custom focus section.',
      'signal|style_driver|summary|Driver summary.',
      'signal|style_driver|strength|Driver strength.',
      'pair|driver_analyst|summary|Driver plus Analyst pair summary.',
    ].join('\n'),
  );

  const validation = validateReportLanguageRows({
    rows: parsed.records,
    validSignalKeys: ['style_driver', 'style_analyst'],
    validDomainKeys: ['signal_style'],
  });

  assert.equal(validation.success, true);

  const plan = buildReportAlignedLanguageStoragePlan(validation.validRows);

  assert.deepEqual(plan.intro, {
    section: 'assessment_description',
    content: 'Assessment-owned description.',
  });

  assert.deepEqual(plan.hero, [
    {
      patternKey: 'analyst_driver',
      field: 'headline',
      content: 'Fast, structured, decisive.',
    },
    {
      patternKey: 'analyst_driver',
      field: 'narrative',
      content: 'You combine pace with logic.',
    },
  ]);

  assert.deepEqual(plan.domainChapters, [
    {
      domainKey: 'signal_style',
      field: 'summary',
      content: 'Custom domain summary.',
    },
    {
      domainKey: 'signal_style',
      field: 'focus',
      content: 'Custom focus section.',
    },
  ]);

  assert.deepEqual(plan.signals, [
    {
      signalKey: 'style_driver',
      field: 'summary',
      content: 'Driver summary.',
    },
    {
      signalKey: 'style_driver',
      field: 'strength',
      content: 'Driver strength.',
    },
  ]);

  assert.deepEqual(plan.pairs, [
    {
      signalPair: 'analyst_driver',
      field: 'summary',
      content: 'Driver plus Analyst pair summary.',
    },
  ]);

  assert.deepEqual(plan.storage.assessment, {
    section: 'assessment_description',
    content: 'Assessment-owned description.',
  });
  assert.deepEqual(plan.storage.overview, [
    {
      patternKey: 'analyst_driver',
      section: 'headline',
      content: 'Fast, structured, decisive.',
    },
    {
      patternKey: 'analyst_driver',
      section: 'summary',
      content: 'You combine pace with logic.',
    },
  ]);
  assert.deepEqual(plan.storage.domains, [
    {
      domainKey: 'signal_style',
      section: 'summary',
      content: 'Custom domain summary.',
    },
    {
      domainKey: 'signal_style',
      section: 'focus',
      content: 'Custom focus section.',
    },
  ]);
  assert.deepEqual(plan.storage.signals, [
    {
      signalKey: 'style_driver',
      section: 'summary',
      content: 'Driver summary.',
    },
    {
      signalKey: 'style_driver',
      section: 'strength',
      content: 'Driver strength.',
    },
  ]);
  assert.deepEqual(plan.storage.pairs, [
    {
      signalPair: 'analyst_driver',
      section: 'summary',
      content: 'Driver plus Analyst pair summary.',
    },
  ]);
});

test('report-aligned validation rejects hero.primaryPattern authoring explicitly', () => {
  const parsed = parseReportLanguageRows(
    'hero|driver_analyst|primaryPattern|Do not allow this.',
  );

  const validation = validateReportLanguageRows({
    rows: parsed.records,
    validSignalKeys: ['style_driver', 'style_analyst'],
    validDomainKeys: ['signal_style'],
  });

  assert.equal(validation.success, false);
  assert.equal(validation.errors[0]?.code, 'DERIVED_FIELD_NOT_AUTHORABLE');
  assert.match(validation.errors[0]?.message ?? '', /primaryPattern/i);
});

test('report-aligned validation rejects hero.domainHighlights authoring explicitly', () => {
  const parsed = parseReportLanguageRows(
    'hero|driver_analyst|domainHighlights.summary|Do not allow this either.',
  );

  const validation = validateReportLanguageRows({
    rows: parsed.records,
    validSignalKeys: ['style_driver', 'style_analyst'],
    validDomainKeys: ['signal_style'],
  });

  assert.equal(validation.success, false);
  assert.equal(validation.errors[0]?.code, 'DERIVED_FIELD_NOT_AUTHORABLE');
  assert.match(validation.errors[0]?.message ?? '', /domainHighlights/i);
});

test('report-aligned validation rejects actions authoring explicitly', () => {
  const parsed = parseReportLanguageRows(
    'actions|strengths|summary|This must remain derived.',
  );

  const validation = validateReportLanguageRows({
    rows: parsed.records,
    validSignalKeys: ['style_driver', 'style_analyst'],
    validDomainKeys: ['signal_style'],
  });

  assert.equal(validation.success, false);
  assert.equal(validation.errors[0]?.code, 'DERIVED_FIELD_NOT_AUTHORABLE');
  assert.match(validation.errors[0]?.message ?? '', /Actions are derived/i);
});

test('report-aligned validation does not elevate legacy overview strengths/watchouts/development', () => {
  const parsed = parseReportLanguageRows(
    'hero|driver_analyst|strengths|Legacy field that should stay out of the new model.',
  );

  const validation = validateReportLanguageRows({
    rows: parsed.records,
    validSignalKeys: ['style_driver', 'style_analyst'],
    validDomainKeys: ['signal_style'],
  });

  assert.equal(validation.success, false);
  assert.equal(validation.errors[0]?.code, 'UNSUPPORTED_LEGACY_FIELD');
});

test('report-aligned validation does not elevate legacy pair strength/watchout fields', () => {
  const parsed = parseReportLanguageRows(
    'pair|driver_analyst|watchout|Legacy pair field that should stay out of the new model.',
  );

  const validation = validateReportLanguageRows({
    rows: parsed.records,
    validSignalKeys: ['style_driver', 'style_analyst'],
    validDomainKeys: ['signal_style'],
  });

  assert.equal(validation.success, false);
  assert.equal(validation.errors[0]?.code, 'UNSUPPORTED_LEGACY_FIELD');
});

test('report-aligned validation rejects duplicate canonical hero rows', () => {
  const parsed = parseReportLanguageRows(
    [
      'hero|driver_analyst|headline|First headline',
      'hero|analyst_driver|headline|Second headline',
    ].join('\n'),
  );

  const validation = validateReportLanguageRows({
    rows: parsed.records,
    validSignalKeys: ['style_driver', 'style_analyst'],
    validDomainKeys: ['signal_style'],
  });

  assert.equal(validation.success, false);
  assert.deepEqual(
    validation.errors.map((error) => error.code),
    ['DUPLICATE_ENTRY', 'DUPLICATE_ENTRY'],
  );
});

test('pair-key canonicalization remains available for the report-aligned path and engine bridge', () => {
  assert.deepEqual(canonicalizeSignalPairKey('driver_analyst'), {
    success: true,
    signalKeys: ['analyst', 'driver'],
    canonicalSignalPair: 'analyst_driver',
  });
  assert.deepEqual(canonicalizeSignalPairKey('analyst_driver'), {
    success: true,
    signalKeys: ['analyst', 'driver'],
    canonicalSignalPair: 'analyst_driver',
  });
  assert.deepEqual(canonicalizeSignalPairKey('driver_analyst_extra'), {
    success: false,
  });
});
