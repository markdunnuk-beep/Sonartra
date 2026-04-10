'use client';

import Image from 'next/image';
import { type ReactNode, useState } from 'react';

import { cn } from '@/components/shared/user-app-ui';
import { useActiveResultSection } from '@/hooks/use-active-result-section';
import {
  copyResultsLinkedInSharePost,
  trackResultsLinkedInOpenClicked,
  type ResultsLinkedInShareAnalytics,
} from '@/lib/results/linkedin-share-analytics';
import {
  RESULT_READING_SECTIONS,
  RESULT_READING_DOMAIN_SUBSECTIONS,
  RESULT_READING_TOP_LEVEL_SECTIONS,
} from '@/lib/results/result-reading-sections';

type ResultReadingRailProps = {
  className?: string;
  activeSectionIdOverride?: string | null;
  utilityActions?: {
    linkedInPostBody: string;
    linkedInAnalytics: ResultsLinkedInShareAnalytics;
  } | null;
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

function getSectionOrder(activeSectionId: string | null): number | null {
  if (!activeSectionId) {
    return null;
  }

  const section = RESULT_READING_SECTIONS.find((entry) => entry.id === activeSectionId);
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
      className={cn(className, disabled && 'cursor-not-allowed text-white/34 hover:text-white/34')}
    >
      {children}
    </button>
  );
}

