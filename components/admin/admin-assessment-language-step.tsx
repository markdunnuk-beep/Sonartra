import {
  EmptyState,
  LabelPill,
  MetaItem,
  SectionHeader,
  SurfaceCard,
} from '@/components/shared/user-app-ui';
import { AdminPairLanguageImport } from '@/components/admin/admin-pair-language-import';
import { AdminSignalLanguageImport } from '@/components/admin/admin-signal-language-import';
import type { AdminAssessmentLanguageStepViewModel } from '@/lib/server/admin-assessment-language-step';

const PLACEHOLDER_SECTIONS = [
  {
    title: 'Domain Language',
    hint: 'domain_key | section | content',
    description: 'Structured bulk import for domain-level narrative sections will follow this panel pattern.',
  },
  {
    title: 'Development / Pressure / Environment',
    hint: 'key | section | content',
    description: 'Structured bulk import for development, pressure, and environment datasets will be added next.',
  },
  {
    title: 'Overview Templates',
    hint: 'pattern_key | section | content',
    description: 'Structured bulk import for overview template patterns will be added after signal language.',
  },
] as const;

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
        <p className="max-w-3xl text-sm leading-7 text-white/62">
          This builder step is reserved for structured assessment language datasets. Bulk import panels
          will be added here without shifting scoring or interpretation into the UI.
        </p>
      </SurfaceCard>

      <AdminSignalLanguageImport
        assessmentVersionId={viewModel.activeVersion.assessmentVersionId}
        existingSignalLanguageRowCount={viewModel.counts.signals.entryCount}
        isEditableAssessmentVersion={viewModel.activeVersion.status === 'draft'}
      />

      <AdminPairLanguageImport
        assessmentVersionId={viewModel.activeVersion.assessmentVersionId}
        existingPairLanguageRowCount={viewModel.counts.pairs.entryCount}
        isEditableAssessmentVersion={viewModel.activeVersion.status === 'draft'}
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetaItem label="Signals" value={formatEntryCount(viewModel.counts.signals.entryCount)} />
        <MetaItem label="Pairs" value={formatEntryCount(viewModel.counts.pairs.entryCount)} />
        <MetaItem label="Domains" value={formatEntryCount(viewModel.counts.domains.entryCount)} />
        <MetaItem label="Overview" value={formatEntryCount(viewModel.counts.overview.entryCount)} />
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        {PLACEHOLDER_SECTIONS.map((section) => (
          <SurfaceCard className="space-y-3 p-5 lg:p-6" key={section.title}>
            <div className="space-y-2">
              <h3 className="text-xl font-semibold tracking-[-0.02em] text-white">{section.title}</h3>
              <p className="text-sm leading-7 text-white/62">{section.description}</p>
            </div>
            <div className="rounded-[1rem] border border-white/10 bg-black/20 px-4 py-3">
              <p className="text-[0.7rem] uppercase tracking-[0.18em] text-white/42">Input format</p>
              <p className="pt-1 text-sm text-white/78">{section.hint}</p>
            </div>
          </SurfaceCard>
        ))}
      </div>
    </section>
  );
}
