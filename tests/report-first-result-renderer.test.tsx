import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';
import { renderToStaticMarkup } from 'react-dom/server';

import { ReportFirstResultReport } from '@/components/results/report-first-result-report';
import { compileReportFirstTemplateFromMarkdown } from '@/scripts/authoring/compile-report-first-template';
import type {
  ReportFirstCanonicalPayloadV1,
  ReportFirstRankedSignal,
  ReportFirstScoreRow,
} from '@/lib/types/report-first-result';

const processReportPath =
  'content/authoring/leadership-approach/report-first/canonical-reports/process_results_people_vision.md';

const requiredSourceHeadings = [
  'Editorial introduction',
  'Pattern at a glance',
  'Chapter 1 — How your leadership creates value',
  'Chapter 2 — How others experience your leadership',
  'Chapter 3 — Decision behaviour',
  'Chapter 4 — Communication behaviour',
  'Chapter 5 — What happens under pressure',
  'Chapter 6 — The strength of this pattern',
  'Chapter 7 — Where the pattern can tighten',
  'Chapter 8 — How People expands your leadership',
  'Chapter 9 — How Vision expands your leadership',
  'Chapter 10 — Development focus',
  'Closing synthesis',
  'Final line',
  'Save this report',
] as const;

const representativeParagraphs = [
  'Your leadership approach is led by Process and strengthened by Results.',
  'This is a structure-and-delivery pattern.',
  'These scores show why your report is led by Process and Results',
  'Others may experience your leadership as dependable, grounded, and useful.',
  'You are likely to make decisions by organising available information into a practical route.',
  'You tend to communicate through clarity, structure, and expectation.',
  'Under pressure, your leadership may tighten toward control, sequence, and delivery discipline.',
  'People expands this pattern by turning clarity into shared ownership.',
  'Vision expands this pattern by connecting reliable action to a larger direction.',
  'The development work is not to abandon structure or delivery.',
  'At your best, you give people more than a process to follow.',
  'This report is designed as a reference document.',
] as const;

const rankedSignals = [
  { rank: 1, signalKey: 'process', signalLabel: 'Process', roleLabel: 'Lead signal' },
  { rank: 2, signalKey: 'results', signalLabel: 'Results', roleLabel: 'Strengthening signal' },
  { rank: 3, signalKey: 'people', signalLabel: 'People', roleLabel: 'Range signal' },
  { rank: 4, signalKey: 'vision', signalLabel: 'Vision', roleLabel: 'Further range' },
] as const satisfies readonly ReportFirstRankedSignal[];

const normalizedScores = [
  { signalKey: 'process', signalLabel: 'Process', normalizedPercent: 42, rawScore: 10 },
  { signalKey: 'results', signalLabel: 'Results', normalizedPercent: 33, rawScore: 8 },
  { signalKey: 'people', signalLabel: 'People', normalizedPercent: 17, rawScore: 4 },
  { signalKey: 'vision', signalLabel: 'Vision', normalizedPercent: 8, rawScore: 2 },
] as const satisfies readonly ReportFirstScoreRow[];

function sourceMarkdown(): string {
  return readFileSync(processReportPath, 'utf8');
}

function compiledReport() {
  return compileReportFirstTemplateFromMarkdown(sourceMarkdown(), {
    inputPath: processReportPath,
  });
}

