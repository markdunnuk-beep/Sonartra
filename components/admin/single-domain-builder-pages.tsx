'use client';

import { useAdminAssessmentAuthoring } from '@/components/admin/admin-assessment-authoring-context';
import { SingleDomainLanguageImport } from '@/components/admin/single-domain-language-import';
import { SingleDomainBuilderStage } from '@/components/admin/single-domain-builder-stage';
import {
  SingleDomainDomainAuthoring,
  SingleDomainQuestionsAuthoring,
  SingleDomainResponsesAuthoring,
  SingleDomainReviewAuthoring,
  SingleDomainSignalsAuthoring,
  SingleDomainWeightingsAuthoring,
} from '@/components/admin/single-domain-structural-authoring';

export const singleDomainSignalsStepCopy = {
  intro:
    'Signal count stays open-ended here. Pair expectations, report balance, and future import checks will derive from the actual signals you author instead of any fixed four-signal template.',
  guardrails: [
    'Signal count is flexible; do not assume a fixed four-signal structure.',
    'Pair coverage derives from the signals you define.',
  ],
};

export const singleDomainReviewLabels = [
  { label: 'Overview' },
  { label: 'Domain' },
  { label: 'Signals' },
  { label: 'Questions' },
  { label: 'Responses' },
  { label: 'Weightings' },
  { label: 'Language' },
];

function useReadinessMetrics() {
  const assessment = useAdminAssessmentAuthoring();
  const domainCount = assessment.authoredDomains.length;
  const signalCount = assessment.availableSignals.length;
  const questionCount = assessment.authoredQuestions.length;
  const responseCount = assessment.weightingSummary.totalOptions;
  const mappingCount = assessment.weightingSummary.totalMappings;

  return {
    assessment,
    domainCount,
    signalCount,
    questionCount,
    responseCount,
    mappingCount,
  };
}

export function SingleDomainOverviewPageContent() {
  const { assessment, domainCount, signalCount } = useReadinessMetrics();

  return (
    <SingleDomainBuilderStage
      stepKey="overview"
      eyebrow="Overview"
      title="Overview"
      description="Assessment title, description, version context, and the single-domain builder contract."
      intro="This scaffold keeps the builder focused on one domain while preserving the rest of the assessment lifecycle: signals, questions, responses, weightings, language datasets, review, and publish."
      guardrails={[
        'This builder supports one domain only.',
        'Signal count is flexible; there is no fixed four-signal assumption.',
        'Questions, responses, weightings, and language remain first-class authoring stages.',
      ]}
      readiness={[
        { label: 'Domain count', value: String(domainCount), detail: 'Single-domain target.' },
        { label: 'Signal count', value: String(signalCount), detail: 'Flexible authored count.' },
        {
          label: 'Draft readiness',
          value: assessment.draftValidation.isPublishReady ? 'Ready' : 'In progress',
          detail: 'Current review state.',
        },
        {
          label: 'Published version',
          value: assessment.publishedVersion?.versionTag ?? 'None',
          detail: 'Live version reference.',
        },
      ]}
      nextIntent="Use the next steps to define one domain, then author the signals, questions, responses, mappings, and locked language families that will shape the finished report."
    />
  );
}

export function SingleDomainDomainPageContent() {
  return <SingleDomainDomainAuthoring />;
}

export function SingleDomainSignalsPageContent() {
  return <SingleDomainSignalsAuthoring />;
}

export function SingleDomainQuestionsPageContent() {
  return <SingleDomainQuestionsAuthoring />;
}

export function SingleDomainResponsesPageContent() {
  return <SingleDomainResponsesAuthoring />;
}

export function SingleDomainWeightingsPageContent() {
  return <SingleDomainWeightingsAuthoring />;
}

export function SingleDomainLanguagePageContent() {
  const { assessment, signalCount } = useReadinessMetrics();

  return (
    <SingleDomainBuilderStage
      stepKey="language"
      eyebrow="Language"
      title="Language"
      description="Reserve the single-domain language stage for the six locked dataset families."
      intro="This is a single-domain language stage inside the full builder, not a standalone language editor. It is reserved for the six locked dataset families: domain framing, hero pairs, signal chapters, balancing sections, pair summaries, and application statements."
      guardrails={[
        'Language remains one stage inside the full assessment builder.',
        'The six locked dataset families define the future single-domain language payload.',
        'Language authoring follows structure; it does not replace domain, signal, question, response, or weighting steps.',
      ]}
      readiness={[
        {
          label: 'Language status',
          value: assessment.singleDomainLanguageValidation.overallReady ? 'Ready' : 'In progress',
          detail: 'Current locked dataset completeness.',
        },
        { label: 'Signals available', value: String(signalCount), detail: 'Signal chapters depend on authored signals.' },
        { label: 'Dataset families', value: '6 locked', detail: 'Structured single-domain language datasets.' },
        {
          label: 'Expected pairs',
          value: String(assessment.singleDomainLanguageValidation.expectedPairCount),
          detail: 'Derived from the authored signal set.',
        },
      ]}
      checklist={assessment.singleDomainLanguageValidation.datasets.map((dataset) => ({
        label: dataset.label,
        status: dataset.isReady ? 'ready' : 'attention',
        detail: dataset.countRule === 'exact'
          ? `${dataset.actualRowCount}/${dataset.expectedRowCount} rows loaded.`
          : `${dataset.actualRowCount} row${dataset.actualRowCount === 1 ? '' : 's'} loaded; 1+ required.`,
      }))}
      nextIntent="Import each locked dataset through the strict schema contract only. Review readiness updates from the persisted row counts and the current authored signal set."
    >
      {assessment.latestDraftVersion ? (
        <SingleDomainLanguageImport
          assessmentVersionId={assessment.latestDraftVersion.assessmentVersionId}
          datasetValidation={assessment.singleDomainLanguageValidation.datasets}
          isEditableAssessmentVersion={assessment.latestDraftVersion.status === 'draft'}
        />
      ) : null}
    </SingleDomainBuilderStage>
  );
}

export function SingleDomainReviewPageContent() {
  return <SingleDomainReviewAuthoring />;
}
