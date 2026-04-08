import test from 'node:test';
import assert from 'node:assert/strict';

import {
  parseApplicationActionPromptsImport,
  parseApplicationContributionImport,
  parseApplicationDevelopmentImport,
  parseApplicationRiskImport,
  parseApplicationThesisImport,
} from '@/lib/server/application-language-import';

test('valid thesis import parses successfully', () => {
  const result = parseApplicationThesisImport([
    'hero_pattern_key|headline|summary',
    'steady_steward|Calm structured value|Brings steadier follow-through to the work.',
  ].join('\n'));

  assert.equal(result.success, true);
  assert.deepEqual(result.rows, [
    {
      heroPatternKey: 'steady_steward',
      headline: 'Calm structured value',
      summary: 'Brings steadier follow-through to the work.',
    },
  ]);
});

test('valid contribution import parses successfully', () => {
  const result = parseApplicationContributionImport([
    'source_type|source_key|priority|label|narrative|best_when|watch_for',
    'pair|driver_analyst|1|Structured pace|Creates traction through structured pace.|When direction is clear.|Can over-tighten the plan.',
  ].join('\n'));

  assert.equal(result.success, true);
  assert.equal(result.rows[0]?.priority, 1);
  assert.equal(result.rows[0]?.sourceType, 'pair');
});

test('valid risk import parses successfully', () => {
  const result = parseApplicationRiskImport([
    'source_type|source_key|priority|label|narrative|impact|early_warning',
    'signal|decision_evidence|2|Late proof|Can over-delay commitment.|Momentum drops while waiting for proof.|Discussion keeps reopening.',
  ].join('\n'));

  assert.equal(result.success, true);
  assert.equal(result.rows[0]?.sourceType, 'signal');
  assert.equal(result.rows[0]?.priority, 2);
});

test('valid development import parses successfully', () => {
  const result = parseApplicationDevelopmentImport([
    'source_type|source_key|priority|label|narrative|practice|success_marker',
    'signal|lead_people|3|Build challenge|Practice speaking the harder point earlier.|Name the tension early.|Issues surface sooner.',
  ].join('\n'));

  assert.equal(result.success, true);
  assert.equal(result.rows[0]?.sourceKey, 'lead_people');
});

test('valid action prompts import parses successfully', () => {
  const result = parseApplicationActionPromptsImport([
    'source_type|source_key|keep_doing|watch_for|practice_next|ask_others',
    'hero_pattern|steady_steward|Keep making the next step concrete.|Watch for locking too soon.|Widen the option set before closing.|Ask where your pace helps or narrows the work.',
  ].join('\n'));

  assert.equal(result.success, true);
  assert.equal(result.rows[0]?.sourceType, 'hero_pattern');
});

test('missing header is rejected', () => {
  const result = parseApplicationThesisImport('steady_steward|Headline|Summary');

  assert.equal(result.success, false);
  assert.match(result.errors[0]?.message ?? '', /Header row must be exactly/i);
});

test('malformed priority is rejected', () => {
  const result = parseApplicationContributionImport([
    'source_type|source_key|priority|label|narrative|best_when|watch_for',
    'pair|driver_analyst|high|Structured pace|Creates traction through structured pace.|When direction is clear.|Can over-tighten the plan.',
  ].join('\n'));

  assert.equal(result.success, false);
  assert.match(result.errors[0]?.message ?? '', /priority must be an integer/i);
});

test('duplicate key is rejected', () => {
  const result = parseApplicationActionPromptsImport([
    'source_type|source_key|keep_doing|watch_for|practice_next|ask_others',
    'hero_pattern|steady_steward|Keep 1|Watch 1|Practice 1|Ask 1',
    'hero_pattern|steady_steward|Keep 2|Watch 2|Practice 2|Ask 2',
  ].join('\n'));

  assert.equal(result.success, false);
  assert.match(result.errors[0]?.message ?? '', /duplicate row/i);
});

test('invalid source_type is rejected', () => {
  const result = parseApplicationRiskImport([
    'source_type|source_key|priority|label|narrative|impact|early_warning',
    'hero_pattern|steady_steward|1|Overcontrol|Narrative|Impact|Warning',
  ].join('\n'));

  assert.equal(result.success, false);
  assert.match(result.errors[0]?.message ?? '', /source_type/i);
});
