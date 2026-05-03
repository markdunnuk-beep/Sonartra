'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

import type { LibraryReadingRailItem } from '@/lib/library/library-article-view-model';

const OBSERVER_THRESHOLDS = [0, 0.12, 0.28, 0.5, 0.72, 1] as const;
const READING_LINE_VIEWPORT_RATIO = 0.34;
const ANCHOR_ACTIVE_LOCK_MS = 650;

function cx(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(' ');
}

function getHashId(): string | null {
  if (typeof window === 'undefined') {
    return null;
  }

  const hash = window.location.hash.replace(/^#/, '');
  return hash ? decodeURIComponent(hash) : null;
}

function pickActiveSection(sections: readonly HTMLElement[]): string | null {
  if (sections.length === 0) {
    return null;
  }

  const viewportHeight = Math.max(window.innerHeight || 0, 1);
  const readingLine = viewportHeight * READING_LINE_VIEWPORT_RATIO;
  const visibleSections = sections
    .map((section) => {
      const rect = section.getBoundingClientRect();

      return {
        id: section.id,
        top: rect.top,
        bottom: rect.bottom,
        distanceFromReadingLine: Math.abs(rect.top - readingLine),
        hasCrossedReadingLine: rect.top <= readingLine && rect.bottom > readingLine * 0.55,
      };
    })
    .filter((section) => section.bottom > 96 && section.top < viewportHeight * 0.88);

  const currentSection = visibleSections
    .filter((section) => section.hasCrossedReadingLine)
    .sort((first, second) => second.top - first.top)[0];

  if (currentSection) {
    return currentSection.id;
  }

  return (
    visibleSections.sort(
      (first, second) => first.distanceFromReadingLine - second.distanceFromReadingLine,
    )[0]?.id ??
    sections.find((section) => section.getBoundingClientRect().top > readingLine)?.id ??
    sections.at(-1)?.id ??
    null
  );
}

export function LibraryReadingRail({ items }: { items: readonly LibraryReadingRailItem[] }) {
  const itemIds = useMemo(() => items.map((item) => item.id), [items]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const activeIdRef = useRef<string | null>(null);
  const anchorLockRef = useRef<{ id: string; expiresAt: number } | null>(null);
  const frameIdRef = useRef<number | null>(null);

  useEffect(() => {
    activeIdRef.current = activeId;
  }, [activeId]);

  useEffect(() => {
    if (itemIds.length === 0 || typeof window === 'undefined') {
      return;
    }

    const sections = itemIds
      .map((id) => document.getElementById(id))
      .filter((section): section is HTMLElement => Boolean(section));

    if (sections.length === 0) {
      return;
    }

    const setNextActiveId = (nextActiveId: string | null) => {
      if (!nextActiveId || nextActiveId === activeIdRef.current) {
        return;
      }

      activeIdRef.current = nextActiveId;
      setActiveId(nextActiveId);
    };

    const resolveActiveSection = () => {
      const anchorLock = anchorLockRef.current;

      if (anchorLock) {
        if (Date.now() < anchorLock.expiresAt) {
          setNextActiveId(anchorLock.id);
          return;
        }

        anchorLockRef.current = null;
      }

      setNextActiveId(pickActiveSection(sections));
    };

    const scheduleResolveActiveSection = () => {
      if (frameIdRef.current !== null) {
        window.cancelAnimationFrame(frameIdRef.current);
      }

      frameIdRef.current = window.requestAnimationFrame(() => {
        frameIdRef.current = null;
        resolveActiveSection();
      });
    };

    const applyHashActiveSection = () => {
      const hashId = getHashId();

      if (!hashId || !itemIds.includes(hashId)) {
        return false;
      }

      anchorLockRef.current = {
        id: hashId,
        expiresAt: Date.now() + ANCHOR_ACTIVE_LOCK_MS,
      };
      setNextActiveId(hashId);
      return true;
    };

    if (!applyHashActiveSection()) {
      resolveActiveSection();
    }

    const observer =
      typeof IntersectionObserver === 'undefined'
        ? null
        : new IntersectionObserver(() => scheduleResolveActiveSection(), {
            root: null,
            rootMargin: '-10% 0px -24% 0px',
            threshold: OBSERVER_THRESHOLDS as unknown as number[],
          });

    for (const section of sections) {
      observer?.observe(section);
    }

    window.addEventListener('hashchange', applyHashActiveSection);
    window.addEventListener('resize', scheduleResolveActiveSection);

    return () => {
      if (frameIdRef.current !== null) {
        window.cancelAnimationFrame(frameIdRef.current);
      }

      observer?.disconnect();
      window.removeEventListener('hashchange', applyHashActiveSection);
      window.removeEventListener('resize', scheduleResolveActiveSection);
    };
  }, [itemIds]);

  if (items.length === 0) {
    return null;
  }

  return (
    <nav
      aria-label="In this article"
      className="rounded-2xl border border-white/10 bg-white/[0.045] p-4 backdrop-blur-sm lg:sticky lg:top-28"
      data-library-reading-rail="true"
    >
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#32D6B0]">
        In this article
      </p>
      <ol className="mt-4 space-y-2">
        {items.map((item, index) => {
          const isActive = activeId === item.id || (!activeId && index === 0);

          return (
            <li key={item.id}>
              <a
                aria-current={isActive ? 'true' : undefined}
                className={cx(
                  'group grid grid-cols-[1.8rem_1fr] gap-3 rounded-xl border-l px-2 py-2 text-sm leading-6 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#32D6B0]/45 focus-visible:ring-offset-2 focus-visible:ring-offset-[#080A0D]',
                  isActive
                    ? 'border-[#32D6B0]/70 bg-[#32D6B0]/[0.07] text-[#F5F1EA] shadow-[inset_0_1px_0_rgba(255,255,255,0.035)]'
                    : 'border-transparent text-[#D8D0C3]/70 hover:bg-white/[0.055] hover:text-[#F5F1EA]',
                )}
                data-active={isActive ? 'true' : undefined}
                href={item.href}
                onClick={() => {
                  anchorLockRef.current = {
                    id: item.id,
                    expiresAt: Date.now() + ANCHOR_ACTIVE_LOCK_MS,
                  };
                  activeIdRef.current = item.id;
                  setActiveId(item.id);
                }}
              >
                <span
                  className={cx(
                    'font-mono text-xs transition',
                    isActive ? 'text-[#32D6B0]' : 'text-[#32D6B0]/68',
                  )}
                >
                  {String(index + 1).padStart(2, '0')}
                </span>
                <span>{item.label}</span>
              </a>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
