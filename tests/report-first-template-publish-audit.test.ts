import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import {
  auditRankedPatternAssessmentVersion,
  type RankedPatternPublishAuditResult,
} from '@/content/assessment-packages/import-contract/ranked-pattern-publish-audit';
import type { RankedPatternPersistenceDbClient } from '@/content/assessment-packages/import-contract/ranked-pattern-import-persistence';
import { buildPatternKeyFromRankedSignalKeys } from '@/content/assessment-packages/import-contract/ranked-pattern-import-manifest';

type Fixture = {
  version: readonly Record<string, unknown>[];
  domains: readonly Record<string, unknown>[];
  signals: readonly Record<string, unknown>[];
  questions: readonly Record<string, unknown>[];
  options: readonly Record<string, unknown>[];
  optionWeights: readonly Record<string, unknown>[];
  rankedPatterns: readonly Record<string, unknown>[];
  scoreShapeRules: readonly Record<string, unknown>[];
  sectionDefinitions: readonly Record<string, unknown>[];
  resultLanguageRows: readonly Record<string, unknown>[];
  previewCases: readonly Record<string, unknown>[];
  reportFirstTemplates: readonly Record<string, unknown>[];
};

const signalKeys = ['signal_a', 'signal_b', 'signal_c', 'signal_d'] as const;
const scoreShapes = ['concentrated', 'paired', 'graduated', 'balanced'] as const;
const reportContract = 'report_first_canonical_payload_v1';
const scoreShapePolicy = 'pattern_level_score_shape_neutral';
const patternScoreShapeSections = [
  'orientation',
  'recognition',
  'pattern_mechanics',
  'pattern_synthesis',
  'closing_integration',
] as const;
const patternOnlySections = ['strengths', 'narrowing', 'application'] as const;
const chapterTitles = [
  'How your leadership creates value',
  'How others experience your leadership',
  'Decision behaviour',
  'Communication behaviour',
  'What happens under pressure',
  'The strength of this pattern',
  'Where the pattern can tighten',
  'How Results expands your leadership',
  'How Vision expands your leadership',
  'Development focus',
] as const;

function patterns() {
  const result: Array<{ patternKey: string; ranks: readonly [string, string, string, string] }> = [];
  for (const first of signalKeys) {
    for (const second of signalKeys) {
      for (const third of signalKeys) {
        for (const fourth of signalKeys) {
          if (new Set([first, second, third, fourth]).size === 4) {
            result.push({
              patternKey: buildPatternKeyFromRankedSignalKeys(first, second, third, fourth),
              ranks: [first, second, third, fourth],
            });
          }
        }
      }
    }
  }
  return result;
}

function reportJson(patternKey: string): Record<string, unknown> {
  const block = (text: string) => ({ type: 'paragraph', text });
  return {
    metadata: { contractName: reportContract, reportModel: 'report_first_canonical' },
    reportKey: patternKey,
    patternKey,
    domainKey: 'domain_key',
    report: {
      reportKey: patternKey,
      patternKey,
      reportTitle: `Leadership Approach - ${patternKey}`,
      hero: { title: 'Report title', statement: 'Report statement.' },
      opening: [block('Editorial introduction.')],
      patternSummary: { title: 'Pattern at a glance', blocks: [block('Pattern summary.')] },
      keyInsight: 'Key insight.',
      chapters: chapterTitles.map((title, index) => ({
        chapterKey: `chapter_${index + 1}`,
        chapterNumber: index + 1,
        title,
        blocks: [block(`${title} body.`)],
        readerFacing: true,
      })),
      closing: { synthesis: [block('Closing synthesis.')], finalLine: 'Final line.' },
      pdf: { title: 'Save this report', blocks: [block('PDF reference.')] },
    },
    evidenceTemplate: { title: 'Evidence behind your result', blocks: [block('Evidence.')] },
  };
}

function reportFirstTemplatesFor(selected = patterns()): readonly Record<string, unknown>[] {
  return selected.map(({ patternKey }, index) => ({
    id: `report-first-template-${index + 1}`,
    assessment_version_id: 'version-1',
    domain_key: 'domain_key',
    pattern_key: patternKey,
    report_key: patternKey,
    report_contract: reportContract,
    score_shape_policy: scoreShapePolicy,
    score_shape: null,
    report_template_json: reportJson(patternKey),
    content_hash: `hash-${index + 1}`,
    status: 'active',
    publishable: true,
    ready_for_import: true,
  }));
}

