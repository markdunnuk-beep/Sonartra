import { AdminAssessmentLanguageEditor } from '@/components/admin/admin-assessment-language-editor';
import { AdminReportLanguageImport } from '@/components/admin/admin-report-language-import';
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
          Organize authored content in the same order the final report is read: Intro, Hero, Domain Chapters,
          Signals, and Pairs. Derived report fields stay engine-owned and are not editable here.
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
          eyebrow="Hero"
          title="Hero"
          description="Opening synthesis at the start of the report. Primary pattern and domain highlights remain engine-derived."
        />

        <AdminReportLanguageImport
          assessmentVersionId={viewModel.activeVersion.assessmentVersionId}
          existingRowCount={viewModel.counts.overview.entryCount}
          isEditableAssessmentVersion={viewModel.activeVersion.status === 'draft'}
          reportSection="hero"
          eyebrow="Hero"
          title="Hero Language"
          description="Author the Hero headline and narrative using report-oriented rows."
          detail="This writes to the current overview-backed storage model through the report-aligned compatibility layer."
          derivedNote="Do not author hero.primaryPattern or hero.domainHighlights here. Those are derived by the engine from ranking and signal summaries."
          currentRowsLabel="Current Hero rows"
          textareaLabel="Paste hero rows"
          placeholder="hero|driver_analyst|headline|Fast, structured, decisive."
          importButtonLabel="Import hero language"
          formatExample={[
            'section | target | field | content',
            '',
            'hero | driver_analyst | headline | Fast, structured, decisive.',
            'hero | driver_analyst | narrative | You combine pace with analysis and tend to move quickly toward a considered conclusion.',
          ].join('\n')}
        />
      </div>

      <div className="space-y-6">
        <SectionHeader
          eyebrow="Domain Chapters"
          title="Domain Chapters"
          description="Author chapter-level guidance within each domain section. Domain summary remains an optional override on top of engine interpretation."
        />

        <AdminReportLanguageImport
          assessmentVersionId={viewModel.activeVersion.assessmentVersionId}
          existingRowCount={viewModel.counts.domains.entryCount}
          isEditableAssessmentVersion={viewModel.activeVersion.status === 'draft'}
          reportSection="domain"
          eyebrow="Domain Chapters"
          title="Domain Chapter Language"
          description="Author summary override, focus, pressure, and environment rows for report domains."
          detail="Signal ordering, primary and secondary signal selection, and pair selection remain engine-resolved."
          derivedNote="Use summary only when you want to override the deterministic chapter opener. The rest of the domain chapter still combines authored and derived content."
          currentRowsLabel="Current Domain rows"
          textareaLabel="Paste domain chapter rows"
          placeholder="domain|signal_style|focus|Your strongest contribution in this area is how you bring direction and consistency."
          importButtonLabel="Import domain chapter language"
          formatExample={[
            'section | target | field | content',
            '',
            'domain | signal_style | summary | You tend to operate with visible pace, structure, and interpersonal impact.',
            'domain | signal_style | focus | Your strongest contribution in this area is how you bring direction and consistency.',
            'domain | signal_style | pressure | Under pressure, you may narrow your attention or become more forceful in your style.',
            'domain | signal_style | environment | You perform best where expectations, pace, and collaboration are clear.',
          ].join('\n')}
        />
      </div>

      <div className="space-y-6">
        <SectionHeader
          eyebrow="Signals"
          title="Signals"
          description="Signal-level language building blocks reused across the report, including Hero highlights and action blocks."
        />

        <AdminReportLanguageImport
          assessmentVersionId={viewModel.activeVersion.assessmentVersionId}
          existingRowCount={viewModel.counts.signals.entryCount}
          isEditableAssessmentVersion={viewModel.activeVersion.status === 'draft'}
          reportSection="signal"
          eyebrow="Signals"
          title="Signal Language"
          description="Author summary, strength, watchout, and development language by signal."
          detail="These are reusable report building blocks. The engine decides where each signal sentence appears."
          derivedNote="Actions are not authored directly for MVP. Strengths, watchouts, and development focus remain engine-derived from signal ranking and signal-owned language."
          currentRowsLabel="Current Signal rows"
          textareaLabel="Paste signal rows"
          placeholder="signal|style_driver|summary|You tend to move quickly and take initiative."
          importButtonLabel="Import signal language"
          formatExample={[
            'section | target | field | content',
            '',
            'signal | style_driver | summary | You tend to move quickly and take initiative.',
            'signal | style_driver | strength | You bring momentum and energy to delivery.',
            'signal | style_driver | watchout | You may move ahead before others are ready.',
            'signal | style_driver | development | Pause slightly longer before committing to direction.',
          ].join('\n')}
        />
      </div>

      <div className="space-y-6">
        <SectionHeader
          eyebrow="Pairs"
          title="Pairs"
          description="Summary language for the top two signals within a domain chapter."
        />

        <AdminReportLanguageImport
          assessmentVersionId={viewModel.activeVersion.assessmentVersionId}
          existingRowCount={viewModel.counts.pairs.entryCount}
          isEditableAssessmentVersion={viewModel.activeVersion.status === 'draft'}
          reportSection="pair"
          eyebrow="Pairs"
          title="Pair Summary Language"
          description="Author pair summaries only. Pair strength and watchout are legacy-only and are not surfaced here."
          detail="Pair keys remain canonicalized under the hood so report-shaped inputs still round-trip into the current storage model safely."
          currentRowsLabel="Current Pair rows"
          textareaLabel="Paste pair summary rows"
          placeholder="pair|driver_analyst|summary|You combine forward momentum with structured thinking."
          importButtonLabel="Import pair summary language"
          formatExample={[
            'section | target | field | content',
            '',
            'pair | driver_analyst | summary | You combine forward momentum with structured thinking.',
          ].join('\n')}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <MetaItem label="Intro" value={formatEntryCount(viewModel.counts.assessment.entryCount)} />
        <MetaItem label="Hero" value={formatEntryCount(viewModel.counts.overview.entryCount)} />
        <MetaItem label="Domain Chapters" value={formatEntryCount(viewModel.counts.domains.entryCount)} />
        <MetaItem label="Signals" value={formatEntryCount(viewModel.counts.signals.entryCount)} />
        <MetaItem label="Pairs" value={formatEntryCount(viewModel.counts.pairs.entryCount)} />
      </div>
    </section>
  );
}
