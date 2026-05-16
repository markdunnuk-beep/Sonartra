import test from 'node:test';
import assert from 'node:assert/strict';

import {
  createOrResolveRankedPatternPackageDraftVersion,
  createRankedPatternDraftVersion,
  publishRankedPatternAssessmentVersion,
  validateRankedPatternDraftImportTarget,
} from '@/lib/server/ranked-pattern-admin-versioning';

type StoredAssessment = {
  id: string;
  assessmentKey: string;
  title: string;
};

type StoredVersion = {
  id: string;
  assessmentId: string;
  version: string;
  lifecycleStatus: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
  mode: string | null;
  resultModelKey: string | null;
  publishedAt: string | null;
};

type StoredResult = {
  id: string;
  assessmentVersionId: string;
  canonicalResultPayload: Record<string, unknown>;
};

function adminUser() {
  return {
    internalUserId: 'admin-1',
    clerkUserId: 'clerk-admin-1',
    userEmail: 'admin@example.com',
    userRole: 'admin',
    userStatus: 'active',
    isAdmin: true,
  };
}

function buildSeed(overrides?: { targetLifecycle?: StoredVersion['lifecycleStatus']; targetResultModelKey?: string | null }) {
  const targetResultModelKey = Object.prototype.hasOwnProperty.call(overrides ?? {}, 'targetResultModelKey')
    ? overrides?.targetResultModelKey ?? null
    : 'ranked_pattern';

  return {
    assessments: [
      {
        id: 'assessment-1',
        assessmentKey: 'decision-style',
        title: 'Decision Style',
      },
    ] satisfies StoredAssessment[],
    versions: [
      {
        id: 'version-1',
        assessmentId: 'assessment-1',
        version: '1.00',
        lifecycleStatus: 'PUBLISHED',
        mode: 'single_domain',
        resultModelKey: 'ranked_pattern',
        publishedAt: '2026-05-01T00:00:00.000Z',
      },
      {
        id: 'version-2',
        assessmentId: 'assessment-1',
        version: '2.00',
        lifecycleStatus: overrides?.targetLifecycle ?? 'DRAFT',
        mode: 'single_domain',
        resultModelKey: targetResultModelKey,
        publishedAt: null,
      },
    ] satisfies StoredVersion[],
    attempts: [{ id: 'attempt-1', assessmentVersionId: 'version-1' }],
    results: [
      {
        id: 'result-1',
        assessmentVersionId: 'version-1',
        canonicalResultPayload: { persisted: 'v1' },
      },
    ] satisfies StoredResult[],
    transactions: [] as string[],
  };
}

