import test from 'node:test';
import assert from 'node:assert/strict';
import { renderToStaticMarkup } from 'react-dom/server';

import { SingleDomainResultsReport } from '@/components/results/single-domain-results-report';
import { buildSingleDomainComposerDiagnostics } from '@/lib/assessment-language/single-domain-composer-diagnostics';
import {
  composeSingleDomainReport,
  type ResultComposerPreviewInput,
} from '@/lib/assessment-language/single-domain-composer';
import { getSingleDomainImportHeaderColumns } from '@/lib/assessment-language/single-domain-import-headers';
import { parseSingleDomainImportInput } from '@/lib/assessment-language/single-domain-import-parsers';
import { SINGLE_DOMAIN_PREVIEW_FIXTURES } from '@/lib/assessment-language/single-domain-preview-fixtures';
import {
  buildSingleDomainImportValidationContext,
  validateSingleDomainImportRows,
} from '@/lib/assessment-language/single-domain-import-validators';
import { createSingleDomainResultsViewModel } from '@/lib/server/single-domain-results-view-model';
import type { SingleDomainNarrativeDatasetKey } from '@/lib/assessment-language/single-domain-narrative-types';
import type { SingleDomainResultPayload } from '@/lib/types/single-domain-result';

function serializeRows(
  datasetKey: SingleDomainNarrativeDatasetKey,
  input: ResultComposerPreviewInput,
): string {
  const columns = getSingleDomainImportHeaderColumns(datasetKey);
  const rows = (() => {
    switch (datasetKey) {
      case 'SINGLE_DOMAIN_INTRO':
        return [input.sections.intro];
      case 'SINGLE_DOMAIN_HERO':
        return [input.sections.hero];
      case 'SINGLE_DOMAIN_DRIVERS':
        return input.sections.drivers;
      case 'SINGLE_DOMAIN_PAIR':
        return [input.sections.pair];
      case 'SINGLE_DOMAIN_LIMITATION':
        return [input.sections.limitation];
      case 'SINGLE_DOMAIN_APPLICATION':
        return input.sections.application;
    }
  })();

  return [
    columns.join('|'),
    ...rows.map((row) =>
      columns.map((column) => String(row[column as keyof typeof row] ?? '')).join('|'),
    ),
  ].join('\n');
}

function buildPayload(): SingleDomainResultPayload {
  return {
    metadata: {
      assessmentKey: 'leadership',
      assessmentTitle: 'Leadership',
      version: '1.0.0',
      attemptId: 'attempt-qa',
      mode: 'single_domain',
      domainKey: 'leadership-style',
      generatedAt: '2026-04-21T14:14:00.000Z',
      completedAt: '2026-04-21T14:14:00.000Z',
    },
    intro: {
      section_title: 'Leadership style',
      intro_paragraph: 'This domain introduces how you lead.',
      meaning_paragraph: 'It explains the practical meaning of the pattern.',
      bridge_to_signals: 'The ranked signals show how the pattern is distributed.',
      blueprint_context_line: 'Use the six-section report to read the result.',
    },
    hero: {
      pair_key: 'directive_structured',
      hero_headline: 'Structured delivery with firm pace',
      hero_subheadline: 'Identity line.',
      hero_opening:
        'The defining pattern is a leadership style that moves quickly and organizes quickly.',
      hero_strength_paragraph:
        'The overall effect is disciplined execution with a strong bias toward visible progress.',
      hero_tension_paragraph:
        'Reflective range is materially underplayed, so pause and reconsideration arrive late.',
      hero_close_paragraph: 'The result is a clear execution pattern.',
    },
    signals: [
      {
        signal_key: 'directive',
        signal_label: 'Directive',
        rank: 1,
        normalized_score: 89,
        raw_score: 4,
        position: 'primary',
        position_label: 'Primary',
        chapter_intro: 'Directive intro',
        chapter_how_it_shows_up: 'Directive shows up',
        chapter_value_outcome: 'Directive outcome',
        chapter_value_team_effect: 'Directive team effect',
        chapter_risk_behaviour: 'Directive risk behaviour',
        chapter_risk_impact: 'Directive risk impact',
        chapter_development: 'Directive development',
      },
      {
        signal_key: 'structured',
        signal_label: 'Structured',
        rank: 2,
        normalized_score: 81,
        raw_score: 3,
        position: 'secondary',
        position_label: 'Secondary',
        chapter_intro: 'Structured intro',
        chapter_how_it_shows_up: 'Structured shows up',
        chapter_value_outcome: 'Structured outcome',
        chapter_value_team_effect: 'Structured team effect',
        chapter_risk_behaviour: 'Structured risk behaviour',
        chapter_risk_impact: 'Structured risk impact',
        chapter_development: 'Structured development',
      },
      {
        signal_key: 'supportive',
        signal_label: 'Supportive',
        rank: 3,
        normalized_score: 47,
        raw_score: 2,
        position: 'supporting',
        position_label: 'Supporting',
        chapter_intro: 'Supportive intro',
        chapter_how_it_shows_up: 'Supportive shows up',
        chapter_value_outcome: 'Supportive outcome',
        chapter_value_team_effect: 'Supportive team effect',
        chapter_risk_behaviour: 'Supportive risk behaviour',
        chapter_risk_impact: 'Supportive risk impact',
        chapter_development: 'Supportive development',
      },
      {
        signal_key: 'reflective',
        signal_label: 'Reflective',
        rank: 4,
        normalized_score: 24,
        raw_score: 1,
        position: 'underplayed',
        position_label: 'Underplayed',
        chapter_intro: 'Reflective intro',
        chapter_how_it_shows_up: 'Reflective shows up',
        chapter_value_outcome: 'Reflective outcome',
        chapter_value_team_effect: 'Reflective team effect',
        chapter_risk_behaviour: 'Reflective risk behaviour',
        chapter_risk_impact:
          'Reflective range is materially underplayed, so pause and reconsideration arrive late.',
        chapter_development:
          'Develop a deliberate pause before commitment so reflective range can influence the final decision.',
      },
    ],
    balancing: {
      pair_key: 'directive_structured',
      balancing_section_title: 'Compressed reconsideration',
      current_pattern_paragraph:
        'The same pace and order that drive execution can narrow the window for second-look judgment.',
      practical_meaning_paragraph:
        'When the pattern tightens, it becomes easier to move ahead than to reopen the frame.',
      system_risk_paragraph:
        'Because reflective range is thin, nuance, ambiguity, and alternative framing can be underweighted.',
      rebalance_intro: 'Reflective range needs deliberate recovery.',
      rebalance_actions: [
        'Make room for reconsideration.',
        'Pause before commitment.',
        'Reopen assumptions early.',
      ],
    },
    pairSummary: {
      pair_key: 'directive_structured',
      pair_section_title: 'Directive + Structured',
      pair_headline: 'Directive + Structured',
      pair_opening_paragraph:
        'Together these two tendencies create a style that decides early and then codifies the path.',
      pair_strength_paragraph:
        'The synergy is speed with usable order, which makes complex work easier to coordinate.',
      pair_tension_paragraph:
        'The tension is that once the path is set, the system can become harder to revisit.',
      pair_close_paragraph:
        'The combined pattern is highly effective when clarity and delivery matter more than exploratory drift.',
    },
    application: {
      strengths: [
        {
          signal_key: 'directive',
          signal_label: 'Directive',
          rank: 1,
          statement:
            'Rely on your ability to turn ambiguity into clear next steps when momentum matters.',
        },
      ],
      watchouts: [
        {
          signal_key: 'reflective',
          signal_label: 'Reflective',
          rank: 4,
          statement:
            'Notice when urgency is crowding out the quieter evidence that would improve the call.',
        },
      ],
      developmentFocus: [
        {
          signal_key: 'reflective',
          signal_label: 'Reflective',
          rank: 4,
          statement:
            'Develop a deliberate pause before commitment so reflective range can influence the final decision.',
        },
      ],
    },
    diagnostics: {
      readinessStatus: 'ready',
      scoringMethod: 'option_signal_weights_only',
      normalizationMethod: 'largest_remainder_integer_percentages',
      answeredQuestionCount: 24,
      totalQuestionCount: 24,
      signalCount: 4,
      derivedPairCount: 6,
      topPair: 'directive_structured',
      counts: {
        domainCount: 1,
        questionCount: 24,
        optionCount: 96,
        weightCount: 192,
      },
      warnings: [],
    },
  };
}

