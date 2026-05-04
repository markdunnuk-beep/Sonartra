'use client';

import Image from 'next/image';
import { type MouseEvent, useMemo } from 'react';

import {
  createResultReadingSections,
  type ResultReadingSectionsConfig,
  type ResultReadingTopLevelSection,
} from '@/lib/results/result-reading-sections';
import {
  scrollToResultSection,
  useActiveResultSectionWithConfig,
} from '@/hooks/use-active-result-section';

export type DraftResultRailSection = {
  id: string;
  label: string;
};

type DraftResultReadingRailProps = {
  sections: readonly DraftResultRailSection[];
};

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(' ');
}

function createDraftReadingSectionsConfig(
  sections: readonly DraftResultRailSection[],
): ResultReadingSectionsConfig {
  return createResultReadingSections({
    topLevelSections: sections.map(
      (section, index) =>
        ({
          id: section.id,
          label: section.label,
          shortLabel: section.label,
          level: 'section',
          order: index + 1,
          intentPrompt: `Read the ${section.label} section.`,
        }) satisfies ResultReadingTopLevelSection,
    ),
  });
}

export function DraftResultReadingRail({ sections }: DraftResultReadingRailProps) {
  const sectionsConfig = useMemo(() => createDraftReadingSectionsConfig(sections), [sections]);
  const activeSectionIdFromScroll = useActiveResultSectionWithConfig(sectionsConfig);
  const fallbackSectionId = sections[0]?.id ?? null;
  const activeSectionId = sectionsConfig.sectionsById[activeSectionIdFromScroll ?? '']
    ? activeSectionIdFromScroll
    : fallbackSectionId;
  const activeSectionOrder = activeSectionId
    ? (sectionsConfig.sectionsById[activeSectionId]?.order ?? null)
    : null;

  function handleSectionAnchorClick(sectionId: string) {
    return (event: MouseEvent<HTMLAnchorElement>) => {
      if (scrollToResultSection(sectionId)) {
        event.preventDefault();
      }
    };
  }

  return (
    <nav
      aria-label="Draft report reading navigation"
      className="hidden xl:sticky xl:top-[5.7rem] xl:block xl:w-[11.75rem] xl:shrink-0 xl:self-start"
      data-draft-result-reading-rail="true"
      data-result-reading-rail="true"
    >
      <div className="space-y-3 rounded-[1.35rem] border border-white/[0.04] bg-[#09101d]/24 px-3 py-3.5 shadow-[0_10px_24px_rgba(0,0,0,0.06)] backdrop-blur-[12px]">
        <div className="space-y-2 pb-1.5 pl-1">
          <Image
            src="/images/brand/sonartra-logo-white.svg"
            alt="Sonartra"
            width={6259}
            height={1529}
            className="h-auto w-[136px] opacity-[0.8]"
          />
        </div>
        <ul className="sonartra-result-rail-track relative space-y-0.5 pl-1.5" role="list">
          {sectionsConfig.topLevelSections.map((section) => {
            const isActive = activeSectionId === section.id;
            const isPassed =
              activeSectionOrder !== null && section.order < activeSectionOrder && !isActive;
            const isUpcoming =
              activeSectionOrder !== null && section.order > activeSectionOrder && !isActive;
            const isNext =
              activeSectionOrder !== null && section.order === activeSectionOrder + 1;

            return (
              <li key={section.id}>
                <a
                  href={`#${section.id}`}
                  aria-current={isActive ? 'step' : undefined}
                  onClick={handleSectionAnchorClick(section.id)}
                  data-reading-state={
                    isActive ? 'current' : isNext ? 'next' : isPassed ? 'read' : isUpcoming ? 'upcoming' : 'idle'
                  }
                  className={cx(
                    'sonartra-motion-nav-item sonartra-result-rail-item sonartra-focus-ring text-white/40 group relative block rounded-[0.9rem] px-3 py-2 text-[0.78rem] leading-5 tracking-[0.01em] outline-none',
                    'hover:bg-white/[0.018] hover:text-white/62 focus-visible:text-white/82',
                    isPassed && 'sonartra-result-rail-item-read',
                    isActive &&
                      'bg-white/[0.028] text-white/80 shadow-[inset_0_1px_0_rgba(255,255,255,0.028)]',
                    isNext && 'text-white/48',
                  )}
                >
                  <span
                    aria-hidden="true"
                    className={cx(
                      'sonartra-motion-active-bar sonartra-result-rail-marker absolute left-[-0.58rem] top-1/2 h-2.5 w-2.5 -translate-y-1/2 scale-100 rounded-full border border-white/[0.12] bg-[#0c1322] opacity-100',
                      isPassed && 'sonartra-result-rail-marker-read',
                      isActive &&
                        'border-[rgba(50,214,176,0.32)] bg-[rgba(50,214,176,0.22)] shadow-[0_0_0_5px_rgba(50,214,176,0.055)]',
                      isUpcoming && 'border-white/[0.1] bg-white/[0.035]',
                    )}
                  />
                  <span className="relative flex min-w-0 items-start gap-2.5">
                    <span
                      aria-hidden="true"
                      className={cx(
                        'pt-0.5 text-[0.63rem] font-medium tracking-[0.16em] text-white/24',
                        isActive && 'text-white/42',
                        isPassed && 'sonartra-result-rail-number-read',
                      )}
                    >
                      {String(section.order).padStart(2, '0')}
                    </span>
                    <span className="min-w-0 space-y-0.5">
                      <span className="block min-w-0">{section.label}</span>
                      {isActive ? (
                        <span
                          aria-hidden="true"
                          className="block text-[0.54rem] font-medium uppercase tracking-[0.2em] text-white/34"
                        >
                          Now reading
                        </span>
                      ) : null}
                      {isPassed ? (
                        <span
                          aria-hidden="true"
                          className="sonartra-result-rail-read-label block text-[0.54rem] font-medium uppercase tracking-[0.2em]"
                        >
                          Read
                        </span>
                      ) : null}
                      {isNext ? (
                        <span
                          aria-hidden="true"
                          className="block text-[0.54rem] font-medium uppercase tracking-[0.2em] text-white/24"
                        >
                          Up next
                        </span>
                      ) : null}
                    </span>
                  </span>
                </a>
              </li>
            );
          })}
        </ul>
      </div>
    </nav>
  );
}
