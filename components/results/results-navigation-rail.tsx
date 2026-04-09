'use client';

import { cn } from '@/components/shared/user-app-ui';
import { useActiveSection } from '@/hooks/use-active-section';

export type ResultsNavigationSection = {
  id: string;
  label: string;
  subtext: string;
};

type ResultsNavigationRailProps = {
  sections: readonly ResultsNavigationSection[];
  className?: string;
  headerOffset?: number;
};

export function ResultsNavigationRail({
  sections,
  className,
  headerOffset = 104,
}: ResultsNavigationRailProps) {
  const activeSectionId = useActiveSection({
    sectionIds: sections.map((section) => section.id),
    rootMargin: '-40% 0px -45% 0px',
    threshold: [0, 0.2, 0.45, 0.7, 1],
    updateHash: true,
  });

  const activeIndex = Math.max(
    0,
    sections.findIndex((section) => section.id === activeSectionId),
  );
  const progress = sections.length > 1 ? activeIndex / (sections.length - 1) : 0;

  const handleSectionClick = (id: string) => {
    const element = document.getElementById(id);
    if (!element) {
      return;
    }

    const targetTop = element.getBoundingClientRect().top + window.scrollY - headerOffset;
    window.scrollTo({ top: Math.max(0, targetTop), behavior: 'smooth' });
  };

  return (
    <aside className={cn('hidden xl:block xl:w-[15rem] xl:shrink-0', className)}>
      <nav aria-label="Result sections" className="sticky top-24">
        <div className="relative pl-6">
          <div aria-hidden="true" className="absolute inset-y-1 left-0 w-px bg-white/12" />
          <div
            aria-hidden="true"
            className="absolute left-0 top-1 w-px bg-white/50 transition-[height] duration-300 ease-out"
            style={{ height: `calc(${progress * 100}% + 0.5rem)` }}
          />

          <ol className="space-y-3">
            {sections.map((section) => {
              const isActive = section.id === activeSectionId;

              return (
                <li key={section.id}>
                  <button
                    type="button"
                    onClick={() => handleSectionClick(section.id)}
                    aria-current={isActive ? 'location' : undefined}
                    className={cn(
                      'sonartra-focus-ring group w-full rounded-md py-1 text-left outline-none transition-all duration-200',
                      isActive ? 'opacity-100' : 'opacity-55 hover:opacity-75',
                    )}
                  >
                    <span className={cn('block text-[0.84rem] tracking-[0.01em]', isActive && 'font-semibold')}>
                      {section.label}
                    </span>
                    <span className="mt-0.5 block text-[0.73rem] leading-5 text-white/58">{section.subtext}</span>
                  </button>
                </li>
              );
            })}
          </ol>
        </div>
      </nav>
    </aside>
  );
}
