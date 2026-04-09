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
      className={cn('hidden xl:block xl:w-[11.75rem] xl:shrink-0', className)}
      data-result-reading-rail="true"
    >
      <div className="sticky top-[6.35rem] space-y-3 border-l border-white/[0.08] pl-2.5">
        <ul className="space-y-0.5" role="list">
          {RESULT_READING_TOP_LEVEL_SECTIONS.map((section) => {
            const isTopLevelActive = activeTopLevelId === section.id;
            const isExactTopLevelActive = activeSectionId === section.id;
            const hasNestedDomainSections = section.id === 'domains';

            return (
              <li key={section.id}>
                <a
                  href={`#${section.id}`}
                  aria-current={isExactTopLevelActive ? 'location' : undefined}
                  className={cn(
                    'sonartra-motion-nav-item sonartra-focus-ring group relative block rounded-md px-2.5 py-1.5 text-[0.79rem] leading-5 tracking-[0.01em] text-white/47 outline-none',
                    'hover:text-white/67 focus-visible:text-white/84',
                    isTopLevelActive && 'bg-white/[0.024] text-white/83',
                  )}
                >
                  <span
                    aria-hidden="true"
                    className={cn(
                      'sonartra-motion-active-bar absolute inset-y-1.5 left-0 w-px rounded-full bg-white/40 opacity-0 scale-y-75',
                      (isTopLevelActive || isExactTopLevelActive) && 'opacity-100 scale-y-100',
                    )}
                  />
                  <span className="relative flex min-w-0 items-baseline gap-2">
                    <span
                      aria-hidden="true"
                      className="text-[0.69rem] font-medium tracking-[0.08em] text-white/35"
                    >
                      {String(section.order).padStart(2, '0')}
                    </span>
                    <span className="min-w-0">{section.label}</span>
                  </span>
                </a>

                {hasNestedDomainSections ? (
                  <ul
                    aria-label="Domain chapters"
                    className="mt-1.5 space-y-0.5 border-l border-white/[0.07] pl-2.5"
                    role="list"
                  >
                    {RESULT_READING_DOMAIN_SUBSECTIONS.map((domainSection) => {
                      const isDomainSubsectionActive = activeSectionId === domainSection.id;

                      return (
                        <li key={domainSection.id}>
                          <a
                            href={`#${domainSection.id}`}
                            aria-current={isDomainSubsectionActive ? 'location' : undefined}
                            className={cn(
                              'sonartra-motion-nav-item sonartra-focus-ring group relative block rounded-md px-2.5 py-1 text-[0.75rem] leading-5 tracking-[0.012em] text-white/43 outline-none',
                              'hover:text-white/62 focus-visible:text-white/82',
                              isDomainSubsectionActive && 'bg-white/[0.022] text-white/79',
                            )}
                          >
                            <span
                              aria-hidden="true"
                              className={cn(
                                'sonartra-motion-active-bar absolute inset-y-1.5 left-0 w-px rounded-full bg-white/38 opacity-0 scale-y-75',
                                isDomainSubsectionActive && 'opacity-100 scale-y-100',
                              )}
                            />
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