function createFakeDb(seed = buildSeed()) {
  const client = {
    async query<T>(text: string, params?: readonly unknown[]) {
      const sql = text.trim();

      if (sql === 'BEGIN' || sql === 'COMMIT' || sql === 'ROLLBACK') {
        seed.transactions.push(sql);
        return { rows: [] as T[] };
      }

      if (sql.includes('FROM assessment_versions av') && sql.includes('INNER JOIN assessments a ON a.id = av.assessment_id')) {
        const assessmentVersionId = params?.[0] as string;
        const version = seed.versions.find((row) => row.id === assessmentVersionId);
        const assessment = version
          ? seed.assessments.find((row) => row.id === version.assessmentId)
          : null;

        return {
          rows: (version && assessment
            ? [{
                assessment_id: assessment.id,
                assessment_key: assessment.assessmentKey,
                assessment_title: assessment.title,
                assessment_version_id: version.id,
                version_tag: version.version,
                lifecycle_status: version.lifecycleStatus,
                mode: version.mode,
                result_model_key: version.resultModelKey,
                published_at: version.publishedAt,
              }]
            : []) as T[],
        };
      }

      if (sql.startsWith('UPDATE assessment_versions') && sql.includes('mode = $2') && sql.includes('result_model_key = $3')) {
        const [draftVersionId, mode, resultModelKey] = params as [string, string, string];
        const version = seed.versions.find((row) => row.id === draftVersionId && row.lifecycleStatus === 'DRAFT');
        if (version) {
          version.mode = mode;
          version.resultModelKey = resultModelKey;
          return { rows: [{ id: version.id }] as T[] };
        }
        return { rows: [] as T[] };
      }

      if (sql.startsWith('UPDATE assessment_versions') && sql.includes("lifecycle_status = 'ARCHIVED'")) {
        const [assessmentId, excludedId] = params as [string, string];
        const archivedIds: string[] = [];
        for (const version of seed.versions) {
          if (version.assessmentId === assessmentId && version.id !== excludedId && version.lifecycleStatus === 'PUBLISHED') {
            version.lifecycleStatus = 'ARCHIVED';
            archivedIds.push(version.id);
          }
        }
        return { rows: archivedIds.map((id) => ({ id })) as T[] };
      }

      if (sql.startsWith('UPDATE assessment_versions') && sql.includes("lifecycle_status = 'PUBLISHED'")) {
        const [versionId, assessmentId] = params as [string, string];
        const version = seed.versions.find(
          (row) => row.id === versionId && row.assessmentId === assessmentId && row.lifecycleStatus === 'DRAFT',
        );
        if (version) {
          version.lifecycleStatus = 'PUBLISHED';
          version.publishedAt = '2026-05-08T00:00:00.000Z';
          return { rows: [{ id: version.id }] as T[] };
        }
        return { rows: [] as T[] };
      }

      if (sql.includes('FROM assessments') && sql.includes('WHERE assessment_key = $1')) {
        const assessmentKey = params?.[0] as string;
        const assessment = seed.assessments.find((row) => row.assessmentKey === assessmentKey);
        return {
          rows: (assessment
            ? [{
                id: assessment.id,
                assessment_key: assessment.assessmentKey,
                title: assessment.title,
                mode: 'single_domain',
                is_active: true,
              }]
            : []) as T[],
        };
      }

      if (sql.includes('FROM assessment_versions') && sql.includes('WHERE assessment_id = $1')) {
        const assessmentId = params?.[0] as string;
        return {
          rows: seed.versions
            .filter((row) => row.assessmentId === assessmentId)
            .map((row) => ({
              id: row.id,
              version: row.version,
              lifecycle_status: row.lifecycleStatus,
              mode: row.mode,
              result_model_key: row.resultModelKey,
            })) as T[],
        };
      }

      if (sql.startsWith('INSERT INTO assessments')) {
        const [assessmentKey, , title] = params as [string, string, string];
        const id = `assessment-${seed.assessments.length + 1}`;
        seed.assessments.push({ id, assessmentKey, title });
        return { rows: [{ id }] as T[] };
      }

      if (sql.startsWith('INSERT INTO assessment_versions')) {
        const [assessmentId, version, mode, resultModelKey] = params as [string, string, string, string];
        const id = `version-${seed.versions.length + 1}`;
        seed.versions.push({
          id,
          assessmentId,
          version,
          lifecycleStatus: 'DRAFT',
          mode,
          resultModelKey,
          publishedAt: null,
        });
        return { rows: [{ id }] as T[] };
      }

      throw new Error(`Unhandled SQL in ranked-pattern versioning fake DB: ${sql}`);
    },
    release() {
      seed.transactions.push('RELEASE');
    },
  };

  return {
    state: seed,
    client,
    pool: {
      async connect() {
        return client;
      },
    },
  };
}

test('create draft version marks the draft as single-domain ranked-pattern and does not copy results', async () => {
  const fake = createFakeDb();
  const resultsBefore = structuredClone(fake.state.results);
  const attemptsBefore = structuredClone(fake.state.attempts);

  const result = await createRankedPatternDraftVersion(
    { assessmentKeyOrId: 'decision-style' },
    {
      async requireAdminUser() {
        return adminUser() as never;
      },
      getDbPool() {
        return fake.pool;
      },
      async createDraftVersionRecords() {
        return {
          status: 'created',
          assessmentId: 'assessment-1',
          assessmentKey: 'decision-style',
          sourceVersionId: 'version-1',
          sourceVersionTag: '1.00',
          draftVersionId: 'version-2',
          draftVersionTag: '2.00',
          copied: {
            domains: 0,
            signals: 0,
            questions: 0,
            options: 0,
            optionSignalWeights: 0,
            languageRows: 0,
          },
        };
      },
    },
  );

  assert.equal(result.status, 'created');
  assert.equal(fake.state.versions[1]?.mode, 'single_domain');
  assert.equal(fake.state.versions[1]?.resultModelKey, 'ranked_pattern');
  assert.deepEqual(fake.state.results, resultsBefore);
  assert.deepEqual(fake.state.attempts, attemptsBefore);
});

