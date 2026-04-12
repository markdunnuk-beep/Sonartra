import test from 'node:test';
import assert from 'node:assert/strict';

import {
  createAdminAssessmentRecords,
  createAssessmentActionWithDependencies,
} from '@/lib/server/admin-assessment-create';
import {
  initialAdminAssessmentCreateFormState,
  validateAdminAssessmentCreateValues,
} from '@/lib/admin/admin-assessment-create';
import {
  deriveAssessmentKeyFromTitle,
  syncAssessmentKeyFromTitle,
} from '@/lib/admin/assessment-key';

type StoredAssessment = {
  id: string;
  assessmentKey: string;
  mode: 'multi_domain' | 'single_domain';
  title: string;
  description: string | null;
  isActive: boolean;
};

type StoredAssessmentVersion = {
  assessmentId: string;
  mode: 'multi_domain' | 'single_domain';
  versionTag: string;
  lifecycleStatus: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
};

function createFakeDb(seed?: {
  assessments?: StoredAssessment[];
  versions?: StoredAssessmentVersion[];
}) {
  const state = {
    assessments: [...(seed?.assessments ?? [])],
    versions: [...(seed?.versions ?? [])],
  };

  return {
    db: {
      async query<T>(text: string, params?: readonly unknown[]) {
        if (text.includes('FROM assessments') && text.includes('assessment_key = $1')) {
          const assessmentKey = params?.[0] as string;
          const match = state.assessments.find(
            (assessment) => assessment.assessmentKey === assessmentKey,
          );

          return {
            rows: match ? ([{ id: match.id }] as unknown as T[]) : ([] as T[]),
          };
        }

        if (text.includes('INSERT INTO assessments')) {
          const includesModeColumn = text.includes('mode,');
          const assessmentId = `assessment-${state.assessments.length + 1}`;
          const record: StoredAssessment = {
            id: assessmentId,
            assessmentKey: params?.[0] as string,
            mode: includesModeColumn
              ? (params?.[1] as 'multi_domain' | 'single_domain')
              : 'multi_domain',
            title: (includesModeColumn ? params?.[2] : params?.[1]) as string,
            description: ((includesModeColumn ? params?.[3] : params?.[2]) as string | null) ?? null,
            isActive: true,
          };
          state.assessments.push(record);

          return {
            rows: ([{ id: record.id, assessment_key: record.assessmentKey }] as unknown) as T[],
          };
        }

        if (text.includes('INSERT INTO assessment_versions')) {
          const includesModeColumn = text.includes('mode,');
          state.versions.push({
            assessmentId: params?.[0] as string,
            mode: includesModeColumn
              ? (params?.[1] as 'multi_domain' | 'single_domain')
              : 'multi_domain',
            versionTag: (includesModeColumn ? params?.[2] : params?.[1]) as string,
            lifecycleStatus: 'DRAFT',
          });

          return { rows: [] as T[] };
        }

        return { rows: [] as T[] };
      },
    },
    state,
  };
}

function buildFormData(values: {
  title?: string;
  assessmentKey?: string;
  description?: string;
  mode?: string;
}) {
  const formData = new FormData();
  formData.set('title', values.title ?? '');
  formData.set('assessmentKey', values.assessmentKey ?? '');
  formData.set('description', values.description ?? '');
  formData.set('mode', values.mode ?? 'multi_domain');
  return formData;
}

async function withConsoleErrorCapture<T>(callback: () => Promise<T>): Promise<{ result: T; calls: unknown[][] }> {
  const calls: unknown[][] = [];
  const originalConsoleError = console.error;
  console.error = (...args: unknown[]) => {
    calls.push(args);
  };

  try {
    const result = await callback();
    return { result, calls };
  } finally {
    console.error = originalConsoleError;
  }
}

test('creates a new assessment and initial draft version', async () => {
  const fake = createFakeDb();

  const created = await createAdminAssessmentRecords({
    db: fake.db,
    values: {
      title: 'Leadership Signals',
      assessmentKey: 'leadership-signals',
      description: 'Leadership behaviour baseline.',
      mode: 'multi_domain',
    },
  });

  assert.equal(created.assessmentKey, 'leadership-signals');
  assert.equal(fake.state.assessments.length, 1);
  assert.equal(fake.state.assessments[0]?.mode, 'multi_domain');
  assert.equal(fake.state.assessments[0]?.title, 'Leadership Signals');
  assert.equal(fake.state.versions.length, 1);
  assert.equal(fake.state.versions[0]?.mode, 'multi_domain');
  assert.equal(fake.state.versions[0]?.versionTag, '1.0.0');
  assert.equal(fake.state.versions[0]?.lifecycleStatus, 'DRAFT');
  assert.equal(fake.state.versions[0]?.assessmentId, created.assessmentId);
});