function buildReportFirstPayload(): ReportFirstCanonicalPayloadV1 {
  const compiled = compiledReport();
  return {
    metadata: {
      payloadVersion: 1,
      contractName: 'report_first_canonical_payload_v1',
      generatedAt: '2026-05-15T10:00:00.000Z',
      assessmentVersionId: 'version-report-first',
      assessmentKey: 'leadership-approach',
      assessmentTitle: 'Leadership Approach',
      version: '1.0.0',
      attemptId: 'attempt-report-first',
      mode: 'single_domain',
      reportMode: 'single_domain_ranked_pattern',
      reportModel: 'report_first_canonical',
      resultModelKey: 'ranked_pattern',
      domainKey: 'leadership-approach',
      completedAt: '2026-05-15T10:00:00.000Z',
    },
    assessment: {
      key: 'leadership-approach',
      title: 'Leadership Approach',
      version: '1.0.0',
      description: 'Leadership assessment',
    },
    attempt: {
      attemptId: 'attempt-report-first',
      submittedAt: '2026-05-15T10:00:00.000Z',
      completedAt: '2026-05-15T10:00:00.000Z',
      answeredQuestionCount: 24,
      totalQuestionCount: 24,
    },
    domain: {
      key: 'leadership-approach',
      title: 'Leadership Approach',
      description: null,
    },
    topSignal: {
      signalKey: 'process',
      signalLabel: 'Process',
      rank: 1,
      rawScore: 10,
      normalizedPercentage: 42,
    },
    rankedSignals,
    normalizedScores,
    scoreShape: {
      value: 'paired',
      policyKey: 'fixed_gap_v1',
      policyVersion: '1.0.0',
    },
    patternKey: 'process_results_people_vision',
    scoring: {
      patternKey: 'process_results_people_vision',
      scoreShape: 'paired',
      rankedSignals,
      normalizedScores,
      rawScores: normalizedScores,
      scoreShapeCapturedButNotLanguageDriving: true,
      scoringMethod: 'option_signal_weights',
      normalizationMethod: 'largest_remainder_integer_percentages',
    },
    report: compiled.report_template_json.report,
    reportFirst: {
      templateId: 'template-1',
      reportKey: compiled.report_key,
      patternKey: compiled.pattern_key,
      contentHash: compiled.content_hash,
      contractName: 'report_first_canonical_payload_v1',
      template: compiled.report_template_json,
    },
    evidence: {
      title: 'Evidence behind your result',
      rankedSignalEvidence: rankedSignals,
      scoreRows: normalizedScores,
      scoreShapeBadge: {
        label: 'paired',
        readerFacing: false,
      },
      explanatoryNote: 'These scores provide evidence for the ranked pattern; the report explains what that pattern means in practice.',
    },
    diagnostics: {
      readinessStatus: 'ready',
      scoringMethod: 'option_signal_weights_only',
      normalizationMethod: 'largest_remainder_integer_percentages',
      answeredQuestionCount: 24,
      totalQuestionCount: 24,
      signalCount: 4,
      derivedPairCount: 0,
      topPair: null,
      scoreShapePolicy: { policyKey: 'fixed_gap_v1', policyVersion: '1.0.0' },
      patternLookup: {
        patternKey: 'process_results_people_vision',
        rankSignalKeys: ['process', 'results', 'people', 'vision'],
      },
      reportFirstTemplate: {
        id: 'template-1',
        reportKey: compiled.report_key,
        contentHash: compiled.content_hash,
        reportContract: 'report_first_canonical_payload_v1',
      },
      sourceReportKey: compiled.report_key,
      sourceAssessmentVersionId: 'version-report-first',
      sourceContentHash: compiled.content_hash,
      adminNotesExcluded: true,
      warningList: [],
      generatedFrom: 'compiled_report_first_template',
      counts: { domainCount: 1, questionCount: 24, optionCount: 96, weightCount: 96 },
      warnings: [],
    },
  };
}

