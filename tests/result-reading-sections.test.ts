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
  assert.deepEqual(
    RESULT_READING_TOP_LEVEL_SECTIONS.map((section) => section.id),
    ['intro', 'hero', 'domains', 'application'],
  );
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
