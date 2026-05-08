'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useId, useState } from 'react';

import {
  DRAFT_FOCUS_MODE_CHANGE_EVENT,
  DRAFT_READING_MODE_CHANGE_EVENT,
  type DraftFocusModeChangeEvent,
  type DraftReadingMode,
  type DraftReadingModeChangeEvent,
} from '@/components/draft/draft-display-mode-events';
import {
  PUBLIC_SITE_PRIMARY_NAV_ITEMS,
  PUBLIC_SITE_SECONDARY_NAV_ITEMS,
} from '@/lib/public/public-site-nav';

function MenuIcon() {
  return (
    <svg
      aria-hidden="true"
      className="h-4 w-4"
      fill="none"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M4 7h16M4 12h16M4 17h16"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.75"
      />
    </svg>
  );
}

export function PublicSiteHeader() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [draftFocusMode, setDraftFocusMode] = useState(false);
  const [draftReadingMode, setDraftReadingMode] = useState<DraftReadingMode>('dark');
  const mobileMenuId = useId();
  const mobileMenuLabelId = useId();
  const pathname = usePathname();
  const desktopNavItems = PUBLIC_SITE_PRIMARY_NAV_ITEMS.filter((item) => item.href !== pathname);
  const isDraftDisplayModeRoute =
    pathname === '/draft-result' ||
    pathname === '/draft-runner' ||
    pathname === '/draft-ranked-pattern-result';
  const hidesHeaderInDraftFocusMode =
    pathname === '/draft-result' || pathname === '/draft-ranked-pattern-result';
  const isDraftFocusMode = hidesHeaderInDraftFocusMode && draftFocusMode;
  const isDraftLightMode = isDraftDisplayModeRoute && draftReadingMode === 'light';

  useEffect(() => {
    if (!mobileOpen) {
      document.body.style.removeProperty('overflow');
      return;
    }

    const previousOverflow = document.body.style.overflow;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setMobileOpen(false);
      }
    };

    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [mobileOpen]);

  const closeMobileMenu = () => setMobileOpen(false);

  useEffect(() => {
    if (!isDraftDisplayModeRoute) {
      return;
    }

    const handleDraftReadingModeChange = (event: Event) => {
      const mode = (event as DraftReadingModeChangeEvent).detail?.mode;

      if (mode === 'dark' || mode === 'light') {
        setDraftReadingMode(mode);
      }
    };

    window.addEventListener(DRAFT_READING_MODE_CHANGE_EVENT, handleDraftReadingModeChange);

    return () => {
      window.removeEventListener(DRAFT_READING_MODE_CHANGE_EVENT, handleDraftReadingModeChange);
    };
  }, [isDraftDisplayModeRoute]);

  useEffect(() => {
    if (!isDraftDisplayModeRoute) {
      return;
    }

    const handleDraftFocusModeChange = (event: Event) => {
      const focusMode = (event as DraftFocusModeChangeEvent).detail?.focusMode;

      if (typeof focusMode === 'boolean') {
        setDraftFocusMode(focusMode);
      }
    };

    window.addEventListener(DRAFT_FOCUS_MODE_CHANGE_EVENT, handleDraftFocusModeChange);

    return () => {
      window.removeEventListener(DRAFT_FOCUS_MODE_CHANGE_EVENT, handleDraftFocusModeChange);
    };
  }, [isDraftDisplayModeRoute]);

  return (
    <header
      className={[
        'relative z-30 px-4 pt-5 transition duration-300 sm:px-6 lg:px-8',
        isDraftFocusMode &&
          'xl:pointer-events-none xl:fixed xl:inset-x-0 xl:top-0 xl:-translate-y-4 xl:opacity-0',
      ]
        .filter(Boolean)
        .join(' ')}
      data-draft-focus-mode={isDraftFocusMode ? 'true' : 'false'}
      data-public-site-header="true"
    >
      <div
        className={[
          'relative mx-auto flex min-h-16 w-full max-w-7xl items-center justify-between gap-3 rounded-full px-3 py-2 backdrop-blur-[20px] backdrop-saturate-[1.35] sm:px-4',
          isDraftLightMode
            ? 'border border-[#17201C]/15 bg-[rgba(250,248,243,0.82)] shadow-[inset_0_1px_0_rgba(255,255,255,0.72),0_18px_48px_rgba(58,51,42,0.10)]'
            : 'border border-white/20 bg-white/[0.10] shadow-[inset_0_1px_0_rgba(255,255,255,0.16),0_18px_48px_rgba(0,0,0,0.20)]',
        ].join(' ')}
      >
        <div className="flex min-w-0 flex-1 items-center justify-start">
          <nav
            aria-label="Primary"
            className={[
              'hidden items-center gap-4 pl-2 text-sm font-medium xl:flex 2xl:gap-5',
              isDraftLightMode ? 'text-[#27322D]/78' : 'text-white/72',
            ].join(' ')}
            style={isDraftLightMode ? { color: 'rgba(39, 50, 45, 0.82)' } : undefined}
          >
            {desktopNavItems.map((item) => (
              <Link
                className={[
                  'whitespace-nowrap rounded-full px-1.5 py-2 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
                  isDraftLightMode
                    ? 'hover:text-[#17201C] focus-visible:ring-[#137F70]/35 focus-visible:ring-offset-[#F4F1EA]'
                    : 'hover:text-white focus-visible:ring-white/35 focus-visible:ring-offset-[#090B0F]',
                ].join(' ')}
                href={item.href}
                key={item.href}
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <button
            aria-controls={mobileMenuId}
            aria-expanded={mobileOpen}
            aria-label={mobileOpen ? 'Close navigation menu' : 'Open navigation menu'}
            className={[
              'inline-flex h-11 w-11 items-center justify-center rounded-full border transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 xl:hidden',
              isDraftLightMode
                ? 'border-[#17201C]/14 hover:border-[#17201C]/24 bg-[#17201C]/[0.045] text-[#27322D] hover:bg-[#17201C]/[0.075] hover:text-[#17201C] focus-visible:ring-[#137F70]/35 focus-visible:ring-offset-[#F4F1EA]'
                : 'border-white/16 text-white/86 hover:border-white/24 bg-white/[0.06] hover:bg-white/[0.10] hover:text-white focus-visible:ring-white/35 focus-visible:ring-offset-[#090B0F]',
            ].join(' ')}
            style={isDraftLightMode ? { color: '#27322D' } : undefined}
            onClick={() => setMobileOpen((currentValue) => !currentValue)}
            type="button"
          >
            <MenuIcon />
          </button>
        </div>

        <Link
          aria-label="Sonartra home"
          className={[
            'absolute left-1/2 top-1/2 rounded-full px-3 py-2 [transform:translate(-50%,-50%)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
            isDraftLightMode
              ? 'focus-visible:ring-[#137F70]/35 focus-visible:ring-offset-[#F4F1EA]'
              : 'focus-visible:ring-white/35 focus-visible:ring-offset-[#090B0F]',
          ].join(' ')}
          href="/"
        >
          <Image
            alt="Sonartra"
            className="block h-auto w-[142px] sm:w-[168px] xl:w-[178px]"
            height={44}
            priority
            src={
              isDraftLightMode
                ? '/images/brand/sonartra-logo-black.svg'
                : '/images/brand/sonartra-logo-white.svg'
            }
            unoptimized
            width={180}
          />
        </Link>

        <div className="flex min-w-0 flex-1 items-center justify-end gap-2 sm:gap-3">
          <div className="hidden items-center justify-end gap-3 pr-1 xl:flex">
            <Link
              className={[
                'rounded-full border px-4 py-2 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
                isDraftLightMode
                  ? 'border-[#17201C]/16 text-[#27322D]/82 hover:border-[#137F70]/28 hover:bg-[#137F70]/[0.07] hover:text-[#17201C] focus-visible:ring-[#137F70]/35 focus-visible:ring-offset-[#F4F1EA]'
                  : 'border-white/12 text-white/78 hover:border-white/22 hover:bg-white/[0.06] hover:text-white focus-visible:ring-white/35 focus-visible:ring-offset-[#090B0F]',
              ].join(' ')}
              style={
                isDraftLightMode
                  ? { borderColor: 'rgba(23, 32, 28, 0.16)', color: 'rgba(39, 50, 45, 0.86)' }
                  : undefined
              }
              href="/sign-in"
            >
              Login
            </Link>
            <Link
              className="border-[#32D6B0]/28 rounded-full border bg-[#32D6B0] px-4 py-2 text-sm font-semibold text-[#07100f] transition hover:bg-[#52E1C0] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#32D6B0]/45 focus-visible:ring-offset-2 focus-visible:ring-offset-[#090B0F]"
              href="/sign-up"
            >
              Get Started
            </Link>
          </div>

          <Link
            className="border-[#32D6B0]/28 rounded-full border bg-[#32D6B0] px-3 py-2 text-xs font-semibold text-[#07100f] transition hover:bg-[#52E1C0] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#32D6B0]/45 focus-visible:ring-offset-2 focus-visible:ring-offset-[#090B0F] sm:px-4 xl:hidden"
            href="/sign-up"
          >
            Start
          </Link>
        </div>
      </div>

      {mobileOpen ? (
        <button
          aria-label="Close navigation menu"
          className="fixed inset-0 z-40 bg-[#02060d]/55 backdrop-blur-[2px] xl:hidden"
          onClick={closeMobileMenu}
          type="button"
        />
      ) : null}

      <div
        aria-modal="true"
        aria-labelledby={mobileMenuLabelId}
        className={[
          'border-white/16 bg-[#0b1322]/92 fixed inset-x-4 top-[5.75rem] z-50 overflow-hidden rounded-[1.4rem] border shadow-[0_24px_72px_rgba(0,0,0,0.34)] backdrop-blur-[20px] backdrop-saturate-[1.35] xl:hidden',
          mobileOpen ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0',
        ].join(' ')}
        hidden={!mobileOpen}
        id={mobileMenuId}
        role="dialog"
      >
        <nav aria-label="Mobile primary" className="flex flex-col px-4 py-4">
          <span
            className="text-white/48 mb-3 px-2 text-[11px] font-semibold uppercase tracking-[0.16em]"
            id={mobileMenuLabelId}
          >
            Navigate
          </span>

          {PUBLIC_SITE_PRIMARY_NAV_ITEMS.map((item) => (
            <Link
              className="text-white/82 rounded-xl px-3 py-3 text-[0.98rem] font-medium transition hover:bg-white/[0.06] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/35 focus-visible:ring-offset-2 focus-visible:ring-offset-[#09111f]"
              href={item.href}
              key={item.href}
              onClick={closeMobileMenu}
            >
              {item.label}
            </Link>
          ))}

          <div className="mt-3 grid gap-2 border-t border-white/10 pt-3">
            {PUBLIC_SITE_SECONDARY_NAV_ITEMS.map((item) => (
              <Link
                className={[
                  'rounded-xl px-3 py-3 text-[0.98rem] font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/35 focus-visible:ring-offset-2 focus-visible:ring-offset-[#09111f]',
                  item.label === 'Get Started'
                    ? 'border-[#32D6B0]/28 border bg-[#32D6B0] text-[#07100f] hover:bg-[#52E1C0]'
                    : 'border-white/12 text-white/82 border bg-white/[0.04] hover:bg-white/[0.08] hover:text-white',
                ].join(' ')}
                href={item.href}
                key={item.href}
                onClick={closeMobileMenu}
              >
                {item.label}
              </Link>
            ))}
          </div>
        </nav>
      </div>
    </header>
  );
}
