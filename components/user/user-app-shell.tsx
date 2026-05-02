'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useId, useState } from 'react';

import { cn } from '@/components/shared/user-app-ui';
import {
  getUserAppNavSections,
  type UserAppNavItem,
  type UserAppNavSection,
} from '@/components/user/app-shell-nav';

const SHELL_COLLAPSE_STORAGE_KEY = 'sonartra:user-shell-collapsed';
const SONARTRA_LOGO_WHITE_SRC = '/images/brand/sonartra-logo-white.svg';
const SONARTRA_MARK_WHITE_SRC = '/images/brand/sonartra-mark-white.svg';

function SidebarBrand({
  collapsed,
  titleId,
}: {
  collapsed: boolean;
  titleId: string;
}) {
  if (collapsed) {
    return (
      <span className="sonartra-shell-brand-mark flex h-10 w-10 shrink-0 items-center justify-center rounded-[1rem] border border-white/10 bg-white/[0.04]">
        <Image
          alt="Sonartra"
          className="h-[1.55rem] w-[2.25rem] object-contain"
          height={1231}
          priority
          src={SONARTRA_MARK_WHITE_SRC}
          width={1767}
        />
      </span>
    );
  }

  return (
    <span className="flex min-w-0 flex-1 flex-col gap-2">
      <Image
        alt="Sonartra"
        className="h-auto w-[8.4rem] max-w-full object-contain"
        height={1529}
        priority
        src={SONARTRA_LOGO_WHITE_SRC}
        width={6259}
      />
      <span className="sonartra-shell-brand-title block" id={titleId}>
        Workspace
      </span>
    </span>
  );
}

function SessionAvatar({ userLabel, className }: { userLabel: string; className?: string }) {
  return (
    <span
      className={cn(
        'sonartra-shell-brand-mark flex h-10 w-10 shrink-0 items-center justify-center rounded-[1rem] border border-white/10 bg-white/[0.06]',
        className,
      )}
    >
      {userLabel.charAt(0).toUpperCase()}
    </span>
  );
}

function LogoutIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24">
      <path
        d="M10.25 5.75H8.5a2 2 0 0 0-2 2v8.5a2 2 0 0 0 2 2h1.75M13 8.75l3.75 3.25L13 15.25M16.5 12H9.75"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.7"
      />
    </svg>
  );
}

function SessionFooter({
  collapsed,
  onNavigate,
  userLabel,
}: {
  collapsed: boolean;
  onNavigate?: () => void;
  userLabel: string;
}) {
  if (collapsed) {
    return (
      <div className="border-white/8 flex flex-col items-center gap-2 rounded-[1.4rem] border bg-white/[0.03] p-2">
        <div aria-label={`Workspace session: ${userLabel}`} title={userLabel}>
          <SessionAvatar
            className="border-white/8 text-white/76 bg-white/[0.03]"
            userLabel={userLabel}
          />
        </div>
        <Link
          aria-label="Log out"
          className="sonartra-focus-ring sonartra-motion-button border-white/8 hover:border-white/12 mx-auto flex h-10 w-10 items-center justify-center rounded-[1rem] border bg-white/[0.03] text-white/60 hover:bg-white/[0.06] hover:text-white"
          href="/"
          onClick={onNavigate}
          title="Log out"
        >
          <LogoutIcon className="h-4 w-4" />
        </Link>
      </div>
    );
  }

  return (
    <div className="border-white/8 rounded-[1.4rem] border bg-white/[0.03] p-3.5">
      <div className="flex items-center gap-3">
        <SessionAvatar userLabel={userLabel} />
        <div className="min-w-0 flex-1">
          <p className="sonartra-shell-session-label">Workspace session</p>
          <p className="sonartra-shell-session-value mt-1 truncate">{userLabel}</p>
        </div>
        <Link
          aria-label="Log out"
          className="sonartra-focus-ring sonartra-motion-button border-white/8 hover:border-white/12 flex h-10 w-10 shrink-0 items-center justify-center rounded-[1rem] border bg-white/[0.03] text-white/60 hover:bg-white/[0.06] hover:text-white"
          href="/"
          onClick={onNavigate}
          title="Log out"
        >
          <LogoutIcon className="h-4 w-4" />
        </Link>
      </div>
    </div>
  );
}