test('rejects duplicate assessment keys before inserting', async () => {
  const fake = createFakeDb({
    assessments: [
      {
        id: 'assessment-1',
        assessmentKey: 'wplp80',
        mode: 'multi_domain',
        title: 'WPLP-80',
        description: null,
        isActive: true,
      },
    ],
  });

  await assert.rejects(
    () =>
      createAdminAssessmentRecords({
        db: fake.db,
        values: {
          title: 'Duplicate',
          assessmentKey: 'wplp80',
          description: '',
          mode: 'multi_domain',
        },
      }),
    /ASSESSMENT_KEY_EXISTS/,
  );

  assert.equal(fake.state.assessments.length, 1);
  assert.equal(fake.state.versions.length, 0);
});

test('derives a deterministic assessment key from the title', () => {
  assert.equal(deriveAssessmentKeyFromTitle('Leadership Signals'), 'leadership-signals');
  assert.equal(
    deriveAssessmentKeyFromTitle('  Leadership   Signals ++ North America  '),
    'leadership-signals-north-america',
  );
});

test('stops title-to-key syncing after the key is manually overridden', () => {
  const autoKey = syncAssessmentKeyFromTitle({
    title: 'Leadership Signals',
    currentKey: '',
    hasManualOverride: false,
  });

  const preservedKey = syncAssessmentKeyFromTitle({
    title: 'Leadership Signals Revised',
    currentKey: 'custom-signals',
    hasManualOverride: true,
  });

  assert.equal(autoKey, 'leadership-signals');
  assert.equal(preservedKey, 'custom-signals');
});

test('returns inline validation state for blank submit values', () => {
  const result = validateAdminAssessmentCreateValues({
    title: '',
    assessmentKey: '',
    description: '',
    mode: 'multi_domain',
  });

  assert.deepEqual(result.fieldErrors, {
    title: 'Assessment title is required.',
    assessmentKey: 'Assessment key is required.',
  });
  assert.equal(result.formError, null);
});

test('returns inline validation state for invalid assessment key format', () => {
  const result = validateAdminAssessmentCreateValues({
    title: 'Leadership Signals',
    assessmentKey: 'Leadership Signals',
    description: '',
    mode: 'multi_domain',
  });

  assert.equal(result.fieldErrors.assessmentKey, 'Use lowercase letters, numbers, and single hyphens only.');
});

test('create action returns structured validation state without touching the database for blank submit', async () => {
  let connectCalls = 0;

  const result = await createAssessmentActionWithDependencies(
    initialAdminAssessmentCreateFormState,
    buildFormData({}),
    {
      getDbPool: () => ({
        async connect() {
          connectCalls += 1;
          throw new Error('connect should not be called for validation failures');
        },
      }),
      redirect(path: string): never {
        throw new Error(`unexpected redirect to ${path}`);
      },
      revalidatePath(): void {},
    },
  );

  assert.equal(connectCalls, 0);
  assert.deepEqual(result.fieldErrors, {
    title: 'Assessment title is required.',
    assessmentKey: 'Assessment key is required.',
  });
  assert.equal(result.formError, null);
});

test('create action redirects after a successful create instead of returning a failure state', async () => {
  const fake = createFakeDb();
  const transactionLog: string[] = [];
  const revalidatedPaths: string[] = [];

  await assert.rejects(
    () =>
      createAssessmentActionWithDependencies(
        initialAdminAssessmentCreateFormState,
        buildFormData({
          title: 'Leadership Signals',
          assessmentKey: 'leadership-signals',
          description: 'Leadership behaviour baseline.',
        }),
        {
          getDbPool: () => ({
            async connect() {
              return {
                async query<T>(text: string, params?: readonly unknown[]) {
                  const normalized = text.replace(/\s+/g, ' ').trim();
                  transactionLog.push(normalized);
                  return fake.db.query<T>(text, params);
                },
                release() {},
              };
            },
          }),
          redirect(path: string): never {
            throw new Error(`REDIRECT:${path}`);
          },
          revalidatePath(path: string): void {
            revalidatedPaths.push(path);
          },
        },
      ),
    /REDIRECT:\/admin\/assessments\/leadership-signals/,
  );

  assert.equal(fake.state.assessments.length, 1);
  assert.equal(fake.state.versions.length, 1);
  assert.ok(transactionLog.some((entry) => entry === 'BEGIN'));
  assert.ok(transactionLog.some((entry) => entry === 'COMMIT'));
  assert.ok(!transactionLog.some((entry) => entry === 'ROLLBACK'));
  assert.deepEqual(revalidatedPaths, [
    '/admin/assessments',
    '/admin/assessments/leadership-signals',
  ]);
});

