'use client';

import Image from 'next/image';
import { type ReactNode, useState } from 'react';

import { cn } from '@/components/shared/user-app-ui';
import { useActiveResultSectionWithConfig } from '@/hooks/use-active-result-section';
import {
  copyResultsLinkedInSharePost,
  trackResultsLinkedInOpenClicked,
  type ResultsLinkedInShareAnalytics,
} from '@/lib/results/linkedin-share-analytics';
import {
  DEFAULT_RESULT_READING_SECTIONS,
  type ResultReadingSectionsConfig,
} from '@/lib/results/result-reading-sections';

type ResultReadingRailProps = {
  className?: string;
  activeSectionIdOverride?: string | null;
  sectionsConfig?: ResultReadingSectionsConfig;
  utilityActions?: {
    linkedInPostBody: string;
    linkedInAnalytics: ResultsLinkedInShareAnalytics;
  } | null;
};

function getTopLevelActiveId(
  activeSectionId: string | null,
  sectionsConfig: ResultReadingSectionsConfig,
): string | null {
  if (!activeSectionId) {
    return null;
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

  return activeTopLevelSection?.id ?? null;
}

function getSectionOrder(
  activeSectionId: string | null,
  sectionsConfig: ResultReadingSectionsConfig,
): number | null {
  if (!activeSectionId) {
    return null;
  }

  const section = sectionsConfig.sections.find((entry) => entry.id === activeSectionId);
  return section?.order ?? null;
}

function UtilityIconButton({
  label,
  href,
  onClick,
  disabled = false,
  children,
}: {
  label: string;
  href?: string;
  onClick?: () => void;
  disabled?: boolean;
  children: ReactNode;
}) {
  const className =
    'sonartra-focus-ring sonartra-result-rail-icon inline-flex h-9 w-9 items-center justify-center rounded-md text-white/52 outline-none transition hover:text-white/79 focus-visible:text-white/90';

  if (href && !disabled) {
    return (
      <a
        aria-label={label}
        href={href}
        className={className}
        onClick={onClick}
        rel={href.startsWith('http') ? 'noreferrer noopener' : undefined}
        target={href.startsWith('http') ? '_blank' : undefined}
      >
        {children}
      </a>
    );
  }

  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      disabled={disabled}
      className={cn(className, disabled && 'text-white/34 hover:text-white/34 cursor-not-allowed')}
    >
      {children}
    </button>
  );
}

