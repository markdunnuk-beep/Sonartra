'use client';

import { useAdminAssessmentAuthoring } from '@/components/admin/admin-assessment-authoring-context';
import {
  ButtonLink,
  CardTitle,
  LabelPill,
  MetaItem,
  SecondaryText,
  SectionHeader,
  SurfaceCard,
} from '@/components/shared/user-app-ui';
import {
  getNextSingleDomainBuilderStep,
  getPreviousSingleDomainBuilderStep,
  type SingleDomainBuilderStepKey,
} from '@/lib/admin/single-domain-builder-steps';
import { getAssessmentBuilderStepPath } from '@/lib/admin/assessment-builder-paths';

type SingleDomainBuilderChecklistItem = {
  label: string;
  status: 'ready' | 'attention';
  detail: string;
};

type SingleDomainBuilderReadinessItem = {
  label: string;
  value: string;
  detail: string;
};

type SingleDomainBuilderStageProps = {
  stepKey: SingleDomainBuilderStepKey;
  eyebrow: string;
  title: string;
  description: string;
  intro: string;
  guardrails: readonly string[];
  readiness: readonly SingleDomainBuilderReadinessItem[];
  nextIntent: string;
  checklist?: readonly SingleDomainBuilderChecklistItem[];
  children?: React.ReactNode;
};

function StageChecklist({
  items,
}: Readonly<{
  items: readonly SingleDomainBuilderChecklistItem[];
}>) {
  return (
    <div className="grid gap-3 lg:grid-cols-2">
      {items.map((item) => (
        <SurfaceCard className="space-y-2 p-4" key={item.label}>
          <div className="flex items-center justify-between gap-3">
            <CardTitle className="text-base">{item.label}</CardTitle>
            <LabelPill
              className={
                item.status === 'ready'
                  ? 'border-[rgba(116,209,177,0.22)] bg-[rgba(116,209,177,0.1)] text-[rgba(214,246,233,0.86)]'
                  : 'border-[rgba(255,184,107,0.22)] bg-[rgba(255,184,107,0.11)] text-[rgba(255,227,187,0.9)]'
              }
            >
              {item.status === 'ready' ? 'Ready' : 'Attention'}
            </LabelPill>
          </div>
          <SecondaryText>{item.detail}</SecondaryText>
        </SurfaceCard>
      ))}
    </div>
  );
}

export function SingleDomainBuilderStage({
  stepKey,
  eyebrow,
  title,
  description,
  intro,
  guardrails,
  readiness,
  nextIntent,
  checklist,
  children,
}: Readonly<SingleDomainBuilderStageProps>) {
  const assessment = useAdminAssessmentAuthoring();
  const previousStep = getPreviousSingleDomainBuilderStep(stepKey);
  const nextStep = getNextSingleDomainBuilderStep(stepKey);

  return (
    <section className="space-y-8">
      <SectionHeader eyebrow={eyebrow} title={title} description={description} />

      <SurfaceCard accent className="space-y-4 p-5 lg:p-6">
        <div className="flex flex-wrap items-center gap-2">
          <LabelPill>{assessment.assessmentKey}</LabelPill>
          <LabelPill className="border-white/10 bg-white/[0.04] text-white/68">
            {assessment.modeLabel}
          </LabelPill>
          <LabelPill className="border-[rgba(126,179,255,0.22)] bg-[rgba(126,179,255,0.1)] text-[rgba(214,232,255,0.84)]">
            {assessment.latestDraftVersion
              ? `Draft ${assessment.latestDraftVersion.versionTag}`
              : assessment.publishedVersion
                ? `Published ${assessment.publishedVersion.versionTag}`
                : 'Draft context pending'}
          </LabelPill>
        </div>
        <div className="space-y-2">
          <CardTitle>{assessment.title}</CardTitle>
          <SecondaryText>{intro}</SecondaryText>
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          <MetaItem label="Assessment mode" value={assessment.modeLabel} />
          <MetaItem label="Version" value={assessment.latestDraftVersion?.versionTag ?? 'None'} />
          <MetaItem label="Builder status" value={assessment.builderMode === 'draft' ? 'Editable draft' : 'Reference'} />
        </div>
      </SurfaceCard>

      <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <SurfaceCard className="space-y-4 p-5 lg:p-6">
          <CardTitle>Step intent</CardTitle>
          <SecondaryText>{description}</SecondaryText>
          <SecondaryText>{nextIntent}</SecondaryText>
        </SurfaceCard>

        <SurfaceCard className="space-y-4 p-5 lg:p-6">
          <CardTitle>Builder guardrails</CardTitle>
          <ul className="space-y-2 text-sm leading-7 text-white/66">
            {guardrails.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </SurfaceCard>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {readiness.map((item) => (
          <MetaItem key={item.label} label={item.label} value={item.value} />
        ))}
      </div>

      {checklist?.length ? <StageChecklist items={checklist} /> : null}

      {children}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="text-sm leading-6 text-white/52">
          This builder supports one domain only. Signal count is flexible; pair coverage will be
          validated from the signals you define.
        </div>
        <div className="flex flex-wrap gap-3">
          {previousStep ? (
            <ButtonLink
              href={getAssessmentBuilderStepPath(assessment.assessmentKey, previousStep.slug, assessment.mode)}
            >
              Back
            </ButtonLink>
          ) : null}
          {nextStep ? (
            <ButtonLink
              href={getAssessmentBuilderStepPath(assessment.assessmentKey, nextStep.slug, assessment.mode)}
              variant="primary"
            >
              Next
            </ButtonLink>
          ) : null}
        </div>
      </div>
    </section>
  );
}
