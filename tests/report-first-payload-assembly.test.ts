import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import { buildReportFirstCanonicalPayload } from '@/lib/server/report-first-result-assembly';
import { compileReportFirstTemplateFromMarkdown } from '@/scripts/authoring/compile-report-first-template';

const processReportPath =
  'content/authoring/leadership-approach/report-first/canonical-reports/process_results_people_vision.md';

const requiredChapterTitles = [
  'How your leadership creates value',
  'How others experience your leadership',
  'Decision behaviour',
  'Communication behaviour',
  'What happens under pressure',
  'The strength of this pattern',
  'Where the pattern can tighten',
  'How People expands your leadership',
  'How Vision expands your leadership',
  'Development focus',
] as const;

function compiledTemplate() {
  return compileReportFirstTemplateFromMarkdown(readFileSync(processReportPath, 'utf8'), {
    inputPath: processReportPath,
  });
}

function buildPayload() {
  const compiled = compiledTemplate();
  return buildReportFirstCanonicalPayload({
    assessmentVersionId: 'version-report-first',
    assessmentKey: 'leadership-approach',
    assessmentTitle: 'Leadership Approach',
    assessmentVersionTag: '1.0.0',
    assessmentDescription: 'Leadership assessment',
    domainKey: 'leadership-approach',
    domainTitle: 'Leadership Approach',
    domainDescription: null,
    responses: {
      attemptId: 'attempt-report-first',
      assessmentKey: 'leadership-approach',
      versionTag: '1.0.0',
      status: 'submitted',
      submittedAt: '2026-05-15T10:00:00.000Z',
      responsesByQuestionId: {},
    },
    scoreResult: {
      rawScores: [
        { signalId: 'process', signalKey: 'process', rawScore: 10 },
        { signalId: 'results', signalKey: 'results', rawScore: 8 },
        { signalId: 'people', signalKey: 'people', rawScore: 4 },
        { signalId: 'vision', signalKey: 'vision', rawScore: 2 },
      ],
      diagnostics: {
        scoringMethod: 'option_signal_weights_only',
        totalQuestions: 24,
        answeredQuestions: 24,
        unansweredQuestions: 0,
        totalResponsesProcessed: 24,
        totalWeightsApplied: 96,
        totalScoreMass: 24,
        zeroScoreSignalCount: 0,
        zeroAnswerSubmission: false,
        warnings: [],
        generatedAt: '2026-05-15T10:00:00.000Z',
      },
    },
    normalizedResult: {
      normalizedScores: [
        { signalId: 'process', signalKey: 'process', rawScore: 10, normalizedScore: 42, rank: 1 },
        { signalId: 'results', signalKey: 'results', rawScore: 8, normalizedScore: 33, rank: 2 },
        { signalId: 'people', signalKey: 'people', rawScore: 4, normalizedScore: 17, rank: 3 },
        { signalId: 'vision', signalKey: 'vision', rawScore: 2, normalizedScore: 8, rank: 4 },
      ],
      diagnostics: {
        normalizationMethod: 'largest_remainder_integer_percentages',
        totalScoreMass: 24,
        zeroMass: false,
        globalPercentageSum: 100,
        domainPercentageSums: {},
        roundingAdjustmentsApplied: 0,
        zeroScoreSignalCount: 0,
        warnings: [],
        generatedAt: '2026-05-15T10:00:00.000Z',
      },
    },
    rankedSignals: [
      {
        signal_key: 'process',
        signal_label: 'Process',
        rank: 1,
        raw_score: 10,
        normalized_score: 42,
        position: 'primary',
        position_label: 'Lead signal',
        chapter_intro: '',
        chapter_how_it_shows_up: '',
        chapter_value_outcome: '',
        chapter_value_team_effect: '',
        chapter_risk_behaviour: '',
        chapter_risk_impact: '',
        chapter_development: '',
      },
      {
        signal_key: 'results',
        signal_label: 'Results',
        rank: 2,
        raw_score: 8,
        normalized_score: 33,
        position: 'secondary',
        position_label: 'Strengthening signal',
        chapter_intro: '',
        chapter_how_it_shows_up: '',
        chapter_value_outcome: '',
        chapter_value_team_effect: '',
        chapter_risk_behaviour: '',
        chapter_risk_impact: '',
        chapter_development: '',
      },
      {
        signal_key: 'people',
        signal_label: 'People',
        rank: 3,
        raw_score: 4,
        normalized_score: 17,
        position: 'supporting',
        position_label: 'Range signal',
        chapter_intro: '',
        chapter_how_it_shows_up: '',
        chapter_value_outcome: '',
        chapter_value_team_effect: '',
        chapter_risk_behaviour: '',
        chapter_risk_impact: '',
        chapter_development: '',
      },
      {
        signal_key: 'vision',
        signal_label: 'Vision',
        rank: 4,
        raw_score: 2,
        normalized_score: 8,
        position: 'underplayed',
        position_label: 'Further range',
        chapter_intro: '',
        chapter_how_it_shows_up: '',
        chapter_value_outcome: '',
        chapter_value_team_effect: '',
        chapter_risk_behaviour: '',
        chapter_risk_impact: '',
        chapter_development: '',
      },
    ],
    scoreShape: {
      value: 'paired',
      policyKey: 'fixed_gap_v1',
      policyVersion: '1.0.0',
    },
    patternKey: 'process_results_people_vision',
    template: {
      id: 'template-process-results-people-vision',
      assessment_version_id: 'version-report-first',
      domain_key: 'leadership-approach',
      pattern_key: 'process_results_people_vision',
      report_key: compiled.report_key,
      report_contract: 'report_first_canonical_payload_v1',
      report_template_json: compiled.report_template_json,
      content_hash: compiled.content_hash,
      status: 'active',
    },
    counts: {
      domainCount: 1,
      questionCount: 24,
      optionCount: 96,
      weightCount: 96,
      signalCount: 4,
      derivedPairCount: 0,
    },
  });
}

