import { AdminAssessmentLanguageEditor } from '@/components/admin/admin-assessment-language-editor';
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
          description="Manage the structured language datasets that will drive deterministic assessment outputs."
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
        description="Author the persisted report sections the engine resolves into the final result payload."
      />

      <SurfaceCard className="space-y-4 p-5 lg:p-6">
        <div className="flex flex-wrap items-center gap-2">
          <LabelPill>{viewModel.assessmentKey}</LabelPill>
          <LabelPill className="border-white/10 bg-white/[0.04] text-white/62">
            {getVersionSummary(viewModel)}
          </LabelPill>
        </div>
        <p className="max-w-3xl text-sm leading-7 text-white/62">
          Organize authored content in the same order the final report is read. Intro remains inline, while
          report language datasets now use one selector-driven import surface for Hero Header, Domain Chapters,
          Signals, and Pairs.
        </p>
      </SurfaceCard>

      <div className="space-y-6">
        <SectionHeader
          eyebrow="Intro"
          title="Intro"
          description="Opening context for the assessment shown before the report hero."
        />

        <div className="rounded-[1.25rem] border border-white/10 bg-gradient-to-b from-white/[0.02] to-transparent p-[1px]">
          <div className="rounded-[1.25rem] bg-black/30">
            <AdminAssessmentLanguageEditor
              assessmentVersionId={viewModel.activeVersion.assessmentVersionId}
              initialValue={viewModel.assessmentLanguageDescription}
              isEditableAssessmentVersion={viewModel.activeVersion.status === 'draft'}
            />
          </div>
        </div>
      </div>

      <div className="space-y-6">
        <SectionHeader
          eyebrow="Language Datasets"
          title="Language Datasets"
          description="Replace Hero Header, Domain Chapter, Signal, and Pair Summary language from one shared import surface."
        />

        <AdminLanguageDatasetImport
          assessmentVersionId={viewModel.activeVersion.assessmentVersionId}
          counts={viewModel.counts}
          isEditableAssessmentVersion={viewModel.activeVersion.status === 'draft'}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <MetaItem label="Intro" value={formatEntryCount(viewModel.counts.assessment.entryCount)} />
        <MetaItem label="Hero Header" value={formatEntryCount(viewModel.counts.heroHeaders.entryCount)} />
        <MetaItem label="Domain Chapters" value={formatEntryCount(viewModel.counts.domains.entryCount)} />
        <MetaItem label="Signals" value={formatEntryCount(viewModel.counts.signals.entryCount)} />
        <MetaItem label="Pairs" value={formatEntryCount(viewModel.counts.pairs.entryCount)} />
      </div>
    </section>
  );
}
