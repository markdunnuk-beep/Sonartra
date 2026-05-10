import test from 'node:test';
import assert from 'node:assert/strict';

import {
  parseResetArgs,
  runAssessmentResultReset,
} from '@/scripts/admin/reset-assessment-result';

type Row = Record<string, unknown> & { id: string };
type FakeState = {
  users: Row[];
  assessments: Row[];
  assessment_versions: Row[];
  attempts: Row[];
  responses: Row[];
  results: Row[];
  user_assessment_assignments: Row[];
  voice_sessions: Row[];
  voice_session_turns: Row[];
  voice_response_resolutions: Row[];
  voice_session_events: Row[];
};

const localEnv = {
  DATABASE_URL: 'postgresql://sonartra_local:sonartra_local@127.0.0.1:54329/sonartra_local',
};

function createState(overrides: Partial<FakeState> = {}): FakeState {
  return {
    users: [
      {
        id: 'user-mark',
        clerk_user_id: 'clerk-mark',
        email: 'mark.dunn.uk@gmail.com',
        name: 'Mark Dunn',
        role: 'admin',
        status: 'active',
        created_at: '2026-05-01T00:00:00.000Z',
      },
    ],
    assessments: [
      {
        id: 'assessment-leadership',
        assessment_key: 'leadership-approach',
        title: 'Leadership Approach',
        description: 'Leadership Approach assessment',
        is_active: true,
      },
      {
        id: 'assessment-other',
        assessment_key: 'other-assessment',
        title: 'Other',
        description: null,
        is_active: true,
      },
    ],
    assessment_versions: [
      {
        id: 'version-leadership-200',
        assessment_id: 'assessment-leadership',
        version: '2.00',
        lifecycle_status: 'PUBLISHED',
        mode: 'single_domain',
        result_model_key: 'ranked_pattern',
        published_at: '2026-05-09T00:00:00.000Z',
        created_at: '2026-05-08T00:00:00.000Z',
      },
      {
        id: 'version-leadership-100',
        assessment_id: 'assessment-leadership',
        version: '1.00',
        lifecycle_status: 'ARCHIVED',
        mode: 'single_domain',
        result_model_key: 'ranked_pattern',
        published_at: '2026-04-01T00:00:00.000Z',
        created_at: '2026-04-01T00:00:00.000Z',
      },
      {
        id: 'version-other-100',
        assessment_id: 'assessment-other',
        version: '1.00',
        lifecycle_status: 'PUBLISHED',
        mode: 'single_domain',
        result_model_key: 'ranked_pattern',
        published_at: '2026-04-01T00:00:00.000Z',
        created_at: '2026-04-01T00:00:00.000Z',
      },
    ],
    attempts: [
      {
        id: 'attempt-leadership',
        user_id: 'user-mark',
        assessment_id: 'assessment-leadership',
        assessment_version_id: 'version-leadership-200',
        lifecycle_status: 'RESULT_READY',
        started_at: '2026-05-09T10:00:00.000Z',
        submitted_at: '2026-05-09T10:30:00.000Z',
        completed_at: '2026-05-09T10:31:00.000Z',
        last_activity_at: '2026-05-09T10:31:00.000Z',
        created_at: '2026-05-09T10:00:00.000Z',
        updated_at: '2026-05-09T10:31:00.000Z',
      },
      {
        id: 'attempt-other',
        user_id: 'user-mark',
        assessment_id: 'assessment-other',
        assessment_version_id: 'version-other-100',
        lifecycle_status: 'RESULT_READY',
        started_at: '2026-05-09T11:00:00.000Z',
        submitted_at: '2026-05-09T11:30:00.000Z',
        completed_at: '2026-05-09T11:31:00.000Z',
        last_activity_at: '2026-05-09T11:31:00.000Z',
        created_at: '2026-05-09T11:00:00.000Z',
        updated_at: '2026-05-09T11:31:00.000Z',
      },
    ],
    responses: [
      { id: 'response-leadership', attempt_id: 'attempt-leadership', created_at: '2026-05-09T10:05:00.000Z' },
      { id: 'response-other', attempt_id: 'attempt-other', created_at: '2026-05-09T11:05:00.000Z' },
    ],
    results: [
      {
        id: 'result-leadership',
        attempt_id: 'attempt-leadership',
        assessment_id: 'assessment-leadership',
        assessment_version_id: 'version-leadership-200',
        pipeline_status: 'COMPLETED',
        readiness_status: 'READY',
        canonical_result_payload: { ok: true },
        failure_reason: null,
        generated_at: '2026-05-09T10:31:00.000Z',
        created_at: '2026-05-09T10:31:00.000Z',
        updated_at: '2026-05-09T10:31:00.000Z',
      },
      {
        id: 'result-other',
        attempt_id: 'attempt-other',
        assessment_id: 'assessment-other',
        assessment_version_id: 'version-other-100',
        pipeline_status: 'COMPLETED',
        readiness_status: 'READY',
        canonical_result_payload: { ok: true },
        failure_reason: null,
        generated_at: '2026-05-09T11:31:00.000Z',
        created_at: '2026-05-09T11:31:00.000Z',
        updated_at: '2026-05-09T11:31:00.000Z',
      },
    ],
    user_assessment_assignments: [
      {
        id: 'assignment-leadership',
        user_id: 'user-mark',
        assessment_id: 'assessment-leadership',
        assessment_version_id: 'version-leadership-200',
        status: 'completed',
        order_index: 0,
        assigned_at: '2026-05-09T09:50:00.000Z',
        started_at: '2026-05-09T10:00:00.000Z',
        completed_at: '2026-05-09T10:31:00.000Z',
        attempt_id: 'attempt-leadership',
        created_at: '2026-05-09T09:50:00.000Z',
        updated_at: '2026-05-09T10:31:00.000Z',
      },
    ],
    voice_sessions: [],
    voice_session_turns: [],
    voice_response_resolutions: [],
    voice_session_events: [],
    ...overrides,
  };
}