export function ResultReadingRail({
  className,
  activeSectionIdOverride,
  sectionsConfig = DEFAULT_RESULT_READING_SECTIONS,
  utilityActions,
}: ResultReadingRailProps) {
  const activeSectionIdFromScroll = useActiveResultSectionWithConfig(sectionsConfig);
  const activeSectionId = activeSectionIdOverride ?? activeSectionIdFromScroll;
  const activeTopLevelId = getTopLevelActiveId(activeSectionId, sectionsConfig);
  const activeSectionOrder = getSectionOrder(activeSectionId, sectionsConfig);
  const [utilityFeedback, setUtilityFeedback] = useState('');

  async function handleLinkedInShare() {
    if (!utilityActions) {
      return;
    }

    await copyResultsLinkedInSharePost({
      postBody: utilityActions.linkedInPostBody,
      analytics: utilityActions.linkedInAnalytics,
      clipboard: navigator.clipboard,
    });
    trackResultsLinkedInOpenClicked({
      analytics: utilityActions.linkedInAnalytics,
    });
    window.open('https://www.linkedin.com/feed/', '_blank', 'noopener,noreferrer');
    setUtilityFeedback('LinkedIn post copied');
    window.setTimeout(() => setUtilityFeedback(''), 2000);
  }

  return (
    <nav
      aria-label="Report reading navigation"
      className={cn('hidden xl:block xl:w-[11.75rem] xl:shrink-0', className)}
      data-result-reading-rail="true"
    >
      <div className="sticky top-[5.7rem] space-y-3 rounded-[1.35rem] border border-white/[0.04] bg-[#09101d]/24 px-3 py-3.5 shadow-[0_10px_24px_rgba(0,0,0,0.06)] backdrop-blur-[12px]">
        <div className="space-y-2 pb-1.5 pl-1">
          <Image
            src="/images/sonartra-logo.svg"
            alt="Sonartra"
            width={174}
            height={28}
            className="h-auto w-[136px] opacity-[0.8]"
          />
          <p className="text-white/22 text-[0.58rem] font-medium uppercase tracking-[0.18em]">
            Reading rail
          </p>
        </div>
        <ul className="sonartra-result-rail-track relative space-y-0.5 pl-1.5" role="list">
          {sectionsConfig.topLevelSections.map((section) => {
            const isTopLevelActive = activeTopLevelId === section.id;
            const isExactTopLevelActive = activeSectionId === section.id;
            const hasNestedDomainSections = sectionsConfig.subsections.some(
              (subsection) => subsection.parentId === section.id,
            );
            const isPassed =
              activeSectionOrder !== null &&
              section.order < activeSectionOrder &&
              !isTopLevelActive;
            const isUpcoming =
              activeSectionOrder !== null &&
              section.order > activeSectionOrder &&
              !isTopLevelActive;
            const isNext = activeSectionOrder !== null && section.order === activeSectionOrder + 1;

            return (
              <li key={section.id}>
                <a
                  href={`#${section.id}`}
                  aria-current={isExactTopLevelActive ? 'location' : undefined}
                  data-reading-state={
                    isExactTopLevelActive
                      ? 'current'
                      : isTopLevelActive
                        ? 'parent-current'
                        : isNext
                          ? 'next'
                          : isPassed
                            ? 'passed'
                            : isUpcoming
                              ? 'upcoming'
                              : 'idle'
                  }
                  className={cn(
                    'sonartra-motion-nav-item sonartra-result-rail-item sonartra-focus-ring text-white/40 group relative block rounded-[0.9rem] px-3 py-2 text-[0.78rem] leading-5 tracking-[0.01em] outline-none',
                    'hover:bg-white/[0.018] hover:text-white/62 focus-visible:text-white/82',
                    isPassed && 'bg-white/[0.012] text-white/52',
                    isTopLevelActive &&
                      'bg-white/[0.028] text-white/80 shadow-[inset_0_1px_0_rgba(255,255,255,0.028)]',
                    isNext && 'text-white/48',
                  )}
                >
                  <span
                    aria-hidden="true"
                    className={cn(
                      'sonartra-motion-active-bar sonartra-result-rail-marker absolute left-[-0.58rem] top-1/2 h-2.5 w-2.5 -translate-y-1/2 scale-100 rounded-full border border-white/[0.12] bg-[#0c1322] opacity-100',
                      isPassed && 'border-[rgba(142,162,255,0.14)] bg-[rgba(142,162,255,0.16)]',
                      isTopLevelActive &&
                        'border-[rgba(194,205,255,0.28)] bg-[rgba(194,205,255,0.26)] shadow-[0_0_0_5px_rgba(142,162,255,0.055)]',
                      isUpcoming && 'border-white/[0.1] bg-white/[0.035]',
                    )}
                  />
                  <span className="relative flex min-w-0 items-start gap-2.5">
                    <span
                      aria-hidden="true"
                      className={cn(
                        'pt-0.5 text-[0.63rem] font-medium tracking-[0.16em] text-white/24',
                        (isTopLevelActive || isExactTopLevelActive) && 'text-white/42',
                        isPassed && 'text-white/32',
                      )}
                    >
                      {String(section.order).padStart(2, '0')}
                    </span>
                    <span className="min-w-0 space-y-0.5">
                      <span className="block min-w-0">{section.label}</span>
                      {isTopLevelActive ? (
                        <span
                          aria-hidden="true"
                          className="block text-[0.54rem] font-medium uppercase tracking-[0.2em] text-white/34"
                        >
                          {isExactTopLevelActive ? 'Now reading' : 'Current chapter'}
                        </span>
                      ) : null}
                      {isPassed ? (
                        <span
                          aria-hidden="true"
                          className="block text-[0.54rem] font-medium uppercase tracking-[0.2em] text-[rgba(142,162,255,0.42)]"
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

                {hasNestedDomainSections ? (
                  <ul
                    aria-label="Domain chapters"
                    className="pl-4.5 mt-1.5 space-y-0.5"
                    role="list"
                  >
                    {sectionsConfig.subsections
                      .filter((domainSection) => domainSection.parentId === section.id)
                      .map((domainSection) => {
                        const isDomainSubsectionActive = activeSectionId === domainSection.id;
                        const isPassedDomainSubsection =
                          activeSectionOrder !== null && domainSection.order < activeSectionOrder;
                        const isUpcomingDomainSubsection =
                          activeSectionOrder !== null && domainSection.order > activeSectionOrder;
                        const isNextDomainSubsection =
                          activeSectionOrder !== null &&
                          domainSection.order === activeSectionOrder + 1;

                        return (
                          <li key={domainSection.id}>
                            <a
                              href={`#${domainSection.id}`}
                              aria-current={isDomainSubsectionActive ? 'location' : undefined}
                              data-reading-state={
                                isDomainSubsectionActive
                                  ? 'current'
                                  : isNextDomainSubsection
                                    ? 'next'
                                    : isPassedDomainSubsection
                                      ? 'passed'
                                      : isUpcomingDomainSubsection
                                        ? 'upcoming'
                                        : 'idle'
                              }
                              className={cn(
                                'sonartra-motion-nav-item sonartra-result-rail-item-subtle sonartra-focus-ring text-white/35 group relative block rounded-[0.78rem] px-3 py-1.5 text-[0.73rem] leading-5 tracking-[0.012em] outline-none',
                                'hover:bg-white/[0.015] hover:text-white/56 focus-visible:text-white/78',
                                isPassedDomainSubsection && 'bg-white/[0.01] text-white/45',
                                isDomainSubsectionActive &&
                                  'bg-white/[0.022] text-white/72 shadow-[inset_0_1px_0_rgba(255,255,255,0.026)]',
                                isNextDomainSubsection && 'text-white/46',
                              )}
                            >
                              <span
                                aria-hidden="true"
                                className={cn(
                                  'sonartra-motion-active-bar sonartra-result-rail-marker absolute left-[-0.88rem] top-1/2 h-px w-3 scale-100 rounded-full bg-white/[0.08] opacity-100',
                                  isPassedDomainSubsection && 'bg-[rgba(142,162,255,0.22)]',
                                  isDomainSubsectionActive && 'bg-[rgba(194,205,255,0.34)]',
                                )}
                              />
                              <span className="relative flex min-w-0 items-center gap-2">
                                <span
                                  aria-hidden="true"
                                  className={cn(
                                    'h-1 w-1 rounded-full bg-white/[0.16]',
                                    isPassedDomainSubsection && 'bg-[rgba(142,162,255,0.3)]',
                                    isDomainSubsectionActive && 'bg-[rgba(194,205,255,0.5)]',
                                  )}
                                />
                                <span className="block min-w-0">{domainSection.label}</span>
                              </span>
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

        {utilityActions ? (
          <div className="mt-1.5 border-t border-white/[0.05] pt-3">
            <div className="flex items-center gap-2" aria-label="Report utilities" role="group">
              <UtilityIconButton label="Share on LinkedIn" onClick={handleLinkedInShare}>
                <svg
                  aria-hidden="true"
                  viewBox="0 0 24 24"
                  className="h-[1.05rem] w-[1.05rem] fill-current"
                >
                  <path d="M6.94 8.75H3.56V20h3.38V8.75ZM5.25 3C4.16 3 3.28 3.9 3.28 5s.88 2 1.97 2c1.1 0 1.98-.9 1.98-2S6.35 3 5.25 3ZM20.72 13.1c0-3.38-1.8-4.95-4.2-4.95-1.93 0-2.8 1.06-3.28 1.8v-1.2H9.87c.04.8 0 11.25 0 11.25h3.37v-6.28c0-.34.03-.67.13-.9.27-.67.9-1.37 1.95-1.37 1.38 0 1.94 1.03 1.94 2.55V20h3.37v-6.9Z" />
                </svg>
              </UtilityIconButton>
            </div>
            <p
              className="text-white/31 mt-2.5 min-h-4 text-[0.63rem] tracking-[0.02em]"
              aria-live="polite"
            >
              {utilityFeedback}
            </p>
          </div>
        ) : null}
      </div>
    </nav>
  );
}
