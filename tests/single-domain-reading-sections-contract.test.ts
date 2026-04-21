import test from 'node:test';
import assert from 'node:assert/strict';

import { SINGLE_DOMAIN_NARRATIVE_SECTION_CONTRACTS } from '@/lib/assessment-language/single-domain-narrative-schema';
import { SINGLE_DOMAIN_SECTION_IMPORT_DATASET_MAP } from '@/lib/assessment-language/single-domain-import-headers';
import { SINGLE_DOMAIN_RESULT_READING_SECTIONS } from '@/lib/results/single-domain-reading-sections';

test('single-domain reading sections stay aligned with the locked narrative contract order', () => {
  assert.deepEqual(
    SINGLE_DOMAIN_NARRATIVE_SECTION_CONTRACTS.map((contract) => contract.section),
    ['intro', 'hero', 'drivers', 'pair', 'limitation', 'application'],
  );

  assert.deepEqual(
    SINGLE_DOMAIN_RESULT_READING_SECTIONS.topLevelSections.map((section) => section.id),
    SINGLE_DOMAIN_NARRATIVE_SECTION_CONTRACTS.map((contract) => contract.section),
  );

  assert.deepEqual(
    SINGLE_DOMAIN_RESULT_READING_SECTIONS.topLevelSections.map((section) => section.order),
    [1, 2, 3, 4, 5, 6],
  );
});

test('single-domain reading sections keep the exact six rail labels and no nested subsections', () => {
  assert.deepEqual(
    SINGLE_DOMAIN_RESULT_READING_SECTIONS.topLevelSections.map((section) => section.label),
    ['Intro', 'Hero', 'Drivers', 'Pair', 'Limitation', 'Application'],
  );
  assert.deepEqual(
    SINGLE_DOMAIN_RESULT_READING_SECTIONS.topLevelSections.map((section) => section.shortLabel),
    ['Intro', 'Hero', 'Drivers', 'Pair', 'Limit', 'Apply'],
  );
  assert.equal(SINGLE_DOMAIN_RESULT_READING_SECTIONS.subsections.length, 0);
  assert.equal(SINGLE_DOMAIN_RESULT_READING_SECTIONS.sections.length, 6);
  assert.equal(SINGLE_DOMAIN_RESULT_READING_SECTIONS.sectionIds.length, 6);
});

test('each locked single-domain section keeps a section-native import dataset mapping', () => {
  assert.deepEqual(SINGLE_DOMAIN_SECTION_IMPORT_DATASET_MAP, {
    intro: 'SINGLE_DOMAIN_INTRO',
    hero: 'SINGLE_DOMAIN_HERO',
    drivers: 'SINGLE_DOMAIN_DRIVERS',
    pair: 'SINGLE_DOMAIN_PAIR',
    limitation: 'SINGLE_DOMAIN_LIMITATION',
    application: 'SINGLE_DOMAIN_APPLICATION',
  });
});
