import test from 'node:test';
import assert from 'node:assert/strict';

import {
  importSingleDomainLanguageDatasetForAssessmentVersionWithDependencies,
} from '@/lib/server/admin-single-domain-language-import';

type SingleDomainTableState = {
  framing: Array<{
    domain_key: string;
    section_title: string;
    intro_paragraph: string;
    meaning_paragraph: string;
    bridge_to_signals: string;
    blueprint_context_line: string;
  }>;
};

function createFakeDb(seed?: Partial<SingleDomainTableState>) {
  const state: SingleDomainTableState = {
    framing: [...(seed?.framing ?? [])],
  };

  const client = {
    async query<T>(text: string, params?: readonly unknown[]) {
      const sql = text.replace(/\s+/g, ' ').trim();

      if (sql === 'BEGIN' || sql === 'COMMIT' || sql === 'ROLLBACK') {
        return { rows: [] as T[] };
      }

      if (sql.includes('FROM assessment_versions av INNER JOIN assessments a ON a.id = av.assessment_id WHERE av.id = $1')) {
        return {
          rows: [{
            assessment_key: 'role-focus',
            assessment_version_id: String(params?.[0] ?? 'version-draft'),
            lifecycle_status: 'DRAFT',
          }] as T[],
        };
      }

      if (sql.includes('COALESCE(av.mode, a.mode) AS assessment_mode')) {
        return {
          rows: [{ assessment_mode: 'single_domain' }] as T[],
        };
      }

      if (sql.startsWith('DELETE FROM assessment_version_single_domain_framing')) {
        state.framing = [];
        return { rows: [] as T[] };
      }

      if (sql.startsWith('INSERT INTO assessment_version_single_domain_framing')) {
        const [
          ,
          domain_key,
          section_title,
          intro_paragraph,
          meaning_paragraph,
          bridge_to_signals,
          blueprint_context_line,
        ] = params as [string, string, string, string, string, string, string];
        state.framing.push({
          domain_key,
          section_title,
          intro_paragraph,
          meaning_paragraph,
          bridge_to_signals,
          blueprint_context_line,
        });
        return { rows: [] as T[] };
      }

      if (sql.includes('FROM assessment_version_single_domain_framing')) {
        return { rows: [...state.framing] as T[] };
      }

      if (
        sql.includes('FROM assessment_version_single_domain_hero_pairs') ||
        sql.includes('FROM assessment_version_single_domain_signal_chapters') ||
        sql.includes('FROM assessment_version_single_domain_balancing_sections') ||
        sql.includes('FROM assessment_version_single_domain_pair_summaries') ||
        sql.includes('FROM assessment_version_single_domain_application_statements')
      ) {
        return { rows: [] as T[] };
      }

      return { rows: [] as T[] };
    },
    async connect() {
      return client;
    },
    release() {},
  };

  return { db: client, state };
}

test('valid DOMAIN_FRAMING import persists rows successfully', async () => {
  const fake = createFakeDb();
  const paths: string[] = [];

  const result = await importSingleDomainLanguageDatasetForAssessmentVersionWithDependencies({
    assessmentVersionId: 'version-draft',
    datasetKey: 'DOMAIN_FRAMING',
    rawInput: [
      'domain_key|section_title|intro_paragraph|meaning_paragraph|bridge_to_signals|blueprint_context_line',
      'leadership-style|Leadership style|Intro text|Meaning text|Bridge text|Blueprint text',
    ].join('\n'),
  }, {
    db: fake.db,
    revalidatePath(path) {
      paths.push(path);
    },
  });

  assert.equal(result.success, true);
  assert.equal(result.summary.importedRowCount, 1);
  assert.equal(fake.state.framing.length, 1);
  assert.equal(fake.state.framing[0]?.domain_key, 'leadership-style');
  assert.ok(paths.includes('/admin/assessments/single-domain/role-focus/language'));
  assert.ok(paths.includes('/admin/assessments/single-domain/role-focus/review'));
});

test('invalid SIGNAL_CHAPTERS headers are rejected visibly', async () => {
  const fake = createFakeDb();

  const result = await importSingleDomainLanguageDatasetForAssessmentVersionWithDependencies({
    assessmentVersionId: 'version-draft',
    datasetKey: 'SIGNAL_CHAPTERS',
    rawInput: [
      'signal_key|position_primary_label|position_secondary_label',
      'directive|Primary|Secondary',
    ].join('\n'),
  }, {
    db: fake.db,
    revalidatePath() {},
  });

  assert.equal(result.success, false);
  assert.equal(result.parseErrors.length, 1);
  assert.match(result.parseErrors[0]?.message ?? '', /Invalid headers for SIGNAL_CHAPTERS/i);
});
