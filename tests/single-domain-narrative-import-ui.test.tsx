import test from 'node:test';
import assert from 'node:assert/strict';
import { renderToStaticMarkup } from 'react-dom/server';

import { AdminAssessmentAuthoringProvider } from '@/components/admin/admin-assessment-authoring-context';
import { SingleDomainNarrativeBuilder } from '@/components/admin/assessments/single-domain-narrative-builder';
import { buildSingleDomainLanguageValidation } from '@/lib/admin/single-domain-structural-validation';
import type { AdminAssessmentDetailViewModel } from '@/lib/server/admin-assessment-detail';
import type { SingleDomainLanguageBundle } from '@/lib/server/assessment-version-single-domain-language-types';

function createAssessment(
  languageBundle: SingleDomainLanguageBundle,
): AdminAssessmentDetailViewModel {
  const authoredDomains = [
    {
      domainId: 'domain-1',
      domainKey: 'leadership-style',
      label: 'Leadership style',
      description: null,
      orderIndex: 0,
      createdAt: '',
      updatedAt: '',
      signals: [
        {
          signalId: 'signal-1',
          signalKey: 'directive',
          label: 'Directive',
          description: null,
          orderIndex: 0,
          createdAt: '',
          updatedAt: '',
        },
        {
          signalId: 'signal-2',
          signalKey: 'supportive',
          label: 'Supportive',
          description: null,
          orderIndex: 1,
          createdAt: '',
          updatedAt: '',
        },
      ],
    },
  ] as const;

  return {
    assessmentId: 'assessment-1',
    assessmentKey: 'role-focus',
    mode: 'single_domain',
    modeLabel: 'Single-Domain',
    title: 'Role Focus',
    description: 'Single-domain builder test fixture',
    isActive: true,
    createdAt: '',
    updatedAt: '',
    versions: [],
    publishedVersion: null,
    latestDraftVersion: {
      assessmentVersionId: 'version-1',
      versionTag: '1.0.0',
      status: 'draft',
      publishedAt: null,
      questionCount: 0,
      createdAt: '',
      updatedAt: '',
    },
    builderMode: 'draft',
    authoredDomains,
    questionDomains: [],
    authoredQuestions: [],
    availableSignals: [
      {
        signalId: 'signal-1',
        signalKey: 'directive',
        signalLabel: 'Directive',
        signalDescription: null,
        signalOrderIndex: 0,
        domainId: 'domain-1',
        domainKey: 'leadership-style',
        domainLabel: 'Leadership style',
        domainOrderIndex: 0,
      },
      {
        signalId: 'signal-2',
        signalKey: 'supportive',
        signalLabel: 'Supportive',
        signalDescription: null,
        signalOrderIndex: 1,
        domainId: 'domain-1',
        domainKey: 'leadership-style',
        domainLabel: 'Leadership style',
        domainOrderIndex: 0,
      },
    ],
    weightingSummary: {
      totalOptions: 0,
      weightedOptions: 0,
      unmappedOptions: 0,
      totalMappings: 0,
    },
    draftValidation: {
      status: 'not_ready',
      isPublishReady: false,
      assessmentId: 'assessment-1',
      assessmentKey: 'role-focus',
      draftVersionId: 'version-1',
      draftVersionTag: '1.0.0',
      sections: [],
      blockingErrors: [],
      warnings: [],
      counts: {
        domainCount: 1,
        signalCount: 2,
        questionCount: 0,
        optionCount: 0,
        weightedOptionCount: 0,
        unmappedOptionCount: 0,
        weightMappingCount: 0,
        applicationThesisCount: 0,
        applicationContributionCount: 0,
        applicationRiskCount: 0,
        applicationDevelopmentCount: 0,
        applicationActionPromptsCount: 0,
      },
    },
    singleDomainDraftReadiness: null,
    stepCompletion: {
      assessmentIntro: 'incomplete',
      language: 'incomplete',
    },
    singleDomainLanguageBundle: languageBundle,
    singleDomainLanguageValidation: buildSingleDomainLanguageValidation({
      authoredDomains,
      languageBundle,
    }),
  };
}

test('single-domain narrative builder renders section-first import controls for all six sections', () => {
  const assessment = createAssessment({
    DOMAIN_FRAMING: [],
    HERO_PAIRS: [],
    SIGNAL_CHAPTERS: [],
    BALANCING_SECTIONS: [],
    PAIR_SUMMARIES: [],
    APPLICATION_STATEMENTS: [],
  });

  const markup = renderToStaticMarkup(
    <AdminAssessmentAuthoringProvider assessment={assessment}>
      <SingleDomainNarrativeBuilder />
    </AdminAssessmentAuthoringProvider>,
  );

  assert.match(markup, /Pipe-delimited section import/);
  assert.match(markup, /Import section rows/);
  assert.match(markup, /Imported rows/);
  assert.match(markup, /Latest validation result/);
  assert.match(markup, /Intro import contract/);
  assert.match(markup, /Hero import contract/);
  assert.match(markup, /Drivers import contract/);
  assert.match(markup, /Pair import contract/);
  assert.match(markup, /Limitation import contract/);
  assert.match(markup, /Application import contract/);
  assert.match(markup, /domain_key\|section_key\|domain_title\|domain_definition/);
  assert.match(markup, /domain_key\|section_key\|pair_key\|signal_key\|driver_role\|claim_type/);
  assert.match(markup, /domain_key\|section_key\|pattern_key\|pair_key\|focus_area\|guidance_type\|driver_role\|signal_key\|priority\|guidance_text\|linked_claim_type/);
  assert.match(markup, /Expected total: 144 rows/);
  assert.match(markup, /pattern_key plus driver_role/);
  assert.doesNotMatch(markup, /SINGLE_DOMAIN_INTRO/);
  assert.doesNotMatch(markup, /SINGLE_DOMAIN_HERO/);
  assert.doesNotMatch(markup, /SINGLE_DOMAIN_DRIVERS/);
  assert.doesNotMatch(markup, /SINGLE_DOMAIN_PAIR/);
  assert.doesNotMatch(markup, /SINGLE_DOMAIN_LIMITATION/);
  assert.doesNotMatch(markup, /SINGLE_DOMAIN_APPLICATION/);
  assert.doesNotMatch(markup, /Domain framing/);
  assert.doesNotMatch(markup, /Hero pairs/);
  assert.doesNotMatch(markup, /Balancing sections/);
});
