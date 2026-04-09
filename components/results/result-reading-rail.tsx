'use client';

import { cn } from '@/components/shared/user-app-ui';
import { useActiveResultSection } from '@/hooks/use-active-result-section';
import {
  RESULT_READING_DOMAIN_SUBSECTIONS,
  RESULT_READING_TOP_LEVEL_SECTIONS,
} from '@/lib/results/result-reading-sections';

type ResultReadingRailProps = {
  className?: string;
  activeSectionIdOverride?: string | null;
};

function getTopLevelActiveId(activeSectionId: string | null): string | null {
  if (!activeSectionId) {
    return null;
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

  return activeTopLevelSection?.id ?? null;
}

export function ResultReadingRail({ className, activeSectionIdOverride }: ResultReadingRailProps) {
  const activeSectionIdFromScroll = useActiveResultSection();
  const activeSectionId = activeSectionIdOverride ?? activeSectionIdFromScroll;
  const activeTopLevelId = getTopLevelActiveId(activeSectionId);

  return (
    <nav
      aria-label="Report reading navigation"
      className={cn('hidden xl:block xl:w-[13rem] xl:shrink-0', className)}
      data-result-reading-rail="true"
    >
      <div className="sticky top-28 space-y-4 border-l border-white/10 pl-3.5">
        <ul className="space-y-1" role="list">
          {RESULT_READING_TOP_LEVEL_SECTIONS.map((section) => {
            const isTopLevelActive = activeTopLevelId === section.id;
            const hasNestedDomainSections = section.id === 'domains';

            return (
              <li key={section.id}>
                <a
                  href={`#${section.id}`}
                  aria-current={isTopLevelActive ? 'page' : undefined}
                  className={cn(
                    'sonartra-motion-nav-item sonartra-focus-ring group relative block rounded-md px-3 py-2 text-[0.81rem] leading-5 tracking-[0.01em] text-white/55 outline-none',
                    'hover:text-white/72 focus-visible:text-white/86',
                    isTopLevelActive && 'bg-white/[0.03] text-white/88',
                  )}
                >
                  <span
                    aria-hidden="true"
                    className={cn(
                      'sonartra-motion-active-bar absolute inset-y-1 left-0 w-px rounded-full bg-white/35 opacity-0 scale-y-75',
                      isTopLevelActive && 'opacity-100 scale-y-100',
                    )}
                  />
                  <span className="relative block">{section.label}</span>
                </a>

                {hasNestedDomainSections ? (
                  <ul className="mt-1.5 space-y-0.5 pl-3" role="list">
                    {RESULT_READING_DOMAIN_SUBSECTIONS.map((domainSection) => {
                      const isDomainSubsectionActive = activeSectionId === domainSection.id;

                      return (
                        <li key={domainSection.id}>
                          <a
                            href={`#${domainSection.id}`}
                            aria-current={isDomainSubsectionActive ? 'page' : undefined}
                            className={cn(
                              'sonartra-motion-nav-item sonartra-focus-ring group relative block rounded-md px-3 py-1.5 text-[0.78rem] leading-5 text-white/48 outline-none',
                              'hover:text-white/66 focus-visible:text-white/82',
                              isDomainSubsectionActive && 'bg-white/[0.025] text-white/84',
                            )}
                          >
                            <span
                              aria-hidden="true"
                              className={cn(
                                'sonartra-motion-active-bar absolute inset-y-1 left-0 w-px rounded-full bg-white/35 opacity-0 scale-y-75',
                                isDomainSubsectionActive && 'opacity-100 scale-y-100',
                              )}
                            />
                            <span className="sr-only">Domain chapter: </span>
                            <span className="relative block">{domainSection.label}</span>
                          </a>
                        </li>
                      );
                    })}
                  </ul>
                ) : null}
              </li>
            );
          })}
        </ul>
      </div>
    </nav>
  );
}
