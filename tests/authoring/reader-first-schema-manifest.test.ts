import assert from 'node:assert/strict';
import test from 'node:test';

import {
  flowStateAuthoringConstants,
  readerFirstLookupKeyRecommendation,
  readerFirstRequiredHeaders,
  readerFirstSectionKeys,
} from '@/content/authoring/reader-first-schema-manifest';

test('reader-first schema manifest exposes all ten section keys', () => {
  assert.deepEqual(readerFirstSectionKeys, [
    '05_Context',
    '06_Orientation',
    '07_Recognition',
    '08_Signal_Roles',
    '09_Pattern_Mechanics',
    '10_Pattern_Synthesis',
    '11_Strengths',
    '12_Narrowing',
    '13_Application',
    '14_Closing_Integration',
  ]);
});

test('Flow State constants preserve expected controlled values', () => {
  assert.equal(flowStateAuthoringConstants.signals.length, 4);
  assert.equal(flowStateAuthoringConstants.scoreShapes.length, 4);
  assert.equal(flowStateAuthoringConstants.applicationAreas.length, 3);
});

test('reader-first section headers do not contain duplicate fields', () => {
  for (const [sectionKey, headers] of Object.entries(readerFirstRequiredHeaders)) {
    const uniqueHeaders = new Set(headers);

    assert.equal(
      uniqueHeaders.size,
      headers.length,
      `${sectionKey} contains duplicate header fields`,
    );
  }
});

test('lookup delimiter recommendation avoids pipe-delimited export conflicts', () => {
  assert.ok(!readerFirstLookupKeyRecommendation.delimiter.includes('|'));
  assert.ok(!readerFirstLookupKeyRecommendation.example.includes('|'));
});
