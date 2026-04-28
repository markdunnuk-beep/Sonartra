import test from 'node:test';
import assert from 'node:assert/strict';

import { runSingleDomainLanguageDiagnostic } from '@/lib/server/single-domain-language-diagnostic';

function createDiagnosticDb() {
  return {
    async query<T>(text: string) {
      const sql = text.replace(/\s+/g, ' ').trim();

      if (sql.includes('FROM assessment_versions av INNER JOIN assessments a ON a.id = av.assessment_id WHERE a.assessment_key = $1')) {
        return {
          rows: [{
            assessment_version_id: 'version-1',
            version_tag: '0.1.0',
            lifecycle_status: 'draft',
          }] as T[],
        };
      }

      if (sql.includes('SELECT domain_key FROM domains')) {
        return {
          rows: [{ domain_key: 'leadership-style' }] as T[],
        };
      }

      if (sql.includes('SELECT signal_key, order_index, id AS signal_id FROM signals')) {
        return {
          rows: [
            { signal_key: 'results', order_index: 0, signal_id: 'signal-1' },
            { signal_key: 'process', order_index: 1, signal_id: 'signal-2' },
            { signal_key: 'vision', order_index: 2, signal_id: 'signal-3' },
            { signal_key: 'people', order_index: 3, signal_id: 'signal-4' },
          ] as T[],
        };
      }

      if (sql.includes('FROM assessment_version_single_domain_framing')) {
        return {
          rows: [{ domain_key: 'leadership-style' }] as T[],
        };
      }

      if (sql.includes('FROM assessment_version_single_domain_hero_pairs')) {
        return {
          rows: [
            { pair_key: 'results_process' },
            { pair_key: 'results_vision' },
            { pair_key: 'results_people' },
            { pair_key: 'process_vision' },
            { pair_key: 'process_people' },
            { pair_key: 'vision_people' },
          ] as T[],
        };
      }

      if (sql.includes('FROM assessment_version_single_domain_driver_claims')) {
        return {
          rows: [
            { domain_key: 'leadership-style', pair_key: 'results_process', signal_key: 'results', driver_role: 'primary_driver' },
            { domain_key: 'leadership-style', pair_key: 'results_process', signal_key: 'results', driver_role: 'secondary_driver' },
            { domain_key: 'leadership-style', pair_key: 'results_process', signal_key: 'process', driver_role: 'primary_driver' },
            { domain_key: 'leadership-style', pair_key: 'results_process', signal_key: 'process', driver_role: 'secondary_driver' },
            { domain_key: 'leadership-style', pair_key: 'results_process', signal_key: 'vision', driver_role: 'supporting_context' },
            { domain_key: 'leadership-style', pair_key: 'results_process', signal_key: 'vision', driver_role: 'range_limitation' },
            { domain_key: 'leadership-style', pair_key: 'results_process', signal_key: 'people', driver_role: 'supporting_context' },
            { domain_key: 'leadership-style', pair_key: 'results_process', signal_key: 'people', driver_role: 'range_limitation' },
          ] as T[],
        };
      }

      if (sql.includes('FROM assessment_version_single_domain_balancing_sections')) {
        return {
          rows: [
            { pair_key: 'results_process' },
            { pair_key: 'results_vision' },
            { pair_key: 'results_people' },
            { pair_key: 'process_vision' },
            { pair_key: 'process_people' },
            { pair_key: 'vision_people' },
          ] as T[],
        };
      }

      if (sql.includes('FROM assessment_version_single_domain_pair_summaries')) {
        return {
          rows: [
            { pair_key: 'results_process' },
            { pair_key: 'results_vision' },
            { pair_key: 'results_people' },
            { pair_key: 'process_vision' },
            { pair_key: 'process_people' },
            { pair_key: 'vision_people' },
          ] as T[],
        };
      }

      if (sql.includes('FROM assessment_version_single_domain_application_statements')) {
        return {
          rows: [
            { signal_key: 'results' },
            { signal_key: 'process' },
            { signal_key: 'vision' },
            { signal_key: 'people' },
          ] as T[],
        };
      }

      throw new Error(`Unhandled SQL in single-domain diagnostic test: ${sql}`);
    },
  };
}

test('single-domain language diagnostic reports driver-claim matrix issues and missing tuples explicitly', async () => {
  const payload = await runSingleDomainLanguageDiagnostic('blueprint-understand-how-you-lead', createDiagnosticDb());

  assert.equal(payload.datasets.DRIVER_CLAIMS.expectedCount, 48);
  assert.equal(payload.datasets.DRIVER_CLAIMS.actualCount, 8);
  assert.equal(payload.driverClaimMatrix.completeCount, 8);
  assert.ok(payload.driverClaimMatrix.issues.some((issue) => issue.code === 'single_domain_driver_claim_matrix_invalid'));
  assert.ok(payload.driverClaimMatrix.issues.some((issue) => (
    issue.code === 'single_domain_driver_claim_missing_tuple'
      && issue.tupleKey === 'leadership-style|results_vision|results|primary_driver'
  )));

  const resultsProcess = payload.driverClaimMatrix.pairs.find((pair) => pair.pairKey === 'results_process');
  const resultsVision = payload.driverClaimMatrix.pairs.find((pair) => pair.pairKey === 'results_vision');

  assert.equal(resultsProcess?.completeCount, 8);
  assert.equal(resultsVision?.completeCount, 0);
  assert.ok(resultsVision?.missingTuples.includes('leadership-style|results_vision|results|primary_driver'));
});