function completeFixture(): Fixture {
  const allPatterns = patterns();
  return {
    version: [{
      assessment_version_id: 'version-1',
      assessment_id: 'assessment-1',
      version: '1.0.0',
      lifecycle_status: 'DRAFT',
      mode: 'single_domain',
      result_model_key: 'ranked_pattern',
      assessment_key: 'leadership-approach',
      assessment_title: 'Leadership Approach',
      is_active: true,
    }],
    domains: [{
      id: 'domain-1',
      domain_key: 'domain_key',
      label: 'Domain',
      domain_type: 'SIGNAL_GROUP',
      order_index: 0,
    }],
    signals: signalKeys.map((signalKey, index) => ({
      id: `signal-${index + 1}`,
      domain_id: 'domain-1',
      signal_key: signalKey,
      label: `Signal ${index + 1}`,
      order_index: index + 1,
      is_overlay: false,
    })),
    questions: [{ id: 'question-1', domain_id: 'domain-1', question_key: 'question_1', order_index: 1 }],
    options: [{ id: 'option-1', question_id: 'question-1', option_key: 'A', order_index: 1 }],
    optionWeights: [{ id: 'weight-1', option_id: 'option-1', signal_id: 'signal-1', weight: '1' }],
    rankedPatterns: allPatterns.map(({ patternKey, ranks }, index) => ({
      id: `pattern-${index + 1}`,
      domain_key: 'domain_key',
      pattern_key: patternKey,
      rank_1_signal_key: ranks[0],
      rank_2_signal_key: ranks[1],
      rank_3_signal_key: ranks[2],
      rank_4_signal_key: ranks[3],
      status: 'active',
    })),
    scoreShapeRules: scoreShapes.map((scoreShape, index) => ({
      id: `rule-${index + 1}`,
      score_shape: scoreShape,
      rule_key: `${scoreShape}_rule`,
      rule_config: { policy: scoreShape },
      status: 'active',
    })),
    sectionDefinitions: [
      ['context', '05_Context'],
      ['orientation', '06_Orientation'],
      ['recognition', '07_Recognition'],
      ['signal_roles', '08_Signal_Roles'],
      ['pattern_mechanics', '09_Pattern_Mechanics'],
      ['pattern_synthesis', '10_Pattern_Synthesis'],
      ['strengths', '11_Strengths'],
      ['narrowing', '12_Narrowing'],
      ['application', '13_Application'],
      ['closing_integration', '14_Closing_Integration'],
    ].map(([sectionKey, sourceSheetKey], index) => ({
      id: `section-${index + 1}`,
      section_key: sectionKey,
      section_order: index + 1,
      source_sheet_key: sourceSheetKey,
      runtime_category: 'runtime_result_content',
      status: 'active',
    })),
    resultLanguageRows: [
      {
        id: 'language-context',
        section_key: 'context',
        lookup_key: 'context::domain',
        domain_key: 'domain_key',
        field_values: { heading: 'Context' },
        status: 'active',
      },
      ...patternScoreShapeSections.flatMap((sectionKey) =>
        allPatterns.flatMap(({ patternKey }) =>
          scoreShapes.map((scoreShape) => ({
            id: `${sectionKey}-${patternKey}-${scoreShape}`,
            section_key: sectionKey,
            lookup_key: `${sectionKey}::${patternKey}::${scoreShape}`,
            domain_key: 'domain_key',
            pattern_key: patternKey,
            score_shape: scoreShape,
            field_values: { text: `${sectionKey} ${scoreShape}` },
            status: 'active',
          })),
        ),
      ),
      ...signalKeys.flatMap((signalKey) =>
        [1, 2, 3, 4].map((rankPosition) => ({
          id: `role-${signalKey}-${rankPosition}`,
          section_key: 'signal_roles',
          lookup_key: `signal_roles::${signalKey}::${rankPosition}`,
          signal_key: signalKey,
          rank_position: rankPosition,
          field_values: { text: `${signalKey} rank ${rankPosition}` },
          status: 'active',
        })),
      ),
      ...patternOnlySections.flatMap((sectionKey) =>
        allPatterns.map(({ patternKey }) => ({
          id: `${sectionKey}-${patternKey}`,
          section_key: sectionKey,
          lookup_key: `${sectionKey}::${patternKey}`,
          domain_key: 'domain_key',
          pattern_key: patternKey,
          priority: 1,
          field_values: { text: `${sectionKey} ${patternKey}` },
          status: 'active',
        })),
      ),
    ],
    previewCases: [{
      id: 'preview-1',
      preview_case_key: 'case_1',
      domain_key: 'domain_key',
      ranked_signal_keys: ['signal_a', 'signal_b', 'signal_c', 'signal_d'],
      normalized_scores: { signal_a: 40, signal_b: 30, signal_c: 20, signal_d: 10 },
      expected_score_shape: 'balanced',
      expected_pattern_key: 'signal_a_signal_b_signal_c_signal_d',
      status: 'active',
    }],
    reportFirstTemplates: reportFirstTemplatesFor(allPatterns),
  };
}