function asStrings(value: unknown): readonly string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
}

function getTableFromSql(sql: string): keyof FakeState | null {
  const match = /(?:FROM|DELETE\s+FROM)\s+([a-z_]+)/i.exec(sql);
  return (match?.[1] as keyof FakeState | undefined) ?? null;
}

function attemptsFor(state: FakeState, params?: readonly unknown[]): Row[] {
  const userId = String(params?.[0] ?? '');
  const assessmentId = String(params?.[1] ?? '');
  return state.attempts.filter((row) => row.user_id === userId && row.assessment_id === assessmentId);
}

function filterRows(state: FakeState, table: keyof FakeState, sql: string, params?: readonly unknown[]): Row[] {
  const first = params?.[0];
  const second = params?.[1];
  const userId = String(first ?? '');
  const assessmentId = String(second ?? '');
  const firstArray = asStrings(first);

  switch (table) {
    case 'users':
      return state.users.filter(
        (row) =>
          String(row.email).toLowerCase() === String(first).toLowerCase()
          && (second === null || row.id === second),
      );
    case 'assessments':
      return state.assessments.filter((row) => row.assessment_key === first);
    case 'assessment_versions':
      if (sql.includes('version = $2')) {
        return state.assessment_versions.filter(
          (row) => row.assessment_id === first && row.version === second && row.lifecycle_status === 'PUBLISHED',
        );
      }
      return state.assessment_versions.filter((row) => row.assessment_id === first);
    case 'attempts':
      return attemptsFor(state, params);
    case 'responses': {
      const attemptIds = new Set(attemptsFor(state, params).map((row) => row.id));
      return state.responses.filter((row) => attemptIds.has(String(row.attempt_id)));
    }
    case 'results': {
      const attemptIds = new Set(attemptsFor(state, params).map((row) => row.id));
      return state.results.filter((row) => attemptIds.has(String(row.attempt_id)));
    }
    case 'user_assessment_assignments':
      return state.user_assessment_assignments.filter((row) => row.user_id === userId && row.assessment_id === assessmentId);
    case 'voice_sessions':
      return state.voice_sessions.filter((row) => row.user_id === userId && row.assessment_id === assessmentId);
    case 'voice_session_turns':
    case 'voice_response_resolutions':
    case 'voice_session_events':
      return state[table].filter((row) => firstArray.includes(String(row.voice_session_id)));
  }
}

