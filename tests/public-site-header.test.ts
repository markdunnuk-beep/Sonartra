import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';

import {
  PUBLIC_SITE_PRIMARY_NAV_ITEMS,
  PUBLIC_SITE_SECONDARY_NAV_ITEMS,
} from '@/lib/public/public-site-nav';

const publicHeaderSource = readFileSync(
  join(process.cwd(), 'components', 'public', 'public-site-header.tsx'),
  'utf8',
);
const publicLayoutSource = readFileSync(
  join(process.cwd(), 'app', '(public)', 'layout.tsx'),
  'utf8',
);

test('public site nav data exposes the expected marketing links only', () => {
  assert.deepEqual(PUBLIC_SITE_PRIMARY_NAV_ITEMS, [
    { href: '/', label: 'Home' },
    { href: '/platform', label: 'Platform' },
    { href: '/signals', label: 'Sonartra Signals' },
    { href: '/case-studies', label: 'Case Studies' },
    { href: '/contact', label: 'Contact' },
  ]);

  assert.deepEqual(PUBLIC_SITE_SECONDARY_NAV_ITEMS, [
    { href: '/sign-in', label: 'Login' },
    { href: '/get-started', label: 'Get Started' },
  ]);
});

test('public layout renders the shared public site header', () => {
  assert.match(publicLayoutSource, /import \{ PublicSiteHeader \} from ['"]@\/components\/public\/public-site-header['"];/);
  assert.match(publicLayoutSource, /<PublicSiteHeader \/>/);
});

test('public site header keeps desktop navigation and adds an accessible mobile menu', () => {
  assert.match(publicHeaderSource, /aria-controls=\{mobileMenuId\}/);
  assert.match(publicHeaderSource, /aria-expanded=\{mobileOpen\}/);
  assert.match(
    publicHeaderSource,
    /aria-label=\{mobileOpen \? 'Close navigation menu' : 'Open navigation menu'\}/,
  );
  assert.match(publicHeaderSource, /window\.addEventListener\('keydown', handleKeyDown\);/);
  assert.match(publicHeaderSource, /if \(event\.key === 'Escape'\) \{\s*setMobileOpen\(false\);/);
  assert.match(publicHeaderSource, /document\.body\.style\.overflow = 'hidden';/);
  assert.match(publicHeaderSource, /hidden=\{!mobileOpen\}/);
  assert.match(publicHeaderSource, /aria-label="Primary"/);
  assert.match(publicHeaderSource, /aria-label="Mobile primary"/);
  assert.match(publicHeaderSource, /className="hidden items-center gap-6 text-sm text-white\/70 xl:flex"/);
  assert.match(publicHeaderSource, /className="inline-flex h-11 w-11[\s\S]*?xl:hidden"/);
  assert.match(publicHeaderSource, /onClick=\{closeMobileMenu\}/);
});

test('public site header no longer exposes app and admin links in marketing navigation', () => {
  assert.doesNotMatch(publicHeaderSource, /\/app\/workspace/);
  assert.doesNotMatch(publicHeaderSource, /\/admin/);
});
