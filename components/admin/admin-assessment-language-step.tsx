'use client';

import { useState } from 'react';

import { AdminLanguageDatasetImport } from '@/components/admin/admin-language-dataset-import';
import { AdminHeroDatasetImport } from '@/components/admin/admin-hero-dataset-import';
import {
  EmptyState,
  LabelPill,
  MetaItem,
  SectionHeader,
  SurfaceCard,
  cn,
} from '@/components/shared/user-app-ui';
import type { AdminAssessmentLanguageStepViewModel } from '@/lib/server/admin-assessment-language-step';

type DomainChapterTab = 'domain' | 'signal' | 'pair';
type ApplicationPlanTab =
  | 'applicationThesis'
  | 'applicationContribution'
  | 'applicationRisk'
  | 'applicationDevelopment'
  | 'applicationActionPrompts';

const DOMAIN_CHAPTER_TABS: readonly {
  key: DomainChapterTab;
  label: string;
  title: string;
}[] = [
  {
    key: 'domain',
    label: 'Domain Chapter',
    title: 'Domain Chapter Language',
  },
  {
    key: 'signal',
    label: 'Signal Chapter',
    title: 'Signal Chapter Language',
  },
  {
    key: 'pair',
    label: 'Signal Pair',
    title: 'Signal Pair Chapter Language',
  },
] as const;

const APPLICATION_PLAN_TABS: readonly {
  key: ApplicationPlanTab;
  label: string;
  title: string;
  description: string;
}[] = [
  {
    key: 'applicationThesis',
    label: 'Thesis',
    title: 'Application Thesis',
    description: 'Opening bridge into the final application chapter.',
  },
  {
    key: 'applicationContribution',
    label: 'Contribution',
    title: 'Contribution Language',
    description: 'How the person creates value at their best.',
  },
  {
    key: 'applicationRisk',
    label: 'Risk',
    title: 'Risk Language',
    description: 'Where strengths can become limiting patterns.',
  },
  {
    key: 'applicationDevelopment',
    label: 'Development',
    title: 'Development Language',
    description: 'Where to build more range.',
  },
  {
    key: 'applicationActionPrompts',
    label: 'Action Prompts',
    title: 'Action Prompt Language',
    description: '30-day action guidance and feedback prompts.',
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
  const [activeDomainTab, setActiveDomainTab] = useState<DomainChapterTab>('domain');
  const [activeApplicationTab, setActiveApplicationTab] = useState<ApplicationPlanTab>('applicationThesis');

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

      <div className="space-y-6">
        <SectionHeader
          eyebrow="Domain Chapters"
          title="Domain Chapters"
          description="Manage the chapter-owned language used throughout the domain reading in the same order it appears on the results page."
        />

        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-3">
            {DOMAIN_CHAPTER_TABS.map((tab) => {
              const isSelected = tab.key === activeDomainTab;
              return (
                <button
                  aria-pressed={isSelected}
                  className={cn(
                    'sonartra-focus-ring rounded-[1rem] border px-4 py-4 text-left transition',
                    isSelected
                      ? 'border-[rgba(142,162,255,0.36)] bg-[rgba(142,162,255,0.08)]'
                      : 'border-white/8 bg-black/10 hover:border-white/14',
                  )}
                  key={tab.key}
                  onClick={() => setActiveDomainTab(tab.key)}
                  type="button"
                >
                  <p className="text-sm font-semibold text-white">{tab.label}</p>
                  <p className="mt-2 text-sm leading-6 text-white/54">{tab.title}</p>
                </button>
              );
            })}
          </div>

          <AdminLanguageDatasetImport
            dataset={
              activeDomainTab === 'domain'
                ? 'domain'
                : activeDomainTab === 'signal'
                  ? 'signal'
                  : 'pair'
            }
            assessmentVersionId={viewModel.activeVersion.assessmentVersionId}
            counts={viewModel.counts}
            isEditableAssessmentVersion={viewModel.activeVersion.status === 'draft'}
            sectionEyebrow="Domain Chapters"
            sectionTitle={
              activeDomainTab === 'domain'
                ? 'Domain Chapter Language'
                : activeDomainTab === 'signal'
                  ? 'Signal Chapter Language'
                  : 'Signal Pair Chapter Language'
            }
            sectionDescription={
              activeDomainTab === 'domain'
                ? 'Replace the chapterOpening copy for each domain chapter from its own dedicated import surface.'
                : activeDomainTab === 'signal'
                  ? 'Replace the persisted primary and secondary signal summaries from their own dedicated import surface.'
                  : 'Replace the pair summary, pressure, and environment language from their own dedicated import surface.'
            }
          />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
        <MetaItem label="Domain Chapters" value={formatEntryCount(viewModel.counts.domains.entryCount)} />
        <MetaItem label="Signals" value={formatEntryCount(viewModel.counts.signals.entryCount)} />
        <MetaItem label="Pairs" value={formatEntryCount(viewModel.counts.pairs.entryCount)} />
        <MetaItem label="Pair Traits" value={formatEntryCount(viewModel.counts.pairTraitWeights.entryCount)} />
        <MetaItem label="Hero Rules" value={formatEntryCount(viewModel.counts.heroPatternRules.entryCount)} />
        <MetaItem label="Hero Language" value={formatEntryCount(viewModel.counts.heroPatternLanguage.entryCount)} />
      </div>

      <div className="space-y-6">
        <SectionHeader
          eyebrow="Stage 9"
          title="Application Plan"
          description="Import the version-scoped datasets that power the canonical application chapter without introducing UI-side logic."
        />

        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
            {APPLICATION_PLAN_TABS.map((tab) => {
              const isSelected = tab.key === activeApplicationTab;
              return (
                <button
                  aria-pressed={isSelected}
                  className={cn(
                    'sonartra-focus-ring rounded-[1rem] border px-4 py-4 text-left transition',
                    isSelected
                      ? 'border-[rgba(142,162,255,0.36)] bg-[rgba(142,162,255,0.08)]'
                      : 'border-white/8 bg-black/10 hover:border-white/14',
                  )}
                  key={tab.key}
                  onClick={() => setActiveApplicationTab(tab.key)}
                  type="button"
                >
                  <p className="text-sm font-semibold text-white">{tab.label}</p>
                  <p className="mt-2 text-sm leading-6 text-white/54">{tab.title}</p>
                </button>
              );
            })}
          </div>

          <AdminLanguageDatasetImport
            dataset={activeApplicationTab}
            assessmentVersionId={viewModel.activeVersion.assessmentVersionId}
            counts={viewModel.counts}
            isEditableAssessmentVersion={viewModel.activeVersion.status === 'draft'}
            sectionEyebrow="Stage 9"
            sectionTitle={APPLICATION_PLAN_TABS.find((tab) => tab.key === activeApplicationTab)?.title}
            sectionDescription={APPLICATION_PLAN_TABS.find((tab) => tab.key === activeApplicationTab)?.description}
          />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <MetaItem label="Application Thesis" value={formatEntryCount(viewModel.counts.applicationThesis.entryCount)} />
        <MetaItem label="Contribution" value={formatEntryCount(viewModel.counts.applicationContribution.entryCount)} />
        <MetaItem label="Risk" value={formatEntryCount(viewModel.counts.applicationRisk.entryCount)} />
        <MetaItem label="Development" value={formatEntryCount(viewModel.counts.applicationDevelopment.entryCount)} />
        <MetaItem label="Action Prompts" value={formatEntryCount(viewModel.counts.applicationActionPrompts.entryCount)} />
      </div>
    </section>
  );
}
