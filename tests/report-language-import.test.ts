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
      '',
      ' ',
      'signal|style_driver|chapterSummary|Driver summary',
    ].join('\n'),
  );

  assert.equal(result.success, true);
  assert.deepEqual(result.records.map((row) => row.lineNumber), [3]);
});

test('report-aligned validation maps hero, domain, signal, and pair rows into current storage DTOs', () => {
  const parsed = parseReportLanguageRows(
    [
      'hero|analyst_driver|headline|Fast, structured, decisive.',
      'hero|driver_analyst|narrative|You combine pace with logic.',
      'domain|signal_style|chapterOpening|Custom domain chapter opening.',
      'signal|style_driver|chapterSummary|Driver summary.',
      'signal|style_driver|strength|Driver strength.',
      'pair|driver_analyst|summary|Driver plus Analyst pair summary.',
      'pair|driver_analyst|pressureFocus|Under strain, pace can outrun reflection.',
      'pair|driver_analyst|environmentFocus|Best in environments that reward momentum with structure.',
    ].join('\n'),
  );

  const validation = validateReportLanguageRows({
    rows: parsed.records,
    validSignalKeys: ['style_driver', 'style_analyst'],
    validDomainKeys: ['signal_style'],
  });

  assert.equal(validation.success, true);

  const plan = buildReportAlignedLanguageStoragePlan(validation.validRows);

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
      field: 'chapterOpening',
      content: 'Custom domain chapter opening.',
    },
  ]);

  assert.deepEqual(plan.signals, [
    {
      signalKey: 'style_driver',
      field: 'chapterSummary',
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
      field: 'chapterSummary',
      content: 'Driver plus Analyst pair summary.',
    },
    {
      signalPair: 'analyst_driver',
      field: 'pressureFocus',
      content: 'Under strain, pace can outrun reflection.',
    },
    {
      signalPair: 'analyst_driver',
      field: 'environmentFocus',
      content: 'Best in environments that reward momentum with structure.',
    },
  ]);
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
      section: 'chapterOpening',
      content: 'Custom domain chapter opening.',
    },
  ]);
  assert.deepEqual(plan.storage.signals, [
    {
      signalKey: 'style_driver',
      section: 'chapterSummary',
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
      section: 'chapterSummary',
      content: 'Driver plus Analyst pair summary.',
    },
    {
      signalPair: 'analyst_driver',
      section: 'pressureFocus',
      content: 'Under strain, pace can outrun reflection.',
    },
    {
      signalPair: 'analyst_driver',
      section: 'environmentFocus',
      content: 'Best in environments that reward momentum with structure.',
    },
  ]);
});

test('report-aligned validation normalizes legacy pair summary rows to canonical chapterSummary storage', () => {
  const parsed = parseReportLanguageRows(
    'pair|driver_analyst|summary|Legacy pair summary alias.',
  );

  const validation = validateReportLanguageRows({
    rows: parsed.records,
    validSignalKeys: ['style_driver', 'style_analyst'],
    validDomainKeys: ['signal_style'],
  });

  assert.equal(validation.success, true);

  const plan = buildReportAlignedLanguageStoragePlan(validation.validRows);

  assert.deepEqual(plan.pairs, [
    {
      signalPair: 'analyst_driver',
      field: 'chapterSummary',
      content: 'Legacy pair summary alias.',
    },
  ]);
  assert.deepEqual(plan.storage.pairs, [
    {
      signalPair: 'analyst_driver',
      section: 'chapterSummary',
      content: 'Legacy pair summary alias.',
    },
  ]);
});

