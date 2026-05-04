'use client';

import { type MouseEvent, useId, useMemo, useState } from 'react';

import {
  createResultReadingSections,
  type ResultReadingSectionsConfig,
  type ResultReadingTopLevelSection,
} from '@/lib/results/result-reading-sections';
import {
  scrollToResultSection,
  useActiveResultSectionWithConfig,
} from '@/hooks/use-active-result-section';
import type { DraftResultRailSection } from '@/components/draft/draft-result-reading-rail';

function createDraftMobileSectionsConfig(
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

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(' ');
}

export function DraftMobileSectionNavigator({
  sections,
}: {
  sections: readonly DraftResultRailSection[];
}) {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const sectionsConfig = useMemo(() => createDraftMobileSectionsConfig(sections), [sections]);
  const activeSectionIdFromScroll = useActiveResultSectionWithConfig(sectionsConfig);
  const fallbackSectionId = sections[0]?.id ?? null;
  const activeSectionId = sectionsConfig.sectionsById[activeSectionIdFromScroll ?? '']
    ? activeSectionIdFromScroll
    : fallbackSectionId;
  const activeSection = activeSectionId ? sectionsConfig.sectionsById[activeSectionId] : null;

  function handleSectionAnchorClick(sectionId: string) {
    return (event: MouseEvent<HTMLAnchorElement>) => {
      event.preventDefault();
      setOpen(false);

      window.setTimeout(() => {
        scrollToResultSection(sectionId);
      }, 240);
    };
  }

  return (
    <nav
      aria-label="Mobile draft report sections"
      className="draft-mobile-section-nav sticky top-3 z-20 mb-3 mt-4 xl:hidden"
      data-draft-mobile-section-navigator="true"
    >
      <div className="draft-mobile-section-nav-card rounded-[1.15rem] border border-[#F3F1EA]/[0.085] bg-[#171D1A]/88 p-2 shadow-[0_18px_46px_rgba(4,7,6,0.18)] backdrop-blur-[16px]">
        <button
          type="button"
          aria-label={open ? 'Close report sections' : 'Open report sections'}
          aria-controls={panelId}
          aria-expanded={open}
          className="sonartra-focus-ring flex w-full items-center justify-between gap-3 rounded-[0.9rem] px-3 py-2.5 text-left outline-none transition hover:bg-[#F3F1EA]/[0.035] focus-visible:ring-2 focus-visible:ring-[#32D6B0]/55"
          onClick={() => setOpen((currentValue) => !currentValue)}
        >
          <span className="min-w-0">
            <span className="draft-mobile-section-kicker block font-mono text-[0.62rem] font-semibold uppercase tracking-[0.18em] text-[#32D6B0]/82">
              Reading
            </span>
            <span className="draft-mobile-section-current mt-1 block truncate text-sm font-semibold text-[#F3F1EA]/90">
              {activeSection?.label ?? 'Report sections'}
            </span>
          </span>
          <span className="flex shrink-0 items-center gap-2">
            <span className="draft-mobile-section-button-label font-mono text-[0.62rem] font-semibold uppercase tracking-[0.16em] text-[#A8B0AA]/76">
              Sections
            </span>
            <svg
              aria-hidden="true"
              className={cx('h-4 w-4 text-[#A8B0AA]/76 transition', open && 'rotate-180')}
              fill="none"
              viewBox="0 0 24 24"
            >
              <path
                d="m6 9 6 6 6-6"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="1.7"
              />
            </svg>
          </span>
        </button>

        <div
          className={cx(
            'grid transition-[grid-template-rows,opacity] duration-200',
            open ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0',
          )}
        >
          <div id={panelId} className="min-h-0 overflow-hidden">
            <ul
              className="draft-mobile-section-panel mt-2 grid gap-1 border-t border-[#F3F1EA]/[0.085] pt-2"
              role="list"
            >
              {sectionsConfig.topLevelSections.map((section) => {
                const isActive = activeSectionId === section.id;

                return (
                  <li key={section.id}>
                    <a
                      href={`#${section.id}`}
                      aria-current={isActive ? 'step' : undefined}
                      className={cx(
                        'sonartra-focus-ring draft-mobile-section-link flex items-center justify-between gap-3 rounded-[0.85rem] px-3 py-2 text-sm leading-5 text-[#A8B0AA]/78 outline-none transition',
                        'hover:bg-[#F3F1EA]/[0.035] hover:text-[#F3F1EA]/88 focus-visible:ring-2 focus-visible:ring-[#32D6B0]/55',
                        isActive &&
                          'bg-[#32D6B0]/[0.075] text-[#F3F1EA]/92 ring-1 ring-[#32D6B0]/18',
                      )}
                      onClick={handleSectionAnchorClick(section.id)}
                    >
                      <span className="min-w-0 truncate">{section.label}</span>
                      <span className="shrink-0 font-mono text-[0.62rem] tracking-[0.14em] text-inherit opacity-70">
                        {String(section.order).padStart(2, '0')}
                      </span>
                    </a>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      </div>
    </nav>
  );
}
