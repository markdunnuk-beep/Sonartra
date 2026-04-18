import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

type PackageJson = {
  dependencies?: Record<string, string>;
};

type PackageLock = {
  packages?: Record<string, { version?: string }>;
};

function readJsonFile<T>(path: string): T {
  return JSON.parse(readFileSync(path, 'utf8')) as T;
}

test('committed package manifests declare Clerk for the request-user and webhook entrypoints', () => {
  const root = process.cwd();
  const packageJson = readJsonFile<PackageJson>(join(root, 'package.json'));
  const packageLock = readJsonFile<PackageLock>(join(root, 'package-lock.json'));
  const declaredVersion = packageJson.dependencies?.['@clerk/nextjs'];

  assert.equal(declaredVersion, '^7.2.3');
  assert.equal(packageLock.packages?.['']?.version, '1.0.0');
  assert.equal(
    packageLock.packages?.['node_modules/@clerk/nextjs']?.version,
    '7.2.3',
  );
});

test('installed Clerk package exposes the server and webhook subpaths used by the app', () => {
  const root = process.cwd();
  const clerkPackagePath = join(root, 'node_modules', '@clerk', 'nextjs', 'package.json');

  assert.equal(existsSync(clerkPackagePath), true);

  const clerkPackage = readJsonFile<{
    exports?: Record<string, unknown>;
  }>(clerkPackagePath);

  assert.equal(typeof clerkPackage.exports?.['./server'], 'object');
  assert.equal(typeof clerkPackage.exports?.['./webhooks'], 'object');
});