function isItemActive(pathname: string, item: UserAppNavItem): boolean {
  return item.match.some(
    (candidate) => pathname === candidate || pathname.startsWith(`${candidate}/`),
  );
}

function NavIcon({ icon, active }: { icon: UserAppNavItem['icon']; active: boolean }) {
  const strokeClass = active ? 'text-white' : 'text-white/62';
  const iconClass = cn('h-[1.05rem] w-[1.05rem]', strokeClass);
  const strokeWidth = 1.65;

  switch (icon) {
    case 'workspace':
      return (
        <svg className={iconClass} fill="none" viewBox="0 0 24 24">
          <path
            d="M4.5 5.5h15v5h-15zM4.5 13.5H11v5H4.5zM13 13.5h6.5v5H13z"
            stroke="currentColor"
            strokeWidth={strokeWidth}
          />
        </svg>
      );
    case 'assessments':
      return (
        <svg className={iconClass} fill="none" viewBox="0 0 24 24">
          <path
            d="M7.5 5.5h9m-9 6h9m-9 6h6m-8-12h12a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1h-12a1 1 0 0 1-1-1v-12a1 1 0 0 1 1-1Z"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={strokeWidth}
          />
        </svg>
      );
    case 'results':
      return (
        <svg className={iconClass} fill="none" viewBox="0 0 24 24">
          <path
            d="M6 17.5V13m6 4.5V6.5m6 11V10M4.5 19.5h15"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={strokeWidth}
          />
        </svg>
      );
    case 'voice':
      return (
        <svg className={iconClass} fill="none" viewBox="0 0 24 24">
          <path
            d="M12 4.75a3 3 0 0 1 3 3v4.5a3 3 0 1 1-6 0v-4.5a3 3 0 0 1 3-3Z"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={strokeWidth}
          />
          <path
            d="M6.75 11.75a5.25 5.25 0 1 0 10.5 0M12 17v2.25M9 19.25h6"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={strokeWidth}
          />
        </svg>
      );
    case 'settings':
      return (
        <svg className={iconClass} fill="none" viewBox="0 0 24 24">
          <path
            d="M12 8.25a3.75 3.75 0 1 0 0 7.5a3.75 3.75 0 0 0 0-7.5Zm8.25 3.75-.98-.57.05-1.13-1.84-3.18-1.07.32-.82-.77-3.68-.03-.83.8-1.07-.35-1.8 3.2.05 1.12-.99.6.03 3.63 1 .58-.05 1.13 1.84 3.18 1.07-.32.82.77 3.68.03.83-.8 1.07.35 1.8-3.2-.05-1.12.99-.6-.03-3.63Z"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="1.45"
          />
        </svg>
      );
    case 'admin':
      return (
        <svg className={iconClass} fill="none" viewBox="0 0 24 24">
          <path
            d="M12 3.75 5.25 6.5v4.14c0 4.12 2.48 7.96 6.32 9.77l.43.2.43-.2c3.84-1.81 6.32-5.65 6.32-9.77V6.5L12 3.75Z"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={strokeWidth}
          />
          <path
            d="M9.5 12.25 11 13.75l3.5-3.5"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={strokeWidth}
          />
        </svg>
      );
  }
}

