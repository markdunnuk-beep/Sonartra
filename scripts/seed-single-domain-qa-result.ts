import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { Pool, type PoolClient } from 'pg';

import {
  SINGLE_DOMAIN_QA_RESULT_FIXTURE,
  getSingleDomainQaAdminLanguageHref,
  getSingleDomainQaResultHref,
} from '../lib/server/single-domain-qa-result-fixture';

type Queryable = {
  query<T>(text: string, params?: readonly unknown[]): Promise<{ rows: T[] }>;
};

type FixtureUserRow = {
  id: string;
};

type SourceSingleDomainResultRow = {
  result_id: string;
  assessment_id: string;
  assessment_version_id: string;
  assessment_key: string;
  assessment_title: string;
  pipeline_status: 'COMPLETED' | 'RUNNING' | 'FAILED' | 'PENDING';
  readiness_status: 'READY' | 'FAILED' | 'PROCESSING';
  canonical_result_payload: Record<string, unknown>;
  generated_at: string | null;
  started_at: string | null;
  submitted_at: string | null;
  completed_at: string | null;
  last_activity_at: string | null;
};

function assertSafeEnvironment(): void {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Refusing to seed the single-domain QA result fixture in production.');
  }
}

function getDatabaseUrl(): string {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error('DATABASE_URL is not set in .env.local');
  }

  return databaseUrl;
}

async function upsertQaFixtureUser(db: Queryable): Promise<string> {
  const result = await db.query<FixtureUserRow>(
    `
    INSERT INTO users (
      clerk_user_id,
      email,
      name,
      role,
      status
    )
    VALUES ($1, $2, $3, 'user', 'active')
    ON CONFLICT (clerk_user_id) DO UPDATE
    SET
      email = EXCLUDED.email,
      name = EXCLUDED.name,
      role = EXCLUDED.role,
      status = EXCLUDED.status,
      updated_at = NOW()
    RETURNING id::text AS id
    `,
    [
      SINGLE_DOMAIN_QA_RESULT_FIXTURE.clerkUserId,
      SINGLE_DOMAIN_QA_RESULT_FIXTURE.email,
      SINGLE_DOMAIN_QA_RESULT_FIXTURE.name,
    ],
  );

  const userId = result.rows[0]?.id;
  if (!userId) {
    throw new Error('Unable to upsert the single-domain QA fixture user.');
  }

  return userId;
}

async function loadSourceSingleDomainResult(db: Queryable): Promise<SourceSingleDomainResultRow> {
  const preferredResult = await db.query<SourceSingleDomainResultRow>(
    `
    SELECT
      r.id::text AS result_id,
      r.assessment_id::text AS assessment_id,
      r.assessment_version_id::text AS assessment_version_id,
      a.assessment_key,
      a.title AS assessment_title,
      r.pipeline_status,
      r.readiness_status,
      r.canonical_result_payload,
      r.generated_at,
      t.started_at,
      t.submitted_at,
      t.completed_at,
      t.last_activity_at
    FROM results r
    INNER JOIN attempts t ON t.id = r.attempt_id
    INNER JOIN assessments a ON a.id = r.assessment_id
    WHERE r.readiness_status = 'READY'
      AND COALESCE(r.canonical_result_payload->'metadata'->>'mode', 'multi_domain') = 'single_domain'
      AND a.assessment_key = $1
    ORDER BY COALESCE(r.generated_at, r.created_at) DESC, r.id DESC
    LIMIT 1
    `,
    [SINGLE_DOMAIN_QA_RESULT_FIXTURE.preferredAssessmentKey],
  );

  const fallbackResult = preferredResult.rows[0]
    ? preferredResult
    : await db.query<SourceSingleDomainResultRow>(
        `
        SELECT
          r.id::text AS result_id,
          r.assessment_id::text AS assessment_id,
          r.assessment_version_id::text AS assessment_version_id,
          a.assessment_key,
          a.title AS assessment_title,
          r.pipeline_status,
          r.readiness_status,
          r.canonical_result_payload,
          r.generated_at,
          t.started_at,
          t.submitted_at,
          t.completed_at,
          t.last_activity_at
        FROM results r
        INNER JOIN attempts t ON t.id = r.attempt_id
        INNER JOIN assessments a ON a.id = r.assessment_id
        WHERE r.readiness_status = 'READY'
          AND COALESCE(r.canonical_result_payload->'metadata'->>'mode', 'multi_domain') = 'single_domain'
        ORDER BY COALESCE(r.generated_at, r.created_at) DESC, r.id DESC
        LIMIT 1
        `,
      );

  const sourceResult = fallbackResult.rows[0];
  if (!sourceResult) {
    throw new Error(
      'No ready single-domain result exists to seed the QA fixture. Generate one single-domain result first.',
    );
  }

  return sourceResult;
}

function clonePayloadWithFixtureAttemptId(
  payload: Record<string, unknown>,
): Record<string, unknown> {
  const metadata =
    payload.metadata && typeof payload.metadata === 'object'
      ? {
          ...payload.metadata,
          attemptId: SINGLE_DOMAIN_QA_RESULT_FIXTURE.attemptId,
        }
      : {
          attemptId: SINGLE_DOMAIN_QA_RESULT_FIXTURE.attemptId,
        };

  return {
    ...payload,
    metadata,
  };
}

