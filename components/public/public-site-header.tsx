'use client';

import Link from 'next/link';
import { useEffect, useId, useState } from 'react';

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
  const mobileMenuId = useId();
  const mobileMenuLabelId = useId();

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

  return (
    <header className="border-b border-white/10 bg-background/90 backdrop-blur">
      <div className="mx-auto flex min-h-16 w-full max-w-6xl items-center justify-between gap-4 px-5 sm:px-6">
        <Link
          className="text-sm font-semibold tracking-[0.2em] text-white/80 transition hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30 focus-visible:ring-offset-2 focus-visible:ring-offset-[#09111f]"
          href="/"
        >
          SONARTRA
        </Link>

        <nav
          aria-label="Primary"
          className="hidden items-center gap-6 text-sm text-white/70 xl:flex"
        >
          {PUBLIC_SITE_PRIMARY_NAV_ITEMS.map((item) => (
            <Link
              className="transition hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30 focus-visible:ring-offset-2 focus-visible:ring-offset-[#09111f]"
              href={item.href}
              key={item.href}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-3 xl:flex">
          <Link
            className="rounded-full border border-white/12 px-4 py-2 text-sm font-medium text-white/78 transition hover:border-white/20 hover:bg-white/5 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30 focus-visible:ring-offset-2 focus-visible:ring-offset-[#09111f]"
            href="/sign-in"
          >
            Login
          </Link>
          <Link
            className="rounded-full border border-white/14 bg-white px-4 py-2 text-sm font-semibold text-[#08101b] transition hover:bg-white/92 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30 focus-visible:ring-offset-2 focus-visible:ring-offset-[#09111f]"
            href="/get-started"
          >
            Get Started
          </Link>
        </div>

        <button
          aria-controls={mobileMenuId}
          aria-expanded={mobileOpen}
          aria-label={mobileOpen ? 'Close navigation menu' : 'Open navigation menu'}
          className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/12 bg-white/[0.03] text-white/82 transition hover:border-white/18 hover:bg-white/[0.06] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30 focus-visible:ring-offset-2 focus-visible:ring-offset-[#09111f] xl:hidden"
          onClick={() => setMobileOpen((currentValue) => !currentValue)}
          type="button"
        >
          <MenuIcon />
        </button>
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
        aria-labelledby={mobileMenuLabelId}
        className={[
          'fixed inset-x-4 top-[4.5rem] z-50 overflow-hidden rounded-[1.4rem] border border-white/10 bg-[#0b1322]/96 shadow-[0_24px_72px_rgba(0,0,0,0.34)] backdrop-blur xl:hidden',
          mobileOpen ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0',
        ].join(' ')}
        hidden={!mobileOpen}
        id={mobileMenuId}
        role="dialog"
      >
        <nav aria-label="Mobile primary" className="flex flex-col px-4 py-4">
          <span
            className="mb-3 px-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-white/40"
            id={mobileMenuLabelId}
          >
            Navigate
          </span>

          {PUBLIC_SITE_PRIMARY_NAV_ITEMS.map((item) => (
            <Link
              className="rounded-xl px-3 py-3 text-[0.98rem] font-medium text-white/80 transition hover:bg-white/[0.05] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30 focus-visible:ring-offset-2 focus-visible:ring-offset-[#09111f]"
              href={item.href}
              key={item.href}
              onClick={closeMobileMenu}
            >
              {item.label}
            </Link>
          ))}

          <div className="mt-3 grid gap-2 border-t border-white/8 pt-3">
            {PUBLIC_SITE_SECONDARY_NAV_ITEMS.map((item) => (
              <Link
                className={[
                  'rounded-xl px-3 py-3 text-[0.98rem] font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30 focus-visible:ring-offset-2 focus-visible:ring-offset-[#09111f]',
                  item.label === 'Get Started'
                    ? 'border border-white/12 bg-white text-[#08101b] hover:bg-white/92'
                    : 'border border-white/10 bg-white/[0.03] text-white/82 hover:bg-white/[0.06] hover:text-white',
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
