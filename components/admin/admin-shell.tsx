'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';

import { cn } from '@/components/shared/user-app-ui';

import { adminNavItems, isAdminNavItemActive, type AdminNavItem } from './admin-shell-nav';

const ADMIN_SHELL_COLLAPSE_STORAGE_KEY = 'sonartra:admin-shell-collapsed';

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

function NavIcon({ itemKey, active }: { itemKey: AdminNavItem['key']; active: boolean }) {
  const strokeClass = active ? 'text-white' : 'text-white/58';

  switch (itemKey) {
    case 'dashboard':
      return (
        <svg className={cn('h-5 w-5', strokeClass)} fill="none" viewBox="0 0 24 24">
          <path
            d="M4.5 5.5h15v5h-15zM4.5 13.5H11v5H4.5zM13 13.5h6.5v5H13z"
            stroke="currentColor"
            strokeWidth="1.7"
          />
        </svg>
      );
    case 'assessments':
      return (
        <svg className={cn('h-5 w-5', strokeClass)} fill="none" viewBox="0 0 24 24">
          <path
            d="M7.5 5.5h9m-9 6h9m-9 6h6m-8-12h12a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1h-12a1 1 0 0 1-1-1v-12a1 1 0 0 1 1-1Z"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="1.7"
          />
        </svg>
      );
    case 'organisations':
      return (
        <svg className={cn('h-5 w-5', strokeClass)} fill="none" viewBox="0 0 24 24">
          <path
            d="M4.5 18.5h15M6.75 18.5v-9.75h4.5v9.75M12.75 18.5v-6.5h4.5v6.5M5.75 8.75 12 4.75l6.25 4"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="1.7"
          />
        </svg>
      );
    case 'users':
      return (
        <svg className={cn('h-5 w-5', strokeClass)} fill="none" viewBox="0 0 24 24">
          <path
            d="M8.25 11a3.25 3.25 0 1 0 0-6.5a3.25 3.25 0 0 0 0 6.5Zm7.5 1.5a2.75 2.75 0 1 0 0-5.5a2.75 2.75 0 0 0 0 5.5ZM3.75 18a4.5 4.5 0 0 1 9 0M13.25 18a3.75 3.75 0 0 1 7.5 0"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="1.7"
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
  item: AdminNavItem;
  collapsed: boolean;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const active = isAdminNavItemActive(pathname, item);

  return (
    <Link
      aria-current={active ? 'page' : undefined}
      className={cn(
        'sonartra-focus-ring sonartra-motion-nav-item sonartra-type-nav group relative flex min-h-12 w-full items-center gap-3 overflow-hidden rounded-2xl border px-3 py-2.5',
        collapsed ? 'justify-center px-0' : 'justify-start',
        active
          ? 'border-white/12 bg-white/[0.06] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]'
          : 'text-white/58 hover:border-white/8 hover:text-white/88 border-transparent hover:bg-white/[0.035]',
      )}
      href={item.href}
      onClick={onNavigate}
      title={collapsed ? item.label : undefined}
    >
      <span
        aria-hidden="true"
        className={cn(
          'sonartra-motion-active-bar absolute left-0 top-1/2 h-8 w-[3px] -translate-y-1/2 rounded-r-full bg-white/70',
          active ? 'translate-x-0 opacity-100' : '-translate-x-full opacity-0',
        )}
      />
      <span
        className={cn(
          'sonartra-motion-nav-icon flex h-10 w-10 shrink-0 items-center justify-center rounded-[1rem] border',
          active
            ? 'border-white/12 bg-white/[0.08]'
            : 'border-white/6 group-hover:border-white/8 bg-black/10 group-hover:bg-white/[0.04]',
        )}
      >
        <NavIcon active={active} itemKey={item.key} />
      </span>
      {!collapsed ? (
        <span className="min-w-0 space-y-1">
          <span className="sonartra-shell-nav-label">{item.label}</span>
          <span className="sonartra-shell-nav-meta">{item.description}</span>
        </span>
      ) : null}
    </Link>
  );
}

export function AdminShell({
  children,
  userLabel,
}: Readonly<{
  children: React.ReactNode;
  userLabel: string;
}>) {
  const [collapsed, setCollapsed] = useState(() => {
    if (typeof window === 'undefined') {
      return false;
    }

    return window.localStorage.getItem(ADMIN_SHELL_COLLAPSE_STORAGE_KEY) === 'true';
  });
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    window.localStorage.setItem(ADMIN_SHELL_COLLAPSE_STORAGE_KEY, collapsed ? 'true' : 'false');
  }, [collapsed]);

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(96,119,255,0.08),_transparent_32%),linear-gradient(180deg,rgba(9,17,31,0.98),rgba(8,15,28,1))]">
      <div className="mx-auto flex min-h-screen w-full max-w-[1680px]">
        <aside
          className={cn(
            'sonartra-scrollbar border-white/8 fixed inset-y-0 left-0 z-40 box-border flex w-[18.5rem] flex-col overflow-x-hidden bg-[linear-gradient(180deg,rgba(13,21,37,0.92),rgba(9,15,29,0.96))] px-3 py-4 shadow-[0_26px_72px_rgba(0,0,0,0.3)] backdrop-blur-xl transition-[width,transform] duration-300 lg:inset-y-auto lg:left-auto lg:top-5 lg:mx-4 lg:my-5 lg:h-[calc(100vh-2.5rem)] lg:translate-x-0 lg:rounded-[2rem] lg:border',
            collapsed ? 'lg:w-[5.75rem]' : 'lg:w-[18.5rem]',
            mobileOpen ? 'translate-x-0' : '-translate-x-full',
            'lg:sticky',
          )}
        >
          <div
            className={cn(
              'flex items-center',
              collapsed ? 'justify-center' : 'justify-between gap-3',
            )}
          >
            <Link
              className={cn(
                'sonartra-focus-ring sonartra-motion-button border-white/8 flex items-center gap-3 rounded-[1.25rem] border bg-white/[0.03] px-3 py-3 hover:bg-white/[0.045]',
                collapsed ? 'h-12 w-12 justify-center px-0 py-0' : 'flex-1',
              )}
              href="/admin"
            >
              <span className="sonartra-shell-brand-mark flex h-10 w-10 shrink-0 items-center justify-center rounded-[1rem] border border-white/10 bg-accent/15">
                A
              </span>
              {!collapsed ? (
                <span className="space-y-1">
                  <span className="sonartra-shell-brand-kicker block">Sonartra</span>
                  <span className="sonartra-shell-brand-title block">Admin workspace</span>
                </span>
              ) : null}
            </Link>

            {!collapsed ? (
              <button
                aria-label="Collapse sidebar"
                className="sonartra-focus-ring sonartra-motion-button border-white/8 hover:border-white/12 hidden h-9 w-9 shrink-0 items-center justify-center rounded-xl border bg-white/[0.03] text-white/55 hover:bg-white/[0.06] hover:text-white lg:inline-flex"
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
          </div>

          {collapsed ? (
            <button
              aria-label="Expand sidebar"
              className="sonartra-focus-ring sonartra-motion-button border-white/8 hover:border-white/12 mt-4 hidden h-9 w-9 self-center rounded-xl border bg-white/[0.03] text-white/55 hover:bg-white/[0.06] hover:text-white lg:inline-flex"
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

          <div className="mt-6 flex-1 space-y-3 overflow-y-auto overflow-x-hidden pb-4">
            <div className={cn('sonartra-shell-nav-track space-y-2', collapsed && 'space-y-3')}>
              {adminNavItems.map((item) => (
                <SidebarLink
                  collapsed={collapsed}
                  item={item}
                  key={item.key}
                  onNavigate={() => setMobileOpen(false)}
                />
              ))}
            </div>
          </div>

          <div
            className={cn(
              'border-white/8 rounded-[1.4rem] border bg-white/[0.03]',
              collapsed ? 'p-2' : 'p-3',
            )}
          >
            {collapsed ? (
              <div title={userLabel}>
                <SessionAvatar
                  className="border-white/8 text-white/76 mx-auto bg-white/[0.03]"
                  userLabel={userLabel}
                />
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <SessionAvatar userLabel={userLabel} />
                <div className="min-w-0 flex-1">
                  <p className="sonartra-shell-session-label">Admin session</p>
                  <p className="sonartra-shell-session-value mt-1 truncate">{userLabel}</p>
                </div>
              </div>
            )}
          </div>
        </aside>

        {mobileOpen ? (
          <button
            aria-label="Close sidebar"
            className="fixed inset-0 z-30 bg-black/50 lg:hidden"
            onClick={() => setMobileOpen(false)}
            type="button"
          />
        ) : null}

        <div className="flex min-h-screen flex-1 flex-col">
          <div className="border-white/6 flex items-center justify-between border-b px-4 py-4 lg:hidden">
            <button
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
            <Link className="sonartra-shell-mobile-brand" href="/admin">
              SONARTRA ADMIN
            </Link>
            <div className="w-11" />
          </div>

          <div className="flex-1 px-2 py-2 lg:px-5 lg:py-5">
            <div className="border-white/6 min-h-full rounded-[2rem] border bg-[linear-gradient(180deg,rgba(255,255,255,0.03),rgba(255,255,255,0.016))] shadow-[0_28px_90px_rgba(0,0,0,0.22)] backdrop-blur-xl">
              <div className="border-white/6 flex items-center justify-between gap-4 border-b px-5 py-4 lg:px-8 lg:py-5">
                <div className="min-w-0">
                  <p className="sonartra-shell-session-label">Phase 5</p>
                  <p className="sonartra-shell-session-value mt-1 truncate">Assessment admin</p>
                </div>
                <Link
                  className="sonartra-focus-ring sonartra-motion-button text-white/76 hover:border-white/14 inline-flex min-h-11 items-center rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2.5 text-sm font-medium hover:bg-white/[0.06] hover:text-white"
                  href="/app/workspace"
                >
                  Open user app
                </Link>
              </div>
              {children}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
