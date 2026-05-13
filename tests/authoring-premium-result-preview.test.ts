import assert from 'node:assert/strict';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';

import { renderPremiumResultPreview } from '@/scripts/authoring/render-premium-result-preview';

const patternKey = 'process_results_people_vision';
const scoreShape = 'paired';

const files = {
  orientation: '06-orientation-leadership-approach.preview.psv',
  recognition: '07-recognition-leadership-approach.preview.psv',
  mechanics: '09-pattern-mechanics-leadership-approach.preview.psv',
  synthesis: '10-pattern-synthesis-leadership-approach.preview.psv',
  strengths: '11-strengths-leadership-approach.preview.psv',
  narrowing: '12-narrowing-leadership-approach.preview.psv',
  application: '13-application-leadership-approach.preview.psv',
  closing: '14-closing-integration-leadership-approach.preview.psv',
};

function scoreShapeRow(section: keyof typeof files, shape = scoreShape): string {
  const common = `leadership_approach|${patternKey}|${shape}`;
  if (section === 'orientation') {
    return [
      'domain_key|pattern_key|score_shape|rank_1_signal_key|rank_2_signal_key|rank_3_signal_key|rank_4_signal_key|orientation_title|orientation_summary|score_shape_summary|rank_1_phrase|rank_2_phrase|rank_3_phrase|rank_4_phrase|status|lookup_key',
      `${common}|process|results|people|vision|A reliable route through the work|Orientation summary exact text.|Score shape summary exact text.|Rank one exact.|Rank two exact.|Rank three exact.|Rank four exact.|review|lookup`,
    ].join('\n');
  }
  if (section === 'recognition') {
    return [
      'domain_key|pattern_key|score_shape|rank_1_signal_key|rank_2_signal_key|rank_3_signal_key|rank_4_signal_key|headline|recognition_statement|recognition_expansion|status|lookup_key',
      `${common}|process|results|people|vision|Recognition headline|Recognition statement exact.|Recognition expansion exact.|review|lookup`,
    ].join('\n');
  }
  if (section === 'mechanics') {
    return [
      'domain_key|pattern_key|score_shape|rank_1_signal_key|rank_2_signal_key|rank_3_signal_key|rank_4_signal_key|mechanics_title|core_mechanism|why_it_shows_up|what_it_protects|status|lookup_key',
      `${common}|process|results|people|vision|Mechanics title|Core mechanism exact.|Why it shows up exact.|What it protects exact.|review|lookup`,
    ].join('\n');
  }
  if (section === 'synthesis') {
    return [
      'domain_key|pattern_key|score_shape|rank_1_signal_key|rank_2_signal_key|rank_3_signal_key|rank_4_signal_key|synthesis_title|gift|trap|takeaway|synthesis_text|status|lookup_key',
      `${common}|process|results|people|vision|Synthesis title|Gift exact.|Trap exact.|Takeaway exact.|Synthesis text exact.|review|lookup`,
    ].join('\n');
  }
  return [
    'domain_key|pattern_key|score_shape|closing_summary|core_gift|core_trap|development_edge|memorable_line|status|lookup_key',
    `${common}|Closing summary exact.|Core gift exact.|Core trap exact.|Development edge exact.|Memorable line exact.|review|lookup`,
  ].join('\n');
}

function listRows(section: 'strengths' | 'narrowing' | 'application', empty = false): string {
  if (section === 'strengths') {
    return [
      'domain_key|pattern_key|strength_key|priority|strength_title|strength_text|linked_signal_key|status|lookup_key',
      ...(empty ? [] : [
        `leadership_approach|${patternKey}|strength_1|1|Strength one|Strength one exact.|process|review|lookup`,
      ]),
    ].join('\n');
  }
  if (section === 'narrowing') {
    return [
      'domain_key|pattern_key|narrowing_key|priority|narrowing_title|narrowing_text|missing_range_signal_key|status|lookup_key',
      ...(empty ? [] : [
        `leadership_approach|${patternKey}|narrowing_1|1|Narrowing one|Narrowing one exact.|people|review|lookup`,
      ]),
    ].join('\n');
  }
  return [
    'domain_key|pattern_key|application_key|priority|application_title|application_text|linked_signal_key|status|lookup_key',
    ...(empty ? [] : [
      `leadership_approach|${patternKey}|application_1|1|Application one|Application one exact.|people|review|lookup`,
    ]),
  ].join('\n');
}