function dbForFixture(fixture: Fixture): RankedPatternPersistenceDbClient {
  return {
    async query<T>(text: string) {
      let rows: readonly Record<string, unknown>[] = [];
      if (text.includes('FROM assessment_versions av')) rows = fixture.version;
      else if (text.includes('FROM domains')) rows = fixture.domains;
      else if (text.includes('FROM signals')) rows = fixture.signals;
      else if (text.includes('FROM questions')) rows = fixture.questions;
      else if (text.includes('FROM options')) rows = fixture.options;
      else if (text.includes('FROM option_signal_weights')) rows = fixture.optionWeights;
      else if (text.includes('FROM assessment_ranked_patterns')) rows = fixture.rankedPatterns.filter((row) => row.status === 'active');
      else if (text.includes('FROM assessment_score_shape_rules')) rows = fixture.scoreShapeRules.filter((row) => row.status === 'active');
      else if (text.includes('FROM assessment_result_section_definitions')) rows = fixture.sectionDefinitions.filter((row) => row.status === 'active');
      else if (text.includes('FROM assessment_result_language_rows')) rows = fixture.resultLanguageRows.filter((row) => row.status === 'active');
      else if (text.includes('FROM assessment_report_preview_cases')) rows = fixture.previewCases.filter((row) => row.status === 'active');
      else if (text.includes('FROM assessment_report_first_templates')) rows = fixture.reportFirstTemplates.filter((row) => row.status === 'active');
      return { rows: rows as readonly T[] };
    },
  };
}

async function audit(fixture: Fixture): Promise<RankedPatternPublishAuditResult> {
  return auditRankedPatternAssessmentVersion({
    assessmentVersionId: 'version-1',
    db: dbForFixture(fixture),
    auditReportFirstTemplates: true,
  });
}

function withFixture(mutator: (fixture: Fixture) => Fixture): Fixture {
  return mutator(completeFixture());
}

function hasCode(result: RankedPatternPublishAuditResult, code: string): boolean {
  return result.findings.some((finding) => finding.code === code);
}

test('24 imported publishable report-first templates pass publish audit', async () => {
  const result = await audit(completeFixture());

  assert.equal(result.canPublish, true);
  assert.equal(result.summaryCountsByCategory.report_first_templates.blocking, 0);
});

test('23 imported templates block publish readiness', async () => {
  const result = await audit(withFixture((fixture) => ({
    ...fixture,
    reportFirstTemplates: reportFirstTemplatesFor(patterns().slice(1)),
  })));

  assert.equal(result.canPublish, false);
  assert.equal(hasCode(result, 'REPORT_FIRST_TEMPLATE_COUNT_INVALID'), true);
  assert.equal(hasCode(result, 'REPORT_FIRST_TEMPLATE_MISSING_FOR_PATTERN'), true);
});

test('generated artifact coverage does not satisfy publish audit without DB rows', async () => {
  const artifactText = readFileSync(
    'content/assessment-packages/leadership-approach/generated/report-first-template-import-rows.json',
    'utf8',
  );
  assert.match(artifactText, /"generated_import_ready_count": 24/);

  const result = await audit(withFixture((fixture) => ({ ...fixture, reportFirstTemplates: [] })));

  assert.equal(result.canPublish, false);
  assert.equal(hasCode(result, 'REPORT_FIRST_TEMPLATE_COUNT_INVALID'), true);
});

