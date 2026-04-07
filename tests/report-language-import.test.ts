import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildReportAlignedLanguageStoragePlan,
  parseReportLanguageRows,
  validateReportLanguageRows,
} from '@/lib/admin/report-language-import';

const VALID_SIGNAL_KEYS = ['driver', 'analyst'] as const;
const VALID_DOMAIN_KEYS = ['operating-style'] as const;

test('report-aligned rows parse correctly', () => {
  const result = parseReportLanguageRows(
    'pair | driver_analyst | chapterSummary | Fast, structured, decisive.',
  );

  assert.equal(result.success, true);
  assert.deepEqual(result.records, [{
    lineNumber: 1,
    rawLine: 'pair | driver_analyst | chapterSummary | Fast, structured, decisive.',
    section: 'pair',
    target: 'driver_analyst',
    field: 'chapterSummary',
    content: 'Fast, structured, decisive.',
  }]);
});

test('blank lines are ignored in report-aligned input', () => {
  const result = parseReportLanguageRows(
    [
      '',
      ' ',
      'signal|driver|chapterSummary|Driver summary',
    ].join('\n'),
  );

  assert.equal(result.success, true);
  assert.deepEqual(result.records.map((row) => row.lineNumber), [3]);
});

test('report-aligned validation maps canonical domain, signal, and pair rows into storage DTOs', () => {
  const parsed = parseReportLanguageRows(
    [
      'domain|operating-style|chapterOpening|Custom domain chapter opening.',
      'signal|driver|chapterSummary|Driver summary.',
      'signal|driver|strength|Driver strength.',
      'pair|driver_analyst|chapterSummary|Driver plus Analyst pair summary.',
      'pair|driver_analyst|pressureFocus|Under strain, pace can outrun reflection.',
      'pair|driver_analyst|environmentFocus|Best in environments that reward momentum with structure.',
    ].join('\n'),
  );

  const validation = validateReportLanguageRows({
    rows: parsed.records,
    validSignalKeys: VALID_SIGNAL_KEYS,
    validDomainKeys: VALID_DOMAIN_KEYS,
  });

  assert.equal(validation.success, true);

  const plan = buildReportAlignedLanguageStoragePlan(validation.validRows);

  assert.deepEqual(plan.domainChapters, [
    {
      domainKey: 'operating-style',
      field: 'chapterOpening',
      content: 'Custom domain chapter opening.',
    },
  ]);
  assert.deepEqual(plan.signals, [
    {
      signalKey: 'driver',
      field: 'chapterSummary',
      content: 'Driver summary.',
    },
    {
      signalKey: 'driver',
      field: 'strength',
      content: 'Driver strength.',
    },
  ]);
  assert.deepEqual(plan.pairs, [
    {
      signalPair: 'driver_analyst',
      field: 'chapterSummary',
      content: 'Driver plus Analyst pair summary.',
    },
    {
      signalPair: 'driver_analyst',
      field: 'pressureFocus',
      content: 'Under strain, pace can outrun reflection.',
    },
    {
      signalPair: 'driver_analyst',
      field: 'environmentFocus',
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
    validSignalKeys: VALID_SIGNAL_KEYS,
    validDomainKeys: VALID_DOMAIN_KEYS,
  });

  assert.equal(validation.success, true);

  const plan = buildReportAlignedLanguageStoragePlan(validation.validRows);

  assert.deepEqual(plan.storage.pairs, [
    {
      signalPair: 'driver_analyst',
      section: 'chapterSummary',
      content: 'Legacy pair summary alias.',
    },
  ]);
});

test('report-aligned validation normalizes legacy signal summary rows to canonical chapterSummary storage', () => {
  const parsed = parseReportLanguageRows(
    'signal|driver|summary|Legacy summary alias.',
  );

  const validation = validateReportLanguageRows({
    rows: parsed.records,
    validSignalKeys: VALID_SIGNAL_KEYS,
    validDomainKeys: VALID_DOMAIN_KEYS,
  });

  assert.equal(validation.success, true);

  const plan = buildReportAlignedLanguageStoragePlan(validation.validRows);

  assert.deepEqual(plan.storage.signals, [
    {
      signalKey: 'driver',
      section: 'chapterSummary',
      content: 'Legacy summary alias.',
    },
  ]);
});

test('report-aligned validation rejects legacy domain summary rows explicitly', () => {
  const parsed = parseReportLanguageRows(
    'domain|operating-style|summary|Legacy summary alias.',
  );

  const validation = validateReportLanguageRows({
    rows: parsed.records,
    validSignalKeys: VALID_SIGNAL_KEYS,
    validDomainKeys: VALID_DOMAIN_KEYS,
  });

  assert.equal(validation.success, false);
  assert.equal(validation.errors[0]?.code, 'UNSUPPORTED_LEGACY_FIELD');
  assert.match(validation.errors[0]?.message ?? '', /chapterOpening/i);
});

test('report-aligned validation rejects unsupported domain focus rows explicitly', () => {
  const parsed = parseReportLanguageRows(
    'domain|operating-style|focus|Unsupported domain focus section.',
  );

  const validation = validateReportLanguageRows({
    rows: parsed.records,
    validSignalKeys: VALID_SIGNAL_KEYS,
    validDomainKeys: VALID_DOMAIN_KEYS,
  });

  assert.equal(validation.success, false);
  assert.equal(validation.errors[0]?.code, 'UNSUPPORTED_LEGACY_FIELD');
  assert.match(validation.errors[0]?.message ?? '', /chapterOpening only/i);
});

test('report-aligned validation rejects non-canonical pair key order explicitly', () => {
  const parsed = parseReportLanguageRows(
    'pair|analyst_driver|chapterSummary|Wrong order.',
  );

  const validation = validateReportLanguageRows({
    rows: parsed.records,
    validSignalKeys: VALID_SIGNAL_KEYS,
    validDomainKeys: VALID_DOMAIN_KEYS,
  });

  assert.equal(validation.success, false);
  assert.equal(validation.errors[0]?.code, 'NON_CANONICAL_PAIR_KEY');
  assert.match(validation.errors[0]?.message ?? '', /Use driver_analyst\./);
});

test('report-aligned validation rejects legacy signal-style assumptions in active validation', () => {
  const parsed = parseReportLanguageRows(
    [
      'domain|signal_style|chapterOpening|Legacy domain key.',
      'signal|style_driver|chapterSummary|Legacy signal key.',
    ].join('\n'),
  );

  const validation = validateReportLanguageRows({
    rows: parsed.records,
    validSignalKeys: VALID_SIGNAL_KEYS,
    validDomainKeys: VALID_DOMAIN_KEYS,
  });

  assert.equal(validation.success, false);
  assert.deepEqual(
    validation.errors.map((error) => error.code),
    ['UNKNOWN_DOMAIN_KEY', 'UNKNOWN_SIGNAL_KEY'],
  );
});

test('report-aligned validation rejects unsupported pair fields explicitly', () => {
  const parsed = parseReportLanguageRows(
    'pair|driver_analyst|headline|Unsupported pair field.',
  );

  const validation = validateReportLanguageRows({
    rows: parsed.records,
    validSignalKeys: VALID_SIGNAL_KEYS,
    validDomainKeys: VALID_DOMAIN_KEYS,
  });

  assert.equal(validation.success, false);
  assert.equal(validation.errors[0]?.code, 'INVALID_FIELD');
  assert.match(validation.errors[0]?.message ?? '', /chapterSummary, pressureFocus, or environmentFocus/i);
});

test('report-aligned validation rejects duplicate canonical pair rows', () => {
  const parsed = parseReportLanguageRows(
    [
      'pair|driver_analyst|chapterSummary|First summary',
      'pair|driver_analyst|chapterSummary|Second summary',
    ].join('\n'),
  );

  const validation = validateReportLanguageRows({
    rows: parsed.records,
    validSignalKeys: VALID_SIGNAL_KEYS,
    validDomainKeys: VALID_DOMAIN_KEYS,
  });

  assert.equal(validation.success, false);
  assert.deepEqual(
    validation.errors.map((error) => error.code),
    ['DUPLICATE_ENTRY', 'DUPLICATE_ENTRY'],
  );
});
