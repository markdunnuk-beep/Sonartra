import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import assert from 'node:assert/strict';

import { Pool, type PoolClient } from 'pg';

import { runAssessmentEngine } from '../lib/engine/engine-runner';
import { isCanonicalResultPayload } from '../lib/engine/result-contract';
import type { RuntimeResponseSet } from '../lib/engine/types';
import { createAssessmentDefinitionRepository } from '../lib/engine/repository';
import { buildAdminUserDetailViewModel } from '../lib/server/admin-user-detail';
import { buildAdminUsersListPageViewModel } from '../lib/server/admin-users-list';
import { getAssessmentLanguage } from '../lib/server/assessment-language-repository';
import { ADMIN_USERS_COMPLETED_RESULT_FIXTURE } from '../lib/server/admin-users-completed-result-fixture';

type PublishedAssessmentRow = {
  assessment_id: string;
  assessment_version_id: string;
  assessment_title: string;
  version_tag: string;
};

type FirstOptionSelectionRow = {
  question_id: string;
  option_id: string;
  question_order_index: number;
};

type UserRow = {
  id: string;
};

type ResultLookupRow = {
  id: string;
};

type Queryable = {
  query<T>(text: string, params?: unknown[]): Promise<{ rows: T[] }>;
};

type PreparedFixtureData = {
  assessment: PublishedAssessmentRow;
  selections: readonly FirstOptionSelectionRow[];
  payload: ReturnType<typeof runAssessmentEngine> extends Promise<infer T> ? T : never;
};

function buildFixtureResponseId(index: number): string {
  return `00000000-0000-4000-8000-${String(index + 1).padStart(12, '0')}`;
}

function buildFixtureResponseTimestamp(index: number): string {
  return `2026-04-10T09:${String(5 + Math.floor(index / 60)).padStart(2, '0')}:${String(index % 60).padStart(2, '0')}.000Z`;
}

function assertSafeEnvironment(): void {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Refusing to seed the admin users QA fixture in production.');
  }
}

async function getPublishedFixtureAssessment(db: Queryable): Promise<PublishedAssessmentRow> {
  const result = await db.query<PublishedAssessmentRow>(
    `
    SELECT
      a.id AS assessment_id,
      av.id AS assessment_version_id,
      a.title AS assessment_title,
      av.version AS version_tag
    FROM assessments a
    INNER JOIN assessment_versions av ON av.assessment_id = a.id
    WHERE a.assessment_key = $1
      AND av.lifecycle_status = 'PUBLISHED'
    ORDER BY av.published_at DESC NULLS LAST, av.created_at DESC, av.id DESC
    LIMIT 1
    `,
    [ADMIN_USERS_COMPLETED_RESULT_FIXTURE.assessmentKey],
  );

  const row = result.rows[0];
  if (!row) {
    throw new Error(
      `Published assessment "${ADMIN_USERS_COMPLETED_RESULT_FIXTURE.assessmentKey}" was not found. Run the canonical seed path first.`,
    );
  }

  return row;
}

async function listFirstOptionSelections(
  db: Queryable,
  assessmentVersionId: string,
): Promise<readonly FirstOptionSelectionRow[]> {
  const result = await db.query<FirstOptionSelectionRow>(
    `
    SELECT
      q.id AS question_id,
      first_option.id AS option_id,
      q.order_index AS question_order_index
    FROM questions q
    INNER JOIN LATERAL (
      SELECT o.id
      FROM options o
      WHERE o.question_id = q.id
      ORDER BY o.order_index ASC, o.id ASC
      LIMIT 1
    ) AS first_option ON TRUE
    WHERE q.assessment_version_id = $1
    ORDER BY q.order_index ASC, q.id ASC
    `,
    [assessmentVersionId],
  );

  if (result.rows.length === 0) {
    throw new Error(`Assessment version ${assessmentVersionId} has no question/option rows.`);
  }

  return Object.freeze(result.rows);
}

