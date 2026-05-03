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
  assert.match(shellSource, /'xl:w-\[5\.75rem\]'/);
  assert.match(shellSource, /'lg:w-\[5\.75rem\]'/);
  assert.match(shellSource, /overflow-y-auto overflow-x-hidden pb-4/);
  assert.match(shellSource, /sonartra-shell-nav-track space-y-1\.5/);
  assert.match(shellSource, /collapsed && 'space-y-2\.5 pr-0'/);
  assert.match(shellSource, /min-h-\[3\.05rem\] items-center/);
  assert.match(shellSource, /mx-auto h-11 w-11 justify-center px-0 py-0/);
  assert.match(shellSource, /mx-auto h-12 w-12 justify-center px-0 py-0/);
  assert.match(shellSource, /w-full justify-start gap-3\.5 px-3 py-2\.5/);
  assert.match(shellSource, /data-sidebar-collapsed=\{collapsed \? 'true' : 'false'\}/);
  assert.match(shellSource, /flex shrink-0 items-center justify-center border/);
  assert.match(
    shellSource,
    /active && collapsed \? 'h-10 w-10 rounded-\[1rem\]' : 'h-9 w-9 rounded-\[0\.9rem\]'/,
  );
  assert.match(shellSource, /h-\[1\.05rem\] w-\[1\.05rem\]/);
  assert.match(
    globalsSource,
    /\.sonartra-shell-nav-track\s*\{\s*padding-right: var\(--sonartra-motion-distance-soft\);/m,
  );
  assert.match(
    globalsSource,
    /\.sonartra-motion-nav-item\[data-sidebar-collapsed='true'\]\[aria-current='page'\]\s*\{\s*transform: none;/m,
  );
});

test('user collapsed footer keeps session and logout controls aligned', () => {
  const shellSource = readSource(userShellPath);

  assert.match(
    shellSource,
    /border-white\/8 flex flex-col items-center gap-2 rounded-\[1\.4rem\] border bg-white\/\[0\.03\] p-2/,
  );
  assert.match(shellSource, /aria-label=\{`Workspace session: \$\{userLabel\}`\}/);
  assert.match(shellSource, /aria-label="Log out"/);
  assert.match(shellSource, /rounded-\[1\.4rem\] border bg-white\/\[0\.03\] p-3\.5/);
});

test('user shell uses Sonartra logo and mark assets for expanded and collapsed branding', () => {
  const shellSource = readSource(userShellPath);

  assert.match(shellSource, /import Image from 'next\/image';/);
  assert.match(
    shellSource,
    /SONARTRA_LOGO_WHITE_SRC = '\/images\/brand\/sonartra-logo-white\.svg'/,
  );
  assert.match(
    shellSource,
    /SONARTRA_MARK_WHITE_SRC = '\/images\/brand\/sonartra-mark-white\.svg'/,
  );
  assert.match(
    shellSource,
    /<SidebarBrand collapsed=\{mobileSidebarCollapsed\} titleId=\{mobileDrawerTitleId\} \/>/,
  );
  assert.match(shellSource, /alt="Sonartra"/);
  assert.match(shellSource, />\s*Sonartra workspace navigation\s*<\/span>/);
  assert.doesNotMatch(shellSource, /sonartra-shell-brand-title block/);
  assert.doesNotMatch(shellSource, />\s*S\s*<\/span>/);
});

test('user shell uses the Sonartra mark in the session avatar and keeps settings as a cog', () => {
  const shellSource = readSource(userShellPath);

  assert.match(shellSource, /function SessionAvatar\(\{ className \}: \{ className\?: string \}\)/);
  assert.match(shellSource, /src=\{SONARTRA_MARK_WHITE_SRC\}/);
  assert.match(shellSource, /alt=""/);
  assert.doesNotMatch(shellSource, /userLabel\.charAt/);
  assert.match(shellSource, /m13\.32 3\.9\.5 1\.55/);
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
  assert.match(shellSource, /flex min-h-screen min-w-0 flex-1 flex-col overflow-x-clip/);
  assert.match(shellSource, /sticky top-0 z-20/);
  assert.match(shellSource, /Assessment focus/);
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
  assert.match(source, /const \[collapsed, setCollapsed\] = useState\(false\);/);
  assert.match(source, /const \[hasHydrated, setHasHydrated\] = useState\(false\);/);
  assert.match(source, /const frameId = window\.requestAnimationFrame\(\(\) => \{/);
  assert.match(
    source,
    /setCollapsed\(window\.localStorage\.getItem\(SHELL_COLLAPSE_STORAGE_KEY\) === 'true'\);/,
  );
  assert.match(source, /setHasHydrated\(true\);/);
  assert.match(source, /window\.cancelAnimationFrame\(frameId\);/);
  assert.match(source, /if \(!hasHydrated\) \{\s*return;\s*\}/);
  assert.match(source, /const mobileSidebarCollapsed = collapsed && !mobileOpen;/);
  assert.match(
    source,
    /window\.localStorage\.setItem\(SHELL_COLLAPSE_STORAGE_KEY, collapsed \? 'true' : 'false'\);/,
  );
  assert.doesNotMatch(source, /useState\(\(\) => \{\s*if \(typeof window === 'undefined'\)/);
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
  assert.match(source, /inert=\{mobileOpen \? true : undefined\}/);
  assert.doesNotMatch(source, /aria-hidden=\{mobileOpen \? true : undefined\}/);
  assert.match(source, /aria-expanded=\{mobileOpen\}/);
  assert.match(source, /Workspace navigation\. Close to return to the current page\./);
  assert.match(source, /collapsed=\{mobileSidebarCollapsed\}/);
});