async function fixture(overrides: Partial<Record<keyof typeof files, string>> = {}) {
  const dir = await mkdtemp(path.join(tmpdir(), 'premium-preview-'));
  const generatedDir = path.join(dir, 'generated');
  await mkdir(generatedDir, { recursive: true });

  const content: Record<keyof typeof files, string> = {
    orientation: scoreShapeRow('orientation'),
    recognition: scoreShapeRow('recognition'),
    mechanics: scoreShapeRow('mechanics'),
    synthesis: scoreShapeRow('synthesis'),
    strengths: listRows('strengths'),
    narrowing: listRows('narrowing'),
    application: listRows('application'),
    closing: scoreShapeRow('closing'),
    ...overrides,
  };

  for (const [section, fileName] of Object.entries(files) as Array<[keyof typeof files, string]>) {
    if (content[section] !== '__omit__') {
      await writeFile(path.join(generatedDir, fileName), `${content[section]}\n`, 'utf8');
    }
  }

  return {
    generatedDir,
    cleanup: () => rm(dir, { recursive: true, force: true }),
  };
}

async function render(generatedDir: string) {
  return renderPremiumResultPreview({ generatedDir, patternKey, scoreShape });
}

test('renders a complete preview from valid generated PSV files', async () => {
  const fx = await fixture();
  try {
    const result = await render(fx.generatedDir);
    assert.match(result.markdown, /## Pattern At A Glance/);
    assert.match(result.markdown, /## Closing Integration/);
  } finally {
    await fx.cleanup();
  }
});

test('fails when 06_Orientation is missing', async () => {
  const fx = await fixture({ orientation: '__omit__' });
  try {
    await assert.rejects(() => render(fx.generatedDir), /Missing generated preview file/);
  } finally {
    await fx.cleanup();
  }
});

test('fails when score-shape row exists for the wrong score_shape', async () => {
  const fx = await fixture({ orientation: scoreShapeRow('orientation', 'balanced') });
  try {
    await assert.rejects(() => render(fx.generatedDir), /06_Orientation: expected one row/);
  } finally {
    await fx.cleanup();
  }
});

test('fails when list sections are empty', async () => {
  const fx = await fixture({ strengths: listRows('strengths', true) });
  try {
    await assert.rejects(() => render(fx.generatedDir), /11_Strengths: expected at least one list row/);
  } finally {
    await fx.cleanup();
  }
});

test('does not leak authoring-only fields', async () => {
  const fx = await fixture({
    orientation: `${scoreShapeRow('orientation').split('\n')[0]}|source_anchor\n${scoreShapeRow('orientation').split('\n')[1]}|leak`,
  });
  try {
    await assert.rejects(() => render(fx.generatedDir), /authoring-only field/);
  } finally {
    await fx.cleanup();
  }
});

test('does not leak raw pattern_key in reader-facing sections', async () => {
  const fx = await fixture();
  try {
    const result = await render(fx.generatedDir);
    const body = result.markdown.split('## Your Leadership Result')[1] ?? '';
    const reader = body.split('## Admin/debug appendix')[0] ?? '';
    assert.equal(reader.includes(patternKey), false);
  } finally {
    await fx.cleanup();
  }
});

test('renders strengths narrowing and application as readable lists', async () => {
  const fx = await fixture();
  try {
    const result = await render(fx.generatedDir);
    assert.match(result.markdown, /- \*\*Strength one\*\*/);
    assert.match(result.markdown, /- \*\*Narrowing one\*\*/);
    assert.match(result.markdown, /- \*\*Application one\*\*/);
  } finally {
    await fx.cleanup();
  }
});

test('includes preview metadata', async () => {
  const fx = await fixture();
  try {
    const result = await render(fx.generatedDir);
    assert.match(result.markdown, /preview_status: authoring preview only/);
    assert.match(result.markdown, /normalized_scores: Process 42%, Results 33%, People 17%, Vision 8%/);
  } finally {
    await fx.cleanup();
  }
});

test('includes admin debug appendix', async () => {
  const fx = await fixture();
  try {
    const result = await render(fx.generatedDir);
    assert.match(result.markdown, /## Admin\/debug appendix/);
    assert.match(result.markdown, /accepted_warnings/);
  } finally {
    await fx.cleanup();
  }
});

test('output is deterministic', async () => {
  const fx = await fixture();
  try {
    const first = await render(fx.generatedDir);
    const second = await render(fx.generatedDir);
    assert.equal(first.markdown, second.markdown);
  } finally {
    await fx.cleanup();
  }
});

test('preserves generated final text without semantic rewriting', async () => {
  const fx = await fixture();
  try {
    const result = await render(fx.generatedDir);
    assert.match(result.markdown, /Orientation summary exact text\./);
    assert.match(result.markdown, /Core mechanism exact\./);
  } finally {
    await fx.cleanup();
  }
});

test('reports clear errors for malformed PSV', async () => {
  const fx = await fixture({ orientation: 'a|b\n1|2|3' });
  try {
    await assert.rejects(() => render(fx.generatedDir), /malformed PSV row/);
  } finally {
    await fx.cleanup();
  }
});