test('create draft version returns existing-draft blocker without creating a second concurrent draft', async () => {
  const fake = createFakeDb();
  const versionsBefore = structuredClone(fake.state.versions);

  const result = await createRankedPatternDraftVersion(
    { assessmentKeyOrId: 'decision-style' },
    {
      async requireAdminUser() {
        return adminUser() as never;
      },
      getDbPool() {
        return fake.pool;
      },
      async createDraftVersionRecords() {
        return {
          status: 'draft_exists',
          assessmentId: 'assessment-1',
          assessmentKey: 'decision-style',
          draftVersionId: 'version-2',
          draftVersionTag: '2.00',
        };
      },
    },
  );

  assert.equal(result.status, 'blocked');
  assert.equal(result.draftVersionId, 'version-2');
  assert.equal(result.draftVersionTag, '2.00');
  assert.equal(result.diagnostics[0]?.code, 'DRAFT_VERSION_ALREADY_EXISTS');
  assert.deepEqual(fake.state.versions, versionsBefore);
  assert.deepEqual(fake.state.transactions, ['BEGIN', 'ROLLBACK', 'RELEASE']);
});

test('package metadata creates compatible ranked-pattern shell and draft when none exists', async () => {
  const fake = createFakeDb();
  const result = await createOrResolveRankedPatternPackageDraftVersion(
    {
      metadata: {
        sourceSheetKey: '00_Metadata',
        sourceRowNumber: 2,
        sourceValues: {},
        status: 'active',
        lookupKey: 'assessment::leadership-approach',
        assessmentKey: 'leadership-approach',
        version: '1.00-test',
        assessmentTitle: 'Leadership Approach',
        assessmentDescription: null,
        model: 'single_domain_ranked_pattern',
        mode: 'single_domain',
        resultModelKey: 'ranked_pattern',
        domainKey: 'leadership_approach',
        domainTitle: 'Leadership Approach',
        lifecycleStatus: 'draft',
      },
    },
    {
      async requireAdminUser() {
        return adminUser() as never;
      },
      getDbPool() {
        return fake.pool;
      },
    },
  );

  assert.equal(result.status, 'created');
  assert.equal(result.assessmentKey, 'leadership-approach');
  assert.equal(result.draftVersionTag, '1.00-test');
  assert.equal(fake.state.assessments.some((row) => row.assessmentKey === 'leadership-approach'), true);
});

test('package metadata rejects legacy assessment key conflicts with structured diagnostics', async () => {
  const fake = createFakeDb({
    ...buildSeed(),
    assessments: [
      {
        id: 'assessment-legacy',
        assessmentKey: 'sonartra-leadership-approach',
        title: 'Sonartra Leadership Approach',
      },
    ],
    versions: [
      {
        id: 'version-legacy',
        assessmentId: 'assessment-legacy',
        version: '1.00-test',
        lifecycleStatus: 'DRAFT',
        mode: 'single_domain',
        resultModelKey: 'ranked_pattern',
        publishedAt: null,
      },
    ],
  });

  const result = await createOrResolveRankedPatternPackageDraftVersion(
    {
      metadata: {
        sourceSheetKey: '00_Metadata',
        sourceRowNumber: 2,
        sourceValues: {},
        status: 'active',
        lookupKey: 'assessment::sonartra-leadership-approach',
        assessmentKey: 'sonartra-leadership-approach',
        version: '1.00-test',
        assessmentTitle: 'Sonartra Leadership Approach',
        assessmentDescription: null,
        model: 'single_domain_ranked_pattern',
        mode: 'single_domain',
        resultModelKey: 'ranked_pattern',
        domainKey: 'leadership_approach',
        domainTitle: 'Leadership Approach',
        lifecycleStatus: 'draft',
      },
    },
    {
      async requireAdminUser() {
        return adminUser() as never;
      },
      getDbPool() {
        return fake.pool;
      },
    },
  );

  assert.equal(result.status, 'blocked');
  assert.equal(result.diagnostics[0]?.code, 'PACKAGE_ASSESSMENT_KEY_LEGACY_RESERVED');
  assert.match(result.diagnostics[0]?.message ?? '', /not compatible with ranked-pattern package import/);
});

