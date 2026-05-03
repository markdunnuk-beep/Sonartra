'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
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
  const pathname = usePathname();
  const desktopNavItems = PUBLIC_SITE_PRIMARY_NAV_ITEMS.filter((item) => item.href !== pathname);

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
    <header className="relative z-30 px-4 pt-5 sm:px-6 lg:px-8">
      <div className="relative mx-auto flex min-h-16 w-full max-w-7xl items-center justify-between gap-3 rounded-full border border-white/20 bg-white/[0.10] px-3 py-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.16),0_18px_48px_rgba(0,0,0,0.20)] backdrop-blur-[20px] backdrop-saturate-[1.35] sm:px-4">
        <div className="flex min-w-0 flex-1 items-center justify-start">
          <nav
            aria-label="Primary"
            className="hidden items-center gap-4 pl-2 text-sm font-medium text-white/72 xl:flex 2xl:gap-5"
          >
            {desktopNavItems.map((item) => (
              <Link
                className="whitespace-nowrap rounded-full px-1.5 py-2 transition hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/35 focus-visible:ring-offset-2 focus-visible:ring-offset-[#090B0F]"
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
            className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/16 bg-white/[0.06] text-white/86 transition hover:border-white/24 hover:bg-white/[0.10] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/35 focus-visible:ring-offset-2 focus-visible:ring-offset-[#090B0F] xl:hidden"
            onClick={() => setMobileOpen((currentValue) => !currentValue)}
            type="button"
          >
            <MenuIcon />
          </button>
        </div>

        <Link
          aria-label="Sonartra home"
          className="absolute left-1/2 top-1/2 rounded-full px-3 py-2 [transform:translate(-50%,-50%)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/35 focus-visible:ring-offset-2 focus-visible:ring-offset-[#090B0F]"
          href="/"
        >
          <Image
            alt="Sonartra"
            className="block h-auto w-[142px] sm:w-[168px] xl:w-[178px]"
            height={44}
            priority
            src="/images/brand/sonartra-logo-white.svg"
            unoptimized
            width={180}
          />
        </Link>

        <div className="flex min-w-0 flex-1 items-center justify-end gap-2 sm:gap-3">
          <div className="hidden items-center justify-end gap-3 pr-1 xl:flex">
            <Link
              className="rounded-full border border-white/12 px-4 py-2 text-sm font-medium text-white/78 transition hover:border-white/22 hover:bg-white/[0.06] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/35 focus-visible:ring-offset-2 focus-visible:ring-offset-[#090B0F]"
              href="/sign-in"
            >
              Login
            </Link>
            <Link
              className="rounded-full border border-[#32D6B0]/28 bg-[#32D6B0] px-4 py-2 text-sm font-semibold text-[#07100f] transition hover:bg-[#52E1C0] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#32D6B0]/45 focus-visible:ring-offset-2 focus-visible:ring-offset-[#090B0F]"
              href="/sign-up"
            >
              Get Started
            </Link>
          </div>

          <Link
            className="rounded-full border border-[#32D6B0]/28 bg-[#32D6B0] px-3 py-2 text-xs font-semibold text-[#07100f] transition hover:bg-[#52E1C0] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#32D6B0]/45 focus-visible:ring-offset-2 focus-visible:ring-offset-[#090B0F] sm:px-4 xl:hidden"
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
          'fixed inset-x-4 top-[5.75rem] z-50 overflow-hidden rounded-[1.4rem] border border-white/16 bg-[#0b1322]/92 shadow-[0_24px_72px_rgba(0,0,0,0.34)] backdrop-blur-[20px] backdrop-saturate-[1.35] xl:hidden',
          mobileOpen ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0',
        ].join(' ')}
        hidden={!mobileOpen}
        id={mobileMenuId}
        role="dialog"
      >
        <nav aria-label="Mobile primary" className="flex flex-col px-4 py-4">
          <span
            className="mb-3 px-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-white/48"
            id={mobileMenuLabelId}
          >
            Navigate
          </span>

          {PUBLIC_SITE_PRIMARY_NAV_ITEMS.map((item) => (
            <Link
              className="rounded-xl px-3 py-3 text-[0.98rem] font-medium text-white/82 transition hover:bg-white/[0.06] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/35 focus-visible:ring-offset-2 focus-visible:ring-offset-[#09111f]"
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
                    ? 'border border-[#32D6B0]/28 bg-[#32D6B0] text-[#07100f] hover:bg-[#52E1C0]'
                    : 'border border-white/12 bg-white/[0.04] text-white/82 hover:bg-white/[0.08] hover:text-white',
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
