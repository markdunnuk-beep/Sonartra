import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { adminNavItems, isAdminNavItemActive } from '@/components/admin/admin-shell-nav';

const adminShellPath = join(process.cwd(), 'components', 'admin', 'admin-shell.tsx');

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
