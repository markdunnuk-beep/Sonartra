'use client';

import { type MouseEvent } from 'react';

import { cn } from '@/components/shared/user-app-ui';
import {
  scrollToResultSection,
  useActiveResultSectionWithConfig,
} from '@/hooks/use-active-result-section';
import {
  DEFAULT_RESULT_READING_SECTIONS,
  type ResultReadingSectionsConfig,
} from '@/lib/results/result-reading-sections';

type ResultSectionNavigationProps = {
  className?: string;
  activeSectionIdOverride?: string | null;
  sectionsConfig?: ResultReadingSectionsConfig;
};

function getTopLevelActiveId(
  activeSectionId: string | null,
  sectionsConfig: ResultReadingSectionsConfig,
): string {
  if (!activeSectionId) {
    return sectionsConfig.topLevelSections[0]?.id ?? 'intro';
  }

  const activeSubsection = sectionsConfig.subsections.find(
    (section) => section.id === activeSectionId,
  );

  if (activeSubsection) {
    return activeSubsection.parentId;
  }

  return sectionsConfig.sectionsById[activeSectionId]?.id ?? sectionsConfig.topLevelSections[0]?.id ?? 'intro';
}

export function ResultSectionNavigation({
  className,
  activeSectionIdOverride,
  sectionsConfig = DEFAULT_RESULT_READING_SECTIONS,
}: ResultSectionNavigationProps) {
  const activeSectionIdFromScroll = useActiveResultSectionWithConfig(sectionsConfig);
  const activeTopLevelId = getTopLevelActiveId(
    activeSectionIdOverride ?? activeSectionIdFromScroll,
    sectionsConfig,
  );
  const activeSection =
    sectionsConfig.sectionsById[activeTopLevelId] ?? sectionsConfig.topLevelSections[0];

  function handleSectionAnchorClick(sectionId: string) {
    return (event: MouseEvent<HTMLAnchorElement>) => {
      if (scrollToResultSection(sectionId)) {
        event.preventDefault();
      }
    };
  }

  return (
    <nav
      aria-label="Report section navigation"
      className={cn('xl:hidden', className)}
      data-result-section-navigation="true"
    >
      <details className="sonartra-result-section-nav">
        <summary>
          <span className="sonartra-result-section-nav-summary">
            <span className="sonartra-result-section-nav-kicker">Jump to section</span>
            <span className="sonartra-result-section-nav-current">
              {activeSection?.label ?? 'Intro'}
            </span>
          </span>
        </summary>

        <div className="sonartra-result-section-nav-panel">
          {sectionsConfig.topLevelSections.map((section) => {
            const isActive = section.id === activeTopLevelId;

            return (
              <a
                key={section.id}
                href={`#${section.id}`}
                aria-current={isActive ? 'true' : undefined}
                className="sonartra-result-section-nav-link sonartra-focus-ring"
                data-section-nav-state={isActive ? 'current' : 'idle'}
                onClick={handleSectionAnchorClick(section.id)}
              >
                <span aria-hidden="true" className="sonartra-result-section-nav-number">
                  {String(section.order).padStart(2, '0')}
                </span>
                <span className="sonartra-result-section-nav-label">{section.label}</span>
              </a>
            );
          })}
        </div>
      </details>
    </nav>
  );
}
