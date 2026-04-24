'use client';

import { cn } from '@/components/shared/user-app-ui';
import { useActiveResultSectionWithConfig } from '@/hooks/use-active-result-section';
import {
  DEFAULT_RESULT_READING_SECTIONS,
  type ResultReadingSectionsConfig,
} from '@/lib/results/result-reading-sections';

type ResultReadingProgressProps = {
  className?: string;
  activeSectionIdOverride?: string | null;
  sectionsConfig?: ResultReadingSectionsConfig;
};

function resolveTopLevelSectionId(
  activeSectionId: string | null,
  sectionsConfig: ResultReadingSectionsConfig,
): string {
  if (!activeSectionId) {
    return sectionsConfig.topLevelSections[0]?.id ?? 'intro';
  }

  const activeDomainSubsection = sectionsConfig.subsections.find(
    (section) => section.id === activeSectionId,
  );

  if (activeDomainSubsection) {
    return activeDomainSubsection.parentId;
  }

  const activeTopLevelSection = sectionsConfig.topLevelSections.find(
    (section) => section.id === activeSectionId,
  );

  return activeTopLevelSection?.id ?? sectionsConfig.topLevelSections[0]?.id ?? 'intro';
}

function resolveActiveSectionId(
  activeSectionId: string | null,
  sectionsConfig: ResultReadingSectionsConfig,
): string {
  if (!activeSectionId || !sectionsConfig.sectionsById[activeSectionId]) {
    return sectionsConfig.topLevelSections[0]?.id ?? 'intro';
  }

  return activeSectionId;
}

export function ResultReadingProgress({
  className,
  activeSectionIdOverride,
  sectionsConfig = DEFAULT_RESULT_READING_SECTIONS,
}: ResultReadingProgressProps) {
  const activeSectionIdFromScroll = useActiveResultSectionWithConfig(sectionsConfig);
  const activeSectionId = resolveActiveSectionId(
    activeSectionIdOverride ?? activeSectionIdFromScroll,
    sectionsConfig,
  );

  const activeTopLevelSectionId = resolveTopLevelSectionId(activeSectionId, sectionsConfig);
  const activeTopLevelIndex = Math.max(
    0,
    sectionsConfig.topLevelSections.findIndex((section) => section.id === activeTopLevelSectionId),
  );

  const activeSection = sectionsConfig.sectionsById[activeSectionId];
  const activeTopLevelSection = sectionsConfig.topLevelSections[activeTopLevelIndex];
  const activeStepNumber = activeTopLevelIndex + 1;
  const totalSteps = sectionsConfig.topLevelSections.length;
  const nextSection = sectionsConfig.sections.find(
    (section) => section.order === activeSection.order + 1,
  );
  const activeSubsection = activeSection.level === 'subsection' ? activeSection : null;
  const nextTopLevelSection = sectionsConfig.topLevelSections[activeTopLevelIndex + 1] ?? null;
  const currentPrimaryLabel = activeSubsection?.label ?? activeTopLevelSection?.label;
  const currentContextLabel = activeSubsection ? activeTopLevelSection?.label : null;
  const nextLabel = nextSection?.label ?? null;
  const nextContextLabel =
    nextSection?.level === 'subsection'
      ? sectionsConfig.sectionsById[nextSection.parentId ?? '']?.label
      : nextSection?.level === 'section' && activeSubsection
        ? (nextTopLevelSection?.label ?? nextSection?.label)
        : null;

  return (
    <section
      aria-label="Report reading progress"
      className={cn('xl:hidden', className)}
      data-result-reading-progress="true"
    >
      <div className="sticky top-16 z-20 border-b border-white/[0.06] bg-[#080b13]/78 px-3 py-2.5 backdrop-blur-md sm:px-4">
        <div className="sonartra-result-mobile-progress-surface rounded-[0.95rem] border border-white/[0.055] px-3.5 py-3">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="flex items-center gap-2.5">
                <p className="text-white/34 text-[0.62rem] font-medium uppercase tracking-[0.18em]">
                  Now reading
                </p>
                <span
                  aria-hidden="true"
                  className="inline-flex h-5 min-w-5 items-center justify-center rounded-full border border-white/[0.06] bg-white/[0.018] px-1.5 text-[0.6rem] font-medium tracking-[0.1em] text-white/48"
                >
                  {String(activeStepNumber).padStart(2, '0')}
                </span>
              </div>

              {currentContextLabel ? (
                <p className="mt-1 text-[0.62rem] font-medium uppercase tracking-[0.16em] text-white/28">
                  {currentContextLabel}
                </p>
              ) : null}

              <p className="mt-0.5 text-[0.93rem] font-medium leading-5 tracking-[0.01em] text-white/82">
                {currentPrimaryLabel}
              </p>
            </div>

            <div className="flex shrink-0 items-center gap-1.5 pt-0.5" aria-hidden="true">
              {sectionsConfig.topLevelSections.map((section, index) => {
                const isActive = section.id === activeTopLevelSectionId;
                const isPassed = index < activeTopLevelIndex;

                return (
                  <span
                    key={section.id}
                    className={cn(
                      'sonartra-motion-progress block h-1.5 rounded-full',
                      isActive && 'w-5 bg-[rgba(194,205,255,0.56)]',
                      isPassed && 'w-2.5 bg-[rgba(128,166,139,0.34)]',
                      !isActive && !isPassed && 'w-2.5 bg-white/[0.08]',
                    )}
                  />
                );
              })}
            </div>
          </div>

          {nextLabel ? (
            <div className="mt-2.5 flex items-start gap-2.5 border-t border-white/[0.05] pt-2.5">
              <span
                aria-hidden="true"
                className="mt-[0.34rem] h-1.5 w-1.5 shrink-0 rounded-full bg-[rgba(142,162,255,0.22)]"
              />
              <div className="min-w-0">
                <p className="text-[0.58rem] font-medium uppercase tracking-[0.18em] text-white/26">
                  Up next
                </p>
                <p className="mt-0.5 truncate text-[0.77rem] font-medium leading-5 tracking-[0.01em] text-white/58">
                  {nextLabel}
                </p>
                {nextContextLabel && nextContextLabel !== nextLabel ? (
                  <p className="text-[0.64rem] leading-4 tracking-[0.01em] text-white/34">
                    within {nextContextLabel}
                  </p>
                ) : null}
              </div>
            </div>
          ) : null}

          <div className="sr-only" aria-live="polite">
            Currently reading step {activeStepNumber} of {totalSteps}:{' '}
            {activeTopLevelSection?.label}
            {activeSubsection ? `. Current subsection: ${activeSubsection.label}.` : '.'}
            {nextLabel ? ` Up next: ${nextLabel}.` : ''}
          </div>
        </div>
      </div>
    </section>
  );
}
