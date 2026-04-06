import { AdminHeroDatasetImport } from '@/components/admin/admin-hero-dataset-import';
import { AdminLanguageDatasetImport } from '@/components/admin/admin-language-dataset-import';
import {
  EmptyState,
  LabelPill,
  MetaItem,
  SectionHeader,
  SurfaceCard,
} from '@/components/shared/user-app-ui';
import type { AdminAssessmentLanguageStepViewModel } from '@/lib/server/admin-assessment-language-step';

function getVersionSummary(viewModel: AdminAssessmentLanguageStepViewModel): string {
  if (!viewModel.activeVersion) {
    return 'No draft or published version is currently available.';
  }

  return viewModel.activeVersion.status === 'draft'
    ? `Editing draft ${viewModel.activeVersion.versionTag}`
    : `Viewing published version ${viewModel.activeVersion.versionTag}`;
}

function formatEntryCount(count: number): string {
  return `${count} entr${count === 1 ? 'y' : 'ies'}`;
}

export function AdminAssessmentLanguageStep({
  viewModel,
}: Readonly<{
  viewModel: AdminAssessmentLanguageStepViewModel;
}>) {
  if (!viewModel.activeVersion) {
    return (
      <EmptyState
        title="No version context available"
        description="Create a draft or publish a version before adding structured language datasets."
      />
    );
  }

  if (viewModel.languageSchemaStatus === 'unavailable') {
    return (
      <section className="space-y-8">
        <SectionHeader
          eyebrow="Language"
          title="Language"
          description="Manage the report language used in the published results experience."
        />

        <SurfaceCard className="space-y-4 p-5 lg:p-6">
          <div className="flex flex-wrap items-center gap-2">
            <LabelPill>{viewModel.assessmentKey}</LabelPill>
            <LabelPill className="border-white/10 bg-white/[0.04] text-white/62">
              {getVersionSummary(viewModel)}
            </LabelPill>
          </div>
          <EmptyState
            title="Language datasets unavailable"
            description={
              viewModel.languageSchemaMessage ??
              'Language datasets are unavailable for this environment.'
            }
          />
        </SurfaceCard>
      </section>
    );
  }

  return (
    <section className="space-y-8">
      <SectionHeader
        eyebrow="Language"
        title="Language"
        description="Author the report language used in results."
      />

      <SurfaceCard className="space-y-4 p-5 lg:p-6">
        <div className="flex flex-wrap items-center gap-2">
          <LabelPill>{viewModel.assessmentKey}</LabelPill>
          <LabelPill className="border-white/10 bg-white/[0.04] text-white/62">
            {getVersionSummary(viewModel)}
          </LabelPill>
        </div>
        <p className="max-w-3xl text-sm leading-7 text-white/62">
          Use this step for report-facing copy only. The sections here shape the language participants see in their
          results.
        </p>
      </SurfaceCard>

      <div className="space-y-6">
        <SectionHeader
          eyebrow="Imports"
          title="Import report language"
          description="Replace hero header, domain chapter, signal, and pair language from one shared import surface."
        />

        <AdminLanguageDatasetImport
          assessmentVersionId={viewModel.activeVersion.assessmentVersionId}
          counts={viewModel.counts}
          isEditableAssessmentVersion={viewModel.activeVersion.status === 'draft'}
        />
      </div>

      <div className="space-y-6">
        <SectionHeader
          eyebrow="Hero Engine"
          title="Import Hero engine datasets"
          description="Replace the version-scoped pair traits, pattern rules, and pattern language used by the canonical Hero engine."
        />

        <AdminHeroDatasetImport
          assessmentVersionId={viewModel.activeVersion.assessmentVersionId}
          counts={{
            pairTraitWeights: viewModel.counts.pairTraitWeights,
            heroPatternRules: viewModel.counts.heroPatternRules,
            heroPatternLanguage: viewModel.counts.heroPatternLanguage,
          }}
          isEditableAssessmentVersion={viewModel.activeVersion.status === 'draft'}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-7">
        <MetaItem label="Hero Header" value={formatEntryCount(viewModel.counts.heroHeaders.entryCount)} />
        <MetaItem label="Domain Chapters" value={formatEntryCount(viewModel.counts.domains.entryCount)} />
        <MetaItem label="Signals" value={formatEntryCount(viewModel.counts.signals.entryCount)} />
        <MetaItem label="Pairs" value={formatEntryCount(viewModel.counts.pairs.entryCount)} />
        <MetaItem label="Pair Traits" value={formatEntryCount(viewModel.counts.pairTraitWeights.entryCount)} />
        <MetaItem label="Hero Rules" value={formatEntryCount(viewModel.counts.heroPatternRules.entryCount)} />
        <MetaItem label="Hero Language" value={formatEntryCount(viewModel.counts.heroPatternLanguage.entryCount)} />
      </div>
    </section>
  );
}
