import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const brandPageSource = readFileSync(
  join(process.cwd(), 'app', '(public)', 'brand', 'brand-page-content.tsx'),
  'utf8',
);

test('brand page documents the assessment results experience standard', () => {
  assert.match(brandPageSource, /Assessment Results Experience/);
  assert.match(brandPageSource, /Pattern at a Glance/);
  assert.match(brandPageSource, /Reading rail/);
  assert.match(brandPageSource, /Focus mode/);
  assert.match(brandPageSource, /Take Forward/);
});

test('brand page results standard protects schema-backed briefing principles', () => {
  assert.match(brandPageSource, /guided behavioural intelligence briefing/);
  assert.match(brandPageSource, /schema-backed sections/);
  assert.match(brandPageSource, /UI-side recomputation/);
  assert.match(brandPageSource, /browser fullscreen/);
});