test('draft import target validation rejects published or non-ranked-pattern versions', async () => {
  const publishedFake = createFakeDb(buildSeed({ targetLifecycle: 'PUBLISHED' }));
  const publishedResult = await validateRankedPatternDraftImportTarget({
    db: publishedFake.client,
    targetAssessmentVersionId: 'version-2',
  });

  assert.equal(publishedResult.diagnostics.some((item) => item.code === 'TARGET_VERSION_NOT_DRAFT'), true);

  const wrongModelFake = createFakeDb(buildSeed({ targetResultModelKey: null }));
  const wrongModelResult = await validateRankedPatternDraftImportTarget({
    db: wrongModelFake.client,
    targetAssessmentVersionId: 'version-2',
  });

  assert.equal(wrongModelResult.diagnostics.some((item) => item.code === 'TARGET_VERSION_MODEL_NOT_RANKED_PATTERN'), true);
});

test('draft import target validation rejects workbook metadata mismatches', async () => {
  const fake = createFakeDb();
  const result = await validateRankedPatternDraftImportTarget({
    db: fake.client,
    targetAssessmentVersionId: 'version-2',
    metadata: {
      sourceSheetKey: '00_Metadata',
      sourceRowNumber: 2,
      sourceValues: {},
      status: 'active',
      lookupKey: 'assessment::3',
      assessmentKey: 'decision-style',
      version: '3.00',
      assessmentTitle: 'Decision Style',
      assessmentDescription: null,
      model: 'single_domain_ranked_pattern',
      mode: 'single_domain',
      resultModelKey: 'ranked_pattern',
      domainKey: 'decision',
      domainTitle: 'Decision',
      lifecycleStatus: 'draft',
    },
  });

  assert.equal(result.diagnostics.some((item) => item.code === 'PACKAGE_VERSION_MISMATCH'), true);
});

test('publish blocks when ranked-pattern publish audit has blocking findings', async () => {
  const fake = createFakeDb();
  const result = await publishRankedPatternAssessmentVersion(
    { targetAssessmentVersionId: 'version-2' },
    {
      async requireAdminUser() {
        return adminUser() as never;
      },
      getDbPool() {
        return fake.pool;
      },
      async auditAssessmentVersion(input) {
        assert.equal(input.auditReportFirstTemplates, true);
        return {
          assessmentVersionId: 'version-2',
          canPublish: false,
          blockingCount: 1,
          warningCount: 0,
          summaryCountsByCategory: {} as never,
          findings: [
            {
              severity: 'blocking',
              code: 'MISSING_RANKED_PATTERNS',
              message: 'Exactly twenty-four ranked patterns are required.',
              category: 'ranked_patterns',
            },
          ],
        };
      },
    },
  );

  assert.equal(result.status, 'blocked');
  assert.equal(fake.state.versions[0]?.lifecycleStatus, 'PUBLISHED');
  assert.equal(fake.state.versions[1]?.lifecycleStatus, 'DRAFT');
  assert.deepEqual(fake.state.results[0]?.canonicalResultPayload, { persisted: 'v1' });
});

test('publish succeeds after ranked-pattern audit passes and preserves old result payloads', async () => {
  const fake = createFakeDb();
  const result = await publishRankedPatternAssessmentVersion(
    { targetAssessmentVersionId: 'version-2' },
    {
      async requireAdminUser() {
        return adminUser() as never;
      },
      getDbPool() {
        return fake.pool;
      },
      async auditAssessmentVersion(input) {
        assert.equal(input.auditReportFirstTemplates, true);
        return {
          assessmentVersionId: 'version-2',
          canPublish: true,
          blockingCount: 0,
          warningCount: 0,
          summaryCountsByCategory: {} as never,
          findings: [],
        };
      },
    },
  );

  assert.equal(result.status, 'published');
  assert.equal(fake.state.versions[0]?.lifecycleStatus, 'ARCHIVED');
  assert.equal(fake.state.versions[1]?.lifecycleStatus, 'PUBLISHED');
  assert.equal(fake.state.versions.filter((version) => version.lifecycleStatus === 'PUBLISHED').length, 1);
  assert.deepEqual(fake.state.results[0]?.canonicalResultPayload, { persisted: 'v1' });
  assert.equal(fake.state.results[0]?.assessmentVersionId, 'version-1');
});

test('non-admin context is rejected before lifecycle mutation', async () => {
  const fake = createFakeDb();

  await assert.rejects(
    publishRankedPatternAssessmentVersion(
      { targetAssessmentVersionId: 'version-2' },
      {
        async requireAdminUser() {
          throw new Error('NOT_ADMIN');
        },
        getDbPool() {
          return fake.pool;
        },
      },
    ),
    /NOT_ADMIN/,
  );

  assert.deepEqual(fake.state.transactions, []);
});