test('create action returns an inline field error for duplicate assessment keys', async () => {
  const fake = createFakeDb({
    assessments: [
      {
        id: 'assessment-1',
        assessmentKey: 'wplp80',
        mode: 'multi_domain',
        title: 'WPLP-80',
        description: null,
        isActive: true,
      },
    ],
  });

  const transactionLog: string[] = [];

  const result = await createAssessmentActionWithDependencies(
    initialAdminAssessmentCreateFormState,
    buildFormData({
      title: 'Leadership Signals',
      assessmentKey: 'wplp80',
      description: 'Duplicate key.',
    }),
    {
      getDbPool: () => ({
        async connect() {
          return {
            async query<T>(text: string, params?: readonly unknown[]) {
              const normalized = text.replace(/\s+/g, ' ').trim();
              transactionLog.push(normalized);
              return fake.db.query<T>(text, params);
            },
            release() {},
          };
        },
      }),
      redirect(path: string): never {
        throw new Error(`unexpected redirect to ${path}`);
      },
      revalidatePath(): void {},
    },
  );

  assert.equal(result.fieldErrors.assessmentKey, 'That assessment key is already in use.');
  assert.equal(result.formError, null);
  assert.ok(transactionLog.some((entry) => entry === 'BEGIN'));
  assert.ok(transactionLog.some((entry) => entry === 'ROLLBACK'));
});

test('create action returns an inline field error for database unique violations on assessment_key', async () => {
  const { result, calls } = await withConsoleErrorCapture(() =>
    createAssessmentActionWithDependencies(
      initialAdminAssessmentCreateFormState,
      buildFormData({
        title: 'Leadership Signals',
        assessmentKey: 'wplp80',
        description: 'Duplicate key race.',
      }),
      {
        getDbPool: () => ({
          async connect() {
            return {
              async query<T>(text: string) {
                if (text.trim() === 'BEGIN' || text.trim() === 'ROLLBACK') {
                  return { rows: [] as T[] };
                }

                if (text.includes('FROM assessments') && text.includes('assessment_key = $1')) {
                  return { rows: [] as T[] };
                }

                if (text.includes('INSERT INTO assessments')) {
                  throw {
                    code: '23505',
                    constraint: 'assessments_assessment_key_key',
                    detail: 'Key (assessment_key)=(wplp80) already exists.',
                    table: 'assessments',
                    column: 'assessment_key',
                    message: 'duplicate key value violates unique constraint',
                  };
                }

                return { rows: [] as T[] };
              },
              release() {},
            };
          },
        }),
        redirect(path: string): never {
          throw new Error(`unexpected redirect to ${path}`);
        },
        revalidatePath(): void {},
      },
    ),
  );

  assert.equal(result.fieldErrors.assessmentKey, 'That assessment key is already in use.');
  assert.equal(result.formError, null);
  assert.equal(calls.length, 0);
});

test('create action returns a targeted form error for assessment version constraint failures', async () => {
  const { result, calls } = await withConsoleErrorCapture(() =>
    createAssessmentActionWithDependencies(
      initialAdminAssessmentCreateFormState,
      buildFormData({
        title: 'Leadership Signals',
        assessmentKey: 'leadership-signals',
        description: 'Constraint mismatch.',
      }),
      {
        getDbPool: () => ({
          async connect() {
            return {
              async query<T>(text: string, params?: readonly unknown[]) {
                if (text.trim() === 'BEGIN' || text.trim() === 'ROLLBACK') {
                  return { rows: [] as T[] };
                }

                if (text.includes('FROM assessments') && text.includes('assessment_key = $1')) {
                  return { rows: [] as T[] };
                }

                if (text.includes('INSERT INTO assessments')) {
                  return {
                    rows: ([{ id: 'assessment-1', assessment_key: params?.[0] as string }] as unknown) as T[],
                  };
                }

                if (text.includes('INSERT INTO assessment_versions')) {
                  throw {
                    code: '23514',
                    constraint: 'assessment_versions_lifecycle_status_check',
                    table: 'assessment_versions',
                    message: 'new row for relation "assessment_versions" violates check constraint',
                  };
                }

                return { rows: [] as T[] };
              },
              release() {},
            };
          },
        }),
        redirect(path: string): never {
          throw new Error(`unexpected redirect to ${path}`);
        },
        revalidatePath(): void {},
      },
    ),
  );

  assert.equal(
    result.formError,
    'The initial draft version could not be created because the database rejected the version lifecycle values.',
  );
  assert.deepEqual(result.fieldErrors, {});
  assert.equal(calls.length, 1);
});