function textFromMarkup(markup: string): string {
  return markup
    .replace(/<[^>]+>/g, ' ')
    .replace(/&#x27;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim();
}

test('report-first result renderer displays all major source headings from the canonical markdown', () => {
  const markup = renderToStaticMarkup(<ReportFirstResultReport payload={buildReportFirstPayload()} />);
  const renderedText = textFromMarkup(markup);

  assert.match(markup, /data-report-first-result="true"/);
  for (const heading of requiredSourceHeadings) {
    assert.ok(renderedText.includes(heading), `Expected rendered report to include heading: ${heading}`);
  }
});

test('report-first result renderer preserves body depth from the canonical markdown', () => {
  const markup = renderToStaticMarkup(<ReportFirstResultReport payload={buildReportFirstPayload()} />);
  const renderedText = textFromMarkup(markup);

  for (const paragraph of representativeParagraphs) {
    assert.ok(
      renderedText.includes(paragraph),
      `Expected rendered report to include representative source text: ${paragraph}`,
    );
  }
});

test('report-first result renderer preserves structured report blocks in source order', () => {
  const markup = renderToStaticMarkup(<ReportFirstResultReport payload={buildReportFirstPayload()} />);
  const renderedText = textFromMarkup(markup);
  const orderedMarkers = [
    'Editorial introduction',
    'Pattern at a glance',
    'Evidence behind your result',
    'Key insight',
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
    'Closing synthesis',
    'Final line',
    'Save this report',
  ];
  const markerPositions = orderedMarkers.map((marker) => {
    const index = renderedText.indexOf(marker);
    assert.notEqual(index, -1, `Expected marker: ${marker}`);
    return index;
  });

  assert.deepEqual(markerPositions, [...markerPositions].sort((left, right) => left - right));
  assert.match(markup, /data-report-first-table-block="true"/);
  assert.match(markup, /data-report-first-ranked-table="true"/);
  assert.match(markup, /data-report-first-signal-stack="true"/);
  const patternSectionMarkup = markup.match(/data-report-first-section="pattern"[\s\S]*?data-report-first-section="evidence"/)?.[0] ?? '';
  assert.doesNotMatch(patternSectionMarkup, /data-report-first-signal-stack="true"/);
  assert.match(markup, /data-report-first-card="strength"/);
  assert.match(markup, /data-report-first-card="tightening"/);
  assert.match(markup, /data-report-first-card="development-action"/);
  assert.match(markup, /data-report-first-prompt-group="true"/);
});

test('report-first result renderer hides internal diagnostics and raw identifiers from reader output', () => {
  const markup = renderToStaticMarkup(<ReportFirstResultReport payload={buildReportFirstPayload()} />);
  const renderedText = textFromMarkup(markup);

  assert.doesNotMatch(renderedText, /process_results_people_vision/);
  assert.doesNotMatch(renderedText, /template-1/);
  assert.doesNotMatch(renderedText, /contentHash/);
  assert.doesNotMatch(renderedText, /reportFirstTemplate/);
  assert.doesNotMatch(renderedText, /canonical_result_payload/);
  assert.doesNotMatch(renderedText, /report_first_canonical_payload_v1/);
  assert.doesNotMatch(renderedText, /persisted result payload/i);
  assert.doesNotMatch(renderedText, /template id/i);
  assert.doesNotMatch(renderedText, /content hash/i);
  assert.doesNotMatch(renderedText, /lookup key/i);
  assert.doesNotMatch(renderedText, /pattern_key/i);
  assert.doesNotMatch(renderedText, /draft-only/i);
  assert.doesNotMatch(renderedText, /PDF export CTA/);
});

test('report-first result renderer does not promise unavailable PDF export', () => {
  const markup = renderToStaticMarkup(<ReportFirstResultReport payload={buildReportFirstPayload()} />);
  const renderedText = textFromMarkup(markup);

  assert.match(renderedText, /Save this report/);
  assert.match(renderedText, /Keep this report for reference/);
  assert.doesNotMatch(renderedText, /Download your Leadership Approach report as a PDF/);
  assert.doesNotMatch(renderedText, /Export your Leadership Approach report/);
});

test('report-first result renderer uses reader-facing navigation and card labels', () => {
  const markup = renderToStaticMarkup(<ReportFirstResultReport payload={buildReportFirstPayload()} />);
  const renderedText = textFromMarkup(markup);

  assert.match(markup, /sonartra-logo-white\.svg/);
  assert.match(renderedText, /Premium report/);
  assert.match(renderedText, /Full reference/);
  assert.match(renderedText, /Your ranked pattern/);
  assert.match(renderedText, /Process, Results, People, Vision/);
  assert.match(renderedText, /Report guide/);
  assert.match(renderedText, /light/i);
  assert.match(renderedText, /Focus/);
  assert.match(renderedText, /Now reading/);
  assert.match(renderedText, /Up next/);
  assert.match(renderedText, /People expansion/);
  assert.match(renderedText, /Vision expansion/);
  assert.doesNotMatch(renderedText, /RangeRange/);
  assert.match(renderedText, /Why this matters:/);
  assert.doesNotMatch(renderedText, /Why it matters:/);
  assert.doesNotMatch(renderedText, /Range to add:/);
});

test('report-first result renderer keeps tightening range label when source text is distinct', () => {
  const payload = structuredClone(buildReportFirstPayload()) as ReportFirstCanonicalPayloadV1;
  const tighteningChapter = payload.report.chapters?.find((chapter) => /tighten/i.test(chapter.title));
  const distinctBlock = tighteningChapter?.blocks.find((block) => block.type === 'tightening_card');

  assert.ok(distinctBlock);
  if (distinctBlock?.type === 'tightening_card') {
    distinctBlock.whyItMatters = 'People may feel motivated before they have enough route clarity.';
    distinctBlock.rangeToAdd = 'Define the roles, sequence, standards, and review rhythm.';
  }

  const markup = renderToStaticMarkup(<ReportFirstResultReport payload={payload} />);
  const tighteningSectionMarkup =
    markup.match(/data-report-first-section="tightening"[\s\S]*?data-report-first-section="rank-3-expansion"/)?.[0] ?? '';
  const tighteningText = textFromMarkup(tighteningSectionMarkup);

  assert.match(tighteningText, /Why this matters: People may feel motivated before they have enough route clarity\./);
  assert.match(tighteningText, /What to bring in: Define the roles, sequence, standards, and review rhythm\./);
});

test('report-first result renderer suppresses duplicated tightening-card support text', () => {
  const payload = structuredClone(buildReportFirstPayload()) as ReportFirstCanonicalPayloadV1;
  const tighteningChapter = payload.report.chapters?.find((chapter) => /tighten/i.test(chapter.title));
  const duplicateBlock = tighteningChapter?.blocks.find((block) => block.type === 'tightening_card');

  assert.ok(duplicateBlock);
  if (duplicateBlock?.type === 'tightening_card') {
    duplicateBlock.whyItMatters = 'Bring Process in before the mobilisation spreads.';
    duplicateBlock.rangeToAdd = 'Bring Process in before the mobilisation spreads.';
  }

  const markup = renderToStaticMarkup(<ReportFirstResultReport payload={payload} />);
  const tighteningSectionMarkup =
    markup.match(/data-report-first-section="tightening"[\s\S]*?data-report-first-section="rank-3-expansion"/)?.[0] ?? '';
  const tighteningText = textFromMarkup(tighteningSectionMarkup);

  assert.match(tighteningText, /Why this matters: Bring Process in before the mobilisation spreads\./);
  assert.doesNotMatch(tighteningText, /What to bring in: Bring Process in before the mobilisation spreads\./);
});

test('report-first renderer formats Chapter 10 development actions without duplicated metadata labels', () => {
  const markup = renderToStaticMarkup(<ReportFirstResultReport payload={buildReportFirstPayload()} />);
  const developmentSectionMarkup =
    markup.match(/data-report-first-section="development-focus"[\s\S]*?data-report-first-section="closing"/)?.[0] ?? '';
  const developmentText = textFromMarkup(developmentSectionMarkup);

  assert.match(developmentSectionMarkup, /data-report-first-card="development-action"/);
  assert.match(developmentText, /Use this in project planning, process changes, delegation, team meetings, change delivery\./);
  assert.doesNotMatch(developmentText, /Why this matters:\s*Use this in/i);
  assert.doesNotMatch(developmentText, /Use this in:\s*Use this in/i);
  assert.doesNotMatch(developmentText, /\.\./);

  const actionCardCount = (developmentSectionMarkup.match(/data-report-first-card="development-action"/g) ?? []).length;
  const useThisInCount = (developmentText.match(/Use this in/g) ?? []).length;
  assert.equal(useThisInCount, actionCardCount);
});



test('report-first renderer uses custom payload labels in body navigation while keeping stable anchors', () => {
  const payload = structuredClone(buildReportFirstPayload()) as ReportFirstCanonicalPayloadV1;
  const chapterLabelOverrides: Array<[RegExp, string]> = [
    [/creates value/i, 'Decision value'],
    [/others experience/i, 'How others experience your judgement'],
    [/decision behaviour/i, 'Decision mechanics'],
    [/communication behaviour/i, 'Explaining the decision'],
    [/under pressure/i, 'Judgement under pressure'],
    [/strength of this pattern/i, 'Decision strengths'],
    [/can tighten/i, 'Decision tightening'],
    [/People expands/i, 'Wider perspective'],
    [/Vision expands/i, 'Decision range'],
    [/development focus/i, 'Development'],
  ];

  payload.report.chapters = (payload.report.chapters ?? []).map((chapter) => ({
    ...chapter,
    railLabel: chapterLabelOverrides.find(([pattern]) => pattern.test(chapter.title))?.[1] ?? chapter.railLabel,
  }));

  payload.report.readerNavigation = [
    ...(payload.report.readerNavigation ?? []).filter((item) => item.id !== 'key-insight' && item.id !== 'closing'),
    { id: 'key-insight', label: 'Key judgement' },
    { id: 'closing', label: 'Closing' },
  ];

  const markup = renderToStaticMarkup(<ReportFirstResultReport payload={payload} />);
  const renderedText = textFromMarkup(markup);

  for (const [, label] of chapterLabelOverrides) {
    assert.ok(renderedText.includes(label), `Expected custom label in rendered output: ${label}`);
  }
  assert.match(renderedText, /Key judgement/);
  assert.match(renderedText, /Closing/);
  assert.match(markup, /data-report-first-section="key-insight"/);
  assert.match(markup, /data-report-first-section="closing"/);
  assert.match(markup, /data-report-first-section="rank-3-expansion"/);
  assert.match(markup, /data-report-first-section="rank-4-expansion"/);
});
test('report-first renderer stays disconnected from template storage and scoring recomputation', () => {
  const componentSource = readFileSync(
    join(process.cwd(), 'components', 'results', 'report-first-result-report.tsx'),
    'utf8',
  );
  const routeSource = readFileSync(
    join(process.cwd(), 'app', '(user)', 'app', 'results', 'single-domain', '[resultId]', 'page.tsx'),
    'utf8',
  );

  assert.doesNotMatch(componentSource, /assessment_report_first_templates/i);
  assert.doesNotMatch(componentSource, /report-first-template-storage|report-first-result-assembly/);
  assert.doesNotMatch(componentSource, /option_signal_weights|assessment_ranked_patterns/);
  assert.doesNotMatch(routeSource, /assessment_report_first_templates/i);
  assert.match(routeSource, /detail\.resultKind === 'report_first'/);
  assert.match(routeSource, /ReportFirstResultReport/);
});
