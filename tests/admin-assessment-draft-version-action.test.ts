import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import {
  resolveCreateDraftVersionRedirect,
  type AdminAssessmentVersionRouteMode,
} from '@/lib/server/admin-assessment-draft-version-actions';
import type { DraftVersionCreationResult } from '@/lib/server/admin-assessment-draft-version-service';

function createResult(status: 'created' | 'draft_exists'): DraftVersionCreationResult {
  if (status === 'created') {
    return {
      status,
      assessmentId: 'assessment-1',
      assessmentKey: 'leadership-pattern',
      sourceVersionId: 'version-1',
      sourceVersionTag: '1.00',
      draftVersionId: 'version-2',
      draftVersionTag: '2.00',
      copied: {
        domains: 1,
        signals: 1,
        questions: 1,
        options: 1,
        optionSignalWeights: 1,
        languageRows: 1,
      },
    };
  }

  return {
    status,
    assessmentId: 'assessment-1',
    assessmentKey: 'leadership-pattern',
    draftVersionId: 'version-2',
    draftVersionTag: '2.00',
  };
}

async function resolveWith(
  mode: AdminAssessmentVersionRouteMode,
  result: DraftVersionCreationResult,
) {
  return resolveCreateDraftVersionRedirect(
    {
      assessmentKey: 'leadership-pattern',
      mode,
    },
    {
      async createDraftVersion() {
        return result;
      },
    },
  );
}

function readSource(...segments: string[]): string {
  return readFileSync(join(process.cwd(), ...segments), 'utf8');
}

test('admin create-version action redirects created multi-domain drafts to review', async () => {
  const redirect = await resolveWith('multi_domain', createResult('created'));

  assert.deepEqual(redirect, {
    href: '/admin/assessments/leadership-pattern/review?draftVersionCreated=2.00',
  });
});

test('admin create-version action redirects created single-domain drafts to review', async () => {
  const redirect = await resolveWith('single_domain', createResult('created'));

  assert.deepEqual(redirect, {
    href: '/admin/assessments/single-domain/leadership-pattern/review?draftVersionCreated=2.00',
  });
});

test('admin create-version action does not create another draft when one already exists', async () => {
  let calls = 0;
  const redirect = await resolveCreateDraftVersionRedirect(
    {
      assessmentKey: 'leadership-pattern',
      mode: 'multi_domain',
    },
    {
      async createDraftVersion() {
        calls += 1;
        return createResult('draft_exists');
      },
    },
  );

  assert.equal(calls, 1);
  assert.deepEqual(redirect, {
    href: '/admin/assessments/leadership-pattern/versions/new?status=draft_exists&draftVersion=2.00',
  });
});

test('admin create-version action handles missing assessment outcome', async () => {
  const redirect = await resolveWith('multi_domain', {
    status: 'assessment_not_found',
    assessmentKeyOrId: 'leadership-pattern',
  });

  assert.deepEqual(redirect, {
    href: '/admin/assessments/leadership-pattern/versions/new?status=assessment_not_found',
  });
});

test('admin create-version action handles missing published source outcome', async () => {
  const redirect = await resolveWith('multi_domain', {
    status: 'published_source_not_found',
    assessmentId: 'assessment-1',
    assessmentKey: 'leadership-pattern',
  });

  assert.deepEqual(redirect, {
    href: '/admin/assessments/leadership-pattern/versions/new?status=published_source_not_found',
  });
});

test('admin create-version action handles persistence errors without exposing database internals', async () => {
  const redirect = await resolveWith('multi_domain', {
    status: 'persistence_error',
    stage: 'insert_draft_version',
    message: 'raw database failure text',
  });

  assert.deepEqual(redirect, {
    href: '/admin/assessments/leadership-pattern/versions/new?status=persistence_error',
  });
});

test('create-version routes render outcome messages and links', () => {
  const componentSource = readSource('components', 'admin', 'admin-assessment-version-placeholder.tsx');
  const multiDomainRouteSource = readSource(
    'app',
    '(admin)',
    'admin',
    'assessments',
    '[assessmentKey]',
    'versions',
    'new',
    'page.tsx',
  );
  const singleDomainRouteSource = readSource(
    'app',
    '(admin)',
    'admin',
    'assessments',
    'single-domain',
    '[assessmentKey]',
    'versions',
    'new',
    'page.tsx',
  );

  assert.match(componentSource, /A draft version already exists for this assessment\./);
  assert.match(componentSource, /A new version can only be created from a published source version\./);
  assert.match(componentSource, /Back to assessment library/);
  assert.match(componentSource, /Open existing draft/);
  assert.doesNotMatch(componentSource, /raw database/i);
  assert.match(multiDomainRouteSource, /mode="multi_domain"/);
  assert.match(singleDomainRouteSource, /mode="single_domain"/);
});
