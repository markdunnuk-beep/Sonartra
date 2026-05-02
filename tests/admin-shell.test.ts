import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { adminNavItems, isAdminNavItemActive } from '@/components/admin/admin-shell-nav';

const adminShellPath = join(process.cwd(), 'components', 'admin', 'admin-shell.tsx');
const adminLayoutPath = join(process.cwd(), 'app', '(admin)', 'layout.tsx');

function readSource(path: string): string {
  return readFileSync(path, 'utf8');
}

test('admin dashboard nav item is active only on dashboard routes', () => {
  const dashboardItem = adminNavItems.find((item) => item.key === 'dashboard');
  const usersItem = adminNavItems.find((item) => item.key === 'users');

  assert.ok(dashboardItem);
  assert.ok(usersItem);

  assert.equal(isAdminNavItemActive('/admin', dashboardItem), true);
  assert.equal(isAdminNavItemActive('/admin/dashboard', dashboardItem), true);
  assert.equal(isAdminNavItemActive('/admin/users', dashboardItem), false);
  assert.equal(isAdminNavItemActive('/admin/assessments', dashboardItem), false);
  assert.equal(isAdminNavItemActive('/admin/users', usersItem), true);
});

test('admin shell sidebar constrains horizontal overflow at the container', () => {
  const source = readSource(adminShellPath);

  assert.match(source, /min-h-screen overflow-x-clip/);
  assert.match(source, /max-w-\[calc\(100vw-1rem\)\]/);
  assert.match(source, /box-border flex w-\[18\.5rem\] max-w-\[calc\(100vw-1rem\)\] flex-col overflow-x-hidden/);
  assert.match(source, /overflow-y-auto overflow-x-hidden pb-4/);
  assert.match(source, /min-w-0 flex min-h-screen flex-1 flex-col overflow-x-clip/);
  assert.match(source, /sonartra-shell-nav-track space-y-2/);
  assert.match(source, /min-h-12 w-full items-center/);
});

test('admin shell uses Sonartra logo and mark assets for expanded and collapsed branding', () => {
  const source = readSource(adminShellPath);

  assert.match(source, /import Image from 'next\/image';/);
  assert.match(source, /SONARTRA_LOGO_WHITE_SRC = '\/images\/brand\/sonartra-logo-white\.svg'/);
  assert.match(source, /SONARTRA_MARK_WHITE_SRC = '\/images\/brand\/sonartra-mark-white\.svg'/);
  assert.match(source, /<SidebarBrand collapsed=\{mobileSidebarCollapsed\} titleId=\{mobileDrawerTitleId\} \/>/);
  assert.match(source, /alt="Sonartra"/);
  assert.match(source, />\s*Admin Console\s*<\/span>/);
  assert.doesNotMatch(source, />\s*A\s*<\/span>/);
});

test('admin shell mobile drawer uses explicit overlay semantics and scroll locking', () => {
  const source = readSource(adminShellPath);

  assert.match(source, /const mobileSidebarCollapsed = collapsed && !mobileOpen;/);
  assert.match(source, /document\.body\.dataset\.adminMobileScrollLock = 'true';/);
  assert.match(source, /htmlStyle\.overflow = 'hidden';/);
  assert.match(source, /bodyStyle\.overflow = 'hidden';/);
  assert.match(source, /bodyStyle\.touchAction = 'none';/);
  assert.match(source, /delete document\.body\.dataset\.adminMobileScrollLock;/);
  assert.match(source, /window\.addEventListener\('keydown', handleKeyDown\);/);
  assert.match(source, /if \(event\.key === 'Escape'\) \{\s*setMobileOpen\(false\);/);
  assert.match(source, /role=\{mobileOpen \? 'dialog' : 'complementary'\}/);
  assert.match(source, /aria-modal=\{mobileOpen \? true : undefined\}/);
  assert.match(source, /data-admin-mobile-drawer=\{mobileOpen \? 'open' : 'closed'\}/);
  assert.match(source, /data-admin-mobile-overlay="open"/);
  assert.match(source, /Controlled admin navigation\. Close to return to the current record\./);
  assert.match(source, /aria-hidden=\{mobileOpen \? true : undefined\}/);
  assert.match(source, /aria-expanded=\{mobileOpen\}/);
});

test('admin layout passes a name-first shell label with safe fallbacks', () => {
  const source = readSource(adminLayoutPath);

  assert.match(source, /userName: string \| null;/);
  assert.match(
    source,
    /return params\.userName \?\? params\.userEmail \?\? params\.userId \?\? 'Workspace user';/,
  );
});
