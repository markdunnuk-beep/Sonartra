'use client';

import { useState } from 'react';

import { AdminHeroDatasetImport } from '@/components/admin/admin-hero-dataset-import';
import { AdminLanguageDatasetImport } from '@/components/admin/admin-language-dataset-import';
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
  description: string;
}[] = [
  {
    key: 'domain',
    label: 'Domain chapter',
    title: 'Domain chapter language',
    description: 'Opening language for each domain chapter.',
  },
  {
    key: 'signal',
    label: 'Signal chapter',
    title: 'Signal chapter language',
    description: 'Primary and secondary signal summaries used in the report.',
  },
  {
    key: 'pair',
    label: 'Signal pair',
    title: 'Signal pair chapter language',
    description: 'Pair summary, pressure, and environment language.',
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
    title: 'Application thesis',
    description: 'Opening bridge into the final application chapter.',
  },
  {
    key: 'applicationContribution',
    label: 'Contribution',
    title: 'Contribution language',
    description: 'How the person creates value at their best.',
  },
  {
    key: 'applicationRisk',
    label: 'Risk',
    title: 'Risk language',
    description: 'Where strengths can become limiting patterns.',
  },
  {
    key: 'applicationDevelopment',
    label: 'Development',
    title: 'Development language',
    description: 'Where to build more range.',
  },
  {
    key: 'applicationActionPrompts',
    label: 'Action prompts',
    title: 'Action prompt language',
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

function ModuleShell({
  title,
  description,
  statusItems,
  children,
}: Readonly<{
  title: string;
  description: string;
  statusItems: readonly { label: string; value: string }[];
  children: React.ReactNode;
}>) {
  return (
    <SurfaceCard className="space-y-5 overflow-hidden p-4 sm:p-5 lg:p-6">
      <div className="space-y-2">
        <h2 className="text-[1.45rem] font-semibold tracking-[-0.03em] text-white">{title}</h2>
        <p className="max-w-3xl text-sm leading-6 text-white/62 sm:leading-7">{description}</p>
      </div>

      <div className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/42">Status summary</p>
        <div
          className={cn(
            'grid gap-3 sm:gap-4',
            statusItems.length >= 4 ? 'sm:grid-cols-2 xl:grid-cols-4' : 'sm:grid-cols-2 xl:grid-cols-3',
          )}
        >
          {statusItems.map((item) => (
            <MetaItem key={item.label} label={item.label} value={item.value} />
          ))}
        </div>
      </div>

      {children}
    </SurfaceCard>
  );
}

function DatasetTabBar<T extends string>({
  label,
  tabs,
  value,
  onChange,
}: Readonly<{
  label: string;
  tabs: readonly { key: T; label: string; title: string; description: string }[];
  value: T;
  onChange: (value: T) => void;
}>) {
  return (
    <div className="space-y-3">
      <p className="text-sm font-medium text-white">{label}</p>
      <div
        className={cn(
          '-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 sonartra-scrollbar sm:mx-0 sm:grid sm:overflow-visible sm:px-0',
          tabs.length >= 5 ? 'sm:grid-cols-2 xl:grid-cols-5' : 'sm:grid-cols-3',
        )}
      >
        {tabs.map((tab) => {
          const isSelected = tab.key === value;
          return (
            <button
              aria-pressed={isSelected}
              className={cn(
                'sonartra-focus-ring min-w-[10.5rem] shrink-0 rounded-[1rem] border px-4 py-4 text-left transition sm:min-w-0',
                isSelected
                  ? 'border-[rgba(142,162,255,0.36)] bg-[rgba(142,162,255,0.08)]'
                  : 'border-white/8 bg-black/10 hover:border-white/14',
              )}
              key={tab.key}
              onClick={() => onChange(tab.key)}
              type="button"
            >
              <p className="text-sm font-semibold text-white">{tab.label}</p>
              <p className="mt-2 text-sm leading-6 text-white/54">{tab.description}</p>
            </button>
          );
        })}
      </div>
    </div>
  );
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
      <section className="space-y-6 sm:space-y-8">
        <SectionHeader
          eyebrow="Language"
          title="Language"
          description="Manage the report language used in the published results experience."
        />

        <SurfaceCard className="space-y-4 overflow-hidden p-4 sm:p-5 lg:p-6">
          <div className="flex flex-wrap items-start gap-2">
            <LabelPill>{viewModel.assessmentKey}</LabelPill>
            <LabelPill className="max-w-full whitespace-normal border-white/10 bg-white/[0.04] text-white/62">
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

  const selectedDomainTab = DOMAIN_CHAPTER_TABS.find((tab) => tab.key === activeDomainTab) ?? DOMAIN_CHAPTER_TABS[0];
  const selectedApplicationTab =
    APPLICATION_PLAN_TABS.find((tab) => tab.key === activeApplicationTab) ?? APPLICATION_PLAN_TABS[0];

  return (
    <section className="space-y-6 sm:space-y-8">
      <SectionHeader
        eyebrow="Language"
        title="Language"
        description="Author the report language used in results."
      />

      <SurfaceCard className="space-y-4 overflow-hidden p-4 sm:p-5 lg:p-6">
        <div className="flex flex-wrap items-start gap-2">
          <LabelPill>{viewModel.assessmentKey}</LabelPill>
          <LabelPill className="max-w-full whitespace-normal border-white/10 bg-white/[0.04] text-white/62">
            {getVersionSummary(viewModel)}
          </LabelPill>
        </div>
        <p className="max-w-3xl text-sm leading-6 text-white/62 sm:leading-7">
          This stage controls report-facing language only. Move from the opening report frame into hero logic,
          domain interpretation, and the final application layer without leaving the canonical import path.
        </p>
      </SurfaceCard>

      <ModuleShell
        title="Assessment Introduction"
        description="Shape the opening report language before the deeper interpretation begins. Use this area for the top-line report framing rather than engine logic."
        statusItems={[
          { label: 'Hero headers', value: formatEntryCount(viewModel.counts.heroHeaders.entryCount) },
          { label: 'Version scope', value: viewModel.activeVersion.versionTag },
        ]}
      >
        <AdminLanguageDatasetImport
          dataset="heroHeader"
          assessmentVersionId={viewModel.activeVersion.assessmentVersionId}
          counts={viewModel.counts}
          isEditableAssessmentVersion={viewModel.activeVersion.status === 'draft'}
          sectionTitle="Hero header language"
          sectionDescription="Replace the opening hero headline rows shown at the top of the results page for this assessment version."
        />
      </ModuleShell>

      <ModuleShell
        title="Hero Engine"
        description="Update the canonical datasets that decide how pair traits roll up into Hero patterns and how those patterns are expressed on the page."
        statusItems={[
          { label: 'Pair traits', value: formatEntryCount(viewModel.counts.pairTraitWeights.entryCount) },
          { label: 'Hero rules', value: formatEntryCount(viewModel.counts.heroPatternRules.entryCount) },
          { label: 'Hero language', value: formatEntryCount(viewModel.counts.heroPatternLanguage.entryCount) },
        ]}
      >
        <AdminHeroDatasetImport
          assessmentVersionId={viewModel.activeVersion.assessmentVersionId}
          counts={{
            pairTraitWeights: viewModel.counts.pairTraitWeights,
            heroPatternRules: viewModel.counts.heroPatternRules,
            heroPatternLanguage: viewModel.counts.heroPatternLanguage,
          }}
          isEditableAssessmentVersion={viewModel.activeVersion.status === 'draft'}
        />
      </ModuleShell>

      <ModuleShell
        title="Domain Chapters"
        description="Manage the domain-owned reading in the same order it appears in the report, from chapter openings through signal and pair interpretation."
        statusItems={[
          { label: 'Domain chapters', value: formatEntryCount(viewModel.counts.domains.entryCount) },
          { label: 'Signal chapters', value: formatEntryCount(viewModel.counts.signals.entryCount) },
          { label: 'Signal pairs', value: formatEntryCount(viewModel.counts.pairs.entryCount) },
        ]}
      >
        <DatasetTabBar
          label="Choose a domain language dataset"
          onChange={setActiveDomainTab}
          tabs={DOMAIN_CHAPTER_TABS}
          value={activeDomainTab}
        />

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
          sectionTitle={selectedDomainTab.title}
          sectionDescription={selectedDomainTab.description}
        />
      </ModuleShell>

      <ModuleShell
        title="Application Layer"
        description="Control the concluding guidance layer that turns the results into contribution, risk, development, and action language."
        statusItems={[
          { label: 'Thesis', value: formatEntryCount(viewModel.counts.applicationThesis.entryCount) },
          { label: 'Contribution', value: formatEntryCount(viewModel.counts.applicationContribution.entryCount) },
          { label: 'Risk', value: formatEntryCount(viewModel.counts.applicationRisk.entryCount) },
          { label: 'Development', value: formatEntryCount(viewModel.counts.applicationDevelopment.entryCount) },
          { label: 'Action prompts', value: formatEntryCount(viewModel.counts.applicationActionPrompts.entryCount) },
        ]}
      >
        <DatasetTabBar
          label="Choose an application dataset"
          onChange={setActiveApplicationTab}
          tabs={APPLICATION_PLAN_TABS}
          value={activeApplicationTab}
        />

        <AdminLanguageDatasetImport
          dataset={activeApplicationTab}
          assessmentVersionId={viewModel.activeVersion.assessmentVersionId}
          counts={viewModel.counts}
          isEditableAssessmentVersion={viewModel.activeVersion.status === 'draft'}
          sectionTitle={selectedApplicationTab.title}
          sectionDescription={selectedApplicationTab.description}
        />
      </ModuleShell>
    </section>
  );
}
