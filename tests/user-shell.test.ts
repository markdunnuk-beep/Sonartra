import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const userShellPath = join(process.cwd(), 'components', 'user', 'user-app-shell.tsx');
const userLayoutPath = join(process.cwd(), 'app', '(user)', 'app', 'layout.tsx');
const globalsPath = join(process.cwd(), 'app', 'globals.css');

function readSource(path: string): string {
  return readFileSync(path, 'utf8');
}

test('user shell reserves room for selected nav treatment without reintroducing overflow', () => {
  const shellSource = readSource(userShellPath);
  const globalsSource = readSource(globalsPath);

  assert.match(shellSource, /box-border flex w-\[17\.5rem\] flex-col overflow-x-hidden/);
  assert.match(shellSource, /overflow-y-auto overflow-x-hidden pb-4/);
  assert.match(shellSource, /sonartra-shell-nav-track space-y-2/);
  assert.match(shellSource, /min-h-12 w-full items-center/);
  assert.match(
    globalsSource,
    /\.sonartra-shell-nav-track\s*\{\s*padding-right: var\(--sonartra-motion-distance-soft\);/m,
  );
});

test('user shell uses Sonartra logo and mark assets for expanded and collapsed branding', () => {
  const shellSource = readSource(userShellPath);

  assert.match(shellSource, /import Image from 'next\/image';/);
  assert.match(shellSource, /SONARTRA_LOGO_WHITE_SRC = '\/images\/brand\/sonartra-logo-white\.svg'/);
  assert.match(shellSource, /SONARTRA_MARK_WHITE_SRC = '\/images\/brand\/sonartra-mark-white\.svg'/);
  assert.match(shellSource, /<SidebarBrand collapsed=\{mobileSidebarCollapsed\} titleId=\{mobileDrawerTitleId\} \/>/);
  assert.match(shellSource, /alt="Sonartra"/);
  assert.match(shellSource, />\s*Workspace\s*<\/span>/);
  assert.doesNotMatch(shellSource, />\s*S\s*<\/span>/);
});

test('user shell reprioritises chrome for assessment runner routes on smaller screens', () => {
  const shellSource = readSource(userShellPath);

  assert.match(
    shellSource,
    /const isAssessmentRunnerRoute = \/\^\\\/app\\\/assessments\\\/\[\^\/\]\+\\\/attempts\\\/\[\^\/\]\+\\\/\?\$\/\.test\(pathname\);/,
  );
  assert.match(
    shellSource,
    /const shellDesktopBreakpoint = isAssessmentRunnerRoute \? 'xl' : 'lg';/,
  );
  assert.match(shellSource, /shellDesktopBreakpoint === 'xl' \? 'xl:sticky' : 'lg:sticky'/);
  assert.match(shellSource, /min-w-0 flex min-h-screen flex-1 flex-col overflow-x-clip/);
  assert.match(shellSource, /sticky top-0 z-20/);
  assert.match(shellSource, /Runner focus/);
  assert.match(shellSource, /isAssessmentRunnerRoute \? 'Assessment' : 'SONARTRA'/);
  assert.match(
    shellSource,
    /overflow-x-clip px-0 py-0 sm:px-1 sm:py-1 md:px-2 md:py-2 xl:px-5 xl:py-5/,
  );
  assert.match(
    shellSource,
    /border-0 bg-transparent shadow-none[\s\S]*sm:rounded-\[1\.6rem\][\s\S]*sm:border/,
  );
});

test('user app layout passes a name-first shell label with safe fallbacks', () => {
  const source = readSource(userLayoutPath);

  assert.match(source, /userName: string \| null;/);
  assert.match(
    source,
    /return params\.userName \?\? params\.userEmail \?\? params\.userId \?\? 'Workspace user';/,
  );
});

test('user mobile drawer opens as a full accessible drawer without overwriting desktop collapse state', () => {
  const source = readSource(userShellPath);

  assert.match(source, /import \{ useEffect, useId, useState \} from 'react';/);
  assert.match(source, /const mobileSidebarCollapsed = collapsed && !mobileOpen;/);
  assert.match(source, /window\.localStorage\.setItem\(SHELL_COLLAPSE_STORAGE_KEY, collapsed \? 'true' : 'false'\);/);
  assert.match(source, /document\.body\.dataset\.userMobileScrollLock = 'true';/);
  assert.match(source, /htmlStyle\.overflow = 'hidden';/);
  assert.match(source, /bodyStyle\.overflow = 'hidden';/);
  assert.match(source, /bodyStyle\.touchAction = 'none';/);
  assert.match(source, /delete document\.body\.dataset\.userMobileScrollLock;/);
  assert.match(source, /window\.addEventListener\('keydown', handleKeyDown\);/);
  assert.match(source, /if \(event\.key === 'Escape'\) \{\s*setMobileOpen\(false\);/);
  assert.match(source, /role=\{mobileOpen \? 'dialog' : undefined\}/);
  assert.match(source, /aria-modal=\{mobileOpen \? true : undefined\}/);
  assert.match(source, /aria-labelledby=\{mobileOpen \? mobileDrawerTitleId : undefined\}/);
  assert.match(source, /aria-describedby=\{mobileOpen \? mobileDrawerDescriptionId : undefined\}/);
  assert.match(source, /data-user-mobile-drawer=\{mobileOpen \? 'open' : 'closed'\}/);
  assert.match(source, /data-user-shell-content-state=\{mobileOpen \? 'subordinate' : 'active'\}/);
  assert.match(source, /aria-expanded=\{mobileOpen\}/);
  assert.match(source, /Workspace navigation\. Close to return to the current page\./);
  assert.match(source, /collapsed=\{mobileSidebarCollapsed\}/);
});
