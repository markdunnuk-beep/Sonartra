import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const adminDashboardPath = join(process.cwd(), 'app', '(admin)', 'admin', 'page.tsx');

function readSource(): string {
  return readFileSync(adminDashboardPath, 'utf8');
}

test('admin dashboard uses operational Sonartra workspace copy', () => {
  const source = readSource();

  assert.match(source, /Manage assessments, users, organisations, and publishing readiness from one operational workspace\./);
  assert.match(source, /Keep the Sonartra operating model clear\./);
  assert.match(source, /Choose an admin area/);
  assert.match(source, /Start with the area you need to review, author, or maintain\./);
  assert.match(source, /Review workspace status and key admin entry points\./);
  assert.match(source, /Manage assessment definitions, versions, language, and publish readiness\./);
  assert.match(source, /Manage organisation records and assignment controls\./);
  assert.match(source, /Review users, roles, access, and workspace assignment\./);
  assert.match(source, /adminNavItems\.map/);
  assert.match(source, /href=\{item\.href\}/);
  assert.doesNotMatch(source, /Open the area you want to work in/);
  assert.doesNotMatch(source, /Open an area/);
  assert.doesNotMatch(source, /Choose where to work next/);
});
