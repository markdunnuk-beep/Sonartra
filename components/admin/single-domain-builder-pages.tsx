'use client';

import { useAdminAssessmentAuthoring } from '@/components/admin/admin-assessment-authoring-context';
import { SingleDomainLanguageImport } from '@/components/admin/single-domain-language-import';
import { SingleDomainBuilderStage } from '@/components/admin/single-domain-builder-stage';
import { ButtonLink, CardTitle, LabelPill, SecondaryText, SurfaceCard } from '@/components/shared/user-app-ui';
import {
  SingleDomainDomainAuthoring,
  SingleDomainQuestionsAuthoring,
  SingleDomainResponsesAuthoring,
  SingleDomainReviewAuthoring,
  SingleDomainSignalsAuthoring,
  SingleDomainWeightingsAuthoring,
} from '@/components/admin/single-domain-structural-authoring';
import { getAssessmentBuilderStepPath } from '@/lib/admin/assessment-builder-paths';
import {
  getSingleDomainBuilderNextAction,
  getSingleDomainBuilderProgress,
} from '@/lib/admin/single-domain-builder-stepper';

function getSingleDomainLanguageStageSummary(
  validation: ReturnType<typeof useAdminAssessmentAuthoring>['singleDomainLanguageValidation'],
): { value: string; detail: string } {
  if (validation.overallReady) {
    return { value: 'Ready', detail: 'Current locked dataset completeness.' };
  }

  if (validation.datasets.every((dataset) => dataset.status === 'waiting')) {
    return { value: 'Waiting', detail: 'Earlier structure must exist before language can be assessed.' };
  }

  if (validation.datasets.some((dataset) => dataset.actualRowCount > 0)) {
    return { value: 'In progress', detail: 'Some locked datasets have authored rows, but the set is incomplete.' };
  }

  return { value: 'Not started', detail: 'Locked datasets have not been authored yet.' };
}

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
  const nextAction = getSingleDomainBuilderNextAction(assessment);
  const progress = getSingleDomainBuilderProgress(assessment);
  const hasMeaningfulDraftData =
    domainCount > 0 ||
    signalCount > 0 ||
    assessment.authoredQuestions.length > 0 ||
    assessment.weightingSummary.totalOptions > 0 ||
    assessment.weightingSummary.totalMappings > 0 ||
    assessment.singleDomainLanguageValidation.datasets.some((dataset) => dataset.actualRowCount > 0);
  const nextActionHref = getAssessmentBuilderStepPath(
    assessment.assessmentKey,
    nextAction.step,
    assessment.mode,
  );
  const draftStateLabel = assessment.draftValidation.isPublishReady
    ? 'Ready'
    : hasMeaningfulDraftData
      ? 'In progress'
      : 'Not started';

  return (
    <section className="space-y-8">
      <div className="space-y-2">
        <p className="sonartra-page-eyebrow">Overview</p>
        <h2 className="sonartra-section-title">Builder overview</h2>
        <p className="sonartra-section-description">
          Confirm the assessment identity, current draft state, and the one-domain constraint
          before you move into authoring.
        </p>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
        <SurfaceCard accent className="space-y-4 p-5 lg:p-6">
          <div className="flex flex-wrap items-center gap-2">
            <LabelPill>{assessment.assessmentKey}</LabelPill>
            <LabelPill className="border-[rgba(126,179,255,0.22)] bg-[rgba(126,179,255,0.1)] text-[rgba(214,232,255,0.84)]">
              {assessment.modeLabel}
            </LabelPill>
            <LabelPill className="border-white/10 bg-white/[0.04] text-white/68">
              {assessment.latestDraftVersion
                ? `Draft ${assessment.latestDraftVersion.versionTag}`
                : assessment.publishedVersion
                  ? `Published ${assessment.publishedVersion.versionTag}`
                  : 'Draft context pending'}
            </LabelPill>
          </div>
          <div className="space-y-2">
            <CardTitle>What this builder is for</CardTitle>
            <SecondaryText>
              This authoring path keeps the assessment inside a single scored domain while still
              carrying the full draft workflow for signals, questions, responses, weightings,
              language datasets, review, and publish.
            </SecondaryText>
            <SecondaryText>
              Admins can open every stage now. Readiness states follow authored data and
              prerequisites only, while the current route is highlighted separately.
            </SecondaryText>
          </div>
        </SurfaceCard>

        <SurfaceCard className="space-y-4 p-5 lg:p-6">
          <p className="sonartra-page-eyebrow">Next step</p>
          <div className="space-y-2">
            <CardTitle>{nextAction.title}</CardTitle>
            <SecondaryText>{nextAction.description}</SecondaryText>
          </div>
          <div className="rounded-[1rem] border border-[rgba(126,179,255,0.16)] bg-[rgba(126,179,255,0.06)] p-4 text-sm leading-6 text-white/70">
            {progress.actionableCompleteCount === progress.actionableTotalCount
              ? 'The authored workflow is structurally complete. Use Review for a final verification pass.'
              : `The strongest next move here is ${nextAction.title.toLowerCase()}.`}
          </div>
          <div>
            <ButtonLink className="w-full justify-center sm:w-auto" href={nextActionHref} variant="primary">
              {nextAction.ctaLabel}
            </ButtonLink>
          </div>
        </SurfaceCard>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <SurfaceCard className="p-4">
          <p className="text-xs font-medium uppercase tracking-[0.24em] text-white/45">Assessment</p>
          <p className="mt-3 text-2xl font-semibold tracking-[-0.03em] text-white">{assessment.title}</p>
          <p className="mt-2 text-sm leading-6 text-white/56">
            {assessment.description?.trim() || 'No admin description added yet.'}
          </p>
        </SurfaceCard>
        <SurfaceCard className="p-4">
          <p className="text-xs font-medium uppercase tracking-[0.24em] text-white/45">Domain count</p>
          <p className="mt-3 text-2xl font-semibold tracking-[-0.03em] text-white">{domainCount}</p>
          <p className="mt-2 text-sm leading-6 text-white/56">Target is exactly one authored domain.</p>
        </SurfaceCard>
        <SurfaceCard className="p-4">
          <p className="text-xs font-medium uppercase tracking-[0.24em] text-white/45">Signals</p>
          <p className="mt-3 text-2xl font-semibold tracking-[-0.03em] text-white">{signalCount}</p>
          <p className="mt-2 text-sm leading-6 text-white/56">Signal count stays flexible once the domain exists.</p>
        </SurfaceCard>
        <SurfaceCard className="p-4">
          <p className="text-xs font-medium uppercase tracking-[0.24em] text-white/45">Draft state</p>
          <p className="mt-3 text-2xl font-semibold tracking-[-0.03em] text-white">{draftStateLabel}</p>
          <p className="mt-2 text-sm leading-6 text-white/56">
            {progress.actionableCompleteCount} of {progress.actionableTotalCount} authoring stages complete. Published version:{' '}
            {assessment.publishedVersion?.versionTag ?? 'None'}.
          </p>
        </SurfaceCard>
      </div>

      <SurfaceCard className="space-y-4 p-5 lg:p-6">
        <CardTitle>Builder guardrails</CardTitle>
        <ul className="space-y-2 text-sm leading-7 text-white/66">
          <li>This builder supports one domain only.</li>
          <li>Signal count is flexible; there is no fixed four-signal assumption.</li>
          <li>Questions, responses, weightings, and language remain first-class authoring stages.</li>
        </ul>
      </SurfaceCard>
    </section>
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
  const languageStageSummary = getSingleDomainLanguageStageSummary(assessment.singleDomainLanguageValidation);

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
          value: languageStageSummary.value,
          detail: languageStageSummary.detail,
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
        status: dataset.status === 'ready' ? 'ready' : 'attention',
        detail: dataset.status === 'waiting'
          ? dataset.detail
          : dataset.countRule === 'exact'
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
