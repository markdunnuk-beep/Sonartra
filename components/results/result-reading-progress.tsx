'use client';

import { cn } from '@/components/shared/user-app-ui';
import { useActiveResultSection } from '@/hooks/use-active-result-section';
import {
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

export function ResultReadingProgress({
  className,
  activeSectionIdOverride,
}: ResultReadingProgressProps) {
  const activeSectionIdFromScroll = useActiveResultSection();
  const activeSectionId = activeSectionIdOverride ?? activeSectionIdFromScroll;

  const activeTopLevelSectionId = resolveTopLevelSectionId(activeSectionId);
  const activeTopLevelIndex = Math.max(
    0,
    RESULT_READING_TOP_LEVEL_SECTIONS.findIndex((section) => section.id === activeTopLevelSectionId),
  );

  const activeTopLevelSection = RESULT_READING_TOP_LEVEL_SECTIONS[activeTopLevelIndex];
  const activeStepNumber = activeTopLevelIndex + 1;
  const totalSteps = RESULT_READING_TOP_LEVEL_SECTIONS.length;

  return (
    <section
      aria-label="Report reading progress"
      className={cn('xl:hidden', className)}
      data-result-reading-progress="true"
    >
      <div className="sticky top-16 z-20 border-y border-white/10 bg-[#07080d]/90 px-4 py-2.5 backdrop-blur">
        <div className="flex items-center justify-between gap-4">
          <p className="text-[0.72rem] tracking-[0.09em] text-white/55">Currently reading</p>
          <p className="text-[0.72rem] tracking-[0.05em] text-white/60">{activeStepNumber} of {totalSteps}</p>
        </div>

        <p className="mt-0.5 text-[0.86rem] font-medium tracking-[0.01em] text-white/88">
          {activeTopLevelSection?.label}
        </p>

        <div className="mt-2 h-px w-full bg-white/12" aria-hidden="true">
          <div
            className="sonartra-motion-progress h-px bg-white/58"
            style={{ width: `${(activeStepNumber / totalSteps) * 100}%` }}
          />
        </div>
      </div>
    </section>
  );
}