function SidebarLink({
  item,
  collapsed,
  onNavigate,
}: {
  item: UserAppNavItem;
  collapsed: boolean;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const active = isItemActive(pathname, item);

  return (
    <Link
      aria-current={active ? 'page' : undefined}
      className={cn(
        'sonartra-focus-ring sonartra-motion-nav-item sonartra-type-nav group relative flex min-h-[3.05rem] items-center overflow-hidden rounded-[1.15rem] border outline-none',
        collapsed
          ? 'mx-auto h-11 w-11 justify-center px-0 py-0'
          : 'w-full justify-start gap-3.5 px-3 py-2.5',
        active
          ? 'border-white/14 bg-white/[0.055] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]'
          : 'border-transparent text-white/62 hover:border-white/10 hover:bg-white/[0.035] hover:text-white/90',
      )}
      data-sidebar-collapsed={collapsed ? 'true' : 'false'}
      href={item.href}
      onClick={onNavigate}
      title={collapsed ? item.label : undefined}
    >
      <span
        aria-hidden="true"
        className={cn(
          'sonartra-motion-active-bar absolute left-0 top-1/2 h-7 w-[2px] -translate-y-1/2 rounded-r-full bg-white/72',
          active ? 'translate-x-0 opacity-100' : '-translate-x-full opacity-0',
        )}
      />
      <span
        className={cn(
          'sonartra-motion-nav-icon flex h-9 w-9 shrink-0 items-center justify-center rounded-[0.9rem] border',
          active
            ? 'border-white/14 bg-white/[0.075] text-white'
            : 'border-white/7 bg-black/10 text-white/62 group-hover:border-white/10 group-hover:bg-white/[0.04] group-hover:text-white/90',
        )}
      >
        <NavIcon active={active} icon={item.icon} />
      </span>
      {!collapsed ? <span className="sonartra-shell-nav-label">{item.label}</span> : null}
    </Link>
  );
}

function SidebarSection({
  section,
  collapsed,
  onNavigate,
}: {
  section: UserAppNavSection;
  collapsed: boolean;
  onNavigate?: () => void;
}) {
  return (
    <div className={cn('sonartra-shell-nav-track space-y-1.5', collapsed && 'space-y-2.5 pr-0')}>
      {section.items.map((item) => (
        <SidebarLink collapsed={collapsed} item={item} key={item.key} onNavigate={onNavigate} />
      ))}
    </div>
  );
}

export function UserAppShell({
  children,
  canAccessAdmin,
  canAccessVoice,
  userLabel,
}: Readonly<{
  children: React.ReactNode;
  canAccessAdmin: boolean;
  canAccessVoice: boolean;
  userLabel: string;
}>) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(() => {
    if (typeof window === 'undefined') {
      return false;
    }

    return window.localStorage.getItem(SHELL_COLLAPSE_STORAGE_KEY) === 'true';
  });
  const [mobileOpen, setMobileOpen] = useState(false);
  const mobileDrawerId = useId();
  const mobileDrawerTitleId = useId();
  const mobileDrawerDescriptionId = useId();
  const navSections = getUserAppNavSections({ canAccessAdmin, canAccessVoice });
  const isAssessmentRunnerRoute = /^\/app\/assessments\/[^/]+\/attempts\/[^/]+\/?$/.test(pathname);
  const shellDesktopBreakpoint = isAssessmentRunnerRoute ? 'xl' : 'lg';
  const mobileSidebarCollapsed = collapsed && !mobileOpen;

  useEffect(() => {
    window.localStorage.setItem(SHELL_COLLAPSE_STORAGE_KEY, collapsed ? 'true' : 'false');
  }, [collapsed]);

  useEffect(() => {
    if (!mobileOpen) {
      return undefined;
    }

    const htmlStyle = document.documentElement.style;
    const bodyStyle = document.body.style;
    const previousHtmlOverflow = htmlStyle.overflow;
    const previousBodyOverflow = bodyStyle.overflow;
    const previousBodyTouchAction = bodyStyle.touchAction;
    const previousBodyPaddingRight = bodyStyle.paddingRight;
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;

    document.body.dataset.userMobileScrollLock = 'true';
    htmlStyle.overflow = 'hidden';
    bodyStyle.overflow = 'hidden';
    bodyStyle.touchAction = 'none';

    if (scrollbarWidth > 0) {
      bodyStyle.paddingRight = `${scrollbarWidth}px`;
    }

    return () => {
      delete document.body.dataset.userMobileScrollLock;
      htmlStyle.overflow = previousHtmlOverflow;
      bodyStyle.overflow = previousBodyOverflow;
      bodyStyle.touchAction = previousBodyTouchAction;
      bodyStyle.paddingRight = previousBodyPaddingRight;
    };
  }, [mobileOpen]);

  useEffect(() => {
    if (!mobileOpen) {
      return undefined;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setMobileOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [mobileOpen]);

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(96,119,255,0.08),_transparent_32%),linear-gradient(180deg,rgba(9,17,31,0.98),rgba(8,15,28,1))]">
      <div className="mx-auto flex min-h-screen w-full max-w-[1560px]">
        <aside
          aria-describedby={mobileOpen ? mobileDrawerDescriptionId : undefined}
          aria-labelledby={mobileOpen ? mobileDrawerTitleId : undefined}
          aria-modal={mobileOpen ? true : undefined}
          className={cn(
            'sonartra-scrollbar border-white/8 fixed inset-y-0 left-0 z-40 box-border flex w-[17.5rem] flex-col overflow-x-hidden bg-[linear-gradient(180deg,rgba(13,21,37,0.92),rgba(9,15,29,0.96))] px-3 py-4 shadow-[0_26px_72px_rgba(0,0,0,0.3)] backdrop-blur-xl transition-[width,transform] duration-300',
            shellDesktopBreakpoint === 'xl'
              ? 'xl:inset-y-auto xl:left-auto xl:top-5 xl:mx-4 xl:my-5 xl:h-[calc(100vh-2.5rem)] xl:translate-x-0 xl:rounded-[2rem] xl:border'
              : 'lg:inset-y-auto lg:left-auto lg:top-5 lg:mx-4 lg:my-5 lg:h-[calc(100vh-2.5rem)] lg:translate-x-0 lg:rounded-[2rem] lg:border',
            mobileSidebarCollapsed
              ? shellDesktopBreakpoint === 'xl'
                ? 'xl:w-[5.75rem]'
                : 'lg:w-[5.75rem]'
              : shellDesktopBreakpoint === 'xl'
                ? 'xl:w-[17.5rem]'
                : 'lg:w-[17.5rem]',
            mobileOpen ? 'translate-x-0' : '-translate-x-full',
            shellDesktopBreakpoint === 'xl' ? 'xl:sticky' : 'lg:sticky',
          )}
          data-user-mobile-drawer={mobileOpen ? 'open' : 'closed'}
          id={mobileDrawerId}
          role={mobileOpen ? 'dialog' : undefined}
        >
          <div
            className={cn(
              'flex items-center',
              mobileSidebarCollapsed ? 'justify-center' : 'justify-between gap-3',
            )}
          >
            <Link
              className={cn(
                'sonartra-focus-ring sonartra-motion-button border-white/8 flex items-center gap-3 rounded-[1.25rem] border bg-white/[0.03] px-3 py-3 hover:bg-white/[0.045]',
                mobileSidebarCollapsed ? 'h-12 w-12 justify-center px-0 py-0' : 'flex-1',
              )}
              href="/app/workspace"
            >
              <SidebarBrand collapsed={mobileSidebarCollapsed} titleId={mobileDrawerTitleId} />
            </Link>

            {!mobileSidebarCollapsed ? (
              <button
                aria-label="Collapse sidebar"
                className={cn(
                  'sonartra-focus-ring sonartra-motion-button border-white/8 hover:border-white/12 hidden h-9 w-9 shrink-0 items-center justify-center rounded-xl border bg-white/[0.03] text-white/55 hover:bg-white/[0.06] hover:text-white',
                  shellDesktopBreakpoint === 'xl' ? 'xl:inline-flex' : 'lg:inline-flex',
                )}
                onClick={() => setCollapsed(true)}
                type="button"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24">
                  <path
                    d="m14.5 6.5-5 5 5 5"
                    stroke="currentColor"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="1.7"
                  />
                </svg>
              </button>
            ) : null}

            {mobileOpen ? (
              <button
                aria-label="Close sidebar"
                className={cn(
                  'sonartra-focus-ring sonartra-motion-button border-white/10 text-white/68 hover:border-white/16 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-[1rem] border bg-white/[0.05] hover:bg-white/[0.08] hover:text-white',
                  shellDesktopBreakpoint === 'xl' ? 'xl:hidden' : 'lg:hidden',
                )}
                onClick={() => setMobileOpen(false)}
                type="button"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24">
                  <path
                    d="m7 7 10 10M17 7 7 17"
                    stroke="currentColor"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="1.7"
                  />
                </svg>
              </button>
            ) : null}
          </div>

          {mobileSidebarCollapsed ? (
            <button
              aria-label="Expand sidebar"
              className={cn(
                'sonartra-focus-ring sonartra-motion-button border-white/8 hover:border-white/12 mt-4 hidden h-9 w-9 self-center rounded-xl border bg-white/[0.03] text-white/55 hover:bg-white/[0.06] hover:text-white',
                shellDesktopBreakpoint === 'xl' ? 'xl:inline-flex' : 'lg:inline-flex',
              )}
              onClick={() => setCollapsed(false)}
              type="button"
            >
              <svg className="mx-auto h-4 w-4" fill="none" viewBox="0 0 24 24">
                <path
                  d="m9.5 6.5 5 5-5 5"
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="1.7"
                />
              </svg>
            </button>
          ) : null}

          {mobileOpen ? (
            <p
              className="mt-4 rounded-[1rem] border border-white/8 bg-black/10 px-3 py-2 text-sm leading-6 text-white/52 lg:hidden"
              id={mobileDrawerDescriptionId}
            >
              Workspace navigation. Close to return to the current page.
            </p>
          ) : null}

          <div className="mt-6 flex-1 space-y-4 overflow-y-auto overflow-x-hidden pb-4">
            {navSections.map((section) => (
              <SidebarSection
                collapsed={mobileSidebarCollapsed}
                key={section.key}
                onNavigate={() => setMobileOpen(false)}
                section={section}
              />
            ))}
          </div>

          <SessionFooter
            collapsed={mobileSidebarCollapsed}
            onNavigate={() => setMobileOpen(false)}
            userLabel={userLabel}
          />
        </aside>

        {mobileOpen ? (
          <button
            aria-label="Close sidebar"
            className={cn(
              'fixed inset-0 z-30 bg-black/50',
              shellDesktopBreakpoint === 'xl' ? 'xl:hidden' : 'lg:hidden',
            )}
            onClick={() => setMobileOpen(false)}
            type="button"
          />
        ) : null}

        <div
          aria-hidden={mobileOpen ? true : undefined}
          className="min-w-0 flex min-h-screen flex-1 flex-col overflow-x-clip"
          data-user-shell-content-state={mobileOpen ? 'subordinate' : 'active'}
        >
          <div
            className={cn(
              'border-white/6 flex items-center justify-between border-b',
              isAssessmentRunnerRoute
                ? 'sticky top-0 z-20 bg-[linear-gradient(180deg,rgba(9,15,29,0.96),rgba(9,15,29,0.88))] px-3 py-2.5 backdrop-blur-xl'
                : 'px-4 py-4',
              shellDesktopBreakpoint === 'xl' ? 'xl:hidden' : 'lg:hidden',
            )}
          >
            <button
              aria-controls={mobileDrawerId}
              aria-expanded={mobileOpen}
              aria-label="Open sidebar"
              className="sonartra-focus-ring sonartra-motion-button border-white/8 text-white/62 hover:border-white/12 inline-flex h-11 w-11 items-center justify-center rounded-xl border bg-white/[0.03] hover:bg-white/[0.06] hover:text-white"
              onClick={() => setMobileOpen(true)}
              type="button"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24">
                <path
                  d="M4.5 7.5h15M4.5 12h15M4.5 16.5h15"
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeWidth="1.7"
                />
              </svg>
            </button>
            <div className="min-w-0 text-center">
              <Link className="sonartra-shell-mobile-brand" href="/app/workspace">
                {isAssessmentRunnerRoute ? 'Assessment' : 'SONARTRA'}
              </Link>
              {isAssessmentRunnerRoute ? (
                <p className="sonartra-type-caption text-white/42 mt-1">Runner focus</p>
              ) : null}
            </div>
            <div className="w-11" />
          </div>

          <div
            className={cn(
              'min-w-0 flex-1',
              isAssessmentRunnerRoute
                ? 'overflow-x-clip px-0 py-0 sm:px-1 sm:py-1 md:px-2 md:py-2 xl:px-5 xl:py-5'
                : 'px-2 py-2 lg:px-5 lg:py-5',
            )}
          >
            <div
              className={cn(
                'min-h-full min-w-0',
                isAssessmentRunnerRoute
                  ? 'sm:border-white/6 border-0 bg-transparent shadow-none sm:rounded-[1.6rem] sm:border sm:bg-[linear-gradient(180deg,rgba(255,255,255,0.03),rgba(255,255,255,0.016))] sm:shadow-[0_28px_90px_rgba(0,0,0,0.22)] sm:backdrop-blur-xl'
                  : 'border-white/6 rounded-[2rem] border bg-[linear-gradient(180deg,rgba(255,255,255,0.03),rgba(255,255,255,0.016))] shadow-[0_28px_90px_rgba(0,0,0,0.22)] backdrop-blur-xl',
              )}
            >
              {children}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