async function upsertQaAttempt(params: {
  db: Queryable;
  qaUserId: string;
  sourceResult: SourceSingleDomainResultRow;
}): Promise<void> {
  await params.db.query(
    `
    INSERT INTO attempts (
      id,
      user_id,
      assessment_id,
      assessment_version_id,
      lifecycle_status,
      started_at,
      submitted_at,
      completed_at,
      last_activity_at
    )
    VALUES (
      $1::uuid,
      $2::uuid,
      $3::uuid,
      $4::uuid,
      'RESULT_READY',
      $5::timestamptz,
      $6::timestamptz,
      $7::timestamptz,
      $8::timestamptz
    )
    ON CONFLICT (id) DO UPDATE
    SET
      user_id = EXCLUDED.user_id,
      assessment_id = EXCLUDED.assessment_id,
      assessment_version_id = EXCLUDED.assessment_version_id,
      lifecycle_status = EXCLUDED.lifecycle_status,
      started_at = EXCLUDED.started_at,
      submitted_at = EXCLUDED.submitted_at,
      completed_at = EXCLUDED.completed_at,
      last_activity_at = EXCLUDED.last_activity_at,
      updated_at = NOW()
    `,
    [
      SINGLE_DOMAIN_QA_RESULT_FIXTURE.attemptId,
      params.qaUserId,
      params.sourceResult.assessment_id,
      params.sourceResult.assessment_version_id,
      params.sourceResult.started_at,
      params.sourceResult.submitted_at,
      params.sourceResult.completed_at,
      params.sourceResult.last_activity_at,
    ],
  );
}

async function upsertQaResult(params: {
  db: Queryable;
  sourceResult: SourceSingleDomainResultRow;
}): Promise<void> {
  await params.db.query(
    `
    INSERT INTO results (
      id,
      attempt_id,
      assessment_id,
      assessment_version_id,
      pipeline_status,
      readiness_status,
      canonical_result_payload,
      failure_reason,
      generated_at
    )
    VALUES (
      $1::uuid,
      $2::uuid,
      $3::uuid,
      $4::uuid,
      $5,
      $6,
      $7::jsonb,
      NULL,
      $8::timestamptz
    )
    ON CONFLICT (attempt_id) DO UPDATE
    SET
      id = EXCLUDED.id,
      assessment_id = EXCLUDED.assessment_id,
      assessment_version_id = EXCLUDED.assessment_version_id,
      pipeline_status = EXCLUDED.pipeline_status,
      readiness_status = EXCLUDED.readiness_status,
      canonical_result_payload = EXCLUDED.canonical_result_payload,
      failure_reason = NULL,
      generated_at = EXCLUDED.generated_at,
      updated_at = NOW()
    `,
    [
      SINGLE_DOMAIN_QA_RESULT_FIXTURE.resultId,
      SINGLE_DOMAIN_QA_RESULT_FIXTURE.attemptId,
      params.sourceResult.assessment_id,
      params.sourceResult.assessment_version_id,
      params.sourceResult.pipeline_status,
      params.sourceResult.readiness_status,
      JSON.stringify(
        clonePayloadWithFixtureAttemptId(params.sourceResult.canonical_result_payload),
      ),
      params.sourceResult.generated_at,
    ],
  );
}

async function seedSingleDomainQaResultFixture(client: PoolClient): Promise<{
  assessmentKey: string;
  assessmentTitle: string;
  qaUserId: string;
  sourceResultId: string;
}> {
  const qaUserId = await upsertQaFixtureUser(client);
  const sourceResult = await loadSourceSingleDomainResult(client);

  await upsertQaAttempt({
    db: client,
    qaUserId,
    sourceResult,
  });
  await upsertQaResult({
    db: client,
    sourceResult,
  });

  return {
    assessmentKey: sourceResult.assessment_key,
    assessmentTitle: sourceResult.assessment_title,
    qaUserId,
    sourceResultId: sourceResult.result_id,
  };
}

async function main(): Promise<void> {
  assertSafeEnvironment();

  const pool = new Pool({
    connectionString: getDatabaseUrl(),
    ssl: { rejectUnauthorized: false },
  });

  try {
    const client = await pool.connect();

    try {
      await client.query('BEGIN');
      const seeded = await seedSingleDomainQaResultFixture(client);
      await client.query('COMMIT');

      console.log('Single-domain QA result fixture is ready.');
      console.log(`QA user: ${SINGLE_DOMAIN_QA_RESULT_FIXTURE.email}`);
      console.log(`Assessment: ${seeded.assessmentTitle} (${seeded.assessmentKey})`);
      console.log(`Source result: ${seeded.sourceResultId}`);
      console.log(`Result route: ${getSingleDomainQaResultHref()}`);
      console.log(
        `Admin language route: ${getSingleDomainQaAdminLanguageHref(seeded.assessmentKey)}`,
      );
    } catch (error) {
      await client.query('ROLLBACK').catch(() => undefined);
      throw error;
    } finally {
      client.release();
    }
  } finally {
    await pool.end();
  }
}

main().catch((error) => {
  console.error('Single-domain QA result fixture seed failed.');
  console.error(error);
  process.exit(1);
});