export function ResultReadingRail({
  className,
  activeSectionIdOverride,
  utilityActions,
}: ResultReadingRailProps) {
  const activeSectionIdFromScroll = useActiveResultSection();
  const activeSectionId = activeSectionIdOverride ?? activeSectionIdFromScroll;
  const activeTopLevelId = getTopLevelActiveId(activeSectionId);
  const activeSectionOrder = getSectionOrder(activeSectionId);
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
      <div className="sticky top-[6.35rem] space-y-3">
        <div className="pb-5 pl-1">
          <Image
            src="/images/sonartra-logo.svg"
            alt="Sonartra"
            width={174}
            height={28}
            className="w-[150px] h-auto opacity-[0.9]"
          />
        </div>
        <ul className="sonartra-result-rail-track relative space-y-0.5 pl-1.5" role="list">
          {RESULT_READING_TOP_LEVEL_SECTIONS.map((section) => {
            const isTopLevelActive = activeTopLevelId === section.id;
            const isExactTopLevelActive = activeSectionId === section.id;
            const hasNestedDomainSections = section.id === 'domains';
            const isPassed =
              activeSectionOrder !== null && section.order < activeSectionOrder && !isTopLevelActive;
            const isUpcoming =
              activeSectionOrder !== null && section.order > activeSectionOrder && !isTopLevelActive;
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
                    'sonartra-motion-nav-item sonartra-result-rail-item sonartra-focus-ring group relative block rounded-[0.95rem] px-3 py-2 text-[0.79rem] leading-5 tracking-[0.01em] text-white/47 outline-none',
                    'hover:text-white/67 focus-visible:text-white/84',
                    isPassed && 'text-white/58',
                    isTopLevelActive && 'bg-white/[0.032] text-white/84 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]',
                    isNext && 'text-white/56',
                  )}
                >
                  <span
                    aria-hidden="true"
                    className={cn(
                      'sonartra-motion-active-bar sonartra-result-rail-marker absolute left-[-0.6rem] top-1/2 h-2.5 w-2.5 -translate-y-1/2 rounded-full border border-white/[0.18] bg-[#0b1221] opacity-100 scale-100',
                      isPassed && 'border-white/[0.18] bg-white/[0.16]',
                      isTopLevelActive && 'border-white/[0.3] bg-white/[0.34] shadow-[0_0_0_5px_rgba(255,255,255,0.04)]',
                      isUpcoming && 'border-white/[0.14] bg-white/[0.06]',
                    )}
                  />
                  <span className="relative flex min-w-0 items-start gap-2.5">
                    <span
                      aria-hidden="true"
                      className={cn(
                        'pt-0.5 text-[0.64rem] font-medium tracking-[0.14em] text-white/30',
                        (isTopLevelActive || isExactTopLevelActive) && 'text-white/48',
                        isPassed && 'text-white/37',
                      )}
                    >
                      {String(section.order).padStart(2, '0')}
                    </span>
                    <span className="min-w-0 space-y-0.5">
                      <span className="block min-w-0">{section.label}</span>
                      {isTopLevelActive ? (
                        <span
                          aria-hidden="true"
                          className="block text-[0.58rem] font-medium uppercase tracking-[0.18em] text-white/42"
                        >
                          {isExactTopLevelActive ? 'Now reading' : 'Current chapter'}
                        </span>
                      ) : null}
                      {isNext ? (
                        <span
                          aria-hidden="true"
                          className="block text-[0.58rem] font-medium uppercase tracking-[0.18em] text-white/28"
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
                    className="mt-1.5 space-y-0.5 pl-4.5"
                    role="list"
                  >
                    {RESULT_READING_DOMAIN_SUBSECTIONS.map((domainSection) => {
                      const isDomainSubsectionActive = activeSectionId === domainSection.id;
                      const isPassedDomainSubsection =
                        activeSectionOrder !== null && domainSection.order < activeSectionOrder;
                      const isUpcomingDomainSubsection =
                        activeSectionOrder !== null && domainSection.order > activeSectionOrder;
                      const isNextDomainSubsection =
                        activeSectionOrder !== null && domainSection.order === activeSectionOrder + 1;

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
                              'sonartra-motion-nav-item sonartra-result-rail-item-subtle sonartra-focus-ring group relative block rounded-[0.8rem] px-3 py-1.5 text-[0.74rem] leading-5 tracking-[0.012em] text-white/41 outline-none',
                              'hover:text-white/62 focus-visible:text-white/82',
                              isPassedDomainSubsection && 'text-white/50',
                              isDomainSubsectionActive &&
                                'bg-white/[0.024] text-white/79 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]',
                              isNextDomainSubsection && 'text-white/52',
                            )}
                          >
                            <span
                              aria-hidden="true"
                              className={cn(
                                'sonartra-motion-active-bar sonartra-result-rail-marker absolute left-[-0.88rem] top-1/2 h-px w-3 rounded-full bg-white/[0.12] opacity-100 scale-100',
                                isPassedDomainSubsection && 'bg-white/[0.2]',
                                isDomainSubsectionActive && 'bg-white/[0.4]',
                              )}
                            />
                            <span className="relative flex min-w-0 items-center gap-2">
                              <span
                                aria-hidden="true"
                                className={cn(
                                  'h-1 w-1 rounded-full bg-white/[0.22]',
                                  isPassedDomainSubsection && 'bg-white/[0.3]',
                                  isDomainSubsectionActive && 'bg-white/[0.54]',
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

        <div className="mt-1.5 border-t border-white/[0.06] pt-3.5">
          <div className="flex items-center gap-2" aria-label="Report utilities" role="group">
            <UtilityIconButton
              label="Share on LinkedIn"
              onClick={handleLinkedInShare}
              disabled={!utilityActions}
            >
              <svg
                aria-hidden="true"
                viewBox="0 0 24 24"
                className="h-[1.05rem] w-[1.05rem] fill-current"
              >
                <path d="M6.94 8.75H3.56V20h3.38V8.75ZM5.25 3C4.16 3 3.28 3.9 3.28 5s.88 2 1.97 2c1.1 0 1.98-.9 1.98-2S6.35 3 5.25 3ZM20.72 13.1c0-3.38-1.8-4.95-4.2-4.95-1.93 0-2.8 1.06-3.28 1.8v-1.2H9.87c.04.8 0 11.25 0 11.25h3.37v-6.28c0-.34.03-.67.13-.9.27-.67.9-1.37 1.95-1.37 1.38 0 1.94 1.03 1.94 2.55V20h3.37v-6.9Z" />
              </svg>
            </UtilityIconButton>
            <UtilityIconButton label="Share by email" href="mailto:?subject=My%20Sonartra%20results">
              <svg
                aria-hidden="true"
                viewBox="0 0 24 24"
                className="h-[1.05rem] w-[1.05rem] fill-current"
              >
                <path d="M3 6.75A2.75 2.75 0 0 1 5.75 4h12.5A2.75 2.75 0 0 1 21 6.75v10.5A2.75 2.75 0 0 1 18.25 20H5.75A2.75 2.75 0 0 1 3 17.25V6.75Zm2.2-.17 6.23 4.7a1 1 0 0 0 1.2 0l6.18-4.67a1.25 1.25 0 0 0-.56-.11H5.75c-.2 0-.38.03-.55.08Zm14.3 2.28-5.36 4.05a2.75 2.75 0 0 1-3.3 0L5.5 8.9v8.35c0 .14.11.25.25.25h12.5c.14 0 .25-.11.25-.25V8.86Z" />
              </svg>
            </UtilityIconButton>
            <UtilityIconButton label="Download PDF" disabled>
              <svg
                aria-hidden="true"
                viewBox="0 0 24 24"
                className="h-[1.05rem] w-[1.05rem] fill-current"
              >
                <path d="M6 3.75A2.75 2.75 0 0 1 8.75 1h5.6c.73 0 1.43.29 1.95.81l2.89 2.89c.52.52.81 1.22.81 1.95v11.6A2.75 2.75 0 0 1 17.25 21h-8.5A2.75 2.75 0 0 1 6 18.25V3.75Zm7.25-.25v3.25c0 .69.56 1.25 1.25 1.25h3.25l-4.5-4.5ZM9.5 14.25a.75.75 0 0 0-1.5 0v2.5a.75.75 0 0 0 1.5 0v-.5h.75a2 2 0 1 0 0-4H9.5v2Zm.75-1h-.75v1.5h.75a.75.75 0 1 0 0-1.5Zm5 0h-.75a.75.75 0 0 0 0 1.5h.75a.75.75 0 1 0 0-1.5Zm-1.5-1.5a.75.75 0 0 0 0 1.5h2a.75.75 0 0 0 0-1.5h-2Z" />
              </svg>
            </UtilityIconButton>
          </div>
          <p
            className="mt-2.5 min-h-4 text-[0.63rem] tracking-[0.02em] text-white/31"
            aria-live="polite"
          >
            {utilityFeedback || 'PDF export coming soon'}
          </p>
        </div>
      </div>
    </nav>
  );
}