function mapSelectedRows(table: keyof FakeState, sql: string, rows: readonly Row[]): readonly Record<string, unknown>[] {
  if (table === 'users' && sql.includes('id::text AS user_id')) {
    return rows.map((row) => ({ ...row, user_id: row.id }));
  }
  if (table === 'assessments' && sql.includes('id::text AS assessment_id')) {
    return rows.map((row) => ({ ...row, assessment_id: row.id }));
  }
  if (table === 'assessment_versions' && sql.includes('id::text AS assessment_version_id')) {
    return rows.map((row) => ({ ...row, assessment_version_id: row.id }));
  }
  if (table === 'attempts' && sql.includes('id::text AS attempt_id')) {
    return rows.map((row) => ({
      ...row,
      attempt_id: row.id,
      version: String(row.assessment_version_id) === 'version-leadership-200' ? '2.00' : '1.00',
    }));
  }
  if (table === 'results' && sql.includes('id::text AS result_id')) {
    return rows.map((row) => ({
      ...row,
      result_id: row.id,
      has_canonical_result_payload: row.canonical_result_payload !== null,
      version: String(row.assessment_version_id) === 'version-leadership-200' ? '2.00' : '1.00',
    }));
  }
  if (table === 'user_assessment_assignments' && sql.includes('id::text AS assignment_id')) {
    return rows.map((row) => ({
      ...row,
      assignment_id: row.id,
      version: String(row.assessment_version_id) === 'version-leadership-200' ? '2.00' : '1.00',
    }));
  }
  if (table === 'voice_sessions' && sql.includes('id::text AS voice_session_id')) {
    return rows.map((row) => ({ voice_session_id: row.id }));
  }
  return rows;
}

function createFakePool(state = createState()) {
  const statements: string[] = [];
  const client = {
    async query<T>(text: string, params?: readonly unknown[]) {
      const sql = text.replace(/\s+/g, ' ').trim();
      statements.push(sql);

      if (sql === 'BEGIN' || sql === 'COMMIT' || sql === 'ROLLBACK') {
        return { rows: [] as T[] };
      }
      if (sql.includes('information_schema.tables')) {
        const tableName = String(params?.[0] ?? '');
        return { rows: [{ exists: Object.prototype.hasOwnProperty.call(state, tableName) }] as T[] };
      }
      if (sql.startsWith('SELECT COUNT(*) AS count')) {
        const table = getTableFromSql(sql);
        assert.ok(table);
        return { rows: [{ count: filterRows(state, table, sql, params).length }] as T[] };
      }

      const table = getTableFromSql(sql);
      assert.ok(table, `Unhandled SQL: ${text}`);
      const rows = filterRows(state, table, sql, params);

      if (sql.startsWith('DELETE FROM')) {
        state[table] = state[table].filter((row) => !rows.includes(row));
        return { rows: rows.map((row) => ({ id: row.id })) as T[] };
      }

      return { rows: mapSelectedRows(table, sql, rows) as T[] };
    },
    release() {},
  };

  return {
    pool: {
      async connect() {
        return client;
      },
    },
    state,
    statements,
  };
}

test('dry-run audits only the target user and leadership assessment runtime rows', async () => {
  const fake = createFakePool();
  const options = parseResetArgs(
    ['--email', 'mark.dunn.uk@gmail.com', '--assessment-key', 'leadership-approach', '--dry-run'],
    localEnv,
  );

  const result = await runAssessmentResultReset(options, { dbPool: fake.pool });

  assert.equal(result.mode, 'dry-run');
  assert.equal(result.user.user_id, 'user-mark');
  assert.equal(result.assessment.assessment_id, 'assessment-leadership');
  assert.equal(result.publishedVersion.version, '2.00');
  assert.equal(result.tableSummaries.find((summary) => summary.table === 'attempts')?.rowCount, 1);
  assert.equal(result.tableSummaries.find((summary) => summary.table === 'responses')?.rowCount, 1);
  assert.equal(result.tableSummaries.find((summary) => summary.table === 'results')?.rowCount, 1);
  assert.equal(fake.state.attempts.length, 2);
  assert.equal(fake.statements.some((statement) => statement.startsWith('DELETE FROM')), false);
});

