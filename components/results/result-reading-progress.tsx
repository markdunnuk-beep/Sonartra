'use client';

import { cn } from '@/components/shared/user-app-ui';
import { useActiveResultSection } from '@/hooks/use-active-result-section';
import {
  RESULT_READING_SECTIONS,
  RESULT_READING_SECTIONS_BY_ID,
  RESULT_READING_DOMAIN_SUBSECTIONS,
  RESULT_READING_TOP_LEVEL_SECTIONS,
} from '@/lib/results/result-reading-sections';

type ResultReadingProgressProps = {
  className?: string;
  activeSectionIdOverride?: string | null;
};

function resolveTopLevelSectionId(activeSectionId: string | null): string {
  if (!activeSectionId) {
    return RESULT_READING_TOP_LEVEL_SECTIONS[0]?.id ?? 'intro';
  }

  const activeDomainSubsection = RESULT_READING_DOMAIN_SUBSECTIONS.find(
    (section) => section.id === activeSectionId,
  );

  if (activeDomainSubsection) {
    return activeDomainSubsection.parentId;
  }

  const activeTopLevelSection = RESULT_READING_TOP_LEVEL_SECTIONS.find(
    (section) => section.id === activeSectionId,
  );

  return activeTopLevelSection?.id ?? (RESULT_READING_TOP_LEVEL_SECTIONS[0]?.id ?? 'intro');
}

function resolveActiveSectionId(activeSectionId: string | null): string {
  if (!activeSectionId || !RESULT_READING_SECTIONS_BY_ID[activeSectionId]) {
    return RESULT_READING_TOP_LEVEL_SECTIONS[0]?.id ?? 'intro';
  }

  return activeSectionId;
}

export function ResultReadingProgress({
  className,
  activeSectionIdOverride,
}: ResultReadingProgressProps) {
  const activeSectionIdFromScroll = useActiveResultSection();
  const activeSectionId = resolveActiveSectionId(activeSectionIdOverride ?? activeSectionIdFromScroll);

  const activeTopLevelSectionId = resolveTopLevelSectionId(activeSectionId);
  const activeTopLevelIndex = Math.max(
    0,
    RESULT_READING_TOP_LEVEL_SECTIONS.findIndex((section) => section.id === activeTopLevelSectionId),
  );

  const activeSection = RESULT_READING_SECTIONS_BY_ID[activeSectionId];
  const activeTopLevelSection = RESULT_READING_TOP_LEVEL_SECTIONS[activeTopLevelIndex];
  const activeStepNumber = activeTopLevelIndex + 1;
  const totalSteps = RESULT_READING_TOP_LEVEL_SECTIONS.length;
  const nextSection = RESULT_READING_SECTIONS.find((section) => section.order === activeSection.order + 1);
  const activeSubsection = activeSection.level === 'subsection' ? activeSection : null;
  const nextTopLevelSection = RESULT_READING_TOP_LEVEL_SECTIONS[activeTopLevelIndex + 1] ?? null;
  const currentPrimaryLabel = activeSubsection?.label ?? activeTopLevelSection?.label;
  const currentContextLabel = activeSubsection ? activeTopLevelSection?.label : null;
  const nextLabel = nextSection?.label ?? null;
  const nextContextLabel =
    nextSection?.level === 'subsection'
      ? RESULT_READING_SECTIONS_BY_ID[nextSection.parentId ?? '']?.label
      : nextSection?.level === 'section' && activeSubsection
        ? nextTopLevelSection?.label ?? nextSection?.label
        : null;

  return (
    <section
      aria-label="Report reading progress"
      className={cn('xl:hidden', className)}
      data-result-reading-progress="true"
    >
      <div className="sticky top-16 z-20 border-b border-white/[0.08] bg-[#080b13]/84 px-4 py-2.5 backdrop-blur-md">
        <div className="sonartra-result-mobile-progress-surface rounded-[1rem] border border-white/[0.07] px-3.5 py-3">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="flex items-center gap-2.5">
                <p className="text-[0.65rem] font-medium uppercase tracking-[0.16em] text-white/44">
                  Now reading
                </p>
                <span
                  aria-hidden="true"
                  className="inline-flex h-5 min-w-5 items-center justify-center rounded-full border border-white/[0.08] px-1.5 text-[0.62rem] font-medium tracking-[0.08em] text-white/55"
                >
                  {String(activeStepNumber).padStart(2, '0')}
                </span>
              </div>

              {currentContextLabel ? (
                <p className="mt-1 text-[0.64rem] font-medium uppercase tracking-[0.14em] text-white/34">
                  {currentContextLabel}
                </p>
              ) : null}

              <p className="mt-0.5 text-[0.95rem] font-medium leading-5 tracking-[0.01em] text-white/86">
                {currentPrimaryLabel}
              </p>
            </div>

            <div className="flex shrink-0 items-center gap-1.5 pt-0.5" aria-hidden="true">
              {RESULT_READING_TOP_LEVEL_SECTIONS.map((section, index) => {
                const isActive = section.id === activeTopLevelSectionId;
                const isPassed = index < activeTopLevelIndex;

                return (
                  <span
                    key={section.id}
                    className={cn(
                      'sonartra-motion-progress block h-1.5 rounded-full',
                      isActive && 'w-5 bg-white/58',
                      isPassed && 'w-2.5 bg-white/28',
                      !isActive && !isPassed && 'w-2.5 bg-white/12',
                    )}
                  />
                );
              })}
            </div>
          </div>

          {nextLabel ? (
            <div className="mt-2.5 flex items-start gap-2.5 border-t border-white/[0.06] pt-2.5">
              <span
                aria-hidden="true"
                className="mt-[0.34rem] h-1.5 w-1.5 shrink-0 rounded-full bg-white/[0.22]"
              />
              <div className="min-w-0">
                <p className="text-[0.6rem] font-medium uppercase tracking-[0.16em] text-white/30">
                  Up next
                </p>
                <p className="mt-0.5 truncate text-[0.78rem] font-medium leading-5 tracking-[0.01em] text-white/62">
                  {nextLabel}
                </p>
                {nextContextLabel && nextContextLabel !== nextLabel ? (
                  <p className="text-[0.66rem] leading-4 tracking-[0.01em] text-white/38">
                    within {nextContextLabel}
                  </p>
                ) : null}
              </div>
            </div>
          ) : null}

          <div className="sr-only" aria-live="polite">
            Currently reading step {activeStepNumber} of {totalSteps}: {activeTopLevelSection?.label}
            {activeSubsection ? `. Current subsection: ${activeSubsection.label}.` : '.'}
            {nextLabel ? ` Up next: ${nextLabel}.` : ''}
          </div>
        </div>
      </div>
    </section>
  );
}
