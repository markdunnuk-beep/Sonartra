'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';

import {
  getUserAppNavSections,
  type UserAppNavItem,
  type UserAppNavSection,
} from '@/components/user/app-shell-nav';

const SHELL_COLLAPSE_STORAGE_KEY = 'sonartra:user-shell-collapsed';

function isItemActive(pathname: string, item: UserAppNavItem): boolean {
  return item.match.some((candidate) => pathname === candidate || pathname.startsWith(`${candidate}/`));
}

function cn(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(' ');
}

function NavIcon({
  icon,
  active,
}: {
  icon: UserAppNavItem['icon'];
  active: boolean;
}) {
  const strokeClass = active ? 'text-white' : 'text-white/58';

  switch (icon) {
    case 'workspace':
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
    case 'results':
      return (
        <svg className={cn('h-5 w-5', strokeClass)} fill="none" viewBox="0 0 24 24">
          <path
            d="M6 17.5V13m6 4.5V6.5m6 11V10M4.5 19.5h15"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="1.7"
          />
        </svg>
      );
    case 'settings':
      return (
        <svg className={cn('h-5 w-5', strokeClass)} fill="none" viewBox="0 0 24 24">
          <path
            d="M12 8.25a3.75 3.75 0 1 0 0 7.5a3.75 3.75 0 0 0 0-7.5Zm8.25 3.75-.98-.57.05-1.13-1.84-3.18-1.07.32-.82-.77-3.68-.03-.83.8-1.07-.35-1.8 3.2.05 1.12-.99.6.03 3.63 1 .58-.05 1.13 1.84 3.18 1.07-.32.82.77 3.68.03.83-.8 1.07.35 1.8-3.2-.05-1.12.99-.6-.03-3.63Z"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="1.4"
          />
        </svg>
      );
    case 'admin':
      return (
        <svg className={cn('h-5 w-5', strokeClass)} fill="none" viewBox="0 0 24 24">
          <path
            d="M12 3.75 5.25 6.5v4.14c0 4.12 2.48 7.96 6.32 9.77l.43.2.43-.2c3.84-1.81 6.32-5.65 6.32-9.77V6.5L12 3.75Z"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="1.7"
          />
          <path
            d="M9.5 12.25 11 13.75l3.5-3.5"
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
        'group flex items-center gap-3 rounded-2xl border px-3 py-3 text-sm font-medium transition',
        collapsed ? 'justify-center' : 'justify-start',
        active
          ? 'border-white/16 bg-white/[0.08] text-white shadow-[0_16px_40px_rgba(0,0,0,0.22)]'
          : 'border-transparent text-white/62 hover:border-white/10 hover:bg-white/[0.05] hover:text-white',
      )}
      href={item.href}
      onClick={onNavigate}
      title={collapsed ? item.label : undefined}
    >
      <span
        className={cn(
          'flex h-10 w-10 items-center justify-center rounded-xl border transition',
          active
            ? 'border-white/14 bg-white/[0.09]'
            : 'border-white/8 bg-black/15 group-hover:border-white/10 group-hover:bg-white/[0.04]',
        )}
      >
        <NavIcon active={active} icon={item.icon} />
      </span>
      {!collapsed ? <span className="truncate">{item.label}</span> : null}
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
    <div className="space-y-2">
      {section.items.map((item) => (
        <SidebarLink
          collapsed={collapsed}
          item={item}
          key={item.key}
          onNavigate={onNavigate}
        />
      ))}
    </div>
  );
}

export function UserAppShell({
  children,
  canAccessAdmin,
  userLabel,
}: Readonly<{
  children: React.ReactNode;
  canAccessAdmin: boolean;
  userLabel: string;
}>) {
  const [collapsed, setCollapsed] = useState(() => {
    if (typeof window === 'undefined') {
      return false;
    }

    return window.localStorage.getItem(SHELL_COLLAPSE_STORAGE_KEY) === 'true';
  });
  const [mobileOpen, setMobileOpen] = useState(false);
  const navSections = getUserAppNavSections({ canAccessAdmin });

  useEffect(() => {
    window.localStorage.setItem(SHELL_COLLAPSE_STORAGE_KEY, collapsed ? 'true' : 'false');
  }, [collapsed]);

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,rgba(10,16,32,0.98),rgba(10,16,32,1))]">
      <div className="mx-auto flex min-h-screen w-full max-w-[1600px]">
        <aside
          className={cn(
            'sonartra-scrollbar fixed inset-y-0 left-0 z-40 flex w-[18rem] flex-col border-r border-white/10 bg-[linear-gradient(180deg,rgba(15,23,46,0.96),rgba(8,13,27,0.96))] px-4 py-5 shadow-[0_30px_80px_rgba(0,0,0,0.38)] backdrop-blur transition-transform duration-300 lg:sticky lg:translate-x-0',
            collapsed ? 'lg:w-[6rem]' : 'lg:w-[18rem]',
            mobileOpen ? 'translate-x-0' : '-translate-x-full',
          )}
        >
          <div className={cn('flex items-center', collapsed ? 'justify-center' : 'justify-between')}>
            <Link
              className={cn(
                'flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-3 transition hover:bg-white/[0.06]',
                collapsed ? 'justify-center px-0 py-2.5' : '',
              )}
              href="/app/workspace"
            >
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/12 bg-accent/15 text-sm font-semibold tracking-[0.24em] text-white">
                S
              </span>
              {!collapsed ? (
                <span className="space-y-1">
                  <span className="block text-[11px] font-semibold uppercase tracking-[0.22em] text-white/42">
                    Sonartra
                  </span>
                  <span className="block text-sm font-medium text-white/88">Workspace</span>
                </span>
              ) : null}
            </Link>

            {!collapsed ? (
              <button
                aria-label="Collapse sidebar"
                className="hidden h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-white/65 transition hover:border-white/14 hover:bg-white/[0.08] hover:text-white lg:inline-flex"
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
              className="mt-4 hidden h-10 w-10 self-center rounded-xl border border-white/10 bg-white/[0.04] text-white/65 transition hover:border-white/14 hover:bg-white/[0.08] hover:text-white lg:inline-flex"
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

          <div className="mt-8 flex-1 space-y-6 overflow-y-auto pb-4">
            {navSections.map((section) => (
              <SidebarSection
                collapsed={collapsed}
                key={section.key}
                onNavigate={() => setMobileOpen(false)}
                section={section}
              />
            ))}
          </div>

          {!collapsed ? (
            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/40">
                Session
              </p>
              <p className="mt-2 truncate text-sm text-white/76">{userLabel}</p>
            </div>
          ) : (
            <div
              className="mx-auto flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-sm font-medium text-white/76"
              title={userLabel}
            >
              {userLabel.charAt(0).toUpperCase()}
            </div>
          )}
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
          <div className="flex items-center justify-between border-b border-white/8 px-4 py-4 lg:hidden">
            <button
              aria-label="Open sidebar"
              className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-white/70 transition hover:border-white/16 hover:bg-white/[0.08] hover:text-white"
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
            <Link className="text-sm font-semibold tracking-[0.22em] text-white/70" href="/app/workspace">
              SONARTRA
            </Link>
            <div className="w-11" />
          </div>

          <div className="flex-1 px-2 py-2 lg:px-4 lg:py-4">
            <div className="min-h-full rounded-[2rem] border border-white/8 bg-[linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0.02))] shadow-[0_30px_100px_rgba(0,0,0,0.22)]">
              {children}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
