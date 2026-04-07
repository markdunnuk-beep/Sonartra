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
          eyebrow="Assessment Introduction"
          title="Assessment Introduction"
          description="This step controls report-facing language only. Use the dedicated sections below to update the persisted copy each results layer reads from."
        />
      </div>

      <div className="space-y-6">
        <SectionHeader
          eyebrow="Hero Pattern Language"
          title="Hero Pattern Language"
          description="Replace the opening hero headline language from its own dedicated import surface."
        />

        <AdminLanguageDatasetImport
          assessmentVersionId={viewModel.activeVersion.assessmentVersionId}
          counts={viewModel.counts}
          isEditableAssessmentVersion={viewModel.activeVersion.status === 'draft'}
          datasetKeys={['heroHeader']}
          defaultDataset="heroHeader"
          sectionEyebrow="Hero Pattern Language"
          sectionTitle="Hero Pattern Language"
          sectionDescription="Replace the hero headline rows shown at the top of the results page from a dedicated, version-scoped import surface."
        />
      </div>

      <div className="space-y-6">
        <SectionHeader
          eyebrow="Domain Chapters"
          title="Domain Chapters"
          description="Manage the chapter-owned language used throughout the domain reading in the same order it appears on the results page."
        />

        <div className="grid gap-6 xl:grid-cols-3">
          <AdminLanguageDatasetImport
            assessmentVersionId={viewModel.activeVersion.assessmentVersionId}
            counts={viewModel.counts}
            isEditableAssessmentVersion={viewModel.activeVersion.status === 'draft'}
            datasetKeys={['domain']}
            defaultDataset="domain"
            sectionEyebrow="Domain Chapters"
            sectionTitle="Domain Chapter Language"
            sectionDescription="Replace the chapterOpening copy for each domain chapter from its own dedicated import surface."
          />

          <AdminLanguageDatasetImport
            assessmentVersionId={viewModel.activeVersion.assessmentVersionId}
            counts={viewModel.counts}
            isEditableAssessmentVersion={viewModel.activeVersion.status === 'draft'}
            datasetKeys={['signal']}
            defaultDataset="signal"
            sectionEyebrow="Domain Chapters"
            sectionTitle="Signal Chapter Language"
            sectionDescription="Replace the persisted primary and secondary signal summaries from their own dedicated import surface."
          />

          <AdminLanguageDatasetImport
            assessmentVersionId={viewModel.activeVersion.assessmentVersionId}
            counts={viewModel.counts}
            isEditableAssessmentVersion={viewModel.activeVersion.status === 'draft'}
            datasetKeys={['pair']}
            defaultDataset="pair"
            sectionEyebrow="Domain Chapters"
            sectionTitle="Signal Pair Chapter Language"
            sectionDescription="Replace the pair summary, pressure, and environment language from their own dedicated import surface."
          />
        </div>
      </div>

      <div className="space-y-6">
        <SectionHeader
          eyebrow="Legacy Import"
          title="Import report language"
          description="Legacy shared import surface retained temporarily while the new dedicated language sections bed in. Use the dedicated sections above as the primary authoring path."
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
