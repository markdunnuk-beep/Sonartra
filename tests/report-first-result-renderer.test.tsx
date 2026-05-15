import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';
import { renderToStaticMarkup } from 'react-dom/server';

import { ReportFirstResultReport } from '@/components/results/report-first-result-report';
import type { ReportFirstCanonicalPayloadV1 } from '@/lib/types/report-first-result';

function buildReportFirstPayload(): ReportFirstCanonicalPayloadV1 {
  const rankedSignals = [
    {
      rank: 1,
      signalKey: 'process',
      signalLabel: 'Process',
      roleLabel: 'Lead signal',
      roleSummary: 'Creates structure.',
    },
    {
      rank: 2,
      signalKey: 'results',
      signalLabel: 'Results',
      roleLabel: 'Strengthening signal',
      roleSummary: 'Creates movement.',
    },
    {
      rank: 3,
      signalKey: 'people',
      signalLabel: 'People',
      roleLabel: 'Range signal',
      roleSummary: 'Creates ownership.',
    },
    {
      rank: 4,
      signalKey: 'vision',
      signalLabel: 'Vision',
      roleLabel: 'Further range',
      roleSummary: 'Creates direction.',
    },
  ] as const;
  const normalizedScores = [
    { signalKey: 'process', signalLabel: 'Process', normalizedPercent: 42, rawScore: 10 },
    { signalKey: 'results', signalLabel: 'Results', normalizedPercent: 33, rawScore: 8 },
    { signalKey: 'people', signalLabel: 'People', normalizedPercent: 17, rawScore: 4 },
    { signalKey: 'vision', signalLabel: 'Vision', normalizedPercent: 8, rawScore: 2 },
  ] as const;

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
    report: {
      reportKey: 'leadership_process_results_people_vision',
      patternKey: 'process_results_people_vision',
      reportTitle: 'Leadership Approach - Process, Results, People, Vision',
      hero: {
        title: 'You lead by turning complexity into structured progress',
        resultStatement: 'You create confidence by giving work a clearer way forward.',
      },
      opening: [
        {
          type: 'paragraph',
          text: 'Your leadership is at its best when uncertainty needs to become organised and accountable.',
        },
        {
          type: 'list',
          items: ['Creates sequence', 'Clarifies ownership'],
        },
      ],
      keyInsight: {
        type: 'pull_quote',
        text: 'The development edge is to make sure the path becomes shared before people move through it.',
      },
      chapters: [
        {
          chapterKey: 'value_creation',
          chapterNumber: 1,
          title: 'How your leadership creates value',
          railLabel: 'Value',
          readerFacing: true,
          blocks: [
            { type: 'paragraph', text: 'Your leadership creates value by making progress repeatable.' },
            {
              type: 'table',
              columns: [
                { key: 'signal', label: 'Signal' },
                { key: 'meaning', label: 'Meaning' },
              ],
              rows: [
                [
                  { columnKey: 'signal', value: 'Process' },
                  { columnKey: 'meaning', value: 'Creates a reliable route.' },
                ],
              ],
            },
          ],
        },
        {
          chapterKey: 'strengths',
          chapterNumber: 6,
          title: 'The strength of this pattern',
          railLabel: 'Strengths',
          readerFacing: true,
          blocks: [
            {
              type: 'strength_card',
              title: 'Repeatable progress',
              text: 'You help teams move from loose intention into a clearer structure.',
              linkedSignals: ['process', 'results'],
            },
          ],
        },
        {
          chapterKey: 'tightening',
          chapterNumber: 7,
          title: 'Where the pattern can tighten',
          railLabel: 'Tightening',
          readerFacing: true,
          blocks: [
            {
              type: 'tightening_card',
              title: 'Organised before owned',
              text: 'The plan may become clear before shared ownership has formed.',
              whyItMatters: 'Work is easier to sustain when people help shape it.',
              rangeToAdd: 'Bring People in before closure.',
              linkedSignals: ['people'],
            },
          ],
        },
        {
          chapterKey: 'development_focus',
          chapterNumber: 10,
          title: 'Development focus',
          railLabel: 'Development',
          readerFacing: true,
          blocks: [
            {
              type: 'development_action',
              title: 'Invite ownership before closure',
              text: 'Before finalising a route, identify who needs to shape it.',
              useCases: ['project planning', 'team meetings'],
              whyItMatters: 'Ownership affects execution.',
              linkedSignals: ['people'],
            },
            {
              type: 'prompt_group',
              title: 'Decision questions',
              prompts: [
                'Who needs to shape this before it lands?',
                'What longer-term direction does this decision support?',
              ],
            },
          ],
        },
      ],
      closing: {
        synthesis: [
          { type: 'paragraph', text: 'Your growth is to let more range into the leadership you already bring.' },
        ],
        finalLine: 'Turn complexity into progress people can own.',
      },
    },
    reportFirst: {
      templateId: 'template-1',
      reportKey: 'leadership_process_results_people_vision',
      patternKey: 'process_results_people_vision',
      contentHash: 'hash-1',
      contractName: 'report_first_canonical_payload_v1',
      template: { reportKey: 'leadership_process_results_people_vision' },
    },
    evidence: {
      title: 'Evidence behind your result',
      rankedSignalEvidence: rankedSignals,
      scoreRows: normalizedScores,
      scoreShapeBadge: {
        label: 'paired',
        readerFacing: false,
      },
      explanatoryNote: 'These scores provide evidence for the ranked pattern; the report explains the pattern in practice.',
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
        reportKey: 'leadership_process_results_people_vision',
        contentHash: 'hash-1',
        reportContract: 'report_first_canonical_payload_v1',
      },
      sourceReportKey: 'leadership_process_results_people_vision',
      sourceAssessmentVersionId: 'version-report-first',
      sourceContentHash: 'hash-1',
      adminNotesExcluded: true,
      warningList: [],
      generatedFrom: 'compiled_report_first_template',
      counts: { domainCount: 1, questionCount: 24, optionCount: 96, weightCount: 96 },
      warnings: [],
    },
  };
}