test('section-native single-domain fixtures round-trip through import parsing, validation, and locked composition', () => {
  const fixture = SINGLE_DOMAIN_PREVIEW_FIXTURES[0];
  assert.ok(fixture);

  const validationContext = buildSingleDomainImportValidationContext({
    datasetKey: 'SINGLE_DOMAIN_DRIVERS',
    currentDomainKey: fixture.input.domain_key,
    signalKeys: fixture.input.ranked_signals.map((signal) => signal.signal_key),
  });

  for (const datasetKey of [
    'SINGLE_DOMAIN_INTRO',
    'SINGLE_DOMAIN_HERO',
    'SINGLE_DOMAIN_DRIVERS',
    'SINGLE_DOMAIN_PAIR',
    'SINGLE_DOMAIN_LIMITATION',
    'SINGLE_DOMAIN_APPLICATION',
  ] as const) {
    const parsed = parseSingleDomainImportInput(
      datasetKey,
      serializeRows(datasetKey, fixture.input),
    );

    assert.equal(parsed.success, true, datasetKey);

    const validated = validateSingleDomainImportRows(
      {
        ...validationContext,
        datasetKey,
        targetSection: parsed.rows[0]?.section_key ?? validationContext.targetSection,
      },
      parsed.rows,
    );

    assert.equal(validated.success, true, datasetKey);
  }

  const report = composeSingleDomainReport(fixture.input);
  const diagnostics = buildSingleDomainComposerDiagnostics(fixture.input);

  assert.deepEqual(
    report.sections.map((section) => section.key),
    ['intro', 'hero', 'drivers', 'pair', 'limitation', 'application'],
  );
  assert.equal(diagnostics.hasBlockingIssues, false);
});

test('weaker-signal propagation remains visible from composed single-domain language into the rendered report contract', () => {
  const report = composeSingleDomainReport(SINGLE_DOMAIN_PREVIEW_FIXTURES[0]!.input);
  const markup = renderToStaticMarkup(
    <SingleDomainResultsReport result={createSingleDomainResultsViewModel(buildPayload())} />,
  );

  assert.match(
    report.sections
      .find((section) => section.key === 'drivers')
      ?.focusItems.find((item) => item.label === 'Range limitation')
      ?.content.join(' ') ?? '',
    /reflective range is materially underplayed/i,
  );
  assert.match(
    report.sections.find((section) => section.key === 'limitation')?.paragraphs.join(' ') ?? '',
    /reflective/i,
  );
  assert.match(
    report.sections
      .find((section) => section.key === 'application')
      ?.focusItems.find((item) => item.label === 'Develop')
      ?.content.join(' ') ?? '',
    /reflective range/i,
  );
  assert.match(markup, /href="#intro"/);
  assert.match(markup, /href="#hero"/);
  assert.match(markup, /href="#drivers"/);
  assert.match(markup, /href="#pair"/);
  assert.match(markup, /href="#limitation"/);
  assert.match(markup, /href="#application"/);
});