test('duplicate active publishable template blocks publish readiness', async () => {
  const templates = reportFirstTemplatesFor();
  const result = await audit(withFixture((fixture) => ({
    ...fixture,
    reportFirstTemplates: [
      ...templates,
      { ...templates[0], id: 'duplicate-template', report_key: 'duplicate_report', content_hash: 'hash-duplicate' },
    ],
  })));

  assert.equal(hasCode(result, 'REPORT_FIRST_TEMPLATE_DUPLICATE_PATTERN'), true);
  assert.equal(hasCode(result, 'REPORT_FIRST_TEMPLATE_DUPLICATE_PATTERN_POLICY_SHAPE'), true);
});

test('draft inactive missing or non-publishable rows do not satisfy coverage', async () => {
  const templates = reportFirstTemplatesFor().map((template, index) => {
    if (index === 0) return { ...template, status: 'draft' };
    if (index === 1) return { ...template, status: 'inactive' };
    if (index === 2) return { ...template, publishable: false };
    if (index === 3) return { ...template, ready_for_import: false };
    return template;
  });
  const result = await audit(withFixture((fixture) => ({ ...fixture, reportFirstTemplates: templates })));

  assert.equal(result.canPublish, false);
  assert.equal(hasCode(result, 'REPORT_FIRST_TEMPLATE_COUNT_INVALID'), true);
  assert.equal(hasCode(result, 'REPORT_FIRST_TEMPLATE_NOT_PUBLISHABLE'), true);
});

test('unsupported score-shape policy and non-null score_shape block publish readiness', async () => {
  const result = await audit(withFixture((fixture) => ({
    ...fixture,
    reportFirstTemplates: reportFirstTemplatesFor().map((template, index) => {
      if (index === 0) return { ...template, score_shape_policy: 'score_shape_specific' };
      if (index === 1) return { ...template, score_shape: 'balanced' };
      return template;
    }),
  })));

  assert.equal(hasCode(result, 'REPORT_FIRST_TEMPLATE_UNSUPPORTED_SCORE_SHAPE_POLICY'), true);
  assert.equal(hasCode(result, 'REPORT_FIRST_TEMPLATE_SCORE_SHAPE_NOT_NULL'), true);
});

test('malformed and incomplete report_template_json blocks publish readiness', async () => {
  const result = await audit(withFixture((fixture) => ({
    ...fixture,
    reportFirstTemplates: reportFirstTemplatesFor().map((template, index) => {
      if (index === 0) return { ...template, report_template_json: '{not-json' };
      if (index === 1) {
        const incomplete = reportJson(String(template.pattern_key));
        const report = incomplete.report as Record<string, unknown>;
        report.chapters = [];
        return { ...template, report_template_json: incomplete };
      }
      return template;
    }),
  })));

  assert.equal(hasCode(result, 'REPORT_FIRST_TEMPLATE_EMPTY_JSON'), true);
  assert.equal(hasCode(result, 'REPORT_FIRST_TEMPLATE_BODY_INCOMPLETE'), true);
});

test('pattern_key outside assessment_ranked_patterns blocks publish readiness', async () => {
  const result = await audit(withFixture((fixture) => ({
    ...fixture,
    reportFirstTemplates: reportFirstTemplatesFor().map((template, index) =>
      index === 0 ? { ...template, pattern_key: 'unknown_pattern_key', report_key: 'unknown_pattern_key' } : template,
    ),
  })));

  assert.equal(hasCode(result, 'REPORT_FIRST_TEMPLATE_UNKNOWN_PATTERN'), true);
  assert.equal(hasCode(result, 'REPORT_FIRST_TEMPLATE_MISSING_FOR_PATTERN'), true);
});

test('wrong report contract blocks publish readiness', async () => {
  const result = await audit(withFixture((fixture) => ({
    ...fixture,
    reportFirstTemplates: reportFirstTemplatesFor().map((template, index) =>
      index === 0 ? { ...template, report_contract: 'legacy_contract' } : template,
    ),
  })));

  assert.equal(hasCode(result, 'REPORT_FIRST_TEMPLATE_INVALID_CONTRACT'), true);
});
