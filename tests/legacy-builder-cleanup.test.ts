import test from 'node:test';
import assert from 'node:assert/strict';

import {
  parseCleanupArgs,
  runLegacyBuilderAssessmentCleanup,
} from '@/scripts/database/remove-legacy-builder-assessments';

type Row = Record<string, unknown> & { id: string };

type FakeState = Record<string, Row[]>;

function createState(overrides: Partial<FakeState> = {}): FakeState {
  return {
    assessments: [
      { id: 'assessment-legacy', assessment_key: 'sonartra-leadership-approach', title: 'Sonartra Leadership Approach' },
    ],
    assessment_versions: [
      {
        id: 'version-legacy',
        assessment_id: 'assessment-legacy',
        version: '2.00',
        lifecycle_status: 'DRAFT',
        result_model_key: null,
      },
    ],
    domains: [{ id: 'domain-1', assessment_version_id: 'version-legacy' }],
    signals: [{ id: 'signal-1', assessment_version_id: 'version-legacy' }],
    questions: [{ id: 'question-1', assessment_version_id: 'version-legacy' }],
    options: [{ id: 'option-1', question_id: 'question-1' }],
    option_signal_weights: [{ id: 'weight-1', option_id: 'option-1', signal_id: 'signal-1' }],
    attempts: [{ id: 'attempt-1', assessment_id: 'assessment-legacy', assessment_version_id: 'version-legacy' }],
    responses: [{ id: 'response-1', attempt_id: 'attempt-1', question_id: 'question-1', selected_option_id: 'option-1' }],
    results: [
      {
        id: 'result-1',
        attempt_id: 'attempt-1',
        assessment_id: 'assessment-legacy',
        assessment_version_id: 'version-legacy',
        readiness_status: 'READY',
      },
    ],
    assessment_import_batches: [],
    assessment_import_files: [],
    assessment_import_audit_items: [],
    assessment_ranked_patterns: [],
    assessment_score_shape_rules: [],
    assessment_result_section_definitions: [],
    assessment_result_language_rows: [],
    assessment_report_preview_cases: [],
    user_assessment_assignments: [],
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

function tableFromSql(sql: string): string | null {
  return /FROM\s+([a-z_]+)/i.exec(sql)?.[1] ?? /DELETE\s+FROM\s+([a-z_]+)/i.exec(sql)?.[1] ?? null;
}

function filterRows(table: string, rows: readonly Row[], params?: readonly unknown[]): Row[] {
  const first = asStrings(params?.[0]);
  const second = asStrings(params?.[1]);
  const third = asStrings(params?.[2]);

  switch (table) {
    case 'assessments':
      return rows.filter(
        (row) =>
          first.includes(String(row.assessment_key)) ||
          (first.includes(String(row.id)) && second.includes(String(row.assessment_key))),
      );
    case 'assessment_versions':
      return rows.filter((row) => first.includes(String(row.assessment_id)));
    case 'domains':
    case 'signals':
    case 'questions':
    case 'assessment_ranked_patterns':
    case 'assessment_score_shape_rules':
    case 'assessment_result_section_definitions':
    case 'assessment_result_language_rows':
    case 'assessment_report_preview_cases':
      return rows.filter((row) => first.includes(String(row.assessment_version_id)));
    case 'options':
      return rows.filter((row) => first.includes(String(row.question_id)));
    case 'option_signal_weights':
      return rows.filter((row) => first.includes(String(row.option_id)) || second.includes(String(row.signal_id)));
    case 'attempts':
      return rows.filter((row) => first.includes(String(row.assessment_id)) || second.includes(String(row.assessment_version_id)));
    case 'responses':
      return rows.filter(
        (row) =>
          first.includes(String(row.attempt_id)) ||
          second.includes(String(row.question_id)) ||
          third.includes(String(row.selected_option_id)),
      );
    case 'results':
      return rows.filter(
        (row) =>
          first.includes(String(row.attempt_id)) ||
          second.includes(String(row.assessment_id)) ||
          third.includes(String(row.assessment_version_id)),
      );
    case 'assessment_import_batches':
      return rows.filter((row) => first.includes(String(row.assessment_id)) || second.includes(String(row.assessment_version_id)));
    case 'assessment_import_files':
    case 'assessment_import_audit_items':
      return rows.filter((row) => first.includes(String(row.import_batch_id)));
    case 'user_assessment_assignments':
      return rows.filter(
        (row) =>
          first.includes(String(row.assessment_id)) ||
          second.includes(String(row.assessment_version_id)) ||
          third.includes(String(row.attempt_id)),
      );
    case 'voice_sessions':
      return rows.filter(
        (row) =>
          first.includes(String(row.attempt_id)) ||
          second.includes(String(row.assessment_id)) ||
          third.includes(String(row.assessment_version_id)),
      );
    case 'voice_session_turns':
      return rows.filter((row) => first.includes(String(row.voice_session_id)) || second.includes(String(row.question_id)));
    case 'voice_response_resolutions':
      return rows.filter(
        (row) =>
          first.includes(String(row.voice_session_id)) ||
          second.includes(String(row.question_id)) ||
          third.includes(String(row.inferred_option_id)) ||
          third.includes(String(row.final_selected_option_id)),
      );
    case 'voice_session_events':
      return rows.filter((row) => first.includes(String(row.voice_session_id)));
    default:
      return [];
  }
}

function createFakePool(state = createState()) {
  const statements: string[] = [];
  const client = {
    async query<T>(text: string, params?: readonly unknown[]) {
      statements.push(text);

      if (/WHERE[\s\S]*title\s*=/i.test(text)) {
        throw new Error('title matching is not allowed');
      }

      if (text.trim() === 'BEGIN' || text.trim() === 'COMMIT' || text.trim() === 'ROLLBACK') {
        return { rows: [] as T[] };
      }

      if (text.includes('information_schema.tables')) {
        const tableName = String(params?.[0] ?? '');
        return { rows: [{ exists: Object.prototype.hasOwnProperty.call(state, tableName) }] as T[] };
      }

      const table = tableFromSql(text);
      assert.ok(table, `Unhandled SQL: ${text}`);
      const rows = state[table] ?? [];

      if (/^DELETE\s+FROM/i.test(text)) {
        const selected = filterRows(table, rows, params);
        state[table] = rows.filter((row) => !selected.includes(row));
        return { rows: selected.map((row) => ({ id: row.id })) as T[] };
      }

      if (/^SELECT\s+id\s+AS\s+/i.test(text) || /^SELECT\s+\*/i.test(text) || text.includes('FROM assessments') || text.includes('FROM assessment_versions')) {
        const selected = filterRows(table, rows, params);
        const mapped = selected.map((row) => {
          if (text.includes('id AS assessment_id')) {
            return { assessment_id: row.id, assessment_key: row.assessment_key, title: row.title };
          }
          if (text.includes('id AS assessment_version_id')) {
            return {
              assessment_version_id: row.id,
              assessment_id: row.assessment_id,
              version: row.version,
              lifecycle_status: row.lifecycle_status,
              result_model_key: row.result_model_key,
            };
          }
          if (text.includes('id AS domain_id')) {
            return { domain_id: row.id };
          }
          if (text.includes('id AS signal_id')) {
            return { signal_id: row.id };
          }
          if (text.includes('id AS question_id')) {
            return { question_id: row.id };
          }
          if (text.includes('id AS option_id')) {
            return { option_id: row.id };
          }
          if (text.includes('id AS attempt_id')) {
            return { attempt_id: row.id };
          }
          if (text.includes('id AS import_batch_id')) {
            return { import_batch_id: row.id };
          }
          if (text.includes('id AS section_definition_id')) {
            return { section_definition_id: row.id };
          }
          if (text.includes('id AS voice_session_id')) {
            return { voice_session_id: row.id };
          }
          return row;
        });
        return { rows: mapped as T[] };
      }

      return { rows: [] as T[] };
    },
    release() {},
  };

  return {
    pool: {
      async connect() {
        return client;
      },
    },
    statements,
    state,
  };
}

const localEnv = {
  DATABASE_URL: 'postgresql://sonartra_local:sonartra_local@127.0.0.1:54329/sonartra_local',
};

test('dry-run does not delete and reports dependent runtime rows', async () => {
  const fake = createFakePool();
  const options = parseCleanupArgs(
    ['--target', 'local', '--assessment-key', 'sonartra-leadership-approach'],
    localEnv,
  );

  const result = await runLegacyBuilderAssessmentCleanup(options, { dbPool: fake.pool });

  assert.equal(result.mode, 'dry-run');
  assert.equal(fake.state.assessments.length, 1);
  assert.equal(result.includesRuntimeData, true);
  assert.equal(result.completedResultCount, 1);
  assert.equal(result.tableSummaries.find((summary) => summary.table === 'attempts')?.rowCount, 1);
  assert.equal(fake.statements.some((statement) => statement.startsWith('DELETE FROM')), false);
});

test('protected package-first key is refused', async () => {
  const fake = createFakePool();
  const options = parseCleanupArgs(['--target', 'local', '--assessment-key', 'leadership-approach'], localEnv);

  await assert.rejects(
    () => runLegacyBuilderAssessmentCleanup(options, { dbPool: fake.pool }),
    /PROTECTED|leadership-approach/,
  );
});

test('apply requires explicit --apply before deleting', async () => {
  const fake = createFakePool();
  const options = parseCleanupArgs(
    ['--target', 'local', '--assessment-key', 'sonartra-leadership-approach'],
    localEnv,
  );

  await runLegacyBuilderAssessmentCleanup(options, { dbPool: fake.pool });

  assert.equal(fake.state.assessments.length, 1);
  assert.equal(fake.statements.includes('BEGIN'), false);
});

test('apply uses transaction and deletes only explicitly named assessment keys', async () => {
  const fake = createFakePool({
    ...createState(),
    assessments: [
      { id: 'assessment-legacy', assessment_key: 'sonartra-leadership-approach', title: 'Sonartra Leadership Approach' },
      { id: 'assessment-other', assessment_key: 'test', title: 'test' },
    ],
  });
  const options = parseCleanupArgs(
    ['--target', 'local', '--assessment-key', 'sonartra-leadership-approach', '--apply'],
    localEnv,
  );

  await runLegacyBuilderAssessmentCleanup(options, { dbPool: fake.pool });

  assert.equal(fake.statements.includes('BEGIN'), true);
  assert.equal(fake.statements.includes('COMMIT'), true);
  assert.deepEqual(fake.state.assessments.map((row) => row.assessment_key), ['test']);
});

test('zero-row apply is refused by default', async () => {
  const fake = createFakePool(createState({ assessments: [] }));
  const options = parseCleanupArgs(
    ['--target', 'local', '--assessment-key', 'sonartra-leadership-approach', '--apply'],
    localEnv,
  );

  await assert.rejects(
    () => runLegacyBuilderAssessmentCleanup(options, { dbPool: fake.pool }),
    /ZERO_ROW_APPLY_REFUSED/,
  );
});

test('broad title matching is not used', async () => {
  const fake = createFakePool();
  const options = parseCleanupArgs(
    ['--target', 'local', '--assessment-key', 'sonartra-leadership-approach'],
    localEnv,
  );

  await runLegacyBuilderAssessmentCleanup(options, { dbPool: fake.pool });

  assert.equal(fake.statements.some((statement) => /WHERE[\s\S]*title\s*=/i.test(statement)), false);
});
