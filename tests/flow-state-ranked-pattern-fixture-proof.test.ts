import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import {
  assertFlowStateFixtureProofEnvironment,
  assertRequiredRankedPatternPayloadSections,
  FLOW_STATE_REQUIRED_PAYLOAD_SECTIONS,
  parseFlowStateFixtureProofArgs,
} from '@/scripts/assessment-packages/prove-flow-state-ranked-pattern-fixture';

test('Flow State proof CLI requires explicit local DB write flags', () => {
  const args = parseFlowStateFixtureProofArgs([]);

  assert.equal(args.local, false);
  assert.equal(args.allowLocalDbWrite, false);
  assert.throws(
    () =>
      assertFlowStateFixtureProofEnvironment(
        {
          DATABASE_URL: 'postgres://user:pass@localhost:5432/sonartra_test',
        } as NodeJS.ProcessEnv,
        args,
      ),
    /requires --local and --allow-local-db-write/,
  );
});

test('Flow State proof guard rejects production and non-local database targets', () => {
  const args = parseFlowStateFixtureProofArgs(['--local', '--allow-local-db-write']);

  assert.throws(
    () =>
      assertFlowStateFixtureProofEnvironment(
        {
          NODE_ENV: 'production',
          DATABASE_URL: 'postgres://user:pass@localhost:5432/sonartra_test',
        } as NodeJS.ProcessEnv,
        args,
      ),
    /production/,
  );

  assert.throws(
    () =>
      assertFlowStateFixtureProofEnvironment(
        {
          DATABASE_URL: 'postgres://user:pass@example.com:5432/sonartra_test',
        } as NodeJS.ProcessEnv,
        args,
      ),
    /localhost database/,
  );
});

test('Flow State proof guard accepts explicit local fixture execution', () => {
  const args = parseFlowStateFixtureProofArgs(['--local', '--allow-local-db-write']);

  assert.doesNotThrow(() =>
    assertFlowStateFixtureProofEnvironment(
      {
        DATABASE_URL: 'postgres://user:pass@127.0.0.1:5432/sonartra_test',
      } as NodeJS.ProcessEnv,
      args,
    ),
  );
});

test('Flow State proof validates all ranked-pattern canonical payload sections', () => {
  assert.deepEqual(
    FLOW_STATE_REQUIRED_PAYLOAD_SECTIONS,
    [
      'metadata',
      'assessment',
      'attempt',
      'domain',
      'topSignal',
      'rankedSignals',
      'normalizedScores',
      'scoreShape',
      'patternKey',
      'context',
      'orientation',
      'recognition',
      'signalRoles',
      'patternMechanics',
      'patternSynthesis',
      'strengths',
      'narrowing',
      'application',
      'closingIntegration',
      'diagnostics',
    ],
  );

  const payload = Object.fromEntries(FLOW_STATE_REQUIRED_PAYLOAD_SECTIONS.map((key) => [key, {}]));
  payload.rankedSignals = [{}, {}, {}, {}];

  assert.doesNotThrow(() => assertRequiredRankedPatternPayloadSections(payload));
  assert.throws(
    () => assertRequiredRankedPatternPayloadSections({ ...payload, closingIntegration: undefined, rankedSignals: [] }),
    /exactly four rankedSignals/,
  );
  const { diagnostics: _diagnostics, ...missingDiagnostics } = payload;
  assert.throws(
    () => assertRequiredRankedPatternPayloadSections(missingDiagnostics),
    /diagnostics/,
  );
});

test('Flow State proof harness uses the real completion service and excludes admin support sheets from payload checks', () => {
  const source = readFileSync(
    'scripts/assessment-packages/prove-flow-state-ranked-pattern-fixture.ts',
    'utf8',
  );

  assert.match(source, /createAssessmentCompletionService/);
  assert.doesNotMatch(source, /upsertReadyResult/);
  assert.equal(FLOW_STATE_REQUIRED_PAYLOAD_SECTIONS.includes('reportPreview' as never), false);
  assert.equal(FLOW_STATE_REQUIRED_PAYLOAD_SECTIONS.includes('importSummary' as never), false);
  assert.equal(FLOW_STATE_REQUIRED_PAYLOAD_SECTIONS.includes('validationReference' as never), false);
  assert.equal(FLOW_STATE_REQUIRED_PAYLOAD_SECTIONS.includes('lookups' as never), false);
});