test('report-aligned validation normalizes legacy signal summary rows to canonical chapterSummary storage', () => {
  const parsed = parseReportLanguageRows(
    'signal|style_driver|summary|Legacy summary alias.',
  );

  const validation = validateReportLanguageRows({
    rows: parsed.records,
    validSignalKeys: ['style_driver', 'style_analyst'],
    validDomainKeys: ['signal_style'],
  });

  assert.equal(validation.success, true);

  const plan = buildReportAlignedLanguageStoragePlan(validation.validRows);

  assert.deepEqual(plan.signals, [
    {
      signalKey: 'style_driver',
      field: 'chapterSummary',
      content: 'Legacy summary alias.',
    },
  ]);
  assert.deepEqual(plan.storage.signals, [
    {
      signalKey: 'style_driver',
      section: 'chapterSummary',
      content: 'Legacy summary alias.',
    },
  ]);
});

test('report-aligned validation rejects legacy domain summary rows explicitly', () => {
  const parsed = parseReportLanguageRows(
    'domain|signal_style|summary|Legacy summary alias.',
  );

  const validation = validateReportLanguageRows({
    rows: parsed.records,
    validSignalKeys: ['style_driver', 'style_analyst'],
    validDomainKeys: ['signal_style'],
  });

  assert.equal(validation.success, false);
  assert.equal(validation.errors[0]?.code, 'UNSUPPORTED_LEGACY_FIELD');
  assert.match(validation.errors[0]?.message ?? '', /chapterOpening/i);
  assert.equal(validation.errors[0]?.lineNumber, 1);
});

test('report-aligned validation rejects unsupported domain focus rows explicitly', () => {
  const parsed = parseReportLanguageRows(
    'domain|signal_style|focus|Unsupported domain focus section.',
  );

  const validation = validateReportLanguageRows({
    rows: parsed.records,
    validSignalKeys: ['style_driver', 'style_analyst'],
    validDomainKeys: ['signal_style'],
  });

  assert.equal(validation.success, false);
  assert.equal(validation.errors[0]?.code, 'UNSUPPORTED_LEGACY_FIELD');
  assert.match(validation.errors[0]?.message ?? '', /chapterOpening only/i);
  assert.equal(validation.errors[0]?.lineNumber, 1);
});

test('report-aligned validation rejects unsupported domain pressure rows explicitly', () => {
  const parsed = parseReportLanguageRows(
    'domain|signal_style|pressure|Unsupported domain pressure section.',
  );

  const validation = validateReportLanguageRows({
    rows: parsed.records,
    validSignalKeys: ['style_driver', 'style_analyst'],
    validDomainKeys: ['signal_style'],
  });

  assert.equal(validation.success, false);
  assert.equal(validation.errors[0]?.code, 'UNSUPPORTED_LEGACY_FIELD');
  assert.match(validation.errors[0]?.message ?? '', /chapterOpening only/i);
  assert.equal(validation.errors[0]?.lineNumber, 1);
});

test('report-aligned validation rejects unsupported domain environment rows explicitly', () => {
  const parsed = parseReportLanguageRows(
    'domain|signal_style|environment|Unsupported domain environment section.',
  );

  const validation = validateReportLanguageRows({
    rows: parsed.records,
    validSignalKeys: ['style_driver', 'style_analyst'],
    validDomainKeys: ['signal_style'],
  });

  assert.equal(validation.success, false);
  assert.equal(validation.errors[0]?.code, 'UNSUPPORTED_LEGACY_FIELD');
  assert.match(validation.errors[0]?.message ?? '', /chapterOpening only/i);
  assert.equal(validation.errors[0]?.lineNumber, 1);
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

test('report-aligned validation rejects unsupported pair fields explicitly', () => {
  const parsed = parseReportLanguageRows(
    'pair|driver_analyst|headline|Unsupported pair field.',
  );

  const validation = validateReportLanguageRows({
    rows: parsed.records,
    validSignalKeys: ['style_driver', 'style_analyst'],
    validDomainKeys: ['signal_style'],
  });

  assert.equal(validation.success, false);
  assert.equal(validation.errors[0]?.code, 'INVALID_FIELD');
  assert.match(validation.errors[0]?.message ?? '', /chapterSummary, pressureFocus, or environmentFocus/i);
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