test('report-first result renderer displays persisted report and evidence structure', () => {
  const markup = renderToStaticMarkup(<ReportFirstResultReport payload={buildReportFirstPayload()} />);

  assert.match(markup, /data-report-first-result="true"/);
  assert.match(markup, /You lead by turning complexity into structured progress/);
  assert.match(markup, /You create confidence by giving work a clearer way forward/);
  assert.match(markup, /Result basis/);
  assert.match(markup, /Process leads this pattern/);
  assert.match(markup, /Evidence behind your result/);
  assert.match(markup, /42%/);
  assert.match(markup, /33%/);
  assert.match(markup, /17%/);
  assert.match(markup, /8%/);
  assert.match(markup, /How your leadership creates value/);
  assert.match(markup, /The strength of this pattern/);
  assert.match(markup, /Where the pattern can tighten/);
  assert.match(markup, /Development focus/);
  assert.match(markup, /Closing synthesis/);
});

test('report-first result renderer preserves structured block types', () => {
  const markup = renderToStaticMarkup(<ReportFirstResultReport payload={buildReportFirstPayload()} />);

  assert.match(markup, /data-report-first-table-block="true"/);
  assert.match(markup, /<th[^>]*>Signal<\/th>/);
  assert.match(markup, /Creates a reliable route/);
  assert.match(markup, /data-report-first-signal-stack="true"/);
  assert.match(markup, /data-report-first-card="strength"/);
  assert.match(markup, /Repeatable progress/);
  assert.match(markup, /data-report-first-card="tightening"/);
  assert.match(markup, /Range to add:/);
  assert.match(markup, /data-report-first-card="development-action"/);
  assert.match(markup, /Invite ownership before closure/);
  assert.match(markup, /data-report-first-prompt-group="true"/);
  assert.match(markup, /Decision questions/);
  assert.ok(
    markup.indexOf('Invite ownership before closure') < markup.indexOf('Decision questions'),
    'mixed chapter blocks should preserve persisted order',
  );
});

test('report-first result renderer hides internal diagnostics and raw identifiers from reader output', () => {
  const markup = renderToStaticMarkup(<ReportFirstResultReport payload={buildReportFirstPayload()} />);

  assert.doesNotMatch(markup, /process_results_people_vision/);
  assert.doesNotMatch(markup, /template-1/);
  assert.doesNotMatch(markup, /hash-1/);
  assert.doesNotMatch(markup, /contentHash/);
  assert.doesNotMatch(markup, /reportFirstTemplate/);
  assert.doesNotMatch(markup, /canonical_result_payload/);
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