test('apply requires explicit production reset confirmation', () => {
  assert.throws(
    () => parseResetArgs(
      ['--email', 'mark.dunn.uk@gmail.com', '--assessment-key', 'leadership-approach', '--apply'],
      localEnv,
    ),
    /CONFIRM_PRODUCTION_RESET_REQUIRED/,
  );
});

test('apply deletes target runtime rows inside a transaction and leaves other assessments untouched', async () => {
  const fake = createFakePool();
  const options = parseResetArgs(
    [
      '--email',
      'mark.dunn.uk@gmail.com',
      '--assessment-key',
      'leadership-approach',
      '--apply',
      '--confirm-production-reset',
    ],
    localEnv,
  );

  const result = await runAssessmentResultReset(options, { dbPool: fake.pool });

  assert.equal(fake.statements.includes('BEGIN'), true);
  assert.equal(fake.statements.includes('COMMIT'), true);
  assert.equal(result.after?.attempts, 0);
  assert.deepEqual(fake.state.attempts.map((row) => row.id), ['attempt-other']);
  assert.deepEqual(fake.state.responses.map((row) => row.id), ['response-other']);
  assert.deepEqual(fake.state.results.map((row) => row.id), ['result-other']);
});

test('ambiguous user email is refused before mutation', async () => {
  const fake = createFakePool(createState({
    users: [
      ...createState().users,
      {
        id: 'user-duplicate',
        clerk_user_id: 'clerk-duplicate',
        email: 'mark.dunn.uk@gmail.com',
        name: null,
        role: 'user',
        status: 'active',
        created_at: '2026-05-02T00:00:00.000Z',
      },
    ],
  }));
  const options = parseResetArgs(
    ['--email', 'mark.dunn.uk@gmail.com', '--assessment-key', 'leadership-approach', '--dry-run'],
    localEnv,
  );

  await assert.rejects(
    () => runAssessmentResultReset(options, { dbPool: fake.pool }),
    /USER_EMAIL_AMBIGUOUS/,
  );
});

test('explicit user id disambiguates duplicate email rows', async () => {
  const fake = createFakePool(createState({
    users: [
      ...createState().users,
      {
        id: 'user-duplicate',
        clerk_user_id: 'clerk-duplicate',
        email: 'mark.dunn.uk@gmail.com',
        name: null,
        role: 'user',
        status: 'active',
        created_at: '2026-05-02T00:00:00.000Z',
      },
    ],
  }));
  const options = parseResetArgs(
    [
      '--email',
      'mark.dunn.uk@gmail.com',
      '--user-id',
      'user-mark',
      '--assessment-key',
      'leadership-approach',
      '--dry-run',
    ],
    localEnv,
  );

  const result = await runAssessmentResultReset(options, { dbPool: fake.pool });

  assert.equal(result.user.user_id, 'user-mark');
});

test('missing published expected version is refused', async () => {
  const fake = createFakePool(createState({
    assessment_versions: createState().assessment_versions.map((version) =>
      version.id === 'version-leadership-200' ? { ...version, lifecycle_status: 'DRAFT' } : version,
    ),
  }));
  const options = parseResetArgs(
    ['--email', 'mark.dunn.uk@gmail.com', '--assessment-key', 'leadership-approach', '--dry-run'],
    localEnv,
  );

  await assert.rejects(
    () => runAssessmentResultReset(options, { dbPool: fake.pool }),
    /PUBLISHED_VERSION_NOT_FOUND/,
  );
});
