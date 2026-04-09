import assert from 'node:assert/strict';
import test from 'node:test';

import {
  RESULT_READING_DOMAIN_SUBSECTIONS,
  RESULT_READING_SECTION_IDS,
  RESULT_READING_SECTIONS,
  RESULT_READING_TOP_LEVEL_SECTIONS,
} from '@/lib/results/result-reading-sections';

test('canonical reading model includes four top-level sections and six domain subsections', () => {
  assert.equal(RESULT_READING_TOP_LEVEL_SECTIONS.length, 4);
  assert.equal(RESULT_READING_DOMAIN_SUBSECTIONS.length, 6);
  assert.equal(RESULT_READING_SECTIONS.length, 10);
  assert.equal(RESULT_READING_SECTION_IDS.length, 10);
});

test('top-level reading section order remains stable', () => {
  const topLevelSections = RESULT_READING_TOP_LEVEL_SECTIONS.map((section) => ({
    id: section.id,
    label: section.label,
    order: section.order,
  }));
  const topLevelIds = topLevelSections.map((section) => section.id);

  assert.deepEqual(topLevelIds, ['intro', 'hero', 'domains', 'application']);
  assert.deepEqual(topLevelSections, [
    { id: 'intro', label: 'Introduction', order: 1 },
    { id: 'hero', label: 'Your Behaviour Pattern', order: 2 },
    { id: 'domains', label: 'How It Shows Up', order: 3 },
    { id: 'application', label: 'How to Apply This', order: 4 },
  ]);
  assert.equal(new Set(topLevelIds).size, topLevelIds.length);
  assert.equal(topLevelIds.includes('application'), true);
});

test('domain subsection reading order remains stable', () => {
  assert.deepEqual(
    RESULT_READING_DOMAIN_SUBSECTIONS.map((section) => section.id),
    [
      'domain-operating-style',
      'domain-core-drivers',
      'domain-leadership-approach',
      'domain-tension-response',
      'domain-environment-fit',
      'domain-pressure-response',
    ],
  );
  for (const section of RESULT_READING_DOMAIN_SUBSECTIONS) {
    assert.equal(section.level, 'subsection');
    assert.equal(section.parentId, 'domains');
    assert.equal(section.order > 4, true);
  }
});

test('intent prompts are present for top-level sections only', () => {
  for (const section of RESULT_READING_TOP_LEVEL_SECTIONS) {
    assert.equal(typeof section.intentPrompt, 'string');
    assert.notEqual(section.intentPrompt.trim(), '');
  }

  for (const section of RESULT_READING_DOMAIN_SUBSECTIONS) {
    assert.equal(section.intentPrompt, undefined);
  }
});

test('canonical section id list remains ordered and duplicate-free', () => {
  assert.deepEqual(RESULT_READING_SECTION_IDS, [
    'intro',
    'hero',
    'domains',
    'application',
    'domain-operating-style',
    'domain-core-drivers',
    'domain-leadership-approach',
    'domain-tension-response',
    'domain-environment-fit',
    'domain-pressure-response',
  ]);
  assert.equal(new Set(RESULT_READING_SECTION_IDS).size, RESULT_READING_SECTION_IDS.length);
  assert.equal(new Set(RESULT_READING_SECTIONS.map((section) => section.id)).size, RESULT_READING_SECTIONS.length);
});
