import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

function readSource(...segments: string[]): string {
  return readFileSync(join(process.cwd(), ...segments), 'utf8');
}

test('root layout wires ClerkProvider for app-owned auth routes', () => {
  const source = readSource('app', 'layout.tsx');

  assert.match(source, /import\s+\{\s*ClerkProvider\s*\}\s+from\s+'@clerk\/nextjs';/);
  assert.match(source, /<ClerkProvider>/);
  assert.match(source, /<\/ClerkProvider>/);
});

test('sign-in route renders the Clerk SignIn component inside the Sonartra auth shell', () => {
  const source = readSource('app', 'sign-in', '[[...sign-in]]', 'page.tsx');

  assert.match(source, /import\s+\{\s*SignIn\s*\}\s+from\s+'@clerk\/nextjs';/);
  assert.match(source, /import\s+\{\s*AuthPageShell\s*\}\s+from\s+'@\/components\/auth\/auth-page-shell';/);
  assert.match(source, /fallbackRedirectUrl=\{AUTH_FALLBACK_REDIRECT\}/);
  assert.match(source, /const AUTH_FALLBACK_REDIRECT = '\/app\/workspace';/);
  assert.match(source, /path="\/sign-in"/);
  assert.match(source, /routing="path"/);
  assert.match(source, /signUpUrl="\/sign-up"/);
  assert.doesNotMatch(source, /forceRedirectUrl=/);
  assert.doesNotMatch(source, /clerk\.com/i);
});

test('sign-up route renders the Clerk SignUp component inside the Sonartra auth shell', () => {
  const source = readSource('app', 'sign-up', '[[...sign-up]]', 'page.tsx');

  assert.match(source, /import\s+\{\s*SignUp\s*\}\s+from\s+'@clerk\/nextjs';/);
  assert.match(source, /import\s+\{\s*AuthPageShell\s*\}\s+from\s+'@\/components\/auth\/auth-page-shell';/);
  assert.match(source, /fallbackRedirectUrl=\{AUTH_FALLBACK_REDIRECT\}/);
  assert.match(source, /const AUTH_FALLBACK_REDIRECT = '\/app\/workspace';/);
  assert.match(source, /path="\/sign-up"/);
  assert.match(source, /routing="path"/);
  assert.match(source, /signInUrl="\/sign-in"/);
  assert.doesNotMatch(source, /forceRedirectUrl=/);
  assert.doesNotMatch(source, /clerk\.com/i);
});

test('env example defines Sonartra-owned auth route handoff variables', () => {
  const source = readSource('.env.example');

  assert.match(source, /NEXT_PUBLIC_CLERK_SIGN_IN_URL=\/sign-in/);
  assert.match(source, /NEXT_PUBLIC_CLERK_SIGN_UP_URL=\/sign-up/);
  assert.match(source, /NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL=\/app\/workspace/);
  assert.match(source, /NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL=\/app\/workspace/);
  assert.doesNotMatch(source, /clerk\.com/i);
});

test('auth handoff does not introduce parallel custom auth routes', () => {
  const signInSource = readSource('app', 'sign-in', '[[...sign-in]]', 'page.tsx');
  const signUpSource = readSource('app', 'sign-up', '[[...sign-up]]', 'page.tsx');

  assert.doesNotMatch(signInSource, /\/login|\/signin\b/i);
  assert.doesNotMatch(signUpSource, /\/register|\/signup\b(?!\]\])/i);
});