function buildFixtureResponseSet(params: {
  selections: readonly FirstOptionSelectionRow[];
  assessmentKey: string;
  versionTag: string;
}): RuntimeResponseSet {
  return {
    attemptId: ADMIN_USERS_COMPLETED_RESULT_FIXTURE.attemptId,
    assessmentKey: params.assessmentKey,
    versionTag: params.versionTag,
    status: 'submitted',
    submittedAt: ADMIN_USERS_COMPLETED_RESULT_FIXTURE.completedAt,
    responsesByQuestionId: Object.fromEntries(
      params.selections.map((selection, index) => [
        selection.question_id,
        {
          responseId: buildFixtureResponseId(index),
          attemptId: ADMIN_USERS_COMPLETED_RESULT_FIXTURE.attemptId,
          questionId: selection.question_id,
          value: {
            selectedOptionId: selection.option_id,
          },
          updatedAt: buildFixtureResponseTimestamp(index),
        },
      ]),
    ),
  };
}

async function upsertFixtureUser(db: Queryable): Promise<string> {
  const result = await db.query<UserRow>(
    `
    INSERT INTO users (
      id,
      clerk_user_id,
      email,
      name,
      role,
      status
    )
    VALUES ($1::uuid, $2, $3, $4, $5, $6)
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
      ADMIN_USERS_COMPLETED_RESULT_FIXTURE.userId,
      ADMIN_USERS_COMPLETED_RESULT_FIXTURE.clerkUserId,
      ADMIN_USERS_COMPLETED_RESULT_FIXTURE.email,
      ADMIN_USERS_COMPLETED_RESULT_FIXTURE.name,
      ADMIN_USERS_COMPLETED_RESULT_FIXTURE.role,
      ADMIN_USERS_COMPLETED_RESULT_FIXTURE.status,
    ],
  );

  const userId = result.rows[0]?.id;
  if (!userId) {
    throw new Error('Unable to upsert the QA completed-result fixture user.');
  }

  if (userId !== ADMIN_USERS_COMPLETED_RESULT_FIXTURE.userId) {
    throw new Error(
      `Fixture clerk_user_id is already mapped to a different user (${userId}). Remove the conflicting row before reseeding.`,
    );
  }

  return userId;
}

async function pruneFixtureUserHistory(db: Queryable, userId: string): Promise<void> {
  await db.query(
    `
    DELETE FROM user_assessment_assignments
    WHERE user_id = $1::uuid
      AND id <> $2::uuid
    `,
    [userId, ADMIN_USERS_COMPLETED_RESULT_FIXTURE.assignmentId],
  );

  await db.query(
    `
    DELETE FROM results
    WHERE attempt_id IN (
      SELECT id
      FROM attempts
      WHERE user_id = $1::uuid
        AND id <> $2::uuid
    )
    `,
    [userId, ADMIN_USERS_COMPLETED_RESULT_FIXTURE.attemptId],
  );

  await db.query(
    `
    DELETE FROM responses
    WHERE attempt_id IN (
      SELECT id
      FROM attempts
      WHERE user_id = $1::uuid
        AND id <> $2::uuid
    )
    `,
    [userId, ADMIN_USERS_COMPLETED_RESULT_FIXTURE.attemptId],
  );

  await db.query(
    `
    DELETE FROM attempts
    WHERE user_id = $1::uuid
      AND id <> $2::uuid
    `,
    [userId, ADMIN_USERS_COMPLETED_RESULT_FIXTURE.attemptId],
  );
}

async function replaceFixtureResponses(
  db: Queryable,
  selections: readonly FirstOptionSelectionRow[],
): Promise<void> {
  await db.query(
    `
    DELETE FROM responses
    WHERE attempt_id = $1::uuid
    `,
    [ADMIN_USERS_COMPLETED_RESULT_FIXTURE.attemptId],
  );

  for (const [index, selection] of selections.entries()) {
    await db.query(
      `
      INSERT INTO responses (
        id,
        attempt_id,
        question_id,
        selected_option_id,
        responded_at,
        created_at,
        updated_at
      )
      VALUES ($1::uuid, $2::uuid, $3::uuid, $4::uuid, $5::timestamptz, $5::timestamptz, $5::timestamptz)
      `,
      [
        buildFixtureResponseId(index),
        ADMIN_USERS_COMPLETED_RESULT_FIXTURE.attemptId,
        selection.question_id,
        selection.option_id,
        buildFixtureResponseTimestamp(index),
      ],
    );
  }
}

async function prepareCompletedFixture(db: Queryable): Promise<PreparedFixtureData> {
  const assessment = await getPublishedFixtureAssessment(db);
  const selections = await listFirstOptionSelections(db, assessment.assessment_version_id);
  const repository = createAssessmentDefinitionRepository({ db });
  const responseSet = buildFixtureResponseSet({
    selections,
    assessmentKey: ADMIN_USERS_COMPLETED_RESULT_FIXTURE.assessmentKey,
    versionTag: assessment.version_tag,
  });
  const payload = await runAssessmentEngine({
    repository,
    assessmentVersionId: assessment.assessment_version_id,
    responses: responseSet,
    loadAssessmentLanguage: getAssessmentLanguage,
  });

  if (!isCanonicalResultPayload(payload)) {
    throw new Error('Generated completed-result fixture payload is not canonical.');
  }

  return {
    assessment,
    selections,
    payload,
  };
}

async function seedCompletedFixture(
  client: PoolClient,
  prepared: PreparedFixtureData,
): Promise<{
  userId: string;
  resultId: string;
}> {
  const fixtureUserId = await upsertFixtureUser(client);

  await pruneFixtureUserHistory(client, fixtureUserId);

  await client.query(
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
      last_activity_at,
      created_at,
      updated_at
    )
    VALUES (
      $1::uuid,
      $2::uuid,
      $3::uuid,
      $4::uuid,
      'RESULT_READY',
      $5::timestamptz,
      $6::timestamptz,
      $6::timestamptz,
      $6::timestamptz,
      $5::timestamptz,
      $6::timestamptz
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
      updated_at = EXCLUDED.updated_at
    `,
    [
      ADMIN_USERS_COMPLETED_RESULT_FIXTURE.attemptId,
      fixtureUserId,
      prepared.assessment.assessment_id,
      prepared.assessment.assessment_version_id,
      ADMIN_USERS_COMPLETED_RESULT_FIXTURE.startedAt,
      ADMIN_USERS_COMPLETED_RESULT_FIXTURE.completedAt,
    ],
  );

  await replaceFixtureResponses(client, prepared.selections);

  await client.query(
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
      generated_at,
      created_at,
      updated_at
    )
    VALUES (
      $1::uuid,
      $2::uuid,
      $3::uuid,
      $4::uuid,
      'COMPLETED',
      'READY',
      $5::jsonb,
      NULL,
      $6::timestamptz,
      $6::timestamptz,
      $6::timestamptz
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
      updated_at = EXCLUDED.updated_at
    `,
    [
      ADMIN_USERS_COMPLETED_RESULT_FIXTURE.resultId,
      ADMIN_USERS_COMPLETED_RESULT_FIXTURE.attemptId,
      prepared.assessment.assessment_id,
      prepared.assessment.assessment_version_id,
      JSON.stringify(prepared.payload),
      ADMIN_USERS_COMPLETED_RESULT_FIXTURE.completedAt,
    ],
  );

  await client.query(
    `
    INSERT INTO user_assessment_assignments (
      id,
      user_id,
      assessment_id,
      assessment_version_id,
      status,
      order_index,
      assigned_at,
      started_at,
      completed_at,
      attempt_id,
      created_at,
      updated_at
    )
    VALUES (
      $1::uuid,
      $2::uuid,
      $3::uuid,
      $4::uuid,
      'completed',
      0,
      $5::timestamptz,
      $6::timestamptz,
      $7::timestamptz,
      $8::uuid,
      $5::timestamptz,
      $7::timestamptz
    )
    ON CONFLICT (id) DO UPDATE
    SET
      user_id = EXCLUDED.user_id,
      assessment_id = EXCLUDED.assessment_id,
      assessment_version_id = EXCLUDED.assessment_version_id,
      status = EXCLUDED.status,
      order_index = EXCLUDED.order_index,
      assigned_at = EXCLUDED.assigned_at,
      started_at = EXCLUDED.started_at,
      completed_at = EXCLUDED.completed_at,
      attempt_id = EXCLUDED.attempt_id,
      updated_at = EXCLUDED.updated_at
    `,
    [
      ADMIN_USERS_COMPLETED_RESULT_FIXTURE.assignmentId,
      fixtureUserId,
      prepared.assessment.assessment_id,
      prepared.assessment.assessment_version_id,
      ADMIN_USERS_COMPLETED_RESULT_FIXTURE.assignedAt,
      ADMIN_USERS_COMPLETED_RESULT_FIXTURE.startedAt,
      ADMIN_USERS_COMPLETED_RESULT_FIXTURE.completedAt,
      ADMIN_USERS_COMPLETED_RESULT_FIXTURE.attemptId,
    ],
  );

  const resultLookup = await client.query<ResultLookupRow>(
    `
    SELECT id::text AS id
    FROM results
    WHERE attempt_id = $1::uuid
    `,
    [ADMIN_USERS_COMPLETED_RESULT_FIXTURE.attemptId],
  );

  const resultId = resultLookup.rows[0]?.id;
  if (!resultId) {
    throw new Error('Fixture result record was not persisted.');
  }

  return {
    userId: fixtureUserId,
    resultId,
  };
}

async function validateFixture(client: PoolClient, userId: string, resultId: string): Promise<void> {
  const listViewModel = await buildAdminUsersListPageViewModel({
    db: client,
    searchParams: {
      q: ADMIN_USERS_COMPLETED_RESULT_FIXTURE.email,
    },
  });

  const listItem = listViewModel.items.find(
    (item) => item.email === ADMIN_USERS_COMPLETED_RESULT_FIXTURE.email,
  );

  assert.ok(listItem, 'Fixture user was not discoverable in the admin users list.');
  assert.equal(listItem.progressState, 'completed');
  assert.equal(listItem.currentAssessmentLabel, null);
  assert.equal(listItem.nextAssessmentLabel, null);

  const detailViewModel = await buildAdminUserDetailViewModel({
    db: client,
    userId,
  });

  assert.ok(detailViewModel, 'Fixture user detail view model could not be loaded.');
  assert.equal(detailViewModel.email, ADMIN_USERS_COMPLETED_RESULT_FIXTURE.email);
  assert.equal(detailViewModel.assignments.length, 1);
  assert.equal(detailViewModel.assignments[0]?.status, 'completed');
  assert.equal(
    detailViewModel.controls.assignments[0]?.blockedReason,
    'Result exists - history locked.',
  );
  assert.equal(detailViewModel.controls.assignments[0]?.resultHref, `/app/results/${resultId}`);
}

async function main() {
  assertSafeEnvironment();

  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error('DATABASE_URL is not set in .env.local');
  }

  const pool = new Pool({
    connectionString: databaseUrl,
    ssl: { rejectUnauthorized: false },
  });

  try {
    const prepared = await prepareCompletedFixture(pool);
    const client = await pool.connect();

    try {
      await client.query('BEGIN');
      const seeded = await seedCompletedFixture(client, prepared);
      await validateFixture(client, seeded.userId, seeded.resultId);
      await client.query('COMMIT');

      console.log('Admin users completed-result QA fixture is ready.');
      console.log(`User: ${ADMIN_USERS_COMPLETED_RESULT_FIXTURE.email}`);
      console.log(`Admin detail: /admin/users/${seeded.userId}`);
      console.log(`Result: /app/results/${seeded.resultId}`);
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
  console.error('Admin users completed-result QA fixture seed failed.');
  console.error(error);
  process.exit(1);
});