test('report-first canonical payload contains full ordered compiled report body', () => {
  const payload = buildPayload();
  const report = payload.report as {
    patternSummary?: { title?: string; blocks?: unknown[] };
    chapters?: Array<{ title: string; blocks: unknown[] }>;
    closing?: { synthesis?: unknown[]; finalLine?: string };
    pdf?: { title?: string; body?: string };
  };
  const persistedTemplate = payload.reportFirst.template as {
    report?: {
      patternSummary?: { title?: string; blocks?: unknown[] };
      chapters?: Array<{ title: string; blocks: unknown[] }>;
      closing?: { synthesis?: unknown[]; finalLine?: string };
      pdf?: { title?: string; body?: string };
    };
  };

  assert.equal(report.patternSummary?.title, 'Pattern at a glance');
  assert.deepEqual(report.chapters?.map((chapter) => chapter.title), requiredChapterTitles);
  assert.equal(report.chapters?.length, 10);
  assert.ok((report.chapters ?? []).every((chapter) => chapter.blocks.length > 0));
  assert.ok((report.chapters?.[1]?.blocks.length ?? 0) >= 5, 'Chapter 2 should retain full body depth.');
  assert.match(
    JSON.stringify(report.chapters?.[9]),
    /Leave space just before closure/,
    'Chapter 10 should retain the later development actions.',
  );
  assert.match(
    JSON.stringify(report.chapters?.[9]),
    /Does this immediate action still support the longer direction/,
    'Chapter 10 should retain the final pressure-check prompts.',
  );
  assert.ok((report.closing?.synthesis?.length ?? 0) >= 4);
  assert.match(report.closing?.finalLine ?? '', /Your leadership turns complexity into structured/);
  assert.equal(report.pdf?.title, 'Download your Leadership Approach report as a PDF.');
  assert.match(report.pdf?.body ?? '', /This report is designed as a reference document/);

  assert.equal(persistedTemplate.report?.patternSummary?.title, 'Pattern at a glance');
  assert.deepEqual(persistedTemplate.report?.chapters?.map((chapter) => chapter.title), requiredChapterTitles);
  assert.match(JSON.stringify(persistedTemplate.report?.chapters?.[9]), /Does this immediate action still support the longer direction/);
  assert.match(persistedTemplate.report?.closing?.finalLine ?? '', /Your leadership turns complexity into structured/);
  assert.equal(persistedTemplate.report?.pdf?.title, 'Download your Leadership Approach report as a PDF.');
});