test('create action stores single-domain mode when requested explicitly', async () => {
  const fake = createFakeDb();

  await assert.rejects(
    () =>
      createAssessmentActionWithDependencies(
        initialAdminAssessmentCreateFormState,
        buildFormData({
          title: 'Role Focus',
          assessmentKey: 'role-focus',
          description: 'Single-domain draft.',
          mode: 'single_domain',
        }),
        {
          getDbPool: () => ({
            async connect() {
              return {
                async query<T>(text: string, params?: readonly unknown[]) {
                  return fake.db.query<T>(text, params);
                },
                release() {},
              };
            },
          }),
          redirect(path: string): never {
            throw new Error(`REDIRECT:${path}`);
          },
          revalidatePath(): void {},
        },
      ),
    /REDIRECT:\/admin\/assessments\/single-domain\/role-focus/,
  );

  assert.equal(fake.state.assessments[0]?.mode, 'single_domain');
  assert.equal(fake.state.versions[0]?.mode, 'single_domain');
});

test('multi-domain create action falls back cleanly when mode columns are absent in the database schema', async () => {
  const fake = createFakeDb();

  await assert.rejects(
    () =>
      createAssessmentActionWithDependencies(
        initialAdminAssessmentCreateFormState,
        buildFormData({
          title: 'Legacy Multi',
          assessmentKey: 'legacy-multi',
          description: 'Legacy schema fallback.',
          mode: 'multi_domain',
        }),
        {
          getDbPool: () => ({
            async connect() {
              return {
                async query<T>(text: string, params?: readonly unknown[]) {
                  if (text.trim() === 'BEGIN' || text.trim() === 'COMMIT' || text.trim() === 'ROLLBACK') {
                    return { rows: [] as T[] };
                  }

                  if (text.includes('FROM assessments') && text.includes('assessment_key = $1')) {
                    return { rows: [] as T[] };
                  }

                  if (text.includes('INSERT INTO assessments') && text.includes('mode,')) {
                    throw new Error('column "mode" of relation "assessments" does not exist');
                  }

                  if (text.includes('INSERT INTO assessment_versions') && text.includes('mode,')) {
                    throw new Error('column "mode" of relation "assessment_versions" does not exist');
                  }

                  return fake.db.query<T>(text, params);
                },
                release() {},
              };
            },
          }),
          redirect(path: string): never {
            throw new Error(`REDIRECT:${path}`);
          },
          revalidatePath(): void {},
        },
      ),
    /REDIRECT:\/admin\/assessments\/legacy-multi/,
  );

  assert.equal(fake.state.assessments[0]?.mode, 'multi_domain');
  assert.equal(fake.state.versions[0]?.mode, 'multi_domain');
});

test('single-domain create action returns a targeted schema error when mode columns are absent', async () => {
  const { result, calls } = await withConsoleErrorCapture(() =>
    createAssessmentActionWithDependencies(
      initialAdminAssessmentCreateFormState,
      buildFormData({
        title: 'Legacy Single',
        assessmentKey: 'legacy-single',
        description: 'Mode migration missing.',
        mode: 'single_domain',
      }),
      {
        getDbPool: () => ({
          async connect() {
            return {
              async query<T>(text: string) {
                if (text.trim() === 'BEGIN' || text.trim() === 'ROLLBACK') {
                  return { rows: [] as T[] };
                }

                if (text.includes('FROM assessments') && text.includes('assessment_key = $1')) {
                  return { rows: [] as T[] };
                }

                if (text.includes('INSERT INTO assessments') && text.includes('mode,')) {
                  throw new Error('column "mode" of relation "assessments" does not exist');
                }

                return { rows: [] as T[] };
              },
              release() {},
            };
          },
        }),
        redirect(path: string): never {
          throw new Error(`unexpected redirect to ${path}`);
        },
        revalidatePath(): void {},
      },
    ),
  );

  assert.equal(
    result.formError,
    'Single-domain assessment creation requires the latest assessment mode database migration before this path can be used.',
  );
  assert.deepEqual(result.fieldErrors, {});
  assert.equal(calls.length, 1);
});
